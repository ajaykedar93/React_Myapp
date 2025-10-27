// DocumentTab.jsx
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Document from "./Document";
import ManageDocuments from "./ManageDocuments";
import DocAccess from "./DocAccess";
import DocCategory from "./DocCategory";
import AdminImpDocument from "./AdminImp_document";

const tabs = [
  { key: "AddDocument", label: "➕ Add Document" },
  { key: "ManageDocuments", label: "📂 Manage Documents" },
  { key: "AccessDocuments", label: "🔍 Access Documents" },
  { key: "DocCategory", label: "🏷️ Document Categories" },
  { key: "ImpDocument", label: "⭐ Imp Document" },
];

const DocumentTab = () => {
  const [activeTab, setActiveTab] = useState("ImpDocument");
  const [ink, setInk] = useState({ left: 10, width: 40, top: 36, ready: false });
  const railRef = useRef(null);
  const navigate = useNavigate();

  const measureInk = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const btn = rail.querySelector(`[data-tab="${activeTab}"]`);
    if (!btn) return;

    const left = btn.offsetLeft + 10;
    const width = btn.offsetWidth - 20;
    const top = btn.offsetTop + btn.offsetHeight - 4;
    setInk({ left, width: Math.max(24, width), top, ready: true });

    btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  useLayoutEffect(() => { measureInk(); }, [measureInk]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const ro = new ResizeObserver(() => measureInk());
    ro.observe(rail);

    const onResize = () => measureInk();
    window.addEventListener("resize", onResize);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => measureInk()).catch(() => {});
    }

    const raf = requestAnimationFrame(() => measureInk());

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [measureInk]);

  const onKeyDownTabs = (e) => {
    const idx = tabs.findIndex((t) => t.key === activeTab);
    if (e.key === "ArrowRight") setActiveTab(tabs[(idx + 1) % tabs.length].key);
    if (e.key === "ArrowLeft") setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].key);
  };

  return (
    <div className="doc-page">
      {/* FIXED NAVBAR — same size/structure as other pages */}
      <nav className="navbar-fixed">
        <motion.h2
          className="navbar-title"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          Document Manager
        </motion.h2>

        <motion.button
          className="btn-dashboard"
          whileHover={{ y: -1, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          Dashboard
          <span className="btn-glint" />
        </motion.button>
      </nav>

      {/* Spacer that exactly matches the navbar height */}
      <div className="nav-spacer" />

      {/* Tabs */}
      <div className="tabs-container" onKeyDown={onKeyDownTabs}>
        <div
          className="tabs-rail"
          ref={railRef}
          role="tablist"
          aria-label="Document sections"
        >
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                data-tab={t.key}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${t.key}`}
                id={`tab-${t.key}`}
                tabIndex={active ? 0 : -1}
                className={`tab-item ${active ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
                type="button"
              >
                <span className="tab-ripple" />
                <span className="tab-label">{t.label}</span>
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="tab-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}

          {/* Animated underline positioned via left/width/top */}
          <AnimatePresence>
            {ink.ready && (
              <motion.span
                key={activeTab}
                className="tab-ink"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  left: ink.left,
                  width: ink.width,
                  top: ink.top,
                }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        id={`panel-${activeTab}`}
        className="tab-content"
        key={activeTab}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {activeTab === "AddDocument" && <Document />}
        {activeTab === "ManageDocuments" && <ManageDocuments />}
        {activeTab === "AccessDocuments" && <DocAccess />}
        {activeTab === "DocCategory" && <DocCategory />}
        {activeTab === "ImpDocument" && <AdminImpDocument />}
      </motion.div>

      <style>{`
        :root{
          --nav-h: 64px; /* same height as other pages */
          --bg-grad: linear-gradient(135deg, #f6f8fc 0%, #e9eff7 100%);
          --nav-grad: linear-gradient(90deg, #fde68a 0%, #facc15 55%, #f59e0b 100%); /* yellow */
          --nav-overlay: rgba(0,0,0,.04);
          --ink-900:#0f172a; --ink-700:#334155;
          --surface:#ffffff; --border:#e6e9ef;
          --gold:#f6c15a; --gold-press:#e3a83e;
          --tab-ink:#f59e0b;
          --tab-pill:#f7f8ff;
        }
        @media (max-width: 575.98px){ :root{ --nav-h: 58px; } }
        @media (min-width: 1400px){ :root{ --nav-h: 66px; } }

        .doc-page {
          background: var(--bg-grad);
          min-height: 100dvh;
          font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          overflow: hidden;
        }

        /* NAVBAR — exact same sizing behavior */
        .navbar-fixed {
          position: fixed; top: env(safe-area-inset-top, 0px); left: 0; right: 0;
          height: var(--nav-h); z-index: 1000;
          background: var(--nav-grad);
          color: #111827; /* darker text to contrast yellow */
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 28px;
          border-bottom: 1px solid rgba(0,0,0,.08);
          box-shadow: 0 12px 30px rgba(0,0,0,.12), inset 0 -1px 0 rgba(255,255,255,.22);
          backdrop-filter: saturate(140%) blur(6px);
        }
        .nav-spacer { height: calc(var(--nav-h) + env(safe-area-inset-top, 0px)); }

        .navbar-title {
          margin: 0;
          font-size: clamp(20px, 2.4vw, 28px);
          font-weight: 900; letter-spacing: .3px;
          color: #0b0b0b; /* bold black heading */
          text-shadow: none;
        }
        .btn-dashboard {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, var(--gold), #f0b33c);
          color: #1b1b1b;
          font-weight: 800;
          padding: 10px 18px;
          border-radius: 26px;
          border: none; cursor: pointer; font-size: 0.95rem;
          transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
          box-shadow: 0 8px 18px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.45);
        }
        .btn-dashboard:hover { transform: translateY(-1px); filter: brightness(.98); }
        .btn-dashboard:active {
          transform: translateY(0);
          background: linear-gradient(180deg, var(--gold-press), #d89425);
          box-shadow: 0 6px 14px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.35);
        }
        .btn-dashboard:focus-visible{
          outline: 0;
          box-shadow:
            0 0 0 3px rgba(255,255,255,.7),
            0 0 0 6px rgba(31,95,120,.45),
            0 10px 22px rgba(0,0,0,.18);
        }
        .btn-glint{
          position:absolute; top:-150%; left:-50%; width:50%; height:400%;
          background: linear-gradient(120deg, transparent 45%, rgba(255,255,255,.25) 50%, transparent 55%);
          transform: rotate(18deg);
          animation: glint 2.6s linear infinite;
        }
        @keyframes glint {
          0% { transform: translateX(-120%) rotate(18deg); }
          100% { transform: translateX(420%) rotate(18deg); }
        }

        /* Tabs */
        .tabs-container {
          width: min(1200px, 92%);
          margin: 6px auto 14px; /* small, consistent gap under navbar */
        }
        .tabs-rail{
          position: relative;
          display: flex; gap: 8px; flex-wrap: wrap;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 6px;
          box-shadow: 0 10px 28px rgba(2,6,23,.06);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }
        .tabs-rail::-webkit-scrollbar{ height: 8px; }
        .tabs-rail::-webkit-scrollbar-thumb{ background: #d6d9e2; border-radius: 8px; }

        .tab-item{
          position: relative;
          background: transparent;
          border: none;
          border-radius: 12px;
          padding: 12px 18px;
          cursor: pointer;
          color: var(--ink-700);
          font-weight: 800;
          font-size: .98rem;
          transition: background .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease;
          outline: none;
          overflow: hidden;
          white-space: nowrap;
        }
        .tab-item .tab-ripple{
          position:absolute; top:50%; left:50%; width:0; height:0; border-radius:999px;
          background: radial-gradient(circle at center, rgba(252,211,77,.30) 0%, rgba(252,211,77,0) 70%);
          transform: translate(-50%,-50%);
          opacity:0; pointer-events:none;
        }
        .tab-item:hover{
          background: #fff9eb; color: var(--ink-900); transform: translateY(-1px);
          box-shadow: 0 2px 10px rgba(245,158,11,.10);
        }
        .tab-item:active .tab-ripple{ animation: ripple .55s ease-out; }
        @keyframes ripple {
          0% { width: 0; height: 0; opacity:.65; }
          100% { width: 280px; height: 280px; opacity:0; }
        }
        .tab-item.active{ color: var(--ink-900); }
        .tab-item:focus-visible{ box-shadow: 0 0 0 3px rgba(245,158,11,.28); }
        .tab-label{ position: relative; z-index: 2; }

        .tab-pill{
          position: absolute;
          inset: 2px;
          background: var(--tab-pill);
          border-radius: 10px;
          z-index: 1;
          box-shadow: inset 0 0 0 1px #fff3c4, 0 6px 16px rgba(245,158,11,.10);
        }
        .tab-ink{
          position: absolute;
          height: 3px; border-radius: 3px;
          background: var(--tab-ink);
          box-shadow: 0 6px 16px rgba(245,158,11,.45);
          pointer-events:none;
        }

        .tab-content {
          width: min(1200px, 92%);
          min-height: 520px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 12px 34px rgba(2,6,23,.06);
          position: relative;
          isolation: isolate;
          margin: 0 auto 12px;
        }
        .tab-content::before{
          content:""; position:absolute; inset:0; border-radius:18px; pointer-events:none;
          background: radial-gradient(1200px 1200px at 0% 0%, rgba(245,158,11,.08), transparent 60%);
          z-index:-1;
        }

        @media (max-width: 768px) {
          .navbar-title { font-size: 1.35rem; }
          .btn-dashboard { padding: 9px 16px; font-size: 0.9rem; }
          .tab-item{ padding: 10px 14px; font-size: .95rem; }
          .tab-content{ padding: 12px; }
        }
        @media (prefers-reduced-motion: reduce){
          .tab-item, .btn-dashboard{ transition: none !important; }
          .btn-glint{ display:none; }
        }
      `}</style>
    </div>
  );
};

export default DocumentTab;
