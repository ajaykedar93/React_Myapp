// src/Notes/TryNewPageTabs.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function TryNewPageTabs() {
  const navigate = useNavigate();
  const [activeTab] = useState("demo");

  useEffect(() => {
    const id = "try-new-tabs-style-v6";
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
      }

      /* Navbar */
      .tnp-navbar{
        background: rgba(17,24,39,.96);
        border-bottom:1px solid rgba(255,255,255,.10);
        backdrop-filter: blur(12px);
        padding-top:max(env(safe-area-inset-top,0px),10px);
      }

      .tnp-nav-inner{
        display:flex;
        align-items:center;
        padding:18px 14px;
        min-height:74px;
      }

      .tnp-title-wrap{
        display:flex;
        align-items:center;
        gap:10px;
        flex:1;
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
        font-size:16.5px;
        letter-spacing:.3px;
      }

      .tnp-back{
        margin-left:auto;
        padding:6px 10px !important;
        font-size:13px !important;
        border-radius:12px !important;
        font-weight:900 !important;
        background:rgba(255,255,255,.12)!important;
        border:1px solid rgba(255,255,255,.18)!important;
        color:#fff!important;
      }

      .tnp-main{
        flex:1;
        width:100%;
        padding-bottom:calc(env(safe-area-inset-bottom,0px) + 110px);
      }

      .tnp-tabsbar{
        width:100%;
        padding:12px 0;
      }

      .tnp-tabs{
        padding:0 12px;
      }

      .tnp-tabbtn{
        border-radius:14px;
        padding:10px 16px;
        font-weight:1000;
        border:1px solid rgba(0,0,0,.08);
        background:#fff;
        box-shadow:0 10px 22px rgba(0,0,0,.06);
      }

      .tnp-tabbtn.active{
        color:#fff;
        background:linear-gradient(135deg,var(--tnpA),var(--tnpB),var(--tnpC));
      }

      .tnp-content{
        width:100%;
        padding:16px;
      }

      .demo-card{
        background:#fff;
        border-radius:18px;
        padding:20px;
        box-shadow:0 14px 34px rgba(0,0,0,.08);
      }

      .demo-title{
        font-weight:900;
        font-size:18px;
        margin-bottom:8px;
        background:linear-gradient(90deg,var(--tnpA),var(--tnpB),var(--tnpC));
        -webkit-background-clip:text;
        color:transparent;
      }

      .demo-text{
        font-size:14px;
        color:#334155;
      }

      @media(max-width:576px){
        .tnp-content{ padding:12px; }
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
            <div className="tnp-mark"/>
            <div className="tnp-title">
              TRY NEW LOOK
            </div>
          </div>

          <button
            className="btn tnp-back"
            onClick={() => navigate("/new-features")}
          >
            Back
          </button>

        </div>
      </header>

      {/* Main */}
      <main className="tnp-main">

        {/* Tabs */}
        <div className="tnp-tabsbar">
          <div className="tnp-tabs">
            <button className="tnp-tabbtn active">
              Demo Tab
            </button>
          </div>
        </div>

        {/* Demo Content */}
        <div className="tnp-content">

          <div className="demo-card">

            <div className="demo-title">
              Demo Page
            </div>

            <div className="demo-text">
              This is a demo tab page.<br/><br/>
              
              You can add any component here like:
              <br/>
              • Add Notes Page  
              <br/>
              • Get Notes Page  
              <br/>
              • Dashboard  
              <br/>
              • Settings  
              <br/><br/>

              Full professional layout is ready.
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
