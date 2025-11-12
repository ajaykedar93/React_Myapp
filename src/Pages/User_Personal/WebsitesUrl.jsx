// src/pages/WebsitesUrl.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  FiPlus, FiSearch, FiTrash2, FiEdit2, FiGlobe, FiUploadCloud, FiX, FiImage,
  FiExternalLink, FiCheckCircle, FiAlertTriangle, FiInfo, FiRotateCcw, FiCopy
} from "react-icons/fi";

/**
 * WebsitesUrl.jsx — Mobile-safe overlays & full-screen image preview (10/page)
 * - Image preview now uses a PORTAL to escape stacking contexts and always renders above navbar.
 * - All overlays (confirm, busy) are also portaled and have higher z-index.
 * - Body scroll locks while preview/notice/confirm are open (mobile friendly).
 * - Layout remains flexible for mobile; images are fully visible (no crop) and open full-screen.
 */

const API_BASE = "https://express-backend-myapp.onrender.com"; // no trailing slash
const PAGE_SIZE = 10;
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

/* ---------- image helpers ---------- */
const toAbsUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${path}`;
};

const getImageSrc = (item) => {
  const v =
    item?.image ??
    item?.image_url ??
    item?.imageUrl ??
    item?.thumbnail ??
    item?.thumb ??
    null;

  if (!v) return "";
  if (typeof v === "string") return toAbsUrl(v);
  if (typeof v === "object") {
    if (v.href) return toAbsUrl(v.href);
    if (v.url) return toAbsUrl(v.url);
    if (v.src) return toAbsUrl(v.src);
  }
  return "";
};

const Badge = ({ tone = "info", children }) => {
  const cls =
    tone === "success" ? "badge text-bg-success" :
    tone === "danger" ? "badge text-bg-danger" :
    "badge text-bg-secondary";
  return <span className={cls}>{children}</span>;
};

/** Utility to lock/unlock body scroll when overlays are open */
function useBodyLock(locked) {
  useEffect(() => {
    const original = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [locked]);
}

/** Centered popup via portal (guaranteed center on mobile & desktop) */
function CenterNotice({ open, type = "success", title, message, onClose }) {
  useBodyLock(open);
  const palette =
    type === "success"
      ? { Icon: FiCheckCircle, border: "#20c997" }
      : type === "error"
      ? { Icon: FiAlertTriangle, border: "#dc3545" }
      : { Icon: FiInfo, border: "#0d6efd" };
  const { Icon } = palette;

  const okBtnRef = useRef(null);
  useEffect(() => {
    if (open) {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
      setTimeout(() => okBtnRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 w-100"
          style={{ zIndex: 6000, height: "100dvh", display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)" }}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="card shadow-lg w-100"
            style={{ maxWidth: 520, borderTop: `4px solid ${palette.border}` }}
          >
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle border" style={{ width: 40, height: 40 }}>
                  <Icon />
                </div>
                <h5 className="card-title mb-0 fw-bold">{title}</h5>
              </div>
              <p className="card-text text-secondary mb-4 small">{message}</p>
              <div className="text-end">
                <button ref={okBtnRef} className="btn btn-primary fw-bold" onClick={onClose}>OK</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

const Confirm = ({ open, title, message, onCancel, onConfirm }) => {
  useBodyLock(open);
  if (!open) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 w-100"
          style={{ zIndex: 5900, height: "100dvh", background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center" }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={spring}
            className="card shadow-lg w-100"
            style={{ maxWidth: 520, borderTop: "4px solid #dc3545" }}
          >
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="fw-bold mb-0">{title}</h5>
                <Badge tone="danger">Confirm</Badge>
              </div>
              <div className="text-secondary mb-4 small">{message}</div>
              <div className="d-flex flex-wrap justify-content-end gap-2">
                <button onClick={onCancel} className="btn btn-outline-secondary">Cancel</button>
                <button onClick={onConfirm} className="btn btn-danger fw-bold">Delete</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

const BusyOverlay = ({ show }) => {
  useBodyLock(show);
  if (!show) return null;
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 w-100"
          style={{ zIndex: 5800, height: "100dvh", backdropFilter: "blur(2px)", background: "rgba(0,0,0,.15)", display: "grid", placeItems: "center" }}
        >
          <div className="spinner-border text-light" role="status" aria-label="loading" />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

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
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
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
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // notice / confirm
  const [notice, setNotice] = useState({ open: false, type: "success", title: "", message: "" });
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });

  // image preview overlay state
  const [preview, setPreview] = useState({ open: false, src: "", title: "" });

  // form state
  const [editing, setEditing] = useState(null);
  const [fUrl, setFUrl] = useState("");
  const [fName, setFName] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fFile, setFFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // image ok/broken state
  const [imgOk, setImgOk] = useState({}); // { [id]: boolean }

  const showNotice = (type, title, message) => setNotice({ open: true, type, title, message });

  const copyLink = async (url) => {
    const link = normalizeUrl(url || "");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      showNotice("success", "Link Copied", "The website link has been copied to clipboard.");
    } catch {
      showNotice("error", "Copy Failed", "Unable to copy the link.");
    }
  };

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
      params.set("limit", String(PAGE_SIZE));
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

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { load(); }, [page, q, category]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const clearFilters = () => { setQ(""); setCategory(""); setPage(1); };

  const resetForm = () => {
    setEditing(null); setFUrl(""); setFName(""); setFCategory(""); setFFile(null); setSaving(false);
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
    setLoading(true);
    try {
      await api(`/websites/${id}`, { method: "DELETE" });
      const newTotal = Math.max(0, total - 1);
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      if (page > newTotalPages) {
        setTotal(newTotal);
        setPage(newTotalPages);
      } else {
        setTotal(newTotal);
        await load();
      }
      showNotice("success", "Deleted", "Website removed successfully.");
    } catch (e) {
      showNotice("error", "Delete Failed", e.message || "Unable to delete website.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100" style={{ background: "#f5f7fb", minHeight: "100dvh" }}>
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
        <motion.form onSubmit={submitForm} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <h5 className="mb-0 fw-bold">{editing ? "Edit Website" : "Add Website"}</h5>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {editing ? <Badge>Update</Badge> : <Badge>Create</Badge>}
                {editing && (
                  <button type="button" onClick={resetForm} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1" title="Reset to Add mode">
                    <FiRotateCcw /> Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="row g-3">
              <div className="col-lg-8">
                <label className="form-label fw-semibold">Website URL</label>
                <input value={fUrl} onChange={(e) => setFUrl(e.target.value)} placeholder="example.com or https://example.com" className="form-control" />
                <div className="form-text">Any format allowed; we’ll auto-prepend <code>https://</code> if missing.</div>
              </div>

              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-semibold">Name (optional)</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Display name" className="form-control" />
              </div>

              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-semibold">Category (optional)</label>
                <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className="form-select">
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-lg-8">
                <label className="form-label fw-semibold">Screenshot (optional)</label>
                <Dropzone file={fFile} setFile={setFFile} />
              </div>
            </div>

            <div className="mt-3 d-flex flex-wrap justify-content-end gap-2">
              <button type="button" onClick={resetForm} className="btn btn-outline-secondary">Reset</button>
              <button type="submit" disabled={saving} className="btn btn-primary fw-bold d-inline-flex align-items-center gap-2">
                {editing ? (saving ? "Saving..." : <> <FiCheckCircle/> Save Changes</>) : saving ? "Adding..." : <> <FiPlus/> Add Website</> }
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
                  <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search url or name" className="form-control ps-5" />
                </div>
              </div>
              <div className="col-md-auto">
                <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="form-select">
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-auto">
                <button onClick={clearFilters} className="btn btn-outline-secondary">Reset</button>
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
                const imgSrc = getImageSrc(it);
                const showImg = !!imgSrc && imgOk[it.id] !== false;

                return (
                  <motion.div key={it.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div className="card h-100 shadow-sm">
                      {/* Image area – full image, no crop; tap to open preview */}
                      <div className="bg-white border-bottom">
                        {showImg ? (
                          <img
                            src={imgSrc}
                            alt={it.name || it.url}
                            className="img-fluid w-100 d-block"
                            style={{ height: "auto", cursor: "zoom-in" }}
                            onClick={() => setPreview({ open: true, src: imgSrc, title: it.name || it.url })}
                            onError={() => setImgOk((m) => ({ ...m, [it.id]: false }))}
                          />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center py-4 text-secondary">
                            <FiImage size={36} />
                          </div>
                        )}
                        <div className="px-2 pb-2 d-flex flex-wrap gap-2 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1"
                            onClick={() => window.open(displayUrl, "_blank", "noopener")}
                            title="Open"
                          >
                            <FiExternalLink /> Open
                          </button>
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
                              <div className="small text-secondary mt-1" title={it.url} style={{ wordBreak: "break-all", whiteSpace: "normal" }}>
                                <FiGlobe className="me-1" />
                                {displayUrl}
                              </div>
                            )}
                          </div>
                          {it.category ? <Badge>{it.category}</Badge> : <span />}
                        </div>
                        <div className="mt-auto d-flex flex-wrap justify-content-end gap-2">
                          <button onClick={() => copyLink(it.url)} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
                            <FiCopy /> Copy
                          </button>
                          <button onClick={() => fillFormForEdit(it)} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
                            <FiEdit2 /> Edit
                          </button>
                          <button onClick={() => askDelete(it)} className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1">
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

        {/* Pagination (fixed 10/page) */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4">
          <div className="text-secondary">
            Total: <span className="fw-bold text-dark">{total}</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn-outline-secondary">Prev</button>
            <span className="small">Page <b>{page}</b> / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn btn-outline-secondary">Next</button>
          </div>
        </div>
      </div>

      {/* Confirm delete (portal) */}
      <Confirm
        open={confirm.open}
        title="Delete Website"
        message={<span>Are you sure you want to delete <b>{confirm.name}</b>? This action cannot be undone.</span>}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
        onConfirm={doDelete}
      />

      {/* Centered notice (portal) */}
      <CenterNotice
        open={notice.open}
        type={notice.type}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice((n) => ({ ...n, open: false }))}
      />

      {/* Image full-screen preview overlay (portal) */}
      {createPortal(
        <AnimatePresence>
          {preview.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="position-fixed top-0 start-0 w-100"
              style={{ zIndex: 6100, height: "100dvh", background: "rgba(0,0,0,.85)" }}
              onClick={() => setPreview({ open: false, src: "", title: "" })}
            >
              <div className="container h-100 d-flex flex-column justify-content-center align-items-center overflow-auto py-3" style={{ touchAction: "manipulation" }}>
                <img
                  src={preview.src}
                  alt={preview.title}
                  className="img-fluid d-block"
                  style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  className="btn btn-light btn-sm mt-3 d-inline-flex align-items-center gap-1"
                  onClick={(e) => { e.stopPropagation(); setPreview({ open: false, src: "", title: "" }); }}
                  title="Close"
                >
                  <FiX /> Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Busy overlay (portal) */}
      <BusyOverlay show={loading} />
    </div>
  );
}
