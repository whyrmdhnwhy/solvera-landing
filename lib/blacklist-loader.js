'use strict'

const fs   = require('fs')
const path = require('path')

let _blacklistCache = null

function loadBlacklist() {
  if (_blacklistCache) return _blacklistCache

  const blacklistPath = path.join(process.cwd(), 'data', 'blacklist.json')

  try {
    const raw = fs.readFileSync(blacklistPath, 'utf-8')
    _blacklistCache = JSON.parse(raw)
    return _blacklistCache
  } catch (err) {
    console.error('[blacklist-loader] Failed to load blacklist:', err.message)
    return { _meta: {}, mixers: [], bridges: [], sanctions: [] }
  }
}

function checkMixer(address) {
  if (!address) return null
  const list = loadBlacklist()
  return list.mixers.find(entry => entry.address === address) || null
}

function checkBridge(address) {
  if (!address) return null
  const list = loadBlacklist()
  return list.bridges.find(entry => entry.address === address) || null
}

function checkSanctions(address) {
  if (!address) return null
  const list = loadBlacklist()
  return list.sanctions.find(entry => entry.address === address) || null
}

function checkCounterparties(addresses) {
  const list = loadBlacklist()
  const hits = { mixers: [], bridges: [], sanctions: [] }

  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    return hits
  }

  const addrSet = new Set(addresses.filter(Boolean))

  for (const entry of list.mixers) {
    if (addrSet.has(entry.address)) hits.mixers.push(entry)
  }
  for (const entry of list.bridges) {
    if (addrSet.has(entry.address)) hits.bridges.push(entry)
  }
  for (const entry of list.sanctions) {
    if (addrSet.has(entry.address)) hits.sanctions.push(entry)
  }

  return hits
}

module.exports = {
  checkMixer,
  checkBridge,
  checkSanctions,
  checkCounterparties,
  loadBlacklist,
}
