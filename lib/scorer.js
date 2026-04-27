/**
 * Solvera — AML Risk Scoring Engine v3.0
 * lib/scorer.js
 *
 * Copyright (c) 2024-2025 Solvera / Wahyu
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Receives walletContext from helius.js getWalletContext().
 * Outputs score (0-100), band, per-typology breakdown.
 *
 * Score bands: LOW 0-19, MODERATE 20-39, ELEVATED 40-59, HIGH 60-100
 */

'use strict'

const { checkMixer, checkSanctions, checkCounterparties } = require('./blacklist-loader')

const ENGINE_VERSION = '3.0.0'

// ── Max points per typology ───────────────────────────────────────────────────
const W = {
  T1: 15,  // Structuring
  T2: 15,  // Layering / Burst
  T3: 25,  // Mixer Interaction
  T4: 15,  // Bridge Abuse
  T5: 10,  // Large Value Transfer
  T6: 10,  // Probing Behavior
  T7: 25,  // Rug Pull LP
  T8: 20,  // Dev Dump
  T9: 35,  // Crowd Escalation (cap)
}

// ── Canonical band function ───────────────────────────────────────────────────
// Used everywhere: free scan, breakdown, trace, bot, PDF
function getBand(score) {
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'ELEVATED'
  if (score >= 20) return 'MODERATE'
  return 'LOW'
}


// ── T1: Structuring ───────────────────────────────────────────────────────────
// Value clustering: multiple similar-value transfers below round-number thresholds.
function detectT1(ctx) {
  const result = { id: 'T1', name: 'Structuring', triggered: false, score: 0, detail: null }

  const outbound = ctx.valueTransfers.filter(t => t.direction === 'OUT' && t.amount >= 0.1)
  if (outbound.length < 3) return result

  const sorted = [...outbound].sort((a, b) => a.amount - b.amount)
  const clusters = []
  let current = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1].amount
    const curr = sorted[i].amount
    if (curr <= prev * 1.15) {
      current.push(sorted[i])
    } else {
      if (current.length >= 3) clusters.push([...current])
      current = [sorted[i]]
    }
  }
  if (current.length >= 3) clusters.push(current)

  const biggest = clusters.sort((a, b) => b.length - a.length)[0]
  if (!biggest) return result

  const avgValue   = biggest.reduce((s, t) => s + t.amount, 0) / biggest.length
  const totalValue = biggest.reduce((s, t) => s + t.amount, 0)

  if (biggest.length >= 5 && totalValue > 10) {
    result.triggered = true
    result.score     = W.T1
    result.detail    = `${biggest.length} outbound transfers averaging ${avgValue.toFixed(2)} SOL each (total ${totalValue.toFixed(1)} SOL). Value clustering consistent with structuring.`
  } else if (biggest.length >= 3 && totalValue > 5) {
    result.triggered = true
    result.score     = Math.round(W.T1 * 0.5)
    result.detail    = `${biggest.length} outbound transfers of similar value detected. Monitoring recommended.`
  }

  return result
}

// ── T2: Layering / Burst Activity ─────────────────────────────────────────────
// Rapid multi-recipient non-DEX transfers. DEX swaps are explicitly filtered.
function detectT2(ctx) {
  const result = { id: 'T2', name: 'Layering / Burst Activity', triggered: false, score: 0, detail: null }

  const txs = ctx.transactions
  if (txs.length < 5) return result

  const dexSigs   = new Set(ctx.protocols.dexInteractions.map(d => d.signature))
  const nonDexTxs = txs.filter(tx => !dexSigs.has(tx.signature) && tx.timestamp)
  if (nonDexTxs.length < 5) return result

  const sorted = [...nonDexTxs].sort((a, b) => b.timestamp - a.timestamp)

  // Find densest 60-second window
  let maxIn60s = 0, windowStart60 = 0
  for (let i = 0; i < sorted.length; i++) {
    const end = sorted[i].timestamp - 60
    let count = 0
    for (let j = i; j < sorted.length && sorted[j].timestamp >= end; j++) count++
    if (count > maxIn60s) { maxIn60s = count; windowStart60 = sorted[i].timestamp }
  }

  // Find densest 5-minute window
  let maxIn5Min = 0
  for (let i = 0; i < sorted.length; i++) {
    const end = sorted[i].timestamp - 300
    let count = 0
    for (let j = i; j < sorted.length && sorted[j].timestamp >= end; j++) count++
    if (count > maxIn5Min) maxIn5Min = count
  }

  // Count unique recipients in the 60s burst window
  const burstTxs   = sorted.filter(tx => tx.timestamp >= windowStart60 - 60 && tx.timestamp <= windowStart60)
  const recipients = new Set()
  for (const tx of burstTxs) {
    if (tx.nativeTransfers) {
      for (const nt of tx.nativeTransfers) {
        if (nt.toUserAccount) recipients.add(nt.toUserAccount)
      }
    }
  }

  if (maxIn60s >= 8 && recipients.size >= 3) {
    result.triggered = true
    result.score     = W.T2
    result.detail    = `Rapid multi-recipient transaction clustering detected (${maxIn60s} txs in 60s to ${recipients.size} recipients). Behavior consistent with layering.`
  } else if (maxIn5Min >= 15) {
    result.triggered = true
    result.score     = W.T2
    result.detail    = `High-frequency non-DEX transaction burst detected (${maxIn5Min} txs in 5 minutes).`
  } else if (maxIn60s >= 5 && recipients.size >= 2) {
    result.triggered = true
    result.score     = Math.round(W.T2 * 0.5)
    result.detail    = `Elevated transaction clustering (${maxIn60s} txs in 60s). Monitor for layering patterns.`
  }

  return result
}

