const store = require("../lib/store");
const { hashPassword, sanitizeUser, generateTelegramLinkCode, requireAuth, requireAdmin, requireOwner, hasPermission, normalizePermissions, PERMISSION_KEYS } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

// The whole "Команда" tab (roster with management controls) is now
// owner-granted via "viewTeam" — nobody sees it by default except the
// owner. GET /api/users/roster below is a separate, deliberately open
// endpoint (job assignment needs it) and is untouched by this.
function requireTeamView(req, res) {
  if (!requireAuth(req, res)) return false;
  if (!hasPermission(req.user, "viewTeam")) {
    sendJson(res, 403, { error: "forbidden", message: "У вас немає доступу до команди." });
    return false;
  }
  return true;
}

module.exports = function registerUserRoutes(router) {
  // GET /api/users/roster — any authenticated user (not just admins) can
  // see the list of active teammates, so everyone can pick who a job is
  // assigned to. Deliberately minimal: no username. telegramLinked is
  // included so whoever assigns a job can see whether the person will
  // actually receive the Telegram notification for it.
  router.get("/api/users/roster", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const users = await store.list("users");
    const roster = users
      .filter((u) => u.active !== false)
      .map((u) => ({ id: u.id, name: u.name, role: u.role, isOwner: !!u.isOwner, telegramLinked: !!u.telegramChatId }));
    sendJson(res, 200, roster);
  });

  // Every route below needs the admin role AND the owner-granted
  // "viewTeam" permission — employees don't manage other accounts, and
  // now neither does an admin the owner hasn't opened this tab for.

  router.get("/api/users", async (req, res) => {
    if (!requireTeamView(req, res)) return;
    sendJson(res, 200, (await store.list("users")).map(sanitizeUser));
  });

  router.post("/api/users", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!hasPermission(req.user, "viewTeam")) return sendJson(res, 403, { error: "forbidden", message: "У вас немає доступу до команди." });
    const body = await readJsonBody(req);
    const { username, password, name, role } = body || {};
    if (!username || !password || String(password).length < 8) {
      return sendJson(res, 400, { error: "invalid_input", message: "Потрібні логін і пароль (мінімум 8 символів)." });
    }
    if (await store.findUserByUsername(username)) {
      return sendJson(res, 409, { error: "username_taken", message: "Такий логін вже існує." });
    }
    const user = await store.create("users", {
      username: String(username).trim(),
      passwordHash: hashPassword(String(password)),
      name: String(name || username).trim(),
      role: role === "admin" ? "admin" : "employee",
      active: true,
      telegramChatId: null,
      telegramLinkCode: generateTelegramLinkCode()
    });
    sendJson(res, 201, sanitizeUser(user));
  });

  router.patch("/api/users/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    if (!hasPermission(req.user, "viewTeam")) return sendJson(res, 403, { error: "forbidden", message: "У вас немає доступу до команди." });
    const existing = await store.get("users", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });

    const body = await readJsonBody(req);
    const patch = {};
    const { name, role, active, password, permissions } = body || {};

    // The owner's own role/active status is untouchable — by anyone,
    // including the owner themself — so nobody can accidentally lock the
    // business out of its own owner-only controls (permission management,
    // the worker balance ledger, etc.).
    if (existing.isOwner && (role !== undefined || active !== undefined)) {
      return sendJson(res, 400, { error: "owner_protected", message: "Роль і статус власника акаунта змінити не можна." });
    }

    if (typeof name === "string") patch.name = name.trim();
    if (role === "admin" || role === "employee") {
      if (existing.role === "admin" && role !== "admin") {
        const users = await store.list("users");
        const admins = users.filter((u) => u.role === "admin" && u.id !== existing.id);
        if (admins.length === 0) {
          return sendJson(res, 400, { error: "last_admin", message: "Не можна прибрати роль адміна в останнього адміністратора." });
        }
      }
      patch.role = role;
    }
    if (typeof active === "boolean") {
      if (existing.role === "admin" && active === false) {
        const users = await store.list("users");
        const activeAdmins = users.filter((u) => u.role === "admin" && u.active !== false && u.id !== existing.id);
        if (activeAdmins.length === 0) {
          return sendJson(res, 400, { error: "last_admin", message: "Не можна вимкнути останнього активного адміністратора." });
        }
      }
      patch.active = active;
    }
    if (password) {
      if (String(password).length < 8) {
        return sendJson(res, 400, { error: "invalid_input", message: "Пароль має бути не коротшим за 8 символів." });
      }
      patch.passwordHash = hashPassword(String(password));
    }

    // Only the owner grants/revokes the individual permissions below —
    // not just any admin — and never for the owner's own record (the
    // owner always implicitly has everything, see hasPermission).
    if (permissions && typeof permissions === "object") {
      if (!requireOwner(req, res)) return;
      if (existing.isOwner) {
        return sendJson(res, 400, { error: "owner_protected", message: "У власника й так є всі дозволи — окремо їх вмикати не потрібно." });
      }
      const invalidKeys = Object.keys(permissions).filter((k) => !PERMISSION_KEYS.includes(k));
      if (invalidKeys.length) {
        return sendJson(res, 400, { error: "invalid_input", message: "Невідомий дозвіл: " + invalidKeys.join(", ") });
      }
      patch.permissions = normalizePermissions(Object.assign({}, existing.permissions, permissions));
    }

    const updated = await store.update("users", params.id, patch);
    sendJson(res, 200, sanitizeUser(updated));
  });

  router.delete("/api/users/:id", async (req, res, params) => {
    if (!requireAdmin(req, res)) return;
    if (!hasPermission(req.user, "viewTeam")) return sendJson(res, 403, { error: "forbidden", message: "У вас немає доступу до команди." });
    const existing = await store.get("users", params.id);
    if (!existing) return sendJson(res, 404, { error: "not_found" });
    if (existing.isOwner) {
      return sendJson(res, 400, { error: "owner_protected", message: "Обліковий запис власника видалити не можна." });
    }
    if (existing.role === "admin") {
      const users = await store.list("users");
      const otherAdmins = users.filter((u) => u.role === "admin" && u.id !== existing.id);
      if (otherAdmins.length === 0) {
        return sendJson(res, 400, { error: "last_admin", message: "Не можна видалити останнього адміністратора." });
      }
    }
    if (existing.id === req.user.id) {
      return sendJson(res, 400, { error: "self_delete", message: "Не можна видалити власний обліковий запис." });
    }
    await store.remove("users", params.id);
    sendJson(res, 200, { ok: true });
  });
};
