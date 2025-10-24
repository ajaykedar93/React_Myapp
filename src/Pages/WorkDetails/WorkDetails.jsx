import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { FaClipboardList, FaInbox, FaHammer, FaPlus, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom"; // ✅ added

import AddDpr from "./AddDpr";
import AddInward from "./AddInward";
import AddSitekharch from "./AddSitekharch";
import SitekharchGet from "./Sitekharchget";
import TotalSiteKharch from "./TotalSiteKharch";
import DprGet from "./DprGet";
import InwardGet from "./InwardGet";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

/**
 * Pro version notes
 * - Crisp, modern gradients & elevated cards
 * - Mobile-first responsive layout, sticky/scrollable tabs on small screens
 * - Smooth tab switch animations with Framer Motion LayoutGroup + layoutId
 * - Accessible keyboard navigation for tabs (←/→, Home/End)
 * - Safer toasts, busy overlay, and confirm dialog with motion
 * - Non-blocking fetch, resilient error UI
 */

const API_BASE = import.meta?.env?.VITE_API_BASE ?? "https://express-backend-myapp.onrender.com/api";

// ---------- Small helpers ---------- //
const cleanName = (s) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "");

const spring = { type: "spring", stiffness: 400, damping: 30, mass: 0.6 };

const TabButton = ({ active, color, icon, label, onClick, onKeyDown }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="nav-link d-flex align-items-center gap-2 position-relative"
      aria-pressed={active}
      role="tab"
      tabIndex={0}
      style={{
        borderRadius: 12,
        padding: "10px 16px",
        border: active ? `1px solid ${color.border}` : "1px solid #e5e7eb",
        background: active ? color.bgActive : "#ffffff",
        color: active ? color.fgActive : "#334155",
        boxShadow: active ? `0 10px 26px ${color.shadow}` : "0 1px 6px rgba(2,6,23,.06)",
        fontWeight: 700,
        transition: "all .2s ease",
        outline: "none",
        minHeight: 44,
      }}
    >
      {active && (
        <motion.span
          layoutId="tab-glow"
          transition={spring}
          aria-hidden
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: 14,
            background: color.glow,
            filter: "blur(10px)",
            zIndex: -1,
          }}
        />
      )}
      <span style={{ display: "grid", placeItems: "center", fontSize: 16 }}>{icon}</span>
      <span style={{ letterSpacing: 0.2, whiteSpace: "nowrap" }}>{label}</span>
      {active && (
        <motion.span
          layoutId="tab-underline"
          transition={spring}
          aria-hidden
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: -6,
            height: 3,
            borderRadius: 999,
            background: color.underline,
          }}
        />
      )}
    </motion.button>
  );
};

const Toast = ({ open, type, msg, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        role="status"
        aria-live="polite"
        className={`position-fixed bottom-0 start-50 translate-middle-x mb-3 px-3 py-2 rounded-3 ${
          type === "error" ? "bg-danger text-white" : "bg-success text-white"
        }`}
        style={{ zIndex: 2000, boxShadow: "0 12px 40px rgba(2,6,23,.35)", cursor: "pointer" }}
        onClick={onClose}
      >
        {msg}
      </motion.div>
    )}
  </AnimatePresence>
);

