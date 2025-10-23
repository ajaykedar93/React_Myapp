// DailyTradeJournal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===== API LINKS ===== */
const API_CATEGORY = "https://express-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY = "https://express-myapp.onrender.com/api/investment_subcategory";
const API_DEPOSITS = "https://express-myapp.onrender.com/api/deposits";                // GET /:cat/:sub
const API_JOURNAL = "https://express-myapp.onrender.com/api/trading_journal";          // CRUD
const API_SUMMARY_DAY = "https://express-myapp.onrender.com/api/trading_journal/summary/day";

const colors = {
  gradient: "linear-gradient(135deg, #5f4bb6 0%, #1f5f78 100%)",
  success: "#0f8a5f",
  danger: "#b33a3a",
  warning: "#b3833a",
  info: "#0b6cff",
  light: "#f6f8fb",
  line: "#e6e9ef",
};

const PRICE_RX = /^\d+(\.\d{2})?$/; // whole number or exactly 2 decimals

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function prettyDMY(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, "");
  } catch {
    return dateStr;
  }
}
function money(n) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "-";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DailyTradeJournal() {
  /* ===== master data ===== */
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  /* ===== selection/filters ===== */
  const [filters, setFilters] = useState({
    date: todayISO(),
    category_id: "",
    subcategory_id: "",
  });

  /* ===== live rule & summary ===== */
  const [rule, setRule] = useState(null);
  const [summary, setSummary] = useState(null);

  /* ===== journal rows ===== */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===== create form (sequence_no is auto on backend) ===== */
  const [form, setForm] = useState({
    trade_date: todayISO(),
    category_id: "",
    subcategory_id: "",
    trade_entry: "",
    trade_exit: "",
    profit_amount: "",
    loss_amount: "",
    brokerage: "",
    trade_logic: "",
    mistakes: "",
    // NEW optional fields
    broker_name: "",
    segment: "",
    purpose: "",
  });

  /* ===== edit modal ===== */
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});

  /* ===== toasts / alerts ===== */
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [alert, setAlert] = useState({ show: false, title: "", message: "", type: "danger" });

  /* ===== derived ===== */
  const filteredSubcategories = useMemo(() => {
    if (!filters.category_id) return [];
    return subcategories.filter((s) => String(s.category_id) === String(filters.category_id));
  }, [filters.category_id, subcategories]);

  const nextSeq = useMemo(() => (rows?.length || 0) + 1, [rows]);

  const baseDeposit = useMemo(() => {
    if (!rule) return 0;
    const dep = Number(rule.deposit_amount || 0);
    const wd = Number(rule.withdrawal_amount || 0);
    return dep - wd;
  }, [rule]);

  /* ===== fetch masters ===== */
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

  /* ===== on cat/sub change: get rule ===== */
  useEffect(() => {
    if (!filters.category_id || !filters.subcategory_id) {
      setRule(null);
      setSummary(null);
      setRows([]);
      return;
    }
    fetchRule(filters.category_id, filters.subcategory_id);
  }, [filters.category_id, filters.subcategory_id]);

  /* ===== on any filter change: fetch summary + rows & sync create form ===== */
  useEffect(() => {
    if (!filters.category_id || !filters.subcategory_id) return;
    fetchSummary(filters.date, filters.category_id, filters.subcategory_id);
    fetchRows(filters.date, filters.category_id, filters.subcategory_id);
    setForm((f) => ({
      ...f,
      trade_date: filters.date,
      category_id: filters.category_id,
      subcategory_id: filters.subcategory_id,
    }));
  }, [filters]);

  async function fetchRule(catId, subId) {
    try {
      const { data } = await axios.get(`${API_DEPOSITS}/${catId}/${subId}`);
      setRule(data);
    } catch {
      setRule(null);
      showToast("No deposit rule for this selection", "warning");
    }
  }

  async function fetchSummary(date, catId, subId) {
    try {
      const { data } = await axios.get(API_SUMMARY_DAY, { params: { date, category_id: catId, subcategory_id: subId } });
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }

  async function fetchRows(date, catId, subId) {
    try {
      setLoading(true);
      const { data } = await axios.get(API_JOURNAL, {
        params: { date, category_id: catId, subcategory_id: subId, limit: 200 },
      });
      setRows(data || []);
    } catch {
      setRows([]);
      showToast("Failed to fetch journal entries", "danger");
    } finally {
      setLoading(false);
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

  /* ===== price validation helpers ===== */
  function isPriceOk(raw) {
    if (raw === "" || raw === null || raw === undefined) return false;
    // allow "123" or "123.45" only, and must be >= 1
    if (!PRICE_RX.test(String(raw))) return false;
    return Number(raw) >= 1;
  }
  function priceError(raw) {
    if (raw === "" || raw === null || raw === undefined) return null;
    if (Number(raw) < 1) return "Price must be ≥ 1";
    if (!PRICE_RX.test(String(raw))) return "Use whole number or exactly 2 decimals (e.g. 230 or 230.30)";
    return null;
  }

  /* ===== real-time checks ===== */
  const rt = useMemo(() => {
    const profit = Number(form.profit_amount || 0);
    const loss = Number(form.loss_amount || 0);
    const brokerage = Number(form.brokerage || 0);
    const r = rule;

    const rewardOK = r ? profit >= Number(r.reward || 0) : null;
    const riskOK = r ? loss <= Number(r.risk || 0) : null;
    const rrOK = r ? !!(rewardOK && riskOK) : null;
    const net = profit - loss - brokerage;

    const messages = [];
    if (r) {
      if (!rewardOK && profit > 0) messages.push(`Target not met (₹${money(profit)} < ₹${money(r.reward)}).`);
      if (!riskOK && loss > 0) messages.push(`Risk exceeded (₹${money(loss)} > ₹${money(r.risk)}).`);
      if (r.ratio) messages.push(`Plan R:R ${r.ratio}.`);
    }

    const bigLoss = r ? loss > Number(r.risk || 0) : false;
    const maxTradesReached = rows.length >= 3;

    // input field price errors
    const entryErr = priceError(form.trade_entry);
    const exitErr = priceError(form.trade_exit);

    return { rewardOK, riskOK, rrOK, net, messages, bigLoss, maxTradesReached, entryErr, exitErr };
    // eslint-disable-next-line
  }, [form.trade_entry, form.trade_exit, form.profit_amount, form.loss_amount, form.brokerage, rule, rows.length]);

  /* ===== handlers ===== */
  function onFilterChange(e) {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  }

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // mutually exclusive profit/loss
      if (name === "profit_amount" && Number(value) > 0) next.loss_amount = "";
      if (name === "loss_amount" && Number(value) > 0) next.profit_amount = "";
      if (name === "category_id") {
        setFilters((f) => ({ ...f, category_id: value, subcategory_id: "" }));
        next.subcategory_id = "";
      }
      if (name === "subcategory_id") setFilters((f) => ({ ...f, subcategory_id: value }));
      if (name === "trade_date") setFilters((f) => ({ ...f, date: value }));
      return next;
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "profit_amount" && Number(value) > 0) next.loss_amount = "";
      if (name === "loss_amount" && Number(value) > 0) next.profit_amount = "";
      return next;
    });
  }

  async function addJournal() {
    if (!filters.category_id || !filters.subcategory_id) {
      return showToast("Select Category & Subcategory first", "warning");
    }
    if (summary && summary.limit_left === 0) {
      return showAlert("Limit Reached", "You can only add 3 trades today for this Category/Subcategory.", "danger");
    }

    // price rules
    if (!isPriceOk(form.trade_entry) || !isPriceOk(form.trade_exit)) {
      return showToast("Entry/Exit must be whole number or exactly 2 decimals (min 1).", "danger");
    }

    // basic checks
    const hasPnL =
      (form.profit_amount && Number(form.profit_amount) > 0) ||
      (form.loss_amount && Number(form.loss_amount) > 0);
    if (!hasPnL) return showToast("Enter profit or loss (> 0)", "danger");
    if (!form.trade_logic) return showToast("Trade logic is required", "danger");

    // construct payload WITHOUT sequence_no (auto by backend)
    const payload = {
      trade_date: form.trade_date || undefined, // DB default today if omitted
      category_id: Number(filters.category_id),
      subcategory_id: Number(filters.subcategory_id),
      trade_entry: Number(form.trade_entry),
      trade_exit: Number(form.trade_exit),
      profit_amount: Number(form.profit_amount || 0),
      loss_amount: Number(form.loss_amount || 0),
      brokerage: Number(form.brokerage || 0),
      trade_logic: String(form.trade_logic),
      mistakes: form.mistakes ? String(form.mistakes) : undefined,
      // NEW optional fields
      broker_name: form.broker_name ? String(form.broker_name) : undefined,
      segment: form.segment ? String(form.segment) : undefined,
      purpose: form.purpose ? String(form.purpose) : undefined,
    };

    try {
      await axios.post(API_JOURNAL, payload);
      showToast("Trade added");
      await fetchRows(filters.date, filters.category_id, filters.subcategory_id);
      await fetchSummary(filters.date, filters.category_id, filters.subcategory_id);
      // reset inputs (keep selections)
      setForm((f) => ({
        ...f,
        trade_entry: "",
        trade_exit: "",
        profit_amount: "",
        loss_amount: "",
        brokerage: "",
        trade_logic: "",
        mistakes: "",
        broker_name: "",
        segment: "",
        purpose: "",
      }));
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to add trade";
      const hint = e?.response?.data?.hint;
      showAlert("Add Failed", `${msg}${hint ? `\n${hint}` : ""}`, "danger");
    }
  }

  function openEdit(row) {
    setEditRow(row);
    setEditForm({
      trade_date: row.trade_date?.slice(0, 10),
      sequence_no: row.sequence_no, // read-only in modal
      trade_entry: row.trade_entry,
      trade_exit: row.trade_exit,
      profit_amount: row.profit_amount,
      loss_amount: row.loss_amount,
      brokerage: row.brokerage,
      trade_logic: row.trade_logic,
      mistakes: row.mistakes || "",
      // NEW optional fields
      broker_name: row.broker_name || "",
      segment: row.segment || "",
      purpose: row.purpose || "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;

    // price rule for edit too
    if (!isPriceOk(editForm.trade_entry) || !isPriceOk(editForm.trade_exit)) {
      return showToast("Entry/Exit must be whole number or exactly 2 decimals (min 1).", "danger");
    }

    try {
      const { sequence_no, ...payload } = editForm; // do not send sequence_no (managed by backend)
      await axios.patch(`${API_JOURNAL}/${editRow.journal_id}`, payload);
      showToast("Updated");
      setEditOpen(false);
      await fetchRows(filters.date, filters.category_id, filters.subcategory_id);
      await fetchSummary(filters.date, filters.category_id, filters.subcategory_id);
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to update";
      const hint = e?.response?.data?.hint;
      showAlert("Update Failed", `${msg}${hint ? `\n${hint}` : ""}`, "danger");
    }
  }

  async function delRow(row) {
    try {
      await axios.delete(`${API_JOURNAL}/${row.journal_id}`);
      showToast("Deleted");
      await fetchRows(filters.date, filters.category_id, filters.subcategory_id);
      await fetchSummary(filters.date, filters.category_id, filters.subcategory_id);
    } catch {
      showAlert("Delete Failed", "Could not delete entry", "danger");
    }
  }

  /* ===== UI ===== */
  return (
    <div className="container-fluid py-4" style={{ background: colors.light, minHeight: "100vh" }}>
      <div className="container">
        {/* Header */}
        <div className="p-4 rounded-4 shadow-sm mb-4" style={{ backgroundImage: colors.gradient, color: "#fff" }}>
          <div className="d-flex flex-wrap align-items-center justify-content-between">
            <div>
              <h3 className="fw-bold mb-1">Trading Journal</h3>
              <div className="opacity-75">
                Date: <strong>{prettyDMY(filters.date)}</strong>
              </div>
              {filters.category_id && filters.subcategory_id && (
                <div className="opacity-75 small">Next Seq: <strong>{nextSeq}</strong></div>
              )}
            </div>

            <div className="d-flex gap-2 mt-3 mt-md-0">
              <input
                type="date"
                className="form-control form-control-sm"
                name="date"
                value={filters.date}
                onChange={onFilterChange}
                style={{ minWidth: 180 }}
              />
              <select
                className="form-select form-select-sm"
                name="category_id"
                value={filters.category_id}
                onChange={onFilterChange}
                style={{ minWidth: 210 }}
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
                style={{ minWidth: 210 }}
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

          {/* Rule & summary badges */}
          <div className="d-flex flex-wrap gap-2 mt-3">
            {rule ? (
              <>
                <span className="badge bg-light text-dark fw-semibold">Deposit: ₹{money(rule.deposit_amount)}</span>
                <span className="badge bg-light text-dark fw-semibold">Risk: ₹{money(rule.risk)}</span>
                <span className="badge bg-light text-dark fw-semibold">Reward: ₹{money(rule.reward)}</span>
                {rule.ratio && <span className="badge bg-light text-dark fw-semibold">R:R {rule.ratio}</span>}
              </>
            ) : (
              <span className="badge bg-warning text-dark fw-semibold">No rule loaded</span>
            )}
            {summary && (
              <>
                <span className={`badge fw-semibold ${summary.status === "great" ? "bg-success" : "bg-danger"}`}>
                  {summary.status === "great" ? "Great! " : "Alert! "}
                  Net Deposit: ₹{money(summary.net_deposit)}
                </span>
                <span className="badge bg-info fw-semibold">Day Net: ₹{money(summary.day_net)}</span>
                <span className="badge bg-secondary fw-semibold">Base: ₹{money(baseDeposit)}</span>
                <span className="badge bg-primary fw-semibold">Trades: {summary.trades_count}/3</span>
              </>
            )}
          </div>
        </div>

        {/* Add Form */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title fw-bold mb-3">Add Trade</h5>
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  name="trade_date"
                  className="form-control"
                  value={form.trade_date}
                  onChange={onFormChange}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Category</label>
                <select
                  name="category_id"
                  className="form-select"
                  value={form.category_id || filters.category_id}
                  onChange={onFormChange}
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
                <label className="form-label">Subcategory</label>
                <select
                  name="subcategory_id"
                  className="form-select"
                  value={form.subcategory_id || filters.subcategory_id}
                  onChange={onFormChange}
                  disabled={!form.category_id && !filters.category_id}
                >
                  <option value="">Select Subcategory</option>
                  {filteredSubcategories.map((s) => (
                    <option key={s.subcategory_id} value={s.subcategory_id}>
                      {s.subcategory_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">Entry (₹)</label>
                <input
                  type="text"
                  name="trade_entry"
                  className={`form-control ${rt.entryErr ? "is-invalid" : ""}`}
                  placeholder="e.g., 230 or 230.30"
                  value={form.trade_entry}
                  onChange={onFormChange}
                />
                {rt.entryErr && <div className="invalid-feedback">{rt.entryErr}</div>}
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Exit (₹)</label>
                <input
                  type="text"
                  name="trade_exit"
                  className={`form-control ${rt.exitErr ? "is-invalid" : ""}`}
                  placeholder="e.g., 230 or 230.30"
                  value={form.trade_exit}
                  onChange={onFormChange}
                />
                {rt.exitErr && <div className="invalid-feedback">{rt.exitErr}</div>}
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Profit (₹)</label>
                <input
                  type="number"
                  name="profit_amount"
                  className="form-control"
                  value={form.profit_amount}
                  onChange={onFormChange}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Loss (₹)</label>
                <input
                  type="number"
                  name="loss_amount"
                  className="form-control"
                  value={form.loss_amount}
                  onChange={onFormChange}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label">Brokerage (₹)</label>
                <input
                  type="number"
                  name="brokerage"
                  className="form-control"
                  value={form.brokerage}
                  onChange={onFormChange}
                />
              </div>

              {/* NEW optional fields */}
              <div className="col-12 col-md-4">
                <label className="form-label">Broker Name (optional)</label>
                <input
                  type="text"
                  name="broker_name"
                  className="form-control"
                  placeholder="e.g., Groww, Zerodha"
                  value={form.broker_name}
                  onChange={onFormChange}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Segment (optional)</label>
                <input
                  type="text"
                  name="segment"
                  className="form-control"
                  placeholder="e.g., NIFTY50, BANKNIFTY, EQ"
                  value={form.segment}
                  onChange={onFormChange}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Purpose (optional)</label>
                <input
                  type="text"
                  name="purpose"
                  className="form-control"
                  placeholder="e.g., Breakout retest, ORB"
                  value={form.purpose}
                  onChange={onFormChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Trade Logic</label>
                <input
                  type="text"
                  name="trade_logic"
                  className="form-control"
                  placeholder="Why you took the trade..."
                  value={form.trade_logic}
                  onChange={onFormChange}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Mistakes (optional)</label>
                <input
                  type="text"
                  name="mistakes"
                  className="form-control"
                  placeholder="Any mistakes to learn from..."
                  value={form.mistakes}
                  onChange={onFormChange}
                />
              </div>

              {/* Real-time check bar */}
              {rule && (
                <div className="col-12">
                  <div className="alert mb-0 py-2 px-3 border-0" style={{ background: "#eef2ff", color: "#111827" }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${rt.rrOK ? "bg-success" : "bg-danger"}`}>
                        {rt.rrOK ? "R:R OK" : "R:R Issue"}
                      </span>
                      {!rt.rrOK && rt.messages.length > 0 && (
                        <span className="small text-danger fw-semibold">{rt.messages.join(" ")}</span>
                      )}
                      {rt.rrOK && <span className="small text-success fw-semibold">Great! You’re following the plan.</span>}
                      <span className="ms-auto small text-muted">
                        Net (incl. brokerage): <strong>₹{money(rt.net)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Big loss alert */}
              {rt.bigLoss && (
                <div className="col-12">
                  <div className="alert alert-danger mb-0 py-2 fw-bold text-center">
                    Stop Trading Loss Big — Your loss exceeds the planned risk!
                  </div>
                </div>
              )}

              {/* Max trades note */}
              {summary && summary.limit_left === 0 && (
                <div className="col-12">
                  <div className="alert alert-danger mb-0 py-2">
                    You have already added 3 trades today for this Category/Subcategory.
                  </div>
                </div>
              )}

              <div className="col-12">
                <button
                  className="btn btn-primary px-4 fw-semibold btn-cta"
                  onClick={addJournal}
                  disabled={summary?.limit_left === 0}
                >
                  <span>Add Trade</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title fw-bold mb-0">Trades ({prettyDMY(filters.date)})</h5>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-secondary fw-semibold">Base: ₹{money(baseDeposit)}</span>
                <span className="badge bg-info fw-semibold">Day Net: ₹{money(summary?.day_net ?? 0)}</span>
                <span className={`badge fw-semibold ${summary?.status === "great" ? "bg-success" : "bg-danger"}`}>
                  Net Deposit: ₹{money(summary?.net_deposit ?? 0)}
                </span>
              </div>
            </div>

            <div className="table-responsive mt-3">
              <table className="table align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Seq</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th className="text-end">Profit</th>
                    <th className="text-end">Loss</th>
                    <th className="text-end">Brokerage</th>
                    <th className="text-end">Net</th>
                    <th>R:R</th>
                    <th>Broker</th>
                    <th>Segment</th>
                    <th>Purpose</th>
                    <th>Logic</th>
                    <th>Mistakes</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="15" className="text-center py-4">Loading...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="text-center py-4 text-muted">No entries yet.</td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={r.journal_id} style={{ borderTop: `1px solid ${colors.line}` }}>
                        <td>{i + 1}</td>
                        <td>{r.sequence_no}</td>
                        <td>{r.trade_entry}</td>
                        <td>{r.trade_exit}</td>
                        <td className="text-end text-success">₹{money(r.profit_amount)}</td>
                        <td className="text-end text-danger">₹{money(r.loss_amount)}</td>
                        <td className="text-end">₹{money(r.brokerage)}</td>
                        <td className={`text-end fw-semibold ${Number(r.net_pnl) >= 0 ? "text-success" : "text-danger"}`}>
                          ₹{money(r.net_pnl)}
                        </td>
                        <td>
                          {r.rr_respected ? (
                            <span className="badge bg-success">OK</span>
                          ) : (
                            <span className="badge bg-danger" title={r.violation_reason || ""}>Issue</span>
                          )}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 140 }}>{r.broker_name || "-"}</td>
                        <td className="text-truncate" style={{ maxWidth: 140 }}>{r.segment || "-"}</td>
                        <td className="text-truncate" style={{ maxWidth: 160 }}>{r.purpose || "-"}</td>
                        <td className="text-truncate" style={{ maxWidth: 220 }}>{r.trade_logic}</td>
                        <td className="text-truncate" style={{ maxWidth: 220 }}>{r.mistakes || "-"}</td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEdit(r)}>Edit</button>
                            <button className="btn btn-outline-danger" onClick={() => delRow(r)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="table-light">
                      <th colSpan="4" className="text-end">Totals</th>
                      <th className="text-end text-success">₹{money(rows.reduce((a, r) => a + Number(r.profit_amount || 0), 0))}</th>
                      <th className="text-end text-danger">₹{money(rows.reduce((a, r) => a + Number(r.loss_amount || 0), 0))}</th>
                      <th className="text-end">₹{money(rows.reduce((a, r) => a + Number(r.brokerage || 0), 0))}</th>
                      <th className="text-end fw-bold">
                        ₹{money(rows.reduce((a, r) => a + Number(r.net_pnl || 0), 0))}
                      </th>
                      <th colSpan="7"></th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Toast */}
      {toast.show && (
        <div
          className="position-fixed top-50 start-50 translate-middle p-3 rounded-4 shadow"
          style={{
            zIndex: 1080,
            minWidth: 300,
            background: toast.type === "success" ? colors.success : toast.type === "warning" ? colors.warning : colors.danger,
            color: "#fff",
            textAlign: "center",
            fontWeight: 700,
            animation: "fadeInOut 2s",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Alert Modal */}
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
                <button className="btn btn-secondary" onClick={closeAlert}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h6 className="modal-title m-0">Edit Trade</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setEditOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      name="trade_date"
                      className="form-control"
                      value={editForm.trade_date || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Seq. No</label>
                    <input
                      type="number"
                      name="sequence_no"
                      className="form-control"
                      value={editForm.sequence_no || ""}
                      onChange={() => {}}
                      readOnly
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Entry (₹)</label>
                    <input
                      type="text"
                      name="trade_entry"
                      className="form-control"
                      placeholder="230 or 230.30"
                      value={editForm.trade_entry || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Exit (₹)</label>
                    <input
                      type="text"
                      name="trade_exit"
                      className="form-control"
                      placeholder="230 or 230.30"
                      value={editForm.trade_exit || ""}
                      onChange={onEditChange}
                    />
                  </div>

                  <div className="col-4 col-md-3">
                    <label className="form-label">Profit (₹)</label>
                    <input
                      type="number"
                      name="profit_amount"
                      className="form-control"
                      value={editForm.profit_amount || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-4 col-md-3">
                    <label className="form-label">Loss (₹)</label>
                    <input
                      type="number"
                      name="loss_amount"
                      className="form-control"
                      value={editForm.loss_amount || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-4 col-md-3">
                    <label className="form-label">Brokerage (₹)</label>
                    <input
                      type="number"
                      name="brokerage"
                      className="form-control"
                      value={editForm.brokerage || ""}
                      onChange={onEditChange}
                    />
                  </div>

                  {/* NEW optional fields in edit */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Broker Name (optional)</label>
                    <input
                      type="text"
                      name="broker_name"
                      className="form-control"
                      value={editForm.broker_name || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Segment (optional)</label>
                    <input
                      type="text"
                      name="segment"
                      className="form-control"
                      value={editForm.segment || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Purpose (optional)</label>
                    <input
                      type="text"
                      name="purpose"
                      className="form-control"
                      value={editForm.purpose || ""}
                      onChange={onEditChange}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Trade Logic</label>
                    <input
                      type="text"
                      name="trade_logic"
                      className="form-control"
                      value={editForm.trade_logic || ""}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Mistakes (optional)</label>
                    <input
                      type="text"
                      name="mistakes"
                      className="form-control"
                      value={editForm.mistakes || ""}
                      onChange={onEditChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOut { 0%,100%{opacity:0} 10%,90%{opacity:1} }
        .btn-cta {
          position: relative;
          transition: transform .12s ease, box-shadow .2s ease;
          box-shadow: 0 8px 18px rgba(95,75,182,.25);
          border-radius: .7rem;
        }
        .btn-cta:active {
          transform: translateY(1px) scale(.99);
          box-shadow: 0 4px 10px rgba(95,75,182,.25);
        }
      `}</style>
    </div>
  );
}
