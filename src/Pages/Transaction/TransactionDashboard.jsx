import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  // Tabs configuration with icons
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

  // Keyboard navigation for tabs
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
        setActiveTab(tabs[nextIdx].key);
        items[nextIdx]?.focus();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [activeTab, tabs]);

  // Compute underline position for active tab
  const [underlineStyle, setUnderlineStyle] = useState({});
  useEffect(() => {
    const current = document.querySelector(`[data-key="${activeTab}"]`);
    const container = listRef.current;
    if (current && container) {
      const cRect = container.getBoundingClientRect();
      const r = current.getBoundingClientRect();
      setUnderlineStyle({
        width: `${r.width}px`,
        transform: `translateX(${r.left - cRect.left}px)`,
      });
    }
  }, [activeTab, tabs]);

  return (
    <>
      <style>{`
        :root{
          --bg: #f6f8fb;
          --surface: #ffffff;
          --ink-900: #0f172a;
          --ink-700: #334155;
          --ink-600: #475569;
          --ink-500: #64748b;
          --border: #e6e9ef;
          --accent-grad: linear-gradient(90deg, #5f4bb6 0%, #1f5f78 100%);
          --btn-gold: #f6c15a;
          --btn-gold-dark: #e39d24;
          --overlay: rgba(255,255,255,.75);
        }

        .td-wrap { background: var(--bg); min-height: 100dvh; }

        .td-nav {
          background: var(--accent-grad);
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 30px rgba(2, 6, 23, 0.18), inset 0 -1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: saturate(140%) blur(4px);
        }

        .td-title { margin:0; color:#fff; font-weight:800; font-size:clamp(18px,2.4vw,24px); }

        .td-tabs {
          background: var(--surface);
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(2,6,23,.06);
          border: 1px solid var(--border);
          padding: 8px;
          margin: 16px 0 12px;
          max-width: 100%; /* Full width */
        }

        .td-tablist { display:flex; gap:6px; position:relative; overflow-x:auto; scrollbar-width:none; }

        .td-tab { 
          white-space: nowrap;
          border:none;
          background:transparent;
          padding:10px 14px;
          border-radius:10px;
          font-weight:700;
          color: var(--ink-600);
          transition: background .2s ease, color .2s ease, transform .15s ease;
          z-index:1; /* Keep above inkbar */
        }

        .td-tab[aria-selected="true"] { color:#fff; transform: translateY(-1px); }

        .td-inkbar {
          position:absolute;
          height:36px;
          border-radius:10px;
          top:4px;
          left:0;
          transition: transform .25s ease, width .25s ease, background .25s ease;
          z-index:0;
        }

        .td-card {
          max-width: 1100px;
          margin:0 auto;
          background: var(--surface);
          border:1px solid var(--border);
          border-radius:16px;
          box-shadow:0 10px 36px rgba(2,6,23,.07);
          position:relative;
          min-height:460px;
          padding:16px;
        }

        .td-overlay {
          position:absolute;
          inset:0;
          background: var(--overlay);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:10;
          border-radius:16px;
        }

        .td-btn {
          background: linear-gradient(180deg, #f6c15a, #f0b33c);
          color:#1b1b1b;
          font-weight:700;
          border:none;
          border-radius:26px;
          padding:9px 18px;
          box-shadow: 0 8px 18px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4);
          transition: transform 150ms ease, filter 150ms ease, box-shadow 150ms ease, background 150ms ease;
        }

        .td-btn:hover {
          background: linear-gradient(180deg, #f0b33c, #f6c15a);
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow:0 10px 22px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5);
        }

        .td-btn:active {
          transform: translateY(0);
          filter: brightness(0.95);
          background: linear-gradient(180deg, #e3a83e, #d89425);
          box-shadow:0 6px 14px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.35);
        }

        .td-btn:focus-visible {
          outline:0;
          box-shadow:0 0 0 3px rgba(255,255,255,0.7), 0 0 0 6px rgba(31,95,120,0.45), 0 10px 22px rgba(0,0,0,0.18);
        }
      `}</style>

      <div className="td-wrap container-fluid px-0">
        <nav className="td-nav">
          <div className="container-fluid d-flex justify-content-between align-items-center">
            <h1 className="td-title">Transaction Dashboard</h1>
            <button className="td-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          </div>
        </nav>

        <div className="td-tabs">
          <div ref={listRef} role="tablist" className="td-tablist">
            <div className="td-inkbar" style={{ ...underlineStyle, background: tabColors[activeTab] || "#444" }} />
            <div className="td-tabwrap" style={{ display:"flex", gap:"6px" }}>
              {tabs.map((tab) => {
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    data-key={tab.key}
                    aria-selected={selected}
                    className="td-tab"
                    style={{
                      color: selected ? "#fff" : tabColors[tab.key],
                      background: selected ? tabColors[tab.key] : "transparent",
                    }}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span aria-hidden style={{ marginRight: 6 }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
    </>
  );
}
