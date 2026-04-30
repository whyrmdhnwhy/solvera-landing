"use strict";

const axios = require("axios");
const Redis = require("ioredis");
const { fetchWalletData, ADDR_REGEX } = require("./walletData");

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = TG_TOKEN ? `https://api.telegram.org/bot${TG_TOKEN}` : null;
const BOT_USERNAME = process.env.BOT_USERNAME || "SolveraScanBot";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function sendTG(chatId, text, inlineKeyboard = null) {
  if (!TG_API) return;
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (inlineKeyboard) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }
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
  const hourKey = `tg:limit:hour:${chatId}`;
  const dayKey = `tg:limit:day:${chatId}`;
  
  const hourCount = await redis.incr(hourKey);
  if (hourCount === 1) await redis.expire(hourKey, 3600);
  
  const dayCount = await redis.incr(dayKey);
  if (dayCount === 1) await redis.expire(dayKey, 86400);

  if (dayCount > 500) return { allowed: false, reason: "day" };
  if (hourCount > 30) return { allowed: false, reason: "hour", ttl: await redis.ttl(hourKey) };

  return { allowed: true };
}

async function handleStart(chatId) {
  const text = `I read Solana wallets.\n\nPaste any Solana address. I'll tell you what I see.\n\nFree tier: risk score and band.\nPaid tier: every signal that triggered, with reasoning. $0.02 per scan via x402.\n\nTry me with this example wallet first:\n<code>HkGz4KmoZ7Zmk7HN6ndJ31UJ1qZ2qgwQxgVqQwovpZES</code>\n\nOr paste your own.`;
  const keyboard = [
    [{ text: "Try example wallet", callback_data: "scan_HkGz4KmoZ7Zmk7HN6ndJ31UJ1qZ2qgwQxgVqQwovpZES" }],
    [{ text: "What does this do?", callback_data: "cmd_about" }],
    [{ text: "Pricing", callback_data: "cmd_pricing" }]
  ];
  await sendTG(chatId, text, keyboard);
}

async function handleAbout(chatId) {
  const text = `I'm Solvera. A wallet risk agent for Solana.\n\nI read on-chain activity, score it against 9 risk patterns, and tell you what I see in plain language.\n\nI was built by an analyst with years of background investigating financial crime in banking. That training shaped how I think about risk. But I'm built for everyone, not just enterprise.\n\nThe 9 patterns I check:\n- Layering and structuring\n- Smurfing and fund splitting\n- Mixer exposure\n- Sanctions proximity\n- Failed-transaction spam\n- LP rug removal\n- Dev dump cadence\n- Crowd escalation (the moment retail piles in)\n\nThree of those are Solana-native. Most tools don't have them.\n\nI don't store your scans. I don't track who you are.\nI just read wallets.\n\nBuilt on Helius. Paid via x402.\nMulti-chain (Ethereum, Base) is on the roadmap.`;
  const keyboard = [
    [{ text: "See pricing", callback_data: "cmd_pricing" }],
    [{ text: "Scan a wallet", callback_data: "prompt_scan" }]
  ];
  await sendTG(chatId, text, keyboard);
}

async function handlePricing(chatId) {
  const text = `Free tier:\n- Score (0-100)\n- Risk band (LOW / MODERATE / ELEVATED / HIGH)\n- Unlimited scans\n\nPaid tier ($0.02 per scan):\n- All free tier outputs\n- Full signal breakdown (which patterns triggered, with weight)\n- Reasoning per signal\n- Transaction hashes I read\n- Counterparty addresses I checked\n\nPayment via x402 (USDC on Base).\nNo subscription. No account. No API key.\nPay per scan, that's it.\n\nFor developers needing API access at volume:\nAPI tier coming soon.\n\nMulti-chain support (Ethereum, Base) on roadmap.\nSolana first because that's where I was built.`;
  const keyboard = [
    [{ text: "Scan a wallet", callback_data: "prompt_scan" }],
    [{ text: "What's x402?", callback_data: "info_x402" }],
    [{ text: "When multi-chain?", callback_data: "info_multichain" }]
  ];
  await sendTG(chatId, text, keyboard);
}

async function handleHelp(chatId) {
  const text = `Quick commands:\n\n/start - Welcome and example scan\n/scan <address> - Scan a Solana wallet\n/about - What I do\n/pricing - Free vs paid tier\n\nOr just paste a Solana address.\nI'll scan it.\n\nBug or false positive?\nTap below.`;
  const keyboard = [
    [{ text: "Report a bug", callback_data: "cmd_feedback" }],
    [{ text: "Suggest a feature", callback_data: "cmd_feedback" }]
  ];
  await sendTG(chatId, text, keyboard);
}

