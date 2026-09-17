const crypto = require("crypto");
const store = require("../lib/store");
const telegram = require("../lib/telegram");
const { requireAuth, generateTelegramLinkCode } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");

let cachedBotUsername = null;
let botUsernameFetchedAt = 0;

async function getBotUsername() {
  if (!telegram.isConfigured()) return null;
  // Cache for an hour — getMe() never changes for a given bot token.
  if (cachedBotUsername && Date.now() - botUsernameFetchedAt < 60 * 60 * 1000) {
    return cachedBotUsername;
  }
  const me = await telegram.getMe();
  if (me && me.username) {
    cachedBotUsername = me.username;
    botUsernameFetchedAt = Date.now();
  }
  return cachedBotUsername;
}

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function registerTelegramRoutes(router) {
  // GET /api/telegram/me — the current user's own link status + a
  // ready-to-tap deep link ("https://t.me/BotName?start=123456") that opens
  // Telegram and sends /start 123456 automatically.
  router.get("/api/telegram/me", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const user = await store.get("users", req.user.id);
    const botUsername = await getBotUsername();
    const linked = !!(user && user.telegramChatId);
    const linkCode = user ? user.telegramLinkCode : null;
    sendJson(res, 200, {
      configured: telegram.isConfigured() && !!botUsername,
      linked,
      linkCode,
      botUsername,
      deepLink: botUsername && linkCode ? "https://t.me/" + botUsername + "?start=" + linkCode : null
    });
  });

  // POST /api/telegram/regenerate — get a fresh link code (e.g. the old one
  // was shared with the wrong person, or the user just wants a clean start).
  router.post("/api/telegram/regenerate", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const updated = await store.update("users", req.user.id, { telegramLinkCode: generateTelegramLinkCode() });
    sendJson(res, 200, { linkCode: updated.telegramLinkCode });
  });

  // POST /api/telegram/setup-webhook — admin-only, one-off convenience so
  // the webhook can be (re)registered with Telegram without SSH/CLI access
  // to wherever this app is hosted (this host's own outbound network can
  // reach api.telegram.org even when the operator's own tools can't). Call
  // it once after deploying with TELEGRAM_BOT_TOKEN set, or again any time
  // the public URL changes.
  async function handleSetupWebhook(req, res) {
    // Gated by the same webhook secret rather than a login session, since
    // this is meant to be callable once right after deploy (e.g. via curl,
    // or a plain browser/GET request with ?token=...) before anyone has
    // necessarily logged in yet.
    const expectedSetup = process.env.TELEGRAM_WEBHOOK_SECRET;
    const gotSetup = req.headers["x-setup-token"] || (req.query && req.query.token);
    if (!expectedSetup || !timingSafeEqualStr(gotSetup, expectedSetup)) {
      sendJson(res, 401, { error: "invalid_setup_token" });
      return;
    }
    if (!telegram.isConfigured()) {
      sendJson(res, 400, { error: "telegram_not_configured" });
      return;
    }
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const webhookUrl = proto + "://" + host + "/api/telegram/webhook";
    const result = await telegram.setWebhook(webhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET);
    const me = await telegram.getMe();
    sendJson(res, 200, {
      ok: !!result,
      webhookUrl,
      secretConfigured: !!process.env.TELEGRAM_WEBHOOK_SECRET,
      botUsername: me ? me.username : null
    });
  }

  router.post("/api/telegram/setup-webhook", handleSetupWebhook);
  router.get("/api/telegram/setup-webhook", handleSetupWebhook);

  // POST /api/telegram/webhook — called by Telegram itself, not the CRM's
  // own frontend, so there's no session cookie to check. Instead we verify
  // the secret token Telegram echoes back on every webhook call (set via
  // setWebhook — see scripts/setup-telegram-webhook.js). If no secret is
  // configured, the endpoint still works but anyone who finds the URL could
  // poke it; fine for getting started, but set TELEGRAM_WEBHOOK_SECRET for
  // real use.
  router.post("/api/telegram/webhook", async (req, res) => {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected) {
      const got = req.headers["x-telegram-bot-api-secret-token"];
      if (!timingSafeEqualStr(got, expected)) {
        sendJson(res, 401, { error: "invalid_secret" });
        return;
      }
    }
    const update = await readJsonBody(req).catch(() => null);
    sendJson(res, 200, { ok: true }); // ack immediately; Telegram doesn't care about the rest

    const message = update && update.message;
    const text = message && message.text;
    const chatId = message && message.chat && message.chat.id;
    if (!text || !chatId) return;

    const match = /^\/start(?:\s+(\d{4,8}))?/.exec(text.trim());
    if (!match) return;

    const code = match[1];
    if (!code) {
      await telegram.sendMessage(chatId, "Вітаю! Щоб під'єднатись, відкрийте CRM → натисніть на позначку Telegram і перейдіть за посиланням звідти (або надішліть команду /start з кодом, який там показано).");
      return;
    }

    const users = await store.list("users");
    const user = users.find((u) => u.telegramLinkCode === code);
    if (!user) {
      await telegram.sendMessage(chatId, "Код не знайдено або застарів. Відкрийте CRM і спробуйте ще раз.");
      return;
    }

    await store.update("users", user.id, { telegramChatId: chatId });
    await telegram.sendMessage(
      chatId,
      "✅ Готово, " + (user.name || user.username) + "! Тепер ви отримуватимете сюди сповіщення про призначені завдання."
    );
  });
};
