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

const COLORS = {
  text: "#0b1221",
  textMuted: "#4b5563",
  surface: "rgba(255, 255, 255, 0.85)",
  border: "rgba(17, 24, 39, 0.12)",
  softShadow: "0 8px 32px rgba(31, 41, 55, 0.08)",
  accent: "#14b8a6",
  accentHover: "#06b6d4",
  glow: "rgba(20, 184, 166, 0.35)",
  gradientA: "#38bdf8",
  gradientB: "#84cc16",
  gradientC: "#a78bfa",
};

const FOOTER_H = 64;
const MOBILE_GAP = 6;

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

  // fixed bars
  const navbarRef = useRef(null);
  const tabsWrapRef = useRef(null);
  const [heights, setHeights] = useState({ nav: 56, tabs: 56, gap: 0 });

  // tab strip & indicator
  const tabListRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // measure fixed heights
  useLayoutEffect(() => {
    const compute = () => {
      const safeTop =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "env(safe-area-inset-top)"
          )
        ) || 0;
      const navH = (navbarRef.current?.offsetHeight || 56) + safeTop;
      const tabsH = tabsWrapRef.current?.offsetHeight || 56;
      const gap = window.innerWidth <= 576 ? MOBILE_GAP : 0;
      setHeights({ nav: navH, tabs: tabsH, gap });
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

  // indicator position (accounts for horizontal scroll)
  const updateIndicator = () => {
    const el = tabRefs.current[activeTab];
    const bar = tabListRef.current;
    if (!el || !bar) return;
    const barRect = bar.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left = elRect.left - barRect.left + bar.scrollLeft; // <-- important
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
      backgroundImage: `linear-gradient(90deg, ${COLORS.gradientA}, ${COLORS.gradientB}, ${COLORS.gradientC})`,
      WebkitBackgroundClip: "text",
      color: "transparent",
    }),
    []
  );

  const contentTop = heights.nav + heights.tabs + heights.gap;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden", // only content area scrolls
        color: COLORS.text,
        background:
          "radial-gradient(1400px 700px at 0% -10%, rgba(56,189,248,.25), transparent 60%), " +
          "radial-gradient(1200px 600px at 100% -10%, rgba(132,204,22,.22), transparent 60%), " +
          "linear-gradient(180deg, #fff 0%, #f7fbff 40%, #f6fff7 100%)",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        position: "relative",
      }}
    >
      {/* Fixed Navbar */}
      <nav
        ref={navbarRef}
        className="d-flex justify-content-between align-items-center px-4 py-3"
        style={{
          position: "fixed",
          top: "env(safe-area-inset-top, 0px)",
          left: 0,
          right: 0,
          zIndex: 30,
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
          boxShadow: COLORS.softShadow,
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: COLORS.accent,
              boxShadow: `0 0 0 6px ${COLORS.glow}`,
              marginRight: 8,
              animation: "subtlePulse 2s ease-out infinite",
            }}
          />
          <h5 className="m-0 fw-bold" style={gradientText}>
            User Dashboard
          </h5>
        </div>
        <button
          className="btn fw-semibold"
          onClick={() => navigate("/dashboard")}
          style={{
            background: `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accentHover})`,
            color: "#06212a",
            borderRadius: 12,
            border: "none",
            padding: "0.5rem 0.95rem",
            boxShadow: `0 12px 26px -12px ${COLORS.glow}`,
          }}
        >
          Dashboard
        </button>
      </nav>

      {/* Tiny mobile gap under navbar */}
      <div
        className="d-block d-sm-none"
        style={{
          position: "fixed",
          top: heights.nav,
          left: 0,
          right: 0,
          height: MOBILE_GAP,
          zIndex: 19,
        }}
      />

      {/* Fixed Tabs (single horizontal line; scroll sideways) */}
      <div
        ref={tabsWrapRef}
        style={{
          position: "fixed",
          top: heights.nav + MOBILE_GAP,
          left: 0,
          right: 0,
          zIndex: 20,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          boxShadow: COLORS.softShadow,
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="container" style={{ maxWidth: 1180 }}>
          <div
            ref={tabListRef}
            role="tablist"
            // Inline styles to guarantee single row + horizontal scroll on all devices
            style={{
              position: "relative",
              display: "flex",
              flexWrap: "nowrap",
              overflowX: "auto",
              overflowY: "hidden",
              whiteSpace: "nowrap",
              WebkitOverflowScrolling: "touch",
              gap: 10,
              padding: "10px 8px",
              scrollSnapType: "x proximity",
            }}
          >
            {/* Indicator */}
            <div
              ref={indicatorRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 4,
                height: 3,
                width: indicator.width || 0,
                left: indicator.left || 0,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(20,184,166,1) 0%, rgba(6,182,212,1) 50%, rgba(168,85,247,1) 100%)",
                boxShadow: "0 0 18px rgba(6,182,212,0.35)",
                transition: "left .25s ease, width .25s ease",
                pointerEvents: "none",
              }}
            />
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  onClick={() => {
                    setActiveTab(tab.id);
                    tabRefs.current[tab.id]?.scrollIntoView?.({
                      inline: "center",
                      block: "nearest",
                    });
                  }}
                  className="btn fw-semibold nav-chip me-2"
                  style={{
                    display: "inline-flex",      // ensure chip, never full width
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.6rem 1rem",
                    fontSize: ".92rem",
                    color: isActive ? "#052018" : COLORS.text,
                    borderRadius: 12,
                    border: `1px solid ${isActive ? "transparent" : COLORS.border}`,
                    background: isActive
                      ? `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accentHover})`
                      : "rgba(255,255,255,0.6)",
                    boxShadow: isActive ? `0 10px 24px -12px ${COLORS.glow}` : "none",
                    whiteSpace: "nowrap",
                    scrollSnapAlign: "center",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ONLY content scrolls */}
      <div
        style={{
          position: "absolute",
          top: heights.nav + MOBILE_GAP + heights.tabs,
          left: 0,
          right: 0,
          bottom: FOOTER_H,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
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
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* Fixed Footer Glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: FOOTER_H,
          background:
            "radial-gradient(70% 120% at 50% 0%, rgba(20,184,166,0.18), transparent 70%)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </div>
  );
}
