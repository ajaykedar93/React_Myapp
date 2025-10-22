import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function DailyTransactionPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_debit: 0, total_credit: 0, total_transactions: 0 });

  const [form, setForm] = useState({
    amount: "",
    quantity: "",            // NEW (optional; blank → API/DB default 0 on POST, keep on PUT)
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

  // Pagination
  const startIdx = (page - 1) * perPage;
  const pagedTransactions = useMemo(
    () => transactions.slice(startIdx, startIdx + perPage),
    [transactions, startIdx]
  );
  const totalPages = Math.ceil(transactions.length / perPage) || 1;

  // ========================
  // Utils
  // ========================
  function getLocalDate() {
    const now = new Date();
    return now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  }

  const INR = useMemo(
    () => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }),
    []
  );

  // Auto update date at midnight (check every minute)
  useEffect(() => {
    const timer = setInterval(() => {
      setForm((prev) => ({ ...prev, transaction_date: getLocalDate() }));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // ========================
  // Fetch Data
  // ========================
  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/dailyTransaction`);
      setTransactions(res.data);
      setPage(1);
      fetchSummary();
    } catch {
      showPopup("Error fetching transactions", "error");
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API}/dailyTransaction/daily-summary`);
      setSummary(res.data);
    } catch {
      showPopup("Error fetching summary", "error");
    }
  };

  // Init
  useEffect(() => {
    axios.get(`${API}/category`).then((res) => setCategories(res.data));
    axios.get(`${API}/subcategory`).then((res) => setSubcategories(res.data));
    fetchTransactions();
    // eslint-disable-next-line
  }, []);

  // Filter Subcategories on category change
  useEffect(() => {
    if (form.category_id) {
      setFilteredSubs(subcategories.filter((s) => s.category_id === parseInt(form.category_id)));
    } else {
      setFilteredSubs([]);
    }
    setForm((prev) => ({ ...prev, subcategory_id: "" }));
  }, [form.category_id, subcategories]);

  // ========================
  // Helpers
  // ========================
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

  // ========================
  // CRUD
  // ========================
  const addOrUpdateTransaction = async () => {
    if (!form.amount || !form.category_id) {
      return showPopup("Please fill required fields (Amount, Category)", "error");
    }
    try {
      let id = null;
      if (editingId) {
        await axios.put(`${API}/dailyTransaction/${editingId}`, form);
        id = editingId;
        showPopup("Transaction updated successfully", "success");
        setEditingId(null);
      } else {
        const res = await axios.post(`${API}/dailyTransaction`, form);
        if (res.data && res.data.length > 0) {
          id = res.data[res.data.length - 1].daily_transaction_id;
        }
        showPopup("Transaction added successfully", "success");
      }
      await fetchTransactions();
      setHighlightId(id);
      scrollToBottom();
      setForm({
        amount: "",
        quantity: "",       // reset
        type: "debit",
        category_id: "",
        subcategory_id: "",
        purpose: "",
        transaction_date: getLocalDate(),
      });
    } catch {
      showPopup("Failed to save transaction", "error");
    }
  };

  const askDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const deleteTransaction = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleting(true);
      await axios.delete(`${API}/dailyTransaction/${confirmDeleteId}`);
      showPopup("Transaction deleted successfully", "success");
      setConfirmDeleteId(null);
      await fetchTransactions();
    } catch {
      showPopup("Failed to delete transaction", "error");
    } finally {
      setDeleting(false);
    }
  };

  const editTransaction = (t) => {
    setEditingId(t.daily_transaction_id);
    setForm({
      amount: t.amount,
      quantity: t.quantity ?? "",   // NEW — keep blank if null to allow "no change" on PUT
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

  // ========================
  // Render
  // ========================
  return (
    <div className="container my-4">
      {/* Local styles (professional palette, mobile-first) */}
      <style>{`
        :root{
          --ink-900:#0f172a; --ink-700:#334155; --ink-600:#475569; --ink-500:#64748b;
          --surface:#fff; --border:#e6e9ef; --bg:#f6f8fb;
          --brand-grad: linear-gradient(90deg,#5f4bb6 0%, #1f5f78 100%);
          --accent:#2b7a8b; --success:#0f8a5f; --danger:#b33a3a; --warn:#b26b00;
        }
        .title{
          background: var(--brand-grad);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing:.35px;
          font-weight: 800;
        }
        .kpi-grid{
          display:grid; gap:12px; grid-template-columns: 1fr;
        }
        @media (min-width:576px){ .kpi-grid{ grid-template-columns: 1fr 1fr 1fr; } }
        .kpi-card{
          background: var(--surface);
          border:1px solid var(--border);
          border-radius:14px; padding:14px;
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
          text-align:center;
        }
        .kpi-card h6{ font-size:12.5px; color: var(--ink-600); margin: 0 0 6px; }
        .kpi-card h5{ font-size: clamp(18px,3.4vw,24px); font-weight:800; margin:0; }

        .form-card{
          background: var(--surface);
          border:1px solid var(--border);
          border-radius:16px; padding:14px;
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
        }
        .form-card .form-select, .form-card .form-control{
          border-radius:12px; border:1px solid var(--border);
        }
        .btn-accent{
          background: var(--accent); color:#fff; border:none; border-radius:12px; padding:10px 14px; font-weight:700;
        }
        .btn-ghost{
          background:#f5f7fb; border:1px dashed #cfd6e4; color:var(--ink-700);
          border-radius:12px; padding:10px 14px; font-weight:700;
        }
        .btn-danger-outline{
          border:1px solid #f5c6c4; color: var(--danger); background:#fff; border-radius:10px; padding:6px 10px; font-weight:700;
        }

        .tbl-wrap{
          border:1px solid var(--border); border-radius:16px; background:#fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.06); padding: 10px;
        }
        .table thead th{
          position: sticky; top: 0; background:#0f172a; color:#fff; z-index: 1;
        }
        .table tbody td{ vertical-align: middle; }
        .table-striped>tbody>tr:nth-of-type(odd)>*{ background-color: #fafcff; }
        .table-success{ transition: background .4s ease; }

        /* Popup toast */
        .toast-pro{
          background: #0f172a; color:#fff; border-radius: 10px; padding: 12px 16px;
          box-shadow: 0 10px 24px rgba(0,0,0,.25);
        }
        .toast-success{ background: #0f8a5f; }
        .toast-error{ background: #b33a3a; }

        /* Confirm modal */
        .modal-backdrop{
          position: fixed; inset:0; background: rgba(0,0,0,.45);
          display:flex; align-items:center; justify-content:center; z-index: 1100; padding: 16px;
        }
        .modal-card{
          background:#fff; border-radius:14px; border:1px solid var(--border);
          width:100%; max-width:420px; padding:16px;
          box-shadow: 0 18px 48px rgba(0,0,0,.25); animation: slideDown .2s ease-out;
        }
        @keyframes slideDown{ from{ transform: translateY(-14px); opacity:0;} to{ transform: translateY(0); opacity:1; } }
      `}</style>

      {/* Title */}
      <h3 className="text-center mb-3 title">Daily Transactions</h3>

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

      {/* Summary KPI */}
      <div className="kpi-grid mb-3">
        <div className="kpi-card">
          <h6>Total Debit</h6>
          <h5 className="text-danger">{INR.format(Number(summary.total_debit || 0))}</h5>
        </div>
        <div className="kpi-card">
          <h6>Total Credit</h6>
          <h5 className="text-success">{INR.format(Number(summary.total_credit || 0))}</h5>
        </div>
        <div className="kpi-card">
          <h6>Total Transactions</h6>
          <h5>{Number(summary.total_transactions || 0)}</h5>
        </div>
      </div>

      {/* Transaction Form */}
      <div className="form-card mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Amount</label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="Amount"
              name="amount"
              value={form.amount}
              onChange={handleChange}
            />
          </div>

          {/* NEW: Quantity (optional) */}
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Qty (optional)</label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="0"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              min="0"
              step="1"
            />
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Type</label>
            <select
              className="form-select form-select-sm"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Category</label>
            <select
              className="form-select form-select-sm"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Subcategory</label>
            <select
              className="form-select form-select-sm"
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
            <label className="form-label mb-1">Purpose (Optional)</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Purpose"
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label mb-1">Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              name="transaction_date"
              value={form.transaction_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-warning btn-sm" onClick={addOrUpdateTransaction}>
            {editingId ? "Update Transaction" : "Add Transaction"}
          </button>
          {editingId && (
            <button className="btn btn-outline-secondary btn-sm" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
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
                {/* NEW column before Purpose */}
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
                  {/* NEW: show quantity (fallback to 0 for clarity) */}
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

      {/* Confirm Delete Modal */}
      {confirmDeleteId !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete transaction">
          <div className="modal-card">
            <h5 className="fw-bold mb-2">Delete this transaction?</h5>
            <p className="mb-3" style={{ color: "var(--ink-600)" }}>
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-between">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
              >
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
