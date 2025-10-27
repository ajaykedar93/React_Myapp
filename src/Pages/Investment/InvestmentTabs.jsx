import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentCategoryManager from "./InvestmentCategoryManager";
import DailyTradeJournal from "./DailyTradeJournal";
import DailyCalculate from "./InvestmentDepositLogic";
import InvestmentMonthSummary from "./InvestmentMonthSummary";

const GAP_PX = 6; // small space between navbar and tabs

const InvestmentTabs = () => {
  const [activeTab, setActiveTab] = useState("manageCategory");

  const navbarRef = useRef(null);
  const tabsWrapRef = useRef(null);
  const [heights, setHeights] = useState({ nav: 64, tabs: 56 }); // default to 64 to match others

  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const navigate = useNavigate();

  const goToDashboard = () => {
    try { navigate("/dashboard"); } catch { window.location.assign("/dashboard"); }
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

  // Measure heights (matches other pages because navbar has fixed --nav-h)
  useLayoutEffect(() => {
    const compute = () => {
      const navH = navbarRef.current?.offsetHeight || 64;
      const tabsH = tabsWrapRef.current?.offsetHeight || 56;
      setHeights({ nav: navH, tabs: tabsH });
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (navbarRef.current) ro.observe(navbarRef.current);
    if (tabsWrapRef.current) ro.observe(tabsWrapRef.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  // Move the indicator under the active tab
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

  // Keep active tab centered/visible
  useEffect(() => {
    const el = tabRefs.current[activeTab];
    el?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
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
      {/* FIXED NAVBAR — SAME SIZE/LAYOUT AS OTHER PAGES */}
      <nav ref={navbarRef} className="it-nav">
        <div className="container-fluid d-flex justify-content-between align-items-center px-0">
          <h1 className="it-title m-0">Investment Plan</h1>
          <button
            className="btn btn-warning fw-bold rounded-pill px-3 py-2"
            onClick={goToDashboard}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Fixed Tabs */}
      <div
        ref={tabsWrapRef}
        style={{
          ...styles.tabsBarWrap,
          top: heights.nav + GAP_PX,
        }}
      >
        <div style={styles.fadeLeft} aria-hidden />
        <div style={styles.fadeRight} aria-hidden />

        <div style={styles.tabsBar} ref={listRef}>
          <div ref={indicatorRef} style={styles.indicator} />
          <div style={styles.edgeSpacer} />
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
          <div style={styles.edgeSpacer} />
        </div>
      </div>

      {/* Only content scrolls */}
      <section
        style={{
          ...styles.scrollArea,
          top: heights.nav + heights.tabs + GAP_PX,
        }}
        className="contentFade"
      >
        {renderContent()}
      </section>

      {/* Shared styles to match other pages */}
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
    overflow: "hidden",
    backgroundColor: "#f5f7fb",
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
    pointerEvents: "auto",
    height: "auto",
  },
  tabsBar: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    scrollbarWidth: "thin",
    padding: "10px 8px",
    position: "relative",
    width: "100%",
    WebkitOverflowScrolling: "touch",
    scrollSnapType: "x mandatory",
    scrollBehavior: "smooth",
    scrollPaddingLeft: 16,
    scrollPaddingRight: 16,
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
    minWidth: 140,
    scrollSnapAlign: "center",
    touchAction: "manipulation",
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
  edgeSpacer: { flex: "0 0 8px" },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    background: "linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0))",
    pointerEvents: "none",
    zIndex: 1,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    background: "linear-gradient(270deg, rgba(255,255,255,0.92), rgba(255,255,255,0))",
    pointerEvents: "none",
    zIndex: 1,
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

/* ---------- Global CSS (matches your other pages) ---------- */
const css = `
:root{
  --nav-h: 64px;
}
@media (max-width: 575.98px) {
  :root { --nav-h: 58px; }
}
@media (min-width: 1400px) {
  :root { --nav-h: 66px; }
}

/* FIXED NAVBAR (same size/layout) */
.it-nav{
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--nav-h);
  z-index: 80;
  background: linear-gradient(90deg, #065f46 0%, #10b981 50%, #34d399 100%);
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 10px 30px rgba(16,185,129,0.25), inset 0 -1px 0 rgba(255,255,255,0.06);
  backdrop-filter: saturate(140%) blur(4px);
  display:flex; align-items:center;
  padding-top: calc(10px + env(safe-area-inset-top, 0px));
}

/* Bold black heading — same typography as others */
.it-title{
  color:#0b0b0b;
  font-weight:900;
  letter-spacing:.2px;
  font-size:clamp(18px,2.4vw,24px);
  text-shadow:none;
}

/* Anim + polish */
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.contentFade { animation: fadeSlide .3s ease; }

.tabBtn:hover { transform: translateY(-1px); }

::-webkit-scrollbar { height: 6px; width: 8px; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }

@media (max-width: 768px) {
  .tabBtn { min-width: auto !important; font-size: 0.92rem; padding: 10px 12px; line-height: 1.2; }
  body .contentFade { padding-bottom: 10px; }
}
@media (max-width: 480px) {
  .tabBtn { font-size: 0.86rem; padding: 10px 10px; }
  .tabBtn .tabIcon { margin-right: 6px; font-size: 1.1rem; }
}
@media (max-width: 768px) and (pointer: coarse) {
  .tabBtn:focus-visible {
    outline: none !important;
    box-shadow:
      0 0 0 .25rem rgba(16,185,129,.25),
      0 10px 20px var(--active-shadow, rgba(0,0,0,.18));
    border-color: #10b981 !important;
  }
}
`;

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default InvestmentTabs;
