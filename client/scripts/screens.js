requirejs.config({
  shim: {
    lab: {
      exports: 'lab',
    },
    HeadphoneCheck: {
      exports: 'HeadphoneCheck',
    },
  },
  paths: {
    lab: '../lib/lab',
    HeadphoneCheck: '../lib/HeadphoneCheck',
  },
});

define(['lab', 'templating', 'HeadphoneCheck'], function(
    lab,
    templating,
    HeadphoneCheck) {
  /**
   * Creates a lab.html.Form which functions as a dissimilarity rating screen.
   * Includes functionality to validate practice entries.
   *
   * @param {*} template The populated HTML template for the screen
   * @param {*} screenName The name to be recorded in the datastore
   * @param {*} practiceReminderTemplate If not undefined, this HTML template
   *  will be used to remind the user to rate identical pairs zero if they fail
   *  to do so
   * @param {*} audioFiles Object containing the two audio files for the trial
   * @return {lab.core.Component} The populated lab.js component with all
   *  behaviour. This is either a lab.html.Screen (if no practice reminder is
   *  used) or a lab.flow.Sequence.
   */
  function dissimilarityScreen(
      template,
      screenName,
      practiceReminderTemplate,
      audioFiles) {
    const populatedTemplate = templating.populateScreenTemplate(
        template,
        {
          'audio_src_a': audioFiles.audio_src_a,
          'audio_src_b': audioFiles.audio_src_b,
          'trial_number': audioFiles.trial_number,
          'total_trials': audioFiles.total_trials,
        });

    const labScreen = new lab.html.Form({
      content: populatedTemplate,
      title: screenName,
    });

    let playing = false;
    let playerTimeout;
    const playAudio = function() {
      const playCountElement =
            document.getElementById('stimulus_play_count');
      const currentPlayCount = parseInt(playCountElement.value);
      playCountElement.value = currentPlayCount + 1;

      playing = true;
      const playerA = document.getElementById('audio_a');
      const playerB = document.getElementById('audio_b');
      playerA.onended = () => {
        playerTimeout = setTimeout(() => {
          playerB.play();
        },
        100);
      };
      playerB.onended = () => {
        playing = false;
      };
      playerA.play();
    };

    let playListener;
    let submitListener;
    labScreen.on('run', () => {
      playAudio();
      playListener = document.addEventListener('keypress', (event) => {
        if (event.key === 'r' && !playing) {
          playAudio();
        }
      });

      const numberBox = document.getElementById('dissimilarity_rating');
      numberBox.focus();

      const submitButton = document.getElementsByName('submit_button')[0];
      let hasDelayed = false;
      let hasPaused = false;

      submitListener = submitButton.addEventListener('click', (event) => {
        if (!hasDelayed) {
          event.preventDefault();

          if (numberBox.value === '') {
            numberBox.style.background = '#e84a5f';
            setTimeout(() => {
              numberBox.style.background = '#ffffff';
            },
            650);
            return;
          }

          numberBox.style.background = '#a8df65';
          numberBox.disabled = true;

          setTimeout(() => {
            submitButton.click();
          },
          650);
          hasDelayed = true;
        }
        if (!hasPaused) {
          const audioPlayerA = document.getElementById('audio_a');
          const audioPlayerB = document.getElementById('audio_b');

          audioPlayerA.onended = undefined;
          audioPlayerB.onended = undefined;
          clearTimeout(playerTimeout);
          audioPlayerA.pause();
          audioPlayerB.pause();
          hasPaused = true;
        }
      });
    });

    labScreen.on('end', () => {
      document.removeEventListener('keypress', playListener);

      const submitButton = document.getElementsByName('submit_button')[0];
      submitButton.removeEventListener('click', submitListener);
    });

    if (audioFiles.audio_src_a === audioFiles.audio_src_b &&
        practiceReminderTemplate !== undefined) {
      const reminder = textScreen(practiceReminderTemplate);
      const block = new lab.flow.Sequence({
        content: [labScreen, reminder],
      });
      reminder.on('run', () => {
        const screenId = labScreen.options.id;
        let needsReminding = false;
        let erroneousScore = 0;

        for (const entry of labScreen.options.datastore.data) {
          if (entry.sender_id === screenId &&
                    parseInt(entry.dissimilarity_rating) !== 0) {
            needsReminding = true;
            erroneousScore = entry.dissimilarity_rating;
          }
        }

        if (!needsReminding) {
          reminder.end();
        } else {
          document.getElementById('erroneous_score').innerHTML =
                    erroneousScore.toString();
        }
      });
      return block;
    }

    return labScreen;
  }

  /**
   * Creates a sequence of lab.html.Forms which function as semantic rating
   * screens.
   *
   * @param {*} template The populated HTML template for the screen
   * @param {*} rowTemplate The HTML template for each descriptor row
   * @param {*} screenName The name to be recorded in the datastore
   * @param {*} spec An object containing the audio file, descriptor, current
   *  trial index, and total number of trials.
   * @return {lab.core.Component} The populated lab.js component with all
   *  behaviour. This is either a lab.flow.Sequence.
   */
  function semanticScreen(
      template,
      rowTemplate,
      screenName,
      spec) {
    const populatedTemplate = templating.populateScreenTemplate(
        template,
        {
          audio_src: spec.audio_file,
        });

    let playing = false;
    const playAudio = function() {
      const playCountElement =
            document.getElementById('stimulus_play_count');
      const currentPlayCount = parseInt(playCountElement.value);
      playCountElement.value = currentPlayCount + 1;

      playing = true;
      const player = document.getElementById('audio');
      player.onended = () => {
        playing = false;
      };
      player.play();
    };

    const row = templating.populateScreenTemplate(
        rowTemplate,
        {
          descriptor: spec.descriptor,
          negative_descriptor: `not ${spec.descriptor}`,
          positive_descriptor: spec.descriptor,
        },
    );
    const pageTemplate = templating.populateScreenTemplate(
        populatedTemplate,
        {
          descriptor_rows: row,
          trial_number: spec.trial_number,
          total_trials: spec.total_trials,
        },
    );
    const labScreen = new lab.html.Form({
      content: pageTemplate,
      title: screenName,
    });

    let playListener;
    let submitListener;
    labScreen.on('run', () => {
      playAudio();
      playListener = document.addEventListener('keypress', (event) => {
        if (event.key === 'r' && !playing) {
          playAudio();
        }
      });
      const removeNotClicked = function(e) {
        if (e.key !== 'ArrowRight' &&
            e.key !== 'ArrowLeft' &&
            e.type !== 'mousedown') {
          return;
        }

        if (e.type === 'mousedown') {
          $(this).val((e.offsetX - 8) / $(this).width());
        }

        $(this).removeClass('not-clicked');
        $(this).addClass('clicked');
        $(this).off('keydown');
        $(this).off('mousedown');
      };
      $('.not-clicked').mousedown(removeNotClicked);
      $('.not-clicked').keydown(removeNotClicked);
      $('.not-clicked').blur(function(e) {
        $(this).focus();
      });

      const submitButton = document.getElementById('submit_button');
      let hasDelayed = false;
      submitListener = submitButton.addEventListener('click', () => {
        const descriptorSlider = document.getElementById('semantic_rating');
        if (!hasDelayed) {
          if (descriptorSlider.className === 'not-clicked') {
            descriptorSlider.style.borderColor = '#ff0000';
          } else {
            descriptorSlider.style.borderColor = '#00ff00';
            setTimeout(() => {
              hasDelayed = true;
              submitButton.click();
            }, 300);
          }
          event.preventDefault();
        }
      });
    });

    labScreen.on('end', () => {
      document.removeEventListener('keypress', playListener);

      const submitButton = document.getElementsByName('submit_button')[0];
      submitButton.removeEventListener('click', submitListener);
    });

    return labScreen;
  }

  /**
   * A generic text screen with a continue button. Used for displaying
   * instructions or information.
   *
   * @param {*} template The HTML template used to populate the screen
   * @return {lab.html.Screen} A fully populated lab.js screen
   */
  function textScreen(template) {
    const labScreen = new lab.html.Screen({
      content: template,
    });
    let continueListener;
    labScreen.on('run', () => {
      const continueButton = document.getElementById('continue');
      continueListener = continueButton.addEventListener(
          'click',
          (event) => {
            labScreen.end();
          },
      );
    });
    labScreen.on('end', () => {
      const continueButton = document.getElementById('continue');
      continueButton.removeEventListener('click', continueListener);
    });
    return labScreen;
  }

  /**
   * Like the function textScreen, but returns a screen without a continue
   * button, effectively ending the experiment. Useful for branching to exit
   * conditions (e.g. unsuccessful completion of screening task)
   *
   * @param {*} template The HTML template used to populate the screen
   * @return {lab.html.Screen} A fully populated lab.js screen
   */
  function textScreenNoContinue(template) {
    const labScreen = new lab.html.Screen({
      content: template,
    });
    return labScreen;
  }

  /**
   * A lab.html.Screen that contains Woods et al's headphone screening task.
   * This will force an end to the study if the task is failed.
   *
   * @param {*} template The HTML template used to populate the screen
   * @return {lab.html.Screen} A fully populated lab.js screen.
   */
  function headphoneCheck(template) {
    const labScreen = new lab.html.Screen({
      content: template,
    });
    labScreen.on('run', () => {
      HeadphoneCheck.runHeadphoneCheck({
        trialsPerPage: 1,
      });
      $(document).on('hcHeadphoneCheckEnd', (event, data) => {
        if (data.didPass) {
          labScreen.end();
        } else {
          $('<div/>', {
            class: 'hc-calibration-instruction',
            html: [
              '<p>It appears you are not wearing headphones.</p>',
              '<p>This study can only be completed wearing headphones. If you ',
              'do not have headphones available, please close your browser ',
              'window.</p>',
              '<p>Otherwise, please put on your headphones and refresh the ',
              'page to try again.</p>',
            ].join(''),
          }).appendTo($('#hc-container'));
        }
      });
    });
    return labScreen;
  }

  /**
   * Returns a simple questionnaire form.
   *
   * @param {*} template The HTML template used to populate the screen.
   * @return {lab.html.Form} The questionnaire form.
   */
  function questionnaire(template) {
    const labScreen = new lab.html.Form({
      content: template,
      title: 'questionnaire',
    });
    return labScreen;
  }

  /**
   * Return a consent form which ends the experiment if consent is not given.
   *
   * @param {*} template The HTML template used to populate the screen.
   * @param {*} failureTemplate The HTML template used to populate the failure
   *  screen, shown when consent is not given.
   * @return {lab.flow.Sequence} The consent form and possible failure screen.
   */
  function consentForm(template, failureTemplate) {
    const labScreen = new lab.html.Form({
      content: template,
      title: 'consent_form',
    });
    const confirmScreen = new lab.html.Screen({
      content: failureTemplate,
    });
    const sequence = new lab.flow.Sequence({
      content: [labScreen, confirmScreen],
    });

    let consent = false;
    let agreeListener;
    labScreen.on('run', () => {
      const submitButton = document.getElementById('agree');
      agreeListener = submitButton.addEventListener('click', (e) => {
        consent = true;
      });
    });
    labScreen.on('end', () => {
      const submitButton = document.getElementById('agree');
      submitButton.removeEventListener('click', agreeListener);
    });
    confirmScreen.on('run', () => {
      if (consent) {
        confirmScreen.end();
      } else {
        document.getElementById('stop-button').style.display = 'none';
      }
    });

    return sequence;
  }

  /**
   * Creates a simple screen which plays back all the stimuli used in the
   * experiment in the order determined by the spec (randomly generated on the
   * server).
   *
   * @param {*} template The HTML template used to populate the screen.
   * @param {*} audioFiles A list of audio files to be played in sequence
   * @return {lab.html.Screen} The populated file audition screen.
   */
  function auditionFiles(template, audioFiles) {
    const labScreen = new lab.html.Screen({
      content: template,
    });

    let playListener;
    let continueListener;
    labScreen.on('run', () => {
      const playButton = document.getElementById('play-audio');
      const continueButton = document.getElementById('continue');
      playListener = playButton.addEventListener('click', (event) => {
        const player = new Audio();
        let fileIndex = 0;
        const playAudio = () => {
          if (fileIndex < audioFiles.length) {
            player.src = 'audio/' + audioFiles[fileIndex];
            player.play();
            fileIndex += 1;
          } else {
            playButton.disabled = true;
            continueButton.disabled = false;
          }
        };
        player.onended = playAudio;
        playAudio();
      });

      continueListener = continueButton.addEventListener('click', (event) => {
        labScreen.end();
      });
    });
    labScreen.on('end', () => {
      const playButton = document.getElementById('play-audio');
      const continueButton = document.getElementById('play-audio');
      playButton.removeEventListener('click', playListener);
      continueButton.removeEventListener('click', continueListener);
    });
    return labScreen;
  }

  return {
    dissimilarityScreen,
    semanticScreen,
    textScreen,
    textScreenNoContinue,
    headphoneCheck,
    questionnaire,
    consentForm,
    auditionFiles,
  };
});
