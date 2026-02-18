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
  const [initialLoading, setInitialLoading] = useState(true); // ONLY first page load
  const [busy, setBusy] = useState(""); // "refresh" | `details-${id}`

  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const openError = (message) =>
    setModal({ open: true, title: "Error", message: message || "Something went wrong" });
  const closeModal = () => setModal({ open: false, title: "", message: "" });

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
  const [dailySummary, setDailySummary] = useState([]); // ✅ show ALL rows
  const [detailsMap, setDetailsMap] = useState({});
  const [openJournalId, setOpenJournalId] = useState(null);

  // responsive
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // ---------- Helpers ----------
  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
  };

  const formatNumber = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    const s = String(v).replace(/,/g, "").trim();
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    let out = n.toFixed(10);
    out = out.replace(/\.?0+$/, "");
    return out;
  };

  const netTone = (v) => {
    const n = Number(String(v ?? 0).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "secondary";
    return n > 0 ? "success" : n < 0 ? "danger" : "secondary";
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
    async getDailySummary({ platform_name, segment_name, month }) {
      const qs = new URLSearchParams();
      if (platform_name) qs.set("platform_name", platform_name);
      if (segment_name) qs.set("segment_name", segment_name);
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/daily-summary?${qs.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Daily summary fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getEntryDetails({ journal_id, month }) {
      const qs = new URLSearchParams();
      if (journal_id) qs.set("journal_id", String(journal_id));
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/entry-details?${qs.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Entry details fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
  };

  // avoid double initial load in StrictMode
  const didInit = useRef(false);

  // ---------- Initial load (ONLY once) ----------
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

  // Load segments when platform changes
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

  // ---------- Refresh (silent) ----------
  const refresh = async () => {
    try {
      setBusy("refresh");
      const platform_name =
        platforms.find((p) => String(p.platform_id) === String(platformId))?.platform_name || "";
      const segment_name =
        segments.find((s) => String(s.segment_id) === String(segmentId))?.segment_name || "";

      const rows = await api.getDailySummary({
        platform_name: platformId ? platform_name : null,
        segment_name: segmentId ? segment_name : null,
        month,
      });

      // ✅ show ALL rows (do not de-duplicate)
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
  }, [month, platformId, segmentId, platforms.length, segments.length]);

  // ---------- Details toggle ----------
  const toggleDetails = async (journal_id) => {
    if (openJournalId === journal_id) {
      setOpenJournalId(null);
      return;
    }
    setOpenJournalId(journal_id);

    if (!detailsMap[journal_id]) {
      try {
        setBusy(`details-${journal_id}`);
        const d = await api.getEntryDetails({ journal_id, month });
        setDetailsMap((prev) => ({ ...prev, [journal_id]: d }));
      } catch (e) {
        openError(e.message);
      } finally {
        setBusy("");
      }
    }
  };

  // ---------- UI parts ----------
  const BadgeSquare = ({ tone, children }) => (
    <span className={`badge badge-square bg-${tone} bg-opacity-10 text-${tone}`}>{children}</span>
  );

  const rowsToShow = dailySummary; // ✅ ALL rows

  return (
    <div className="page-root">
      <style>{`
        .page-root{
          min-height:100vh;
          width:100%;
          background:#fff;
          color:#0f172a;
          font-family:"Times New Roman", Times, serif;
          padding-bottom:70px;
        }
        .topbar{
          position:sticky;
          top:0;
          z-index:20;
          background:#fff;
          border-bottom:1px solid #e5e7eb;
        }
        .app-title{ font-weight:900; letter-spacing:.2px; }
        .card-pro{
          border:1px solid #e5e7eb;
          border-radius:16px;
          box-shadow:0 10px 26px rgba(15,23,42,0.08);
          overflow:hidden;
          background:#fff;
        }
        .card-head{
          background:#fbfbfd;
          border-bottom:1px solid #e5e7eb;
        }
        .badge-square{
          border:1px solid #e5e7eb;
          border-radius:8px;
          padding:8px 10px;
          font-weight:900;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:82px;
          white-space:nowrap;
        }
        .mistake-pill{
          background:rgba(220,38,38,0.08);
          border:1px solid rgba(220,38,38,0.18);
          color:#b91c1c;
          border-radius:12px;
          padding:6px 10px;
          font-weight:700;
          font-size:13px;
          display:inline-block;
          line-height:1.25;
        }
        .logic-text{
          font-size:14px;
          font-weight:700;
          line-height:1.35;
        }
        .btn-pro{ font-weight:900; border-radius:12px; }
        .table thead th{
          position:sticky;
          top:0;
          background:#f8fafc !important;
          z-index:1;
          font-size:13px;
          white-space:nowrap;
        }
        .subrow{ background:#ffffff; }
        .subbox{
          border:1px solid #eef2f7;
          border-radius:14px;
          padding:12px;
          background:#fff;
        }
        .sublabel{
          font-size:12px;
          color:#64748b;
          font-weight:900;
          margin-bottom:4px;
        }
        .mobile-meta{
          font-size:12px;
          color:#64748b;
          font-weight:800;
          line-height:1.2;
        }
      `}</style>

      {/* Header */}
      <div className="topbar">
        <div className="container-fluid py-2 px-3 d-flex align-items-center justify-content-between">
          <div className="app-title">Trading Journal Get</div>

          <button
            className="btn btn-dark btn-pro btn-sm px-3"
            disabled={busy === "refresh"}
            onClick={refresh}
            type="button"
          >
            {busy === "refresh" ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* FIRST TIME loading only */}
      {initialLoading ? (
        <div className="container-fluid px-3 py-4">
          <div className="card-pro p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <div className="fw-bold" style={{ fontWeight: 900 }}>
                Loading...
              </div>
              <div className="small text-muted fw-bold">Please wait</div>
            </div>
            <div className="spinner-border" role="status" aria-label="Loading" />
          </div>
        </div>
      ) : (
        <div className="container-fluid px-3 py-3">
          <div className="row g-3">
            {/* Filters */}
            <div className="col-12 col-lg-4">
              <div className="card-pro">
                <div className="card-head px-3 py-2 d-flex align-items-center justify-content-between">
                  <div className="fw-bold" style={{ fontWeight: 900 }}>
                    Filters
                  </div>
                  <div className="small text-muted fw-bold">Optional</div>
                </div>

                <div className="p-3">
                  <div className="mb-2">
                    <label className="form-label fw-bold small">Platform</label>
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
                    <label className="form-label fw-bold small">Segment</label>
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

                  <div className="mb-2">
                    <label className="form-label fw-bold small">Month</label>
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

            {/* Data */}
            <div className="col-12 col-lg-8">
              <div className="card-pro">
                <div className="card-head px-3 py-2 d-flex align-items-center justify-content-between">
                  <div className="fw-bold" style={{ fontWeight: 900 }}>
                    Daily Summary
                  </div>
                  <div className="small text-muted fw-bold">{rowsToShow.length} rows</div>
                </div>

                {/* Desktop */}
                {!isMobile ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr className="text-muted">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Platform</th>
                          <th className="py-3 px-3">Segment</th>
                          <th className="py-3 px-3">Profit</th>
                          <th className="py-3 px-3">Loss</th>
                          <th className="py-3 px-3">Brokerage</th>
                          <th className="py-3 px-3">Net</th>
                          <th className="py-3 px-3">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rowsToShow.map((r) => {
                          const opened = openJournalId === r.journal_id;
                          const netT = netTone(r.net_total);

                          return (
                            <React.Fragment key={r.journal_id}>
                              <tr>
                                <td className="px-3 py-3">
                                  <div className="fw-bold" style={{ fontWeight: 900 }}>
                                    {formatDate(r.trade_date)}
                                  </div>
                                  <div className="small text-muted fw-bold">#{r.journal_id}</div>
                                </td>

                                <td className="px-3 py-3 fw-bold">{r.platform_name}</td>
                                <td className="px-3 py-3 fw-bold">{r.segment_name}</td>

                                <td className="px-3 py-3">
                                  <BadgeSquare tone="success">{formatNumber(r.profit)}</BadgeSquare>
                                </td>
                                <td className="px-3 py-3">
                                  <BadgeSquare tone="danger">{formatNumber(r.loss)}</BadgeSquare>
                                </td>
                                <td className="px-3 py-3">
                                  <BadgeSquare tone="warning">{formatNumber(r.brokerage)}</BadgeSquare>
                                </td>

                                <td className="px-3 py-3">
                                  <span className={`badge badge-square bg-${netT} bg-opacity-10 text-${netT}`}>
                                    {formatNumber(r.net_total)}
                                  </span>
                                </td>

                                <td className="px-3 py-3">
                                  <button
                                    className="btn btn-outline-dark btn-pro btn-sm"
                                    onClick={() => toggleDetails(r.journal_id)}
                                    disabled={busy === `details-${r.journal_id}`}
                                    type="button"
                                  >
                                    {busy === `details-${r.journal_id}` ? "..." : opened ? "Hide" : "Details"}
                                  </button>
                                </td>
                              </tr>

                              <tr className="subrow">
                                <td className="px-3 pb-3" colSpan={8}>
                                  <div className="d-flex flex-column gap-2">
                                    <div className="subbox">
                                      <div className="sublabel">Logic</div>
                                      <div className="logic-text">{r.trade_logic || "-"}</div>
                                    </div>

                                    <div className="subbox">
                                      <div className="sublabel">Mistakes</div>
                                      <div>{r.mistakes ? <span className="mistake-pill">{r.mistakes}</span> : "-"}</div>
                                    </div>
                                  </div>

                                  {opened ? (
                                    <div className="mt-3 subbox">
                                      <div className="fw-bold mb-2" style={{ fontWeight: 900 }}>
                                        Entry Details
                                      </div>

                                      <div className="table-responsive">
                                        <table className="table table-sm mb-0">
                                          <thead>
                                            <tr className="text-muted">
                                              <th className="py-2">Type</th>
                                              <th className="py-2">Symbol / Name</th>
                                              <th className="py-2">CE/PE</th>
                                              <th className="py-2">Entry</th>
                                              <th className="py-2">Exit</th>
                                              <th className="py-2">Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(detailsMap[r.journal_id] || []).map((d, idx) => (
                                              <tr key={idx}>
                                                <td className="fw-bold">{d.trade_type}</td>
                                                <td className="fw-bold">{d.trade_type === "OPTIONS" ? d.symbol : d.stock_name}</td>
                                                <td className="fw-bold">{d.option_type ?? "-"}</td>
                                                <td className="fw-bold">{formatNumber(d.entry_price)}</td>
                                                <td className="fw-bold">{formatNumber(d.exit_price)}</td>
                                                <td className="fw-bold">{formatNumber(d.quantity)}</td>
                                              </tr>
                                            ))}

                                            {(detailsMap[r.journal_id] || []).length === 0 ? (
                                              <tr>
                                                <td colSpan={6} className="text-muted fw-bold">
                                                  No details found.
                                                </td>
                                              </tr>
                                            ) : null}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}

                        {rowsToShow.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-4 text-muted fw-bold">
                              No rows found for this month/filter.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Mobile
                  <div className="p-3">
                    {rowsToShow.map((r) => {
                      const opened = openJournalId === r.journal_id;
                      const netT = netTone(r.net_total);

                      return (
                        <div key={r.journal_id} className="card-pro mb-3">
                          <div className="p-3 d-flex align-items-start justify-content-between gap-2">
                            <div>
                              <div className="fw-bold" style={{ fontWeight: 900, fontSize: 15 }}>
                                {formatDate(r.trade_date)}
                              </div>

                              <div className="mobile-meta">#{r.journal_id}</div>
                              <div className="fw-bold" style={{ fontWeight: 900 }}>
                                {r.platform_name}
                              </div>
                              <div className="mobile-meta">{r.segment_name}</div>
                            </div>

                            <button
                              className="btn btn-outline-dark btn-pro btn-sm"
                              onClick={() => toggleDetails(r.journal_id)}
                              disabled={busy === `details-${r.journal_id}`}
                              type="button"
                            >
                              {busy === `details-${r.journal_id}` ? "..." : opened ? "Hide" : "Details"}
                            </button>
                          </div>

                          <div className="px-3 pb-3">
                            <div className="d-flex flex-wrap gap-2">
                              <BadgeSquare tone="success">Profit: {formatNumber(r.profit)}</BadgeSquare>
                              <BadgeSquare tone="danger">Loss: {formatNumber(r.loss)}</BadgeSquare>
                              <BadgeSquare tone="warning">Brokerage: {formatNumber(r.brokerage)}</BadgeSquare>
                              <span className={`badge badge-square bg-${netT} bg-opacity-10 text-${netT}`}>
                                Net: {formatNumber(r.net_total)}
                              </span>
                            </div>

                            <div className="mt-3" style={{ borderTop: "1px solid #eef2f7", paddingTop: 12 }}>
                              <div className="sublabel">Logic</div>
                              <div className="logic-text">{r.trade_logic || "-"}</div>

                              <div className="sublabel mt-2">Mistakes</div>
                              <div>{r.mistakes ? <span className="mistake-pill">{r.mistakes}</span> : "-"}</div>
                            </div>

                            {opened ? (
                              <div className="mt-3 subbox">
                                <div className="fw-bold mb-2" style={{ fontWeight: 900 }}>
                                  Entry Details
                                </div>

                                <div className="table-responsive">
                                  <table className="table table-sm mb-0">
                                    <thead>
                                      <tr className="text-muted">
                                        <th className="py-2">Type</th>
                                        <th className="py-2">Symbol/Name</th>
                                        <th className="py-2">CE/PE</th>
                                        <th className="py-2">Entry</th>
                                        <th className="py-2">Exit</th>
                                        <th className="py-2">Qty</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(detailsMap[r.journal_id] || []).map((d, idx) => (
                                        <tr key={idx}>
                                          <td className="fw-bold">{d.trade_type}</td>
                                          <td className="fw-bold">{d.trade_type === "OPTIONS" ? d.symbol : d.stock_name}</td>
                                          <td className="fw-bold">{d.option_type ?? "-"}</td>
                                          <td className="fw-bold">{formatNumber(d.entry_price)}</td>
                                          <td className="fw-bold">{formatNumber(d.exit_price)}</td>
                                          <td className="fw-bold">{formatNumber(d.quantity)}</td>
                                        </tr>
                                      ))}
                                      {(detailsMap[r.journal_id] || []).length === 0 ? (
                                        <tr>
                                          <td colSpan={6} className="text-muted fw-bold">
                                            No details found.
                                          </td>
                                        </tr>
                                      ) : null}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {rowsToShow.length === 0 ? <div className="text-muted fw-bold">No rows found for this month/filter.</div> : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal ONLY */}
      {modal.open ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.35)", zIndex: 9999, padding: 12 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card-pro" style={{ width: "min(92vw, 420px)" }}>
            <div className="card-head px-3 py-2 d-flex align-items-center justify-content-between">
              <div className="fw-bold" style={{ fontWeight: 900 }}>
                {modal.title}
              </div>
              <button className="btn btn-light btn-sm btn-pro" onClick={closeModal} type="button">
                ✕
              </button>
            </div>
            <div className="p-3 fw-bold">{modal.message}</div>
            <div className="p-3 pt-0 d-flex justify-content-end">
              <button className="btn btn-dark btn-pro" onClick={closeModal} type="button">
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
