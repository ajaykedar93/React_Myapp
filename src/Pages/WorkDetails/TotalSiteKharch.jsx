// src/pages/TotalSiteKharch.jsx
import React, { useEffect, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/sitekharch";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// make YYYY-MM from year + monthIndex (0..11)
function ym(year, monthIndex) {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export default function TotalSiteKharch() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // array of 12 items: [{monthStr,label,totalKharch,totalReceived,balance,hasData,khCount,recCount}]
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadYearData = async (y) => {
    setLoading(true);
    setError("");
    try {
      const promises = [];
      for (let i = 0; i < 12; i++) {
        const monthStr = ym(y, i);
        const khP = fetch(`${BASE_URL}/kharch?month=${monthStr}`).then((r) => r.json());
        const recP = fetch(`${BASE_URL}/received?month=${monthStr}`).then((r) => r.json());
        promises.push(Promise.all([khP, recP]));
      }

      const all = await Promise.all(promises);

      const final = all.map(([khJson, recJson], index) => {
        const monthStr = ym(y, index);

        let totalKharch = 0;
        if (khJson.ok && Array.isArray(khJson.data)) {
          totalKharch = khJson.data.reduce((sum, r) => {
            let t = 0;
            t += Number(r.amount || 0);
            t += Number(r.extra_amount || 0);

            let extras = [];
            if (typeof r.extra_items === "string") {
              try { extras = JSON.parse(r.extra_items); } catch { extras = []; }
            } else if (Array.isArray(r.extra_items)) {
              extras = r.extra_items;
            }
            for (const x of extras) t += Number(x.amount || 0);
            return sum + t;
          }, 0);
        }

        let totalReceived = 0;
        let recData = [];
        if (recJson.ok && Array.isArray(recJson.data)) {
          recData = recJson.data;
          totalReceived = recJson.data.reduce(
            (sum, r) => sum + Number(r.amount_received || 0),
            0
          );
        }

        const balance = totalReceived - totalKharch;
        const hasData =
          (khJson.ok && khJson.data && khJson.data.length > 0) ||
          (recJson.ok && recJson.data && recJson.data.length > 0);

        return {
          monthStr,
          label: `${MONTH_NAMES[index]} ${y}`,
          totalKharch,
          totalReceived,
          balance,
          hasData,
          recCount: recData.length,
          khCount: khJson.ok && Array.isArray(khJson.data) ? khJson.data.length : 0,
        };
      });

      setRows(final);
    } catch (err) {
      console.error(err);
      setError("Failed to load year data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYearData(year);
  }, [year]);

  const rowsWithData = rows.filter((m) => m.hasData);

  return (
    <>
      <style>{`
        :root{
          --ink-950:#0B1220;
          --ink-900:#0f172a;
          --ink-700:#334155;
          --ink-600:#475569;

          /* Aurora blues/purples/orange */
          --a1:#0ea5e9; /* cyan-blue */
          --a2:#6366f1; /* indigo */
          --a3:#22d3ee; /* cyan */
          --a4:#f97316; /* orange accent */

          --surface:#ffffff;
          --glass: rgba(255,255,255,0.14);
          --glass-stroke: rgba(255,255,255,0.28);
          --card-stroke: rgba(148,163,184,0.22);

          --good:#16a34a;
          --bad:#dc2626;

          --ring: 0 10px 30px rgba(34, 211, 238, .25);
          --ring-warm: 0 10px 30px rgba(249, 115, 22, .25);
        }

        /* Page background with animated aurora */
        .page-wrap{
          min-height:100vh;
          padding: 16px 10px 64px;
          position:relative;
          overflow:hidden;
          background:
            radial-gradient(1200px 600px at 20% 10%, rgba(34,211,238,0.18), transparent 60%),
            radial-gradient(900px 600px at 80% -5%, rgba(99,102,241,0.18), transparent 55%),
            linear-gradient(180deg, #0b1220 0%, #111827 35%, #0b1220 100%);
          animation: bgMove 26s linear infinite alternate;
        }
        @keyframes bgMove{
          0%{ background-position: 0 0, 0 0, 0 0; }
          100%{ background-position: 10px -14px, -8px 10px, 0 0; }
        }

        .container-limit{ max-width:1150px; margin:0 auto; }

        /* Header - glass card */
        .header-card{
          backdrop-filter: blur(10px);
          background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.06));
          border: 1px solid var(--glass-stroke);
          border-radius: 16px;
          color: #fff;
          box-shadow: var(--ring);
        }
        .hdr-top{
          text-transform:uppercase; letter-spacing:.14em; font-size:.68rem; opacity:.9;
        }
        .hdr-title{
          font-weight:900; margin:4px 0 6px; font-size: clamp(1.05rem, 4vw, 1.35rem);
        }
        .hdr-sub{
          opacity:.9; font-size:.85rem;
        }

        .year-input{
          max-width:130px; border-radius:12px; border:1px solid rgba(255,255,255,.35);
          background: rgba(255,255,255,.1); color:#fff; padding:.55rem .75rem;
          outline:none;
        }
        .year-input::placeholder{ color:rgba(255,255,255,.7); }
        .btn-ghost{
          border:1px solid rgba(255,255,255,.35);
          color:#fff; border-radius:12px; padding:.55rem .8rem; font-weight:800;
          background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.08));
        }
        .btn-ghost:hover{ box-shadow: var(--ring-warm); border-color: rgba(249,115,22,.5); }

        /* Grid */
        .months-grid{
          display:grid; grid-template-columns:1fr; gap: 14px;
        }
        @media (min-width: 768px){ .months-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1100px){ .months-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); } }

        /* Month card with glowing edge */
        .month-card{
          position:relative;
          background: var(--surface);
          border-radius: 16px;
          border: 1px solid var(--card-stroke);
          box-shadow: 0 10px 28px rgba(15,23,42,.08);
          padding: 14px 14px 10px;
          display:flex; flex-direction:column; gap:.6rem; min-height:152px;
          isolation:isolate;
        }
        .month-card::before{
          content:""; position:absolute; inset: -1px; z-index:-1; border-radius:18px;
          background: linear-gradient(135deg, rgba(99,102,241,.25), rgba(14,165,233,.25), rgba(249,115,22,.25));
          filter: blur(16px); opacity:.0; transition: .2s ease;
        }
        .month-card:hover::before{ opacity:.8; }

        .month-title{
          font-weight:800; font-size:.95rem; color:var(--ink-900);
          display:flex; justify-content:space-between; align-items:center;
        }
        .pill-month{
          background: linear-gradient(135deg, rgba(99,102,241,.12), rgba(14,165,233,.12));
          color:#1e293b; padding:.2rem .6rem; border-radius:999px; font-size:.68rem; font-weight:800;
          border: 1px solid rgba(148,163,184,.35);
        }

        .metric-line{
          display:flex; justify-content:space-between; align-items:center; font-size:.88rem;
        }
        .metric-label{ color:#64748b; }
        .metric-value{ font-weight:900; letter-spacing:.2px; color:#0f172a; }
        .metric-value.positive{ color: var(--good); }
        .metric-value.negative{ color: var(--bad); }

        .small-footer{
          font-size:.7rem; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;
          margin-top:.2rem; margin-bottom:.2rem;
        }
        .balance-pill{
          font-size:.68rem; padding:.18rem .55rem; border-radius:999px; font-weight:800;
          border:1px solid rgba(148,163,184,.35);
        }
        .ok-chip{
          background: linear-gradient(135deg, rgba(22,163,74,.12), rgba(34,197,94,.12));
          color:#065f46;
        }
        .need-chip{
          background: linear-gradient(135deg, rgba(220,38,38,.12), rgba(239,68,68,.12));
          color:#7f1d1d;
        }

        /* Skeletons */
        .loading-block{
          background: linear-gradient(90deg, #eef2f7 25%, #f6f9fb 50%, #eef2f7 75%);
          height: 12px; border-radius: 999px; background-size:200% 100%;
          animation: shimmer 1.1s infinite;
        }
        @keyframes shimmer{
          0%{ background-position:200% 0; } 100%{ background-position:-200% 0; }
        }

        .empty-year{
          background: rgba(255,255,255,.9);
          border: 1px dashed rgba(148,163,184,.7);
          color:#334155;
          border-radius: 14px; padding: 16px; text-align:center; font-weight:800;
        }

        /* Tiny polish */
        .btn, .year-input{ transition: box-shadow .18s ease, transform .12s ease; }
        .btn:hover{ transform: translateY(-1px); }
      `}</style>

      <div className="page-wrap">
        <div className="container-limit">
          {/* HEADER */}
          <div className="header-card p-3 p-sm-4 mb-4 d-flex flex-column gap-3 gap-sm-0 flex-sm-row justify-content-between align-items-sm-center">
            <div>
              <p className="hdr-top mb-1">Site Kharch — Yearly View</p>
              <h5 className="hdr-title mb-1">Month-wise totals for {year}</h5>
              <p className="hdr-sub mb-0">
                Each card shows <strong>Total Kharch</strong>, <strong>Total Received</strong> and <strong>Balance</strong>.
                <span className="ms-1 d-none d-sm-inline">Only months with data are listed.</span>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <input
                type="number"
                className="year-input"
                value={year}
                onChange={(e) => {
                  const val = e.target.value;
                  const y = val ? Number(val) : currentYear;
                  setYear(y);
                }}
                min="2000"
                max="2100"
                placeholder="Year"
              />
              <button className="btn-ghost" type="button" onClick={() => loadYearData(year)}>
                Reload
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error ? <div className="alert alert-danger py-2">{error}</div> : null}

          {/* MONTHS GRID */}
          <div className="months-grid">
            {loading && rows.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="month-card">
                  <div className="loading-block" style={{ width: "60%" }} />
                  <div className="loading-block" style={{ width: "40%" }} />
                  <div className="loading-block" style={{ width: "75%" }} />
                  <div className="loading-block" style={{ width: "50%" }} />
                </div>
              ))
            ) : rows.filter(r => r.hasData).length === 0 ? (
              <div className="empty-year">No months with data for {year}.</div>
            ) : (
              rows
                .filter(m => m.hasData)
                .map((mRow, idx, arr) => (
                  <div key={mRow.monthStr} className="month-card">
                    <div className="month-title">
                      <span>{mRow.label}</span>
                      <span className="pill-month">{idx + 1} / {arr.length}</span>
                    </div>

                    <div className="metric-line">
                      <span className="metric-label">Total Kharch</span>
                      <span className="metric-value">₹{mRow.totalKharch.toFixed(2)}</span>
                    </div>
                    <div className="metric-line">
                      <span className="metric-label">Total Received</span>
                      <span className="metric-value">₹{mRow.totalReceived.toFixed(2)}</span>
                    </div>
                    <div className="metric-line">
                      <span className="metric-label">Balance</span>
                      <span className={`metric-value ${mRow.balance >= 0 ? "positive" : "negative"}`}>
                        ₹{mRow.balance.toFixed(2)}
                      </span>
                    </div>

                    <div className="small-footer">
                      <span>Kharch: {mRow.khCount} • Rec: {mRow.recCount}</span>
                      <span className={`balance-pill ${mRow.balance >= 0 ? "ok-chip" : "need-chip"}`}>
                        {mRow.balance >= 0 ? "OK" : `Need ₹${Math.abs(mRow.balance).toFixed(0)}`}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div style={{ height: 56 }} />
        </div>
      </div>
    </>
  );
}
