// src/pages/Investment_getview_trandingjouranal.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_getview_trandingjouranal() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // -------------------- UI state --------------------
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const [modal, setModal] = useState({
    open: false,
    type: "info", // success | error | confirm | info
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const openModal = (p) =>
    setModal((m) => ({
      ...m,
      open: true,
      type: p.type || "info",
      title: p.title || "",
      message: p.message || "",
      confirmText: p.confirmText || "OK",
      cancelText: p.cancelText || "Cancel",
      onConfirm: p.onConfirm || null,
    }));

  const closeModal = () =>
    setModal((m) => ({ ...m, open: false, onConfirm: null, title: "", message: "" }));

  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

  // -------------------- Master data --------------------
  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);

  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");

  // month filter
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  // data from views
  const [dailySummary, setDailySummary] = useState([]);
  const [detailsMap, setDetailsMap] = useState({}); // journal_id -> detail rows
  const [openJournalId, setOpenJournalId] = useState(null);

  // -------------------- click / tap effect --------------------
  const press = (e) => (e.currentTarget.style.transform = "scale(0.98)");
  const release = (e) => (e.currentTarget.style.transform = "scale(1)");

  // -------------------- Responsive --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1100 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1100);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

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

    async getDailySummary({ platform_name, segment_name, month }) {
      const qs = new URLSearchParams();
      if (platform_name) qs.set("platform_name", platform_name);
      if (segment_name) qs.set("segment_name", segment_name);
      if (month) qs.set("month", month);

      const res = await fetch(
        `${BASE_URL}/api/investment/tradingjournal-view/daily-summary?${qs.toString()}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Daily summary fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getEntryDetails({ journal_id, month }) {
      const qs = new URLSearchParams();
      if (journal_id) qs.set("journal_id", String(journal_id));
      if (month) qs.set("month", month);

      const res = await fetch(
        `${BASE_URL}/api/investment/tradingjournal-view/entry-details?${qs.toString()}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Entry details fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
  };

  // -------------------- Load platforms on mount --------------------
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

  // Load segments when platform changes
  useEffect(() => {
    (async () => {
      try {
        setSegments([]);
        setSegmentId("");
        if (!platformId) return;
        const s = await api.getSegments(platformId);
        setSegments(s);
      } catch (e) {
        fail(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  // -------------------- Refresh daily summary --------------------
  const refresh = async () => {
    try {
      setLoading(true);
      setBusy("refresh");

      const platform_name =
        platforms.find((p) => String(p.platform_id) === String(platformId))?.platform_name || "";
      const segment_name =
        segments.find((s) => String(s.segment_id) === String(segmentId))?.segment_name || "";

      const rows = await api.getDailySummary({
        platform_name: platformId ? platform_name : null,
        segment_name: segmentId ? segment_name : null,
        month,
      });

      setDailySummary(rows);
      toast("Loaded");
    } catch (e) {
      fail(e.message);
    } finally {
      setBusy("");
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, platformId, segmentId]);

  // -------------------- Details toggle --------------------
  const toggleDetails = async (journal_id) => {
    if (openJournalId === journal_id) {
      setOpenJournalId(null);
      return;
    }
    setOpenJournalId(journal_id);

    if (!detailsMap[journal_id]) {
      try {
        setBusy(`details-${journal_id}`);
        const d = await api.getEntryDetails({ journal_id, month });
        setDetailsMap((prev) => ({ ...prev, [journal_id]: d }));
      } catch (e) {
        fail(e.message);
      } finally {
        setBusy("");
      }
    }
  };

  // -------------------- UI Styles (mobile-first, clean, full width) --------------------
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
      gridTemplateColumns: wide ? "360px 1fr" : "1fr",
      gap: 12,
      padding: "12px",
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
    row2: { display: "grid", gridTemplateColumns: wide ? "1fr auto" : "1fr", gap: 10 },

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

    btn: (variant, small) => ({
      height: small ? 34 : 42,
      padding: small ? "0 10px" : "0 14px",
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
    table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
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

    pillNet: (v) => ({
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      fontSize: 12,
      fontWeight: 900,
      background: v > 0 ? "#ecfdf5" : v < 0 ? "#fff1f2" : "#f8fafc",
      color: v > 0 ? "#065f46" : v < 0 ? "#9f1239" : "#0f172a",
    }),

    subTable: { width: "100%", borderCollapse: "collapse", marginTop: 10, minWidth: 600 },
    subTd: { borderBottom: "1px solid #eef2ff", padding: "8px 10px", fontSize: 12 },
    hint: { margin: "12px 12px 14px", fontSize: 12, color: "#64748b" },

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
        <h1 style={styles.title}>Investment Trading Journal View</h1>
        <Btn small variant="primary" disabled={busy === "refresh" || loading} onClick={refresh}>
          {busy === "refresh" || loading ? "..." : "Refresh"}
        </Btn>
      </div>

      <div style={styles.grid}>
        {/* LEFT FILTERS */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Filters</div>
            <div style={styles.small}>Optional</div>
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

            <input
              style={styles.input}
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
            />

            <div style={styles.hint}>
              Click <b>Details</b> to see entry rows from <b>entry-details</b> view.
            </div>
          </div>
        </section>

        {/* RIGHT TABLE */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Daily Summary</div>
            <div style={styles.small}>{loading ? "Loading..." : `${dailySummary.length} rows`}</div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Platform</th>
                  <th style={styles.th}>Segment</th>
                  <th style={styles.th}>Profit</th>
                  <th style={styles.th}>Loss</th>
                  <th style={styles.th}>Brokerage</th>
                  <th style={styles.th}>Net</th>
                  <th style={styles.th}>Logic</th>
                  <th style={styles.th}>Mistakes</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {dailySummary.map((r) => {
                  const opened = openJournalId === r.journal_id;
                  const net = Number(r.net_total ?? 0);

                  return (
                    <React.Fragment key={r.journal_id}>
                      <tr>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 900 }}>{r.trade_date}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>#{r.journal_id}</div>
                        </td>
                        <td style={styles.td}>{r.platform_name}</td>
                        <td style={styles.td}>{r.segment_name}</td>
                        <td style={styles.td}>{r.profit}</td>
                        <td style={styles.td}>{r.loss}</td>
                        <td style={styles.td}>{r.brokerage}</td>
                        <td style={styles.td}>
                          <span style={styles.pillNet(net)}>{r.net_total}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: 12 }}>{r.trade_logic}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{r.mistakes ? r.mistakes : "-"}</div>
                        </td>
                        <td style={styles.td}>
                          <Btn
                            small
                            onClick={() => toggleDetails(r.journal_id)}
                            disabled={busy === `details-${r.journal_id}`}
                          >
                            {busy === `details-${r.journal_id}` ? "..." : opened ? "Hide" : "Details"}
                          </Btn>
                        </td>
                      </tr>

                      {opened ? (
                        <tr>
                          <td style={styles.td} colSpan={10}>
                            <div style={{ fontWeight: 900, marginBottom: 8 }}>Entry Details</div>

                            <div style={styles.tableWrap}>
                              <table style={styles.subTable}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Symbol / Name</th>
                                    <th style={styles.th}>CE/PE</th>
                                    <th style={styles.th}>Entry</th>
                                    <th style={styles.th}>Exit</th>
                                    <th style={styles.th}>Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(detailsMap[r.journal_id] || []).map((d, idx) => (
                                    <tr key={idx}>
                                      <td style={styles.subTd}>{d.trade_type}</td>
                                      <td style={styles.subTd}>
                                        {d.trade_type === "OPTIONS" ? d.symbol : d.stock_name}
                                      </td>
                                      <td style={styles.subTd}>{d.option_type ?? "-"}</td>
                                      <td style={styles.subTd}>{d.entry_price}</td>
                                      <td style={styles.subTd}>{d.exit_price}</td>
                                      <td style={styles.subTd}>{d.quantity}</td>
                                    </tr>
                                  ))}

                                  {(detailsMap[r.journal_id] || []).length === 0 ? (
                                    <tr>
                                      <td style={styles.subTd} colSpan={6}>
                                        No details found.
                                      </td>
                                    </tr>
                                  ) : null}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}

                {!loading && dailySummary.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={10}>
                      No rows found for this month/filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={styles.hint}>
            Read-only views page. Create trades from <b>Trading Journal</b> page.
          </div>
        </section>
      </div>

      {/* Center Modal (success/error) */}
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
