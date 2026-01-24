import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import AddSitekharch from "./SiteKharch_add";
import SitekharchGet from "../WorkDetails/SitekharchnewGet";
import TotalSiteKharch from "./TotalSiteKharch";
import Measure from "./Measure";
import AddInward from "./AddInward";
import InwardGet from "./InwardGet";

// ✅ NEW: View only inward page
import InwardViewOnly from "./InwardViewOnly";

export default function Worknewtab() {
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { key: "measure", label: "MEASURE", component: <Measure /> },
      { key: "add", label: "SITE KHARCH", component: <AddSitekharch /> },
      { key: "get", label: "SITE KHARCH GET", component: <SitekharchGet /> },
      { key: "total", label: "TOTAL KHARCH", component: <TotalSiteKharch /> },
      { key: "addinward", label: "ADD INWARD", component: <AddInward /> },
      { key: "getinward", label: "GET INWARD", component: <InwardGet /> },

      // ✅ NEW TAB
      { key: "inwardview", label: "INWARD VIEW ONLY", component: <InwardViewOnly /> },
    ],
    []
  );

  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [activeKey]);

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <div className="worknewtab-page" style={styles.page}>
      {/* ✅ GLOBAL CSS (FIX: make all child popups/dialogs always above navbar/tabs and never cut) */}
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; }
        * { box-sizing: border-box; }

        :root{
          --safeTop: env(safe-area-inset-top, 0px);
          --safeBottom: env(safe-area-inset-bottom, 0px);

          --navTopGap: 10px;
          --navHDesktop: 85px;
          --navHMobile: 85px;

          /* ✅ IMPORTANT: overlay top padding = navbar + tabs + gaps (auto controlled below) */
          --overlayTopPad: 140px;
        }

        @media (max-width: 768px){
          :root{
            --navTopGap: 48px;
            --navHMobile: 80px;
          }
        }

        /* ✅ IMPORTANT: make sure no parent creates new fixed stacking context */
        .worknewtab-page, .worknewtab-scroll, .worknewtab-contentWrap, .worknewtab-navbar, .worknewtab-tabs-row{
          transform: none !important;
          filter: none !important;
          perspective: none !important;
          will-change: auto !important;
          isolation: auto !important;
        }

        .worknewtab-page{
          position: relative;
          z-index: 0;
        }

        /* ✅ Global helper classes for ANY child modal/overlay/dialog */
        .globalModalOverlay{
          position: fixed !important;
          inset: 0 !important;
          z-index: 999999 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          padding:
            calc(16px + var(--overlayTopPad)) 16px
            calc(16px + var(--safeBottom)) 16px !important;
          overflow: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        @media (min-width: 769px){
          .globalModalOverlay{
            align-items: center !important;
            padding: 16px !important;
          }
        }

        .globalModalCard{
          width: 100% !important;
          max-width: 920px !important;
          max-height: calc(100vh - 32px - var(--overlayTopPad)) !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        .globalModalBodyScroll{
          overflow: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* Tabs scrollbar */
        .worknewtab-tabs-row::-webkit-scrollbar { height: 6px; }
        .worknewtab-tabs-row::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 999px;
        }

        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
      `}</style>

      {/* ✅ FIXED HEADER */}
      <div style={styles.headerFixed}>
        <div className="worknewtab-navbar" style={styles.navbar}>
          <div style={styles.navLeft}>
            <div style={styles.title}>Work Details</div>
            <div style={styles.subtitle}>Expenses & Reports</div>
          </div>

          <button style={styles.dashboardBtn} onClick={() => navigate("/dashboard")} type="button">
            Dashboard →
          </button>
        </div>

        <div style={styles.gapBetweenNavbarAndTabs} />

        <div style={styles.tabsBar}>
          <div style={styles.tabsRow} className="worknewtab-tabs-row">
            {tabs.map((tab) => {
              const active = tab.key === activeKey;
              const activeStyle = active ? { ...styles.tabActive, border: "1px solid #2563EB" } : {};

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveKey(tab.key)}
                  style={{ ...styles.tabBtn, ...activeStyle }}
                  type="button"
                >
                  {tab.label}
                  {active && <motion.div layoutId="underline" style={styles.underline} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.gapBelowTabs} />
      </div>

      {/* ✅ SCROLL AREA */}
      <div className="worknewtab-scroll" style={styles.scrollArea}>
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.loaderOverlay}>
              <div style={styles.loaderBox}>
                <div style={styles.spinner} />
                <div style={styles.loadingText}>Loading...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <motion.div
            key={activeKey}
            className="worknewtab-contentWrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={styles.content}
          >
            {activeTab?.component}
          </motion.div>
        )}
      </div>

      {/* ✅ ACTUAL LAYOUT CALC (also sets overlayTopPad automatically!) */}
      <style>{`
        .worknewtab-navbar{
          padding-top: calc(var(--safeTop) + var(--navTopGap));
          padding-left: 12px;
          padding-right: 12px;
          height: calc(var(--navHDesktop) + var(--safeTop) + var(--navTopGap));
        }

        @media (max-width: 768px){
          .worknewtab-navbar{
            height: calc(var(--navHMobile) + var(--safeTop) + var(--navTopGap));
          }
        }

        :root{
          --headerTotalDesktop: calc(
            var(--safeTop) + var(--navTopGap) + var(--navHDesktop) + ${GAP_1}px + ${TABS_H}px + ${GAP_2}px
          );
          --headerTotalMobile: calc(
            var(--safeTop) + var(--navTopGap) + var(--navHMobile) + ${GAP_1}px + ${TABS_H}px + ${GAP_2}px
          );
          --overlayTopPad: var(--headerTotalDesktop);
        }

        @media (max-width: 768px){
          :root{
            --overlayTopPad: var(--headerTotalMobile);
          }
        }

        .worknewtab-scroll{
          top: var(--headerTotalDesktop);
          padding-bottom: var(--safeBottom);
        }
        @media (max-width: 768px){
          .worknewtab-scroll{
            top: var(--headerTotalMobile);
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
    position: "relative",
  },

  headerFixed: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5000,
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

  title: { fontSize: 16, fontWeight: 900 },
  subtitle: { fontSize: 11, fontWeight: 700, opacity: 0.95 },

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

  gapBetweenNavbarAndTabs: { height: GAP_1 },

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

  gapBelowTabs: { height: GAP_2 },

  scrollArea: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    background: "#F8FAFF",
    zIndex: 1,
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
    zIndex: 6000,
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

  loadingText: { marginTop: 10, fontWeight: 900, fontSize: 14 },
};
