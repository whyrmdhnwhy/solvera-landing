/**
 * api/trace.js — Full Trace ($0.08)
 *
 * Returns everything from breakdown PLUS:
 *   - Transaction behavior analysis (frequency, type distribution, span)
 *   - Value flow summary (real SOL in/out, net flow, largest transfers)
 *   - Protocol exposure (DEX, mixer, bridge, LP with names + risk ratings)
 *   - Counterparty analysis (unique addresses, top by volume, anonymized)
 *   - Risk context narrative (band-appropriate summary paragraph)
 */

const { getWalletContext, fetchHeliusAccountInfo } = require('../../lib/helius')
const { score } = require('../../lib/scorer')
const { demoGate } = require('../../lib/demoMode')
const { ADDR_REGEX } = require('../../lib/walletData')
const escalations = require('../../lib/escalations')

const PROGRAM_NAMES = {
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter v6',
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB':  'Jupiter v4',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sBjvspe': 'Orca Whirlpool',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca v2',
  'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb':  'Wormhole',
  'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth':  'Wormhole v2',
  'Bridge1p5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o':  'Allbridge',
  'CLAD2TyjGffMEfiaBRfDkb6cMiGNN2QMx6FYMpYo2Sor': 'Elusiv (privacy)',
  'noopb9bkMVfRPU8AsBHBnMs4Eu2xEk7sRvYUkANDKbT':  'Light Protocol',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, PAYMENT-SIGNATURE')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { address } = req.query
  if (!address || !ADDR_REGEX.test(address)) {
    return res.status(400).json({ error: 'Missing or invalid wallet address' })
  }

  if (!demoGate(req, res, '/api/trace')) return

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

    const txs = ctx.transactions
    const now = Math.floor(Date.now() / 1000)

    // ── Transaction Behavior ──────────────────────────────────────────────────
    const timestamps = txs.map(tx => tx.timestamp).filter(Boolean).sort((a, b) => a - b)
    const oldest     = timestamps[0] || now
    const newest     = timestamps[timestamps.length - 1] || now
    const spanDays   = Math.max(1, Math.round((newest - oldest) / 86400))

    const txPerDay = ctx.meta.realTxCount30d > 0
      ? (ctx.meta.realTxCount30d / 30).toFixed(1)
      : (txs.length / Math.max(spanDays, 1)).toFixed(1)

    const typeDistribution = {}
    for (const tx of txs) {
      const type = tx.type || 'UNKNOWN'
      typeDistribution[type] = (typeDistribution[type] || 0) + 1
    }

    // ── Value Flow ────────────────────────────────────────────────────────────
    const inbound    = ctx.valueTransfers.filter(t => t.direction === 'IN')
    const outbound   = ctx.valueTransfers.filter(t => t.direction === 'OUT')
    const totalIn    = inbound.reduce((s, t) => s + t.amount, 0)
    const totalOut   = outbound.reduce((s, t) => s + t.amount, 0)
    const netFlow    = totalIn - totalOut
    const largestIn  = inbound.length  > 0 ? Math.max(...inbound.map(t => t.amount))  : 0
    const largestOut = outbound.length > 0 ? Math.max(...outbound.map(t => t.amount)) : 0

    // ── Counterparty Analysis ─────────────────────────────────────────────────
    const inCounterparties  = new Set(inbound.map(t => t.counterparty).filter(Boolean))
    const outCounterparties = new Set(outbound.map(t => t.counterparty).filter(Boolean))
    const allCounterparties = new Set([...inCounterparties, ...outCounterparties])

    const counterpartyVolume = {}
    for (const t of ctx.valueTransfers) {
      if (!t.counterparty) continue
      if (!counterpartyVolume[t.counterparty]) {
        counterpartyVolume[t.counterparty] = { in: 0, out: 0, count: 0 }
      }
      const side = t.direction === 'IN' ? 'in' : 'out'
      counterpartyVolume[t.counterparty][side] += t.amount
      counterpartyVolume[t.counterparty].count++
    }

    const topCounterparties = Object.entries(counterpartyVolume)
      .sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out))
      .slice(0, 10)
      .map(([addr, vol]) => ({
        address:     `${addr.slice(0, 4)}...${addr.slice(-4)}`,
        totalVolume: parseFloat((vol.in + vol.out).toFixed(2)),
        direction:   vol.in > vol.out ? 'net_sender' : 'net_receiver',
        txCount:     vol.count,
      }))

    // ── Protocol Exposure ─────────────────────────────────────────────────────
    const protocolExposure = []

    if (ctx.protocols.dexInteractions.length > 0) {
      const byProgram = {}
      for (const d of ctx.protocols.dexInteractions) {
        byProgram[d.program] = (byProgram[d.program] || 0) + 1
      }
      for (const [prog, count] of Object.entries(byProgram)) {
        protocolExposure.push({
          type:     'DEX',
          name:     PROGRAM_NAMES[prog] || `DEX (${prog.slice(0, 8)}...)`,
          txCount:  count,
          risk:     'clean',
        })
      }
    }

    if (ctx.protocols.mixerInteractions.length > 0) {
      const byProgram = {}
      for (const m of ctx.protocols.mixerInteractions) {
        byProgram[m.program] = (byProgram[m.program] || 0) + 1
      }
      for (const [prog, count] of Object.entries(byProgram)) {
        protocolExposure.push({
          type:    'MIXER',
          name:    PROGRAM_NAMES[prog] || `Privacy Protocol (${prog.slice(0, 8)}...)`,
          txCount: count,
          risk:    'high',
        })
      }
    }

    if (ctx.protocols.bridgeInteractions.length > 0) {
      const byProgram = {}
      for (const b of ctx.protocols.bridgeInteractions) {
        byProgram[b.program] = (byProgram[b.program] || 0) + 1
      }
      for (const [prog, count] of Object.entries(byProgram)) {
        protocolExposure.push({
          type:    'BRIDGE',
          name:    PROGRAM_NAMES[prog] || `Bridge (${prog.slice(0, 8)}...)`,
          txCount: count,
          risk:    'medium',
        })
      }
    }

    const { additions, removals } = ctx.protocols.lpEvents
    if (additions.length > 0 || removals.length > 0) {
      protocolExposure.push({
        type:      'LP',
        name:      'Liquidity Pool Activity',
        additions: additions.length,
        removals:  removals.length,
        risk:      removals.length > 0 ? 'elevated' : 'low',
      })
    }

    // ── Risk Context Narrative ────────────────────────────────────────────────
    let riskContext = ''
    if (result.score >= 60) {
      riskContext = `This wallet exhibits multiple high-risk behavioral patterns across ${result.triggeredFlags.length} typologies. `
      riskContext += `Transaction volume of ${txPerDay} txs/day across ${allCounterparties.size} unique counterparties `
      riskContext += `with net flow of ${netFlow >= 0 ? '+' : ''}${netFlow.toFixed(1)} SOL in the analysis window. `
      riskContext += `Recommend blocking or requiring enhanced verification before interaction.`
    } else if (result.score >= 40) {
      riskContext = `Elevated risk signals detected across ${result.triggeredFlags.length} typologies. `
      riskContext += `Wallet shows ${txPerDay} txs/day to ${allCounterparties.size} counterparties. `
      riskContext += `Enhanced due diligence recommended before proceeding with significant transactions.`
    } else if (result.score >= 20) {
      riskContext = `Minor risk flags present but within ranges seen in active trading wallets. `
      riskContext += `${txPerDay} txs/day across ${allCounterparties.size} counterparties. `
      riskContext += `Standard due diligence recommended.`
    } else {
      riskContext = `No significant risk indicators. Wallet behavior consistent with normal usage. `
      riskContext += `${txPerDay} txs/day, ${allCounterparties.size} unique counterparties, `
      riskContext += `${protocolExposure.filter(p => p.type === 'DEX').length} DEX protocol(s) used.`
    }

    // ── Typology grid (shared with breakdown) ─────────────────────────────────
    const typologyGrid = {}
    for (const [key, t] of Object.entries(result.typologies)) {
      typologyGrid[key] = { code: t.id, name: t.name, triggered: t.triggered, score: t.score, detail: t.detail }
    }

    return res.status(200).json({
      address,
      score:          result.score,
      band:           result.band,
      level:          result.band,  // alias for frontend compat

      // Breakdown tier (included in trace)
      typologies:     typologyGrid,
      triggeredFlags: result.triggeredFlags,
      explanation:    result.explanation,
      cleanSignal:    result.cleanSignal?.active ? result.cleanSignal : null,

      // Trace-exclusive content
      transactionBehavior: {
        analyzed:          ctx.meta.fetchedCount,
        realCount30d:      ctx.meta.realTxCount30d,
        fetchWindowCapped: ctx.meta.fetchWindowCapped,
        txPerDay:          parseFloat(txPerDay),
        spanDays,
        typeDistribution,
        failedTx7d:        ctx.meta.failedTxCount7d,
      },

      valueFlow: {
        totalInbound:   parseFloat(totalIn.toFixed(2)),
        totalOutbound:  parseFloat(totalOut.toFixed(2)),
        netFlow:        parseFloat(netFlow.toFixed(2)),
        largestInbound: parseFloat(largestIn.toFixed(2)),
        largestOutbound: parseFloat(largestOut.toFixed(2)),
        transferCount:  ctx.valueTransfers.length,
      },

      counterpartyAnalysis: {
        uniqueInbound:   inCounterparties.size,
        uniqueOutbound:  outCounterparties.size,
        totalUnique:     allCounterparties.size,
        topCounterparties,
      },

      protocolExposure,
      riskContext,

      // Compatibility fields for existing frontend
      riskFlagCount:    result.triggeredFlags.length,
      cleanSignalCount: result.cleanSignal?.active ? 1 : 0,
      protocols:        protocolExposure.map(p => p.name),

      meta:    result.meta,
      _solvera: result._solvera,
    })
  } catch (err) {
    console.error('[trace]', err.message)
    return res.status(500).json({ error: 'Failed to run trace.' })
  }
}
