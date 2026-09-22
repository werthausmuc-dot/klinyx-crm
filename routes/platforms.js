const store = require("../lib/store");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

function clean(body) {
  const data = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.url === "string") {
    let u = body.url.trim();
    if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
    data.url = u;
  }
  if (typeof body.note === "string") data.note = body.note.trim();
  return data;
}

module.exports = function registerPlatformRoutes(router) {
  // Anyone signed in can see and use the quick-access widgets.
  router.get("/api/platforms", async (req, res) => {
    if (!requireAuth(req, res)) return;
    sendJson(res, 200, await store.list("platforms"));
  });

  // Only admins curate the widget list itself.
  router.post("/api/platforms", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody(req);
    const data = clean(body);
    if (!data.title) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть назву платформи." });
    if (!data.url) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть посилання." });
    data.createdBy = req.user.id;
    sendJson(res, 201, await store.create("platforms", data));
  });

  router.patch("/api/platforms/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const patch = clean(body);
    sendJson(res, 200, await store.update("platforms", params.id, patch));
  });

  router.delete("/api/platforms/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    await store.remove("platforms", params.id);
    sendJson(res, 200, { ok: true });
  });
};
