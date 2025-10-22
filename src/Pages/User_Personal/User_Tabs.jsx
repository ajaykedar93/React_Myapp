// src/pages/UserTabs.jsx
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import UserInvestment from "./UserInvestments";
import PasswordManager from "./PasswordManager";
import Act_Favorite from "./Act_Favorite";
import ShowActress from "./ShowActress";
import GetPassword from "./GetPassword";
import Notes from "./Notes";
import WebsitesUrl from "./WebsitesUrl"; // ✅ NEW: Websites page

// 🌞 Bright palette
const COLORS = {
  text: "#0b1221",
  textMuted: "#4b5563",
  surface: "rgba(255, 255, 255, 0.85)",
  surfaceSolid: "#ffffff",
  border: "rgba(17, 24, 39, 0.12)",
  softShadow: "0 8px 32px rgba(31, 41, 55, 0.08)",
  accent: "#14b8a6",
  accentHover: "#06b6d4",
  glow: "rgba(20, 184, 166, 0.35)",
  gradientA: "#38bdf8",
  gradientB: "#84cc16",
  gradientC: "#a78bfa",
};

// ✅ Tabs (added “websites” + kept “notes”)
const TABS = [
  { id: "investment", label: "Investment" },
  { id: "password", label: "Add Password" },
  { id: "getpassword", label: "Get Password" },
  { id: "favorite", label: "Add Actress Favorite" },
  { id: "actresslist", label: "Actress List" },
  { id: "websites", label: "Websites" },        // ✅ NEW TAB
  { id: "notes", label: "Notes" },              // existing
];

function OverlayPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export default function UserTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("investment");

  const tabListRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const [busy, setBusy] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState({ type: "", text: "", show: false });

  const showCenterMsg = (type, text, ms = 1800) => {
    setOverlayMsg({ type, text, show: true });
    clearTimeout(showCenterMsg._t);
    showCenterMsg._t = setTimeout(() => {
      setOverlayMsg({ type: "", text: "", show: false });
    }, ms);
  };
  const closeCenterMsg = () => setOverlayMsg({ type: "", text: "", show: false });

  // Scroll lock when overlays open
  useEffect(() => {
    const hasOverlay = busy || overlayMsg.show;
    document.body.style.overflow = hasOverlay ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [busy, overlayMsg.show]);

  // Add dynamic styles once
  useEffect(() => {
    const id = "user-tabs-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px);} to {opacity: 1; transform: translateY(0);} }
      @keyframes subtlePulse {0%{box-shadow:0 0 0 0 ${COLORS.glow};}100%{box-shadow:0 0 0 12px rgba(0,0,0,0);} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes scaleIn { from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1} }

      .glass {backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);background:${COLORS.surface};border:1px solid ${COLORS.border};}
      .focus-ring:focus-visible {outline:2px solid ${COLORS.accent};outline-offset:2px;border-radius:10px;}
      .btn-soft {transition:transform .15s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease;}
      .btn-soft:active {transform:translateY(1px) scale(0.995);}
      .nav-chip {position:relative;overflow:hidden;}
      .nav-chip::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 0%,rgba(0,0,0,.05) 40%,transparent 70%);transform:translateX(-100%);transition:transform .5s ease;}
      .nav-chip:hover::after{transform:translateX(0%);}
    `;
    document.head.appendChild(style);
  }, []);

  // Sliding indicator
  const updateIndicator = () => {
    const el = tabRefs.current[activeTab];
    const bar = tabListRef.current;
    if (!el || !bar) return;
    const { left: barLeft } = bar.getBoundingClientRect();
    const { left, width } = el.getBoundingClientRect();
    setIndicator({ left: left - barLeft, width });
  };

  useLayoutEffect(() => {
    updateIndicator();
    const obs = new ResizeObserver(updateIndicator);
    if (tabListRef.current) obs.observe(tabListRef.current);
    window.addEventListener("resize", updateIndicator);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab]);

  const changeTab = (id) => {
    setActiveTab(id);
    tabRefs.current[id]?.focus?.();
  };

  const gradientText = useMemo(
    () => ({
      backgroundImage: `linear-gradient(90deg, ${COLORS.gradientA}, ${COLORS.gradientB}, ${COLORS.gradientC})`,
      WebkitBackgroundClip: "text",
      color: "transparent",
    }),
    []
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        color: COLORS.text,
        background:
          "radial-gradient(1400px 700px at 0% -10%, rgba(56,189,248,.25), transparent 60%), " +
          "radial-gradient(1200px 600px at 100% -10%, rgba(132,204,22,.22), transparent 60%), " +
          "linear-gradient(180deg, #fff 0%, #f7fbff 40%, #f6fff7 100%)",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* Navbar */}
      <nav
        className="d-flex justify-content-between align-items-center px-4 py-3 sticky-top glass"
        style={{ color: COLORS.text, zIndex: 20, boxShadow: COLORS.softShadow }}
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
          className="btn btn-soft fw-semibold"
          onClick={() => {
            // 🚀 Instant navigation (no delay)
            navigate("/dashboard");
          }}
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

      {/* Tabs */}
      <div
        className="container"
        style={{ animation: "fadeInUp .35s ease both", maxWidth: 1180 }}
      >
        <div
          className="mt-4 mb-4 p-2 glass rounded-4"
          style={{ boxShadow: COLORS.softShadow }}
        >
          <div
            className="d-flex justify-content-center flex-wrap position-relative px-2 py-2"
            ref={tabListRef}
            style={{ gap: 10 }}
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
              }}
            />
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  onClick={() => changeTab(tab.id)}
                  className="btn btn-soft fw-semibold nav-chip"
                  style={{
                    padding: "0.6rem 1rem",
                    fontSize: ".92rem",
                    color: isActive ? "#052018" : COLORS.text,
                    borderRadius: 12,
                    border: `1px solid ${
                      isActive ? "transparent" : COLORS.border
                    }`,
                    background: isActive
                      ? `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accentHover})`
                      : "rgba(255,255,255,0.6)",
                    boxShadow: isActive
                      ? `0 10px 24px -12px ${COLORS.glow}`
                      : "none",
                    transition: "all .25s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container pb-5" style={{ maxWidth: 1180 }}>
        <div
          className="p-3 p-md-4 rounded-4 glass"
          style={{ border: `1px solid ${COLORS.border}`, boxShadow: COLORS.softShadow }}
        >
          {activeTab === "investment" && <UserInvestment />}
          {activeTab === "password" && <PasswordManager />}
          {activeTab === "getpassword" && <GetPassword />}
          {activeTab === "favorite" && <Act_Favorite />}
          {activeTab === "actresslist" && <ShowActress />}
          {activeTab === "websites" && <WebsitesUrl />}{/* ✅ NEW RENDER */}
          {activeTab === "notes" && <Notes />}
        </div>
      </div>

      {/* Footer Glow */}
      <div
        aria-hidden="true"
        style={{
          height: 140,
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(20,184,166,0.18), transparent 70%)",
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}
