const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const experimentSpec = require('./experiment_spec');
const consentPdf = require('./consent_pdf');

const QUESTIONNAIRE_COLLECTION = 'questionnaire_responses';
const PRACTICE_COLLECTION = 'practice_dissimilarity_responses';
const DISSIMILARITY_COLLECTION = 'dissimilarity_responses';
const SEMANTIC_COLLECTION = 'semantic_responses';
const EXPERIMENT_SPEC_COLLECTION = 'experiment_specs';
const FEEDBACK_COLLECTION = 'experiment_feedback';

const app = express();
app.use(bodyParser.json({
  limit: '50mb',
}));
app.use(express.static('client'));

mongodb.MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', function(err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = client.db();
  console.log('Database connection ready');

  const server = app.listen(process.env.PORT || 8081, function() {
    const port = server.address().port;
    console.log('App now running on port', port);
  });
});


app.get('/api/get-experiment-spec', function(req, res) {
  const spec = experimentSpec.create();

  db.collection(EXPERIMENT_SPEC_COLLECTION)
      .insertOne(spec, (err, doc) => {
        if (err) {
          handleError(res, err.message, 'Failed to insert spec to DB');
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(spec));
        }
      });
});

app.get('/data/dissimilarity_scores.csv', function(req, res) {
  const cols = [
    'specId',
    'audio_a_file',
    'audio_b_file',
    'dissimilarity_rating',
    'stimulus_play_count',
    'duration',
  ];
  let csvString = cols.join(',') + '\n';

  db.collection(DISSIMILARITY_COLLECTION)
      .find().toArray((err, docs) => {
        for (const row of docs) {
          const data = [];
          for (const col of cols) {
            data.push(row[col]);
          }
          csvString += data.join(',') + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(csvString);
      });
});

app.get('/data/questionnaire_responses.csv', function(req, res) {
  const cols = [
    'specId',
    'age',
    'gender',
    'hearing_issue',
    'instrument_years',
    'primary_instrument',
    'musical_identity',
    'duration',
  ];
  let csvString = cols.join(',') + '\n';

  db.collection(QUESTIONNAIRE_COLLECTION)
      .find().toArray((err, docs) => {
        for (const row of docs) {
          const data = [];
          for (const col of cols) {
            data.push(row[col]);
          }
          csvString += data.join(',') + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(csvString);
      });
});

app.get('/pdf/consent_form.pdf', function(req, res) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip.substr(0, 7) == '::ffff:') {
    ip = ip.substr(7);
  }
  const dateObject = new Date();
  const date = dateObject.toDateString();

  consentPdf.createCompletedConsentForm(ip, date).then((outputPdf) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Content-Disposition',
        'attachment;filename=signed_consent_form.pdf');
    res.end(Buffer.from(outputPdf, 'binary'));
  });
});

app.post('/api/store-experiment-data', function(req, res) {
  const specId = req.body.metadata.specId;
  const questionnaireResponses = [];
  const practiceResponses = [];
  const dissimilarityResponses = [];
  const semanticResponses = [];
  const feedbackResponses = [];
  let languageScreeningResponse = false;

  for (const entry of req.body.data) {
    entry.specId = specId;
    if (entry.sender === 'dissimilarity') {
      dissimilarityResponses.push(entry);
    } else if (entry.sender === 'questionnaire') {
      questionnaireResponses.push(entry);
    } else if (entry.sender === 'practice_dissimilarity') {
      practiceResponses.push(entry);
    } else if (entry.sender === 'language_screening') {
      languageScreeningResponse = entry.native_english === 'yes';
    } else if (entry.sender === 'semantic') {
      semanticResponses.push(entry);
    } else if (entry.sender === 'feedback') {
      feedbackResponses.push(feedback);
    }
  }

  const dbOperations = [];
  if (dissimilarityResponses.length > 0) {
    dbOperations.push(db.collection(DISSIMILARITY_COLLECTION)
        .insertMany(dissimilarityResponses));
  }
  if (practiceResponses.length > 0) {
    dbOperations.push(db.collection(PRACTICE_COLLECTION)
        .insertMany(practiceResponses));
  }
  if (questionnaireResponses.length > 0) {
    dbOperations.push(db.collection(QUESTIONNAIRE_COLLECTION)
        .insertMany(questionnaireResponses));
  }
  if (semanticResponses.length > 0 && languageScreeningResponse === true) {
    dbOperations.push(db.collection(SEMANTIC_COLLECTION)
        .insertMany(semanticResponses));
  }
  if (feedbackResponses.length > 0) {
    dbOperations.push(db.collection(FEEDBACK_COLLECTION)
        .insertMany(feedbackResponses));
  }

  Promise.all(dbOperations)
      .then((returns) => {
        let success = true;
        for (const res of returns) {
          if (res.result.ok !== 1) {
            handleError(
                res,
                err.message,
                'Failed to insert responses to DB');
            success = false;
            break;
          }
        }
        if (success) res.sendStatus(201);
      })
      .catch((err, doc) => {
        handleError(res, err.message, 'Failed to insert responses to DB');
      });
});
