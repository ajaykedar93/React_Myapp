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
  { id: "addlist", label: "Act List" },
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

  useLayoutEffect(() => {
    const apply = () => setNavH(navRef.current?.offsetHeight || 72);
    apply();
    const ro = new ResizeObserver(apply);
    navRef.current && ro.observe(navRef.current);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  /* ==== Tabs height ==== */
  const tabsWrapRef = useRef(null);
  const [tabsH, setTabsH] = useState(56);

  useLayoutEffect(() => {
    const calc = () => setTabsH(tabsWrapRef.current?.offsetHeight || 56);
    calc();
    const ro = new ResizeObserver(calc);
    tabsWrapRef.current && ro.observe(tabsWrapRef.current);
    window.addEventListener("resize", calc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "calc(var(--vh, 1vh) * 100)",
        width: "100vw",
        overflow: "hidden",
        color: COLORS.text,
        background: `radial-gradient(1400px 700px at 0% -10%, ${COLORS.bgGradA}, transparent 60%),
        radial-gradient(1200px 600px at 100% -10%, ${COLORS.bgGradB}, transparent 60%),
        linear-gradient(180deg, ${COLORS.bgBaseTop} 0%, ${COLORS.bgBaseBottom} 100%)`,
      }}
    >
      {/* NAVBAR */}
      <nav ref={navRef} className="ut-nav">
        <div className="container-fluid d-flex justify-content-between align-items-center px-3">
          <h1 className="ut-title m-0">User Dashboard</h1>
          <button
            className="btn btn-warning fw-bold rounded-pill px-3"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div style={{ height: navH }} />

      {/* TABS */}
      <div ref={tabsWrapRef} className="ut-tabs-wrap">
        <div className="container">
          <div className="ut-tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`ut-chip ${activeTab === t.id ? "is-active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div
        style={{
          position: "absolute",
          top: navH + tabsH,
          bottom: FOOTER_H,
          left: 0,
          right: 0,
          overflowY: "auto",
        }}
      >
        <div className="container py-4">
          {activeTab === "investment" && <UserInvestment />}
          {activeTab === "password" && <PasswordManager />}
          {activeTab === "getpassword" && <GetPassword />}
          {activeTab === "favorite" && <Act_Favorite />}
          {activeTab === "actresslist" && <ShowActress />}
          {activeTab === "websites" && <WebsitesUrl />}
          {activeTab === "notes" && <Notes />}
          {activeTab === "addlist" && <Addlist />}
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        .ut-nav{
          position:fixed; top:0; left:0; right:0;
          background:linear-gradient(90deg,#2563eb,#38bdf8);
          padding:12px; z-index:1000;
        }
        .ut-title{font-weight:900;color:#000}

        .ut-tabs-wrap{
          position:fixed; left:0; right:0;
          background:#fff; border-bottom:1px solid #ddd;
          z-index:999;
        }

        .ut-tablist{
          display:flex;
          gap:8px;
          overflow-x:auto;
          padding:10px;
        }

        .ut-chip{
          padding:6px 14px;
          border-radius:999px;
          border:1px solid #cbd5e1;
          background:#f1f5f9;
          white-space:nowrap;
          font-size:14px;
        }

        .ut-chip.is-active{
          background:#22c55e;
          color:#fff;
        }

        /* ===== MOBILE: 3 TABS AT A TIME ===== */
        @media (max-width:576px){
          .ut-chip{
            flex:0 0 calc(100% / 3);
            text-align:center;
            font-size:12px;
            padding:6px 4px;
          }
        }
      `}</style>
    </div>
  );
}
