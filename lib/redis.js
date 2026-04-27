/**
 * SolTrace Redis Client — T9 Crowd Escalation
 *
 * Stores community-reported wallets with escalation scores.
 * Each report adds +5 points (capped at 35 by scorer).
 * Reports expire after 30 days.
 *
 * Keys:
 *   soltrace:report:<address>        → sorted set: { reporter, reason, timestamp }
 *   soltrace:score:<address>         → escalation score (int, TTL 30d)
 */

const Redis = require("ioredis");

const REPORT_TTL = 60 * 60 * 24 * 30; // 30 days in seconds
const SCORE_PER_REPORT = 5;
const MAX_SCORE = 35;

let client = null;
let connected = false;

function connect() {
  if (client) return client;

  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
  });

  client.on("connect", () => {
    connected = true;
    console.log("🔴 Redis connected — T9 Crowd Escalation active");
  });

  client.on("error", (err) => {
    if (connected) console.warn("Redis error:", err.message);
    connected = false;
  });

  client.connect().catch(() => {
    console.warn("⚠️  Redis unavailable — T9 Crowd Escalation disabled (running without Redis)");
  });

  return client;
}

function isConnected() {
  return connected && client?.status === "ready";
}

async function reportWallet(address, reporter, reason) {
  if (!isConnected()) return { ok: false, reason: "Redis unavailable" };

  const key = `soltrace:reports:${address}`;
  const scoreKey = `soltrace:score:${address}`;
  const entry = JSON.stringify({ reporter, reason, ts: Date.now() });

  await client.lpush(key, entry);
  await client.expire(key, REPORT_TTL);

  // Recalculate score
  const count = await client.llen(key);
  const newScore = Math.min(count * SCORE_PER_REPORT, MAX_SCORE);
  await client.setex(scoreKey, REPORT_TTL, newScore);

  return { ok: true, reports: count, escalationScore: newScore };
}

async function getEscalationScore(address) {
  if (!isConnected()) return 0;
  try {
    const score = await client.get(`soltrace:score:${address}`);
    return parseInt(score) || 0;
  } catch {
    return 0;
  }
}

async function getReports(address) {
  if (!isConnected()) return [];
  try {
    const raw = await client.lrange(`soltrace:reports:${address}`, 0, -1);
    return raw.map(r => JSON.parse(r));
  } catch {
    return [];
  }
}

module.exports = { connect, isConnected, reportWallet, getEscalationScore, getReports };
