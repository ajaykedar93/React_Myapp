// src/pages/Investment_dipwid.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

//http://localhost:5000


export default function Investment_dipwid() {
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

  // -------------------- form --------------------
  const [txnType, setTxnType] = useState("DEPOSIT"); // DEPOSIT | WITHDRAW
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // -------------------- views data --------------------
  const [ledgerRows, setLedgerRows] = useState([]);
  const [monthSummaryRows, setMonthSummaryRows] = useState([]);

  // month filter
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  // -------------------- UI --------------------
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  // modal
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
    setModal((m) => ({ ...m, open: false, title: "", message: "", onConfirm: null }));

  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

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

    async createDipWid(payload) {
      const res = await fetch(`${BASE_URL}/api/investment/dipwid`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");
      return data?.data;
    },

    async getLedger({ platform_id, segment_id, plan_id }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (plan_id) qs.set("plan_id", String(plan_id));
      const res = await fetch(`${BASE_URL}/api/investment/dipwid/ledger?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Ledger fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getMonthSummary({ platform_id, segment_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (month) qs.set("month", month);
      const res = await fetch(`${BASE_URL}/api/investment/dipwid/month-summary?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Month summary fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async deleteDipWid(id) {
      const res = await fetch(`${BASE_URL}/api/investment/dipwid/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      return true;
    },
  };

  // -------------------- responsive --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1100 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1100);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // -------------------- mount: platforms --------------------
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

  // segments when platform changes
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

  // plans when segment changes
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

  // -------------------- refresh views --------------------
  const refreshViews = async () => {
    try {
      setLoading(true);
      setBusy("refresh");

      const ledger = await api.getLedger({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        plan_id: planId ? Number(planId) : null,
      });
      setLedgerRows(ledger);

      const ms = await api.getMonthSummary({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        month,
      });
      setMonthSummaryRows(ms);
    } catch (e) {
      fail(e.message);
    } finally {
      setBusy(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId, segmentId, planId, month]);

  // -------------------- submit --------------------
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!platformId) return fail("Select platform");
    if (!segmentId) return fail("Select segment");

    const amt = Number(String(amount).replace(/[^\d]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) return fail("Amount must be > 0");

    const payload = {
      platform_id: Number(platformId),
      segment_id: Number(segmentId),
      plan_id: planId ? Number(planId) : null,
      txn_type: txnType,
      amount: amt,
      note: note?.trim() ? note.trim() : null,
    };

    try {
      setBusy("save");
      await api.createDipWid(payload);
      toast("Saved");
      setAmount("");
      setNote("");
      await refreshViews();
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id) => {
    openModal({
      type: "confirm",
      title: "Confirm Delete",
      message: "Delete this entry?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setBusy(`del-${id}`);
          await api.deleteDipWid(id);
          toast("Deleted");
          await refreshViews();
        } catch (e) {
          fail(e.message);
        } finally {
          setBusy(null);
          closeModal();
        }
      },
    });
  };

  // -------------------- helpers --------------------
  const money = (v) => {
    if (v === null || v === undefined) return "-";
    const s = String(v);
    return s.trim() ? s : "-";
  };

  const fmtMonth = (val) => {
    // show "1 Jan 2026"
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "-";
      const m = d.toLocaleString("en-GB", { month: "short" });
      const y = d.getFullYear();
      return `1 ${m} ${y}`;
    } catch {
      return "-";
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.topbar}>
        <div style={styles.title}>Deposit / Withdrawal</div>
        <Btn small variant="primary" onClick={refreshViews} disabled={busy === "refresh" || loading}>
          {busy === "refresh" || loading ? "..." : "Refresh"}
        </Btn>
      </div>

      <div style={styles.grid(wide)}>
        {/* LEFT: FORM */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Add Entry</div>
            <div style={styles.cardMeta}>{loading ? "Loading..." : ""}</div>
          </div>

          <form style={styles.form} onSubmit={onSubmit} noValidate>
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

            <select
              style={styles.select}
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              disabled={!platformId || !segmentId}
            >
              <option value="">Plan (Optional)</option>
              {plans.map((p) => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.plan_name ? p.plan_name : `Plan #${p.plan_id}`}
                </option>
              ))}
            </select>

            <div style={styles.row2(wide)}>
              <select style={styles.select} value={txnType} onChange={(e) => setTxnType(e.target.value)}>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAW">Withdraw</option>
              </select>

              <input
                style={styles.input}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="Amount"
              />
            </div>

            <textarea
              style={styles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
            />

            <div style={styles.btnRow}>
              <Btn variant="primary" type="submit" disabled={busy === "save"}>
                {busy === "save" ? "Saving..." : "Save"}
              </Btn>
              <Btn onClick={() => { setTxnType("DEPOSIT"); setAmount(""); setNote(""); }} disabled={busy === "save"}>
                Clear
              </Btn>
            </div>
          </form>
        </section>

        {/* RIGHT: LEDGER + MONTH SUMMARY */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Ledger</div>
            <div style={styles.cardMeta}>
              <input
                style={{ ...styles.input, height: 36, width: 170 }}
                type="month"
                value={month.slice(0, 7)}
                onChange={(e) => setMonth(`${e.target.value}-01`)}
              />
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Balance</th>
                  <th style={styles.th}>Note</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((r) => {
                  const isDep = String(r.txn_type).toUpperCase() === "DEPOSIT";
                  return (
                    <tr key={r.dipwid_id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 900 }}>{r.txn_at}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>#{r.dipwid_id}</div>
                      </td>

                      <td style={styles.td}>
                        <span style={isDep ? styles.pillGreen : styles.pillRed}>
                          {isDep ? "Deposit" : "Withdraw"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <span style={isDep ? styles.amountDeposit : styles.amountWithdraw}>
                          {money(r.amount)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.pillNeutral}>{money(r.running_balance)}</span>
                      </td>

                      <td style={styles.td}>{r.note ? r.note : "-"}</td>

                      <td style={styles.td}>
                        <Btn
                          variant="danger"
                          small
                          onClick={() => onDelete(r.dipwid_id)}
                          disabled={busy === `del-${r.dipwid_id}`}
                        >
                          {busy === `del-${r.dipwid_id}` ? "..." : "Delete"}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}

                {!loading && ledgerRows.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={6}>
                      No entries found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ height: 12 }} />

          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Monthly Summary</div>
            <div style={styles.cardMeta}>{monthSummaryRows.length ? "" : ""}</div>
          </div>

          <div style={styles.tableWrap}>
            <table style={{ ...styles.table, minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={styles.th}>Month</th>
                  <th style={styles.th}>Deposits</th>
                  <th style={styles.th}>Withdrawals</th>
                  <th style={styles.th}>Total Deposit</th>
                  <th style={styles.th}>Total Withdraw</th>
                </tr>
              </thead>
              <tbody>
                {monthSummaryRows.map((m, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>
                      <b>{fmtMonth(m.month_start)}</b>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.pillNeutral}>{money(m.deposits_count)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.pillNeutral}>{money(m.withdrawals_count)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.amountDeposit}>{money(m.total_deposit)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.amountWithdraw}>{money(m.total_withdraw)}</span>
                    </td>
                  </tr>
                ))}

                {!loading && monthSummaryRows.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={5}>
                      No summary found.
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

// -------------------- styles (mobile-first, clean) --------------------
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

  grid: (wide) => ({
    width: "100%",
    display: "grid",
    gridTemplateColumns: wide ? "420px 1fr" : "1fr",
    gap: 12,
    padding: 12,
    boxSizing: "border-box",
  }),

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
  cardMeta: { margin: "10px 12px", fontSize: 12, color: "#475569" },

  form: { margin: "12px 12px 14px", display: "grid", gap: 10 },
  row2: (wide) => ({ display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 10 }),

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
  textarea: {
    minHeight: 80,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
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

  // Amount colors
  amountDeposit: { fontWeight: 900, color: "#166534" }, // green
  amountWithdraw: { fontWeight: 900, color: "#b91c1c" }, // red

  // Pills
  pillGreen: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #bbf7d0",
    background: "#ecfdf5",
    color: "#065f46",
    fontSize: 12,
    fontWeight: 900,
  },
  pillRed: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    fontSize: 12,
    fontWeight: 900,
  },
  pillNeutral: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 900,
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