// ── Counterparty extractor ────────────────────────────────────────────────────
// Collects all sender, receiver, and program addresses from transaction history.
function buildCounterparties(ctx) {
  const addrs = new Set()
  for (const tx of ctx.transactions) {
    if (Array.isArray(tx.nativeTransfers)) {
      for (const nt of tx.nativeTransfers) {
        if (nt.fromUserAccount) addrs.add(nt.fromUserAccount)
        if (nt.toUserAccount)   addrs.add(nt.toUserAccount)
      }
    }
    if (Array.isArray(tx.accountData)) {
      for (const acc of tx.accountData) {
        if (acc.account) addrs.add(acc.account)
      }
    }
    if (Array.isArray(tx.instructions)) {
      for (const ix of tx.instructions) {
        if (ix.programId) addrs.add(ix.programId)
      }
    }
  }
  addrs.delete(ctx.address)
  return [...addrs]
}

// ── T3: Mixer Interaction ─────────────────────────────────────────────────────
function detectT3(ctx, counterparties) {
  const result = { id: 'T3', name: 'Mixer Interaction', triggered: false, score: 0, detail: null }

  // Self-check: is the scanned wallet itself on the blacklist?
  const selfMixer    = checkMixer(ctx.address)
  const selfSanction = checkSanctions(ctx.address)

  // Counterparty check: did this wallet interact with a flagged address?
  const hits = checkCounterparties(counterparties)

  // Protocol-level check: Elusiv, Light Protocol, etc. (existing behaviour)
  const protocolMixers = ctx.protocols.mixerInteractions

  if (selfMixer) {
    result.triggered = true
    result.score     = W.T3
    result.detail    = `Wallet flagged in known incident database: ${selfMixer.label} (${selfMixer.incident}).`
  } else if (hits.mixers.length > 0) {
    const hit = hits.mixers[0]
    result.triggered = true
    result.score     = W.T3
    result.detail    = `Direct interaction with flagged address: ${hit.label}. Incident: ${hit.incident}.`
  } else if (protocolMixers.length > 0) {
    result.triggered = true
    result.score     = W.T3
    result.detail    = `${protocolMixers.length} transaction(s) involving known privacy/mixing protocols.`
  }

  // Sanctions enrichment — appends to reason, no extra weight
  if (result.triggered && (selfSanction || hits.sanctions.length > 0)) {
    const sanction = selfSanction || hits.sanctions[0]
    result.detail += ` Sanctions proximity detected. Attribution: ${sanction.attribution || sanction.label}.`
  }

  return result
}

// ── T4: Bridge Abuse ──────────────────────────────────────────────────────────
// Scores only when bridge interaction is combined with a risk amplifier (T2/T3/T5).
function detectT4(ctx, counterparties, t2, t3, t5) {
  const result = { id: 'T4', name: 'Bridge Abuse', triggered: false, score: 0, detail: null }

  // Blacklist bridge check on counterparties
  const hits = checkCounterparties(counterparties)

  // Combine with helius-detected bridge interactions
  const protocolBridges = ctx.protocols.bridgeInteractions
  const bridgeFound     = hits.bridges.length > 0 || protocolBridges.length > 0

  if (!bridgeFound) return result

  const firstBridge    = hits.bridges[0] || { label: protocolBridges[0]?.program || 'known bridge program' }
  const hasAmplifier   = t2.triggered || t3.triggered || t5.triggered

  if (hasAmplifier) {
    result.triggered = true
    result.score     = W.T4
    result.detail    = `Bridge interaction detected (${firstBridge.label}) combined with high-risk pattern. Cross-chain laundering risk.`
  } else {
    // Informational — bridge alone is not scored
    result.detail = `Bridge interaction observed; no risk amplifiers present.`
  }

  return result
}

