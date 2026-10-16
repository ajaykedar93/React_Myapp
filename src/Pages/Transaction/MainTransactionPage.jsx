import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_MAIN   = "https://express-backend-myapp.onrender.com/api/mainTransaction";
const API_ROOT   = "https://express-backend-myapp.onrender.com/api";
const API_DAILY  = `${API_ROOT}/dailyTransaction`;
const API_CAT    = `${API_ROOT}/category`;
const API_SUBCAT = `${API_ROOT}/subcategory`;
const PER_PAGE = 20;

// Display currency as whole rupees (e.g. 1,000), never with .00.
const formatAmount = (value) => Math.round(Number(value) || 0).toLocaleString("en-IN");

// Normalize API dates and date-input values to YYYY-MM-DD.
const getDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

export default function MainTransactionPage() {
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [mainTransactions, setMainTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, transactionId: null });
  const [deleteDaily, setDeleteDaily] = useState({ show: false, id: null, busy: false });

  const [editModal, setEditModal] = useState({
    show: false,
    busy: false,
    id: null,
    form: {
      amount: "",
      type: "debit",
      category_id: "",
      subcategory_id: "",
      quantity: 0,
      purpose: "",
      transaction_date: "",
    },
  });

  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const fetchAllForDate = async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const dailyRes = await axios.get(`${API_MAIN}/daily`, { params: { date } });
      setDailyTransactions(dailyRes.data.dailyTransactions || []);
      const suggRes = await axios.get(`${API_MAIN}/suggestions`, { params: { date } });
      setSuggestions(suggRes.data.suggestions || []);
    } catch (e) {
      console.error(e);
      showPopup("Failed to fetch transactions", "error");
      setDailyTransactions([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
      setPage(1);
    }
  };

  const fetchMainTransactions = async (date) => {
    try {
      const res = await axios.get(`${API_MAIN}`, { params: { date } });
      setMainTransactions(res.data);
    } catch (e) {
      console.error(e);
      showPopup("Failed to fetch main transactions", "error");
    }
  };

  const fetchMasters = async () => {
    try {
      const [c, s] = await Promise.all([axios.get(API_CAT), axios.get(API_SUBCAT)]);
      setCategories(c.data || []);
      setSubcategories(s.data || []);
    } catch {
      // ignore
    }
  };

  const saveDetails = async () => {
    if (!selectedDate) return showPopup("Please select a date", "error");
    const ids = dailyTransactions.map((t) => t.daily_transaction_id);
    if (ids.length === 0) return showPopup("No transactions to save", "info");
    try {
      setLoading(true);
      await axios.post(`${API_MAIN}/save`, {
        date: selectedDate,
        daily_transaction_ids: ids,
      });
      showPopup("Transactions saved successfully", "success");
      await Promise.all([fetchAllForDate(selectedDate), fetchMainTransactions(selectedDate)]);
    } catch (e) {
      console.error(e);
      showPopup("Failed to save transactions", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (transactionId) => setDeleteConfirm({ show: true, transactionId });

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm.transactionId) return;
    try {
      setLoading(true);
      await axios.delete(`${API_MAIN}/${deleteConfirm.transactionId}`);
      showPopup("Main transaction deleted", "success");
      await Promise.all([fetchMainTransactions(selectedDate), fetchAllForDate(selectedDate)]);
    } catch (e) {
      console.error(e);
      showPopup("Failed to delete transaction", "error");
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, transactionId: null });
    }
  };

  const showPopup = (message, type) => {
    setPopup({ show: true, message, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "" }), 2200);
  };

  const handleSearchClick = () => {
    if (!selectedDate) return showPopup("Please select a valid date", "error");
    fetchAllForDate(selectedDate);
    fetchMainTransactions(selectedDate);
  };

  const startIdx = (page - 1) * PER_PAGE;
  const pagedDailyTransactions = useMemo(
    () => dailyTransactions.slice(startIdx, startIdx + PER_PAGE),
    [dailyTransactions, startIdx]
  );
  const totalPages = Math.max(1, Math.ceil(dailyTransactions.length / PER_PAGE));

  const totalDebit = dailyTransactions.reduce(
    (a, t) => a + (t.type === "debit" ? +t.amount : 0),
    0
  );
  const totalCredit = dailyTransactions.reduce(
    (a, t) => a + (t.type === "credit" ? +t.amount : 0),
    0
  );
  const totalTransactions = dailyTransactions.length;

  useEffect(() => {
    const today = getToday();
    setSelectedDate(today);
    fetchAllForDate(today);
    fetchMainTransactions(today);
    fetchMasters();

    const tickToMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const id = setTimeout(() => {
        const nd = getToday();
        setSelectedDate(nd);
        fetchAllForDate(nd);
        fetchMainTransactions(nd);
        tickToMidnight();
      }, next - now);
      return () => clearTimeout(id);
    };
    const cleanup = tickToMidnight();
    return cleanup;
    // eslint-disable-next-line
  }, []);

  const openEdit = (t) => {
    setEditModal({
      show: true,
      busy: false,
      id: t.daily_transaction_id,
      form: {
        amount: t.amount ?? "",
        type: t.type ?? "debit",
        category_id: t.category_id ?? "",
        subcategory_id: t.subcategory_id ?? "",
        quantity: t.quantity ?? 0,
        purpose: t.purpose ?? "",
        transaction_date: t.transaction_date ?? selectedDate,
      },
    });
  };

  const closeEdit = () =>
    setEditModal((m) => ({
      ...m,
      show: false,
      busy: false,
      id: null,
    }));

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((m) => ({
      ...m,
      form: {
        ...m.form,
        [name]: name === "quantity" ? Number(value) : value,
        ...(name === "category_id" ? { subcategory_id: "" } : null),
      },
    }));
  };

  const saveEdit = async () => {
    if (!editModal.id) return;
    const f = editModal.form;
    if (!f.amount || !f.category_id)
      return showPopup("Please fill required fields (Amount, Category)", "error");
    try {
      setEditModal((m) => ({ ...m, busy: true }));
      await axios.put(`${API_DAILY}/${editModal.id}`, {
        amount: f.amount,
        type: f.type,
        category_id: f.category_id,
        subcategory_id: f.subcategory_id || null,
        quantity: f.quantity ?? 0,
        purpose: f.purpose || null,
      });
      showPopup("Transaction updated successfully", "success");
      closeEdit();
      await fetchAllForDate(selectedDate);
    } catch (e) {
      console.error(e);
      showPopup("Failed to update transaction", "error");
      setEditModal((m) => ({ ...m, busy: false }));
    }
  };

  const askDeleteDaily = (id) => setDeleteDaily({ show: true, id, busy: false });
  const cancelDeleteDaily = () => setDeleteDaily({ show: false, id: null, busy: false });

  const confirmDeleteDaily = async () => {
    if (!deleteDaily.id) return;
    try {
      setDeleteDaily((d) => ({ ...d, busy: true }));
      await axios.delete(`${API_DAILY}/${deleteDaily.id}`);
      showPopup("Transaction deleted successfully", "success");
      cancelDeleteDaily();
      await fetchAllForDate(selectedDate);
    } catch (e) {
      console.error(e);
      showPopup("Failed to delete transaction", "error");
      setDeleteDaily((d) => ({ ...d, busy: false }));
    }
  };

  const editSubs = useMemo(() => {
    const cid = Number(editModal.form.category_id || 0);
    return subcategories.filter((s) => Number(s.category_id) === cid);
  }, [subcategories, editModal.form.category_id]);

  // Hide Save Details when the selected date already exists in All Main Transactions.
  const selectedDateAlreadySaved = useMemo(
    () => Boolean(selectedDate) && mainTransactions.some((mt) => getDateKey(mt.date) === selectedDate),
    [mainTransactions, selectedDate]
  );

  return (
    /* ✅ ONLY CHANGE: remove outside padding */
    <div className="container-fluid p-0" style={{ background: "var(--bg)" }}>
      {/* mobile-first styles */}
      <style>{`
        :root{
          --ink-950:#101828;--ink-900:#172033;--ink-700:#344054;--ink-600:#475467;--ink-500:#667085;
          --surface:#fff;--border:#e4e7ec;--bg:#f4f7fb;
          --brand-grad:linear-gradient(120deg,#4338ca 0%,#2563eb 52%,#0891b2 100%);
          --accent:#4f46e5;--success:#059669;--danger:#dc2626;--rad:18px;
          --px:clamp(12px,2.4vw,28px);--fs:clamp(13px,1vw,15px);--fs-sm:12px;
        }
        *,*::before,*::after{box-sizing:border-box}
        html,body{max-width:100%;overflow-x:hidden}
        .container-fluid.p-0{min-height:100vh;background:radial-gradient(ellipse at 8% 0%,rgba(99,102,241,.08),transparent 34%),radial-gradient(ellipse at 100% 12%,rgba(6,182,212,.07),transparent 28%),var(--bg)!important;color:var(--ink-900);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .page-wrap{width:100%;max-width:1440px;margin:0 auto;padding:0 var(--px)}
        .title{font-size:clamp(23px,2.5vw,33px);font-weight:850;letter-spacing:-.8px;color:var(--ink-950);background:none;-webkit-text-fill-color:initial;margin:0;padding:9px 0}
        .title:before{content:"";display:inline-block;width:5px;height:27px;margin-right:12px;vertical-align:-4px;border-radius:8px;background:var(--brand-grad)}
        .card-ui{background:rgba(255,255,255,.96);border:1px solid var(--border);border-radius:18px;box-shadow:0 8px 24px rgba(16,24,40,.045);padding:20px;transition:box-shadow .2s ease,border-color .2s ease}
        .card-ui:hover{box-shadow:0 12px 28px rgba(16,24,40,.07);border-color:#d8def7}
        .card-ui h5{font-size:15px!important;font-weight:800;letter-spacing:-.2px;color:var(--ink-900)}
        .form-label{font-size:12px;font-weight:750;color:var(--ink-700)}
        .form-control,.form-select{min-height:42px;border:1px solid #d0d5dd;border-radius:10px;font-size:var(--fs);color:var(--ink-900);box-shadow:0 1px 2px rgba(16,24,40,.025);transition:border-color .18s ease,box-shadow .18s ease}
        .form-control:focus,.form-select:focus{border-color:#818cf8;box-shadow:0 0 0 4px rgba(99,102,241,.13)}
        .btn-solid,.btn-outline{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:6px 11px;border-radius:8px;font-size:12px;font-weight:750;line-height:1.2;white-space:nowrap;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
        /* Compact, consistent buttons without covering transaction details. */
        .btn{min-height:28px;padding:4px 8px;font-size:11px;line-height:1.25;border-radius:7px;font-weight:700;white-space:nowrap}
        .btn.btn-sm{min-height:26px;padding:3px 7px;font-size:10.5px;line-height:1.2}
        .tx-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px;margin-top:10px;position:relative;clear:both}
        .tx-actions .btn{flex:0 0 auto}
        .btn-solid{background:var(--brand-grad);color:#fff;border:0;box-shadow:0 5px 13px rgba(79,70,229,.2)}
        .btn-solid:hover{color:#fff;filter:brightness(1.04);transform:translateY(-1px);box-shadow:0 8px 18px rgba(79,70,229,.25)}
        .btn-outline{background:#fff;border:1px solid #d0d5dd;color:var(--ink-700);border-style:solid}
        .btn-outline:hover{background:#f5f7ff;color:#3730a3;border-color:#c7d2fe}
        button{transition:transform .16s ease,box-shadow .16s ease}
        button:disabled{opacity:.55;cursor:not-allowed!important;transform:none!important}
        .tx-card{background:#fff;border:1px solid var(--border);border-radius:15px;padding:15px;box-shadow:0 5px 16px rgba(16,24,40,.045);transition:transform .2s ease,box-shadow .2s ease;animation:cardIn .3s ease both}
        .tx-card:hover{transform:translateY(-2px);box-shadow:0 11px 24px rgba(16,24,40,.08)}
        .tx-top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
        .tx-top>.date-text{flex:1 1 auto;min-width:0;white-space:nowrap;word-break:keep-all;overflow-wrap:normal;font-size:14px}
        .tx-top>button{flex:0 0 auto;width:auto;min-width:58px;max-width:78px;padding:5px 8px;font-size:10.5px;line-height:1.2}
        .tx-title{font-weight:850;font-size:14px;color:var(--ink-950);overflow-wrap:break-word;word-break:normal}
        .tx-sub{color:var(--ink-500);font-size:12px;line-height:1.45;overflow-wrap:break-word;word-break:normal}
        .badge{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:10px;letter-spacing:.45px;text-transform:uppercase;font-weight:850;white-space:nowrap}
        .badge-debit{background:#ffe4e6;color:#9f1239;border:1px solid #fda4af}
        .badge-credit{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7}
        .text-danger{color:#b91c1c!important}.text-success{color:#047857!important}
        .btn-outline-primary{--bs-btn-color:#4338ca;--bs-btn-border-color:#a5b4fc;--bs-btn-hover-bg:#4338ca;--bs-btn-hover-border-color:#4338ca}
        .btn-outline-danger{--bs-btn-color:#b91c1c;--bs-btn-border-color:#fda4af;--bs-btn-hover-bg:#b91c1c;--bs-btn-hover-border-color:#b91c1c}
        .tx-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:9px;font-size:13px}
        .tx-amt{font-weight:900;font-size:16px;letter-spacing:-.25px;color:var(--ink-950);text-align:right;white-space:nowrap;overflow-wrap:normal;word-break:keep-all;flex:0 0 auto;font-variant-numeric:tabular-nums}
        .table-responsive{border-radius:11px}
        .table{font-size:13px;vertical-align:middle;border-color:#eaecf0}
        .table thead th{position:sticky;top:0;background:#18243a;color:#fff;z-index:1;font-size:11px;text-transform:uppercase;letter-spacing:.45px;font-weight:800;padding:13px 11px;white-space:nowrap;border-color:#2d3b54}
        .table td{padding:11px;font-size:12px;overflow-wrap:normal;word-break:normal;white-space:normal}
        .table td:nth-child(1),.table td:nth-child(2),.table td:nth-child(6){white-space:nowrap}
        .table td:nth-child(2),.table td:nth-child(3){font-variant-numeric:tabular-nums}
        .table-responsive{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .table{min-width:760px;width:100%}
        .tx-title,.tx-sub,.tx-amt,.tx-row,.loading-title,.loading-caption{word-break:normal;overflow-wrap:break-word}
        .date-text{white-space:nowrap;word-break:keep-all;overflow-wrap:normal}
        .tx-row>div:first-child{flex:1 1 auto;min-width:0}
        .tx-row>div:last-child{min-width:0;flex:0 0 auto}
        .tx-amt{white-space:nowrap;max-width:none;font-variant-numeric:tabular-nums}
        input[type="date"]{width:100%;min-width:0;max-width:100%;color-scheme:light}
        .form-control,.form-select{max-width:100%;min-width:0}
        .table tbody tr{transition:background .15s ease}
        .table tbody tr:hover td{background:#f5f7ff}
        .toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10050;display:flex;align-items:center;justify-content:center;gap:9px;width:max-content;max-width:min(320px,calc(100vw - 32px));min-width:0;padding:10px 15px;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:12px;background:#f0fdf4!important;color:#166534!important;font-size:12px;font-weight:800;line-height:1.4;text-align:center;overflow-wrap:anywhere;box-shadow:0 10px 28px rgba(16,24,40,.16);animation:toastPop .2s ease;pointer-events:none}
        .toast.toast-error{background:#fff1f2!important;color:#b91c1c!important;border-color:#fecaca;border-left-color:#dc2626}
        .toast.toast-info{background:#eff6ff!important;color:#1d4ed8!important;border-color:#bfdbfe;border-left-color:#2563eb}
        .loading-overlay{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(244,247,251,.88);padding:20px}
        .loading-panel{display:flex;align-items:center;gap:14px;min-width:220px;max-width:calc(100vw - 36px);padding:18px 20px;border:1px solid #e0e7ff;border-radius:16px;background:#fff;box-shadow:0 12px 34px rgba(30,41,59,.14)}
        .loading-ring{width:34px;height:34px;flex:0 0 34px;border-radius:50%;border:3px solid #e0e7ff;border-top-color:#7c3aed;border-right-color:#06b6d4;animation:spinLoader .8s linear infinite}
        .loading-title{font-size:13px;font-weight:800;color:#1e293b}
        .loading-caption{font-size:11px;color:#64748b;margin-top:3px}
        @keyframes spinLoader{to{transform:rotate(360deg)}}
        .modal-sheet{border:1px solid rgba(228,231,236,.95)!important;border-radius:20px!important;box-shadow:0 24px 70px rgba(16,24,40,.24)!important;max-width:calc(100vw - 28px);max-height:calc(100dvh - 32px);overflow:auto}
        .position-fixed.top-0.start-0.w-100.h-100.d-flex{backdrop-filter:blur(4px)}
        @media(max-width:767.98px){
          html,body,#root{width:100%;max-width:100%;overflow-x:hidden}
          .container-fluid.p-0{width:100%;max-width:100%;padding-left:0!important;padding-right:0!important;overflow-x:clip}
          .page-wrap{width:100%;max-width:100%;padding:0 10px;margin:0 auto}
          .page-wrap>.d-flex{width:100%;max-width:100%;padding:10px 2px 12px;gap:8px}
          .title{font-size:24px;min-width:0;overflow-wrap:anywhere}
          .card-ui{width:100%;max-width:100%;min-width:0;border-radius:15px;margin-left:0!important;margin-right:0!important;padding:14px;overflow:hidden}
          .card-ui>.row{margin-left:0!important;margin-right:0!important;row-gap:10px}
          .card-ui>.row>[class*="col-"]{padding-left:6px;padding-right:6px;min-width:0}
          .table-view{display:none}
          .mobile-view{display:block;width:100%;max-width:100%;min-width:0}
          .mobile-view>.card-ui{margin-left:0!important;margin-right:0!important}
          .tx-card{width:100%;max-width:100%;min-width:0;border-radius:14px;padding:12px;overflow-wrap:anywhere}
          .tx-top,.tx-row{min-width:0;max-width:100%}
          .tx-top>div,.tx-row>div{min-width:0}
          .tx-top>.date-text{flex:1 1 auto;min-width:0;white-space:nowrap;font-size:13px;letter-spacing:-.2px}
          .tx-top>button{flex:0 0 auto;width:auto;min-width:58px;max-width:66px;padding:5px 7px;font-size:10px}
          .tx-title,.tx-sub{overflow-wrap:break-word;word-break:normal}
          .date-text{white-space:nowrap;word-break:keep-all;overflow-wrap:normal}
          .tx-amt{white-space:nowrap;max-width:none;flex:0 0 auto;font-size:15px}
          .tx-row{gap:8px}
          .tx-row>div:first-child{flex:1 1 auto;min-width:0}
          .tx-row>div:last-child{flex:0 0 auto;min-width:max-content}
          .mobile-view .d-grid{min-width:0;width:100%;max-width:100%}
          .btn-solid,.btn-outline{min-height:30px;padding:5px 9px;font-size:11px}
          .btn{min-height:27px;padding:4px 7px;font-size:10.5px}
          .btn.btn-sm{min-height:25px;padding:3px 6px;font-size:10px}
          .tx-actions{gap:5px;margin-top:9px}
        }
        @media(min-width:768px){.mobile-view{display:none}.page-wrap{padding-left:clamp(16px,2.5vw,30px);padding-right:clamp(16px,2.5vw,30px)}}
        @media(max-width:380px){
          .page-wrap{padding-left:8px;padding-right:8px}
          .page-wrap>.d-flex{padding-left:2px;padding-right:2px}
          .title{font-size:21px}
          .card-ui{padding:11px}
          .tx-card{padding:10px}
          .tx-amt{font-size:14px}
          .btn{--bs-btn-font-size:.75rem}
          .toast{padding:11px 14px;font-size:12px}
        }
        @keyframes cardIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastPop{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
`}</style>

      {/* Clear loading overlay: no blur filter, no blurred page content */}
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-panel">
            <span className="loading-ring" aria-hidden="true" />
            <div>
              <div className="loading-title">Please wait</div>
              <div className="loading-caption">Updating transactions…</div>
            </div>
          </div>
        </div>
      )}

      {/* Small, high-contrast centered status popup */}
      {popup.show && (
        <div
          className={`toast ${popup.type === "error" ? "toast-error" : popup.type === "info" ? "toast-info" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true" style={{fontSize: 14, lineHeight: 1, fontWeight: 900}}>
            {popup.type === "success" ? "✓" : popup.type === "error" ? "!" : "i"}
          </span>
          <span>{popup.message}</span>
        </div>
      )}

      {/* confirm delete main */}
      {deleteConfirm.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 9998 }}
        >
          <div className="bg-white p-4 rounded shadow-lg modal-sheet" style={{ minWidth: 280 }}>
            <h5 className="mb-2" style={{ fontSize: "clamp(.9rem,3vw,1rem)" }}>
              Confirm Delete
            </h5>
            <p style={{ fontSize: "clamp(.7rem,2.6vw,.85rem)" }}>
              Are you sure you want to delete this transaction?
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirm({ show: false, transactionId: null })}
              >
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirmed}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirm delete daily */}
      {deleteDaily.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 9998 }}
        >
          <div className="bg-white p-4 rounded shadow-lg modal-sheet" style={{ minWidth: 280 }}>
            <h5 className="mb-2" style={{ fontSize: "clamp(.9rem,3vw,1rem)" }}>
              Delete this daily transaction?
            </h5>
            <p className="mb-3" style={{ fontSize: "clamp(.7rem,2.6vw,.85rem)" }}>
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteDaily({ show: false, id: null, busy: false })}
                disabled={deleteDaily.busy}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={confirmDeleteDaily}
                disabled={deleteDaily.busy}
              >
                {deleteDaily.busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* edit modal */}
      {editModal.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 9998, padding: 16 }}
        >
          <div
            className="bg-white p-3 p-md-4 rounded shadow-lg modal-sheet"
            style={{ width: "100%", maxWidth: 560 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0" style={{ fontSize: "clamp(.9rem,3.2vw,1.02rem)" }}>
                Update Transaction
              </h5>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeEdit}
                disabled={editModal.busy}
              >
                Close
              </button>
            </div>

            <div className="row g-2">
              <div className="col-6 col-md-4">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Amount
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  name="amount"
                  value={editModal.form.amount}
                  onChange={handleEditChange}
                />
              </div>

              <div className="col-6 col-md-4">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Type
                </label>
                <select
                  className="form-select form-select-sm"
                  name="type"
                  value={editModal.form.type}
                  onChange={handleEditChange}
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Quantity (opt)
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  name="quantity"
                  value={editModal.form.quantity}
                  min={0}
                  onChange={handleEditChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Category
                </label>
                <select
                  className="form-select form-select-sm"
                  name="category_id"
                  value={editModal.form.category_id}
                  onChange={handleEditChange}
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
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Subcategory
                </label>
                <select
                  className="form-select form-select-sm"
                  name="subcategory_id"
                  value={editModal.form.subcategory_id || ""}
                  onChange={handleEditChange}
                  disabled={!editModal.form.category_id}
                >
                  <option value="">Select Subcategory</option>
                  {editSubs.map((s) => (
                    <option key={s.subcategory_id} value={s.subcategory_id}>
                      {s.subcategory_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label mb-1" style={{ fontSize: "clamp(.68rem, 2.2vw, .78rem)" }}>
                  Purpose (opt)
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  name="purpose"
                  value={editModal.form.purpose}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="mt-3 d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeEdit}
                disabled={editModal.busy}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={saveEdit}
                disabled={editModal.busy}
              >
                {editModal.busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-wrap">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
          <h3 className="title m-0">Main Transactions</h3>
          {!selectedDateAlreadySaved && (
            <button
              className="btn-solid mt-2 mt-sm-0"
              onClick={saveDetails}
              disabled={loading || !selectedDate}
              type="button"
            >
              Save Details
            </button>
          )}
        </div>

        {/* Date & Totals */}
        <div className="card-ui mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-bold" style={{ fontSize: "clamp(.68rem,2.6vw,.82rem)" }}>
                Select Date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getToday()}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <button className="btn-outline w-100" onClick={handleSearchClick}>
                Search
              </button>
            </div>
            <div className="col-12 col-md-7">
              <div className="fw-semibold mt-2 mt-md-0" style={{ fontSize: "clamp(.68rem, 2.4vw, .85rem)" }}>
                Totals:
                <span className="ms-2 me-3">Debit: ₹ {formatAmount(totalDebit)}</span>
                <span className="me-3">Credit: ₹ {formatAmount(totalCredit)}</span>
                <span>Count: {totalTransactions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DAILY: Mobile cards */}
        <div className="mobile-view">
          <div className="card-ui mb-3">
            <h5 className="mb-2" style={{ fontSize: "clamp(.8rem,3vw,1rem)" }}>
              Daily Transactions ({selectedDate})
            </h5>

            {pagedDailyTransactions.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "clamp(.7rem, 2.6vw, .85rem)" }}>
                No transactions found for this date.
              </div>
            ) : (
              <div className="d-grid gap-2">
                {pagedDailyTransactions.map((t) => {
                  const cat =
                    t.category_name ||
                    categories.find((c) => c.category_id === t.category_id)?.category_name ||
                    "-";
                  const sub =
                    t.subcategory_name ||
                    subcategories.find((s) => s.subcategory_id === t.subcategory_id)?.subcategory_name ||
                    "-";

                  return (
                    <div key={t.daily_transaction_id} className="tx-card">
                      <div className="tx-top">
                        <div>
                          <div className="tx-title">{cat}</div>
                          <div className="tx-sub">
                            {sub} •{" "}
                            <span className="date-text">{new Date(t.transaction_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}</span>
                          </div>
                        </div>
                        <span className={`badge ${t.type === "debit" ? "badge-debit" : "badge-credit"}`}>
                          {t.type}
                        </span>
                      </div>

                      <div className="tx-row">
                        <div className="tx-sub">Amount</div>
                        <div className="tx-amt">₹ {formatAmount(t.amount)}</div>
                      </div>

                      <div className="tx-row">
                        <div className="tx-sub">Qty</div>
                        <div className="fw-semibold">{t.quantity ?? 0}</div>
                      </div>

                      {t.purpose && <div className="mt-1 tx-sub">{t.purpose}</div>}

                      <div className="tx-actions">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => openEdit(t)}>
                          Update
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => askDeleteDaily(t.daily_transaction_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination (mobile) */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span style={{ fontSize: "clamp(.65rem, 2.5vw, .82rem)" }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Suggestions (cards) */}
          <div className="card-ui mb-3">
            <h5 className="mb-2" style={{ fontSize: "clamp(.8rem,3vw,1rem)" }}>
              Unsaved Transactions
            </h5>

            {suggestions.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "clamp(.7rem, 2.6vw, .85rem)" }}>
                No unsaved transactions.
              </div>
            ) : (
              <div className="d-grid gap-2">
                {suggestions.map((s) => (
                  <div key={s.daily_transaction_id} className="tx-card">
                    <div className="tx-top">
                      <div className="tx-title">{s.category_name || s.category_id}</div>
                      <span className={`badge ${s.type === "debit" ? "badge-debit" : "badge-credit"}`}>
                        {s.type}
                      </span>
                    </div>

                    <div className="tx-row">
                      <div className="tx-sub">Amount</div>
                      <div className="tx-amt">₹ {formatAmount(s.amount)}</div>
                    </div>

                    <div className="tx-row">
                      <div className="tx-sub">Qty</div>
                      <div className="fw-semibold">{s.quantity ?? 0}</div>
                    </div>

                    {s.purpose && <div className="mt-1 tx-sub">{s.purpose}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main transactions (cards) */}
          <div className="card-ui mb-4">
            <h5 className="mb-2" style={{ fontSize: "clamp(.8rem,3vw,1rem)" }}>
              All Main Transactions
            </h5>

            {mainTransactions.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "clamp(.7rem, 2.6vw, .85rem)" }}>
                No main transactions available
              </div>
            ) : (
              <div className="d-grid gap-2">
                {mainTransactions.map((mt) => (
                  <div key={mt.transaction_id} className="tx-card">
                    <div className="tx-top">
                      <div className="tx-title date-text">{new Date(mt.date).toLocaleDateString()}</div>
                      <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(mt.transaction_id)}>
                        Delete
                      </button>
                    </div>

                    <div className="tx-row">
                      <div className="tx-sub">Total Debit</div>
                      <div className="tx-amt">₹ {formatAmount(mt.total_debit)}</div>
                    </div>

                    <div className="tx-row">
                      <div className="tx-sub">Total Credit</div>
                      <div className="tx-amt">₹ {formatAmount(mt.total_credit)}</div>
                    </div>

                    <div className="tx-row">
                      <div className="tx-sub">Transactions</div>
                      <div className="fw-bold">{mt.total_transactions}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ≥ md: tables */}
        <div className="table-view">
          <div className="card-ui mb-3">
            <h5 className="mb-3" style={{ fontSize: "1rem" }}>
              Daily Transactions ({selectedDate})
            </h5>

            {dailyTransactions.length === 0 ? (
              <div className="text-center text-muted">No transactions found for this date.</div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-bordered table-striped align-middle mb-2">
                    <thead className="table-dark">
                      <tr>
                        <th>#</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Subcategory</th>
                        <th>Qty</th>
                        <th>Purpose</th>
                        <th style={{ minWidth: 160 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDailyTransactions.map((t, i) => (
                        <tr key={t.daily_transaction_id}>
                          <td>{startIdx + i + 1}</td>
                          <td>₹ {formatAmount(t.amount)}</td>
                          <td className={t.type === "debit" ? "text-danger" : "text-success"}>{t.type}</td>
                          <td>{t.category_name || t.category_id}</td>
                          <td>{t.subcategory_name || t.subcategory_id || "-"}</td>
                          <td>{t.quantity ?? 0}</td>
                          <td>{t.purpose || "-"}</td>
                          <td>
                            <div className="tx-actions">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => openEdit(t)}>
                                Update
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => askDeleteDaily(t.daily_transaction_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>Page {page} of {totalPages}</div>
                  <div className="mt-2 mt-md-0">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card-ui mb-3">
            <h5 className="mb-3" style={{ fontSize: "1rem" }}>
              Unsaved Transactions
            </h5>

            {suggestions.length === 0 ? (
              <div className="text-muted">No unsaved transactions.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s, idx) => (
                      <tr key={s.daily_transaction_id}>
                        <td>{idx + 1}</td>
                        <td>₹ {formatAmount(s.amount)}</td>
                        <td className={s.type === "debit" ? "text-danger" : "text-success"}>{s.type}</td>
                        <td>{s.category_name || s.category_id}</td>
                        <td>{s.quantity ?? 0}</td>
                        <td>{s.purpose || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-ui mb-4">
            <h5 className="mb-3" style={{ fontSize: "1rem" }}>
              All Main Transactions
            </h5>
            <div className="table-responsive">
              <table className="table table-bordered table-striped align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Date</th>
                    <th>Total Debit</th>
                    <th>Total Credit</th>
                    <th>Total Transactions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mainTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        No main transactions available
                      </td>
                    </tr>
                  ) : (
                    mainTransactions.map((mt) => (
                      <tr key={mt.transaction_id}>
                        <td>{new Date(mt.date).toLocaleDateString()}</td>
                        <td>₹ {formatAmount(mt.total_debit)}</td>
                        <td>₹ {formatAmount(mt.total_credit)}</td>
                        <td>{mt.total_transactions}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(mt.transaction_id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
