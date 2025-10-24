import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentCategoryManager from "./InvestmentCategoryManager";
import DailyTradeJournal from "./DailyTradeJournal";
import DailyCalculate from "./InvestmentDepositLogic";
import InvestmentMonthSummary from "./InvestmentMonthSummary";

const InvestmentTabs = () => {
  const [activeTab, setActiveTab] = useState("manageCategory");
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const navigate = useNavigate();

  // ✅ Use client-side navigation for Vercel/SPA
  const goToDashboard = () => {
    try {
      navigate("/dashboard");
    } catch {
      // Fallback in case Router context isn't available
      window.location.assign("/dashboard");
    }
  };

  const tabs = useMemo(
    () => [
      { id: "manageCategory", label: "Manage Category", icon: "📂", color: "#2563eb" },
      { id: "TradeJournal", label: "Trading Journal", icon: "📘", color: "#f59e0b" },
      { id: "DailyCalculate", label: "Daily Calculate", icon: "📅", color: "#ef4444" },
      { id: "MonthlyReport", label: "Monthly Report", icon: "📈", color: "#8b5cf6" },
    ],
    []
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    const current = tabRefs.current[activeTab];
    if (!list || !indicator || !current) return;
    const listRect = list.getBoundingClientRect();
    const curRect = current.getBoundingClientRect();
    const left = curRect.left - listRect.left + list.scrollLeft;
    indicator.style.width = `${curRect.width}px`;
    indicator.style.transform = `translateX(${left}px)`;
    const tabMeta = tabs.find((t) => t.id === activeTab);
    if (tabMeta) {
      indicator.style.background = tabMeta.color;
      list.style.setProperty("--active-color", tabMeta.color);
      list.style.setProperty("--active-shadow", hexToRgba(tabMeta.color, 0.28));
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "manageCategory": return <InvestmentCategoryManager />;
      case "TradeJournal": return <DailyTradeJournal />;
      case "DailyCalculate": return <DailyCalculate />;
      case "MonthlyReport": return <InvestmentMonthSummary />;
      default: return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoGlow} />
          <div style={styles.logo}>💹 Investment Plan</div>
        </div>
        <button style={styles.dashboardBtn} onClick={goToDashboard}>Dashboard</button>
      </nav>

      <div style={styles.spacer} />

      {/* Tabs Bar */}
      <div style={styles.tabsBarWrap}>
        <div style={styles.tabsBar} ref={listRef}>
          <div ref={indicatorRef} style={styles.indicator} />
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                onClick={() => setActiveTab(tab.id)}
                className={`tabBtn ${active ? "tab-active" : ""}`}
                style={{
                  ...styles.tab,
                  ...(active
                    ? {
                        background: tab.color,
                        color: "#fff",
                        boxShadow: `0 10px 20px var(--active-shadow, rgba(0,0,0,.18))`,
                        transform: "translateY(-1px) scale(1.04)",
                      }
                    : {}),
                }}
              >
                <span style={styles.tabIcon}>{tab.icon}</span>
                <span className="tabLabel">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <section style={styles.content}>{renderContent()}</section>

      <style>{css}</style>
    </div>
  );
};

/* ---------- Styles ---------- */
const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', Tahoma, sans-serif",
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
    display: "flex",
    flexDirection: "column",
  },
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 18px",
    background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
    color: "#fff",
    boxShadow: "0 8px 20px rgba(30,58,138,0.35)",
  },
  logoWrap: { display: "flex", alignItems: "center", position: "relative" },
  logoGlow: {
    position: "absolute",
    left: -8,
    top: -8,
    width: 60,
    height: 60,
    borderRadius: "999px",
    background:
      "radial-gradient(60px 60px at 30% 40%, rgba(96,165,250,0.35), rgba(0,0,0,0))",
    pointerEvents: "none",
  },
  logo: { fontSize: "1.05rem", fontWeight: 700 },
  dashboardBtn: {
    background: "linear-gradient(180deg, #fde68a, #facc15)",
    color: "#1f2937",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  spacer: { height: 28 },
  tabsBarWrap: {
    position: "sticky",
    top: 58,
    zIndex: 40,
    backgroundColor: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #e5e7eb",
  },
  tabsBar: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    scrollbarWidth: "thin",
    padding: "10px 10px",
    position: "relative",
  },
  tab: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    transition: "all .25s ease",
    minWidth: 140,
  },
  tabIcon: { marginRight: 6, fontSize: "1.1rem" },
  indicator: {
    position: "absolute",
    bottom: 5,
    height: 3,
    width: 0,
    borderRadius: 999,
    transition: "transform .35s ease, width .35s ease",
  },
  content: {
    flex: 1,
    padding: 20,
    minHeight: "calc(100vh - 160px)",
  },
};

/* ---------- CSS ---------- */
const css = `
/* Fade animation */
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.contentFade { animation: fadeSlide .3s ease; }

/* Tab focus/hover */
.tabBtn:focus-visible { outline: 3px solid rgba(37,99,235,0.4); }
.tabBtn:hover { transform: translateY(-1px); }

/* Scrollbar thin */
::-webkit-scrollbar { height: 6px; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }

/* 📱 Mobile responsiveness */
@media (max-width: 768px) {
  .tabBtn {
    min-width: 120px;
    font-size: 0.8rem;
    padding: 8px 10px;
  }
  .tabLabel {
    display: inline-block;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  nav div[style*="font-size: 1.05rem"] {
    font-size: 0.95rem !important;
  }
  button[style*="font-weight: 700"] {
    font-size: 0.85rem !important;
    padding: 6px 10px !important;
  }
}
@media (max-width: 480px) {
  .tabBtn {
    flex-direction: column;
    min-width: 90px;
    font-size: 0.7rem;
    text-align: center;
    padding: 6px;
  }
  .tabIcon {
    margin-right: 0;
    font-size: 1.3rem;
  }
  .tabLabel {
    margin-top: 2px;
    max-width: none;
    white-space: normal;
  }
}
`;

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default InvestmentTabs;
