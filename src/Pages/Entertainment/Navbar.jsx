// src/Pages/Entertainment/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();
  const isEntertainment = pathname.startsWith("/entertainment");
  const isManage = pathname.startsWith("/entertainment/manage");

  return (
    <>
      {/* Mobile-only tiny safe top space (prevents notch/status overlap & gives air) */}
      <div className="eh-mobile-topspace" aria-hidden="true" />

      {/* Fixed, full-width navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark eh-nav eh-fixed">
        <div className="container eh-container">
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
          <div className="d-flex align-items-center ms-auto">
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
        /* ===== Layout scales & safe areas ===== */
        :root{
          --eh-nav-h: 72px;                 /* desktop height */
          --eh-gap: clamp(6px, 1.4vw, 10px);
          --eh-text: clamp(14px, 2.2vw, 16px);
          --eh-brand: clamp(16px, 3vw, 20px);
          --eh-safe-top: env(safe-area-inset-top, 0px);
        }
        @media (max-width: 575.98px){
          :root{ --eh-nav-h: 64px; }
        }

        /* Small space ABOVE nav ONLY on mobile (plus safe area) */
        .eh-mobile-topspace{
          display: none;
          height: calc(6px + var(--eh-safe-top));
          background: transparent;
        }
        @media (max-width: 575.98px){
          .eh-mobile-topspace{ display:block; }
        }

        /* Fixed layout: navbar stays fixed; content below scrolls */
        .eh-fixed {
          position: fixed !important;
          top: 0; left: 0; right: 0;
          width: 100%;
          z-index: 1100;
        }
        /* Spacer equals navbar height */
        .eh-nav-spacer { height: var(--eh-nav-h); }

        /* Container spacing tuned for small screens too */
        .eh-container{
          display:flex; align-items:center; gap: var(--eh-gap);
          min-height: var(--eh-nav-h);
        }

        /* ===== Blue Guardian Theme ===== */
        .eh-nav {
          /* palette */
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
          display: flex;
          align-items: center;
        }

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
          width: clamp(30px, 5vw, 36px);
          height: clamp(30px, 5vw, 36px);
          border-radius: 10px;
          background:
            radial-gradient(120px 120px at 30% 30%,
              color-mix(in oklab, var(--c1) 52%, transparent),
              color-mix(in oklab, var(--c3) 34%, transparent));
          box-shadow:
            inset 0 0 0 1px var(--light),
            0 10px 22px color-mix(in oklab, var(--c2) 32%, transparent);
          transform: translateZ(0);
          font-size: clamp(14px, 3.2vw, 18px);
        }

        /* Animated gradient brand text (kept visible on mobile) */
        .eh-brand-text {
          font-weight: 800; letter-spacing: .2px;
          font-size: var(--eh-brand);
          background: linear-gradient(90deg, #bfdbfe, #7dd3fc, #bfdbfe);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
          animation: ehShift 7s ease-in-out infinite;
          text-shadow: 0 0 .01px rgba(0,0,0,0.01);
          white-space: nowrap;
          max-width: 100%;
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

        /* Dashboard pill button (chip) */
        .eh-chip {
          --bg: linear-gradient(135deg, var(--c1), var(--c2));
          --bg2: linear-gradient(135deg, var(--c2), var(--c1));
          border-radius: 999px;
          padding-inline: clamp(.8rem, 2.6vw, 1.1rem);
          padding-block: .35rem;
          font-weight: 600;
          font-size: var(--eh-text);
          color: #fff !important;
          border: none;
          background: var(--bg);
          box-shadow: 0 6px 18px color-mix(in oklab, var(--c1) 35%, transparent);
          transition: transform .15s ease, box-shadow .22s ease, filter .22s ease, background .22s ease;
          position: relative;
          overflow: hidden; isolation: isolate;
          display:inline-flex; align-items:center;
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

        /* Keep everything visible on small screens (no collapse/hide) */
        @media (max-width: 575.98px){
          .navbar { padding-top: .25rem; padding-bottom: .25rem; }
          .eh-brand-text { letter-spacing: .1px; }
          .eh-container { gap: 10px; }
          .eh-chip .dot { margin-right: .4rem; }
        }
      `}</style>
    </>
  );
}

export default Navbar;
