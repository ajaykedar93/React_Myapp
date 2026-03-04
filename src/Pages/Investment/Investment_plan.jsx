// src/pages/Investment_plan.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

// ✅ small memo components (prevents re-mount / focus loss)
const Btn = React.memo(function Btn({ variant = "default", small = false, disabled, onClick, children, type = "button" }) {
  const cls = `ip-btn ${small ? "ip-btn-sm" : ""} ${variant === "primary" ? "ip-primary" : variant === "danger" ? "ip-danger" : "ip-default"}`;
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
});

const Field = React.memo(function Field({ label, hint, children }) {
  return (
    <div className="ip-field">
      {label ? <div className="ip-label">{label}</div> : null}
      {children}
      {hint ? <div className="ip-hint">{hint}</div> : null}
    </div>
  );
});

export default function Investment_plan() {
  // ✅ Token from login
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // -------------------- master data --------------------
  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);

  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");

  // name lookup
  const platformNameById = useMemo(() => {
    const m = new Map();
    platforms.forEach((p) => m.set(String(p.platform_id), p.platform_name));
    return m;
  }, [platforms]);

  const segmentNameById = useMemo(() => {
    const m = new Map();
    segments.forEach((s) => m.set(String(s.segment_id), s.segment_name));
    return m;
  }, [segments]);

  // -------------------- plan form --------------------
  const [planIdEdit, setPlanIdEdit] = useState(null);

  const [planName, setPlanName] = useState("");
  const [totalFundDeposit, setTotalFundDeposit] = useState("");
  const [riskLoss, setRiskLoss] = useState("");
  const [profitReward, setProfitReward] = useState("");
  const [rrRatio, setRrRatio] = useState("1:1");
  const [dayTradeLimit, setDayTradeLimit] = useState("0");
  const [tradingDays, setTradingDays] = useState("");

  // -------------------- plan list --------------------
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  // -------------------- modal --------------------
  const [modal, setModal] = useState({
    open: false,
    type: "info", // success | error | confirm | info
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const openModal = useCallback(
    (payload) =>
      setModal((m) => ({
        ...m,
        open: true,
        type: payload.type || "info",
        title: payload.title || "",
        message: payload.message || "",
        confirmText: payload.confirmText || "OK",
        cancelText: payload.cancelText || "Cancel",
        onConfirm: payload.onConfirm || null,
      })),
    []
  );

  const closeModal = useCallback(() => {
    setModal((m) => ({ ...m, open: false, onConfirm: null, message: "", title: "" }));
  }, []);

  const toast = useCallback((msg) => openModal({ type: "success", title: "Success", message: msg }), [openModal]);
  const fail = useCallback((msg) => openModal({ type: "error", title: "Error", message: msg }), [openModal]);

  // ✅ lock scroll when modal open
  useEffect(() => {
    if (!modal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [modal.open]);

  // -------------------- API --------------------
  const api = useMemo(
    () => ({
      async getPlatforms() {
        const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Platform fetch failed");
        return Array.isArray(data?.data) ? data.data : [];
      },
      async getSegments(platform_id) {
        if (!platform_id) return [];
        const res = await fetch(`${BASE_URL}/api/investment/platform-segment/segment?platform_id=${platform_id}`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Segment fetch failed");
        return Array.isArray(data?.data) ? data.data : [];
      },
      async getPlans(filters = {}) {
        const qs = new URLSearchParams();
        if (filters.platform_id) qs.set("platform_id", String(filters.platform_id));
        if (filters.segment_id) qs.set("segment_id", String(filters.segment_id));
        const res = await fetch(`${BASE_URL}/api/investment/plan?${qs.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Plan fetch failed");
        return Array.isArray(data?.data) ? data.data : [];
      },
      async createPlan(payload) {
        const res = await fetch(`${BASE_URL}/api/investment/plan`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Plan create failed");
        return data?.data;
      },
      async updatePlan(plan_id, payload) {
        const res = await fetch(`${BASE_URL}/api/investment/plan/${plan_id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Plan update failed");
        return data?.data;
      },
      async deletePlan(plan_id) {
        const res = await fetch(`${BASE_URL}/api/investment/plan/${plan_id}`, {
          method: "DELETE",
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Plan delete failed");
        return true;
      },
    }),
    [headers]
  );

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
  }, [api, fail]);

  // -------------------- load segments when platform changes --------------------
  useEffect(() => {
    (async () => {
      try {
        setSegments([]);
        setSelectedSegmentId("");
        if (!selectedPlatformId) return;
        const s = await api.getSegments(selectedPlatformId);
        setSegments(s);
      } catch (e) {
        fail(e.message);
      }
    })();
  }, [api, fail, selectedPlatformId]);

  // -------------------- load plans when filters change --------------------
  const refreshPlans = useCallback(async () => {
    const list = await api.getPlans({
      platform_id: selectedPlatformId || undefined,
      segment_id: selectedSegmentId || undefined,
    });
    setPlans(list);
  }, [api, selectedPlatformId, selectedSegmentId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await refreshPlans();
      } catch (e) {
        fail(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fail, refreshPlans]);

  // -------------------- form actions --------------------
  const resetForm = useCallback(() => {
    setPlanIdEdit(null);
    setPlanName("");
    setTotalFundDeposit("");
    setRiskLoss("");
    setProfitReward("");
    setRrRatio("1:1");
    setDayTradeLimit("0");
    setTradingDays("");
  }, []);

  const fillForEdit = useCallback(
    async (p) => {
      // ✅ IMPORTANT: load platform -> segments -> then set segment (no setTimeout)
      setPlanIdEdit(p.plan_id);

      const pid = String(p.platform_id);
      setSelectedPlatformId(pid);

      try {
        const seg = await api.getSegments(pid);
        setSegments(seg);
        setSelectedSegmentId(String(p.segment_id));
      } catch (e) {
        fail(e.message);
      }

      setPlanName(p.plan_name || "");
      setTotalFundDeposit(String(p.total_fund_deposit ?? ""));
      setRiskLoss(String(p.risk_loss ?? ""));
      setProfitReward(String(p.profit_reward ?? ""));
      setRrRatio(p.rr_ratio || "1:1");
      setDayTradeLimit(String(p.day_trade_limit ?? "0"));
      setTradingDays(p.trading_days === null || p.trading_days === undefined ? "" : String(p.trading_days));
    },
    [api, fail]
  );

  const validate = () => {
    if (!selectedPlatformId) return "Select platform";
    if (!selectedSegmentId) return "Select segment";

    const tf = totalFundDeposit === "" ? NaN : Number(totalFundDeposit);
    const rl = riskLoss === "" ? NaN : Number(riskLoss);
    const pr = profitReward === "" ? NaN : Number(profitReward);
    const dt = dayTradeLimit === "" ? NaN : Number(dayTradeLimit);

    if (!Number.isFinite(tf) || tf < 0) return "Total fund must be 0 or more (e.g., 20000)";
    if (!Number.isFinite(rl) || rl <= 0) return "Risk loss per day must be > 0";
    if (!Number.isFinite(pr) || pr <= 0) return "Profit reward per day must be > 0";
    if (!Number.isFinite(dt) || dt < 0) return "Day trade limit must be 0 or more";

    if (tradingDays !== "") {
      const td = Number(tradingDays);
      if (!Number.isFinite(td) || td <= 0) return "Trading days must be > 0 (or keep empty)";
    }

    const allowed = new Set(["1:1", "1:1.5", "1:2", "1:3"]);
    if (!allowed.has(rrRatio)) return "RR ratio must be 1:1, 1:1.5, 1:2, 1:3";

    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const v = validate();
    if (v) return fail(v);

    const payload = {
      platform_id: Number(selectedPlatformId),
      segment_id: Number(selectedSegmentId),
      plan_name: planName?.trim() ? planName.trim() : null,
      total_fund_deposit: Number(totalFundDeposit),
      risk_loss: Number(riskLoss),
      profit_reward: Number(profitReward),
      rr_ratio: rrRatio,
      day_trade_limit: Number(dayTradeLimit),
      trading_days: tradingDays === "" ? null : Number(tradingDays),
    };

    try {
      setBusyKey("save");
      if (planIdEdit) {
        await api.updatePlan(planIdEdit, payload);
        toast("Plan updated");
      } else {
        await api.createPlan(payload);
        toast("Plan created");
      }
      await refreshPlans();
      resetForm();
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusyKey("");
    }
  };

  const onDelete = (plan_id) => {
    openModal({
      type: "confirm",
      title: "Delete Plan?",
      message: "This plan will be deleted permanently.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setBusyKey(`del-${plan_id}`);
          await api.deletePlan(plan_id);
          toast("Plan deleted");
          await refreshPlans();
          if (planIdEdit === plan_id) resetForm();
        } catch (e) {
          fail(e.message);
        } finally {
          setBusyKey("");
          closeModal();
        }
      },
    });
  };

  // -------------------- responsive layout --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1000 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1000);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // show names in list
  const displayPlatformName = (p) =>
    p.platform_name || platformNameById.get(String(p.platform_id)) || `Platform #${p.platform_id}`;
  const displaySegmentName = (p) =>
    p.segment_name || segmentNameById.get(String(p.segment_id)) || `Segment #${p.segment_id}`;

  return (
    <div className="ip-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        html, body { margin:0; padding:0; }

        .ip-page{
          width:100%;
          min-height:100vh;
          margin:0;
          padding:0;
          color:#0b1220;
          font-family:"Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:
            radial-gradient(1200px 600px at 10% 0%, rgba(99,102,241,0.14), transparent 60%),
            radial-gradient(900px 500px at 100% 30%, rgba(34,197,94,0.12), transparent 55%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding-bottom: 28px;
        }

        .ip-topbar{
          width:100%;
          position:sticky;
          top:0;
          z-index:10;
          backdrop-filter: blur(10px);
          background: rgba(255,255,255,0.78);
          border-bottom: 1px solid rgba(148,163,184,0.35);
        }
        .ip-topbarInner{
          width:100%;
          padding: 14px 14px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .ip-title{ margin:0; font-size:16px; font-weight:1000; letter-spacing:.2px; }
        .ip-sub{ margin:0; font-size:12px; color:#475569; font-weight:800; }

        .ip-grid{
          width:100%;
          display:grid;
          grid-template-columns: ${wide ? "1fr 1.35fr" : "1fr"};
          gap: 12px;
          padding: ${wide ? "14px" : "12px"};
        }

        .ip-card{
          border: 1px solid rgba(148,163,184,0.35);
          background: rgba(255,255,255,0.92);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(2,6,23,0.06);
        }
        .ip-cardHeader{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding: 12px 12px;
          border-bottom: 1px solid rgba(148,163,184,0.25);
          background: linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.6));
        }
        .ip-cardTitle{ margin:0; font-size:13px; font-weight:1000; letter-spacing:.2px; }
        .ip-small{ margin:0; font-size:12px; color:#64748b; font-weight:800; }

        .ip-form{ padding:12px; display:grid; gap:10px; }
        .ip-row2{ display:grid; grid-template-columns: ${wide ? "1fr 1fr" : "1fr"}; gap:10px; }

        .ip-field{ display:flex; flex-direction:column; }
        .ip-label{ font-size:12px; color:#475569; font-weight:900; margin-bottom:6px; }
        .ip-hint{ margin-top:6px; font-size:11px; color:#64748b; font-weight:800; }

        .ip-input, .ip-select{
          height:44px;
          border-radius:12px;
          border:1px solid rgba(148,163,184,0.55);
          padding: 0 12px;
          outline:none;
          background:#fff;
          color:#0b1220;
          font-size:13px;
          font-weight:800;
        }
        .ip-input:focus, .ip-select:focus{
          border-color: rgba(99,102,241,0.8);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
        }

        .ip-btnRow{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        /* ✅ no JS press/release => no focus issues */
        .ip-btn{
          height:40px;
          padding:0 12px;
          border-radius:12px;
          border:1px solid rgba(148,163,184,0.5);
          cursor:pointer;
          font-weight:1000;
          font-size:12px;
          letter-spacing:.2px;
          box-shadow: 0 8px 18px rgba(2,6,23,0.10);
          transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
          user-select:none;
          white-space:nowrap;
          background: rgba(255,255,255,0.95);
          color:#0b1220;
        }
        .ip-btn-sm{ height:34px; padding:0 10px; }
        .ip-btn:active{ transform: translateY(1px) scale(.99); }
        .ip-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }

        .ip-primary{
          background: linear-gradient(135deg, #111827 0%, #334155 100%);
          color:#fff;
        }
        .ip-danger{
          background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%);
          color:#fff;
        }

        .ip-pill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:1000;
          border:1px solid rgba(148,163,184,0.35);
          background: rgba(255,255,255,0.65);
          white-space:nowrap;
        }

        .ip-tableWrap{ width:100%; overflow-x:auto; }
        .ip-table{ width:100%; border-collapse:collapse; min-width:860px; }
        .ip-th{
          text-align:left;
          font-size:12px;
          color:#475569;
          border-bottom: 1px solid rgba(148,163,184,0.25);
          padding: 10px 12px;
          background: rgba(248,250,252,0.95);
          position: sticky;
          top: 0;
          z-index: 1;
          white-space:nowrap;
          font-weight:1000;
        }
        .ip-td{
          border-bottom: 1px solid rgba(148,163,184,0.18);
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 850;
        }

        .ip-fund{ font-weight:1000; color:#a16207; }
        .ip-risk{ font-weight:1000; color:#b91c1c; }
        .ip-reward{ font-weight:1000; color:#047857; }
        .ip-planName{ font-weight:1000; font-size:13px; }

        /* ✅ modal center */
        .ip-overlay{
          position:fixed;
          inset:0;
          background: rgba(2,6,23,0.45);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:12px;
          z-index:50;
        }
        .ip-modal{
          width: min(92vw, 440px);
          background:#fff;
          border-radius:18px;
          border: 1px solid rgba(148,163,184,0.35);
          box-shadow: 0 22px 60px rgba(0,0,0,0.30);
          overflow:hidden;
        }
        .ip-modalHead{
          padding: 12px 14px;
          border-bottom: 1px solid rgba(148,163,184,0.25);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          background: rgba(248,250,252,0.9);
        }
        .ip-modalTitle{ margin:0; font-size:14px; font-weight:1000; color:#0b1220; }
        .ip-modalBody{ padding: 12px 14px; font-size:13px; color:#0b1220; font-weight:850; }
        .ip-modalFoot{
          padding: 12px 14px;
          border-top: 1px solid rgba(148,163,184,0.25);
          display:flex;
          gap:10px;
          justify-content:flex-end;
          flex-wrap:wrap;
          background: rgba(255,255,255,0.9);
        }
        .ip-xBtn{
          border: 1px solid rgba(148,163,184,0.45);
          background:#fff;
          border-radius:10px;
          height:34px;
          width:34px;
          cursor:pointer;
          font-weight:1000;
          line-height:32px;
          user-select:none;
        }
      `}</style>

      {/* Header */}
      <div className="ip-topbar">
        <div className="ip-topbarInner">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h1 className="ip-title">Investment Plan</h1>
            <p className="ip-sub">Create / Edit plans with Platform + Segment</p>
          </div>

          <div className="ip-btnRow">
            <span className="ip-pill">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: token ? "#22c55e" : "#ef4444",
                  display: "inline-block",
                  marginRight: 8,
                }}
              />
              {token ? "Authorized" : "No Token"}
            </span>

            <Btn
              variant="primary"
              small
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  await refreshPlans();
                  toast("Refreshed");
                } catch (e) {
                  fail(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "..." : "Refresh"}
            </Btn>
          </div>
        </div>
      </div>

      <div className="ip-grid">
        {/* LEFT: FORM */}
        <section className="ip-card">
          <div className="ip-cardHeader">
            <div>
              <div className="ip-cardTitle">{planIdEdit ? `Edit Plan #${planIdEdit}` : "Create Plan"}</div>
              <div className="ip-small">
                {selectedPlatformId
                  ? `Platform: ${platformNameById.get(String(selectedPlatformId)) || selectedPlatformId}`
                  : "Select platform"}
                {selectedSegmentId ? ` • Segment: ${segmentNameById.get(String(selectedSegmentId)) || selectedSegmentId}` : ""}
              </div>
            </div>
            <div className="ip-small">{loading ? "Loading..." : `${plans.length} plans`}</div>
          </div>

          <form className="ip-form" onSubmit={onSubmit} noValidate>
            <div className="ip-row2">
              <Field label="Platform">
                <select className="ip-select" value={selectedPlatformId} onChange={(e) => setSelectedPlatformId(e.target.value)}>
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
                  className="ip-select"
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(e.target.value)}
                  disabled={!selectedPlatformId}
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

            <Field label="Plan Name (Optional)" hint="Example: Beginner Plan / Safe Plan">
              <input className="ip-input" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Plan name (optional)" />
            </Field>

            <div className="ip-row2">
              <Field label="Total Fund Deposit" hint="Example: 20000">
                <input
                  className="ip-input"
                  value={totalFundDeposit}
                  onChange={(e) => setTotalFundDeposit(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Total fund"
                  inputMode="numeric"
                />
              </Field>

              <Field label="RR Ratio" hint="Risk : Reward">
                <select className="ip-select" value={rrRatio} onChange={(e) => setRrRatio(e.target.value)}>
                  <option value="1:1">1:1</option>
                  <option value="1:1.5">1:1.5</option>
                  <option value="1:2">1:2</option>
                  <option value="1:3">1:3</option>
                </select>
              </Field>
            </div>

            <div className="ip-row2">
              <Field label="Risk Loss (Per Day)" hint="Example: 500">
                <input
                  className="ip-input"
                  value={riskLoss}
                  onChange={(e) => setRiskLoss(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Risk per day"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Profit Reward (Per Day)" hint="Example: 1000">
                <input
                  className="ip-input"
                  value={profitReward}
                  onChange={(e) => setProfitReward(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Reward per day"
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div className="ip-row2">
              <Field label="Day Trade Limit" hint="Example: 3 (0 means no limit)">
                <input
                  className="ip-input"
                  value={dayTradeLimit}
                  onChange={(e) => setDayTradeLimit(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Day trade limit"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Trading Days (Optional)" hint="Example: 20">
                <input
                  className="ip-input"
                  value={tradingDays}
                  onChange={(e) => setTradingDays(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Trading days (optional)"
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div className="ip-btnRow">
              <Btn type="submit" variant="primary" disabled={busyKey === "save"}>
                {busyKey === "save" ? "Saving..." : planIdEdit ? "Update Plan" : "Create Plan"}
              </Btn>

              <Btn type="button" disabled={busyKey === "save"} onClick={resetForm}>
                Clear
              </Btn>
            </div>
          </form>
        </section>

        {/* RIGHT: LIST */}
        <section className="ip-card">
          <div className="ip-cardHeader">
            <div>
              <div className="ip-cardTitle">Plans List</div>
              <div className="ip-small">
                {selectedPlatformId ? `Platform: ${platformNameById.get(String(selectedPlatformId)) || "-"}` : "All Platforms"}
                {selectedSegmentId ? ` • Segment: ${segmentNameById.get(String(selectedSegmentId)) || "-"}` : ""}
              </div>
            </div>
            <div className="ip-small">{loading ? "Loading..." : `${plans.length} records`}</div>
          </div>

          <div className="ip-tableWrap">
            <table className="ip-table">
              <thead>
                <tr>
                  <th className="ip-th">Plan</th>
                  <th className="ip-th">Platform</th>
                  <th className="ip-th">Segment</th>
                  <th className="ip-th">Fund</th>
                  <th className="ip-th">Risk</th>
                  <th className="ip-th">Reward</th>
                  <th className="ip-th">RR</th>
                  <th className="ip-th">Day Limit</th>
                  <th className="ip-th">Days</th>
                  <th className="ip-th">Actions</th>
                </tr>
              </thead>

              <tbody>
                {plans.map((p) => (
                  <tr key={p.plan_id}>
                    <td className="ip-td">
                      <div className="ip-planName">{p.plan_name ? p.plan_name : <span className="ip-pill">No name</span>}</div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 850 }}>Plan #{p.plan_id}</div>
                    </td>

                    <td className="ip-td">{displayPlatformName(p)}</td>
                    <td className="ip-td">{displaySegmentName(p)}</td>

                    <td className="ip-td">
                      <span className="ip-fund">{p.total_fund_deposit}</span>
                    </td>
                    <td className="ip-td">
                      <span className="ip-risk">{p.risk_loss}</span>
                    </td>
                    <td className="ip-td">
                      <span className="ip-reward">{p.profit_reward}</span>
                    </td>

                    <td className="ip-td">{p.rr_ratio}</td>
                    <td className="ip-td">{p.day_trade_limit}</td>
                    <td className="ip-td">{p.trading_days ?? "-"}</td>

                    <td className="ip-td">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Btn type="button" onClick={() => fillForEdit(p)}>
                          Edit
                        </Btn>
                        <Btn
                          type="button"
                          variant="danger"
                          onClick={() => onDelete(p.plan_id)}
                          disabled={busyKey === `del-${p.plan_id}`}
                        >
                          {busyKey === `del-${p.plan_id}` ? "Deleting..." : "Delete"}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && plans.length === 0 ? (
                  <tr>
                    <td className="ip-td" colSpan={10}>
                      No plans found.
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
        <div className="ip-overlay" role="dialog" aria-modal="true">
          <div className="ip-modal">
            <div className="ip-modalHead">
              <h3 className="ip-modalTitle">{modal.title}</h3>
              <button className="ip-xBtn" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <div className="ip-modalBody">{modal.message}</div>

            <div className="ip-modalFoot">
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