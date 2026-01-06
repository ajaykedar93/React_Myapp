import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import AddSitekharch from "./SiteKharch_add";
import SitekharchGet from "../WorkDetails/SitekharchnewGet";
import TotalSiteKharch from "./TotalSiteKharch";

export default function Worknewtab() {
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { key: "add", label: "SITE KHARCH", component: <AddSitekharch /> },
      { key: "get", label: "SITE KHARCH GET", component: <SitekharchGet /> },
      { key: "total", label: "TOTAL KHARCH", component: <TotalSiteKharch /> },
    ],
    []
  );

  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [activeKey]);

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <div style={styles.page} className="worknewtab-page">
      {/* ✅ GLOBAL RESET + SAFE AREA (NAVBAR TOP SPACE FIX) */}
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; }
        * { box-sizing: border-box; }

        :root{
          --safeTop: env(safe-area-inset-top, 0px);
          --safeBottom: env(safe-area-inset-bottom, 0px);

          /* ✅ Navbar TOP space (this is what you want) */
          --navTopGap: 10px;      /* ⭐ increase if you want more space */

          /* Heights */
          --navHDesktop: 85px;
          --navHMobile: 85px;     /* visible navbar height (without safe padding) */
        }

        @media (max-width: 768px){
          :root{
            --navTopGap: 48px;    /* ⭐ mobile वर थोडा जास्त space */
            --navHMobile: 80px;   /* visible bar height (content area) */
          }
        }

        /* Tabs scrollbar */
        .worknewtab-tabs-row::-webkit-scrollbar { height: 6px; }
        .worknewtab-tabs-row::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 999px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* FIXED HEADER */}
      <div style={styles.headerFixed}>
        {/* NAVBAR */}
        <div style={styles.navbar} className="worknewtab-navbar">
          <div style={styles.navLeft}>
            <div style={styles.title}>Work Details</div>
            <div style={styles.subtitle}>Expenses & Reports</div>
          </div>

          <button style={styles.dashboardBtn} onClick={() => navigate("/dashboard")}>
            Dashboard →
          </button>
        </div>

        {/* GAP BELOW NAVBAR */}
        <div style={styles.gapBetweenNavbarAndTabs} />

        {/* TABS */}
        <div style={styles.tabsBar}>
          <div style={styles.tabsRow} className="worknewtab-tabs-row">
            {tabs.map((tab) => {
              const active = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveKey(tab.key)}
                  style={{ ...styles.tabBtn, ...(active ? styles.tabActive : {}) }}
                  type="button"
                >
                  {tab.label}
                  {active && <motion.div layoutId="underline" style={styles.underline} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* GAP BELOW TABS */}
        <div style={styles.gapBelowTabs} />
      </div>

      {/* SCROLL AREA */}
      <div style={styles.scrollArea} className="worknewtab-scroll">
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.loaderOverlay}
            >
              <div style={styles.loaderBox}>
                <div style={styles.spinner}></div>
                <div style={styles.loadingText}>Loading...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={styles.content}
          >
            {activeTab?.component}
          </motion.div>
        )}
      </div>

      {/* ✅ ACTUAL LAYOUT CALC: navbar वर space + safe area */}
      <style>{`
        .worknewtab-navbar{
          /* ✅ navbar वर SPACE (touch nahi) */
          padding-top: calc(var(--safeTop) + var(--navTopGap));

          /* keep same side padding */
          padding-left: 12px;
          padding-right: 12px;

          /* ✅ total height includes safeTop + gap + visible height */
          height: calc(
            (max-width: 768px) ? (var(--navHMobile)) : (var(--navHDesktop))
          );
        }

        /* NOTE: CSS cannot do conditional like above,
           so we set heights with media queries below */
        .worknewtab-navbar{ height: calc(var(--navHDesktop) + var(--safeTop) + var(--navTopGap)); }
        @media (max-width: 768px){
          .worknewtab-navbar{ height: calc(var(--navHMobile) + var(--safeTop) + var(--navTopGap)); }
        }

        /* ✅ scroll area starts AFTER full header total */
        .worknewtab-scroll{
          top: calc(
            var(--safeTop) + var(--navTopGap) +
            (var(--navHDesktop)) +
            ${GAP_1}px +
            ${TABS_H}px +
            ${GAP_2}px
          );
          padding-bottom: var(--safeBottom);
        }

        @media (max-width: 768px){
          .worknewtab-scroll{
            top: calc(
              var(--safeTop) + var(--navTopGap) +
              (var(--navHMobile)) +
              ${GAP_1}px +
              ${TABS_H}px +
              ${GAP_2}px
            );
          }
        }
      `}</style>
    </div>
  );
}

/* ================= CONSTANTS ================= */
const GAP_1 = 6;
const TABS_H = 53;
const GAP_2 = 10;

/* ================= STYLES ================= */
const styles = {
  page: {
    height: "100vh",
    width: "100%",
    background: "#F8FAFF",
    overflow: "hidden",
  },

  headerFixed: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: "#F8FAFF",
  },

  navbar: {
    background: "linear-gradient(90deg, #2563EB, #06B6D4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#fff",
  },

  navLeft: {
    display: "flex",
    flexDirection: "column",
  },

  title: {
    fontSize: 16,
    fontWeight: 900,
  },

  subtitle: {
    fontSize: 11,
    fontWeight: 700,
    opacity: 0.95,
  },

  dashboardBtn: {
    background: "#fff",
    color: "#2563EB",
    border: "none",
    padding: "7px 12px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  },

  gapBetweenNavbarAndTabs: {
    height: GAP_1,
  },

  tabsBar: {
    height: TABS_H,
    background: "#fff",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
  },

  tabsRow: {
    width: "100%",
    display: "flex",
    gap: 8,
    padding: "8px",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },

  tabBtn: {
    border: "1px solid #E5E7EB",
    background: "#F1F5F9",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    cursor: "pointer",
    position: "relative",
  },

  tabActive: {
    background: "#2563EB",
    color: "#fff",
    borderColor: "#2563EB",
  },

  underline: {
    position: "absolute",
    bottom: -6,
    left: "25%",
    right: "25%",
    height: 3,
    background: "#22C55E",
    borderRadius: 999,
  },

  gapBelowTabs: {
    height: GAP_2,
  },

  scrollArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    background: "#F8FAFF",
  },

  content: {
    width: "100%",
  },

  loaderOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(255,255,255,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },

  loaderBox: {
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
  },

  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #DBEAFE",
    borderTopColor: "#2563EB",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },

  loadingText: {
    marginTop: 10,
    fontWeight: 900,
    fontSize: 14,
  },
};
