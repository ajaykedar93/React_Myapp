// DipWid.jsx
// Base URL: http://localhost:5000
// Uses Auth:
//   const { user } = useAuth();
//   const userId = user?.id ?? user?.user_id ?? null;
//
// APIs (as you asked):
//   POST /api/dipwid
//   GET  /api/dipwid
//   GET  /api/dipwid/ledger
//
// Also uses (optional dropdowns):
//   GET /api/category
//   GET /api/subcategory?category_id=1
//
// UI:
// - Bootstrap responsive (mobile cards + desktop table)
// - Center modals + center toast
// - Soft borders (no dark border)

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "http://localhost:5000";

export default function DipWid() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id ?? null;

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (userId) h["x-user-id"] = String(userId);
    return h;
  }, [userId]);

  const [tab, setTab] = useState("txn"); // txn | ledger

  const [loadingTxn, setLoadingTxn] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [txns, setTxns] = useState([]);
  const [ledger, setLedger] = useState([]);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [form, setForm] = useState({
    txn_type: "DEPOSIT",
    amount: "",
    txn_date: "",
    note: "",
    category_id: "",
    subcategory_id: "",
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

  const fmtMoney = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  async function loadCategories() {
    const data = await safeFetch("/api/category", { method: "GET" });
    setCategories(data?.data || []);
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    const data = await safeFetch(`/api/subcategory?category_id=${categoryId}`, { method: "GET" });
    setSubcategories(data?.data || []);
  }

  async function loadTxns() {
    try {
      setLoadingTxn(true);
      const data = await safeFetch("/api/dipwid", { method: "GET" });
      setTxns(data?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load transactions");
    } finally {
      setLoadingTxn(false);
    }
  }

  async function loadLedger() {
    try {
      setLoadingLedger(true);
      const data = await safeFetch("/api/dipwid/ledger", { method: "GET" });
      setLedger(data?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        await loadCategories();
        await loadTxns();
        await loadLedger();
      } catch (e) {
        showToast("danger", e.message || "Failed to load data");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!selectedCategoryId) {
      setSubcategories([]);
      setForm((p) => ({ ...p, category_id: "", subcategory_id: "" }));
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
      txn_type: "DEPOSIT",
      amount: "",
      txn_date: "",
      note: "",
      category_id: selectedCategoryId || "",
      subcategory_id: "",
    });
  }

  async function createTxn(e) {
    e.preventDefault();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return showToast("warning", "Amount must be > 0");

    const payload = {
      txn_type: form.txn_type,
      amount,
      txn_date: form.txn_date || undefined,
      note: form.note?.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null,
    };

    try {
      await safeFetch("/api/dipwid", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("success", "Saved ✅");
      resetForm();
      await Promise.all([loadTxns(), loadLedger()]);
    } catch (e2) {
      showToast("danger", e2.message || "Create failed");
    }
  }

  if (!userId) {
    return (
      <div className="container-fluid p-0 bg-light min-vh-100 d-flex align-items-center justify-content-center">
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
    <div className="container-fluid p-0 min-vh-100 bg-light">
      <style>{css}</style>

      {/* Header */}
      <div className="bg-white border-bottom sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between">
          <div className="fw-bold">Deposit / Withdraw</div>
          <span className="badge text-bg-primary">User: {userId}</span>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-3 py-3">
        {/* Tabs */}
        <div className="soft-card p-2 mb-3">
          <div className="d-flex gap-2 overflow-auto">
            <button
              className={`btn btn-sm ${tab === "txn" ? "btn-primary" : "btn-outline-secondary"} tabBtn`}
              onClick={() => setTab("txn")}
            >
              Transactions
            </button>
            <button
              className={`btn btn-sm ${tab === "ledger" ? "btn-primary" : "btn-outline-secondary"} tabBtn`}
              onClick={() => setTab("ledger")}
            >
              Ledger
            </button>

            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={loadTxns} disabled={loadingTxn}>
                {loadingTxn ? "..." : "Refresh Txn"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={loadLedger} disabled={loadingLedger}>
                {loadingLedger ? "..." : "Refresh Ledger"}
              </button>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* Create */}
          <div className="col-12 col-lg-5">
            <div className="soft-card p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Add Transaction</div>
                <button className="btn btn-sm btn-outline-secondary" type="button" onClick={resetForm}>
                  Reset
                </button>
              </div>

              {/* Optional category/sub selection */}
              <div className="row g-2 mb-2">
                <div className="col-7">
                  <label className="form-label small text-muted mb-1">Category (optional)</label>
                  <select
                    className="form-select"
                    value={selectedCategoryId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedCategoryId(v);
                      setF("category_id", v);
                      setF("subcategory_id", "");
                    }}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-5">
                  <label className="form-label small text-muted mb-1">Subcategory</label>
                  <select
                    className="form-select"
                    value={form.subcategory_id}
                    onChange={(e) => setF("subcategory_id", e.target.value)}
                    disabled={!selectedCategoryId}
                  >
                    <option value="">None</option>
                    {subcategories.map((s) => (
                      <option key={s.subcategory_id} value={s.subcategory_id}>
                        {s.subcategory_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form className="row g-2" onSubmit={createTxn}>
                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Type</label>
                  <select className="form-select" value={form.txn_type} onChange={(e) => setF("txn_type", e.target.value)}>
                    <option value="DEPOSIT">DEPOSIT</option>
                    <option value="WITHDRAW">WITHDRAW</option>
                  </select>
                </div>

                <div className="col-6">
                  <label className="form-label small text-muted mb-1">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.txn_date}
                    onChange={(e) => setF("txn_date", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Amount</label>
                  <input
                    className="form-control"
                    value={form.amount}
                    onChange={(e) => setF("amount", e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 5000"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Note (optional)</label>
                  <input
                    className="form-control"
                    value={form.note}
                    onChange={(e) => setF("note", e.target.value)}
                    placeholder="e.g. Added capital / Profit booked"
                  />
                </div>

                <div className="col-12 d-grid mt-1">
                  <button className="btn btn-primary btn-sm" type="submit">
                    Save
                  </button>
                </div>

                <div className="col-12">
                  <div className="small text-muted">
                    Ledger auto: Deposit (+), Withdraw (-), running balance.
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right panel: Transactions or Ledger */}
          <div className="col-12 col-lg-7">
            {tab === "txn" ? (
              <div className="soft-card p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-semibold">Transactions</div>
                  <span className="small text-muted">{txns.length}</span>
                </div>

                {txns.length === 0 && !loadingTxn ? (
                  <div className="alert alert-light border small mb-0">No transactions</div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="d-lg-none d-flex flex-column gap-2">
                      {txns.map((t) => (
                        <div key={t.dipwid_id} className="soft-item">
                          <div className="d-flex justify-content-between gap-2">
                            <div className="fw-semibold text-truncate">
                              #{t.dipwid_id} • {t.txn_date}
                            </div>
                            <span className={`badge ${t.txn_type === "DEPOSIT" ? "text-bg-success" : "text-bg-danger"}`}>
                              {t.txn_type}
                            </span>
                          </div>
                          <div className="small text-muted mt-1">
                            Amount: <span className="fw-semibold">{fmtMoney(t.amount)}</span>
                          </div>
                          <div className="small text-muted">
                            Cat: <span className="fw-semibold">{t.category_id ?? "-"}</span> • Sub:{" "}
                            <span className="fw-semibold">{t.subcategory_id ?? "-"}</span>
                          </div>
                          {t.note ? <div className="small text-muted mt-1">{t.note}</div> : null}
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="d-none d-lg-block table-responsive">
                      <table className="table table-sm align-middle mb-0 table-hover">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th className="text-end">Amount</th>
                            <th>Cat/Sub</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txns.map((t) => (
                            <tr key={t.dipwid_id}>
                              <td className="fw-semibold">#{t.dipwid_id}</td>
                              <td>{t.txn_date}</td>
                              <td>
                                <span className={`badge ${t.txn_type === "DEPOSIT" ? "text-bg-success" : "text-bg-danger"}`}>
                                  {t.txn_type}
                                </span>
                              </td>
                              <td className="text-end">{fmtMoney(t.amount)}</td>
                              <td className="small">
                                {t.category_id ?? "-"} / {t.subcategory_id ?? "-"}
                              </td>
                              <td className="small text-muted">{t.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="soft-card p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-semibold">Ledger (Running Balance)</div>
                  <span className="small text-muted">{ledger.length}</span>
                </div>

                {ledger.length === 0 && !loadingLedger ? (
                  <div className="alert alert-light border small mb-0">No ledger data</div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="d-lg-none d-flex flex-column gap-2">
                      {ledger.map((l) => (
                        <div key={l.dipwid_id} className="soft-item">
                          <div className="d-flex justify-content-between gap-2">
                            <div className="fw-semibold text-truncate">
                              {l.txn_date_display || l.txn_date}
                            </div>
                            <span className={`badge ${l.txn_type === "DEPOSIT" ? "text-bg-success" : "text-bg-danger"}`}>
                              {l.txn_type}
                            </span>
                          </div>

                          <div className="small text-muted mt-1">
                            Signed:{" "}
                            <span className={`fw-semibold ${Number(l.signed_amount) >= 0 ? "text-success" : "text-danger"}`}>
                              {fmtMoney(l.signed_amount)}
                            </span>
                          </div>

                          <div className="small text-muted">
                            Remaining: <span className="fw-semibold">{fmtMoney(l.remaining_amount)}</span>
                          </div>

                          <div className="small text-muted">
                            Cat: <span className="fw-semibold">{l.category_id ?? "-"}</span> • Sub:{" "}
                            <span className="fw-semibold">{l.subcategory_id ?? "-"}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="d-none d-lg-block table-responsive">
                      <table className="table table-sm align-middle mb-0 table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th className="text-end">Amount</th>
                            <th className="text-end">Signed</th>
                            <th className="text-end">Remaining</th>
                            <th>Cat/Sub</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.map((l) => (
                            <tr key={l.dipwid_id}>
                              <td className="fw-semibold">{l.txn_date_display || l.txn_date}</td>
                              <td>
                                <span className={`badge ${l.txn_type === "DEPOSIT" ? "text-bg-success" : "text-bg-danger"}`}>
                                  {l.txn_type}
                                </span>
                              </td>
                              <td className="text-end">{fmtMoney(l.amount)}</td>
                              <td className="text-end">
                                <span className={`fw-semibold ${Number(l.signed_amount) >= 0 ? "text-success" : "text-danger"}`}>
                                  {fmtMoney(l.signed_amount)}
                                </span>
                              </td>
                              <td className="text-end">
                                <span className="badge text-bg-info">{fmtMoney(l.remaining_amount)}</span>
                              </td>
                              <td className="small">
                                {l.category_id ?? "-"} / {l.subcategory_id ?? "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm (kept for future delete features if you add) */}
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
                Yes
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
  .soft-card{
    background: #fff;
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(0,0,0,.06);
  }

  .soft-item{
    background: #fff;
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 14px;
    padding: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.05);
  }

  .tabBtn{
    white-space: nowrap;
    border-radius: 999px !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.06) !important;
  }

  .modal-backdrop-custom{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    display: grid;
    place-items: center;
    z-index: 1055;
    padding: 12px;
  }

  .modal-card{
    width: min(520px, 95vw);
    background: #fff;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 18px 60px rgba(0,0,0,.22);
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
      background: #fff;
      z-index: 1;
    }
  }
`;
