const store = require("../lib/store");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

const STATUSES = ["backlog", "in_progress", "done"];

function clean(body, existing) {
  const data = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (STATUSES.includes(body.status)) data.status = body.status;
  if (!existing && !data.status) data.status = "backlog";
  return data;
}

module.exports = function registerRoadmapRoutes(router) {
  // Anyone signed in can see the plan — it keeps the whole team aligned on
  // what's shipped and what's next, not just admins.
  router.get("/api/roadmap", async (req, res) => {
    if (!requireAuth(req, res)) return;
    sendJson(res, 200, await store.list("roadmap"));
  });

  // Only admins curate the roadmap itself.
  router.post("/api/roadmap", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody(req);
    const data = clean(body, null);
    if (!data.title) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть назву пункту." });
    data.createdBy = req.user.id;
    sendJson(res, 201, await store.create("roadmap", data));
  });

  router.patch("/api/roadmap/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("roadmap", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const patch = clean(body, existing);
    sendJson(res, 200, await store.update("roadmap", params.id, patch));
  });

  router.delete("/api/roadmap/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("roadmap", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    await store.remove("roadmap", params.id);
    sendJson(res, 200, { ok: true });
  });
};
