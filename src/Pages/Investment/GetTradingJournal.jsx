import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function GetTradingJournal() {
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
  const [allSubcategories, setAllSubcategories] = useState([]);

  const [month, setMonth] = useState("");

  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
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

  const fmtPrice = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);
    } catch {
      return String(n);
    }
  };

  const isoDay = (v) => {
    if (!v) return "";
    return String(v).slice(0, 10);
  };

  const fmtDate = (v) => {
    if (!v) return "—";
    const s = String(v).slice(0, 10);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    try {
      return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
    } catch {
      return s;
    }
  };

  // name maps
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

  const getCategoryName = (id) => (!id ? "—" : categoryNameById.get(Number(id)) || "Unknown");
  const getSubName = (id) => (!id ? "—" : subNameById.get(Number(id)) || "Unknown");

  // ✅ Per row net rule
  const rowNet = (r) => {
    const p = toNum(r.profit);
    const l = toNum(r.loss);
    const b = toNum(r.brokerage);
    if (p > 0) return p - b;
    if (l > 0) return -(l + b);
    return -b;
  };

  // ✅ Totals for header squares
  const totals = useMemo(() => {
    let totalProfit = 0;
    let totalLoss = 0;

    (list || []).forEach((r) => {
      const p = toNum(r.profit);
      const l = toNum(r.loss);
      const b = toNum(r.brokerage);

      if (p > 0) totalProfit += Math.max(0, p - b);
      else if (l > 0) totalLoss += l + b;
      else if (b > 0) totalLoss += b;
    });

    const net = totalProfit - totalLoss;
    return { totalProfit, totalLoss, net };
  }, [list]);

  async function loadCategories() {
    const data = await safeFetch("/api/investment/category", { method: "GET" });
    setCategories(data?.data || []);
  }

  async function loadJournal() {
    try {
      setLoading(true);
      const q = month ? `?month=${encodeURIComponent(month)}` : "";
      const data = await safeFetch(`/api/journal${q}`, { method: "GET" });
      const rows = data?.data || [];
      setList(rows);

      setAllSubcategories((prev) => {
        const map = new Map(prev.map((x) => [Number(x.subcategory_id ?? x.id), x]));
        rows.forEach((r) => {
          if (r.subcategory_id && r.subcategory_name) {
            map.set(Number(r.subcategory_id), { subcategory_id: r.subcategory_id, subcategory_name: r.subcategory_name });
          }
        });
        return Array.from(map.values());
      });
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
        await loadCategories();
        await loadJournal();
      } catch (e) {
        showToast("danger", e.message || "Failed to load");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, userId]);

  function openEdit(row) {
    setEditing(row);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;

    const payload = {
      category_id: Number(editing.category_id),
      subcategory_id: Number(editing.subcategory_id),
      plan_id: editing.plan_id ? Number(editing.plan_id) : null,
      trade_date: editing.trade_date,

      profit: toNum(editing.profit),
      loss: toNum(editing.loss),
      brokerage: toNum(editing.brokerage),
      trades_count: toNum(editing.trades_count) || 1,

      side: editing.side,
      entry_price: Number(editing.entry_price) || null,
      exit_price: Number(editing.exit_price) || null,

      segment: editing.segment?.trim() || null,
      trade_logic: (editing.trade_logic || "").trim(),
      mistakes: editing.mistakes?.trim() || null,

      strike_price: Number(editing.strike_price) || null,
      option_type: editing.option_type || null,
    };

    if (!payload.category_id) return showToast("warning", "Category required");
    if (!payload.subcategory_id) return showToast("warning", "Subcategory required");
    if (!payload.trade_logic) return showToast("warning", "Trade logic required");
    if (!payload.entry_price || payload.entry_price <= 0) return showToast("warning", "Entry price required");
    if (!payload.exit_price || payload.exit_price <= 0) return showToast("warning", "Exit price required");

    try {
      await safeFetch(`/api/journal/${editing.journal_id}`, { method: "PUT", body: JSON.stringify(payload) });
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

      {/* Header: ONLY Title + Sync */}
      <div className="topbar sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-dot" />
            <div className="fw-bold text-white">TradingJournal</div>
          </div>

          <button className="btn btn-sm btn-glow" onClick={loadJournal} disabled={loading}>
            {loading ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* ✅ Month selector just below header */}
      <div className="container-fluid px-2 px-md-3 pt-3">
        <div className="month-strip">
          <div className="month-left">
            <div className="month-title">Filter by Month</div>
            <div className="month-sub">Select month to load journal entries</div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <input className="form-control form-control-sm" style={{ width: 60 }} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-3 py-3">
        <div className="soft-card p-3 p-md-4">
          {/* ✅ Totals row */}
          <div className="d-flex align-items-start justify-content-between gap-2 mb-2 flex-wrap">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="fw-semibold">Entries</div>

              <div className="stat-row">
                <div className="stat-box stat-profit">
                  <div className="stat-k">Total Profit</div>
                  <div className="stat-v">{fmtMoney(totals.totalProfit)}</div>
                </div>

                <div className="stat-box stat-loss">
                  <div className="stat-k">Total Loss</div>
                  <div className="stat-v">{fmtMoney(totals.totalLoss)}</div>
                </div>

                <div className={`stat-box ${totals.net >= 0 ? "stat-net-pos" : "stat-net-neg"}`}>
                  <div className="stat-k">Net</div>
                  <div className="stat-v">{fmtMoney(totals.net)}</div>
                </div>
              </div>
            </div>
          </div>

          {list.length === 0 && !loading ? (
            <div className="alert alert-light border small mb-0">No entries</div>
          ) : (
            <>
              {/* Mobile cards with date grouping + black line when date changes */}
              <div className="d-lg-none d-flex flex-column gap-2">
                {list.map((r, idx) => {
                  const net = rowNet(r);
                  const curDay = isoDay(r.trade_date);
                  const prevDay = idx > 0 ? isoDay(list[idx - 1]?.trade_date) : "";
                  const isNewDate = idx === 0 || curDay !== prevDay;

                  return (
                    <React.Fragment key={r.journal_id}>
                      {isNewDate ? (
                        <div className="date-sep">
                          <div className="date-line" />
                          <div className="date-pill">{fmtDate(r.trade_date)}</div>
                          <div className="date-line" />
                        </div>
                      ) : null}

                      <div className="journal-card">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="minw-0">
                            <div className="small text-muted">
                              {getCategoryName(r.category_id)} • <span className="fw-semibold text-dark">{getSubName(r.subcategory_id)}</span>
                              {r.plan_id ? <span className="ms-2 badge badge-soft">Plan</span> : null}
                            </div>
                          </div>

                          <div className={`net-box ${net >= 0 ? "net-good" : "net-bad"}`}>
                            <div className="net-k">Net</div>
                            <div className="net-v">{fmtMoney(net)}</div>
                          </div>
                        </div>

                        <div className="chips mt-2">
                          <span className="chip">{String(r.side || "—")}</span>
                          <span className="chip">Entry: {fmtPrice(r.entry_price)}</span>
                          <span className="chip">Exit: {fmtPrice(r.exit_price)}</span>
                          {r.option_type === "CALL" ? <span className="chip chip-call">CALL</span> : null}
                          {r.option_type === "PUT" ? <span className="chip chip-put">PUT</span> : null}
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

                        <div className="logic-box mt-2">{r.trade_logic || "—"}</div>
                        {r.mistakes ? <div className="mistake-box mt-2">{r.mistakes}</div> : null}

                        <div className="d-flex justify-content-end gap-2 mt-2">
                          <button className="btn btn-outline-secondary btn-sm btn-action" onClick={() => openEdit(r)}>
                            Update
                          </button>
                          <button className="btn btn-outline-danger btn-sm btn-action" onClick={() => askDelete(r.journal_id)}>
                            Delete
                          </button>
                        </div>

                        {/* black line after each card */}
                        <div className="card-divider" />
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Desktop table (simple; no refresh button; sync only on top) */}
              <div className="d-none d-lg-block table-responsive">
                <table className="table table-sm align-middle mb-0 table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Subcategory</th>
                      <th>Side</th>
                      <th className="text-end">Entry</th>
                      <th className="text-end">Exit</th>
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
                      const net = rowNet(r);
                      return (
                        <tr key={r.journal_id}>
                          <td className="fw-semibold">{fmtDate(r.trade_date)}</td>
                          <td className="text-muted fw-semibold">{getCategoryName(r.category_id)}</td>
                          <td className="fw-semibold">
                            {getSubName(r.subcategory_id)} {r.plan_id ? <span className="ms-2 badge badge-soft">Plan</span> : null}
                          </td>
                          <td>{r.side || "—"}</td>

                          <td className="text-end">{fmtPrice(r.entry_price)}</td>
                          <td className="text-end">{fmtPrice(r.exit_price)}</td>

                          <td className="text-end profit">{fmtMoney(r.profit)}</td>
                          <td className="text-end loss">{fmtMoney(r.loss)}</td>
                          <td className="text-end brokerage">{fmtMoney(r.brokerage)}</td>

                          <td className="text-end">
                            <span className={`net-pill ${net >= 0 ? "net-pill-good" : "net-pill-bad"}`}>{fmtMoney(net)}</span>
                          </td>

                          <td>
                            <div className="logic-mini">{r.trade_logic || "—"}</div>
                            {r.mistakes ? <div className="mistake-mini mt-1">{r.mistakes}</div> : null}
                            {r.option_type === "CALL" ? <div className="mini-option mt-1 call">CALL</div> : null}
                            {r.option_type === "PUT" ? <div className="mini-option mt-1 put">PUT</div> : null}
                          </td>

                          <td className="text-end">
                            <div className="d-inline-flex gap-2">
                              <button className="btn btn-outline-secondary btn-sm btn-action" onClick={() => openEdit(r)}>
                                Update
                              </button>
                              <button className="btn btn-outline-danger btn-sm btn-action" onClick={() => askDelete(r.journal_id)}>
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

      {/* Edit Modal */}
      {editOpen && editing && (
        <div className="modal-backdrop-custom" onMouseDown={() => setEditOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-bold">Update Entry #{editing.journal_id}</div>
              <button className="btn btn-sm btn-light" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Category ID</label>
                <input className="form-control" value={editing.category_id ?? ""} onChange={(e) => setEditing((p) => ({ ...p, category_id: e.target.value }))} inputMode="numeric" />
              </div>
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Subcategory ID</label>
                <input className="form-control" value={editing.subcategory_id ?? ""} onChange={(e) => setEditing((p) => ({ ...p, subcategory_id: e.target.value }))} inputMode="numeric" />
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">Plan ID (optional)</label>
                <input className="form-control" value={editing.plan_id ?? ""} onChange={(e) => setEditing((p) => ({ ...p, plan_id: e.target.value }))} inputMode="numeric" />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Date</label>
                <input type="date" className="form-control" value={editing.trade_date ?? ""} onChange={(e) => setEditing((p) => ({ ...p, trade_date: e.target.value }))} />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Side</label>
                <select className="form-select" value={editing.side ?? "BUY"} onChange={(e) => setEditing((p) => ({ ...p, side: e.target.value }))}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Entry</label>
                <input className="form-control" value={editing.entry_price ?? ""} onChange={(e) => setEditing((p) => ({ ...p, entry_price: e.target.value }))} inputMode="decimal" />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Exit</label>
                <input className="form-control" value={editing.exit_price ?? ""} onChange={(e) => setEditing((p) => ({ ...p, exit_price: e.target.value }))} inputMode="decimal" />
              </div>

              <div className="col-4">
                <label className="form-label small text-muted mb-1">Profit</label>
                <input className="form-control" value={editing.profit ?? "0"} onChange={(e) => setEditing((p) => ({ ...p, profit: e.target.value }))} inputMode="decimal" />
              </div>

              <div className="col-4">
                <label className="form-label small text-muted mb-1">Loss</label>
                <input className="form-control" value={editing.loss ?? "0"} onChange={(e) => setEditing((p) => ({ ...p, loss: e.target.value }))} inputMode="decimal" />
              </div>

              <div className="col-4">
                <label className="form-label small text-muted mb-1">Brokerage</label>
                <input className="form-control" value={editing.brokerage ?? "0"} onChange={(e) => setEditing((p) => ({ ...p, brokerage: e.target.value }))} inputMode="decimal" />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Trades Count</label>
                <input className="form-control" value={editing.trades_count ?? "1"} onChange={(e) => setEditing((p) => ({ ...p, trades_count: e.target.value }))} inputMode="numeric" />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Segment</label>
                <input className="form-control" value={editing.segment ?? ""} onChange={(e) => setEditing((p) => ({ ...p, segment: e.target.value }))} />
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">Trade Logic</label>
                <textarea className="form-control" rows={2} value={editing.trade_logic ?? ""} onChange={(e) => setEditing((p) => ({ ...p, trade_logic: e.target.value }))} />
              </div>

              <div className="col-12">
                <label className="form-label small text-muted mb-1">Mistakes</label>
                <textarea className="form-control" rows={2} value={editing.mistakes ?? ""} onChange={(e) => setEditing((p) => ({ ...p, mistakes: e.target.value }))} />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Strike Price (Options)</label>
                <input className="form-control" value={editing.strike_price ?? ""} onChange={(e) => setEditing((p) => ({ ...p, strike_price: e.target.value }))} inputMode="decimal" />
              </div>

              <div className="col-6">
                <label className="form-label small text-muted mb-1">Option Type</label>
                <select className="form-select" value={editing.option_type ?? ""} onChange={(e) => setEditing((p) => ({ ...p, option_type: e.target.value }))}>
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

      {/* Confirm */}
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

  .month-strip{
    background: rgba(255,255,255,.85);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
  }
  .month-left{ min-width: 220px; }
  .month-title{ font-weight: 900; color: rgba(0,0,0,.78); line-height: 1.1; }
  .month-sub{ font-size: 12px; color: rgba(0,0,0,.55); margin-top: 2px; }

  .soft-card{
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,.08);
    backdrop-filter: blur(8px);
  }

  /* Header stat squares */
  .stat-row{
    display: inline-flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .stat-box{
    width: 120px;
    height: 58px;
    border-radius: 14px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.1;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    border: 1px solid rgba(0,0,0,.06);
    background: rgba(255,255,255,.9);
  }
  .stat-k{
    font-size: 11px;
    font-weight: 800;
    opacity: .7;
  }
  .stat-v{
    font-size: 12px;
    font-weight: 900;
    margin-top: 2px;
  }
  .stat-profit{
    border-color: rgba(34,197,94,.22);
    background: rgba(34,197,94,.10);
    color: rgba(21,128,61,.95);
  }
  .stat-loss{
    border-color: rgba(239,68,68,.22);
    background: rgba(239,68,68,.10);
    color: rgba(185,28,28,.95);
  }
  .stat-net-pos{
    border-color: rgba(59,130,246,.22);
    background: rgba(59,130,246,.10);
    color: rgba(30,64,175,.95);
  }
  .stat-net-neg{
    border-color: rgba(239,68,68,.22);
    background: rgba(239,68,68,.08);
    color: rgba(185,28,28,.95);
  }

  /* Per-trade net square */
  .net-box{
    width: 92px;
    height: 52px;
    border-radius: 14px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    border: 1px solid rgba(0,0,0,.06);
    flex-shrink: 0;
  }
  .net-k{ font-size: 11px; font-weight: 800; opacity: .72; }
  .net-v{ font-size: 12px; font-weight: 900; margin-top: 2px; }
  .net-good{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(21,128,61,.95); }
  .net-bad{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(185,28,28,.95); }

  /* square net in table */
  .net-pill{
    display: inline-flex;
    min-width: 84px;
    height: 32px;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 12px;
    border: 1px solid rgba(0,0,0,.06);
    box-shadow: 0 10px 20px rgba(0,0,0,.06);
    background: rgba(255,255,255,.88);
  }
  .net-pill-good{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(21,128,61,.95); }
  .net-pill-bad{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(185,28,28,.95); }

  /* Date separator */
  .date-sep{
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 4px;
  }
  .date-line{
    height: 1px;
    background: rgba(0,0,0,.55);
    flex: 1;
  }
  .date-pill{
    font-size: 12px;
    font-weight: 900;
    color: rgba(0,0,0,.78);
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,.85);
    border: 1px solid rgba(0,0,0,.10);
    white-space: nowrap;
  }

  /* black line after each card */
  .card-divider{
    height: 1px;
    background: rgba(0,0,0,.35);
    margin-top: 12px;
  }

  .toast-custom{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
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
    width: min(720px, 95vw);
    max-height: 85vh;
    overflow: auto;
    background: #fff;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 22px 70px rgba(0,0,0,.28);
  }

  .journal-card{
    background: rgba(255,255,255,.95);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
  }

  .mini-k{ font-size: 12px; color: rgba(0,0,0,.55); }
  .mini-v{ font-weight: 800; line-height: 1.1; }

  .profit{ color: #16a34a !important; }
  .loss{ color: #dc2626 !important; }
  .brokerage{ color: #a16207 !important; }

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

  .chips{ display:flex; flex-wrap:wrap; gap:8px; }
  .chip{
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(0,0,0,.08);
    background: rgba(255,255,255,.85);
    color: rgba(0,0,0,.72);
    font-weight: 700;
  }
  .chip-call{ background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.22); color: rgba(21,128,61,.9); }
  .chip-put{ background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.20); color: rgba(185,28,28,.9); }

  .badge-soft{
    background: rgba(79,70,229,.10);
    color: #3730a3;
    border: 1px solid rgba(79,70,229,.20);
  }

  .btn-action{
    border-radius: 10px !important;
    padding: 6px 12px !important;
    font-weight: 700;
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
