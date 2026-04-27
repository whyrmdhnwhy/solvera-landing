"use strict";

const axios = require("axios");
const { fetchWalletData, ADDR_REGEX } = require("./walletData");

const TG_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const TG_API      = TG_TOKEN ? `https://api.telegram.org/bot${TG_TOKEN}` : null;
const BOT_USERNAME = process.env.BOT_USERNAME || "solveraHQ_bot";
const DEMO_MODE_TG = process.env.DEMO_MODE === "true";
const BACKEND_URL  = process.env.BACKEND_URL || "https://solveratech.xyz";

async function sendTG(chatId, text) {
  if (!TG_API) return;
  try {
    await axios.post(`${TG_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("[telegram]", err.message);
  }
}

function tgScoreBar(score, max = 100) {
  const filled = Math.round((score / max) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function tgEmoji(level) {
  return level === "LOW" ? "🟢" : level === "MODERATE" ? "🟡" : level === "ELEVATED" ? "🟠" : "🔴";
}

function getVerdict(score) {
  if (score >= 60) return "Serious risk patterns detected. Exercise extreme caution."
  if (score >= 40) return "Multiple risk signals detected. Enhanced review recommended."
  if (score >= 20) return "Minor risk indicators present. Standard caution advised."
  return "No significant risk indicators detected."
}

const TG_TYPOLOGY_NAMES = {
  T1: "Structuring",
  T2: "Layering / Burst Activity",
  T3: "Mixer Interaction",
  T4: "Bridge Abuse",
  T5: "Large Value Transfer",
  T6: "Probing Behavior",
  T7: "Rug Pull Signals",
  T8: "Dev Dump",
  T9: "Crowd Escalation",
};

async function tgHandleStart(chatId) {
  await sendTG(chatId,
    "🛡 *Solvera — Solana Wallet Risk Scanner*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "Paste any Solana wallet address to get an instant AML risk score.\n\n" +
    "*Commands:*\n" +
    "`/check <address>` — Free risk score + verdict\n" +
    "`/breakdown <address>` — Full risk analysis ($0.02)\n" +
    "`/trace <address>` — Transaction analysis ($0.08)\n" +
    "`/help` — Show this message\n\n" +
    "_9 risk signals (FATF-aligned) | solveratech.xyz_"
  );
}

async function tgHandleHelp(chatId) {
  await sendTG(chatId,
    "🔍 *Solvera Commands*\n\n" +
    "*Free:*\n" +
    "`/check <address>` — Risk score + verdict\n\n" +
    "*Paid (USDC):*\n" +
    "`/breakdown <address>` — $0.02\n" +
    "Full risk analysis — T1-T9 typology breakdown\n\n" +
    "`/trace <address>` — $0.08\n" +
    "Transaction analysis — patterns + protocol exposure\n\n" +
    "💡 _You can also just paste a wallet address directly._\n\n" +
    "_9 risk signals (FATF-aligned) | solveratech.xyz_"
  );
}

async function tgHandleCheck(chatId, address) {
  if (!address) {
    return sendTG(chatId,
      "❓ *Usage:* `/check <wallet_address>`\n\n" +
      "Example:\n`/check So11111111111111111111111111111111111111112`"
    );
  }
  if (!ADDR_REGEX.test(address)) {
    return sendTG(chatId, "❌ *Invalid address*\nSolana addresses are 32-44 base58 characters.");
  }
  await sendTG(chatId, `🔄 Scanning \`${address.slice(0, 6)}...${address.slice(-4)}\`...`);
  try {
    const { risk, meta } = await fetchWalletData(address);
    const emoji   = tgEmoji(risk.level);
    const bar     = tgScoreBar(risk.score);
    const verdict = getVerdict(risk.score);
    await sendTG(chatId,
      `${emoji} *Solvera Risk Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📍 \`${address.slice(0, 6)}...${address.slice(-4)}\`\n\n` +
      `📊 *${risk.score} / 100*\n` +
      `${bar}\n` +
      `*${risk.level}*\n\n` +
      `💬 _${verdict}_\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `➡️ \`/breakdown ${address}\` — Full risk analysis ($0.02)\n` +
      `➡️ \`/trace ${address}\` — Transaction analysis ($0.08)\n\n` +
      `🔗 [View on Solscan](https://solscan.io/account/${address})\n` +
      `_solveratech.xyz_`
    );
  } catch (err) {
    console.error("[/check]", err.message);
    await sendTG(chatId, "❌ *Failed to scan wallet.*\nPlease try again.");
  }
}

async function tgHandleBreakdown(chatId, address) {
  if (!address) return sendTG(chatId, "❓ *Usage:* `/breakdown <wallet_address>`");
  if (!ADDR_REGEX.test(address)) return sendTG(chatId, "❌ *Invalid address*");

  if (!DEMO_MODE_TG) {
    return sendTG(chatId,
      "🔒 *Risk Breakdown — $0.02 USDC*\n\n" +
      "This feature requires payment.\n" +
      "Visit solveratech.xyz to unlock with USDC.\n\n" +
      "_x402 Telegram payment coming soon._"
    );
  }

  await sendTG(chatId, `🔄 Generating breakdown for \`${address.slice(0, 6)}...${address.slice(-4)}\`...`);
  try {
    const { risk, meta } = await fetchWalletData(address);
    const emoji = tgEmoji(risk.level);

    const triggeredCodes = new Set(
      (risk.flags || [])
        .filter(f => f.type === "danger" || f.type === "warn")
        .map(f => {
          for (const [code, name] of Object.entries(TG_TYPOLOGY_NAMES)) {
            if (f.label.toLowerCase().includes(name.toLowerCase().split(" ")[0].toLowerCase())) return code;
          }
          return null;
        })
        .filter(Boolean)
    );

    let reply =
      `${emoji} *Solvera Risk Breakdown*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📍 \`${address.slice(0, 6)}...${address.slice(-4)}\`\n` +
      `📊 Score: *${risk.score}/100* — *${risk.level}*\n` +
      `📈 Transactions analyzed: ${meta.txCount}\n\n` +
      `*T1-T9 Typology Analysis:*\n`;

    for (const [code, name] of Object.entries(TG_TYPOLOGY_NAMES)) {
      const triggered = triggeredCodes.has(code);
      reply += triggered ? `🔴 *${code}: ${name}*\n` : `🟢 ${code}: ${name} — CLEAR\n`;
    }

    const flagged = [...triggeredCodes].map(c => TG_TYPOLOGY_NAMES[c]).filter(Boolean);
    if (flagged.length > 0) {
      reply += `\n*Flagged behaviors:* ${flagged.join(", ")}\n`;
      reply += `_Enhanced due diligence recommended._\n`;
    } else {
      reply += `\n_No risk flags detected. Standard due diligence applies._\n`;
    }

    reply += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    reply += `➡️ \`/trace ${address}\` — Full analysis ($0.08)\n`;
    reply += `➡️ \`/report ${address}\` — PDF report ($2.00)\n`;
    reply += `\n_Powered by Solvera | solveratech.xyz_`;

    await sendTG(chatId, reply);
  } catch (err) {
    console.error("[/breakdown]", err.message);
    await sendTG(chatId, "❌ *Failed to generate breakdown.*\nPlease try again.");
  }
}

async function tgHandleTrace(chatId, address) {
  if (!address) return sendTG(chatId, "❓ *Usage:* `/trace <wallet_address>`");
  if (!ADDR_REGEX.test(address)) return sendTG(chatId, "❌ *Invalid address*");

  if (!DEMO_MODE_TG) {
    return sendTG(chatId,
      "🔒 *Full Trace — $0.08 USDC*\n\n" +
      "This feature requires payment.\n" +
      "Visit solveratech.xyz to unlock with USDC.\n\n" +
      "_x402 Telegram payment coming soon._"
    );
  }

  await sendTG(chatId, `🔄 Running full trace on \`${address.slice(0, 6)}...${address.slice(-4)}\`...`);
  try {
    const { risk, meta } = await fetchWalletData(address);
    const emoji = tgEmoji(risk.level);

    const dangerFlags = (risk.flags || []).filter(f => f.type === "danger" || f.type === "warn");
    const cleanFlags  = (risk.flags || []).filter(f => f.type === "clean");

    let reply =
      `${emoji} *Solvera Full Trace*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📍 \`${address.slice(0, 6)}...${address.slice(-4)}\`\n` +
      `📊 Score: *${risk.score}/100* — *${risk.level}*\n\n` +
      `*Transaction Behavior:*\n` +
      `• Transactions analyzed: ${meta.txCount}\n` +
      `• Risk flags: ${dangerFlags.length}\n`;

    if (cleanFlags.length > 0) reply += `• Clean signals: ${cleanFlags.length}\n`;
    reply += `\n`;

    reply += `*Protocol Exposure:*\n`;
    const protocols = [];
    for (const f of risk.flags) {
      if (f.label.includes("MIXER"))  protocols.push("Privacy mixers");
      if (f.label.includes("BRIDGE")) protocols.push("Cross-chain bridges");
      if (f.label.includes("RUG"))    protocols.push("Raydium LP (rug pull pattern)");
      if (f.label.includes("DEX"))    protocols.push("Jupiter/Raydium/Orca DEX (clean)");
    }
    protocols.length > 0
      ? protocols.forEach(p => { reply += `• ${p}\n`; })
      : reply += `• No notable protocol interactions\n`;
    reply += `\n`;

    reply += `*Risk Context:*\n`;
    if (risk.score >= 60) {
      reply += `⚠️ High-risk behavioral patterns detected. Recommend blocking or enhanced verification.\n`;
    } else if (risk.score >= 30) {
      reply += `⚠️ Elevated risk signals. Enhanced due diligence recommended.\n`;
    } else {
      reply += `No significant risk indicators. Behavior consistent with normal usage.\n`;
    }

    reply += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    reply += `➡️ \`/report ${address}\` — PDF report ($2.00)\n`;
    reply += `🔗 [View on Solscan](https://solscan.io/account/${address})\n`;
    reply += `\n_Powered by Solvera | solveratech.xyz_`;

    await sendTG(chatId, reply);
  } catch (err) {
    console.error("[/trace]", err.message);
    await sendTG(chatId, "❌ *Failed to run trace.*\nPlease try again.");
  }
}

async function tgHandleReport(chatId, address) {
  if (!address) return sendTG(chatId, "❓ *Usage:* `/report <wallet_address>`");
  if (!ADDR_REGEX.test(address)) return sendTG(chatId, "❌ *Invalid address*");

  if (!DEMO_MODE_TG) {
    return sendTG(chatId,
      "🔒 *Compliance Report — $2.00 USDC*\n\n" +
      "STR-ready PDF with FATF predicate crime mapping,\n" +
      "5W+2H framework, and recommended actions.\n\n" +
      "Visit solveratech.xyz to unlock with USDC.\n\n" +
      "_x402 Telegram payment coming soon._"
    );
  }

  await sendTG(chatId, `🔄 Generating compliance report for \`${address.slice(0, 6)}...${address.slice(-4)}\`...`);
  try {
    const { risk } = await fetchWalletData(address);
    const pdfUrl = `${BACKEND_URL}/api/wallet/${address}/report.pdf`;

    await sendTG(chatId,
      `📄 *Solvera Compliance Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📍 \`${address.slice(0, 6)}...${address.slice(-4)}\`\n` +
      `📊 Score: *${risk.score}/100* — *${risk.level}*\n\n` +
      `*Report includes:*\n` +
      `• STR-ready format\n` +
      `• FATF predicate crime mapping\n` +
      `• 5W+2H investigation framework\n` +
      `• Recommended actions\n` +
      `• Watermarked PDF with audit trail\n\n` +
      `📥 [Download PDF Report](${pdfUrl})\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Powered by Solvera | solveratech.xyz_`
    );
  } catch (err) {
    console.error("[/report]", err.message);
    await sendTG(chatId, "❌ *Failed to generate report.*\nPlease try again.");
  }
}

async function handleTGMessage(msg) {
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const text   = msg.text.trim().replace(`@${BOT_USERNAME}`, "");

  if (text === "/start")             return tgHandleStart(chatId);
  if (text === "/help")              return tgHandleHelp(chatId);
  if (text.startsWith("/check"))     return tgHandleCheck(chatId, text.split(/\s+/)[1] || null);
  if (text.startsWith("/breakdown")) return tgHandleBreakdown(chatId, text.split(/\s+/)[1] || null);
  if (text.startsWith("/trace"))     return tgHandleTrace(chatId, text.split(/\s+/)[1] || null);
  if (text.startsWith("/report"))    return tgHandleReport(chatId, text.split(/\s+/)[1] || null);
  if (ADDR_REGEX.test(text))         return tgHandleCheck(chatId, text);

  await sendTG(chatId,
    "Use `/check <address>` for a free risk score.\n" +
    "Or just paste a wallet address directly.\n\n" +
    "Type `/help` for all commands."
  );
}

module.exports = { handleTGMessage };
