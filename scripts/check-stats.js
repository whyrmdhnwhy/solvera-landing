#!/usr/bin/env node
/**
 * CLI Script: Check Solvera Landing Page Analytics
 *
 * Usage:
 *   node scripts/check-stats.js                          # uses localhost:3000
 *   node scripts/check-stats.js --url https://solvera.io # uses production
 *   node scripts/check-stats.js --limit 100              # show last 100 scans
 *   node scripts/check-stats.js --secret mysecret        # pass admin secret
 *
 * Examples:
 *   node scripts/check-stats.js
 *   node scripts/check-stats.js --url https://solvera-landing.vercel.app --secret abc123 --limit 30
 */

const args = process.argv.slice(2);

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return defaultVal;
  return args[idx + 1];
}

const baseUrl = getArg('url', 'http://localhost:3000');
const limit = getArg('limit', '50');
const secret = getArg('secret', '');

async function main() {
  const params = new URLSearchParams({ limit });
  if (secret) params.set('secret', secret);

  const url = `${baseUrl}/api/admin/stats?${params}`;

  console.log(`\n🔍 Fetching analytics from: ${baseUrl}\n`);

  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(`❌ Error ${res.status}: ${body.error || res.statusText}`);
      process.exit(1);
    }

    const data = await res.json();

    // ── Summary ──
    console.log('┌──────────────────────────────────────────────┐');
    console.log('│         📊 SOLVERA SCAN ANALYTICS            │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│  Page Views:        ${String(data.pageViews || 0).padStart(8)}               │`);
    console.log(`│  Unique Visitors:   ${String(data.uniqueVisitors || 0).padStart(8)}               │`);
    console.log(`│  Total Scans:       ${String(data.totalScans).padStart(8)}               │`);
    console.log(`│  Unique Wallets:    ${String(data.uniqueWalletsInWindow).padStart(8)}  (in window)    │`);
    console.log('└──────────────────────────────────────────────┘');

    // ── Recent Scans ──
    if (data.recentScans && data.recentScans.length > 0) {
      console.log(`\n📋 Recent Scans (showing last ${data.recentScans.length}):\n`);
      console.log('  #   │ Wallet Address                              │ Scanned At');
      console.log('──────┼─────────────────────────────────────────────┼──────────────────────');
      
      data.recentScans.forEach((scan, i) => {
        const num = String(i + 1).padStart(4);
        const addr = scan.address.padEnd(43);
        const time = scan.scannedAt.replace('T', ' ').replace('Z', ' UTC');
        console.log(`  ${num} │ ${addr} │ ${time}`);
      });

      // ── Top Scanned Wallets ──
      const freq = {};
      data.recentScans.forEach(s => { freq[s.address] = (freq[s.address] || 0) + 1; });
      const top = Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      if (top.length > 0) {
        console.log('\n🏆 Top Scanned Wallets:\n');
        top.forEach(([addr, count], i) => {
          const bar = '█'.repeat(Math.min(count, 30));
          console.log(`  ${String(i + 1).padStart(2)}. ${addr}  ${bar} (${count}x)`);
        });
      }
    } else {
      console.log('\n  No scans recorded yet.');
    }

    console.log('');
  } catch (err) {
    console.error(`❌ Failed to connect: ${err.message}`);
    console.error(`   Make sure the server is running at ${baseUrl}`);
    process.exit(1);
  }
}

main();
