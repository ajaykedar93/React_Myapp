import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===== API LINKS ===== */
const API_CATEGORY =
  "https://express-backend-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY =
  "https://express-backend-myapp.onrender.com/api/investment_subcategory";
const API_MONTHLY =
  "https://express-backend-myapp.onrender.com/api/monthly_summary";

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
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [txnModal, setTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({
    txn_type: "DEPOSIT",
    amount: "",
    note: "",
    txn_at: "",
  });

  const filteredSubcategories = useMemo(() => {
    if (!filters.category_id) return [];
    return subcategories.filter(
      (s) => String(s.category_id) === String(filters.category_id)
    );
  }, [filters.category_id, subcategories]);

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
    if (filters.category_id && filters.subcategory_id) {
      fetchMonths(filters.category_id, filters.subcategory_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category_id, filters.subcategory_id]);

  useEffect(() => {
    if (filters.category_id && filters.subcategory_id && filters.month) {
      fetchSummary(filters.month, filters.category_id, filters.subcategory_id);
      fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
      fetchSnapshot(filters.month, filters.category_id, filters.subcategory_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.month, filters.category_id, filters.subcategory_id]);

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
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 1800);
  };

  /* ===== TXN HANDLERS ===== */
  const openTxn = (t) => {
    setTxnModal(true);
    setTxnForm({ txn_type: t, amount: "", note: "", txn_at: "" });
  };

  const onTxnChange = (e) =>
    setTxnForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submitTxn = async () => {
    try {
      if (!filters.category_id || !filters.subcategory_id) {
        return showToast("Pick Category & Subcategory first", "warning");
      }
      const payload = {
        ...txnForm,
        category_id: Number(filters.category_id),
        subcategory_id: Number(filters.subcategory_id),
        amount: Number(txnForm.amount || 0),
        txn_at: txnForm.txn_at ? new Date(txnForm.txn_at).toISOString() : undefined,
      };
      await axios.post(`${API_MONTHLY}/txn`, payload);
      showToast(`${txnForm.txn_type} added`, "success");
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
      showToast("Deleted", "success");
      fetchTxns(filters.month, filters.category_id, filters.subcategory_id);
    } catch {
      showToast("Delete failed", "danger");
    }
  };

  /* ===== UI ===== */
  return (
    <div className="inv-page">
      <div className="inv-shell">
        {/* HEADER (sticky on mobile) */}
        <div className="inv-header shadow-sm">
          <div className="inv-header-top">
            <div className="inv-title">
              <div className="h-title">Monthly Investment Summary</div>
              <div className="h-sub">{humanMonth(filters.month)}</div>
            </div>

            <div className="inv-filters">
              <input
                type="month"
                name="month"
                className="form-control form-control-sm inv-input"
                value={filters.month}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, month: e.target.value }))
                }
              />

              <select
                className="form-select form-select-sm inv-input"
                name="category_id"
                value={filters.category_id}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    category_id: e.target.value,
                    subcategory_id: "",
                  }))
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
                className="form-select form-select-sm inv-input"
                name="subcategory_id"
                value={filters.subcategory_id}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, subcategory_id: e.target.value }))
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

        {/* CONTENT */}
        <div className="inv-content">
          {loading && (
            <div className="text-center text-muted py-4">Loading data…</div>
          )}

          {/* SUMMARY */}
          {summary && (
            <>
              <div className="inv-metrics">
                <MetricCard
                  title="Total Profit"
                  value={`₹${money(summary.total_profit)}`}
                  tone="success"
                />
                <MetricCard
                  title="Total Loss"
                  value={`₹${money(summary.total_loss)}`}
                  tone="danger"
                />
                <MetricCard
                  title="Brokerage"
                  value={`₹${money(summary.total_brokerage)}`}
                  tone="info"
                />
                <MetricCard
                  title="Net P&L"
                  value={`₹${money(summary.net_pnl)}`}
                  tone={Number(summary.net_pnl) >= 0 ? "success" : "danger"}
                />
              </div>

              {/* Deposit Withdraw */}
              <div className="inv-card shadow-sm">
                <div className="inv-card-head">
                  <div className="inv-card-title">Deposit / Withdrawal</div>
                  <div className="inv-actions">
                    <button
                      className="btn btn-sm btn-light shadow-sm"
                      onClick={() => openTxn("DEPOSIT")}
                    >
                      ➕ Deposit
                    </button>
                    <button
                      className="btn btn-sm btn-light shadow-sm"
                      onClick={() => openTxn("WITHDRAWAL")}
                    >
                      ➖ Withdraw
                    </button>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="inv-table-wrap d-none d-md-block">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th style={{ width: 120 }}>Type</th>
                        <th className="text-end" style={{ width: 160 }}>
                          Amount
                        </th>
                        <th>Note</th>
                        <th style={{ width: 220 }}>Date</th>
                        <th className="text-center" style={{ width: 110 }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center text-muted py-4"
                          >
                            No transactions
                          </td>
                        </tr>
                      ) : (
                        txns.map((t, i) => (
                          <tr key={t.txn_id}>
                            <td>{i + 1}</td>
                            <td>
                              <span
                                className={`badge ${
                                  t.txn_type === "DEPOSIT"
                                    ? "bg-success"
                                    : "bg-danger"
                                }`}
                              >
                                {t.txn_type}
                              </span>
                            </td>
                            <td className="text-end">₹{money(t.amount)}</td>
                            <td className="text-truncate" style={{ maxWidth: 280 }}>
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

                {/* Mobile list (perfect fit) */}
                <div className="d-md-none">
                  {txns.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      No transactions
                    </div>
                  ) : (
                    <div className="inv-mobile-list">
                      {txns.map((t, i) => (
                        <div className="inv-txn-item" key={t.txn_id}>
                          <div className="inv-txn-row">
                            <div className="inv-txn-left">
                              <div className="inv-txn-badges">
                                <span className="inv-index">#{i + 1}</span>
                                <span
                                  className={`badge ${
                                    t.txn_type === "DEPOSIT"
                                      ? "bg-success"
                                      : "bg-danger"
                                  }`}
                                >
                                  {t.txn_type}
                                </span>
                              </div>
                              <div className="inv-txn-date">{dmyTime(t.txn_at)}</div>
                            </div>

                            <div className="inv-txn-right">
                              <div className="inv-txn-amt">₹{money(t.amount)}</div>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteTxn(t.txn_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {t.note ? (
                            <div className="inv-txn-note">{t.note}</div>
                          ) : (
                            <div className="inv-txn-note text-muted">No note</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* EMPTY */}
          {!loading && !summary && (
            <CenterBlank
              monthLabel={humanMonth(filters.month)}
              onDeposit={() => openTxn("DEPOSIT")}
              onWithdraw={() => openTxn("WITHDRAWAL")}
            />
          )}
        </div>
      </div>

      {/* TXN MODAL */}
      {txnModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div
                className="modal-header"
                style={{ background: colors.gradient, color: "#fff" }}
              >
                <h6 className="modal-title">Add {txnForm.txn_type}</h6>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setTxnModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Type</label>
                    <select
                      name="txn_type"
                      className="form-select"
                      value={txnForm.txn_type}
                      onChange={onTxnChange}
                    >
                      <option value="DEPOSIT">Deposit</option>
                      <option value="WITHDRAWAL">Withdrawal</option>
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Amount (₹)</label>
                    <input
                      type="number"
                      name="amount"
                      className="form-control"
                      value={txnForm.amount}
                      onChange={onTxnChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Note</label>
                    <input
                      type="text"
                      name="note"
                      className="form-control"
                      value={txnForm.note}
                      onChange={onTxnChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Date & Time</label>
                    <input
                      type="datetime-local"
                      name="txn_at"
                      className="form-control"
                      value={txnForm.txn_at}
                      onChange={onTxnChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setTxnModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={submitTxn}>
                  Save
                </button>
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
            minWidth: 260,
            animation: "fadeInOut 2s",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* PAGE CSS */}
      <style>{`
        *{box-sizing:border-box}
        html,body{height:100%}
        body{margin:0; overflow-x:hidden}
        .inv-page{
          min-height:100vh;
          background:${colors.light};
          overflow-x:hidden;
        }

        /* Shell = full width on mobile, centered on big screens */
        .inv-shell{
          width:100%;
          max-width:1100px;
          margin:0 auto;
        }

        /* Sticky header for mobile */
        .inv-header{
          background:${colors.gradient};
          color:#fff;
          border-radius:0;
          padding:14px 12px;
          position:sticky;
          top:0;
          z-index:50;
        }

        /* Make it look like card on large screens */
        @media (min-width:768px){
          .inv-header{
            border-radius:18px;
            margin:16px 16px 0 16px;
            padding:18px 18px;
            position:relative; /* sticky only on mobile */
            top:auto;
          }
        }

        .inv-header-top{
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        @media (min-width:768px){
          .inv-header-top{
            flex-direction:row;
            align-items:flex-start;
            justify-content:space-between;
            gap:16px;
          }
        }

        .inv-title .h-title{
          font-weight:800;
          letter-spacing:.2px;
          font-size:1.05rem;
          line-height:1.2;
        }
        .inv-title .h-sub{
          opacity:.8;
          font-size:.9rem;
          margin-top:4px;
        }

        .inv-filters{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
        }
        .inv-filters input[type="month"]{ grid-column:1 / -1; }

        @media (min-width:576px){
          .inv-filters{
            grid-template-columns: 170px 1fr 1fr;
          }
          .inv-filters input[type="month"]{ grid-column:auto; }
        }

        .inv-input{
          border:none !important;
          outline:none !important;
          box-shadow: none !important;
          border-radius:12px;
          padding:10px 12px;
        }

        .inv-content{
          padding:12px;
        }
        @media(min-width:768px){
          .inv-content{
            padding:16px;
          }
        }

        .inv-metrics{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          margin-bottom:14px;
        }
        @media(min-width:768px){
          .inv-metrics{
            grid-template-columns:repeat(4, 1fr);
            gap:14px;
            margin-top:14px;
            margin-bottom:16px;
          }
        }

        .inv-card{
          background:#fff;
          border-radius:16px;
          padding:14px;
        }

        @media(min-width:768px){
          .inv-card{
            padding:16px;
          }
        }

        .inv-card-head{
          display:flex;
          flex-direction:column;
          gap:10px;
          margin-bottom:12px;
        }
        @media(min-width:576px){
          .inv-card-head{
            flex-direction:row;
            align-items:center;
            justify-content:space-between;
          }
        }

        .inv-card-title{
          font-weight:800;
          font-size:1.02rem;
        }

        .inv-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .inv-table-wrap{
          border:1px solid ${colors.line};
          border-radius:12px;
          overflow:hidden;
        }

        /* Mobile txn list */
        .inv-mobile-list{
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .inv-txn-item{
          border:1px solid ${colors.line};
          border-radius:14px;
          padding:12px;
        }
        .inv-txn-row{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
        }
        .inv-txn-badges{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          margin-bottom:6px;
        }
        .inv-index{
          font-size:.85rem;
          opacity:.8;
          font-weight:700;
        }
        .inv-txn-date{
          font-size:.82rem;
          opacity:.8;
        }
        .inv-txn-amt{
          font-weight:900;
          text-align:right;
          margin-bottom:8px;
        }
        .inv-txn-note{
          margin-top:10px;
          font-size:.9rem;
          line-height:1.3;
          word-break:break-word;
        }

        @keyframes fadeInOut {0%,100%{opacity:0}10%,90%{opacity:1}}
      `}</style>
    </div>
  );
}

/* ===== COMPONENTS ===== */
function CenterBlank({ monthLabel, onDeposit, onWithdraw }) {
  return (
    <div className="text-center py-5">
      <div
        className="p-4 rounded-4 shadow-sm bg-white d-inline-block"
        style={{ maxWidth: 420 }}
      >
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
    <div className={`card border-0 shadow-sm ${toneClass}`} style={{ borderRadius: 16 }}>
      <div className="card-body py-3">
        <div className="small text-muted">{title}</div>
        <div className="fw-bold fs-6">{value}</div>
      </div>
    </div>
  );
}
