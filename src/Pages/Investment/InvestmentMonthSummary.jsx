// InvestmentMonthSummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===== API LINKS (match your server) ===== */
const API_CATEGORY = "http://localhost:5000/api/investment_category";
const API_SUBCATEGORY = "http://localhost:5000/api/investment_subcategory";
const API_MONTHLY = "http://localhost:5000/api/monthly_summary"; // + /months, /txn, /snapshot

/* ===== Helpers ===== */
const colors = {
  gradient: "linear-gradient(135deg, #5f4bb6 0%, #7a5af5 30%, #1f5f78 100%)",
  success: "#0f8a5f",
  danger: "#b33a3a",
  warning: "#b3833a",
  info: "#0b6cff",
  base: "#1b2430",
  light: "#f6f8fb",
  line: "#e6e9ef",
  card: "#ffffff",
};

const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const humanMonth = (ym) => {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
const dmyTime = (s) => {
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
};
const money = (n) => {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "-";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = (num, den) => {
  const n = Number(num || 0);
  const d = Number(den || 0);
  if (d <= 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
};

export default function InvestmentMonthSummary() {
  /* ===== masters ===== */
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  /* ===== selection ===== */
  const [filters, setFilters] = useState({
    month: monthNow(),
    category_id: "",
    subcategory_id: "",
  });

  const [months, setMonths] = useState([]); // list of YYYY-MM that have data

  /* ===== data ===== */
  const [summary, setSummary] = useState(null); // computed on the fly
  const [txns, setTxns] = useState([]);         // deposit/withdrawal events
  const [snapshot, setSnapshot] = useState(null);

  /* ===== UI state ===== */
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [alert, setAlert] = useState({ show: false, title: "", message: "", type: "danger" });

  const [txnModal, setTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({
    txn_type: "DEPOSIT",
    amount: "",
    note: "",
    txn_at: "", // datetime-local
  });

  const filteredSubcategories = useMemo(() => {
    if (!filters.category_id) return [];
    return subcategories.filter((s) => String(s.category_id) === String(filters.category_id));
  }, [filters.category_id, subcategories]);

  const rrPct = useMemo(() => pct(summary?.rr_respected_count, summary?.trades_count), [summary]);
  const riskPct = useMemo(() => pct(summary?.risk_follow_count, summary?.trades_count), [summary]);
  const rewardPct = useMemo(() => pct(summary?.reward_follow_count, summary?.trades_count), [summary]);

  // Decide when we "have data"
  const hasData = useMemo(() => {
    if (!summary) return txns.length > 0;
    const trades = Number(summary.trades_count || 0) > 0;
    const hasDeposits = Number(summary.total_deposit_added || 0) > 0;
    const hasWithdrawals = Number(summary.total_withdrawn || 0) > 0;
    const segments = (summary.segments_ranking || []).length > 0;
    return trades || hasDeposits || hasWithdrawals || segments || txns.length > 0;
  }, [summary, txns.length]);

  /* ===== effects: load masters ===== */
  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([axios.get(API_CATEGORY), axios.get(API_SUBCATEGORY)]);
        setCategories(c.data || []);
        setSubcategories(s.data || []);
      } catch {
        showToast("Failed to load categories/subcategories", "danger");
      }
    })();
  }, []);

  /* ===== effects: when category/subcategory change, fetch months list ===== */
  useEffect(() => {
    if (!filters.category_id || !filters.subcategory_id) {
      setSummary(null);
      setTxns([]);
      setMonths([]);
      setSnapshot(null);
      return;
    }
    fetchMonths(filters.category_id, filters.subcategory_id);
  }, [filters.category_id, filters.subcategory_id]);

  /* ===== effects: whenever filters (with valid cat/sub) change, load summary & txns & snapshot ===== */
  useEffect(() => {
    if (!filters.category_id || !filters.subcategory_id || !filters.month) return;
    fetchSummary(filters.month, filters.category_id, filters.subcategory_id);
    fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
    fetchSnapshot(filters.month, filters.category_id, filters.subcategory_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.month, filters.category_id, filters.subcategory_id]);

  /* ===== API calls ===== */
  async function fetchMonths(catId, subId) {
    try {
      const { data } = await axios.get(`${API_MONTHLY}/months`, {
        params: { category_id: catId, subcategory_id: subId },
      });
      setMonths(data || []);
      // If current month not in the list, still let user select it (keep as-is)
      if (!filters.month && data && data.length) {
        setFilters((f) => ({ ...f, month: data[0] })); // choose latest available
      }
    } catch {
      setMonths([]);
    }
  }

  async function fetchSummary(month, catId, subId) {
    try {
      setLoading(true);
      const { data } = await axios.get(API_MONTHLY, {
        params: { month, category_id: catId, subcategory_id: subId },
      });
      setSummary(data || null);
    } catch {
      // Don't toast error for "no data" – we show a friendly center message instead.
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTxns(month, catId, subId) {
    try {
      const { data } = await axios.get(`${API_MONTHLY}/txn`, {
        params: { month, category_id: catId, subcategory_id: subId },
      });
      setTxns(data || []);
    } catch {
      setTxns([]);
    }
  }

  async function fetchSnapshot(month, catId, subId) {
    try {
      const { data } = await axios.get(`${API_MONTHLY}/snapshot`, {
        params: { month, category_id: catId, subcategory_id: subId },
      });
      setSnapshot(data || null);
    } catch {
      setSnapshot(null);
    }
  }

  async function saveSnapshot() {
    try {
      if (!filters.category_id || !filters.subcategory_id || !filters.month) return;
      await axios.post(`${API_MONTHLY}/snapshot`, {
        month: filters.month,
        category_id: Number(filters.category_id),
        subcategory_id: Number(filters.subcategory_id),
      });
      showToast("Snapshot saved");
      await fetchSnapshot(filters.month, filters.category_id, filters.subcategory_id);
    } catch {
      showToast("Failed to save snapshot", "danger");
    }
  }

  /* ===== TXN actions ===== */
  function openTxnModal(type = "DEPOSIT") {
    setTxnForm({
      txn_type: type,
      amount: "",
      note: "",
      txn_at: "", // optional; if empty → server uses NOW()
    });
    setTxnModal(true);
  }
  function onTxnChange(e) {
    const { name, value } = e.target;
    setTxnForm((f) => ({ ...f, [name]: value }));
  }
  async function submitTxn() {
    try {
      if (!filters.category_id || !filters.subcategory_id) {
        return showToast("Pick Category & Subcategory first", "warning");
      }
      const payload = {
        category_id: Number(filters.category_id),
        subcategory_id: Number(filters.subcategory_id),
        txn_type: txnForm.txn_type,
        amount: Number(txnForm.amount || 0),
        note: txnForm.note || undefined,
        txn_at: txnForm.txn_at ? new Date(txnForm.txn_at).toISOString() : undefined,
      };
      if (!(payload.amount >= 0)) return showToast("Amount must be ≥ 0", "danger");
      await axios.post(`${API_MONTHLY}/txn`, payload);
      setTxnModal(false);
      showToast(`${payload.txn_type} added`);
      await fetchSummary(filters.month, filters.category_id, filters.subcategory_id);
      await fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
      await fetchMonths(filters.category_id, filters.subcategory_id); // month set may expand
    } catch {
      showToast("Failed to add transaction", "danger");
    }
  }
  async function deleteTxn(id) {
    try {
      await axios.delete(`${API_MONTHLY}/txn/${id}`);
      showToast("Transaction deleted");
      await fetchSummary(filters.month, filters.category_id, filters.subcategory_id);
      await fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
    } catch {
      showToast("Delete failed", "danger");
    }
  }

  /* ===== UI helpers ===== */
  function showToast(message, type = "success") {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 1800);
  }
  function showAlert(title, message, type = "danger") {
    setAlert({ show: true, title, message, type });
  }
  function closeAlert() {
    setAlert({ show: false, title: "", message: "", type: "danger" });
  }
  function onFilterChange(e) {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  }

  const showCenterNotFound =
    !loading &&
    filters.category_id &&
    filters.subcategory_id &&
    filters.month &&
    !hasData;

  /* ===== RENDER ===== */
  return (
    <div className="container-fluid py-4" style={{ background: colors.light, minHeight: "100vh" }}>
      <div className="container">

        {/* Header */}
        <div className="p-4 rounded-4 shadow-sm mb-4" style={{ backgroundImage: colors.gradient, color: "#fff" }}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h3 className="fw-bold mb-1">Monthly Investment Summary</h3>
              <div className="opacity-75">
                {filters.month ? humanMonth(filters.month) : "Select Month"}
              </div>
              {summary && hasData && (
                <div className="mt-2 small">
                  <span className={`badge ${summary.status_capital === "grew" ? "bg-success" : "bg-danger"} me-2`}>
                    Capital {summary.status_capital}
                  </span>
                  <span className={`badge ${summary.status_pnl === "profit" ? "bg-success" : "bg-danger"}`}>
                    Month {summary.status_pnl}
                  </span>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <input
                type="month"
                name="month"
                className="form-control form-control-sm"
                value={filters.month}
                onChange={onFilterChange}
                style={{ minWidth: 160 }}
              />

              {/* Available months (if any) */}
              <select
                className="form-select form-select-sm"
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                disabled={!months.length}
                style={{ minWidth: 160 }}
                title="Available months with data"
              >
                {months.length === 0 ? (
                  <option value={filters.month || monthNow()}>{filters.month || monthNow()}</option>
                ) : (
                  months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                )}
              </select>

              <select
                className="form-select form-select-sm"
                name="category_id"
                value={filters.category_id}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, category_id: e.target.value, subcategory_id: "", month: f.month || monthNow() }))
                }
                style={{ minWidth: 220 }}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>

              <select
                className="form-select form-select-sm"
                name="subcategory_id"
                value={filters.subcategory_id}
                onChange={onFilterChange}
                disabled={!filters.category_id}
                style={{ minWidth: 220 }}
              >
                <option value="">Select Subcategory</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Top badges (only when we have data) */}
          {summary && hasData && (
            <div className="d-flex flex-wrap gap-2 mt-3">
              <span className="badge bg-light text-dark fw-semibold">Base Deposit: ₹{money(summary.base_deposit)}</span>
              <span className="badge bg-primary fw-semibold">Net P&L: ₹{money(summary.net_pnl)}</span>
              <span className="badge bg-success fw-semibold">Ending Capital: ₹{money(summary.ending_capital)}</span>
              <span className="badge bg-info fw-semibold">Trades: {summary.trades_count} in {summary.trade_days_count} days</span>
              {summary.top_segment && (
                <span className="badge bg-warning text-dark fw-semibold">
                  Top Segment: {summary.top_segment} ({summary.top_segment_trades})
                </span>
              )}
            </div>
          )}
        </div>

        {/* ===== Center message when no data ===== */}
        {showCenterNotFound && (
          <CenterBlank
            monthLabel={humanMonth(filters.month)}
            onDeposit={() => openTxnModal("DEPOSIT")}
            onWithdraw={() => openTxnModal("WITHDRAWAL")}
          />
        )}

        {/* ===== Content when data exists ===== */}
        {hasData && (
          <>
            {/* Metric Cards */}
            <div className="row g-3 mb-4">
              <MetricCard title="Total Profit" value={`₹${money(summary?.total_profit ?? 0)}`} tone="success" />
              <MetricCard title="Total Loss" value={`₹${money(summary?.total_loss ?? 0)}`} tone="danger" />
              <MetricCard title="Total Brokerage" value={`₹${money(summary?.total_brokerage ?? 0)}`} tone="info" />
              <MetricCard
                title="Net P&L"
                value={`₹${money(summary?.net_pnl ?? 0)}`}
                tone={Number(summary?.net_pnl || 0) >= 0 ? "success" : "danger"}
              />
              <MetricCard title="R:R Followed" value={`${summary?.rr_respected_count ?? 0} (${rrPct})`} tone="secondary" />
              <MetricCard title="Risk Followed" value={`${summary?.risk_follow_count ?? 0} (${riskPct})`} tone="secondary" />
              <MetricCard title="Reward Followed" value={`${summary?.reward_follow_count ?? 0} (${rewardPct})`} tone="secondary" />
              <MetricCard title="Max Profit" value={`₹${money(summary?.max_profit ?? 0)}`} tone="success" />
              <MetricCard title="Max Loss" value={`₹${money(summary?.max_loss ?? 0)}`} tone="danger" />
            </div>

            {/* Actions row */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              <button className="btn btn-light shadow-sm btn-press" onClick={() => openTxnModal("DEPOSIT")}>
                ➕ Add Deposit
              </button>
              <button className="btn btn-light shadow-sm btn-press" onClick={() => openTxnModal("WITHDRAWAL")}>
                ➖ Add Withdrawal
              </button>
              <button className="btn btn-primary shadow-sm btn-press" disabled={!summary} onClick={saveSnapshot}>
                💾 Save Snapshot
              </button>
              {snapshot && (
                <span className="badge bg-secondary align-self-center">
                  Snapshot saved • {dmyTime(snapshot.computed_at)}
                </span>
              )}
            </div>

            {/* Two columns: Segment ranking & Deposit/Withdrawal activity */}
            <div className="row g-3">
              {/* Segment ranking */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title fw-bold mb-3">Segment Ranking</h5>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Segment</th>
                            <th className="text-end">Trades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!summary || !summary.segments_ranking || summary.segments_ranking.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="text-center text-muted py-3">No segment data</td>
                            </tr>
                          ) : (
                            summary.segments_ranking.map((r, i) => (
                              <tr key={`${r.segment}-${i}`} style={{ borderTop: `1px solid ${colors.line}` }}>
                                <td>{i + 1}</td>
                                <td>{r.segment}</td>
                                <td className="text-end">{r.trades}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit / Withdrawal activity */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title fw-bold mb-3">Deposit / Withdrawal</h5>

                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <span className="badge bg-success">Deposits: {summary?.deposit_events_count ?? 0} • ₹{money(summary?.total_deposit_added ?? 0)}</span>
                      <span className="badge bg-danger">Withdrawals: {summary?.withdrawal_events_count ?? 0} • ₹{money(summary?.total_withdrawn ?? 0)}</span>
                      <span className={`badge ${Number((summary?.total_deposit_added || 0) - (summary?.total_withdrawn || 0)) >= 0 ? "bg-success" : "bg-danger"}`}>
                        Net Change: ₹{money((summary?.total_deposit_added || 0) - (summary?.total_withdrawn || 0))}
                      </span>
                    </div>

                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th className="text-end">Amount</th>
                            <th>Note</th>
                            <th>Date/Time</th>
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txns.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center text-muted py-3">
                                No transactions this month.
                              </td>
                            </tr>
                          ) : (
                            txns.map((t, i) => (
                              <tr key={t.txn_id} style={{ borderTop: `1px solid ${colors.line}` }}>
                                <td>{i + 1}</td>
                                <td>
                                  <span className={`badge ${t.txn_type === "DEPOSIT" ? "bg-success" : "bg-danger"}`}>
                                    {t.txn_type}
                                  </span>
                                </td>
                                <td className="text-end">₹{money(t.amount)}</td>
                                <td className="text-truncate" style={{ maxWidth: 240 }}>{t.note || "-"}</td>
                                <td>{dmyTime(t.txn_at)}</td>
                                <td className="text-center">
                                  <button className="btn btn-sm btn-outline-danger btn-press" onClick={() => deleteTxn(t.txn_id)}>
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {txns.length > 0 && (
                          <tfoot>
                            <tr className="table-light">
                              <th colSpan="2" className="text-end">Totals</th>
                              <th className="text-end">
                                ₹{money(txns.reduce((a, r) => a + Number(r.txn_type === "DEPOSIT" ? r.amount : 0), 0))}
                                {" / "}
                                ₹{money(txns.reduce((a, r) => a + Number(r.txn_type === "WITHDRAWAL" ? r.amount : 0), 0))}
                              </th>
                              <th colSpan="3" className="text-muted text-end small">Deposits / Withdrawals</th>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer summary bar */}
            {summary && (
              <div className="alert mt-4 border-0 shadow-sm" style={{ background: "#eef2ff", color: "#111827" }}>
                <div className="d-flex flex-wrap align-items-center gap-3">
                  <strong>Month Recap:</strong>
                  <span>Trades: <b>{summary.trades_count}</b> in <b>{summary.trade_days_count}</b> days</span>
                  <span>R:R Followed: <b>{summary.rr_respected_count}</b> ({rrPct})</span>
                  <span>Risk Followed: <b>{summary.risk_follow_count}</b> ({riskPct})</span>
                  <span>Reward Followed: <b>{summary.reward_follow_count}</b> ({rewardPct})</span>
                  <span className="ms-auto">Ending Capital: <b>₹{money(summary.ending_capital)}</b></span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center text-muted py-3">Loading monthly data…</div>
        )}
      </div>

      {/* ===== Centered Toast ===== */}
      {toast.show && (
        <div
          className="position-fixed top-50 start-50 translate-middle p-3 rounded-4 shadow"
          style={{
            zIndex: 1080,
            minWidth: 320,
            background: toast.type === "success" ? colors.success :
                        toast.type === "warning" ? colors.warning : colors.danger,
            color: "#fff",
            textAlign: "center",
            fontWeight: 700,
            animation: "fadeInOut 2s",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* ===== Alert Modal ===== */}
      {alert.show && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className={`modal-header ${alert.type === "danger" ? "bg-danger" : "bg-warning"} text-white`}>
                <h6 className="modal-title m-0">{alert.title}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={closeAlert}></button>
              </div>
              <div className="modal-body">
                <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{alert.message}</pre>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-press" onClick={closeAlert}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Add Txn Modal ===== */}
      {txnModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundImage: colors.gradient, color: "#fff" }}>
                <h6 className="modal-title m-0">Add {txnForm.txn_type}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTxnModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Type</label>
                    <select name="txn_type" className="form-select" value={txnForm.txn_type} onChange={onTxnChange}>
                      <option value="DEPOSIT">DEPOSIT</option>
                      <option value="WITHDRAWAL">WITHDRAWAL</option>
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="amount"
                      className="form-control"
                      value={txnForm.amount}
                      onChange={onTxnChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Note (optional)</label>
                    <input
                      type="text"
                      name="note"
                      className="form-control"
                      value={txnForm.note}
                      onChange={onTxnChange}
                      placeholder="Reason / context…"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Date & Time (optional)</label>
                    <input
                      type="datetime-local"
                      name="txn_at"
                      className="form-control"
                      value={txnForm.txn_at}
                      onChange={onTxnChange}
                    />
                    <div className="form-text">Leave empty to use current time.</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-press" onClick={() => setTxnModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-press" onClick={submitTxn}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* local styles */}
      <style>{`
        @keyframes fadeInOut { 0%,100%{opacity:0} 10%,90%{opacity:1} }
        .btn-press:active { transform: translateY(1px); }
      `}</style>
    </div>
  );
}

/* ===== Centered "No data" block ===== */
function CenterBlank({ monthLabel, onDeposit, onWithdraw }) {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "40vh" }}>
      <div className="text-center p-4 rounded-4 shadow-sm" style={{ background: "#fff", maxWidth: 560 }}>
        <div className="display-6 mb-2">No data found</div>
        <p className="text-muted mb-3">
          We couldn't find trades or transactions for <strong>{monthLabel}</strong>.
          You can add a Deposit or Withdrawal to start the month.
        </p>
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-light shadow-sm btn-press" onClick={onDeposit}>➕ Add Deposit</button>
          <button className="btn btn-light shadow-sm btn-press" onClick={onWithdraw}>➖ Add Withdrawal</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Small reusable metric card ===== */
function MetricCard({ title, value, tone = "secondary" }) {
  const bg =
    tone === "success" ? "bg-success-subtle" :
    tone === "danger" ? "bg-danger-subtle" :
    tone === "info" ? "bg-info-subtle" :
    "bg-light";
  const text =
    tone === "success" ? "text-success" :
    tone === "danger" ? "text-danger" :
    tone === "info" ? "text-info" : "text-secondary";

  return (
    <div className="col-6 col-md-4 col-lg-3">
      <div className={`card border-0 shadow-sm ${bg}`}>
        <div className="card-body">
          <div className="small text-muted">{title}</div>
          <div className={`fs-5 fw-bold ${text}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
