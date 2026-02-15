// src/components/NewFeatureTab.jsx
import React, { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

export default function NewFeatureTab() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = "newfeaturetab-page-style-v2";
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --nf-pad: clamp(12px, 3.2vw, 22px);
        --nf-title: clamp(22px, 6.2vw, 40px);
        --nf-sub: clamp(12px, 3.2vw, 15px);

        --nf-red: #e11d48;
        --nf-red2:#fb7185;
        --nf-bg1: rgba(225,29,72,.14);
        --nf-bg2: rgba(245,158,11,.12);
        --nf-bg3: rgba(34,197,94,.10);

        --nf-ink: #1f2937;

        /* dashboard-like button colors */
        --dash-yellow: #ffeb3b;
        --dash-yellow-hover: #f7df24;
        --dash-dark: #0f172a;
      }

      html, body { height: 100%; }
      body { margin: 0; background: #f8fafc; }

      .nf-page{
        min-height: 100dvh;
        width: 100%;
        padding: var(--nf-pad);
        display: grid;
        place-items: center;
        background:
          radial-gradient(900px 520px at 15% 12%, var(--nf-bg1), transparent 60%),
          radial-gradient(820px 520px at 85% 10%, var(--nf-bg2), transparent 60%),
          radial-gradient(760px 520px at 52% 95%, var(--nf-bg3), transparent 60%),
          linear-gradient(180deg, #ffffff 0%, #f7fbff 55%, #ffffff 100%);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color: var(--nf-ink);
      }

      .nf-card{
        width: min(720px, 100%);
        border-radius: 22px;
        border: 1px solid rgba(15,23,42,0.10);
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(12px);
        box-shadow:
          0 22px 70px rgba(0,0,0,0.10),
          0 10px 30px rgba(225,29,72,0.08);
        padding: clamp(16px, 4vw, 26px);
        overflow: hidden;
        position: relative;
      }

      .nf-card::before{
        content:"";
        position:absolute;
        inset: 0 0 auto 0;
        height: 6px;
        background: linear-gradient(90deg, var(--nf-red), #f59e0b, #22c55e);
        opacity: .95;
      }

      .nf-topbar{
        display:flex;
        align-items:center;
        justify-content:center;
        margin-bottom: 10px;
      }

      /* Yellow dark dashboard button */
      .nf-dashboardBtn{
        appearance: none;
        border: 0;
        border-radius: 14px;
        padding: 10px 16px;
        font-weight: 950;
        letter-spacing: .2px;
        color: var(--dash-dark);
        background: var(--dash-yellow);
        box-shadow: 0 14px 26px rgba(2,6,23,.10);
        transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
      }
      .nf-dashboardBtn:hover{
        background: var(--dash-yellow-hover);
        filter: saturate(1.05);
        box-shadow: 0 16px 34px rgba(2,6,23,.14);
      }
      .nf-dashboardBtn:active{ transform: scale(.985); }
      .nf-dashboardBtn:focus-visible{
        outline: none;
        box-shadow: 0 0 0 4px rgba(255,235,59,.55), 0 16px 34px rgba(2,6,23,.14);
      }

      .nf-badge{
        display:inline-flex;
        align-items:center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        font-weight: 900;
        font-size: 12px;
        letter-spacing: .25px;
        color: #7f1d1d;
        background: rgba(225,29,72,0.10);
        border: 1px solid rgba(225,29,72,0.20);
      }

      .nf-title{
        margin-top: 14px;
        font-size: var(--nf-title);
        font-weight: 1000;
        letter-spacing: .3px;
        line-height: 1.05;
      }

      .nf-title span{
        background: linear-gradient(90deg, var(--nf-red), var(--nf-red2));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .nf-sub{
        margin-top: 10px;
        font-size: var(--nf-sub);
        font-weight: 800;
        color: rgba(31,41,55,0.72);
        line-height: 1.5;
      }

      .nf-coming{
        margin-top: 16px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap: 10px;
        text-align:center;
      }

      .nf-comingText{
        font-size: clamp(18px, 5vw, 28px);
        font-weight: 1000;
        letter-spacing: .4px;
        color: var(--nf-red);
        text-shadow:
          0 10px 30px rgba(225,29,72,0.18),
          0 2px 10px rgba(225,29,72,0.10);
        animation: nfPop 1.6s ease-in-out infinite;
      }

      .nf-line{
        width: min(360px, 80%);
        height: 6px;
        border-radius: 999px;
        background: rgba(225,29,72,0.12);
        overflow:hidden;
        border: 1px solid rgba(225,29,72,0.18);
      }
      .nf-line::after{
        content:"";
        display:block;
        height: 100%;
        width: 38%;
        border-radius: 999px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(225,29,72,0.65),
          rgba(251,113,133,0.9),
          transparent
        );
        animation: nfShine 1.15s linear infinite;
        transform: translateX(-60%);
      }

      .nf-hint{
        margin-top: 6px;
        font-size: 12px;
        font-weight: 800;
        color: rgba(31,41,55,0.62);
      }

      .nf-dots{
        position:absolute;
        inset: 0;
        pointer-events:none;
        opacity: .55;
      }
      .nf-dot{
        position:absolute;
        width: 10px; height: 10px;
        border-radius: 999px;
        background: rgba(225,29,72,0.22);
        animation: nfFloat 5.4s ease-in-out infinite;
      }
      .nf-dot:nth-child(1){ top: 18%; left: 10%; animation-delay: .0s; }
      .nf-dot:nth-child(2){ top: 28%; right: 14%; animation-delay: .6s; background: rgba(245,158,11,0.22); }
      .nf-dot:nth-child(3){ bottom: 18%; left: 18%; animation-delay: 1.2s; background: rgba(34,197,94,0.18); }
      .nf-dot:nth-child(4){ bottom: 26%; right: 22%; animation-delay: 1.8s; }

      @keyframes nfShine{
        0%{ transform: translateX(-60%); }
        100%{ transform: translateX(260%); }
      }
      @keyframes nfPop{
        0%,100%{ transform: translateY(0); filter: brightness(1); }
        50%{ transform: translateY(-2px); filter: brightness(1.05); }
      }
      @keyframes nfFloat{
        0%,100%{ transform: translateY(0); }
        50%{ transform: translateY(-10px); }
      }

      @media (max-width: 576px){
        .nf-card{ border-radius: 18px; }
        .nf-badge{ font-size: 11px; }
        .nf-dashboardBtn{ width: 100%; }
      }

      @media (prefers-reduced-motion: reduce){
        .nf-comingText, .nf-line::after, .nf-dot { animation: none !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <div className="nf-page">
      <div className="nf-card">
        <div className="nf-dots">
          <span className="nf-dot" />
          <span className="nf-dot" />
          <span className="nf-dot" />
          <span className="nf-dot" />
        </div>

        {/* ✅ Top Center Dashboard Button */}
        <div className="nf-topbar">
          <button
            type="button"
            className="nf-dashboardBtn"
            onClick={() => navigate("/dashboard")}
            aria-label="Go to Dashboard"
          >
            ⬅ Dashboard
          </button>
        </div>

        <div className="text-center">
          <span className="nf-badge">🚀 NEW MODULE</span>

          <div className="nf-title">
            <span>New Features</span>
          </div>

          <div className="nf-sub">
            We’re building something fresh for you. This section will be live soon.
          </div>

          <div className="nf-coming">
            <div className="nf-comingText">New Features Coming Soon…..</div>
            <div className="nf-line" />
            <div className="nf-hint">Stay tuned ✨</div>
          </div>
        </div>
      </div>
    </div>
  );
}
