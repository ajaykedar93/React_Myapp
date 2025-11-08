import React, { useEffect, useMemo, useState } from "react";

const TOTALS_API = "https://express-backend-myapp.onrender.com/api/monthly-summary/total";
const LIST_API   = "https://express-backend-myapp.onrender.com/api/monthly-summary";

// Utilities
const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const rupee = new Intl.NumberFormat("en-IN",{ style:"currency", currency:"INR" });

const getNowParts = () => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
};
const clampYear = (y) => {
  const n = parseInt(y, 10);
  if (!Number.isFinite(n)) return getNowParts().y;
  if (n < 2000) return 2000;
  if (n > 9999) return 9999;
  return n;
};

export default function CalculateTotal(){
  const now = useMemo(() => getNowParts(), []);
  const [year, setYear] = useState(now.y);
  const [month, setMonth] = useState(now.m);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [totals, setTotals]   = useState(null); // {credit,debit,month,year}
  const [txCount, setTxCount] = useState(null);

  // Mobile month modal
  const [monthModalOpen, setMonthModalOpen] = useState(false);

  const monthLabel = monthNames[month - 1] || "";

  const balance = (() => {
    const c = Number(totals?.credit || 0);
    const d = Number(totals?.debit || 0);
    return c - d; // Credit - Debit
  })();

  async function loadData(e){
    e?.preventDefault?.();
    setError("");
    setTotals(null);
    setTxCount(null);
    setLoading(true);

    try{
      const totalsUrl = `${TOTALS_API}?month=${month}&year=${year}`;
      const listUrl   = `${LIST_API}?month=${month}&year=${year}`;
      const [totalsRes, listRes] = await Promise.all([fetch(totalsUrl), fetch(listUrl)]);

      if (!totalsRes.ok){
        const txt = await totalsRes.text();
        throw new Error(txt || `Totals request failed (${totalsRes.status})`);
      }
      const totalsData = await totalsRes.json();
      setTotals(totalsData);

      if (!listRes.ok){
        if (listRes.status === 404){
          setTxCount(0);
        } else {
          const txt = await listRes.text();
          throw new Error(txt || `List request failed (${listRes.status})`);
        }
      } else {
        const groups = await listRes.json();
        const count = Array.isArray(groups)
          ? groups.reduce((sum, g) => sum + (Array.isArray(g.transactions) ? g.transactions.length : 0), 0)
          : 0;
        setTxCount(count);
      }
    }catch(err){
      try{
        const parsed = JSON.parse(err.message);
        setError(parsed?.message || "Unable to load data.");
      }catch{
        const msg = String(err?.message || "");
        if (msg.includes("No transactions")) setTxCount(0);
        setError(msg || "Unable to load data.");
      }
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ loadData(); },[]);

  const canSubmit = month >= 1 && month <= 12 && String(year).length >= 4;

  return (
    <>
      <style>{`
        :root{
          /* Blue family */
          --ink-950:#0B1220;
          --ink-900:#0f172a;
          --ink-700:#334155;
          --ink-600:#475569;
          --ink-500:#64748b;

          --blue-50:#f0f6ff;
          --blue-100:#e4efff;
          --blue-200:#cfe2ff;
          --blue-300:#b7d2ff;
          --blue-400:#89b6ff;
          --blue-500:#4f8dff;
          --blue-600:#2f6fe8;
          --blue-700:#2358c2;

          --border:#e6e9ef;
          --surface:#ffffff;
          --bg:#f7f9fe;

          --brand-grad: linear-gradient(135deg, #1c3b7a 0%, #3a66c1 55%, #64a7ff 100%);
          --accent:#2f6fe8;

          --debit:#b33a3a;
          --credit:#217a3a;
          --neutral:#374151;
        }

        .wrap{
          min-height:100vh;
          background:var(--bg);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:16px;
        }

        .card-pro{
          width:100%;
          max-width:1000px;
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:20px;
          /* IMPORTANT: avoid clipping native dropdowns on mobile */
          overflow:visible;
          box-shadow:0 10px 30px rgba(11,18,32,0.08);
        }

        .card-pro__head{
          background:var(--brand-grad);
          color:#fff;
          padding:18px 16px;
        }
        .card-pro__title{
          margin:0;
          font-weight:900;
          letter-spacing:.2px;
          font-size:clamp(18px, 2.2vw, 22px);
        }
        .card-pro__sub{
          margin:6px 0 0 0;
          opacity:.95;
          font-size:13px;
        }

        .card-pro__body{ padding:16px; }
        @media (min-width:576px){ .card-pro__body{ padding:22px; } }
        @media (min-width:992px){ .card-pro__body{ padding:26px; } }

        /* Form */
        .form-grid{
          display:grid; gap:12px; grid-template-columns:1fr; align-items:end;
        }
        @media (min-width:576px){ .form-grid{ grid-template-columns:1fr 1fr auto; } }

        .form-label{ font-size:12.5px; color:var(--ink-600); margin-bottom:6px; }
        .form-select, .form-control{
          border-radius:12px; border:1px solid var(--border); padding:10px 12px;
          background: linear-gradient(#fff, #fff) padding-box,
                      linear-gradient(135deg, var(--blue-200), transparent) border-box;
        }
        .btn-brand{
          background:linear-gradient(135deg, var(--blue-700), var(--blue-500));
          color:#fff; border:none; border-radius:12px; padding:10px 14px; font-weight:800;
          box-shadow:0 8px 16px rgba(47,111,232,.22);
        }
        .btn-brand:disabled{ opacity:.6; }

        /* Desktop vs mobile month control */
        .desktop-month { display:none; }
        .mobile-month  { display:flex; gap:8px; align-items:end; }
        @media (min-width:576px){
          .desktop-month { display:block; }
          .mobile-month  { display:none; }
        }

        .btn-outline{
          background:#fff; color:var(--ink-900); border:1px solid var(--border);
          border-radius:12px; padding:10px 12px; font-weight:800;
        }

        /* Summary grid */
        .summary{ margin-top:18px; display:grid; gap:12px; grid-template-columns:1fr; }
        @media (min-width:576px){ .summary{ grid-template-columns:1fr 1fr 1fr; } }

        .metric{
          border:1px solid var(--border); border-radius:14px; padding:14px 16px; background:#fff;
          box-shadow:0 6px 18px rgba(11,18,32,0.04);
        }
        .metric__label{
          font-size:12.5px; margin:0 0 6px 0; display:flex; align-items:center; gap:8px;
          color:var(--blue-700); font-weight:800; letter-spacing:.2px;
        }
        .metric__value{
          font-size:clamp(18px, 3.2vw, 28px); font-weight:900; color:var(--ink-950); letter-spacing:.3px;
        }
        .metric--debit .metric__value{ color:var(--debit); }
        .metric--credit .metric__value{ color:var(--credit); }

        /* Balance strip */
        .balance-strip{
          margin-top:14px; border:1px solid var(--border); border-radius:14px; overflow:hidden;
          background:linear-gradient(180deg, var(--blue-50), #fff);
        }
        .balance-head{
          display:flex; align-items:center; gap:10px; justify-content:space-between; flex-wrap:wrap;
          padding:12px 14px; background:linear-gradient(135deg, var(--blue-100), var(--blue-50));
          border-bottom:1px solid var(--border);
        }
        .balance-title{
          margin:0; font-size:clamp(14px,2vw,16px); font-weight:900; color:var(--blue-700);
        }
        .balance-body{ padding:14px 16px; display:grid; gap:12px; grid-template-columns:1fr; }
        @media (min-width:576px){ .balance-body{ grid-template-columns:repeat(3,1fr); } }

        .tile{
          background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px 14px;
        }
        .tile small{ color:var(--ink-600); font-weight:700; display:block; margin-bottom:6px; }
        .tile strong{
          display:block; font-size:clamp(18px,3.1vw,26px); font-weight:900;
        }
        .tag{
          padding:4px 10px; border-radius:999px; border:1px solid var(--border);
          background:#fff; color:var(--ink-700); font-size:12px; font-weight:800;
        }

        .net-pos { color:var(--credit); }
        .net-neg { color:var(--debit); }
        .net-zero{ color:var(--neutral); }

        .alert-soft{
          border-radius:12px; padding:12px 14px; font-size:14px; margin-top:12px;
          background:#fef1f1; color:#9e2d2d; border:1px solid #f7d1d1;
        }

        .skeleton{
          height:18px; width:100%; background:linear-gradient(90deg, #eef2f7 25%, #f6f9fb 50%, #eef2f7 75%);
          background-size:200% 100%; animation:sh 1.1s infinite; border-radius:8px;
        }
        @keyframes sh{ 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

        /* footer note */
        .note{ margin-top:16px; font-size:12.5px; color:var(--ink-500); text-align:center; }

        /* Mobile month modal */
        .mmodal-wrap{
          position:fixed; inset:0; background:rgba(0,0,0,.45);
          display:flex; align-items:center; justify-content:center; padding:14px; z-index:9999;
        }
        .mmodal-card{
          width:min(560px, 92vw);
          background:#fff; border-radius:16px; border:1px solid var(--border);
          box-shadow:0 18px 48px rgba(0,0,0,.18); overflow:hidden;
        }
        .mmodal-head{
          padding:12px 14px; border-bottom:1px solid var(--border);
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .mmodal-title{ margin:0; font-weight:900; color:var(--ink-900); }
        .mmodal-body{ padding:10px; }
        .month-list{
          max-height:60vh; overflow-y:auto; padding:0; margin:0; list-style:none;
          -webkit-overflow-scrolling: touch;
        }
        .month-item{
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 12px; border-radius:12px; border:1px solid var(--border);
          background:#fff; margin:8px 6px;
        }
        .month-item strong{ font-weight:900; color:var(--ink-900); }
        .month-item button{
          border:none; background:linear-gradient(135deg, var(--blue-700), var(--blue-500));
          color:#fff; font-weight:800; padding:8px 12px; border-radius:10px;
        }
      `}</style>

      <div className="wrap">
        <div className="card-pro">
          <div className="card-pro__head">
            <h1 className="card-pro__title">Monthly Summary</h1>
            <p className="card-pro__sub">Select a month to view totals and your net balance.</p>
          </div>

          <div className="card-pro__body">
            <form onSubmit={loadData} className="mb-2">
              <div className="form-grid">
                {/* Desktop/Tablet native select */}
                <div className="desktop-month">
                  <label htmlFor="monthSel" className="form-label">Month</label>
                  <select
                    id="monthSel"
                    className="form-select"
                    value={month}
                    onChange={(e)=> setMonth(parseInt(e.target.value,10))}
                  >
                    {monthNames.map((n, i) => <option key={n} value={i+1}>{n}</option>)}
                  </select>
                </div>

                {/* Mobile month button → modal with scroll */}
                <div className="mobile-month">
                  <div style={{flex:1}}>
                    <label className="form-label">Month</label>
                    <button
                      type="button"
                      className="btn-outline w-100"
                      onClick={() => setMonthModalOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={monthModalOpen}
                    >
                      {monthLabel}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="yearInp" className="form-label">Year</label>
                  <input
                    id="yearInp"
                    type="number"
                    className="form-control"
                    value={year}
                    onChange={(e)=> setYear(clampYear(e.target.value))}
                  />
                </div>

                <div>
                  <button className="btn-brand w-100" disabled={!canSubmit || loading}>
                    {loading ? "Loading..." : "Show Summary"}
                  </button>
                </div>
              </div>
            </form>

            {error && <div className="alert-soft">{error}</div>}

            {!error && (
              <>
                {/* Top 3 metrics */}
                <div className="summary">
                  <div className="metric">
                    <p className="metric__label"><span aria-hidden>🗂️</span> Total {monthLabel} Transactions</p>
                    <div className="metric__value">
                      {loading ? <span className="skeleton" style={{height:22, width:"60%"}} /> : (txCount ?? "--")}
                    </div>
                  </div>

                  <div className="metric metric--debit">
                    <p className="metric__label"><span aria-hidden>📉</span> Total Debit</p>
                    <div className="metric__value">
                      {loading ? <span className="skeleton" style={{height:22, width:"70%"}} /> :
                        totals ? rupee.format(Number(totals.debit || 0)) : "--"}
                    </div>
                  </div>

                  <div className="metric metric--credit">
                    <p className="metric__label"><span aria-hidden>📈</span> Total Credit</p>
                    <div className="metric__value">
                      {loading ? <span className="skeleton" style={{height:22, width:"70%"}} /> :
                        totals ? rupee.format(Number(totals.credit || 0)) : "--"}
                    </div>
                  </div>
                </div>

                {/* Balance strip */}
                <div className="balance-strip">
                  <div className="balance-head">
                    <h3 className="balance-title">
                      {monthLabel} {year} — Balance (Credit − Debit)
                    </h3>
                    {!loading && totals && (
                      <span className="tag">
                        Period: {monthLabel} {year}
                      </span>
                    )}
                  </div>

                  <div className="balance-body">
                    <div className="tile">
                      <small>Total Credit</small>
                      <strong className="net-pos">
                        {loading ? <span className="skeleton" style={{height:22, width:"70%"}} /> :
                          totals ? rupee.format(Number(totals.credit || 0)) : "--"}
                      </strong>
                    </div>

                    <div className="tile">
                      <small>Total Debit</small>
                      <strong className="net-neg">
                        {loading ? <span className="skeleton" style={{height:22, width:"70%"}} /> :
                          totals ? rupee.format(Number(totals.debit || 0)) : "--"}
                      </strong>
                    </div>

                    <div className="tile">
                      <small>Month Balance</small>
                      <strong className={
                        loading ? "" : balance > 0 ? "net-pos" : balance < 0 ? "net-neg" : "net-zero"
                      }>
                        {loading
                          ? <span className="skeleton" style={{height:22, width:"70%"}} />
                          : totals ? rupee.format(balance) : "--"}
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="note">
              Built by <strong><code>Ajay Kedar</code></strong> — Showing totals & net balance for the selected month.
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Month Modal */}
      {monthModalOpen && (
        <div className="mmodal-wrap" role="dialog" aria-modal="true" aria-label="Select month">
          <div className="mmodal-card">
            <div className="mmodal-head">
              <h4 className="mmodal-title">Select Month</h4>
              <button className="btn-outline" onClick={() => setMonthModalOpen(false)}>Close</button>
            </div>
            <div className="mmodal-body">
              <ul className="month-list">
                {monthNames.map((n, i) => (
                  <li key={n} className="month-item">
                    <strong>{n}</strong>
                    <button
                      type="button"
                      onClick={() => { setMonth(i+1); setMonthModalOpen(false); }}
                    >
                      Choose
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
