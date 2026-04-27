const { fetchWalletData, ADDR_REGEX } = require("../../../../lib/walletData");
const { generateComplianceReport } = require("../../../../lib/pdf");

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { address } = req.query;
  if (!address || !ADDR_REGEX.test(address)) {
    return res.status(400).json({ error: "Invalid Solana wallet address." });
  }

  if (process.env.DEMO_MODE !== "true") {
    return res.status(402).json({
      error: "Payment required",
      price: 2.00,
      currency: "USDC",
      message: "Send $2.00 USDC to unlock the compliance report.",
    });
  }

  try {
    const walletData = await fetchWalletData(address);
    const filename   = `solvera-${address.slice(0, 8)}-${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    generateComplianceReport(walletData, res);
  } catch (err) {
    console.error("[pdf]", err.message);
    return res.status(500).json({ error: "Failed to generate PDF report." });
  }
}

export const config = { api: { responseLimit: false } };
