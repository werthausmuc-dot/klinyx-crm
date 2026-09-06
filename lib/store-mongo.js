// MongoDB-backed database — used instead of store-file.js when the host's
// disk does NOT survive restarts/redeploys (e.g. Render's free plan, which
// wipes local files every time the service sleeps and wakes back up or is
// redeployed). MongoDB Atlas has a free-forever tier (M0, 512MB, no card
// required, no expiry) that lives outside the web service entirely, so
// your clients/jobs/invoices/users survive no matter what Render does to
// the app's own filesystem.
//
// Activated automatically when the MONGODB_URI environment variable is
// set — see lib/store.js. Needs the "mongodb" package installed (it's
// listed in package.json), which means the host's build step must run
// `npm install` (Render: Settings → Build Command → npm install).

const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const COLLECTIONS = ["users", "clients", "jobs", "invoices"];

let clientPromise = null;
let dbPromise = null;
let indexesEnsured = false;

function getDb() {
  if (!dbPromise) {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    clientPromise = client.connect();
    dbPromise = clientPromise.then((c) => c.db(process.env.MONGODB_DB || "klinyx_crm"));
  }
  return dbPromise;
}

async function ensureIndexes(db) {
  if (indexesEnsured) return;
  indexesEnsured = true;
  await Promise.all(
    COLLECTIONS.map((name) =>
      db.collection(name).createIndex({ id: 1 }, { unique: true }).catch(() => {})
    )
  );
}

async function coll(name) {
  assertCollection(name);
  const db = await getDb();
  await ensureIndexes(db);
  return db.collection(name);
}

function assertCollection(name) {
  if (!COLLECTIONS.includes(name)) {
    throw new Error("Unknown collection: " + name);
  }
}

function stripMongoId(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

function nowIso() {
  return new Date().toISOString();
}

const store = {
  async list(name) {
    const c = await coll(name);
    const docs = await c.find({}).toArray();
    return docs.map(stripMongoId);
  },

  async get(name, recordId) {
    const c = await coll(name);
    const doc = await c.findOne({ id: recordId });
    return stripMongoId(doc);
  },

  async create(name, data) {
    const c = await coll(name);
    const now = nowIso();
    const record = Object.assign({}, data, {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    });
    await c.insertOne(Object.assign({}, record)); // copy: insertOne mutates its argument with _id
    return record;
  },

  async update(name, recordId, patch) {
    const c = await coll(name);
    const now = nowIso();
    const set = Object.assign({}, patch, { updatedAt: now });
    delete set.id; // id is immutable
    const result = await c.findOneAndUpdate(
      { id: recordId },
      { $set: set },
      { returnDocument: "after", includeResultMetadata: true }
    );
    const doc = result && "value" in result ? result.value : result;
    return stripMongoId(doc);
  },

  async remove(name, recordId) {
    const c = await coll(name);
    const result = await c.deleteOne({ id: recordId });
    return result.deletedCount > 0;
  },

  // ---- user-specific helpers ----
  async findUserByUsername(username) {
    const needle = String(username || "").trim();
    if (!needle) return null;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const c = await coll("users");
    const doc = await c.findOne({ username: { $regex: "^" + escaped + "$", $options: "i" } });
    return stripMongoId(doc);
  },

  async hasAnyUsers() {
    const c = await coll("users");
    const count = await c.countDocuments({}, { limit: 1 });
    return count > 0;
  }
};

module.exports = store;
