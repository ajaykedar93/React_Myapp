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
import {
  FaCalendarAlt,
  FaRegFileAlt,
  FaChartBar,
  FaCalculator,
  FaTags,
  FaLayerGroup,
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
      {
        key: "categorywise",
        label: "Categorywise Summary",
        icon: <FaLayerGroup />,
      },
    ],
    []
  );

  const tabColors = {
    daily: "#22c55e",
    main: "#6366f1",
    monthly: "#f97316",
    total: "#0ea5e9",
    category: "#eab308",
    categorywise: "#ec4899",
  };

  const listRef = useRef(null);

  // keyboard navigation
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handler = (e) => {
      const items = Array.from(el.querySelectorAll('[role="tab"]'));
      const idx = items.findIndex(
        (n) => n.getAttribute("data-key") === activeTab
      );
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
      transform: `translateX(${
        r.left - cRect.left + container.scrollLeft
      }px) translateY(-50%)`,
    });
  };
  useEffect(() => {
    recalcUnderline();

    const el = listRef.current;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(recalcUnderline)
        : null;

    if (el && ro) {
      ro.observe(el);
      el.addEventListener("scroll", recalcUnderline, { passive: true });
    }
    window.addEventListener("resize", recalcUnderline);

    return () => {
      if (ro) ro.disconnect();
      if (el) el.removeEventListener("scroll", recalcUnderline);
      window.removeEventListener("resize", recalcUnderline);
    };
  }, [activeTab]);

  return (
    <>
      <style>{`
        :root{
          --nav-h: 64px;
          --tabs-h: 56px;
          --nav-offset: 0px;
          --bg: linear-gradient(180deg,#e0f2fe 0%, #f9fafb 45%, #f1f5f9 100%);
          --surface: #ffffff;
          --panel: #ffffff;
          --ink-900: #0f172a;
          --ink-700: #334155;
          --ink-500: #6b7280;
          --border-subtle: #e2e8f0;
          --chip-bg: #f9fafb;
          --chip-border: #e2e8f0;
          --overlay: rgba(248,250,252,0.7);
        }

        .td-app {
          min-height: 100dvh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
          color: var(--ink-900);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        /* NAVBAR (same style, just slightly brighter) */
        .td-nav {
          position: fixed;
          top: calc(var(--nav-offset));
          left: 0;
          right: 0;
          height: var(--nav-h);
          z-index: 100;
          background: linear-gradient(120deg, #1d4ed8, #2563eb);
          padding: 8px 14px;
          border-bottom: 1px solid rgba(148,163,184,0.4);
          box-shadow: 0 18px 40px rgba(15,23,42,0.2);
          backdrop-filter: blur(10px);
          display:flex;
          align-items:center;
          color: #f9fafb;
        }

        .td-nav-inner {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }

        .td-title-wrap {
          display:flex;
          align-items:center;
          gap:10px;
        }

        .td-logo-pill {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: radial-gradient(circle at 30% 20%, #22c55e, #16a34a 40%, #0f766e 100%);
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow: 0 15px 35px rgba(22,163,74,0.6);
          font-size: 1.2rem;
          color:#0b1120;
          background-color:#bbf7d0;
        }

        .td-title {
          margin:0;
          font-weight:800;
          letter-spacing:.03em;
          font-size: clamp(1.05rem, 2.2vw, 1.45rem);
        }

        .td-subtitle {
          font-size: .74rem;
          color: #e5e7eb;
          opacity: 0.9;
        }

        .td-nav-btn {
          font-weight:700;
          border-radius:999px;
          font-size: .78rem;
          padding: .42rem 1.1rem;
          border: 1px solid rgba(251,191,36,0.9);
          background: radial-gradient(circle at top left, #facc15, #ea580c);
          color: #111827;
          box-shadow: 0 12px 30px rgba(251,191,36,0.4);
        }
        .td-nav-btn:active {
          transform: translateY(1px) scale(.98);
        }

        .td-nav-spacer {
          height: calc(var(--nav-h) + var(--nav-offset));
        }

        /* MAIN */
        .td-main {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 16px;
        }

        .td-main-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 10px 12px 18px;
        }

        /* TABS SHELL */
        .td-tabs {
          background: var(--surface);
          border-radius: 18px;
          border: 1px solid var(--border-subtle);
          padding: 8px;
          margin: 6px 0 12px;
          box-shadow:
            0 14px 30px rgba(148,163,184,0.35);
        }

        .td-tabs-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom: 4px;
          padding: 0 4px 4px;
        }

        .td-tabs-title {
          font-size: .78rem;
          text-transform: uppercase;
          letter-spacing: .16em;
          color: var(--ink-500);
        }

        .td-tabs-badge {
          font-size: .72rem;
          padding: 3px 8px;
          border-radius:999px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
        }

        .td-tablist {
          position: relative;
          display:flex;
          flex-wrap:nowrap;
          gap:10px;
          overflow-x:auto;
          overflow-y:hidden;
          white-space:nowrap;
          scrollbar-width:thin;
          -webkit-overflow-scrolling:touch;
          padding: 4px 6px;
          scroll-snap-type: x proximity;
          scroll-padding-left: 8px;
          scroll-padding-right: 8px;
        }
        .td-tablist::-webkit-scrollbar { height: 5px; }
        .td-tablist::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.9);
          border-radius: 999px;
        }

        .td-inkbar {
          position:absolute;
          height: 34px;
          top: 50%;
          left: 0;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 8px 18px rgba(34,197,94,0.7);
          transition: transform .25s ease, width .25s ease, background .25s ease, box-shadow .25s ease;
          z-index: 0;
          pointer-events: none;
        }

        .td-tab {
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width: 150px;
          padding: 9px 14px;
          font-size: .8rem;
          border-radius:999px;
          font-weight:700;
          background: var(--chip-bg);
          color: var(--ink-700);
          border: 1px solid var(--chip-border);
          transition:
            background .18s ease,
            color .18s ease,
            transform .15s ease,
            box-shadow .15s ease,
            border-color .18s ease;
          scroll-snap-align:center;
          z-index: 1;
          pointer-events: auto;
          touch-action: manipulation;
        }
        .td-tab:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(148,163,184,0.4);
          background:#f3f4f6;
        }
        .td-tab[aria-selected="true"] {
          color:#0b1120;
          background: #ffffff;
          border-color: transparent;
        }
        .td-tab-icon {
          display:inline-flex;
          margin-right: 6px;
          font-size: 1rem;
        }
        .td-tab-label {
          max-width: 220px;
        }

        /* CARD */
        .td-card {
          margin-top: 6px;
          background: var(--panel);
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          box-shadow:
            0 18px 40px rgba(148,163,184,0.45);
          min-height: 440px;
          padding: 16px 14px 18px;
          position:relative;
        }

        .td-card-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom: 10px;
          gap: 10px;
          padding: 0 2px 4px;
          border-bottom: 1px solid #e5e7eb;
        }

        .td-card-title {
          font-size: .9rem;
          font-weight: 700;
          color: var(--ink-900);
        }
        .td-card-sub {
          font-size: .72rem;
          color: var(--ink-500);
        }

        .td-card-chip {
          font-size: .72rem;
          padding: 3px 10px;
          border-radius: 999px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
        }

        .td-overlay {
          position:absolute;
          inset:0;
          background: var(--overlay);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:10;
          border-radius:20px;
          backdrop-filter: blur(3px);
        }

        /* MOBILE TUNING */
        @media (max-width: 576px){
          :root {
            --nav-offset: 8px;
          }

          .td-nav {
            padding-inline: 10px;
            border-radius: 0 0 18px 18px;
          }

          .td-nav-inner {
            padding-inline: 2px;
          }

          .td-logo-pill {
            width: 32px;
            height: 32px;
            font-size: 1rem;
          }

          .td-subtitle {
            display:none;
          }

          .td-tabs {
            margin-top: 2px;
            padding: 6px;
            border-radius: 16px;
          }

          .td-tablist {
            padding-inline: 2px;
            gap: 8px;
          }

          .td-tab {
            min-width: 130px;
            padding: 7px 11px;
            font-size: .76rem;
          }

          .td-tab-label {
            max-width: 150px;
          }

          .td-card {
            margin-top: 10px;
            padding: 12px 10px 14px;
            border-radius: 18px;
          }

          .td-main-inner {
            padding-inline: 10px;
          }
        }
      `}</style>

      <div className="td-app">
        <nav className="td-nav">
          <div className="td-nav-inner">
            <div className="td-title-wrap">
              <div className="td-logo-pill" aria-hidden>
                ₹
              </div>
              <div>
                <h1 className="td-title">Transaction Dashboard</h1>
                <div className="td-subtitle">
                  Track daily, monthly & categorywise spending at a glance
                </div>
              </div>
            </div>

            <button
              className="td-nav-btn"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </nav>

        {/* Spacer for fixed navbar */}
        <div className="td-nav-spacer" />

        <main className="td-main">
          <div className="td-main-inner">
            {/* Tabs */}
            <section className="td-tabs">
              <div className="td-tabs-header">
                <div className="td-tabs-title">Views</div>
                <div className="td-tabs-badge">
                  {tabs.find((t) => t.key === activeTab)?.label}
                </div>
              </div>

              <div
                ref={listRef}
                role="tablist"
                aria-label="Transaction views"
                className="td-tablist"
              >
                <div
                  className="td-inkbar"
                  style={{
                    ...underlineStyle,
                    background: tabColors[activeTab] || "#22c55e",
                    boxShadow: `0 8px 18px ${
                      tabColors[activeTab]
                        ? `${tabColors[activeTab]}80`
                        : "rgba(34,197,94,0.7)"
                    }`,
                  }}
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
                      type="button"
                    >
                      <span className="td-tab-icon" aria-hidden>
                        {tab.icon}
                      </span>
                      <span className="td-tab-label text-truncate">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Content Card */}
            <section
              className="td-card"
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              <header className="td-card-header">
                <div>
                  <div className="td-card-title">
                    {tabs.find((t) => t.key === activeTab)?.label}
                  </div>
                  <div className="td-card-sub">
                    {activeTab === "daily" &&
                      "Enter and review today’s transactions quickly."}
                    {activeTab === "main" &&
                      "See your master transaction log with all entries."}
                    {activeTab === "monthly" &&
                      "Visual summary and totals for each month."}
                    {activeTab === "total" &&
                      "Calculate totals across custom filters and periods."}
                    {activeTab === "category" &&
                      "Manage and organize your transaction categories."}
                    {activeTab === "categorywise" &&
                      "Analyze spending grouped by category."}
                  </div>
                </div>
                <div className="td-card-chip">
                  {new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </header>

              {loading && (
                <div className="td-overlay">
                  <LoadingSpiner />
                </div>
              )}

              {/* Actual content */}
              {activeTab === "daily" && (
                <DailyTransactionPage setLoading={setLoading} />
              )}
              {activeTab === "main" && (
                <MainTransactionPage setLoading={setLoading} />
              )}
              {activeTab === "monthly" && (
                <MonthlySummary setLoading={setLoading} />
              )}
              {activeTab === "total" && (
                <CalculateTotal setLoading={setLoading} />
              )}
              {activeTab === "category" && (
                <TransactionCategory setLoading={setLoading} />
              )}
              {activeTab === "categorywise" && (
                <TransactionCategorywise setLoading={setLoading} />
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
