// src/Notes/Demo.jsx
import React, { useEffect, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Demo() {
  const cards = useMemo(
    () => [
      {
        sq: "01",
        title: "Frontend UI",
        details:
          "React + Bootstrap responsive layout.\nClean components, smooth UX for mobile and desktop.",
      },
      {
        sq: "02",
        title: "Backend APIs",
        details:
          "Node/Express or ASP.NET Web API.\nSecure endpoints, validation, and clean responses.",
      },
      {
        sq: "03",
        title: "Database",
        details:
          "SQL Server / PostgreSQL schema.\nFast queries, proper relations and indexes.",
      },
      {
        sq: "04",
        title: "Auth & Roles",
        details:
          "Login, JWT, role-based access.\nAdmin/Owner/User flows with safe routes.",
      },
      {
        sq: "05",
        title: "Deployment",
        details:
          "CI/CD + hosting setup.\nRender/Vercel + DB hosting best practices.",
      },
    ],
    []
  );

  useEffect(() => {
    const id = "demo-page-style-v1";
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      html, body { margin:0; padding:0; width:100%; overflow-x:hidden; }
      :root{
        --ink:#0f172a;
        --muted: rgba(15,23,42,.72);
        --cardBorder: rgba(2,6,23,.10);
        --glass: rgba(255,255,255,.90);

        /* stylish font stack (no external import needed) */
        --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      }

      .demo-root{
        min-height: 100dvh;
        width:100%;
        font-family: var(--font);
        color: var(--ink);
        background:
          radial-gradient(1000px 520px at 8% 0%, rgba(245,158,11,.14), transparent 58%),
          radial-gradient(1000px 520px at 92% 10%, rgba(124,58,237,.12), transparent 58%),
          radial-gradient(900px 520px at 60% 100%, rgba(34,197,94,.10), transparent 58%),
          linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f3f4f6 100%);
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 70px);
      }

      /* Header (edge-to-edge) */
      .demo-head{
        width:100%;
        padding: 14px 12px 10px;
      }
      .demo-title{
        margin:0;
        font-weight: 1000;
        letter-spacing: .2px;
        font-size: clamp(18px, 4.2vw, 24px);
        background: linear-gradient(90deg, #14b8a6, #22c55e, #8b5cf6);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .demo-sub{
        margin-top: 6px;
        font-size: clamp(12px, 3.2vw, 14px);
        color: var(--muted);
        font-weight: 700;
      }

      /* Grid wrapper: edge-to-edge on mobile */
      .demo-wrap{
        width:100%;
        padding: 0; /* ✅ edge-to-edge */
      }

      /* Card animation */
      @keyframes demoIn{
        0% { opacity: 0; transform: translateY(10px) scale(.985); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }

      .demo-card{
        position: relative;
        border: 1px solid var(--cardBorder);
        background: rgba(255,255,255,.96);
        overflow:hidden;
        animation: demoIn .35s ease both;
        will-change: transform, opacity;
      }

      /* top accent line */
      .demo-card::before{
        content:"";
        position:absolute;
        inset: 0 0 auto 0;
        height: 5px;
        background: linear-gradient(90deg, rgba(245,158,11,1), rgba(236,72,153,1), rgba(124,58,237,1));
        opacity: .95;
      }

      .demo-inner{
        padding: 14px;
      }

      .demo-sq{
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display:grid;
        place-items:center;
        font-weight: 1000;
        letter-spacing: .5px;
        color: #0b1221;
        background: linear-gradient(135deg, rgba(20,184,166,.22), rgba(139,92,246,.22));
        border: 1px solid rgba(2,6,23,.10);
        box-shadow: 0 12px 24px rgba(0,0,0,.08);
        flex: 0 0 auto;
      }

      .demo-h{
        font-weight: 1000;
        margin: 0;
        font-size: clamp(14px, 3.6vw, 16px);
        letter-spacing: .15px;
      }

      .demo-d{
        margin: 8px 0 0;
        font-weight: 750;
        font-size: clamp(12px, 3.2vw, 14px);
        color: rgba(15,23,42,.75);
        line-height: 1.45;
        white-space: pre-line; /* ✅ new line keep */
        display: -webkit-box;
        -webkit-line-clamp: 2; /* ✅ only 2 lines */
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Hover micro interaction (desktop) */
      @media (hover:hover) and (pointer:fine){
        .demo-card{
          transition: transform .16s ease, box-shadow .20s ease, border-color .16s ease;
        }
        .demo-card:hover{
          transform: translateY(-3px);
          box-shadow: 0 18px 34px rgba(0,0,0,.12);
          border-color: rgba(20,184,166,.22);
        }
      }

      /* ✅ Mobile: edge-to-edge + flat strips */
      @media (max-width: 576px){
        .demo-card{
          border-left: 0;
          border-right: 0;
          border-radius: 0 !important;
        }
        .demo-head{ padding-left: 12px; padding-right: 12px; }
      }

      /* ✅ Desktop/Tab: nice rounded */
      @media (min-width: 577px){
        .demo-wrap{ padding: 12px; }
        .demo-card{ border-radius: 18px; }
      }

      /* Different card color vibes using nth-child */
      .demo-card:nth-child(1) .demo-sq{ background: linear-gradient(135deg, rgba(20,184,166,.25), rgba(34,197,94,.18)); }
      .demo-card:nth-child(2) .demo-sq{ background: linear-gradient(135deg, rgba(99,102,241,.22), rgba(139,92,246,.22)); }
      .demo-card:nth-child(3) .demo-sq{ background: linear-gradient(135deg, rgba(245,158,11,.22), rgba(236,72,153,.18)); }
      .demo-card:nth-child(4) .demo-sq{ background: linear-gradient(135deg, rgba(34,197,94,.18), rgba(124,58,237,.20)); }
      .demo-card:nth-child(5) .demo-sq{ background: linear-gradient(135deg, rgba(236,72,153,.18), rgba(20,184,166,.20)); }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce){
        .demo-card{ animation: none !important; transition:none !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <div className="demo-root">
      {/* Header */}
      <div className="demo-head">
        <h3 className="demo-title">Computer Development</h3>
        <div className="demo-sub">
          Responsive Bootstrap cards • Mobile edge-to-edge • Clean professional UI
        </div>
      </div>

      {/* Cards */}
      <div className="demo-wrap">
        <div className="container-fluid p-0">
          <div className="row g-0">
            {cards.map((c, i) => (
              <div
                key={c.sq}
                className="col-12 col-sm-6 col-lg-4 col-xl-3"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="demo-card">
                  <div className="demo-inner">
                    <div className="d-flex align-items-start gap-3">
                      <div className="demo-sq">{c.sq}</div>
                      <div className="min-w-0" style={{ minWidth: 0 }}>
                        <h6 className="demo-h">{c.title}</h6>
                        <p className="demo-d">{c.details}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