// ── T5: Large Value Transfer ──────────────────────────────────────────────────
function detectT5(ctx) {
  const result = { id: 'T5', name: 'Large Value Transfer', triggered: false, score: 0, detail: null }
  const threshold      = 500 // SOL
  const largeTransfers = ctx.valueTransfers.filter(t => t.amount >= threshold)
  if (largeTransfers.length === 0) return result

  const dexSigs       = new Set(ctx.protocols.dexInteractions.map(d => d.signature))
  const now           = Math.floor(Date.now() / 1000)
  const sevenDaysAgo  = now - (7 * 86400)
  const recentLargeOut = ctx.valueTransfers.filter(t =>
    t.direction === 'OUT' && t.amount >= 100 && t.timestamp >= sevenDaysAgo && !dexSigs.has(t.signature)
  )
  const cumulativeOut = recentLargeOut.reduce((s, t) => s + t.amount, 0)
  const largest       = Math.max(...largeTransfers.map(t => t.amount))

  result.triggered = true
  result.score     = W.T5
  result.detail    = `${largeTransfers.length} transaction(s) exceeding ${threshold} SOL (largest: ${largest.toFixed(1)} SOL).`
  if (cumulativeOut > 2000) {
    result.detail += ` Cumulative non-DEX outbound: ${cumulativeOut.toFixed(0)} SOL in 7 days.`
  }
  return result
}

// ── T6: Probing Behavior ──────────────────────────────────────────────────────
function detectT6(ctx) {
  const result = { id: 'T6', name: 'Probing Behavior', triggered: false, score: 0, detail: null }

  let effectiveFailed = ctx.meta.failedTxCount7d
  if (effectiveFailed < 0) {
    effectiveFailed = ctx.transactions.filter(tx => tx.transactionError).length
  }

  if (effectiveFailed >= 15) {
    result.triggered = true
    result.score     = W.T6
    result.detail    = `${effectiveFailed} failed transactions in 7 days. High failure rate may indicate probing or exploit attempts.`
  } else if (effectiveFailed >= 8) {
    result.triggered = true
    result.score     = Math.round(W.T6 * 0.5)
    result.detail    = `${effectiveFailed} failed transactions detected. Elevated failure rate.`
  }

  // Ratio check if we have real 30d count
  if (ctx.meta.sigCountAvailable && ctx.meta.realTxCount30d > 20 && !result.triggered) {
    const ratio = effectiveFailed / ctx.meta.realTxCount30d
    if (ratio > 0.3) {
      result.triggered = true
      result.score     = W.T6
      result.detail    = `Failed transaction ratio: ${(ratio * 100).toFixed(0)}% (${effectiveFailed} failed / ${ctx.meta.realTxCount30d} total). Abnormal failure rate.`
    }
  }

  return result
}

// ── T7: Rug Pull LP Removal ───────────────────────────────────────────────────
function detectT7(ctx) {
  const result = { id: 'T7', name: 'Rug Pull Signals', triggered: false, score: 0, detail: null }
  const { additions, removals } = ctx.protocols.lpEvents
  if (additions.length === 0 && removals.length === 0) return result

  const windowSec = 259200 // 72 hours
  let rugSignals  = 0

  for (const add of additions) {
    for (const remove of removals) {
      if (add.pool === remove.pool && remove.timestamp > add.timestamp) {
        if (remove.timestamp - add.timestamp < windowSec) rugSignals++
      }
    }
  }

  const orphanRemovals = removals.filter(r => !additions.some(a => a.pool === r.pool))

  if (rugSignals > 0) {
    result.triggered = true
    result.score     = W.T7
    result.detail    = `${rugSignals} pool(s) with LP added then removed within 72 hours. Classic rug pull pattern.`
  } else if (orphanRemovals.length > 0) {
    result.triggered = true
    result.score     = Math.round(W.T7 * 0.6)
    result.detail    = `${orphanRemovals.length} LP removal(s) detected without visible LP addition in the analysis window. Possible rug pull.`
  }

  return result
}

// ── T8: Dev Dump (scaffold — requires DAS integration) ───────────────────────
function detectT8(ctx) {
  return { id: 'T8', name: 'Dev Dump', triggered: false, score: 0, detail: null }
}

// ── T9: Crowd Escalation ──────────────────────────────────────────────────────
function detectT9(ctx, escalationData) {
  const result = { id: 'T9', name: 'Crowd Escalation', triggered: false, score: 0, detail: null }
  if (!escalationData?.count) return result
  const count = escalationData.count
  if (count >= 10) {
    result.triggered = true
    result.score     = Math.min(W.T9, count * 3)
    result.detail    = `${count} community reports filed against this wallet.`
  } else if (count >= 3) {
    result.triggered = true
    result.score     = Math.min(15, count * 3)
    result.detail    = `${count} community reports noted. Monitoring.`
  }
  return result
}

