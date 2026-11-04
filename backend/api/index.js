/**
 * Vercel serverless entry. Vercel runs this file for every request (see vercel.json rewrite).
 * The Nest app is built once per warm instance and reused, so MongoDB is not reconnected on every call.
 * It uses the compiled output in dist/ (created by `npm run build`).
 */
const { createApp } = require('../dist/app.factory');

let serverPromise;

function getServer() {
  if (!serverPromise) {
    serverPromise = createApp()
      .then(async (app) => {
        await app.init();
        return app.getHttpAdapter().getInstance();
      })
      .catch((error) => {
        serverPromise = undefined; // let the next request try again instead of caching a failure
        throw error;
      });
  }
  return serverPromise;
}

module.exports = async (req, res) => {
  const server = await getServer();
  return server(req, res);
};
