const { handleTGMessage } = require("../../lib/telegram");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(200).end();
  await handleTGMessage(req.body?.message);
  res.status(200).end();
}
