# Online Timbre Dissimilarity & Semantics

A web-app for conducting an online timbre dissimilarity study, with a further semantic rating component. The dissimilarity section follows the methodology set out in [1]. Built around [lab.js](https://lab.js.org/) and [Express](https://expressjs.com/)

## Installation

Installation is straightforward with:

```zsh
yarn install
```

## Usage

The Node.js process can be started with:

```zsh
yarn start
```

The app will listen on the port specified in the environment variable `process.env.PORT`. If not found, it will default to port 8081. The app will connect to the database specified in the environment variable `process.env.MONGODB_URI`. If not found, it will attempt to connect to the database `test` on `localhost:27017`.

Once started, the experiment can be run by simply navigating to the server address in a browser.

## Accessing Data

Two API endpoints are provided for accessing auto-generated CSVs containing experiment data:

- `/data/dissimilarity_scores.csv`
- `/data/questionnaire_responses.csv`

Entries in these files are linked by the anonymous `specId` field which is a unique hash connected only to the experiment spec (sequence of trials) stored in the database. No personally identifying information is stored.

## To-do

- [x] Set up ESLint CI action
- [ ] Write retroactive unit tests
- [ ] Add testing to CI workflow
- [ ] Refactor dissimilarity screen code, breaking out components usable in other audio studies (pairwise audio player etc.)
- [ ] Refactor `server.js`
- [ ] Dockerize

## References

[1] Zacharakis, A., Pastiadis, K., & Reiss, J. D. (2015). An Interlanguage Unification of Musical Timbre: Bridging Semantic, Perceptual, and Acoustic Dimensions. Music Perception: An Interdisciplinary Journal, 32(4), 394–412. https://doi.org/10.1525/mp.2015.32.4.394
