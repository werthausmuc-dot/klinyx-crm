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

function fmtJobLine(job, client) {
  const parts = [];
  parts.push("👤 " + escapeHtml(client ? client.name : "Клієнт видалений"));
  parts.push("📅 " + job.date + (job.time ? " о " + job.time : ""));
  if (job.service) parts.push("🧹 " + escapeHtml(job.service));
  // The address is always a tappable Google Maps link now, not just plain
  // text — one tap and the cleaner has directions instead of copy-pasting.
  if (job.address) parts.push('📍 <a href="' + mapsLink(job.address) + '">' + escapeHtml(job.address) + "</a>");
  if (job.price) parts.push("💶 " + job.price + " €");
  // Both note fields always show when they have content — the job's own
  // note (this occurrence only) and the client's standing note (gate
  // codes, key location, pet warnings...), which used to be left out of
  // Telegram entirely even though it's often the more important one.
  if (job.notes) parts.push("📝 " + escapeHtml(job.notes));
  if (client && client.notes) parts.push("ℹ️ " + escapeHtml(client.notes));
  return parts.join("\n");
}

async function notifyAssignee(job, client, assigneeUser) {
  if (!assigneeUser || !assigneeUser.telegramChatId) return;
  const text = "🆕 <b>Вам призначено завдання</b>\n\n" + fmtJobLine(job, client);
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
// the assigned employee (if any) that they have a new task.
async function onJobCreated(job, createdByUser) {
  if (!telegram.isConfigured()) return;
  try {
    const client = await store.get("clients", job.clientId);
    await notifyAdminsNewOrder(job, client, createdByUser);
    if (job.assignedTo) {
      const assignee = await store.get("users", job.assignedTo);
      await notifyAssignee(job, client, assignee);
    }
  } catch (err) {
    console.error("[notify] onJobCreated failed:", err.message);
  }
}

// Called after a job is updated. Notifies the newly-assigned employee only
// when the assignment actually changed (avoids spamming on every edit).
async function onJobAssigned(job, previousAssignedTo) {
  if (!telegram.isConfigured()) return;
  if (!job.assignedTo || job.assignedTo === previousAssignedTo) return;
  try {
    const client = await store.get("clients", job.clientId);
    const assignee = await store.get("users", job.assignedTo);
    await notifyAssignee(job, client, assignee);
  } catch (err) {
    console.error("[notify] onJobAssigned failed:", err.message);
  }
}

module.exports = { onJobCreated, onJobAssigned };
