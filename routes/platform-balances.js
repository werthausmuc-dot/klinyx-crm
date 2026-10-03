const store = require("../lib/store");
const { requireAuth, requireOwner, hasPermission } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

// A running ledger per order-source platform (Clean Valley, MyDay, ...),
// the same pattern as the per-worker "balances" collection: the balance
// shown for a platform is just the sum of its entries, nothing stored as a
// separate total. Positive = the platform owes the company money (they
// collected payment via their own invoice and haven't paid it out yet);
// negative = the company owes the platform (cash/card the company
// collected directly includes the platform's commission, which the
// company keeps instead of returning).
//
// Entries come from two places:
//   - automatic, one per completed job that has a platform + payment
//     method + commission set (see routes/jobs.js's syncPlatformLedgerForJob)
//   - manual, added by the owner here when the platform actually transfers
//     money (a "виплата"/settlement) — mirrors routes/balances.js exactly.
//
// Visibility matches the rest of the "Замовлення" tab: gated behind the
// owner-granted "viewOrders" permission, same as routes/platforms.js.
function requireOrdersView(req, res) {
  if (!requireAuth(req, res)) return false;
  if (!hasPermission(req.user, "viewOrders")) {
    sendJson(res, 403, { error: "forbidden", message: "У вас немає доступу до замовлень." });
    return false;
  }
  return true;
}

function todayStr() {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

module.exports = function registerPlatformBalanceRoutes(router) {
  router.get("/api/platform-balances", async (req, res) => {
    if (!requireOrdersView(req, res)) return;
    sendJson(res, 200, await store.list("platformBalances"));
  });

  // Manual settlement entries are owner-only, same as worker balances —
  // this is the company's money reconciliation, not day-to-day dispatch.
  router.post("/api/platform-balances", async (req, res) => {
    if (!requireOwner(req, res)) return;
    const body = await readJsonBody(req);
    const platformId = typeof body.platformId === "string" ? body.platformId.trim() : "";
    if (!platformId || !(await store.get("platforms", platformId))) {
      return sendJson(res, 400, { error: "invalid_input", message: "Платформу не знайдено." });
    }
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!amount || Number.isNaN(amount)) {
      return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть суму (додатну — нараховано, від'ємну — виплачено/коригування)." });
    }
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayStr();
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const created = await store.create("platformBalances", { platformId, amount, date, note, jobId: null, createdBy: req.user.id });
    sendJson(res, 201, created);
  });

  // Only manual entries can be deleted directly — one tied to a job
  // (jobId set) is kept in sync by routes/jobs.js instead, so deleting it
  // here would just have the next save of that job recreate it.
  router.delete("/api/platform-balances/:id", async (req, res, params) => {
    if (!requireOwner(req, res)) return;
    const existing = await store.get("platformBalances", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    if (existing.jobId) {
      return sendJson(res, 400, { error: "job_linked", message: "Цей запис створено автоматично за завданням — редагуйте саме завдання." });
    }
    await store.remove("platformBalances", params.id);
    sendJson(res, 200, { ok: true });
  });
};
