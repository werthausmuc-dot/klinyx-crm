const crypto = require("crypto");
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
  if (typeof body.done === "boolean") data.done = body.done;
  if (body.source === "manual" || body.source === "auto") data.source = body.source;
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
    if (typeof data.done !== "boolean") data.done = false;
    if (!data.source) data.source = "manual";
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

  // Running log of updates per platform (e.g. "зареєструвався", "маю 3
  // замовлення") — appended one at a time, kept as an array on the record
  // itself rather than a separate collection.
  router.post("/api/platforms/:id/notes", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return sendJson(res, 400, { error: "invalid_input", message: "Введіть текст нотатки." });
    const notes = Array.isArray(existing.notes) ? existing.notes.slice() : [];
    notes.push({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString(), createdBy: req.user.id });
    sendJson(res, 201, await store.update("platforms", params.id, { notes }));
  });

  router.delete("/api/platforms/:id/notes/:noteId", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const notes = (Array.isArray(existing.notes) ? existing.notes : []).filter((n) => n.id !== params.noteId);
    sendJson(res, 200, await store.update("platforms", params.id, { notes }));
  });

  // Checklist of tasks per platform (e.g. "Реєстрація" → Виконано), each
  // one keeping its own history of status changes so past states aren't
  // lost when it flips back and forth.
  router.post("/api/platforms/:id/tasks", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть назву завдання." });
    const now = new Date().toISOString();
    const tasks = Array.isArray(existing.tasks) ? existing.tasks.slice() : [];
    tasks.push({ id: crypto.randomUUID(), title, done: false, history: [{ done: false, changedAt: now }] });
    sendJson(res, 201, await store.update("platforms", params.id, { tasks }));
  });

  router.patch("/api/platforms/:id/tasks/:taskId", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const tasks = Array.isArray(existing.tasks) ? existing.tasks.slice() : [];
    const idx = tasks.findIndex((t) => t.id === params.taskId);
    if (idx === -1) return sendJson(res, 404, { error: "not_found" });
    const task = Object.assign({}, tasks[idx]);
    if (typeof body.title === "string" && body.title.trim()) task.title = body.title.trim();
    if (typeof body.done === "boolean" && body.done !== task.done) {
      task.done = body.done;
      task.history = (Array.isArray(task.history) ? task.history.slice() : []).concat([
        { done: body.done, changedAt: new Date().toISOString() }
      ]);
    }
    tasks[idx] = task;
    sendJson(res, 200, await store.update("platforms", params.id, { tasks }));
  });

  router.delete("/api/platforms/:id/tasks/:taskId", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("platforms", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const tasks = (Array.isArray(existing.tasks) ? existing.tasks : []).filter((t) => t.id !== params.taskId);
    sendJson(res, 200, await store.update("platforms", params.id, { tasks }));
  });
};
