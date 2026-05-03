/**
 * api/admin/stats.js — Scan Analytics Endpoint
 *
 * Returns total scan count and recent scan history.
 * Protected by a simple API key check via ADMIN_SECRET env var.
 *
 * Query params:
 *   ?limit=50       — number of recent scans to return (default 50)
 *   ?secret=<key>   — must match ADMIN_SECRET env var
 */

const { connect, getScanStats, getPageViewStats } = require('../../../lib/redis')

connect()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Simple auth guard — uses ADMIN_SECRET_KEY (production) or ADMIN_SECRET (local)
  const adminSecret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET
  if (adminSecret && req.query.secret !== adminSecret.trim()) {
    return res.status(401).json({ error: 'Unauthorized. Provide ?secret=<ADMIN_SECRET>' })
  }

  try {
    const limit = parseInt(req.query.limit) || 50
    const [stats, pageViewStats] = await Promise.all([
      getScanStats(limit),
      getPageViewStats()
    ])

    // Enrich with unique wallet count
    const uniqueWallets = new Set(stats.recentScans.map(s => s.address))

    return res.status(200).json({
      pageViews: pageViewStats.totalPageViews,
      uniqueVisitors: pageViewStats.uniqueVisitors,
      totalScans: stats.totalScans,
      uniqueWalletsInWindow: uniqueWallets.size,
      recentScans: stats.recentScans.map(s => ({
        address: s.address,
        scannedAt: new Date(s.timestamp).toISOString(),
      })),
    })
  } catch (err) {
    console.error('[admin/stats]', err.message)
    return res.status(500).json({ error: 'Failed to retrieve stats' })
  }
}
