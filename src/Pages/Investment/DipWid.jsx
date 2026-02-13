// DipWid.jsx
// Base URL: http://localhost:5000
//
// APIs used (your routes):
// - GET  /api/investment/category
// - GET  /api/investment/subcategory?category_id=ID   (if you don't have this, see note below)
// - GET  /api/dipwid?category_id=ID&subcategory_id=ID
// - GET  /api/dipwid/ledger?category_id=ID&subcategory_id=ID
// - POST /api/dipwid
//
// UI:
// ✅ Mobile-first, attractive cards
// ✅ Select Category -> Subcategory (cascading)
// ✅ Add Deposit/Withdraw with auto current date (YYYY-MM-DD) and time shown as "2:10 pm"
// ✅ Shows: Total Fund (ledger running balance), Total Deposit, Total Withdraw
// ✅ Shows lists with Date: "1 Jan 2026" + Time: "2:10 pm" (Indian format)
// ✅ Uses x-user-id header from Auth

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function DipWid() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id ?? null;

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (userId) h["x-user-id"] = String(userId);
    return h;
  }, [userId]);

  const [loading, setLoading] = useState(false);

  // master lists
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // selections
  const [selCategoryId, setSelCategoryId] = useState("");
  const [selSubId, setSelSubId] = useState("");

  // data
  const [txns, setTxns] = useState([]); // dipwid transactions (DESC by date)
  const [ledger, setLedger] = useState([]); // ledger (ASC by date)

  // form
  const [txnType, setTxnType] = useState("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [txnDate, setTxnDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`; // auto select current date
  });

  const [toast, setToast] = useState(null);

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

  const isoDay = (v) => (v ? String(v).slice(0, 10) : "");

  // Date: "1 Jan 2026"
  const fmtDateOnly = (v) => {
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

  // Time: "2:10 pm" (Indian 12-hour)
  const fmtTimeOnly = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
        .format(d)
        .replace("am", "am")
        .replace("pm", "pm")
        .toLowerCase();
    } catch {
      return "";
    }
  };

  const selectedCategory = useMemo(() => {
    return (categories || []).find((c) => String(c.category_id ?? c.id) === String(selCategoryId)) || null;
  }, [categories, selCategoryId]);

  const selectedSub = useMemo(() => {
    return (subcategories || []).find((s) => String(s.subcategory_id ?? s.id) === String(selSubId)) || null;
  }, [subcategories, selSubId]);

  // totals for selected filters
  const totals = useMemo(() => {
    let dep = 0;
    let wid = 0;

    (txns || []).forEach((t) => {
      const a = toNum(t.amount);
      const type = String(t.txn_type || "").toUpperCase();
      if (type === "DEPOSIT") dep += a;
      if (type === "WITHDRAW") wid += a;
    });

    // Fund = latest ledger balance (if view gives running_balance / balance)
    let fundBal = 0;
    if (ledger && ledger.length) {
      const last = ledger[ledger.length - 1];
      fundBal =
        toNum(last.running_balance) ||
        toNum(last.balance) ||
        toNum(last.fund_remaining) ||
        toNum(last.total_fund) ||
        0;
    } else {
      // fallback = deposits - withdraw
      fundBal = dep - wid;
    }

    return {
      totalDeposit: dep,
      totalWithdraw: wid,
      totalFund: fundBal,
    };
  }, [txns, ledger]);

  // Load categories
  async function loadCategories() {
    const data = await safeFetch("/api/investment/category", { method: "GET" });
    setCategories(data?.data || []);
  }

  // Load subcategories for category
  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    // ✅ If your backend endpoint is different, change this URL only.
    // Example alternate: /api/investment/subcategory?category_id=ID
    const data = await safeFetch(`/api/investment/subcategory?category_id=${encodeURIComponent(categoryId)}`, {
      method: "GET",
    });
    setSubcategories(data?.data || []);
  }

  // Load transactions + ledger for current selection
  async function loadDipWid(categoryId = selCategoryId, subId = selSubId) {
    if (!categoryId || !subId) {
      setTxns([]);
      setLedger([]);
      return;
    }
    const q = `?category_id=${encodeURIComponent(categoryId)}&subcategory_id=${encodeURIComponent(subId)}`;
    const [tRes, lRes] = await Promise.all([
      safeFetch(`/api/dipwid${q}`, { method: "GET" }),
      safeFetch(`/api/dipwid/ledger${q}`, { method: "GET" }),
    ]);
    setTxns(tRes?.data || []);
    setLedger(lRes?.data || []);
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        await loadCategories();
      } catch (e) {
        showToast("danger", e.message || "Failed to load categories");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // When category changes -> load subcategories, reset sub
  useEffect(() => {
    if (!userId) return;
    setSelSubId("");
    (async () => {
      try {
        setLoading(true);
        await loadSubcategories(selCategoryId);
      } catch (e) {
        showToast("danger", e.message || "Failed to load subcategories");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selCategoryId, userId]);

  // When sub changes -> load dipwid
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        await loadDipWid(selCategoryId, selSubId);
      } catch (e) {
        showToast("danger", e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selSubId, userId]);

  async function submitTxn() {
    if (!selCategoryId) return showToast("warning", "Please select category");
    if (!selSubId) return showToast("warning", "Please select subcategory");

    const amt = toNum(amount);
    if (!amt || amt <= 0) return showToast("warning", "Amount must be > 0");
    if (!txnDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(txnDate))) return showToast("warning", "Select valid date");

    const payload = {
      txn_type: txnType,
      amount: amt,
      txn_date: txnDate, // API supports date only; time shown from created_at
      note: note?.trim() || null,
      category_id: Number(selCategoryId),
      subcategory_id: Number(selSubId),
    };

    try {
      setLoading(true);
      await safeFetch("/api/dipwid", { method: "POST", body: JSON.stringify(payload) });
      showToast("success", "Saved ✅");
      setAmount("");
      setNote("");
      // keep date as current selected
      await loadDipWid(selCategoryId, selSubId);
    } catch (e) {
      showToast("danger", e.message || "Save failed");
    } finally {
      setLoading(false);
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

  const canShow = !!selCategoryId && !!selSubId;

  return (
    <div className="container-fluid p-0 min-vh-100 bg-soft">
      <style>{css}</style>

      {/* Header */}
      <div className="topbar sticky-top">
        <div className="container-fluid px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-dot" />
            <div className="fw-bold text-white">Dip / Wid</div>
          </div>

          <button className="btn btn-sm btn-glow" onClick={() => loadDipWid(selCategoryId, selSubId)} disabled={loading || !canShow}>
            {loading ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Selector Strip */}
      <div className="container-fluid px-2 px-md-3 pt-3">
        <div className="soft-card p-3">
          <div className="row g-2">
            <div className="col-12 col-lg-6">
              <div className="fw-bold">Select Category</div>
              <div className="small text-muted">First choose category</div>
              <select className="form-select mt-1" value={selCategoryId} onChange={(e) => setSelCategoryId(e.target.value)}>
                <option value="">Select</option>
                {(categories || []).map((c) => {
                  const id = c.category_id ?? c.id;
                  const name = c.category_name ?? c.name ?? c.title ?? `Category ${id}`;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="col-12 col-lg-6">
              <div className="fw-bold">Select Subcategory</div>
              <div className="small text-muted">Then choose subcategory</div>
              <select
                className="form-select mt-1"
                value={selSubId}
                onChange={(e) => setSelSubId(e.target.value)}
                disabled={!selCategoryId || (subcategories || []).length === 0}
              >
                <option value="">{selCategoryId ? "Select" : "Select category first"}</option>
                {(subcategories || []).map((s) => {
                  const id = s.subcategory_id ?? s.id;
                  const name = s.subcategory_name ?? s.name ?? s.title ?? `Subcategory ${id}`;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Selected labels */}
          <div className="mt-3 d-flex flex-wrap gap-2">
            <span className="badge badge-soft">Category: {selectedCategory ? (selectedCategory.category_name ?? selectedCategory.name ?? selectedCategory.title) : "—"}</span>
            <span className="badge badge-soft">Subcategory: {selectedSub ? (selectedSub.subcategory_name ?? selectedSub.name ?? selectedSub.title) : "—"}</span>
          </div>
        </div>

        {/* Totals */}
        <div className="stat-row mt-3">
          <div className="stat-box stat-fund">
            <div className="stat-k">Total Fund</div>
            <div className="stat-v">{fmtMoney(totals.totalFund)}</div>
          </div>
          <div className="stat-box stat-dep">
            <div className="stat-k">Total Deposit</div>
            <div className="stat-v">{fmtMoney(totals.totalDeposit)}</div>
          </div>
          <div className="stat-box stat-wid">
            <div className="stat-k">Total Withdraw</div>
            <div className="stat-v">{fmtMoney(totals.totalWithdraw)}</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="container-fluid px-2 px-md-3 py-3">
        {/* Add Transaction */}
        <div className="soft-card p-3 p-md-4 mb-3">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            <div>
              <div className="fw-bold">Add Deposit / Withdraw</div>
              <div className="small text-muted">Date auto selected (today). Time will show from saved time.</div>
            </div>
            <span className="badge badge-soft">User: {userId}</span>
          </div>

          {!canShow ? (
            <div className="alert alert-light border small mb-0">Please select category + subcategory first.</div>
          ) : (
            <div className="row g-2">
              <div className="col-12 col-md-3">
                <label className="form-label small text-muted mb-1">Type</label>
                <select className="form-select" value={txnType} onChange={(e) => setTxnType(e.target.value)}>
                  <option value="DEPOSIT">DEPOSIT</option>
                  <option value="WITHDRAW">WITHDRAW</option>
                </select>
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label small text-muted mb-1">Amount</label>
                <input
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Enter amount"
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label small text-muted mb-1">Date</label>
                <input type="date" className="form-control" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label small text-muted mb-1">Note (optional)</label>
                <input className="form-control" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / remark" />
              </div>

              <div className="col-12 d-grid mt-1">
                <button className={`btn ${txnType === "DEPOSIT" ? "btn-success" : "btn-danger"} btn-save`} onClick={submitTxn} disabled={loading}>
                  {loading ? "Saving..." : txnType === "DEPOSIT" ? "Save Deposit" : "Save Withdraw"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="row g-3">
          {/* Deposits list */}
          <div className="col-12 col-lg-6">
            <div className="soft-card p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-bold">Deposits</div>
                <span className="badge text-bg-success">{txns.filter((t) => String(t.txn_type).toUpperCase() === "DEPOSIT").length}</span>
              </div>

              {!canShow ? (
                <div className="alert alert-light border small mb-0">Select category + subcategory.</div>
              ) : txns.filter((t) => String(t.txn_type).toUpperCase() === "DEPOSIT").length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No deposits</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {txns
                    .filter((t) => String(t.txn_type).toUpperCase() === "DEPOSIT")
                    .map((t) => (
                      <div key={t.dipwid_id} className="txn-card txn-dep">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="minw-0">
                            <div className="fw-semibold text-truncate">{t.note || "Deposit"}</div>
                            <div className="small text-muted">
                              {fmtDateOnly(t.txn_date)} • {fmtTimeOnly(t.created_at)}
                            </div>
                          </div>
                          <div className="amt-pill amt-green">+ {fmtMoney(t.amount)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Withdraw list */}
          <div className="col-12 col-lg-6">
            <div className="soft-card p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-bold">Withdrawals</div>
                <span className="badge text-bg-danger">{txns.filter((t) => String(t.txn_type).toUpperCase() === "WITHDRAW").length}</span>
              </div>

              {!canShow ? (
                <div className="alert alert-light border small mb-0">Select category + subcategory.</div>
              ) : txns.filter((t) => String(t.txn_type).toUpperCase() === "WITHDRAW").length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No withdrawals</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {txns
                    .filter((t) => String(t.txn_type).toUpperCase() === "WITHDRAW")
                    .map((t) => (
                      <div key={t.dipwid_id} className="txn-card txn-wid">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="minw-0">
                            <div className="fw-semibold text-truncate">{t.note || "Withdraw"}</div>
                            <div className="small text-muted">
                              {fmtDateOnly(t.txn_date)} • {fmtTimeOnly(t.created_at)}
                            </div>
                          </div>
                          <div className="amt-pill amt-red">- {fmtMoney(t.amount)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Ledger (optional, shows running balance timeline) */}
          <div className="col-12">
            <div className="soft-card p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-bold">Fund Ledger (Running)</div>
                <span className="small text-muted">{ledger.length}</span>
              </div>

              {!canShow ? (
                <div className="alert alert-light border small mb-0">Select category + subcategory.</div>
              ) : ledger.length === 0 && !loading ? (
                <div className="alert alert-light border small mb-0">No ledger rows</div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="d-lg-none d-flex flex-column gap-2">
                    {ledger.map((l) => {
                      const type = String(l.txn_type || "").toUpperCase();
                      const bal =
                        toNum(l.running_balance) ||
                        toNum(l.balance) ||
                        toNum(l.fund_remaining) ||
                        0;

                      return (
                        <div key={l.dipwid_id ?? `${l.txn_date}-${l.created_at}-${type}`} className="soft-item">
                          <div className="d-flex justify-content-between gap-2">
                            <div className="minw-0">
                              <div className="fw-semibold text-truncate">{type}</div>
                              <div className="small text-muted">
                                {fmtDateOnly(l.txn_date)} • {fmtTimeOnly(l.created_at)}
                              </div>
                            </div>
                            <div className={`amt-pill ${type === "DEPOSIT" ? "amt-green" : "amt-red"}`}>
                              {type === "DEPOSIT" ? "+" : "-"} {fmtMoney(l.amount)}
                            </div>
                          </div>
                          <div className="mt-2 d-flex align-items-center justify-content-between">
                            <div className="small text-muted">Balance</div>
                            <div className="fw-bold">{fmtMoney(bal)}</div>
                          </div>
                          {l.note ? <div className="small text-muted mt-1">Note: {l.note}</div> : null}
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
                          <th>Time</th>
                          <th>Type</th>
                          <th className="text-end">Amount</th>
                          <th className="text-end">Balance</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map((l) => {
                          const type = String(l.txn_type || "").toUpperCase();
                          const bal =
                            toNum(l.running_balance) ||
                            toNum(l.balance) ||
                            toNum(l.fund_remaining) ||
                            0;

                          return (
                            <tr key={l.dipwid_id ?? `${l.txn_date}-${l.created_at}-${type}`}>
                              <td className="fw-semibold">{fmtDateOnly(l.txn_date)}</td>
                              <td className="text-muted">{fmtTimeOnly(l.created_at)}</td>
                              <td>
                                <span className={`badge ${type === "DEPOSIT" ? "text-bg-success" : "text-bg-danger"}`}>{type}</span>
                              </td>
                              <td className="text-end fw-bold">
                                <span className={type === "DEPOSIT" ? "text-success" : "text-danger"}>
                                  {type === "DEPOSIT" ? "+" : "-"} {fmtMoney(l.amount)}
                                </span>
                              </td>
                              <td className="text-end fw-bold">{fmtMoney(bal)}</td>
                              <td className="text-muted">{l.note || "—"}</td>
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
    border-radius: 12px;
    font-weight: 800;
  }
  .btn-glow:hover{ background: rgba(255,255,255,.26); color: #fff; }

  .soft-card{
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,.08);
    backdrop-filter: blur(8px);
  }

  .stat-row{
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  @media (max-width: 991px){
    .stat-row{ grid-template-columns: repeat(1, minmax(0, 1fr)); }
  }

  .stat-box{
    height: 66px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    border: 1px solid rgba(0,0,0,.06);
    background: rgba(255,255,255,.9);
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
  }
  .stat-k{ font-size: 11px; font-weight: 900; opacity: .7; }
  .stat-v{ font-size: 13px; font-weight: 900; margin-top: 3px; }

  .stat-fund{ border-color: rgba(59,130,246,.22); background: rgba(59,130,246,.10); color: rgba(30,64,175,.95); }
  .stat-dep{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(21,128,61,.95); }
  .stat-wid{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(185,28,28,.95); }

  .soft-item{
    background: rgba(255,255,255,.95);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 10px 22px rgba(0,0,0,.05);
  }

  .btn-save{
    border-radius: 14px;
    font-weight: 900;
    padding: 10px 12px;
  }

  .txn-card{
    border-radius: 16px;
    padding: 12px;
    border: 1px solid rgba(0,0,0,.06);
    box-shadow: 0 10px 22px rgba(0,0,0,.05);
    background: rgba(255,255,255,.95);
  }
  .txn-dep{ border-left: 6px solid rgba(34,197,94,.75); }
  .txn-wid{ border-left: 6px solid rgba(239,68,68,.75); }

  .amt-pill{
    min-width: 108px;
    height: 38px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    border: 1px solid rgba(0,0,0,.06);
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    background: rgba(255,255,255,.9);
    flex-shrink: 0;
  }
  .amt-green{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(21,128,61,.95); }
  .amt-red{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(185,28,28,.95); }

  .badge-soft{
    background: rgba(79,70,229,.10);
    color: #3730a3;
    border: 1px solid rgba(79,70,229,.20);
    border-radius: 999px;
    padding: 6px 10px;
    font-weight: 900;
  }

  .toast-custom{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
  }

  .table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.06) !important;
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
