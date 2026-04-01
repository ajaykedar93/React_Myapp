// src/pages/investment/Investment_Overall.jsx
import React, { useEffect, useMemo, useState } from "react";

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
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(num);
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

  const pnl = Number(
    data?.overall_month_pnl ?? totalProfit - (totalLoss + totalBrokerage)
  );

  const status = statusFromPnl(pnl);

  const [screen, setScreen] = useState(() => {
    if (typeof window === "undefined") {
      return { isMobile: false, isTablet: false, isDesktop: true };
    }
    const w = window.innerWidth;
    return {
      isMobile: w <= 640,
      isTablet: w > 640 && w < 1024,
      isDesktop: w >= 1024,
    };
  });

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      setScreen({
        isMobile: w <= 640,
        isTablet: w > 640 && w < 1024,
        isDesktop: w >= 1024,
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { isMobile, isTablet, isDesktop } = screen;

  const theme = {
    bg1: "#F8FAFF",
    bg2: "#FFF8F2",
    bg3: "#F6FFFB",
    card: "rgba(255,255,255,0.90)",
    cardSoft: "rgba(255,255,255,0.76)",
    border: "rgba(15,23,42,0.08)",
    text: "#0F172A",
    muted: "rgba(15,23,42,0.62)",
    good: "#16A34A",
    bad: "#E11D48",
    ok: "#2563EB",
    accent1: "#7C3AED",
    accent2: "#06B6D4",
    accent3: "#F59E0B",
    shadow: "0 18px 40px rgba(15,23,42,0.08)",
  };

  const statusColor =
    status.tone === "good" ? theme.good : status.tone === "bad" ? theme.bad : theme.ok;

  const styles = {
    page: {
      minHeight: "100vh",
      width: "100%",
      background: `
        radial-gradient(900px 450px at 5% 8%, rgba(124,58,237,.10), transparent 60%),
        radial-gradient(900px 450px at 95% 10%, rgba(6,182,212,.10), transparent 60%),
        radial-gradient(900px 450px at 50% 100%, rgba(245,158,11,.08), transparent 60%),
        linear-gradient(135deg, ${theme.bg1}, ${theme.bg2}, ${theme.bg3})
      `,
      color: theme.text,
      padding: 0,
      margin: 0,
    },

    container: {
      width: "100%",
      maxWidth: "1600px",
      margin: "0 auto",
      padding: isDesktop ? "18px 18px 24px" : isTablet ? "16px 14px 22px" : "12px 10px 18px",
      boxSizing: "border-box",
    },

    headingCard: {
      width: "100%",
      borderRadius: isMobile ? 18 : 22,
      border: `1px solid ${theme.border}`,
      background: theme.card,
      backdropFilter: "blur(12px)",
      boxShadow: theme.shadow,
      overflow: "hidden",
      marginBottom: 14,
    },

    headingInner: {
      padding: isDesktop ? 20 : isTablet ? 18 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    },

    title: {
      margin: 0,
      fontSize: isDesktop ? 24 : isTablet ? 21 : 18,
      fontWeight: 900,
      lineHeight: 1.2,
      letterSpacing: 0.2,
    },

    subtitle: {
      margin: 0,
      fontSize: isDesktop ? 13.5 : 12.5,
      color: theme.muted,
      fontWeight: 700,
      lineHeight: 1.45,
    },

    monthRow: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
      width: "100%",
    },

    monthControlWrap: {
      width: isMobile ? "170px" : isTablet ? "220px" : "260px",
      maxWidth: "100%",
    },

    monthLabelText: {
      marginBottom: 6,
      fontSize: 11.5,
      color: theme.muted,
      fontWeight: 800,
    },

    select: {
      width: "100%",
      height: isMobile ? 40 : 46,
      borderRadius: 14,
      border: `1px solid ${theme.border}`,
      background: "#FFFFFF",
      color: theme.text,
      outline: "none",
      padding: isMobile ? "0 10px" : "0 12px",
      fontSize: isMobile ? 12.5 : 14,
      fontWeight: 800,
      boxSizing: "border-box",
      cursor: "pointer",
      boxShadow: "0 6px 16px rgba(15,23,42,0.04)",
    },

    stateBox: {
      borderRadius: 16,
      border: `1px solid ${theme.border}`,
      padding: "12px 14px",
      marginBottom: 12,
      fontWeight: 800,
      fontSize: 13,
      background: "rgba(255,255,255,0.72)",
    },

    grid: {
      display: "grid",
      gridTemplateColumns: isDesktop ? "repeat(12, minmax(0, 1fr))" : "1fr",
      gap: 14,
      width: "100%",
    },

    card: (span = 12) => ({
      gridColumn: isDesktop ? `span ${span}` : "span 12",
      borderRadius: isMobile ? 18 : 22,
      border: `1px solid ${theme.border}`,
      background: theme.card,
      boxShadow: theme.shadow,
      overflow: "hidden",
      minWidth: 0,
    }),

    cardHead: {
      padding: isMobile ? "13px 14px 10px" : "15px 16px 12px",
      borderBottom: `1px solid ${theme.border}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: 10,
      flexDirection: isMobile ? "column" : "row",
    },

    cardTitle: {
      margin: 0,
      fontSize: 12.5,
      color: theme.muted,
      fontWeight: 900,
      letterSpacing: 0.4,
    },

    cardBody: {
      padding: isMobile ? 14 : 16,
    },

    pill: (tone) => {
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
        padding: "8px 11px",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      };
    },

    dot: (color) => ({
      width: 8,
      height: 8,
      borderRadius: 999,
      background: color,
      display: "inline-block",
      flexShrink: 0,
    }),

    bigPnl: {
      margin: 0,
      fontSize: isDesktop ? 42 : isTablet ? 36 : 30,
      lineHeight: 1.1,
      fontWeight: 1000,
      color: statusColor,
      wordBreak: "break-word",
    },

    metaRow: {
      marginTop: 10,
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
      gap: 8,
      fontSize: 13,
      color: theme.muted,
      fontWeight: 700,
    },

    metaItem: {
      padding: "10px 12px",
      borderRadius: 14,
      background: theme.cardSoft,
      border: `1px solid ${theme.border}`,
    },

    // IMPORTANT: profit and loss side by side on mobile also
    profitLossGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 12,
      marginTop: 14,
    },

    // brokerage stays below full width
    brokerageGrid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 12,
      marginTop: 12,
    },

    tile: {
      borderRadius: 18,
      border: `1px solid ${theme.border}`,
      background: theme.cardSoft,
      padding: isMobile ? 12 : 14,
      minHeight: isMobile ? 84 : 92,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      boxSizing: "border-box",
      minWidth: 0,
    },

    highlightTile: (type) => ({
      borderRadius: 20,
      border: `1px solid ${theme.border}`,
      background:
        type === "profit"
          ? "linear-gradient(135deg, rgba(22,163,74,0.10), rgba(255,255,255,0.88))"
          : "linear-gradient(135deg, rgba(225,29,72,0.10), rgba(255,255,255,0.88))",
      padding: isMobile ? 12 : 16,
      minHeight: isMobile ? 96 : 112,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      boxSizing: "border-box",
      minWidth: 0,
      boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
    }),

    tileLabel: {
      margin: 0,
      fontSize: isMobile ? 11.5 : 12.5,
      color: theme.muted,
      fontWeight: 900,
      lineHeight: 1.35,
    },

    tileVal: {
      margin: "7px 0 0 0",
      fontSize: isDesktop ? 24 : isTablet ? 22 : 18,
      fontWeight: 1000,
      lineHeight: 1.15,
      wordBreak: "break-word",
    },

    bigTileVal: {
      margin: "8px 0 0 0",
      fontSize: isDesktop ? 28 : isTablet ? 24 : 18,
      fontWeight: 1000,
      lineHeight: 1.1,
      wordBreak: "break-word",
    },

    statementBox: {
      marginTop: 14,
      borderRadius: 18,
      border: `1px solid ${theme.border}`,
      background:
        "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))",
      padding: isMobile ? 12 : 14,
      fontSize: 13,
      lineHeight: 1.6,
      fontWeight: 800,
    },

    formulaBox: {
      borderRadius: 18,
      border: `1px solid ${theme.border}`,
      background: "rgba(255,255,255,0.68)",
      padding: isMobile ? 12 : 14,
      fontSize: 13,
      lineHeight: 1.6,
      fontWeight: 800,
    },

    formulaTitle: {
      color: theme.muted,
      fontWeight: 900,
      fontSize: 12.5,
      marginBottom: 8,
    },

    line: {
      height: 1,
      background: theme.border,
      margin: "8px 0",
    },

    rowBetween: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 6,
      flexWrap: "wrap",
    },

    summaryGrid: {
      display: "grid",
      gridTemplateColumns: isDesktop
        ? "repeat(4, minmax(0, 1fr))"
        : isTablet
        ? "repeat(2, minmax(0, 1fr))"
        : "repeat(2, minmax(0, 1fr))",
      gap: 12,
    },

    bottomText: {
      marginTop: 12,
      color: theme.muted,
      fontSize: 12.5,
      fontWeight: 800,
    },

    tipBox: {
      borderRadius: 18,
      border: `1px solid ${theme.border}`,
      background:
        "linear-gradient(135deg, rgba(22,163,74,0.07), rgba(245,158,11,0.06))",
      padding: isMobile ? 12 : 14,
      fontWeight: 800,
      color: theme.text,
      lineHeight: 1.55,
      fontSize: 13,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headingCard}>
          <div style={styles.headingInner}>
            <div>
              <h1 style={styles.title}>Investment Overall Report</h1>
              <p style={styles.subtitle}>
               Month Overall Report
              </p>
            </div>

            <div style={styles.monthRow}>
              <div style={styles.monthControlWrap}>
                <div style={styles.monthLabelText}>Select Month</div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={styles.select}
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
          </div>
        </div>

        {loading ? (
          <div style={{ ...styles.stateBox, color: theme.muted }}>Loading report...</div>
        ) : error ? (
          <div
            style={{
              ...styles.stateBox,
              color: theme.bad,
              background: "rgba(225,29,72,0.08)",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={styles.grid}>
          {/* LEFT MAIN CARD */}
          <div style={styles.card(7)}>
            <div style={styles.cardHead}>
              <p style={styles.cardTitle}>MONTHLY OVERALL P&amp;L</p>
              <div style={styles.pill(status.tone)}>
                <span style={styles.dot(statusColor)} />
                {status.label}
              </div>
            </div>

            <div style={styles.cardBody}>
              <p style={styles.bigPnl}>{formatSigned(pnl)}</p>

              <div style={styles.metaRow}>
                <div style={styles.metaItem}>
                  Month: <span style={{ color: theme.text }}>{monthLabel(selectedMonth)}</span>
                </div>
                <div style={styles.metaItem}>
                  Total Trades: <span style={{ color: theme.text }}>{totalTrades}</span>
                </div>
              </div>

              {/* PROFIT + LOSS SIDE BY SIDE */}
              <div style={styles.profitLossGrid}>
                <div style={styles.highlightTile("profit")}>
                  <p style={styles.tileLabel}>Total Profit</p>
                  <p style={{ ...styles.bigTileVal, color: theme.good }}>
                    {formatMoney(totalProfit)}
                  </p>
                </div>

                <div style={styles.highlightTile("loss")}>
                  <p style={styles.tileLabel}>Total Loss</p>
                  <p style={{ ...styles.bigTileVal, color: theme.bad }}>
                    {formatMoney(totalLoss)}
                  </p>
                </div>
              </div>

              {/* BROKERAGE BELOW */}
              <div style={styles.brokerageGrid}>
                <div style={styles.tile}>
                  <p style={styles.tileLabel}>Total Brokerage</p>
                  <p style={{ ...styles.tileVal, color: theme.text }}>
                    {formatMoney(totalBrokerage)}
                  </p>
                </div>
              </div>

              <div style={styles.statementBox}>
                {pnl > 0 ? (
                  <>
                    Your month is in <span style={{ color: theme.good }}>profit</span> of{" "}
                    <span style={{ color: theme.good }}>{formatMoney(pnl)}</span>. Continue
                    disciplined trading and maintain strong risk management.
                  </>
                ) : pnl < 0 ? (
                  <>
                    Your month is in <span style={{ color: theme.bad }}>loss</span> of{" "}
                    <span style={{ color: theme.bad }}>{formatMoney(Math.abs(pnl))}</span>.
                    Focus on reducing unnecessary trades and improving entries and exits.
                  </>
                ) : (
                  <>
                    Your month is at <span style={{ color: theme.ok }}>breakeven</span>.
                    Improve trade selection and keep execution consistent.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT CARD */}
          <div style={styles.card(5)}>
            <div style={styles.cardHead}>
              <p style={styles.cardTitle}>CAPITAL &amp; CALCULATION</p>
              <div style={styles.pill("ok")}>
                <span style={styles.dot(theme.ok)} />
                Summary
              </div>
            </div>

            <div style={styles.cardBody}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={styles.tile}>
                  <p style={styles.tileLabel}>Total Deposit (This Month)</p>
                  <p style={{ ...styles.tileVal, color: theme.ok }}>
                    {formatMoney(totalDeposit)}
                  </p>
                </div>

                <div style={styles.formulaBox}>
                  <div style={styles.formulaTitle}>Formula used</div>

                  <div>
                    <span style={{ color: theme.muted }}>Overall P&amp;L</span> ={" "}
                    <span style={{ color: theme.text }}>
                      Total Profit − (Total Loss + Total Brokerage)
                    </span>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={styles.rowBetween}>
                      <span style={{ color: theme.muted }}>Total Profit</span>
                      <b style={{ color: theme.good }}>{formatMoney(totalProfit)}</b>
                    </div>

                    <div style={styles.rowBetween}>
                      <span style={{ color: theme.muted }}>Total Loss</span>
                      <b style={{ color: theme.bad }}>{formatMoney(totalLoss)}</b>
                    </div>

                    <div style={styles.rowBetween}>
                      <span style={{ color: theme.muted }}>Total Brokerage</span>
                      <b style={{ color: theme.text }}>{formatMoney(totalBrokerage)}</b>
                    </div>

                    <div style={styles.line} />

                    <div style={styles.rowBetween}>
                      <span style={{ color: theme.muted, fontWeight: 900 }}>Result</span>
                      <b style={{ color: statusColor, fontSize: 16 }}>{formatSigned(pnl)}</b>
                    </div>
                  </div>
                </div>

                <div style={styles.tipBox}>
                  Tip: If brokerage is high, try fewer but better quality trades. Better setup
                  selection improves net monthly performance.
                </div>
              </div>
            </div>
          </div>

          {/* FULL WIDTH SUMMARY */}
          <div style={styles.card(12)}>
            <div style={styles.cardHead}>
              <p style={styles.cardTitle}>QUICK SUMMARY</p>
              <div style={styles.pill(status.tone)}>
                <span style={styles.dot(statusColor)} />
                {status.label}
              </div>
            </div>

            <div style={styles.cardBody}>
              <div style={styles.summaryGrid}>
                <div style={styles.tile}>
                  <p style={styles.tileLabel}>Trades</p>
                  <p style={{ ...styles.tileVal, color: theme.text }}>{totalTrades}</p>
                </div>

                <div style={styles.tile}>
                  <p style={styles.tileLabel}>Deposit</p>
                  <p style={{ ...styles.tileVal, color: theme.ok }}>
                    {formatMoney(totalDeposit)}
                  </p>
                </div>

                <div style={styles.tile}>
                  <p style={styles.tileLabel}>Brokerage</p>
                  <p style={{ ...styles.tileVal, color: theme.text }}>
                    {formatMoney(totalBrokerage)}
                  </p>
                </div>

                <div style={styles.tile}>
                  <p style={styles.tileLabel}>Overall P&amp;L</p>
                  <p style={{ ...styles.tileVal, color: statusColor }}>
                    {formatSigned(pnl)}
                  </p>
                </div>
              </div>

              <div style={styles.bottomText}>
                Showing professional monthly report for{" "}
                <span style={{ color: theme.text }}>{monthLabel(selectedMonth)}</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}