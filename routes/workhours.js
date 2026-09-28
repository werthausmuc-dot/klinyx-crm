const store = require("../lib/store");
const { requireAuth } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_HOURS = 24;

// A worker's actual worked time per day — separate from the "days off"
// calendar. One record per (userId, date) holding the number of hours
// worked that day (decimals allowed, e.g. 7.5). Manually entered by the
// worker or an admin; there's no automatic clock-in/out yet.
function canEdit(req, userId) {
  return userId === req.user.id || req.user.role === "admin";
}

module.exports = function registerWorkhoursRoutes(router) {
  // Everyone sees their own worked hours. Admins see everyone's, for payroll
  // and planning purposes.
  router.get("/api/workhours", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const all = await store.list("workhours");
    const visible = req.user.role === "admin" ? all : all.filter((w) => w.userId === req.user.id);
    sendJson(res, 200, visible);
  });

  // Upserts the worked-hours record for (userId, date). hours <= 0 (or
  // missing) removes the record instead of storing a zero.
  router.post("/api/workhours/set", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readJsonBody(req);
    const date = typeof body.date === "string" ? body.date.trim() : "";
    if (!DATE_RE.test(date)) return sendJson(res, 400, { error: "invalid_input", message: "Некоректна дата." });

    const userId = typeof body.userId === "string" && body.userId ? body.userId : req.user.id;
    if (!canEdit(req, userId)) return sendJson(res, 403, { error: "forbidden", message: "Ви можете редагувати лише свій відпрацьований час." });
    if (userId !== req.user.id && !(await store.get("users", userId))) {
      return sendJson(res, 400, { error: "invalid_input", message: "Співробітника не знайдено." });
    }

    const hours = typeof body.hours === "number" ? body.hours : Number(body.hours);
    const all = await store.list("workhours");
    const existing = all.find((rec) => rec.userId === userId && rec.date === date);

    if (!hours || hours <= 0 || Number.isNaN(hours)) {
      if (existing) await store.remove("workhours", existing.id);
      return sendJson(res, 200, { removed: true, id: existing ? existing.id : null });
    }
    if (hours > MAX_HOURS) return sendJson(res, 400, { error: "invalid_input", message: "Не більше " + MAX_HOURS + " год. на день." });

    if (existing) {
      const updated = await store.update("workhours", existing.id, { hours });
      return sendJson(res, 200, updated);
    }
    const created = await store.create("workhours", { userId, date, hours, createdBy: req.user.id });
    sendJson(res, 201, created);
  });
};
