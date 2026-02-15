// src/pages/UserTabs.jsx (FINAL: same full page + NO CUT + correct spacing + clean tabs)
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import UserInvestment from "./UserInvestments";
import PasswordManager from "./PasswordManager";
import Act_Favorite from "./AddfevActress";
import ShowActress from "./ActressesPage";
import GetPassword from "./GetPassword";
import WebsitesUrl from "./WebsitesUrl";
import Addlist from "./FevActListNew";

const COLORS = {
  text: "#0f172a",
  bgGradA: "rgba(56,189,248,.24)",
  bgGradB: "rgba(168,85,247,.22)",
  bgBaseTop: "#f8fbff",
  bgBaseBottom: "#f6fff9",
};

const TABS = [
  { id: "investment", label: "Investment", activeColor: "#1d4ed8" },
  { id: "password", label: "Add Password", activeColor: "#6d28d9" },
  { id: "getpassword", label: "Get Password", activeColor: "#0284c7" },
  { id: "favorite", label: "Add Actress Favorite", activeColor: "#be185d" },
  { id: "actresslist", label: "Actress List", activeColor: "#c2410c" },
  { id: "websites", label: "Websites", activeColor: "#ed1e90" },
  { id: "addlist", label: "Act List", activeColor: "#ff9c12" },
];

