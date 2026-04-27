/**
 * SolTrace T9 Crowd Escalation Store
 * Copyright (c) 2024 SolTrace / Wahyu. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL
 */

"use strict";

/**
 * SolTrace T9 Crowd Escalation Store
 * File-based key-value store using data/escalations.json
 * Drop-in replacement for Redis — swap to ioredis later when deploying.
 *
 * Schema (escalations.json):
 * {
 *   "<address>": {
 *     "score": 15,
 *     "reports": [
 *       { "reporter": "anon", "reason": "...", "ts": 1234567890 }
 *     ]
 *   }
 * }
 */

const fs = require("fs");
const path = require("path");

// Use /tmp on Vercel (writable, ephemeral) — production should use REDIS_URL instead
const FILE = process.env.VERCEL
  ? "/tmp/soltrace-escalations.json"
  : path.join(__dirname, "data", "escalations.json");
const SCORE_PER_REPORT = 5;
const MAX_SCORE = 35;
const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Silently skip — filesystem not writable (e.g. Vercel without Redis)
  }
}

function pruneOldReports(entry) {
  const cutoff = Date.now() - REPORT_TTL_MS;
  entry.reports = (entry.reports || []).filter(r => r.ts > cutoff);
  entry.score = Math.min(entry.reports.length * SCORE_PER_REPORT, MAX_SCORE);
  return entry;
}

function reportWallet(address, reporter, reason) {
  const data = load();
  if (!data[address]) data[address] = { score: 0, reports: [] };

  pruneOldReports(data[address]);

  data[address].reports.push({ reporter, reason, ts: Date.now() });
  data[address].score = Math.min(data[address].reports.length * SCORE_PER_REPORT, MAX_SCORE);

  save(data);

  return {
    ok: true,
    reports: data[address].reports.length,
    escalationScore: data[address].score,
  };
}

function getEscalationScore(address) {
  const data = load();
  const entry = data[address];
  if (!entry) return 0;
  pruneOldReports(entry);
  return entry.score || 0;
}

function getReports(address) {
  const data = load();
  const entry = data[address];
  if (!entry) return [];
  pruneOldReports(entry);
  return entry.reports || [];
}

module.exports = { reportWallet, getEscalationScore, getReports };