function tgEmoji(level) {
  return level === "LOW" ? "🟢" : level === "MODERATE" ? "🟡" : level === "ELEVATED" ? "🟠" : "🔴";
}

async function handleScanFree(chatId, address) {
  if (!ADDR_REGEX.test(address)) {
    if (address.length === 42 && address.startsWith("0x")) {
      return sendTG(chatId, "That looks like an Ethereum address.\nI read Solana for now.\n\nMulti-chain (Ethereum, Base) is on the roadmap.\nFor now, paste a Solana wallet.");
    }
    return sendTG(chatId, "That doesn't look like a Solana address.\n\nSolana addresses are 32-44 characters, base58.\nTry again, or paste from your wallet app.");
  }

  const rate = await checkRateLimit(chatId);
  if (!rate.allowed) {
    if (rate.reason === "day") {
      return sendTG(chatId, "You've been busy. Slow down.\n\nYou have reached the daily limit of scans.");
    } else {
      const minutes = Math.ceil(rate.ttl / 60);
      return sendTG(chatId, `You've been busy. Slow down.\n\nFree tier is rate-limited at 30 scans per hour.\nTry again in ${minutes} minutes, or pay $0.02 to skip the wait.`, [
        [{ text: "Pay $0.02 to skip wait", callback_data: `pay_${address}` }]
      ]);
    }
  }

  await sendTG(chatId, `Reading wallet <code>${address.slice(0, 6)}...${address.slice(-5)}</code>\nHold on. About 10 seconds.`);

  try {
    const { risk, meta } = await fetchWalletData(address);
    if (!meta || meta.txCount === 0) {
      return sendTG(chatId, "This wallet has no on-chain history yet.\n\nEither it's brand new, or the address is wrong.\nScore: N/A");
    }

    // Save state for paid scan
    await redis.set(`tg:scan:${chatId}:${address}`, JSON.stringify({ risk, meta }), "EX", 300);

    let explanation = "";
    if (risk.level === "LOW") {
      explanation = "I didn't find anything notable in this wallet's recent activity.\n\nWant full reasoning anyway? $0.02.";
    } else if (risk.level === "MODERATE") {
      explanation = "This wallet has at least one signal worth a closer look.\n\nFull reasoning is $0.02. Or scan another wallet.";
    } else if (risk.level === "ELEVATED") {
      explanation = "This wallet shows patterns that warrant attention.\n\nWant to know what triggered? $0.02 for full breakdown.";
    } else {
      explanation = "This wallet shows multiple risk signals.\n\nWant to know which ones triggered, and why?\nThat's the paid tier. $0.02. One scan, full reasoning.";
    }

    const text = `Score: ${risk.score} / 100\nBand: ${risk.level}\n\n${explanation}`;
    
    const keyboard = [
      [{ text: "See full reasoning ($0.02)", callback_data: `pay_${address}` }],
      [{ text: "Scan another wallet", callback_data: "prompt_scan" }],
    ];
    if (risk.level === "HIGH") {
      keyboard.push([{ text: "What does HIGH mean?", callback_data: "info_high" }]);
    }

    await sendTG(chatId, text, keyboard);

  } catch (err) {
    console.error("[/scan]", err.message);
    await sendTG(chatId, "I couldn't read this one right now.\nTry again in 30 seconds.");
  }
}

async function handlePaidPaymentPrompt(chatId, address) {
  const text = `Pay $0.02 to unlock full reasoning.\n\nx402 will open a one-tap payment in your USDC wallet.\nNo account, no API key. Just sign and scan.`;
  const keyboard = [
    [{ text: "Pay & unlock", callback_data: `confirm_pay_${address}` }],
    [{ text: "Cancel", callback_data: `cancel_pay_${address}` }]
  ];
  await sendTG(chatId, text, keyboard);
}

const TG_TYPOLOGY_NAMES = {
  T1: "Structuring and layering",
  T2: "Layering pattern",
  T3: "Mixer exposure",
  T4: "Bridge interaction",
  T5: "Large value transfer",
  T6: "Probing behavior",
  T7: "LP rug removal",
  T8: "Dev dump",
  T9: "Crowd escalation",
};

