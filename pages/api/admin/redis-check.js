/**
 * Temporary debug endpoint — check Redis connection status
 * DELETE THIS FILE after debugging
 */
const { connect, isConnected, trackPageView, getPageViewStats } = require('../../../lib/redis')

connect()

export default async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET
  if (secret && req.query.secret !== secret.trim()) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Wait a moment for connection
  await new Promise(r => setTimeout(r, 1500))

  const connected = isConnected()
  const redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.slice(0, 30) + '...' : 'NOT SET'

  let writeTest = null
  let readTest = null

  if (connected) {
    try {
      await trackPageView('debug-test')
      writeTest = 'ok'
      const stats = await getPageViewStats()
      readTest = stats
    } catch (err) {
      writeTest = `error: ${err.message}`
    }
  }

  return res.status(200).json({
    redisUrl,
    connected,
    writeTest,
    readTest,
  })
}
