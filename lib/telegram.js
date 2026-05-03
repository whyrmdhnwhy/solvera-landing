"use strict";

const axios = require("axios");
const Redis = require("ioredis");
const { fetchWalletData, ADDR_REGEX } = require("./walletData");

const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TG_API     = TG_TOKEN ? `https://api.telegram.org/bot${TG_TOKEN}` : null;
const BOT_USERNAME = process.env.BOT_USERNAME || "SolveraScanBot";

// ── Redis (TLS-forced for Upstash, matching lib/redis.js) ────────────────────
const redisUrl   = process.env.REDIS_URL || "redis://localhost:6379";
const isUpstash  = redisUrl.includes("upstash.io");
const redis = new Redis(redisUrl, {
  lazyConnect:          false,
  maxRetriesPerRequest: 1,
  connectTimeout:       5000,
  enableOfflineQueue:   false,
  ...(isUpstash && { tls: {} }),
});
redis.on("error", (err) => console.warn("[telegram redis]", err.message));

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sendTG(chatId, text, inlineKeyboard = null) {
  if (!TG_API) return;
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
    await axios.post(`${TG_API}/sendMessage`, payload);
  } catch (err) {
    console.error("[telegram send]", err.response?.data || err.message);
  }
}

async function answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
  if (!TG_API) return;
  try {
    await axios.post(`${TG_API}/answerCallbackQuery`, {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    });
  } catch (err) {
    console.error("[telegram cb]", err.message);
  }
}

async function checkRateLimit(chatId) {
  try {
    const hourKey  = `tg:limit:hour:${chatId}`;
    const dayKey   = `tg:limit:day:${chatId}`;
    const hourCount = await redis.incr(hourKey);
    if (hourCount === 1) await redis.expire(hourKey, 3600);
    const dayCount = await redis.incr(dayKey);
    if (dayCount === 1) await redis.expire(dayKey, 86400);
    if (dayCount > 500)  return { allowed: false, reason: "day" };
    if (hourCount > 30)  return { allowed: false, reason: "hour", ttl: await redis.ttl(hourKey) };
    return { allowed: true };
  } catch {
    // Redis down — allow scan, don't block
    return { allowed: true };
  }
}

// ── Risk formatting (mirrors landing page output) ─────────────────────────────
function riskEmoji(level) {
  return { LOW: "🟢", MODERATE: "🟡", ELEVATED: "🟠", HIGH: "🔴" }[level] || "⚪";
}

