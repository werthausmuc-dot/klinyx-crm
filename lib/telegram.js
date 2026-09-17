// Minimal Telegram Bot API client — plain HTTPS calls via Node's built-in
// https module, no external dependency (mirrors the philosophy used
// elsewhere in this app). Docs: https://core.telegram.org/bots/api
//
// Everything here is a no-op (resolves to null) when TELEGRAM_BOT_TOKEN is
// not set, so the CRM works fine without a bot configured at all — the
// Telegram feature is entirely optional.

const https = require("https");

function token() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function isConfigured() {
  return !!token();
}

function apiCall(method, params) {
  if (!isConfigured()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params || {});
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: "/bot" + token() + "/" + method,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        },
        timeout: 10000
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(raw); } catch (_) { /* ignore */ }
          if (!parsed || parsed.ok !== true) {
            console.error("[telegram] " + method + " failed:", raw.slice(0, 500));
            resolve(null);
            return;
          }
          resolve(parsed.result);
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Telegram API timeout")));
    req.on("error", (err) => {
      console.error("[telegram] " + method + " error:", err.message);
      resolve(null); // never let a Telegram hiccup break the CRM request that triggered it
    });
    req.write(body);
    req.end();
  });
}

function sendMessage(chatId, text) {
  if (!chatId) return Promise.resolve(null);
  return apiCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
}

function getMe() {
  return apiCall("getMe", {});
}

function setWebhook(url, secretToken) {
  const params = { url };
  if (secretToken) params.secret_token = secretToken;
  return apiCall("setWebhook", params);
}

module.exports = { isConfigured, sendMessage, getMe, setWebhook };
