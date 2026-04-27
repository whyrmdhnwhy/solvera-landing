/**
 * Solvera — Helius API Client v3.0
 * lib/helius.js
 *
 * Copyright (c) 2024-2025 Solvera / Wahyu
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Three-phase data fetch:
 *   Phase 1: getSignatureCount() — real tx count via signatures-only (cheap)
 *   Phase 2: getTransactions()   — full enhanced tx data for scoring
 *   Phase 3: getFailedTxCount()  — dedicated failed tx query for T6
 *
 * getWalletContext() — single call that runs all phases, returns unified context
 */

'use strict'

const axios = require('axios')

// Enhanced Transactions REST API endpoint (works with api-key query param)
const HELIUS_API  = 'https://api.helius.xyz/v0'
const HELIUS_RPC  = 'https://mainnet.helius-rpc.com'
const TIMEOUT     = 12000

function getApiKey() {
  const key = process.env.HELIUS_API_KEY
  if (!key) throw new Error('HELIUS_API_KEY not set')
  return key
}

function getRpcUrl() {
  return `${HELIUS_RPC}/?api-key=${getApiKey()}`
}

// ── Known LP Program IDs ──────────────────────────────────────────────────────
const KNOWN_LP_PROGRAMS = new Set([
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM v4
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
  'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',  // Raydium Route
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sBjvspe', // Orca Whirlpool
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // Meteora DLMM
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EkzjC8EJ', // Meteora AMM
])

// ── Known DEX Program IDs ─────────────────────────────────────────────────────
const KNOWN_DEX_PROGRAMS = new Set([
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',  // Jupiter v4
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM v4
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sBjvspe', // Orca Whirlpool
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca v2
])

// ── Known Mixer/Privacy Program IDs ──────────────────────────────────────────
const KNOWN_MIXERS = new Set([
  'CLAD2TyjGffMEfiaBRfDkb6cMiGNN2QMx6FYMpYo2Sor', // Elusiv
  'noopb9bkMVfRPU8AsBHBnMs4Eu2xEk7sRvYUkANDKbT',  // Light Protocol
])

// ── Known Bridge Program IDs ──────────────────────────────────────────────────
const KNOWN_BRIDGES = new Set([
  'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb',  // Wormhole Core
  'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth',  // Wormhole Token Bridge
  'Bridge1p5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o',  // Allbridge
  'DEbrdGj3HsRsAzx6uH4MKyREKxVAfBydijLUF3ygsFfh', // deBridge
])

// ── Account Info (for program account detection) ──────────────────────────────
async function fetchHeliusAccountInfo(address, apiKey) {
  try {
    const res = await axios.post(`${HELIUS_RPC}/?api-key=${apiKey || getApiKey()}`, {
      jsonrpc: '2.0', id: 'soltrace-acct', method: 'getAccountInfo',
      params: [address, { encoding: 'base58' }],
    }, { timeout: 8000 })
    const value = res.data?.result?.value
    if (!value) return {}
    return {
      lamports:   value.lamports  || 0,
      executable: value.executable || false,
      type:       value.executable ? 'program' : 'wallet',
    }
  } catch {
    return {}
  }
}

// ============================================================
// PHASE 1 — Signature Count (real 30-day tx count, cheap)
// ============================================================
async function getSignatureCount(address, days = 30) {
  const since = Math.floor(Date.now() / 1000) - (days * 86400)
  try {
    const res = await axios.post(getRpcUrl(), {
      jsonrpc: '2.0', id: 'sig-count',
      method: 'getTransactionsForAddress',
      params: [address, {
        transactionDetails: 'signatures',
        limit: 1000,
        sortOrder: 'desc',
        filters: { blockTime: { gte: since } },
      }],
    }, { timeout: TIMEOUT })

    const result = res.data?.result
    if (!result?.data) return { count: -1, hasMore: false, available: false }

    return {
      count:            result.data.length,
      hasMore:          !!result.paginationToken,
      available:        true,
      oldestTimestamp:  result.data.length > 0
        ? result.data[result.data.length - 1]?.blockTime || null
        : null,
    }
  } catch (err) {
    console.warn('[helius] getSignatureCount fallback:', err.message)
    return { count: -1, hasMore: false, available: false }
  }
}

// ============================================================
// PHASE 2 — Full Enhanced Transactions
// ============================================================
async function getTransactions(address, limit = 100) {
  let allTxs = []
  let lastSignature = null

  while (allTxs.length < limit) {
    const batchSize = Math.min(limit - allTxs.length, 100)
    const params = { 'api-key': getApiKey(), limit: batchSize }
    if (lastSignature) {
      params.before = lastSignature
    }

    try {
      const res = await axios.get(`${HELIUS_API}/addresses/${address}/transactions`, {
        params,
        headers: { Accept: 'application/json', 'User-Agent': 'Solvera/3.0' },
        timeout: TIMEOUT,
      })

      const batch = res.data
      if (!Array.isArray(batch) || batch.length === 0) {
        break // No more transactions available
      }

      allTxs = allTxs.concat(batch)
      lastSignature = batch[batch.length - 1].signature

      // If we got fewer than requested, we've reached the end
      if (batch.length < batchSize) {
        break
      }
    } catch (error) {
      console.error(`[helius] Pagination error for ${address}:`, error.message)
      break // Stop paginating on error and return what we have so far
    }
  }

  return allTxs
}