async function handlePaidUnlock(chatId, address) {
  await sendTG(chatId, `Payment confirmed. Reading the wallet now.`);
  
  try {
    let dataStr = await redis.get(`tg:scan:${chatId}:${address}`);
    let risk, meta;
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      risk = parsed.risk;
      meta = parsed.meta;
    } else {
      const result = await fetchWalletData(address);
      risk = result.risk;
      meta = result.meta;
    }

    let reply = `Score: ${risk.score} / 100\nBand: ${risk.level}\n\nSignals triggered:\n\n`;

    const flags = (risk.flags || []).filter(f => f.type === "danger" || f.type === "warn");
    if (flags.length > 0) {
      for (const f of flags) {
        reply += `🔍 ${f.label}\n`;
        if (f.details) reply += `${f.details}\n\n`;
        else reply += `Pattern matches high risk behavior.\n\n`;
      }
    } else {
      reply += `None notable.\n\n`;
    }

    reply += `What I checked:\n- ${meta.txCount} transactions over 30 days\n`;
    reply += `- Unique counterparty addresses checked\n- Program interactions analyzed\n\n`;
    reply += `Disagree with my call? Override is on you. I read fast,\nyou trade.\n\nScan another wallet? Tap below.`;

    const keyboard = [
      [{ text: "Scan another wallet", callback_data: "prompt_scan" }],
      [{ text: "Share this report", callback_data: `share_${address}` }],
      [{ text: "Report a bug or false positive", callback_data: "cmd_feedback" }]
    ];
    await sendTG(chatId, reply, keyboard);
  } catch (err) {
    console.error("[/paid]", err.message);
    await sendTG(chatId, "I couldn't generate the full report right now.");
  }
}

async function handleTGMessage(body) {
  if (body.callback_query) {
    const cb = body.callback_query;
    const chatId = cb.message.chat.id;
    const data = cb.data;
    
    await answerCallbackQuery(cb.id);

    if (data === "cmd_about") return handleAbout(chatId);
    if (data === "cmd_pricing") return handlePricing(chatId);
    if (data === "prompt_scan") return sendTG(chatId, "Paste a wallet address (the holder, not the token).");
    if (data === "info_x402") return sendTG(chatId, "x402 is an HTTP protocol extension for machine-to-machine payments. It allows you to pay per API call seamlessly via USDC on Base.");
    if (data === "info_multichain") return sendTG(chatId, "Multi-chain support (Ethereum, Base) is on the roadmap. No specific dates yet. Solana first because that's where I was built.");
    if (data === "info_high") return sendTG(chatId, "HIGH means I detected severe behavioral patterns like rug pulls, dev dumps, or direct interaction with privacy mixers.");
    if (data === "cmd_feedback") return sendTG(chatId, "Please send your feedback or bug report to hello@solveratech.xyz");
    
    if (data.startsWith("scan_")) {
      return handleScanFree(chatId, data.replace("scan_", ""));
    }
    if (data.startsWith("pay_")) {
      return handlePaidPaymentPrompt(chatId, data.replace("pay_", ""));
    }
    if (data.startsWith("confirm_pay_")) {
      return handlePaidUnlock(chatId, data.replace("confirm_pay_", ""));
    }
    if (data.startsWith("cancel_pay_")) {
      return sendTG(chatId, "Payment didn't go through.\nNo charge. Try again, or skip.", [
        [{ text: "Try payment again", callback_data: data.replace("cancel_", "") }],
        [{ text: "Back to free tier output", callback_data: `scan_${data.replace("cancel_pay_", "")}` }]
      ]);
    }
    if (data.startsWith("share_")) {
      const address = data.replace("share_", "");
      const short = address.slice(0,8);
      return sendTG(chatId, `Generated a shareable link:\nsolveratech.xyz/r/${short}\n\nAnyone with the link sees this report (no payment needed).\nLink expires in 7 days.`);
    }

    return;
  }

  if (!body.message?.text) return;
  const msg = body.message;
  const chatId = msg.chat.id;
  const text = msg.text.trim().replace(`@${BOT_USERNAME}`, "");

  if (text === "/start") return handleStart(chatId);
  if (text === "/help") return handleHelp(chatId);
  if (text === "/about") return handleAbout(chatId);
  if (text === "/pricing") return handlePricing(chatId);
  if (text.startsWith("/scan")) return handleScanFree(chatId, text.split(/\s+/)[1] || "");
  
  const tokens = text.split(/\s+/);
  if (tokens.length === 1 && ADDR_REGEX.test(tokens[0])) {
    return handleScanFree(chatId, tokens[0]);
  } else if (tokens.length === 1 && tokens[0].length === 42 && tokens[0].startsWith("0x")) {
    return sendTG(chatId, "That looks like an Ethereum address.\nI read Solana for now.\n\nMulti-chain (Ethereum, Base) is on the roadmap.\nFor now, paste a Solana wallet.");
  }

  await sendTG(chatId, "I only do one thing: read wallet addresses.\n\nPaste a Solana wallet, I'll score it.\nFor everything else, /help.");
}

module.exports = { handleTGMessage };
