// src/pages/WorkDetails.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { FaClipboardList, FaInbox, FaHammer, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import AddDpr from "./AddDpr";
import AddInward from "./AddInward";
import AddSitekharch from "./SiteKharch_add";
import SitekharchGet from "../WorkDetails/SitekharchnewGet";
import TotalSiteKharch from "./TotalSiteKharch";
import DprGet from "./DprGet";
import InwardGet from "./InwardGet";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

const API_BASE =
  import.meta?.env?.VITE_API_BASE ?? "https://express-backend-myapp.onrender.com/api";

const spring = { type: "spring", stiffness: 280, damping: 22, mass: 0.5 };

/* ---------- Tab Button ---------- */
const TabButton = ({ active, color, icon, label, onClick, onKeyDown }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    whileHover={{ y: -2 }}
    onClick={onClick}
    onKeyDown={onKeyDown}
    role="tab"
    aria-pressed={active}
    tabIndex={0}
    className="wd-tab-btn d-inline-flex align-items-center gap-2 position-relative"
    style={{
      borderRadius: 12,
      padding: "10px 14px",
      border: active ? `1px solid ${color.border}` : "1px solid #e2e8f0",
      background: active ? color.bgActive : "#ffffff",
      color: active ? color.fgActive : "#374151",
      boxShadow: active ? `0 10px 26px ${color.shadow}` : "0 1px 6px rgba(0,0,0,.06)",
      fontWeight: 700,
      transition: "all .25s ease",
      minHeight: 44,
      minWidth: 120,
      whiteSpace: "nowrap",
      position: "relative",
    }}
  >
    {active && (
      <motion.span
        layoutId="tab-glow"
        transition={spring}
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: 14,
          background: color.glow,
          filter: "blur(8px)",
          zIndex: -1,
        }}
      />
    )}
    <span style={{ display: "grid", placeItems: "center", fontSize: 16 }}>{icon}</span>
    <span className="wd-tab-label">{label}</span>
    {active && (
      <motion.span
        layoutId="tab-underline"
        transition={spring}
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: -5,
          height: 3,
          borderRadius: 99,
          background: color.underline,
        }}
      />
    )}
  </motion.button>
);

/* ---------- Toast ---------- */
const Toast = ({ open, type, msg, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`position-fixed bottom-0 start-50 translate-middle-x mb-3 px-4 py-2 rounded-3 ${
          type === "error" ? "bg-danger" : "bg-success"
        } text-white shadow-lg`}
        style={{ zIndex: 2000, fontWeight: 500, cursor: "pointer" }}
        onClick={onClose}
      >
        {msg}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ---------- Busy Overlay ---------- */
const BusyOverlay = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ backdropFilter: "blur(3px)", background: "rgba(0,0,0,0.35)", zIndex: 1999 }}
      >
        <div className="spinner-border text-light" role="status" />
      </motion.div>
    )}
  </AnimatePresence>
);

