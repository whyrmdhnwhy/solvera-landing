# Solvera — Solana Wallet Risk Scoring & AML Compliance API

> Know any Solana wallet in seconds. FATF-aligned AML intelligence for exchanges, compliance teams, and Web3 developers.

**Live:** [solveratech.xyz](https://solveratech.xyz)

---

## What is Solvera?

Solvera is a Solana-native wallet risk scoring and AML compliance API. It detects suspicious on-chain behavior across 9 FATF-aligned typologies and generates compliance-ready risk reports for regulated entities.

Built by a former bank AML analyst. Designed for the compliance requirements that are already here — POJK 27/2024, PPATK STR reporting, Travel Rule, and CARF.

---

## Features

- **9 FATF-aligned typology detection** (T1–T9): Structuring, Rapid Movement, Mixer Interaction, Bridge Obfuscation, Dormant Reactivation, Round Trip, Dusting, Dev Dump, Crowd Escalation
- **0–1000 risk score** with LOW / MEDIUM / HIGH band classification
- **STR-ready PDF exports** aligned to PPATK reporting format
- **REST API** with pay-per-use USDC payments via x402 protocol (Coinbase)
- **Solana-native architecture** powered by Helius Enhanced Transactions API

---

## Pricing

| Endpoint | Price | Includes |
|---|---|---|
| Wallet Check | $0.02 | Score + tags + risk band |
| Full Trace | $0.08 | Complete T1–T9 breakdown |
| PDF Report | $2.00 | STR-ready compliance report |

Payments processed via x402 protocol. USDC on Base. No subscriptions.

---

## Tech Stack

- **Frontend:** Next.js 14, React 18
- **Data:** Helius Enhanced Transactions API
- **Infrastructure:** Vercel (serverless)
- **Payments:** x402 protocol (Coinbase / USDC on Base)
- **PDF:** PDFKit with watermarked STR reports

---

## Repository Structure

```
solvera-landing/
├── pages/
│   ├── _app.jsx        # Next.js app wrapper
│   └── index.jsx       # Landing page
├── styles/
│   └── globals.css     # Global styles
├── public/             # Static assets (favicon, og image)
├── next.config.js
└── package.json
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy

This project is deployed on Vercel. Connected to `solveratech.xyz` via Domainesia DNS.

```bash
npm run build   # Production build
npm run start   # Start production server
```

---

## Compliance Context

Solvera is designed for regulated entities operating under:
- **POJK 27/2024** — OJK regulation for crypto asset operators in Indonesia
- **UU P2SK** — Financial sector development and strengthening law
- **PPATK STR** — Indonesian financial intelligence reporting requirements
- **FATF Recommendations** — International AML/CTF standards
- **Travel Rule / CARF** — Cross-border transaction reporting

---

## Contact

- **Email:** hello@solveratech.xyz
- **X:** [@SolveraHQ](https://x.com/SolveraHQ)
- **Website:** [solveratech.xyz](https://solveratech.xyz)

---

*Solvera is not a financial advisor. Risk scores are investigative tools for compliance review, not final determinations.*
