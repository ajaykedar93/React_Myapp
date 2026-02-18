// src/pages/Investment_tradingjournal.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_tradingjournal() {
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

  const selectedSegment = useMemo(
    () => segments.find((s) => String(s.segment_id) === String(segmentId)) || null,
    [segments, segmentId]
  );
  const isOptionsSegment = !!selectedSegment?.is_options;

  // -------------------- form fields --------------------
  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const [tradeDate, setTradeDate] = useState(todayISO);

  const [profit, setProfit] = useState("0");
  const [loss, setLoss] = useState("0");
  const [brokerage, setBrokerage] = useState("0");

  const [tradeLogic, setTradeLogic] = useState("");
  const [mistakes, setMistakes] = useState("");

  // multiple rows
  const [optionRows, setOptionRows] = useState([
    { strike_price: "", option_type: "CE", entry_price: "", exit_price: "", quantity: "" },
  ]);
  const [stockRows, setStockRows] = useState([{ stock_name: "", entry_price: "", exit_price: "", quantity: "" }]);

  // -------------------- list/view --------------------
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  const [dailyRows, setDailyRows] = useState([]);
  const [detailsMap, setDetailsMap] = useState({});
  const [openJournalId, setOpenJournalId] = useState(null);

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

  const closeModal = () => setModal((m) => ({ ...m, open: false, onConfirm: null, title: "", message: "" }));

  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

  // -------------------- helpers --------------------
  const toIntStr = (v) => String(v ?? "").replace(/[^\d]/g, "");
  const toNum = (v) => (v === "" ? NaN : Number(v));

  // Date format: "1 Jan 2026"
  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value); // supports YYYY-MM-DD
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
  };

  // click/tap effect
  const press = (e) => (e.currentTarget.style.transform = "scale(0.98)");
  const release = (e) => (e.currentTarget.style.transform = "scale(1)");

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
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/segment?platform_id=${pid}`, { headers });
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

    async createJournal(payload) {
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Journal create failed");
      return data?.data;
    },

    async getDailySummary({ platform_name, segment_name, plan_id, month }) {
      const qs = new URLSearchParams();
      if (platform_name) qs.set("platform_name", platform_name);
      if (segment_name) qs.set("segment_name", segment_name);
      if (plan_id) qs.set("plan_id", String(plan_id));
      if (month) qs.set("month", month);
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/daily-summary?${qs.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Daily summary fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getEntryDetails({ journal_id, month }) {
      const qs = new URLSearchParams();
      if (journal_id) qs.set("journal_id", String(journal_id));
      if (month) qs.set("month", month);
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal-view/entry-details?${qs.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Entry details fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async deleteJournal(journal_id) {
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal/${journal_id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Journal delete failed");
      return true;
    },
  };

  // -------------------- load platforms --------------------
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

  // -------------------- load segments when platform changes --------------------
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

  // -------------------- load plans when segment changes --------------------
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

  // -------------------- reset rows when segment changes --------------------
  useEffect(() => {
    setOptionRows([{ strike_price: "", option_type: "CE", entry_price: "", exit_price: "", quantity: "" }]);
    setStockRows([{ stock_name: "", entry_price: "", exit_price: "", quantity: "" }]);
  }, [isOptionsSegment]);

  // -------------------- load daily summary list --------------------
  const refreshDaily = async () => {
    try {
      setLoading(true);

      const pName = platforms.find((p) => String(p.platform_id) === String(platformId))?.platform_name || "";
      const sName = segments.find((s) => String(s.segment_id) === String(segmentId))?.segment_name || "";

      const rows = await api.getDailySummary({
        platform_name: platformId ? pName : null,
        segment_name: segmentId ? sName : null,
        plan_id: planId ? Number(planId) : null,
        month: monthFilter,
      });

      setDailyRows(rows);
    } catch (e) {
      fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, platformId, segmentId, planId]);

  // -------------------- validation --------------------
  const validateMain = () => {
    if (!platformId) return "Select platform";
    if (!segmentId) return "Select segment";
    if (!tradeDate) return "Trade date required";
    if (!tradeLogic.trim()) return "Trade logic required";

    const p = toNum(profit);
    const l = toNum(loss);
    const b = toNum(brokerage);

    if (!Number.isFinite(p) || p < 0) return "Profit must be 0 or more";
    if (!Number.isFinite(l) || l < 0) return "Loss must be 0 or more";
    if (!Number.isFinite(b) || b < 0) return "Brokerage must be 0 or more";

    const ok = (p === 0 && l > 0) || (l === 0 && p > 0) || (p === 0 && l === 0);
    if (!ok) return "Either Profit OR Loss should be > 0 (both cannot be > 0 together)";
    return "";
  };

  const validateRows = () => {
    if (isOptionsSegment) {
      if (!optionRows.length) return "Add at least one options row";
      for (let i = 0; i < optionRows.length; i++) {
        const r = optionRows[i];
        const sp = Number(r.strike_price);
        const ep = Number(r.entry_price);
        const xp = Number(r.exit_price);
        const q = Number(r.quantity);

        if (!Number.isFinite(sp) || sp <= 0) return `Row ${i + 1}: strike_price required`;
        if (!["CE", "PE"].includes(r.option_type)) return `Row ${i + 1}: option_type must be CE/PE`;
        if (!Number.isFinite(ep) || ep <= 0) return `Row ${i + 1}: entry_price required`;
        if (!Number.isFinite(xp) || xp <= 0) return `Row ${i + 1}: exit_price required`;
        if (!Number.isFinite(q) || q <= 0) return `Row ${i + 1}: quantity required`;
      }
    } else {
      if (!stockRows.length) return "Add at least one row";
      for (let i = 0; i < stockRows.length; i++) {
        const r = stockRows[i];
        const ep = Number(r.entry_price);
        const xp = Number(r.exit_price);
        const q = Number(r.quantity);

        if (!String(r.stock_name || "").trim()) return `Row ${i + 1}: name required`;
        if (!Number.isFinite(ep) || ep <= 0) return `Row ${i + 1}: entry_price required`;
        if (!Number.isFinite(xp) || xp <= 0) return `Row ${i + 1}: exit_price required`;
        if (!Number.isFinite(q) || q <= 0) return `Row ${i + 1}: quantity required`;
      }
    }
    return "";
  };

  // -------------------- submit --------------------
  const onSubmit = async (e) => {
    e.preventDefault();

    const v1 = validateMain();
    if (v1) return fail(v1);

    const v2 = validateRows();
    if (v2) return fail(v2);

    const payload = {
      platform_id: Number(platformId),
      segment_id: Number(segmentId),
      plan_id: planId ? Number(planId) : null,
      trade_date: tradeDate,

      profit: Number(profit),
      loss: Number(loss),
      brokerage: Number(brokerage),

      trade_logic: tradeLogic.trim(),
      mistakes: mistakes?.trim() ? mistakes.trim() : null,

      options: isOptionsSegment
        ? optionRows.map((r) => ({
            strike_price: Number(r.strike_price),
            option_type: r.option_type,
            entry_price: Number(r.entry_price),
            exit_price: Number(r.exit_price),
            quantity: Number(r.quantity),
          }))
        : [],
      stocks: !isOptionsSegment
        ? stockRows.map((r) => ({
            stock_name: String(r.stock_name).trim(),
            entry_price: Number(r.entry_price),
            exit_price: Number(r.exit_price),
            quantity: Number(r.quantity),
          }))
        : [],
    };

    try {
      setBusy("save");
      await api.createJournal(payload);
      toast("Trade saved");

      setTradeLogic("");
      setMistakes("");
      setProfit("0");
      setLoss("0");
      setBrokerage("0");

      setOptionRows([{ strike_price: "", option_type: "CE", entry_price: "", exit_price: "", quantity: "" }]);
      setStockRows([{ stock_name: "", entry_price: "", exit_price: "", quantity: "" }]);

      await refreshDaily();
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusy("");
    }
  };

  // -------------------- details toggle --------------------
  const toggleDetails = async (journal_id) => {
    if (openJournalId === journal_id) {
      setOpenJournalId(null);
      return;
    }
    setOpenJournalId(journal_id);

    if (!detailsMap[journal_id]) {
      try {
        setBusy(`details-${journal_id}`);
        const d = await api.getEntryDetails({ journal_id, month: monthFilter });
        setDetailsMap((prev) => ({ ...prev, [journal_id]: d }));
      } catch (e) {
        fail(e.message);
      } finally {
        setBusy("");
      }
    }
  };

  const onDelete = (journal_id) => {
    openModal({
      type: "confirm",
      title: "Delete Entry?",
      message: "This journal entry will be deleted permanently.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setBusy(`del-${journal_id}`);
          await api.deleteJournal(journal_id);
          toast("Deleted");

          setOpenJournalId(null);
          setDetailsMap((prev) => {
            const copy = { ...prev };
            delete copy[journal_id];
            return copy;
          });

          await refreshDaily();
        } catch (e) {
          fail(e.message);
        } finally {
          setBusy("");
          closeModal();
        }
      },
    });
  };

  // -------------------- row editors --------------------
  const updateOptionRow = (i, key, val) => {
    setOptionRows((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: val };
      return copy;
    });
  };
  const addOptionRow = () =>
    setOptionRows((prev) => [...prev, { strike_price: "", option_type: "CE", entry_price: "", exit_price: "", quantity: "" }]);
  const removeOptionRow = (i) => setOptionRows((prev) => prev.filter((_, idx) => idx !== i));

  const updateStockRow = (i, key, val) => {
    setStockRows((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: val };
      return copy;
    });
  };
  const addStockRow = () => setStockRows((prev) => [...prev, { stock_name: "", entry_price: "", exit_price: "", quantity: "" }]);
  const removeStockRow = (i) => setStockRows((prev) => prev.filter((_, idx) => idx !== i));

  // -------------------- responsive --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1100 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1100);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // -------------------- styles --------------------
  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      margin: 0,
      padding: 0,
      background: "#ffffff",
      color: "#0f172a",
      fontFamily: '"Times New Roman", Times, serif',
      paddingBottom: 90, // ✅ space at bottom so mobile button not touch
      boxSizing: "border-box",
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
      gridTemplateColumns: wide ? "1.1fr 1.5fr" : "1fr",
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
    row2: { display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 10 },
    row3: { display: "grid", gridTemplateColumns: wide ? "1fr 1fr 1fr" : "1fr", gap: 10 },

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
    textarea: {
      minHeight: 92,
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      padding: "10px 12px",
      outline: "none",
      background: "#fff",
      color: "#0f172a",
      resize: "vertical",
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

    btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
    btn: (variant, small) => ({
      height: small ? 34 : 42,
      padding: small ? "0 10px" : "0 14px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      background: variant === "primary" ? "#0f172a" : variant === "danger" ? "#b91c1c" : "#ffffff",
      color: variant === "primary" || variant === "danger" ? "#ffffff" : "#0f172a",
      cursor: "pointer",
      fontWeight: 900,
      boxShadow: "0 2px 8px rgba(15,23,42,0.10)",
      transition: "transform 0.06s ease, box-shadow 0.12s ease",
      userSelect: "none",
      whiteSpace: "nowrap",
    }),
    btnDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none", boxShadow: "none" },

    divider: { height: 1, background: "#e5e7eb", margin: "6px 0" },

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
    td: {
      borderBottom: "1px solid #f1f5f9",
      padding: "10px 12px",
      fontSize: 13,
      verticalAlign: "top",
      background: "#fff",
    },

    // ✅ profit/loss/brokerage colors (text only)
    profitText: { fontWeight: 900, color: "#166534" },
    lossText: { fontWeight: 900, color: "#b91c1c" },
    brokerageText: { fontWeight: 900, color: "#a16207" }, // dark yellow

    netPill: (v) => ({
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

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.topbar}>
        <h1 style={styles.title}>Investment Trading Journal</h1>

        <Btn small variant="primary" disabled={loading} onClick={refreshDaily}>
          {loading ? "..." : "Refresh"}
        </Btn>
      </div>

      <div style={styles.grid}>
        {/* LEFT: ADD TRADE */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Add Trade</div>
            <div style={styles.small}>{isOptionsSegment ? "Options" : "Stocks / Gold / Currency"}</div>
          </div>

          <form style={styles.form} onSubmit={onSubmit} noValidate>
            <div style={styles.row2}>
              <select style={styles.select} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                <option value="">Select Platform</option>
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
                <option value="">Select Segment</option>
                {segments.map((s) => (
                  <option key={s.segment_id} value={s.segment_id}>
                    {s.segment_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.row2}>
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

              <input style={styles.input} type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
            </div>

            <div style={styles.row3}>
              <input
                style={styles.input}
                value={profit}
                onChange={(e) => setProfit(toIntStr(e.target.value))}
                inputMode="numeric"
                placeholder="Profit"
              />
              <input
                style={styles.input}
                value={loss}
                onChange={(e) => setLoss(toIntStr(e.target.value))}
                inputMode="numeric"
                placeholder="Loss"
              />
              <input
                style={styles.input}
                value={brokerage}
                onChange={(e) => setBrokerage(toIntStr(e.target.value))}
                inputMode="numeric"
                placeholder="Brokerage"
              />
            </div>

            <textarea
              style={styles.textarea}
              value={tradeLogic}
              onChange={(e) => setTradeLogic(e.target.value)}
              placeholder="Trade Logic (required)"
            />

            <textarea
              style={styles.textarea}
              value={mistakes}
              onChange={(e) => setMistakes(e.target.value)}
              placeholder="Mistakes (optional)"
            />

            <div style={styles.divider} />

            {isOptionsSegment ? (
              <div>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Options Entries</div>

                {optionRows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: wide ? "1fr .7fr .7fr 1fr 1fr auto" : "1fr",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <input
                      style={styles.input}
                      value={r.strike_price}
                      onChange={(e) => updateOptionRow(i, "strike_price", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Strike (e.g., 25500)"
                      inputMode="decimal"
                    />

                    <select
                      style={styles.select}
                      value={r.option_type}
                      onChange={(e) => updateOptionRow(i, "option_type", e.target.value)}
                    >
                      <option value="CE">CE</option>
                      <option value="PE">PE</option>
                    </select>

                    <input
                      style={styles.input}
                      value={r.quantity}
                      onChange={(e) => updateOptionRow(i, "quantity", toIntStr(e.target.value))}
                      placeholder="Qty"
                      inputMode="numeric"
                    />

                    <input
                      style={styles.input}
                      value={r.entry_price}
                      onChange={(e) => updateOptionRow(i, "entry_price", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Entry (e.g., 20)"
                      inputMode="decimal"
                    />

                    <input
                      style={styles.input}
                      value={r.exit_price}
                      onChange={(e) => updateOptionRow(i, "exit_price", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Exit (e.g., 25)"
                      inputMode="decimal"
                    />

                    <Btn variant="danger" disabled={optionRows.length === 1} onClick={() => removeOptionRow(i)}>
                      Remove
                    </Btn>
                  </div>
                ))}

                <div style={styles.btnRow}>
                  <Btn onClick={addOptionRow}>+ Add Row</Btn>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Stock / Gold / Currency Entries</div>

                {stockRows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: wide ? "1.3fr .7fr 1fr 1fr auto" : "1fr",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <input
                      style={styles.input}
                      value={r.stock_name}
                      onChange={(e) => updateStockRow(i, "stock_name", e.target.value)}
                      placeholder="Name (e.g., RELIANCE / GOLD / USDINR)"
                    />

                    <input
                      style={styles.input}
                      value={r.quantity}
                      onChange={(e) => updateStockRow(i, "quantity", toIntStr(e.target.value))}
                      placeholder="Qty"
                      inputMode="numeric"
                    />

                    <input
                      style={styles.input}
                      value={r.entry_price}
                      onChange={(e) => updateStockRow(i, "entry_price", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Entry (e.g., 1200)"
                      inputMode="decimal"
                    />

                    <input
                      style={styles.input}
                      value={r.exit_price}
                      onChange={(e) => updateStockRow(i, "exit_price", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Exit (e.g., 1210)"
                      inputMode="decimal"
                    />

                    <Btn variant="danger" disabled={stockRows.length === 1} onClick={() => removeStockRow(i)}>
                      Remove
                    </Btn>
                  </div>
                ))}

                <div style={styles.btnRow}>
                  <Btn onClick={addStockRow}>+ Add Row</Btn>
                </div>
              </div>
            )}

            <div style={styles.divider} />

            <div style={styles.btnRow}>
              <Btn type="submit" variant="primary" disabled={busy === "save"}>
                {busy === "save" ? "Saving..." : "Save Trade"}
              </Btn>
            </div>
          </form>
        </section>

        {/* RIGHT: LIST + DETAILS */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Trades (Monthly)</div>
            <div style={styles.small}>
              <input
                style={{ ...styles.input, height: 36, width: 170 }}
                type="month"
                value={monthFilter.slice(0, 7)}
                onChange={(e) => setMonthFilter(`${e.target.value}-01`)}
              />
            </div>
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
                {dailyRows.map((r) => {
                  const opened = openJournalId === r.journal_id;
                  const net = Number(r.net_total ?? 0);

                  return (
                    <React.Fragment key={r.journal_id}>
                      <tr>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 900 }}>{formatDate(r.trade_date)}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>#{r.journal_id}</div>
                        </td>
                        <td style={styles.td}>{r.platform_name}</td>
                        <td style={styles.td}>{r.segment_name}</td>

                        <td style={styles.td}>
                          <span style={styles.profitText}>{r.profit}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.lossText}>{r.loss}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.brokerageText}>{r.brokerage}</span>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.netPill(net)}>{r.net_total}</span>
                        </td>

                        <td style={styles.td}>
                          <div style={{ fontSize: 12 }}>{r.trade_logic}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{r.mistakes ? r.mistakes : "-"}</div>
                        </td>

                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Btn onClick={() => toggleDetails(r.journal_id)} disabled={busy === `details-${r.journal_id}`}>
                              {busy === `details-${r.journal_id}` ? "..." : opened ? "Hide" : "Details"}
                            </Btn>

                            <Btn variant="danger" onClick={() => onDelete(r.journal_id)} disabled={busy === `del-${r.journal_id}`}>
                              {busy === `del-${r.journal_id}` ? "..." : "Delete"}
                            </Btn>
                          </div>
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
                                      <td style={styles.subTd}>{d.trade_type === "OPTIONS" ? d.symbol : d.stock_name}</td>
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

                {!loading && dailyRows.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={10}>
                      No trades found for this month.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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
              {modal.type === "confirm" ? (
                <>
                  <Btn onClick={closeModal}>{modal.cancelText}</Btn>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (typeof modal.onConfirm === "function") modal.onConfirm();
                      else closeModal();
                    }}
                  >
                    {modal.confirmText}
                  </Btn>
                </>
              ) : (
                <Btn variant="primary" onClick={closeModal}>
                  {modal.confirmText}
                </Btn>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
