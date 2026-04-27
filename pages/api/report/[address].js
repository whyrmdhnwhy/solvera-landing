const { ADDR_REGEX } = require("../../../lib/walletData");
const escalations = process.env.REDIS_URL
  ? require("../../../lib/redis")
  : require("../../../lib/escalations");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { address } = req.query;
  const { reason, reporter = "anonymous" } = req.body || {};

  if (!address || !ADDR_REGEX.test(address)) {
    return res.status(400).json({ error: "Invalid Solana wallet address." });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return res.status(400).json({ error: "Provide a reason (min 5 characters)." });
  }

  const result = await escalations.reportWallet(
    address,
    String(reporter).slice(0, 64),
    reason.trim().slice(0, 256)
  );

  if (!result.ok) return res.status(503).json({ error: "Community reporting unavailable." });
  return res.status(201).json({ message: "Report recorded.", ...result });
}
