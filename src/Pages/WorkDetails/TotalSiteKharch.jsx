// src/pages/TotalSiteKharch.jsx
import React, { useEffect, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/sitekharch";

const MONTH_NAMES = [
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

// make YYYY-MM from year + monthIndex (0..11)
function ym(year, monthIndex) {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export default function TotalSiteKharch() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // array of 12 items: [{month:'2025-01', totalKharch, totalReceived, balance, hasData}]
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const loadYearData = async (y) => {
    setLoading(true);
    setError("");
    try {
      // 12 promises (kharch + received for each month)
      const promises = [];
      for (let i = 0; i < 12; i++) {
        const monthStr = ym(y, i);
        // kharch
        const khP = fetch(`${BASE_URL}/kharch?month=${monthStr}`).then((r) =>
          r.json()
        );
        // received
        const recP = fetch(`${BASE_URL}/received?month=${monthStr}`).then((r) =>
          r.json()
        );
        promises.push(Promise.all([khP, recP]));
      }

      const all = await Promise.all(promises);

      const final = all.map(([khJson, recJson], index) => {
        const monthStr = ym(y, index);

        let totalKharch = 0;
        if (khJson.ok && Array.isArray(khJson.data)) {
          totalKharch = khJson.data.reduce((sum, r) => {
            // same logic as you used (amount + extra_amount + extra_items)
            let t = 0;
            t += Number(r.amount || 0);
            t += Number(r.extra_amount || 0);

            let extras = [];
            if (typeof r.extra_items === "string") {
              try {
                extras = JSON.parse(r.extra_items);
              } catch {
                extras = [];
              }
            } else if (Array.isArray(r.extra_items)) {
              extras = r.extra_items;
            }
            for (const x of extras) {
              t += Number(x.amount || 0);
            }

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
          khCount: khJson.ok && Array.isArray(khJson.data)
            ? khJson.data.length
            : 0,
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

  return (
    <>
      <style>{`
        .page-wrap {
          min-height: 100vh;
          background: linear-gradient(180deg, #0f172a 0%, #312e81 25%, #1d4ed8 65%, #f97316 100%);
          padding: 1rem .5rem 4rem;
        }
        @media (min-width: 576px) {
          .page-wrap { padding: 1.3rem 1rem 4rem; }
        }
        .header-card {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 1.2rem;
          border: 1px solid rgba(255,255,255,0.08);
          color: #fff;
          box-shadow: 0 18px 35px rgba(0,0,0,0.18);
        }
        .year-input {
          max-width: 130px;
        }
        .months-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .months-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .months-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .month-card {
          background: #fff;
          border-radius: 1rem;
          box-shadow: 0 10px 28px rgba(15,23,42,.08);
          border: 1px solid rgba(148,163,184,.22);
          padding: 1rem 1rem 0.8rem;
          display: flex;
          flex-direction: column;
          gap: .6rem;
          min-height: 150px;
        }
        .month-title {
          font-weight: 600;
          font-size: .9rem;
          color: #0f172a;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pill-month {
          background: rgba(49,46,129,.1);
          color: #312e81;
          padding: .2rem .6rem;
          border-radius: 999px;
          font-size: .65rem;
          font-weight: 500;
        }
        .metric-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: .8rem;
        }
        .metric-label {
          color: #475569;
        }
        .metric-value {
          font-weight: 600;
        }
        .metric-value.positive {
          color: #15803d;
        }
        .metric-value.negative {
          color: #b91c1c;
        }
        .empty-box {
          background: #f8fafc;
          border: 1px dashed rgba(148,163,184,.75);
          border-radius: .7rem;
          padding: .4rem .5rem;
          font-size: .7rem;
          color: #94a3b8;
          text-align: center;
        }
        .small-footer {
          font-size: .67rem;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: .2rem;
          margin-bottom: .2rem;
        }
        .balance-pill {
          font-size: .65rem;
          padding: .15rem .5rem;
          border-radius: 999px;
        }
        .loading-block {
          background: rgba(15,23,42,.12);
          height: 12px;
          border-radius: 999px;
          animation: pulse 1.3s ease-in-out infinite;
        }
        @keyframes pulse {
          0% { opacity: .4; }
          50% { opacity: 1; }
          100% { opacity: .4; }
        }
      `}</style>

      <div className="page-wrap">
        <div className="container-fluid" style={{ maxWidth: "1150px" }}>
          {/* HEADER */}
          <div className="header-card p-3 p-sm-4 mb-4 d-flex flex-column gap-3 gap-sm-0 flex-sm-row justify-content-between align-items-sm-center">
            <div>
              <p
                className="text-uppercase mb-1"
                style={{ letterSpacing: "0.12em", fontSize: "0.65rem" }}
              >
                Site Kharch – Yearly View
              </p>
              <h5 className="mb-1">Month-wise totals for {year}</h5>
              <p className="mb-0 small opacity-75">
                Each block = 1 month. Shows Total Kharch, Total Received and Balance.
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <input
                type="number"
                className="form-control year-input"
                value={year}
                onChange={(e) => setYear(Number(e.target.value || currentYear))}
                min="2000"
                max="2100"
              />
              <button
                className="btn btn-outline-light"
                type="button"
                onClick={() => loadYearData(year)}
              >
                Reload
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error ? (
            <div className="alert alert-danger py-2">{error}</div>
          ) : null}

          {/* MONTHS GRID */}
          <div className="months-grid">
            {loading && rows.length === 0
              ? // skeleton for 12 cards
                Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="month-card">
                    <div className="loading-block" style={{ width: "60%" }}></div>
                    <div className="loading-block" style={{ width: "40%" }}></div>
                    <div className="loading-block" style={{ width: "75%" }}></div>
                    <div className="loading-block" style={{ width: "50%" }}></div>
                  </div>
                ))
              : rows.map((mRow, idx) => (
                  <div key={mRow.monthStr} className="month-card">
                    <div className="month-title">
                      <span>{mRow.label}</span>
                      <span className="pill-month">{idx + 1} / 12</span>
                    </div>

                    <div className="metric-line">
                      <span className="metric-label">Total Kharch</span>
                      <span className="metric-value">
                        ₹{mRow.totalKharch.toFixed(2)}
                      </span>
                    </div>
                    <div className="metric-line">
                      <span className="metric-label">Total Received</span>
                      <span className="metric-value">
                        ₹{mRow.totalReceived.toFixed(2)}
                      </span>
                    </div>
                    <div className="metric-line">
                      <span className="metric-label">Balance</span>
                      <span
                        className={`metric-value ${
                          mRow.balance >= 0 ? "positive" : "negative"
                        }`}
                      >
                        ₹{mRow.balance.toFixed(2)}
                      </span>
                    </div>

                    {!mRow.hasData ? (
                      <div className="empty-box mt-1">
                        No history found for this month
                      </div>
                    ) : (
                      <div className="small-footer">
                        <span>
                          Kharch: {mRow.khCount} • Rec: {mRow.recCount}
                        </span>
                        <span
                          className={`balance-pill ${
                            mRow.balance >= 0
                              ? "bg-success-subtle text-success-emphasis"
                              : "bg-danger-subtle text-danger-emphasis"
                          }`}
                        >
                          {mRow.balance >= 0 ? "OK" : "Need ₹"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
          </div>

          <div style={{ height: "50px" }}></div>
        </div>
      </div>
    </>
  );
}
