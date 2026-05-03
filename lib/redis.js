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

async function trackScan(address) {
  if (!isConnected()) return;
  try {
    const timestamp = Date.now();
    await client.incr('soltrace:stats:scans_total');
    await client.zadd('soltrace:stats:scans_history', timestamp, `${timestamp}:${address}`);
  } catch (err) {
    console.warn("Redis trackScan error:", err.message);
  }
}

async function getScanStats(limit = 20) {
  if (!isConnected()) return { totalScans: 0, recentScans: [] };
  try {
    const totalScans = await client.get('soltrace:stats:scans_total');
    const recentScansRaw = await client.zrevrange('soltrace:stats:scans_history', 0, limit - 1);
    const recentScans = recentScansRaw.map(entry => {
      const parts = entry.split(':');
      const ts = parseInt(parts[0], 10);
      const address = parts.slice(1).join(':');
      return { timestamp: ts, address };
    });
    return {
      totalScans: parseInt(totalScans || '0', 10),
      recentScans
    };
  } catch (err) {
    console.warn("Redis getScanStats error:", err.message);
    return { totalScans: 0, recentScans: [] };
  }
}

async function trackPageView(visitorId) {
  if (!isConnected()) return;
  try {
    await client.incr('soltrace:stats:pageviews_total');
    // HyperLogLog for unique visitor estimation (no PII stored)
    if (visitorId) {
      await client.pfadd('soltrace:stats:unique_visitors', visitorId);
    }
  } catch (err) {
    console.warn("Redis trackPageView error:", err.message);
  }
}

async function getPageViewStats() {
  if (!isConnected()) return { totalPageViews: 0, uniqueVisitors: 0 };
  try {
    const totalPageViews = await client.get('soltrace:stats:pageviews_total');
    const uniqueVisitors = await client.pfcount('soltrace:stats:unique_visitors');
    return {
      totalPageViews: parseInt(totalPageViews || '0', 10),
      uniqueVisitors: uniqueVisitors || 0
    };
  } catch (err) {
    console.warn("Redis getPageViewStats error:", err.message);
    return { totalPageViews: 0, uniqueVisitors: 0 };
  }
}

module.exports = { connect, isConnected, reportWallet, getEscalationScore, getReports, trackScan, getScanStats, trackPageView, getPageViewStats };