function riskBar(score) {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function formatFreeResult(address, risk, meta) {
  const emoji   = riskEmoji(risk.level);
  const bar     = riskBar(risk.score);
  const short   = `${address.slice(0, 6)}...${address.slice(-5)}`;

  // Triggered flags — same as landing page
  const triggered = risk.typologies
    ? Object.values(risk.typologies).filter(t => t.triggered)
    : [];

  let flagLines = "";
  if (triggered.length > 0) {
    flagLines = "\n\n<b>Flags triggered:</b>\n";
    for (const t of triggered) {
      const icon = t.id === "T3" || t.id === "T4" ? "🚨"
                 : t.id === "T7" || t.id === "T8" ? "⚠️"
                 : "⚡";
      flagLines += `${icon} <b>${t.name}</b> (+${t.score})\n`;
    }
  } else {
    flagLines = "\n\n✅ No risk flags triggered.";
  }

  let callToAction = "";
  if (risk.level === "LOW") {
    callToAction = "Nothing notable in recent on-chain activity.";
  } else if (risk.level === "MODERATE") {
    callToAction = "Minor signals present. Not alarming, but worth noting.";
  } else if (risk.level === "ELEVATED") {
    callToAction = "Several risk patterns detected. Worth a closer look.";
  } else {
    callToAction = "Multiple serious patterns flagged. Proceed with caution.";
  }

  return (
    `${emoji} <b>Solvera Scan</b>\n` +
    `<code>${short}</code>\n\n` +
    `<b>Risk Score:</b> ${risk.score} / 100\n` +
    `<b>Band:</b> ${risk.level}  ${bar}\n` +
    `<b>Txs Analysed:</b> ${meta?.txCount || 0}\n` +
    flagLines +
    `\n\n${callToAction}`
  );
}

function formatPaidResult(address, risk, meta) {
  const emoji = riskEmoji(risk.level);
  const short = `${address.slice(0, 6)}...${address.slice(-5)}`;

  const triggered = risk.typologies
    ? Object.values(risk.typologies).filter(t => t.triggered)
    : [];

  let signalsText = "";
  if (triggered.length > 0) {
    for (const t of triggered) {
      signalsText += `\n🔍 <b>${t.id}: ${t.name}</b> (+${t.score} pts)\n`;
      signalsText += `<i>${t.detail || "Pattern matches high-risk behavior."}</i>\n`;
    }
  } else {
    signalsText = "\nNone notable.";
  }

  const cleanSignal = risk.cleanSignal;
  let cleanLine = "";
  if (cleanSignal?.active) {
    cleanLine = `\n✅ <b>Clean signal:</b> <i>${cleanSignal.detail}</i> (-${cleanSignal.reduction} pts)\n`;
  }

  return (
    `${emoji} <b>Full Solvera Report</b>\n` +
    `<code>${short}</code>\n\n` +
    `<b>Score:</b> ${risk.score} / 100   <b>Band:</b> ${risk.level}\n\n` +
    `<b>Signals triggered:</b>` +
    signalsText +
    cleanLine +
    `\n<b>What I checked:</b>\n` +
    `• ${meta?.txCount || 0} transactions analysed\n` +
    `• Counterparty addresses screened\n` +
    `• 9 AML typologies evaluated\n\n` +
    `<i>Disagree with the call? Override is on you.\nI read fast, you trade.</i>`
  );
}

// ── Command handlers ──────────────────────────────────────────────────────────
async function handleStart(chatId) {
  const text =
    `👋 <b>Solvera — Solana Wallet Risk Scanner</b>\n\n` +
    `Paste any Solana wallet address and I'll score it against 9 AML risk patterns.\n\n` +
    `<b>Free tier:</b> Risk score + band + triggered flag names\n` +
    `<b>Paid tier:</b> Full signal breakdown with reasoning ($0.02 via USDC)\n\n` +
    `Try this example:\n<code>HkGz4KmoZ7Zmk7HN6ndJ31UJ1qZ2qgwQxgVqQwovpZES</code>`;
  const keyboard = [
    [{ text: "🔍 Try example wallet", callback_data: "scan_HkGz4KmoZ7Zmk7HN6ndJ31UJ1qZ2qgwQxgVqQwovpZES" }],
    [{ text: "ℹ️ What does this do?", callback_data: "cmd_about" }],
    [{ text: "💰 Pricing", callback_data: "cmd_pricing" }],
  ];
  await sendTG(chatId, text, keyboard);
}

async function handleAbout(chatId) {
  const text =
    `<b>Solvera — Solana AML Risk Engine</b>\n\n` +
    `I score wallets against 9 risk typologies:\n\n` +
    `T1 • Structuring\n` +
    `T2 • Layering / Burst activity\n` +
    `T3 • Mixer interaction\n` +
    `T4 • Bridge abuse\n` +
    `T5 • Large value transfer\n` +
    `T6 • Probing behavior\n` +
    `T7 • Rug pull LP removal\n` +
    `T8 • Dev dump\n` +
    `T9 • Crowd escalation\n\n` +
    `Built on Helius. Same engine as <a href="https://solveratech.xyz">solveratech.xyz</a>.`;
  const keyboard = [
    [{ text: "💰 Pricing", callback_data: "cmd_pricing" }],
    [{ text: "🔍 Scan a wallet", callback_data: "prompt_scan" }],
  ];
  await sendTG(chatId, text, keyboard);
}

async function handlePricing(chatId) {
  const text =
    `<b>Solvera Pricing</b>\n\n` +
    `🆓 <b>Free tier:</b>\n` +
    `• Score (0–100) + risk band\n` +
    `• Flag names that triggered\n` +
    `• Unlimited scans (30/hr rate limit)\n\n` +
    `💎 <b>Paid tier ($0.02/scan):</b>\n` +
    `• Everything in free tier\n` +
    `• Full reasoning per signal\n` +
    `• Exact transaction hashes analyzed\n` +
    `• Counterparty addresses checked\n\n` +
    `Payment via x402 (USDC). No account needed.`;
  const keyboard = [
    [{ text: "🔍 Scan a wallet", callback_data: "prompt_scan" }],
    [{ text: "❓ What's x402?", callback_data: "info_x402" }],
  ];
  await sendTG(chatId, text, keyboard);
}

async function handleHelp(chatId) {
  const text =
    `<b>Commands:</b>\n\n` +
    `/start — Welcome\n` +
    `/scan <code>ADDRESS</code> — Scan a wallet\n` +
    `/about — What I check\n` +
    `/pricing — Free vs paid\n\n` +
    `Or just paste a Solana address directly.`;
  await sendTG(chatId, text);
}

// ── Scan handlers ─────────────────────────────────────────────────────────────
async function handleScanFree(chatId, address) {
  if (!ADDR_REGEX.test(address)) {
    if (address.length === 42 && address.startsWith("0x")) {
      return sendTG(chatId, "That looks like an Ethereum address.\nI read Solana for now — multi-chain is on the roadmap.");
    }
    return sendTG(chatId, "That doesn't look like a valid Solana address.\n\nSolana addresses are 32–44 chars, base58.\nPaste from your wallet app and try again.");
  }

  const rate = await checkRateLimit(chatId);
  if (!rate.allowed) {
    if (rate.reason === "day") {
      return sendTG(chatId, "You've hit the daily scan limit (500/day).\nTry again tomorrow.");
    }
    const minutes = Math.ceil((rate.ttl || 60) / 60);
    return sendTG(chatId,
      `Free tier: 30 scans/hour.\nTry again in ${minutes} minute(s), or pay $0.02 to skip the wait.`,
      [[{ text: "Pay $0.02 to skip wait", callback_data: `pay_${address}` }]]
    );
  }

  await sendTG(chatId, `🔍 Scanning <code>${address.slice(0, 6)}...${address.slice(-5)}</code>\nUsually takes ~10 seconds…`);

  try {
    const { risk, meta, account } = await fetchWalletData(address);

    if (!meta || meta.txCount === 0) {
      return sendTG(chatId,
        "⚪ This wallet has no on-chain history yet.\n\nEither it's brand new or the address isn't correct.\nScore: N/A"
      );
    }

    if (risk?.flags?.some(f => f.label === "PROGRAM ACCOUNT")) {
      return sendTG(chatId,
        "🔷 <b>PROGRAM ACCOUNT</b>\n\nThis is a Solana smart contract, not a user wallet.\nAML behavioral typologies (T1–T9) don't apply to programs."
      );
    }

    // Cache for paid scan (5 min)
    await redis.set(`tg:scan:${chatId}:${address}`, JSON.stringify({ risk, meta, account }), "EX", 300)
      .catch(() => {});

    const text = formatFreeResult(address, risk, meta);
    const keyboard = [
      [{ text: "📋 Full reasoning ($0.02)", callback_data: `pay_${address}` }],
      [{ text: "🔍 Scan another wallet", callback_data: "prompt_scan" }],
    ];
    if (risk.level === "HIGH") {
      keyboard.push([{ text: "❓ What does HIGH mean?", callback_data: "info_high" }]);
    }

    await sendTG(chatId, text, keyboard);

  } catch (err) {
    console.error("[/scan]", err.message, err.stack);
    await sendTG(chatId, "⚠️ Couldn't read this wallet right now.\nTry again in 30 seconds.");
  }
}

async function handlePaidPaymentPrompt(chatId, address) {
  const text =
    `💳 <b>Unlock full reasoning for $0.02</b>\n\n` +
    `<code>${address.slice(0, 6)}...${address.slice(-5)}</code>\n\n` +
    `You'll get: every signal that triggered, with full detail and reasoning.\n\n` +
    `Payment via x402 (USDC). No account needed.`;
  const keyboard = [
    [{ text: "✅ Pay & unlock", callback_data: `confirm_pay_${address}` }],
    [{ text: "❌ Cancel", callback_data: `cancel_pay_${address}` }],
  ];
  await sendTG(chatId, text, keyboard);
}

async function handlePaidUnlock(chatId, address) {
  await sendTG(chatId, "✅ Payment confirmed. Generating full report…");

  try {
    let risk, meta, account;
    const cached = await redis.get(`tg:scan:${chatId}:${address}`).catch(() => null);
    if (cached) {
      const parsed = JSON.parse(cached);
      risk    = parsed.risk;
      meta    = parsed.meta;
      account = parsed.account;
    } else {
      const result = await fetchWalletData(address);
      risk    = result.risk;
      meta    = result.meta;
      account = result.account;
    }

    const text = formatPaidResult(address, risk, meta);
    const keyboard = [
      [{ text: "🔍 Scan another wallet", callback_data: "prompt_scan" }],
      [{ text: "🐛 Report a bug / false positive", callback_data: "cmd_feedback" }],
    ];
    await sendTG(chatId, text, keyboard);

  } catch (err) {
    console.error("[/paid]", err.message);
    await sendTG(chatId, "⚠️ Couldn't generate the full report right now. Please try again.");
  }
}

// ── Main message router ───────────────────────────────────────────────────────
async function handleTGMessage(body) {
  // Callback query (button press)
  if (body.callback_query) {
    const cb     = body.callback_query;
    const chatId = cb.message.chat.id;
    const data   = cb.data;
    await answerCallbackQuery(cb.id);

    if (data === "cmd_about")      return handleAbout(chatId);
    if (data === "cmd_pricing")    return handlePricing(chatId);
    if (data === "cmd_feedback")   return sendTG(chatId, "Send feedback or bug reports to <a href=\"mailto:hello@solveratech.xyz\">hello@solveratech.xyz</a>");
    if (data === "prompt_scan")    return sendTG(chatId, "Paste a Solana wallet address:");
    if (data === "info_x402")      return sendTG(chatId, "x402 is a protocol for per-request USDC payments. No account, no subscription — just pay per scan.");
    if (data === "info_multichain") return sendTG(chatId, "Ethereum and Base support is on the roadmap. Solana first.");
    if (data === "info_high")      return sendTG(chatId, "🔴 HIGH means severe behavioral patterns were detected — such as mixer exposure, rug pulls, or dev dumps.\n\nUnlock full reasoning for $0.02 to see exactly which ones.");

    if (data.startsWith("scan_"))        return handleScanFree(chatId, data.replace("scan_", ""));
    if (data.startsWith("pay_"))         return handlePaidPaymentPrompt(chatId, data.replace("pay_", ""));
    if (data.startsWith("confirm_pay_")) return handlePaidUnlock(chatId, data.replace("confirm_pay_", ""));
    if (data.startsWith("cancel_pay_")) {
      return sendTG(chatId, "No charge. Cancelled.", [
        [{ text: "Try again", callback_data: data.replace("cancel_", "") }],
        [{ text: "Back to free result", callback_data: `scan_${data.replace("cancel_pay_", "")}` }],
      ]);
    }
    if (data.startsWith("share_")) {
      const addr = data.replace("share_", "");
      return sendTG(chatId, `🔗 Share link:\nsolveratech.xyz/?address=${addr}\n\nAnyone with this link can view the free scan result.`);
    }
    return;
  }

  // Text message
  if (!body.message?.text) return;
  const msg    = body.message;
  const chatId = msg.chat.id;
  const text   = msg.text.trim().replace(`@${BOT_USERNAME}`, "").trim();

  if (text === "/start")    return handleStart(chatId);
  if (text === "/help")     return handleHelp(chatId);
  if (text === "/about")    return handleAbout(chatId);
  if (text === "/pricing")  return handlePricing(chatId);
  if (text.startsWith("/scan")) {
    const parts = text.split(/\s+/);
    return handleScanFree(chatId, parts[1] || "");
  }

  const tokens = text.split(/\s+/);
  if (tokens.length === 1 && ADDR_REGEX.test(tokens[0])) {
    return handleScanFree(chatId, tokens[0]);
  }
  if (tokens.length === 1 && tokens[0].startsWith("0x")) {
    return sendTG(chatId, "That looks like an Ethereum address.\nI read Solana for now — multi-chain is on the roadmap.");
  }

  await sendTG(chatId, "I only read Solana wallet addresses.\n\nPaste a wallet address or use /help.");
}

module.exports = { handleTGMessage };
