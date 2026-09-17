const store = require("../lib/store");
const { requireAdmin } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

// Chemical / consumable-supply inventory ("Крок 3" of the roadmap). Kept
// admin-only end to end — employees don't manage stock or write things off,
// they just get told to use less when a job costs too much chemical, via
// the low-stock badge an admin sees here.

const UNITS = ["л", "кг", "шт", "уп"];
const LOG_TYPES = ["usage", "restock", "adjust"];

function cleanItem(body, existing) {
  const data = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (UNITS.includes(body.unit)) data.unit = body.unit;
  if (!existing && !data.unit) data.unit = "л";
  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "" && !Number.isNaN(Number(body.quantity))) {
    data.quantity = Math.max(0, Number(body.quantity));
  }
  if (!existing && data.quantity === undefined) data.quantity = 0;
  if (body.minQuantity !== undefined && body.minQuantity !== null && body.minQuantity !== "" && !Number.isNaN(Number(body.minQuantity))) {
    data.minQuantity = Math.max(0, Number(body.minQuantity));
  }
  if (!existing && data.minQuantity === undefined) data.minQuantity = 0;
  return data;
}

function withLowFlag(item) {
  return Object.assign({}, item, { low: Number(item.quantity) <= Number(item.minQuantity || 0) });
}

module.exports = function registerInventoryRoutes(router) {
  router.get("/api/inventory", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const items = await store.list("inventory");
    items.sort((a, b) => a.name.localeCompare(b.name, "uk"));
    sendJson(res, 200, items.map(withLowFlag));
  });

  router.post("/api/inventory", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody(req);
    const data = cleanItem(body, null);
    if (!data.name) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть назву товару." });
    const created = await store.create("inventory", data);
    sendJson(res, 201, withLowFlag(created));
  });

  router.patch("/api/inventory/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("inventory", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    const body = await readJsonBody(req);
    const patch = cleanItem(body, existing);
    const updated = await store.update("inventory", params.id, patch);
    sendJson(res, 200, withLowFlag(updated));
  });

  router.delete("/api/inventory/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const existing = await store.get("inventory", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    await store.remove("inventory", params.id);
    sendJson(res, 200, { ok: true });
  });

  // POST /api/inventory/:id/log — record usage/restock/correction and
  // adjust the item's running quantity accordingly. "usage" can optionally
  // be tied to a job so you can see what chemical a given order consumed;
  // "restock" and "adjust" are stock-only and never carry a job.
  router.post("/api/inventory/:id/log", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    const item = await store.get("inventory", params.id);
    if (!item) return sendJson(res, 404, { error: "not_found" });

    const body = await readJsonBody(req);
    const type = LOG_TYPES.includes(body.type) ? body.type : null;
    const amount = Number(body.quantity);
    if (!type) return sendJson(res, 400, { error: "invalid_input", message: "Невідомий тип операції." });
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть кількість більше нуля." });
    }

    let jobId = null;
    let jobLabel = null;
    if (type === "usage" && typeof body.jobId === "string" && body.jobId) {
      const job = await store.get("jobs", body.jobId);
      if (!job) return sendJson(res, 400, { error: "invalid_input", message: "Завдання не знайдено." });
      jobId = job.id;
      const client = await store.get("clients", job.clientId);
      jobLabel = (job.date || "") + (client ? " · " + client.name : "");
    }

    const current = Number(item.quantity) || 0;
    const nextQuantity =
      type === "restock" ? current + amount :
      type === "adjust" ? Math.max(0, amount) : // "adjust" sets the absolute stock level
      Math.max(0, current - amount); // usage

    const updatedItem = await store.update("inventory", item.id, { quantity: nextQuantity });

    const log = await store.create("inventoryLogs", {
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      type,
      quantity: amount,
      resultingQuantity: nextQuantity,
      jobId,
      jobLabel,
      note: typeof body.note === "string" ? body.note.trim() : "",
      userId: req.user.id,
      userName: req.user.name
    });

    sendJson(res, 200, { item: withLowFlag(updatedItem), log });
  });

  // GET /api/inventory/logs — history, optionally filtered by item or job
  // (?itemId=... / ?jobId=...), newest first. Powers both a per-item usage
  // history and a "what chemical did this job use" view.
  router.get("/api/inventory/logs", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    let logs = await store.list("inventoryLogs");
    const { itemId, jobId } = req.query || {};
    if (itemId) logs = logs.filter((l) => l.itemId === itemId);
    if (jobId) logs = logs.filter((l) => l.jobId === jobId);
    logs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    sendJson(res, 200, logs);
  });
};
