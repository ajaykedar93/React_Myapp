// src/pages/UserTabs.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import UserInvestment from "./UserInvestments";
import PasswordManager from "./PasswordManager";
import Act_Favorite from "./AddfevActress";
import ShowActress from "./ActressesPage";
import GetPassword from "./GetPassword";
import Notes from "./Notes";
import WebsitesUrl from "./WebsitesUrl";
import Addlist from "./Addfevlist";

/* ---------------- Tokens ---------------- */
const COLORS = {
  text: "#0f172a",
  textMuted: "#475569",
  surface: "rgba(255, 255, 255, 0.90)",
  border: "rgba(2, 6, 23, 0.10)",
  softShadow: "0 12px 38px rgba(2, 6, 23, 0.12)",
  accent: "#22d3ee",
  accent2: "#a78bfa",
  glow: "rgba(34, 211, 238, 0.35)",
  bgGradA: "rgba(56,189,248,.24)",
  bgGradB: "rgba(168,85,247,.22)",
  bgBaseTop: "#f8fbff",
  bgBaseBottom: "#f6fff9",
};

const FOOTER_H = 60;

const TABS = [
  { id: "investment", label: "Investment" },
  { id: "password", label: "Add Password" },
  { id: "getpassword", label: "Get Password" },
  { id: "favorite", label: "Add Actress Favorite" },
  { id: "actresslist", label: "Actress List" },
  { id: "websites", label: "Websites" },
  { id: "notes", label: "Notes" },
  { id: "addlist", label: "Act List" },   // ✅ YOUR NEW TAB
];

export default function UserTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("investment");

  /* ==== Mobile viewport fix ==== */
  useEffect(() => {
    const setVh = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("resize", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("resize", setVh);
    };
  }, []);

  /* ==== Navbar height ==== */
  const navRef = useRef(null);
  const [navH, setNavH] = useState(72);
  const [navOffset, setNavOffset] = useState(0);

  useLayoutEffect(() => {
    const applyOffsets = () => {
      const h = navRef.current?.offsetHeight || 72;
      setNavH(h);
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

  /* ==== Tabs height ==== */
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

  /* ==== Ink indicator ==== */
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

  /* ==== Render ==== */
  return (
    <div
      className="ut-root"
      style={{
        minHeight: "calc(var(--vh, 1vh) * 100)",
        width: "100vw",
        overflow: "hidden",
        color: COLORS.text,
        background:
          `radial-gradient(1400px 700px at 0% -10%, ${COLORS.bgGradA}, transparent 60%), 
           radial-gradient(1200px 600px at 100% -10%, ${COLORS.bgGradB}, transparent 60%), 
           linear-gradient(180deg, ${COLORS.bgBaseTop} 0%, ${COLORS.bgBaseBottom} 100%)`,
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        position: "relative",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* --- NAVBAR --- */}
      <nav ref={navRef} className="ut-nav" style={{ top: navOffset }}>
        <div className="container-fluid d-flex justify-content-between align-items-center px-3">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.35)",
                fontWeight: 800,
                fontSize: 13.5,
                color: "#06212a",
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
            style={{
              color: "#1f2937",
              boxShadow: "0 12px 26px rgba(2,6,23,.22)",
            }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Spacer */}
      <div style={{ height: navH + navOffset }} />

      {/* --- TAB HEADER --- */}
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
            <div
              aria-hidden="true"
              className="ut-ink"
              style={{
                width: indicator.width || 0,
                transform: `translateX(${indicator.left}px)`,
              }}
            />
            <div style={{ flex: "0 0 6px" }} />

            {TABS.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => (tabRefs.current[t.id] = el)}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(t.id);
                    tabRefs.current[t.id]?.scrollIntoView({
                      inline: "center",
                      block: "nearest",
                      behavior: "smooth",
                    });
                  }}
                  className={`btn fw-semibold ut-chip me-2 ${
                    isActive ? "is-active" : ""
                  }`}
                >
                  {t.label}
                </button>
              );
            })}

            <div style={{ flex: "0 0 6px" }} />
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA (scroll) --- */}
      <div
        className="ut-content"
        style={{
          position: "absolute",
          top: navOffset + navH + tabsH,
          left: 0,
          right: 0,
          bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom, 0px))`,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "10px",
        }}
      >
        <div className="container pt-3 pb-4" style={{ maxWidth: 1180 }}>
          <div
            className="p-3 p-md-4 rounded-4"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.softShadow,
            }}
          >
            {activeTab === "investment" && <UserInvestment />}
            {activeTab === "password" && <PasswordManager />}
            {activeTab === "getpassword" && <GetPassword />}
            {activeTab === "favorite" && <Act_Favorite />}
            {activeTab === "actresslist" && <ShowActress />}
            {activeTab === "websites" && <WebsitesUrl />}
            {activeTab === "notes" && <Notes />}
            {activeTab === "addlist" && <Addlist />} {/* ✅ NEW TAB COMPONENT */}
          </div>
        </div>
      </div>

      {/* Footer glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: `calc(${FOOTER_H}px + env(safe-area-inset-bottom, 0px))`,
          background:
            "radial-gradient(70% 120% at 50% 0%, rgba(34,211,238,0.18), transparent 70%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* Styles */}
      <style>{`
        :root { color-scheme: light; }

        .ut-nav {
          position: fixed;
          left: 0; right: 0;
          z-index: 1040;
          min-height: 64px;
          padding: 10px 14px;
          padding-top: calc(env(safe-area-inset-top,0px) + 6px);
          background: linear-gradient(100deg,#1e3a8a 0%,#2563eb 45%,#38bdf8 100%);
          border-bottom: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 30px rgba(2,6,23,0.18);
          backdrop-filter: saturate(140%) blur(6px);
        }

        .ut-title {
          font-weight: 900;
          font-size: clamp(18px,2.4vw,24px);
          color: #0b0b0b;
          line-height: 1.2;
        }

        .ut-tabs-wrap {
          position: fixed;
          left: 0; right: 0;
          z-index: 1030;
          background: ${COLORS.surface};
          border-top: 1px solid ${COLORS.border};
          border-bottom: 1px solid ${COLORS.border};
          box-shadow: ${COLORS.softShadow};
          backdrop-filter: blur(10px);
        }

        .ut-tablist {
          position:relative;
          display:flex;
          overflow-x:auto;
          gap:10px;
          padding:10px;
          scroll-snap-type:x proximity;
          scrollbar-width:thin;
        }
        .ut-tablist::-webkit-scrollbar{height:6px;}

        .ut-ink {
          position:absolute;
          bottom:4px; height:3px;
          background:linear-gradient(90deg,${COLORS.accent},${COLORS.accent2});
          border-radius:999px;
          box-shadow:0 0 18px ${COLORS.glow};
          transition:transform .25s ease,width .25s ease;
        }

        .ut-chip {
          border-radius:12px;
          padding:.6rem 1rem;
          background:rgba(255,255,255,0.82);
          border:1px solid ${COLORS.border};
          transition:all .2s ease;
        }

        .ut-chip.is-active {
          background:linear-gradient(180deg,${COLORS.accent},${COLORS.accent2});
          color:#06151a;
          border-color:transparent;
          box-shadow:0 14px 28px -14px ${COLORS.glow};
        }

        .ut-content :where(.position-fixed,[role="dialog"],.modal) {
          z-index:20000 !important;
        }
      `}</style>
    </div>
  );
}
