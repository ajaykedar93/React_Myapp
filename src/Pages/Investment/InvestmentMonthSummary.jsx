import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===== API LINKS ===== */
const API_CATEGORY = "https://express-backend-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY = "https://express-backend-myapp.onrender.com/api/investment_subcategory";
const API_MONTHLY = "https://express-backend-myapp.onrender.com/api/monthly_summary";

/* ===== Helpers ===== */
const colors = {
  gradient: "linear-gradient(135deg,#5f4bb6 0%,#7a5af5 35%,#1f5f78 100%)",
  success: "#0f8a5f",
  danger: "#b33a3a",
  warning: "#b3833a",
  info: "#0b6cff",
  light: "#f6f8fb",
  line: "#e6e9ef",
};
const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const humanMonth = (ym) => {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};
const dmyTime = (s) => {
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
};
const money = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "0%");

/* ===== MAIN ===== */
export default function InvestmentMonthSummary() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filters, setFilters] = useState({
    month: monthNow(),
    category_id: "",
    subcategory_id: "",
  });
  const [months, setMonths] = useState([]);
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [txnModal, setTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({
    txn_type: "DEPOSIT",
    amount: "",
    note: "",
    txn_at: "",
  });

  const filteredSubcategories = useMemo(
    () =>
      subcategories.filter((s) => String(s.category_id) === String(filters.category_id)),
    [filters.category_id, subcategories]
  );

  /* ===== EFFECTS ===== */
  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([
          axios.get(API_CATEGORY),
          axios.get(API_SUBCATEGORY),
        ]);
        setCategories(c.data || []);
        setSubcategories(s.data || []);
      } catch {
        showToast("Failed to load categories", "danger");
      }
    })();
  }, []);

  useEffect(() => {
    if (filters.category_id && filters.subcategory_id)
      fetchMonths(filters.category_id, filters.subcategory_id);
  }, [filters.category_id, filters.subcategory_id]);

  useEffect(() => {
    if (filters.category_id && filters.subcategory_id && filters.month) {
      fetchSummary(filters.month, filters.category_id, filters.subcategory_id);
      fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
      fetchSnapshot(filters.month, filters.category_id, filters.subcategory_id);
    }
  }, [filters]);

  /* ===== FETCHERS ===== */
  const fetchMonths = async (cat, sub) => {
    try {
      const { data } = await axios.get(`${API_MONTHLY}/months`, {
        params: { category_id: cat, subcategory_id: sub },
      });
      setMonths(data || []);
    } catch {
      setMonths([]);
    }
  };
  const fetchSummary = async (m, cat, sub) => {
    setLoading(true);
    try {
      const { data } = await axios.get(API_MONTHLY, {
        params: { month: m, category_id: cat, subcategory_id: sub },
      });
      setSummary(data || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };
  const fetchTxns = async (m, cat, sub) => {
    try {
      const { data } = await axios.get(`${API_MONTHLY}/txn`, {
        params: { month: m, category_id: cat, subcategory_id: sub },
      });
      setTxns(data || []);
    } catch {
      setTxns([]);
    }
  };
  const fetchSnapshot = async (m, cat, sub) => {
    try {
      const { data } = await axios.get(`${API_MONTHLY}/snapshot`, {
        params: { month: m, category_id: cat, subcategory_id: sub },
      });
      setSnapshot(data || null);
    } catch {
      setSnapshot(null);
    }
  };
  const showToast = (msg, type = "success") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "" }), 1800);
  };

  /* ===== TXN HANDLERS ===== */
  const openTxn = (t) =>
    setTxnModal(true) || setTxnForm({ txn_type: t, amount: "", note: "", txn_at: "" });
  const onTxnChange = (e) =>
    setTxnForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const submitTxn = async () => {
    try {
      if (!filters.category_id || !filters.subcategory_id)
        return showToast("Pick Category & Subcategory first", "warning");
      const payload = {
        ...txnForm,
        category_id: Number(filters.category_id),
        subcategory_id: Number(filters.subcategory_id),
        amount: Number(txnForm.amount || 0),
        txn_at: txnForm.txn_at ? new Date(txnForm.txn_at).toISOString() : undefined,
      };
      await axios.post(`${API_MONTHLY}/txn`, payload);
      showToast(`${txnForm.txn_type} added`);
      setTxnModal(false);
      fetchSummary(filters.month, filters.category_id, filters.subcategory_id);
      fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
    } catch {
      showToast("Failed to add transaction", "danger");
    }
  };

  const deleteTxn = async (id) => {
    try {
      await axios.delete(`${API_MONTHLY}/txn/${id}`);
      showToast("Deleted");
      fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
    } catch {
      showToast("Delete failed", "danger");
    }
  };

  /* ===== UI ===== */
  return (
    <div className="container-fluid py-3" style={{ background: colors.light, minHeight: "100vh" }}>
      <div className="container px-2 px-sm-3 px-md-4">
        {/* HEADER */}
        <div
          className="rounded-4 p-3 p-md-4 shadow-sm mb-4"
          style={{ background: colors.gradient, color: "#fff" }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
            <div>
              <h4 className="fw-bold mb-1">Monthly Investment Summary</h4>
              <div className="opacity-75">{humanMonth(filters.month)}</div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <input
                type="month"
                name="month"
                className="form-control form-control-sm"
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                style={{ minWidth: 140 }}
              />
              <select
                className="form-select form-select-sm"
                name="category_id"
                value={filters.category_id}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category_id: e.target.value,
                    subcategory_id: "",
                  })
                }
              >
                <option value="">Category</option>
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
                onChange={(e) =>
                  setFilters({ ...filters, subcategory_id: e.target.value })
                }
                disabled={!filters.category_id}
              >
                <option value="">Subcategory</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && <div className="text-center text-muted py-4">Loading data…</div>}

        {/* SUMMARY CARDS */}
        {summary && (
          <>
            <div className="row g-3 mb-4">
              <MetricCard title="Total Profit" value={`₹${money(summary.total_profit)}`} tone="success" />
              <MetricCard title="Total Loss" value={`₹${money(summary.total_loss)}`} tone="danger" />
              <MetricCard title="Brokerage" value={`₹${money(summary.total_brokerage)}`} tone="info" />
              <MetricCard
                title="Net P&L"
                value={`₹${money(summary.net_pnl)}`}
                tone={Number(summary.net_pnl) >= 0 ? "success" : "danger"}
              />
            </div>

            {/* DEPOSIT WITHDRAW SECTION */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Deposit / Withdrawal</h5>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button className="btn btn-sm btn-light shadow-sm" onClick={() => openTxn("DEPOSIT")}>➕ Deposit</button>
                  <button className="btn btn-sm btn-light shadow-sm" onClick={() => openTxn("WITHDRAWAL")}>➖ Withdraw</button>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th className="text-end">Amount</th>
                        <th>Note</th>
                        <th>Date</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-3">
                            No transactions
                          </td>
                        </tr>
                      ) : (
                        txns.map((t, i) => (
                          <tr key={t.txn_id}>
                            <td>{i + 1}</td>
                            <td>
                              <span className={`badge ${t.txn_type === "DEPOSIT" ? "bg-success" : "bg-danger"}`}>
                                {t.txn_type}
                              </span>
                            </td>
                            <td className="text-end">₹{money(t.amount)}</td>
                            <td className="text-truncate" style={{ maxWidth: 180 }}>
                              {t.note || "-"}
                            </td>
                            <td>{dmyTime(t.txn_at)}</td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteTxn(t.txn_id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EMPTY STATE */}
        {!loading && !summary && (
          <CenterBlank
            monthLabel={humanMonth(filters.month)}
            onDeposit={() => openTxn("DEPOSIT")}
            onWithdraw={() => openTxn("WITHDRAWAL")}
          />
        )}
      </div>

      {/* TXN MODAL */}
      {txnModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header" style={{ background: colors.gradient, color: "#fff" }}>
                <h6 className="modal-title">Add {txnForm.txn_type}</h6>
                <button className="btn-close btn-close-white" onClick={() => setTxnModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Type</label>
                    <select name="txn_type" className="form-select" value={txnForm.txn_type} onChange={onTxnChange}>
                      <option value="DEPOSIT">Deposit</option>
                      <option value="WITHDRAWAL">Withdrawal</option>
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" name="amount" className="form-control" value={txnForm.amount} onChange={onTxnChange}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Note</label>
                    <input type="text" name="note" className="form-control" value={txnForm.note} onChange={onTxnChange}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Date & Time</label>
                    <input type="datetime-local" name="txn_at" className="form-control" value={txnForm.txn_at} onChange={onTxnChange}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setTxnModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitTxn}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div
          className="position-fixed top-50 start-50 translate-middle p-3 rounded-4 shadow text-white fw-bold text-center"
          style={{
            background:
              toast.type === "success"
                ? colors.success
                : toast.type === "warning"
                ? colors.warning
                : colors.danger,
            zIndex: 2000,
            minWidth: 280,
            animation: "fadeInOut 2s",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {0%,100%{opacity:0}10%,90%{opacity:1}}
        @media (max-width:576px){
          h4{font-size:1.1rem}
          .table{font-size:.82rem}
          .modal-dialog{max-width:95%}
        }
      `}</style>
    </div>
  );
}

/* ===== COMPONENTS ===== */
function CenterBlank({ monthLabel, onDeposit, onWithdraw }) {
  return (
    <div className="text-center py-5">
      <div className="p-4 rounded-4 shadow-sm bg-white d-inline-block" style={{ maxWidth: 420 }}>
        <h5 className="fw-bold mb-2">No data found</h5>
        <p className="text-muted small mb-3">
          No trades or transactions for <b>{monthLabel}</b>.
        </p>
        <div className="d-flex justify-content-center gap-2">
          <button className="btn btn-sm btn-light shadow-sm" onClick={onDeposit}>
            ➕ Deposit
          </button>
          <button className="btn btn-sm btn-light shadow-sm" onClick={onWithdraw}>
            ➖ Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, tone }) {
  const toneClass =
    tone === "success"
      ? "text-success bg-success-subtle"
      : tone === "danger"
      ? "text-danger bg-danger-subtle"
      : "text-info bg-info-subtle";
  return (
    <div className="col-6 col-md-4 col-lg-3">
      <div className={`card border-0 shadow-sm ${toneClass}`}>
        <div className="card-body py-3">
          <div className="small text-muted">{title}</div>
          <div className="fw-bold fs-6">{value}</div>
        </div>
      </div>
    </div>
  );
}
