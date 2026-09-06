// Picks the storage backend at startup:
//
//   - MONGODB_URI is set  -> lib/store-mongo.js (MongoDB Atlas, free tier).
//     Use this on any host whose disk doesn't survive restarts/redeploys
//     (Render's free plan, most free-tier PaaS hosts).
//
//   - MONGODB_URI is unset -> lib/store-file.js (a single JSON file on
//     local disk). Use this on a real server/VPS/Docker volume where the
//     filesystem is actually persistent — no external account needed.
//
// Every function on the returned object is async (returns a Promise) so
// callers should always `await` them, whichever backend is active.
const backend = process.env.MONGODB_URI ? "./store-mongo" : "./store-file";
module.exports = require(backend);
