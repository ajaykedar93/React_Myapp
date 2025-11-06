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

          {/* Dashboard button */}
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

      {/* Spacer to offset fixed navbar height (now includes top gap + bottom line) */}
      <div className="eh-nav-spacer" aria-hidden="true" />

      <style>{`
        :root {
          --eh-nav-h: 72px;                         /* visual navbar height */
          --eh-gap: clamp(6px, 1.4vw, 10px);
          --eh-text: clamp(14px, 2.2vw, 16px);
          --eh-brand: clamp(16px, 3vw, 20px);
          --eh-safe-top: env(safe-area-inset-top, 0px);

          /* NEW: top gap above the navbar (mobile gets 10px) */
          --eh-top-gap: 0px;

          /* small accent line height at bottom of navbar (::after) */
          --eh-bottom-line: 3px;
        }
      @media (max-width: 575.98px) {
  :root { --eh-nav-h: 56px; --eh-top-gap: 0px; }
}

        /* ===== Fixed Navbar Layout ===== */
        .eh-fixed {
          position: fixed !important;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 1100;

          /* Respect safe area + configurable top gap */
          top: calc(var(--eh-safe-top) + var(--eh-top-gap));
        }

        /* Spacer equals nav height + top gap + the small bottom line */
        .eh-nav-spacer {
          height: calc(var(--eh-nav-h) + var(--eh-top-gap) + var(--eh-bottom-line));
        }

        .eh-container {
          display: flex;
          align-items: center;
          gap: var(--eh-gap);
          min-height: var(--eh-nav-h);
        }

        /* ===== Blue Guardian Theme ===== */
        .eh-nav {
          --c1: #1d4ed8;
          --c2: #38bdf8;
          --c3: #60a5fa;
          --glass: rgba(10,14,24,.82);
          --light: rgba(255,255,255,.07);
          --ring: rgba(56,189,248,.38);
          --shadow: 0 10px 28px rgba(2,6,23,.45);

          position: relative; /* keep ::after anchored to navbar */
          background:
            linear-gradient(180deg, var(--glass), rgba(10,14,24,.72)),
            radial-gradient(1000px 260px at 10% -40%, color-mix(in oklab, var(--c1) 44%, transparent), transparent 70%),
            radial-gradient(1000px 260px at 90% -40%, color-mix(in oklab, var(--c2) 48%, transparent), transparent 70%);
          backdrop-filter: saturate(140%) blur(7px);
          -webkit-backdrop-filter: saturate(140%) blur(7px);
          border-bottom: 1px solid var(--light);
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
        }

        .eh-nav::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: var(--eh-bottom-line);
          background: linear-gradient(90deg, var(--c1), var(--c2));
          opacity: 0.5;
          filter: blur(0.6px);
        }

        .eh-brand-icon {
          display: inline-grid;
          place-items: center;
          width: clamp(30px, 5vw, 36px);
          height: clamp(30px, 5vw, 36px);
          border-radius: 10px;
          background: radial-gradient(120px 120px at 30% 30%,
            color-mix(in oklab, var(--c1) 52%, transparent),
            color-mix(in oklab, var(--c3) 34%, transparent));
          box-shadow:
            inset 0 0 0 1px var(--light),
            0 10px 22px color-mix(in oklab, var(--c2) 32%, transparent);
          font-size: clamp(14px, 3.2vw, 18px);
        }

        .eh-brand-text {
          font-weight: 800;
          font-size: var(--eh-brand);
          background: linear-gradient(90deg, #bfdbfe, #7dd3fc, #bfdbfe);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: ehShift 7s ease-in-out infinite;
          white-space: nowrap;
        }
        @keyframes ehShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .eh-brand {
          transition: transform 0.14s ease, filter 0.25s ease;
        }
        .eh-brand:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 12px 30px color-mix(in oklab, var(--c1) 26%, transparent));
        }

        .eh-chip {
          --bg: linear-gradient(135deg, var(--c1), var(--c2));
          --bg2: linear-gradient(135deg, var(--c2), var(--c1));
          border-radius: 999px;
          padding-inline: clamp(0.8rem, 2.6vw, 1.1rem);
          padding-block: 0.35rem;
          font-weight: 600;
          font-size: var(--eh-text);
          color: #fff !important;
          background: var(--bg);
          border: none;
          box-shadow: 0 6px 18px color-mix(in oklab, var(--c1) 35%, transparent);
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
        }
        .eh-chip .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          opacity: 0.9;
          margin-right: 0.5rem;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.14);
        }
        .eh-chip:hover {
          transform: translateY(-2px);
          background: var(--bg2);
          filter: brightness(1.03);
        }
        .eh-chip.is-active {
          filter: brightness(1.05);
          box-shadow: 0 10px 26px color-mix(in oklab, var(--c1) 36%, transparent);
        }

        @media (max-width: 575.98px) {
          .navbar { padding-top: 0.3rem; padding-bottom: 0.3rem; }
          .eh-container { gap: 10px; }
          .eh-chip .dot { margin-right: 0.4rem; }
        }
      `}</style>
    </>
  );
}

export default Navbar;
