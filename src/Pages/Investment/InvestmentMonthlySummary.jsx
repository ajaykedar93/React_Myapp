// InvestmentMonthlySummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const BASE_URL = "https://express-backend-myapp.onrender.com";

const API_CATEGORY = `${BASE_URL}/api/investment_category`;
const API_SUBCATEGORY = `${BASE_URL}/api/investment_subcategory`;
const API_MONTHLY = `${BASE_URL}/api/monthly-summary`;

const ui = {
  bg: "#f6f8ff",
  card: "#ffffff",
  border: "rgba(15,23,42,.10)",
  text: "#0f172a",
  muted: "#64748b",
  soft: "#eef2ff",
  primary: "#2563eb",
  primary2: "#7c3aed",
  teal: "#14b8a6",
  green: "#10b981",
  red: "#ef4444",
};

const money = (n) => {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "0.00";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function isNotFoundError(e) {
  const status = e?.response?.status;
  const msg = String(e?.response?.data?.error || e?.response?.data?.message || "").toLowerCase();
  return status === 404 || msg.includes("not found") || msg.includes("no data");
}

function isNetworkError(e) {
  // axios: network error or CORS -> no response object
  return !e?.response && (e?.code === "ERR_NETWORK" || String(e?.message || "").toLowerCase().includes("network"));
}

export default function InvestmentMonthlySummary() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm] = useState({
    category_id: "",
    subcategory_id: "",
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", msg: "" });

  const showToast = (msg, type = "success") => {
    setToast({ show: true, type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ show: false, type: "success", msg: "" }), 1400);
  };

  const loadMaster = async () => {
    try {
      const [c, s] = await Promise.all([axios.get(API_CATEGORY), axios.get(API_SUBCATEGORY)]);
      setCategories(Array.isArray(c.data) ? c.data : []);
      setSubcategories(Array.isArray(s.data) ? s.data : []);
    } catch (e) {
      if (isNetworkError(e)) showToast("Server not reachable (Network/CORS)", "danger");
      else showToast("Failed to load Category/Subcategory", "danger");
    }
  };

  useEffect(() => {
    loadMaster();
    // eslint-disable-next-line
  }, []);

  const filteredSubs = useMemo(() => {
    if (!form.category_id) return [];
    return subcategories.filter((x) => String(x.category_id) === String(form.category_id));
  }, [subcategories, form.category_id]);

  const fetchSummary = async () => {
    if (!form.category_id || !form.subcategory_id || !form.month) {
      setData(null);
      setNotFound(false);
      return showToast("Select Category, Subcategory, Month", "danger");
    }

    try {
      setLoading(true);
      setNotFound(false);
      setData(null);

      const res = await axios.get(API_MONTHLY, {
        params: {
          category_id: Number(form.category_id),
          subcategory_id: Number(form.subcategory_id),
          month: form.month,
        },
      });

      const payload = res.data || null;
      const hasMonthly = payload?.monthly && Object.keys(payload.monthly).length > 0;
      const hasDaily = Array.isArray(payload?.daily) && payload.daily.length > 0;

      if (!payload || (!hasMonthly && !hasDaily)) {
        setNotFound(true);
        return;
      }

      setData(payload);
      setNotFound(false);
    } catch (e) {
      if (isNotFoundError(e)) {
        setNotFound(true);
      } else if (isNetworkError(e)) {
        setNotFound(false);
        showToast("Server not reachable (Network/CORS)", "danger");
      } else {
        setNotFound(false);
        showToast(e?.response?.data?.error || "Failed to load summary", "danger");
      }
    } finally {
      setLoading(false);
    }
  };

  const m = data?.monthly || {};
  const daily = Array.isArray(data?.daily) ? data.daily : [];

  const net = Number(m.net_pnl ?? 0);

  return (
    <div className="ms-page">
      <style>{`
        .ms-page{
          min-height:100vh;
          background:
            radial-gradient(1000px 520px at 12% 0%, rgba(37,99,235,.10), transparent 55%),
            radial-gradient(900px 520px at 95% 10%, rgba(20,184,166,.10), transparent 55%),
            linear-gradient(180deg, #ffffff, ${ui.bg});
          color:${ui.text};
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          padding: 12px 10px 24px;
        }
        .ms-shell{ max-width: 1240px; margin: 0 auto; }

        .ms-top{
          border:1px solid ${ui.border};
          background: rgba(255,255,255,.90);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          box-shadow: 0 18px 55px rgba(15,23,42,.08);
          overflow:hidden;
        }
        .ms-topHead{
          padding: 12px 14px;
          background:
            radial-gradient(900px 200px at 10% 0%, rgba(124,58,237,.14), transparent 55%),
            radial-gradient(900px 200px at 90% 20%, rgba(37,99,235,.12), transparent 55%),
            linear-gradient(90deg, rgba(37,99,235,.05), rgba(20,184,166,.04));
          border-bottom:1px solid ${ui.border};
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .ms-title{
          margin:0;
          font-weight:1000;
          font-size: clamp(16px, 2.1vw, 22px);
          background: linear-gradient(90deg, ${ui.primary2}, ${ui.primary});
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          letter-spacing:.2px;
        }

        .ms-controls{
          padding: 12px 14px;
          display:grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media(min-width: 900px){
          .ms-controls{
            grid-template-columns: 1.2fr 1.2fr .8fr auto;
            align-items:end;
          }
        }
        .ms-field label{
          display:block;
          font-weight:900;
          font-size:.75rem;
          color:#334155;
          margin-bottom:6px;
        }
        .ms-select, .ms-month{
          width:100%;
          padding: 8px 10px;
          border-radius: 12px;
          border:1px solid ${ui.border};
          background:#fff;
          outline:none;
          font-weight:800;
          color:${ui.text};
          font-size: .9rem;
        }
        .ms-btn{
          border:0;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: .88rem;
          font-weight:1000;
          cursor:pointer;
          color:#fff;
          background: linear-gradient(135deg, ${ui.primary2}, ${ui.primary});
          box-shadow: 0 12px 22px rgba(37,99,235,.18);
          transition: transform .12s ease, opacity .12s ease;
          white-space:nowrap;
        }
        .ms-btn:active{ transform: translateY(1px) scale(.99); }
        .ms-btn:disabled{ opacity:.6; cursor:not-allowed; }

        .ms-iconBtn{
          border:1px solid ${ui.border};
          background:#fff;
          border-radius: 999px;
          padding: 7px 10px;
          font-weight:1000;
          cursor:pointer;
          color:#334155;
        }

        .ms-grid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media(min-width: 1024px){
          .ms-grid{ grid-template-columns: 1.05fr .95fr; }
        }

        .ms-card{
          border:1px solid ${ui.border};
          background: rgba(255,255,255,.92);
          border-radius: 18px;
          box-shadow: 0 16px 45px rgba(15,23,42,.07);
          overflow:hidden;
        }
        .ms-cardHead{
          padding: 12px 14px;
          border-bottom:1px solid ${ui.border};
          background: linear-gradient(180deg, rgba(238,242,255,.75), rgba(255,255,255,.92));
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .ms-cardTitle{ font-weight:1000; font-size: .95rem; }
        .ms-cardBody{ padding: 12px 14px; }

        .ms-kpis{
          display:grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media(min-width: 560px){
          .ms-kpis{ grid-template-columns: 1fr 1fr; }
        }
        .ms-kpi{
          border:1px solid ${ui.border};
          background:#fff;
          border-radius: 16px;
          padding: 12px 12px;
          box-shadow: 0 10px 22px rgba(15,23,42,.05);
        }
        .ms-k{ color:${ui.muted}; font-weight:900; font-size:.78rem; }
        .ms-v{ margin-top:4px; font-weight:1000; font-size: 1.1rem; }
        .ms-v.big{ font-size: 1.35rem; }
        .ms-v.pos{ color:${ui.green}; }
        .ms-v.neg{ color:${ui.red}; }

        .ms-tableWrap{
          overflow:auto;
          -webkit-overflow-scrolling: touch;
          border-top:1px solid ${ui.border};
        }
        .ms-table{
          width:100%;
          border-collapse: collapse;
          font-size: .92rem;
          min-width: 620px;
        }
        .ms-table th{
          position: sticky;
          top: 0;
          z-index: 1;
          text-align:left;
          background: ${ui.soft};
          color:#334155;
          font-weight:1000;
          padding: 10px 12px;
          border-bottom:1px solid ${ui.border};
          white-space:nowrap;
        }
        .ms-table td{
          padding: 10px 12px;
          border-bottom:1px solid ${ui.border};
          white-space:nowrap;
        }
        .ms-tr:hover{ background: rgba(37,99,235,.05); }
        .ms-right{ text-align:right; }
        .ms-center{ text-align:center; }

        .ms-badge{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding: 5px 10px;
          border-radius: 999px;
          font-weight:1000;
          font-size:.78rem;
          border:1px solid ${ui.border};
          background:#fff;
        }
        .ms-badge.ok{ color:${ui.green}; }
        .ms-badge.no{ color:${ui.red}; }

        .ms-empty{
          padding: 18px 14px;
          text-align:center;
          color:${ui.muted};
          font-weight:900;
        }

        .ms-toast{
          position:fixed;
          left:50%;
          top:12%;
          transform:translate(-50%,-50%);
          z-index:9999;
          padding: 11px 14px;
          border-radius: 16px;
          color:#fff;
          font-weight:1000;
          min-width: 240px;
          text-align:center;
          box-shadow: 0 18px 55px rgba(0,0,0,.18);
          animation: msFade 1.4s;
        }
        @keyframes msFade{ 0%,100%{opacity:0} 12%,88%{opacity:1} }

        @media(max-width: 560px){
          .ms-btn{ width:100%; }
          .ms-table{ min-width: 580px; }
        }
      `}</style>

      {toast.show && (
        <div
          className="ms-toast"
          style={{
            background:
              toast.type === "success"
                ? `linear-gradient(135deg, ${ui.green}, ${ui.teal})`
                : `linear-gradient(135deg, ${ui.red}, #ff6b6b)`,
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="ms-shell">
        <div className="ms-top">
          <div className="ms-topHead">
            <h2 className="ms-title">Monthly Summary</h2>
            <button className="ms-iconBtn" onClick={loadMaster} title="Reload Category/Subcategory">
              ⟳
            </button>
          </div>

          <div className="ms-controls">
            <div className="ms-field">
              <label>Category</label>
              <select
                className="ms-select"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, subcategory_id: "" }))}
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ms-field">
              <label>Subcategory</label>
              <select
                className="ms-select"
                value={form.subcategory_id}
                onChange={(e) => setForm((f) => ({ ...f, subcategory_id: e.target.value }))}
                disabled={!form.category_id}
              >
                <option value="">Select…</option>
                {filteredSubs.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ms-field">
              <label>Month</label>
              <input
                className="ms-month"
                type="month"
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              />
            </div>

            <button className="ms-btn" onClick={fetchSummary} disabled={loading}>
              {loading ? "Loading…" : "Get"}
            </button>
          </div>
        </div>

        <div className="ms-grid">
          {/* Summary */}
          <div className="ms-card">
            <div className="ms-cardHead">
              <div className="ms-cardTitle">Summary</div>
            </div>

            <div className="ms-cardBody">
              {notFound ? (
                <div className="ms-empty">Not Found Details</div>
              ) : !data ? (
                <div className="ms-empty">Select inputs and click Get</div>
              ) : (
                <div className="ms-kpis">
                  <div className="ms-kpi">
                    <div className="ms-k">Net P&amp;L</div>
                    <div className={`ms-v big ${net >= 0 ? "pos" : "neg"}`}>₹ {money(net)}</div>
                  </div>

                  <div className="ms-kpi">
                    <div className="ms-k">Trades</div>
                    <div className="ms-v">{Number(m.trades_count ?? 0)}</div>
                  </div>

                  <div className="ms-kpi">
                    <div className="ms-k">Trade Days</div>
                    <div className="ms-v">{Number(m.trade_days_count ?? 0)}</div>
                  </div>

                  <div className="ms-kpi">
                    <div className="ms-k">RR Follow</div>
                    <div className="ms-v">
                      <span className={`ms-badge ${Number(m.rr_respected_count ?? 0) ? "ok" : "no"}`}>
                        {Number(m.rr_respected_count ?? 0) ? "✅ OK" : "❌ No"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Daily */}
          <div className="ms-card">
            <div className="ms-cardHead">
              <div className="ms-cardTitle">Daily List</div>
            </div>

            {notFound ? (
              <div className="ms-empty">Not Found Details</div>
            ) : !data ? (
              <div className="ms-empty">—</div>
            ) : (
              <div className="ms-tableWrap">
                <table className="ms-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="ms-right">Trades</th>
                      <th className="ms-right">Net</th>
                      <th className="ms-center">RR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="ms-empty" style={{ textAlign: "center" }}>
                          Not Found Details
                        </td>
                      </tr>
                    ) : (
                      daily.map((d) => {
                        const dn = Number(d.net_pnl ?? 0);
                        return (
                          <tr className="ms-tr" key={d.day}>
                            <td>{d.day}</td>
                            <td className="ms-right">{d.trades_count}</td>
                            <td className="ms-right" style={{ fontWeight: 1000, color: dn >= 0 ? ui.green : ui.red }}>
                              ₹ {money(dn)}
                            </td>
                            <td className="ms-center">
                              {d.trades_count > 0 ? (
                                d.rr_respected ? (
                                  <span className="ms-badge ok">✅</span>
                                ) : (
                                  <span className="ms-badge no">❌</span>
                                )
                              ) : (
                                <span className="ms-badge no" style={{ opacity: 0.6 }}>
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
