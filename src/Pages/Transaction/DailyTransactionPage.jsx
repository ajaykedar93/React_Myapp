import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";

const API = "https://express-backend-myapp.onrender.com/api";

export default function DailyTransactionPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_debit: 0, total_credit: 0, total_transactions: 0 });

  const [form, setForm] = useState({
    amount: "",
    quantity: "",
    type: "debit",
    category_id: "",
    subcategory_id: "",
    purpose: "",
    transaction_date: getLocalDate(),
  });

  const [editingId, setEditingId] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [page, setPage] = useState(1);
  const [highlightId, setHighlightId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const perPage = 20;
  const tableEndRef = useRef(null);

  // ---- lazy-first-load flags/aborters ----
  const hasLoadedRef = useRef(false);
  const abortersRef = useRef({}); // {key: AbortController}

  const startIdx = (page - 1) * perPage;
  const pagedTransactions = useMemo(
    () => transactions.slice(startIdx, startIdx + perPage),
    [transactions, startIdx]
  );
  const totalPages = Math.ceil(transactions.length / perPage) || 1;

  function getLocalDate() {
    const now = new Date();
    return now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  }

  const INR = useMemo(
    () => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }),
    []
  );

  // keep today's date fresh once a minute
  useEffect(() => {
    const timer = setInterval(() => {
      setForm((prev) => ({ ...prev, transaction_date: getLocalDate() }));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // -------- helpers: abort + retry ----------
  const newAborter = (key) => {
    abortersRef.current[key]?.abort?.();
    const ctrl = new AbortController();
    abortersRef.current[key] = ctrl;
    return ctrl.signal;
  };

  const cleanupAborters = () => {
    Object.values(abortersRef.current).forEach((c) => c?.abort?.());
    abortersRef.current = {};
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function retry(fn, { tries = 3, delay = 500 }) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (i < tries - 1) await sleep(delay * (i + 1));
      }
    }
    throw lastErr;
  }

  // ---- API calls (idempotent) ----
  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/dailyTransaction`, { signal: newAborter("tx") });
      setTransactions(res.data || []);
      setPage(1);
      fetchSummary(); // independent
    } catch (e) {
      if (axios.isCancel(e)) return;
      showPopup("Error fetching transactions", "error");
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API}/dailyTransaction/daily-summary`, { signal: newAborter("sum") });
      setSummary(res.data || { total_debit: 0, total_credit: 0, total_transactions: 0 });
    } catch (e) {
      if (axios.isCancel(e)) return;
      showPopup("Error fetching summary", "error");
    }
  };

  const fetchLookups = async () => {
    try {
      // fetch both in parallel with retry (good for cold starts)
      const [cats, subs] = await Promise.all([
        retry(() => axios.get(`${API}/category`, { signal: newAborter("cats") }), { tries: 3, delay: 400 }),
        retry(() => axios.get(`${API}/subcategory`, { signal: newAborter("subs") }), { tries: 3, delay: 400 }),
      ]);
      setCategories(Array.isArray(cats.data) ? cats.data : []);
      setSubcategories(Array.isArray(subs.data) ? subs.data : []);
    } catch (e) {
      if (axios.isCancel(e)) return;
      showPopup("Error fetching categories/subcategories", "error");
    }
  };

  const firstLoad = async () => {
    if (hasLoadedRef.current) return;
    // If offline, wait until we are online to attempt the first fetch
    if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) {
      const onBackOnline = () => {
        window.removeEventListener("online", onBackOnline);
        firstLoad();
      };
      window.addEventListener("online", onBackOnline);
      return;
    }
    hasLoadedRef.current = true;
    await fetchLookups();
    await fetchTransactions();
  };

  // ---- Lazy auto-load ONLY when page/tab visible (and on focus) ----
  useEffect(() => {
    const maybeLoad = () => {
      if (document.visibilityState === "visible") {
        firstLoad();
      }
    };
    // attempt immediately if already visible
    maybeLoad();

    document.addEventListener("visibilitychange", maybeLoad);
    window.addEventListener("focus", maybeLoad);

    return () => {
      document.removeEventListener("visibilitychange", maybeLoad);
      window.removeEventListener("focus", maybeLoad);
      cleanupAborters();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dependent subcategory filter
  useEffect(() => {
    if (form.category_id) {
      setFilteredSubs(subcategories.filter((s) => s.category_id === parseInt(form.category_id)));
    } else {
      setFilteredSubs([]);
    }
    setForm((prev) => ({ ...prev, subcategory_id: "" }));
  }, [form.category_id, subcategories]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const showPopup = (message, type) => {
    setPopup({ show: true, message, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "" }), 1600);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      tableEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  };

  const addOrUpdateTransaction = async () => {
    if (!form.amount || !form.category_id) {
      return showPopup("Please fill required fields (Amount, Category)", "error");
    }
    try {
      let id = null;
      if (editingId) {
        await axios.put(`${API}/dailyTransaction/${editingId}`, form, { signal: newAborter("save") });
        id = editingId;
        showPopup("Transaction updated", "success");
        setEditingId(null);
      } else {
        const res = await axios.post(`${API}/dailyTransaction`, form, { signal: newAborter("save") });
        if (res.data && res.data.length > 0) {
          id = res.data[res.data.length - 1].daily_transaction_id;
        }
        showPopup("Transaction added", "success");
      }
      await fetchTransactions();
      setHighlightId(id);
      scrollToBottom();
      setForm({
        amount: "",
        quantity: "",
        type: "debit",
        category_id: "",
        subcategory_id: "",
        purpose: "",
        transaction_date: getLocalDate(),
      });
    } catch (e) {
      if (axios.isCancel(e)) return;
      showPopup("Failed to save transaction", "error");
    }
  };

  const askDelete = (id) => setConfirmDeleteId(id);

  const deleteTransaction = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleting(true);
      await axios.delete(`${API}/dailyTransaction/${confirmDeleteId}`, { signal: newAborter("del") });
      showPopup("Transaction deleted", "success");
      setConfirmDeleteId(null);
      await fetchTransactions();
    } catch (e) {
      if (!axios.isCancel(e)) showPopup("Failed to delete transaction", "error");
    } finally {
      setDeleting(false);
    }
  };

  const editTransaction = (t) => {
    setEditingId(t.daily_transaction_id);
    setForm({
      amount: t.amount,
      quantity: t.quantity ?? "",
      type: t.type,
      category_id: t.category_id,
      subcategory_id: t.subcategory_id,
      purpose: t.purpose,
      transaction_date: t.transaction_date,
    });
    setHighlightId(t.daily_transaction_id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      amount: "",
      quantity: "",
      type: "debit",
      category_id: "",
      subcategory_id: "",
      purpose: "",
      transaction_date: getLocalDate(),
    });
    setHighlightId(null);
  };

  return (
    <div className="container-fluid py-3" style={{ background: "var(--bg)" }}>
      {/* Mobile-first styles */}
      <style>{`
        :root{
          --ink-900:#0f172a; --ink-700:#334155; --ink-600:#475569; --ink-500:#64748b;
          --surface:#ffffff; --border:#e6e9ef; --bg:#f6f8fb;
          --brand-grad: linear-gradient(90deg,#5f4bb6 0%, #1f5f78 100%);
          --accent:#2b7a8b; --success:#0f8a5f; --danger:#b33a3a;
          --rad:14px;
          --px: clamp(12px, 4vw, 20px);
          --fs: clamp(14px, 3.6vw, 16px);
          --fs-sm: clamp(12px, 3.2vw, 14px);
          --fs-lg: clamp(16px, 4.2vw, 18px);
        }
        .page-wrap{ max-width: 980px; margin: 0 auto; padding: 0 var(--px); }
        .title{
          font-size: clamp(18px, 5.2vw, 24px);
          background: var(--brand-grad);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          font-weight: 800; letter-spacing:.35px; text-align:center;
        }
        .kpi-grid{ display:grid; gap:12px; grid-template-columns: 1fr; margin-bottom: 10px; }
        @media (min-width:576px){ .kpi-grid{ grid-template-columns: repeat(3,1fr); } }
        .card-ui{
          background: var(--surface);
          border:1px solid var(--border);
          border-radius: var(--rad); padding: 12px;
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
        }
        .kpi-card h6{ font-size: var(--fs-sm); color: var(--ink-600); margin: 0 0 4px; }
        .kpi-card h5{ font-size: clamp(18px, 5vw, 22px); font-weight:800; margin:0; }

        .form-card .form-label{ font-size: var(--fs-sm); margin-bottom: 4px; color: var(--ink-700); }
        .form-card .form-select, .form-card .form-control{
          font-size: var(--fs); padding: .6rem .75rem; border-radius: 12px; border:1px solid var(--border);
        }
        .btn-solid{
          background: var(--accent); color:#fff; border:none; border-radius:12px; padding:.6rem 1rem; font-weight:700;
          font-size: var(--fs);
        }
        .btn-ghost{
          background:#f5f7fb; border:1px dashed #cfd6e4; color:var(--ink-700);
          border-radius:12px; padding:.6rem 1rem; font-weight:700; font-size: var(--fs);
        }

        .tbl-wrap{ border:1px solid var(--border); border-radius: var(--rad); background:#fff; box-shadow: 0 8px 24px rgba(0,0,0,.06); padding: 8px; }
        .table thead th{ position: sticky; top: 0; background:#0f172a; color:#fff; z-index: 1; }
        .table-striped>tbody>tr:nth-of-type(odd)>*{ background-color: #fafcff; }
        .table-success{ transition: background .4s ease; }

        .mobile-list{ display: grid; gap: 10px; }
        .tx-card{ background: #fff; border:1px solid var(--border); border-radius: var(--rad); padding: 10px 12px; box-shadow: 0 6px 16px rgba(0,0,0,.05); }
        .tx-top{ display:flex; align-items:flex-start; justify-content:space-between; gap: 8px; }
        .tx-title{ font-weight: 700; font-size: var(--fs); color: var(--ink-900);}
        .tx-sub{ color: var(--ink-600); font-size: var(--fs-sm); }
        .badge{ padding: 3px 8px; border-radius: 999px; font-size: var(--fs-sm); font-weight: 800; }
        .badge-debit{ background:#fee2e2; color:#b33a3a; }
        .badge-credit{ background:#dcfce7; color:#0f8a5f; }
        .tx-row{ display:flex; justify-content:space-between; align-items:center; margin-top: 6px; }
        .tx-amt{ font-weight: 800; font-size: var(--fs-lg); }
        .tx-meta{ color: var(--ink-600); font-size: var(--fs-sm); }

        @media (max-width: 767.98px){ .table-view{ display:none; } }
        @media (min-width: 768px){ .mobile-view{ display:none; } }

        .toast-pro{ background: #0f172a; color:#fff; border-radius: 10px; padding: 12px 16px; box-shadow: 0 10px 24px rgba(0,0,0,.25); }
        .toast-success{ background: #0f8a5f; }
        .toast-error{ background: #b33a3a; }
        .modal-backdrop{ position: fixed; inset:0; background: rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index: 1100; padding: 16px; }
        .modal-card{ background:#fff; border-radius:14px; border:1px solid var(--border); width:100%; max-width:420px; padding:16px; box-shadow: 0 18px 48px rgba(0,0,0,.25); }
      `}</style>

      <div className="page-wrap">
        {/* Title */}
        <h3 className="title mb-3">Daily Transactions</h3>

        {/* Popup */}
        {popup.show && (
          <div
            className={`position-fixed top-50 start-50 translate-middle toast-pro ${
              popup.type === "success" ? "toast-success" : "toast-error"
            }`}
            style={{ zIndex: 1200, minWidth: 280, textAlign: "center", fontWeight: 700 }}
          >
            {popup.message}
          </div>
        )}

        {/* KPI */}
        <div className="kpi-grid">
          <div className="card-ui kpi-card text-center">
            <h6>Total Debit</h6>
            <h5 className="text-danger m-0">{INR.format(Number(summary.total_debit || 0))}</h5>
          </div>
          <div className="card-ui kpi-card text-center">
            <h6>Total Credit</h6>
            <h5 className="text-success m-0">{INR.format(Number(summary.total_credit || 0))}</h5>
          </div>
          <div className="card-ui kpi-card text-center">
            <h6>Total Transactions</h6>
            <h5 className="m-0">{Number(summary.total_transactions || 0)}</h5>
          </div>
        </div>

        {/* Form */}
        <div className="card-ui form-card mb-3">
          <div className="row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-control"
                placeholder="Amount"
                name="amount"
                value={form.amount}
                onChange={handleChange}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Qty (opt)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                step="1"
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Type</label>
              <select className="form-select" name="type" value={form.type} onChange={handleChange}>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Category</label>
              <select className="form-select" name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Subcategory</label>
              <select
                className="form-select"
                name="subcategory_id"
                value={form.subcategory_id}
                onChange={handleChange}
                disabled={!form.category_id}
              >
                <option value="">Select Subcategory</option>
                {filteredSubs.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Purpose (opt)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                name="transaction_date"
                value={form.transaction_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-3 d-flex gap-2 flex-wrap">
            <button className="btn-solid" onClick={addOrUpdateTransaction}>
              {editingId ? "Update Transaction" : "Add Transaction"}
            </button>
            {editingId && (
              <button className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* MOBILE VIEW: cards */}
        <div className="mobile-view">
          <div className="mobile-list">
            {pagedTransactions.length === 0 ? (
              <div className="text-center text-muted">No transactions found</div>
            ) : (
              pagedTransactions.map((t, i) => {
                const cat = categories.find((c) => c.category_id === t.category_id)?.category_name || "-";
                const sub = subcategories.find((s) => s.subcategory_id === t.subcategory_id)?.subcategory_name || "-";
                return (
                  <div
                    key={t.daily_transaction_id}
                    className="tx-card"
                    style={highlightId === t.daily_transaction_id ? { boxShadow: "0 0 0 2px #bbf7d0 inset" } : {}}
                  >
                    <div className="tx-top">
                      <div>
                        <div className="tx-title">{cat}</div>
                        <div className="tx-sub">
                          {sub} • {new Date(t.transaction_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <span className={`badge ${t.type === "debit" ? "badge-debit" : "badge-credit"}`}>{t.type}</span>
                    </div>

                    <div className="tx-row">
                      <div className="tx-meta">Amount</div>
                      <div className="tx-amt">{INR.format(Number(t.amount || 0))}</div>
                    </div>

                    <div className="tx-row">
                      <div className="tx-meta">Qty</div>
                      <div className="fw-semibold">{t.quantity ?? 0}</div>
                    </div>

                    {t.purpose && (
                      <div className="mt-1 tx-meta" title={t.purpose}>
                        {t.purpose}
                      </div>
                    )}

                    <div className="d-flex gap-2 justify-content-end mt-2">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => editTransaction(t)}>
                        Update
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(t.daily_transaction_id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination (mobile) */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span style={{ fontSize: "var(--fs-sm)" }}>
                Page {page} / {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* DESKTOP/TABLET VIEW: table */}
        <div className="table-view">
          <div className="tbl-wrap">
            <div className="table-responsive">
              <table className="table table-bordered table-striped align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ minWidth: 64 }}>Seq</th>
                    <th style={{ minWidth: 120 }}>Date</th>
                    <th style={{ minWidth: 120 }}>Amount</th>
                    <th style={{ minWidth: 96 }}>Type</th>
                    <th style={{ minWidth: 160 }}>Category</th>
                    <th style={{ minWidth: 160 }}>Subcategory</th>
                    <th style={{ minWidth: 96 }}>Qty</th>
                    <th style={{ minWidth: 220 }}>Purpose</th>
                    <th style={{ minWidth: 160 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.map((t, i) => (
                    <tr
                      key={t.daily_transaction_id}
                      className={`align-middle ${highlightId === t.daily_transaction_id ? "table-success" : ""}`}
                    >
                      <td>{startIdx + i + 1}</td>
                      <td>
                        {new Date(t.transaction_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>{INR.format(Number(t.amount || 0))}</td>
                      <td className={t.type === "debit" ? "text-danger" : "text-success"}>{t.type}</td>
                      <td>{categories.find((c) => c.category_id === t.category_id)?.category_name || "-"}</td>
                      <td>{subcategories.find((s) => s.subcategory_id === t.subcategory_id)?.subcategory_name || "-"}</td>
                      <td>{t.quantity ?? 0}</td>
                      <td>{t.purpose || "-"}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-outline-primary btn-sm" onClick={() => editTransaction(t)}>
                            Update
                          </button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(t.daily_transaction_id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr ref={tableEndRef} />
                  {pagedTransactions.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center text-muted">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDeleteId !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete transaction">
          <div className="modal-card">
            <h5 className="fw-bold mb-2">Delete this transaction?</h5>
            <p className="mb-3" style={{ color: "var(--ink-600)" }}>
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-between">
              <button className="btn btn-outline-secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={deleteTransaction} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
