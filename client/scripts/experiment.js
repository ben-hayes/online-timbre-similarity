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
    const questionnaireSection = await sections.questionnaire();
    const experimentCompleteSection = await sections.experimentComplete();

    const experiment = new lab.flow.Sequence({
      content: [
        semanticSection,
        welcomeSection,
        headphoneCheckSection,
        auditionFiles,
        dissimilarityPracticeSection,
        dissimilaritySection,
        questionnaireSection,
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
