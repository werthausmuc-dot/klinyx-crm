const store = require("../lib/store");
const { requireAuth } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A worker's own simple "day off" calendar — just a set of dates they've
// marked as unavailable, so an admin assigning jobs can see at a glance
// whether the person they're about to assign is actually free that day.
// Deliberately minimal: no note, no half-days, no approval flow — one
// record per (userId, date) means that person is off that day.
module.exports = function registerTimeoffRoutes(router) {
  // Everyone sees their own days off. Admins see everyone's, so they can
  // plan job assignments around the whole team's availability.
  router.get("/api/timeoff", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const all = await store.list("timeoff");
    const visible = req.user.role === "admin" ? all : all.filter((t) => t.userId === req.user.id);
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
    if (userId !== req.user.id && req.user.role !== "admin") {
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
};
