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
  const [dailySummary, setDailySummary] = useState([]);
  const [detailsMap, setDetailsMap] = useState({});
  const [openJournalId, setOpenJournalId] = useState(null);

  // responsive
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 992 : true);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 992);
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
    if (v === null || v === undefined || v === "") return "0";
    const s = String(v).replace(/,/g, "").trim();
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    let out = n.toFixed(10);
    out = out.replace(/\.?0+$/, "");
    return out;
  };

  const toNumber = (v) => {
    const n = Number(String(v ?? 0).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const netTone = (v) => {
    const n = toNumber(v);
    return n > 0 ? "success" : n < 0 ? "danger" : "secondary";
  };

  const pillTone = (v) => {
    const n = toNumber(v);
    return n > 0 ? { bg: "rgba(22,163,74,.10)", fg: "#15803d", label: "Profit" } : n < 0
      ? { bg: "rgba(225,29,72,.10)", fg: "#be123c", label: "Loss" }
      : { bg: "rgba(37,99,235,.10)", fg: "#1d4ed8", label: "Breakeven" };
  };

  const monthLabel = (yyyyMM01) => {
    try {
      const [y, m] = yyyyMM01.split("-").map((x) => Number(x));
      const d = new Date(y, (m || 1) - 1, 1);
      return d.toLocaleString(undefined, { month: "long", year: "numeric" });
    } catch {
      return yyyyMM01;
    }
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

    // ✅ IMPORTANT: Your backend (latest) expects platform_id/segment_id/plan_id (IDs)
    // If your current backend still expects names, change below accordingly.
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

  // segments
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

  // ---------- Refresh ----------
  const refresh = async () => {
    try {
      setBusy("refresh");

      const rows = await api.getDailySummary({
        platform_id: platformId ? platformId : null,
        segment_id: segmentId ? segmentId : null,
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

  // ---------- Summary KPIs (calculated from rows) ----------
  const totals = useMemo(() => {
    const arr = Array.isArray(dailySummary) ? dailySummary : [];
    const t = arr.reduce(
      (acc, r) => {
        acc.trades += 1;
        acc.profit += toNumber(r.profit);
        acc.loss += toNumber(r.loss);
        acc.brokerage += toNumber(r.brokerage);
        acc.net += toNumber(r.net_total);
        return acc;
      },
      { trades: 0, profit: 0, loss: 0, brokerage: 0, net: 0 }
    );
    // monthly P&L: profit - (loss + brokerage)
    t.pnl = t.profit - (t.loss + t.brokerage);
    return t;
  }, [dailySummary]);

  const monthTone = pillTone(totals.pnl);

  // ---------- UI parts ----------
  const BadgeSquare = ({ tone, children }) => (
    <span className={`badge badge-square bg-${tone} bg-opacity-10 text-${tone}`}>{children}</span>
  );

  const rowsToShow = dailySummary;

  return (
    <div className="ij2-root">
      <style>{`
        .ij2-root{
          min-height:100vh;
          width:100%;
          color:#0f172a;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji";
          background:
            radial-gradient(900px 520px at 10% 10%, rgba(124,58,237,.10), transparent 60%),
            radial-gradient(900px 520px at 90% 15%, rgba(6,182,212,.10), transparent 60%),
            radial-gradient(900px 520px at 40% 95%, rgba(245,158,11,.10), transparent 60%),
            linear-gradient(135deg, #f6f8ff, #fff7f1);
          padding-bottom:72px;
        }

        .ij2-topbar{
          position:sticky;
          top:0;
          z-index:30;
          background:rgba(255,255,255,.72);
          border-bottom:1px solid rgba(15,23,42,.10);
          backdrop-filter: blur(14px);
        }

        .ij2-title{
          font-weight:1000;
          letter-spacing:.2px;
          margin:0;
          font-size: 16px;
        }
        .ij2-sub{
          margin:0;
          color: rgba(15,23,42,.62);
          font-weight: 800;
          font-size: 12px;
        }

        .ij2-proCard{
          border:1px solid rgba(15,23,42,.10);
          border-radius:18px;
          box-shadow:0 14px 34px rgba(15,23,42,0.08);
          overflow:hidden;
          background:rgba(255,255,255,.82);
        }

        .ij2-cardHead{
          background:rgba(255,255,255,.62);
          border-bottom:1px solid rgba(15,23,42,.10);
        }

        .ij2-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          border-radius:999px;
          padding:8px 10px;
          border:1px solid rgba(15,23,42,.10);
          font-weight:950;
          font-size:12px;
          white-space:nowrap;
        }
        .ij2-dot{ width:8px; height:8px; border-radius:999px; }

        .badge-square{
          border:1px solid rgba(15,23,42,.10);
          border-radius:10px;
          padding:8px 10px;
          font-weight:950;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:92px;
          white-space:nowrap;
        }

        .ij2-btn{
          border-radius:14px !important;
          font-weight:950 !important;
          letter-spacing:.15px;
        }

        .ij2-table thead th{
          position: sticky;
          top: 0;
          background: rgba(248,250,252,.92) !important;
          z-index: 2;
          font-size: 12.5px;
          white-space: nowrap;
          color: rgba(15,23,42,.70);
          border-bottom:1px solid rgba(15,23,42,.10) !important;
        }

        .ij2-subrow{
          background:rgba(255,255,255,.62);
        }

        .ij2-subbox{
          border:1px solid rgba(15,23,42,.10);
          border-radius:16px;
          padding:12px;
          background:rgba(255,255,255,.78);
        }

        .ij2-sublabel{
          font-size:12px;
          color: rgba(15,23,42,.60);
          font-weight:950;
          margin-bottom:6px;
          letter-spacing:.2px;
        }

        .ij2-logic{
          font-size:14px;
          font-weight:850;
          line-height:1.4;
        }

        .ij2-mistake{
          background: rgba(225,29,72,.08);
          border: 1px solid rgba(225,29,72,.18);
          color: #be123c;
          border-radius: 14px;
          padding: 7px 10px;
          font-weight: 850;
          font-size: 13px;
          display:inline-block;
          line-height: 1.25;
        }

        .ij2-kpi{
          border:1px solid rgba(15,23,42,.10);
          border-radius:18px;
          background:rgba(255,255,255,.78);
          padding:12px;
          min-height:92px;
          display:flex;
          flex-direction:column;
          justify-content:center;
        }
        .ij2-kpiLabel{
          margin:0;
          font-size:12px;
          font-weight:950;
          color: rgba(15,23,42,.62);
        }
        .ij2-kpiVal{
          margin:6px 0 0 0;
          font-size:20px;
          font-weight:1000;
          letter-spacing:.2px;
        }

        .ij2-stickyFilters{
          position: sticky;
          top: 66px; /* under topbar */
          z-index: 10;
        }

        @media (min-width: 992px){
          .ij2-title{ font-size: 18px; }
          .ij2-stickyFilters{ top: 72px; }
        }
      `}</style>

      {/* Header */}
      <div className="ij2-topbar">
        <div className="container-fluid py-2 px-3 d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex flex-column">
            <p className="ij2-title">Trading Journal</p>
            <p className="ij2-sub">View your month trades with profit, loss, brokerage and net</p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div
              className="ij2-pill"
              style={{ background: monthTone.bg, color: monthTone.fg }}
              title="Monthly status based on P&L"
            >
              <span className="ij2-dot" style={{ background: monthTone.fg }} />
              {monthTone.label}
            </div>

            <button
              className="btn btn-dark ij2-btn btn-sm px-3"
              disabled={busy === "refresh"}
              onClick={refresh}
              type="button"
              title="Refresh data"
            >
              {busy === "refresh" ? "..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* FIRST TIME loading only */}
      {initialLoading ? (
        <div className="container-fluid px-3 py-4">
          <div className="ij2-proCard p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <div className="fw-bold" style={{ fontWeight: 950 }}>
                Loading…
              </div>
              <div className="small" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                Please wait
              </div>
            </div>
            <div className="spinner-border" role="status" aria-label="Loading" />
          </div>
        </div>
      ) : (
        <div className="container-fluid px-3 py-3">
          <div className="row g-3">
            {/* Filters */}
            <div className="col-12 col-lg-4">
              <div className="ij2-stickyFilters">
                <div className="ij2-proCard">
                  <div className="ij2-cardHead px-3 py-2 d-flex align-items-center justify-content-between">
                    <div className="fw-bold" style={{ fontWeight: 950 }}>
                      Filters
                    </div>
                    <div className="small" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                      Optional
                    </div>
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

                    <div className="mb-1">
                      <label className="form-label fw-bold small">Month</label>
                      <input
                        className="form-control"
                        type="month"
                        value={month.slice(0, 7)}
                        onChange={(e) => setMonth(`${e.target.value}-01`)}
                      />
                    </div>

                    <div className="mt-3" style={{ borderTop: "1px solid rgba(15,23,42,.10)", paddingTop: 12 }}>
                      <div className="small" style={{ fontWeight: 950, color: "rgba(15,23,42,.70)" }}>
                        Summary ({monthLabel(month)})
                      </div>

                      <div className="mt-2 d-grid" style={{ gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(2,1fr)", gap: 10 }}>
                        <div className="ij2-kpi">
                          <p className="ij2-kpiLabel">Trades</p>
                          <p className="ij2-kpiVal">{formatNumber(totals.trades)}</p>
                        </div>

                        <div className="ij2-kpi">
                          <p className="ij2-kpiLabel">P&amp;L</p>
                          <p
                            className="ij2-kpiVal"
                            style={{ color: totals.pnl > 0 ? "#15803d" : totals.pnl < 0 ? "#be123c" : "#1d4ed8" }}
                          >
                            {totals.pnl > 0 ? "+" : ""}
                            {formatNumber(totals.pnl)}
                          </p>
                        </div>

                        <div className="ij2-kpi">
                          <p className="ij2-kpiLabel">Profit</p>
                          <p className="ij2-kpiVal" style={{ color: "#15803d" }}>
                            {formatNumber(totals.profit)}
                          </p>
                        </div>

                        <div className="ij2-kpi">
                          <p className="ij2-kpiLabel">Loss + Brokerage</p>
                          <p className="ij2-kpiVal" style={{ color: "#be123c" }}>
                            {formatNumber(totals.loss + totals.brokerage)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="mt-3"
                        style={{
                          border: "1px solid rgba(15,23,42,.10)",
                          borderRadius: 16,
                          background: "linear-gradient(135deg, rgba(124,58,237,.07), rgba(6,182,212,.06))",
                          padding: 12,
                          fontWeight: 900,
                          lineHeight: 1.35,
                          fontSize: 13,
                        }}
                      >
                        {totals.pnl > 0 ? (
                          <>
                            Your month is in <span style={{ color: "#15803d" }}>profit</span> of{" "}
                            <span style={{ color: "#15803d" }}>{formatNumber(totals.pnl)}</span>.
                          </>
                        ) : totals.pnl < 0 ? (
                          <>
                            Your month is in <span style={{ color: "#be123c" }}>loss</span> of{" "}
                            <span style={{ color: "#be123c" }}>{formatNumber(Math.abs(totals.pnl))}</span>. Try reducing overtrading.
                          </>
                        ) : (
                          <>
                            Your month is <span style={{ color: "#1d4ed8" }}>breakeven</span>. Focus on consistency.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data */}
            <div className="col-12 col-lg-8">
              <div className="ij2-proCard">
                <div className="ij2-cardHead px-3 py-2 d-flex align-items-center justify-content-between">
                  <div className="fw-bold" style={{ fontWeight: 950 }}>
                    Daily Summary
                  </div>
                  <div className="small" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                    {rowsToShow.length} rows
                  </div>
                </div>

                {/* Desktop */}
                {!isMobile ? (
                  <div className="table-responsive ij2-table" style={{ maxHeight: "70vh" }}>
                    <table className="table table-hover mb-0 align-middle">
                      <thead>
                        <tr>
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
                                  <div className="fw-bold" style={{ fontWeight: 1000 }}>
                                    {formatDate(r.trade_date)}
                                  </div>
                                  <div className="small" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                                    #{r.journal_id}
                                  </div>
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
                                    className="btn btn-outline-dark ij2-btn btn-sm"
                                    onClick={() => toggleDetails(r.journal_id)}
                                    disabled={busy === `details-${r.journal_id}`}
                                    type="button"
                                  >
                                    {busy === `details-${r.journal_id}` ? "..." : opened ? "Hide" : "Details"}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded */}
                              {opened ? (
                                <tr className="ij2-subrow">
                                  <td className="px-3 pb-3" colSpan={8}>
                                    <div className="d-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                      <div className="ij2-subbox">
                                        <div className="ij2-sublabel">Logic</div>
                                        <div className="ij2-logic">{r.trade_logic || "-"}</div>
                                      </div>

                                      <div className="ij2-subbox">
                                        <div className="ij2-sublabel">Mistakes</div>
                                        <div>{r.mistakes ? <span className="ij2-mistake">{r.mistakes}</span> : "-"}</div>
                                      </div>
                                    </div>

                                    <div className="mt-3 ij2-subbox">
                                      <div className="fw-bold mb-2" style={{ fontWeight: 950 }}>
                                        Entry Details
                                      </div>

                                      <div className="table-responsive">
                                        <table className="table table-sm mb-0 align-middle">
                                          <thead>
                                            <tr style={{ color: "rgba(15,23,42,.70)" }}>
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
                                                <td colSpan={6} style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                                                  No details found.
                                                </td>
                                              </tr>
                                            ) : null}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}

                        {rowsToShow.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-4" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                              No rows found for this month/filter.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Mobile cards
                  <div className="p-3">
                    {rowsToShow.map((r) => {
                      const opened = openJournalId === r.journal_id;
                      const netT = netTone(r.net_total);

                      return (
                        <div key={r.journal_id} className="ij2-proCard mb-3">
                          <div className="p-3 d-flex align-items-start justify-content-between gap-2">
                            <div>
                              <div className="fw-bold" style={{ fontWeight: 1000, fontSize: 15 }}>
                                {formatDate(r.trade_date)}
                              </div>

                              <div className="small" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                                #{r.journal_id}
                              </div>

                              <div className="fw-bold" style={{ fontWeight: 950 }}>
                                {r.platform_name}
                              </div>
                              <div className="small" style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                                {r.segment_name}
                              </div>
                            </div>

                            <button
                              className="btn btn-outline-dark ij2-btn btn-sm"
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

                            <div className="mt-3" style={{ borderTop: "1px solid rgba(15,23,42,.10)", paddingTop: 12 }}>
                              <div className="ij2-sublabel">Logic</div>
                              <div className="ij2-logic">{r.trade_logic || "-"}</div>

                              <div className="ij2-sublabel mt-2">Mistakes</div>
                              <div>{r.mistakes ? <span className="ij2-mistake">{r.mistakes}</span> : "-"}</div>
                            </div>

                            {opened ? (
                              <div className="mt-3 ij2-subbox">
                                <div className="fw-bold mb-2" style={{ fontWeight: 950 }}>
                                  Entry Details
                                </div>

                                <div className="table-responsive">
                                  <table className="table table-sm mb-0 align-middle">
                                    <thead>
                                      <tr style={{ color: "rgba(15,23,42,.70)" }}>
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
                                          <td colSpan={6} style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
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

                    {rowsToShow.length === 0 ? (
                      <div style={{ color: "rgba(15,23,42,.62)", fontWeight: 850 }}>
                        No rows found for this month/filter.
                      </div>
                    ) : null}
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
          style={{ background: "rgba(15,23,42,0.35)", zIndex: 9999, padding: 12 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="ij2-proCard" style={{ width: "min(92vw, 420px)" }}>
            <div className="ij2-cardHead px-3 py-2 d-flex align-items-center justify-content-between">
              <div className="fw-bold" style={{ fontWeight: 1000 }}>
                {modal.title}
              </div>
              <button className="btn btn-light btn-sm ij2-btn" onClick={closeModal} type="button">
                ✕
              </button>
            </div>
            <div className="p-3" style={{ fontWeight: 850 }}>
              {modal.message}
            </div>
            <div className="p-3 pt-0 d-flex justify-content-end">
              <button className="btn btn-dark ij2-btn" onClick={closeModal} type="button">
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}