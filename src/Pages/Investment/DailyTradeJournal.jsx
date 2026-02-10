// DailyTradeJournal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===== API LINKS ===== */
const API_CATEGORY =
  "https://express-backend-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY =
  "https://express-backend-myapp.onrender.com/api/investment_subcategory";
const API_DEPOSITS =
  "https://express-backend-myapp.onrender.com/api/deposits"; // GET /:cat/:sub
const API_JOURNAL =
  "https://express-backend-myapp.onrender.com/api/trading_journal"; // CRUD
const API_SUMMARY_DAY =
  "https://express-backend-myapp.onrender.com/api/trading_journal/summary/day";

const colors = {
  gradient: "linear-gradient(135deg,#5f4bb6 0%,#7a5af5 35%,#1f5f78 100%)",
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
    return d
      .toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/,/g, "");
  } catch {
    return dateStr;
  }
}
function money(n) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "-";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** show value only if present (avoid "-", empty) */
function isPresent(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s === "-" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined")
    return false;
  return true;
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
    broker_name: "",
    segment: "",
    purpose: "",
  });

  /* ===== edit modal ===== */
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});

  /* ===== toasts / alerts ===== */
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "danger",
  });

  /* ===== derived ===== */
  const filteredSubcategories = useMemo(() => {
    if (!filters.category_id) return [];
    return subcategories.filter(
      (s) => String(s.category_id) === String(filters.category_id)
    );
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
        const [c, s] = await Promise.all([
          axios.get(API_CATEGORY),
          axios.get(API_SUBCATEGORY),
        ]);
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
    // eslint-disable-next-line
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
    // eslint-disable-next-line
  }, [filters.date, filters.category_id, filters.subcategory_id]);

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
      const { data } = await axios.get(API_SUMMARY_DAY, {
        params: { date, category_id: catId, subcategory_id: subId },
      });
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
    if (!PRICE_RX.test(String(raw))) return false;
    return Number(raw) >= 1;
  }
  function priceError(raw) {
    if (raw === "" || raw === null || raw === undefined) return null;
    if (Number(raw) < 1) return "Price must be ≥ 1";
    if (!PRICE_RX.test(String(raw)))
      return "Use whole number or exactly 2 decimals (e.g. 230 or 230.30)";
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
      if (!rewardOK && profit > 0)
        messages.push(`Target not met (₹${money(profit)} < ₹${money(r.reward)}).`);
      if (!riskOK && loss > 0)
        messages.push(`Risk exceeded (₹${money(loss)} > ₹${money(r.risk)}).`);
      if (r.ratio) messages.push(`Plan R:R ${r.ratio}.`);
    }

    const bigLoss = r ? loss > Number(r.risk || 0) : false;

    const entryErr = priceError(form.trade_entry);
    const exitErr = priceError(form.trade_exit);

    return { rewardOK, riskOK, rrOK, net, messages, bigLoss, entryErr, exitErr };
    // eslint-disable-next-line
  }, [
    form.trade_entry,
    form.trade_exit,
    form.profit_amount,
    form.loss_amount,
    form.brokerage,
    rule,
  ]);

  /* ===== handlers ===== */
  function onFilterChange(e) {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  }

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
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
      return showAlert(
        "Limit Reached",
        "You can only add 3 trades today for this Category/Subcategory.",
        "danger"
      );
    }
    if (!isPriceOk(form.trade_entry) || !isPriceOk(form.trade_exit)) {
      return showToast(
        "Entry/Exit must be whole number or exactly 2 decimals (min 1).",
        "danger"
      );
    }

    const hasPnL =
      (form.profit_amount && Number(form.profit_amount) > 0) ||
      (form.loss_amount && Number(form.loss_amount) > 0);
    if (!hasPnL) return showToast("Enter profit or loss (> 0)", "danger");
    if (!form.trade_logic) return showToast("Trade logic is required", "danger");

    const payload = {
      trade_date: form.trade_date || undefined,
      category_id: Number(filters.category_id),
      subcategory_id: Number(filters.subcategory_id),
      trade_entry: Number(form.trade_entry),
      trade_exit: Number(form.trade_exit),
      profit_amount: Number(form.profit_amount || 0),
      loss_amount: Number(form.loss_amount || 0),
      brokerage: Number(form.brokerage || 0),
      trade_logic: String(form.trade_logic),
      mistakes: form.mistakes ? String(form.mistakes) : undefined,
      broker_name: form.broker_name ? String(form.broker_name) : undefined,
      segment: form.segment ? String(form.segment) : undefined,
      purpose: form.purpose ? String(form.purpose) : undefined,
    };

    try {
      await axios.post(API_JOURNAL, payload);
      showToast("Trade added");
      await fetchRows(filters.date, filters.category_id, filters.subcategory_id);
      await fetchSummary(filters.date, filters.category_id, filters.subcategory_id);

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
      sequence_no: row.sequence_no,
      trade_entry: row.trade_entry,
      trade_exit: row.trade_exit,
      profit_amount: row.profit_amount,
      loss_amount: row.loss_amount,
      brokerage: row.brokerage,
      trade_logic: row.trade_logic,
      mistakes: row.mistakes || "",
      broker_name: row.broker_name || "",
      segment: row.segment || "",
      purpose: row.purpose || "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    if (!isPriceOk(editForm.trade_entry) || !isPriceOk(editForm.trade_exit)) {
      return showToast(
        "Entry/Exit must be whole number or exactly 2 decimals (min 1).",
        "danger"
      );
    }
    try {
      const { sequence_no, ...payload } = editForm;
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

  /* ===== RULE BADGES (hide empty fields) ===== */
  const ruleBadges = useMemo(() => {
    if (!rule) return [];
    const b = [];
    if (isPresent(rule.deposit_amount))
      b.push({ text: `Deposit: ₹${money(rule.deposit_amount)}`, cls: "bg-light text-dark" });
    if (isPresent(rule.risk))
      b.push({ text: `Risk: ₹${money(rule.risk)}`, cls: "bg-light text-dark" });
    if (isPresent(rule.reward))
      b.push({ text: `Reward: ₹${money(rule.reward)}`, cls: "bg-light text-dark" });
    if (isPresent(rule.ratio)) b.push({ text: `R:R ${rule.ratio}`, cls: "bg-light text-dark" });
    return b;
  }, [rule]);

  const summaryBadges = useMemo(() => {
    if (!summary) return [];
    const b = [];
    if (isPresent(summary.net_deposit)) {
      b.push({
        text: `Net Deposit: ₹${money(summary.net_deposit)}`,
        cls: summary.status === "great" ? "bg-success" : "bg-danger",
      });
    }
    if (isPresent(summary.day_net)) b.push({ text: `Day Net: ₹${money(summary.day_net)}`, cls: "bg-info" });
    b.push({ text: `Base: ₹${money(baseDeposit)}`, cls: "bg-secondary" });
    if (isPresent(summary.trades_count))
      b.push({ text: `Trades: ${summary.trades_count}/3`, cls: "bg-primary" });
    return b;
  }, [summary, baseDeposit]);

  const hasRows = rows && rows.length > 0;

  /* ===== UI ===== */
  return (
    <div className="dj-page">
      <div className="dj-shell">
        {/* HEADER (mobile full width, sticky) */}
        <div className="dj-header shadow-sm">
          <div className="dj-head-row">
            <div className="dj-title">
              <div className="dj-h1">Trading Journal</div>
              <div className="dj-sub">
                Date: <strong>{prettyDMY(filters.date)}</strong>
              </div>
              {filters.category_id && filters.subcategory_id ? (
                <div className="dj-sub small">
                  Next Seq: <strong>{nextSeq}</strong>
                </div>
              ) : null}
            </div>

            <div className="dj-filters">
              <input
                type="date"
                className="form-control form-control-sm dj-input"
                name="date"
                value={filters.date}
                onChange={onFilterChange}
                aria-label="Trade Date"
              />
              <select
                className="form-select form-select-sm dj-input"
                name="category_id"
                value={filters.category_id}
                onChange={onFilterChange}
                aria-label="Category"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm dj-input"
                name="subcategory_id"
                value={filters.subcategory_id}
                onChange={onFilterChange}
                disabled={!filters.category_id}
                aria-label="Subcategory"
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

          {/* badges only when data present */}
          <div className="dj-badges">
            {rule ? (
              ruleBadges.length ? (
                ruleBadges.map((b, idx) => (
                  <span key={`rb-${idx}`} className={`badge fw-semibold ${b.cls}`}>
                    {b.text}
                  </span>
                ))
              ) : (
                <span className="badge bg-warning text-dark fw-semibold">No rule details</span>
              )
            ) : (
              <span className="badge bg-warning text-dark fw-semibold">No rule loaded</span>
            )}

            {summaryBadges.map((b, idx) => (
              <span key={`sb-${idx}`} className={`badge fw-semibold ${b.cls}`}>
                {b.text}
              </span>
            ))}
          </div>
        </div>

        {/* CONTENT (remove bottom padding under list) */}
        <div className="dj-content">
          {/* ADD FORM */}
          <div className="dj-card shadow-sm">
            <div className="dj-card-head">
              <div className="dj-card-title">Add Trade</div>
            </div>

            <div className="dj-card-body">
              <div className="row g-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    name="trade_date"
                    className="form-control"
                    value={form.trade_date}
                    onChange={onFormChange}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
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
                    placeholder="230 or 230.30"
                    value={form.trade_entry}
                    onChange={onFormChange}
                    inputMode="decimal"
                  />
                  {rt.entryErr && <div className="invalid-feedback">{rt.entryErr}</div>}
                </div>

                <div className="col-6 col-md-3">
                  <label className="form-label">Exit (₹)</label>
                  <input
                    type="text"
                    name="trade_exit"
                    className={`form-control ${rt.exitErr ? "is-invalid" : ""}`}
                    placeholder="230 or 230.30"
                    value={form.trade_exit}
                    onChange={onFormChange}
                    inputMode="decimal"
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
                    inputMode="numeric"
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
                    inputMode="numeric"
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
                    inputMode="numeric"
                  />
                </div>

                {/* Optional fields (hide label space when empty? we keep them in form) */}
                <div className="col-12 col-md-4">
                  <label className="form-label">Broker Name (optional)</label>
                  <input
                    type="text"
                    name="broker_name"
                    className="form-control"
                    placeholder="Groww, Zerodha..."
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
                    placeholder="NIFTY, BANKNIFTY..."
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
                    placeholder="ORB, Breakout..."
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
                    placeholder="What to improve..."
                    value={form.mistakes}
                    onChange={onFormChange}
                  />
                </div>

                {/* Real-time check bar ONLY if there is something to show */}
                {rule && (isPresent(form.profit_amount) || isPresent(form.loss_amount) || isPresent(form.brokerage)) ? (
                  <div className="col-12">
                    <div className="dj-rtbar">
                      <span className={`badge ${rt.rrOK ? "bg-success" : "bg-danger"}`}>
                        {rt.rrOK ? "R:R OK" : "R:R Issue"}
                      </span>

                      {!rt.rrOK && rt.messages.length > 0 ? (
                        <span className="dj-rttext text-danger">{rt.messages.join(" ")}</span>
                      ) : rt.rrOK ? (
                        <span className="dj-rttext text-success">
                          Great! You’re following the plan.
                        </span>
                      ) : null}

                      <span className="dj-rtnet">
                        Net: <strong>₹{money(rt.net)}</strong>
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Big loss alert */}
                {rt.bigLoss ? (
                  <div className="col-12">
                    <div className="alert alert-danger mb-0 py-2 fw-bold text-center">
                      Stop Trading Loss Big — Your loss exceeds the planned risk!
                    </div>
                  </div>
                ) : null}

                {/* Max trades note */}
                {summary && summary.limit_left === 0 ? (
                  <div className="col-12">
                    <div className="alert alert-danger mb-0 py-2">
                      You have already added 3 trades today for this Category/Subcategory.
                    </div>
                  </div>
                ) : null}

                <div className="col-12">
                  <button
                    className="btn btn-primary fw-semibold dj-cta"
                    onClick={addJournal}
                    disabled={summary?.limit_left === 0}
                  >
                    Add Trade
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LIST (edge-to-edge feeling on mobile, no extra bottom padding) */}
          <div className="dj-card shadow-sm dj-card-tight">
            <div className="dj-card-head dj-card-head-row">
              <div>
                <div className="dj-card-title">Trades ({prettyDMY(filters.date)})</div>
                <div className="dj-muted small">
                  {filters.category_id && filters.subcategory_id
                    ? "Entries for selected category/subcategory"
                    : "Select category & subcategory to view trades"}
                </div>
              </div>

              {/* show chips only if summary exists */}
              {summary ? (
                <div className="dj-chips">
                  <span className="badge bg-secondary fw-semibold">Base: ₹{money(baseDeposit)}</span>
                  <span className="badge bg-info fw-semibold">Day Net: ₹{money(summary?.day_net ?? 0)}</span>
                  <span
                    className={`badge fw-semibold ${
                      summary?.status === "great" ? "bg-success" : "bg-danger"
                    }`}
                  >
                    Net Deposit: ₹{money(summary?.net_deposit ?? 0)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Desktop table */}
            <div className="d-none d-md-block">
              <div className="table-responsive">
                <table className="table align-middle mb-0 journal-table">
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
                        <td colSpan="15" className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan="15" className="text-center py-4 text-muted">
                          No entries yet.
                        </td>
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
                          <td
                            className={`text-end fw-semibold ${
                              Number(r.net_pnl) >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            ₹{money(r.net_pnl)}
                          </td>
                          <td>
                            {r.rr_respected ? (
                              <span className="badge bg-success">OK</span>
                            ) : (
                              <span className="badge bg-danger" title={r.violation_reason || ""}>
                                Issue
                              </span>
                            )}
                          </td>

                          {/* show only if value present, else keep short dash on desktop */}
                          <td className="text-truncate" style={{ maxWidth: 140 }}>
                            {isPresent(r.broker_name) ? r.broker_name : "—"}
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 140 }}>
                            {isPresent(r.segment) ? r.segment : "—"}
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 160 }}>
                            {isPresent(r.purpose) ? r.purpose : "—"}
                          </td>

                          <td className="text-truncate" style={{ maxWidth: 220 }}>
                            {r.trade_logic}
                          </td>

                          <td className="text-truncate" style={{ maxWidth: 220 }}>
                            {isPresent(r.mistakes) ? r.mistakes : "—"}
                          </td>

                          <td className="text-center">
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary" onClick={() => openEdit(r)}>
                                Edit
                              </button>
                              <button className="btn btn-outline-danger" onClick={() => delRow(r)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {rows.length > 0 ? (
                    <tfoot>
                      <tr className="table-light">
                        <th colSpan="4" className="text-end">
                          Totals
                        </th>
                        <th className="text-end text-success">
                          ₹{money(rows.reduce((a, r) => a + Number(r.profit_amount || 0), 0))}
                        </th>
                        <th className="text-end text-danger">
                          ₹{money(rows.reduce((a, r) => a + Number(r.loss_amount || 0), 0))}
                        </th>
                        <th className="text-end">
                          ₹{money(rows.reduce((a, r) => a + Number(r.brokerage || 0), 0))}
                        </th>
                        <th className="text-end fw-bold">
                          ₹{money(rows.reduce((a, r) => a + Number(r.net_pnl || 0), 0))}
                        </th>
                        <th colSpan="7"></th>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </div>

            {/* Mobile list: attractive cards, show ONLY fields if present */}
            <div className="d-md-none">
              {loading ? (
                <div className="text-center text-muted py-4">Loading...</div>
              ) : !hasRows ? (
                <div className="text-center text-muted py-4">No entries yet.</div>
              ) : (
                <div className="dj-moblist">
                  {rows.map((r, i) => {
                    const netPositive = Number(r.net_pnl) >= 0;
                    return (
                      <div className="dj-item" key={r.journal_id}>
                        <div className="dj-item-top">
                          <div className="dj-item-left">
                            <div className="dj-item-badges">
                              <span className="dj-index">#{i + 1}</span>
                              <span className="badge bg-dark">Seq {r.sequence_no}</span>
                              {r.rr_respected ? (
                                <span className="badge bg-success">R:R OK</span>
                              ) : (
                                <span className="badge bg-danger">R:R Issue</span>
                              )}
                            </div>

                            <div className="dj-mini">
                              <span className="dj-mini-k">Entry</span>
                              <span className="dj-mini-v">₹{money(r.trade_entry)}</span>
                              <span className="dj-dot">•</span>
                              <span className="dj-mini-k">Exit</span>
                              <span className="dj-mini-v">₹{money(r.trade_exit)}</span>
                            </div>
                          </div>

                          <div className="dj-item-right">
                            <div className={`dj-net ${netPositive ? "pos" : "neg"}`}>
                              ₹{money(r.net_pnl)}
                            </div>
                            <div className="dj-pnlrow">
                              {Number(r.profit_amount || 0) > 0 ? (
                                <span className="dj-pill pos">+₹{money(r.profit_amount)}</span>
                              ) : null}
                              {Number(r.loss_amount || 0) > 0 ? (
                                <span className="dj-pill neg">-₹{money(r.loss_amount)}</span>
                              ) : null}
                              {Number(r.brokerage || 0) > 0 ? (
                                <span className="dj-pill neu">Br ₹{money(r.brokerage)}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Details: render ONLY if present */}
                        <div className="dj-item-body">
                          {isPresent(r.broker_name) ? (
                            <div className="dj-field">
                              <span className="dj-lbl">Broker</span>
                              <span className="dj-val">{r.broker_name}</span>
                            </div>
                          ) : null}

                          {isPresent(r.segment) ? (
                            <div className="dj-field">
                              <span className="dj-lbl">Segment</span>
                              <span className="dj-val">{r.segment}</span>
                            </div>
                          ) : null}

                          {isPresent(r.purpose) ? (
                            <div className="dj-field">
                              <span className="dj-lbl">Purpose</span>
                              <span className="dj-val">{r.purpose}</span>
                            </div>
                          ) : null}

                          {isPresent(r.trade_logic) ? (
                            <div className="dj-field dj-full">
                              <span className="dj-lbl">Logic</span>
                              <span className="dj-val">{r.trade_logic}</span>
                            </div>
                          ) : null}

                          {isPresent(r.mistakes) ? (
                            <div className="dj-field dj-full">
                              <span className="dj-lbl">Mistakes</span>
                              <span className="dj-val">{r.mistakes}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="dj-item-actions">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => delRow(r)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Centered Toast */}
        {toast.show && (
          <div
            className="position-fixed top-50 start-50 translate-middle p-3 rounded-4 shadow text-white fw-bold text-center"
            style={{
              zIndex: 1080,
              minWidth: 260,
              background:
                toast.type === "success"
                  ? colors.success
                  : toast.type === "warning"
                  ? colors.warning
                  : colors.danger,
              animation: "fadeInOut 2s",
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Alert Modal */}
        {alert.show && (
          <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div
                  className={`modal-header ${
                    alert.type === "danger" ? "bg-danger" : "bg-warning"
                  } text-white`}
                >
                  <h6 className="modal-title m-0">{alert.title}</h6>
                  <button type="button" className="btn-close btn-close-white" onClick={closeAlert}></button>
                </div>
                <div className="modal-body">
                  <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                    {alert.message}
                  </pre>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeAlert}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editOpen && (
          <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h6 className="modal-title m-0">Edit Trade</h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setEditOpen(false)}
                  ></button>
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
                        inputMode="decimal"
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
                        inputMode="decimal"
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
                  <button className="btn btn-outline-secondary" onClick={() => setEditOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={saveEdit}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSS */}
        <style>{`
          @keyframes fadeInOut {0%,100%{opacity:0}10%,90%{opacity:1}}
          *{box-sizing:border-box}
          html,body{height:100%}
          body{margin:0; overflow-x:hidden}

          .dj-page{
            min-height:100vh;
            background:${colors.light};
            overflow-x:hidden;
          }
          .dj-shell{
            width:100%;
            max-width:1100px;
            margin:0 auto;
          }

          /* Header: full width on mobile, card on desktop */
          .dj-header{
            background:${colors.gradient};
            color:#fff;
            border-radius:0;
            padding:14px 12px;
            position:sticky;
            top:0;
            z-index:60;
          }
          @media(min-width:768px){
            .dj-header{
              position:relative;
              top:auto;
              border-radius:18px;
              margin:16px 16px 0;
              padding:18px 18px;
            }
          }

          .dj-head-row{
            display:flex;
            flex-direction:column;
            gap:12px;
          }
          @media(min-width:768px){
            .dj-head-row{
              flex-direction:row;
              justify-content:space-between;
              align-items:flex-start;
              gap:16px;
            }
          }

          .dj-h1{
            font-weight:900;
            font-size:1.15rem;
            line-height:1.2;
            letter-spacing:.2px;
          }
          @media(min-width:768px){
            .dj-h1{ font-size:1.3rem; }
          }

          .dj-sub{
            opacity:.85;
            font-size:.92rem;
            margin-top:4px;
          }

          .dj-filters{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
          }
          .dj-filters input[type="date"]{ grid-column:1 / -1; }
          @media(min-width:576px){
            .dj-filters{
              grid-template-columns: 170px 1fr 1fr;
            }
            .dj-filters input[type="date"]{ grid-column:auto; }
          }

          .dj-input{
            border:none !important;
            outline:none !important;
            box-shadow:none !important;
            border-radius:12px;
            padding:10px 12px;
          }

          .dj-badges{
            display:flex;
            flex-wrap:wrap;
            gap:8px;
            margin-top:12px;
          }

          .dj-content{
            padding:12px;         /* mobile padding */
            padding-bottom:12px;  /* no extra bottom padding under list */
          }
          @media(min-width:768px){
            .dj-content{ padding:16px; }
          }

          .dj-card{
            background:#fff;
            border-radius:16px;
            overflow:hidden;
          }
          .dj-card + .dj-card{ margin-top:14px; }
          .dj-card-tight{ margin-bottom:0; } /* remove gap below list */

          .dj-card-head{
            padding:14px 14px 10px;
            border-bottom:1px solid ${colors.line};
          }
          .dj-card-head-row{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:10px;
            flex-wrap:wrap;
          }
          .dj-card-title{
            font-weight:900;
            font-size:1.02rem;
          }
          .dj-muted{ opacity:.75; }

          .dj-card-body{
            padding:14px;
          }

          .dj-cta{
            width:100%;
            border-radius:14px;
            padding:12px 14px;
            box-shadow: 0 10px 22px rgba(95,75,182,.22);
            transition: transform .12s ease, box-shadow .2s ease;
          }
          .dj-cta:active{
            transform: translateY(1px) scale(.99);
            box-shadow: 0 5px 12px rgba(95,75,182,.22);
          }

          .dj-rtbar{
            background:#eef2ff;
            color:#111827;
            border-radius:14px;
            padding:10px 12px;
            display:flex;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
          }
          .dj-rttext{
            font-weight:700;
            font-size:.88rem;
          }
          .dj-rtnet{
            margin-left:auto;
            font-size:.88rem;
            opacity:.8;
          }

          .dj-chips{
            display:flex;
            flex-wrap:wrap;
            gap:8px;
          }

          /* Mobile trade cards */
          .dj-moblist{
            padding:12px;
            display:flex;
            flex-direction:column;
            gap:12px;
          }
          .dj-item{
            border:1px solid ${colors.line};
            border-radius:16px;
            padding:12px;
            box-shadow: 0 8px 18px rgba(0,0,0,.05);
          }
          .dj-item-top{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:10px;
          }
          .dj-item-badges{
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-bottom:8px;
          }
          .dj-index{
            font-weight:900;
            opacity:.75;
            font-size:.9rem;
          }
          .dj-mini{
            display:flex;
            gap:6px;
            align-items:baseline;
            flex-wrap:wrap;
            font-size:.92rem;
          }
          .dj-mini-k{
            opacity:.7;
            font-weight:700;
          }
          .dj-mini-v{
            font-weight:900;
          }
          .dj-dot{
            opacity:.4;
            margin:0 2px;
          }

          .dj-net{
            text-align:right;
            font-weight:900;
            font-size:1.05rem;
            line-height:1.1;
            margin-bottom:8px;
          }
          .dj-net.pos{ color:${colors.success}; }
          .dj-net.neg{ color:${colors.danger}; }

          .dj-pnlrow{
            display:flex;
            gap:6px;
            justify-content:flex-end;
            flex-wrap:wrap;
          }
          .dj-pill{
            padding:6px 8px;
            border-radius:999px;
            font-size:.78rem;
            font-weight:900;
          }
          .dj-pill.pos{ background:rgba(15,138,95,.12); color:${colors.success}; }
          .dj-pill.neg{ background:rgba(179,58,58,.12); color:${colors.danger}; }
          .dj-pill.neu{ background:rgba(11,108,255,.10); color:${colors.info}; }

          .dj-item-body{
            margin-top:10px;
            display:flex;
            flex-direction:column;
            gap:8px;
          }
          .dj-field{
            display:flex;
            gap:10px;
            align-items:flex-start;
          }
          .dj-field.dj-full{
            flex-direction:column;
            gap:4px;
          }
          .dj-lbl{
            min-width:72px;
            font-weight:900;
            opacity:.7;
            font-size:.82rem;
          }
          .dj-val{
            font-size:.92rem;
            line-height:1.35;
            word-break:break-word;
          }

          .dj-item-actions{
            display:flex;
            gap:10px;
            margin-top:12px;
          }
          .dj-item-actions .btn{
            flex:1;
            border-radius:12px;
          }

          /* Mobile enhancements for inputs */
          @media (max-width: 576px) {
            .form-control, .form-select { font-size: 14px; }
            .badge { font-size: 12px; }
            .modal-content { border-radius: .85rem; }
            .modal-body { padding: 0.75rem; }
            .modal-header, .modal-footer { padding: .6rem .8rem; }
          }
        `}</style>
      </div>
    </div>
  );
}
