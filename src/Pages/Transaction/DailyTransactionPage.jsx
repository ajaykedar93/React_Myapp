import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";

const API = "https://express-backend-myapp.onrender.com/api";

// ---------- HTTP (longer timeout for cold starts) ----------
const http = axios.create({
  baseURL: API,
  timeout: 45000,
});

// ---------- Cache helpers ----------
const CACHE_KEY = "dtp_v1";
const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const saveCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, _ts: Date.now() }));
  } catch {}
};

// ---------- Utils ----------
function getLocalDate() {
  const now = new Date();
  return now.toLocaleDateString("en-CA"); // YYYY-MM-DD
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, { tries = 4, delay = 600 }) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(delay * (i + 1));
    }
  }
  throw lastErr;
}

// ---------- Warm-up ----------
async function warmUp() {
  try {
    await retry(() => http.get(`/health`, { params: { t: Date.now() } }), { tries: 2, delay: 500 });
  } catch {}
}

export default function DailyTransactionPage() {
  // ---------- State ----------
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]); // global store (for showing names in history)
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_debit: 0, total_credit: 0, total_transactions: 0 });

  const [form, setForm] = useState({
    amount: "",
    quantity: "",
    type: "debit",
    category_id: "",
    subcategory_id: "",
    purpose: "",
    transaction_date: getLocalDate(),
  });

  const [editingId, setEditingId] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [page, setPage] = useState(1);
  const [highlightId, setHighlightId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ---------- Boot spinner ----------
  const [booting, setBooting] = useState(true);
  const [filterDate, setFilterDate] = useState(getLocalDate());

  // ✅ mobile list clean view toggle
  const [mobileViewMode, setMobileViewMode] = useState("compact"); // compact | detailed

  // ---------- Pagination ----------
  const perPage = 20;
  const startIdx = (page - 1) * perPage;

  // ---------- Refs ----------
  const tableEndRef = useRef(null);
  const abortersRef = useRef({}); // {key: AbortController}

  // ---------- INR ----------
  const INR = useMemo(
    () => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }),
    []
  );

  // ✅ FAST LOOKUP MAPS
  const catMap = useMemo(() => {
    const m = new Map();
    (categories || []).forEach((c) => m.set(String(c.category_id), c.category_name));
    return m;
  }, [categories]);

  const subMap = useMemo(() => {
    const m = new Map();
    (subcategories || []).forEach((s) => m.set(String(s.subcategory_id), s.subcategory_name));
    return m;
  }, [subcategories]);

  // Keep today's date fresh once a minute
  useEffect(() => {
    const timer = setInterval(() => {
      setForm((prev) => ({ ...prev, transaction_date: getLocalDate() }));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock body scroll while booting
  useEffect(() => {
    if (booting) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [booting]);

  // ---------- Abort helpers ----------
  const newAborter = (key) => {
    abortersRef.current[key]?.abort?.();
    const ctrl = new AbortController();
    abortersRef.current[key] = ctrl;
    return ctrl.signal;
  };
  const cleanupAborters = () => {
    Object.values(abortersRef.current).forEach((c) => c?.abort?.());
    abortersRef.current = {};
  };

  // ---------- Popup ----------
  const showPopup = (message, type) => {
    setPopup({ show: true, message, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "" }), 1400);
  };

  // ---------- Scroll ----------
  const scrollToBottom = () => {
    setTimeout(() => {
      tableEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  // ---------- API wrappers ----------
  const fetchTransactions = async () => {
    const res = await retry(
      () => http.get(`/dailyTransaction`, { signal: newAborter("tx"), params: { t: Date.now() } }),
      { tries: 4, delay: 500 }
    );
    return Array.isArray(res.data) ? res.data : [];
  };

  const fetchSummary = async () => {
    const res = await retry(
      () => http.get(`/dailyTransaction/daily-summary`, { signal: newAborter("sum"), params: { t: Date.now() } }),
      { tries: 4, delay: 500 }
    );
    return res.data || { total_debit: 0, total_credit: 0, total_transactions: 0 };
  };

  // ✅ category API path fixed
  const fetchCategories = async () => {
    const res = await retry(
      () =>
        http.get(`/transaction-category/categories`, {
          signal: newAborter("cats"),
          params: { t: Date.now() },
        }),
      { tries: 4, delay: 500 }
    );
    return Array.isArray(res.data) ? res.data : [];
  };

  const fetchSubcategoriesByCategory = async (catId) => {
    if (!catId) return [];
    const res = await retry(
      () =>
        http.get(`/transaction-category/categories/${catId}/subcategories`, {
          signal: newAborter("subs"),
          params: { t: Date.now() },
        }),
      { tries: 4, delay: 500 }
    );
    return Array.isArray(res.data) ? res.data : [];
  };

  // ---------- INSTANT LOAD + RESILIENT FIRST BATCH ----------
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setCategories(cached.categories || []);
      setSubcategories(cached.subcategories || []);
      setTransactions(cached.transactions || []);
      setSummary(cached.summary || { total_debit: 0, total_credit: 0, total_transactions: 0 });
    }

    let bootCap;
    (async () => {
      try {
        await warmUp();
        bootCap = setTimeout(() => setBooting(false), 2500);

        const results = await Promise.allSettled([fetchCategories(), fetchTransactions(), fetchSummary()]);
        const catsRes = results[0];
        const txRes = results[1];
        const sumRes = results[2];

        let anySuccess = false;

        if (catsRes.status === "fulfilled") {
          setCategories(catsRes.value);
          anySuccess = true;
        }
        if (txRes.status === "fulfilled") {
          setTransactions(txRes.value);
          anySuccess = true;
        }
        if (sumRes.status === "fulfilled") {
          setSummary(sumRes.value);
          anySuccess = true;
        }

        saveCache({
          categories: catsRes.status === "fulfilled" ? catsRes.value : categories,
          subcategories,
          transactions: txRes.status === "fulfilled" ? txRes.value : transactions,
          summary: sumRes.status === "fulfilled" ? sumRes.value : summary,
        });

        if (!anySuccess) showPopup("Network error — showing cached data", "error");
      } finally {
        setPage(1);
        setBooting(false);
      }
    })();

    const onBackOnline = () => {
      (async () => {
        try {
          const results = await Promise.allSettled([fetchCategories(), fetchTransactions(), fetchSummary()]);
          const catsRes = results[0];
          const txRes = results[1];
          const sumRes = results[2];

          if (catsRes.status === "fulfilled") setCategories(catsRes.value);
          if (txRes.status === "fulfilled") setTransactions(txRes.value);
          if (sumRes.status === "fulfilled") setSummary(sumRes.value);

          saveCache({
            categories: catsRes.status === "fulfilled" ? catsRes.value : categories,
            subcategories,
            transactions: txRes.status === "fulfilled" ? txRes.value : transactions,
            summary: sumRes.status === "fulfilled" ? sumRes.value : summary,
          });
        } catch {}
      })();
    };
    window.addEventListener("online", onBackOnline);

    return () => {
      window.removeEventListener("online", onBackOnline);
      cleanupAborters();
      if (bootCap) clearTimeout(bootCap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Dependent subcategory loading
  useEffect(() => {
    const catId = form.category_id;

    setForm((prev) => ({ ...prev, subcategory_id: "" }));

    if (!catId) {
      setFilteredSubs([]);
      return;
    }

    (async () => {
      try {
        const subs = await fetchSubcategoriesByCategory(catId);
        setFilteredSubs(subs);

        // merge for history display
        setSubcategories((prev) => {
          const map = new Map((prev || []).map((s) => [String(s.subcategory_id), s]));
          subs.forEach((s) => map.set(String(s.subcategory_id), s));
          const merged = Array.from(map.values());
          saveCache({ categories, subcategories: merged, transactions, summary });
          return merged;
        });
      } catch {
        setFilteredSubs([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ---------- Derived: transactions for selected date ----------
  const dayTransactions = useMemo(() => {
    const key = (d) => String(d || "").slice(0, 10);
    return transactions.filter((t) => key(t.transaction_date) === key(filterDate));
  }, [transactions, filterDate]);

  // ---------- Derived: summary for selected date ----------
  const daySummary = useMemo(() => {
    let debit = 0,
      credit = 0;
    for (const t of dayTransactions) {
      const amt = Number(t.amount || 0);
      if ((t.type || "").toLowerCase() === "credit") credit += amt;
      else debit += amt;
    }
    return {
      total_debit: debit,
      total_credit: credit,
      total_transactions: dayTransactions.length,
    };
  }, [dayTransactions]);

  // ---------- Pagination ----------
  const pagedTransactions = useMemo(
    () => dayTransactions.slice(startIdx, startIdx + perPage),
    [dayTransactions, startIdx]
  );
  const totalPages = Math.ceil(dayTransactions.length / perPage) || 1;

  useEffect(() => {
    setPage(1);
  }, [filterDate, transactions.length]);

  // ---------- Mutations ----------
  const addOrUpdateTransaction = async () => {
    if (!form.amount || !form.category_id) {
      return showPopup("Please fill required fields (Amount, Category)", "error");
    }
    try {
      let id = null;

      if (editingId) {
        await http.put(`/dailyTransaction/${editingId}`, form, { signal: newAborter("save") });
        id = editingId;
        showPopup("Transaction updated", "success");
        setEditingId(null);
      } else {
        const res = await http.post(`/dailyTransaction`, form, { signal: newAborter("save") });
        if (Array.isArray(res.data) && res.data.length > 0) {
          id = res.data[res.data.length - 1].daily_transaction_id;
        }
        showPopup("Transaction added", "success");
      }

      const tx = await fetchTransactions();
      setTransactions(tx);

      saveCache({ categories, subcategories, transactions: tx, summary });

      setHighlightId(id);
      scrollToBottom();
      setForm({
        amount: "",
        quantity: "",
        type: "debit",
        category_id: "",
        subcategory_id: "",
        purpose: "",
        transaction_date: getLocalDate(),
      });
      setPage(1);
    } catch (e) {
      if (axios.isCancel(e)) return;
      showPopup("Failed to save transaction", "error");
    }
  };

  const askDelete = (id) => setConfirmDeleteId(id);

  const deleteTransaction = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleting(true);
      await http.delete(`/dailyTransaction/${confirmDeleteId}`, { signal: newAborter("del") });
      showPopup("Transaction deleted", "success");
      setConfirmDeleteId(null);

      const tx = await fetchTransactions();
      setTransactions(tx);

      saveCache({ categories, subcategories, transactions: tx, summary });
      setPage(1);
    } catch (e) {
      if (!axios.isCancel(e)) showPopup("Failed to delete transaction", "error");
    } finally {
      setDeleting(false);
    }
  };

  const editTransaction = (t) => {
    setEditingId(t.daily_transaction_id);
    setForm({
      amount: t.amount,
      quantity: t.quantity ?? "",
      type: t.type,
      category_id: String(t.category_id ?? ""),
      subcategory_id: String(t.subcategory_id ?? ""),
      purpose: t.purpose ?? "",
      transaction_date: String(t.transaction_date || "").slice(0, 10),
    });
    setHighlightId(t.daily_transaction_id);
    // ensure subcats list for this category loads
    if (t.category_id) {
      setForm((prev) => ({ ...prev, category_id: String(t.category_id) }));
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      amount: "",
      quantity: "",
      type: "debit",
      category_id: "",
      subcategory_id: "",
      purpose: "",
      transaction_date: getLocalDate(),
    });
    setHighlightId(null);
  };

  // ✅ professional mobile meta line
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="dtp-root" style={{ background: "var(--bg)" }}>
      <style>{`
        :root{
          --ink-900:#0f172a; --ink-700:#334155; --ink-600:#475569; --ink-500:#64748b;
          --surface:#ffffff; --border:#e6e9ef; --bg:#f6f8fb;
          --brand-grad: linear-gradient(90deg,#5f4bb6 0%, #1f5f78 100%);
          --accent:#2b7a8b; --success:#0f8a5f; --danger:#b33a3a;
          --rad:14px;
          --px-desktop: clamp(12px, 3.5vw, 20px);
          --px-mobile: 0px;
          --fs: clamp(14px, 3.6vw, 16px);
          --fs-sm: clamp(12px, 3.2vw, 14px);
          --fs-lg: clamp(16px, 4.2vw, 18px);
        }

        html, body{
          width:100%;
          max-width:100%;
          margin:0 !important;
          padding:0 !important;
          overflow-x:hidden !important;
          background: var(--bg);
        }
        .dtp-root{ width:100%; margin:0; padding:0; padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
        @media (min-width: 768px){ .dtp-root{ padding-bottom: 24px; } }

        .page-wrap{
          width:100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 0 var(--px-desktop);
        }
        @media (max-width: 767.98px){ .page-wrap{ max-width: 100%; padding: 0 var(--px-mobile); } }

        .title{
          font-size: clamp(18px, 5.2vw, 24px);
          background: var(--brand-grad);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          font-weight: 800; letter-spacing:.35px; text-align:center;
          padding: 12px 0;
          margin: 0 0 8px;
        }

        .kpi-grid{ display:grid; gap:12px; grid-template-columns: 1fr; margin-bottom: 10px; }
        @media (min-width:576px){ .kpi-grid{ grid-template-columns: repeat(3,1fr); } }

        .card-ui{
          background: var(--surface);
          border:1px solid var(--border);
          border-radius: var(--rad);
          padding: 12px;
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
        }
        @media (max-width: 767.98px){ .card-ui{ border-left: 0; border-right: 0; border-radius: 0; } }

        .kpi-card h6{ font-size: var(--fs-sm); color: var(--ink-600); margin: 0 0 4px; }
        .kpi-card h5{ font-size: clamp(18px, 5vw, 22px); font-weight:800; margin:0; }

        .form-card .form-label{ font-size: var(--fs-sm); margin-bottom: 4px; color: var(--ink-700); }
        .form-card .form-select, .form-card .form-control{
          font-size: var(--fs);
          padding: .6rem .75rem;
          border-radius: 12px;
          border:1px solid var(--border);
        }

        .btn-solid{
          background: var(--accent); color:#fff; border:none; border-radius:12px;
          padding:.6rem 1rem; font-weight:700; font-size: var(--fs);
        }
        .btn-ghost{
          background:#f5f7fb; border:1px dashed #cfd6e4; color:var(--ink-700);
          border-radius:12px; padding:.6rem 1rem; font-weight:700; font-size: var(--fs);
        }

        .tbl-wrap{
          border:1px solid var(--border);
          border-radius: var(--rad);
          background:#fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.06);
          padding: 8px;
        }
        @media (max-width: 767.98px){ .tbl-wrap{ border-left:0; border-right:0; border-radius:0; padding: 8px 8px; } }

        .table thead th{ position: sticky; top: 0; background:#0f172a; color:#fff; z-index: 1; }
        .table-striped>tbody>tr:nth-of-type(odd)>*{ background-color: #fafcff; }
        .table-success{ transition: background .4s ease; }

        /* ✅ MOBILE PROFESSIONAL LIST */
        .mobile-topbar{
          display:flex; justify-content:space-between; align-items:center;
          gap:10px; padding: 0 12px;
        }
        @media (min-width: 768px){ .mobile-topbar{ display:none; } }

        .seg{
          display:inline-flex; border:1px solid var(--border); background:#fff; border-radius: 999px; padding: 4px;
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
        }
        .seg button{
          border:none; background:transparent; padding:6px 10px; border-radius:999px;
          font-weight:800; font-size: 12px; color: var(--ink-700);
        }
        .seg button.active{
          background: #0f172a; color:#fff;
        }

        .mobile-list{ display: grid; gap: 10px; padding: 0 12px 10px; }
        .tx-card{
          background: #fff;
          border:1px solid var(--border);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 10px 24px rgba(2,6,23,.08);
        }
        .tx-head{
          display:flex; justify-content:space-between; align-items:flex-start; gap: 10px;
          margin-bottom: 8px;
        }
        .tx-left{ min-width: 0; }
        .tx-title{
          font-weight: 900; font-size: 15px; color: var(--ink-900);
          white-space: nowrap; overflow:hidden; text-overflow: ellipsis;
        }
        .tx-sub{
          color: var(--ink-600); font-size: 12px;
          white-space: nowrap; overflow:hidden; text-overflow: ellipsis;
        }
        .chip{
          display:inline-flex; align-items:center; gap:6px;
          padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 900;
          border: 1px solid var(--border);
        }
        .chip-debit{ background:#fff1f2; color:#b33a3a; border-color:#fecdd3; }
        .chip-credit{ background:#ecfdf5; color:#0f8a5f; border-color:#bbf7d0; }

        .tx-body{
          display:flex; justify-content:space-between; align-items:flex-end; gap: 12px;
        }
        .tx-amt{
          font-weight: 1000; font-size: 18px; letter-spacing: .2px; color: var(--ink-900);
        }
        .tx-meta{
          color: var(--ink-600); font-size: 12px; text-align:right;
          display:flex; flex-direction:column; gap: 2px;
        }
        .tx-purpose{
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #e8ecf3;
          color: var(--ink-600);
          font-size: 12px;
          line-height: 1.35;
        }

        .tx-actions{
          display:flex; justify-content:flex-end; gap: 8px; margin-top: 10px;
        }
        .tx-actions .btn{
          border-radius: 12px;
          font-weight: 800;
        }

        @media (max-width: 767.98px){ .table-view{ display:none; } }
        @media (min-width: 768px){ .mobile-view{ display:none; } }

        .toast-pro{ background: #0f172a; color:#fff; border-radius: 10px; padding: 12px 16px; box-shadow: 0 10px 24px rgba(0,0,0,.25); }
        .toast-success{ background: #0f8a5f; }
        .toast-error{ background: #b33a3a; }

        .modal-backdrop{ position: fixed; inset:0; background: rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index: 1100; padding: 16px; }
        .modal-card{ background:#fff; border-radius:14px; border:1px solid var(--border); width:100%; max-width:420px; padding:16px; box-shadow: 0 18px 48px rgba(0,0,0,.25); }

        .boot-overlay{
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center; flex-direction: column;
          gap: 18px; z-index: 2000;
          background:
            radial-gradient(1200px 600px at 20% 10%, rgba(95,75,182,.08), transparent 60%),
            radial-gradient(1000px 500px at 80% 90%, rgba(31,95,120,.08), transparent 60%),
            var(--bg);
        }
        .loader-wrap{
          display:flex; align-items:center; justify-content:center; gap:14px;
          padding: 22px 26px; border:1px solid #e8ecf3; background:#fff; border-radius: 18px;
          box-shadow: 0 20px 60px rgba(16,24,40,.12);
        }
        .ring{ width: 48px; height: 48px; display:inline-block; position: relative; }
        .ring:before, .ring:after{
          content:""; position:absolute; inset:0; border-radius:50%;
          border:3px solid transparent; border-top-color:#5f4bb6; border-right-color:#1f5f78;
          animation: spin 0.9s linear infinite;
        }
        .ring:after{
          inset:6px; border-top-color:#1f5f78; border-right-color:#5f4bb6; animation-duration:1.4s; opacity:.85;
        }
        @keyframes spin{ to{ transform: rotate(360deg); } }

        .brand-text{
          font-weight: 900;
          background: var(--brand-grad);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: .3px;
        }
        .subtle{ font-size: 13px; color: var(--ink-600); }
      `}</style>

      {/* FIRST-LOAD OVERLAY */}
      {booting && (
        <div className="boot-overlay" role="status" aria-live="polite" aria-label="Loading data">
          <div className="loader-wrap" aria-hidden="true">
            <span className="ring" />
            <div>
              <div className="brand-text" style={{ fontSize: 18, lineHeight: 1 }}>
                Preparing Daily Transactions…
              </div>
              <div className="subtle">Fetching categories, subcategories, entries & summary</div>
            </div>
          </div>
          <div className="subtle">Please wait</div>
        </div>
      )}

      <div className="page-wrap" aria-busy={booting ? "true" : "false"} aria-hidden={booting ? "true" : "false"}>
        <h3 className="title">Daily Transactions</h3>

        {/* Popup */}
        {popup.show && (
          <div
            className={`position-fixed top-50 start-50 translate-middle toast-pro ${
              popup.type === "success" ? "toast-success" : "toast-error"
            }`}
            style={{ zIndex: 1200, minWidth: 280, textAlign: "center", fontWeight: 700 }}
          >
            {popup.message}
          </div>
        )}

        {/* KPI */}
        <div className="kpi-grid">
          <div className="card-ui kpi-card text-center">
            <h6>Total Debit</h6>
            <h5 className="text-danger m-0">{INR.format(Number(daySummary.total_debit || 0))}</h5>
          </div>
          <div className="card-ui kpi-card text-center">
            <h6>Total Credit</h6>
            <h5 className="text-success m-0">{INR.format(Number(daySummary.total_credit || 0))}</h5>
          </div>
          <div className="card-ui kpi-card text-center">
            <h6>Total Transactions</h6>
            <h5 className="m-0">{Number(daySummary.total_transactions || 0)}</h5>
          </div>
        </div>

        {/* Form */}
        <div className="card-ui form-card mb-3">
          <div className="row g-2">
            <div className="col-6 col-md-2">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-control"
                placeholder="Amount"
                name="amount"
                value={form.amount}
                onChange={handleChange}
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Qty (opt)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                step="1"
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Type</label>
              <select className="form-select" name="type" value={form.type} onChange={handleChange}>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Category</label>
              <select className="form-select" name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Subcategory</label>
              <select
                className="form-select"
                name="subcategory_id"
                value={form.subcategory_id}
                onChange={handleChange}
                disabled={!form.category_id}
              >
                <option value="">Select Subcategory</option>
                {filteredSubs.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Purpose (opt)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                name="transaction_date"
                value={form.transaction_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-3 d-flex gap-2 flex-wrap">
            <button className="btn-solid" onClick={addOrUpdateTransaction} disabled={booting}>
              {editingId ? "Update Transaction" : "Add Transaction"}
            </button>
            {editingId && (
              <button className="btn-ghost" onClick={cancelEdit} disabled={booting}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Filter by Date */}
        <div className="card-ui mb-2">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-2">
            <div>
              <label className="form-label mb-1">Filter by Date</label>
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ maxWidth: 220 }}
              />
            </div>
            <div className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
              Showing transactions for <strong>{formatDate(filterDate)}</strong>
            </div>
          </div>
        </div>

        {/* ✅ MOBILE PROFESSIONAL HEADER */}
        <div className="mobile-topbar">
          <div className="text-muted" style={{ fontSize: 12, fontWeight: 800 }}>
            Transaction History
          </div>
          <div className="seg" role="tablist" aria-label="Mobile view mode">
            <button
              type="button"
              className={mobileViewMode === "compact" ? "active" : ""}
              onClick={() => setMobileViewMode("compact")}
            >
              Compact
            </button>
            <button
              type="button"
              className={mobileViewMode === "detailed" ? "active" : ""}
              onClick={() => setMobileViewMode("detailed")}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* MOBILE VIEW */}
        <div className="mobile-view">
          <div className="mobile-list">
            {pagedTransactions.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: "8px 0" }}>
                No transactions found
              </div>
            ) : (
              pagedTransactions.map((t) => {
                const cat = catMap.get(String(t.category_id)) || "-";
                const sub = subMap.get(String(t.subcategory_id)) || "-";
                const isCredit = String(t.type || "").toLowerCase() === "credit";

                return (
                  <div
                    key={t.daily_transaction_id}
                    className="tx-card"
                    style={highlightId === t.daily_transaction_id ? { outline: "2px solid #bbf7d0" } : {}}
                  >
                    <div className="tx-head">
                      <div className="tx-left">
                        <div className="tx-title">{cat}</div>
                        <div className="tx-sub">
                          {mobileViewMode === "compact" ? formatDate(t.transaction_date) : `${sub} • ${formatDate(t.transaction_date)}`}
                        </div>
                      </div>

                      <span className={`chip ${isCredit ? "chip-credit" : "chip-debit"}`}>{isCredit ? "credit" : "debit"}</span>
                    </div>

                    <div className="tx-body">
                      <div className="tx-amt">{INR.format(Number(t.amount || 0))}</div>
                      <div className="tx-meta">
                        <div>Qty: <strong>{t.quantity ?? 0}</strong></div>
                        <div>ID: <strong>{t.daily_transaction_id}</strong></div>
                      </div>
                    </div>

                    {mobileViewMode === "detailed" && t.purpose ? (
                      <div className="tx-purpose">{t.purpose}</div>
                    ) : null}

                    <div className="tx-actions">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => editTransaction(t)}>
                        Update
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(t.daily_transaction_id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination (mobile) */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-2" style={{ padding: "0 12px" }}>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-700)" }}>
                Page {page} / {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* DESKTOP/TABLET VIEW */}
        <div className="table-view">
          <div className="tbl-wrap">
            <div className="table-responsive">
              <table className="table table-bordered table-striped align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ minWidth: 64 }}>Seq</th>
                    <th style={{ minWidth: 120 }}>Date</th>
                    <th style={{ minWidth: 120 }}>Amount</th>
                    <th style={{ minWidth: 96 }}>Type</th>
                    <th style={{ minWidth: 160 }}>Category</th>
                    <th style={{ minWidth: 160 }}>Subcategory</th>
                    <th style={{ minWidth: 96 }}>Qty</th>
                    <th style={{ minWidth: 220 }}>Purpose</th>
                    <th style={{ minWidth: 160 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.map((t, i) => (
                    <tr
                      key={t.daily_transaction_id}
                      className={`align-middle ${highlightId === t.daily_transaction_id ? "table-success" : ""}`}
                    >
                      <td>{startIdx + i + 1}</td>
                      <td>{formatDate(t.transaction_date)}</td>
                      <td>{INR.format(Number(t.amount || 0))}</td>
                      <td className={String(t.type).toLowerCase() === "debit" ? "text-danger" : "text-success"}>{t.type}</td>
                      <td>{catMap.get(String(t.category_id)) || "-"}</td>
                      <td>{subMap.get(String(t.subcategory_id)) || "-"}</td>
                      <td>{t.quantity ?? 0}</td>
                      <td>{t.purpose || "-"}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-outline-primary btn-sm" onClick={() => editTransaction(t)}>
                            Update
                          </button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => askDelete(t.daily_transaction_id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr ref={tableEndRef} />
                  {pagedTransactions.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center text-muted">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDeleteId !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete transaction">
          <div className="modal-card">
            <h5 className="fw-bold mb-2">Delete this transaction?</h5>
            <p className="mb-3" style={{ color: "var(--ink-600)" }}>
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-between">
              <button className="btn btn-outline-secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={deleteTransaction} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
