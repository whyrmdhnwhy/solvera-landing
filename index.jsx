import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const SAMPLE_WALLETS = [
  {
    address: "7xKXp2R8vGn4YhBwT5mKqZd9fWpNjLr9Qm",
    score: 847,
    band: "Clean",
    bandColor: "#22c55e",
    tags: ["Active DeFi User", "Multi-Protocol", "Low Bot Risk"],
    typologies: [],
    breakdown: [
      { code: "T1", label: "Structuring", status: "NONE", color: "#22c55e" },
      { code: "T2", label: "Rapid Movement", status: "NONE", color: "#22c55e" },
      { code: "T3", label: "Mixer Interaction", status: "NONE", color: "#22c55e" },
      { code: "T4", label: "Bridge Obfuscation", status: "NONE", color: "#22c55e" },
      { code: "T5", label: "Dormant Reactivation", status: "NONE", color: "#22c55e" },
      { code: "T6", label: "Round Trip", status: "NONE", color: "#22c55e" },
      { code: "T7", label: "Dusting", status: "NONE", color: "#22c55e" },
      { code: "T8", label: "Dev Dump", status: "NONE", color: "#22c55e" },
      { code: "T9", label: "Crowd Escalation", status: "NONE", color: "#22c55e" },
    ],
    causes: [
      "Consistent activity across 12 protocols over 8 months",
      "Normal transaction frequency and volume patterns",
      "No flagged contract interactions detected",
    ],
    causeType: "clean",
    summary:
      "This wallet demonstrates consistent DeFi activity across 12+ protocols over 8 months. No flagged behavioral patterns. Transaction frequency and volume are within normal ranges for an active retail participant.",
  },
  {
    address: "3vPk8jR2nQ7xLmW4dFcA9sYb6tKhGeMN8x",
    score: 412,
    band: "Elevated Risk",
    bandColor: "#f97316",
    tags: ["Structuring Pattern", "Privacy Mixer Usage", "Rapid Movement"],
    typologies: ["T1", "T2", "T3"],
    breakdown: [
      { code: "T1", label: "Structuring", status: "HIGH", color: "#ef4444" },
      { code: "T2", label: "Rapid Movement", status: "MEDIUM", color: "#f97316" },
      { code: "T3", label: "Mixer Interaction", status: "HIGH", color: "#ef4444" },
      { code: "T4", label: "Bridge Obfuscation", status: "LOW", color: "#eab308" },
      { code: "T5", label: "Dormant Reactivation", status: "NONE", color: "#22c55e" },
      { code: "T6", label: "Round Trip", status: "LOW", color: "#eab308" },
      { code: "T7", label: "Dusting", status: "NONE", color: "#22c55e" },
      { code: "T8", label: "Dev Dump", status: "NONE", color: "#22c55e" },
      { code: "T9", label: "Crowd Escalation", status: "NONE", color: "#22c55e" },
    ],
    causes: [
      "14 structured transfers under $500 within 48hrs (T1: -180)",
      "2 interactions with Tornado Cash fork contracts (T3: -280)",
      "7 rapid fund movements averaging 45s intervals (T2: -90)",
    ],
    causeType: "risk",
    summary:
      "This wallet shows elevated risk patterns including structured transactions consistent with layering behavior and interaction with known mixing protocols. Multiple rapid fund movements detected within short timeframes. Recommended for enhanced due diligence.",
  },
  {
    address: "9kFzT4mA2wP7vRcX8nJb5sLq3hYdEgwQ4j",
    score: 631,
    band: "Moderate Risk",
    bandColor: "#eab308",
    tags: ["Token Creator Risk", "Dust Attack Target"],
    typologies: ["T7", "T8"],
    breakdown: [
      { code: "T1", label: "Structuring", status: "NONE", color: "#22c55e" },
      { code: "T2", label: "Rapid Movement", status: "LOW", color: "#eab308" },
      { code: "T3", label: "Mixer Interaction", status: "NONE", color: "#22c55e" },
      { code: "T4", label: "Bridge Obfuscation", status: "NONE", color: "#22c55e" },
      { code: "T5", label: "Dormant Reactivation", status: "NONE", color: "#22c55e" },
      { code: "T6", label: "Round Trip", status: "NONE", color: "#22c55e" },
      { code: "T7", label: "Dusting", status: "MEDIUM", color: "#f97316" },
      { code: "T8", label: "Dev Dump", status: "HIGH", color: "#ef4444" },
      { code: "T9", label: "Crowd Escalation", status: "LOW", color: "#eab308" },
    ],
    causes: [
      "Token created with 89% supply held by creator wallet (T8: -200)",
      "Creator sold 62% of holdings within 4hrs of launch (T8: -80)",
      "47 low-value dust transactions received from unknown wallets (T7: -50)",
    ],
    causeType: "risk",
    summary:
      "This wallet is associated with token creation activity and has received multiple low-value dust transactions. Creator token shows rapid sell-off patterns post-launch. Moderate risk flag for potential dev dump behavior.",
  },
];

