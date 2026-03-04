// src/pages/Investment_tradingjournal.jsx
import React, { useEffect, useMemo, useRef, useState, memo } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

/** ✅ Render CSS once */
const PageStyles = memo(function PageStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; padding: 0; }
      body {
        font-family: "Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        -webkit-tap-highlight-color: transparent;
      }

      .page{
        width: 100%;
        min-height: 100vh;
        color: #0b1220;
        background:
          radial-gradient(1200px 600px at 10% 0%, rgba(99,102,241,0.16), transparent 60%),
          radial-gradient(900px 500px at 100% 30%, rgba(34,197,94,0.14), transparent 55%),
          linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        padding-bottom: 24px;
      }

      .topbar{
        position: sticky;
        top: 0;
        z-index: 10;
        backdrop-filter: blur(10px);
        background: rgba(255,255,255,0.75);
        border-bottom: 1px solid rgba(148,163,184,0.35);
      }
      .topbarInner{
        width: 100%;
        padding: 14px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .title{
        margin: 0;
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.2px;
      }
      .subtitle{
        margin: 2px 0 0 0;
        font-size: 12px;
        color: #475569;
        font-weight: 700;
      }

      /* edge-to-edge */
      .grid{
        width: 100%;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
      }

      .card{
        width: 100%;
        border-top: 1px solid rgba(148,163,184,0.35);
        border-bottom: 1px solid rgba(148,163,184,0.35);
        background: rgba(255,255,255,0.90);
        box-shadow: 0 10px 25px rgba(2,6,23,0.06);
        overflow: hidden;
        border-radius: 0;
      }

      @media (hover:hover) and (pointer:fine){
        .card:hover{
          box-shadow: 0 18px 38px rgba(2,6,23,0.10);
        }
      }

      @media (min-width: 900px){
        .grid{ padding: 14px; }
        .card{
          border: 1px solid rgba(148,163,184,0.35);
          border-radius: 16px;
        }
      }

      .cardHeader{
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(148,163,184,0.25);
        background: linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.65));
        padding: 12px 14px;
      }
      .cardTitle{
        margin: 0;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.2px;
      }
      .small{
        margin: 0;
        font-size: 12px;
        color: #64748b;
        font-weight: 800;
      }

      .form{
        padding: 14px;
        display: grid;
        gap: 10px;
      }

      .row2{
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .row3{
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      @media (min-width: 768px){
        .row2{ grid-template-columns: 1fr 1fr; }
        .row3{ grid-template-columns: 1fr 1fr 1fr; }
      }

      .field{ display: flex; flex-direction: column; }
      .label{
        font-size: 12px;
        color: #475569;
        font-weight: 900;
        margin-bottom: 6px;
        user-select: none;
      }

      .input, .select, .textarea{
        border-radius: 12px;
        border: 1px solid rgba(148,163,184,0.55);
        background: #fff;
        color: #0b1220;
        font-size: 13px;
        outline: none;
        transition: box-shadow .16s ease, border-color .16s ease;
        width: 100%;
        touch-action: manipulation;
      }
      .input, .select{
        height: 42px;
        padding: 0 12px;
      }
      .textarea{
        min-height: 92px;
        padding: 10px 12px;
        resize: vertical;
      }
      .input:focus, .select:focus, .textarea:focus{
        border-color: rgba(99,102,241,0.75);
        box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
      }

      .divider{
        height: 1px;
        background: rgba(148,163,184,0.25);
        margin: 6px 0;
      }

      .btnRow{
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .pill{
        display: inline-flex;
        gap: 8px;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(148,163,184,0.35);
        background: rgba(255,255,255,0.7);
        font-size: 12px;
        font-weight: 900;
        color: #0b1220;
      }

      .btn{
        height: 38px;
        padding: 0 12px;
        border-radius: 12px;
        border: 1px solid rgba(148,163,184,0.5);
        background: rgba(255,255,255,0.95);
        color: #0b1220;
        cursor: pointer;
        font-weight: 900;
        font-size: 12px;
        letter-spacing: 0.2px;
        box-shadow: 0 8px 18px rgba(2,6,23,0.10);
        transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
        user-select: none;
        white-space: nowrap;
        touch-action: manipulation;
      }
      .btn.primary{
        background: linear-gradient(135deg, #111827 0%, #334155 100%);
        color: #fff;
      }
      .btn.disabled{
        opacity: 0.55;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }

      .overlay{
        position: fixed;
        inset: 0;
        background: rgba(2,6,23,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        z-index: 50;
      }
      .modal{
        width: min(92vw, 420px);
        background: #fff;
        border-radius: 18px;
        border: 1px solid rgba(148,163,184,0.35);
        box-shadow: 0 22px 60px rgba(0,0,0,0.30);
        overflow: hidden;
      }
      .modalHead{
        padding: 12px 14px;
        border-bottom: 1px solid rgba(148,163,184,0.25);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        background: rgba(248,250,252,0.9);
      }
      .modalTitle{ margin: 0; font-size: 14px; font-weight: 900; }
      .modalBody{ padding: 12px 14px; font-size: 13px; }
      .modalFoot{
        padding: 12px 14px;
        border-top: 1px solid rgba(148,163,184,0.25);
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
        background: rgba(255,255,255,0.9);
      }
      .xBtn{
        border: 1px solid rgba(148,163,184,0.45);
        background: #fff;
        border-radius: 10px;
        height: 32px;
        width: 32px;
        cursor: pointer;
        font-weight: 900;
        line-height: 30px;
        touch-action: manipulation;
      }
    `}</style>
  );
});

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
  const [planId, setPlanId] = useState("");

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const [tradeDate, setTradeDate] = useState(todayISO);

  // -------------------- UI state --------------------
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const [modal, setModal] = useState({
    open: false,
    type: "info",
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

  // -------------------- refs (UNCONTROLLED inputs) --------------------
  const tradeNameRef = useRef(null);
  const profitRef = useRef(null);
  const lossRef = useRef(null);
  const brokerageRef = useRef(null);
  const tradeLogicRef = useRef(null);
  const mistakesRef = useRef(null);

  // -------------------- helpers --------------------
  const toNum = (v) => (v === "" ? NaN : Number(v));
  const onlyDigits = (el) => {
    if (!el) return;
    el.value = String(el.value ?? "").replace(/[^\d]/g, "");
  };

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

    const tradeName = (tradeNameRef.current?.value || "").trim();
    const logic = (tradeLogicRef.current?.value || "").trim();
    const mistakes = (mistakesRef.current?.value || "").trim();

    if (!tradeName) return "Trade name (Index/Company) required";
    if (!logic) return "Trade logic required";

    const profit = profitRef.current?.value ?? "0";
    const loss = lossRef.current?.value ?? "0";
    const brokerage = brokerageRef.current?.value ?? "0";

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

      trade_name: (tradeNameRef.current?.value || "").trim(),
      profit: Number(profitRef.current?.value || 0),
      loss: Number(lossRef.current?.value || 0),
      brokerage: Number(brokerageRef.current?.value || 0),

      trade_logic: (tradeLogicRef.current?.value || "").trim(),
      mistakes: (mistakesRef.current?.value || "").trim() || null,
    };

    try {
      setBusy("save");
      await api.createJournal(payload);
      toast("Trade saved");

      // reset uncontrolled inputs
      if (tradeNameRef.current) tradeNameRef.current.value = "";
      if (tradeLogicRef.current) tradeLogicRef.current.value = "";
      if (mistakesRef.current) mistakesRef.current.value = "";
      if (profitRef.current) profitRef.current.value = "0";
      if (lossRef.current) lossRef.current.value = "0";
      if (brokerageRef.current) brokerageRef.current.value = "0";

      // keep focus at first field
      tradeNameRef.current?.focus();
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusy("");
    }
  };

  // -------- button micro animation ----------
  const press = (e) => (e.currentTarget.style.transform = "translateY(1px) scale(0.99)");
  const release = (e) => (e.currentTarget.style.transform = "translateY(0px) scale(1)");

  const Btn = ({ variant, disabled, onClick, children, type = "button" }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={disabled ? undefined : press}
      onMouseUp={disabled ? undefined : release}
      onMouseLeave={disabled ? undefined : release}
      onTouchStart={disabled ? undefined : press}
      onTouchEnd={disabled ? undefined : release}
      className={`btn ${variant || ""} ${disabled ? "disabled" : ""}`}
    >
      {children}
    </button>
  );

  const Field = ({ label, children }) => (
    <div className="field">
      {label ? <div className="label">{label}</div> : null}
      {children}
    </div>
  );

  return (
    <div className="page">
      <PageStyles />

      {/* Header */}
      <div className="topbar">
        <div className="topbarInner">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 className="title">Investment Trading Journal</h1>
            <p className="subtitle">{loading ? "Loading..." : "Only Add Entry (No list below)"}</p>
          </div>

          <div className="btnRow">
            <span className="pill">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: token ? "#22c55e" : "#ef4444",
                  display: "inline-block",
                }}
              />
              {token ? "Authorized" : "No Token"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <section>
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Add Trade</div>
                <div className="small">Platform + Segment + Trade Name</div>
              </div>
              <div className="small">Single Entry</div>
            </div>

            <form className="form" onSubmit={onSubmit} noValidate>
              <div className="row2">
                <Field label="Platform">
                  <select
                    className="select"
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
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
                    className="select"
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
                </Field>
              </div>

              <div className="row2">
                <Field label="Plan (Optional)">
                  <select
                    className="select"
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
                </Field>

                <Field label="Trade Date">
                  <input
                    className="input"
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Trade Name (Index / Company / Symbol)">
                <input
                  className="input"
                  ref={tradeNameRef}
                  defaultValue=""
                  placeholder="e.g., NIFTY / BANKNIFTY / RELIANCE / GOLD / USDINR"
                  autoComplete="off"
                />
              </Field>

              <div className="row3">
                <Field label="Profit">
                  <input
                    className="input"
                    ref={profitRef}
                    defaultValue="0"
                    inputMode="numeric"
                    placeholder="0"
                    onInput={(e) => onlyDigits(e.currentTarget)}
                  />
                </Field>

                <Field label="Loss">
                  <input
                    className="input"
                    ref={lossRef}
                    defaultValue="0"
                    inputMode="numeric"
                    placeholder="0"
                    onInput={(e) => onlyDigits(e.currentTarget)}
                  />
                </Field>

                <Field label="Brokerage">
                  <input
                    className="input"
                    ref={brokerageRef}
                    defaultValue="0"
                    inputMode="numeric"
                    placeholder="0"
                    onInput={(e) => onlyDigits(e.currentTarget)}
                  />
                </Field>
              </div>

              <Field label="Trade Logic (Required)">
                <textarea
                  className="textarea"
                  ref={tradeLogicRef}
                  defaultValue=""
                  placeholder="Example: Breakout + volume confirmation..."
                  autoComplete="off"
                />
              </Field>

              <Field label="Mistakes (Optional)">
                <textarea
                  className="textarea"
                  ref={mistakesRef}
                  defaultValue=""
                  placeholder="Example: entered early / ignored SL..."
                  autoComplete="off"
                />
              </Field>

              <div className="divider" />

              <div className="btnRow">
                <Btn type="submit" variant="primary" disabled={busy === "save"}>
                  {busy === "save" ? "Saving..." : "Save Trade"}
                </Btn>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Modal */}
      {modal.open ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHead">
              <h3 className="modalTitle">{modal.title}</h3>
              <button className="xBtn" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modalBody">{modal.message}</div>
            <div className="modalFoot">
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