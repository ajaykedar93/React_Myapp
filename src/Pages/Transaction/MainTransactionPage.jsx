import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";

const API_MAIN   = "https://express-backend-myapp.onrender.com/api/mainTransaction";
const API_ROOT   = "https://express-backend-myapp.onrender.com/api";
const API_DAILY  = `${API_ROOT}/dailyTransaction`;
const API_CAT    = `${API_ROOT}/category`;
const API_SUBCAT = `${API_ROOT}/subcategory`;
const PER_PAGE = 20;

export default function MainTransactionPage() {
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [mainTransactions, setMainTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, transactionId: null });
  const [deleteDaily, setDeleteDaily] = useState({ show: false, id: null, busy: false });

  const [editModal, setEditModal] = useState({
    show: false,
    busy: false,
    id: null,
    form: {
      amount: "",
      type: "debit",
      category_id: "",
      subcategory_id: "",
      quantity: 0,
      purpose: "",
      transaction_date: "",
    },
  });

  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const fetchAllForDate = async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const dailyRes = await axios.get(`${API_MAIN}/daily`, { params: { date } });
      setDailyTransactions(dailyRes.data.dailyTransactions || []);
      const suggRes = await axios.get(`${API_MAIN}/suggestions`, { params: { date } });
      setSuggestions(suggRes.data.suggestions || []);
    } catch (e) {
      console.error(e);
      showPopup("Failed to fetch transactions", "error");
      setDailyTransactions([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
      setPage(1);
    }
  };

  const fetchMainTransactions = async (date) => {
    try {
      const res = await axios.get(`${API_MAIN}`, { params: { date } });
      setMainTransactions(res.data);
    } catch (e) {
      console.error(e);
      showPopup("Failed to fetch main transactions", "error");
    }
  };

  const fetchMasters = async () => {
    try {
      const [c, s] = await Promise.all([axios.get(API_CAT), axios.get(API_SUBCAT)]);
      setCategories(c.data || []);
      setSubcategories(s.data || []);
    } catch {
      // ignore
    }
  };

  const saveDetails = async () => {
    if (!selectedDate) return showPopup("Please select a date", "error");
    const ids = dailyTransactions.map((t) => t.daily_transaction_id);
    if (ids.length === 0) return showPopup("No transactions to save", "info");
    try {
      setLoading(true);
      await axios.post(`${API_MAIN}/save`, {
        date: selectedDate,
        daily_transaction_ids: ids,
      });
      showPopup("Transactions saved successfully", "success");
      await Promise.all([fetchAllForDate(selectedDate), fetchMainTransactions(selectedDate)]);
    } catch (e) {
      console.error(e);
      showPopup("Failed to save transactions", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (transactionId) => setDeleteConfirm({ show: true, transactionId });

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm.transactionId) return;
    try {
      setLoading(true);
      await axios.delete(`${API_MAIN}/${deleteConfirm.transactionId}`);
      showPopup("Main transaction deleted", "success");
      await Promise.all([fetchMainTransactions(selectedDate), fetchAllForDate(selectedDate)]);
    } catch (e) {
      console.error(e);
      showPopup("Failed to delete transaction", "error");
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, transactionId: null });
    }
  };

  const showPopup = (message, type) => {
    setPopup({ show: true, message, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "" }), 2200);
  };

  const handleSearchClick = () => {
    if (!selectedDate) return showPopup("Please select a valid date", "error");
    fetchAllForDate(selectedDate);
    fetchMainTransactions(selectedDate);
  };

  const startIdx = (page - 1) * PER_PAGE;
  const pagedDailyTransactions = useMemo(
    () => dailyTransactions.slice(startIdx, startIdx + PER_PAGE),
    [dailyTransactions, startIdx]
  );
  const totalPages = Math.max(1, Math.ceil(dailyTransactions.length / PER_PAGE));

  const totalDebit = dailyTransactions.reduce(
    (a, t) => a + (t.type === "debit" ? +t.amount : 0),
    0
  );
  const totalCredit = dailyTransactions.reduce(
    (a, t) => a + (t.type === "credit" ? +t.amount : 0),
    0
  );
  const totalTransactions = dailyTransactions.length;

  useEffect(() => {
    const today = getToday();
    setSelectedDate(today);
    fetchAllForDate(today);
    fetchMainTransactions(today);
    fetchMasters();

    const tickToMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const id = setTimeout(() => {
        const nd = getToday();
        setSelectedDate(nd);
        fetchAllForDate(nd);
        fetchMainTransactions(nd);
        tickToMidnight();
      }, next - now);
      return () => clearTimeout(id);
    };
    const cleanup = tickToMidnight();
    return cleanup;
    // eslint-disable-next-line
  }, []);

  const openEdit = (t) => {
    setEditModal({
      show: true,
      busy: false,
      id: t.daily_transaction_id,
      form: {
        amount: t.amount ?? "",
        type: t.type ?? "debit",
        category_id: t.category_id ?? "",
        subcategory_id: t.subcategory_id ?? "",
        quantity: t.quantity ?? 0,
        purpose: t.purpose ?? "",
        transaction_date: t.transaction_date ?? selectedDate,
      },
    });
  };
  const closeEdit = () =>
    setEditModal((m) => ({
      ...m,
      show: false,
      busy: false,
      id: null,
    }));
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((m) => ({
      ...m,
      form: {
        ...m.form,
        [name]: name === "quantity" ? Number(value) : value,
        ...(name === "category_id" ? { subcategory_id: "" } : null),
      },
    }));
  };
  const saveEdit = async () => {
    if (!editModal.id) return;
    const f = editModal.form;
    if (!f.amount || !f.category_id)
      return showPopup("Please fill required fields (Amount, Category)", "error");
    try {
      setEditModal((m) => ({ ...m, busy: true }));
      await axios.put(`${API_DAILY}/${editModal.id}`, {
        amount: f.amount,
        type: f.type,
        category_id: f.category_id,
        subcategory_id: f.subcategory_id || null,
        quantity: f.quantity ?? 0,
        purpose: f.purpose || null,
      });
      showPopup("Transaction updated successfully", "success");
      closeEdit();
      await fetchAllForDate(selectedDate);
    } catch (e) {
      console.error(e);
      showPopup("Failed to update transaction", "error");
      setEditModal((m) => ({ ...m, busy: false }));
    }
  };

  const askDeleteDaily = (id) => setDeleteDaily({ show: true, id, busy: false });
  const cancelDeleteDaily = () => setDeleteDaily({ show: false, id: null, busy: false });
  const confirmDeleteDaily = async () => {
    if (!deleteDaily.id) return;
    try {
      setDeleteDaily((d) => ({ ...d, busy: true }));
      await axios.delete(`${API_DAILY}/${deleteDaily.id}`);
      showPopup("Transaction deleted successfully", "success");
      cancelDeleteDaily();
      await fetchAllForDate(selectedDate);
    } catch (e) {
      console.error(e);
      showPopup("Failed to delete transaction", "error");
      setDeleteDaily((d) => ({ ...d, busy: false }));
    }
  };

  const editSubs = useMemo(() => {
    const cid = Number(editModal.form.category_id || 0);
    return subcategories.filter((s) => Number(s.category_id) === cid);
  }, [subcategories, editModal.form.category_id]);

  return (
    <div className="container-fluid py-3" style={{ background: "var(--bg)" }}>
      {/* mobile-first styles */}
      <style>{`
        :root{
          --ink-900:#0f172a;
          --ink-700:#334155;
          --ink-600:#475569;
          --surface:#ffffff;
          --border:#e6e9ef;
          --bg:#f6f8fb;
          --brand-grad: linear-gradient(90deg,#5f4bb6 0%, #1f5f78 100%);
          --px: clamp(10px, 4vw, 22px);
          --rad: 14px;
          --fs: clamp(13px, 3.5vw, 16px);
          --fs-sm: clamp(11.5px, 3.3vw, 14px);
          --fs-lg: clamp(14.5px, 3.8vw, 18px);
        }
        .page-wrap{
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 var(--px);
        }
        .title{
          font-size: clamp(1.15rem, 5vw, 1.6rem);
          font-weight: 800;
          background: var(--brand-grad);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }
        .card-ui{
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:var(--rad);
          box-shadow:0 8px 24px rgba(2,6,23,.06);
          padding:12px;
        }
        .btn-solid{
          background:#1f2937;
          color:#fff;
          border:none;
          border-radius:12px;
          padding:.45rem .9rem;
          font-weight:700;
          font-size:clamp(.7rem, 3vw, .85rem);
        }
        .btn-outline{
          background:#f5f7fb;
          border:1px dashed #cfd6e4;
          color:var(--ink-700);
          border-radius:12px;
          padding:.4rem .8rem;
          font-weight:700;
          font-size:clamp(.7rem, 3vw, .85rem);
        }

        /* mobile cards on <768px */
        @media (max-width: 767.98px){
          .table-view{ display:none; }
          .page-wrap{ padding: 0 .4rem; }
        }
        @media (min-width: 768px){
          .mobile-view{ display:none; }
        }

        .tx-card{
          background:#fff;
          border:1px solid var(--border);
          border-radius:var(--rad);
          padding:10px 12px;
          box-shadow:0 6px 16px rgba(0,0,0,.05);
        }
        .tx-top{
          display:flex;
          justify-content:space-between;
          gap:8px;
        }
        .tx-title{
          font-weight:800;
          font-size:clamp(.72rem, 3vw, .9rem);
          color:var(--ink-900);
        }
        .tx-sub{
          color:var(--ink-600);
          font-size:clamp(.62rem, 2.6vw, .78rem);
        }
        .badge{
          padding:3px 8px;
          border-radius:999px;
          font-size:clamp(.58rem, 2.5vw, .72rem);
          font-weight:800;
        }
        .badge-debit{ background:#fee2e2; color:#b33a3a; }
        .badge-credit{ background:#dcfce7; color:#0f8a5f; }
        .tx-row{
          display:flex;
          justify-content:space-between;
          margin-top:6px;
          font-size:clamp(.65rem, 2.6vw, .8rem);
        }
        .tx-amt{
          font-weight:800;
          font-size:clamp(.8rem, 3vw, 1rem);
        }

        /* tables */
        .table thead th{
          position:sticky;
          top:0;
          background:#0f172a;
          color:#fff;
          z-index:1;
          font-size:0.75rem;
        }
        .table td{
          font-size:0.75rem;
        }

        /* popup toast */
        .toast{
          position:fixed;
          top:50%;
          left:50%;
          transform:translate(-50%,-50%);
          z-index:9999;
          color:#fff;
          padding:10px 14px;
          border-radius:10px;
          font-weight:800;
          min-width:250px;
          text-align:center;
          font-size:clamp(.7rem, 2.7vw, .9rem);
        }

        /* modals responsive */
        @media (max-width: 520px){
          .modal-sheet{
            width: 93vw !important;
          }
        }
      `}</style>

      {/* full-screen loading */}
      {loading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(255,255,255,.6)", zIndex: 9998 }}
        >
          <LoadingSpiner />
        </div>
      )}

      {/* popup */}
      {popup.show && (
        <div
          className="toast"
          style={{
            background:
              popup.type === "success"
                ? "#2E7D32"
                : popup.type === "error"
                ? "#C62828"
                : "#4C1D95",
          }}
        >
          {popup.message}
        </div>
      )}

      {/* confirm delete main */}
      {deleteConfirm.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 9998 }}
        >
          <div className="bg-white p-4 rounded shadow-lg modal-sheet" style={{ minWidth: 280 }}>
            <h5 className="mb-2" style={{ fontSize: "clamp(.9rem,3vw,1rem)" }}>
              Confirm Delete
            </h5>
            <p style={{ fontSize: "clamp(.7rem,2.6vw,.85rem)" }}>
              Are you sure you want to delete this transaction?
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirm({ show: false, transactionId: null })}
              >
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirmed}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirm delete daily */}
      {deleteDaily.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 9998 }}
        >
          <div className="bg-white p-4 rounded shadow-lg modal-sheet" style={{ minWidth: 280 }}>
            <h5 className="mb-2" style={{ fontSize: "clamp(.9rem,3vw,1rem)" }}>
              Delete this daily transaction?
            </h5>
            <p className="mb-3" style={{ fontSize: "clamp(.7rem,2.6vw,.85rem)" }}>
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteDaily({ show: false, id: null, busy: false })}
                disabled={deleteDaily.busy}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  await confirmDeleteDaily();
                }}
                disabled={deleteDaily.busy}
              >
                {deleteDaily.busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* edit modal */}
      {editModal.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 9998, padding: 16 }}
        >
          <div
            className="bg-white p-3 p-md-4 rounded shadow-lg modal-sheet"
            style={{ width: "100%", maxWidth: 560 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0" style={{ fontSize: "clamp(.9rem,3.2vw,1.02rem)" }}>
                Update Transaction
              </h5>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeEdit}
                disabled={editModal.busy}
              >
                Close
              </button>
            </div>
            <div className="row g-2">
              <div className="col-6 col-md-4">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Amount
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  name="amount"
                  value={editModal.form.amount}
                  onChange={handleEditChange}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Type
                </label>
                <select
                  className="form-select form-select-sm"
                  name="type"
                  value={editModal.form.type}
                  onChange={handleEditChange}
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Quantity (opt)
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  name="quantity"
                  value={editModal.form.quantity}
                  min={0}
                  onChange={handleEditChange}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Category
                </label>
                <select
                  className="form-select form-select-sm"
                  name="category_id"
                  value={editModal.form.category_id}
                  onChange={handleEditChange}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Subcategory
                </label>
                <select
                  className="form-select form-select-sm"
                  name="subcategory_id"
                  value={editModal.form.subcategory_id || ""}
                  onChange={handleEditChange}
                  disabled={!editModal.form.category_id}
                >
                  <option value="">Select Subcategory</option>
                  {editSubs.map((s) => (
                    <option key={s.subcategory_id} value={s.subcategory_id}>
                      {s.subcategory_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Purpose (opt)
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  name="purpose"
                  value={editModal.form.purpose}
                  onChange={handleEditChange}
                />
              </div>
            </div>
            <div className="mt-3 d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeEdit}
                disabled={editModal.busy}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={saveEdit}
                disabled={editModal.busy}
              >
                {editModal.busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-wrap">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
          <h3 className="title m-0">Main Transactions</h3>
          <button className="btn-solid mt-2 mt-sm-0" onClick={saveDetails}>
            Save Details
          </button>
        </div>

        {/* Date & Totals */}
        <div className="card-ui mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-bold" style={{ fontSize: "clamp(.68rem,2.6vw,.82rem)" }}>
                Select Date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getToday()}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <button className="btn-outline w-100" onClick={handleSearchClick}>
                Search
              </button>
            </div>
            <div className="col-12 col-md-7">
              <div
                className="fw-semibold mt-2 mt-md-0"
                style={{ fontSize: "clamp(.68rem, 2.4vw, .85rem)" }}
              >
                Totals:
                <span className="ms-2 me-3">Debit: ₹ {totalDebit.toFixed(2)}</span>
                <span className="me-3">Credit: ₹ {totalCredit.toFixed(2)}</span>
                <span>Count: {totalTransactions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DAILY: Mobile cards */}
        <div className="mobile-view">
          <div className="card-ui mb-3">
            <h5 className="mb-2" style={{ fontSize: "clamp(.8rem,3vw,1rem)" }}>
              Daily Transactions ({selectedDate})
            </h5>
            {pagedDailyTransactions.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "clamp(.7rem, 2.6vw, .85rem)" }}>
                No transactions found for this date.
              </div>
            ) : (
              <div className="d-grid gap-2">
                {pagedDailyTransactions.map((t) => {
                  const cat =
                    t.category_name ||
                    categories.find((c) => c.category_id === t.category_id)?.category_name ||
                    "-";
                  const sub =
                    t.subcategory_name ||
                    subcategories.find((s) => s.subcategory_id === t.subcategory_id)
                      ?.subcategory_name ||
                    "-";
                  return (
                    <div key={t.daily_transaction_id} className="tx-card">
                      <div className="tx-top">
                        <div>
                          <div className="tx-title">{cat}</div>
                          <div className="tx-sub">
                            {sub} •{" "}
                            {new Date(t.transaction_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <span
                          className={`badge ${
                            t.type === "debit" ? "badge-debit" : "badge-credit"
                          }`}
                        >
                          {t.type}
                        </span>
                      </div>
                      <div className="tx-row">
                        <div className="tx-sub">Amount</div>
                        <div className="tx-amt">₹ {Number(t.amount).toFixed(2)}</div>
                      </div>
                      <div className="tx-row">
                        <div className="tx-sub">Qty</div>
                        <div className="fw-semibold">{t.quantity ?? 0}</div>
                      </div>
                      {t.purpose && <div className="mt-1 tx-sub">{t.purpose}</div>}
                      <div className="d-flex gap-2 justify-content-end mt-2">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openEdit(t)}
                        >
                          Update
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => askDeleteDaily(t.daily_transaction_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination (mobile) */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span style={{ fontSize: "clamp(.65rem, 2.5vw, .82rem)" }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Suggestions (cards) */}
          <div className="card-ui mb-3">
            <h5 className="mb-2" style={{ fontSize: "clamp(.8rem,3vw,1rem)" }}>
              Unsaved Transactions
            </h5>
            {suggestions.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "clamp(.7rem, 2.6vw, .85rem)" }}>
                No unsaved transactions.
              </div>
            ) : (
              <div className="d-grid gap-2">
                {suggestions.map((s) => (
                  <div key={s.daily_transaction_id} className="tx-card">
                    <div className="tx-top">
                      <div className="tx-title">{s.category_name || s.category_id}</div>
                      <span
                        className={`badge ${s.type === "debit" ? "badge-debit" : "badge-credit"}`}
                      >
                        {s.type}
                      </span>
                    </div>
                    <div className="tx-row">
                      <div className="tx-sub">Amount</div>
                      <div className="tx-amt">₹ {Number(s.amount).toFixed(2)}</div>
                    </div>
                    <div className="tx-row">
                      <div className="tx-sub">Qty</div>
                      <div className="fw-semibold">{s.quantity ?? 0}</div>
                    </div>
                    {s.purpose && <div className="mt-1 tx-sub">{s.purpose}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main transactions (cards) */}
          <div className="card-ui mb-4">
            <h5 className="mb-2" style={{ fontSize: "clamp(.8rem,3vw,1rem)" }}>
              All Main Transactions
            </h5>
            {mainTransactions.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "clamp(.7rem, 2.6vw, .85rem)" }}>
                No main transactions available
              </div>
            ) : (
              <div className="d-grid gap-2">
                {mainTransactions.map((mt) => (
                  <div key={mt.transaction_id} className="tx-card">
                    <div className="tx-top">
                      <div className="tx-title">
                        {new Date(mt.date).toLocaleDateString()}
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => confirmDelete(mt.transaction_id)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="tx-row">
                      <div className="tx-sub">Total Debit</div>
                      <div className="tx-amt">₹ {Number(mt.total_debit).toFixed(2)}</div>
                    </div>
                    <div className="tx-row">
                      <div className="tx-sub">Total Credit</div>
                      <div className="tx-amt">₹ {Number(mt.total_credit).toFixed(2)}</div>
                    </div>
                    <div className="tx-row">
                      <div className="tx-sub">Transactions</div>
                      <div className="fw-bold">{mt.total_transactions}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ≥ md: tables */}
        <div className="table-view">
          <div className="card-ui mb-3">
            <h5 className="mb-3" style={{ fontSize: "1rem" }}>
              Daily Transactions ({selectedDate})
            </h5>
            {dailyTransactions.length === 0 ? (
              <div className="text-center text-muted">No transactions found for this date.</div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-bordered table-striped align-middle mb-2">
                    <thead className="table-dark">
                      <tr>
                        <th>#</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Subcategory</th>
                        <th>Qty</th>
                        <th>Purpose</th>
                        <th style={{ minWidth: 160 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDailyTransactions.map((t, i) => (
                        <tr key={t.daily_transaction_id}>
                          <td>{startIdx + i + 1}</td>
                          <td>₹ {Number(t.amount).toFixed(2)}</td>
                          <td className={t.type === "debit" ? "text-danger" : "text-success"}>
                            {t.type}
                          </td>
                          <td>{t.category_name || t.category_id}</td>
                          <td>{t.subcategory_name || t.subcategory_id || "-"}</td>
                          <td>{t.quantity ?? 0}</td>
                          <td>{t.purpose || "-"}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => openEdit(t)}
                              >
                                Update
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => askDeleteDaily(t.daily_transaction_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>Page {page} of {totalPages}</div>
                  <div className="mt-2 mt-md-0">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card-ui mb-3">
            <h5 className="mb-3" style={{ fontSize: "1rem" }}>
              Unsaved Transactions
            </h5>
            {suggestions.length === 0 ? (
              <div className="text-muted">No unsaved transactions.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s, idx) => (
                      <tr key={s.daily_transaction_id}>
                        <td>{idx + 1}</td>
                        <td>₹ {Number(s.amount).toFixed(2)}</td>
                        <td className={s.type === "debit" ? "text-danger" : "text-success"}>
                          {s.type}
                        </td>
                        <td>{s.category_name || s.category_id}</td>
                        <td>{s.quantity ?? 0}</td>
                        <td>{s.purpose || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-ui mb-4">
            <h5 className="mb-3" style={{ fontSize: "1rem" }}>
              All Main Transactions
            </h5>
            <div className="table-responsive">
              <table className="table table-bordered table-striped align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Date</th>
                    <th>Total Debit</th>
                    <th>Total Credit</th>
                    <th>Total Transactions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mainTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        No main transactions available
                      </td>
                    </tr>
                  ) : (
                    mainTransactions.map((mt) => (
                      <tr key={mt.transaction_id}>
                        <td>{new Date(mt.date).toLocaleDateString()}</td>
                        <td>₹ {Number(mt.total_debit).toFixed(2)}</td>
                        <td>₹ {Number(mt.total_credit).toFixed(2)}</td>
                        <td>{mt.total_transactions}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => confirmDelete(mt.transaction_id)}
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
      </div>
    </div>
  );
}
