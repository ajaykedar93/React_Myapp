// InvestmentReports.jsx
// Base URL: http://localhost:5000
// Uses Auth:
//   const { user } = useAuth();
//   const userId = user?.id ?? user?.user_id ?? null;
//
// Reports APIs:
//   GET /api/report/monthly?month=2026-02
//   GET /api/report/mistakes?month=2026-02
//   GET /api/report/fund?month=2026-02
//
// UI:
// - Bootstrap responsive (mobile cards + desktop tables)
// - Center alert/toast + center modal (optional)
// - Soft borders (no dark border)

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "http://localhost:5000";

export default function InvestmentReports() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id ?? null;

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (userId) h["x-user-id"] = String(userId);
    return h;
  }, [userId]);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const [loading, setLoading] = useState(false);

  const [monthly, setMonthly] = useState([]); // month summary rows
  const [mistakes, setMistakes] = useState([]); // top mistakes rows
  const [fund, setFund] = useState([]); // fund remaining rows

  const [toast, setToast] = useState(null);

  function showToast(type, message) {
    setToast({ type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  async function safeFetch(path, options = {}) {
    if (!userId) throw new Error("Login required");

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });

    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  }

  const fmtMoney = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  async function loadReports(m = month) {
    try {
      setLoading(true);

      const q = `?month=${encodeURIComponent(m)}`;
      const [mRes, misRes, fRes] = await Promise.all([
        safeFetch(`/api/report/monthly${q}`, { method: "GET" }),
        safeFetch(`/api/report/mistakes${q}`, { method: "GET" }),
        safeFetch(`/api/report/fund${q}`, { method: "GET" }),
      ]);

      setMonthly(mRes?.data || []);
      setMistakes(misRes?.data || []);
      setFund(fRes?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadReports(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadReports(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  if (!userId) {
    return (
      <div className="container-fluid p-0 bg-light min-vh-100 d-flex align-items-center justify-content-center">
        <style>{css}</style>
        <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: "92%" }}>
          <div className="card-body text-center">
            <h5 className="mb-2">Login required</h5>
            <div className="text-muted">Please login again.</div>
          </div>
        </div>
      </div>
    );
  }

  // quick totals (from monthly data)
  const totals = useMemo(() => {
    const sum = (arr, key) => arr.reduce((a, x) => a + (Number(x?.[key]) || 0), 0);
    return {
      profit: sum(monthly, "total_profit"),
      loss: sum(monthly, "total_loss"),
      brokerage: sum(monthly, "total_brokerage"),
      overall: sum(monthly, "overall_total"),
      rrYes: sum(monthly, "rr_followed_count"),
      rrNo: sum(monthly, "rr_not_followed_count"),
      overtrade: sum(monthly, "overtrade_entries"),
      mistakes: sum(monthly, "mistakes_count"),
    };
  }, [monthly]);

  return (
    <div className="container-fluid p-0 min-vh-100 bg-light">
      <style>{css}</style>

      {/* Header */}
      <div className="bg-white border-bottom sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between">
          <div className="fw-bold">Investment Reports</div>
          <span className="badge text-bg-primary">User: {userId}</span>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-3 py-3">
        {/* Month selector + refresh */}
        <div className="soft-card p-3 mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="fw-semibold">Select Month</div>
              <div className="small text-muted">Monthly summary + top mistakes + fund status</div>
            </div>
            <div className="col-7 col-md-3">
              <input
                type="month"
                className="form-control"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="col-5 col-md-3 d-grid">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => loadReports(month)} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="row g-3 mb-3">
          <div className="col-6 col-lg-3">
            <div className="soft-card p-3 h-100">
              <div className="small text-muted">Overall</div>
              <div className={`fw-bold fs-5 ${totals.overall >= 0 ? "text-success" : "text-danger"}`}>
                {fmtMoney(totals.overall)}
              </div>
              <div className="small text-muted">Profit - Loss - Brokerage</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="soft-card p-3 h-100">
              <div className="small text-muted">RR Follow</div>
              <div className="fw-bold fs-5">
                {totals.rrYes} <span className="text-muted">/</span> {totals.rrNo}
              </div>
              <div className="small text-muted">Followed / Not Followed</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="soft-card p-3 h-100">
              <div className="small text-muted">Overtrade</div>
              <div className="fw-bold fs-5 text-warning">{totals.overtrade}</div>
              <div className="small text-muted">Entries flagged</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="soft-card p-3 h-100">
              <div className="small text-muted">Mistakes</div>
              <div className="fw-bold fs-5">{totals.mistakes}</div>
              <div className="small text-muted">Entries with mistakes</div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* Monthly Summary */}
          <div className="col-12 col-lg-7">
            <div className="soft-card p-3 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Monthly Summary</div>
                <span className="small text-muted">{monthly.length} rows</span>
              </div>

              {monthly.length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No data for this month</div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="d-lg-none d-flex flex-column gap-2">
                    {monthly.map((r, idx) => (
                      <div key={idx} className="soft-item">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="fw-semibold text-truncate">
                            Cat #{r.category_id} • Sub #{r.subcategory_id}
                          </div>
                          <span
                            className={`badge ${
                              r.month_status === "PROFIT"
                                ? "text-bg-success"
                                : r.month_status === "LOSS"
                                ? "text-bg-danger"
                                : "text-bg-secondary"
                            }`}
                          >
                            {r.month_status}
                          </span>
                        </div>

                        <div className="small text-muted mt-1">
                          Profit: <span className="fw-semibold">{fmtMoney(r.total_profit)}</span> • Loss:{" "}
                          <span className="fw-semibold">{fmtMoney(r.total_loss)}</span>
                        </div>

                        <div className="small text-muted">
                          Brokerage: <span className="fw-semibold">{fmtMoney(r.total_brokerage)}</span> • Overall:{" "}
                          <span className={`fw-semibold ${Number(r.overall_total) >= 0 ? "text-success" : "text-danger"}`}>
                            {fmtMoney(r.overall_total)}
                          </span>
                        </div>

                        <div className="mt-2 d-flex flex-wrap gap-2">
                          <span className="badge text-bg-info">RR Yes: {r.rr_followed_count}</span>
                          <span className="badge text-bg-secondary">RR No: {r.rr_not_followed_count}</span>
                          {Number(r.overtrade_entries) > 0 ? (
                            <span className="badge text-bg-warning">Overtrade: {r.overtrade_entries}</span>
                          ) : null}
                          {Number(r.mistakes_count) > 0 ? (
                            <span className="badge text-bg-dark">Mistakes: {r.mistakes_count}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="d-none d-lg-block table-responsive">
                    <table className="table table-sm align-middle mb-0 table-hover">
                      <thead>
                        <tr>
                          <th>Cat/Sub</th>
                          <th>Status</th>
                          <th className="text-end">Profit</th>
                          <th className="text-end">Loss</th>
                          <th className="text-end">Brokerage</th>
                          <th className="text-end">Overall</th>
                          <th className="text-end">RR Yes</th>
                          <th className="text-end">RR No</th>
                          <th className="text-end">Overtrade</th>
                          <th className="text-end">Mistakes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.map((r, idx) => (
                          <tr key={idx}>
                            <td className="fw-semibold">
                              {r.category_id}/{r.subcategory_id}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  r.month_status === "PROFIT"
                                    ? "text-bg-success"
                                    : r.month_status === "LOSS"
                                    ? "text-bg-danger"
                                    : "text-bg-secondary"
                                }`}
                              >
                                {r.month_status}
                              </span>
                            </td>
                            <td className="text-end">{fmtMoney(r.total_profit)}</td>
                            <td className="text-end">{fmtMoney(r.total_loss)}</td>
                            <td className="text-end">{fmtMoney(r.total_brokerage)}</td>
                            <td className="text-end">
                              <span className={`fw-semibold ${Number(r.overall_total) >= 0 ? "text-success" : "text-danger"}`}>
                                {fmtMoney(r.overall_total)}
                              </span>
                            </td>
                            <td className="text-end">{r.rr_followed_count}</td>
                            <td className="text-end">{r.rr_not_followed_count}</td>
                            <td className="text-end">{r.overtrade_entries}</td>
                            <td className="text-end">{r.mistakes_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="col-12 col-lg-5">
            {/* Top Mistakes */}
            <div className="soft-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Top Repeated Mistakes</div>
                <span className="small text-muted">{mistakes.length}</span>
              </div>

              {mistakes.length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No repeated mistakes</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Mistake</th>
                        <th className="text-end" style={{ width: 120 }}>
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mistakes.map((m, idx) => (
                        <tr key={idx}>
                          <td className="fw-semibold">{m.mistake_text || "-"}</td>
                          <td className="text-end">
                            <span className="badge text-bg-warning">{m.repeat_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Fund Status */}
            <div className="soft-card p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Plan Fund Status</div>
                <span className="small text-muted">{fund.length}</span>
              </div>

              {fund.length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No plan fund data</div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="d-lg-none d-flex flex-column gap-2">
                    {fund.map((f, idx) => (
                      <div key={idx} className="soft-item">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="fw-semibold text-truncate">Plan #{f.plan_id}</div>
                          <span className={`badge ${Number(f.fund_remaining) >= 0 ? "text-bg-success" : "text-bg-danger"}`}>
                            {fmtMoney(f.fund_remaining)}
                          </span>
                        </div>
                        <div className="small text-muted mt-1">
                          Fund: <span className="fw-semibold">{fmtMoney(f.total_fund)}</span> • Month PnL:{" "}
                          <span className={`fw-semibold ${Number(f.month_pnl) >= 0 ? "text-success" : "text-danger"}`}>
                            {fmtMoney(f.month_pnl)}
                          </span>
                        </div>
                        <div className="small text-muted">
                          Sub: <span className="fw-semibold">{f.subcategory_id}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="d-none d-lg-block table-responsive">
                    <table className="table table-sm align-middle mb-0 table-hover">
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Sub</th>
                          <th className="text-end">Fund</th>
                          <th className="text-end">Month PnL</th>
                          <th className="text-end">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fund.map((f, idx) => (
                          <tr key={idx}>
                            <td className="fw-semibold">#{f.plan_id}</td>
                            <td>{f.subcategory_id}</td>
                            <td className="text-end">{fmtMoney(f.total_fund)}</td>
                            <td className="text-end">
                              <span className={`fw-semibold ${Number(f.month_pnl) >= 0 ? "text-success" : "text-danger"}`}>
                                {fmtMoney(f.month_pnl)}
                              </span>
                            </td>
                            <td className="text-end">
                              <span
                                className={`badge ${Number(f.fund_remaining) >= 0 ? "text-bg-success" : "text-bg-danger"}`}
                              >
                                {fmtMoney(f.fund_remaining)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast (center-bottom) */}
      {toast && (
        <div className="toast-custom">
          <div className={`alert alert-${toast.type} shadow-sm mb-0 py-2 px-3 text-center`}>
            <div className="small fw-semibold">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
  .soft-card{
    background: #fff;
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(0,0,0,.06);
  }

  .soft-item{
    background: #fff;
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 14px;
    padding: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.05);
  }

  .table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.06) !important;
  }

  .toast-custom{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
  }

  @media (min-width: 992px){
    .table thead th{
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 1;
    }
  }
`;
