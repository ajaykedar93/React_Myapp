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
import Addlist from "./FevActListNew";

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
    navRef.current && ro.observe(navRef.current);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div className="ut-page">
      {/* NAVBAR */}
      <nav ref={navRef} className="ut-nav">
        <div className="container-fluid d-flex align-items-center justify-content-between gap-2 px-3">
          <div className="d-flex flex-column">
            <div className="ut-title">Professional Dashboard</div>
            <div className="ut-subtitle d-none d-sm-block">
              Manage your data securely
            </div>
          </div>

          <button
            className="btn ut-dash-btn"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main
        className="ut-main"
        style={{ paddingTop: `calc(${navH}px + var(--safeTop, 0px))` }}
      >
        {/* Tabs bar: keep little padding only here */}
        <section className="ut-tabs-wrap">
          <div className="container-fluid px-2 px-sm-3">
            <div className="ut-tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`ut-chip ${activeTab === t.id ? "is-active" : ""}`}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="ut-after-tabs-gap" />

        {/* CONTENT: FULL WIDTH, NO LEFT/RIGHT PADDING */}
        <section className="ut-content-full">
          {activeTab === "investment" && <UserInvestment />}
          {activeTab === "password" && <PasswordManager />}
          {activeTab === "getpassword" && <GetPassword />}
          {activeTab === "favorite" && <Act_Favorite />}
          {activeTab === "actresslist" && <ShowActress />}
          {activeTab === "websites" && <WebsitesUrl />}
          {activeTab === "notes" && <Notes />}
          {activeTab === "addlist" && <Addlist />}
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

        /* NAVBAR: add little top space */
        .ut-nav{
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 1000;
          background: linear-gradient(90deg,#2563eb,#38bdf8);
          padding-top: calc(var(--safeTop) + 14px);  /* little more top space */
          padding-bottom: 10px;
        }

        .ut-title{
          font-weight: 900;
          color: #0b1220;
          letter-spacing: .2px;
          line-height: 1.1;
        }

        .ut-subtitle{
          font-size: 12px;
          color: rgba(15,23,42,0.75);
          margin-top: 2px;
        }

        .ut-dash-btn{
          background: #fbbf24;
          border: 1px solid rgba(0,0,0,0.12);
          font-weight: 800;
          border-radius: 999px;
          padding: 10px 16px;
          white-space: nowrap;
        }

        .ut-tabs-wrap{
          margin-top: 12px;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(2,6,23,0.08);
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(2,6,23,0.08);
        }

        .ut-tablist{
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 10px;
          -webkit-overflow-scrolling: touch;
        }

        .ut-tablist::-webkit-scrollbar{ height: 6px; }
        .ut-tablist::-webkit-scrollbar-thumb{ background: rgba(15,23,42,0.18); border-radius: 999px; }

        .ut-chip{
          flex: 0 0 auto;
          min-width: 140px;
          max-width: 220px;

          border-radius: 14px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;

          padding: 10px 12px;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.15;

          /* show full text (no cut) */
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
          word-break: keep-all;
          overflow-wrap: break-word;
          text-align: center;
        }

        .ut-chip.is-active{
          background: #22c55e;
          color: #fff;
          border-color: #16a34a;
        }

        .ut-after-tabs-gap{ height: 10px; }

        /* FULL SCREEN CONTENT */
        .ut-content-full{
          width: 100%;
          padding: 0;       /* no left/right padding */
          margin: 0;
        }

        /* MOBILE */
        @media (max-width: 576px){
          .ut-title{ font-size: 16px; }
          .ut-dash-btn{
            padding: 6px 10px;
            font-size: 12px;
          }

          .ut-chip{
            min-width: 46vw;
            max-width: 46vw;
            font-size: 12px;
            padding: 10px 8px;
          }
        }

        /* TABLET */
        @media (min-width: 577px) and (max-width: 992px){
          .ut-title{ font-size: 20px; }
        }

        /* DESKTOP */
        @media (min-width: 993px){
          .ut-title{ font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
