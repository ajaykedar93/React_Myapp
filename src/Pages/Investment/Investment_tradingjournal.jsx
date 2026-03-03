// src/pages/Investment_tradingjournal.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_tradingjournal() {
  // ✅ Token from login page localStorage
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

  // -------------------- NEW: Trade name (Index/Company/Symbol) --------------------
  const [tradeName, setTradeName] = useState("");

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

  // -------------------- helpers --------------------
  const toIntStr = (v) => String(v ?? "").replace(/[^\d]/g, "");
  const toNum = (v) => (v === "" ? NaN : Number(v));

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

    // ✅ create journal for new API (trade_name only)
    async createJournal(payload) {
      const res = await fetch(`${BASE_URL}/api/investment/tradingjournal`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Journal create failed");
      return data?.data;
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

  // -------------------- validation --------------------
  const validateMain = () => {
    if (!platformId) return "Select platform";
    if (!segmentId) return "Select segment";
    if (!tradeDate) return "Trade date required";

    if (!String(tradeName || "").trim()) return "Trade name (Index/Company) required";
    if (!tradeLogic.trim()) return "Trade logic required";

    const p = toNum(profit);
    const l = toNum(loss);
    const b = toNum(brokerage);

    if (!Number.isFinite(p) || p < 0) return "Profit must be 0 or more";
    if (!Number.isFinite(l) || l < 0) return "Loss must be 0 or more";
    if (!Number.isFinite(b) || b < 0) return "Brokerage must be 0 or more";

    const ok = (p === 0 && l > 0) || (l === 0 && p > 0) || (p === 0 && l === 0);
    if (!ok) return "Either Profit OR Loss should be > 0 (both cannot be > 0 together)";
    if (p === 0 && l === 0 && b > 0) return "Brokerage not allowed when profit=loss=0";

    return "";
  };

  // -------------------- submit --------------------
  const onSubmit = async (e) => {
    e.preventDefault();

    const v1 = validateMain();
    if (v1) return fail(v1);

    const payload = {
      platform_id: Number(platformId),
      segment_id: Number(segmentId),
      plan_id: planId ? Number(planId) : null,
      trade_date: tradeDate,

      trade_name: String(tradeName).trim(),

      profit: Number(profit),
      loss: Number(loss),
      brokerage: Number(brokerage),

      trade_logic: tradeLogic.trim(),
      mistakes: mistakes?.trim() ? mistakes.trim() : null,
    };

    try {
      setBusy("save");
      await api.createJournal(payload);
      toast("Trade saved");

      // reset form
      setTradeName("");
      setTradeLogic("");
      setMistakes("");
      setProfit("0");
      setLoss("0");
      setBrokerage("0");
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusy("");
    }
  };

  // -------------------- responsive --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1024);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // -------------------- styles --------------------
  const styles = {
    page: {
      width: "100%",
      minHeight: "100vh",
      margin: 0,
      padding: 0,
      fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      color: "#0b1220",
      background:
        "radial-gradient(1200px 600px at 10% 0%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(900px 500px at 100% 30%, rgba(34,197,94,0.14), transparent 55%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      paddingBottom: 40,
      boxSizing: "border-box",
    },

    topbar: {
      width: "100%",
      position: "sticky",
      top: 0,
      zIndex: 10,
      backdropFilter: "blur(10px)",
      background: "rgba(255,255,255,0.75)",
      borderBottom: "1px solid rgba(148,163,184,0.35)",
    },
    topbarInner: {
      maxWidth: 900,
      margin: "0 auto",
      padding: "14px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    titleWrap: { display: "flex", flexDirection: "column", gap: 2 },
    title: { margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: 0.2 },
    subtitle: { margin: 0, fontSize: 12, color: "#475569", fontWeight: 600 },

    grid: {
      maxWidth: 900,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: wide ? "1fr" : "1fr",
      gap: 14,
      padding: 14,
      boxSizing: "border-box",
    },

    card: {
      border: "1px solid rgba(148,163,184,0.35)",
      background: "rgba(255,255,255,0.88)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 10px 25px rgba(2,6,23,0.06)",
      transition: "transform .18s ease, box-shadow .18s ease",
    },
    cardHover: {
      transform: "translateY(-1px)",
      boxShadow: "0 18px 38px rgba(2,6,23,0.10)",
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid rgba(148,163,184,0.25)",
      background: "linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.6))",
      padding: "12px 12px",
    },
    cardTitle: { margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: 0.2 },
    small: { margin: 0, fontSize: 12, color: "#64748b", fontWeight: 700 },

    form: { padding: 12, display: "grid", gap: 10 },
    row2: { display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 10 },
    row3: { display: "grid", gridTemplateColumns: wide ? "1fr 1fr 1fr" : "1fr", gap: 10 },

    label: { fontSize: 12, color: "#475569", fontWeight: 800, marginBottom: 6 },
    field: { display: "flex", flexDirection: "column" },

    input: {
      height: 42,
      borderRadius: 12,
      border: "1px solid rgba(148,163,184,0.55)",
      padding: "0 12px",
      outline: "none",
      background: "#fff",
      color: "#0b1220",
      fontSize: 13,
      boxSizing: "border-box",
      transition: "box-shadow .16s ease, border-color .16s ease, transform .06s ease",
    },
    textarea: {
      minHeight: 92,
      borderRadius: 12,
      border: "1px solid rgba(148,163,184,0.55)",
      padding: "10px 12px",
      outline: "none",
      background: "#fff",
      color: "#0b1220",
      resize: "vertical",
      fontSize: 13,
      boxSizing: "border-box",
      transition: "box-shadow .16s ease, border-color .16s ease",
    },
    select: {
      height: 42,
      borderRadius: 12,
      border: "1px solid rgba(148,163,184,0.55)",
      padding: "0 12px",
      outline: "none",
      background: "#fff",
      color: "#0b1220",
      fontSize: 13,
      boxSizing: "border-box",
      transition: "box-shadow .16s ease, border-color .16s ease",
    },

    focus: {
      borderColor: "rgba(99,102,241,0.7)",
      boxShadow: "0 0 0 4px rgba(99,102,241,0.12)",
    },

    divider: { height: 1, background: "rgba(148,163,184,0.25)", margin: "6px 0" },

    btnRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
    btn: (variant, small) => ({
      height: small ? 32 : 38,
      padding: small ? "0 10px" : "0 12px",
      borderRadius: 12,
      border: "1px solid rgba(148,163,184,0.5)",
      background:
        variant === "primary"
          ? "linear-gradient(135deg, #111827 0%, #334155 100%)"
          : variant === "danger"
          ? "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)"
          : "rgba(255,255,255,0.95)",
      color: variant === "primary" || variant === "danger" ? "#ffffff" : "#0b1220",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      letterSpacing: 0.2,
      boxShadow: "0 8px 18px rgba(2,6,23,0.10)",
      transition: "transform .12s ease, box-shadow .12s ease, filter .12s ease",
      userSelect: "none",
      whiteSpace: "nowrap",
    }),
    btnDisabled: { opacity: 0.55, cursor: "not-allowed", transform: "none", boxShadow: "none" },

    pill: {
      display: "inline-flex",
      gap: 8,
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(148,163,184,0.35)",
      background: "rgba(255,255,255,0.7)",
      fontSize: 12,
      fontWeight: 900,
      color: "#0b1220",
    },

    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(2,6,23,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      zIndex: 50,
      animation: "fadeIn .14s ease",
    },
    modal: {
      width: "min(92vw, 420px)",
      background: "#ffffff",
      borderRadius: 18,
      border: "1px solid rgba(148,163,184,0.35)",
      boxShadow: "0 22px 60px rgba(0,0,0,0.30)",
      overflow: "hidden",
      animation: "popIn .16s ease",
    },
    modalHead: {
      padding: "12px 14px",
      borderBottom: "1px solid rgba(148,163,184,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      background: "rgba(248,250,252,0.9)",
    },
    modalTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: "#0b1220" },
    modalBody: { padding: "12px 14px", fontSize: 13, color: "#0b1220" },
    modalFoot: {
      padding: "12px 14px",
      borderTop: "1px solid rgba(148,163,184,0.25)",
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      flexWrap: "wrap",
      background: "rgba(255,255,255,0.9)",
    },
    xBtn: {
      border: "1px solid rgba(148,163,184,0.45)",
      background: "#ffffff",
      borderRadius: 10,
      height: 32,
      width: 32,
      cursor: "pointer",
      fontWeight: 900,
      lineHeight: "30px",
      userSelect: "none",
      transition: "transform .12s ease",
    },
  };

  // -------- button with micro animation ----------
  const press = (e) => (e.currentTarget.style.transform = "translateY(1px) scale(0.99)");
  const release = (e) => (e.currentTarget.style.transform = "translateY(0px) scale(1)");

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
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.filter = "brightness(1.03)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(2,6,23,0.16)";
      }}
      onMouseOut={(e) => {
        if (disabled) return;
        e.currentTarget.style.filter = "none";
        e.currentTarget.style.boxShadow = "0 8px 18px rgba(2,6,23,0.10)";
      }}
    >
      {children}
    </button>
  );

  // minimal helper for focus ring
  const useFocusStyle = () => {
    const [focused, setFocused] = useState(false);
    return {
      focused,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    };
  };

  const withFocus = (baseStyle) => ({
    ...baseStyle,
    ...(baseStyle._focused ? styles.focus : null),
  });

  const Field = ({ label, children }) => (
    <div style={styles.field}>
      {label ? <div style={styles.label}>{label}</div> : null}
      {children}
    </div>
  );

  // focus hooks
  const fPlatform = useFocusStyle();
  const fSegment = useFocusStyle();
  const fPlan = useFocusStyle();
  const fDate = useFocusStyle();
  const fProfit = useFocusStyle();
  const fLoss = useFocusStyle();
  const fBroker = useFocusStyle();
  const fLogic = useFocusStyle();
  const fMist = useFocusStyle();
  const fName = useFocusStyle();

  return (
    <div style={styles.page}>
      {/* Fonts + animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        @keyframes popIn { from { transform: translateY(8px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Header */}
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Investment Trading Journal</h1>
            <p style={styles.subtitle}>Only Add Entry (No list below)</p>
          </div>

          <div style={styles.btnRow}>
            <span style={styles.pill}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: token ? "#22c55e" : "#ef4444" }} />
              {token ? "Authorized" : "No Token"}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* ONLY: ADD TRADE */}
        <HoverCard styles={styles}>
          <section>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>Add Trade</div>
                <div style={styles.small}>Platform + Segment + Trade Name</div>
              </div>
              <div style={styles.small}>Single Entry</div>
            </div>

            <form style={styles.form} onSubmit={onSubmit} noValidate>
              <div style={styles.row2}>
                <Field label="Platform">
                  <select
                    style={withFocus({ ...styles.select, _focused: fPlatform.focused })}
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    onFocus={fPlatform.onFocus}
                    onBlur={fPlatform.onBlur}
                  >
                    <option value="">Select Platform</option>
                    {platforms.map((p) => (
                      <option key={p.platform_id} value={p.platform_id}>
                        {p.platform_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Segment">
                  <select
                    style={withFocus({ ...styles.select, _focused: fSegment.focused })}
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    disabled={!platformId}
                    onFocus={fSegment.onFocus}
                    onBlur={fSegment.onBlur}
                  >
                    <option value="">Select Segment</option>
                    {segments.map((s) => (
                      <option key={s.segment_id} value={s.segment_id}>
                        {s.segment_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={styles.row2}>
                <Field label="Plan (Optional)">
                  <select
                    style={withFocus({ ...styles.select, _focused: fPlan.focused })}
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    disabled={!platformId || !segmentId}
                    onFocus={fPlan.onFocus}
                    onBlur={fPlan.onBlur}
                  >
                    <option value="">Plan (Optional)</option>
                    {plans.map((p) => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {p.plan_name ? p.plan_name : `Plan #${p.plan_id}`} • RR {p.rr_ratio}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Trade Date">
                  <input
                    style={withFocus({ ...styles.input, _focused: fDate.focused })}
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    onFocus={fDate.onFocus}
                    onBlur={fDate.onBlur}
                  />
                </Field>
              </div>

              {/* Trade Name */}
              <Field label="Trade Name (Index / Company / Symbol)">
                <input
                  style={withFocus({ ...styles.input, _focused: fName.focused })}
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g., NIFTY / BANKNIFTY / RELIANCE / GOLD / USDINR"
                  onFocus={fName.onFocus}
                  onBlur={fName.onBlur}
                />
              </Field>

              <div style={styles.row3}>
                <Field label="Profit">
                  <input
                    style={withFocus({ ...styles.input, _focused: fProfit.focused })}
                    value={profit}
                    onChange={(e) => setProfit(toIntStr(e.target.value))}
                    inputMode="numeric"
                    placeholder="0"
                    onFocus={fProfit.onFocus}
                    onBlur={fProfit.onBlur}
                  />
                </Field>

                <Field label="Loss">
                  <input
                    style={withFocus({ ...styles.input, _focused: fLoss.focused })}
                    value={loss}
                    onChange={(e) => setLoss(toIntStr(e.target.value))}
                    inputMode="numeric"
                    placeholder="0"
                    onFocus={fLoss.onFocus}
                    onBlur={fLoss.onBlur}
                  />
                </Field>

                <Field label="Brokerage">
                  <input
                    style={withFocus({ ...styles.input, _focused: fBroker.focused })}
                    value={brokerage}
                    onChange={(e) => setBrokerage(toIntStr(e.target.value))}
                    inputMode="numeric"
                    placeholder="0"
                    onFocus={fBroker.onFocus}
                    onBlur={fBroker.onBlur}
                  />
                </Field>
              </div>

              <Field label="Trade Logic (Required)">
                <textarea
                  style={withFocus({ ...styles.textarea, _focused: fLogic.focused })}
                  value={tradeLogic}
                  onChange={(e) => setTradeLogic(e.target.value)}
                  placeholder="Example: Breakout + volume confirmation..."
                  onFocus={fLogic.onFocus}
                  onBlur={fLogic.onBlur}
                />
              </Field>

              <Field label="Mistakes (Optional)">
                <textarea
                  style={withFocus({ ...styles.textarea, _focused: fMist.focused })}
                  value={mistakes}
                  onChange={(e) => setMistakes(e.target.value)}
                  placeholder="Example: entered early / ignored SL..."
                  onFocus={fMist.onFocus}
                  onBlur={fMist.onBlur}
                />
              </Field>

              <div style={styles.divider} />

              <div style={styles.btnRow}>
                <Btn type="submit" variant="primary" disabled={busy === "save"}>
                  {busy === "save" ? "Saving..." : "Save Trade"}
                </Btn>
              </div>
            </form>
          </section>
        </HoverCard>
      </div>

      {/* Modal */}
      {modal.open ? (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalHead}>
              <h3 style={styles.modalTitle}>{modal.title}</h3>
              <button
                style={styles.xBtn}
                onClick={closeModal}
                aria-label="Close"
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
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

/** Small helper: hover-lift card wrapper */
function HoverCard({ styles, children }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...styles.card, ...(hover ? styles.cardHover : null) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </div>
  );
}