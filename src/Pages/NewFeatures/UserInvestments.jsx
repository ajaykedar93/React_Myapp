// src/pages/UserInvestments.jsx
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Swal from "sweetalert2";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";

const API = "https://express-backend-myapp.onrender.com/api/user_investment";

/* ---------- Month helpers ---------- */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const numToMonth = (n) => MONTHS[(n - 1 + 12) % 12];

/* ---------- Currency formatting ---------- */
const fmtMoney = (n) => {
  const num = Number(n ?? 0);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const numberValue = (value) => Number(value || 0);

const getMonthNameFromLabel = (label = "") => String(label).split(" ")[0] || "";
const getYearFromLabel = (label = "") => String(label).split(" ")[1] || "";

function getRowTotalIncome(row) {
  return numberValue(row.total_income) || numberValue(row.job_income) + numberValue(row.extra_income);
}

function getRowTotalKharch(row) {
  return (
    numberValue(row.total_kharch) ||
    numberValue(row.month_kharch) + numberValue(row.total_emi) + numberValue(row.other_kharch)
  );
}

function getRowNet(row) {
  if (row.net_amount !== undefined && row.net_amount !== null) return numberValue(row.net_amount);
  return getRowTotalIncome(row) - getRowTotalKharch(row);
}

function getRowStatus(row) {
  if (row.profit_loss_status) return row.profit_loss_status;
  return getRowNet(row) >= 0 ? "PROFIT" : "LOSS";
}

function getRowAbs(row) {
  if (row.profit_loss_abs !== undefined && row.profit_loss_abs !== null) {
    return numberValue(row.profit_loss_abs);
  }
  return Math.abs(getRowNet(row));
}

export default function UserInvestments() {
  /* ---------- Page style ---------- */
  useEffect(() => {
    const id = "user-investments-style-v3-professional";
    const old = document.getElementById(id);
    if (old) old.remove();

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --pri:#06b6d4;
        --sec:#22c55e;
        --vio:#8b5cf6;
        --ink:#0f172a;
        --mut:#64748b;
        --line:#e2e8f0;
        --soft:#f8fafc;
        --green:#16a34a;
        --red:#dc2626;
        --blue:#0284c7;
        --purple:#7c3aed;
        --bg1:
          radial-gradient(1000px 500px at -10% -10%, rgba(6,182,212,0.18), transparent 60%),
          radial-gradient(1000px 500px at 110% -10%, rgba(34,197,94,0.15), transparent 60%),
          radial-gradient(700px 350px at 50% 0%, rgba(139,92,246,0.10), transparent 60%),
          linear-gradient(180deg, #ffffff 0%, #fcfffb 45%, #f7fbff 100%);
      }

      html,
      body{
        overflow-x:hidden;
      }

      .investment-page{
        min-height:100vh;
        background:var(--bg1);
        color:var(--ink);
        font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        padding-left:12px;
        padding-right:12px;
      }

      .glass {
        backdrop-filter: blur(10px);
        background: rgba(255,255,255,0.92);
        border:1px solid rgba(15,23,42,0.10);
        border-radius:20px;
        box-shadow:0 14px 36px rgba(15,23,42,.07);
      }

      .sticky-top-shadow{
        position:sticky;
        top:0;
        z-index:9;
        box-shadow:0 12px 28px -20px rgba(15,23,42,.35);
        backdrop-filter: blur(8px);
      }

      .brand-icon{
        width:44px;
        height:44px;
        border-radius:14px;
        background:linear-gradient(135deg,#06b6d4,#22c55e);
        display:grid;
        place-items:center;
        color:#05212a;
        font-weight:900;
        font-size:14px;
        box-shadow:0 12px 24px rgba(6,182,212,.22);
      }

      .title-gradient{
        background:linear-gradient(90deg,#06b6d4,#22c55e,#8b5cf6);
        -webkit-background-clip:text;
        background-clip:text;
        color:transparent;
        font-weight:900;
        letter-spacing:-.3px;
      }

      .btn-gradient{
        background:linear-gradient(90deg,var(--sec),var(--pri));
        color:#05212a;
        border:none;
        font-weight:800;
        box-shadow:0 10px 26px -14px rgba(6,182,212,.7);
      }

      .btn-gradient:hover{
        color:#05212a;
        transform:translateY(-1px);
      }

      .btn-outline-soft{
        border:1px solid rgba(15,23,42,.12);
        background:#fff;
      }

      .form-control,
      .form-select{
        border-radius:13px;
        border:1px solid #dbe3ef;
        font-weight:600;
      }

      .form-control:focus,
      .form-select:focus{
        border-color:#06b6d4;
        box-shadow:0 0 0 4px rgba(6,182,212,.12);
      }

      .form-label{
        color:#334155;
        font-weight:800;
        font-size:.9rem;
      }

      /* ===== Summary Cards ===== */
      .summary-grid{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:14px;
        margin-bottom:18px;
      }

      .summary-card{
        position:relative;
        overflow:hidden;
        border-radius:22px;
        padding:18px;
        background:rgba(255,255,255,.94);
        border:1px solid rgba(15,23,42,.08);
        box-shadow:0 14px 34px rgba(15,23,42,.08);
        transition:.22s ease;
      }

      .summary-card:hover{
        transform:translateY(-3px);
        box-shadow:0 20px 44px rgba(15,23,42,.12);
      }

      .summary-card::before{
        content:"";
        position:absolute;
        right:-38px;
        top:-38px;
        width:110px;
        height:110px;
        border-radius:999px;
        opacity:.18;
      }

      .summary-card::after{
        content:"";
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        height:5px;
      }

      .summary-income::before{background:#06b6d4;}
      .summary-income::after{background:linear-gradient(90deg,#06b6d4,#38bdf8);}

      .summary-kharch::before{background:#f97316;}
      .summary-kharch::after{background:linear-gradient(90deg,#f97316,#fb923c);}

      .summary-profit::before{background:#22c55e;}
      .summary-profit::after{background:linear-gradient(90deg,#16a34a,#4ade80);}

      .summary-loss::before{background:#ef4444;}
      .summary-loss::after{background:linear-gradient(90deg,#dc2626,#fb7185);}

      .summary-net::before{background:#8b5cf6;}
      .summary-net::after{background:linear-gradient(90deg,#7c3aed,#a78bfa);}

      .summary-label{
        color:#64748b;
        font-size:.85rem;
        font-weight:800;
        margin-bottom:8px;
      }

      .summary-value{
        font-size:clamp(1.35rem,3vw,1.9rem);
        font-weight:900;
        letter-spacing:-.7px;
        margin-bottom:8px;
        word-break:break-word;
      }

      .summary-sub{
        font-size:.82rem;
        color:#94a3b8;
        font-weight:700;
      }

      .green-text{color:#15803d;}
      .red-text{color:#dc2626;}
      .purple-text{color:#7c3aed;}
      .blue-text{color:#0284c7;}
      .orange-text{color:#ea580c;}

      .summary-mini-row{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-top:10px;
        font-size:.78rem;
        color:#64748b;
        font-weight:800;
      }

      .summary-status-pill{
        padding:.25rem .55rem;
        border-radius:999px;
        font-size:.74rem;
        font-weight:900;
      }

      .summary-status-profit{
        background:#dcfce7;
        color:#166534;
      }

      .summary-status-loss{
        background:#fee2e2;
        color:#991b1b;
      }

      /* ===== Chips and badges ===== */
      .chip{
        display:inline-flex;
        align-items:center;
        gap:5px;
        padding:.28rem .68rem;
        border-radius:999px;
        font-weight:900;
        font-size:.78rem;
        letter-spacing:.2px;
        white-space:nowrap;
      }

      .chip-profit{
        background:linear-gradient(90deg,#dcfce7,#bbf7d0);
        color:#166534;
        border:1px solid rgba(22,163,74,.22);
      }

      .chip-loss{
        background:linear-gradient(90deg,#fee2e2,#fecaca);
        color:#991b1b;
        border:1px solid rgba(220,38,38,.22);
      }

      .month-badge{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:.35rem .7rem;
        border-radius:999px;
        background:linear-gradient(90deg,#eff6ff,#dbeafe);
        color:#1d4ed8;
        font-size:.78rem;
        font-weight:900;
        border:1px solid rgba(59,130,246,.18);
      }

      .date-badge{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:.28rem .62rem;
        border-radius:999px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        color:#475569;
        font-size:.74rem;
        font-weight:800;
      }

      .badge-light-soft{
        background:#f8fafc;
        border:1px solid #e5e7eb;
        border-radius:999px;
        padding:.28rem .65rem;
        font-weight:800;
      }

      /* ===== Table ===== */
      .table-wrap-pro{
        border:1px solid #e2e8f0;
        border-radius:18px;
        overflow:hidden;
        background:#fff;
      }

      .table thead th{
        position:sticky;
        top:0;
        z-index:1;
        background:#f8fafc;
        color:#334155;
        font-size:.78rem;
        text-transform:uppercase;
        letter-spacing:.05em;
        border-bottom:1px solid #e2e8f0;
      }

      .table tbody td{
        border-color:#edf2f7;
      }

      .table-hover tbody tr:hover{
        background:#f8fafc;
      }

      .money-positive{
        color:#15803d;
        font-weight:900;
      }

      .money-negative{
        color:#dc2626;
        font-weight:900;
      }

      .money-neutral{
        color:#0f172a;
        font-weight:900;
      }

      /* ===== Mobile Cards ===== */
      .card-hover{
        transition:transform .2s ease, box-shadow .2s ease;
      }

      .inv-card{
        border:none !important;
        border-radius:22px !important;
        overflow:hidden;
        background:linear-gradient(180deg,#ffffff,#fbfdff);
        box-shadow:0 14px 32px rgba(15,23,42,.08);
        animation: inv-fade-up .35s ease-out both;
        position:relative;
      }

      .inv-card::after{
        content:"";
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        height:4px;
        background:linear-gradient(90deg,#0ea5e9,#22c55e,#38bdf8);
      }

      .inv-card.loss-card::after{
        background:linear-gradient(90deg,#ef4444,#fb7185,#f97316);
      }

      .inv-card:hover{
        transform:translateY(-3px);
        box-shadow:0 20px 42px rgba(15,23,42,.12);
      }

      .inv-card .card-body{
        padding:18px !important;
      }

      @keyframes inv-fade-up{
        0%{
          opacity:0;
          transform:translateY(8px);
          box-shadow:0 0 0 rgba(15,23,42,0);
        }
        100%{
          opacity:1;
          transform:translateY(0);
          box-shadow:0 14px 32px rgba(15,23,42,.08);
        }
      }

      .metric-line{
        background:#f8fafc;
        border:1px solid #e8eef6;
        border-radius:15px;
        padding:.7rem .8rem;
      }

      .metric-label{
        color:#64748b;
        font-size:.82rem;
        font-weight:800;
      }

      .metric-value{
        font-weight:900;
        color:#0f172a;
      }

      .record-net-box{
        border-radius:18px;
        padding:.8rem;
        background:linear-gradient(90deg,#f8fafc,#ffffff);
        border:1px solid #e2e8f0;
      }

      .record-net-box.profit{
        background:linear-gradient(90deg,#f0fdf4,#ffffff);
        border-color:#bbf7d0;
      }

      .record-net-box.loss{
        background:linear-gradient(90deg,#fef2f2,#ffffff);
        border-color:#fecaca;
      }

      /* Responsive visibility */
      @media (max-width: 991.98px){
        .desktop-table{display:none !important}
      }

      @media (min-width: 992px){
        .mobile-cards{display:none !important}
      }

      @media (max-width: 576px){
        .form-label{font-size:.86rem}
        .form-select,
        .form-control{
          font-size:.94rem;
          padding:.58rem .75rem;
        }
        .glass{
          border-radius:18px;
        }
        .summary-grid{
          grid-template-columns:1fr;
        }
      }

      /* ===== Full-screen EDIT sheet mobile, centered dialog md+ ===== */
      .ui-scrim{
        position:fixed;
        inset:0;
        background:rgba(15,23,42,.66);
        display:flex;
        align-items:flex-end;
        justify-content:center;
        z-index:20000;
      }

      .ui-sheet{
        width:100%;
        max-width:100%;
        height:100dvh;
        background:#fff;
        box-shadow:0 -10px 28px rgba(0,0,0,.25);
        display:flex;
        flex-direction:column;
      }

      .ui-head{
        position:sticky;
        top:0;
        z-index:2;
        background:#fff;
        border-bottom:1px solid #e5e7eb;
        padding:max(.9rem, env(safe-area-inset-top)) .95rem .9rem;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:.5rem;
      }

      .ui-title{
        margin:0;
        font-weight:900;
        letter-spacing:-.2px;
      }

      .ui-body{
        flex:1 1 auto;
        overflow:auto;
        -webkit-overflow-scrolling:touch;
        padding:.9rem .95rem 1.1rem;
      }

      .ui-foot{
        position:sticky;
        bottom:0;
        z-index:2;
        background:#fff;
        border-top:1px solid #e5e7eb;
        padding:.75rem .95rem;
        padding-bottom:max(.75rem, env(safe-area-inset-bottom));
        display:flex;
        justify-content:flex-end;
        gap:.5rem;
      }

      .edit-preview-card{
        border-radius:18px;
        border:1px solid #e2e8f0;
        background:linear-gradient(135deg,#f8fafc,#ffffff);
        padding:14px;
      }

      @media (min-width: 768px){
        .ui-scrim{
          align-items:center;
          padding:24px;
        }

        .ui-sheet{
          height:auto;
          max-height:92vh;
          width:96%;
          max-width:720px;
          border-radius:22px;
          overflow:hidden;
          box-shadow:0 30px 90px rgba(15,23,42,.35);
        }

        .ui-head,
        .ui-foot{
          position:static;
        }
      }

      .busy-overlay{
        position:fixed;
        inset:0;
        display:grid;
        place-items:center;
        background:rgba(255,255,255,.68);
        z-index:20050;
      }
    `;

    document.head.appendChild(s);

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  /* ---------- State ---------- */
  const now = new Date();

  const [form, setForm] = useState({
    useCurrentMonth: true,
    month_name: numToMonth(now.getUTCMonth() + 1),
    year_value: now.getUTCFullYear(),
    job_income: "",
    extra_income: "",
    month_kharch: "",
    total_emi: "",
    other_kharch: "",
  });

  const [list, setList] = useState([]);
  const [allRows, setAllRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [qYear, setQYear] = useState("");
  const [qMonth, setQMonth] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [edit, setEdit] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  /* ---------- Query params ---------- */
  function buildParams({ targetPage = page, pageSize = PAGE_SIZE } = {}) {
    const params = new URLSearchParams();

    params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));

    if (qYear) params.set("year", qYear);

    if (qMonth) {
      if (/^\d+$/.test(qMonth)) params.set("month", qMonth);
      else params.set("month_name", qMonth);
    }

    return params;
  }

  /* ---------- Fetch visible list ---------- */
  const fetchList = async (opts = { resetPage: false }) => {
    try {
      const targetPage = opts.resetPage ? 1 : page;

      if (opts.resetPage) setPage(1);

      setLoading(true);

      const params = buildParams({
        targetPage,
        pageSize: PAGE_SIZE,
      });

      const res = await fetch(`${API}?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load");

      setList(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", e.message || "Load failed", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Fetch all filtered records for summary ---------- */
  const fetchSummaryRows = async () => {
    try {
      setSummaryLoading(true);

      const params = buildParams({
        targetPage: 1,
        pageSize: 10000,
      });

      const res = await fetch(`${API}?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load summary");

      setAllRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.error(e);
      setAllRows([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchList({ resetPage: true });
    fetchSummaryRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qMonth, qYear]);

  useEffect(() => {
    fetchSummaryRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Optimistic helpers ---------- */
  const upsertRow = (row) => {
    setList((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      if (i === -1) return [row, ...prev];
      const copy = prev.slice();
      copy[i] = row;
      return copy;
    });

    setAllRows((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      if (i === -1) return [row, ...prev];
      const copy = prev.slice();
      copy[i] = row;
      return copy;
    });
  };

  const removeRowLocal = (id) => {
    setList((prev) => prev.filter((r) => r.id !== id));
    setAllRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---------- Add ---------- */
  const addRecord = async () => {
    if (form.job_income === "" || isNaN(+form.job_income) || +form.job_income < 0) {
      return Swal.fire("Validation", "Job income must be a non-negative number.", "warning");
    }

    if (form.month_kharch === "" || isNaN(+form.month_kharch) || +form.month_kharch < 0) {
      return Swal.fire("Validation", "Month kharch must be a non-negative number.", "warning");
    }

    if (form.total_emi === "" || isNaN(+form.total_emi) || +form.total_emi < 0) {
      return Swal.fire("Validation", "Total EMI must be a non-negative number.", "warning");
    }

    const payload = {
      job_income: +form.job_income,
      month_kharch: +form.month_kharch,
      total_emi: +form.total_emi,
    };

    if (form.extra_income !== "" && !isNaN(+form.extra_income)) {
      payload.extra_income = +form.extra_income;
    }

    if (form.other_kharch !== "" && !isNaN(+form.other_kharch)) {
      payload.other_kharch = +form.other_kharch;
    }

    if (!form.useCurrentMonth) {
      payload.month_name = form.month_name;
      payload.year_value = Number(form.year_value);
    }

    setBusy(true);

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Add failed");

      if (page === 1) upsertRow(json);
      setTotal((t) => t + 1);

      Swal.fire({
        icon: "success",
        title: "Saved",
        text: `${json.month_label} saved successfully.`,
        timer: 1400,
        showConfirmButton: false,
      });

      setForm((f) => ({
        ...f,
        job_income: "",
        extra_income: "",
        month_kharch: "",
        total_emi: "",
        other_kharch: "",
      }));

      await fetchList({ resetPage: true });
      await fetchSummaryRows();
    } catch (e) {
      Swal.fire("Error", e.message || "Add failed", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Delete ---------- */
  const removeRecord = async (id, label) => {
    const r = await Swal.fire({
      title: "Delete?",
      text: `Remove record for ${label}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });

    if (!r.isConfirmed) return;

    const prevList = list;
    const prevRows = allRows;
    const prevTotal = total;

    removeRowLocal(id);
    setTotal((t) => Math.max(0, t - 1));

    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Delete failed");
      }

      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1100,
        showConfirmButton: false,
      });

      const newCount = prevTotal - 1;
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));

      if (page > maxPage) setPage(maxPage);
      else fetchList();

      fetchSummaryRows();
    } catch (e) {
      setList(prevList);
      setAllRows(prevRows);
      setTotal(prevTotal);
      Swal.fire("Error", e.message || "Delete failed", "error");
    }
  };

  /* ---------- Update ---------- */
  const saveEdit = async () => {
    if (!edit) return;

    const payload = {};

    if (edit.month_name && edit.year_value) {
      payload.month_name = edit.month_name;
      payload.year_value = Number(edit.year_value);
    }

    const nums = ["job_income", "extra_income", "month_kharch", "total_emi", "other_kharch"];

    for (const k of nums) {
      if (edit[k] !== "" && edit[k] !== null && edit[k] !== undefined) {
        const v = Number(edit[k]);

        if (!Number.isFinite(v) || v < 0) {
          return Swal.fire(
            "Validation",
            `${k.replace("_", " ")} must be a non-negative number.`,
            "warning"
          );
        }

        payload[k] = v;
      }
    }

    setBusy(true);

    try {
      const res = await fetch(`${API}/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Update failed");

      upsertRow(json);

      Swal.fire({
        icon: "success",
        title: "Updated",
        timer: 1100,
        showConfirmButton: false,
      });

      setEdit(null);
      await fetchList();
      await fetchSummaryRows();
    } catch (e) {
      Swal.fire("Error", e.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Derived ---------- */
  const yearsOptions = useMemo(() => {
    const y0 = now.getUTCFullYear();
    return Array.from({ length: 15 }, (_, i) => y0 - 7 + i);
  }, [now]);

  const overallStats = useMemo(() => {
    const rows = allRows.length ? allRows : list;

    const totalIncome = rows.reduce((sum, item) => sum + getRowTotalIncome(item), 0);
    const totalKharch = rows.reduce((sum, item) => sum + getRowTotalKharch(item), 0);

    const totalProfit = rows
      .filter((item) => getRowStatus(item) === "PROFIT")
      .reduce((sum, item) => sum + getRowAbs(item), 0);

    const totalLoss = rows
      .filter((item) => getRowStatus(item) === "LOSS")
      .reduce((sum, item) => sum + getRowAbs(item), 0);

    const overallNet = totalIncome - totalKharch;
    const profitMonths = rows.filter((item) => getRowStatus(item) === "PROFIT").length;
    const lossMonths = rows.filter((item) => getRowStatus(item) === "LOSS").length;

    return {
      totalIncome,
      totalKharch,
      totalProfit,
      totalLoss,
      overallNet,
      profitMonths,
      lossMonths,
      records: rows.length,
      status: overallNet >= 0 ? "PROFIT" : "LOSS",
    };
  }, [allRows, list]);

  const editPreview = useMemo(() => {
    if (!edit) return null;

    const income = numberValue(edit.job_income) + numberValue(edit.extra_income);
    const kharch =
      numberValue(edit.month_kharch) + numberValue(edit.total_emi) + numberValue(edit.other_kharch);
    const net = income - kharch;

    return {
      income,
      kharch,
      net,
      status: net >= 0 ? "PROFIT" : "LOSS",
    };
  }, [edit]);

  function openEdit(row) {
    setEdit({
      ...row,
      month_name: getMonthNameFromLabel(row.month_label),
      year_value: getYearFromLabel(row.month_label),
      job_income: String(row.job_income ?? ""),
      extra_income: String(row.extra_income ?? ""),
      month_kharch: String(row.month_kharch ?? ""),
      total_emi: String(row.total_emi ?? ""),
      other_kharch: String(row.other_kharch ?? ""),
    });
  }

  /* ---------- Render ---------- */
  return (
    <div className="container-fluid py-3 py-sm-4 investment-page">
      {/* Header */}
      <div className="glass p-2 p-sm-3 p-md-4 mb-3 sticky-top-shadow">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <div className="brand-icon">UI</div>

            <div>
              <h5 className="m-0 title-gradient">User Investment Dashboard</h5>
              <div className="text-muted small">
                Add month-end numbers. Track total income, kharch, profit and loss.
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 w-100 w-sm-auto flex-wrap">
            <select
              className="form-select form-select-sm flex-grow-1"
              value={qMonth}
              onChange={(e) => setQMonth(e.target.value)}
              aria-label="Filter month"
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1} (#{i + 1})
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm flex-grow-1"
              value={qYear}
              onChange={(e) => setQYear(e.target.value)}
              aria-label="Filter year"
            >
              <option value="">All Years</option>
              {yearsOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              className="btn btn-outline-soft btn-sm"
              onClick={() => {
                setQMonth("");
                setQYear("");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="summary-grid">
        <div className="summary-card summary-income">
          <div className="summary-label">Total Income</div>
          <div className="summary-value blue-text">₹ {fmtMoney(overallStats.totalIncome)}</div>
          <div className="summary-sub">
            {summaryLoading ? "Calculating..." : "Combined income from all filtered records"}
          </div>
        </div>

        <div className="summary-card summary-kharch">
          <div className="summary-label">Total Kharch</div>
          <div className="summary-value orange-text">₹ {fmtMoney(overallStats.totalKharch)}</div>
          <div className="summary-sub">Monthly kharch + EMI + other kharch</div>
        </div>

        <div className="summary-card summary-profit">
          <div className="summary-label">Total Profit</div>
          <div className="summary-value green-text">₹ {fmtMoney(overallStats.totalProfit)}</div>
          <div className="summary-sub">Total positive balance amount</div>
          <div className="summary-mini-row">
            <span>Profit months</span>
            <span className="summary-status-pill summary-status-profit">
              {overallStats.profitMonths}
            </span>
          </div>
        </div>

        <div className="summary-card summary-loss">
          <div className="summary-label">Total Loss</div>
          <div className="summary-value red-text">₹ {fmtMoney(overallStats.totalLoss)}</div>
          <div className="summary-sub">Total negative balance amount</div>
          <div className="summary-mini-row">
            <span>Loss months</span>
            <span className="summary-status-pill summary-status-loss">
              {overallStats.lossMonths}
            </span>
          </div>
        </div>

        <div className="summary-card summary-net">
          <div className="summary-label">Overall Net Amount</div>
          <div
            className={`summary-value ${
              overallStats.overallNet >= 0 ? "green-text" : "red-text"
            }`}
          >
            ₹ {fmtMoney(overallStats.overallNet)}
          </div>
          <div className="summary-sub">Total income minus total kharch</div>
          <div className="summary-mini-row">
            <span>Overall status</span>
            <span
              className={`summary-status-pill ${
                overallStats.overallNet >= 0 ? "summary-status-profit" : "summary-status-loss"
              }`}
            >
              {overallStats.status}
            </span>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="glass p-2 p-sm-3 p-md-4 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h6 className="mb-1 fw-bold">Add Month Investment</h6>
            <div className="text-muted small">Enter income and expenses for a month.</div>
          </div>

          <span className="badge-light-soft">
            Records: <b>{total}</b>
          </span>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="useCurrent"
              checked={form.useCurrentMonth}
              onChange={(e) => setForm({ ...form, useCurrentMonth: e.target.checked })}
            />
            <label className="form-check-label fw-semibold" htmlFor="useCurrent">
              Use current month
            </label>
          </div>

          {!form.useCurrentMonth && (
            <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-sm-auto">
              <select
                className="form-select"
                style={{ minWidth: 160 }}
                value={form.month_name}
                onChange={(e) => setForm({ ...form, month_name: e.target.value })}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ minWidth: 130 }}
                value={form.year_value}
                onChange={(e) => setForm({ ...form, year_value: e.target.value })}
              >
                {yearsOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="row g-2 g-sm-3">
          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Job Income *</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="form-control"
              placeholder="e.g. 45000"
              value={form.job_income}
              onChange={(e) => setForm({ ...form, job_income: e.target.value })}
            />
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Extra Income</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="form-control"
              placeholder="e.g. 5000"
              value={form.extra_income}
              onChange={(e) => setForm({ ...form, extra_income: e.target.value })}
            />
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Month Kharch *</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="form-control"
              placeholder="e.g. 12000"
              value={form.month_kharch}
              onChange={(e) => setForm({ ...form, month_kharch: e.target.value })}
            />
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Total EMI *</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="form-control"
              placeholder="e.g. 8000"
              value={form.total_emi}
              onChange={(e) => setForm({ ...form, total_emi: e.target.value })}
            />
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Other Kharch</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="form-control"
              placeholder="e.g. 3000"
              value={form.other_kharch}
              onChange={(e) => setForm({ ...form, other_kharch: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 d-flex gap-2 flex-wrap">
          <button className="btn btn-gradient px-4 py-2" onClick={addRecord} disabled={busy}>
            {busy ? "Saving…" : "Add Investment"}
          </button>

          <button
            className="btn btn-light px-3"
            onClick={() =>
              setForm((f) => ({
                ...f,
                job_income: "",
                extra_income: "",
                month_kharch: "",
                total_emi: "",
                other_kharch: "",
              }))
            }
          >
            Clear
          </button>
        </div>
      </div>

      {/* List Section */}
      <div className="glass p-2 p-sm-3">
        <div className="d-flex justify-content-between align-items-center px-1 py-2 flex-wrap gap-2">
          <div>
            <h6 className="m-0 fw-bold">Monthly Records</h6>
            <div className="text-muted small">Profit and loss records month wise.</div>
          </div>

          <span className="badge-light-soft">
            Total: <b>{total}</b>
          </span>
        </div>

        {/* Desktop Table */}
        <div className="desktop-table">
          <div className="table-responsive table-wrap-pro">
            <table className="table table-hover align-middle m-0">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>#</th>
                  <th style={{ minWidth: 170 }}>Month</th>
                  <th className="text-end">Income</th>
                  <th className="text-end">Kharch</th>
                  <th className="text-end">Net</th>
                  <th>Status</th>
                  <th className="text-end" style={{ width: 180 }}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <LoadingSpiner />
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  list.map((r, i) => {
                    const status = getRowStatus(r);
                    const net = getRowNet(r);

                    return (
                      <tr key={r.id}>
                        <td>{(page - 1) * PAGE_SIZE + (i + 1)}</td>

                        <td>
                          <div className="month-badge mb-2">📅 {r.month_label}</div>
                          <div>
                            <span className="date-badge">🗓 {r.record_date}</span>
                          </div>
                        </td>

                        <td className="text-end">
                          <div className="fw-bold blue-text">₹ {fmtMoney(getRowTotalIncome(r))}</div>
                          <div className="text-muted small">
                            Job: ₹{fmtMoney(r.job_income)} · Extra: ₹{fmtMoney(r.extra_income)}
                          </div>
                        </td>

                        <td className="text-end">
                          <div className="fw-bold orange-text">
                            ₹ {fmtMoney(getRowTotalKharch(r))}
                          </div>
                          <div className="text-muted small">
                            Kharch: ₹{fmtMoney(r.month_kharch)} · EMI: ₹{fmtMoney(r.total_emi)} ·
                            Other: ₹{fmtMoney(r.other_kharch)}
                          </div>
                        </td>

                        <td
                          className={`text-end ${
                            net >= 0 ? "money-positive" : "money-negative"
                          }`}
                        >
                          ₹ {fmtMoney(net)}
                        </td>

                        <td>
                          <span className={`chip ${status === "PROFIT" ? "chip-profit" : "chip-loss"}`}>
                            {status === "PROFIT" ? "📈" : "📉"} {status} · ₹{" "}
                            {fmtMoney(getRowAbs(r))}
                          </span>
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={() => openEdit(r)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeRecord(r.id, r.month_label)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && total > 0 && (
            <div className="d-flex justify-content-between align-items-center p-3 flex-wrap gap-2">
              <div className="text-muted small">
                Showing <b>{(page - 1) * PAGE_SIZE + 1}</b>–
                <b>{Math.min(page * PAGE_SIZE, total)}</b> of <b>{total}</b>
              </div>

              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </button>

                <span className="btn btn-light btn-sm disabled">
                  {page} / {totalPages}
                </span>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="mobile-cards p-1 p-sm-2">
          {loading ? (
            <div className="text-center py-4">
              <LoadingSpiner />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-4 text-muted">No records found.</div>
          ) : (
            list.map((r) => {
              const status = getRowStatus(r);
              const net = getRowNet(r);

              return (
                <div
                  key={r.id}
                  className={`card card-hover inv-card mb-3 ${status === "LOSS" ? "loss-card" : ""}`}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="month-badge mb-2">📅 {r.month_label}</div>
                        <div>
                          <span className="date-badge">🗓 {r.record_date}</span>
                        </div>
                      </div>

                      <span className={`chip ${status === "PROFIT" ? "chip-profit" : "chip-loss"}`}>
                        {status === "PROFIT" ? "📈" : "📉"} {status}
                      </span>
                    </div>

                    <div className="metric-line mt-3">
                      <div className="d-flex justify-content-between gap-2">
                        <div className="metric-label">Income</div>
                        <div className="metric-value blue-text">
                          ₹ {fmtMoney(getRowTotalIncome(r))}
                        </div>
                      </div>
                      <div className="small text-muted mt-1">
                        Job: ₹{fmtMoney(r.job_income)} · Extra: ₹{fmtMoney(r.extra_income)}
                      </div>
                    </div>

                    <div className="metric-line mt-2">
                      <div className="d-flex justify-content-between gap-2">
                        <div className="metric-label">Kharch</div>
                        <div className="metric-value orange-text">
                          ₹ {fmtMoney(getRowTotalKharch(r))}
                        </div>
                      </div>
                      <div className="small text-muted mt-1">
                        Kharch: ₹{fmtMoney(r.month_kharch)} · EMI: ₹{fmtMoney(r.total_emi)} ·
                        Other: ₹{fmtMoney(r.other_kharch)}
                      </div>
                    </div>

                    <div className={`record-net-box mt-2 ${status === "PROFIT" ? "profit" : "loss"}`}>
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div>
                          <div className="metric-label">Net Amount</div>
                          <div className="small text-muted">Income - Kharch</div>
                        </div>

                        <div className={net >= 0 ? "money-positive" : "money-negative"}>
                          ₹ {fmtMoney(net)}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2 justify-content-end mt-3">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => openEdit(r)}>
                        Edit
                      </button>

                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeRecord(r.id, r.month_label)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {!loading && total > 0 && (
            <div className="d-flex justify-content-between align-items-center p-2">
              <div className="text-muted small">
                {page} / {totalPages}
              </div>

              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </button>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Sheet */}
      {edit && (
        <div
          className="ui-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Edit investment"
          onClick={(e) => e.currentTarget === e.target && setEdit(null)}
        >
          <div className="ui-sheet">
            <div className="ui-head">
              <div>
                <h5 className="ui-title">Edit {edit.month_label}</h5>
                <div className="text-muted small">Update monthly income and kharch details.</div>
              </div>

              <button className="btn btn-light btn-sm" onClick={() => setEdit(null)}>
                Close
              </button>
            </div>

            <div className="ui-body">
              {editPreview && (
                <div
                  className={`edit-preview-card mb-3 ${
                    editPreview.status === "PROFIT" ? "border-success" : "border-danger"
                  }`}
                >
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <div className="text-muted small fw-bold">Preview Net</div>
                      <div
                        className={`fs-4 fw-black ${
                          editPreview.net >= 0 ? "green-text" : "red-text"
                        }`}
                        style={{ fontWeight: 900 }}
                      >
                        ₹ {fmtMoney(editPreview.net)}
                      </div>
                    </div>

                    <span
                      className={`chip ${
                        editPreview.status === "PROFIT" ? "chip-profit" : "chip-loss"
                      }`}
                    >
                      {editPreview.status === "PROFIT" ? "📈" : "📉"} {editPreview.status}
                    </span>
                  </div>

                  <div className="row g-2 mt-2">
                    <div className="col-6">
                      <div className="small text-muted">Income</div>
                      <div className="fw-bold blue-text">₹ {fmtMoney(editPreview.income)}</div>
                    </div>

                    <div className="col-6">
                      <div className="small text-muted">Kharch</div>
                      <div className="fw-bold orange-text">₹ {fmtMoney(editPreview.kharch)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select"
                  style={{ minWidth: 160 }}
                  value={edit.month_name}
                  onChange={(e) => setEdit({ ...edit, month_name: e.target.value })}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select"
                  style={{ minWidth: 130 }}
                  value={edit.year_value}
                  onChange={(e) => setEdit({ ...edit, year_value: e.target.value })}
                >
                  {[...new Set([edit.year_value, ...yearsOptions])].sort().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row g-2 g-sm-3 mt-2">
                <div className="col-12 col-sm-6">
                  <label className="form-label">Job Income</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={edit.job_income}
                    onChange={(e) => setEdit({ ...edit, job_income: e.target.value })}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label">Extra Income</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={edit.extra_income}
                    onChange={(e) => setEdit({ ...edit, extra_income: e.target.value })}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label">Month Kharch</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={edit.month_kharch}
                    onChange={(e) => setEdit({ ...edit, month_kharch: e.target.value })}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label">Total EMI</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={edit.total_emi}
                    onChange={(e) => setEdit({ ...edit, total_emi: e.target.value })}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label">Other Kharch</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={edit.other_kharch}
                    onChange={(e) => setEdit({ ...edit, other_kharch: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="ui-foot">
              <button className="btn btn-light btn-sm" onClick={() => setEdit(null)}>
                Cancel
              </button>

              <button className="btn btn-success btn-sm" onClick={saveEdit} disabled={busy}>
                {busy ? "Saving…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="busy-overlay">
          <div className="glass p-3 d-flex align-items-center gap-3">
            <LoadingSpiner />
            <div className="fw-bold">Working…</div>
          </div>
        </div>
      )}
    </div>
  );
}