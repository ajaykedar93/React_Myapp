import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://express-backend-myapp.onrender.com/api/tag_transaction";

export default function Gettag_transaction() {
  const today = new Date();
  const currentMonthValue = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [editForm, setEditForm] = useState({
    amount: "",
    quantity: "",
    type: "debit",
    purpose: "",
    t_date: "",
  });

  const [popup, setPopup] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
    autoClose: true,
  });

  const [deletePopup, setDeletePopup] = useState({
    open: false,
    id: null,
  });

  const openPopup = (type, title, message, autoClose = true) => {
    setPopup({
      open: true,
      type,
      title,
      message,
      autoClose,
    });
  };

  const closePopup = () => {
    setPopup({
      open: false,
      type: "",
      title: "",
      message: "",
      autoClose: true,
    });
  };

  const openDeletePopup = (id) => {
    setDeletePopup({
      open: true,
      id,
    });
  };

  const closeDeletePopup = () => {
    setDeletePopup({
      open: false,
      id: null,
    });
  };

  useEffect(() => {
    if (popup.open && popup.autoClose) {
      const timer = setTimeout(() => {
        closePopup();
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, [popup.open, popup.autoClose]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      const data = await res.json();
      setTransactions(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("GET ERROR:", error);
      openPopup("error", "Load Failed", "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      if (!item.t_date) return false;
      const d = new Date(item.t_date);
      const monthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      return monthValue === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const summary = useMemo(() => {
    let debit = 0;
    let credit = 0;

    filteredTransactions.forEach((item) => {
      const amount = Number(item.amount || 0);
      if (item.type === "credit") credit += amount;
      else debit += amount;
    });

    return {
      debit,
      credit,
      balance: credit - debit,
      total: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const groupedByDate = useMemo(() => {
    const map = {};

    filteredTransactions.forEach((item) => {
      const key = item.formatted_date || item.t_date || "Unknown Date";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    return Object.entries(map);
  }, [filteredTransactions]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      amount: item.amount ?? "",
      quantity: item.quantity ?? "",
      type: item.type || "debit",
      purpose: item.purpose || "",
      t_date: item.t_date ? String(item.t_date).split("T")[0] : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      amount: "",
      quantity: "",
      type: "debit",
      purpose: "",
      t_date: "",
    });
  };

  const updateEditField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async (id) => {
    try {
      setSavingId(id);

      const payload = {
        amount: Number(editForm.amount),
        quantity: editForm.quantity === "" ? "" : Number(editForm.quantity),
        type: editForm.type,
        purpose: editForm.purpose,
        t_date: editForm.t_date,
      };

      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        openPopup("error", "Update Failed", data.error || "Update failed");
        return;
      }

      openPopup("success", "Updated", "Transaction updated successfully");
      setEditingId(null);
      fetchTransactions();
    } catch (error) {
      console.error("UPDATE ERROR:", error);
      openPopup("error", "Update Failed", "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const confirmDelete = async () => {
    const id = deletePopup.id;
    if (!id) return;

    try {
      setDeletingId(id);

      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        closeDeletePopup();
        openPopup("error", "Delete Failed", data.error || "Delete failed");
        return;
      }

      closeDeletePopup();
      openPopup("success", "Deleted", "Transaction deleted successfully");

      if (editingId === id) cancelEdit();
      fetchTransactions();
    } catch (error) {
      console.error("DELETE ERROR:", error);
      closeDeletePopup();
      openPopup("error", "Delete Failed", "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);

      const pdfUrl = `${API_BASE}/export-pdf?month=${selectedMonth}`;
      const response = await fetch(pdfUrl);

      if (!response.ok) {
        let errorMessage = "Failed to download PDF";
        try {
          const result = await response.json();
          errorMessage = result.error || result.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `transactions-${selectedMonth}.pdf`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      openPopup("success", "Download Started", `${fileName} downloaded successfully`);
    } catch (error) {
      console.error("PDF DOWNLOAD ERROR:", error);
      openPopup("error", "Download Failed", error.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <style>{`
        *{
          box-sizing:border-box;
        }

        .gtt-page{
          width:100%;
          min-height:100vh;
          padding:16px;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.09), transparent 30%),
            radial-gradient(circle at top right, rgba(168,85,247,.09), transparent 30%),
            radial-gradient(circle at bottom left, rgba(34,197,94,.08), transparent 28%),
            linear-gradient(180deg,#f8fafc 0%, #eef4ff 100%);
        }

        .gtt-shell{
          width:100%;
          max-width:1200px;
          margin:0 auto;
        }

        .gtt-hero{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:14px;
          padding:18px;
          border-radius:24px;
          background:linear-gradient(135deg,#0f172a 0%, #1d4ed8 55%, #06b6d4 100%);
          color:#fff;
          box-shadow:0 20px 42px rgba(29,78,216,.18);
          margin-bottom:16px;
          position:relative;
          overflow:hidden;
        }

        .gtt-hero::before{
          content:"";
          position:absolute;
          right:-40px;
          top:-40px;
          width:180px;
          height:180px;
          border-radius:50%;
          background:rgba(255,255,255,.08);
        }

        .gtt-hero::after{
          content:"";
          position:absolute;
          left:-30px;
          bottom:-30px;
          width:120px;
          height:120px;
          border-radius:50%;
          background:rgba(255,255,255,.06);
        }

        .gtt-hero-left{
          position:relative;
          z-index:1;
          min-width:0;
          flex:1;
        }

        .gtt-title{
          margin:0;
          font-size:1.15rem;
          font-weight:900;
          letter-spacing:.2px;
        }

        .gtt-subtitle{
          margin:6px 0 0;
          font-size:.78rem;
          color:rgba(255,255,255,.82);
          line-height:1.5;
        }

        .gtt-hero-right{
          position:relative;
          z-index:1;
          display:flex;
          gap:10px;
          align-items:flex-start;
          flex-wrap:wrap;
        }

        .gtt-month-box{
          min-width:220px;
          padding:12px;
          border-radius:18px;
          background:rgba(255,255,255,.12);
          border:1px solid rgba(255,255,255,.14);
          backdrop-filter:blur(10px);
        }

        .gtt-month-label{
          font-size:.7rem;
          font-weight:800;
          margin-bottom:6px;
          color:rgba(255,255,255,.84);
          letter-spacing:.2px;
        }

        .gtt-month-input{
          width:100%;
          height:40px;
          border:none;
          outline:none;
          border-radius:12px;
          padding:0 12px;
          font-size:.82rem;
          font-weight:700;
          color:#0f172a;
          background:#fff;
        }

        .gtt-download-wrap{
          padding:12px;
          border-radius:18px;
          background:rgba(255,255,255,.12);
          border:1px solid rgba(255,255,255,.14);
          backdrop-filter:blur(10px);
          min-width:170px;
        }

        .gtt-download-label{
          font-size:.7rem;
          font-weight:800;
          margin-bottom:6px;
          color:rgba(255,255,255,.84);
          letter-spacing:.2px;
        }

        .gtt-download-btn{
          width:100%;
          min-height:40px;
          border:none;
          outline:none;
          border-radius:12px;
          background:linear-gradient(135deg,#ffffff,#e0f2fe);
          color:#0f172a;
          font-size:.78rem;
          font-weight:900;
          cursor:pointer;
          transition:.2s ease;
        }

        .gtt-download-btn:hover{
          transform:translateY(-1px);
        }

        .gtt-download-btn:active{
          transform:scale(.98);
        }

        .gtt-download-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
          transform:none;
        }

        .gtt-grid{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:12px;
          margin-bottom:16px;
        }

        .gtt-stat{
          padding:13px;
          border-radius:18px;
          background:rgba(255,255,255,.88);
          border:1px solid rgba(255,255,255,.75);
          box-shadow:0 12px 28px rgba(15,23,42,.06);
        }

        .gtt-stat-label{
          font-size:.64rem;
          font-weight:800;
          color:#64748b;
          text-transform:uppercase;
          letter-spacing:.35px;
          margin-bottom:6px;
        }

        .gtt-stat-value{
          font-size:.9rem;
          font-weight:800;
          color:#0f172a;
        }

        .gtt-stat.debit .gtt-stat-value{
          color:#dc2626;
        }

        .gtt-stat.credit .gtt-stat-value{
          color:#16a34a;
        }

        .gtt-stat.balance .gtt-stat-value{
          color:#2563eb;
        }

        .gtt-main-card{
          background:rgba(255,255,255,.9);
          border:1px solid rgba(255,255,255,.75);
          border-radius:24px;
          box-shadow:0 14px 34px rgba(15,23,42,.07);
          overflow:hidden;
        }

        .gtt-card-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:15px 18px;
          border-bottom:1px solid #e2e8f0;
          background:linear-gradient(180deg,#ffffff,#f8fbff);
        }

        .gtt-card-title{
          font-size:.95rem;
          font-weight:900;
          color:#0f172a;
        }

        .gtt-card-count{
          font-size:.72rem;
          font-weight:800;
          color:#475569;
          background:#eef2ff;
          border:1px solid #dbe4ff;
          padding:6px 10px;
          border-radius:999px;
        }

        .gtt-empty{
          padding:40px 18px;
          text-align:center;
          color:#64748b;
          font-size:.84rem;
          font-weight:800;
        }

        .gtt-date-group{
          padding:16px;
          border-bottom:1px solid #edf2f7;
        }

        .gtt-date-group:last-child{
          border-bottom:none;
        }

        .gtt-date-title{
          display:inline-flex;
          align-items:center;
          gap:8px;
          margin-bottom:14px;
          font-size:.78rem;
          font-weight:900;
          color:#0f172a;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          padding:8px 12px;
          border-radius:999px;
        }

        .gtt-date-dot{
          width:8px;
          height:8px;
          border-radius:50%;
          background:#2563eb;
        }

        .gtt-list{
          display:grid;
          gap:12px;
        }

        .gtt-item{
          border:1px solid #e2e8f0;
          border-radius:18px;
          background:linear-gradient(180deg,#ffffff,#fbfdff);
          box-shadow:0 8px 20px rgba(15,23,42,.04);
          overflow:hidden;
          padding:14px;
        }

        .gtt-item-topbar{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          margin-bottom:12px;
          flex-wrap:wrap;
        }

        .gtt-badge{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:26px;
          padding:5px 10px;
          border-radius:999px;
          font-size:.68rem;
          font-weight:900;
          letter-spacing:.2px;
        }

        .gtt-date-badge{
          background:#eff6ff;
          color:#1d4ed8;
          border:1px solid #bfdbfe;
        }

        .gtt-badge.debit{
          background:#fff1f2;
          color:#be123c;
          border:1px solid #fecdd3;
        }

        .gtt-badge.credit{
          background:#ecfdf5;
          color:#15803d;
          border:1px solid #bbf7d0;
        }

        .gtt-purpose{
          font-size:.76rem;
          color:#0f172a;
          line-height:1.55;
          font-weight:800;
          margin-bottom:10px;
        }

        .gtt-subcategory{
          font-size:.76rem;
          color:#0f172a;
          font-weight:800;
          margin-bottom:4px;
        }

        .gtt-category{
          font-size:.72rem;
          color:#64748b;
          font-weight:500;
          margin-bottom:2px;
        }

        .gtt-bottom-row{
          margin-top:12px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        }

        .gtt-info-pair{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        .gtt-mini-box{
          min-height:34px;
          padding:7px 12px;
          border-radius:12px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          display:inline-flex;
          align-items:center;
          gap:6px;
        }

        .gtt-mini-label{
          font-size:.68rem;
          font-weight:800;
          color:#64748b;
        }

        .gtt-mini-value{
          font-size:.78rem;
          font-weight:900;
          color:#0f172a;
        }

        .gtt-mini-value.debit{
          color:#dc2626;
        }

        .gtt-mini-value.credit{
          color:#16a34a;
        }

        .gtt-actions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .gtt-btn{
          min-height:30px;
          padding:6px 10px;
          border:none;
          outline:none;
          border-radius:10px;
          font-size:.7rem;
          font-weight:900;
          cursor:pointer;
          transition:.2s ease;
        }

        .gtt-btn:hover{
          transform:translateY(-1px);
        }

        .gtt-btn:active{
          transform:scale(.97);
        }

        .gtt-btn.edit{
          background:linear-gradient(135deg,#2563eb,#7c3aed);
          color:#fff;
          box-shadow:0 8px 18px rgba(37,99,235,.16);
        }

        .gtt-btn.delete{
          background:linear-gradient(135deg,#ef4444,#b91c1c);
          color:#fff;
          box-shadow:0 8px 18px rgba(239,68,68,.16);
        }

        .gtt-btn.cancel{
          background:#f8fafc;
          color:#334155;
          border:1px solid #cbd5e1;
        }

        .gtt-btn.save{
          background:linear-gradient(135deg,#16a34a,#059669);
          color:#fff;
          box-shadow:0 8px 18px rgba(22,163,74,.16);
        }

        .gtt-edit{
          margin-top:14px;
          padding-top:14px;
          border-top:1px solid #e2e8f0;
          background:linear-gradient(180deg,#f8fbff,#ffffff);
        }

        .gtt-form-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:12px;
        }

        .gtt-field{
          display:flex;
          flex-direction:column;
          gap:6px;
        }

        .gtt-field.full{
          grid-column:1 / -1;
        }

        .gtt-label{
          font-size:.7rem;
          font-weight:800;
          color:#475569;
        }

        .gtt-input,
        .gtt-select,
        .gtt-textarea{
          width:100%;
          border:1px solid #dbe4f0;
          outline:none;
          border-radius:12px;
          background:linear-gradient(180deg,#ffffff,#f8fbff);
          color:#0f172a;
          font-size:.8rem;
          font-weight:700;
          transition:.2s ease;
        }

        .gtt-input,
        .gtt-select{
          height:40px;
          padding:0 12px;
        }

        .gtt-textarea{
          min-height:84px;
          resize:none;
          padding:10px 12px;
          font-family:inherit;
          line-height:1.5;
        }

        .gtt-input:focus,
        .gtt-select:focus,
        .gtt-textarea:focus{
          border-color:#60a5fa;
          box-shadow:0 0 0 4px rgba(59,130,246,.12);
        }

        .gtt-edit-actions{
          display:flex;
          justify-content:flex-end;
          gap:8px;
          margin-top:12px;
          flex-wrap:wrap;
        }

        .popup-overlay{
          position:fixed;
          inset:0;
          background:rgba(15,23,42,.38);
          backdrop-filter:blur(4px);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:9999;
          padding:16px;
        }

        .popup-box{
          width:100%;
          max-width:340px;
          background:#ffffff;
          border-radius:22px;
          padding:20px 16px;
          text-align:center;
          box-shadow:0 24px 50px rgba(15,23,42,.22);
          border:1px solid #e5e7eb;
          animation: popupFade .25s ease;
        }

        @keyframes popupFade{
          from{
            opacity:0;
            transform:scale(.92) translateY(8px);
          }
          to{
            opacity:1;
            transform:scale(1) translateY(0);
          }
        }

        .popup-icon{
          width:54px;
          height:54px;
          margin:0 auto 12px auto;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#fff;
          font-size:24px;
          font-weight:900;
          box-shadow:0 10px 22px rgba(15,23,42,.14);
        }

        .popup-title{
          font-size:1rem;
          font-weight:900;
          color:#111827;
          margin-bottom:6px;
        }

        .popup-text{
          font-size:.8rem;
          line-height:1.55;
          color:#64748b;
        }

        .popup-btn-row{
          display:flex;
          gap:10px;
          justify-content:center;
          flex-wrap:wrap;
          margin-top:16px;
        }

        .popup-btn{
          min-width:110px;
          min-height:40px;
          padding:9px 14px;
          border:none;
          outline:none;
          border-radius:12px;
          font-size:.8rem;
          font-weight:900;
          cursor:pointer;
        }

        .popup-btn.cancel{
          background:#f8fafc;
          color:#334155;
          border:1px solid #cbd5e1;
        }

        .popup-btn.delete{
          background:linear-gradient(135deg,#ef4444,#b91c1c);
          color:#fff;
          box-shadow:0 8px 18px rgba(239,68,68,.16);
        }

        @media (max-width: 991.98px){
          .gtt-grid{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 767.98px){
          .gtt-page{
            padding:12px;
          }

          .gtt-hero{
            flex-direction:column;
            padding:16px;
          }

          .gtt-hero-right{
            width:100%;
            flex-direction:column;
          }

          .gtt-month-box,
          .gtt-download-wrap{
            width:100%;
            min-width:100%;
          }

          .gtt-grid{
            grid-template-columns:1fr;
          }

          .gtt-card-head{
            padding:14px;
          }

          .gtt-date-group{
            padding:14px;
          }

          .gtt-item{
            padding:12px;
          }

          .gtt-bottom-row{
            flex-direction:column;
            align-items:flex-start;
          }

          .gtt-actions{
            width:100%;
            justify-content:flex-start;
          }

          .gtt-form-grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="gtt-page">
        <div className="gtt-shell">
          <div className="gtt-hero">
            <div className="gtt-hero-left">
              <h2 className="gtt-title">Transaction Dashboard</h2>
              <p className="gtt-subtitle">
                View monthly transactions, edit any entry anytime, delete records, and download monthly PDF.
              </p>
            </div>

            <div className="gtt-hero-right">
              <div className="gtt-month-box">
                <div className="gtt-month-label">Select Month</div>
                <input
                  type="month"
                  className="gtt-month-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div className="gtt-download-wrap">
                <div className="gtt-download-label">Download Report</div>
                <button
                  type="button"
                  className="gtt-download-btn"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            </div>
          </div>

          <div className="gtt-grid">
            <div className="gtt-stat">
              <div className="gtt-stat-label">Transactions</div>
              <div className="gtt-stat-value">{summary.total}</div>
            </div>

            <div className="gtt-stat debit">
              <div className="gtt-stat-label">Debit</div>
              <div className="gtt-stat-value">₹ {summary.debit}</div>
            </div>

            <div className="gtt-stat credit">
              <div className="gtt-stat-label">Credit</div>
              <div className="gtt-stat-value">₹ {summary.credit}</div>
            </div>

            <div className="gtt-stat balance">
              <div className="gtt-stat-label">Balance</div>
              <div className="gtt-stat-value">₹ {summary.balance}</div>
            </div>
          </div>

          <div className="gtt-main-card">
            <div className="gtt-card-head">
              <div className="gtt-card-title">Monthly Transaction List</div>
              <div className="gtt-card-count">
                {loading ? "Loading..." : `${filteredTransactions.length} Records`}
              </div>
            </div>

            {loading ? (
              <div className="gtt-empty">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="gtt-empty">
                No transactions found for the selected month.
              </div>
            ) : (
              groupedByDate.map(([date, items]) => (
                <div className="gtt-date-group" key={date}>
                  <div className="gtt-date-title">
                    <span className="gtt-date-dot"></span>
                    {date}
                  </div>

                  <div className="gtt-list">
                    {items.map((item) => (
                      <div className="gtt-item" key={item.id}>
                        <div className="gtt-item-topbar">
                          <span className="gtt-badge gtt-date-badge">
                            {item.formatted_date || item.t_date}
                          </span>

                          <span className={`gtt-badge ${item.type}`}>
                            {item.type === "credit" ? "Credit" : "Debit"}
                          </span>
                        </div>

                        {item.purpose && (
                          <div className="gtt-purpose">{item.purpose}</div>
                        )}

                        <div className="gtt-subcategory">
                          {item.subcategory_name || "No Subcategory"}
                        </div>

                        <div className="gtt-category">
                          {item.category_name || "No Category"}
                        </div>

                        <div className="gtt-bottom-row">
                          <div className="gtt-info-pair">
                            <div className="gtt-mini-box">
                              <span className="gtt-mini-label">Amount</span>
                              <span className={`gtt-mini-value ${item.type}`}>
                                ₹ {item.amount}
                              </span>
                            </div>

                            <div className="gtt-mini-box">
                              <span className="gtt-mini-label">Qty</span>
                              <span className="gtt-mini-value">
                                {item.quantity ?? 0}
                              </span>
                            </div>
                          </div>

                          <div className="gtt-actions">
                            <button
                              className="gtt-btn edit"
                              onClick={() =>
                                editingId === item.id ? cancelEdit() : startEdit(item)
                              }
                            >
                              {editingId === item.id ? "Close" : "Update"}
                            </button>

                            <button
                              className="gtt-btn delete"
                              onClick={() => openDeletePopup(item.id)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>

                        {editingId === item.id && (
                          <div className="gtt-edit">
                            <div className="gtt-form-grid">
                              <div className="gtt-field">
                                <label className="gtt-label">Amount</label>
                                <input
                                  className="gtt-input"
                                  type="number"
                                  value={editForm.amount}
                                  onChange={(e) =>
                                    updateEditField("amount", e.target.value)
                                  }
                                />
                              </div>

                              <div className="gtt-field">
                                <label className="gtt-label">Quantity</label>
                                <input
                                  className="gtt-input"
                                  type="number"
                                  value={editForm.quantity}
                                  onChange={(e) =>
                                    updateEditField("quantity", e.target.value)
                                  }
                                />
                              </div>

                              <div className="gtt-field">
                                <label className="gtt-label">Type</label>
                                <select
                                  className="gtt-select"
                                  value={editForm.type}
                                  onChange={(e) =>
                                    updateEditField("type", e.target.value)
                                  }
                                >
                                  <option value="debit">Debit</option>
                                  <option value="credit">Credit</option>
                                </select>
                              </div>

                              <div className="gtt-field">
                                <label className="gtt-label">Date</label>
                                <input
                                  className="gtt-input"
                                  type="date"
                                  value={editForm.t_date}
                                  onChange={(e) =>
                                    updateEditField("t_date", e.target.value)
                                  }
                                />
                              </div>

                              <div className="gtt-field full">
                                <label className="gtt-label">Purpose</label>
                                <textarea
                                  className="gtt-textarea"
                                  value={editForm.purpose}
                                  onChange={(e) =>
                                    updateEditField("purpose", e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className="gtt-edit-actions">
                              <button
                                className="gtt-btn cancel"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                              <button
                                className="gtt-btn save"
                                onClick={() => handleUpdate(item.id)}
                                disabled={savingId === item.id}
                              >
                                {savingId === item.id ? "Saving..." : "Save Changes"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {popup.open && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div
              className="popup-icon"
              style={{
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #22c55e, #15803d)"
                    : "linear-gradient(135deg, #ef4444, #b91c1c)",
              }}
            >
              {popup.type === "success" ? "✓" : "!"}
            </div>
            <div className="popup-title">{popup.title}</div>
            <div className="popup-text">{popup.message}</div>
          </div>
        </div>
      )}

      {deletePopup.open && (
        <div className="popup-overlay" onClick={closeDeletePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div
              className="popup-icon"
              style={{
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              }}
            >
              !
            </div>
            <div className="popup-title">Delete Transaction</div>
            <div className="popup-text">
              Are you sure you want to delete this transaction? This action cannot
              be undone.
            </div>

            <div className="popup-btn-row">
              <button
                className="popup-btn cancel"
                onClick={closeDeletePopup}
              >
                Cancel
              </button>
              <button
                className="popup-btn delete"
                onClick={confirmDelete}
                disabled={deletingId === deletePopup.id}
              >
                {deletingId === deletePopup.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}