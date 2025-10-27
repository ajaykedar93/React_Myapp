// src/Pages/Entertainment/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();
  const isEntertainment = pathname.startsWith("/entertainment");
  const isManage = pathname.startsWith("/entertainment/manage");

  return (
    <>
      {/* Fixed, full-width navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark eh-nav eh-fixed">
        <div className="container">
          {/* Brand */}
          <Link
            className="navbar-brand d-flex align-items-center gap-2 eh-brand"
            to="/entertainment"
            aria-current={isEntertainment ? "page" : undefined}
          >
            <span className="eh-brand-icon" aria-hidden="true">🎬</span>
            <span className="eh-brand-text">Entertainment&nbsp;Hub</span>
          </Link>

          {/* Right-side single Dashboard button */}
          <div className="d-flex align-items-center">
            <Link
              className={`btn btn-sm eh-chip ${isManage ? "is-active" : ""}`}
              to="/dashboard"
              aria-current={isManage ? "page" : undefined}
            >
              <span className="dot" aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Spacer to offset the fixed navbar height so ONLY the page below scrolls */}
      <div className="eh-nav-spacer" aria-hidden="true" />

      <style>{`
        /* === Fixed layout: navbar stays fixed; content below scrolls === */
        .eh-fixed {
          position: fixed !important;
          top: 0; left: 0; right: 0;
          width: 100%;
          z-index: 1100;
        }
        /* Spacer matches the navbar height (desktop 72 / mobile 64) */
        .eh-nav-spacer { height: var(--eh-nav-h, 72px); }

        /* ===== Blue Guardian Theme (same size as other pages) ===== */
        .eh-nav {
          --eh-nav-h: 72px;

          /* palette (slightly different shades than last time) */
          --c1: #1d4ed8;  /* blue-700 */
          --c2: #38bdf8;  /* sky-400 */
          --c3: #60a5fa;  /* blue-400 (accent blend) */

          --glass: rgba(10,14,24,.82);
          --light: rgba(255,255,255,.07);
          --ring: rgba(56,189,248,.38);
          --shadow: 0 10px 28px rgba(2,6,23,.45);

          min-height: var(--eh-nav-h);
          background:
            /* subtle glass */
            linear-gradient(180deg, var(--glass), rgba(10,14,24,.72)),
            /* left halo */
            radial-gradient(1000px 260px at 10% -40%, color-mix(in oklab, var(--c1) 44%, transparent), transparent 70%),
            /* right halo */
            radial-gradient(1000px 260px at 90% -40%, color-mix(in oklab, var(--c2) 48%, transparent), transparent 70%);
          backdrop-filter: saturate(140%) blur(7px);
          -webkit-backdrop-filter: saturate(140%) blur(7px);
          box-shadow: var(--shadow);
          border-bottom: 1px solid var(--light);
          position: relative;
          display: flex;
          align-items: center;
        }
        @media (max-width: 575.98px) { .eh-nav { --eh-nav-h: 64px; } }

        /* Slim bottom glow line */
        .eh-nav::after{
          content:"";
          position:absolute; left:0; right:0; bottom:-1px; height:3px;
          background: linear-gradient(90deg, var(--c1), var(--c2));
          opacity:.5; filter: blur(.6px); pointer-events:none;
        }

        /* Brand icon bubble */
        .eh-brand-icon {
          display: inline-grid; place-items: center;
          width: 36px; height: 36px; border-radius: 10px;
          background:
            radial-gradient(120px 120px at 30% 30%,
              color-mix(in oklab, var(--c1) 52%, transparent),
              color-mix(in oklab, var(--c3) 34%, transparent));
          box-shadow:
            inset 0 0 0 1px var(--light),
            0 10px 22px color-mix(in oklab, var(--c2) 32%, transparent);
          transform: translateZ(0);
        }

        /* Animated gradient brand text (subtle) */
        .eh-brand-text {
          font-weight: 800; letter-spacing: .2px;
          background: linear-gradient(90deg, #bfdbfe, #7dd3fc, #bfdbfe); /* blue-200 → sky-300 */
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
          animation: ehShift 7s ease-in-out infinite;
          text-shadow: 0 0 .01px rgba(0,0,0,0.01);
        }
        @keyframes ehShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (prefers-reduced-motion: reduce) { .eh-brand-text { animation: none; } }

        /* Brand hover lift */
        .eh-brand { transition: transform .14s ease, filter .25s ease; }
        .eh-brand:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 12px 30px color-mix(in oklab, var(--c1) 26%, transparent));
        }

        /* Dashboard pill button (chip) — same size as other pages */
        .eh-chip {
          --bg: linear-gradient(135deg, var(--c1), var(--c2));
          --bg2: linear-gradient(135deg, var(--c2), var(--c1));
          border-radius: 999px;
          padding-inline: 1.1rem;
          font-weight: 600;
          color: #fff !important;
          border: none;
          background: var(--bg);
          box-shadow: 0 6px 18px color-mix(in oklab, var(--c1) 35%, transparent);
          transition: transform .15s ease, box-shadow .22s ease, filter .22s ease, background .22s ease;
          position: relative;
          overflow: hidden; isolation: isolate;
        }
        .eh-chip .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #fff; opacity: .9; margin-right: .5rem; display: inline-block;
          box-shadow: 0 0 0 4px rgba(255,255,255,.14);
          transform: translateY(-1px);
        }
        .eh-chip:hover {
          transform: translateY(-2px);
          background: var(--bg2);
          box-shadow: 0 10px 26px color-mix(in oklab, var(--c2) 34%, transparent);
          filter: brightness(1.03);
        }
        .eh-chip:active { transform: translateY(0); box-shadow: 0 4px 10px rgba(0,0,0,.25); }
        .eh-chip:focus-visible {
          outline: none;
          box-shadow: 0 0 0 .22rem var(--ring), 0 8px 22px color-mix(in oklab, var(--c2) 30%, transparent);
        }
        .eh-chip.is-active {
          filter: brightness(1.02);
          box-shadow: 0 10px 26px color-mix(in oklab, var(--c1) 36%, transparent);
        }
      `}</style>
    </>
  );
}

export default Navbar;
