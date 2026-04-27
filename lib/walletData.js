'use strict'

/**
 * walletData.js — Adapter between v3 scoring engine and frontend API shape.
 *
 * The v3 engine (helius.js + scorer.js) has its own clean interfaces.
 * This module bridges them to the response shape the frontend expects:
 *   risk.score, risk.level, risk.flags, risk.details, risk.typologies
 *
 * All API routes (wallet, breakdown, trace) call fetchWalletData() or
 * getWalletContext() + score() directly. The adapter keeps the frontend
 * untouched while the engine evolves.
 */

const { getWalletContext, fetchHeliusAccountInfo } = require('./helius')
const { score } = require('./scorer')
const escalations = require('./escalations')

const ADDR_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/**
 * fetchWalletData(address)
 *
 * Single entry point for the free scan endpoint and breakdown endpoint.
 * Returns the unified response shape the frontend consumes.
 */
async function fetchWalletData(address) {
  const apiKey = process.env.HELIUS_API_KEY
  if (!apiKey) throw new Error('HELIUS_API_KEY is required but not set.')

  // Run helius v3 context fetch + account info check in parallel
  const [ctx, accountInfo] = await Promise.all([
    getWalletContext(address),
    fetchHeliusAccountInfo(address, apiKey),
  ])

  // Attach account info to context so scorer can detect program accounts
  ctx.accountInfo = accountInfo

  // Fetch crowd escalation score (T9 input)
  // getEscalationScore returns a number, not a Promise — wrap it safely
  let escalationData = null
  try {
    const esc = escalations.getEscalationScore(address)
    if (esc && esc > 0) escalationData = { count: Math.round(esc / 5) } // reverse: score=count*5
  } catch {
    escalationData = null
  }

  // Run v3 scorer
  const result = score(ctx, escalationData)

  // ── Shape the risk object for the frontend ──────────────────────────────
  // Frontend reads: risk.score, risk.level, risk.flags, risk.details, risk.typologies
  // Scorer v3 uses:  result.score, result.band, result.typologies, result.triggeredFlags
  const flags   = buildFlags(result)
  const details = buildDetails(result)

  const risk = {
    score:      result.score,
    level:      result.band,       // "level" in frontend = "band" in scorer
    flags,
    details,
    typologies: result.typologies, // T1-T9 objects with triggered/score/detail
    explanation: result.explanation,
    _soltrace:  result._solvera,
  }

  return {
    address,
    account: {
      lamports:   accountInfo.lamports   || 0,
      solBalance: accountInfo.lamports   ? (accountInfo.lamports / 1e9).toFixed(6) : '0',
      type:       accountInfo.type       || 'unknown',
      executable: accountInfo.executable || false,
    },
    transactions: ctx.transactions.slice(0, 10).map(tx => ({
      signature: tx.signature,
      blockTime: tx.timestamp,
      status:    tx.transactionError ? 'Fail' : 'Success',
      fee:       tx.fee,
      lamport:   tx.nativeTransfers?.[0]?.amount || 0,
    })),
    risk,
    meta: {
      fetchedAt:     new Date().toISOString(),
      txCount:       ctx.meta.fetchedCount,
      realTxCount30d: ctx.meta.realTxCount30d,
      heliusEnabled: true,
      engineVersion: result.meta.engineVersion,
    },
  }
}

// ── Flag builder: converts v3 typologies → legacy flag array ─────────────────
// Frontend renders risk.flags as badge chips: { label, type }
// type is: "danger" | "warn" | "info" | "clean"
function buildFlags(result) {
  if (result.isProgram) {
    return [{ label: 'PROGRAM ACCOUNT', type: 'info' }]
  }

  const flags = []

  for (const [key, t] of Object.entries(result.typologies)) {
    if (!t.triggered) continue
    const type  = flagType(key)
    const label = flagLabel(key, t)
    flags.push({ label, type })
  }

  if (result.cleanSignal?.active) {
    flags.push({ label: `DEX ACTIVITY (clean signal -${result.cleanSignal.reduction})`, type: 'clean' })
  }

  if (flags.length === 0 || flags.every(f => f.type === 'clean')) {
    flags.push({ label: 'NO RISK FLAGS DETECTED', type: 'clean' })
  }

  return flags
}

function flagType(typologyKey) {
  switch (typologyKey) {
    case 'T3': return 'danger'
    case 'T7': return 'danger'
    case 'T8': return 'danger'
    case 'T1': return 'warn'
    case 'T2': return 'danger'
    case 'T4': return 'warn'
    case 'T5': return 'warn'
    case 'T6': return 'warn'
    case 'T9': return 'warn'
    default:   return 'warn'
  }
}

function flagLabel(key, t) {
  switch (key) {
    case 'T1': return `STRUCTURING (+${t.score})`
    case 'T2': return `BURST PATTERN DETECTED (+${t.score})`
    case 'T3': return `MIXER INTERACTION (+${t.score})`
    case 'T4': return `BRIDGE USED (+${t.score})`
    case 'T5': return `LARGE TRANSFER (+${t.score})`
    case 'T6': return `PROBING BEHAVIOR (+${t.score})`
    case 'T7': return `RUG PULL — LP REMOVED (+${t.score})`
    case 'T8': return `DEV DUMP DETECTED (+${t.score})`
    case 'T9': return `CROWD ESCALATION (+${t.score})`
    default:   return `${key} (+${t.score})`
  }
}

// ── Detail builder: sentence-level descriptions from typology details ─────────
function buildDetails(result) {
  if (result.isProgram) {
    return ['This address is a Solana program (smart contract), not a user wallet. Behavioral typologies (T1–T9) are not applicable to program accounts.']
  }
  const details = Object.values(result.typologies)
    .filter(t => t.triggered && t.detail)
    .map(t => t.detail)

  if (result.cleanSignal?.active && result.cleanSignal.detail) {
    details.push(result.cleanSignal.detail)
  }

  if (details.length === 0) {
    details.push('No AML risk indicators identified in available transaction history.')
  }

  return details
}

module.exports = { fetchWalletData, ADDR_REGEX }
