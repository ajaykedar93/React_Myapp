// src/pages/UserTabs.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import UserInvestment from "./UserInvestments";
import PasswordManager from "./PasswordManager";
import Act_Favorite from "./AddfevActress";
import ShowActress from "./GetFevAct";
import GetPassword from "./GetPassword";
import Notes from "./Notes";
import WebsitesUrl from "./WebsitesUrl";

/* ---------------- Tokens ---------------- */
const COLORS = {
  text: "#0f172a",
  textMuted: "#475569",
  surface: "rgba(255, 255, 255, 0.86)",
  border: "rgba(2, 6, 23, 0.10)",
  softShadow: "0 12px 38px rgba(2, 6, 23, 0.10)",
  accent: "#22d3ee",
  accent2: "#a78bfa",
  glow: "rgba(34, 211, 238, 0.35)",
  bgGradA: "rgba(56,189,248,.24)",
  bgGradB: "rgba(168,85,247,.22)",
  bgBaseTop: "#f8fbff",
  bgBaseBottom: "#f6fff9",
};

const FOOTER_H = 64;

const TABS = [
  { id: "investment", label: "Investment" },
  { id: "password", label: "Add Password" },
  { id: "getpassword", label: "Get Password" },
  { id: "favorite", label: "Add Actress Favorite" },
  { id: "actresslist", label: "Actress List" },
  { id: "websites", label: "Websites" },
  { id: "notes", label: "Notes" },
];

