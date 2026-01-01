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
  bgGradA: "rgba(56,189,248,.24)",
  bgGradB: "rgba(168,85,247,.22)",
  bgBaseTop: "#f8fbff",
  bgBaseBottom: "#f6fff9",
};

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

  return (
    <div className="ut-page">
      {/* NAVBAR (fixed only) */}
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

      {/* Everything below navbar (scrolls normally) */}
      <main className="ut-main" style={{ paddingTop: navH }}>
        {/* TABS (NOT fixed) */}
        <section className="ut-tabs-wrap">
          <div className="container ut-container-pad">
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
        </section>

        {/* small gap after tabs */}
        <div className="ut-after-tabs-gap" />

        {/* CONTENT */}
        <section className="ut-content">
          <div className="container ut-container-pad py-3">
            {activeTab === "investment" && <UserInvestment />}
            {activeTab === "password" && <PasswordManager />}
            {activeTab === "getpassword" && <GetPassword />}
            {activeTab === "favorite" && <Act_Favorite />}
            {activeTab === "actresslist" && <ShowActress />}
            {activeTab === "websites" && <WebsitesUrl />}
            {activeTab === "notes" && <Notes />}
            {activeTab === "addlist" && <Addlist />}
          </div>
        </section>
      </main>

      {/* STYLES */}
      <style>{`
        /* Prevent right-side cut / horizontal scroll */
        html, body { width: 100%; overflow-x: hidden; }

        .ut-page{
          min-height: calc(var(--vh, 1vh) * 100);
          width: 100%;
          color: ${COLORS.text};
          background:
            radial-gradient(1400px 700px at 0% -10%, ${COLORS.bgGradA}, transparent 60%),
            radial-gradient(1200px 600px at 100% -10%, ${COLORS.bgGradB}, transparent 60%),
            linear-gradient(180deg, ${COLORS.bgBaseTop} 0%, ${COLORS.bgBaseBottom} 100%);
        }

        .ut-nav{
          position: fixed; top: 0; left: 0; right: 0;
          background: linear-gradient(90deg,#2563eb,#38bdf8);
          padding: 12px;
          z-index: 1000;
        }
        .ut-title{ font-weight: 900; color: #000; }

        /* keep clean spacing both sides */
        .ut-container-pad { padding-left: 12px; padding-right: 12px; }

        /* Tabs are NOT fixed now */
        .ut-tabs-wrap{
          margin-top: 10px;              /* not touching navbar */
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(2,6,23,0.08);
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(2,6,23,0.08);
        }

        .ut-tablist{
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 10px;
          -webkit-overflow-scrolling: touch;
        }
        .ut-tablist::-webkit-scrollbar{ height: 6px; }
        .ut-tablist::-webkit-scrollbar-thumb{ background: rgba(15,23,42,0.18); border-radius: 999px; }

        .ut-chip{
          flex: 0 0 auto;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          white-space: nowrap;
          font-size: 14px;
        }
        .ut-chip.is-active{
          background: #22c55e;
          color: #fff;
          border-color: #16a34a;
        }

        .ut-after-tabs-gap{ height: 10px; }

        /* Mobile: 3 chips visible at a time (still scrollable) */
        @media (max-width: 576px){
          .ut-chip{
            flex: 0 0 calc(100% / 3);
            text-align: center;
            font-size: 12px;
            padding: 8px 6px;
          }
        }
      `}</style>
    </div>
  );
}
