import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

/**
 * AddDpr – Professional, full-page, animated version
 * - Mobile-first responsive layout (max 1100px center + fluid spacing)
 * - Polished gradient header + card sections
 * - Smooth animations on mount and interactions
 * - Better input focus styles and accessible labels
 * - Optional categories via props (falls back to API fetch)
 */

const API_BASE = import.meta?.env?.VITE_API_BASE ?? "https://express-myapp.onrender.com/api";

const fieldWrap = {
  marginBottom: 16,
};

const inputBase = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  outline: "none",
  transition: "box-shadow .15s, border-color .15s, background .15s",
};

const inputFocus = {
  boxShadow: "0 0 0 4px rgba(168,85,247,.15)",
  borderColor: "#a855f7",
  background: "#ffffff",
};

const Badge = ({ tone = "info", children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 700,
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid",
      ...(tone === "success"
        ? { color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" }
        : tone === "error"
        ? { color: "#7f1d1d", background: "#fef2f2", borderColor: "#fecaca" }
        : { color: "#1e293b", background: "#f1f5f9", borderColor: "#cbd5e1" }),
    }}
  >
    {children}
  </span>
);

const Popup = ({ open, type, title, message, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.55)", zIndex: 9999, display: "grid", placeItems: "center", padding: 16 }}
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="modal-card"
          style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 18, boxShadow: "0 24px 60px rgba(2,6,23,.28)", overflow: "hidden" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 8px" }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>{title}</h3>
            <Badge tone={type === "success" ? "success" : "error"}>{type === "success" ? "✓ Success" : "! Error"}</Badge>
          </div>
          <div style={{ padding: "8px 18px 18px", color: "#334155", lineHeight: 1.55 }}>{message}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 18px 18px" }}>
            <button className="btn" onClick={onClose} style={{
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#0f172a",
            }}>OK</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

function useFocusStyle() {
  const [focus, setFocus] = useState(false);
  return {
    focus,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: focus ? inputFocus : undefined,
  };
}

const AddDpr = ({ categories: categoriesProp }) => {
  const [categories, setCategories] = useState(categoriesProp ?? []);
  const [categoryId, setCategoryId] = useState("");
  const [mainDetails, setMainDetails] = useState("");
  const [mainTime, setMainTime] = useState("");
  const [extraEntries, setExtraEntries] = useState([]);
  const [entryDate, setEntryDate] = useState(""); // yyyy-mm-dd
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Centered professional popup
  const [popup, setPopup] = useState({ open: false, type: "success", title: "", message: "" });
  const popupTimer = useRef(null);

  // ===== Helpers for current date =====
  const todayISO = useMemo(() => {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Initialize defaults
  useEffect(() => {
    setEntryDate((v) => v || todayISO);
  }, [todayISO]);

  // Fetch categories if not provided
  useEffect(() => {
    if (categoriesProp && Array.isArray(categoriesProp)) return; // trust parent
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/workcategory`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("Failed to load categories");
      }
    })();
  }, [categoriesProp]);

  // Popup handlers
  const showPopup = (type, title, message) => {
    setPopup({ open: true, type, title, message });
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup((p) => ({ ...p, open: false })), 2600);
  };
  const closePopup = () => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup((p) => ({ ...p, open: false }));
  };
  useEffect(() => () => popupTimer.current && clearTimeout(popupTimer.current), []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closePopup();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Add DPR entry
  const handleAddDpr = async () => {
    if (!categoryId || !mainDetails || !mainTime || !entryDate) {
      showPopup("error", "Missing Fields", "All fields including date are required.");
      return;
    }

    const payload = {
      category_id: categoryId,
      details: mainDetails,
      work_time: mainTime,
      extra_entries: extraEntries
        .map((e) => ({ detail: (e.detail || "").trim(), time: (e.time || "").trim() }))
        .filter((e) => e.detail || e.time),
      work_date: entryDate, // Correct field expected by backend
    };

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/dpr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = (body && (body.message || body.error)) || `Failed to add DPR (${res.status})`;
        throw new Error(msg);
      }

      // Clear form except date
      setMainDetails("");
      setMainTime("");
      setExtraEntries([]);
      setEntryDate(todayISO);

      showPopup("success", "DPR Added", "Your DPR entry has been saved successfully.");
    } catch (err) {
      showPopup("error", "Add Failed", err?.message || "Failed to add DPR entry.");
      setError(err?.message || "Failed to add DPR entry");
    } finally {
      setLoading(false);
    }
  };

  // Extra entries handlers
  const addExtraEntry = () => setExtraEntries((prev) => [...prev, { detail: "", time: "" }]);
  const removeExtraEntry = (idx) => setExtraEntries((prev) => prev.filter((_, i) => i !== idx));
  const handleExtraChange = (idx, field, value) => {
    setExtraEntries((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  // Focus styles hooks
  const catFocus = useFocusStyle();
  const dateFocus = useFocusStyle();
  const detailsFocus = useFocusStyle();
  const timeFocus = useFocusStyle();

  return (
    <div style={{ minHeight: "calc(100vh - 16px)", display: "grid", gridTemplateRows: "auto 1fr", gap: 16 }}>
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
        style={{
          background: "linear-gradient(135deg,#6d28d9,#7c3aed,#a855f7)",
          color: "#fff",
          padding: "16px 18px",
          borderRadius: 16,
          boxShadow: "0 14px 32px rgba(124,58,237,.32)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", fontWeight: 800, borderRadius: 12, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)" }}>DPR</div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: .3 }}>Daily Progress Report</h2>
          </div>
          <Badge>Professional Mode</Badge>
        </div>
      </motion.div>

      {/* Content */}
      <div style={{ width: "100%", marginInline: "auto", maxWidth: 1100 }}>
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: .18 }}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 14px 36px rgba(2,6,23,.08)",
          }}
        >
          {loading && (
            <div style={{ marginBottom: 12 }}>
              <LoadingSpiner />
            </div>
          )}

          {error && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#7c2d12", padding: "10px 12px", borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>{error}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            {/* Row 1: Category + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div style={fieldWrap}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#0f172a" }}>Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  onFocus={catFocus.onFocus}
                  onBlur={catFocus.onBlur}
                  style={{ ...inputBase, ...(catFocus.focus ? inputFocus : null) }}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldWrap}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#0f172a" }}>Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  onFocus={dateFocus.onFocus}
                  onBlur={dateFocus.onBlur}
                  style={{ ...inputBase, ...(dateFocus.focus ? inputFocus : null) }}
                />
              </div>
            </div>

            {/* Row 2: Details */}
            <div style={fieldWrap}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#0f172a" }}>Main Details</label>
              <textarea
                value={mainDetails}
                onChange={(e) => setMainDetails(e.target.value)}
                onFocus={detailsFocus.onFocus}
                onBlur={detailsFocus.onBlur}
                style={{ ...inputBase, ...(detailsFocus.focus ? inputFocus : null), minHeight: 110, resize: "vertical" }}
                placeholder="Describe the progress, checkpoints, notes..."
              />
            </div>

            {/* Row 3: Time */}
            <div style={fieldWrap}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#0f172a" }}>Work Time</label>
              <input
                type="text"
                value={mainTime}
                onChange={(e) => setMainTime(e.target.value)}
                onFocus={timeFocus.onFocus}
                onBlur={timeFocus.onBlur}
                placeholder="e.g., 10:00 AM – 12:00 PM"
                style={{ ...inputBase, ...(timeFocus.focus ? inputFocus : null) }}
              />
            </div>

            {/* Extra Details */}
            {extraEntries.map((entry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: .15 }}
                style={{ display: "flex", gap: 10, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}
              >
                <input
                  type="text"
                  value={entry.detail}
                  onChange={(e) => handleExtraChange(idx, "detail", e.target.value)}
                  placeholder="Extra Detail"
                  style={{ ...inputBase, flex: "1 1 45%", minWidth: 220 }}
                />
                <input
                  type="text"
                  value={entry.time}
                  onChange={(e) => handleExtraChange(idx, "time", e.target.value)}
                  placeholder="Extra Time"
                  style={{ ...inputBase, flex: "1 1 45%", minWidth: 180 }}
                />
                <button
                  type="button"
                  onClick={() => removeExtraEntry(idx)}
                  className="btn"
                  style={{ background: "#ef4444", color: "#fff", border: 0, padding: "10px 12px", borderRadius: 10, fontWeight: 800 }}
                >
                  Remove
                </button>
              </motion.div>
            ))}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={addExtraEntry}
                className="btn"
                style={{ background: "#facc15", color: "#1f2937", border: 0, padding: "10px 12px", borderRadius: 10, fontWeight: 800 }}
              >
                + Add Extra Detail & Time
              </button>

              <div style={{ marginLeft: "auto" }} />

              <button
                onClick={handleAddDpr}
                className="btn"
                disabled={loading}
                aria-busy={loading ? "true" : "false"}
                style={{ background: "#a855f7", color: "#fff", border: 0, padding: "12px 16px", borderRadius: 12, fontWeight: 900, minWidth: 160, boxShadow: "0 10px 26px rgba(168,85,247,.35)" }}
              >
                {loading ? "Submitting..." : "Submit DPR"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Popup */}
      <Popup open={popup.open} type={popup.type} title={popup.title} message={popup.message} onClose={closePopup} />
    </div>
  );
};

export default AddDpr;
