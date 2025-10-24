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
  const cleaned = String(input).replace(",", "").trim(); // remove any comma
  const parts = cleaned.split(/\s+/); // ["05","Sep","2025"] or ["5","Sep","2025"]
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

  // Email modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");

  // Delete confirm modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDateLabel, setDeleteDateLabel] = useState("");    // "05 Sep 2025"
  const [deleteISODate, setDeleteISODate] = useState("");        // "2025-09-05"
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

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/monthly-summary`, {
        params: { month, year },
      });
      const data = res.data || [];
      setTransactions(data);

      if (!data.length) {
        setError("No transactions found for the selected month.");
        setMonthlyTotalTransactions(0);
        setMonthlyTotalDebit(0);
        setMonthlyTotalCredit(0);
        return;
      }

      let totalTrans = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      // Enrich each day with day totals
      data.forEach((day) => {
        let dayDebit = 0;
        let dayCredit = 0;
        (day.transactions || []).forEach((t) => {
          totalTrans++;
          if (t.type === "debit") {
            const amt = parseFloat(t.amount || 0);
            totalDebit += amt;
            dayDebit += amt;
          } else if (t.type === "credit") {
            const amt = parseFloat(t.amount || 0);
            totalCredit += amt;
            dayCredit += amt;
          }
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

  useEffect(() => {
    if (month && year) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

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
        month,
        year,
        formatType: downloadFormat,
        email,
      });
      setSendMessage(res.data?.message || "Report sent successfully.");
      setTimeout(() => {
        setShowEmailModal(false);
        setEmail("");
        setSendMessage("");
      }, 1400);
    } catch (err) {
      console.error(err);
      setSendMessage("Failed to send email. Try again.");
    } finally {
      setSending(false);
    }
  };

  // Open delete confirmation for a date like "05 Sep 2025"
  const askDeleteDate = (dateLabel) => {
    const iso = ddMonYyyyToISO(dateLabel);
    setDeleteDateLabel(dateLabel);
    setDeleteISODate(iso || "");
    setDeleteMsg(iso ? "" : "Unable to parse date.");
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDeleteDate = async () => {
    if (!deleteISODate) {
      setDeleteMsg("Unable to parse date.");
      return;
    }
    try {
      setDeleting(true);
      setDeleteMsg("");
      // Per-day delete API (confirm=YES safety)
      await axios.delete(`${API_BASE}/dailyTransaction`, {
        params: { date: deleteISODate, confirm: "YES" },
      });
      setDeleteMsg("Deleted successfully.");
      await fetchData(); // refresh list
      setTimeout(() => {
        setShowDeleteModal(false);
        setDeleting(false);
        setDeleteMsg("");
      }, 700);
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to delete this date. Please try again.";
      setDeleteMsg(serverMsg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container my-4">
      {/* Local theme (no default bootstrap blue) */}
      <style>{`
        :root{
          --ink-900:#0f172a; --ink-700:#334155; --ink-600:#475569; --ink-500:#64748b;
          --surface:#ffffff; --border:#e6e9ef; --bg:#f6f8fb;
          --brand-grad: linear-gradient(90deg,#6f4bb6 0%, #1f5f78 100%);
          --accent:#2b7a8b; --success:#0f8a5f; --danger:#b33a3a; --muted:#eef2f7;
          --warn:#b26b00;
        }
        .ms-title{
          background: var(--brand-grad);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing:.4px;
        }
        .controls{
          background: var(--surface);
          border:1px solid var(--border);
          border-radius:16px;
          padding:14px;
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
        }
        .controls .form-select, .controls .form-control{
          border-radius:12px; border:1px solid var(--border);
        }
        .btn-accent{
          background: var(--accent);
          color:#fff; border:none; border-radius:12px; padding:10px 14px; font-weight:700;
        }
        .btn-ghost{
          background:#f5f7fb; border:1px dashed #cfd6e4; color:var(--ink-700);
          border-radius:12px; padding:10px 14px; font-weight:700;
        }
        .btn-danger-soft{
          background:#fff2f2; color:var(--danger); border:1px solid #f5c6c4; border-radius:12px; padding:8px 12px; font-weight:700;
        }
        .summary-cards{
          display:grid; gap:12px; grid-template-columns: 1fr; margin-top:14px;
        }
        @media (min-width:576px){ .summary-cards{ grid-template-columns: 1fr 1fr 1fr; } }
        .card-kpi{
          background:#fff; border:1px solid var(--border); border-radius:14px; padding:16px;
        }
        .kpi-label{ font-size:12.5px; color:var(--ink-500); margin-bottom:6px; }
        .kpi-value{ font-size: clamp(18px,3vw,26px); font-weight:800; color:var(--ink-900); }
        .kpi-debit .kpi-value{ color: var(--danger); }
        .kpi-credit .kpi-value{ color: var(--success); }

        .transaction-card { border-radius: 12px; transition: transform .2s ease; overflow:hidden; }
        .transaction-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .transaction-card .card-header{
          background: linear-gradient(90deg, #f7f9fc, #eef2f7);
          border-bottom: 1px solid var(--border);
        }
        .badge-soft{
          background:#eaf3ff; color:#1d4ed8; border:1px solid #cfe0ff;
        }
        .table thead th{ white-space: nowrap; }
        .table tbody td{ vertical-align: middle; }
        .row-total{
          background: #fff7e6 !important;
        }

        /* Modals */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          display:flex; align-items:center; justify-content:center; z-index:1000;
          padding:16px;
        }
        .modal-content {
          background: #fff; padding: 18px; border-radius: 14px; width: 100%; max-width: 420px;
          box-shadow: 0px 16px 36px rgba(0,0,0,0.25); animation: slideDown .25s ease-out;
        }
        @keyframes slideDown { from { transform: translateY(-18px); opacity:0; } to { transform: translateY(0); opacity:1; } }

        .footer-note{
          font-size: 12.5px; color: var(--ink-500); text-align:center; margin-top: 12px;
          border-top: 1px dashed var(--border); padding-top: 10px;
        }
      `}</style>

      {/* Heading */}
      <h2 className="text-center fw-bold mb-3 ms-title">📊 Monthly Summary</h2>
      <p className="text-center mb-4" style={{ color: "var(--ink-600)" }}>
        View detailed transactions and totals for <strong>{monthName} {year}</strong>.
      </p>

      {/* Controls */}
      <div className="controls mb-3">
        <div className="d-flex flex-wrap gap-2 align-items-end justify-content-center">
          <div>
            <label className="form-label mb-1">Month</label>
            <select
              className="form-select"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label mb-1">Year</label>
            <input
              type="number"
              className="form-control"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : new Date().getFullYear())}
            />
          </div>

          <div>
            <label className="form-label mb-1">Format</label>
            <select
              className="form-select"
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
            >
              <option value="pdf">PDF</option>
              <option value="text">Text</option>
            </select>
          </div>

        <div className="d-flex gap-2">
            <button className="btn-ghost" onClick={() => { /* visual label */ }}>
              {monthName} {year}
            </button>
            <button className="btn-accent" onClick={handleDownload}>
              Download
            </button>
            <button
              className="btn-accent"
              style={{ background: "var(--success)" }}
              onClick={() => setShowEmailModal(true)}
            >
              Send Email
            </button>
          </div>
        </div>

        {/* Summary KPI cards */}
        <div className="summary-cards">
          <div className="card-kpi">
            <div className="kpi-label">Total {monthName} Transactions</div>
            <div className="kpi-value">
              {loading ? "—" : monthlyTotalTransactions}
            </div>
          </div>
          <div className="card-kpi kpi-debit">
            <div className="kpi-label">Total Debit</div>
            <div className="kpi-value">
              {loading ? "—" : format(monthlyTotalDebit)}
            </div>
          </div>
          <div className="card-kpi kpi-credit">
            <div className="kpi-label">Total Credit</div>
            <div className="kpi-value">
              {loading ? "—" : format(monthlyTotalCredit)}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="d-flex justify-content-center my-4">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-center text-danger fw-semibold">{error}</p>
      ) : (
        <div className="transaction-list">
          {transactions.map((day) => (
            <div key={day.date} className="card shadow-sm mb-4 transaction-card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0 fw-bold">{day.date}</h5>
                  <span className="badge badge-soft rounded-pill">
                    {day.total_transactions} Transactions
                  </span>
                </div>

                {/* Delete this date button */}
                <button
                  className="btn btn-danger-soft"
                  onClick={() => askDeleteDate(day.date)}
                  title="Delete all transactions for this date"
                >
                  Delete Date
                </button>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Subcategory</th>
                        {/* NEW: Quantity column (before Purpose) */}
                        <th>Qty</th>
                        <th>Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(day.transactions || []).map((t, i) => (
                        <tr key={`${day.date}-${i}`}>
                          <td>{i + 1}</td>
                          <td className={t.type === "debit" ? "text-danger" : "text-success"}>
                            {format(t.amount)}
                          </td>
                          <td>{t.type}</td>
                          <td>{t.category}</td>
                          <td>{t.subcategory || "-"}</td>
                          {/* Show quantity (fallback 0) */}
                          <td>{t.quantity ?? 0}</td>
                          <td>{t.purpose || "-"}</td>
                        </tr>
                      ))}
                      <tr className="row-total fw-bold">
                        {/* updated colSpan because of the new Qty column */}
                        <td colSpan={7} className="py-2">
                          <span className="me-4 text-danger">Debit: {format(day.total_debit)}</span>
                          <span className="text-success">Credit: {format(day.total_credit)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Monthly Summary (text line) */}
          <div className="mt-2 text-center" style={{ color: "var(--ink-700)" }}>
            <strong>{monthName} {year}</strong> — Total Transactions: <strong>{monthlyTotalTransactions}</strong> •
            &nbsp; Debit: <strong className="text-danger">{format(monthlyTotalDebit)}</strong> •
            &nbsp; Credit: <strong className="text-success">{format(monthlyTotalCredit)}</strong>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Send report via email">
          <div className="modal-content">
            <h5 className="fw-bold mb-2">Send {downloadFormat.toUpperCase()} Report</h5>
            <p className="mb-3" style={{ color: "var(--ink-600)" }}>
              {monthName} {year}
            </p>
            <input
              type="email"
              className="form-control mb-3"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-outline-secondary" onClick={() => setShowEmailModal(false)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleSendEmail} disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </button>
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
              <strong>{deleteDateLabel}</strong>
              <br />
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-between align-items-center">
              <button
                className="btn btn-outline-secondary"
                onClick={() => { setShowDeleteModal(false); setDeleteMsg(""); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDeleteDate}
                disabled={deleting || !deleteISODate}
                title={deleteISODate ? "Confirm delete" : "Invalid date"}
              >
                {deleting ? "Deleting..." : "OK, Delete"}
              </button>
            </div>
            {deleteMsg && (
              <p
                className="mt-2 text-center"
                style={{
                  color: deleteMsg.toLowerCase().includes("fail") ? "var(--danger)" : "var(--success)"
                }}
              >
                {deleteMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="footer-note">
        Developed by <strong>Ajay Kedar</strong> — This page shows all month totals
      </div>
    </div>
  );
}
