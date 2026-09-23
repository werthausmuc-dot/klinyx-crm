const store = require("../lib/store");
const { requireAdmin } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A day's own plan — general to-dos for that date ("подзвонити постачальнику",
// "забрати інвентар зі складу"), separate from the cleaning jobs scheduled
// for clients. Admin-only end to end: this is the owner's personal planning
// tool, not something the whole team needs to see.
module.exports = function registerDayPlanRoutes(router) {
  router.get("/api/dayplans", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    sendJson(res, 200, await store.list("dayplans"));
  });

  router.post("/api/dayplans", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody(req);
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!DATE_RE.test(date)) return sendJson(res, 400, { error: "invalid_input", message: "Некоректна дата." });
    if (!text) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть текст завдання." });
    const data = { date, text, done: false, createdBy: req.user.id };
    sendJson(res, 201, await store.create("dayplans", data));
  });

  router.patch("/api/dayplans/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("dayplans", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const patch = {};
    if (typeof body.text === "string" && body.text.trim()) patch.text = body.text.trim();
    if (typeof body.done === "boolean") patch.done = body.done;
    sendJson(res, 200, await store.update("dayplans", params.id, patch));
  });

  router.delete("/api/dayplans/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("dayplans", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    await store.remove("dayplans", params.id);
    sendJson(res, 200, { ok: true });
  });
};