const API_RESPONSE = `{
  "wallet": "7xKXp2R8...r9Qm",
  "score": 847,
  "band": "Clean",
  "typologies": [],
  "tags": ["Active DeFi User", "Low Bot Risk"],
  "summary": "No flagged behavioral patterns..."
}`;

function AnimatedScore({ target, isActive }) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!isActive) { setCurrent(0); return; }
    let start = null;
    const duration = 1400;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, isActive]);

  return <span>{current}</span>;
}

function ScoreRing({ score, color, isActive }) {
  const r = 88, c = 2 * Math.PI * r, p = isActive ? (score / 1000) * c : 0;
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={c - p} strokeLinecap="round"
        transform="rotate(-90 110 110)"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)", filter: `drop-shadow(0 0 12px ${color}60)` }}
      />
    </svg>
  );
}

function TypingText({ text, isActive, delay = 0 }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!isActive) { setDisplayed(""); setStarted(false); return; }
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [isActive, delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) clearInterval(iv); }, 10);
    return () => clearInterval(iv);
  }, [started, text]);
  return (
    <span>
      {displayed}
      {started && displayed.length < text.length && (
        <span style={{ display: "inline-block", width: 2, height: "1em", background: "#818cf8", marginLeft: 2, animation: "cursorBlink 0.8s infinite", verticalAlign: "text-bottom" }} />
      )}
    </span>
  );
}

