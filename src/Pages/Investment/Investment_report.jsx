// src/pages/Investment_report.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_report() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // -------------------- master data --------------------
  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);
  const [plans, setPlans] = useState([]);

  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [planId, setPlanId] = useState("");

  // month filter
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  // report data
  const [monthReport, setMonthReport] = useState([]);
  const [mistakeRepeats, setMistakeRepeats] = useState([]);

  // ui (NO success popups)
  const [initialLoading, setInitialLoading] = useState(true); // only first load spinner
  const [busy, setBusy] = useState(""); // "refresh"

  // error modal only
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const openError = (message) =>
    setModal({ open: true, title: "Error", message: message || "Something went wrong" });
  const closeModal = () => setModal({ open: false, title: "", message: "" });

  // -------------------- API --------------------
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
    async getPlans(pid, sid) {
      const qs = new URLSearchParams();
      if (pid) qs.set("platform_id", String(pid));
      if (sid) qs.set("segment_id", String(sid));
      const res = await fetch(`${BASE_URL}/api/investment/plan?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Plan fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getMonthReport({ platform_id, segment_id, plan_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (plan_id) qs.set("plan_id", String(plan_id));
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/report/month?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Month report failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getMistakesRepeat({ platform_id, segment_id, plan_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (plan_id) qs.set("plan_id", String(plan_id));
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/report/mistakes-repeat?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Mistake repeat failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
  };

  // -------------------- responsive --------------------
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // -------------------- helpers --------------------
  const formatDate = (value) => {
    // Only DB date shown; no default date
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
  };

  const safeText = (v) => {
    const s = String(v ?? "").trim();
    return s ? s : "-";
  };

  const rrPretty = (v) => {
    const s = String(v ?? "").trim();
    return s ? s : "-";
  };

  const rrFollowedText = (v) => {
    if (v === null || v === undefined) return "-";
    return v ? "Follow" : "Not Follow";
  };

  const statusBadge = (status) => {
    const s = String(status ?? "").toLowerCase();
    if (!s || s === "-") return { bg: "#f8fafc", fg: "#0f172a", bd: "#e5e7eb", text: "-" };
    if (s.includes("profit") || s.includes("green") || s.includes("win"))
      return { bg: "#ecfdf5", fg: "#065f46", bd: "#bbf7d0", text: String(status) };
    if (s.includes("loss") || s.includes("red") || s.includes("fail"))
      return { bg: "#fff1f2", fg: "#9f1239", bd: "#fecaca", text: String(status) };
    return { bg: "#eef2ff", fg: "#3730a3", bd: "#c7d2fe", text: String(status) };
  };

  // WARNING column rule (as you asked):
  // - if rr_followed == true => "Good"
  // - if rr_followed == false => "Bad"
  // - if null => "-"
  const followWarning = (rr_followed) => {
    if (rr_followed === true) return { kind: "good", text: "Good" };
    if (rr_followed === false) return { kind: "bad", text: "Bad" };
    return { kind: "na", text: "-" };
  };

  // show ONLY repeated mistakes (count > 1) and unique per month+mistake
  const filteredMistakes = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of mistakeRepeats || []) {
      const count = Number(m.repeat_count);
      if (!Number.isFinite(count) || count <= 1) continue; // only repeated
      const key = `${m.month_start}__${String(m.mistake_text ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
    return out;
  }, [mistakeRepeats]);

  // -------------------- load platforms ONCE --------------------
  const didInit = useRef(false);
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

  // load segments when platform changes
  useEffect(() => {
    (async () => {
      try {
        setSegments([]);
        setPlans([]);
        setSegmentId("");
        setPlanId("");
        if (!platformId) return;
        const s = await api.getSegments(platformId);
        setSegments(s);
      } catch (e) {
        openError(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  // load plans when segment changes
  useEffect(() => {
    (async () => {
      try {
        setPlans([]);
        setPlanId("");
        if (!platformId || !segmentId) return;
        const pl = await api.getPlans(platformId, segmentId);
        setPlans(pl);
      } catch (e) {
        openError(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId, segmentId]);

  // refresh report (NO "Report updated" popups)
  const refresh = async () => {
    try {
      setBusy("refresh");

      const mr = await api.getMonthReport({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        plan_id: planId ? Number(planId) : null,
        month,
      });

      const mm = await api.getMistakesRepeat({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        plan_id: planId ? Number(planId) : null,
        month,
      });

      setMonthReport(Array.isArray(mr) ? mr : []);
      setMistakeRepeats(Array.isArray(mm) ? mm : []);
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, platformId, segmentId, planId]);

  // -------------------- UI --------------------
  return (
    <div className="page-root">
      <style>{`
        .page-root{
          min-height:100vh;
          width:100%;
          background:#fff;
          color:#0f172a;
          font-family:"Times New Roman", Times, serif;
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
        .btn-pro{ font-weight:900; border-radius:12px; }
        .table thead th{
          position:sticky;
          top:0;
          background:#f8fafc !important;
          z-index:1;
          font-size:13px;
          white-space:nowrap;
        }
        .pill{
          display:inline-block;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid #e5e7eb;
          font-size:12px;
          font-weight:900;
          white-space:nowrap;
        }
        .good-pill{
          background:rgba(22,163,74,0.10);
          border-color:rgba(22,163,74,0.25);
          color:#166534;
        }
        .bad-pill{
          background:rgba(220,38,38,0.10);
          border-color:rgba(220,38,38,0.25);
          color:#b91c1c;
        }
        .mistake-red{
          color:#b91c1c;
          font-weight:900;
          line-height:1.25;
        }
        .num-green{ color:#166534; font-weight:900; }
        .num-red{ color:#b91c1c; font-weight:900; }
        .num-dark{ color:#0f172a; font-weight:900; }
        .num-orange{ color:#9a3412; font-weight:900; }
        .num-yellow{ color:#a16207; font-weight:900; }
        .mobile-label{ font-size:12px; color:#64748b; font-weight:900; margin-bottom:3px; }
        .mobile-value{ font-weight:900; font-size:14px; }
      `}</style>

      {/* Header: only Trading Report + small Refresh */}
      <div className="topbar">
        <div className="container-fluid py-2 px-3 d-flex align-items-center justify-content-between">
          <div className="app-title">Trading Report</div>
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
                    <label className="form-label fw-bold small">Plan (Optional)</label>
                    <select
                      className="form-select"
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      disabled={!platformId || !segmentId}
                    >
                      <option value="">All Plans</option>
                      {plans.map((p) => (
                        <option key={p.plan_id} value={p.plan_id}>
                          {p.plan_name ? p.plan_name : `Plan #${p.plan_id}`} • RR {p.rr_ratio}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
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

            {/* Report */}
            <div className="col-12 col-lg-8">
              <div className="card-pro">
                <div className="card-head px-3 py-2 d-flex align-items-center justify-content-between">
                  <div className="fw-bold" style={{ fontWeight: 900 }}>
                    Monthly Summary
                  </div>
                  <div className="small text-muted fw-bold">{monthReport.length} rows</div>
                </div>

                {/* Desktop table */}
                {!isMobile ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr className="text-muted">
                          <th className="py-3 px-3">Month</th>
                          <th className="py-3 px-3">Profit</th>
                          <th className="py-3 px-3">Loss</th>
                          <th className="py-3 px-3">Brokerage</th>
                          <th className="py-3 px-3">Overall</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Target R:R</th>
                          <th className="py-3 px-3">Achieved R:R</th>
                          <th className="py-3 px-3">R:R Follow</th>
                          <th className="py-3 px-3">Fund</th>
                          <th className="py-3 px-3">Remaining</th>
                          <th className="py-3 px-3">Warning</th>
                        </tr>
                      </thead>

                      <tbody>
                        {monthReport.map((r, idx) => {
                          const st = statusBadge(r.month_status);
                          const followTxt = rrFollowedText(r.rr_followed);
                          const warn = followWarning(r.rr_followed);

                          return (
                            <tr key={idx}>
                              <td className="px-3 py-3 fw-bold">{formatDate(r.month_start)}</td>

                              <td className="px-3 py-3">
                                <span className="num-green">{safeText(r.total_month_profit)}</span>
                              </td>

                              <td className="px-3 py-3">
                                <span className="num-red">{safeText(r.total_month_loss)}</span>
                              </td>

                              <td className="px-3 py-3">
                                <span className="num-dark">{safeText(r.total_month_brokerage)}</span>
                              </td>

                              <td className="px-3 py-3">
                                <span className="num-orange">{safeText(r.overall_month_pnl)}</span>
                              </td>

                              <td className="px-3 py-3">
                                <span className="pill" style={{ background: st.bg, color: st.fg, borderColor: st.bd }}>
                                  {st.text}
                                </span>
                              </td>

                              <td className="px-3 py-3 fw-bold">{rrPretty(r.target_rr_ratio)}</td>
                              <td className="px-3 py-3 fw-bold">{rrPretty(r.achieved_rr)}</td>

                              <td className="px-3 py-3 fw-bold">
                                {followTxt === "Follow" ? (
                                  <span className="good-pill pill">Follow</span>
                                ) : followTxt === "Not Follow" ? (
                                  <span className="bad-pill pill">Not Follow</span>
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-3 py-3">
                                <span className="num-yellow">{safeText(r.plan_fund)}</span>
                              </td>

                              <td className="px-3 py-3 fw-bold">{safeText(r.fund_remaining)}</td>

                              {/* WARNING: ONLY based on rr_followed */}
                              <td className="px-3 py-3">
                                {warn.kind === "good" ? (
                                  <span className="good-pill pill">Good</span>
                                ) : warn.kind === "bad" ? (
                                  <span className="bad-pill pill">Bad</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {monthReport.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="px-3 py-4 text-muted fw-bold">
                              No report rows found for this filter/month.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Mobile cards
                  <div className="p-3">
                    {monthReport.map((r, idx) => {
                      const st = statusBadge(r.month_status);
                      const warn = followWarning(r.rr_followed);
                      const followTxt = rrFollowedText(r.rr_followed);

                      return (
                        <div key={idx} className="card-pro mb-3">
                          <div className="p-3">
                            <div className="fw-bold" style={{ fontWeight: 900, fontSize: 15 }}>
                              {formatDate(r.month_start)}
                            </div>

                            <div className="mt-2 d-flex flex-wrap gap-2">
                              <span className="pill" style={{ background: st.bg, color: st.fg, borderColor: st.bd }}>
                                {st.text}
                              </span>

                              {followTxt === "Follow" ? (
                                <span className="good-pill pill">Follow</span>
                              ) : followTxt === "Not Follow" ? (
                                <span className="bad-pill pill">Not Follow</span>
                              ) : (
                                <span className="pill">-</span>
                              )}

                              {warn.kind === "good" ? (
                                <span className="good-pill pill">Good</span>
                              ) : warn.kind === "bad" ? (
                                <span className="bad-pill pill">Bad</span>
                              ) : (
                                <span className="pill">-</span>
                              )}
                            </div>

                            <div className="mt-3 row g-2">
                              <div className="col-6">
                                <div className="mobile-label">Profit</div>
                                <div className="mobile-value num-green">{safeText(r.total_month_profit)}</div>
                              </div>
                              <div className="col-6">
                                <div className="mobile-label">Loss</div>
                                <div className="mobile-value num-red">{safeText(r.total_month_loss)}</div>
                              </div>
                              <div className="col-6">
                                <div className="mobile-label">Brokerage</div>
                                <div className="mobile-value num-dark">{safeText(r.total_month_brokerage)}</div>
                              </div>
                              <div className="col-6">
                                <div className="mobile-label">Overall</div>
                                <div className="mobile-value num-orange">{safeText(r.overall_month_pnl)}</div>
                              </div>

                              <div className="col-6">
                                <div className="mobile-label">Target R:R</div>
                                <div className="mobile-value">{rrPretty(r.target_rr_ratio)}</div>
                              </div>
                              <div className="col-6">
                                <div className="mobile-label">Achieved R:R</div>
                                <div className="mobile-value">{rrPretty(r.achieved_rr)}</div>
                              </div>

                              <div className="col-6">
                                <div className="mobile-label">Fund</div>
                                <div className="mobile-value num-yellow">{safeText(r.plan_fund)}</div>
                              </div>
                              <div className="col-6">
                                <div className="mobile-label">Remaining</div>
                                <div className="mobile-value">{safeText(r.fund_remaining)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {monthReport.length === 0 ? (
                      <div className="text-muted fw-bold">No report rows found for this filter/month.</div>
                    ) : null}
                  </div>
                )}

                {/* Mistakes Repeat */}
                <div className="card-head px-3 py-2 d-flex align-items-center justify-content-between border-top">
                  <div className="fw-bold" style={{ fontWeight: 900 }}>
                    Mistakes Repeat
                  </div>
                  <div className="small text-muted fw-bold">{filteredMistakes.length} rows</div>
                </div>

                {!isMobile ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr className="text-muted">
                          <th className="py-3 px-3">Month</th>
                          <th className="py-3 px-3">Repeated Mistake</th>
                          <th className="py-3 px-3">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMistakes.map((m, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-3 fw-bold">{formatDate(m.month_start)}</td>
                            <td className="px-3 py-3">
                              <span className="mistake-red">{safeText(m.mistake_text)}</span>
                            </td>
                            <td className="px-3 py-3 fw-bold">{safeText(m.repeat_count)}</td>
                          </tr>
                        ))}

                        {filteredMistakes.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-muted fw-bold">
                              No repeated mistakes found (count &gt; 1).
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3">
                    {filteredMistakes.map((m, idx) => (
                      <div key={idx} className="card-pro mb-3">
                        <div className="p-3">
                          <div className="fw-bold" style={{ fontWeight: 900 }}>
                            {formatDate(m.month_start)}
                          </div>
                          <div className="mt-2 mistake-red">{safeText(m.mistake_text)}</div>
                          <div className="mt-2">
                            <span className="pill">Count: {safeText(m.repeat_count)}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredMistakes.length === 0 ? (
                      <div className="text-muted fw-bold">No repeated mistakes found (count &gt; 1).</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal ONLY (no “Report updated” popup) */}
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
