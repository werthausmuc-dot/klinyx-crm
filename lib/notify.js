// Telegram notifications for job/order events. Kept separate from
// routes/jobs.js so the route file stays focused on HTTP concerns.
//
// Every function here is best-effort: if Telegram isn't configured, or a
// particular user hasn't linked their account yet, sending is silently
// skipped — it never blocks or fails the CRM request that triggered it.

const store = require("./store");
const telegram = require("./telegram");

// Telegram sends this with parse_mode: "HTML" (see lib/telegram.js), so any
// free text that came from a form field — a name, an address, a note — has
// to be escaped before it goes into the message. Otherwise a stray "<", ">"
// or "&" someone typed breaks the HTML and Telegram silently rejects the
// whole notification.
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function mapsLink(address) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
}

// A job's `assignedTo` is always an array now (a job can go to a whole
// crew), but normalize defensively anyway — an older record, or anything
// that slipped past routes/jobs.js's own normalization, might still have
// the pre-migration shape (a single id string, or null/undefined).
function assigneeIds(job) {
  const a = job && job.assignedTo;
  if (Array.isArray(a)) return a.filter(Boolean);
  if (typeof a === "string" && a) return [a];
  return [];
}

// What a specific assignee earns for this one job: their own hourly rate
// (set on their user record, owner-only to edit — see routes/users.js)
// times the job's estimated/worked hours. Null if either half is missing,
// so callers never fall back to showing the client-facing price instead.
function workerPayFor(job, assigneeUser) {
  const rate = assigneeUser && typeof assigneeUser.hourlyRate === "number" ? assigneeUser.hourlyRate : null;
  const hours = job && typeof job.hours === "number" ? job.hours : null;
  if (rate == null || hours == null || hours <= 0) return null;
  return Math.round(rate * hours * 100) / 100;
}

// `opts.pay`, when given, replaces the price line with this assignee's own
// payout. `opts.hidePrice` suppresses the client-facing price entirely when
// no payout could be computed (missing rate or hours) — an assignee must
// never see the full price as a fallback, even then.
function fmtJobLine(job, client, opts) {
  opts = opts || {};
  const parts = [];
  parts.push("👤 " + escapeHtml(client ? client.name : "Клієнт видалений"));
  parts.push("📅 " + job.date + (job.time ? " о " + job.time : ""));
  if (job.service) parts.push("🧹 " + escapeHtml(job.service));
  // The address is always a tappable Google Maps link now, not just plain
  // text — one tap and the cleaner has directions instead of copy-pasting.
  if (job.address) parts.push('📍 <a href="' + mapsLink(job.address) + '">' + escapeHtml(job.address) + "</a>");
  if (job.hours) parts.push("⏱ " + job.hours + " год.");
  if (opts.pay != null) parts.push("💶 Оплата: " + opts.pay + " €");
  else if (!opts.hidePrice && job.price) parts.push("💶 " + job.price + " €");
  // Both note fields always show when they have content — the job's own
  // note (this occurrence only) and the client's standing note (gate
  // codes, key location, pet warnings...), which used to be left out of
  // Telegram entirely even though it's often the more important one.
  if (job.notes) parts.push("📝 " + escapeHtml(job.notes));
  if (client && client.notes) parts.push("ℹ️ " + escapeHtml(client.notes));
  return parts.join("\n");
}

// What an assigned worker sees is never the client's price — only their
// own computed payout (their rate × this job's hours), or no payment line
// at all if that can't be computed yet (rate or hours not set).
async function notifyAssignee(job, client, assigneeUser) {
  if (!assigneeUser || !assigneeUser.telegramChatId) return;
  const pay = workerPayFor(job, assigneeUser);
  const text = "🆕 <b>Вам призначено завдання</b>\n\n" + fmtJobLine(job, client, { pay, hidePrice: true });
  await telegram.sendMessage(assigneeUser.telegramChatId, text);
}

async function notifyAdminsNewOrder(job, client, createdByUser) {
  const users = await store.list("users");
  const admins = users.filter((u) => u.role === "admin" && u.telegramChatId && u.active !== false);
  if (!admins.length) return;
  const who = createdByUser ? " (додав: " + escapeHtml(createdByUser.name || createdByUser.username) + ")" : "";
  const text = "📋 <b>Нове замовлення</b>" + who + "\n\n" + fmtJobLine(job, client);
  await Promise.all(admins.map((a) => telegram.sendMessage(a.telegramChatId, text)));
}

// Called after a job is created. Notifies admins about the new order, and
// every assigned employee (if any) that they have a new task.
async function onJobCreated(job, createdByUser) {
  if (!telegram.isConfigured()) return;
  try {
    const client = await store.get("clients", job.clientId);
    await notifyAdminsNewOrder(job, client, createdByUser);
    const ids = assigneeIds(job);
    await Promise.all(ids.map(async (id) => {
      const assignee = await store.get("users", id);
      await notifyAssignee(job, client, assignee);
    }));
  } catch (err) {
    console.error("[notify] onJobCreated failed:", err.message);
  }
}

// Called after a job is updated. Notifies only the newly-added assignee(s)
// — comparing against the previous assignment — so re-saving a job with
// the same crew, or adding one more person to it, doesn't re-spam everyone
// who was already on it.
async function onJobAssigned(job, previousAssignedTo) {
  if (!telegram.isConfigured()) return;
  const before = assigneeIds({ assignedTo: previousAssignedTo });
  const after = assigneeIds(job);
  const added = after.filter((id) => before.indexOf(id) === -1);
  if (!added.length) return;
  try {
    const client = await store.get("clients", job.clientId);
    await Promise.all(added.map(async (id) => {
      const assignee = await store.get("users", id);
      await notifyAssignee(job, client, assignee);
    }));
  } catch (err) {
    console.error("[notify] onJobAssigned failed:", err.message);
  }
}

module.exports = { onJobCreated, onJobAssigned };
