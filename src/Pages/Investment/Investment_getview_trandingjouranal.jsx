// src/pages/Investment_getview_trandingjouranal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_getview_trandingjouranal() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // ---------- UI ----------
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "refresh" | `upd-${id}` | `del-${id}`
  const [modal, setModal] = useState({ open: false, title: "", message: "", kind: "error" });

  const openError = (message) =>
    setModal({ open: true, title: "Error", message: message || "Something went wrong", kind: "error" });
  const openInfo = (message) => setModal({ open: true, title: "Success", message: message || "Done", kind: "info" });
  const closeModal = () => setModal({ open: false, title: "", message: "", kind: "error" });

  // ---------- Master data ----------
  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);
  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");

  // month filter
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  // ---------- Data ----------
  const [dailySummary, setDailySummary] = useState([]);

  // ---------- Update Modal ----------
  const [edit, setEdit] = useState({
    open: false,
    journal_id: null,
    platform_id: "",
    segment_id: "",
    plan_id: null,
    trade_date: "",
    trade_name: "",
    profit: "0",
    loss: "0",
    brokerage: "0",
    trade_logic: "",
    mistakes: "",
  });

  const closeEdit = () =>
    setEdit({
      open: false,
      journal_id: null,
      platform_id: "",
      segment_id: "",
      plan_id: null,
      trade_date: "",
      trade_name: "",
      profit: "0",
      loss: "0",
      brokerage: "0",
      trade_logic: "",
      mistakes: "",
    });

  // ✅ segments for edit modal (so segment dropdown always correct)
  const [editSegments, setEditSegments] = useState([]);

  // responsive
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 992 : true);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // ✅ lock page scroll when modal open (edit or info modal)
  useEffect(() => {
    const shouldLock = !!edit.open || !!modal.open;
    if (shouldLock) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
  }, [edit.open, modal.open]);

  // ---------- Helpers ----------
  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  };

  const toNumber = (v) => {
    const n = Number(String(v ?? 0).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumber = (v) => {
    if (v === null || v === undefined || v === "") return "0";
    const n = toNumber(v);
    return n.toFixed(10).replace(/\.?0+$/, "");
  };

  const netTone = (v) => {
    const n = toNumber(v);
    return n > 0 ? "pos" : n < 0 ? "neg" : "neu";
  };

  const toIntStr = (v) => String(v ?? "").replace(/[^\d]/g, "");

  const validateEdit = () => {
    if (!edit.trade_date) return "Trade date required";
    if (!String(edit.trade_name || "").trim()) return "Trade name required";
    if (!String(edit.trade_logic || "").trim()) return "Trade logic required";

    const p = toNumber(edit.profit);
    const l = toNumber(edit.loss);
    const b = toNumber(edit.brokerage);

    if (p < 0 || l < 0 || b < 0) return "Profit/Loss/Brokerage must be 0 or more";

    const ok = (p === 0 && l > 0) || (l === 0 && p > 0) || (p === 0 && l === 0);
    if (!ok) return "Either Profit OR Loss should be > 0 (both cannot be > 0)";
    if (p === 0 && l === 0 && b > 0) return "Brokerage not allowed when profit=loss=0";
    return "";
  };

  // ---------- API ----------
  const api = {
    async getPlatforms() {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Platform fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getSegments(pid) {
      if (!pid) return [];
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/segment?platform_id=${pid}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Segment fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getDailySummary({ platform_id, segment_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/daily-summary?${qs.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Daily summary fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async updateJournal(journal_id, payload) {
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/${journal_id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Update failed");
      return data?.data;
    },

    async deleteJournal(journal_id) {
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/${journal_id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      return true;
    },
  };

  // avoid double init
  const didInit = useRef(false);

  // ---------- Initial load ----------
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        setInitialLoading(true);
        const p = await api.getPlatforms();
        setPlatforms(p);
      } catch (e) {
        openError(e.message);
      } finally {
        setInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // segments when filter platform changes
  useEffect(() => {
    (async () => {
      try {
        setSegments([]);
        setSegmentId("");
        if (!platformId) return;
        const s = await api.getSegments(platformId);
        setSegments(s);
      } catch (e) {
        openError(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  // ✅ segments when EDIT modal platform changes (fix for modal dropdown)
  useEffect(() => {
    (async () => {
      try {
        setEditSegments([]);
        if (!edit.open) return;
        if (!edit.platform_id) return;
        const s = await api.getSegments(edit.platform_id);
        setEditSegments(s);
      } catch (e) {
        openError(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit.open, edit.platform_id]);

  // ---------- Refresh ----------
  const refresh = async () => {
    try {
      setBusy("refresh");
      const rows = await api.getDailySummary({
        platform_id: platformId || null,
        segment_id: segmentId || null,
        month,
      });
      setDailySummary(Array.isArray(rows) ? rows : []);
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, platformId, segmentId]);

  // ---------- Actions ----------
  const onOpenUpdate = async (r) => {
    // set edit first
    setEdit({
      open: true,
      journal_id: r.journal_id,
      platform_id: String(r.platform_id ?? ""),
      segment_id: String(r.segment_id ?? ""),
      plan_id: r.plan_id ?? null,
      trade_date: (r.trade_date || "").slice(0, 10),
      trade_name: r.trade_name || "",
      profit: String(r.profit ?? 0),
      loss: String(r.loss ?? 0),
      brokerage: String(r.brokerage ?? 0),
      trade_logic: r.trade_logic || "",
      mistakes: r.mistakes || "",
    });
  };

  const onUpdate = async () => {
    const v = validateEdit();
    if (v) return openError(v);

    const payload = {
      platform_id: Number(edit.platform_id),
      segment_id: Number(edit.segment_id),
      plan_id: edit.plan_id === null || edit.plan_id === "" ? null : Number(edit.plan_id),
      trade_date: edit.trade_date,
      trade_name: String(edit.trade_name).trim(),
      profit: toNumber(edit.profit),
      loss: toNumber(edit.loss),
      brokerage: toNumber(edit.brokerage),
      trade_logic: String(edit.trade_logic).trim(),
      mistakes: String(edit.mistakes || "").trim() ? String(edit.mistakes).trim() : null,
    };

    try {
      setBusy(`upd-${edit.journal_id}`);
      await api.updateJournal(edit.journal_id, payload);
      openInfo("Updated");
      closeEdit();
      await refresh();
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  const onDelete = async (journal_id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      setBusy(`del-${journal_id}`);
      await api.deleteJournal(journal_id);
      openInfo("Deleted");
      await refresh();
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  // ---------- Small UI ----------
  const SmallBtn = ({ variant = "dark", outline = false, disabled, onClick, children, className = "" }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn ${outline ? `btn-outline-${variant}` : `btn-${variant}`} btn-sm ijv-btn ${className}`}
    >
      {children}
    </button>
  );

  const NetPill = ({ value }) => {
    const t = netTone(value);
    return <span className={`ijv-pill ijv-${t}`}>{formatNumber(value)}</span>;
  };

  const renderLogic = (txt) => (String(txt || "").trim() ? String(txt) : "-");
  const renderMistake = (txt) => (String(txt || "").trim() ? String(txt) : "-");

  return (
    <div className="ijv-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

        /* ✅ FULL EDGE-TO-EDGE RESET */
        html, body { width:100%; margin:0; padding:0; }
        .container-fluid { padding-left: 0 !important; padding-right: 0 !important; }
        .row { margin-left: 0 !important; margin-right: 0 !important; }
        [class^="col-"], [class*=" col-"] { padding-left: 0 !important; padding-right: 0 !important; }

        .ijv-root{
          min-height:100vh;
          width:100%;
          color:#0f172a;
          font-family:"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
          background:
            radial-gradient(900px 520px at 12% 8%, rgba(124,58,237,.12), transparent 60%),
            radial-gradient(900px 520px at 90% 14%, rgba(6,182,212,.12), transparent 60%),
            radial-gradient(900px 520px at 40% 96%, rgba(245,158,11,.10), transparent 60%),
            linear-gradient(135deg, #f6f8ff, #fff7f1);
          padding-bottom: 72px;
        }

        .ijv-topbar{
          position:sticky;
          top:0;
          z-index:40;
          background:rgba(255,255,255,.74);
          border-bottom:1px solid rgba(15,23,42,.10);
          backdrop-filter: blur(14px);
        }
        .ijv-topbarInner{
          width: 100%;
          padding: 10px 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .ijv-title{
          margin:0;
          font-weight:1000;
          letter-spacing:.2px;
          font-size:16px;
          line-height:1.2;
        }
        .ijv-sub{
          margin:0;
          color:rgba(15,23,42,.62);
          font-weight:850;
          font-size:12px;
        }

        /* ✅ FULL WIDTH CARD */
        .ijv-card{
          width: 100%;
          border-top:1px solid rgba(15,23,42,.10);
          border-bottom:1px solid rgba(15,23,42,.10);
          border-left:0;
          border-right:0;
          border-radius: 0;
          overflow:hidden;
          background:rgba(255,255,255,.88);
          box-shadow:0 14px 34px rgba(15,23,42,0.08);
        }

        @media (min-width: 992px){
          .ijv-wrap{ padding: 12px; }
          .ijv-card{ border:1px solid rgba(15,23,42,.10); border-radius:18px; }
          .ijv-title{ font-size:18px; }
        }

        .ijv-head{
          background:rgba(255,255,255,.66);
          border-bottom:1px solid rgba(15,23,42,.10);
        }
        .ijv-label{
          font-size:12px;
          color:rgba(15,23,42,.62);
          font-weight:900;
          margin-bottom:6px;
        }

        .ijv-form .form-select,
        .ijv-form .form-control{
          border-radius:14px;
          border:1px solid rgba(15,23,42,.14);
          font-weight:850;
        }

        .ijv-btn{
          border-radius:14px !important;
          font-weight:950 !important;
          letter-spacing:.15px;
          padding:.33rem .55rem !important;
          box-shadow:0 8px 18px rgba(15,23,42,0.08);
          white-space: nowrap;
          min-width: 92px;          /* ✅ better for mobile buttons */
        }
        @media (max-width: 420px){
          .ijv-btn{ min-width: 86px; }
        }

        .ijv-table thead th{
          position: sticky;
          top: 0;
          z-index: 2;
          background: rgba(248,250,252,.95) !important;
          border-bottom: 1px solid rgba(15,23,42,.10) !important;
          font-size: 12px;
          color: rgba(15,23,42,.66);
          font-weight: 950;
          white-space: nowrap;
        }
        .ijv-table td{
          vertical-align: top;
          font-size: 13px;
          font-weight: 850;
        }

        .ijv-meta{
          font-size:11px;
          font-weight:900;
          color:rgba(15,23,42,.50);
        }

        .ijv-pill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:6px 10px;
          border-radius:999px;
          font-weight:1000;
          font-size:12px;
          border:1px solid rgba(15,23,42,.12);
          min-width:88px;
          white-space:nowrap;
        }
        .ijv-pos{ background:rgba(22,163,74,.10); color:#15803d; }
        .ijv-neg{ background:rgba(225,29,72,.10); color:#be123c; }
        .ijv-neu{ background:rgba(37,99,235,.10); color:#1d4ed8; }

        .ijv-logic{
          color:#1d4ed8;
          font-weight:900;
          max-width: 420px;
          white-space: normal;
          word-break: break-word;
          line-height: 1.25;
        }
        .ijv-mistake{
          color:#dc2626;
          font-weight:950;
          max-width: 420px;
          white-space: normal;
          word-break: break-word;
          line-height: 1.25;
        }

        /* Mobile cards */
        .ijv-mcard{
          width: 100%;
          border-top:1px solid rgba(15,23,42,.10);
          border-bottom:1px solid rgba(15,23,42,.10);
          border-left:0;
          border-right:0;
          border-radius:0;
          background:rgba(255,255,255,.88);
          box-shadow:0 14px 34px rgba(15,23,42,0.08);
          overflow:hidden;
          margin-bottom: 10px;
        }
        @media (min-width: 992px){
          .ijv-mcard{ border:1px solid rgba(15,23,42,.10); border-radius:18px; }
        }

        .ijv-mcardHead{
          padding: 12px 14px;
          border-bottom:1px solid rgba(15,23,42,.10);
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
        }
        .ijv-mcardBody{ padding: 12px 14px; }
        .ijv-row2{ display:flex; gap:10px; flex-wrap:wrap; }
        .ijv-kv{ font-size:12px; font-weight:950; color:rgba(15,23,42,.60); }
        .ijv-block{ margin-top: 10px; }

        /* ✅ MODAL: center + internal scroll + footer always visible */
        .ijv-modalOverlay{
          position:fixed;
          inset:0;
          background:rgba(15,23,42,0.38);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 12px;
          z-index:9999;
          overflow:auto;
          -webkit-overflow-scrolling: touch;
        }

        .ijv-modal{
          width: min(96vw, 760px);
          max-height: 92vh;                 /* ✅ never go out of screen */
          display:flex;
          flex-direction:column;
          border-radius:18px;
          border:1px solid rgba(15,23,42,.12);
          background:#fff;
          overflow:hidden;
          box-shadow:0 22px 60px rgba(0,0,0,0.30);
        }

        .ijv-modalBody{
          padding: 12px;
          overflow:auto;                    /* ✅ scroll inside */
          -webkit-overflow-scrolling: touch;
          padding-bottom: 22px;
        }

        .ijv-modalFooter{
          position: sticky;                 /* ✅ footer always visible */
          bottom: 0;
          padding: 12px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); /* ✅ avoid mobile nav */
          display:flex;
          justify-content:flex-end;
          gap:10px;
          border-top:1px solid rgba(15,23,42,.10);
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(10px);
        }

        .ijv-tableWrap{
          width: 100%;
          max-height: 72vh;
        }
      `}</style>

      {/* Header */}
      <div className="ijv-topbar">
        <div className="ijv-topbarInner">
          <div className="d-flex flex-column">
            <p className="ijv-title">Trading Journal</p>
            <p className="ijv-sub">View monthly trades • Update / Delete</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <SmallBtn variant="dark" disabled={busy === "refresh"} onClick={refresh}>
              {busy === "refresh" ? "..." : "Refresh"}
            </SmallBtn>
          </div>
        </div>
      </div>

      {/* Body wrapper (desktop only padding) */}
      <div className="ijv-wrap">
        {initialLoading ? (
          <div className="ijv-card p-3 d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <div style={{ fontWeight: 1000 }}>Loading…</div>
              <div className="ijv-meta">Please wait</div>
            </div>
            <div className="spinner-border" role="status" aria-label="Loading" />
          </div>
        ) : (
          <div className="container-fluid">
            <div className="row g-0">
              {/* Filters */}
              <div className="col-12 col-lg-4">
                <div className="ijv-card ijv-form">
                  <div className="ijv-head px-3 py-2 d-flex align-items-center justify-content-between">
                    <div style={{ fontWeight: 1000 }}>Filters</div>
                    <div className="ijv-meta">Optional</div>
                  </div>
                  <div className="p-3">
                    <div className="mb-2">
                      <div className="ijv-label">Platform</div>
                      <select className="form-select" value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                        <option value="">All Platforms</option>
                        {platforms.map((p) => (
                          <option key={p.platform_id} value={p.platform_id}>
                            {p.platform_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-2">
                      <div className="ijv-label">Segment</div>
                      <select
                        className="form-select"
                        value={segmentId}
                        onChange={(e) => setSegmentId(e.target.value)}
                        disabled={!platformId}
                      >
                        <option value="">All Segments</option>
                        {segments.map((s) => (
                          <option key={s.segment_id} value={s.segment_id}>
                            {s.segment_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-0">
                      <div className="ijv-label">Month</div>
                      <input
                        className="form-control"
                        type="month"
                        value={month.slice(0, 7)}
                        onChange={(e) => setMonth(`${e.target.value}-01`)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table / Mobile */}
              <div className="col-12 col-lg-8">
                <div className="ijv-card">
                  <div className="ijv-head px-3 py-2 d-flex align-items-center justify-content-between">
                    <div style={{ fontWeight: 1000 }}>Monthly Trades</div>
                    <div className="ijv-meta">{dailySummary.length} rows</div>
                  </div>

                  {!isMobile ? (
                    <div className="table-responsive ijv-table ijv-tableWrap">
                      <table className="table table-hover mb-0 align-middle">
                        <thead>
                          <tr>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Trade Name</th>
                            <th className="py-3 px-3">Platform</th>
                            <th className="py-3 px-3">Segment</th>
                            <th className="py-3 px-3">Profit</th>
                            <th className="py-3 px-3">Loss</th>
                            <th className="py-3 px-3">Brokerage</th>
                            <th className="py-3 px-3">Net</th>
                            <th className="py-3 px-3">Trade Logic</th>
                            <th className="py-3 px-3">Mistakes</th>
                            <th className="py-3 px-3">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {dailySummary.map((r) => (
                            <tr key={r.journal_id}>
                              <td className="px-3 py-3">
                                <div style={{ fontWeight: 1000 }}>{formatDate(r.trade_date)}</div>
                                <div className="ijv-meta">#{r.journal_id}</div>
                              </td>
                              <td className="px-3 py-3">{r.trade_name || "-"}</td>
                              <td className="px-3 py-3">{r.platform_name}</td>
                              <td className="px-3 py-3">{r.segment_name}</td>
                              <td className="px-3 py-3">
                                <span className="ijv-pill ijv-pos">{formatNumber(r.profit)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="ijv-pill ijv-neg">{formatNumber(r.loss)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="ijv-pill ijv-neu">{formatNumber(r.brokerage)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <NetPill value={r.net_total} />
                              </td>
                              <td className="px-3 py-3">
                                <div className="ijv-logic">{renderLogic(r.trade_logic)}</div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="ijv-mistake">{renderMistake(r.mistakes)}</div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="d-flex gap-2 flex-wrap">
                                  <SmallBtn
                                    variant="dark"
                                    outline
                                    disabled={busy === `upd-${r.journal_id}` || busy === `del-${r.journal_id}`}
                                    onClick={() => onOpenUpdate(r)}
                                  >
                                    Update
                                  </SmallBtn>
                                  <SmallBtn
                                    variant="danger"
                                    outline
                                    disabled={busy === `del-${r.journal_id}` || busy === `upd-${r.journal_id}`}
                                    onClick={() => onDelete(r.journal_id)}
                                  >
                                    {busy === `del-${r.journal_id}` ? "Deleting..." : "Delete"}
                                  </SmallBtn>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {dailySummary.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="px-3 py-4 ijv-meta">
                                No data
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3">
                      {dailySummary.map((r) => (
                        <div key={r.journal_id} className="ijv-mcard">
                          <div className="ijv-mcardHead">
                            <div>
                              <div style={{ fontWeight: 1000, fontSize: 15 }}>{formatDate(r.trade_date)}</div>
                              <div className="ijv-meta">#{r.journal_id}</div>
                              <div style={{ fontWeight: 950 }}>{r.trade_name || "-"}</div>
                              <div className="ijv-meta">
                                {r.platform_name} • {r.segment_name}
                              </div>
                            </div>

                            <div className="d-flex gap-2">
                              <SmallBtn
                                variant="dark"
                                outline
                                disabled={busy === `upd-${r.journal_id}` || busy === `del-${r.journal_id}`}
                                onClick={() => onOpenUpdate(r)}
                              >
                                Update
                              </SmallBtn>
                              <SmallBtn
                                variant="danger"
                                outline
                                disabled={busy === `del-${r.journal_id}` || busy === `upd-${r.journal_id}`}
                                onClick={() => onDelete(r.journal_id)}
                              >
                                {busy === `del-${r.journal_id}` ? "Deleting..." : "Delete"}
                              </SmallBtn>
                            </div>
                          </div>

                          <div className="ijv-mcardBody">
                            <div className="ijv-row2">
                              <span className="ijv-pill ijv-pos">P {formatNumber(r.profit)}</span>
                              <span className="ijv-pill ijv-neg">L {formatNumber(r.loss)}</span>
                              <span className="ijv-pill ijv-neu">B {formatNumber(r.brokerage)}</span>
                              <NetPill value={r.net_total} />
                            </div>

                            <div className="ijv-block">
                              <div className="ijv-kv">Trade Logic</div>
                              <div className="ijv-logic">{renderLogic(r.trade_logic)}</div>
                            </div>

                            <div className="ijv-block">
                              <div className="ijv-kv">Mistakes</div>
                              <div className="ijv-mistake">{renderMistake(r.mistakes)}</div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {dailySummary.length === 0 ? <div className="ijv-meta">No data</div> : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Update Modal (center + scroll + footer always visible) */}
      {edit.open ? (
        <div className="ijv-modalOverlay" role="dialog" aria-modal="true">
          <div className="ijv-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ijv-head px-3 py-2 d-flex align-items-center justify-content-between">
              <div style={{ fontWeight: 1000 }}>Update Trade</div>
              <button type="button" className="btn btn-light btn-sm ijv-btn" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="ijv-modalBody">
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <div className="ijv-label">Trade Date</div>
                  <input
                    className="form-control"
                    type="date"
                    value={edit.trade_date}
                    onChange={(e) => setEdit((x) => ({ ...x, trade_date: e.target.value }))}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <div className="ijv-label">Trade Name</div>
                  <input
                    className="form-control"
                    value={edit.trade_name}
                    onChange={(e) => setEdit((x) => ({ ...x, trade_name: e.target.value }))}
                    placeholder="e.g. NIFTY50"
                  />
                </div>

                <div className="col-12 col-md-4">
                  <div className="ijv-label">Profit</div>
                  <input
                    className="form-control"
                    inputMode="numeric"
                    value={edit.profit}
                    onChange={(e) => setEdit((x) => ({ ...x, profit: toIntStr(e.target.value) }))}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <div className="ijv-label">Loss</div>
                  <input
                    className="form-control"
                    inputMode="numeric"
                    value={edit.loss}
                    onChange={(e) => setEdit((x) => ({ ...x, loss: toIntStr(e.target.value) }))}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <div className="ijv-label">Brokerage</div>
                  <input
                    className="form-control"
                    inputMode="numeric"
                    value={edit.brokerage}
                    onChange={(e) => setEdit((x) => ({ ...x, brokerage: toIntStr(e.target.value) }))}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <div className="ijv-label">Platform</div>
                  <select
                    className="form-select"
                    value={edit.platform_id}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setEdit((x) => ({ ...x, platform_id: pid, segment_id: "" })); // reset segment
                    }}
                  >
                    <option value="">Select Platform</option>
                    {platforms.map((p) => (
                      <option key={p.platform_id} value={p.platform_id}>
                        {p.platform_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <div className="ijv-label">Segment</div>
                  <select
                    className="form-select"
                    value={edit.segment_id}
                    onChange={(e) => setEdit((x) => ({ ...x, segment_id: e.target.value }))}
                    disabled={!edit.platform_id}
                  >
                    <option value="">Select Segment</option>
                    {editSegments.map((s) => (
                      <option key={s.segment_id} value={s.segment_id}>
                        {s.segment_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <div className="ijv-label">Trade Logic</div>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={edit.trade_logic}
                    onChange={(e) => setEdit((x) => ({ ...x, trade_logic: e.target.value }))}
                  />
                </div>

                <div className="col-12">
                  <div className="ijv-label">Mistakes (optional)</div>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={edit.mistakes}
                    onChange={(e) => setEdit((x) => ({ ...x, mistakes: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="ijv-modalFooter">
              <SmallBtn variant="secondary" outline disabled={busy === `upd-${edit.journal_id}`} onClick={closeEdit}>
                Cancel
              </SmallBtn>
              <SmallBtn variant="dark" disabled={busy === `upd-${edit.journal_id}`} onClick={onUpdate}>
                {busy === `upd-${edit.journal_id}` ? "Saving..." : "Update"}
              </SmallBtn>
            </div>
          </div>
        </div>
      ) : null}

      {/* ✅ Info/Error Modal (center + scroll + footer visible) */}
      {modal.open ? (
        <div className="ijv-modalOverlay" role="dialog" aria-modal="true">
          <div className="ijv-modal">
            <div className="ijv-head px-3 py-2 d-flex align-items-center justify-content-between">
              <div style={{ fontWeight: 1000 }}>{modal.title}</div>
              <button type="button" className="btn btn-light btn-sm ijv-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="ijv-modalBody" style={{ fontWeight: 850 }}>
              {modal.message}
            </div>

            <div className="ijv-modalFooter">
              <SmallBtn variant="dark" onClick={closeModal}>
                OK
              </SmallBtn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}