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
    const experimentCompleteSection = await sections.experimentComplete();

    const experiment = new lab.flow.Sequence({
      content: [
        welcomeSection,
        headphoneCheckSection,
        questionnaireSection,
        englishSpeakingBlock,
        nonEnglishSpeakingBlock,
      ],
    });
    const fullSequence = new lab.flow.Sequence({
      content: [experiment, experimentCompleteSection],
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
          console.log(res);
        });
      }
    });
    return {fullSequence, experiment};
  }
  return {get};
});
