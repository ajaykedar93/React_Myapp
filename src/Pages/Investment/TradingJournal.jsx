// TradingJournal.jsx
// Base URL: http://localhost:5000
// Uses Auth:
//   const { user } = useAuth();
//   const userId = user?.id ?? user?.user_id ?? null;
//
// APIs:
//   POST   /api/journal
//   GET    /api/journal
//   GET    /api/journal?month=YYYY-MM
//   PUT    /api/journal/:id
//   DELETE /api/journal/:id
//
// Master APIs (✅ SAME as Investment pages):
//   GET /api/investment/category
//   GET /api/investment/subcategory?category_id=1
//   GET /api/plan  (optional plan dropdown)
//
// UI:
// - Bootstrap responsive
// - Mobile cards + Desktop table
// - Center modals & center toast
// - Soft borders (no dark border)
// - Colors:
//    Profit -> green, Loss -> red, Brokerage -> dark yellow
//    Mistakes -> faint red background, Trade logic -> sky blue background
// - Category/Subcategory show TEXT (not ids)

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function TradingJournal() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id ?? null;

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (userId) h["x-user-id"] = String(userId);
    return h;
  }, [userId]);

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [plans, setPlans] = useState([]);

  // cache of all subcategories we have seen so list can show names even if different filter selected
  const [allSubcategories, setAllSubcategories] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const [month, setMonth] = useState(""); // YYYY-MM (optional filter)

  const [toast, setToast] = useState(null); // {type, message}
  const [confirm, setConfirm] = useState(null); // {title, message, onConfirm}
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    category_id: "",
    subcategory_id: "",
    plan_id: "",
    trade_date: "",

    profit: "0",
    loss: "0",
    brokerage: "0",
    trades_count: "1",

    side: "BUY",
    entry_price: "",
    exit_price: "",
    segment: "",
    trade_logic: "",
    mistakes: "",

    strike_price: "",
    option_type: "", // CALL/PUT
  });

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

  // ---- helpers
  const toNum = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
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

  const fmtDate = (v) => {
    if (!v) return "—";
    // if already YYYY-MM-DD keep it
    return String(v);
  };

  // ---- maps for names (TEXT only)
  const categoryNameById = useMemo(() => {
    const m = new Map();
    (categories || []).forEach((c) => {
      const id = c.category_id ?? c.id;
      const name = c.category_name ?? c.name ?? c.title;
      if (id != null && name != null) m.set(Number(id), String(name));
    });
    return m;
  }, [categories]);

  const subNameById = useMemo(() => {
    const m = new Map();
    const fill = (arr) => {
      (arr || []).forEach((s) => {
        const id = s.subcategory_id ?? s.id;
        const name = s.subcategory_name ?? s.name ?? s.title;
        if (id != null && name != null) m.set(Number(id), String(name));
      });
    };
    fill(allSubcategories);
    fill(subcategories);
    return m;
  }, [allSubcategories, subcategories]);

  function getCategoryName(id) {
    if (!id) return "—";
    return categoryNameById.get(Number(id)) || "Unknown";
  }

  // ✅ IMPORTANT: Only TEXT, never show id
  function getSubName(id) {
    if (!id) return "—";
    const name = subNameById.get(Number(id));
    return name ? name : "Unknown";
  }

  // ---- options detection
  const selectedSub = useMemo(() => {
    const sid = Number(form.subcategory_id || selectedSubcategoryId || 0);
    return subcategories.find((s) => Number(s.subcategory_id) === sid) || null;
  }, [form.subcategory_id, selectedSubcategoryId, subcategories]);

  const isOptionsSub = useMemo(() => {
    if (selectedSub && typeof selectedSub.is_options !== "undefined") return !!selectedSub.is_options;
    const name = (selectedSub?.subcategory_name || selectedSub?.name || "").toLowerCase();
    return name.includes("option");
  }, [selectedSub]);

  const filteredPlans = useMemo(() => {
    const sid = Number(form.subcategory_id || selectedSubcategoryId || 0);
    if (!sid) return plans;
    return plans.filter((p) => Number(p.subcategory_id) === sid);
  }, [plans, form.subcategory_id, selectedSubcategoryId]);

  // ---- loaders (✅ Investment APIs)
  async function loadCategories() {
    const data = await safeFetch("/api/investment/category", { method: "GET" });
    setCategories(data?.data || []);
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    const data = await safeFetch(`/api/investment/subcategory?category_id=${categoryId}`, { method: "GET" });
    const list = data?.data || [];
    setSubcategories(list);

    // cache for list display
    setAllSubcategories((prev) => {
      const map = new Map(prev.map((x) => [Number(x.subcategory_id ?? x.id), x]));
      for (const s of list) {
        const id = Number(s.subcategory_id ?? s.id);
        if (Number.isFinite(id)) map.set(id, s);
      }
      return Array.from(map.values());
    });
  }

  async function loadPlans() {
    const data = await safeFetch("/api/plan", { method: "GET" });
    setPlans(data?.data || []);
  }

  async function loadJournal() {
    try {
      setLoading(true);
      const q = month ? `?month=${encodeURIComponent(month)}` : "";
      const data = await safeFetch(`/api/journal${q}`, { method: "GET" });
      setList(data?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load journal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        await Promise.all([loadCategories(), loadPlans()]);
      } catch (e) {
        showToast("danger", e.message || "Failed to load master data");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, month]);

  // When selecting category in top filter, load its subcategories
  useEffect(() => {
    if (!userId) return;
    if (!selectedCategoryId) {
      setSelectedSubcategoryId("");
      setSubcategories([]);
      return;
    }
    loadSubcategories(selectedCategoryId).catch((e) => showToast("danger", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, userId]);

  // Form controls
  function setF(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function resetForm() {
    setForm({
      category_id: selectedCategoryId || "",
      subcategory_id: selectedSubcategoryId || "",
      plan_id: "",
      trade_date: "",

      profit: "0",
      loss: "0",
      brokerage: "0",
      trades_count: "1",

      side: "BUY",
      entry_price: "",
      exit_price: "",
      segment: "",
      trade_logic: "",
      mistakes: "",

      strike_price: "",
      option_type: "",
    });
  }

  // keep form in sync for quick entry
  useEffect(() => {
    setForm((p) => ({ ...p, category_id: selectedCategoryId || p.category_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  useEffect(() => {
    setForm((p) => ({ ...p, subcategory_id: selectedSubcategoryId || p.subcategory_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategoryId]);

  // ---- CRUD
  async function createEntry(e) {
    e.preventDefault();

    const payload = {
      category_id: Number(form.category_id),
      subcategory_id: Number(form.subcategory_id),
      plan_id: form.plan_id ? Number(form.plan_id) : null,
      trade_date: form.trade_date || undefined,

      profit: toNum(form.profit) ?? 0,
      loss: toNum(form.loss) ?? 0,
      brokerage: toNum(form.brokerage) ?? 0,
      trades_count: toNum(form.trades_count) ?? 1,

      side: form.side,
      entry_price: toNum(form.entry_price),
      exit_price: toNum(form.exit_price),

      segment: form.segment?.trim() || null,
      trade_logic: (form.trade_logic || "").trim(),
      mistakes: form.mistakes?.trim() || null,

      strike_price: isOptionsSub ? toNum(form.strike_price) : null,
      option_type: isOptionsSub ? (form.option_type || null) : null,
    };

    if (!payload.category_id) return showToast("warning", "Category required");
    if (!payload.subcategory_id) return showToast("warning", "Subcategory required");
    if (!payload.trade_logic) return showToast("warning", "Trade logic required");
    if (!payload.entry_price || payload.entry_price <= 0) return showToast("warning", "Entry price required");
    if (!payload.exit_price || payload.exit_price <= 0) return showToast("warning", "Exit price required");

    if (isOptionsSub) {
      if (!payload.strike_price) return showToast("warning", "Strike price required for Options");
      if (!payload.option_type) return showToast("warning", "Option type (CALL/PUT) required");
    }

    try {
      await safeFetch("/api/journal", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("success", "Entry added ✅");
      resetForm();
      await loadJournal();
    } catch (e2) {
      showToast("danger", e2.message || "Create failed");
    }
  }

  function openEdit(row) {
    setEditing(row);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;

    const subForEdit =
      subcategories.find((s) => Number(s.subcategory_id) === Number(editing.subcategory_id)) || null;

    const editIsOptions =
      subForEdit && typeof subForEdit.is_options !== "undefined"
        ? !!subForEdit.is_options
        : String(subForEdit?.subcategory_name || subForEdit?.name || "").toLowerCase().includes("option");

    const payload = {
      category_id: Number(editing.category_id),
      subcategory_id: Number(editing.subcategory_id),
      plan_id: editing.plan_id ? Number(editing.plan_id) : null,
      trade_date: editing.trade_date,

      profit: toNum(editing.profit) ?? 0,
      loss: toNum(editing.loss) ?? 0,
      brokerage: toNum(editing.brokerage) ?? 0,
      trades_count: toNum(editing.trades_count) ?? 1,

      side: editing.side,
      entry_price: toNum(editing.entry_price),
      exit_price: toNum(editing.exit_price),

      segment: editing.segment?.trim() || null,
      trade_logic: (editing.trade_logic || "").trim(),
      mistakes: editing.mistakes?.trim() || null,

      strike_price: editIsOptions ? toNum(editing.strike_price) : null,
      option_type: editIsOptions ? (editing.option_type || null) : null,
    };

    if (!payload.category_id) return showToast("warning", "Category required");
    if (!payload.subcategory_id) return showToast("warning", "Subcategory required");
    if (!payload.trade_logic) return showToast("warning", "Trade logic required");
    if (!payload.entry_price || payload.entry_price <= 0) return showToast("warning", "Entry price required");
    if (!payload.exit_price || payload.exit_price <= 0) return showToast("warning", "Exit price required");

    if (editIsOptions) {
      if (!payload.strike_price) return showToast("warning", "Strike price required for Options");
      if (!payload.option_type) return showToast("warning", "Option type required");
    }

    try {
      await safeFetch(`/api/journal/${editing.journal_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast("success", "Updated ✅");
      setEditOpen(false);
      setEditing(null);
      await loadJournal();
    } catch (e) {
      showToast("danger", e.message || "Update failed");
    }
  }

  function askDelete(journalId) {
    setConfirm({
      title: "Delete Entry",
      message: "This journal entry will be deleted. Continue?",
      onConfirm: async () => {
        try {
          await safeFetch(`/api/journal/${journalId}`, { method: "DELETE" });
          setConfirm(null);
          showToast("success", "Deleted ✅");
          await loadJournal();
        } catch (e) {
          setConfirm(null);
          showToast("danger", e.message || "Delete failed");
        }
      },
    });
  }

  // ---- Login fallback
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

  // ---- Render
  return (
    <div className="container-fluid p-0 min-vh-100 bg-soft">
      <style>{css}</style>

      {/* Header */}
      <div className="topbar sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-dot" />
            <div className="fw-bold text-white">Trading Journal</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge rounded-pill text-bg-light">User: {userId}</span>
            <button
              className="btn btn-sm btn-glow"
              onClick={() => {
                loadJournal();
                loadCategories();
                if (selectedCategoryId) loadSubcategories(selectedCategoryId);
                loadPlans();
              }}
            >
              Sync
            </button>
          </div>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-3 py-3">
        <div className="row g-3">
          {/* Create Entry */}
          <div className="col-12 col-lg-5">
            <div className="soft-card p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Add Entry</div>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={resetForm}>
                  Reset
                </button>
              </div>

              {/* Quick filters (also fills form) */}
              <div className="row g-2 mb-2">
                <div className="col-7">
                  <label className="form-label small text-muted mb-1">Category</label>
                  <select
                    className="form-select"
                    value={selectedCategoryId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedCategoryId(v);
                      setSelectedSubcategoryId("");
                      setF("category_id", v);
                      setF("subcategory_id", "");
                      setF("plan_id", "");
                    }}
                  >
                    <option value="">Select</option>
                    {categories.map((c) => {
                      const id = c.category_id ?? c.id;
                      const name = c.category_name ?? c.name ?? c.title ?? "Category";
                      return (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="col-5">
                  <label className="form-label small text-muted mb-1">Subcategory</label>
                  <select
                    className="form-select"
                    value={selectedSubcategoryId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedSubcategoryId(v);
                      setF("subcategory_id", v);
                      setF("plan_id", "");
                    }}
                    disabled={!selectedCategoryId}
                  >
                    <option value="">{selectedCategoryId ? "Select" : "Select category first"}</option>
                    {subcategories.map((s) => {
                      const id = s.subcategory_id ?? s.id;
                      const name = s.subcategory_name ?? s.name ?? s.title ?? "Subcategory";
                      return (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <form className="row g-2" onSubmit={createEntry}>
                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Plan (optional)</label>
                  <select
                    className="form-select"
                    value={form.plan_id}
                    onChange={(e) => setF("plan_id", e.target.value)}
                    disabled={!form.subcategory_id}
                  >
                    <option value="">No plan</option>
                    {filteredPlans.map((p) => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {p.plan_name || `Plan`} (RR: {p.target_rr ?? "—"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Trade Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.trade_date}
                    onChange={(e) => setF("trade_date", e.target.value)}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Side</label>
                  <select className="form-select" value={form.side} onChange={(e) => setF("side", e.target.value)}>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Entry Price</label>
                  <input
                    className="form-control"
                    value={form.entry_price}
                    onChange={(e) => setF("entry_price", e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 120.50"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Exit Price</label>
                  <input
                    className="form-control"
                    value={form.exit_price}
                    onChange={(e) => setF("exit_price", e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 130.00"
                  />
                </div>

                <div className="col-4">
                  <label className="form-label small text-muted mb-1">Profit</label>
                  <input className="form-control" value={form.profit} onChange={(e) => setF("profit", e.target.value)} inputMode="decimal" />
                </div>

                <div className="col-4">
                  <label className="form-label small text-muted mb-1">Loss</label>
                  <input className="form-control" value={form.loss} onChange={(e) => setF("loss", e.target.value)} inputMode="decimal" />
                </div>

                <div className="col-4">
                  <label className="form-label small text-muted mb-1">Brokerage</label>
                  <input className="form-control" value={form.brokerage} onChange={(e) => setF("brokerage", e.target.value)} inputMode="decimal" />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Trades Count</label>
                  <input
                    className="form-control"
                    value={form.trades_count}
                    onChange={(e) => setF("trades_count", e.target.value)}
                    inputMode="numeric"
                    placeholder="1"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Segment (optional)</label>
                  <input className="form-control" value={form.segment} onChange={(e) => setF("segment", e.target.value)} placeholder="e.g. NSE" />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Trade Logic (required)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={form.trade_logic}
                    onChange={(e) => setF("trade_logic", e.target.value)}
                    placeholder="Why you entered, setup, entry rule..."
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Mistakes (optional)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={form.mistakes}
                    onChange={(e) => setF("mistakes", e.target.value)}
                    placeholder="Overtrade, early exit, revenge trade..."
                  />
                </div>

                {/* OPTIONS ONLY */}
                {isOptionsSub && (
                  <>
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1">Strike Price</label>
                      <input
                        className="form-control"
                        value={form.strike_price}
                        onChange={(e) => setF("strike_price", e.target.value)}
                        inputMode="decimal"
                        placeholder="e.g. 22500"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1">Option Type</label>
                      <select className="form-select" value={form.option_type} onChange={(e) => setF("option_type", e.target.value)}>
                        <option value="">Select</option>
                        <option value="CALL">CALL</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <div className="alert alert-warning py-2 small mb-0">Options selected: Strike + CALL/PUT required.</div>
                    </div>
                  </>
                )}

                <div className="col-12 d-grid mt-1">
                  <button className="btn btn-primary btn-sm btn-hero" type="submit">
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="col-12 col-lg-7">
            <div className="soft-card p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <div className="fw-semibold">Entries</div>
                <div className="d-flex align-items-center gap-2">
                  <input
                    className="form-control form-control-sm"
                    style={{ width: 140 }}
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    title="Filter month"
                  />
                  <button className="btn btn-outline-secondary btn-sm" onClick={loadJournal} disabled={loading}>
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>

              {list.length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No entries</div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="d-lg-none d-flex flex-column gap-2">
                    {list.map((r) => {
                      const net = Number(r.net_pnl);
                      const netOk = Number.isFinite(net);
                      return (
                        <div key={r.journal_id} className="journal-card">
                          <div className="d-flex justify-content-between gap-2">
                            <div className="minw-0">
                              <div className="fw-semibold text-truncate">
                                {fmtDate(r.trade_date)} • <span className="text-muted">#{r.journal_id}</span>
                              </div>
                              <div className="small text-muted mt-1">
                                {getCategoryName(r.category_id)} •{" "}
                                <span className="fw-semibold text-dark">{getSubName(r.subcategory_id)}</span>
                                {r.plan_id ? <span className="ms-2 badge badge-soft">Plan</span> : null}
                              </div>
                            </div>

                            <span className={`badge rounded-pill ${netOk && net >= 0 ? "text-bg-success" : "text-bg-danger"}`}>
                              {netOk ? fmtMoney(net) : "—"}
                            </span>
                          </div>

                          <div className="row g-2 mt-2">
                            <div className="col-4">
                              <div className="mini-k">Profit</div>
                              <div className="mini-v profit">{fmtMoney(r.profit)}</div>
                            </div>
                            <div className="col-4">
                              <div className="mini-k">Loss</div>
                              <div className="mini-v loss">{fmtMoney(r.loss)}</div>
                            </div>
                            <div className="col-4">
                              <div className="mini-k">Brokerage</div>
                              <div className="mini-v brokerage">{fmtMoney(r.brokerage)}</div>
                            </div>
                          </div>

                          <div className="chips mt-2">
                            <span className="chip">{String(r.side || "—")}</span>
                            <span className="chip">Entry: {r.entry_price ?? "—"}</span>
                            <span className="chip">Exit: {r.exit_price ?? "—"}</span>
                            {r.option_type ? <span className="chip chip-info">{r.option_type}</span> : null}
                            {r.rr_followed === true ? <span className="chip chip-success">RR Followed</span> : null}
                            {r.rr_followed === false ? <span className="chip chip-danger">RR Not</span> : null}
                            {r.overtrade === true ? <span className="chip chip-warn">Overtrade</span> : null}
                          </div>

                          <div className="logic-box mt-2">{r.trade_logic || "—"}</div>

                          {r.mistakes ? <div className="mistake-box mt-2">{r.mistakes}</div> : null}

                          <div className="d-flex justify-content-end gap-2 mt-2">
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(r)}>
                              Update
                            </button>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(r.journal_id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="d-none d-lg-block table-responsive">
                    <table className="table table-sm align-middle mb-0 table-hover">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Subcategory</th>
                          <th>Side</th>
                          <th className="text-end">Profit</th>
                          <th className="text-end">Loss</th>
                          <th className="text-end">Brokerage</th>
                          <th className="text-end">Net</th>
                          <th style={{ minWidth: 260 }}>Logic / Mistakes</th>
                          <th className="text-end" style={{ width: 220 }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => {
                          const net = Number(r.net_pnl);
                          const netOk = Number.isFinite(net);
                          return (
                            <tr key={r.journal_id}>
                              <td className="fw-semibold">{fmtDate(r.trade_date)}</td>
                              <td className="text-muted fw-semibold">{getCategoryName(r.category_id)}</td>
                              <td className="fw-semibold">{getSubName(r.subcategory_id)}</td>
                              <td>{r.side || "—"}</td>

                              <td className="text-end profit">{fmtMoney(r.profit)}</td>
                              <td className="text-end loss">{fmtMoney(r.loss)}</td>
                              <td className="text-end brokerage">{fmtMoney(r.brokerage)}</td>

                              <td className="text-end">
                                <span className={`badge rounded-pill ${netOk && net >= 0 ? "text-bg-success" : "text-bg-danger"}`}>
                                  {netOk ? fmtMoney(net) : "—"}
                                </span>
                              </td>

                              <td>
                                <div className="logic-mini">{r.trade_logic || "—"}</div>
                                {r.mistakes ? <div className="mistake-mini mt-1">{r.mistakes}</div> : null}
                              </td>

                              <td className="text-end">
                                <div className="d-inline-flex gap-2">
                                  <button className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(r)}>
                                    Update
                                  </button>
                                  <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(r.journal_id)}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal (center) */}
      {editOpen && editing && (
        <div className="modal-backdrop-custom" onMouseDown={() => setEditOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-bold">Update Entry #{editing.journal_id}</div>
              <button className="btn btn-sm btn-light" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>

            {/* NOTE: keeping your existing edit UI (ids), only styled better */}
            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Category ID</label>
                <input
                  className="form-control"
                  value={editing.category_id ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, category_id: e.target.value }))}
                  inputMode="numeric"
                />
              </div>
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Subcategory ID</label>
                <input
                  className="form-control"
                  value={editing.subcategory_id ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, subcategory_id: e.target.value }))}
                  inputMode="numeric"
                />
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">Plan ID (optional)</label>
                <input
                  className="form-control"
                  value={editing.plan_id ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, plan_id: e.target.value }))}
                  inputMode="numeric"
                  placeholder="blank for no plan"
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={editing.trade_date ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, trade_date: e.target.value }))}
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Side</label>
                <select
                  className="form-select"
                  value={editing.side ?? "BUY"}
                  onChange={(e) => setEditing((p) => ({ ...p, side: e.target.value }))}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Entry</label>
                <input
                  className="form-control"
                  value={editing.entry_price ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, entry_price: e.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Exit</label>
                <input
                  className="form-control"
                  value={editing.exit_price ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, exit_price: e.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="col-4">
                <label className="form-label small text-muted mb-1">Profit</label>
                <input
                  className="form-control"
                  value={editing.profit ?? "0"}
                  onChange={(e) => setEditing((p) => ({ ...p, profit: e.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="col-4">
                <label className="form-label small text-muted mb-1">Loss</label>
                <input
                  className="form-control"
                  value={editing.loss ?? "0"}
                  onChange={(e) => setEditing((p) => ({ ...p, loss: e.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="col-4">
                <label className="form-label small text-muted mb-1">Brokerage</label>
                <input
                  className="form-control"
                  value={editing.brokerage ?? "0"}
                  onChange={(e) => setEditing((p) => ({ ...p, brokerage: e.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Trades Count</label>
                <input
                  className="form-control"
                  value={editing.trades_count ?? "1"}
                  onChange={(e) => setEditing((p) => ({ ...p, trades_count: e.target.value }))}
                  inputMode="numeric"
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Segment</label>
                <input
                  className="form-control"
                  value={editing.segment ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, segment: e.target.value }))}
                />
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">Trade Logic</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={editing.trade_logic ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, trade_logic: e.target.value }))}
                />
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">Mistakes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={editing.mistakes ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, mistakes: e.target.value }))}
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Strike Price (Options)</label>
                <input
                  className="form-control"
                  value={editing.strike_price ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, strike_price: e.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Option Type</label>
                <select
                  className="form-select"
                  value={editing.option_type ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, option_type: e.target.value }))}
                >
                  <option value="">(blank)</option>
                  <option value="CALL">CALL</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-sm btn-primary" onClick={saveEdit}>
                Save
              </button>
            </div>

            <div className="small text-muted mt-2">Note: RR Followed / Overtrade flags are auto from DB triggers (plan select असेल तर).</div>
          </div>
        </div>
      )}

      {/* Confirm (center) */}
      {confirm && (
        <div className="modal-backdrop-custom" onMouseDown={() => setConfirm(null)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="fw-bold mb-1">{confirm.title}</div>
            <div className="text-muted small">{confirm.message}</div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-sm btn-danger" onClick={confirm.onConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast (center-bottom) */}
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
  /* Background + topbar (professional) */
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
  .btn-glow:hover{
    background: rgba(255,255,255,.26);
    color: #fff;
  }

  .btn-hero{
    border: 0;
    background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 60%, #22c55e 120%);
  }
  .btn-hero:hover{ filter: brightness(.98); }

  /* Soft card */
  .soft-card{
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,.08);
    backdrop-filter: blur(8px);
  }

  /* Journal card (mobile) */
  .journal-card{
    background: rgba(255,255,255,.95);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
  }

  /* mini grid texts */
  .mini-k{
    font-size: 12px;
    color: rgba(0,0,0,.55);
  }
  .mini-v{
    font-weight: 800;
    line-height: 1.1;
  }

  /* Colors required */
  .profit{ color: #16a34a !important; }     /* green */
  .loss{ color: #dc2626 !important; }       /* red */
  .brokerage{ color: #a16207 !important; }  /* dark yellow */

  /* Trade Logic sky blue */
  .logic-box{
    background: rgba(14,165,233,.12);
    border: 1px solid rgba(14,165,233,.18);
    color: rgba(3,105,161,.95);
    border-radius: 12px;
    padding: 10px;
    font-size: 13px;
    white-space: pre-wrap;
  }
  .logic-mini{
    background: rgba(14,165,233,.10);
    border: 1px solid rgba(14,165,233,.16);
    color: rgba(3,105,161,.95);
    border-radius: 10px;
    padding: 6px 8px;
    font-size: 12px;
    white-space: pre-wrap;
  }

  /* Mistakes faint red */
  .mistake-box{
    background: rgba(239,68,68,.10);
    border: 1px solid rgba(239,68,68,.16);
    color: rgba(153,27,27,.95);
    border-radius: 12px;
    padding: 10px;
    font-size: 13px;
    white-space: pre-wrap;
  }
  .mistake-mini{
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.14);
    color: rgba(153,27,27,.95);
    border-radius: 10px;
    padding: 6px 8px;
    font-size: 12px;
    white-space: pre-wrap;
  }

  /* chips */
  .chips{ display: flex; flex-wrap: wrap; gap: 8px; }
  .chip{
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(0,0,0,.08);
    background: rgba(255,255,255,.85);
    color: rgba(0,0,0,.72);
    font-weight: 700;
  }
  .chip-info{
    background: rgba(6,182,212,.14);
    border-color: rgba(6,182,212,.25);
    color: #0e7490;
  }
  .chip-success{
    background: rgba(34,197,94,.14);
    border-color: rgba(34,197,94,.25);
    color: #15803d;
  }
  .chip-danger{
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.22);
    color: #b91c1c;
  }
  .chip-warn{
    background: rgba(234,179,8,.16);
    border-color: rgba(234,179,8,.28);
    color: #854d0e;
  }

  .badge-soft{
    background: rgba(79,70,229,.10);
    color: #3730a3;
    border: 1px solid rgba(79,70,229,.20);
  }

  .table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.07) !important;
  }

  /* centered modals + toast */
  .modal-backdrop-custom{
    position: fixed;
    inset: 0;
    background: rgba(10,10,20,.52);
    display: grid;
    place-items: center;
    z-index: 1055;
    padding: 12px;
  }

  .modal-card{
    width: min(720px, 95vw);
    max-height: 85vh;
    overflow: auto;
    background: #fff;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 22px 70px rgba(0,0,0,.28);
  }

  .toast-custom{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
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
