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

define(['lab', 'sections'], function(lab, sections) {
  /**
   * Creates a timbre dissimilarity experiment using lab.js.
   *
   * @return {object} Contains references to lab.flow.Sequence instances. The
   *  first is the full experiment flow (.run() is called on this) and the
   *  second is everything up to the final screen, allowing for early
   *  termination.
   */
  async function get() {
    const experimentSpecReq = await fetch('api/get-experiment-spec');
    const experimentSpec = await experimentSpecReq.json();
    console.log(experimentSpec);

    const semanticSection = await sections.semanticBlock(
        experimentSpec.files,
        experimentSpec.semanticDescriptors);
    const welcomeSection = await sections.welcomeScreens();
    const headphoneCheckSection = await sections.headphoneCheck();
    const auditionFiles = await sections.auditionFiles(experimentSpec.files);
    const dissimilarityPracticeSection =
        await sections.dissimilarityPracticeBlock(
            experimentSpec.practiceTrials);
    const dissimilaritySection = await sections.dissimilarityBlock(
        experimentSpec.trials,
        100);

    const englishSpeakingBlock = new lab.flow.Sequence({
      content: [
        auditionFiles.nativeEnglishSpeakers,
        dissimilarityPracticeSection,
        dissimilaritySection,
        auditionFiles.noExplanation,
        semanticSection,
      ],
    });
    const nonEnglishSpeakingBlock = new lab.flow.Sequence({
      content: [
        auditionFiles.nonNativeEnglishSpeakers,
        dissimilarityPracticeSection,
        dissimilaritySection,
      ],
    });

    englishSpeakingBlock.on('run', () => {
      const progressBar = document.getElementById('exp-progress');
      progressBar.style.display = 'inline-block';
      const mutationObserver = new MutationObserver((mutations, obs) => {
        const numSemantic = experimentSpec.files.length *
            experimentSpec.semanticDescriptors.length;
        const numDissim = experimentSpec.trials.length;
        const progress = auditionFiles.nativeEnglishSpeakers.progress * 0.05 +
            dissimilarityPracticeSection.progress * 0.05 +
            (dissimilaritySection.options.content[1].progress *
                0.9 * numDissim / (numDissim + numSemantic)) +
            (semanticSection.options.content[1].progress * 0.9 *
                numSemantic / (numDissim + numSemantic));

        progressBar.value = progress;
      });
      const target = document.getElementById('main-portal');
      const config = {attributes: true, childList: true, subtree: true};
      mutationObserver.observe(target, config);
    });
    nonEnglishSpeakingBlock.on('run', () => {
      const progressBar = document.getElementById('exp-progress');
      progressBar.style.display = 'inline-block';
      const mutationObserver = new MutationObserver((mutations, obs) => {
        const progress = auditionFiles.nativeEnglishSpeakers.progress * 0.05 +
            dissimilarityPracticeSection.progress * 0.05 +
            dissimilaritySection.options.content[1].progress * 0.9;

        progressBar.value = progress;
      });
      const target = document.getElementById('main-portal');
      const config = {attributes: true, childList: true, subtree: true};
      mutationObserver.observe(target, config);
    });

    const langaugeScreeningCallback = (isNativeEnglishSpeaker) => {
      if (!isNativeEnglishSpeaker) {
        englishSpeakingBlock.on('run', () => {
          englishSpeakingBlock.end();
        });
      } else {
        nonEnglishSpeakingBlock.on('run', () => {
          nonEnglishSpeakingBlock.end();
        });
      }
    };
    const questionnaireSection =
        await sections.questionnaire(langaugeScreeningCallback);
    const feedbackSection = await sections.feedbackForm();
    const experimentCompleteSection = await sections.experimentComplete();
    const stopScreen = await sections.stopSection();

    const experiment = new lab.flow.Sequence({
      content: [
        // welcomeSection,
        // headphoneCheckSection,
        questionnaireSection,
        englishSpeakingBlock,
        nonEnglishSpeakingBlock,
        feedbackSection,
      ],
    });
    const fullSequence = new lab.flow.Sequence({
      content: [experiment, experimentCompleteSection],
    });
    const fullSequenceWithStopScreen = new lab.flow.Sequence({
      content: [fullSequence, stopScreen],
    });

    experiment.on('end', () => {
      if (!experiment.cancelled) {
        console.log(experiment.options.datastore);
        experiment.options.datastore.transmit(
            'api/store-experiment-data',
            {
              specId: experimentSpec.specId,
            },
        ).then((res) => {
          const uploadMessage = document.getElementById('uploading-complete');
          if (res.status === 201 && res.ok === true) {
            uploadMessage.innerHTML = 'The experiment is complete. It is now ' +
                'safe to close your browser window.';
          } else {
            window.downloadExperimentData = () => {
              experiment.options.datastore.download();
            };
            uploadMessage.innerHTML = 'There was a problem uploading your ' +
                'responses. Please <a href=\"javascript:void(0)\" onclick=' +
                '\"downloadExperimentData();\">click here' +
                '</a> to download your responses as a file and send them via ' +
                'email to <a href=\"mailto:b.j.hayes@se19.qmul.ac.uk\">' +
                'b.j.hayes@se19.qmul.ac.uk</a>.';
          }
          console.log(res);
        });
      }
    });
    return {fullSequenceWithStopScreen, fullSequence, experiment};
  }
  return {get};
});