// ============================================================
// PHASE 3 — Failed Transaction Count (T6)
// ============================================================
async function getFailedTxCount(address, days = 7) {
  const since = Math.floor(Date.now() / 1000) - (days * 86400)
  try {
    const res = await axios.post(getRpcUrl(), {
      jsonrpc: '2.0', id: 'failed-count',
      method: 'getTransactionsForAddress',
      params: [address, {
        transactionDetails: 'signatures',
        limit: 100,
        sortOrder: 'desc',
        filters: { blockTime: { gte: since }, status: 'failed' },
      }],
    }, { timeout: TIMEOUT })

    const result = res.data?.result
    if (!result?.data) return { count: -1, available: false }
    return { count: result.data.length, available: true }
  } catch (err) {
    console.warn('[helius] getFailedTxCount fallback:', err.message)
    return { count: -1, available: false }
  }
}

// ============================================================
// UNIFIED CONTEXT — single call for full wallet analysis
// ============================================================
async function getWalletContext(address) {
  const [txs, sigInfo, failedInfo] = await Promise.all([
    getTransactions(address, 100),
    getSignatureCount(address, 30).catch(() => ({ count: -1, hasMore: false, available: false })),
    getFailedTxCount(address, 7).catch(() => ({ count: -1, available: false })),
  ])

  const txCount          = txs.length
  const fetchWindowCapped = txCount >= 100
  const realTxCount30d   = sigInfo.available ? sigInfo.count : txCount
  const hasMoreThan1000  = sigInfo.hasMore

  let failedTxCount7d = failedInfo.available ? failedInfo.count : 0
  if (!failedInfo.available && txs.length > 0) {
    failedTxCount7d = txs.filter(tx => tx.transactionError).length
  }

  const protocols          = new Set()
  const dexInteractions    = []
  const mixerInteractions  = []
  const bridgeInteractions = []
  const lpEvents           = { additions: [], removals: [] }

  for (const tx of txs) {
    if (tx.type) protocols.add(tx.type)

    const accountKeys = extractAccountKeys(tx)

    for (const key of accountKeys) {
      if (KNOWN_DEX_PROGRAMS.has(key)) {
        dexInteractions.push({ program: key, signature: tx.signature, timestamp: tx.timestamp, type: tx.type })
      }
      if (KNOWN_MIXERS.has(key)) {
        mixerInteractions.push({ program: key, signature: tx.signature, timestamp: tx.timestamp })
      }
      if (KNOWN_BRIDGES.has(key)) {
        bridgeInteractions.push({ program: key, signature: tx.signature, timestamp: tx.timestamp })
      }
    }

    if (tx.type === 'ADD_LIQUIDITY') {
      lpEvents.additions.push({ signature: tx.signature, timestamp: tx.timestamp, pool: extractPoolAddress(tx) })
    }
    if (tx.type === 'REMOVE_LIQUIDITY') {
      lpEvents.removals.push({ signature: tx.signature, timestamp: tx.timestamp, pool: extractPoolAddress(tx) })
    }
  }

  const valueTransfers = extractValueTransfers(txs, address)

  return {
    address,
    transactions: txs,
    meta: {
      fetchedCount:       txCount,
      fetchWindowCapped,
      realTxCount30d,
      hasMoreThan1000,
      failedTxCount7d,
      failedTxAvailable:  failedInfo.available,
      sigCountAvailable:  sigInfo.available,
    },
    protocols: {
      unique:           [...protocols],
      dexInteractions,
      mixerInteractions,
      bridgeInteractions,
      lpEvents,
      hasDexActivity:     dexInteractions.length > 0,
      hasMixerActivity:   mixerInteractions.length > 0,
      hasBridgeActivity:  bridgeInteractions.length > 0,
    },
    valueTransfers,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractAccountKeys(tx) {
  const keys = new Set()
  if (Array.isArray(tx.instructions)) {
    for (const ix of tx.instructions) {
      if (ix.programId) keys.add(ix.programId)
      if (Array.isArray(ix.accounts)) ix.accounts.forEach(a => keys.add(a))
      if (Array.isArray(ix.innerInstructions)) {
        for (const inner of ix.innerInstructions) {
          if (inner.programId) keys.add(inner.programId)
          if (Array.isArray(inner.accounts)) inner.accounts.forEach(a => keys.add(a))
        }
      }
    }
  }
  if (Array.isArray(tx.accountData)) {
    for (const acc of tx.accountData) { if (acc.account) keys.add(acc.account) }
  }
  return keys
}

function extractPoolAddress(tx) {
  if (tx.events?.swap?.ammAccount) return tx.events.swap.ammAccount
  if (Array.isArray(tx.accountData)) {
    for (const acc of tx.accountData) {
      if (acc.account && KNOWN_LP_PROGRAMS.has(acc.account)) return acc.account
    }
  }
  if (Array.isArray(tx.instructions)) {
    for (const ix of tx.instructions) {
      if (ix.programId && KNOWN_LP_PROGRAMS.has(ix.programId)) return ix.programId
    }
  }
  return tx.signature || 'unknown'
}

function extractValueTransfers(txs, walletAddress) {
  const transfers = []
  for (const tx of txs) {
    if (!Array.isArray(tx.nativeTransfers)) continue
    for (const nt of tx.nativeTransfers) {
      const amountSOL = (nt.amount || 0) / 1e9
      if (amountSOL < 0.001) continue
      if (nt.fromUserAccount === walletAddress) {
        transfers.push({ direction: 'OUT', amount: amountSOL, counterparty: nt.toUserAccount, timestamp: tx.timestamp, signature: tx.signature })
      } else if (nt.toUserAccount === walletAddress) {
        transfers.push({ direction: 'IN',  amount: amountSOL, counterparty: nt.fromUserAccount, timestamp: tx.timestamp, signature: tx.signature })
      }
    }
  }
  return transfers
}

module.exports = {
  fetchHeliusAccountInfo,
  getTransactions,
  getSignatureCount,
  getFailedTxCount,
  getWalletContext,
}
