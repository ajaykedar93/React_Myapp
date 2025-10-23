// src/pages/WebsitesUrl.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  FiPlus,
  FiSearch,
  FiTrash2,
  FiEdit2,
  FiGlobe,
  FiUploadCloud,
  FiX,
  FiImage,
  FiExternalLink,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiRotateCcw,
  FiCopy,
  FiZoomIn
} from "react-icons/fi";

/**
 * WebsitesUrl.jsx — Bootstrap version (responsive, professional, high-contrast)
 * - Inline Add/Edit form at top; list below
 * - Accept any URL; auto-prepend https:// if missing
 * - Optional drag & drop image
 * - Search, category, pagination, edit/delete
 * - URLs show fully (wrap); small Copy button next to URL (below)
 * - Image area shows ONLY: Open + Full buttons (no Copy up top)
 * - Default 10/page; responsive
 */

const API_BASE = "https://express-myapp.onrender.com"; // no trailing slash

// ----------------------------- helpers -----------------------------
const toInt = (v, d = 10) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const spring = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 };

async function api(path, { method = "GET", body, headers, json = true } = {}) {
  const url = `${API_BASE}/api${path}`;
  const init = { method, headers: { ...(headers || {}) } };
  if (body && !(body instanceof FormData)) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    init.body = body;
  }
  const res = await fetch(url, init);
  if (!json) return res;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || `${res.status} ${res.statusText}`);
  return data;
}

