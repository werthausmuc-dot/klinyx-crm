const store = require("../lib/store");
const { requireAuth, requireOwner, hasPermission } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A simple ledger of what the company owes a given worker (positive
// amounts) or has paid out to them (negative amounts) — "баланс" in the
// Ukrainian conversation this was built from. The running balance for a
// worker is just the sum of their entries; there's no separate stored
// total. Only the owner adds or removes entries (it's payroll data), but
// an admin/employee the owner has granted "viewOthersBalance" can see
// everyone's — otherwise a person only ever sees their own.
function todayStr() {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

module.exports = function registerBalanceRoutes(router) {
  router.get("/api/balances", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const all = await store.list("balances");
    const visible = hasPermission(req.user, "viewOthersBalance") ? all : all.filter((b) => b.userId === req.user.id);
    sendJson(res, 200, visible);
  });

  router.post("/api/balances", async (req, res) => {
    if (!requireOwner(req, res)) return;
    const body = await readJsonBody(req);
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId || !(await store.get("users", userId))) {
      return sendJson(res, 400, { error: "invalid_input", message: "Співробітника не знайдено." });
    }
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!amount || Number.isNaN(amount)) {
      return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть суму (додатну — нараховано, від'ємну — виплачено)." });
    }
    const date = typeof body.date === "string" && DATE_RE.test(body.date) ? body.date : todayStr();
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const created = await store.create("balances", { userId, amount, date, note, createdBy: req.user.id });
    sendJson(res, 201, created);
  });

  router.delete("/api/balances/:id", async (req, res, params) => {
    if (!requireOwner(req, res)) return;
    const existing = await store.get("balances", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    await store.remove("balances", params.id);
    sendJson(res, 200, { ok: true });
  });
};
