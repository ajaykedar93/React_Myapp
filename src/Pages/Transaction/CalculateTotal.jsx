import React, { useEffect, useMemo, useState } from "react";

const TOTALS_API = "https://express-myapp.onrender.com/api/monthly-summary/total";
const LIST_API = "https://express-myapp.onrender.com/api/monthly-summary";

// Utilities
const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const pad = (n) => String(n).padStart(2, "0");
const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function getNowParts() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function clampYear(y) {
  const n = parseInt(y, 10);
  if (!Number.isFinite(n)) return getNowParts().y;
  // adjust if you want a wider allowed range
  if (n < 2000) return 2000;
  if (n > 9999) return 9999;
  return n;
}

export default function CalculateTotal() {
  const now = useMemo(() => getNowParts(), []);
  const [year, setYear] = useState(now.y);
  const [month, setMonth] = useState(now.m);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState(null); // {credit,debit,month,year}
  const [txCount, setTxCount] = useState(null);

  // Month label (always “same month name” everywhere)
  const monthLabel = monthNames[month - 1] || "";

  async function loadData(e) {
    e?.preventDefault?.();
    setError("");
    setTotals(null);
    setTxCount(null);
    setLoading(true);

    try {
      // Get totals (credit/debit) + list (for counting transactions)
      const totalsUrl = `${TOTALS_API}?month=${month}&year=${year}`;
      const listUrl = `${LIST_API}?month=${month}&year=${year}`;

      const [totalsRes, listRes] = await Promise.all([fetch(totalsUrl), fetch(listUrl)]);

      // Handle totals response
      if (!totalsRes.ok) {
        const txt = await totalsRes.text();
        throw new Error(txt || `Totals request failed (${totalsRes.status})`);
      }
      const totalsData = await totalsRes.json();
      setTotals(totalsData);

      // Handle list response (transaction groups)
      if (!listRes.ok) {
        // If list 404s (no transactions), mirror that as 0 count
        if (listRes.status === 404) {
          setTxCount(0);
        } else {
          const txt = await listRes.text();
          throw new Error(txt || `List request failed (${listRes.status})`);
        }
      } else {
        const groups = await listRes.json();
        // groups = [{date, transactions:[...]}]
        const count = Array.isArray(groups)
          ? groups.reduce((sum, g) => sum + (Array.isArray(g.transactions) ? g.transactions.length : 0), 0)
          : 0;
        setTxCount(count);
      }
    } catch (err) {
      // Try parse server JSON message
      try {
        const parsed = JSON.parse(err.message);
        setError(parsed?.message || "Unable to load data.");
      } catch {
        const msg = String(err?.message || "");
        if (msg.includes("No transactions")) setTxCount(0);
        setError(msg || "Unable to load data.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-load for the default current month/year
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = month >= 1 && month <= 12 && String(year).length >= 4;

  return (
    <>
      {/* Minimal, professional theme (no default Bootstrap blue) */}
      <style>{`
        :root{
          --ink-900:#0f172a;
          --ink-600:#475569;
          --ink-500:#64748b;
          --border:#e6e9ef;
          --surface:#ffffff;
          --bg:#f7f9fc;

          /* brand: elegant slate + teal accents (not bootstrap blue) */
          --brand-grad: linear-gradient(135deg,#0f3d4a 0%, #495c8e 100%);
          --accent:#1f938a;
          --debit:#b33a3a;
          --credit:#217a3a;
        }
        .wrap{
          min-height:100dvh; background:var(--bg);
          display:flex; align-items:center; justify-content:center; padding:20px;
        }
        .card-pro{
          width:100%; max-width:980px; background:var(--surface);
          border:1px solid var(--border); border-radius:20px; overflow:hidden;
          box-shadow:0 8px 30px rgba(15,23,42,.06);
        }
        .card-pro__head{
          background:var(--brand-grad); color:#fff; padding:18px 16px;
        }
        .card-pro__title{
          margin:0; font-weight:800; letter-spacing:.2px;
          font-size:clamp(18px,2.2vw,22px);
        }
        .card-pro__sub{
          margin:6px 0 0 0; opacity:.9; font-size:13px;
        }
        .card-pro__body{ padding:16px; }
        @media (min-width:576px){ .card-pro__body{ padding:22px; } }
        @media (min-width:992px){ .card-pro__body{ padding:26px; } }

        .form-grid{
          display:grid; gap:12px; grid-template-columns: 1fr; align-items:end;
        }
        @media (min-width:576px){
          .form-grid{ grid-template-columns: 1fr 1fr auto; }
        }
        .form-label{ font-size:12.5px; color:var(--ink-600); margin-bottom:6px; }
        .form-select, .form-control{
          border-radius:12px; border:1px solid var(--border); padding:10px 12px;
        }

        .btn-brand{
          background:var(--accent); color:#fff; border:none; border-radius:12px;
          padding:10px 14px; font-weight:700;
        }
        .btn-brand:disabled{ opacity:.6; }

        .summary{
          margin-top:18px;
          display:grid; gap:12px; grid-template-columns: 1fr;
        }
        @media (min-width:576px){
          .summary{ grid-template-columns: 1fr 1fr 1fr; }
        }
        .metric{
          border:1px solid var(--border); border-radius:14px;
          padding:16px; background:#fff;
        }
        .metric__label{
          font-size:12.5px; color:var(--ink-500); margin:0 0 6px 0;
          display:flex; align-items:center; gap:8px;
        }
        .metric__value{
          font-size:clamp(18px,3.2vw,28px); font-weight:800; color:var(--ink-900);
          letter-spacing:.3px;
        }
        .metric--debit .metric__value{ color:var(--debit); }
        .metric--credit .metric__value{ color:var(--credit); }

        .alert-soft{
          border-radius:12px; padding:12px 14px; font-size:14px; margin-top:12px;
          background:#fef1f1; color:#9e2d2d; border:1px solid #f7d1d1;
        }

        .skeleton{
          height:18px; width:100%;
          background:linear-gradient(90deg,#eef2f7 25%,#f6f9fb 50%,#eef2f7 75%);
          background-size:200% 100%;
          animation:sh 1.1s infinite; border-radius:8px;
        }
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <div className="wrap">
        <div className="card-pro">
          <div className="card-pro__head">
            <h1 className="card-pro__title">Monthly Summary</h1>
            <p className="card-pro__sub">Select any month and get totals full month.</p>
          </div>

          <div className="card-pro__body">
            {/* Controls */}
            <form onSubmit={loadData} className="mb-2">
              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="monthSel">Month</label>
                  <select
                    id="monthSel"
                    className="form-select"
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  >
                    {monthNames.map((n, idx) => (
                      <option key={n} value={idx + 1}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="yearInp">Year</label>
                  <input
                    id="yearInp"
                    type="number"
                    className="form-control"
                    value={year}
                    onChange={(e) => setYear(clampYear(e.target.value))}
                  />
                </div>

                <div>
                  <button className="btn-brand w-100" disabled={!canSubmit || loading}>
                    {loading ? "Loading..." : "Show Summary"}
                  </button>
                </div>
              </div>
            </form>

            {/* Errors */}
            {error && <div className="alert-soft">{error}</div>}

            {/* Summary */}
            {!error && (
              <div className="summary">
                {/* Total (Month) Transactions */}
                <div className="metric">
                  <p className="metric__label">
                    <span aria-hidden>🗂️</span> Total {monthLabel} Transactions
                  </p>
                  <div className="metric__value">
                    {loading
                      ? <span className="skeleton" style={{ height: 22, width: "60%" }} />
                      : (txCount ?? "--")}
                  </div>
                </div>

                {/* Total Debit */}
                <div className="metric metric--debit">
                  <p className="metric__label">
                    <span aria-hidden>📉</span> Total Debit
                  </p>
                  <div className="metric__value">
                    {loading
                      ? <span className="skeleton" style={{ height: 22, width: "70%" }} />
                      : totals ? rupee.format(Number(totals.debit || 0)) : "--"}
                  </div>
                </div>

                {/* Total Credit */}
                <div className="metric metric--credit">
                  <p className="metric__label">
                    <span aria-hidden>📈</span> Total Credit
                  </p>
                  <div className="metric__value">
                    {loading
                      ? <span className="skeleton" style={{ height: 22, width: "70%" }} />
                      : totals ? rupee.format(Number(totals.credit || 0)) : "--"}
                  </div>
                </div>
              </div>
            )}

            {/* Small foot */}
           <div
  className="mt-3"
  style={{ fontSize: 12.5, color: "var(--ink-500)", textAlign: "center" }}
>
  Developed by <strong><code>Ajay Kedar</code></strong> — This page shows all month totals
</div>

          </div>
        </div>
      </div>
    </>
  );
}
