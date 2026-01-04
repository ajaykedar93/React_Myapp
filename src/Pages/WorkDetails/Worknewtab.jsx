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

  // loader on tab change
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [activeKey]);

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <div style={styles.page}>
      {/* ================= NAVBAR ================= */}
      <div style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.title}>Work Details</div>
          <div style={styles.subtitle}>Expenses & Reports</div>
        </div>

        <button style={styles.dashboardBtn} onClick={() => navigate("/dashboard")}>
          Dashboard →
        </button>
      </div>

      {/* ================= TABS ================= */}
      <div style={styles.tabsBar}>
        <div style={styles.tabsRow}>
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

      {/* ================= CONTENT ================= */}
      <div style={styles.contentArea}>
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
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#F8FAFF",
    overflowX: "hidden",
  },

  /* Navbar */
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    height: 70, // 👈 small height (mobile friendly)
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
    lineHeight: 1.1,
  },

  title: {
    fontSize: 18,
    fontWeight: 800,
  },

  subtitle: {
    fontSize: 11,
    opacity: 0.9,
    fontWeight: 600,
  },

  dashboardBtn: {
    background: "#ffffff",
    color: "#2563EB",
    border: "none",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
  },

  /* Tabs */
  tabsBar: {
    position: "sticky",
    top: 6, // 👈 exactly navbar height
    zIndex: 90,
    background: "#ffffff",
    borderBottom: "1px solid #E5E7EB",
  },

  tabsRow: {
    display: "flex",
    gap: 8,
    padding: "8px",
    overflowX: "auto",
  },

  tabBtn: {
    position: "relative",
    border: "1px solid #E5E7EB",
    background: "#F1F5F9",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },

  tabActive: {
    background: "#2563EB",
    color: "#fff",
    borderColor: "#2563EB",
  },

  underline: {
    position: "absolute",
    bottom: -6,
    left: "20%",
    right: "20%",
    height: 3,
    borderRadius: 999,
    background: "#22C55E",
  },

  /* Content */
  contentArea: {
    position: "relative",
    width: "100%",
    minHeight: "calc(100vh - 112px)",
  },

  content: {
    width: "100%",
    padding: 0, // 👈 full width
  },

  /* Loader */
  loaderOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255,255,255,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },

  loaderBox: {
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    textAlign: "center",
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
    fontWeight: 800,
    fontSize: 14,
  },
};

/* Spinner animation */
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
