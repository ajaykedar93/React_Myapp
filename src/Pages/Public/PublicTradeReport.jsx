import React, { useEffect, useState } from "react";

/**
 * PUBLIC VIEW VERSION
 *
 * Public API:
 * https://express-backend-myapp.onrender.com/api/investment/trading/public/month-stats
 *
 * Required query:
 * - user_id
 *
 * Example public URL:
 * https://react-myapp-omega.vercel.app/#/public-trade-report?user_id=1
 */

const BASE_URL = "https://express-backend-myapp.onrender.com";
const API_URL = `${BASE_URL}/api/investment/trading/public/month-stats`;

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

function getPublicUserId() {
  if (typeof window === "undefined") return "";

  try {
    const fullUrl = window.location.href;

    if (fullUrl.includes("?")) {
      const queryString = fullUrl.split("?")[1] || "";
      const cleanQuery = queryString.split("#")[0];
      const params = new URLSearchParams(cleanQuery);
      return params.get("user_id") || "";
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("user_id") || "";
  } catch {
    return "";
  }
}

export default function PublicTradeReport() {
  const currentMonth = toMonthStartISO(new Date());

  const [selectedMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [publicUserId] = useState(getPublicUserId());

  async function fetchMonthStats(monthIso) {
    setLoading(true);
    setError("");

    try {
      if (!publicUserId) {
        throw new Error("Public user_id missing in URL. Use ?user_id=1");
      }

      const params = new URLSearchParams();
      params.append("user_id", publicUserId);

      if (monthIso) {
        params.append("month", monthIso);
      }

      const url = `${API_URL}?${params.toString()}`;

      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg = json?.message || "Request failed";
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
  }, [selectedMonth, publicUserId]);

  const totalTrades = Number(data?.total_trades ?? 0);
  const totalProfit = Number(data?.total_profit ?? 0);
  const totalLoss = Number(data?.total_loss ?? 0);
  const totalBrokerage = Number(data?.total_brokerage ?? 0);
  const totalDeposit = Number(data?.total_deposit ?? 0);

  const pnl = Number(data?.overall_month_pnl ?? totalProfit - (totalLoss + totalBrokerage));
  const status = statusFromPnl(pnl);

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 980 : false
  );

  useEffect(() => {
    function onResize() {
      setIsDesktop(window.innerWidth >= 980);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const theme = {
    bg1: "#f8fbff",
    bg2: "#fffaf5",
    card: "rgba(255,255,255,0.84)",
    card2: "rgba(255,255,255,0.72)",
    border: "rgba(15, 23, 42, 0.08)",
    text: "#0f172a",
    muted: "#64748b",
    good: "#16A34A",
    bad: "#E11D48",
    ok: "#2563EB",
    purple: "#7c3aed",
    cyan: "#06b6d4",
    amber: "#f59e0b",
  };

  const page = {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    color: theme.text,
    background: `
      radial-gradient(700px 400px at 5% 8%, rgba(124,58,237,.12), transparent 60%),
      radial-gradient(700px 400px at 95% 12%, rgba(6,182,212,.12), transparent 60%),
      radial-gradient(700px 400px at 45% 100%, rgba(245,158,11,.10), transparent 60%),
      linear-gradient(135deg, ${theme.bg1}, ${theme.bg2})
    `,
  };

  const topBar = {
    width: "100%",
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(16px)",
    borderBottom: `1px solid ${theme.border}`,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
    paddingTop: isDesktop ? "0px" : "max(16px, env(safe-area-inset-top))",
  };

  const topInner = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: isDesktop
      ? "18px 18px 16px"
      : "10px calc(14px + env(safe-area-inset-right)) 16px calc(14px + env(safe-area-inset-left))",
    minHeight: isDesktop ? "auto" : "104px",
  };

  const heroTitle = {
    margin: 0,
    fontSize: isDesktop ? 22 : 19,
    fontWeight: 1000,
    lineHeight: 1.2,
    letterSpacing: "-0.3px",
    background: `linear-gradient(90deg, ${theme.purple}, ${theme.ok}, ${theme.cyan})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };

  const heroSub = {
    margin: "4px 0 0 0",
    fontSize: isDesktop ? 13 : 12,
    color: theme.muted,
    fontWeight: 700,
  };

  const devRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  };

  const devPill = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(37,99,235,0.10))",
    border: `1px solid ${theme.border}`,
    fontSize: 12.5,
    fontWeight: 900,
    color: theme.text,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  };

  const monthPill = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "linear-gradient(135deg, rgba(6,182,212,0.10), rgba(245,158,11,0.10))",
    border: `1px solid ${theme.border}`,
    fontSize: 12.5,
    fontWeight: 900,
    color: theme.text,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  };

  const wrap = {
    width: "100%",
    padding: isDesktop
      ? "16px 18px 28px"
      : "12px calc(12px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))",
  };

  const introCard = {
    width: "100%",
    borderRadius: 22,
    border: `1px solid ${theme.border}`,
    background: "linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,255,255,0.74))",
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.06)",
    padding: isDesktop ? "18px" : "16px",
    marginBottom: 12,
  };

  const introTitle = {
    margin: 0,
    fontSize: isDesktop ? 18 : 16,
    fontWeight: 1000,
    color: theme.text,
  };

  const introText = {
    margin: "6px 0 0 0",
    fontSize: 12.5,
    color: theme.muted,
    fontWeight: 700,
    lineHeight: 1.55,
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 12,
    width: "100%",
  };

  const card = (spanDesktop, spanMobile = 12) => ({
    gridColumn: `span ${isDesktop ? spanDesktop : spanMobile}`,
    borderRadius: 22,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
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

  const cardTitle = {
    margin: 0,
    fontSize: 12.5,
    fontWeight: 950,
    color: theme.muted,
    letterSpacing: 0.4,
  };

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
    fontSize: isDesktop ? 36 : 30,
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

  const tileLabel = {
    margin: 0,
    fontSize: 12.5,
    fontWeight: 950,
    color: theme.muted,
  };

  const tileVal = {
    margin: "6px 0 0 0",
    fontSize: 20,
    fontWeight: 1000,
    letterSpacing: 0.2,
  };

  const statementBox = {
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))",
    padding: 12,
    marginTop: 12,
    color: theme.text,
    fontWeight: 900,
    lineHeight: 1.55,
    fontSize: 13,
  };

  const statusColor =
    status.tone === "good" ? theme.good : status.tone === "bad" ? theme.bad : theme.ok;

  return (
    <div style={page}>
      <div style={topBar}>
        <div style={topInner}>
          <div>
            <h1 style={heroTitle}>Public Trade Report</h1>
            <p style={heroSub}>Live current month performance overview</p>
          </div>

          <div style={devRow}>
            <div style={devPill}>
              <span style={dot(theme.purple)} />
              Developer: Ajay
            </div>

            <div style={monthPill}>
              <span style={dot(theme.cyan)} />
              {monthLabel(selectedMonth)}
            </div>
          </div>
        </div>
      </div>

      <div style={wrap}>
        <div style={introCard}>
          <h2 style={introTitle}>Current Month Summary</h2>
          <p style={introText}>
            This public page shows the latest monthly trading overview automatically. Only the current month report is displayed.
          </p>
        </div>

        {loading ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              background: "rgba(255,255,255,0.72)",
              padding: 12,
              fontWeight: 950,
              color: theme.muted,
              marginBottom: 12,
            }}
          >
            Loading report...
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
                    Your current month is in <span style={{ color: theme.good }}>profit</span> of{" "}
                    <span style={{ color: theme.good }}>{formatMoney(pnl)}</span>. Keep following your
                    rules and maintain the same discipline.
                  </>
                ) : pnl < 0 ? (
                  <>
                    Your current month is in <span style={{ color: theme.bad }}>loss</span> of{" "}
                    <span style={{ color: theme.bad }}>{formatMoney(Math.abs(pnl))}</span>. Reduce risk,
                    avoid overtrading, and improve entry &amp; exit logic.
                  </>
                ) : (
                  <>
                    Your current month is <span style={{ color: theme.ok }}>breakeven</span>. Focus on
                    consistent setups and keep brokerage under control.
                  </>
                )}
              </div>
            </div>
          </div>

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
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
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
                  <div
                    style={{
                      color: theme.muted,
                      fontWeight: 950,
                      fontSize: 12.5,
                      marginBottom: 8,
                    }}
                  >
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
                    background:
                      "linear-gradient(135deg, rgba(22,163,74,0.07), rgba(245,158,11,0.06))",
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

          <div style={card(12, 12)}>
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
                Showing current month report: {monthLabel(selectedMonth)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: isDesktop ? 8 : "max(18px, env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}