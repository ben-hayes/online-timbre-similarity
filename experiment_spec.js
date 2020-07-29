const crypto = require('crypto');
const fs = require('fs');

/**
 * Creates a unique hash from the date string and a random salt
 *
 * @return {string} Unique MD5 hash to identify the spec
 */
function makeSpecHash() {
  const date = new Date();
  const random = Math.random();
  const hash = crypto
      .createHash('md5')
      .update(date.toString() + random.toString())
      .digest('hex');
  return hash;
}

/**
 * Returns a list of practice trials
 *
 * @return {Array} List of practice trials.
 */
function makePracticeTrials() {
  const practiceTrials = [
    {
      audio_src_a: '416ce07fc6375c188a73b743b6ec7b28.wav',
      audio_src_b: '45510d0bf313673eb95ae4547f32f049.wav',
    },
    {
      audio_src_a: '7b4f4e366c648bedfeb270531e71805e.wav',
      audio_src_b: '80ae33835bc15702e2f8c350f181be62.wav',
    },
    {
      audio_src_a: 'db7408881411a2480563e3dfcfef327c.wav',
      audio_src_b: 'db7408881411a2480563e3dfcfef327c.wav',
    },
    {
      audio_src_a: '80ae33835bc15702e2f8c350f181be62.wav',
      audio_src_b: '0b8f117c39291bbb497e9d8b2b1119a3.wav',
    },
    {
      audio_src_a: '5749dbf65a1757add060de9b9487f344.wav',
      audio_src_b: 'f33e90622b9b2ccde6c13f8341714dd0.wav',
    },
  ];
  return practiceTrials;
}

/**
 * Returns a list of WAV files in the client audio directory.
 *
 * @return {Array} List of WAV files.
 */
function listAudioFiles() {
  const files = fs.readdirSync('client/audio');
  for (const file of files) {
    if (!file.endsWith('.wav')) {
      files.splice(files.indexOf(file), 1);
    }
  }
  return files;
}

/**
 * Finds all unordered permutations of 2 files from the given list, with the
 * order of each pair randomly selected.
 *
 * @param {Array} files An array of files to be permuted.
 * @return {Array} An array of file pair objects
 */
function makeAllPairs(files) {
  const filePairs = [];
  for (let i = 0; i < files.length; i++) {
    for (j = i; j < files.length; j++) {
      const iFirst = Math.random() >= 0.5;
      const audioFileA = files[iFirst ? i : j];
      const audioFileB = files[iFirst ? j : i];

      filePairs.push([audioFileA, audioFileB]);
    }
  }
  return filePairs;
}

/**
 * Implements the Fisher-Yates list shuffling algorithm. Note: returns the list
 * but shuffling also occurs in place.
 *
 * @param {Array} list The list to be shuffled
 * @return {Array} The shuffled list
 */
function shuffleList(list) {
  const outList = list;
  for (let i = 0; i < list.length; i++) {
    swapIndex = Math.floor(Math.random() * list.length);
    const swapValue = outList[i];
    outList[i] = outList[swapIndex];
    outList[swapIndex] = swapValue;
  }
  return outList;
}

/**
 * Given a list of files, create a randomised series of trials covering all
 * pair-wise permutations.
 *
 * @param {Array} files The list of files
 * @return {Array} Randomised series of trials
 */
function makeTrials(files) {
  const filePairs = makeAllPairs(files);
  const shuffledPairs = shuffleList(filePairs);
  const trials = [];
  for (const pair of shuffledPairs) {
    trials.push({
      'audio_src_a': pair[0],
      'audio_src_b': pair[1],
    });
  }
  return trials;
}

/**
 * Return the full list of semantic descriptors to be used in the study.
 *
 * @return {Array} A shuffled list of descriptor strings.
 */
function makeSemanticDescriptors() {
  const descriptors = [
    'bright',
    'thick',
    'rough',
    'percussive',
    'clean',
    'complex',
    'sweet',
    'smooth',
    'warm',
    'raw',
    'big',
    'harsh',
    'metallic',
    'aggressive',
    'rich',
    'hard',
    'deep',
    'thin',
    'noisy',
    'plucky',
    'woody',
    'clear',
    'gritty',
    'dull',
    'mellow',
    'dark',
    'sharp',
  ];
  return shuffleList(descriptors);
}

/**
 * Creates a complete experiment spec.
 *
 * @return {Object} The experiment spec.
 */
function create() {
  const files = listAudioFiles();
  const spec = {
    specId: makeSpecHash(),
    practiceTrials: makePracticeTrials(),
    trials: makeTrials(files),
    files: shuffleList(files),
    semanticDescriptors: makeSemanticDescriptors(),
  };
  return spec;
}

module.exports = {create};
