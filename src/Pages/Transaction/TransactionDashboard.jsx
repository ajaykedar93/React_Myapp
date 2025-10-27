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
import { FaCalendarAlt, FaRegFileAlt, FaChartBar, FaCalculator, FaTags ,FaLayerGroup  } from "react-icons/fa";

export default function TransactionDashboard() {
  const [activeTab, setActiveTab] = useState("daily");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const tabs = useMemo(() => ([
    { key: "daily", label: "Daily Transactions", icon: <FaCalendarAlt /> },
    { key: "main", label: "Main Transactions", icon: <FaRegFileAlt /> },
    { key: "monthly", label: "Monthly Report", icon: <FaChartBar /> },
    { key: "total", label: "Calculate Total", icon: <FaCalculator /> },
    { key: "category", label: "Transaction Category", icon: <FaTags /> },
    { key: "categorywise", label: "Transaction Categorywise", icon: <FaLayerGroup /> },
  ]), []);

  const tabColors = {
    daily: "#2b7a8b",
    main: "#fe67c9ff",
    monthly: "#f88a4bff",
    total: "#0f8a5f",
    category: "#ecda1cff",
    categorywise: "#e4650bff",
  };

  const listRef = useRef(null);

  // keyboard nav
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

  // underline position (includes horizontal scroll)
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
          --nav-h: 68px;
          --bg: #f6f8fb;
          --surface: #ffffff;
          --ink-900: #0f172a;
          --ink-700: #334155;
          --ink-600: #475569;
          --border: #e6e9ef;
          --accent-grad: linear-gradient(90deg, #5f4bb6 0%, #1f5f78 100%);
          --overlay: rgba(255,255,255,.75);
        }

        .td-app { height: 100dvh; overflow: hidden; background: var(--bg); }

        /* FIXED NAVBAR */
        .td-nav {
          position: fixed; top: 0; left: 0; right: 0;
          height: var(--nav-h); z-index: 50;
          background: var(--accent-grad);
          padding: 10px 14px; /* a bit tighter */
          border-bottom: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 30px rgba(2,6,23,0.18), inset 0 -1px 0 rgba(255,255,255,0.06);
          backdrop-filter: saturate(140%) blur(4px);
          display:flex; align-items:center;
        }
        .td-title { margin:0; color:#fff; font-weight:800; font-size:clamp(18px,2.4vw,24px); }

        /* Spacer equals navbar height only (no extra gap) */
        .td-nav-spacer { height: var(--nav-h); }

        /* Main area scrolls. Add *tiny* top padding to keep tabs from touching. */
        .td-main {
          height: calc(100dvh - var(--nav-h));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-top: 4px; /* SMALL space under navbar */
        }

        .td-tabs {
          background: var(--surface);
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(2,6,23,.06);
          border: 1px solid var(--border);
          padding: 8px;
          margin: 6px 0 6px; /* reduced (desktop) */
          max-width: 100%;
        }

        /* Single-row horizontal strip */
        .td-tablist {
          display:flex; flex-wrap:nowrap; gap:10px; position:relative;
          overflow-x:auto; overflow-y:hidden; white-space:nowrap;
          scrollbar-width:thin; -webkit-overflow-scrolling:touch;
          padding: 4px 4px; /* tighter */
          scroll-snap-type: x proximity;
        }
        .td-tablist::-webkit-scrollbar { height: 6px; }
        .td-tablist::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }

        .td-tab {
          display:inline-flex; align-items:center; justify-content:center;
          min-width: 150px; padding: 10px 14px;
          font-size: 0.975rem; border:none; border-radius:12px; font-weight:700;
          background:transparent; color: var(--ink-600);
          transition: background .2s ease, color .2s ease, transform .15s ease, box-shadow .15s ease;
          scroll-snap-align:center;
        }
        @media (min-width: 576px){
          .td-tab { min-width: 140px; font-size: .95rem; padding: 10px 14px; }
        }
        .td-tab:focus-visible {
          outline: 0;
          box-shadow: 0 0 0 .25rem rgba(13,110,253,.25), 0 10px 20px rgba(2,6,23,.08);
        }
        .td-tab[aria-selected="true"] { color:#fff; transform: translateY(-1px); }

        .td-inkbar {
          position:absolute; height:38px; border-radius:12px;
          top: 50%; transform: translateY(-50%); left:0;
          transition: transform .25s ease, width .25s ease, background .25s ease;
          z-index:0;
        }

        .td-card {
          max-width: 1100px;
          margin: 6px auto 16px; /* keep small gap below tabs */
          background: var(--surface);
          border:1px solid var(--border);
          border-radius:16px;
          box-shadow:0 10px 36px rgba(2,6,23,.07);
          position:relative;
          min-height:460px;
          padding:16px;
        }
        @media (max-width: 576px){
          /* Even tighter on mobile */
          .td-main { padding-top: 2px; }
          .td-tabs { margin: 4px 0 4px; padding: 6px; }
          .td-tablist { padding: 2px 2px; gap: 8px; }
          .td-tab { min-width: 128px; padding: 8px 12px; font-size: .92rem; }
          .td-inkbar { height: 34px; }
          .td-card { margin: 4px auto 12px; padding: 12px; border-radius: 14px; }
        }

        .td-overlay {
          position:absolute; inset:0; background: var(--overlay);
          display:flex; align-items:center; justify-content:center;
          z-index:10; border-radius:16px;
        }
      `}</style>

      <div className="td-app">
        {/* FIXED Navbar */}
        <nav className="td-nav">
          <div className="container-fluid d-flex justify-content-between align-items-center px-0">
            <h1 className="td-title">Transaction Dashboard</h1>
            <button
              className="btn btn-warning fw-bold rounded-pill px-3 py-2"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </nav>

        {/* Spacer to offset fixed navbar */}
        <div className="td-nav-spacer" />

        {/* ONLY this area scrolls */}
        <main className="td-main">
          <div className="container-fluid px-2 px-sm-3">
            {/* Tabs */}
            <div className="td-tabs">
              <div
                ref={listRef}
                role="tablist"
                aria-label="Transaction tabs"
                className="td-tablist"
              >
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
                      style={{
                        color: selected ? "#fff" : color,
                        background: selected ? color : "transparent",
                      }}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span aria-hidden style={{ marginRight: 8, display: "inline-flex" }}>
                        {tab.icon}
                      </span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content card */}
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
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
