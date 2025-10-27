// src/pages/GetPassword.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Swal from "sweetalert2";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/password-manager";
const TYPES = ["", "app", "website", "email", "mobile", "screen", "cloud", "document", "private_lock", "other"];
const TYPE_COLORS = {
  app: "bg-success-subtle text-success-emphasis",
  website: "bg-warning-subtle text-warning-emphasis",
  email: "bg-warning-subtle text-warning-emphasis",
  mobile: "bg-danger-subtle text-danger-emphasis",
  screen: "bg-success-subtle text-success-emphasis",
  cloud: "bg-secondary-subtle text-secondary-emphasis",
  document: "bg-warning-subtle text-warning-emphasis",
  private_lock: "bg-secondary-subtle text-secondary-emphasis",
  other: "bg-success-subtle text-success-emphasis",
};

export default function GetPassword() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingTable, setLoadingTable] = useState(true);
  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const [showPwRow, setShowPwRow] = useState({});
  const [editItem, setEditItem] = useState(null);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const toastTimerRef = useRef(null);
  const abortRef = useRef(null);

  const showCenterMsg = (kind, text, ms = 1500) => {
    setOverlayMsg({ show: true, type: kind, text });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setOverlayMsg({ show: false, type: "", text: "" }), ms);
  };

  // Styles (no hiding on mobile)
  useEffect(() => {
    const id = "pm-style-v2";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root { --brand1:#06b6d4; --brand2:#22c55e; --brand3:#a78bfa; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .glass { background:#ffffff; border:1px solid rgba(15,23,42,.10); box-shadow:0 12px 32px rgba(0,0,0,.07); border-radius:16px; }
      .btn-ripple { position:relative; overflow:hidden; }
      .btn-ripple:active::after { content:""; position:absolute; left:50%; top:50%; width:220px; height:220px; transform:translate(-50%,-50%); border-radius:999px; background:currentColor; opacity:.15; }
      .pill { border-radius:999px; }
      .brand-title { background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); -webkit-background-clip:text; background-clip:text; color:transparent }
      /* Card list on mobile */
      .pw-card { border:1px solid rgba(0,0,0,.07); border-radius:14px; padding:12px; box-shadow:0 6px 18px rgba(0,0,0,.05); }
      .pw-row { display:flex; gap:8px; align-items:center; justify-content:space-between; }
      .pw-label { font-weight:600; color:#64748b; min-width:92px; }
      .pw-value { word-break:break-word; overflow-wrap:anywhere; }
      .pw-dots { letter-spacing:2px; font-size:1.05rem; }
      .action-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
      @media (min-width: 576px) { .action-grid { grid-template-columns:repeat(3, minmax(0,1fr)); } }
      /* Table polish (desktop) */
      .table thead th { position:sticky; top:0; background:#f8fafc; z-index:1; }
      .table-hover tbody tr:hover { transform:translateY(-1px); transition:transform .15s ease, box-shadow .15s ease; box-shadow:0 2px 12px rgba(0,0,0,.04); }
    `;
    document.head.appendChild(s);
  }, []);

  // Lock body scroll for overlays
  useEffect(() => {
    const hasOverlay = busy || overlayMsg.show;
    document.body.style.overflow = hasOverlay ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [busy, overlayMsg.show]);

  // Fetch list
  const fetchList = async (signal) => {
    setLoadingTable(true);
    try {
      let url = BASE_URL;
      const qs = [];
      if (type) qs.push(`type=${encodeURIComponent(type)}`);
      if (qs.length) url += `?${qs.join("&")}`;

      const res = await fetch(url, { signal });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to fetch");
      let data = Array.isArray(json.data) ? json.data : [];
      if (q.trim()) {
        const qq = q.trim().toLowerCase();
        data = data.filter((it) =>
          (it.name || "").toLowerCase().includes(qq) ||
          (it.username || "").toLowerCase().includes(qq) ||
          (it.password || "").toLowerCase().includes(qq) ||
          (it.type || "").toLowerCase().includes(qq) ||
          (it.additional_info ? JSON.stringify(it.additional_info).toLowerCase().includes(qq) : false)
        );
      }
      setItems(data);
    } catch (e) {
      if (e.name !== "AbortError") showCenterMsg("error", e.message);
    } finally {
      setLoadingTable(false);
    }
  };

  // Initial load
  useEffect(() => {
    const ctl = new AbortController();
    fetchList(ctl.signal);
    return () => ctl.abort();
  }, []);

  // Refetch on filters/search (debounced)
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const t = setTimeout(() => fetchList(ctl.signal), 180);
    setPage(1);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [type, q]);

  // Helpers
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      showCenterMsg("success", "Copied!");
    } catch {
      showCenterMsg("error", "Copy failed");
    }
  };

  const deleteRecord = async (id) => {
    const row = items.find((x) => x.id === id);
    const name = row?.name || "this entry";
    const res = await Swal.fire({
      title: "Delete Entry?",
      html: `<div style="font-size:1rem">Are you sure you want to remove <b>${name}</b>?</div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#ef4444",
      background: "#fff",
      color: "#111827",
    });
    if (!res.isConfirmed) return;

    setBusy(true);
    try {
      const r = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((x) => x.id !== id));
      showCenterMsg("success", "Deleted");
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    if (!String(editItem.name || "").trim()) return showCenterMsg("error", "Name required");
    if (!String(editItem.password || "").trim()) return showCenterMsg("error", "Password required");

    let payload = { ...editItem };
    if (typeof editItem.additional_info === "string") {
      const s = editItem.additional_info.trim();
      if (s.startsWith("{") || s.startsWith("[")) {
        try { payload.additional_info = JSON.parse(s); } catch {}
      }
    }

    setBusy(true);
    try {
      const res = await fetch(`${BASE_URL}/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Update failed");
      const updated = j?.data || payload;
      setItems((prev) => prev.map((x) => (x.id === editItem.id ? updated : x)));
      showCenterMsg("success", "Updated");
      setEditItem(null);
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = useMemo(() => items.length, [items]);
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const renderAI = (ai) => {
    if (ai == null) return "-";
    if (typeof ai === "string") return ai || "-";
    try { return JSON.stringify(ai); } catch { return String(ai); }
  };

  const dotsOf = (pw) => "•".repeat(Math.min((pw || "").length || 3, 12));

  return (
    <div className="container-xxl py-3" style={{ background: "linear-gradient(180deg,#fff,#f7fbff)", minHeight: "100dvh" }}>
      {/* Header */}
      <div className="glass p-3 p-md-4 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(180deg,var(--brand1),var(--brand2))",
              display: "grid", placeItems: "center", color: "#05212a", fontWeight: 800,
            }}
          >
            PW
          </div>
          <div>
            <h4 className="m-0 brand-title">Saved Passwords</h4>
            <div className="text-muted small">Search, edit, copy, and manage securely</div>
          </div>
        </div>
        <div className="text-end mt-1 mt-md-0">
          <div className="text-muted small">Total</div>
          <div className="fw-bold">{activeCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-2 p-md-3 mb-3 d-flex flex-wrap align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">Type</span>
          <select
            className="form-select"
            style={{ width: 220, maxWidth: "60vw" }}
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by type"
          >
            {TYPES.map((t) => (
              <option key={t || "all"} value={t}>
                {t || "All"}
              </option>
            ))}
          </select>
        </div>
        <div className="ms-auto w-100 w-sm-auto" style={{ minWidth: 240 }}>
          <input
            className="form-control"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, user, notes…"
            aria-label="Search passwords"
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="glass p-2 p-sm-3">
        {/* Loading row */}
        {loadingTable && (
          <div className="text-center py-5">
            <LoadingSpiner />
          </div>
        )}

        {/* MOBILE: Card list (xs–sm) */}
        {!loadingTable && (
          <div className="d-md-none">
            {pageItems.length === 0 ? (
              <div className="text-center text-muted py-5">No data found</div>
            ) : (
              <div className="row g-2">
                {pageItems.map((r, idx) => {
                  const i = (page - 1) * PAGE_SIZE + idx;
                  const visible = !!showPwRow[r.id];
                  return (
                    <div className="col-12" key={r.id}>
                      <div className="pw-card">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge pill bg-light text-dark">#{i + 1}</span>
                          <span className={`badge ${TYPE_COLORS[r.type] || "bg-secondary-subtle"}`}>{r.type || "other"}</span>
                        </div>
                        <div className="pw-row"><div className="pw-label">Name</div><div className="pw-value">{r.name}</div></div>
                        <div className="pw-row"><div className="pw-label">Username</div>
                          <div className="pw-value">
                            <span className="font-monospace">{r.username || "-"}</span>
                            {r.username && (
                              <button className="btn btn-outline-secondary btn-sm ms-2 btn-ripple" onClick={() => copyToClipboard(r.username)}>Copy</button>
                            )}
                          </div>
                        </div>
                        <div className="pw-row"><div className="pw-label">Password</div>
                          <div className="pw-value">
                            <span className="font-monospace">{visible ? (r.password || "-") : <span className="pw-dots">{dotsOf(r.password)}</span>}</span>
                            {r.password && (
                              <>
                                <button className="btn btn-soft btn-sm ms-2 btn-ripple" onClick={() => setShowPwRow((s) => ({ ...s, [r.id]: !visible }))}>
                                  {visible ? "Hide" : "Show"}
                                </button>
                                <button className="btn btn-outline-secondary btn-sm ms-2 btn-ripple" onClick={() => copyToClipboard(r.password)}>Copy</button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="pw-row"><div className="pw-label">Notes</div><div className="pw-value">{renderAI(r.additional_info)}</div></div>

                        <div className="action-grid mt-3">
                          {r.username && (
                            <button className="btn btn-outline-secondary btn-ripple" onClick={() => copyToClipboard(r.username)}>Copy U</button>
                          )}
                          {r.password && (
                            <button className="btn btn-outline-secondary btn-ripple" onClick={() => copyToClipboard(r.password)}>Copy P</button>
                          )}
                          <button className="btn btn-outline-primary btn-ripple" onClick={() => setEditItem({ ...r })}>Edit</button>
                          <button className="btn btn-outline-danger btn-ripple" onClick={() => deleteRecord(r.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DESKTOP/TABLET: Table (md+) */}
        {!loadingTable && (
          <div className="d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover m-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th style={{ minWidth: 110 }}>Type</th>
                    <th style={{ minWidth: 160 }}>Name</th>
                    <th style={{ minWidth: 160 }}>Username</th>
                    <th style={{ minWidth: 220 }}>Password</th>
                    <th style={{ minWidth: 220 }}>Notes</th>
                    <th className="text-end" style={{ width: 230 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">No data found</td>
                    </tr>
                  ) : (
                    pageItems.map((r, idx) => {
                      const i = (page - 1) * PAGE_SIZE + idx;
                      const visible = !!showPwRow[r.id];
                      return (
                        <tr key={r.id}>
                          <td>{i + 1}</td>
                          <td><span className={`badge ${TYPE_COLORS[r.type] || "bg-secondary-subtle"}`}>{r.type || "other"}</span></td>
                          <td><span title={r.name}>{r.name}</span></td>
                          <td>
                            <span className="font-monospace" title={r.username || "-"}>{r.username || "-"}</span>
                            {r.username && (
                              <button className="btn btn-outline-secondary btn-sm ms-2 btn-ripple" onClick={() => copyToClipboard(r.username)}>Copy</button>
                            )}
                          </td>
                          <td>
                            <span className="font-monospace">
                              {visible ? r.password || "-" : <span className="pw-dots">{dotsOf(r.password)}</span>}
                            </span>
                            {r.password && (
                              <>
                                <button className="btn btn-soft btn-sm ms-2 btn-ripple" onClick={() => setShowPwRow((s) => ({ ...s, [r.id]: !visible }))}>
                                  {visible ? "Hide" : "Show"}
                                </button>
                                <button className="btn btn-outline-secondary btn-sm ms-2 btn-ripple" onClick={() => copyToClipboard(r.password)}>Copy</button>
                              </>
                            )}
                          </td>
                          <td><span title={renderAI(r.additional_info)}>{renderAI(r.additional_info)}</span></td>
                          <td className="text-end">
                            <div className="d-inline-flex flex-wrap gap-2">
                              {r.username && (
                                <button className="btn btn-outline-secondary btn-sm btn-ripple" onClick={() => copyToClipboard(r.username)}>Copy U</button>
                              )}
                              {r.password && (
                                <button className="btn btn-outline-secondary btn-sm btn-ripple" onClick={() => copyToClipboard(r.password)}>Copy P</button>
                              )}
                              <button className="btn btn-outline-primary btn-sm btn-ripple" onClick={() => setEditItem({ ...r })}>Edit</button>
                              <button className="btn btn-outline-danger btn-sm btn-ripple" onClick={() => deleteRecord(r.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination (both views) */}
        {!loadingTable && items.length > 0 && (
          <div className="d-flex align-items-center justify-content-between p-2 p-sm-3 flex-wrap gap-2">
            <div className="text-muted small">
              Showing <b>{(page - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(page * PAGE_SIZE, items.length)}</b> of <b>{items.length}</b>
            </div>
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm btn-ripple" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
              <span className="btn btn-light btn-sm disabled">{page} / {totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm btn-ripple" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.55)", zIndex: 2200 }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit password"
          onClick={(e) => e.currentTarget === e.target && setEditItem(null)}
        >
          <div className="bg-white rounded-4 shadow p-3 p-sm-4" style={{ width: "96%", maxWidth: 640, maxHeight: "90vh", overflow: "auto" }}>
            <button className="btn-close float-end" onClick={() => setEditItem(null)} aria-label="Close"></button>
            <h5 className="brand-title fw-bold mb-3">Edit Password</h5>
            <div className="mb-3">
              <label className="form-label">Type</label>
              <select className="form-select" value={editItem.type || ""} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t || "sel"} value={t}>{t || "Select type"}</option>
                ))}
              </select>
            </div>
            <div className="row g-2">
              <div className="col-sm-6">
                <label className="form-label">Name</label>
                <input className="form-control" value={editItem.name || ""} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Username</label>
                <input className="form-control" value={editItem.username || ""} onChange={(e) => setEditItem({ ...editItem, username: e.target.value })} />
              </div>
            </div>
            <div className="row g-2 mt-1">
              <div className="col-sm-6">
                <label className="form-label">Password</label>
                <input type="text" className="form-control" value={editItem.password || ""} onChange={(e) => setEditItem({ ...editItem, password: e.target.value })} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Additional Info</label>
                <textarea className="form-control" rows="1" value={
                  typeof editItem.additional_info === "string"
                    ? editItem.additional_info
                    : editItem.additional_info
                    ? JSON.stringify(editItem.additional_info)
                    : ""
                } onChange={(e) => setEditItem({ ...editItem, additional_info: e.target.value })}></textarea>
              </div>
            </div>
            <div className="text-end mt-3">
              <button className="btn btn-light me-2 btn-ripple" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-success px-4 btn-ripple" onClick={handleUpdate}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(255,255,255,.72)", zIndex: 2000 }}>
          <div className="bg-white rounded-4 shadow p-3 text-center d-flex flex-column align-items-center">
            <LoadingSpiner />
            <div className="text-muted mt-2">Working…</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {overlayMsg.show && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 2100 }}>
          <div className="bg-white shadow rounded-3 px-3 py-2" style={{ borderLeft: overlayMsg.type === "error" ? "6px solid #ef4444" : "6px solid #22c55e", minWidth: 220 }}>
            {overlayMsg.text}
          </div>
        </div>
      )}
    </div>
  );
}
