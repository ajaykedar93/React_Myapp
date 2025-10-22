import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import InvestmentCategoryManager from "./InvestmentCategoryManager";
import DailyTradeJournal from "./DailyTradeJournal";
import DailyCalculate from "./InvestmentDepositLogic";
import InvestmentMonthSummary from "./InvestmentMonthSummary";
// NOTE: UserInvestment tab removed per request

const InvestmentTabs = () => {
  const [activeTab, setActiveTab] = useState("manageCategory");
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({}); // id -> ref

  const goToDashboard = () => (window.location.href = "/dashboard");

  const tabs = useMemo(
    () => [
      { id: "manageCategory", label: "Manage Category", icon: "📂", color: "#2563eb" },
      { id: "TradeJournal",   label: "Trading Journal", icon: "📘", color: "#f59e0b" },
      { id: "DailyCalculate", label: "Daily Calculate", icon: "📅", color: "#ef4444" },
      { id: "MonthlyReport",  label: "Monthly Report",  icon: "📈", color: "#8b5cf6" },
      // { id: "UserInvestment", label: "User Investment", icon: "🧾", color: "#10b981" }, // removed
    ],
    []
  );

  // Move/resize indicator + colorize to the active tab color
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

  // Keep active in view
  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, [activeTab]);

  // Keyboard navigation
  const onKeyDown = (e) => {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (idx < 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveTab(tabs[(idx + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(tabs[0].id);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab(tabs[tabs.length - 1].id);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "manageCategory": return <InvestmentCategoryManager />;
      case "TradeJournal":   return <DailyTradeJournal />;
      case "DailyCalculate": return <DailyCalculate />;
      case "MonthlyReport":  return <InvestmentMonthSummary />;
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
        <button
          style={styles.dashboardBtn}
          onClick={goToDashboard}
          className="ripple"
          aria-label="Go to Dashboard"
        >
          Dashboard
        </button>
      </nav>

      {/* space between navbar and tabs */}
      <div style={styles.spacer} aria-hidden />

      {/* Tabs */}
      <div
        style={styles.tabsBarWrap}
        role="tablist"
        aria-label="Investment sections"
        onKeyDown={onKeyDown}
      >
        <div style={styles.tabsBar} ref={listRef}>
          {/* underline indicator */}
          <div ref={indicatorRef} style={styles.indicator} aria-hidden />

          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`tabBtn ripple ${active ? "tab-active" : ""}`}
                style={{
                  ...styles.tab,
                  ...(active
                    ? {
                        background: tab.color,
                        color: "#ffffff",
                        boxShadow: `0 10px 20px var(--active-shadow, rgba(0,0,0,.18))`,
                        transform: "translateY(-1px) scale(1.04)",
                      }
                    : {}),
                }}
              >
                <span style={styles.tabIcon}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <section
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={styles.content}
        className="contentFade"
      >
        {renderContent()}
      </section>

      {/* Local CSS */}
      <style>{css}</style>
    </div>
  );
};

/* ---------- styles ---------- */
const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
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
    padding: "14px 24px",
    background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
    color: "#fff",
    boxShadow: "0 8px 24px rgba(30,58,138,0.35)",
    backdropFilter: "saturate(120%) blur(6px)",
  },
  logoWrap: { position: "relative", display: "flex", alignItems: "center" },
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
  logo: { fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.5px" },
  dashboardBtn: {
    background: "linear-gradient(180deg, #fde68a, #facc15)",
    color: "#1f2937",
    border: "none",
    padding: "8px 14px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(250, 204, 21, 0.35)",
  },
  spacer: { height: 40 },
  tabsBarWrap: {
    position: "sticky",
    top: 64,
    zIndex: 40,
    backgroundColor: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #e5e7eb",
  },
  tabsBar: {
    position: "relative",
    display: "flex",
    gap: 12,
    padding: "14px 16px",
    overflowX: "auto",
    scrollbarWidth: "thin",
  },
  tab: {
    position: "relative",
    appearance: "none",
    border: "1px solid #e5e7eb",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    color: "#374151",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition:
      "transform .22s ease, box-shadow .22s ease, color .22s ease, background .22s ease, border-color .22s ease",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
    outline: "none",
  },
  tabIcon: { marginRight: 8, fontSize: "1.1rem" },
  indicator: {
    position: "absolute",
    bottom: 6,
    height: 3,
    width: 0,
    background: "var(--active-color, #2563eb)",
    borderRadius: 999,
    transition:
      "transform .35s cubic-bezier(.2,.8,.2,1), width .35s cubic-bezier(.2,.8,.2,1), background .25s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  content: {
    flex: 1,
    padding: 24,
    minHeight: "calc(100vh - 180px)",
  },
};

/* ---------- local CSS ---------- */
const css = `
@media (max-width: 768px) {
  div[style*="height: 40px"] { height: 24px !important; }
}
.tabBtn:focus-visible {
  box-shadow: 0 0 0 3px rgba(37,99,235,.35), 0 6px 16px rgba(0,0,0,.08);
}
.tabBtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0,0,0,.08);
}
.tabBtn:active { transform: translateY(0) scale(.98); }

/* Ripple base */
.ripple { position: relative; overflow: hidden; }
.ripple:after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(circle at var(--x,50%) var(--y,50%), rgba(255,255,255,.5), rgba(255,255,255,0) 40%);
  opacity: 0; transition: opacity .55s ease;
}
.ripple:active:after { opacity: 1; }

/* Content fade */
.contentFade { animation: fadeSlide .28s ease both; }
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ===== Active tab glow animation ===== */
.tab-active {
  position: relative;
  isolation: isolate;
}
.tab-active::before,
.tab-active::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 999px;
  z-index: -1;
}
/* soft outer glow that gently pulses */
.tab-active::before {
  background: radial-gradient(120px 60px at 50% 50%, var(--active-color, #2563eb), transparent 70%);
  filter: blur(16px);
  opacity: .6;
  animation: glowPulse 1.8s ease-in-out infinite;
}
/* subtle inner stroke */
.tab-active::after {
  border: 1px solid rgba(255,255,255,.55);
  opacity: .6;
}
@keyframes glowPulse {
  0%   { opacity: .38; filter: blur(18px); }
  50%  { opacity: .72; filter: blur(22px); }
  100% { opacity: .38; filter: blur(18px); }
}

/* Scrollbar */
::-webkit-scrollbar { height: 8px; width: 10px; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
`;

/* tiny util */
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Ripple click position */
(function attachRippleListener(){
  if (typeof window === "undefined") return;
  const handler = (e) => {
    const t = e.target.closest(".ripple");
    if (!t) return;
    const rect = t.getBoundingClientRect();
    t.style.setProperty("--x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    t.style.setProperty("--y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };
  window.addEventListener("pointerdown", handler, { passive: true });
})();

export default InvestmentTabs;
