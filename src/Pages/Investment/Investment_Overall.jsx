// src/pages/investment/Investment_Overall.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * ✅ API (base url localhost:5000)
 * - Current month (default):  http://localhost:5000/api/investment/trading/month-stats
 * - Specific month:           http://localhost:5000/api/investment/trading/month-stats?month=YYYY-MM-01
 *
 * NOTE: auth middleware => expects Authorization: Bearer <token>
 * (this component reads token from localStorage: "token")
 */

const BASE_URL = "https://express-backend-myapp.onrender.com";
const API_URL = `${BASE_URL}/api/investment/trading/month-stats`;

function toMonthStartISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function monthLabel(isoMonthStart) {
  const [y, m] = isoMonthStart.split("-").map((x) => Number(x));
  const date = new Date(y, (m || 1) - 1, 1);
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function buildRecentMonths(count = 24) {
  const arr = [];
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    arr.push(toMonthStartISO(d));
  }
  return arr;
}

function formatMoney(n) {
  const num = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
  } catch {
    return String(num);
  }
}

function formatSigned(n) {
  const num = Number(n || 0);
  const sign = num > 0 ? "+" : "";
  return `${sign}${formatMoney(num)}`;
}

function statusFromPnl(pnl) {
  if (pnl > 0) return { label: "Good", tone: "good" };
  if (pnl < 0) return { label: "Bad", tone: "bad" };
  return { label: "Ok", tone: "ok" };
}