export default function WorkDetails() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("DPR");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
  const toastTimer = useRef(null);

  const showToast = useCallback((type, msg) => {
    setToast({ open: true, type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, open: false })), 2600);
  }, []);

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const palette = {
    DPR: {
      bgActive: "linear-gradient(135deg,#fef3c7,#fde68a)",
      fgActive: "#78350f",
      border: "#facc15",
      shadow: "rgba(234,179,8,.25)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(251,191,36,.35), transparent)",
      underline: "#ca8a04",
    },
    INWARD: {
      bgActive: "linear-gradient(135deg,#fee2e2,#fecaca)",
      fgActive: "#7f1d1d",
      border: "#f87171",
      shadow: "rgba(239,68,68,.25)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(254,202,202,.45), transparent)",
      underline: "#dc2626",
    },
    "SITE KHARCH": {
      bgActive: "linear-gradient(135deg,#e0f2fe,#bae6fd)",
      fgActive: "#0c4a6e",
      border: "#60a5fa",
      shadow: "rgba(37,99,235,.25)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(147,197,253,.35), transparent)",
      underline: "#0284c7",
    },
    "SITE KHARCH GET": {
      bgActive: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
      fgActive: "#312e81",
      border: "#6366f1",
      shadow: "rgba(99,102,241,.22)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(99,102,241,.35), transparent)",
      underline: "#4f46e5",
    },
    "TOTAL KHARCH": {
      bgActive: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
      fgActive: "#064e3b",
      border: "#4ade80",
      shadow: "rgba(22,163,74,.25)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(134,239,172,.35), transparent)",
      underline: "#16a34a",
    },
    "DPR GET": {
      bgActive: "linear-gradient(135deg,#fff7ed,#fed7aa)",
      fgActive: "#7c2d12",
      border: "#fb923c",
      shadow: "rgba(251,146,60,.25)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(253,186,116,.35), transparent)",
      underline: "#ea580c",
    },
    "INWARD GET": {
      bgActive: "linear-gradient(135deg,#fce7f3,#fbcfe8)",
      fgActive: "#831843",
      border: "#f472b6",
      shadow: "rgba(236,72,153,.25)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(244,114,182,.35), transparent)",
      underline: "#db2777",
    },
  };

  const tabs = useMemo(
    () => [
      { name: "DPR", icon: <FaClipboardList /> },
      { name: "INWARD", icon: <FaInbox /> },
      { name: "SITE KHARCH", icon: <FaHammer /> },
      { name: "SITE KHARCH GET", icon: <FaEye /> },
      { name: "TOTAL KHARCH", icon: <FaHammer /> },
      { name: "DPR GET", icon: <FaEye /> },
      { name: "INWARD GET", icon: <FaEye /> },
    ],
    []
  );

  const renderContent = () => {
    switch (activeTab) {
      case "DPR":
        return <AddDpr />;
      case "INWARD":
        return <AddInward />;
      case "SITE KHARCH":
        return <AddSitekharch />;
      case "SITE KHARCH GET":
        return <SitekharchGet />;
      case "TOTAL KHARCH":
        return <TotalSiteKharch />;
      case "DPR GET":
        return <DprGet />;
      case "INWARD GET":
        return <InwardGet />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        :root { --nav-h: 60px; --nav-offset: 0px; }
        body, html { background: #fafafa; overflow-x: hidden; }
        .wd-app { height: 100dvh; overflow: hidden; background: #fff; }

        .wd-nav {
          position: fixed;
          top: var(--nav-offset);
          left: 0; right: 0;
          z-index: 999;
          background: linear-gradient(90deg, #fb7185, #f97316, #facc15);
          color: white;
          height: var(--nav-h);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          box-shadow: 0 10px 30px rgba(249,115,22,0.3);
        }

        .wd-main {
          /* only content scrolls; account for navbar height + mobile offset */
          height: calc(100dvh - var(--nav-h) - var(--nav-offset));
          overflow-y: auto;
          padding: 16px;
          background: #fefefe;
          margin-top: calc(var(--nav-h) + var(--nav-offset));
        }

        .wd-tab-label { font-size: 15px; font-weight: 600; letter-spacing: .3px; }
        .wd-content-card {
          background: #fff; border-radius: 14px; padding: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,.06);
        }

        /* tab row scrollable */
        .wd-tabs-row {
          display: flex; flex-wrap: nowrap; gap: 8px; overflow-x: auto; scrollbar-width: none;
        }
        .wd-tabs-row::-webkit-scrollbar { display: none; }

        /* ---------- MOBILE ONLY: add small gap above navbar ---------- */
        @media (max-width: 576px) {
          :root { --nav-offset: 8px; }            /* tiny space above navbar */
          .wd-nav { left: 8px; right: 8px; border-radius: 12px; } /* optional nice inset */
          .wd-tab-btn {
            min-width: 92px; padding: 8px 8px; flex-direction: column; gap: 4px;
            align-items: center; justify-content: center; text-align: center;
          }
          .wd-tab-label { display: block; font-size: 11px; line-height: 1.1; white-space: normal; }
        }
      `}</style>

      <div className="wd-app">
        {/* Navbar */}
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="wd-nav"
        >
          <h5 className="m-0 fw-bold">📋 Work Details</h5>
          <button
            className="btn btn-light btn-sm fw-bold"
            style={{ borderRadius: 8, color: "#fb923c" }}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </motion.div>

        {/* Main */}
        <main className="wd-main">
          <LayoutGroup>
            <div className="wd-tabs-row mb-3 pb-2">
              {tabs.map(({ name, icon }) => (
                <TabButton
                  key={name}
                  active={activeTab === name}
                  color={palette[name] || palette.DPR}
                  icon={icon}
                  label={name}
                  onClick={() => setActiveTab(name)}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="wd-content-card"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
        </main>
      </div>

      {/* Busy & Toast */}
      <BusyOverlay show={busy} />
      <Toast
        open={toast.open}
        type={toast.type}
        msg={toast.msg}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </>
  );
}
