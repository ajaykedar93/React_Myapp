// src/Pages/Transactions/TransactionDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import DailyTransactionPage from "./DailyTransactionPage.jsx";
import MainTransactionPage from "./MainTransactionPage.jsx";
import MonthlySummary from "./MonthlySummary.jsx";
import CalculateTotal from "./CalculateTotal.jsx";
import TransactionCategory from "./TransactionCategory.jsx";
import TransactionCategorywise from "./TransactionCategorywise.jsx";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Loan from "./Loan.jsx";
import GetLoan from "./GetLoan.jsx";
import {
  FaCalendarAlt,
  FaRegFileAlt,
  FaChartBar,
  FaCalculator,
  FaTags,
  FaLayerGroup,
  FaMoneyBillWave,
  FaClipboardList,
} from "react-icons/fa";

export default function TransactionDashboard() {
  const [activeTab, setActiveTab] = useState("daily");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { key: "daily", label: "Daily Transactions", icon: <FaCalendarAlt /> },
      { key: "main", label: "Main Transactions", icon: <FaRegFileAlt /> },
      { key: "monthly", label: "Monthly Report", icon: <FaChartBar /> },
      { key: "total", label: "Calculate Total", icon: <FaCalculator /> },
      { key: "category", label: "Transaction Category", icon: <FaTags /> },
      { key: "categorywise", label: "Transaction Categorywise", icon: <FaLayerGroup /> },
      { key: "loan", label: "Loan", icon: <FaMoneyBillWave /> },
      { key: "getloan", label: "Get Loan", icon: <FaClipboardList /> },
    ],
    []
  );

  const tabColors = {
    daily: "#2b7a8b",
    main: "#fe67c9",
    monthly: "#f88a4b",
    total: "#0f8a5f",
    category: "#ecda1c",
    categorywise: "#e4650b",
    loan: "#e85a19",
    getloan: "#16a34a",
  };

  const listRef = useRef(null);

  // keyboard navigation
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handler = (e) => {
      const items = Array.from(el.querySelectorAll('[role="tab"]'));
      const idx = items.findIndex((n) => n.getAttribute("data-key") === activeTab);
      if (idx < 0) return;
      let nextIdx = idx;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % items.length;
      if (e.key === "ArrowLeft") nextIdx = (idx - 1 + items.length) % items.length;
      if (e.key === "Home") nextIdx = 0;
      if (e.key === "End") nextIdx = items.length - 1;
      if (nextIdx !== idx) {
        e.preventDefault();
        setActiveTab(items[nextIdx].getAttribute("data-key"));
        items[nextIdx]?.focus();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [activeTab]);

  // underline/ink position
  const [underlineStyle, setUnderlineStyle] = useState({});
  const recalcUnderline = () => {
    const container = listRef.current;
    const current = container?.querySelector(`[data-key="${activeTab}"]`);
    if (!current || !container) return;
    const cRect = container.getBoundingClientRect();
    const r = current.getBoundingClientRect();
    setUnderlineStyle({
      width: `${r.width}px`,
      transform: `translateX(${r.left - cRect.left + container.scrollLeft}px)`,
    });
  };
  useEffect(() => {
    recalcUnderline();
    const el = listRef.current;
    const ro = new ResizeObserver(recalcUnderline);
    if (el) {
      ro.observe(el);
      el.addEventListener("scroll", recalcUnderline, { passive: true });
    }
    window.addEventListener("resize", recalcUnderline);
    return () => {
      ro.disconnect();
      if (el) el.removeEventListener("scroll", recalcUnderline);
      window.removeEventListener("resize", recalcUnderline);
    };
  }, [activeTab]);

  return (
    <>
      <style>{`
        :root{
          --nav-h: 64px;
          --tabs-h: 54px;            /* mobile tabs bar height */
          --nav-offset: 0px;         /* extra gap above navbar (0 desktop, >0 mobile) */
          --bg: #f6f8fb;
          --surface: #ffffff;
          --ink-900: #0f172a;
          --ink-700: #334155;
          --ink-600: #475569;
          --border: #e6e9ef;
          --accent-grad: linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%);
          --overlay: rgba(255,255,255,.75);
        }
        .td-app { height: 100dvh; overflow: hidden; background: var(--bg); }

        /* NAVBAR (fixed) */
        .td-nav {
          position: fixed;
          top: var(--nav-offset);
          left: 0; right: 0;
          height: var(--nav-h);
          z-index: 100;
          background: var(--accent-grad);
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 30px rgba(2,6,23,0.18), inset 0 -1px 0 rgba(255,255,255,0.06);
          backdrop-filter: saturate(140%) blur(4px);
          display:flex; align-items:center;
          padding-top: calc(10px + env(safe-area-inset-top, 0px));
          border-radius: 0; /* desktop default - flush to top */
        }
        .td-title { margin:0; color:#0b0b0b; font-weight:900; letter-spacing:.2px; font-size: clamp(1.05rem, 2.3vw, 1.5rem); text-shadow:none; }
        .td-nav-btn { font-weight:700; border-radius:999px; font-size: clamp(.68rem, 1.8vw, .8rem); padding: .35rem .9rem; }

        /* NAV spacer accounts for safe area + offset so content starts below navbar */
        .td-nav-spacer {
          height: calc(var(--nav-h) + var(--nav-offset) + env(safe-area-inset-top, 0px));
        }

        /* TABS container (default desktop: in-flow) */
        .td-tabs {
          background: var(--surface);
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(2,6,23,.06);
          border: 1px solid var(--border);
          padding: 8px;
          margin: 6px 0;
          max-width: 100%;
        }
        .td-tablist { position: relative; display:flex; flex-wrap:nowrap; gap:10px; overflow-x:auto; overflow-y:hidden; white-space:nowrap; scrollbar-width:thin; -webkit-overflow-scrolling:touch; padding: 6px 6px; scroll-snap-type: x proximity; scroll-padding-left: 8px; scroll-padding-right: 8px; z-index: 0; }
        .td-tablist::-webkit-scrollbar { height: 6px; }
        .td-tablist::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
        .td-inkbar { position:absolute; height:38px; border-radius:12px; top: 50%; transform: translateY(-50%); left:0; transition: transform .25s ease, width .25s ease, background .25s ease; z-index: 0; pointer-events: none; }
        .td-tab { position: relative; display:inline-flex; align-items:center; justify-content:center; min-width: 140px; padding: 10px 14px; font-size: clamp(.78rem, 1.9vw, .95rem); border-radius:12px; font-weight:700; background:#fff; color: var(--ink-700); border: 1px solid var(--border); transition: background .18s ease, color .18s ease, transform .15s ease, box-shadow .15s ease, border-color .18s ease; scroll-snap-align:center; z-index: 1; pointer-events: auto; touch-action: manipulation; white-space: nowrap; }
        .td-tab:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(2,6,23,.06); }
        .td-tab[aria-selected="true"] { color:#fff; background: var(--chip-active); border-color: transparent; }

        /* MAIN scroll area: ONLY the card/content scrolls behind fixed bars */
        .td-main {
          height: calc(100dvh - var(--nav-h) - var(--nav-offset) - env(safe-area-inset-top, 0px));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-top: 6px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .td-card { max-width: 1100px; margin: 8px auto 16px; background: var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:0 10px 36px rgba(2,6,23,.07); position:relative; min-height:460px; padding:16px; }
        .td-overlay { position:absolute; inset:0; background: var(--overlay); display:flex; align-items:center; justify-content:center; z-index:10; border-radius:16px; }

        /* ---------- MOBILE-ONLY TWEAKS ---------- */
        @media (max-width: 576px){
          /* show a small space above navbar */
          :root { --nav-offset: 8px; } /* gap above navbar on mobile */

          .td-nav {
            left: 8px; right: 8px;        /* inset for nice breathing room */
            border-radius: 14px;          /* rounded navbar on mobile */
          }

          /* Make tabs FIXED under the navbar (with a tiny gap) */
          .td-tabs {
            position: fixed;
            top: calc(var(--nav-offset) + var(--nav-h) + 8px);
            left: 8px; right: 8px;
            margin: 0;
            z-index: 95;
          }

          /* Spacer so content starts below the fixed tabs */
          .td-tabs-spacer {
            height: calc(var(--tabs-h) + 12px); /* matches tabs height + small gap */
          }

          /* Adjust main height to account for fixed tabs */
          .td-main {
            height: calc(100dvh - var(--nav-h) - var(--nav-offset) - var(--tabs-h) - 12px - env(safe-area-inset-top, 0px));
            padding-top: 6px;
          }

          .td-tablist { padding: 4px; gap: 6px; }
          .td-tab { min-width: 118px; padding: 8px 10px; font-size: .72rem; gap: 4px; }
          .td-inkbar { height: 34px; }
          .td-card { margin: 6px auto 12px; padding: 12px; border-radius: 14px; }
        }
      `}</style>

      <div className="td-app">
        <nav className="td-nav">
          <div className="container-fluid d-flex justify-content-between align-items-center px-0">
            <h1 className="td-title">Transaction Dashboard</h1>
            <button className="btn btn-warning td-nav-btn" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
          </div>
        </nav>

        {/* Spacer for fixed navbar */}
        <div className="td-nav-spacer" />

        <main className="td-main">
          <div className="container-fluid px-2 px-sm-3">

            {/* Fixed tabs on mobile, normal on desktop */}
            <div className="td-tabs">
              <div ref={listRef} role="tablist" aria-label="Transaction tabs" className="td-tablist">
                <div
                  className="td-inkbar"
                  style={{ ...underlineStyle, background: tabColors[activeTab] || "#444" }}
                />
                {tabs.map((tab) => {
                  const selected = activeTab === tab.key;
                  const color = tabColors[tab.key];
                  return (
                    <button
                      key={tab.key}
                      id={`tab-${tab.key}`}
                      role="tab"
                      data-key={tab.key}
                      aria-selected={selected}
                      aria-controls={`panel-${tab.key}`}
                      className="td-tab"
                      style={{ ["--chip-active"]: color }}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span aria-hidden style={{ marginRight: 6, display: "inline-flex", fontSize: "1rem" }}>
                        {tab.icon}
                      </span>
                      <span className="text-truncate" style={{ maxWidth: 260 }}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* This spacer takes effect only on mobile via CSS */}
            <div className="td-tabs-spacer" />

            <div className="td-card bg-white rounded">
              {loading && (
                <div className="td-overlay">
                  <LoadingSpiner />
                </div>
              )}

              <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                {activeTab === "daily" && <DailyTransactionPage setLoading={setLoading} />}
                {activeTab === "main" && <MainTransactionPage setLoading={setLoading} />}
                {activeTab === "monthly" && <MonthlySummary setLoading={setLoading} />}
                {activeTab === "total" && <CalculateTotal setLoading={setLoading} />}
                {activeTab === "category" && <TransactionCategory setLoading={setLoading} />}
                {activeTab === "categorywise" && <TransactionCategorywise setLoading={setLoading} />}
                {activeTab === "loan" && <Loan />}
                {activeTab === "getloan" && <GetLoan />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
