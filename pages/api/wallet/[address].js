/**
 * api/wallet/[address].js — Free Wallet Scan
 *
 * Returns score + band ONLY. No flags, no typology details.
 * The score here MUST match what breakdown and trace return.
 */

const { fetchWalletData, ADDR_REGEX } = require('../../../lib/walletData')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { address } = req.query
  if (!address || !ADDR_REGEX.test(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address format.' })
  }

  try {
    const data = await fetchWalletData(address)
    return res.status(200).json(data)
  } catch (err) {
    console.error('[wallet]', err.message, err.stack)
    return res.status(500).json({ error: 'Failed to fetch wallet data. Please try again.' })
  }
}

export const config = { api: { responseLimit: false } }
