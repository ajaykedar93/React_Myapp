// src/pages/Investment_plan.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_plan() {
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

  // -------------------- modal (center alerts) --------------------
  const [modal, setModal] = useState({
    open: false,
    type: "info", // success | error | confirm | info
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const openModal = (payload) =>
    setModal((m) => ({
      ...m,
      open: true,
      type: payload.type || "info",
      title: payload.title || "",
      message: payload.message || "",
      confirmText: payload.confirmText || "OK",
      cancelText: payload.cancelText || "Cancel",
      onConfirm: payload.onConfirm || null,
    }));

  const closeModal = () =>
    setModal((m) => ({ ...m, open: false, onConfirm: null, message: "", title: "" }));

  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

  // -------------------- API helpers --------------------
  const api = {
    async getPlatforms() {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Platform fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },
    async getSegments(platform_id) {
      if (!platform_id) return [];
      const res = await fetch(
        `${BASE_URL}/api/investment/platform-segment/segment?platform_id=${platform_id}`,
        { headers }
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatformId]);

  // -------------------- load plans when filters change --------------------
  const refreshPlans = async () => {
    const list = await api.getPlans({
      platform_id: selectedPlatformId || undefined,
      segment_id: selectedSegmentId || undefined,
    });
    setPlans(list);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatformId, selectedSegmentId]);

  // -------------------- form actions --------------------
  const resetForm = () => {
    setPlanIdEdit(null);
    setPlanName("");
    setTotalFundDeposit("");
    setRiskLoss("");
    setProfitReward("");
    setRrRatio("1:1");
    setDayTradeLimit("0");
    setTradingDays("");
  };

  const fillForEdit = (p) => {
    setPlanIdEdit(p.plan_id);
    setSelectedPlatformId(String(p.platform_id));
    setTimeout(() => setSelectedSegmentId(String(p.segment_id)), 0);

    setPlanName(p.plan_name || "");
    setTotalFundDeposit(p.total_fund_deposit ?? "");
    setRiskLoss(p.risk_loss ?? "");
    setProfitReward(p.profit_reward ?? "");
    setRrRatio(p.rr_ratio || "1:1");
    setDayTradeLimit(p.day_trade_limit ?? "0");
    setTradingDays(p.trading_days ?? "");
  };

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

  // -------------------- click/tap effect buttons --------------------
  const press = (e) => (e.currentTarget.style.transform = "scale(0.98)");
  const release = (e) => (e.currentTarget.style.transform = "scale(1)");

  // -------------------- styles (white, mobile-first, attractive) --------------------
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
    titleWrap: { display: "flex", alignItems: "baseline", gap: 10 },
    title: { margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: 0.2 },
    grid: {
      width: "100%",
      display: "grid",
      gridTemplateColumns: wide ? "1fr 1.25fr" : "1fr",
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

    input: {
      height: 44,
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      padding: "0 12px",
      outline: "none",
      background: "#fff",
      color: "#0f172a",
      fontSize: 14,
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
    },

    btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
    btn: (variant, small) => ({
      height: small ? 34 : 42,
      padding: small ? "0 10px" : "0 14px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      background:
        variant === "primary" ? "#0f172a" : variant === "danger" ? "#b91c1c" : "#ffffff",
      color: variant === "primary" || variant === "danger" ? "#ffffff" : "#0f172a",
      cursor: "pointer",
      fontWeight: 900,
      boxShadow: "0 2px 8px rgba(15,23,42,0.10)",
      transition: "transform 0.06s ease, box-shadow 0.12s ease",
      userSelect: "none",
    }),
    btnDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none", boxShadow: "none" },

    // table
    tableWrap: { width: "100%", overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
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
    td: { borderBottom: "1px solid #f1f5f9", padding: "10px 12px", fontSize: 13 },

    // highlight values
    fund: { fontWeight: 900, color: "#a16207" }, // dark yellow
    risk: { fontWeight: 900, color: "#b91c1c" }, // red
    reward: { fontWeight: 900, color: "#047857" }, // green
    planName: { fontWeight: 900 },

    pill: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
      fontSize: 12,
      color: "#0f172a",
      fontWeight: 700,
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
      style={{ ...styles.btn(variant, small), ...(disabled ? styles.btnDisabled : null) }}
    >
      {children}
    </button>
  );

  return (
    <div style={styles.page}>
      {/* Header: Investment Plan + small refresh */}
      <div style={styles.topbar}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>Investment Plan</h1>
        </div>

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

      <div style={styles.grid}>
        {/* LEFT: FORM */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>{planIdEdit ? `Edit Plan #${planIdEdit}` : "Create Plan"}</div>
            <div style={styles.small}>{loading ? "Loading..." : `${plans.length} plans`}</div>
          </div>

          <form style={styles.form} onSubmit={onSubmit} noValidate>
            <div style={styles.row2}>
              <select
                style={styles.select}
                value={selectedPlatformId}
                onChange={(e) => setSelectedPlatformId(e.target.value)}
              >
                <option value="">Select Platform</option>
                {platforms.map((p) => (
                  <option key={p.platform_id} value={p.platform_id}>
                    {p.platform_name}
                  </option>
                ))}
              </select>

              <select
                style={styles.select}
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
            </div>

            <input
              style={styles.input}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plan name (optional)"
            />

            <div style={styles.row2}>
              <input
                style={styles.input}
                value={totalFundDeposit}
                onChange={(e) => setTotalFundDeposit(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Total fund (e.g., 20000)"
                inputMode="numeric"
              />
              <select style={styles.select} value={rrRatio} onChange={(e) => setRrRatio(e.target.value)}>
                <option value="1:1">1:1</option>
                <option value="1:1.5">1:1.5</option>
                <option value="1:2">1:2</option>
                <option value="1:3">1:3</option>
              </select>
            </div>

            <div style={styles.row2}>
              <input
                style={styles.input}
                value={riskLoss}
                onChange={(e) => setRiskLoss(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Risk per day (e.g., 500)"
                inputMode="numeric"
              />
              <input
                style={styles.input}
                value={profitReward}
                onChange={(e) => setProfitReward(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Reward per day (e.g., 1000)"
                inputMode="numeric"
              />
            </div>

            <div style={styles.row2}>
              <input
                style={styles.input}
                value={dayTradeLimit}
                onChange={(e) => setDayTradeLimit(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Day trade limit (e.g., 3)"
                inputMode="numeric"
              />
              <input
                style={styles.input}
                value={tradingDays}
                onChange={(e) => setTradingDays(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Trading days (optional)"
                inputMode="numeric"
              />
            </div>

            <div style={styles.btnRow}>
              <Btn type="submit" variant="primary" disabled={busyKey === "save"}>
                {busyKey === "save" ? "Saving..." : planIdEdit ? "Update" : "Create"}
              </Btn>

              <Btn type="button" disabled={busyKey === "save"} onClick={resetForm}>
                Clear
              </Btn>
            </div>
          </form>
        </section>

        {/* RIGHT: LIST */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Plans List</div>
            <div style={styles.small}>
              {selectedPlatformId ? `Platform #${selectedPlatformId}` : "All"}{" "}
              {selectedSegmentId ? `• Segment #${selectedSegmentId}` : ""}
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Plan</th>
                  <th style={styles.th}>Fund</th>
                  <th style={styles.th}>Risk</th>
                  <th style={styles.th}>Reward</th>
                  <th style={styles.th}>RR</th>
                  <th style={styles.th}>Day Limit</th>
                  <th style={styles.th}>Days</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.plan_id}>
                    <td style={styles.td}>
                      <div style={styles.planName}>
                        {p.plan_name ? p.plan_name : <span style={styles.pill}>No name</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Plan #{p.plan_id} • Platform #{p.platform_id} • Segment #{p.segment_id}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.fund}>{p.total_fund_deposit}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.risk}>{p.risk_loss}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.reward}>{p.profit_reward}</span>
                    </td>
                    <td style={styles.td}>{p.rr_ratio}</td>
                    <td style={styles.td}>{p.day_trade_limit}</td>
                    <td style={styles.td}>{p.trading_days ?? "-"}</td>

                    <td style={styles.td}>
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
                    <td style={styles.td} colSpan={8}>
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
