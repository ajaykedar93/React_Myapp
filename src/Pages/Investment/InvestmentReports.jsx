
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "https://express-backend-myapp.onrender.com";

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

  const [monthly, setMonthly] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [fund, setFund] = useState([]);
  const [plans, setPlans] = useState([]);
  const [journal, setJournal] = useState([]);

  const [selCategoryId, setSelCategoryId] = useState("");
  const [selSubId, setSelSubId] = useState("");
  const [selPlanId, setSelPlanId] = useState("");

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

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fmtMoney = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
    } catch {
      return String(n);
    }
  };

  const isoDay = (v) => (v ? String(v).slice(0, 10) : "");

  const fmtRR = (risk, reward) => {
    const r = toNum(risk);
    const w = toNum(reward);
    if (r <= 0 || w <= 0) return "—";
    const x = w / r;
    const two = Number.isFinite(x) ? x.toFixed(2) : "0.00";
    const clean = two.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    return `1:${clean}`;
  };

  async function loadAll(m = month) {
    try {
      setLoading(true);

      const q = `?month=${encodeURIComponent(m)}`;
      const [mRes, misRes, fRes, pRes, jRes] = await Promise.all([
        safeFetch(`/api/report/monthly${q}`, { method: "GET" }),
        safeFetch(`/api/report/mistakes${q}`, { method: "GET" }),
        safeFetch(`/api/report/fund${q}`, { method: "GET" }),
        safeFetch(`/api/plan`, { method: "GET" }),
        safeFetch(`/api/journal${q}`, { method: "GET" }),
      ]);

      setMonthly(mRes?.data || []);
      setMistakes(misRes?.data || []);
      setFund(fRes?.data || []);
      setPlans(pRes?.data || []);
      setJournal(jRes?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadAll(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadAll(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, userId]);

  useEffect(() => {
    setSelSubId("");
    setSelPlanId("");
  }, [selCategoryId]);

  useEffect(() => {
    setSelPlanId("");
  }, [selSubId]);

  const plansById = useMemo(() => {
    const m = new Map();
    (plans || []).forEach((p) => m.set(Number(p.plan_id), p));
    return m;
  }, [plans]);

  const categoryOptions = useMemo(() => {
    const m = new Map();
    (monthly || []).forEach((r) => {
      if (r.category_id != null) m.set(String(r.category_id), r.category_name || `Category ${r.category_id}`);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [monthly]);

  const subcategoryOptions = useMemo(() => {
    const m = new Map();
    (monthly || []).forEach((r) => {
      if (selCategoryId && String(r.category_id) !== String(selCategoryId)) return;
      if (r.subcategory_id != null) m.set(String(r.subcategory_id), r.subcategory_name || `Subcategory ${r.subcategory_id}`);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [monthly, selCategoryId]);

  const planOptions = useMemo(() => {
    const arr = (plans || []).filter((p) => {
      if (selSubId && String(p.subcategory_id) !== String(selSubId)) return false;
      if (selCategoryId && String(p.category_id) !== String(selCategoryId)) return false;
      return true;
    });
    return arr.map((p) => ({
      id: String(p.plan_id),
      name: p.plan_name ? `${p.plan_name}` : `Plan #${p.plan_id}`,
    }));
  }, [plans, selCategoryId, selSubId]);

  const selectedPlan = useMemo(() => {
    if (!selPlanId) return null;
    return plansById.get(Number(selPlanId)) || null;
  }, [selPlanId, plansById]);

  const filteredMonthly = useMemo(() => {
    return (monthly || []).filter((r) => {
      if (selCategoryId && String(r.category_id) !== String(selCategoryId)) return false;
      if (selSubId && String(r.subcategory_id) !== String(selSubId)) return false;
      return true;
    });
  }, [monthly, selCategoryId, selSubId]);

  const filteredMistakes = useMemo(() => {
    return (mistakes || []).filter((m) => {
      if (selCategoryId && String(m.category_id) !== String(selCategoryId)) return false;
      if (selSubId && String(m.subcategory_id) !== String(selSubId)) return false;
      return true;
    });
  }, [mistakes, selCategoryId, selSubId]);

  const filteredJournal = useMemo(() => {
    return (journal || []).filter((j) => {
      if (selCategoryId && String(j.category_id) !== String(selCategoryId)) return false;
      if (selSubId && String(j.subcategory_id) !== String(selSubId)) return false;
      if (selPlanId && String(j.plan_id) !== String(selPlanId)) return false;
      return true;
    });
  }, [journal, selCategoryId, selSubId, selPlanId]);

  const filteredFund = useMemo(() => {
    return (fund || []).filter((f) => {
      if (selCategoryId && String(f.category_id) !== String(selCategoryId)) return false;
      if (selSubId && String(f.subcategory_id) !== String(selSubId)) return false;
      if (selPlanId && String(f.plan_id) !== String(selPlanId)) return false;
      return true;
    });
  }, [fund, selCategoryId, selSubId, selPlanId]);

  const kpi = useMemo(() => {
    const sum = (arr, key) => (arr || []).reduce((a, x) => a + (Number(x?.[key]) || 0), 0);

    const totalProfit = sum(filteredMonthly, "total_profit");
    const totalLoss = sum(filteredMonthly, "total_loss");
    const totalBrokerage = sum(filteredMonthly, "total_brokerage");

    const tradeDays = new Set();
    let totalTrades = 0;
    (filteredJournal || []).forEach((t) => {
      const d = isoDay(t.trade_date);
      if (d) tradeDays.add(d);
      const c = Number(t.trades_count);
      totalTrades += Number.isFinite(c) && c > 0 ? c : 1;
    });

    let rrText = "—";
    if (selectedPlan) rrText = fmtRR(selectedPlan.risk_loss, selectedPlan.profit_reward);

    return {
      totalProfit,
      totalLoss,
      totalBrokerage,
      tradeDays: tradeDays.size,
      totalTrades,
      rrText,
    };
  }, [filteredMonthly, filteredJournal, selectedPlan]);

  const repeatedMistakes = useMemo(() => {
    const rep = (filteredMistakes || []).filter((m) => Number(m.repeat_count) >= 2);
    rep.sort((a, b) => Number(b.repeat_count) - Number(a.repeat_count));
    return rep;
  }, [filteredMistakes]);

  // Subcategory Total Fund (based on selected plan or sum of plans in selected subcategory)
  const subFund = useMemo(() => {
    // prefer selected plan total_fund from fund API if present
    if (selPlanId) {
      const fRow = (filteredFund || []).find((x) => String(x.plan_id) === String(selPlanId));
      const base = fRow ? toNum(fRow.total_fund) : selectedPlan ? toNum(selectedPlan.total_fund_deposit) : 0;
      const monthPnl = fRow ? toNum(fRow.month_pnl) : 0;
      const remain = fRow ? toNum(fRow.fund_remaining) : base + monthPnl;
      return {
        label: "Plan Fund",
        base,
        monthPnl,
        remain,
      };
    }

    // if subcategory selected, sum all plans inside that subcategory
    if (selSubId) {
      const planList = (plans || []).filter((p) => String(p.subcategory_id) === String(selSubId));
      const base = planList.reduce((a, p) => a + toNum(p.total_fund_deposit), 0);

      // sum month pnl from fund API rows for these plans
      const fRows = (fund || []).filter((x) => String(x.subcategory_id) === String(selSubId));
      const monthPnl = fRows.reduce((a, x) => a + toNum(x.month_pnl), 0);

      // "remain" = base + monthPnl (consistent with fund endpoint logic)
      const remain = base + monthPnl;

      return {
        label: "Subcategory Fund",
        base,
        monthPnl,
        remain,
      };
    }

    // all plans sum
    const base = (plans || []).reduce((a, p) => a + toNum(p.total_fund_deposit), 0);
    const monthPnl = (fund || []).reduce((a, x) => a + toNum(x.month_pnl), 0);
    const remain = base + monthPnl;

    return { label: "Total Fund", base, monthPnl, remain };
  }, [selPlanId, selSubId, filteredFund, selectedPlan, plans, fund]);

  // Show "After Profit" and "After Loss" based on monthly totals
  const fundMath = useMemo(() => {
    const base = toNum(subFund.base);
    const afterProfit = base + toNum(kpi.totalProfit);
    const afterLoss = base - toNum(kpi.totalLoss);
    return { base, afterProfit, afterLoss };
  }, [subFund.base, kpi.totalProfit, kpi.totalLoss]);

  if (!userId) {
    return (
      <div className="container-fluid p-0 bg-soft min-vh-100 d-flex align-items-center justify-content-center">
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

  return (
    <div className="container-fluid p-0 min-vh-100 bg-soft">
      <style>{css}</style>

      {/* Header */}
      <div className="topbar sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-dot" />
            <div className="fw-bold text-white">Investment Reports</div>
          </div>

          <button className="btn btn-sm btn-glow" onClick={() => loadAll(month)} disabled={loading}>
            {loading ? "Loading..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Month + Filters */}
      <div className="container-fluid px-2 px-md-3 pt-3">
        <div className="soft-card p-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-3">
              <div className="fw-bold">Month</div>
              <div className="small text-muted">Select any month</div>
              <input type="month" className="form-control mt-1" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>

            <div className="col-12 col-lg-3">
              <div className="fw-bold">Category</div>
              <div className="small text-muted">First select category</div>
              <select className="form-select mt-1" value={selCategoryId} onChange={(e) => setSelCategoryId(e.target.value)}>
                <option value="">All</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-3">
              <div className="fw-bold">Subcategory</div>
              <div className="small text-muted">Then select subcategory</div>
              <select
                className="form-select mt-1"
                value={selSubId}
                onChange={(e) => setSelSubId(e.target.value)}
                disabled={!subcategoryOptions.length}
              >
                <option value="">All</option>
                {subcategoryOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-3">
              <div className="fw-bold">Plan</div>
              <div className="small text-muted">Plans for selected subcategory</div>
              <select className="form-select mt-1" value={selPlanId} onChange={(e) => setSelPlanId(e.target.value)} disabled={!planOptions.length}>
                <option value="">All</option>
                {planOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI squares */}
        <div className="kpi-row mt-3">
          <div className="kpi-box kpi-profit">
            <div className="kpi-k">Total Profit</div>
            <div className="kpi-v">{fmtMoney(kpi.totalProfit)}</div>
          </div>
          <div className="kpi-box kpi-loss">
            <div className="kpi-k">Total Loss</div>
            <div className="kpi-v">{fmtMoney(kpi.totalLoss)}</div>
          </div>
          <div className="kpi-box kpi-brok">
            <div className="kpi-k">Brokerage</div>
            <div className="kpi-v">{fmtMoney(kpi.totalBrokerage)}</div>
          </div>
          <div className="kpi-box kpi-days">
            <div className="kpi-k">Trade Days</div>
            <div className="kpi-v">{kpi.tradeDays}</div>
          </div>
          <div className="kpi-box kpi-trades">
            <div className="kpi-k">Total Trades</div>
            <div className="kpi-v">{kpi.totalTrades}</div>
          </div>
          <div className="kpi-box kpi-rr">
            <div className="kpi-k">RR</div>
            <div className="kpi-v">{kpi.rrText}</div>
          </div>

          {/* EXTRA fund tiles (same row) */}
          <div className="kpi-box kpi-fund">
            <div className="kpi-k">{subFund.label}</div>
            <div className="kpi-v">{fmtMoney(fundMath.base)}</div>
          </div>
          <div className="kpi-box kpi-fundgood">
            <div className="kpi-k">After Profit</div>
            <div className="kpi-v">{fmtMoney(fundMath.afterProfit)}</div>
          </div>
          <div className="kpi-box kpi-fundbad">
            <div className="kpi-k">After Loss</div>
            <div className="kpi-v">{fmtMoney(fundMath.afterLoss)}</div>
          </div>
          <div className="kpi-box kpi-remain">
            <div className="kpi-k">Remain (Month)</div>
            <div className="kpi-v">{fmtMoney(subFund.remain)}</div>
          </div>
        </div>

        {/* Repeated mistake alert */}
        {repeatedMistakes.length > 0 ? (
          <div className="alert alert-danger border-0 shadow-sm mt-3 mb-0">
            <div className="fw-bold">⚠ Repeated Mistakes Detected</div>
            <div className="small mt-1">Same mistake repeating again & again — please control it.</div>
          </div>
        ) : null}
      </div>

      {/* ONLY Monthly Summary section */}
      <div className="container-fluid px-2 px-md-3 py-3">
        <div className="soft-card p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="fw-bold">Monthly Summary</div>
            <div className="small text-muted">{filteredMonthly.length} rows</div>
          </div>

          {filteredMonthly.length === 0 && !loading ? (
            <div className="alert alert-light border small mb-0">No data for this filter/month</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="d-lg-none d-flex flex-column gap-2">
                {filteredMonthly.map((r, idx) => (
                  <div key={idx} className="soft-item">
                    <div className="d-flex justify-content-between gap-2">
                      <div className="minw-0">
                        <div className="fw-semibold text-truncate">
                          {r.category_name} • {r.subcategory_name}
                        </div>
                        <div className="small text-muted mt-1">
                          Profit: <span className="fw-bold text-success">{fmtMoney(r.total_profit)}</span> • Loss:{" "}
                          <span className="fw-bold text-danger">{fmtMoney(r.total_loss)}</span>
                        </div>
                        <div className="small text-muted">
                          Brokerage: <span className="fw-bold">{fmtMoney(r.total_brokerage)}</span> • Overall:{" "}
                          <span className={`fw-bold ${Number(r.overall_total) >= 0 ? "text-success" : "text-danger"}`}>
                            {fmtMoney(r.overall_total)}
                          </span>
                        </div>
                      </div>

                      <div className={`net-box ${Number(r.overall_total) >= 0 ? "net-good" : "net-bad"}`}>
                        <div className="net-k">Overall</div>
                        <div className="net-v">{fmtMoney(r.overall_total)}</div>
                      </div>
                    </div>

                    <div className="mt-2 d-flex flex-wrap gap-2">
                      <span className="badge text-bg-success">RR Yes: {r.rr_followed_count}</span>
                      <span className="badge text-bg-secondary">RR No: {r.rr_not_followed_count}</span>
                      {Number(r.overtrade_entries) > 0 ? <span className="badge text-bg-warning">Overtrade: {r.overtrade_entries}</span> : null}
                      {Number(r.mistakes_count) > 0 ? <span className="badge text-bg-dark">Mistakes: {r.mistakes_count}</span> : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="d-none d-lg-block table-responsive">
                <table className="table table-sm align-middle mb-0 table-hover">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Subcategory</th>
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
                    {filteredMonthly.map((r, idx) => (
                      <tr key={idx}>
                        <td className="fw-semibold">{r.category_name}</td>
                        <td className="fw-semibold">{r.subcategory_name}</td>
                        <td className="text-end text-success fw-bold">{fmtMoney(r.total_profit)}</td>
                        <td className="text-end text-danger fw-bold">{fmtMoney(r.total_loss)}</td>
                        <td className="text-end">{fmtMoney(r.total_brokerage)}</td>
                        <td className="text-end">
                          <span className={`fw-bold ${Number(r.overall_total) >= 0 ? "text-success" : "text-danger"}`}>
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

      {/* Toast */}
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
  .bg-soft{
    background:
      radial-gradient(900px 380px at 10% 0%, rgba(99,102,241,.16), transparent 55%),
      radial-gradient(820px 360px at 90% 10%, rgba(16,185,129,.12), transparent 55%),
      #f6f7fb;
  }

  .topbar{
    background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 55%, #22c55e 110%);
    border-bottom: 1px solid rgba(255,255,255,.25);
  }

  .brand-dot{
    width: 10px; height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,.95);
    box-shadow: 0 0 0 6px rgba(255,255,255,.14);
  }

  .btn-glow{
    background: rgba(255,255,255,.18);
    color: #fff;
    border: 1px solid rgba(255,255,255,.28);
  }
  .btn-glow:hover{ background: rgba(255,255,255,.26); color: #fff; }

  .soft-card{
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,.08);
    backdrop-filter: blur(8px);
  }

  .soft-item{
    background: rgba(255,255,255,.95);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.05);
  }

  .kpi-row{
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 10px;
  }
  @media (max-width: 991px){
    .kpi-row{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  .kpi-box{
    height: 64px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    border: 1px solid rgba(0,0,0,.06);
    background: rgba(255,255,255,.9);
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    text-align: center;
  }
  .kpi-k{ font-size: 11px; font-weight: 900; opacity: .7; }
  .kpi-v{ font-size: 13px; font-weight: 900; margin-top: 3px; }

  .kpi-profit{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(21,128,61,.95); }
  .kpi-loss{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(185,28,28,.95); }
  .kpi-brok{ border-color: rgba(245,158,11,.25); background: rgba(245,158,11,.10); color: rgba(146,64,14,.95); }
  .kpi-days{ border-color: rgba(59,130,246,.22); background: rgba(59,130,246,.10); color: rgba(30,64,175,.95); }
  .kpi-trades{ border-color: rgba(107,114,128,.22); background: rgba(107,114,128,.10); color: rgba(31,41,55,.95); }
  .kpi-rr{ border-color: rgba(99,102,241,.22); background: rgba(99,102,241,.10); color: rgba(49,46,129,.95); }

  .kpi-fund{ border-color: rgba(20,184,166,.22); background: rgba(20,184,166,.10); color: rgba(15,118,110,.95); }
  .kpi-fundgood{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.08); color: rgba(21,128,61,.95); }
  .kpi-fundbad{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.08); color: rgba(185,28,28,.95); }
  .kpi-remain{ border-color: rgba(14,165,233,.22); background: rgba(14,165,233,.10); color: rgba(3,105,161,.95); }

  .net-box{
    width: 96px;
    height: 56px;
    border-radius: 16px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    border: 1px solid rgba(0,0,0,.06);
    flex-shrink: 0;
  }
  .net-k{ font-size: 11px; font-weight: 900; opacity: .72; }
  .net-v{ font-size: 12px; font-weight: 900; margin-top: 2px; }
  .net-good{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(21,128,61,.95); }
  .net-bad{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(185,28,28,.95); }

  .toast-custom{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
  }

  .table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.06) !important;
  }

  @media (min-width: 992px){
    .table thead th{
      position: sticky;
      top: 0;
      background: rgba(255,255,255,.98);
      z-index: 1;
    }
  }
`;
