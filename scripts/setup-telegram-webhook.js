#!/usr/bin/env node
// One-time setup: tells Telegram where to send bot updates.
//
// Usage:
//   node scripts/setup-telegram-webhook.js https://your-app.onrender.com
//
// Reads TELEGRAM_BOT_TOKEN (required) and TELEGRAM_WEBHOOK_SECRET
// (optional but recommended) from the environment / .env file.

const path = require("path");
const { loadEnv } = require("../lib/env");
loadEnv(path.join(__dirname, "..", ".env"));

const telegram = require("../lib/telegram");

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error("Usage: node scripts/setup-telegram-webhook.js https://your-app.onrender.com");
  process.exit(1);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set (add it to .env or export it before running this).");
  process.exit(1);
}

const webhookUrl = baseUrl.replace(/\/$/, "") + "/api/telegram/webhook";

telegram.setWebhook(webhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET).then((result) => {
  if (result === null) {
    console.error("Failed to set webhook — check the token and URL above.");
    process.exit(1);
  }
  console.log("Webhook set to:", webhookUrl);
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.warn("Note: TELEGRAM_WEBHOOK_SECRET is not set — anyone who finds this URL could send fake updates. Set it and re-run this script when convenient.");
  }
  return telegram.getMe();
}).then((me) => {
  if (me) console.log("Bot is @" + me.username + " — this is what employees will message.");
});
