const { ADDR_REGEX } = require("../../../lib/walletData");
const escalations = process.env.REDIS_URL
  ? require("../../../lib/redis")
  : require("../../../lib/escalations");

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { address } = req.query;
  if (!address || !ADDR_REGEX.test(address)) {
    return res.status(400).json({ error: "Invalid Solana wallet address." });
  }

  const [reports, escalationScore] = await Promise.all([
    escalations.getReports(address),
    escalations.getEscalationScore(address),
  ]);

  return res.status(200).json({ address, reports, escalationScore });
}
