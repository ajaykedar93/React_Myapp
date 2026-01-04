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
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [activeKey]);

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <div style={styles.page}>
      {/* ✅ Hard reset for mobile spacing issues */}
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ✅ Fixed header (navbar + gap + tabs + gap) */}
      <div style={styles.headerFixed}>
        {/* NAVBAR */}
        <div style={styles.navbar}>
          <div style={styles.navLeft}>
            <div style={styles.title}>Work Details</div>
            <div style={styles.subtitle}>Expenses & Reports</div>
          </div>

          <button style={styles.dashboardBtn} onClick={() => navigate("/dashboard")}>
            Dashboard →
          </button>
        </div>

        {/* ✅ Small space BELOW navbar (so it won't touch tabs) */}
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
                  style={{
                    ...styles.tabBtn,
                    ...(active ? styles.tabActive : {}),
                  }}
                >
                  {tab.label}
                  {active && <motion.div layoutId="underline" style={styles.underline} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ Small space BELOW tabs (so it won't touch page content) */}
        <div style={styles.gapBelowTabs} />
      </div>

      {/* ✅ Only this area scrolls */}
      <div style={styles.scrollArea}>
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

      {/* scrollbar style */}
      <style>{`
        .worknewtab-tabs-row::-webkit-scrollbar { height: 8px; }
        .worknewtab-tabs-row::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 999px; }
        .worknewtab-tabs-row::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 999px; }
      `}</style>

      {/* spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const NAV_H = 85;          // ✅ navbar little taller (more top space)
const GAP_1 = 6;           // ✅ gap between navbar and tabs
const TABS_H = 53;         // tabs height
const GAP_2 = 10;          // ✅ gap below tabs before page content

const HEADER_TOTAL = NAV_H + GAP_1 + TABS_H + GAP_2;

const styles = {
  page: {
    height: "100vh",
    width: "100%",
    background: "#F8FAFF",
    overflow: "hidden", // ✅ stop page scroll, only scrollArea scrolls
  },

  headerFixed: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: "#F8FAFF",
  },

  /* Navbar */
  navbar: {
    height: NAV_H,
    background: "linear-gradient(90deg, #2563EB, #06B6D4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    color: "#fff",
  },

  navLeft: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.05,
  },

  title: {
    fontSize: 16.5,
    fontWeight: 900,
  },

  subtitle: {
    fontSize: 10.8,
    opacity: 0.95,
    fontWeight: 700,
    marginTop: 2,
  },

  dashboardBtn: {
    background: "#ffffff",
    color: "#2563EB",
    border: "none",
    padding: "7px 12px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12.5,
  },

  gapBetweenNavbarAndTabs: {
    height: GAP_1,
    background: "#F8FAFF",
  },

  /* Tabs */
  tabsBar: {
    height: TABS_H,
    background: "#ffffff",
    borderTop: "1px solid #EAF0FF",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
  },

  tabsRow: {
    width: "100%",
    display: "flex",
    gap: 8,
    padding: "8px 8px",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
  },

  tabBtn: {
    position: "relative",
    border: "1px solid #E5E7EB",
    background: "#F1F5F9",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
    cursor: "pointer",
    flex: "0 0 auto",
  },

  tabActive: {
    background: "#2563EB",
    color: "#fff",
    borderColor: "#2563EB",
  },

  underline: {
    position: "absolute",
    bottom: -6,
    left: "22%",
    right: "22%",
    height: 3,
    borderRadius: 999,
    background: "#22C55E",
  },

  gapBelowTabs: {
    height: GAP_2,
    background: "#F8FAFF",
  },

  /* Scroll only below header */
  scrollArea: {
    position: "absolute",
    top: HEADER_TOTAL,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    padding: 0,
    margin: 0,
    background: "#F8FAFF",
  },

  content: {
    width: "100%",
    padding: 0,
    margin: 0,
  },

  /* Loader */
  loaderOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(255,255,255,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },

  loaderBox: {
    background: "#fff",
    padding: 18,
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    textAlign: "center",
    minWidth: 160,
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
    color: "#0F172A",
  },
};
