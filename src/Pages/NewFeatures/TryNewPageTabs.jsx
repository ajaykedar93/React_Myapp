// src/Notes/TryNewPageTabs.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Demo from "./Demo";

export default function TryNewPageTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("demo");

  useEffect(() => {
    const id = "try-new-tabs-navbar-fix-v8";
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      html, body { margin:0; padding:0; width:100%; overflow-x:hidden; }
      #root { width:100%; }

      :root{
        --tnpA:#14b8a6;
        --tnpB:#22c55e;
        --tnpC:#8b5cf6;
        --tnpD:#f59e0b;
        --tnpInk:#0f172a;
      }

      .tnp-page{
        min-height:100dvh;
        width:100%;
        display:flex;
        flex-direction:column;
        background:
          radial-gradient(900px 420px at 12% 0%, rgba(245,158,11,.10), transparent 55%),
          radial-gradient(900px 420px at 90% 10%, rgba(124,58,237,.10), transparent 55%),
          radial-gradient(860px 420px at 70% 90%, rgba(236,72,153,.08), transparent 55%),
          #f3f4f6;
        color: var(--tnpInk);
      }

      /* ✅ Navbar */
      .tnp-navbar{
        background: rgba(17,24,39,.96);
        border-bottom:1px solid rgba(255,255,255,.10);
        backdrop-filter: blur(12px);
        padding-top:max(env(safe-area-inset-top,0px),10px);
        z-index: 1200;
      }

      /* ✅ HARD FIX: always ROW + title left + back right */
      .tnp-nav-inner{
        width: 100%;
        display:flex !important;
        flex-direction: row !important;     /* ✅ prevent column by other css */
        align-items:center !important;
        justify-content: space-between !important;
        gap: 10px;
        padding: 18px 14px;
        min-height: 76px;                  /* ✅ increase navbar height */
      }

      .tnp-title-wrap{
        display:flex;
        align-items:center;
        gap:10px;
        min-width: 0;
        flex: 1 1 auto;
      }

      .tnp-mark{
        width:10px;
        height:10px;
        border-radius:999px;
        background:var(--tnpD);
        box-shadow:0 0 0 6px rgba(245,158,11,.22);
        flex: 0 0 auto;
      }

      /* ✅ Title always visible (1 line) */
      .tnp-title{
        color:#fff;
        font-weight:1000;
        letter-spacing:.25px;
        font-size: 15px;                   /* ✅ small on mobile */
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }

      /* ✅ Back button MUST stay small (NOT full width) */
      .tnp-back{
        flex: 0 0 auto !important;
        flex-shrink: 0 !important;
        width: auto !important;
        min-width: unset !important;
        display: inline-flex !important;   /* ✅ prevents block full width */
        align-items: center !important;
        justify-content: center !important;

        padding: 7px 11px !important;
        font-size: 12.5px !important;
        line-height: 1 !important;
        border-radius: 12px !important;
        font-weight: 950 !important;

        background: rgba(255,255,255,.12)!important;
        border: 1px solid rgba(255,255,255,.18)!important;
        color:#fff!important;
        white-space: nowrap !important;
      }
      .tnp-back:hover{ background:rgba(255,255,255,.18)!important; }

      /* Main */
      .tnp-main{
        flex:1;
        width:100%;
        padding-bottom: calc(env(safe-area-inset-bottom,0px) + 110px);
      }

      /* Tabs */
      .tnp-tabsbar{ width:100%; padding: 12px 0 10px; }
      .tnp-tabs{
        display:flex;
        gap: 10px;
        align-items:center;
        padding: 0 12px;
        flex-wrap: wrap;
      }

      .tnp-tabbtn{
        border-radius:14px;
        padding:10px 16px;
        font-weight:1000;
        letter-spacing:.2px;
        border:1px solid rgba(2,6,23,.10);
        background:rgba(255,255,255,.92);
        color:rgba(15,23,42,.88);
        box-shadow:0 10px 22px rgba(0,0,0,.06);
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      }
      .tnp-tabbtn:hover{
        transform: translateY(-2px);
        box-shadow:0 14px 26px rgba(0,0,0,.10);
        border-color: rgba(20,184,166,.22);
      }
      .tnp-tabbtn.active{
        color:#fff;
        border-color: rgba(20,184,166,.45);
        background:linear-gradient(135deg,var(--tnpA),var(--tnpB),var(--tnpC));
        box-shadow:
          0 18px 36px rgba(0,0,0,.16),
          0 0 0 4px rgba(20,184,166,.10);
        transform: translateY(-1px);
      }

      /* Content full width */
      .tnp-content{ width:100%; padding: 0; }

      /* ✅ Big screens: auto bigger fonts + navbar */
      @media (min-width: 992px){
        .tnp-nav-inner{ min-height: 86px; padding: 22px 22px; }
        .tnp-title{ font-size: 18px; }
        .tnp-back{ font-size: 13.5px !important; padding: 8px 14px !important; }
      }

      @media(max-width:360px){
        .tnp-title{ font-size: 14px; }
        .tnp-back{ padding: 6px 9px !important; font-size: 12px !important; }
        .tnp-tabbtn{ padding: 9px 12px; }
      }

      @media (prefers-reduced-motion: reduce){
        .tnp-tabbtn{ transition:none !important; }
        .tnp-tabbtn:hover{ transform:none !important; }
        .tnp-tabbtn.active{ transform:none !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <div className="tnp-page">
      {/* Navbar */}
      <header className="tnp-navbar sticky-top">
        <div className="tnp-nav-inner">
          <div className="tnp-title-wrap">
            <div className="tnp-mark" aria-hidden />
            <div className="tnp-title" title="TRY NEW LOOK">
              TRY NEW LOOK
            </div>
          </div>

          <button className="btn tnp-back" onClick={() => navigate("/new-features")} type="button">
            Back
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="tnp-main">
        <div className="tnp-tabsbar">
          <div className="tnp-tabs" role="tablist" aria-label="Try New Look Tabs">
            <button
              className={`tnp-tabbtn ${activeTab === "demo" ? "active" : ""}`}
              onClick={() => setActiveTab("demo")}
              type="button"
              role="tab"
              aria-selected={activeTab === "demo"}
            >
              Demo
            </button>
          </div>
        </div>

        <div className="tnp-content">{activeTab === "demo" && <Demo />}</div>
      </main>
    </div>
  );
}
