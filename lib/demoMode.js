// lib/demoMode.js — Demo mode bypass for hackathon/demo safety
// When DEMO_MODE=true, all paid tiers unlock without payment.

const PRICING = {
  '/api/breakdown': { price: 0.02, tier: 'breakdown', name: 'Risk Breakdown' },
  '/api/trace':     { price: 0.08, tier: 'trace',     name: 'Full Trace' },
  '/api/report':    { price: 2.00, tier: 'report',    name: 'Compliance Report' },
}

function isDemoMode() {
  return process.env.DEMO_MODE === 'true'
}

// Returns true if request should proceed, sends 402 and returns false otherwise.
function demoGate(req, res, endpoint) {
  if (isDemoMode()) return true

  // Check for payment proof in headers or query
  const txHash = req.headers['x-payment-tx'] || req.body?.tx_hash || req.query?.tx_hash
  const refId  = req.headers['x-payment-ref'] || req.body?.reference_id || req.query?.reference_id
  if (txHash && refId) return true  // TODO: verify on-chain in phase 2

  const tier = PRICING[endpoint]
  if (!tier) {
    res.status(500).json({ error: 'Unknown endpoint pricing' })
    return false
  }

  res.status(402).json({
    error: 'Payment required',
    tier: tier.tier,
    name: tier.name,
    price: tier.price,
    currency: 'USDC',
    network: 'Base (L2)',
    protocol: 'x402',
    payment_address: process.env.SOLVERA_WALLET || 'not-configured',
    message: `Send $${tier.price.toFixed(2)} USDC to unlock ${tier.name}.`,
    expires_in: 300,
  })
  return false
}

module.exports = { demoGate }