const normalizeUrl = (raw) => {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// ----------------------------- UI atoms -----------------------------
const Badge = ({ tone = "info", children }) => {
  const cls =
    tone === "success" ? "badge text-bg-success" :
    tone === "danger" ? "badge text-bg-danger" :
    "badge text-bg-secondary";
  return <span className={cls}>{children}</span>;
};

function CenterNotice({ open, type = "success", title, message, onClose }) {
  const palette =
    type === "success"
      ? { Icon: FiCheckCircle, border: "#20c997" }
      : type === "error"
      ? { Icon: FiAlertTriangle, border: "#dc3545" }
      : { Icon: FiInfo, border: "#0d6efd" };
  const { Icon } = palette;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 w-100 h-100 d-grid"
          style={{ background: "rgba(0,0,0,.5)", zIndex: 1060, placeItems: "center" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={spring}
            className="card shadow-lg"
            style={{ maxWidth: 520, width: "92%", borderTop: `4px solid ${palette.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle border"
                     style={{ width: 40, height: 40 }}>
                  <Icon />
                </div>
                <h5 className="card-title mb-0 fw-bold">{title}</h5>
              </div>
              <p className="card-text text-secondary mb-4">{message}</p>
              <div className="text-end">
                <button className="btn btn-primary fw-bold" onClick={onClose}>OK</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Confirm = ({ open, title, message, onCancel, onConfirm }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="position-fixed top-0 start-0 w-100 h-100 d-grid"
        style={{ background: "rgba(0,0,0,.5)", zIndex: 1055, placeItems: "center" }}
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={spring}
          className="card shadow-lg"
          style={{ maxWidth: 520, width: "92%", borderTop: "4px solid #dc3545" }}
        >
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="fw-bold mb-0">{title}</h5>
              <Badge tone="danger">Confirm</Badge>
            </div>
            <div className="text-secondary mb-4">{message}</div>
            <div className="d-flex justify-content-end gap-2">
              <button onClick={onCancel} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={onConfirm} className="btn btn-danger fw-bold">Delete</button>
            </div>
          </div>
        </motion.div>
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
        className="position-fixed top-0 start-0 w-100 h-100 d-grid"
        style={{ backdropFilter: "blur(2px)", background: "rgba(0,0,0,.15)", zIndex: 1050, placeItems: "center" }}
      >
        <div className="spinner-border text-dark" role="status" aria-label="loading" />
      </motion.div>
    )}
  </AnimatePresence>
);

// ----------------------------- Image Dropzone -----------------------------
function Dropzone({ file, setFile }) {
  const [isOver, setIsOver] = useState(false);
  const ref = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };
  const onChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      className={`p-3 rounded-3 border ${isOver ? "border-primary bg-primary-subtle" : "border-secondary-subtle bg-white"}`}
      style={{ minHeight: 84 }}
    >
      <input type="file" accept="image/*" onChange={onChange} className="d-none" ref={ref} />
      <div className="d-flex align-items-center gap-2">
        <FiUploadCloud className="text-primary" />
        <div className="small">
          <div className="fw-semibold text-dark">Drag & drop image (optional)</div>
          <div className="text-secondary">
            or{" "}
            <button type="button" onClick={() => ref.current?.click()} className="btn btn-link p-0 align-baseline">
              browse
            </button>
          </div>
        </div>
      </div>
      {file && (
        <div className="mt-2 d-inline-flex align-items-center gap-2 small text-secondary">
          <FiImage /> <span>{file.name}</span>
          <button type="button" onClick={() => setFile(null)} className="btn btn-link text-danger p-0 align-baseline">
            <FiX /> remove
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------- Main Page -----------------------------
export default function WebsitesUrl() {
  // list state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10); // default 10 per page
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // notice / confirm
  const [notice, setNotice] = useState({ open: false, type: "success", title: "", message: "" });
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });

  // preview state
  const [preview, setPreview] = useState({ open: false, src: "", title: "" });

  // form state
  const [editing, setEditing] = useState(null);
  const [fUrl, setFUrl] = useState("");
  const [fName, setFName] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fFile, setFFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const showNotice = (type, title, message) => setNotice({ open: true, type, title, message });

  const copyLink = async (url) => {
    const link = normalizeUrl(url || "");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showNotice("success", "Link Copied", "The website link has been copied to clipboard.");
    } catch {
      showNotice("error", "Copy Failed", "Unable to copy the link.");
    }
  };

  const openPreview = (src, title) =>
    setPreview({ open: true, src, title: title || "Preview" });
  const closePreview = () =>
    setPreview({ open: false, src: "", title: "" });

  const loadCategories = async () => {
    try {
      const data = await api("/websitecategory");
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      showNotice("error", "Load Failed", e.message || "Could not load categories.");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      const data = await api(`/websites?${params.toString()}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      showNotice("error", "Load Failed", e.message || "Could not load websites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    load();
  }, [page, limit, q, category]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const clearFilters = () => {
    setQ("");
    setCategory("");
    setPage(1);
  };

  const resetForm = () => {
    setEditing(null);
    setFUrl("");
    setFName("");
    setFCategory("");
    setFFile(null);
    setSaving(false);
  };

  const fillFormForEdit = (it) => {
    setEditing(it);
    setFUrl(it?.url || "");
    setFName(it?.name || "");
    setFCategory(it?.category || "");
    setFFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitForm = async (e) => {
    e?.preventDefault?.();
    try {
      setSaving(true);
      const safeUrl = normalizeUrl(fUrl);
      const fd = new FormData();
      fd.append("url", safeUrl);
      if (fName) fd.append("name", fName);
      if (fCategory) fd.append("category", fCategory);
      if (fFile) fd.append("image", fFile);

      if (editing) {
        const data = await api(`/websites/${editing.id}`, { method: "PUT", body: fd });
        showNotice("success", "Website Updated", "Your changes are saved.");
        setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      } else {
        await api(`/websites`, { method: "POST", body: fd });
        showNotice("success", "Website Added", "Saved successfully.");
        setPage(1);
        await load();
      }
      resetForm();
    } catch (e2) {
      showNotice("error", editing ? "Save Failed" : "Add Failed", e2.message || "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (item) => setConfirm({ open: true, id: item.id, name: item.name || item.url });

  const doDelete = async () => {
    const id = confirm.id;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api(`/websites/${id}`, { method: "DELETE" });
      showNotice("success", "Deleted", "Website removed successfully.");
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      showNotice("error", "Delete Failed", e.message || "Unable to delete website.");
    }
  };

  return (
    <div className="min-vh-100" style={{ background: "#f5f7fb" }}>
      {/* Header */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="sticky-top"
        style={{
          background: "linear-gradient(135deg,#5b34e6,#6f42c1,#7c4dff)",
          color: "#fff",
          boxShadow: "0 12px 28px rgba(91,52,230,.25)",
          borderBottom: "1px solid rgba(255,255,255,.25)",
          zIndex: 1020
        }}
      >
        <div className="container py-3 d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            {/* Enhanced URL badge with bold white font + glow */}
            <div
              className="rounded-3 d-grid"
              style={{
                width: 56,
                height: 56,
                placeItems: "center",
                fontWeight: 800,
                color: "#fff",
                background: "rgba(255,255,255,.18)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,.45)",
                boxShadow: "0 8px 24px rgba(0,0,0,.15), inset 0 0 0 1px rgba(255,255,255,.2)",
                textShadow: "0 1px 0 rgba(0,0,0,.35), 0 0 10px rgba(255,255,255,.7), 0 0 18px rgba(255,255,255,.45)",
                letterSpacing: "0.5px"
              }}
            >
              URL
            </div>
            <div>
              <div className="fw-bold fs-4" style={{ textShadow: "0 1px 0 rgba(0,0,0,.35)" }}>
                Websites Manager
              </div>
              <div className="text-white-50 small">Save links, categories & screenshots</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container py-4">
        {/* Add/Edit Form */}
        <motion.form
          onSubmit={submitForm}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card shadow-sm mb-4"
        >
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0 fw-bold">{editing ? "Edit Website" : "Add Website"}</h5>
              <div className="d-flex align-items-center gap-2">
                {editing ? <Badge>Update</Badge> : <Badge>Create</Badge>}
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                    title="Reset to Add mode"
                  >
                    <FiRotateCcw /> Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="row g-3">
              <div className="col-lg-8">
                <label className="form-label fw-semibold">Website URL</label>
                <input
                  value={fUrl}
                  onChange={(e) => setFUrl(e.target.value)}
                  placeholder="example.com or https://example.com"
                  className="form-control"
                />
                <div className="form-text">
                  Any format allowed; we’ll auto-prepend <code>https://</code> if missing.
                </div>
              </div>

              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-semibold">Name (optional)</label>
                <input
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="Display name"
                  className="form-control"
                />
              </div>

              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-semibold">Category (optional)</label>
                <select
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-8">
                <label className="form-label fw-semibold">Screenshot (optional)</label>
                <Dropzone file={fFile} setFile={setFFile} />
              </div>
            </div>

            <div className="mt-3 d-flex justify-content-end gap-2">
              <button type="button" onClick={resetForm} className="btn btn-outline-secondary">
                Reset
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary fw-bold d-inline-flex align-items-center gap-2">
                {editing ? (saving ? "Saving..." : <> <FiCheckCircle/> Save Changes</>) : saving ? "Adding..." : <> <FiPlus/> Add Website</>}
              </button>
            </div>
          </div>
        </motion.form>

        {/* Filters */}
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-2 align-items-center">
              <div className="col-md">
                <div className="position-relative">
                  <FiSearch className="position-absolute" style={{ left: 10, top: 10, opacity: .5 }} />
                  <input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Search url or name"
                    className="form-control ps-5"
                  />
                </div>
              </div>
              <div className="col-md-auto">
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="form-select"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-auto">
                <button onClick={clearFilters} className="btn btn-outline-secondary">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <LayoutGroup>
          <div className="row g-3">
            <AnimatePresence>
              {items.map((it) => {
                const displayUrl = normalizeUrl(it.url);
                return (
                  <motion.div
                    key={it.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="col-sm-6 col-lg-4 col-xl-3"
                  >
                    <div className="card h-100 shadow-sm">
                      {/* Image area: click to open full preview (fit to card by default) */}
                      <div
                        className="position-relative d-flex align-items-center justify-content-center bg-light"
                        style={{
                          minHeight: 140,
                          maxHeight: 340,
                          overflow: "hidden",
                          borderBottom: "1px solid rgba(0,0,0,.05)",
                          cursor: it.image?.mime ? "zoom-in" : "default",
                        }}
                        onClick={() => {
                          if (it.image?.mime) openPreview(`${API_BASE}${it.image.href}`, it.name || it.url);
                        }}
                        title={it.image?.mime ? "Click to preview" : undefined}
                      >
                        {it.image?.mime ? (
                          <img
                            src={`${API_BASE}${it.image.href}`}
                            alt={it.name || it.url}
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center position-absolute top-0 start-0 w-100 h-100 text-secondary">
                            <FiImage size={48} />
                          </div>
                        )}

                        {/* TOP overlay buttons: ONLY Open + Full */}
                        <div className="position-absolute end-0 bottom-0 m-2 d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1"
                            onClick={(e) => { e.stopPropagation(); window.open(displayUrl, "_blank", "noopener"); }}
                            title="Open"
                          >
                            <FiExternalLink /> Open
                          </button>
                          {it.image?.mime && (
                            <button
                              type="button"
                              className="btn btn-outline-light btn-sm d-inline-flex align-items-center gap-1"
                              onClick={(e) => { e.stopPropagation(); openPreview(`${API_BASE}${it.image.href}`, it.name || it.url); }}
                              title="Full Image"
                            >
                              <FiZoomIn /> Full
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                          <div className="flex-grow-1">
                            <div className="fw-bold" title={it.name || it.url} style={{ wordBreak: "break-word" }}>
                              {it.name || it.url}
                            </div>

                            {it.url && (
                              <div className="small text-secondary d-flex align-items-start gap-2 mt-1" title={it.url}>
                                {/* small Copy button IN FRONT of the website (below only) */}
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                                  onClick={() => copyLink(it.url)}
                                  aria-label="Copy link"
                                  title="Copy link"
                                  style={{ lineHeight: 1.2, whiteSpace: "nowrap" }}
                                >
                                  <FiCopy /> Copy
                                </button>
                                <span style={{ wordBreak: "break-all" }}>
                                  <FiGlobe className="me-1" />
                                  {displayUrl}
                                </span>
                              </div>
                            )}
                          </div>
                          {it.category ? <Badge>{it.category}</Badge> : <span />}
                        </div>
                        <div className="mt-auto d-flex justify-content-end gap-2">
                          <button
                            onClick={() => fillFormForEdit(it)}
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                          >
                            <FiEdit2 /> Edit
                          </button>
                          <button
                            onClick={() => askDelete(it)}
                            className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {items.length === 0 && (
            <div className="text-center text-secondary py-5">No websites found.</div>
          )}
        </LayoutGroup>

        {/* Pagination */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4">
          <div className="text-secondary">
            Total: <span className="fw-bold text-dark">{total}</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-outline-secondary"
            >
              Prev
            </button>
            <span className="small">
              Page <b>{page}</b> / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn btn-outline-secondary"
            >
              Next
            </button>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(toInt(e.target.value, 10));
                setPage(1);
              }}
              className="form-select"
              style={{ width: 140 }}
            >
              {[10, 12, 16, 24, 32].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Full-image Preview Modal */}
      <AnimatePresence>
        {preview.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-grid"
            style={{ background: "rgba(0,0,0,.8)", zIndex: 1065, placeItems: "center" }}
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              transition={spring}
              className="p-2"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "95vw", maxHeight: "90vh" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="text-white-50 mb-0">{preview.title}</h6>
                <button className="btn btn-sm btn-light" onClick={closePreview}><FiX /></button>
              </div>
              <div className="bg-black d-flex align-items-center justify-content-center" style={{ maxWidth: "95vw", maxHeight: "85vh" }}>
                <img
                  src={preview.src}
                  alt={preview.title}
                  style={{ maxWidth: "95vw", maxHeight: "85vh", objectFit: "contain" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <Confirm
        open={confirm.open}
        title="Delete Website"
        message={
          <span>
            Are you sure you want to delete <b>{confirm.name}</b>? This action cannot be undone.
          </span>
        }
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
        onConfirm={doDelete}
      />

      {/* Centered notice */}
      <CenterNotice
        open={notice.open}
        type={notice.type}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice((n) => ({ ...n, open: false }))}
      />

      {/* Busy overlay */}
      <BusyOverlay show={loading} />
    </div>
  );
}