function BreakdownPanel({ breakdown, causes, causeType, isVisible }) {
  if (!isVisible) return null;
  return (
    <div style={{ marginTop: 16, animation: "slideUp 0.4s ease forwards" }}>
      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#818cf8", letterSpacing: "0.06em", marginBottom: 12 }}>TYPOLOGY BREAKDOWN</div>
        <div className="breakdown-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
          {breakdown.map((item, i) => (
            <div key={item.code} style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
              animation: "slideUp 0.3s ease forwards", animationDelay: `${i * 50}ms`,
              opacity: 0, animationFillMode: "forwards",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, boxShadow: item.status !== "NONE" ? `0 0 6px ${item.color}60` : "none" }} />
              <span style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{item.code}</span>
              <span style={{ color: "#94a3b8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{item.status}</span>
            </div>
          ))}
        </div>
        {causes && causes.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10, color: causeType === "clean" ? "#22c55e" : "#f97316" }}>
              {causeType === "clean" ? "NO RISK FACTORS DETECTED" : "SCORE IMPACTED BY"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {causes.map((cause, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#94a3b8",
                  animation: "slideUp 0.3s ease forwards", animationDelay: `${500 + i * 80}ms`,
                  opacity: 0, animationFillMode: "forwards",
                }}>
                  <span style={{ color: causeType === "clean" ? "#22c55e" : "#f97316", fontSize: 10, marginTop: 2, flexShrink: 0 }}>
                    {causeType === "clean" ? "✓" : "▸"}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.5 }}>{cause}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SolveraLanding() {
  const [demoState, setDemoState] = useState("idle");
  const [demoWallet, setDemoWallet] = useState(null);
  const [walletIndex, setWalletIndex] = useState(0);
  const [tagsVisible, setTagsVisible] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [walletInput, setWalletInput] = useState("");

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const runDemo = () => {
    const wallet = SAMPLE_WALLETS[walletIndex % SAMPLE_WALLETS.length];
    setWalletIndex((i) => i + 1);
    setDemoState("loading");
    setDemoWallet(wallet);
    setTagsVisible(0);
    setShowBreakdown(false);
    setWalletInput(wallet.address);
    setTimeout(() => {
      setDemoState("scoring");
      setTimeout(() => {
        setDemoState("done");
        wallet.tags.forEach((_, i) => { setTimeout(() => setTagsVisible((v) => v + 1), 300 + i * 250); });
      }, 400);
    }, 800);
  };

  const g = { background: "linear-gradient(135deg, #67e8f9, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

  return (
    <>
      <Head>
        <title>Solvera — Solana Wallet Risk Scoring & AML Compliance API</title>
        <meta name="description" content="Solvera scores Solana wallets for risk, trust, and compliance. FATF-aligned AML detection across 9 typologies. Built for exchanges, compliance teams, and Web3 developers." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Solvera — Solana Wallet Risk Scoring" />
        <meta property="og:description" content="Know any Solana wallet in seconds. FATF-aligned AML intelligence for exchanges and Web3 compliance teams." />
        <meta property="og:url" content="https://solveratech.xyz" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@SolveraHQ" />
        <meta name="twitter:title" content="Solvera — Solana AML Intelligence" />
        <meta name="twitter:description" content="Know any Solana wallet in seconds. FATF-aligned risk scoring for compliance teams." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ background: "#0a0b14", color: "#e2e8f0", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @keyframes cursorBlink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
          @keyframes scanline { 0% { top: -4px; } 100% { top: calc(100% + 4px); } }
          @keyframes pulseGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes gridPulse { 0%, 100% { opacity: 0.03; } 50% { opacity: 0.07; } }

          .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(129,140,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.05) 1px, transparent 1px); background-size: 60px 60px; animation: gridPulse 6s ease-in-out infinite; mask-image: radial-gradient(ellipse 60% 50% at 50% 30%, black 20%, transparent 70%); }
          .glow-orb { position: absolute; border-radius: 50%; filter: blur(80px); animation: pulseGlow 5s ease-in-out infinite; pointer-events: none; }
          .section { padding: 100px 24px; position: relative; }
          .section-inner { max-width: 1100px; margin: 0 auto; }
          .btn-primary { background: linear-gradient(135deg, #818cf8, #6366f1); color: white; border: none; padding: 16px 36px; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.3s ease; }
          .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.4); }
          .btn-secondary { background: rgba(255,255,255,0.06); color: #c7d2fe; border: 1px solid rgba(129,140,248,0.2); padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.3s ease; }
          .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(129,140,248,0.4); }
          .demo-card { background: linear-gradient(170deg, rgba(30,32,54,0.9), rgba(15,16,30,0.95)); border: 1px solid rgba(129,140,248,0.12); border-radius: 20px; padding: 40px; position: relative; overflow: hidden; backdrop-filter: blur(20px); }
          .demo-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(129,140,248,0.3), transparent); }
          .tag { display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; }
          .tag-clean { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
          .tag-risk { background: rgba(249,115,22,0.12); color: #fb923c; border: 1px solid rgba(249,115,22,0.2); }
          .tag-warn { background: rgba(234,179,8,0.12); color: #facc15; border: 1px solid rgba(234,179,8,0.2); }
          .feature-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; transition: all 0.4s ease; }
          .feature-card:hover { background: rgba(129,140,248,0.04); border-color: rgba(129,140,248,0.15); transform: translateY(-4px); }
          .code-block { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; overflow-x: auto; }
          .loader-bar { height: 3px; background: rgba(129,140,248,0.15); border-radius: 2px; overflow: hidden; position: relative; }
          .loader-bar::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #818cf8, #c084fc, #818cf8); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; border-radius: 2px; }
          .separator { height: 1px; background: linear-gradient(90deg, transparent, rgba(129,140,248,0.15), transparent); }
          .wallet-input { flex: 1; min-width: 200px; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #a5b4fc; outline: none; transition: border-color 0.2s ease; }
          .wallet-input::placeholder { color: #475569; }
          .wallet-input:focus { border-color: rgba(129,140,248,0.3); }
          .breakdown-toggle { background: none; border: none; color: #818cf8; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; padding: 4px 0; transition: color 0.2s; display: flex; align-items: center; gap: 4px; margin: 12px auto 0; }
          .breakdown-toggle:hover { color: #a5b4fc; }
          @media (max-width: 768px) { .section { padding: 60px 16px; } .demo-card { padding: 24px; } .two-col { flex-direction: column !important; } .three-col { flex-direction: column !important; } .hero-h1 { font-size: 36px !important; } .hero-sub { font-size: 17px !important; } .stats-bar { flex-direction: column !important; gap: 24px !important; } .breakdown-grid { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* NAV */}
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 24px", background: scrollY > 50 ? "rgba(10,11,20,0.85)" : "transparent", backdropFilter: scrollY > 50 ? "blur(20px)" : "none", borderBottom: scrollY > 50 ? "1px solid rgba(129,140,248,0.08)" : "1px solid transparent", transition: "all 0.3s ease" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #67e8f9, #818cf8, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="2" strokeLinejoin="round" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Solvera</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => document.getElementById("api-section")?.scrollIntoView({ behavior: "smooth" })}>API Docs</button>
              <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}>Try It</button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="section" style={{ paddingTop: 160, paddingBottom: 40, textAlign: "center", position: "relative", minHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="hero-grid" />
          <div className="glow-orb" style={{ width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent)", top: "5%", left: "15%" }} />
          <div className="glow-orb" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(103,232,249,0.08), transparent)", bottom: "10%", right: "10%", animationDelay: "2.5s" }} />
          <div className="section-inner" style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 100, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", fontSize: 13, fontWeight: 500, color: "#a5b4fc", marginBottom: 28, letterSpacing: "0.02em" }}>Solana-Native AML Intelligence</div>
            <h1 className="hero-h1" style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.035em", marginBottom: 20, maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
              Know Any Wallet{" "}<span style={g}>in Seconds</span>
            </h1>
            <p className="hero-sub" style={{ fontSize: 19, color: "#94a3b8", maxWidth: 540, margin: "0 auto 40px", lineHeight: 1.6 }}>
              Solvera scores Solana wallets for risk, trust, and compliance. Powered by real AML detection, not guesswork.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <button className="btn-primary" onClick={() => { document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" }); setTimeout(runDemo, 600); }}>Check a Wallet</button>
              <button className="btn-secondary" onClick={() => document.getElementById("api-section")?.scrollIntoView({ behavior: "smooth" })}>View API</button>
            </div>
            <p style={{ fontSize: 13, color: "#64748b" }}>Free risk score. No signup required.</p>
          </div>
        </section>

        {/* CREDIBILITY BAR */}
        <div className="separator" />
        <div style={{ padding: "20px 24px", textAlign: "center", fontSize: 13, color: "#64748b", letterSpacing: "0.04em", fontWeight: 500, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          <span>FATF-Aligned Typology Detection</span>
          <span style={{ color: "rgba(129,140,248,0.3)" }}>|</span>
          <span>9 Risk Pattern Categories</span>
          <span style={{ color: "rgba(129,140,248,0.3)" }}>|</span>
          <span>Solana-Native Architecture</span>
        </div>
        <div className="separator" />

        {/* LIVE DEMO */}
        <section className="section" id="demo-section">
          <div className="section-inner">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>See It in Action</h2>
              <p style={{ color: "#94a3b8", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>Paste any Solana wallet. Get a risk score backed by 9 AML typologies.</p>
            </div>
            <div className="demo-card" style={{ maxWidth: 660, margin: "0 auto" }}>
              <div style={{ position: "absolute", top: 12, right: 16, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.15)", fontSize: 10, fontWeight: 500, color: "#818cf8", letterSpacing: "0.04em" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulseGlow 2s ease-in-out infinite" }} />
                DEMO MODE
              </div>

              {demoState === "loading" && <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.4), transparent)", animation: "scanline 1s linear infinite", zIndex: 5 }} />}

              <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap", marginTop: 8 }}>
                <input className="wallet-input" type="text" placeholder="Paste Solana wallet address..." value={walletInput} onChange={(e) => setWalletInput(e.target.value)} readOnly={demoState === "loading"} />
                <button className="btn-primary" onClick={runDemo} style={{ padding: "14px 24px", fontSize: 14, opacity: demoState === "loading" ? 0.6 : 1, pointerEvents: demoState === "loading" ? "none" : "auto" }}>
                  {demoState === "loading" ? "Analyzing..." : "Scan"}
                </button>
              </div>

              {demoState === "loading" && (
                <div style={{ animation: "slideUp 0.3s ease forwards" }}>
                  <div className="loader-bar" style={{ marginBottom: 16 }} />
                  <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Analyzing transaction patterns across 9 AML typologies...</p>
                </div>
              )}

              {(demoState === "scoring" || demoState === "done") && demoWallet && (
                <div style={{ animation: "slideUp 0.4s ease forwards" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32, position: "relative" }}>
                    <ScoreRing score={demoWallet.score} color={demoWallet.bandColor} isActive={demoState === "scoring" || demoState === "done"} />
                    <div style={{ position: "absolute", textAlign: "center" }}>
                      <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.03em", color: demoWallet.bandColor, lineHeight: 1 }}>
                        <AnimatedScore target={demoWallet.score} isActive={demoState === "scoring" || demoState === "done"} />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 4 }}>/ 1000</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 100, fontSize: 14, fontWeight: 600, color: demoWallet.bandColor, background: `${demoWallet.bandColor}15`, border: `1px solid ${demoWallet.bandColor}30` }}>{demoWallet.band}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28, minHeight: 36 }}>
                    {demoWallet.tags.map((tag, i) => (
                      <span key={tag} className={`tag ${demoWallet.score >= 800 ? "tag-clean" : demoWallet.score >= 600 ? "tag-warn" : "tag-risk"}`}
                        style={{ opacity: i < tagsVisible ? 1 : 0, transform: i < tagsVisible ? "scale(1) translateY(0)" : "scale(0.7) translateY(10px)", transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {demoState === "done" && (
                    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: "16px 20px", borderLeft: `3px solid ${demoWallet.bandColor}40` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#818cf8", letterSpacing: "0.06em", marginBottom: 8 }}>AI RISK SUMMARY</div>
                      <p style={{ fontSize: 14, lineHeight: 1.65, color: "#94a3b8" }}>
                        <TypingText text={demoWallet.summary} isActive={demoState === "done"} delay={600} />
                      </p>
                    </div>
                  )}
                  {demoState === "done" && (
                    <button className="breakdown-toggle" onClick={() => setShowBreakdown(!showBreakdown)}>
                      <span>{showBreakdown ? "Hide" : "View"} Typology Breakdown</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showBreakdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  )}
                  <BreakdownPanel breakdown={demoWallet.breakdown} causes={demoWallet.causes} causeType={demoWallet.causeType} isVisible={showBreakdown} />
                  {demoState === "done" && (
                    <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#475569", animation: "slideUp 0.5s ease forwards", animationDelay: "1.5s", opacity: 0, animationFillMode: "forwards" }}>
                      Click "Scan" again to see a different wallet profile
                    </p>
                  )}
                </div>
              )}

              {demoState === "idle" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "#475569", fontSize: 14 }}>Click "Scan" to analyze a sample wallet</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TRUST METRICS */}
        <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="section-inner">
            <div className="stats-bar" style={{ display: "flex", justifyContent: "center", gap: 64, textAlign: "center", padding: "32px 24px", background: "rgba(255,255,255,0.015)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)" }}>
              {[
                { value: "9", label: "FATF-aligned typologies" },
                { value: "2.1M+", label: "Transactions analyzed" },
                { value: "<800ms", label: "Average response time" },
                { value: "24/7", label: "Solana RPC monitoring" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", ...g }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 16, letterSpacing: "0.01em" }}>
              Powered by on-chain transaction graph analysis, behavioral clustering, and rule-based typology detection via Helius Enhanced Transactions API.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" style={{ paddingTop: 40 }}>
          <div className="section-inner">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <p style={{ fontSize: 17, color: "#f87171", fontWeight: 500, letterSpacing: "-0.01em", marginBottom: 48 }}>
                One bad wallet can expose your entire protocol.
              </p>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>How It Works</h2>
            </div>
            <div className="three-col" style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              {[
                { step: "01", title: "Paste a wallet", desc: "Enter any Solana wallet address. No account needed.", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 12h10M12 7v10" /></svg> },
                { step: "02", title: "9-typology analysis", desc: "Solvera scans transaction patterns against FATF-aligned AML detection rules.", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /><path d="M12 12l9-5M12 12v10M12 12L3 7" /></svg> },
                { step: "03", title: "Instant risk score", desc: "Get a 0-1000 score, behavior tags, typology breakdown, and an AI risk summary.", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
              ].map((item) => (
                <div key={item.step} className="feature-card" style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(129,140,248,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{item.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#818cf8", letterSpacing: "0.08em", marginBottom: 8 }}>STEP {item.step}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em" }}>{item.title}</h3>
                  <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TWO-TRACK VALUE PROP */}
        <section className="section">
          <div className="section-inner">
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", textAlign: "center", marginBottom: 12 }}>Built for{" "}<span style={g}>Two Worlds</span></h2>
            <p style={{ color: "#94a3b8", textAlign: "center", fontSize: 16, maxWidth: 500, margin: "0 auto 48px" }}>One engine. Two outputs. From quick wallet checks to full regulatory compliance.</p>
            <div className="two-col" style={{ display: "flex", gap: 24 }}>
              <div className="feature-card" style={{ flex: 1, borderColor: "rgba(103,232,249,0.15)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#67e8f9", letterSpacing: "0.08em", marginBottom: 16 }}>FOR DEVELOPERS</div>
                <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Wallet intelligence in one API call</h3>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>Integrate risk scoring into your app. Filter bots, reward trusted users, and meet compliance requirements before regulators come knocking.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Bot detection & user filtering", "Reputation-gated rewards", "Pre-built compliance checks"].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#cbd5e1" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(103,232,249,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L19 7" /></svg>
                      </div>{item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="feature-card" style={{ flex: 1, borderColor: "rgba(192,132,252,0.15)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#c084fc", letterSpacing: "0.08em", marginBottom: 16 }}>FOR COMPLIANCE TEAMS</div>
                <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>AML reports regulators actually accept</h3>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>Full FATF-aligned risk reports with STR-ready PDF exports. Built for POJK 27/2024 and PPATK reporting requirements. The AML tooling Solana has been missing.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["9 FATF typology breakdown", "STR-ready PDF exports", "POJK & PPATK aligned reporting"].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#cbd5e1" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(192,132,252,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L19 7" /></svg>
                      </div>{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY SOLVERA */}
        <section className="section">
          <div className="section-inner">
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", textAlign: "center", marginBottom: 12 }}>Why Solvera</h2>
            <p style={{ color: "#94a3b8", textAlign: "center", fontSize: 17, maxWidth: 520, margin: "0 auto 56px" }}>Most wallet analyzers show you data. Solvera tells you what it means.</p>
            <div className="three-col" style={{ display: "flex", gap: 24 }}>
              {[
                { title: "Not just analytics. Risk intelligence.", desc: "Your wallet score is backed by 9 FATF-aligned detection typologies. From structuring and mixer usage to dev dumps and dusting attacks.", accent: "#67e8f9" },
                { title: "Built for regulation that's already here.", desc: "Indonesian exchanges face POJK 27/2024 compliance now. Global Travel Rule and CARF requirements are next. Solvera speaks the language regulators expect.", accent: "#818cf8" },
                { title: "Solana-native. Not chain-agnostic fluff.", desc: "We don't stretch one model across 50 chains. Solvera is purpose-built for Solana's transaction architecture, speed, and ecosystem patterns.", accent: "#c084fc" },
              ].map((item) => (
                <div key={item.title} className="feature-card" style={{ flex: 1 }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: item.accent, marginBottom: 16, opacity: 0.7 }} />
                  <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>{item.title}</h3>
                  <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API SECTION */}
        <section className="section" id="api-section">
          <div className="section-inner">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>One Endpoint.{" "}<span style={g}>Instant Risk Intelligence.</span></h2>
              <p style={{ color: "#94a3b8", fontSize: 16 }}>Integrate wallet risk scoring in minutes, not months.</p>
            </div>
            <div className="two-col" style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div className="code-block">
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.7 }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308", opacity: 0.7 }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.7 }} />
                  </div>
                  <div style={{ color: "#64748b" }}>{"// Request"}</div>
                  <div><span style={{ color: "#67e8f9" }}>GET</span>{" "}<span style={{ color: "#a5b4fc" }}>/api/v1/score</span><span style={{ color: "#64748b" }}>?wallet=</span><span style={{ color: "#c084fc" }}>{"7xKX...r9Qm"}</span></div>
                  <br />
                  <div style={{ color: "#64748b" }}>{"// Response"}</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>{API_RESPONSE}</pre>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Pay-per-use. USDC on Base.</h3>
                <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20, lineHeight: 1.5 }}>Prevent $100k in fraud exposure with a $0.02 wallet check.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {[
                    { label: "Wallet Check", price: "$0.02", desc: "Score + tags + risk band" },
                    { label: "Full Trace", price: "$0.08", desc: "Complete T1-T9 breakdown" },
                    { label: "PDF Report", price: "$2.00", desc: "STR-ready compliance report" },
                  ].map((tier) => (
                    <div key={tier.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{tier.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{tier.desc}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, ...g }}>{tier.price}</div>
                    </div>
                  ))}
                </div>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>Powered by x402 protocol from Coinbase. No subscriptions, no minimum commitment.</p>
                <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.5, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>Built on Helius Enhanced Transactions API. Analyzes transaction graphs, behavioral velocity patterns, and counterparty risk scoring against known program IDs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="section" style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div className="glow-orb" style={{ width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.1), transparent)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          <div className="section-inner" style={{ position: "relative", zIndex: 2 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", maxWidth: 500, margin: "0 auto 16px", lineHeight: 1.2 }}>
              Solana deserves its own compliance layer.{" "}<span style={g}>We&apos;re building it.</span>
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 16, maxWidth: 440, margin: "0 auto 36px" }}>Start with a free wallet check. Scale to full compliance infrastructure.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}>Check a Wallet</button>
              <button className="btn-secondary">Get API Access</button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: "32px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #67e8f9, #818cf8, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Solvera</span>
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>© 2025 Solvera. Solana-Native AML Intelligence Layer.</div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              <a href="mailto:hello@solveratech.xyz" style={{ color: "#64748b", textDecoration: "none" }}>hello@solveratech.xyz</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
