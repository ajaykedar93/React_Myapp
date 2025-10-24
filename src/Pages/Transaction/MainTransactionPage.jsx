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

  // delete main-transaction confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, transactionId: null });

  // delete daily-transaction confirm
  const [deleteDaily, setDeleteDaily] = useState({ show: false, id: null, busy: false });

  // edit daily-transaction modal
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
      transaction_date: "", // keep original date (not posted here)
    },
  });

  // Get local current date in YYYY-MM-DD format
  const getToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Fetch daily transactions and suggestions for a date
  const fetchAllForDate = async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const dailyRes = await axios.get(`${API_MAIN}/daily`, { params: { date } });
      setDailyTransactions(dailyRes.data.dailyTransactions || []);

      const suggRes = await axios.get(`${API_MAIN}/suggestions`, { params: { date } });
      setSuggestions(suggRes.data.suggestions || []);
    } catch (err) {
      console.error(err);
      showPopup("Failed to fetch transactions", "error");
      setDailyTransactions([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
      setPage(1);
    }
  };

  // Fetch main transactions for a date
  const fetchMainTransactions = async (date) => {
    try {
      const res = await axios.get(`${API_MAIN}`, { params: { date } });
      setMainTransactions(res.data);
    } catch (err) {
      console.error(err);
      showPopup("Failed to fetch main transactions", "error");
    }
  };

  // Fetch master data for edit form
  const fetchMasters = async () => {
    try {
      const [c, s] = await Promise.all([axios.get(API_CAT), axios.get(API_SUBCAT)]);
      setCategories(c.data || []);
      setSubcategories(s.data || []);
    } catch (err) {
      console.error(err);
      // non-blocking
    }
  };

  // Save daily transactions to main
  const saveDetails = async () => {
    if (!selectedDate) {
      showPopup("Please select a date", "error");
      return;
    }
    const allIds = dailyTransactions.map((t) => t.daily_transaction_id);
    if (allIds.length === 0) {
      showPopup("No transactions to save", "info");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_MAIN}/save`, { date: selectedDate, daily_transaction_ids: allIds });
      showPopup("Transactions saved successfully", "success");
      await Promise.all([fetchAllForDate(selectedDate), fetchMainTransactions(selectedDate)]);
    } catch (err) {
      console.error(err);
      showPopup("Failed to save transactions", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete main transaction
  const confirmDelete = (transactionId) => setDeleteConfirm({ show: true, transactionId });
  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm.transactionId) return;
    try {
      setLoading(true);
      await axios.delete(`${API_MAIN}/${deleteConfirm.transactionId}`);
      showPopup("Main transaction deleted", "success");
      await Promise.all([fetchMainTransactions(selectedDate), fetchAllForDate(selectedDate)]);
    } catch (err) {
      console.error(err);
      showPopup("Failed to delete transaction", "error");
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, transactionId: null });
    }
  };

  // Popup
  const showPopup = (message, type) => {
    setPopup({ show: true, message, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "" }), 2500);
  };

  // Search handler
  const handleSearchClick = () => {
    if (!selectedDate) {
      showPopup("Please select a valid date", "error");
      return;
    }
    fetchAllForDate(selectedDate);
    fetchMainTransactions(selectedDate);
  };

  // Pagination
  const startIdx = (page - 1) * PER_PAGE;
  const pagedDailyTransactions = useMemo(
    () => dailyTransactions.slice(startIdx, startIdx + PER_PAGE),
    [dailyTransactions, startIdx]
  );
  const totalPages = Math.max(1, Math.ceil(dailyTransactions.length / PER_PAGE));

  // Totals
  const totalDebit = dailyTransactions.reduce(
    (acc, t) => acc + (t.type === "debit" ? Number(t.amount) : 0),
    0
  );
  const totalCredit = dailyTransactions.reduce(
    (acc, t) => acc + (t.type === "credit" ? Number(t.amount) : 0),
    0
  );
  const totalTransactions = dailyTransactions.length;

  // Initialize page with current date and auto-update daily
  useEffect(() => {
    const today = getToday();
    setSelectedDate(today);
    fetchAllForDate(today);
    fetchMainTransactions(today);
    fetchMasters();

    const updateAtMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const msUntilMidnight = nextMidnight - now;

      const timer = setTimeout(() => {
        const newDate = getToday();
        setSelectedDate(newDate);
        fetchAllForDate(newDate);
        fetchMainTransactions(newDate);
        updateAtMidnight(); // repeat for next day
      }, msUntilMidnight);

      return () => clearTimeout(timer);
    };

    const cleanup = updateAtMidnight();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Daily row actions (Update/Delete) =====
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
    if (!f.amount || !f.category_id) {
      showPopup("Please fill required fields (Amount, Category)", "error");
      return;
    }
    try {
      setEditModal((m) => ({ ...m, busy: true }));
      await axios.put(`${API_DAILY}/${editModal.id}`, {
        amount: f.amount,
        type: f.type,
        category_id: f.category_id,
        subcategory_id: f.subcategory_id || null,
        quantity: f.quantity ?? 0, // optional, default 0
        purpose: f.purpose || null,
      });
      showPopup("Transaction updated successfully", "success");
      closeEdit();
      await fetchAllForDate(selectedDate);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
      showPopup("Failed to delete transaction", "error");
      setDeleteDaily((d) => ({ ...d, busy: false }));
    }
  };

  // Filter subcategories for edit modal
  const editSubs = useMemo(() => {
    const cid = Number(editModal.form.category_id || 0);
    return subcategories.filter((s) => Number(s.category_id) === cid);
  }, [subcategories, editModal.form.category_id]);

  return (
    <div className="container my-4 position-relative">
      {/* Overlay loading */}
      {loading && (
        <div
          className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(255,255,255,0.7)", zIndex: 10 }}
        >
          <LoadingSpiner />
        </div>
      )}

      {/* Center popup */}
      {popup.show && (
        <div
          className={`position-fixed top-50 start-50 translate-middle p-3 rounded shadow`}
          style={{
            backgroundColor:
              popup.type === "success"
                ? "#2E7D32"
                : popup.type === "error"
                ? "#C62828"
                : "#6A1B9A",
            color: "white",
            zIndex: 9999,
            minWidth: "280px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {popup.message}
        </div>
      )}

      {/* Confirm delete MAIN transaction */}
      {deleteConfirm.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9998 }}
        >
          <div className="bg-white p-4 rounded shadow-lg" style={{ minWidth: "320px" }}>
            <h5 className="mb-3">Confirm Delete</h5>
            <p>Are you sure you want to delete this transaction?</p>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm({ show: false, transactionId: null })}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirmed}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete DAILY transaction */}
      {deleteDaily.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9998 }}
        >
          <div className="bg-white p-4 rounded shadow-lg" style={{ minWidth: "320px" }}>
            <h5 className="mb-2">Delete this daily transaction?</h5>
            <p className="mb-3">This action cannot be undone.</p>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={cancelDeleteDaily} disabled={deleteDaily.busy}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteDaily} disabled={deleteDaily.busy}>
                {deleteDaily.busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit DAILY transaction modal */}
      {editModal.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9998, padding: 16 }}
        >
          <div className="bg-white p-3 p-md-4 rounded shadow-lg" style={{ width: "100%", maxWidth: 560 }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Update Transaction</h5>
              <button className="btn btn-outline-secondary btn-sm" onClick={closeEdit} disabled={editModal.busy}>
                Close
              </button>
            </div>

            <div className="row g-2">
              <div className="col-6 col-md-4">
                <label className="form-label mb-1">Amount</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  name="amount"
                  value={editModal.form.amount}
                  onChange={handleEditChange}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label mb-1">Type</label>
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
                <label className="form-label mb-1">Quantity (optional)</label>
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
                <label className="form-label mb-1">Category</label>
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
                <label className="form-label mb-1">Subcategory</label>
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
                <label className="form-label mb-1">Purpose (optional)</label>
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
              <button className="btn btn-outline-secondary" onClick={closeEdit} disabled={editModal.busy}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={editModal.busy}>
                {editModal.busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="d-flex justify-content-between mb-3 flex-wrap align-items-center">
        <h3 style={{ color: "#4E342E", fontWeight: "bold", fontSize: "1.6rem" }}>Main Transactions</h3>
        <button className="btn btn-dark px-4 py-2" onClick={saveDetails}>
          Save Details
        </button>
      </div>

      {/* Date selector & totals */}
      <div className="card p-3 shadow-sm border-0 mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-md-3 col-12">
            <label htmlFor="datePicker" className="form-label fw-bold">
              Select Date
            </label>
            <input
              id="datePicker"
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getToday()}
            />
          </div>
          <div className="col-md-2 col-12">
            <button className="btn btn-outline-dark w-100" onClick={handleSearchClick}>
              Search
            </button>
          </div>
          <div className="col-md-4 col-12">
            <div className="fw-semibold mt-2 mt-md-0">
              Totals: &nbsp;
              <span className="me-3">Debit: ₹ {totalDebit.toFixed(2)}</span>
              <span className="me-3">Credit: ₹ {totalCredit.toFixed(2)}</span>
              <span>Count: {totalTransactions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Transactions */}
      <div className="card p-3 shadow-sm border-0 mb-4">
        <h5 className="mb-3">Daily Transactions ({selectedDate})</h5>
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
                      <td className={t.type === "debit" ? "text-danger" : "text-success"}>{t.type}</td>
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

      {/* Suggestions */}
      <div className="card p-3 shadow-sm border-0 mb-4">
        <h5 className="mb-3">Unsaved Transactions</h5>
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
                    <td className={s.type === "debit" ? "text-danger" : "text-success"}>{s.type}</td>
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

      {/* Main Transactions */}
      <div className="card p-3 shadow-sm border-0 mb-4">
        <h5 className="mb-3">All Main Transactions</h5>
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
                  <td colSpan="5" className="text-center text-muted">No main transactions available</td>
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
  );
}
