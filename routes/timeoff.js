const store = require("../lib/store");
const { requireAuth, hasPermission } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// A worker's own simple "day off" calendar — just a set of dates they've
// marked as unavailable, so whoever's assigning jobs can see at a glance
// whether the person they're about to assign is actually free that day.
// One record per (userId, date) means that person is off that day. The
// record can optionally carry a `from`/`to` time range for a partial day
// off (e.g. off 13:00–17:00 for an appointment) — no range means the
// whole day.
//
// Editing someone else's schedule needs the "editOthersSchedule"
// permission (owner-granted, per user — see lib/auth.js); it's no longer
// implied by the "admin" role alone.
function canEdit(req, userId) {
  return userId === req.user.id || hasPermission(req.user, "editOthersSchedule");
}
function canViewOthers(req) {
  return hasPermission(req.user, "viewOthersSchedule") || hasPermission(req.user, "editOthersSchedule");
}
module.exports = function registerTimeoffRoutes(router) {
  // Everyone sees their own days off. Whoever has the "view others'
  // schedule" (or "edit others' schedule") permission sees everyone's, so
  // they can plan job assignments around the whole team's availability.
  router.get("/api/timeoff", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const all = await store.list("timeoff");
    const visible = canViewOthers(req) ? all : all.filter((t) => t.userId === req.user.id);
    sendJson(res, 200, visible);
  });

  // Toggles a single day for a user: creates the "day off" record if it
  // doesn't exist yet, removes it if it does. Returns { removed: true } or
  // the created record, so the frontend can update its local state either
  // way without a follow-up GET.
  router.post("/api/timeoff/toggle", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readJsonBody(req);
    const date = typeof body.date === "string" ? body.date.trim() : "";
    if (!DATE_RE.test(date)) return sendJson(res, 400, { error: "invalid_input", message: "Некоректна дата." });

    let userId = typeof body.userId === "string" && body.userId ? body.userId : req.user.id;
    if (!canEdit(req, userId)) {
      return sendJson(res, 403, { error: "forbidden", message: "Ви можете редагувати лише свій графік." });
    }
    if (userId !== req.user.id) {
      const target = await store.get("users", userId);
      if (!target) return sendJson(res, 400, { error: "invalid_input", message: "Співробітника не знайдено." });
    }

    const all = await store.list("timeoff");
    const existing = all.find((t) => t.userId === userId && t.date === date);
    if (existing) {
      await store.remove("timeoff", existing.id);
      return sendJson(res, 200, { removed: true, id: existing.id });
    }
    const created = await store.create("timeoff", { userId, date, createdBy: req.user.id });
    sendJson(res, 201, created);
  });

  // Sets (or clears) a partial-day range on the off record for (userId,
  // date), creating the record if it doesn't exist yet. Both from and to
  // must be given to set a range; both empty clears the range, leaving a
  // whole-day-off record behind (use DELETE to remove it entirely).
  router.post("/api/timeoff/hours", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readJsonBody(req);
    const date = typeof body.date === "string" ? body.date.trim() : "";
    if (!DATE_RE.test(date)) return sendJson(res, 400, { error: "invalid_input", message: "Некоректна дата." });

    const userId = typeof body.userId === "string" && body.userId ? body.userId : req.user.id;
    if (!canEdit(req, userId)) return sendJson(res, 403, { error: "forbidden", message: "Ви можете редагувати лише свій графік." });
    if (userId !== req.user.id && !(await store.get("users", userId))) {
      return sendJson(res, 400, { error: "invalid_input", message: "Співробітника не знайдено." });
    }

    const from = typeof body.from === "string" ? body.from.trim() : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (from && !TIME_RE.test(from)) return sendJson(res, 400, { error: "invalid_input", message: "Некоректний час початку." });
    if (to && !TIME_RE.test(to)) return sendJson(res, 400, { error: "invalid_input", message: "Некоректний час завершення." });
    if ((from && !to) || (!from && to)) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть і початок, і завершення." });
    if (from && to && from >= to) return sendJson(res, 400, { error: "invalid_input", message: "Час завершення має бути пізніше за початок." });

    const all = await store.list("timeoff");
    const existing = all.find((rec) => rec.userId === userId && rec.date === date);
    if (existing) {
      const updated = await store.update("timeoff", existing.id, { from: from || null, to: to || null });
      return sendJson(res, 200, updated);
    }
    const created = await store.create("timeoff", { userId, date, from: from || null, to: to || null, createdBy: req.user.id });
    sendJson(res, 201, created);
  });

  // Removes a single off record outright (whole-day or partial), by id.
  router.delete("/api/timeoff/:id", async (req, res, params) => {
    if (!requireAuth(req, res)) return;
    const existing = await store.get("timeoff", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    if (!canEdit(req, existing.userId)) return sendJson(res, 403, { error: "forbidden", message: "Ви можете редагувати лише свій графік." });
    await store.remove("timeoff", params.id);
    sendJson(res, 200, { ok: true });
  });
};
