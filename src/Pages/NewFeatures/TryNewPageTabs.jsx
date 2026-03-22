import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Demo from "./Demo";

export default function TryNewPageTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("demo");

  useEffect(() => {
    const id = "try-new-tabs-navbar-fix-v9";
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
        --tnpChatA:#2563eb;
        --tnpChatB:#06b6d4;
        --tnpAuthA:#ec4899;
        --tnpAuthB:#8b5cf6;
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

      .tnp-navbar{
        background: rgba(17,24,39,.96);
        border-bottom:1px solid rgba(255,255,255,.10);
        backdrop-filter: blur(12px);
        padding-top:max(env(safe-area-inset-top,0px),10px);
        z-index: 1200;
      }

      .tnp-nav-inner{
        width: 100%;
        display:flex;
        flex-direction: row;
        align-items:center;
        justify-content: space-between;
        padding: 18px 14px;
        min-height: 76px;
      }

      .tnp-title-wrap{
        display:flex;
        align-items:center;
        gap:10px;
      }

      .tnp-mark{
        width:10px;
        height:10px;
        border-radius:999px;
        background:var(--tnpD);
        box-shadow:0 0 0 6px rgba(245,158,11,.22);
      }

      .tnp-title{
        color:#fff;
        font-weight:1000;
        letter-spacing:.25px;
        font-size: 15px;
      }

      .tnp-back{
        padding: 7px 11px;
        font-size: 12.5px;
        border-radius: 12px;
        font-weight: 950;
        background: rgba(255,255,255,.12)!important;
        border: 1px solid rgba(255,255,255,.18)!important;
        color:#fff!important;
      }

      .tnp-main{
        flex:1;
        width:100%;
        padding-bottom:110px;
      }

      .tnp-tabsbar{ width:100%; padding: 12px 0 10px; }

      .tnp-tabs{
        display:flex;
        gap: 10px;
        padding: 0 12px;
        flex-wrap: wrap;
      }

      .tnp-tabbtn{
        border-radius:14px;
        padding:10px 16px;
        font-weight:1000;
        border:1px solid rgba(2,6,23,.10);
        background:rgba(255,255,255,.92);
        box-shadow:0 10px 22px rgba(0,0,0,.06);
        cursor:pointer;
      }

      .tnp-tabbtn.active{
        color:#fff;
        background:linear-gradient(135deg,var(--tnpA),var(--tnpB),var(--tnpC));
      }

      .tnp-tabbtn.chat-active{
        color:#fff;
        background:linear-gradient(135deg,var(--tnpChatA),var(--tnpChatB),var(--tnpC));
      }

      .tnp-tabbtn.auth-active{
        color:#fff;
        background:linear-gradient(135deg,var(--tnpAuthA),var(--tnpAuthB),var(--tnpC));
      }

      .tnp-content{
        width:100%;
      }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <div className="tnp-page">

      <header className="tnp-navbar sticky-top">
        <div className="tnp-nav-inner">

          <div className="tnp-title-wrap">
            <div className="tnp-mark" />
            <div className="tnp-title">TRY NEW LOOK</div>
          </div>

          <button
            className="btn tnp-back"
            onClick={() => navigate("/new-features")}
          >
            Back
          </button>

        </div>
      </header>

      <main className="tnp-main">

        <div className="tnp-tabsbar">

          <div className="tnp-tabs">

            <button
              className={`tnp-tabbtn ${activeTab === "demo" ? "active" : ""}`}
              onClick={() => setActiveTab("demo")}
            >
              Demo
            </button>

            

          </div>

        </div>

        <div className="tnp-content">

          {activeTab === "demo" && <Demo />}

         

        </div>

      </main>
    </div>
  );
}