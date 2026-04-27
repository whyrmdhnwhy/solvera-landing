/**
 * api/breakdown.js — Risk Breakdown ($0.02)
 *
 * Returns full T1-T9 typology analysis with flags and explanation.
 * Score MUST match the free scan ring — same engine call, same number.
 */

const { getWalletContext, fetchHeliusAccountInfo } = require('../../lib/helius')
const { score } = require('../../lib/scorer')
const { demoGate } = require('../../lib/demoMode')
const { ADDR_REGEX } = require('../../lib/walletData')
const escalations = require('../../lib/escalations')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, PAYMENT-SIGNATURE')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { address } = req.query
  if (!address || !ADDR_REGEX.test(address)) {
    return res.status(400).json({ error: 'Missing or invalid wallet address' })
  }

  if (!demoGate(req, res, '/api/breakdown')) return

  try {
    const apiKey = process.env.HELIUS_API_KEY

    const [ctx, accountInfo] = await Promise.all([
      getWalletContext(address),
      fetchHeliusAccountInfo(address, apiKey),
    ])

    let escalationData = null
    try {
      const esc = escalations.getEscalationScore(address)
      if (esc && esc > 0) escalationData = { count: Math.round(esc / 5) }
    } catch { escalationData = null }

    ctx.accountInfo = accountInfo
    const result = score(ctx, escalationData)

    const typologyGrid = {}
    for (const [key, t] of Object.entries(result.typologies)) {
      typologyGrid[key] = { code: t.id, name: t.name, triggered: t.triggered, score: t.score, detail: t.detail }
    }

    return res.status(200).json({
      address,
      score:          result.score,   // SAME as free scan
      band:           result.band,    // canonical: LOW/MODERATE/ELEVATED/HIGH
      totalScore:     result.score,   // alias for frontend compat
      riskBand:       result.band,    // alias for frontend compat
      typologies:     typologyGrid,
      triggeredFlags: result.triggeredFlags,
      explanation:    result.explanation,
      cleanSignal:    result.cleanSignal?.active ? result.cleanSignal : null,
      transactionCount: ctx.meta.fetchedCount,
      meta:           result.meta,
      _solvera:       result._solvera,
    })
  } catch (err) {
    console.error('[breakdown]', err.message)
    return res.status(500).json({ error: 'Failed to generate breakdown.' })
  }
}
