import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentCategoryManager from "./InvestmentCategoryManager";
import DailyTradeJournal from "./DailyTradeJournal";
import DailyCalculate from "./InvestmentDepositLogic";
import InvestmentMonthSummary from "./InvestmentMonthSummary"; // existing (your monthly report page)
import InvestmentMonthlySummary from "./InvestmentMonthlySummary"; // ✅ NEW TAB PAGE (the summary page)

const GAP_PX = 6;

const InvestmentTabs = () => {
  const [activeTab, setActiveTab] = useState("manageCategory");

  const navbarRef = useRef(null);
  const tabsWrapRef = useRef(null);
  const [heights, setHeights] = useState({ nav: 64, tabs: 56 });

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

  // ✅ Added NEW TAB: Monthly Summary
  const tabs = useMemo(
    () => [
      { id: "manageCategory", label: "Manage Category", icon: "📂", color: "#2563eb" },
      { id: "TradeJournal", label: "Trading Journal", icon: "📘", color: "#f59e0b" },
      { id: "DailyCalculate", label: "Diposit Logic", icon: "📅", color: "#ef4444" },
      { id: "MonthlySummary", label: "Monthly Summary", icon: "🧾", color: "#14b8a6" }, // ✅ NEW
      { id: "MonthlyReport", label: "Monthly Report", icon: "📈", color: "#8b5cf6" },
    ],
    []
  );

  // Measure heights
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

  // Indicator position + color
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

  // keep active tab visible
  useEffect(() => {
    const el = tabRefs.current[activeTab];
    el?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "manageCategory":
        return <InvestmentCategoryManager />;
      case "TradeJournal":
        return <DailyTradeJournal />;
      case "DailyCalculate":
        return <DailyCalculate />;
      case "MonthlySummary": // ✅ NEW TAB CONTENT
        return <InvestmentMonthlySummary />;
      case "MonthlyReport":
        return <InvestmentMonthSummary />;
      default:
        return null;
    }
  };

  return (
    <div className="it-page">
      <style>{css}</style>

      {/* FIXED NAVBAR */}
      <nav ref={navbarRef} className="it-nav">
        <div className="it-navInner">
          <h1 className="it-title">Investment Plan</h1>
          <button className="it-dashBtn" onClick={goToDashboard}>
            Dashboard
          </button>
        </div>
      </nav>

      {/* FIXED TABS */}
      <div ref={tabsWrapRef} className="it-tabsWrap" style={{ top: heights.nav + GAP_PX }}>
        <div className="it-fadeLeft" aria-hidden />
        <div className="it-fadeRight" aria-hidden />

        <div className="it-tabsBar" ref={listRef}>
          <div ref={indicatorRef} className="it-indicator" />
          <div className="it-edgeSpacer" />

          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                onClick={() => setActiveTab(tab.id)}
                className={`it-tabBtn ${active ? "isActive" : ""}`}
                style={
                  active
                    ? {
                        background: tab.color,
                        color: "#fff",
                        boxShadow: `0 10px 18px var(--active-shadow, rgba(0,0,0,.18))`,
                        transform: "translateY(-1px)",
                      }
                    : undefined
                }
              >
                <span className="it-tabIcon">{tab.icon}</span>
                <span className="it-tabLabel">{tab.label}</span>
              </button>
            );
          })}

          <div className="it-edgeSpacer" />
        </div>
      </div>

      {/* ONLY CONTENT SCROLLS */}
      <section className="it-scrollArea" style={{ top: heights.nav + heights.tabs + GAP_PX }}>
        <div className="it-contentShell">{renderContent()}</div>
      </section>
    </div>
  );
};