// ── Clean Signal ──────────────────────────────────────────────────────────────
function detectCleanSignal(ctx) {
  const dexCount = ctx.protocols.dexInteractions.length
  const totalTx  = ctx.meta.fetchedCount
  if (dexCount === 0) return { active: false, reduction: 0, detail: null }

  const dexRatio = dexCount / totalTx
  if (dexRatio > 0.5) {
    return {
      active:    true,
      reduction: 5,
      detail:    `${dexCount} DEX interactions (${(dexRatio * 100).toFixed(0)}% of analyzed txs). Active DEX trader profile.`,
    }
  } else if (dexCount >= 3) {
    return {
      active:    true,
      reduction: 3,
      detail:    `${dexCount} DEX interactions detected. Partial clean signal.`,
    }
  }
  return { active: false, reduction: 0, detail: null }
}

// ============================================================
// MAIN SCORING FUNCTION
// ============================================================
/**
 * score(walletContext, escalationData?)
 *
 * @param {Object} walletContext  — from helius.getWalletContext()
 * @param {Object} escalationData — { count } from Redis (optional)
 * @returns full scoring result with typologies, band, explanation
 */
function score(walletContext, escalationData = null) {
  const ctx = walletContext

  // Program account guard — programs are not users
  if (ctx.accountInfo?.executable === true) {
    const empty = Object.fromEntries(
      ['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(k => [k, { id: k, name: k, triggered: false, score: 0, detail: null }])
    )
    return {
      address:       ctx.address,
      score:         0,
      band:          'LOW',
      typologies:    empty,
      triggeredFlags: [],
      explanation:   'Program account. AML behavioral typologies (T1-T9) do not apply to smart contracts.',
      cleanSignal:   { active: false, reduction: 0, detail: null },
      isProgram:     true,
      meta: {
        engineVersion:    ENGINE_VERSION,
        txAnalyzed:       ctx.meta.fetchedCount,
        realTxCount30d:   ctx.meta.realTxCount30d,
        fetchWindowCapped: ctx.meta.fetchWindowCapped,
        failedTxCount7d:  ctx.meta.failedTxCount7d,
        timestamp:        Date.now(),
      },
      _solvera: { v: ENGINE_VERSION, ts: Date.now() },
    }
  }

  const counterparties = buildCounterparties(ctx)

  const t1    = detectT1(ctx)
  const t2    = detectT2(ctx)
  const t3    = detectT3(ctx, counterparties)
  const t5    = detectT5(ctx)
  const t4    = detectT4(ctx, counterparties, t2, t3, t5)  // must run after T2, T3, T5
  const t6    = detectT6(ctx)
  const t7    = detectT7(ctx)
  const t8    = detectT8(ctx)
  const t9    = detectT9(ctx, escalationData)
  const clean = detectCleanSignal(ctx)

  const rawScore   = t1.score + t2.score + t3.score + t4.score + t5.score + t6.score + t7.score + t8.score + t9.score
  const totalScore = Math.max(0, Math.min(100, rawScore - clean.reduction))
  const band       = getBand(totalScore)

  const typologies    = { T1: t1, T2: t2, T3: t3, T4: t4, T5: t5, T6: t6, T7: t7, T8: t8, T9: t9 }
  const triggeredFlags = Object.values(typologies).filter(t => t.triggered).map(t => t.name)

  let explanation = ''
  if (triggeredFlags.length === 0) {
    explanation = 'No risk flags detected. Standard due diligence applies.'
  } else {
    explanation  = `${band === 'HIGH' ? 'High' : band === 'ELEVATED' ? 'Elevated' : band === 'MODERATE' ? 'Moderate' : 'Low'} risk: `
    explanation += `Detected ${triggeredFlags.join(', ')}. `
    explanation += totalScore >= 40
      ? 'Enhanced due diligence recommended.'
      : 'Continued monitoring recommended.'
  }

  return {
    address: ctx.address,
    score:   totalScore,
    band,
    typologies,
    triggeredFlags,
    explanation,
    cleanSignal: clean,
    meta: {
      engineVersion:    ENGINE_VERSION,
      txAnalyzed:       ctx.meta.fetchedCount,
      realTxCount30d:   ctx.meta.realTxCount30d,
      fetchWindowCapped: ctx.meta.fetchWindowCapped,
      failedTxCount7d:  ctx.meta.failedTxCount7d,
      timestamp:        Date.now(),
    },
    _solvera: { v: ENGINE_VERSION, ts: Date.now() },
  }
}

module.exports = { score, getBand }