export default function UserTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("investment");

  // Full height on mobile (address bar fix)
  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("resize", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("resize", setVh);
    };
  }, []);

  // Navbar height for correct spacing
  const navRef = useRef(null);
  const [navH, setNavH] = useState(72);

  useLayoutEffect(() => {
    const apply = () => setNavH(navRef.current?.offsetHeight || 72);
    apply();
    const ro = new ResizeObserver(apply);
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div className="ut-page">
      {/* NAVBAR (FULL WIDTH, PROFESSIONAL, NO CUT) */}
      <nav ref={navRef} className="ut-nav">
        <div className="ut-nav-inner">
          <div className="ut-head">
            <div className="ut-title" title="Professional Dashboard">
              Professional Dashboard
            </div>
            <div className="ut-subtitle d-none d-sm-block">
              Manage your data securely
            </div>
          </div>

          <button
            className="ut-dash-btn"
            onClick={() => navigate("/dashboard")}
            type="button"
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="ut-main" style={{ paddingTop: `${navH}px` }}>
        {/* Tabs bar */}
        <section className="ut-tabs-wrap">
          <div className="ut-tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`ut-chip ${activeTab === t.id ? "is-active" : ""}`}
                type="button"
                style={
                  activeTab === t.id
                    ? { background: t.activeColor, borderColor: t.activeColor }
                    : undefined
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="ut-tab-divider" />
        </section>

        {/* CONTENT (FULL WIDTH) */}
        <section className="ut-content-full">
          {activeTab === "investment" && <UserInvestment />}
          {activeTab === "password" && <PasswordManager />}
          {activeTab === "getpassword" && <GetPassword />}
          {activeTab === "favorite" && <Act_Favorite />}
          {activeTab === "actresslist" && <ShowActress />}
          {activeTab === "websites" && <WebsitesUrl />}

          {/* Scope wrapper so FevActListNew CSS won't break other pages */}
          {activeTab === "addlist" && (
            <div className="fev-scope">
              <Addlist />
            </div>
          )}
        </section>
      </main>

      <style>{`
        html, body { width: 100%; overflow-x: hidden; margin: 0; padding: 0; }

        :root{
          --safeTop: env(safe-area-inset-top, 0px);
          --safeBottom: env(safe-area-inset-bottom, 0px);
        }

        .ut-page{
          min-height: calc(var(--vh, 1vh) * 100);
          width: 100%;
          color: ${COLORS.text};
          padding-bottom: var(--safeBottom);
          background:
            radial-gradient(1400px 700px at 0% -10%, ${COLORS.bgGradA}, transparent 60%),
            radial-gradient(1200px 600px at 100% -10%, ${COLORS.bgGradB}, transparent 60%),
            linear-gradient(180deg, ${COLORS.bgBaseTop} 0%, ${COLORS.bgBaseBottom} 100%);
        }

        /* NAVBAR (EDGE TO EDGE) */
        .ut-nav{
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 1000;
          background: linear-gradient(90deg,#2563eb,#38bdf8);
          padding-top: calc(var(--safeTop) + 10px);
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(2,6,23,0.08);
          box-shadow: 0 10px 25px rgba(2,6,23,0.10);
        }

        /* ✅ minimal safe padding only (no big top margin hacks) */
        .ut-nav-inner{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:10px;
          width:100%;
          padding: 0 12px;
        }

        .ut-head{
          display:flex;
          flex-direction:column;
          min-width:0;
          flex: 1 1 auto;
        }

        /* ✅ FIX: remove padding-top:40px (that was causing layout/cut issues) */
        .ut-title{
          font-weight: 900;
          color: #0b1220;
          letter-spacing: .2px;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: clamp(16px, 2.2vw, 22px);
        }

        .ut-subtitle{
          font-size: 12px;
          color: rgba(15,23,42,0.75);
          margin-top: 2px;
          line-height: 1.2;
        }

        /* ✅ FIX: remove margin-top:40px (that was pushing button down) */
        .ut-dash-btn{
          flex: 0 0 auto;
          background: #fbbf24;
          border: 1px solid rgba(0,0,0,0.12);
          font-weight: 800;
          border-radius: 999px;
          padding: 10px 14px;
          white-space: nowrap;
          line-height: 1;
          font-size: 0.95rem;
          box-shadow: 0 6px 14px rgba(2,6,23,.12),
                      inset 0 1px 0 rgba(255,255,255,.4);
          transition: transform .12s ease, filter .12s ease;
        }
        .ut-dash-btn:hover{ transform: translateY(-1px); filter: brightness(.98); }
        .ut-dash-btn:active{ transform: translateY(0); }

        /* MAIN */
        .ut-main{
          width: 100%;
          padding-left: 0;
          padding-right: 0;
        }

        /* Tabs */
        .ut-tabs-wrap{
          width: 100%;
          margin: 0;
          padding: 0;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(6px);
        }

        .ut-tablist{
          display:flex;
          gap: 10px;
          overflow-x:auto;
          padding: 10px 10px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }
        .ut-tablist::-webkit-scrollbar{ height: 6px; }
        .ut-tablist::-webkit-scrollbar-thumb{ background: rgba(15,23,42,0.18); border-radius: 999px; }

        .ut-tab-divider{
          height: 1px;
          background: rgba(2,6,23,0.08);
          width: 100%;
        }

        .ut-chip{
          flex: 0 0 auto;
          min-width: 160px;
          max-width: 240px;
          border-radius: 14px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.15;
          text-align: center;
          white-space: normal;
          overflow-wrap: break-word;
        }

        .ut-chip.is-active{
          color: #fff;
          box-shadow:
            0 6px 16px rgba(0,0,0,0.15),
            inset 0 1px 0 rgba(255,255,255,0.25);
        }

        /* CONTENT */
        .ut-content-full{
          width: 100%;
          padding: 0;
          margin: 0;
        }

        /* MOBILE */
        @media (max-width: 576px){
          .ut-nav-inner{ padding: 0 10px; }
          .ut-dash-btn{
            padding: 8px 10px;
            font-size: 0.85rem;
          }
          .ut-chip{
            min-width: 52vw;
            max-width: 52vw;
            font-size: 12.5px;
            padding: 10px 10px;
          }
        }

        /* VERY SMALL */
        @media (max-width: 360px){
          .ut-chip{ min-width: 62vw; max-width: 62vw; }
        }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce){
          * { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; }
        }
      `}</style>
    </div>
  );
}
