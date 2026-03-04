// src/pages/Investment_dipwid.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_dipwid() {
  const navigate = useNavigate();

  // ✅ Always get fresh token (do NOT memoize with [])
  const getToken = () => localStorage.getItem("token") || "";

  // ✅ Always build fresh headers for every request
  const getHeaders = () => {
    const token = getToken();
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

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

  const closeModal = () => setModal((m) => ({ ...m, open: false, title: "", message: "", onConfirm: null }));

  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

  // click/tap effect
  const press = (e) => (e.currentTarget.style.transform = "scale(0.98)");
  const release = (e) => (e.currentTarget.style.transform = "scale(1)");

  // -------------------- responsive --------------------
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1100 : false);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 1100);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const Btn = ({ variant, small, disabled, onClick, children, type = "button", style }) => (
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
        ...(style || null),
      }}
    >
      {children}
    </button>
  );

  // -------------------- API helper (with 401 handling) --------------------
  const request = async (url, options = {}) => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      throw new Error("Please login again.");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("user");
      navigate("/login");
      throw new Error(data?.message || "Session expired. Please login again.");
    }

    if (!res.ok) throw new Error(data?.message || "Request failed");
    return data;
  };

  const api = {
    async getPlatforms() {
      const data = await request(`${BASE_URL}/api/investment/platform-segment/platform`, { method: "GET" });
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getSegments(pid) {
      if (!pid) return [];
      const data = await request(`${BASE_URL}/api/investment/platform-segment/segment?platform_id=${pid}`, {
        method: "GET",
      });
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getPlans(pid, sid) {
      const qs = new URLSearchParams();
      if (pid) qs.set("platform_id", String(pid));
      if (sid) qs.set("segment_id", String(sid));
      const data = await request(`${BASE_URL}/api/investment/plan?${qs.toString()}`, { method: "GET" });
      return Array.isArray(data?.data) ? data.data : [];
    },

    async createDipWid(payload) {
      const data = await request(`${BASE_URL}/api/investment/dipwid`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return data?.data;
    },

    async getLedger({ platform_id, segment_id, plan_id }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (plan_id) qs.set("plan_id", String(plan_id));

      const data = await request(`${BASE_URL}/api/investment/dipwid/ledger?${qs.toString()}`, { method: "GET" });
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getMonthSummary({ platform_id, segment_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (month) qs.set("month", month);

      const data = await request(`${BASE_URL}/api/investment/dipwid/month-summary?${qs.toString()}`, {
        method: "GET",
      });
      return Array.isArray(data?.data) ? data.data : [];
    },

    async deleteDipWid(id) {
      await request(`${BASE_URL}/api/investment/dipwid/${id}`, { method: "DELETE" });
      return true;
    },
  };

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
    const s = String(v).trim();
    return s ? s : "-";
  };

  const fmtMonth = (val) => {
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "-";
      return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(d);
    } catch {
      return "-";
    }
  };

  const fmtDateTime = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    const datePart = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
    const timePart = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(d);
    return `${datePart}, ${timePart}`;
  };

  // quick totals (nice look)
  const totals = ledgerRows.reduce(
    (acc, r) => {
      const isDep = String(r.txn_type).toUpperCase() === "DEPOSIT";
      const amt = Number(String(r.amount ?? 0).replace(/[^\d.-]/g, "")) || 0;
      if (isDep) acc.deposit += amt;
      else acc.withdraw += amt;
      return acc;
    },
    { deposit: 0, withdraw: 0 }
  );
  const net = totals.deposit - totals.withdraw;

  return (
    <div style={styles.page}>
      <style>{styles.css}</style>

      {/* Header */}
      <div style={styles.topbar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={styles.title}>Deposit / Withdrawal</div>
          <div style={styles.subtitle}>Track cash flow • Filter by platform/segment/plan • Monthly insights</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Btn
            small
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={loading || busy === "refresh"}
            style={{ minWidth: 88 }}
          >
            ← Back
          </Btn>
          <Btn small variant="primary" onClick={refreshViews} disabled={busy === "refresh" || loading}>
            {busy === "refresh" || loading ? "..." : "Refresh"}
          </Btn>
        </div>
      </div>

      <div style={styles.grid(wide)}>
        {/* LEFT: FORM */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Add Entry</div>
            <div style={styles.cardMeta}>Required: Platform + Segment</div>
          </div>

          <form style={styles.form} onSubmit={onSubmit} noValidate>
            <div style={styles.field}>
              <div style={styles.label}>Platform</div>
              <select style={styles.select} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                <option value="">Select Platform</option>
                {platforms.map((p) => (
                  <option key={p.platform_id} value={p.platform_id}>
                    {p.platform_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Segment</div>
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

            <div style={styles.field}>
              <div style={styles.label}>Plan (Optional)</div>
              <select
                style={styles.select}
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={!platformId || !segmentId}
              >
                <option value="">Select Plan (Optional)</option>
                {plans.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>
                    {p.plan_name ? p.plan_name : `Plan #${p.plan_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.row2(wide)}>
              <div style={styles.field}>
                <div style={styles.label}>Type</div>
                <select style={styles.select} value={txnType} onChange={(e) => setTxnType(e.target.value)}>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Amount</div>
                <input
                  style={styles.input}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Note (Optional)</div>
              <textarea
                style={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (example: Bank transfer / Cash / Profit booking)"
              />
            </div>

            <div style={styles.btnRow}>
              <Btn variant="primary" type="submit" disabled={busy === "save"}>
                {busy === "save" ? "Saving..." : "Save"}
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setTxnType("DEPOSIT");
                  setAmount("");
                  setNote("");
                }}
                disabled={busy === "save"}
              >
                Clear
              </Btn>
            </div>

            <div style={styles.hintBox}>
              <div style={{ fontWeight: 950 }}>Tip</div>
              <div style={{ fontSize: 12, color: "rgba(15,23,42,.72)", lineHeight: 1.35 }}>
                Use <b>Deposit</b> for adding funds, <b>Withdraw</b> for removing funds. You can filter by month using the
                selector on the Ledger card.
              </div>
            </div>
          </form>
        </section>

        {/* RIGHT: LEDGER + MONTH SUMMARY */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={styles.cardTitle}>Ledger</div>
              <div style={{ fontSize: 12, color: "rgba(15,23,42,.62)", fontWeight: 800, margin: "0 12px 10px" }}>
                {ledgerRows.length} entries • Balance flow overview
              </div>
            </div>

            <div style={styles.cardMeta}>
              <input
                style={{ ...styles.input, height: 38, width: 170, background: "rgba(255,255,255,.92)" }}
                type="month"
                value={month.slice(0, 7)}
                onChange={(e) => setMonth(`${e.target.value}-01`)}
              />
            </div>
          </div>

          {/* mini stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Deposit</div>
              <div style={{ ...styles.statValue, color: "#16a34a" }}>{totals.deposit ? totals.deposit : 0}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Withdraw</div>
              <div style={{ ...styles.statValue, color: "#ef4444" }}>{totals.withdraw ? totals.withdraw : 0}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Net</div>
              <div style={{ ...styles.statValue, color: net >= 0 ? "#16a34a" : "#ef4444" }}>{net}</div>
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
                    <tr key={r.dipwid_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 950 }}>{fmtDateTime(r.txn_at)}</div>
                        <div style={{ fontSize: 12, color: "rgba(100,116,139,.95)", fontWeight: 800 }}>
                          #{r.dipwid_id}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={isDep ? styles.pillGreen : styles.pillRed}>{isDep ? "Deposit" : "Withdraw"}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={isDep ? styles.amountDeposit : styles.amountWithdraw}>{money(r.amount)}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.pillNeutral}>{money(r.running_balance)}</span>
                      </td>

                      <td style={{ ...styles.td, maxWidth: 360 }}>
                        <div style={styles.wrapText}>{r.note ? r.note : "-"}</div>
                      </td>

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

          <div style={{ height: 14 }} />

          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Monthly Summary</div>
            <div style={styles.cardMeta} />
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
                  <tr key={idx} style={styles.tr}>
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

      <div style={{ height: 90 }} />

      {/* Center Modal (improved: center + maxHeight + scroll + footer visible) */}
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
                  <Btn variant="ghost" onClick={closeModal}>
                    {modal.cancelText}
                  </Btn>
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

// -------------------- Enhanced styles (new font + attractive look) --------------------
const styles = {
  css: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

    * { -webkit-tap-highlight-color: transparent; }
  `,

  page: {
    width: "100vw",
    minHeight: "100vh",
    margin: 0,
    padding: 0,
    color: "#0f172a",
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    paddingBottom: 70,
    boxSizing: "border-box",
    background:
      "radial-gradient(900px 520px at 10% 10%, rgba(124,58,237,.14), transparent 60%), radial-gradient(900px 520px at 92% 12%, rgba(6,182,212,.12), transparent 60%), radial-gradient(900px 520px at 40% 96%, rgba(245,158,11,.12), transparent 60%), linear-gradient(135deg, #f6f8ff, #fff7f1)",
  },

  topbar: {
    width: "100%",
    borderBottom: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.72)",
    backdropFilter: "blur(14px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 12px",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  title: { margin: 0, fontSize: 16, fontWeight: 950, letterSpacing: 0.2 },
  subtitle: { fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,.62)" },

  grid: (wide) => ({
    width: "100%",
    display: "grid",
    gridTemplateColumns: wide ? "420px 1fr" : "1fr",
    gap: 12,
    padding: 12,
    boxSizing: "border-box",
  }),

  card: {
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.86)",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(15,23,42,0.10)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.74)",
  },
  cardTitle: { margin: "12px 12px", fontSize: 14, fontWeight: 950 },
  cardMeta: { margin: "10px 12px", fontSize: 12, color: "rgba(15,23,42,.62)", fontWeight: 800 },

  form: { margin: "12px 12px 14px", display: "grid", gap: 10 },
  row2: (wide) => ({ display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 10 }),
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, fontWeight: 950, color: "rgba(15,23,42,.62)" },

  input: {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.14)",
    padding: "0 12px",
    outline: "none",
    background: "rgba(255,255,255,.94)",
    color: "#0f172a",
    fontSize: 14,
    boxSizing: "border-box",
    fontWeight: 800,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  },
  select: {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.14)",
    padding: "0 12px",
    outline: "none",
    background: "rgba(255,255,255,.94)",
    color: "#0f172a",
    fontSize: 14,
    boxSizing: "border-box",
    fontWeight: 800,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  },
  textarea: {
    minHeight: 84,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.14)",
    padding: "10px 12px",
    outline: "none",
    background: "rgba(255,255,255,.94)",
    color: "#0f172a",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
    fontWeight: 800,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  },

  hintBox: {
    marginTop: 4,
    borderRadius: 16,
    border: "1px dashed rgba(124,58,237,.35)",
    background: "linear-gradient(135deg, rgba(124,58,237,.10), rgba(6,182,212,.08))",
    padding: 12,
  },

  btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: (variant, small) => ({
    height: small ? 36 : 44,
    padding: small ? "0 12px" : "0 16px",
    borderRadius: 14,
    border:
      variant === "primary"
        ? "1px solid rgba(15,23,42,.14)"
        : variant === "danger"
        ? "1px solid rgba(185,28,28,.35)"
        : "1px solid rgba(15,23,42,.14)",
    background:
      variant === "primary"
        ? "linear-gradient(135deg, #0f172a, #1f2937)"
        : variant === "danger"
        ? "linear-gradient(135deg, #991b1b, #ef4444)"
        : "rgba(255,255,255,.92)",
    color: variant === "primary" || variant === "danger" ? "#ffffff" : "#0f172a",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 14px 28px rgba(15,23,42,0.12)",
    transition: "transform 0.06s ease, box-shadow 0.12s ease",
    userSelect: "none",
    whiteSpace: "nowrap",
  }),
  btnDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none", boxShadow: "none" },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    padding: "12px 12px 0",
  },
  statCard: {
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.82)",
    padding: 12,
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  },
  statLabel: { fontSize: 12, fontWeight: 950, color: "rgba(15,23,42,.60)" },
  statValue: { fontSize: 16, fontWeight: 1000, marginTop: 4 },

  tableWrap: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th: {
    textAlign: "left",
    fontSize: 12,
    color: "rgba(15,23,42,.62)",
    borderBottom: "1px solid rgba(15,23,42,.10)",
    padding: "10px 12px",
    background: "rgba(248,250,252,.90)",
    position: "sticky",
    top: 0,
    zIndex: 1,
    whiteSpace: "nowrap",
    fontWeight: 950,
  },
  td: {
    borderBottom: "1px solid rgba(241,245,249,0.9)",
    padding: "10px 12px",
    fontSize: 13,
    verticalAlign: "top",
    fontWeight: 800,
  },
  tr: {
    transition: "background 120ms ease",
  },

  wrapText: {
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: 1.25,
    color: "rgba(15,23,42,.86)",
  },

  amountDeposit: { fontWeight: 1000, color: "#16a34a" },
  amountWithdraw: { fontWeight: 1000, color: "#ef4444" },

  pillGreen: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(34,197,94,.22)",
    background: "rgba(34,197,94,.10)",
    color: "#166534",
    fontSize: 12,
    fontWeight: 950,
  },
  pillRed: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(244,63,94,.25)",
    background: "rgba(244,63,94,.10)",
    color: "#9f1239",
    fontSize: 12,
    fontWeight: 950,
  },
  pillNeutral: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,.12)",
    background: "rgba(248,250,252,.92)",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 950,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.42)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    zIndex: 50,
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
  },
  modal: {
    width: "min(92vw, 460px)",
    maxHeight: "92vh",
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid rgba(15,23,42,.12)",
    boxShadow: "0 22px 60px rgba(0,0,0,0.30)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  modalHead: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(15,23,42,.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: "rgba(255,255,255,.92)",
  },
  modalTitle: { margin: 0, fontSize: 14, fontWeight: 1000, color: "#0f172a" },
  modalBody: { padding: "12px 14px", fontSize: 13, color: "#0f172a", overflow: "auto", fontWeight: 850 },
  modalFoot: {
    padding: "12px 14px",
    borderTop: "1px solid rgba(15,23,42,.10)",
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    background: "rgba(255,255,255,.94)",
    position: "sticky",
    bottom: 0,
    paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  },
  xBtn: {
    border: "1px solid rgba(15,23,42,.12)",
    background: "rgba(255,255,255,.92)",
    borderRadius: 12,
    height: 36,
    width: 36,
    cursor: "pointer",
    fontWeight: 1000,
    lineHeight: "34px",
    userSelect: "none",
    boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
  },
};