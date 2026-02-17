// src/pages/Investment_report.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_report() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // -------------------- master data --------------------
  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);
  const [plans, setPlans] = useState([]);

  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [planId, setPlanId] = useState(""); // optional

  // month filter
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  // report data
  const [monthReport, setMonthReport] = useState([]);
  const [mistakeRepeats, setMistakeRepeats] = useState([]);

  // ui
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  // modal (center)
  const [modal, setModal] = useState({
    open: false,
    type: "info", // success | error | info
    title: "",
    message: "",
    confirmText: "OK",
  });

  const openModal = (p) =>
    setModal((m) => ({
      ...m,
      open: true,
      type: p.type || "info",
      title: p.title || "",
      message: p.message || "",
      confirmText: p.confirmText || "OK",
    }));

  const closeModal = () => setModal((m) => ({ ...m, open: false, title: "", message: "" }));
  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

  // click/tap effect
  const press = (e) => (e.currentTarget.style.transform = "scale(0.98)");
  const release = (e) => (e.currentTarget.style.transform = "scale(1)");

  // -------------------- API --------------------
  const api = {
    async getPlatforms() {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Platform fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getSegments(pid) {
      if (!pid) return [];
      const res = await fetch(
        `${BASE_URL}/api/investment/platform-segment/segment?platform_id=${pid}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Segment fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getPlans(pid, sid) {
      const qs = new URLSearchParams();
      if (pid) qs.set("platform_id", String(pid));
      if (sid) qs.set("segment_id", String(sid));
      const res = await fetch(`${BASE_URL}/api/investment/plan?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Plan fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getMonthReport({ platform_id, segment_id, plan_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (plan_id) qs.set("plan_id", String(plan_id));
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/report/month?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Month report failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getMistakesRepeat({ platform_id, segment_id, plan_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (plan_id) qs.set("plan_id", String(plan_id));
      if (month) qs.set("month", month);

      const res = await fetch(`${BASE_URL}/api/investment/report/mistakes-repeat?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Mistake repeat failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
  };

  // -------------------- responsive --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1100 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1100);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // -------------------- helpers --------------------
  const fmtMonth = (val) => {
    // expects "YYYY-MM-01" or any ISO; show "1 Jan 2026"
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "-";
      const dd = 1; // always 1st for month start
      const m = d.toLocaleString("en-GB", { month: "short" });
      const y = d.getFullYear();
      return `${dd} ${m} ${y}`;
    } catch {
      return "-";
    }
  };

  const safeText = (v) => {
    const s = String(v ?? "").trim();
    return s ? s : "-";
  };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const rrPretty = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "-";
    // already "1:2" format
    return s;
  };

  const rrFollowedText = (v) => {
    if (v === null || v === undefined) return "-";
    return v ? "Yes" : "No";
  };

  const statusBadge = (status) => {
    const s = String(status ?? "").toLowerCase();
    if (!s || s === "-") return { bg: "#f8fafc", fg: "#0f172a", bd: "#e5e7eb", text: "-" };
    if (s.includes("profit") || s.includes("green") || s.includes("win"))
      return { bg: "#ecfdf5", fg: "#065f46", bd: "#bbf7d0", text: String(status) };
    if (s.includes("loss") || s.includes("red") || s.includes("fail"))
      return { bg: "#fff1f2", fg: "#9f1239", bd: "#fecaca", text: String(status) };
    return { bg: "#eef2ff", fg: "#3730a3", bd: "#c7d2fe", text: String(status) };
  };

  // -------------------- load platforms on mount --------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await api.getPlatforms();
        setPlatforms(p);
      } catch (e) {
        fail(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load segments when platform changes
  useEffect(() => {
    (async () => {
      try {
        setSegments([]);
        setPlans([]);
        setSegmentId("");
        setPlanId("");
        if (!platformId) return;
        const s = await api.getSegments(platformId);
        setSegments(s);
      } catch (e) {
        fail(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  // load plans when segment changes
  useEffect(() => {
    (async () => {
      try {
        setPlans([]);
        setPlanId("");
        if (!platformId || !segmentId) return;
        const pl = await api.getPlans(platformId, segmentId);
        setPlans(pl);
      } catch (e) {
        fail(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId, segmentId]);

  // refresh report
  const refresh = async () => {
    try {
      setLoading(true);
      setBusy("refresh");

      const mr = await api.getMonthReport({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        plan_id: planId ? Number(planId) : null,
        month,
      });

      const mm = await api.getMistakesRepeat({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        plan_id: planId ? Number(planId) : null,
        month,
      });

      setMonthReport(mr);
      setMistakeRepeats(mm);
      toast("Report updated");
    } catch (e) {
      fail(e.message);
    } finally {
      setLoading(false);
      setBusy("");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, platformId, segmentId, planId]);

  // -------------------- UI --------------------
  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      margin: 0,
      padding: 0,
      background: "#ffffff",
      color: "#0f172a",
      fontFamily: '"Times New Roman", Times, serif',
    },
    topbar: {
      width: "100%",
      borderBottom: "1px solid #e5e7eb",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 12px",
      position: "sticky",
      top: 0,
      zIndex: 5,
    },
    title: { margin: 0, fontSize: 16, fontWeight: 900 },

    grid: {
      width: "100%",
      display: "grid",
      gridTemplateColumns: wide ? "420px 1fr" : "1fr",
      gap: 12,
      padding: 12,
      boxSizing: "border-box",
    },

    card: {
      border: "1px solid #e5e7eb",
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      background: "#fbfbfd",
    },
    cardTitle: { margin: "10px 12px", fontSize: 14, fontWeight: 900 },
    small: { margin: "10px 12px", fontSize: 12, color: "#475569" },

    form: { margin: "12px 12px 14px", display: "grid", gap: 10 },
    row2: { display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 10 },

    input: {
      height: 44,
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      padding: "0 12px",
      outline: "none",
      background: "#fff",
      color: "#0f172a",
      fontSize: 14,
      boxSizing: "border-box",
    },
    select: {
      height: 44,
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      padding: "0 12px",
      outline: "none",
      background: "#fff",
      color: "#0f172a",
      fontSize: 14,
      boxSizing: "border-box",
    },

    btn: (variant, smallBtn) => ({
      height: smallBtn ? 34 : 42,
      padding: smallBtn ? "0 10px" : "0 14px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      background: variant === "primary" ? "#0f172a" : "#ffffff",
      color: variant === "primary" ? "#ffffff" : "#0f172a",
      cursor: "pointer",
      fontWeight: 900,
      boxShadow: "0 2px 8px rgba(15,23,42,0.10)",
      transition: "transform 0.06s ease, box-shadow 0.12s ease",
      userSelect: "none",
      whiteSpace: "nowrap",
    }),
    btnDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none", boxShadow: "none" },

    tableWrap: { width: "100%", overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1100 },
    th: {
      textAlign: "left",
      fontSize: 12,
      color: "#475569",
      borderBottom: "1px solid #e5e7eb",
      padding: "10px 12px",
      background: "#f8fafc",
      position: "sticky",
      top: 0,
      zIndex: 1,
      whiteSpace: "nowrap",
    },
    td: { borderBottom: "1px solid #f1f5f9", padding: "10px 12px", fontSize: 13, verticalAlign: "top" },

    // colored numbers
    profit: { fontWeight: 900, color: "#166534" }, // green
    loss: { fontWeight: 900, color: "#b91c1c" }, // red
    brokerage: { fontWeight: 900, color: "#0f172a" }, // black bold
    overall: { fontWeight: 900, color: "#9a3412" }, // dark orange
    fund: { fontWeight: 900, color: "#a16207" }, // dark yellow
    rrFollowYes: { fontWeight: 900, color: "#065f46" },
    rrFollowNo: { fontWeight: 900, color: "#9f1239" },
    violetLogic: { color: "#4c1d95", fontWeight: 700 }, // violet
    mistakeRed: { color: "#b91c1c", fontWeight: 800 },

    pill: (style) => ({
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${style.bd}`,
      background: style.bg,
      color: style.fg,
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
    }),

    warn: {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 10,
      border: "1px solid #fecaca",
      background: "#fff1f2",
      color: "#9f1239",
      fontSize: 12,
      fontWeight: 900,
      marginTop: 6,
    },

    // Modal
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      zIndex: 50,
    },
    modal: {
      width: "min(92vw, 420px)",
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
      overflow: "hidden",
      fontFamily: '"Times New Roman", Times, serif',
    },
    modalHead: {
      padding: "12px 14px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    modalTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" },
    modalBody: { padding: "12px 14px", fontSize: 13, color: "#0f172a" },
    modalFoot: {
      padding: "12px 14px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      flexWrap: "wrap",
    },
    xBtn: {
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      borderRadius: 10,
      height: 34,
      width: 34,
      cursor: "pointer",
      fontWeight: 900,
      lineHeight: "32px",
      userSelect: "none",
    },
  };

  const Btn = ({ variant, small, disabled, onClick, children, type = "button" }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={disabled ? undefined : press}
      onMouseUp={disabled ? undefined : release}
      onMouseLeave={disabled ? undefined : release}
      onTouchStart={disabled ? undefined : press}
      onTouchEnd={disabled ? undefined : release}
      style={{
        ...styles.btn(variant, small),
        ...(disabled ? styles.btnDisabled : null),
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.topbar}>
        <h1 style={styles.title}>Investment Report</h1>
        <Btn small variant="primary" onClick={refresh} disabled={busy === "refresh" || loading}>
          {busy === "refresh" || loading ? "..." : "Refresh"}
        </Btn>
      </div>

      <div style={styles.grid}>
        {/* LEFT: FILTERS */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Filters</div>
            <div style={styles.small}>{loading ? "Loading..." : "Optional"}</div>
          </div>

          <div style={styles.form}>
            <select style={styles.select} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
              <option value="">All Platforms</option>
              {platforms.map((p) => (
                <option key={p.platform_id} value={p.platform_id}>
                  {p.platform_name}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              disabled={!platformId}
            >
              <option value="">All Segments</option>
              {segments.map((s) => (
                <option key={s.segment_id} value={s.segment_id}>
                  {s.segment_name}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              disabled={!platformId || !segmentId}
            >
              <option value="">Plan (Optional)</option>
              {plans.map((p) => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.plan_name ? p.plan_name : `Plan #${p.plan_id}`} • RR {p.rr_ratio}
                </option>
              ))}
            </select>

            <input
              style={styles.input}
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
            />
          </div>
        </section>

        {/* RIGHT: REPORT */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Monthly Summary</div>
            <div style={styles.small}>{loading ? "Loading..." : `${monthReport.length} rows`}</div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Month</th>
                  <th style={styles.th}>Profit</th>
                  <th style={styles.th}>Loss</th>
                  <th style={styles.th}>Brokerage</th>
                  <th style={styles.th}>Overall</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Target R:R</th>
                  <th style={styles.th}>Achieved R:R</th>
                  <th style={styles.th}>R:R Follow</th>
                  <th style={styles.th}>Fund</th>
                  <th style={styles.th}>Remaining</th>
                  <th style={styles.th}>Warning</th>
                </tr>
              </thead>
              <tbody>
                {monthReport.map((r, idx) => {
                  const st = statusBadge(r.month_status);
                  const followed = rrFollowedText(r.rr_followed);
                  return (
                    <tr key={idx}>
                      <td style={styles.td}>
                        <b>{fmtMonth(r.month_start)}</b>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.profit}>{safeText(r.total_month_profit)}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.loss}>{safeText(r.total_month_loss)}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.brokerage}>{safeText(r.total_month_brokerage)}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.overall}>{safeText(r.overall_month_pnl)}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.pill(st)}>{st.text}</span>
                      </td>

                      <td style={styles.td}>
                        <b>{rrPretty(r.target_rr_ratio)}</b>
                      </td>

                      <td style={styles.td}>
                        <b>{rrPretty(r.achieved_rr)}</b>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={
                            followed === "Yes"
                              ? styles.rrFollowYes
                              : followed === "No"
                              ? styles.rrFollowNo
                              : { fontWeight: 900 }
                          }
                        >
                          {followed}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.fund}>{safeText(r.plan_fund)}</span>
                      </td>

                      <td style={styles.td}>
                        <b>{safeText(r.fund_remaining)}</b>
                      </td>

                      <td style={styles.td}>
                        {String(r.fund_warning || "").trim() ? (
                          <div style={styles.warn}>{r.fund_warning}</div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loading && monthReport.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={12}>
                      No report rows found for this filter/month.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Mistakes */}
          <div style={{ height: 12 }} />

          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Mistakes Repeat</div>
            <div style={styles.small}>{loading ? "Loading..." : `${mistakeRepeats.length} rows`}</div>
          </div>

          <div style={styles.tableWrap}>
            <table style={{ ...styles.table, minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={styles.th}>Month</th>
                  <th style={styles.th}>Mistake</th>
                  <th style={styles.th}>Count</th>
                </tr>
              </thead>
              <tbody>
                {mistakeRepeats.map((m, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>
                      <b>{fmtMonth(m.month_start)}</b>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.mistakeRed}>{safeText(m.mistake_text)}</span>
                    </td>
                    <td style={styles.td}>
                      <b style={{ color: "#0f172a" }}>{safeText(m.repeat_count)}</b>
                    </td>
                  </tr>
                ))}

                {!loading && mistakeRepeats.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={3}>
                      No repeated mistakes for this filter/month.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* small hint */}
          <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
            Note: “Logic” text is shown in Trading Journal View page. Here we show monthly summary + repeated mistakes.
          </div>
        </section>
      </div>

      {/* Center Modal */}
      {modal.open ? (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalHead}>
              <h3 style={styles.modalTitle}>{modal.title}</h3>
              <button style={styles.xBtn} onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <div style={styles.modalBody}>{modal.message}</div>
            <div style={styles.modalFoot}>
              <Btn variant="primary" onClick={closeModal}>
                {modal.confirmText}
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