export default function UserTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("investment");

  // Live NAV height (prevents overlap)
  const navRef = useRef(null);
  const [navH, setNavH] = useState(72);

  // Small-screen top offset above navbar
  const [navOffset, setNavOffset] = useState(0); // px

  useLayoutEffect(() => {
    const applyOffsets = () => {
      const h = navRef.current?.offsetHeight || 72;
      setNavH(h);
      // 8px gap on XS screens, 0 on others
      setNavOffset(window.innerWidth <= 576 ? 8 : 0);
    };
    applyOffsets();

    const ro = new ResizeObserver(applyOffsets);
    if (navRef.current) ro.observe(navRef.current);

    const onResize = () => applyOffsets();
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // fixed tabs height measurement
  const tabsWrapRef = useRef(null);
  const [tabsH, setTabsH] = useState(56);

  useLayoutEffect(() => {
    const calcTabs = () => setTabsH(tabsWrapRef.current?.offsetHeight || 56);
    const ro = new ResizeObserver(calcTabs);
    calcTabs();
    if (tabsWrapRef.current) ro.observe(tabsWrapRef.current);
    window.addEventListener("resize", calcTabs);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calcTabs);
    };
  }, []);

  // tabs indicator
  const tabListRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = () => {
    const el = tabRefs.current[activeTab];
    const bar = tabListRef.current;
    if (!el || !bar) return;
    const barRect = bar.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left = elRect.left - barRect.left + bar.scrollLeft;
    setIndicator({ left, width: elRect.width });
  };

  useLayoutEffect(() => {
    updateIndicator();
    const bar = tabListRef.current;
    const obs = new ResizeObserver(updateIndicator);
    if (bar) {
      obs.observe(bar);
      bar.addEventListener("scroll", updateIndicator, { passive: true });
    }
    window.addEventListener("resize", updateIndicator);
    return () => {
      obs.disconnect();
      if (bar) bar.removeEventListener("scroll", updateIndicator);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab]);

  const gradientText = useMemo(
    () => ({
      backgroundImage: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})`,
      WebkitBackgroundClip: "text",
      color: "transparent",
    }),
    []
  );

  return (
    <div
      style={{
        height: "100dvh", // mobile-safe viewport
        width: "100vw",
        overflow: "hidden",
        color: COLORS.text,
        background:
          `radial-gradient(1400px 700px at 0% -10%, ${COLORS.bgGradA}, transparent 60%), ` +
          `radial-gradient(1200px 600px at 100% -10%, ${COLORS.bgGradB}, transparent 60%), ` +
          `linear-gradient(180deg, ${COLORS.bgBaseTop} 0%, ${COLORS.bgBaseBottom} 100%)`,
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        position: "relative",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* ===== FIXED NAVBAR (now with top offset on small screens) ===== */}
      <nav
        ref={navRef}
        className="ut-nav"
        style={{ top: navOffset }} // <— little space above navbar on small screens
      >
        <div className="container-fluid d-flex justify-content-between align-items-center px-3">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.35)",
                fontWeight: 800, fontSize: 13.5, color: "#06212a"
              }}
            >
              UD
            </div>
            <h1 className="ut-title m-0">User Dashboard</h1>
          </div>

          <button
            type="button"
            className="btn btn-warning fw-bold rounded-pill px-3 py-2"
            onClick={() => navigate("/dashboard")}
            style={{ color: "#1f2937", boxShadow: "0 12px 26px rgba(2,6,23,.22)" }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Spacer equals REAL navbar height + small top offset */}
      <div style={{ height: navH + navOffset }} />

      {/* ===== FIXED TABS under navbar (account for navOffset) ===== */}
      <div
        ref={tabsWrapRef}
        className="ut-tabs-wrap"
        style={{ top: navOffset + navH }}
      >
        <div className="container" style={{ maxWidth: 1180 }}>
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="User sections"
            className="ut-tablist"
          >
            {/* Ink indicator */}
            <div
              aria-hidden="true"
              className="ut-ink"
              style={{
                width: indicator.width || 0,
                transform: `translateX(${indicator.left || 0}px)`,
              }}
            />
            <div style={{ flex: "0 0 6px" }} />
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  onClick={() => {
                    setActiveTab(tab.id);
                    tabRefs.current[tab.id]?.scrollIntoView?.({
                      inline: "center",
                      block: "nearest",
                      behavior: "smooth",
                    });
                  }}
                  className={`btn fw-semibold ut-chip me-2 ${isActive ? "is-active" : ""}`}
                >
                  {tab.label}
                </button>
              );
            })}
            <div style={{ flex: "0 0 6px" }} />
          </div>
        </div>
      </div>

      {/* ===== ONLY content scrolls (also include navOffset) ===== */}
      <div
        style={{
          position: "absolute",
          top: navOffset + navH + tabsH,
          left: 0,
          right: 0,
          bottom: FOOTER_H,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          zIndex: 10,
        }}
      >
        <div className="container pt-3 pb-4" style={{ maxWidth: 1180 }}>
          <div
            className="p-3 p-md-4 rounded-4"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.softShadow,
              animation: "contentFade .25s ease",
            }}
          >
            {activeTab === "investment" && <UserInvestment />}
            {activeTab === "password" && <PasswordManager />}
            {activeTab === "getpassword" && <GetPassword />}
            {activeTab === "favorite" && <Act_Favorite />}
            {activeTab === "actresslist" && <ShowActress />}
            {activeTab === "websites" && <WebsitesUrl />}
            {activeTab === "notes" && <Notes />}
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* Footer glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: FOOTER_H,
          background:
            "radial-gradient(70% 120% at 50% 0%, rgba(34,211,238,0.18), transparent 70%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* ===== Styles ===== */}
      <style>{`
        .ut-nav {
          position: fixed; left: 0; right: 0;
          z-index: 80;
          display: flex; align-items: center;
          min-height: 64px;
          padding: 10px 14px;
          padding-top: calc(env(safe-area-inset-top, 0px) + 6px);
          background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #38bdf8 100%);
          border-bottom: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 30px rgba(2,6,23,0.18), inset 0 -1px 0 rgba(255,255,255,0.06);
          backdrop-filter: saturate(140%) blur(6px);
          -webkit-backdrop-filter: saturate(140%) blur(6px);
          /* 'top' is set inline via style to include navOffset */
        }
        .ut-title {
          font-weight: 900;
          font-size: clamp(18px, 2.4vw, 24px);
          letter-spacing: .2px;
          color: #0b0b0b;
          text-shadow: none;
          line-height: 1.2;
        }

        .ut-tabs-wrap {
          position: fixed; left: 0; right: 0; z-index: 60;
          background: ${COLORS.surface};
          border-top: 1px solid ${COLORS.border};
          border-bottom: 1px solid ${COLORS.border};
          box-shadow: ${COLORS.softShadow};
          backdrop-filter: blur(10px);
        }
        .ut-tablist {
          position: relative; display: flex; flex-wrap: nowrap;
          overflow-x: auto; overflow-y: hidden; white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          gap: 10px; padding: 10px;
          scroll-snap-type: x proximity;
          scroll-padding-left: 12px; scroll-padding-right: 12px;
          scrollbar-width: thin;
        }
        .ut-tablist::-webkit-scrollbar { height: 6px; }
        .ut-tablist::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }

        .ut-ink {
          position: absolute; bottom: 4px; height: 3px; left: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(34,211,238,1) 0%, rgba(167,139,250,1) 100%);
          box-shadow: 0 0 18px rgba(34,211,238,0.35);
          transition: transform .25s ease, width .25s ease;
          pointer-events: none;
        }

        .ut-chip {
          border-radius: 12px;
          padding: 0.6rem 1rem;
          font-size: .92rem;
          color: ${COLORS.text};
          border: 1px solid ${COLORS.border};
          background: rgba(255,255,255,0.75);
          white-space: nowrap;
          scroll-snap-align: center;
          transition: transform .16s ease, box-shadow .16s ease, background .2s ease;
          touch-action: manipulation;
        }
        .ut-chip:hover { transform: translateY(-1px); }
        .ut-chip.is-active {
          color: #06151a;
          border-color: transparent;
          background: linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accent2});
          box-shadow: 0 14px 28px -14px ${COLORS.glow};
          transform: translateY(-1px);
        }

        @keyframes contentFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }

        /* Small-screen refinements */
        @media (max-width: 576px) {
          .ut-chip { padding: 0.55rem 0.85rem !important; font-size: .9rem !important; }
          .ut-title { font-size: 18px; }
          .ut-nav .btn { padding: .35rem .7rem; font-size: .875rem; }
        }
      `}</style>
    </div>
  );
}
