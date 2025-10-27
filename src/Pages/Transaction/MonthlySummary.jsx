import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import LoadingSpinner from "../Entertainment/LoadingSpiner";

const API_BASE = "https://express-backend-myapp.onrender.com/api";

// Formatter: always return 2 decimals
const format = (num) => {
  if (num === null || num === undefined || num === "" || Number.isNaN(Number(num))) return "0.00";
  return Number(num).toFixed(2);
};

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Map "Jan" → 01 etc.
const MON_MAP = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// Convert "DD Mon YYYY" (e.g., "05 Sep 2025" or "5 Sep, 2025") → "YYYY-MM-DD"
function ddMonYyyyToISO(input) {
  if (!input) return null;
  const cleaned = String(input).replace(",", "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length !== 3) return null;
  let [dd, mon, yyyy] = parts;
  if (!/^\d{1,2}$/.test(dd)) return null;
  if (!/^\d{4}$/.test(yyyy)) return null;
  if (!MON_MAP[mon]) return null;
  dd = dd.padStart(2, "0");
  return `${yyyy}-${MON_MAP[mon]}-${dd}`;
}

export default function MonthlySummary() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("pdf");

  // View mode for small screens: "compact" (3 cols) or "full" (horizontal scroll)
  const [viewMode, setViewMode] = useState("compact");

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");

  // Delete date modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDateLabel, setDeleteDateLabel] = useState("");
  const [deleteISODate, setDeleteISODate] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  // Monthly totals
  const [monthlyTotalTransactions, setMonthlyTotalTransactions] = useState(0);
  const [monthlyTotalDebit, setMonthlyTotalDebit] = useState(0);
  const [monthlyTotalCredit, setMonthlyTotalCredit] = useState(0);

  const monthName = useMemo(
    () => monthNames[Math.max(1, Math.min(12, Number(month))) - 1] || "",
    [month]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/monthly-summary`, { params: { month, year } });
      const data = res.data || [];
      setTransactions(data);

      if (!data.length) {
        setError("No transactions found for the selected month.");
        setMonthlyTotalTransactions(0);
        setMonthlyTotalDebit(0);
        setMonthlyTotalCredit(0);
        return;
      }

      let totalTrans = 0, totalDebit = 0, totalCredit = 0;

      data.forEach((day) => {
        let dayDebit = 0, dayCredit = 0;
        (day.transactions || []).forEach((t) => {
          totalTrans++;
          const amt = parseFloat(t.amount || 0);
          if (t.type === "debit") { totalDebit += amt; dayDebit += amt; }
          else if (t.type === "credit") { totalCredit += amt; dayCredit += amt; }
        });
        day.total_debit = dayDebit;
        day.total_credit = dayCredit;
        day.total_transactions = (day.transactions || []).length;
      });

      setMonthlyTotalTransactions(totalTrans);
      setMonthlyTotalDebit(totalDebit);
      setMonthlyTotalCredit(totalCredit);
    } catch (err) {
      console.error(err);
      setError("No transactions found for the selected month.");
      setTransactions([]);
      setMonthlyTotalTransactions(0);
      setMonthlyTotalDebit(0);
      setMonthlyTotalCredit(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (month && year) fetchData(); /* eslint-disable-next-line */ }, [month, year]);

  const handleDownload = () => {
    const url = `${API_BASE}/monthly-summary/download?month=${month}&year=${year}&formatType=${downloadFormat}`;
    window.open(url, "_blank");
  };

  const handleSendEmail = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setSendMessage("Please enter a valid email address.");
      return;
    }
    try {
      setSending(true);
      setSendMessage("");
      const res = await axios.post(`${API_BASE}/monthly-summary/send`, {
        month, year, formatType: downloadFormat, email
      });
      setSendMessage(res.data?.message || "Report sent successfully.");
      setTimeout(() => { setShowEmailModal(false); setEmail(""); setSendMessage(""); }, 1400);
    } catch (err) {
      console.error(err);
      setSendMessage("Failed to send email. Try again.");
    } finally {
      setSending(false);
    }
  };

  const askDeleteDate = (dateLabel) => {
    const iso = ddMonYyyyToISO(dateLabel);
    setDeleteDateLabel(dateLabel);
    setDeleteISODate(iso || "");
    setDeleteMsg(iso ? "" : "Unable to parse date.");
    setShowDeleteModal(true);
  };

  const confirmDeleteDate = async () => {
    if (!deleteISODate) { setDeleteMsg("Unable to parse date."); return; }
    try {
      setDeleting(true);
      setDeleteMsg("");
      await axios.delete(`${API_BASE}/dailyTransaction`, { params: { date: deleteISODate, confirm: "YES" } });
      setDeleteMsg("Deleted successfully.");
      await fetchData();
      setTimeout(() => { setShowDeleteModal(false); setDeleting(false); setDeleteMsg(""); }, 700);
    } catch (err) {
      console.error(err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || "Failed to delete this date. Please try again.";
      setDeleteMsg(serverMsg);
    } finally { setDeleting(false); }
  };

  return (
    <div className="container-fluid py-3">
      {/* Mobile-first theme */}
      <style>{`
        :root{
          --ink-900:#0f172a; --ink-700:#334155; --ink-600:#475569; --ink-500:#64748b;
          --surface:#ffffff; --border:#e6e9ef; --bg:#f6f8fb;
          --brand-grad: linear-gradient(90deg,#6f4bb6 0%, #1f5f78 100%);
          --accent:#2b7a8b; --success:#0f8a5f; --danger:#b33a3a; --muted:#eef2f7;
          --px: clamp(12px, 4vw, 24px);
          --radius: 14px;
          --fs: clamp(14px, 3.6vw, 16px);
          --fs-sm: clamp(12px, 3.2vw, 14px);
          --fs-lg: clamp(16px, 4.4vw, 18px);
        }
        .page-wrap{ max-width: 1100px; margin: 0 auto; padding: 0 var(--px); }
        .ms-title{
          background: var(--brand-grad); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          letter-spacing:.4px; font-weight:800; font-size: clamp(18px, 5.2vw, 28px);
        }
        .controls{ background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:14px; box-shadow:0 8px 24px rgba(2,6,23,.06); }
        .controls .form-select, .controls .form-control{ border-radius:12px; border:1px solid var(--border); font-size:var(--fs); }
        .btn-accent{ background:var(--accent); color:#fff; border:none; border-radius:12px; padding:.6rem 1rem; font-weight:800; font-size:var(--fs); }
        .btn-ghost{ background:#f5f7fb; border:1px dashed #cfd6e4; color:var(--ink-700); border-radius:12px; padding:.6rem 1rem; font-weight:800; font-size:var(--fs); }
        .btn-danger-soft{ background:#fff2f2; color:var(--danger); border:1px solid #f5c6c4; border-radius:12px; padding:.5rem .8rem; font-weight:800; }

        .summary-cards{ display:grid; gap:12px; grid-template-columns: 1fr; margin-top:12px; }
        @media (min-width:576px){ .summary-cards{ grid-template-columns: 1fr 1fr 1fr; } }
        .card-kpi{ background:#fff; border:1px solid var(--border); border-radius:14px; padding:14px; text-align:center; }
        .kpi-label{ font-size:12.5px; color:var(--ink-500); }
        .kpi-value{ font-size: clamp(18px,3.4vw,26px); font-weight:800; color:var(--ink-900); }
        .kpi-debit .kpi-value{ color: var(--danger); }
        .kpi-credit .kpi-value{ color: var(--success); }

        /* Cards (day groups) */
        .transaction-card { border-radius: 12px; overflow:hidden; }
        .transaction-card .card-header{ background: linear-gradient(90deg, #f7f9fc, #eef2f7); border-bottom:1px solid var(--border); }
        .badge-soft{ background:#eaf3ff; color:#1d4ed8; border:1px solid #cfe0ff; font-weight:800; }

        /* Full table wrapper with horizontal scroll */
        .hscroll{ overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .hscroll table{ min-width: 760px; } /* ensure scroll on small screens */
        .table thead th{ position: sticky; top: 0; background:#0f172a; color:#fff; z-index:2; }
        .table tbody td{ vertical-align: middle; }
        .sticky-col{ position: sticky; left: 0; background:#fff; z-index:1; } /* first column sticks */

        .row-total{ background:#fff7e6 !important; }

        /* Compact mobile table (3 columns) */
        .compact-table table{ min-width: 100%; }
        .compact-table th, .compact-table td{ font-size: var(--fs); }
        .hide-sm{ display:none; }   /* hide extra columns in compact mode */

        /* Toggle block */
        .view-toggle{ display:flex; gap:8px; flex-wrap:wrap; }

        /* Modals */
        .modal-backdrop{ position: fixed; inset: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
        .modal-content{ background:#fff; padding: 18px; border-radius: 14px; width:100%; max-width:420px; box-shadow: 0 16px 36px rgba(0,0,0,0.25); }
      `}</style>

      <div className="page-wrap">
        {/* Heading */}
        <h2 className="text-center mb-2 ms-title">📊 Monthly Summary</h2>
        <p className="text-center mb-3" style={{ color: "var(--ink-600)", fontSize:"var(--fs)" }}>
          View detailed transactions for <strong>{monthName} {year}</strong>.
        </p>

        {/* Controls */}
        <div className="controls mb-3">
          <div className="d-flex flex-wrap gap-2 align-items-end justify-content-center">
            <div>
              <label className="form-label mb-1">Month</label>
              <select className="form-select" value={month} onChange={(e)=>setMonth(Number(e.target.value))}>
                {monthNames.map((name, idx) => (<option key={name} value={idx+1}>{name}</option>))}
              </select>
            </div>

            <div>
              <label className="form-label mb-1">Year</label>
              <input
                type="number" className="form-control" min="2000" max="2100" value={year}
                onChange={(e)=>setYear(e.target.value?Number(e.target.value):new Date().getFullYear())}
              />
            </div>

            <div>
              <label className="form-label mb-1">Format</label>
              <select className="form-select" value={downloadFormat} onChange={(e)=>setDownloadFormat(e.target.value)}>
                <option value="pdf">PDF</option><option value="text">Text</option>
              </select>
            </div>

            <div className="d-flex gap-2 align-items-end">
              <button className="btn-ghost" onClick={()=>{}}>{monthName} {year}</button>
              <button className="btn-accent" onClick={handleDownload}>Download</button>
              <button className="btn-accent" style={{ background:"var(--success)" }} onClick={()=>setShowEmailModal(true)}>Send Email</button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="summary-cards">
            <div className="card-kpi">
              <div className="kpi-label">Total {monthName} Transactions</div>
              <div className="kpi-value">{loading ? "—" : monthlyTotalTransactions}</div>
            </div>
            <div className="card-kpi kpi-debit">
              <div className="kpi-label">Total Debit</div>
              <div className="kpi-value">{loading ? "—" : format(monthlyTotalDebit)}</div>
            </div>
            <div className="card-kpi kpi-credit">
              <div className="kpi-label">Total Credit</div>
              <div className="kpi-value">{loading ? "—" : format(monthlyTotalCredit)}</div>
            </div>
          </div>
        </div>

        {/* View toggle (mobile-friendly) */}
        <div className="d-flex justify-content-between align-items-center mb-2 view-toggle">
          <div className="fw-bold" style={{ fontSize:"var(--fs)" }}>View</div>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${viewMode==="compact"?"btn-dark":"btn-outline-dark"}`}
              onClick={()=>setViewMode("compact")}
              title="Show 3 columns (best for phones)"
            >Compact</button>
            <button
              className={`btn btn-sm ${viewMode==="full"?"btn-dark":"btn-outline-dark"}`}
              onClick={()=>setViewMode("full")}
              title="Show all columns with horizontal scroll"
            >Full (scroll)</button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="d-flex justify-content-center my-4"><LoadingSpinner/></div>
        ) : error ? (
          <p className="text-center text-danger fw-semibold">{error}</p>
        ) : (
          <div>
            {transactions.map((day) => (
              <div key={day.date} className="card shadow-sm mb-3 transaction-card">
                <div className="card-header d-flex justify-content-between align-items-center px-3 py-2">
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="mb-0 fw-bold" style={{ fontSize:"var(--fs-lg)" }}>{day.date}</h6>
                    <span className="badge badge-soft rounded-pill" style={{ fontSize:"var(--fs-sm)" }}>
                      {day.total_transactions} Transactions
                    </span>
                  </div>
                  <button className="btn btn-danger-soft" onClick={()=>askDeleteDate(day.date)} title="Delete all transactions for this date">
                    Delete Date
                  </button>
                </div>

                <div className="card-body p-0">
                  {viewMode === "compact" ? (
                    // ===== Compact 3-column table (phones) =====
                    <div className="compact-table hscroll">
                      <table className="table mb-0">
                        <thead>
                          <tr>
                            <th className="sticky-col">#</th>
                            <th>Amount</th>
                            <th>Type</th>
                            {/* hide on compact but keep in DOM for a11y if needed */}
                            <th className="hide-sm">Category</th>
                            <th className="hide-sm">Subcategory</th>
                            <th className="hide-sm">Qty</th>
                            <th className="hide-sm">Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(day.transactions || []).map((t, i) => (
                            <tr key={`${day.date}-${i}`}>
                              <td className="sticky-col">{i + 1}</td>
                              <td className={t.type==="debit" ? "text-danger" : "text-success"}>{format(t.amount)}</td>
                              <td style={{ textTransform:"capitalize" }}>{t.type}</td>
                              <td className="hide-sm">{t.category}</td>
                              <td className="hide-sm">{t.subcategory || "-"}</td>
                              <td className="hide-sm">{t.quantity ?? 0}</td>
                              <td className="hide-sm">{t.purpose || "-"}</td>
                            </tr>
                          ))}
                          <tr className="row-total fw-bold">
                            <td className="sticky-col">•</td>
                            <td colSpan={6} className="py-2">
                              <span className="me-4 text-danger">Debit: {format(day.total_debit)}</span>
                              <span className="text-success">Credit: {format(day.total_credit)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // ===== Full table with horizontal scroll =====
                    <div className="hscroll">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th className="sticky-col">#</th>
                            <th>Amount</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Subcategory</th>
                            <th>Qty</th>
                            <th>Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(day.transactions || []).map((t, i) => (
                            <tr key={`${day.date}-${i}`}>
                              <td className="sticky-col">{i + 1}</td>
                              <td className={t.type==="debit" ? "text-danger" : "text-success"}>{format(t.amount)}</td>
                              <td style={{ textTransform:"capitalize" }}>{t.type}</td>
                              <td>{t.category}</td>
                              <td>{t.subcategory || "-"}</td>
                              <td>{t.quantity ?? 0}</td>
                              <td>{t.purpose || "-"}</td>
                            </tr>
                          ))}
                          <tr className="row-total fw-bold">
                            <td className="sticky-col">•</td>
                            <td colSpan={6} className="py-2">
                              <span className="me-4 text-danger">Debit: {format(day.total_debit)}</span>
                              <span className="text-success">Credit: {format(day.total_credit)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Monthly Summary line */}
            <div className="mt-2 text-center" style={{ color: "var(--ink-700)", fontSize:"var(--fs)" }}>
              <strong>{monthName} {year}</strong> — Total: <strong>{monthlyTotalTransactions}</strong> •
              &nbsp; Debit: <strong className="text-danger">{format(monthlyTotalDebit)}</strong> •
              &nbsp; Credit: <strong className="text-success">{format(monthlyTotalCredit)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Send report via email">
          <div className="modal-content">
            <h5 className="fw-bold mb-2">Send {downloadFormat.toUpperCase()} Report</h5>
            <p className="mb-3" style={{ color: "var(--ink-600)" }}>{monthName} {year}</p>
            <input type="email" className="form-control mb-3" placeholder="Enter email address" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-outline-secondary" onClick={()=>setShowEmailModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSendEmail} disabled={sending}>{sending ? "Sending..." : "Send"}</button>
            </div>
            {sendMessage && (
              <p className="mt-2 text-center" style={{ color: sendMessage.toLowerCase().includes("fail") ? "var(--danger)" : "var(--success)" }}>
                {sendMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete date">
          <div className="modal-content">
            <h5 className="fw-bold mb-1">Delete transactions for this date?</h5>
            <p className="mb-3" style={{ color: "var(--ink-600)" }}>
              <strong>{deleteDateLabel}</strong><br/>This action cannot be undone.
            </p>
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-outline-secondary" onClick={()=>{ setShowDeleteModal(false); setDeleteMsg(""); }} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteDate} disabled={deleting || !deleteISODate} title={deleteISODate ? "Confirm delete" : "Invalid date"}>
                {deleting ? "Deleting..." : "OK, Delete"}
              </button>
            </div>
            {deleteMsg && (
              <p className="mt-2 text-center" style={{ color: deleteMsg.toLowerCase().includes("fail") ? "var(--danger)" : "var(--success)" }}>
                {deleteMsg}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-3" style={{ fontSize:"var(--fs-sm)", color:"var(--ink-500)" }}>
        Developed by <strong>Ajay Kedar</strong>
      </div>
    </div>
  );
}
