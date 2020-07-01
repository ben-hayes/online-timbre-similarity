requirejs.config({
  shim: {
    lab: {
      exports: 'lab',
    },
  },
  paths: {
    lab: '../lib/lab',
  },
});

define(['lab', 'templating', 'screens'], function(lab, templating, screens) {
  /**
   * Creates the welcome section of the experiment
   *
   * @return {lab.flow.Sequence} A block of all welcome screens.
   */
  async function welcomeScreens() {
    const sectionScreenTemplates = {
      welcome_1: 'text_screen',
      welcome_2: 'text_screen',
      consent: 'consent_form',
      consent_failure: 'text_screen_no_continue',
      pdf_download: 'text_screen',
    };
    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);

    const createdScreens = [];
    for (const template in templates) {
      if (Object.prototype.hasOwnProperty.call(templates, template)) {
        let screen;
        if (sectionScreenTemplates[template] === 'consent_form') {
          screen = screens.consentForm(
              templates[template],
              templates.consent_failure);
        } else if (sectionScreenTemplates[template] === 'text_screen') {
          screen = screens.textScreen(templates[template]);
        } else if (template === 'consent_failure') {
          continue;
        }
        createdScreens.push(screen);
      }
    }
    const block = new lab.flow.Sequence({
      content: createdScreens,
    });

    return block;
  }

  /**
   * Creates the headphone check section of the experiment.
   *
   * @return {lab.flow.Sequence} A block of headphone check screens.
   */
  async function headphoneCheck() {
    const sectionScreenTemplates = {
      headphone_check: 'headphone_check',
      headphone_complete: 'text_screen',
    };
    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);
    const headphoneScreen = screens.headphoneCheck(templates.headphone_check);
    const headphoneComplete =
        screens.textScreen(templates.headphone_complete);
    const block = new lab.flow.Sequence({
      content: [headphoneScreen, headphoneComplete],
    });
    return block;
  }

  /**
   * Creates the file audition section of the experiment.
   *
   * @param {Array} audioFiles
   * @return {lab.flow.Sequence} A block of all audition screens.
   */
  async function auditionFiles(audioFiles) {
    const sectionScreenTemplates = {
      audition_explanation: 'text_screen',
      audition_files: 'audition_files',
    };
    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);
    const auditionExplanation =
        screens.textScreen(templates.audition_explanation);
    const auditionScreen = screens.auditionFiles(
        templates.audition_files,
        audioFiles);

    const block = new lab.flow.Sequence({
      content: [auditionExplanation, auditionScreen],
    });
    return block;
  }

  /**
   * Creates a block of dissimilarity rating screens. This is the "inner" block
   * -- i.e. it doesn't contain any breaks.
   *
   * @param {*} template The HTML template which populates the screens.
   * @param {*} screenName The name used in the datastore.
   * @param {*} audioFilePairs An object containing audio file names.
   * @param {*} startIndex The integer index at which to start the trial counter
   * @param {*} totalTrials The total number of trials
   * @param {*} practiceReminderTemplate An optional template containing the
   *  HTML used to populate the reminder screen shown if a user rates
   *  identical sounds anything other than 0.
   * @return {lab.flow.Sequence} The block of all dissimilarity screens.
   */
  function dissimilarityInnerBlock(
      template,
      screenName,
      audioFilePairs,
      startIndex,
      totalTrials,
      practiceReminderTemplate) {
    console.log(startIndex);
    let index = 1;
    for (const audioFilePair of audioFilePairs) {
      audioFilePair.trial_number = startIndex + index;
      audioFilePair.total_trials = totalTrials;
      index += 1;
    }
    const block = new lab.flow.Loop({
      template: screens.dissimilarityScreen.bind(
          undefined,
          template,
          screenName,
          practiceReminderTemplate),
      templateParameters: audioFilePairs,
    });
    return block;
  }

  /**
   * Creates a block of dissimilarity rating practice screens. If any of the
   * screens (as specified in the spec) present an identical pair of stimuli,
   * the user will be reminded to rate them 0 if they fail to do so.:w
   *
   * @param {*} audioFilePairs A list of audio file objects to be accepted by
   *  dissimilarityInnerBlock
   * @return {lab.flow.Sequence} The dissimilarity practice block.
   */
  async function dissimilarityPracticeBlock(audioFilePairs) {
    const sectionScreenTemplates = {
      practice_explanation_1: 'text_screen',
      practice_explanation_2: 'text_screen',
      dissimilarity_rating: 'dissimilarity_rating',
      practice_reminder: 'text_screen',
    };
    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);

    const explanation1 = screens.textScreen(templates.practice_explanation_1);
    const explanation2 = screens.textScreen(templates.practice_explanation_2);
    const practiceBlock = dissimilarityInnerBlock(
        templates.dissimilarity_rating,
        'practice_dissimilarity',
        audioFilePairs,
        0,
        audioFilePairs.length,
        templates.practice_reminder);
    const block = new lab.flow.Sequence({
      content: [explanation1, explanation2, practiceBlock],
    });

    return block;
  }

  /**
   * Creates a full sequence of dissimilarity rating screens.
   *
   * @param {*} audioFilePairs A list of audio file objects to be accepted by
   *  dissimilarityInnerBlock.
   * @param {*} ratingsPerBlock (optional) The number of ratings per block.
   * @return {lab.flow.Sequence} The full dissimilarity block.
   */
  async function dissimilarityBlock(audioFilePairs, ratingsPerBlock) {
    ratingsPerBlock = ratingsPerBlock || 100;

    const sectionScreenTemplates = {
      dissimilarity_rating: 'dissimilarity_rating',
      dissimilarity_break: 'text_screen',
      dissimilarity_explanation: 'text_screen',
      dissimilarity_complete: 'text_screen',
    };

    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);

    const explanationScreen =
        screens.textScreen(templates.dissimilarity_explanation);
    const blockScreens = [explanationScreen];
    const numberOfInnerBlocks =
        Math.ceil(audioFilePairs.length / ratingsPerBlock);
    for (let i = 0; i < numberOfInnerBlocks; i++) {
      const innerBlockAudioPairs = audioFilePairs.slice(
          i * ratingsPerBlock,
          (i + 1) * ratingsPerBlock);
      const startIndex = i * ratingsPerBlock;
      const thisInnerBlock = dissimilarityInnerBlock(
          templates.dissimilarity_rating,
          'dissimilarity',
          innerBlockAudioPairs,
          startIndex,
          audioFilePairs.length);
      blockScreens.push(thisInnerBlock);

      if (i < numberOfInnerBlocks - 1) {
        const breakScreen =
                screens.textScreen(templates.dissimilarity_break);
        blockScreens.push(breakScreen);
      }
    }

    const completeScreen =
        screens.textScreen(templates.dissimilarity_complete);
    blockScreens.push(completeScreen);

    const block = new lab.flow.Sequence({
      content: blockScreens,
    });
    return block;
  }

  /**
   * Creates a full sequence of semantic rating screens.
   *
   * @param {*} audioFiles A list of audio files
   * @param {*} descriptors A list of descriptors
   * @return {lab.flow.Sequence} The full dissimilarity block.
   */
  async function semanticBlock(audioFiles, descriptors) {
    const sectionScreenTemplates = {
      semantic_rating: 'semantic_rating',
      semantic_explanation: 'text_screen',
      semantic_complete: 'text_screen',
      descriptor_row: 'descriptor_row',
    };

    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);

    const explanationScreen =
        screens.textScreen(templates.semantic_explanation);
    const blockScreens = [explanationScreen];

    const templateParameters = [];
    let index = 0;
    for (const audioFile of audioFiles) {
      templateParameters.push({
        audio_file: audioFile,
        trial_number: index,
        total_trials: audioFiles.length,
      });
      index += 1;
    }

    const descriptorsPerPage = 8;
    const semanticRatings = new lab.flow.Loop({
      template: screens.semanticScreen.bind(
          undefined,
          templates.semantic_rating,
          templates.descriptor_row,
          'semantic',
          descriptors,
          descriptorsPerPage),
      templateParameters,
    });
    blockScreens.push(semanticRatings);

    const completeScreen =
        screens.textScreen(templates.semantic_complete);
    blockScreens.push(completeScreen);

    const block = new lab.flow.Sequence({
      content: blockScreens,
    });
    return block;
  }

  /**
   * Creates the questionnaire sequence
   *
   * @return {lab.flow.Sequence} The questionnaire block
   */
  async function questionnaire() {
    const sectionScreenTemplates = {
      questionnaire: 'questionnaire',
      questionnaire_explanation: 'text_screen',
    };
    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);

    const questionnaireScreen = screens.questionnaire(templates.questionnaire);
    const questionnaireExplanation =
        screens.textScreen(templates.questionnaire_explanation);
    const block = new lab.flow.Sequence({
      content: [questionnaireExplanation, questionnaireScreen],
    });
    return block;
  }

  /**
   * Creates the final screen
   *
   * @return {lab.html.Screen} The experiment completion screen
   */
  async function experimentComplete() {
    const sectionScreenTemplates = {
      experiment_complete: 'text_screen_no_continue',
    };
    const templates =
        await templating.getSectionScreenTemplates(sectionScreenTemplates);

    const experimentCompleteScreen =
        screens.textScreenNoContinue(templates.experiment_complete);

    experimentCompleteScreen.on('run', () => {
      const stopButton = document.getElementById('stop-button');
      stopButton.style.display = 'none';
    });
    return experimentCompleteScreen;
  }

  return {
    welcomeScreens,
    auditionFiles,
    headphoneCheck,
    dissimilarityInnerBlock,
    dissimilarityPracticeBlock,
    dissimilarityBlock,
    semanticBlock,
    questionnaire,
    experimentComplete,
  };
});
