/**
 * api/admin/track.js — Page View Tracker
 *
 * Called from the client-side to track page views.
 * Uses visitor fingerprint (hashed IP) for unique visitor counting via HyperLogLog.
 */

const { connect, trackPageView } = require('../../../lib/redis')
const crypto = require('crypto')

connect()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Create a hashed visitor ID from IP + User-Agent (privacy-friendly, no PII stored)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    const ua = req.headers['user-agent'] || ''
    const visitorId = crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 16)

    await trackPageView(visitorId)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[admin/track]', err.message)
    return res.status(200).json({ ok: true }) // Never fail for tracking
  }
}
