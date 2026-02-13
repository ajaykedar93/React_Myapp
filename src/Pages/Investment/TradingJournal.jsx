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

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [plans, setPlans] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const [toast, setToast] = useState(null); // {type, message}
  const [saving, setSaving] = useState(false);

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

  const toNum = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // ---- options detection
  const selectedSub = useMemo(() => {
    const sid = Number(form.subcategory_id || selectedSubcategoryId || 0);
    return subcategories.find((s) => Number(s.subcategory_id ?? s.id) === sid) || null;
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

  // ---- loaders
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
    setSubcategories(data?.data || []);
  }

  async function loadPlans() {
    const data = await safeFetch("/api/plan", { method: "GET" });
    setPlans(data?.data || []);
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
    if (!selectedCategoryId) {
      setSelectedSubcategoryId("");
      setSubcategories([]);
      return;
    }
    loadSubcategories(selectedCategoryId).catch((e) => showToast("danger", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, userId]);

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

  useEffect(() => {
    setForm((p) => ({ ...p, category_id: selectedCategoryId || p.category_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  useEffect(() => {
    setForm((p) => ({ ...p, subcategory_id: selectedSubcategoryId || p.subcategory_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategoryId]);

  // ---- CREATE ONLY
  async function createEntry(e) {
    if (e?.preventDefault) e.preventDefault();
    if (saving) return;

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
      setSaving(true);
      await safeFetch("/api/journal", { method: "POST", body: JSON.stringify(payload) });
      showToast("success", "Entry added ✅");
      resetForm();
    } catch (e2) {
      showToast("danger", e2.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div className="container-fluid p-0 min-vh-100 bg-soft">
      <style>{css}</style>

      <div className="topbar sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-dot" />
            <div className="fw-bold text-white">Trading Journal</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge rounded-pill text-bg-light">User: {userId}</span>
            <button className="btn btn-sm btn-glow" onClick={() => { loadCategories(); loadPlans(); if (selectedCategoryId) loadSubcategories(selectedCategoryId); }}>
              Sync
            </button>
          </div>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-3 py-3">
        <div className="row g-3 justify-content-center">
          <div className="col-12 col-lg-6">
            <div className="soft-card p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Add Entry</div>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={resetForm}>
                  Reset
                </button>
              </div>

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

              {/* ✅ Mobile submit fix: onSubmit + button onClick fallback */}
              <form className="row g-2" onSubmit={createEntry} noValidate>
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
                  <input type="date" className="form-control" value={form.trade_date} onChange={(e) => setF("trade_date", e.target.value)} />
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
                  <input className="form-control" value={form.entry_price} onChange={(e) => setF("entry_price", e.target.value)} inputMode="decimal" placeholder="e.g. 120.5" />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Exit Price</label>
                  <input className="form-control" value={form.exit_price} onChange={(e) => setF("exit_price", e.target.value)} inputMode="decimal" placeholder="e.g. 130" />
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
                  <input className="form-control" value={form.trades_count} onChange={(e) => setF("trades_count", e.target.value)} inputMode="numeric" placeholder="1" />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Segment (optional)</label>
                  <input className="form-control" value={form.segment} onChange={(e) => setF("segment", e.target.value)} placeholder="e.g. NSE" />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Trade Logic (required)</label>
                  <textarea className="form-control" rows={2} value={form.trade_logic} onChange={(e) => setF("trade_logic", e.target.value)} placeholder="Why you entered, setup, entry rule..." />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Mistakes (optional)</label>
                  <textarea className="form-control" rows={2} value={form.mistakes} onChange={(e) => setF("mistakes", e.target.value)} placeholder="Overtrade, early exit, revenge trade..." />
                </div>

                {isOptionsSub && (
                  <>
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1">Strike Price</label>
                      <input className="form-control" value={form.strike_price} onChange={(e) => setF("strike_price", e.target.value)} inputMode="decimal" placeholder="e.g. 22500" />
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
                  <button className="btn btn-primary btn-sm btn-hero" type="submit" onClick={createEntry} disabled={saving}>
                    {saving ? "Saving..." : "Save Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

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
  .btn-glow:hover{ background: rgba(255,255,255,.26); color: #fff; }
  .btn-hero{
    border: 0;
    background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 60%, #22c55e 120%);
  }
  .soft-card{
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,.08);
    backdrop-filter: blur(8px);
  }
  .toast-custom{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
  }
`;
