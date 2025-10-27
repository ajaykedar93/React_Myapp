import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentCategoryManager from "./InvestmentCategoryManager";
import DailyTradeJournal from "./DailyTradeJournal";
import DailyCalculate from "./InvestmentDepositLogic";
import InvestmentMonthSummary from "./InvestmentMonthSummary";

const GAP_PX = 6; // little space under navbar

const InvestmentTabs = () => {
  const [activeTab, setActiveTab] = useState("manageCategory");

  // dynamic heights (fixes mobile tap overlap)
  const navbarRef = useRef(null);
  const tabsWrapRef = useRef(null);
  const [heights, setHeights] = useState({ nav: 58, tabs: 56 });

  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const navigate = useNavigate();

  const goToDashboard = () => {
    try {
      navigate("/dashboard");
    } catch {
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

  // Measure navbar/tabs heights (accounts for mobile safe-area + font scaling)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      const navH =
        (navbarRef.current?.offsetHeight || 58) +
        (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-top)")) || 0);
      const tabsH = tabsWrapRef.current?.offsetHeight || 56;
      setHeights({ nav: navH, tabs: tabsH });
    });
    if (navbarRef.current) ro.observe(navbarRef.current);
    if (tabsWrapRef.current) ro.observe(tabsWrapRef.current);
    return () => ro.disconnect();
  }, []);

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
      const c = tabMeta.color;
      indicator.style.background = c;
      list.style.setProperty("--active-color", c);
      list.style.setProperty("--active-shadow", hexToRgba(c, 0.28));
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
    <div style={styles.shell}>
      {/* Fixed Navbar */}
      <nav ref={navbarRef} style={styles.navbar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoGlow} />
          <div style={styles.logo}>💹 Investment Plan</div>
        </div>
        <button style={styles.dashboardBtn} onClick={goToDashboard}>Dashboard</button>
      </nav>

      {/* Fixed Tabs (with tiny gap under navbar) */}
      <div
        ref={tabsWrapRef}
        style={{
          ...styles.tabsBarWrap,
          top: heights.nav + GAP_PX, // add little space
        }}
      >
        <div style={styles.tabsBar} ref={listRef}>
          <div ref={indicatorRef} style={styles.indicator} />
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                onClick={() => setActiveTab(tab.id)}
                className={`tabBtn ${active ? "tab-active" : ""} btn`}
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

      {/* Only content scrolls */}
      <section
        style={{
          ...styles.scrollArea,
          top: heights.nav + heights.tabs + GAP_PX, // push below both bars + gap
        }}
        className="contentFade"
      >
        {renderContent()}
      </section>

      <style>{css}</style>
    </div>
  );
};

/* ---------- Styles ---------- */
const styles = {
  shell: {
    fontFamily: "'Inter','Segoe UI',Tahoma,sans-serif",
    height: "100vh",
    width: "100vw",
    overflow: "hidden", // page itself doesn't scroll
    backgroundColor: "#f5f7fb",
  },

  navbar: {
    position: "fixed",
    top: "env(safe-area-inset-top, 0px)",
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 18px",
    background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
    color: "#fff",
    boxShadow: "0 8px 20px rgba(30,58,138,0.35)",
    // prevent overlaps swallowing taps
    pointerEvents: "auto",
  },

  logoWrap: { display: "flex", alignItems: "center", position: "relative" },
  logoGlow: {
    position: "absolute",
    left: -8,
    top: -8,
    width: 60,
    height: 60,
    borderRadius: "999px",
    background: "radial-gradient(60px 60px at 30% 40%, rgba(96,165,250,0.35), rgba(0,0,0,0))",
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

  tabsBarWrap: {
    position: "fixed",
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    // make sure taps go through correctly
    pointerEvents: "auto",
  },
  tabsBar: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    scrollbarWidth: "thin",
    padding: "10px 10px",
    position: "relative",
    width: "100%",
  },
  tab: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    borderRadius: 999,
    padding: "10px 12px",
    fontWeight: 700,
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    transition: "all .25s ease",
    minWidth: 140, // overridden on mobile
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

  scrollArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    padding: 20,
    minHeight: 0,
    WebkitOverflowScrolling: "touch",
  },
};

/* ---------- CSS ---------- */
const css = `
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.contentFade { animation: fadeSlide .3s ease; }

/* Hover */
.tabBtn:hover { transform: translateY(-1px); }

/* Thin scrollbars */
::-webkit-scrollbar { height: 6px; width: 8px; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }

/* Mobile: auto-fit tabs & better touch targets */
@media (max-width: 768px) {
  .tabBtn {
    min-width: auto !important;      /* allow auto width */
    flex: 1 1 auto;                   /* let buttons grow/shrink to fit row */
    font-size: 0.9rem;
    padding: 10px 12px;
    line-height: 1.2;
    touch-action: manipulation;
  }
  .tabLabel {
    max-width: none;
    overflow: visible;
    text-overflow: unset;
    white-space: nowrap;              /* keep one line; remove if you want wrap */
  }
}

/* Very small phones */
@media (max-width: 480px) {
  .tabBtn {
    font-size: 0.85rem;
    padding: 10px 10px;
  }
  .tabBtn .tabIcon { margin-right: 6px; font-size: 1.2rem; }
}

/* Mobile-only Bootstrap-like focus ring (optional) */
@media (max-width: 768px) and (pointer: coarse) {
  .tabBtn:focus-visible {
    outline: none !important;
    box-shadow:
      0 0 0 .25rem rgba(13,110,253,.25),
      0 10px 20px var(--active-shadow, rgba(0,0,0,.18));
    border-color: var(--bs-primary, #0d6efd) !important;
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
