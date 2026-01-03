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
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setOverlayMsg({ show: false, type: "", text: "" });
    }, ms);
  };

  // Global styles (ONLY CSS + Bootstrap)
  useEffect(() => {
    const id = "pm-style-v7";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --brand1:#0b3b91;
        --brand2:#1e3a8a;
        --brand3:#0ea5e9;
        --card-blue:#1e3a8a;
        --nav-h: 0px;
      }

      /* Prevent horizontal cut everywhere */
      html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
      * { min-width: 0; }

      body{
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        background: linear-gradient(180deg,#ffffff,#f7fbff);
      }

      .glass{
        background:#ffffff;
        border:1px solid rgba(15,23,42,.10);
        box-shadow:0 12px 32px rgba(0,0,0,.07);
        border-radius:16px;
      }

      .brand-title{
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
        -webkit-background-clip:text; background-clip:text; color:transparent;
      }

      .btn-xs{ padding:.28rem .55rem; font-size:.78rem; border-radius:.55rem; }
      .btn-skin{ background:#f8fafc; border:1px solid #e2e8f0; }
      .btn-skin:hover{ background:#f1f5f9; }
      .btn-outline-darkblue{ color:var(--card-blue); border:1px solid var(--card-blue); background:#fff; }
      .btn-outline-darkblue:hover{ background:#f6f8ff; }

      .pw-card{
        border:2px solid var(--card-blue);
        border-radius:16px;
        padding:12px;
        box-shadow:0 8px 20px rgba(14,31,76,.08);
        background:#fff;
      }
      .pw-card + .pw-card{ margin-top:14px; }

      .pw-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-bottom:8px;
      }

      .round-badge{
        width:30px; height:30px; border-radius:999px;
        display:grid; place-items:center;
        background:linear-gradient(180deg,#172554,#1e3a8a);
        color:#fff; font-weight:800; font-size:.85rem;
        border:2px solid #93c5fd;
        flex: 0 0 auto;
      }

      .pw-row{ display:flex; gap:10px; align-items:flex-start; justify-content:space-between; }
      .pw-label{ font-weight:700; color:#334155; min-width:92px; font-size:.86rem; flex:0 0 auto; }
      .pw-value{
        flex: 1 1 auto;
        word-break: break-word;
        overflow-wrap: anywhere;
        white-space: normal;
      }

      .pw-actions-inline{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }

      .pw-dots{ letter-spacing:2px; font-size:1.05rem; }

      .action-grid{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
      @media (min-width:576px){ .action-grid{ grid-template-columns:repeat(4, minmax(0,1fr)); } }

      /* TABLE: ensure no cut, always wrap */
      .table-responsive{ overflow-x:auto; }
      table{ width:100%; }
      .table td, .table th{
        white-space: normal !important;
        word-break: break-word;
        overflow-wrap: anywhere;
        vertical-align: middle;
      }

      .table thead th{
        position: sticky;
        top: 0;
        background: #f8fafc;
        z-index: 1;
      }

      .toast-center{
        position:fixed; left:50%; top:50%;
        transform:translate(-50%,-50%);
        z-index:4001;
        background:#fff;
        border-radius:12px;
        padding:.65rem .9rem;
        border-left:6px solid #22c55e;
        box-shadow:0 14px 40px rgba(0,0,0,.18);
        min-width:220px;
        max-width: calc(100vw - 24px);
        text-align:center;
        font-weight:700;
      }
      .toast-center.error{ border-left-color:#ef4444; }

      .modal-scrim{
        position:fixed; inset:0;
        background:rgba(0,0,0,.55);
        z-index:4000;
        display:flex;
        align-items:flex-start;
        justify-content:center;
      }

      .sheet{
        width:100%;
        height: calc(100dvh - var(--nav-h, 0px));
        margin-top: var(--nav-h, 0px);
        max-width:100%;
        background:#fff;
        border-radius:0;
        display:flex;
        flex-direction:column;
        box-shadow:0 -8px 26px rgba(0,0,0,.25);
        animation: slideIn .18s ease-out;
      }
      @keyframes slideIn{
        from{ transform: translateY(10px); opacity:.95; }
        to{ transform: translateY(0); opacity:1; }
      }

      .sheet-head{
        position:sticky; top:0; z-index:1;
        background:#fff;
        border-bottom:1px solid #e5e7eb;
        padding:.9rem;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:.5rem;
      }
      .sheet-title{ margin:0; font-weight:800; }

      .sheet-body{
        padding: .9rem .9rem 1.1rem;
        overflow:auto;
        -webkit-overflow-scrolling: touch;
        flex: 1 1 auto;
      }

      .sheet-foot{
        position:sticky; bottom:0; z-index:1;
        background:#fff;
        border-top:1px solid #e5e7eb;
        padding:.75rem .9rem;
        display:flex;
        justify-content:flex-end;
        gap:.5rem;
        flex-wrap: wrap;
      }

      @media (min-width:768px){
        .modal-scrim{ align-items:center; }
        .sheet{
          width:96%;
          max-width:720px;
          height:auto;
          max-height:90vh;
          margin-top:0;
          border-radius:16px;
          overflow:hidden;
        }
        .sheet-head, .sheet-foot{ position:static; }
      }

      /* Responsive header spacing */
      .pm-logo{
        width:44px;height:44px;border-radius:12px;
        background:linear-gradient(180deg,#172554,#1e3a8a);
        display:grid;place-items:center;
        color:#eaf2ff;font-weight:800;
        border:2px solid #93c5fd;
        flex: 0 0 auto;
      }
    `;
    document.head.appendChild(s);
  }, []);

  // Lock body scroll & set navbar height when overlay/sheet is open
  useEffect(() => {
    const hasOverlay = busy || overlayMsg.show || !!editItem;

    if (typeof document !== "undefined") {
      document.body.style.overflow = hasOverlay ? "hidden" : "";
    }

    const setNavHeightVar = () => {
      if (typeof document === "undefined") return;
      const nav =
        document.querySelector("#navbar-container") ||
        document.querySelector(".navbar-fixed-top") ||
        document.querySelector(".navbar.sticky-top") ||
        document.querySelector(".navbar");
      const h = nav ? nav.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty("--nav-h", h + "px");
    };

    if (editItem) {
      setNavHeightVar();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", setNavHeightVar);
        window.addEventListener("orientationchange", setNavHeightVar);
      }
    }

    return () => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", setNavHeightVar);
        window.removeEventListener("orientationchange", setNavHeightVar);
      }
    };
  }, [busy, overlayMsg.show, editItem]);

  // Fetch list
  const fetchList = async (signal) => {
    setLoadingTable(true);
    try {
      let url = BASE_URL;
      const qs = [];
      if (type) qs.push("type=" + encodeURIComponent(type));
      if (qs.length > 0) url += "?" + qs.join("&");

      const res = await fetch(url, { signal });
      let json = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok) {
        const msg = json && json.message ? json.message : "Failed to fetch";
        throw new Error(msg);
      }

      let data = Array.isArray(json.data) ? json.data : [];

      if (q.trim()) {
        const qq = q.trim().toLowerCase();
        data = data.filter((it) => {
          const name = (it.name || "").toLowerCase();
          const username = (it.username || "").toLowerCase();
          const password = (it.password || "").toLowerCase();
          const typeVal = (it.type || "").toLowerCase();
          const ai = it.additional_info ? JSON.stringify(it.additional_info).toLowerCase() : "";
          return name.includes(qq) || username.includes(qq) || password.includes(qq) || typeVal.includes(qq) || ai.includes(qq);
        });
      }

      setItems(data);
    } catch (e) {
      if (!(e && e.name === "AbortError")) {
        showCenterMsg("error", e && e.message ? e.message : "Error");
      }
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    const ctl = new AbortController();
    fetchList(ctl.signal);
    return () => ctl.abort();
  }, []);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    const t = setTimeout(() => {
      fetchList(ctl.signal);
    }, 180);

    setPage(1);

    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [type, q]);

  const copyToClipboard = async (text, label = "Copied") => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text || "");
        showCenterMsg("success", label);
      } else {
        throw new Error("Clipboard not supported");
      }
    } catch {
      showCenterMsg("error", "Copy failed");
    }
  };

  const deleteRecord = async (id) => {
    if (!id) return;

    const row = items.find((x) => x.id === id || x._id === id);
    const name = row && row.name ? row.name : "this entry";

    const res = await Swal.fire({
      title: "Delete Entry?",
      html: '<div style="font-size:1rem">Are you sure you want to remove <b>' + name + "</b>?</div>",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0b3b91",
      cancelButtonColor: "#ef4444",
      background: "#fff",
      color: "#111827",
    });

    if (!res.isConfirmed) return;

    setBusy(true);
    try {
      const r = await fetch(BASE_URL + "/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");

      setItems((prev) => prev.filter((x) => (x.id || x._id) !== id));
      showCenterMsg("success", "Deleted");
    } catch (e) {
      showCenterMsg("error", e && e.message ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;

    const name = String(editItem.name || "").trim();
    const password = String(editItem.password || "").trim();

    if (!name) return showCenterMsg("error", "Name required");
    if (!password) return showCenterMsg("error", "Password required");

    const payload = { ...editItem };
    if (typeof editItem.additional_info === "string") {
      const s = editItem.additional_info.trim();
      if (s && (s[0] === "{" || s[0] === "[")) {
        try {
          payload.additional_info = JSON.parse(s);
        } catch {
          // keep as string if JSON parse fails
        }
      }
    }

    const id = editItem.id || editItem._id;
    if (!id) return showCenterMsg("error", "Missing id");

    setBusy(true);
    try {
      const res = await fetch(BASE_URL + "/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let j = {};
      try {
        j = await res.json();
      } catch {
        j = {};
      }

      if (!res.ok) {
        const msg = j && j.message ? j.message : "Update failed";
        throw new Error(msg);
      }

      const updated = j && j.data ? j.data : payload;
      setItems((prev) => prev.map((x) => ((x.id || x._id) === id ? updated : x)));

      showCenterMsg("success", "Updated");
      setEditItem(null);
    } catch (e) {
      showCenterMsg("error", e && e.message ? e.message : "Update failed");
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
    try {
      return JSON.stringify(ai);
    } catch {
      return String(ai);
    }
  };

  const dotsOf = (pw) => {
    const s = pw || "";
    const len = s.length || 3;
    const n = Math.min(len, 12);
    return "•".repeat(n);
  };

  return (
    <div className="container-fluid px-2 px-md-3 py-3" style={{ minHeight: "100dvh" }} aria-hidden={!!editItem}>
      {/* Header */}
      <div className="glass p-3 p-md-4 mb-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="pm-logo">PW</div>
            <div>
              <h4 className="m-0 brand-title">Saved Passwords</h4>
              <div className="text-muted small">Search, edit, copy, and manage securely</div>
            </div>
          </div>

          <div className="text-md-end">
            <div className="text-muted small">Total</div>
            <div className="fw-bold">{activeCount}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <label className="form-label mb-1 text-muted small">Type</label>
            <select
              className="form-select form-select-sm"
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

          <div className="col-12 col-md-8">
            <label className="form-label mb-1 text-muted small">Search</label>
            <input
              className="form-control form-control-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, user, notes…"
              aria-label="Search passwords"
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="glass p-2 p-sm-3">
        {loadingTable && (
          <div className="text-center py-5">
            <LoadingSpiner />
          </div>
        )}

        {/* MOBILE: Cards */}
        {!loadingTable && (
          <div className="d-md-none">
            {pageItems.length === 0 ? (
              <div className="text-center text-muted py-5">No data found</div>
            ) : (
              <div className="row g-3">
                {pageItems.map((r, idx) => {
                  const rowId = r.id || r._id;
                  const i = (page - 1) * PAGE_SIZE + idx;
                  const visible = rowId ? !!showPwRow[rowId] : false;

                  return (
                    <div className="col-12" key={rowId || i}>
                      <div className="pw-card">
                        <div className="pw-head">
                          <span className="round-badge">{i + 1}</span>
                          <span className={"badge " + (TYPE_COLORS[r.type] || "bg-secondary-subtle")}>
                            {r.type || "other"}
                          </span>
                        </div>

                        <div className="pw-row">
                          <div className="pw-label">Name</div>
                          <div className="pw-value">{r.name}</div>
                        </div>

                        <div className="pw-row">
                          <div className="pw-label">Username</div>
                          <div className="pw-value">
                            <span className="font-monospace">{r.username || "-"}</span>
                            <div className="pw-actions-inline">
                              {r.username && (
                                <button
                                  className="btn btn-outline-darkblue btn-xs"
                                  onClick={() => copyToClipboard(r.username, "Username Copied")}
                                >
                                  Copy Username
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pw-row">
                          <div className="pw-label">Password</div>
                          <div className="pw-value">
                            <span className="font-monospace">
                              {visible ? r.password || "-" : <span className="pw-dots">{dotsOf(r.password)}</span>}
                            </span>
                            <div className="pw-actions-inline">
                              {r.password && (
                                <>
                                  <button
                                    className="btn btn-skin btn-xs"
                                    onClick={() =>
                                      setShowPwRow((s) => ({
                                        ...s,
                                        [rowId]: !visible,
                                      }))
                                    }
                                  >
                                    {visible ? "Hide Password" : "Show Password"}
                                  </button>
                                  <button
                                    className="btn btn-outline-darkblue btn-xs"
                                    onClick={() => copyToClipboard(r.password, "Password Copied")}
                                  >
                                    Copy Password
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pw-row">
                          <div className="pw-label">Notes</div>
                          <div className="pw-value">{renderAI(r.additional_info)}</div>
                        </div>

                        <div className="action-grid mt-3">
                          <button className="btn btn-outline-darkblue btn-xs" onClick={() => setEditItem({ ...r })}>
                            Edit
                          </button>
                          <button className="btn btn-outline-danger btn-xs" onClick={() => deleteRecord(rowId)}>
                            Delete
                          </button>
                          {r.username && (
                            <button className="btn btn-outline-secondary btn-xs" onClick={() => copyToClipboard(r.username, "Username Copied")}>
                              Copy U
                            </button>
                          )}
                          {r.password && (
                            <button className="btn btn-outline-secondary btn-xs" onClick={() => copyToClipboard(r.password, "Password Copied")}>
                              Copy P
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DESKTOP/TABLET: Table */}
        {!loadingTable && (
          <div className="d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover m-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th style={{ minWidth: 110 }}>Type</th>
                    <th style={{ minWidth: 160 }}>Name</th>
                    <th style={{ minWidth: 180 }}>Username</th>
                    <th style={{ minWidth: 240 }}>Password</th>
                    <th style={{ minWidth: 260 }}>Notes</th>
                    <th className="text-end" style={{ minWidth: 240 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No data found
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((r, idx) => {
                      const rowId = r.id || r._id;
                      const i = (page - 1) * PAGE_SIZE + idx;
                      const visible = rowId ? !!showPwRow[rowId] : false;

                      return (
                        <tr key={rowId || i}>
                          <td>{i + 1}</td>
                          <td>
                            <span className={"badge " + (TYPE_COLORS[r.type] || "bg-secondary-subtle")}>
                              {r.type || "other"}
                            </span>
                          </td>

                          <td>{r.name}</td>

                          <td>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <span className="font-monospace">{r.username || "-"}</span>
                              {r.username && (
                                <button className="btn btn-outline-darkblue btn-xs" onClick={() => copyToClipboard(r.username, "Username Copied")}>
                                  Copy Username
                                </button>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <span className="font-monospace">
                                {visible ? r.password || "-" : <span className="pw-dots">{dotsOf(r.password)}</span>}
                              </span>
                              {r.password && (
                                <>
                                  <button
                                    className="btn btn-skin btn-xs"
                                    onClick={() =>
                                      setShowPwRow((s) => ({
                                        ...s,
                                        [rowId]: !visible,
                                      }))
                                    }
                                  >
                                    {visible ? "Hide Password" : "Show Password"}
                                  </button>
                                  <button className="btn btn-outline-darkblue btn-xs" onClick={() => copyToClipboard(r.password, "Password Copied")}>
                                    Copy Password
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          <td>{renderAI(r.additional_info)}</td>

                          <td className="text-end">
                            <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                              <button className="btn btn-outline-darkblue btn-xs" onClick={() => setEditItem({ ...r })}>
                                Edit
                              </button>
                              <button className="btn btn-outline-danger btn-xs" onClick={() => deleteRecord(rowId)}>
                                Delete
                              </button>
                              {r.username && (
                                <button className="btn btn-outline-secondary btn-xs" onClick={() => copyToClipboard(r.username, "Username Copied")}>
                                  Copy U
                                </button>
                              )}
                              {r.password && (
                                <button className="btn btn-outline-secondary btn-xs" onClick={() => copyToClipboard(r.password, "Password Copied")}>
                                  Copy P
                                </button>
                              )}
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

        {/* Pagination */}
        {!loadingTable && items.length > 0 && (
          <div className="d-flex align-items-center justify-content-between p-2 p-sm-3 flex-wrap gap-2">
            <div className="text-muted small">
              Showing <b>{(page - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(page * PAGE_SIZE, items.length)}</b> of{" "}
              <b>{items.length}</b>
            </div>

            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </button>
              <span className="btn btn-light btn-xs disabled">
                {page} / {totalPages}
              </span>
              <button className="btn btn-outline-secondary btn-xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Sheet */}
      {editItem && (
        <div
          className="modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Edit password"
          onClick={(e) => {
            if (e.currentTarget === e.target) setEditItem(null);
          }}
        >
          <div className="sheet">
            <div className="sheet-head">
              <h5 className="sheet-title brand-title">Edit Password</h5>
              <button className="btn btn-light btn-xs" onClick={() => setEditItem(null)}>
                Close
              </button>
            </div>

            <div className="sheet-body">
              <div className="mb-3">
                <label className="form-label">Type</label>
                <select className="form-select" value={editItem.type || ""} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t || "sel"} value={t}>
                      {t || "Select type"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row g-2">
                <div className="col-12 col-sm-6">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={editItem.name || ""} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label">Username</label>
                  <input className="form-control" value={editItem.username || ""} onChange={(e) => setEditItem({ ...editItem, username: e.target.value })} />
                </div>
              </div>

              <div className="row g-2 mt-1">
                <div className="col-12 col-sm-6">
                  <label className="form-label">Password</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editItem.password || ""}
                    onChange={(e) => setEditItem({ ...editItem, password: e.target.value })}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label">Additional Info</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={
                      typeof editItem.additional_info === "string"
                        ? editItem.additional_info
                        : editItem.additional_info
                        ? JSON.stringify(editItem.additional_info)
                        : ""
                    }
                    onChange={(e) => setEditItem({ ...editItem, additional_info: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="sheet-foot">
              <button className="btn btn-light btn-xs" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button className="btn btn-outline-darkblue btn-xs px-3" onClick={handleUpdate}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(255,255,255,.72)", zIndex: 3999 }}>
          <div className="bg-white rounded-4 shadow p-3 text-center d-flex flex-column align-items-center">
            <LoadingSpiner />
            <div className="text-muted mt-2">Working…</div>
          </div>
        </div>
      )}

      {/* Centered Toast */}
      {overlayMsg.show && (
        <div className={"toast-center " + (overlayMsg.type === "error" ? "error" : "")}>
          {overlayMsg.text}
        </div>
      )}
    </div>
  );
}
