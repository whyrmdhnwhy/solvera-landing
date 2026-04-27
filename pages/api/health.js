export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    version: "3.0.0",
    engine: "Solvera AML",
    typologies: 9,
    ts: Date.now(),
  });
}