/* Scoped CSS */
const css = `
  .it-page, .it-page *{ box-sizing:border-box; }

  :root{
    --it-safe-top: max(env(safe-area-inset-top, 0px), 0px);
    --it-nav-core: 64px;
    --it-nav-extra-top: 10px;
  }

  .it-page{
    height:100dvh;
    width:100%;
    overflow:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    background:
      radial-gradient(900px 520px at 15% 0%, rgba(37,99,235,.10), transparent 60%),
      radial-gradient(900px 520px at 90% 10%, rgba(16,185,129,.10), transparent 60%),
      linear-gradient(180deg, #ffffff, #f5f7fb);
  }

  /* Navbar */
  .it-nav{
    position:fixed;
    top:0; left:0; right:0;
    z-index:80;

    min-height: calc(var(--it-nav-core) + var(--it-safe-top));
    background: linear-gradient(90deg, #065f46 0%, #10b981 50%, #34d399 100%);
    border-bottom: 1px solid rgba(255,255,255,0.18);
    box-shadow: 0 10px 30px rgba(16,185,129,0.25), inset 0 -1px 0 rgba(255,255,255,0.06);

    display:flex;
    align-items:flex-end;

    padding-top: calc(var(--it-safe-top) + var(--it-nav-extra-top));
    padding-bottom: 10px;
    padding-left: 14px;
    padding-right: 14px;
  }

  .it-navInner{
    width: min(1240px, calc(100% - 16px));
    margin:0 auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }

  .it-title{
    margin:0;
    color:#0b0b0b;
    font-weight:900;
    letter-spacing:.2px;
    font-size:clamp(18px,2.1vw,24px);
  }

  .it-dashBtn{
    border:none;
    cursor:pointer;
    font-weight:900;
    border-radius:999px;
    padding: 9px 13px;
    background: #fbbf24;
    color:#111827;
    box-shadow: 0 10px 20px rgba(0,0,0,.12);
  }
  .it-dashBtn:active{ transform: scale(.985); }

  /* Tabs wrap */
  .it-tabsWrap{
    position:fixed;
    left:0; right:0;
    z-index:40;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #e5e7eb;
  }

  .it-tabsBar{
    width: min(1240px, calc(100% - 16px));
    margin: 0 auto;
    display:flex;
    gap:8px;
    overflow-x:auto;
    padding: 8px 6px;
    position:relative;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .it-tabsBar::-webkit-scrollbar{ height:0; }

  .it-indicator{
    position:absolute;
    bottom: 4px;
    height: 3px;
    width: 0;
    border-radius: 999px;
    transition: transform .35s ease, width .35s ease, background .25s ease;
  }

  .it-edgeSpacer{ flex: 0 0 8px; }

  /* ✅ Small tabs on mobile, still premium on desktop */
  .it-tabBtn{
    border:1px solid #e5e7eb;
    background:#fff;
    color:#374151;
    border-radius:999px;
    padding: 8px 10px;
    font-weight:850;
    font-size: 0.86rem;
    white-space:nowrap;
    display:flex;
    align-items:center;
    gap:7px;

    min-width: 132px;
    scroll-snap-align: center;
    cursor:pointer;
    transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
    user-select:none;
    -webkit-tap-highlight-color: transparent;
  }
  .it-tabBtn:hover{ transform: translateY(-1px); }
  .it-tabBtn:active{ transform: scale(.985); }

  .it-tabIcon{ font-size: 1.02rem; }
  .it-tabLabel{ font-weight:900; }

  /* fades */
  .it-fadeLeft{
    position:absolute; left:0; top:0; bottom:0; width:22px;
    background: linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0));
    pointer-events:none; z-index:2;
  }
  .it-fadeRight{
    position:absolute; right:0; top:0; bottom:0; width:22px;
    background: linear-gradient(270deg, rgba(255,255,255,0.92), rgba(255,255,255,0));
    pointer-events:none; z-index:2;
  }

  /* Scroll area */
  .it-scrollArea{
    position:absolute;
    left:0; right:0; bottom:0;
    overflow-y:auto;
    -webkit-overflow-scrolling: touch;
    padding: 0;
  }

  /* ✅ Full width page (not half) */
  .it-contentShell{
    width: min(1240px, calc(100% - 16px));
    margin: 0 auto;
    padding: 12px 0;
  }

  /* Mobile perfect */
  @media (max-width: 540px){
    :root{
      --it-nav-core: 56px;
      --it-nav-extra-top: 38px;
    }

    .it-tabsBar{ gap:7px; padding: 7px 4px; }

    .it-tabBtn{
      min-width: auto;
      padding: 7px 10px;
      font-size: 0.80rem;
      gap: 6px;
    }
    .it-tabIcon{ font-size: .98rem; }
  }

  /* Large screens */
  @media (min-width: 1100px){
    .it-tabBtn{
      font-size: 0.9rem;
      padding: 9px 12px;
      min-width: 148px;
    }
    .it-tabIcon{ font-size: 1.06rem; }
  }
`;

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default InvestmentTabs;