const BusyOverlay = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ backdropFilter: "blur(3px)", background: "rgba(2,6,23,.18)", zIndex: 1999 }}
      >
        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function WorkDetails() {
  const [activeTab, setActiveTab] = useState("DPR");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // category tab state
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });

  // toast state with a ref to clear timeout on unmount
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
  const toastTimer = useRef(null);
  const showToast = useCallback((type, msg) => {
    setToast({ open: true, type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, open: false })), 2600);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/workcategory`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditName(name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const addCategory = async (e) => {
    e?.preventDefault?.();
    const name = cleanName(newCategory);
    if (!name) return showToast("error", "Enter a category name.");
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/workcategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Add failed");
      setNewCategory("");
      setCategories((prev) => [...prev, data]);
      showToast("success", "Category added.");
    } catch (e) {
      showToast("error", String(e.message).includes("exists") ? "Category exists" : "Could not add category.");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id) => {
    const name = cleanName(editName);
    if (!name) return showToast("error", "Enter a category name.");
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/workcategory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      cancelEdit();
      showToast("success", "Category updated.");
    } catch (e) {
      showToast("error", String(e.message).includes("exists") ? "Category exists" : "Could not update category.");
    } finally {
      setBusy(false);
    }
  };

  const openDelete = (id, name) => setConfirm({ open: true, id, name });
  const closeDelete = () => setConfirm({ open: false, id: null, name: "" });

  const doDelete = async () => {
    const { id } = confirm;
    if (!id) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/workcategory/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast("success", "Category deleted.");
    } catch (e) {
      showToast("error", "Could not delete category.");
    } finally {
      setBusy(false);
      closeDelete();
    }
  };

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.id - b.id), [categories]);

  const palette = {
    DPR: {
      bgActive: "linear-gradient(135deg,#DCFCE7,#bbf7d0)",
      fgActive: "#064e3b",
      border: "#86efac",
      shadow: "rgba(22,163,74,.30)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(134,239,172,.35), transparent)",
      underline: "#16a34a",
    },
    INWARD: {
      bgActive: "linear-gradient(135deg,#E0E7FF,#c7d2fe)",
      fgActive: "#1e3a8a",
      border: "#a5b4fc",
      shadow: "rgba(59,130,246,.28)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(147,197,253,.35), transparent)",
      underline: "#3b82f6",
    },
    "SITE KHARCH": {
      bgActive: "linear-gradient(135deg,#FEF9C3,#fde68a)",
      fgActive: "#713f12",
      border: "#fcd34d",
      shadow: "rgba(234,179,8,.32)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(251,191,36,.35), transparent)",
      underline: "#f59e0b",
    },
    CATEGORY: {
      bgActive: "linear-gradient(135deg,#FDE2E4,#fecdd3)",
      fgActive: "#7f1d1d",
      border: "#fca5a5",
      shadow: "rgba(239,68,68,.28)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(254,205,211,.42), transparent)",
      underline: "#ef4444",
    },
    "TOTAL KHARCH": {
      bgActive: "linear-gradient(135deg,#D1FAE5,#99f6e4)",
      fgActive: "#065f46",
      border: "#6ee7b7",
      shadow: "rgba(20,184,166,.30)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(110,231,183,.40), transparent)",
      underline: "#10b981",
    },
    "SiteKharch GET": {
      bgActive: "linear-gradient(135deg,#F1F5F9,#e2e8f0)",
      fgActive: "#0f172a",
      border: "#cbd5e1",
      shadow: "rgba(15,23,42,.22)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(148,163,184,.35), transparent)",
      underline: "#64748b",
    },
    "DPR GET": {
      bgActive: "linear-gradient(135deg,#FAE8FF,#f5d0fe)",
      fgActive: "#4a044e",
      border: "#f0abfc",
      shadow: "rgba(217,70,239,.30)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(240,171,252,.40), transparent)",
      underline: "#a21caf",
    },
    "INWARD GET": {
      bgActive: "linear-gradient(135deg,#E0F2FE,#bae6fd)",
      fgActive: "#0c4a6e",
      border: "#93c5fd",
      shadow: "rgba(14,165,233,.30)",
      glow: "radial-gradient(20px 12px at 50% 50%, rgba(186,230,253,.42), transparent)",
      underline: "#0284c7",
    },
  };

  const tabs = useMemo(
    () => [
      { name: "DPR", icon: <FaClipboardList /> },
      { name: "INWARD", icon: <FaInbox /> },
      { name: "SITE KHARCH", icon: <FaHammer /> },
      { name: "CATEGORY", icon: <FaPlus /> },
      { name: "TOTAL KHARCH", icon: <FaPlus /> },
      { name: "SiteKharch GET", icon: <FaPlus /> },
      { name: "DPR GET", icon: <FaEye /> },
      { name: "INWARD GET", icon: <FaEye /> },
    ],
    []
  );

  // keyboard navigation between tabs for accessibility
  const handleTabKeyDown = (idx) => (e) => {
    const key = e.key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    e.preventDefault();
    const names = tabs.map((t) => t.name);
    let nextIndex = idx;
    if (key === "ArrowRight") nextIndex = (idx + 1) % names.length;
    if (key === "ArrowLeft") nextIndex = (idx - 1 + names.length) % names.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = names.length - 1;
    setActiveTab(names[nextIndex]);
  };

  const renderCategoryTab = () => (
    <div className="card shadow-sm p-3 mb-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <small className="text-muted">Manage categories (add, rename, delete)</small>
        <span className="badge bg-info">{sortedCategories.length} total</span>
      </div>

      <form className="d-flex gap-2 mb-3 flex-wrap" onSubmit={addCategory}>
        <input
          type="text"
          className="form-control flex-grow-1"
          placeholder="Add new category (Steel, Cement, Labour...)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          disabled={busy}
        />
        <button className="btn btn-success" type="submit" disabled={busy}>
          + Add
        </button>
      </form>

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : sortedCategories.length === 0 ? (
        <div className="text-muted">No categories yet.</div>
      ) : (
        <div className="list-group">
          {sortedCategories.map((cat) => (
            <div
              key={cat.id}
              className="d-flex justify-content-between align-items-center p-2 mb-2 border rounded-3 list-group-item"
              style={{ borderColor: "#e5e7eb" }}
            >
              {editingId === cat.id ? (
                <input
                  className="form-control me-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={busy}
                />
              ) : (
                <span>
                  <strong>{cat.category_name}</strong> <small className="text-muted">#{cat.id}</small>
                </span>
              )}
              <div className="btn-group">
                {editingId === cat.id ? (
                  <>
                    <button className="btn btn-warning btn-sm" onClick={() => saveEdit(cat.id)} disabled={busy}>
                      Save
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={busy}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(cat.id, cat.category_name)} disabled={busy}>
                      Edit
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => openDelete(cat.id, cat.category_name)} disabled={busy}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading && activeTab !== "CATEGORY") return <LoadingSpiner />;

    switch (activeTab) {
      case "DPR":
        return <AddDpr categories={categories} />;
      case "INWARD":
        return <AddInward categories={categories} />;
      case "SITE KHARCH":
        return <AddSitekharch categories={categories} />;
      case "SiteKharch GET":
        return <SitekharchGet categories={categories} />;
      case "TOTAL KHARCH":
        return <TotalSiteKharch />;
      case "CATEGORY":
        return renderCategoryTab();
      case "DPR GET":
        return <DprGet />;
      case "INWARD GET":
        return <InwardGet />;
      default:
        return null;
    }
  };

  const navigate = useNavigate(); // ✅ added

  return (
    <div
      className="container-fluid"
      style={{ minHeight: "100vh", background: "#f5f7fb", paddingBottom: 56 }}
    >
      {/* Topbar */}
      <motion.div
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="topbar"
        style={{
          background: "linear-gradient(135deg,#6d28d9,#7c3aed,#a855f7)",
          color: "#fff",
          padding: "12px 20px",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 12px 28px rgba(124,58,237,.35)",
          borderBottom: "1px solid rgba(255,255,255,.22)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <motion.div
              layout
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.35)",
                fontWeight: 800,
              }}
            >
              WD
            </motion.div>
            <h2 className="m-0" style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: 0.3 }}>
              Work Details
            </h2>
          </div>
          <button
            className="btn"
            style={{
              background: "#FFD700",
              color: "#1f2937",
              fontWeight: 700,
              fontSize: ".9rem",
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              boxShadow: "0 14px 30px rgba(2,6,23,.25)",
            }}
            onClick={() => {
              try {
                navigate("/dashboard");               // ✅ SPA navigation (works on Vercel)
              } catch {
                window.location.assign("/dashboard");  // ✅ safe fallback outside Router
              }
            }}
          >
            Dashboard
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="container">
        <LayoutGroup id="tabs">
          <div
            className="my-3"
            role="tablist"
            aria-label="Work Details Tabs"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
            }}
          >
            {/* Horizontal scroll on small screens */}
            <div
              className="nav nav-pills d-flex flex-row flex-nowrap overflow-auto py-2 px-1 justify-content-start justify-content-md-center"
              style={{ gap: 8, scrollbarWidth: "none" }}
            >
              {tabs.map(({ name, icon }, idx) => (
                <TabButton
                  key={name}
                  active={activeTab === name}
                  color={palette[name] || palette["DPR"]}
                  icon={icon}
                  label={name}
                  onClick={() => setActiveTab(name)}
                  onKeyDown={handleTabKeyDown(idx)}
                />
              ))}
            </div>
          </div>
        </LayoutGroup>
      </div>

      {/* Content */}
      <div className="container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="content-wrap"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 14px 36px rgba(2,6,23,.08)",
            }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Busy overlay & Toast */}
      <BusyOverlay show={busy} />
      <Toast open={toast.open} type={toast.type} msg={toast.msg} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirm.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ background: "rgba(2,6,23,.55)" }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={spring}
              className="modal-dialog modal-dialog-centered"
            >
              <div className="modal-content rounded-4 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title">Delete Category</h5>
                  <button type="button" className="btn-close" onClick={closeDelete}></button>
                </div>
                <div className="modal-body">
                  Are you sure you want to delete <b>{confirm.name}</b>? This action cannot be undone.
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDelete} disabled={busy}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={doDelete} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
