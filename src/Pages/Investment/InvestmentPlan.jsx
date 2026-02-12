
// IMPORTANT: Ensure Bootstrap CSS is included once globally:
//   import "bootstrap/dist/css/bootstrap.min.css";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function InvestmentPlan() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id ?? null;

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (userId) h["x-user-id"] = String(userId);
    return h;
  }, [userId]);

  // Plans
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Categories/Subcategories
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]); // cache for list text
  const [catLoading, setCatLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  // Form (subcategory selected, not typed)
  const [form, setForm] = useState({
    category_id: "",
    subcategory_id: "",
    plan_name: "",
    total_fund_deposit: "",
    risk_loss: "",
    profit_reward: "",
    day_trade_limit: "",
    trading_days: "",
  });

  // Details modal
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirm modal
  const [confirm, setConfirm] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  function showToast(type, message) {
    setToast({ type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2400);
  }

  // ---- fetch helper ----
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

  // ---- small helpers ----
  function onChange(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function num(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function formatMoney(v) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
    } catch {
      return String(n);
    }
  }

  // RR -> show 1:1, 1:1.5, 1:2 etc (rounded to 0.5)
  function rrLabel(profitReward, riskLoss) {
    const pr = Number(profitReward);
    const rl = Number(riskLoss);
    if (!Number.isFinite(pr) || !Number.isFinite(rl) || rl <= 0 || pr <= 0) return "—";
    const r = pr / rl;
    const rounded = Math.round(r * 2) / 2; // 0.5 steps
    const txt = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0$/, "");
    return `1:${txt}`;
  }

  // ---- Categories/Subcategories ----
  async function loadCategories() {
    try {
      setCatLoading(true);
      const data = await safeFetch("/api/investment/category", { method: "GET" });
      setCategories(data?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load categories");
    } finally {
      setCatLoading(false);
    }
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    try {
      setSubLoading(true);
      const data = await safeFetch(`/api/investment/subcategory?category_id=${categoryId}`, {
        method: "GET",
      });
      const list = data?.data || [];
      setSubcategories(list);

      // cache for showing subcategory name in plans list
      setAllSubcategories((prev) => {
        const map = new Map(prev.map((x) => [Number(x.subcategory_id ?? x.id), x]));
        for (const s of list) {
          const id = Number(s.subcategory_id ?? s.id);
          if (Number.isFinite(id)) map.set(id, s);
        }
        return Array.from(map.values());
      });
    } catch (e) {
      showToast("danger", e.message || "Failed to load subcategories");
      setSubcategories([]);
    } finally {
      setSubLoading(false);
    }
  }

  const subNameById = useMemo(() => {
    const m = new Map();
    const fill = (arr) => {
      for (const s of arr || []) {
        const id = s.subcategory_id ?? s.id;
        const name = s.subcategory_name ?? s.name ?? s.title;
        if (id != null && name != null) m.set(Number(id), String(name));
      }
    };
    fill(allSubcategories);
    fill(subcategories);
    return m;
  }, [allSubcategories, subcategories]);

  // ✅ IMPORTANT: show ONLY TEXT, never number
  function getSubName(id) {
    if (!id) return "—";
    const name = subNameById.get(Number(id));
    return name ? name : "Unknown"; // no id fallback shown
  }

  async function onCategorySelect(val) {
    onChange("category_id", val);
    onChange("subcategory_id", "");
    setSubcategories([]);
    if (!val) return;
    await loadSubcategories(val);
  }

  // ---- Plans ----
  async function loadPlans() {
    try {
      setLoading(true);
      const data = await safeFetch("/api/plan", { method: "GET" });
      setPlans(data?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadCategories();
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function createPlan(e) {
    e.preventDefault();

    const payload = {
      subcategory_id: Number(form.subcategory_id),
      plan_name: form.plan_name?.trim() || null,
      total_fund_deposit: num(form.total_fund_deposit),
      risk_loss: num(form.risk_loss),
      profit_reward: num(form.profit_reward),
      day_trade_limit: form.day_trade_limit === "" ? 0 : Number(form.day_trade_limit),
      trading_days: Number(form.trading_days),
    };

    if (!form.category_id) return showToast("warning", "Please select Category");
    if (!payload.subcategory_id) return showToast("warning", "Please select Subcategory");
    if (payload.total_fund_deposit === null) return showToast("warning", "Total fund required");
    if (!payload.risk_loss || payload.risk_loss <= 0) return showToast("warning", "Risk loss must be > 0");
    if (!payload.profit_reward || payload.profit_reward <= 0) return showToast("warning", "Profit reward must be > 0");
    if (!payload.trading_days || payload.trading_days <= 0) return showToast("warning", "Trading days must be > 0");
    if (payload.day_trade_limit < 0) return showToast("warning", "Day trade limit must be >= 0");

    try {
      await safeFetch("/api/plan", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showToast("success", "Plan created ✅");
      setForm({
        category_id: "",
        subcategory_id: "",
        plan_name: "",
        total_fund_deposit: "",
        risk_loss: "",
        profit_reward: "",
        day_trade_limit: "",
        trading_days: "",
      });
      setSubcategories([]);
      await loadPlans();
    } catch (e2) {
      showToast("danger", e2.message || "Create failed");
    }
  }

  async function openDetails(planId) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);

      const data = await safeFetch(`/api/plan/${planId}`, { method: "GET" });
      setDetail(data?.data || null);
    } catch (e) {
      showToast("danger", e.message || "Failed to load details");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function askDelete(planId) {
    setConfirm({
      title: "Delete Plan",
      message: "This plan will be deleted. Continue?",
      onConfirm: async () => {
        try {
          await safeFetch(`/api/plan/${planId}`, { method: "DELETE" });
          setConfirm(null);
          showToast("success", "Plan deleted ✅");
          await loadPlans();
        } catch (e) {
          setConfirm(null);
          showToast("danger", e.message || "Delete failed");
        }
      },
    });
  }

  // ---- Auth check ----
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

  // ---- UI ----
  return (
    <div className="container-fluid p-0 min-vh-100 bg-soft">
      <style>{css}</style>

      {/* Header */}
      <div className="topbar sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-dot" />
            <div className="fw-bold text-white">Investment Plans</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge rounded-pill text-bg-light">User: {userId}</span>
            <button
              className="btn btn-sm btn-glow"
              onClick={() => {
                loadCategories();
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
          {/* Create Plan */}
          <div className="col-12 col-lg-5">
            <div className="soft-card p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Create Plan</div>
                <span className="badge rounded-pill badge-soft">Category → Subcategory</span>
              </div>

              <form className="row g-2" onSubmit={createPlan}>
                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Category</label>
                  <select
                    className="form-select"
                    value={form.category_id}
                    onChange={(e) => onCategorySelect(e.target.value)}
                    disabled={catLoading}
                  >
                    <option value="">{catLoading ? "Loading categories..." : "Select Category"}</option>
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

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Subcategory</label>
                  <select
                    className="form-select"
                    value={form.subcategory_id}
                    onChange={(e) => onChange("subcategory_id", e.target.value)}
                    disabled={!form.category_id || subLoading}
                  >
                    <option value="">
                      {!form.category_id
                        ? "Select Category first"
                        : subLoading
                        ? "Loading subcategories..."
                        : subcategories.length
                        ? "Select Subcategory"
                        : "No subcategories found"}
                    </option>
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

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Plan Name (optional)</label>
                  <input
                    className="form-control"
                    value={form.plan_name}
                    onChange={(e) => onChange("plan_name", e.target.value)}
                    placeholder="e.g. Safe Intraday Plan"
                    maxLength={80}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Total Fund</label>
                  <input
                    className="form-control"
                    value={form.total_fund_deposit}
                    onChange={(e) => onChange("total_fund_deposit", e.target.value)}
                    placeholder="e.g. 50000"
                    inputMode="decimal"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Day Trade Limit</label>
                  <input
                    className="form-control"
                    value={form.day_trade_limit}
                    onChange={(e) => onChange("day_trade_limit", e.target.value)}
                    placeholder="e.g. 5"
                    inputMode="numeric"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Risk (Loss)</label>
                  <input
                    className="form-control"
                    value={form.risk_loss}
                    onChange={(e) => onChange("risk_loss", e.target.value)}
                    placeholder="e.g. 500"
                    inputMode="decimal"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Reward (Profit)</label>
                  <input
                    className="form-control"
                    value={form.profit_reward}
                    onChange={(e) => onChange("profit_reward", e.target.value)}
                    placeholder="e.g. 1000"
                    inputMode="decimal"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Trading Days</label>
                  <input
                    className="form-control"
                    value={form.trading_days}
                    onChange={(e) => onChange("trading_days", e.target.value)}
                    placeholder="e.g. 30"
                    inputMode="numeric"
                  />
                </div>

                <div className="col-12 d-grid mt-1">
                  <button className="btn btn-primary btn-sm btn-hero" type="submit">
                    Create Plan
                  </button>
                </div>

                <div className="col-12">
                  <div className="small text-muted">
                    RR display format: <span className="fw-semibold">1:1 / 1:1.5 / 1:2</span>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Plans List */}
          <div className="col-12 col-lg-7">
            <div className="soft-card p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Plans List</div>
                <button className="btn btn-outline-secondary btn-sm" onClick={loadPlans} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {loading && plans.length === 0 ? (
                <div className="alert alert-light border small mb-0">Loading...</div>
              ) : plans.length === 0 ? (
                <div className="alert alert-light border small mb-0">No plans found</div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="d-lg-none d-flex flex-column gap-2">
                    {plans.map((p) => (
                      <div key={p.plan_id} className="plan-card">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="minw-0">
                            <div className="fw-semibold text-truncate">
                              {p.plan_name || `Plan #${p.plan_id}`}
                            </div>
                            <div className="small text-muted mt-1">
                              Subcategory:{" "}
                              <span className="fw-semibold text-dark">{getSubName(p.subcategory_id)}</span>
                            </div>
                          </div>

                          <span className="badge rounded-pill badge-rr">
                            {rrLabel(p.profit_reward, p.risk_loss)}
                          </span>
                        </div>

                        <div className="divider my-2" />

                        <div className="grid-2">
                          <div className="kv">
                            <div className="k">Fund</div>
                            <div className="v">{formatMoney(p.total_fund_deposit)}</div>
                          </div>
                          <div className="kv">
                            <div className="k">Limit</div>
                            <div className="v">{p.day_trade_limit ?? "—"}</div>
                          </div>

                          <div className="kv">
                            <div className="k">Risk</div>
                            <div className="v risk">{formatMoney(p.risk_loss)}</div>
                          </div>
                          <div className="kv">
                            <div className="k">Days</div>
                            <div className="v">{p.trading_days ?? "—"}</div>
                          </div>

                          <div className="kv">
                            <div className="k">Reward</div>
                            <div className="v reward">{formatMoney(p.profit_reward)}</div>
                          </div>
                          <div className="kv">
                            <div className="k">RR</div>
                            <div className="v">{rrLabel(p.profit_reward, p.risk_loss)}</div>
                          </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-3">
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => openDetails(p.plan_id)}>
                            View
                          </button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(p.plan_id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="d-none d-lg-block table-responsive">
                    <table className="table table-sm align-middle mb-0 table-hover">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 180 }}>Plan</th>
                          <th style={{ minWidth: 180 }}>Subcategory</th>
                          <th>Fund</th>
                          <th>Risk</th>
                          <th>Reward</th>
                          <th>RR</th>
                          <th>Limit</th>
                          <th>Days</th>
                          <th className="text-end" style={{ width: 220 }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((p) => (
                          <tr key={p.plan_id}>
                            <td className="fw-semibold">{p.plan_name || `Plan #${p.plan_id}`}</td>
                            <td className="text-muted fw-semibold">{getSubName(p.subcategory_id)}</td>
                            <td>{formatMoney(p.total_fund_deposit)}</td>
                            <td className="risk fw-semibold">{formatMoney(p.risk_loss)}</td>
                            <td className="reward fw-semibold">{formatMoney(p.profit_reward)}</td>
                            <td>
                              <span className="badge rounded-pill badge-rr">
                                {rrLabel(p.profit_reward, p.risk_loss)}
                              </span>
                            </td>
                            <td>{p.day_trade_limit ?? "—"}</td>
                            <td>{p.trading_days ?? "—"}</td>
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => openDetails(p.plan_id)}>
                                  View
                                </button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(p.plan_id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {detailOpen && (
        <div className="modal-backdrop-custom" onMouseDown={() => setDetailOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-bold">Plan Details</div>
              <button className="btn btn-sm btn-light" onClick={() => setDetailOpen(false)}>
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="alert alert-light border small mb-0">Loading...</div>
            ) : !detail ? (
              <div className="alert alert-light border small mb-0">No details found</div>
            ) : (
              <div className="row g-2 small">
                <div className="col-12">
                  <div className="text-muted">Subcategory</div>
                  <div className="fw-semibold">{getSubName(detail.subcategory_id)}</div>
                </div>

                <div className="col-12">
                  <div className="text-muted">Plan Name</div>
                  <div className="fw-semibold">{detail.plan_name || "—"}</div>
                </div>

                <div className="col-6">
                  <div className="text-muted">Total Fund</div>
                  <div className="fw-semibold">{formatMoney(detail.total_fund_deposit)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted">RR</div>
                  <div className="fw-semibold">{rrLabel(detail.profit_reward, detail.risk_loss)}</div>
                </div>

                <div className="col-6">
                  <div className="text-muted">Risk (Loss)</div>
                  <div className="fw-semibold risk">{formatMoney(detail.risk_loss)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted">Reward (Profit)</div>
                  <div className="fw-semibold reward">{formatMoney(detail.profit_reward)}</div>
                </div>

                <div className="col-6">
                  <div className="text-muted">Day Trade Limit</div>
                  <div className="fw-semibold">{detail.day_trade_limit ?? "—"}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted">Trading Days</div>
                  <div className="fw-semibold">{detail.trading_days ?? "—"}</div>
                </div>

                <div className="col-12 mt-2">
                  <div className="text-muted">Created</div>
                 
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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

      {/* Toast */}
      {toast && (
        <div className="toast-custom">
          <div className={`alert alert-${toast.type} shadow-sm mb-0 py-2 px-3`}>
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
      radial-gradient(820px 360px at 90% 10%, rgba(16,185,129,.14), transparent 55%),
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

  .soft-card{
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,.08);
    backdrop-filter: blur(8px);
  }

  .plan-card{
    background: rgba(255,255,255,.94);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
  }

  .divider{
    height: 1px;
    background: rgba(0,0,0,.06);
  }

  .grid-2{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 12px;
  }

  .kv .k{
    font-size: 12px;
    color: rgba(0,0,0,.55);
  }
  .kv .v{
    font-weight: 800;
    color: rgba(0,0,0,.82);
    line-height: 1.1;
  }

  .risk{ color: #dc2626 !important; }
  .reward{ color: #16a34a !important; }

  .badge-soft{
    background: rgba(79,70,229,.10);
    color: #3730a3;
    border: 1px solid rgba(79,70,229,.20);
  }

  .badge-rr{
    background: rgba(6,182,212,.14);
    color: #0e7490;
    border: 1px solid rgba(6,182,212,.25);
    font-weight: 900;
    padding: 8px 10px;
  }

  .btn-hero{
    border: 0;
    background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 60%, #22c55e 120%);
  }
  .btn-hero:hover{ filter: brightness(.98); }

  .table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.07) !important;
  }

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
    width: min(580px, 95vw);
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