export default function Investment_Overall() {
  const [selectedMonth, setSelectedMonth] = useState(toMonthStartISO(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const monthOptions = useMemo(() => buildRecentMonths(24), []);

  async function fetchMonthStats(monthIso) {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = monthIso ? `${API_URL}?month=${encodeURIComponent(monthIso)}` : API_URL;

      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg =
          json?.message ||
          (resp.status === 401 ? "Unauthorized (token missing/expired)" : "Request failed");
        throw new Error(msg);
      }

      setData(json?.data || null);
    } catch (e) {
      setError(e?.message || "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMonthStats(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const totalTrades = Number(data?.total_trades ?? 0);
  const totalProfit = Number(data?.total_profit ?? 0);
  const totalLoss = Number(data?.total_loss ?? 0);
  const totalBrokerage = Number(data?.total_brokerage ?? 0);
  const totalDeposit = Number(data?.total_deposit ?? 0);

  // ✅ required calc: total_profit - (total_loss + total_brokerage)
  const pnl = Number(data?.overall_month_pnl ?? totalProfit - (totalLoss + totalBrokerage));

  const status = statusFromPnl(pnl);

  // responsive
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 980 : true
  );
  useEffect(() => {
    function onResize() {
      setIsDesktop(window.innerWidth >= 980);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Bright professional theme (no dark/black)
  const theme = {
    bg1: "#F6F8FF",
    bg2: "#FFF7F1",
    card: "rgba(255,255,255,0.82)",
    card2: "rgba(255,255,255,0.70)",
    border: "rgba(15, 23, 42, 0.10)",
    text: "rgba(15, 23, 42, 0.92)",
    muted: "rgba(15, 23, 42, 0.62)",
    good: "#16A34A",
    bad: "#E11D48",
    ok: "#2563EB",
    accent1: "#7C3AED",
    accent2: "#06B6D4",
    accent3: "#F59E0B",
  };

  const page = {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    color: theme.text,
    background: `
      radial-gradient(900px 520px at 8% 10%, rgba(124,58,237,.14), transparent 60%),
      radial-gradient(900px 520px at 92% 18%, rgba(6,182,212,.14), transparent 60%),
      radial-gradient(900px 520px at 40% 92%, rgba(245,158,11,.12), transparent 60%),
      linear-gradient(135deg, ${theme.bg1}, ${theme.bg2})
    `,
  };

  const topBar = {
    width: "100%",
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(14px)",
    borderBottom: `1px solid ${theme.border}`,
  };

  const topInner = {
    display: "flex",
    alignItems: isDesktop ? "center" : "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: isDesktop ? "16px 16px" : "14px 12px",
    width: "100%",
    flexDirection: isDesktop ? "row" : "column",
  };

  const titleWrap = {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    width: "100%",
  };

  const h1 = {
    margin: 0,
    fontSize: isDesktop ? 18 : 16,
    fontWeight: 950,
    letterSpacing: 0.2,
  };

  const sub = { margin: 0, fontSize: 12.5, color: theme.muted, fontWeight: 700 };

  const select = {
    width: isDesktop ? 260 : "100%",
    maxWidth: "100%",
    borderRadius: 14,
    padding: "12px 12px",
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    outline: "none",
    fontWeight: 900,
  };

  const wrap = { width: "100%", padding: isDesktop ? "14px 16px 18px" : "12px 12px 16px" };

  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 12,
    width: "100%",
  };

  const card = (spanDesktop, spanMobile = 12) => ({
    gridColumn: `span ${isDesktop ? spanDesktop : spanMobile}`,
    borderRadius: 20,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
  });

  const cardHead = {
    padding: "14px 14px 10px",
    borderBottom: `1px solid ${theme.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  };

  const cardTitle = { margin: 0, fontSize: 12.5, fontWeight: 950, color: theme.muted, letterSpacing: 0.4 };

  const pill = (tone) => {
    const map = {
      good: { bg: "rgba(22,163,74,0.10)", fg: theme.good },
      bad: { bg: "rgba(225,29,72,0.10)", fg: theme.bad },
      ok: { bg: "rgba(37,99,235,0.10)", fg: theme.ok },
    };
    const c = map[tone] || map.ok;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      border: `1px solid ${theme.border}`,
      background: c.bg,
      color: c.fg,
      fontWeight: 950,
      fontSize: 12.5,
      whiteSpace: "nowrap",
    };
  };

  const dot = (color) => ({
    width: 8,
    height: 8,
    borderRadius: 999,
    background: color,
    display: "inline-block",
  });

  const body = { padding: "14px" };

  const big = (color) => ({
    margin: 0,
    fontSize: isDesktop ? 34 : 30,
    fontWeight: 1000,
    color,
    letterSpacing: 0.2,
    lineHeight: 1.1,
  });

  const metaRow = {
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    color: theme.muted,
    fontSize: 12.5,
    fontWeight: 800,
  };

  const kpiGrid = {
    display: "grid",
    gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
    gap: 10,
    marginTop: 12,
  };

  const tile = {
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    background: theme.card2,
    padding: "12px",
    minHeight: 88,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  const tileLabel = { margin: 0, fontSize: 12.5, fontWeight: 950, color: theme.muted };
  const tileVal = { margin: "6px 0 0 0", fontSize: 20, fontWeight: 1000, letterSpacing: 0.2 };

  const statementBox = {
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))",
    padding: 12,
    marginTop: 12,
    color: theme.text,
    fontWeight: 900,
    lineHeight: 1.45,
    fontSize: 13,
  };

  const statusColor = status.tone === "good" ? theme.good : status.tone === "bad" ? theme.bad : theme.ok;

  return (
    <div style={page}>
      {/* Top */}
      <div style={topBar}>
        <div style={topInner}>
          <div style={titleWrap}>
            <h1 style={h1}>Overall Report</h1>
            <p style={sub}>Select month to see trades, totals and monthly P&amp;L</p>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={select}
            aria-label="Select month"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={wrap}>
        {/* loading / error */}
        {loading ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              background: "rgba(255,255,255,0.70)",
              padding: 12,
              fontWeight: 950,
              color: theme.muted,
              marginBottom: 12,
            }}
          >
            Loading report…
          </div>
        ) : error ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              background: "rgba(225,29,72,0.08)",
              padding: 12,
              fontWeight: 950,
              color: theme.bad,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={grid}>
          {/* MAIN PNL */}
          <div style={card(7, 12)}>
            <div style={cardHead}>
              <p style={cardTitle}>MONTHLY OVERALL P&amp;L</p>
              <div style={pill(status.tone)}>
                <span style={dot(statusColor)} />
                {status.label}
              </div>
            </div>

            <div style={body}>
              <p style={big(statusColor)}>{formatSigned(pnl)}</p>

              <div style={metaRow}>
                <span>
                  Month: <span style={{ color: theme.text }}>{monthLabel(selectedMonth)}</span>
                </span>
                <span>
                  Total Trades: <span style={{ color: theme.text }}>{totalTrades}</span>
                </span>
              </div>

              <div style={kpiGrid}>
                <div style={tile}>
                  <p style={tileLabel}>Total Profit</p>
                  <p style={{ ...tileVal, color: theme.good }}>{formatMoney(totalProfit)}</p>
                </div>

                <div style={tile}>
                  <p style={tileLabel}>Total Loss</p>
                  <p style={{ ...tileVal, color: theme.bad }}>{formatMoney(totalLoss)}</p>
                </div>

                <div style={tile}>
                  <p style={tileLabel}>Total Brokerage</p>
                  <p style={tileVal}>{formatMoney(totalBrokerage)}</p>
                </div>
              </div>

              <div style={statementBox}>
                {pnl > 0 ? (
                  <>
                    Your month is in <span style={{ color: theme.good }}>profit</span> of{" "}
                    <span style={{ color: theme.good }}>{formatMoney(pnl)}</span>. Keep following your
                    rules and continue the same discipline.
                  </>
                ) : pnl < 0 ? (
                  <>
                    Your month is in <span style={{ color: theme.bad }}>loss</span> of{" "}
                    <span style={{ color: theme.bad }}>{formatMoney(Math.abs(pnl))}</span>. Reduce risk,
                    avoid overtrading, and improve entry &amp; exit logic.
                  </>
                ) : (
                  <>
                    Your month is <span style={{ color: theme.ok }}>breakeven</span>. Focus on consistent
                    setups and keep brokerage under control.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* DEPOSIT + FORMULA */}
          <div style={card(5, 12)}>
            <div style={cardHead}>
              <p style={cardTitle}>CAPITAL &amp; CALCULATION</p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: `1px solid ${theme.border}`,
                  background: "rgba(37,99,235,0.08)",
                  color: theme.ok,
                  fontWeight: 950,
                  fontSize: 12.5,
                }}
              >
                <span style={dot(theme.ok)} />
                Summary
              </div>
            </div>

            <div style={body}>
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr" : "1fr", gap: 10 }}>
                <div style={tile}>
                  <p style={tileLabel}>Total Deposit (This Month)</p>
                  <p style={{ ...tileVal, color: theme.ok }}>{formatMoney(totalDeposit)}</p>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${theme.border}`,
                    background: "rgba(255,255,255,0.62)",
                    padding: 12,
                    color: theme.text,
                    fontWeight: 900,
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  <div style={{ color: theme.muted, fontWeight: 950, fontSize: 12.5, marginBottom: 8 }}>
                    Formula used
                  </div>

                  <div>
                    <span style={{ color: theme.muted }}>Overall P&amp;L</span> ={" "}
                    <span style={{ color: theme.text }}>
                      Total Profit − (Total Loss + Total Brokerage)
                    </span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: theme.muted }}>Total Profit</span>
                      <b style={{ color: theme.good }}>{formatMoney(totalProfit)}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: theme.muted }}>Total Loss</span>
                      <b style={{ color: theme.bad }}>{formatMoney(totalLoss)}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: theme.muted }}>Total Brokerage</span>
                      <b style={{ color: theme.text }}>{formatMoney(totalBrokerage)}</b>
                    </div>

                    <div style={{ height: 1, background: theme.border, margin: "6px 0" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: theme.muted, fontWeight: 1000 }}>Result</span>
                      <b style={{ color: statusColor, fontSize: 16 }}>{formatSigned(pnl)}</b>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${theme.border}`,
                    background: "linear-gradient(135deg, rgba(22,163,74,0.07), rgba(245,158,11,0.06))",
                    padding: 12,
                    fontWeight: 900,
                    color: theme.text,
                    lineHeight: 1.45,
                    fontSize: 13,
                  }}
                >
                  Tip: If brokerage is high, try fewer trades with better setups. It improves net results.
                </div>
              </div>
            </div>
          </div>

          {/* EDGE STRIP SUMMARY */}
          <div style={{ ...card(12, 12) }}>
            <div style={cardHead}>
              <p style={cardTitle}>QUICK SUMMARY</p>
              <div style={pill(status.tone)}>
                <span style={dot(statusColor)} />
                {status.label}
              </div>
            </div>

            <div style={{ padding: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
                  gap: 10,
                }}
              >
                <div style={tile}>
                  <p style={tileLabel}>Trades</p>
                  <p style={tileVal}>{totalTrades}</p>
                </div>

                <div style={tile}>
                  <p style={tileLabel}>Deposit</p>
                  <p style={{ ...tileVal, color: theme.ok }}>{formatMoney(totalDeposit)}</p>
                </div>

                <div style={tile}>
                  <p style={tileLabel}>Brokerage</p>
                  <p style={tileVal}>{formatMoney(totalBrokerage)}</p>
                </div>

                <div style={tile}>
                  <p style={tileLabel}>Overall P&amp;L</p>
                  <p style={{ ...tileVal, color: statusColor }}>{formatSigned(pnl)}</p>
                </div>
              </div>

              <div style={{ marginTop: 12, color: theme.muted, fontSize: 12.5, fontWeight: 800 }}>
                Showing {monthLabel(selectedMonth)} report.
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}