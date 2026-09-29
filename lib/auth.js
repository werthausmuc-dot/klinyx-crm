const crypto = require("crypto");
const { sendJson } = require("./http-utils");
const store = require("./store");

// The granular, owner-managed permissions an admin or employee can be
// granted individually — separate from (and not implied by) the "admin"
// role, which still only gates account management (Команда), inventory,
// and similar existing admin-only areas. See ensureOwnerAssigned below for
// how "the owner" is determined.
const PERMISSION_KEYS = [
  "editOthersSchedule",
  "viewOthersSchedule",
  "viewOthersBalance",
  "viewEarnings",
  "editClients",
  "showClientsCount",
  "showOrdersCount",
  "showDebt",
  "showBalance"
];

function normalizePermissions(raw) {
  const out = {};
  PERMISSION_KEYS.forEach((key) => { out[key] = !!(raw && raw[key] === true); });
  return out;
}

// Password hashing via Node's built-in scrypt — no external dependency.
// Stored as "salt:hash", both hex.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return salt + ":" + hash;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || stored.indexOf(":") === -1) return false;
  const [salt, hashHex] = stored.split(":");
  let hashBuf, suppliedBuf;
  try {
    hashBuf = Buffer.from(hashHex, "hex");
    suppliedBuf = crypto.scryptSync(String(password), salt, 64);
  } catch (e) {
    return false;
  }
  return hashBuf.length === suppliedBuf.length && crypto.timingSafeEqual(hashBuf, suppliedBuf);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active !== false,
    createdAt: user.createdAt,
    telegramLinked: !!user.telegramChatId,
    isOwner: !!user.isOwner,
    permissions: normalizePermissions(user.permissions)
  };
}

// True if `user` (the sanitized req.user) is allowed to do something gated
// by `key`. The owner always has every permission, whether or not it's
// explicitly set on their record — owner status isn't itself grantable.
function hasPermission(user, key) {
  return !!(user && (user.isOwner || (user.permissions && user.permissions[key] === true)));
}

// "The owner" is simply whoever created the very first account in the
// system (the one made through the one-time /api/auth/setup flow) — no
// separate signup step, no manual toggle to forget. Since there's no
// server-side cron here (see the recurring-jobs comment in routes/jobs.js
// for why), this runs as the same kind of lazy catch-up: checked once per
// server process the first time it's needed, then cached in memory so
// normal requests don't pay for an extra users-list read.
let ownerChecked = false;
async function ensureOwnerAssigned() {
  if (ownerChecked) return;
  const users = await store.list("users");
  if (!users.length) return; // nothing to assign yet (pre-setup)
  if (!users.some((u) => u.isOwner)) {
    const earliest = users.slice().sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))[0];
    if (earliest) await store.update("users", earliest.id, { isOwner: true });
  }
  ownerChecked = true;
}

// A short numeric code an employee types into the Telegram bot (as
// "/start CODE", or just taps a deep link) to connect their CRM account to
// their Telegram chat. Doesn't need to be cryptographically unguessable —
// worst case someone who already has your CRM login could also link their
// own Telegram to your account, which isn't a meaningful escalation.
function generateTelegramLinkCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function requireAuth(req, res) {
  if (!req.user) {
    sendJson(res, 401, { error: "not_authenticated" });
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  if (!requireAuth(req, res)) return false;
  if (req.user.role !== "admin") {
    sendJson(res, 403, { error: "admin_only" });
    return false;
  }
  return true;
}

// The owner is the one account that manages everyone else's granular
// permissions (and can't have its own admin/active status changed by
// anyone, including itself, to avoid an accidental lockout).
function requireOwner(req, res) {
  if (!requireAuth(req, res)) return false;
  if (!req.user.isOwner) {
    sendJson(res, 403, { error: "owner_only", message: "Цю дію може виконати лише власник акаунта." });
    return false;
  }
  return true;
}

// Small in-memory brute-force guard: N failed attempts per username locks
// that username out for a cooldown window. Resets on success. Intentionally
// simple — good enough for a small internal tool's login form, not a
// substitute for rate limiting at the network edge if ever exposed
// more broadly.
const failedAttempts = new Map(); // username -> { count, lockedUntil }
const MAX_ATTEMPTS = 8;
const LOCK_MS = 5 * 60 * 1000;

function isLocked(username) {
  const key = String(username || "").toLowerCase();
  const rec = failedAttempts.get(key);
  if (!rec) return false;
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return true;
  if (rec.lockedUntil && rec.lockedUntil <= Date.now()) failedAttempts.delete(key);
  return false;
}

function recordFailure(username) {
  const key = String(username || "").toLowerCase();
  const rec = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.count = 0;
  }
  failedAttempts.set(key, rec);
}

function recordSuccess(username) {
  failedAttempts.delete(String(username || "").toLowerCase());
}

module.exports = {
  hashPassword,
  verifyPassword,
  sanitizeUser,
  generateTelegramLinkCode,
  requireAuth,
  requireAdmin,
  requireOwner,
  hasPermission,
  normalizePermissions,
  ensureOwnerAssigned,
  PERMISSION_KEYS,
  isLocked,
  recordFailure,
  recordSuccess
};
