// src/pages/Investment_dipwid.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_dipwid() {
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem("token") || "";

  const getHeaders = () => {
    const token = getToken();
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);
  const [plans, setPlans] = useState([]);

  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [planId, setPlanId] = useState("");

  const [txnType, setTxnType] = useState("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [ledgerRows, setLedgerRows] = useState([]);
  const [monthSummaryRows, setMonthSummaryRows] = useState([]);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isTabletUp = screenWidth >= 768;
  const isDesktop = screenWidth >= 1100;

  const openModal = (p) => {
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
  };

  const closeModal = () => {
    setModal((m) => ({
      ...m,
      open: false,
      title: "",
      message: "",
      onConfirm: null,
    }));
  };

  useEffect(() => {
    if (!modal.open) return;
    if (modal.type === "success" || modal.type === "error") {
      const timer = setTimeout(() => {
        closeModal();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [modal.open, modal.type]);

  const toast = (msg) =>
    openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) =>
    openModal({ type: "error", title: "Error", message: msg });

  const press = (e) => {
    e.currentTarget.style.transform = "scale(0.98)";
  };

  const release = (e) => {
    e.currentTarget.style.transform = "scale(1)";
  };

  const Btn = ({
    variant,
    small,
    disabled,
    onClick,
    children,
    type = "button",
    style,
  }) => (
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
        ...(disabled ? styles.btnDisabled : {}),
        ...style,
      }}
      className="page-btn"
    >
      {children}
    </button>
  );

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
      const data = await request(
        `${BASE_URL}/api/investment/platform-segment/platform`,
        { method: "GET" }
      );
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getSegments(pid) {
      if (!pid) return [];
      const data = await request(
        `${BASE_URL}/api/investment/platform-segment/segment?platform_id=${pid}`,
        { method: "GET" }
      );
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getPlans(pid, sid) {
      const qs = new URLSearchParams();
      if (pid) qs.set("platform_id", String(pid));
      if (sid) qs.set("segment_id", String(sid));
      const data = await request(
        `${BASE_URL}/api/investment/plan?${qs.toString()}`,
        { method: "GET" }
      );
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

      const data = await request(
        `${BASE_URL}/api/investment/dipwid/ledger?${qs.toString()}`,
        { method: "GET" }
      );
      return Array.isArray(data?.data) ? data.data : [];
    },

    async getMonthSummary({ platform_id, segment_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (month) qs.set("month", month);

      const data = await request(
        `${BASE_URL}/api/investment/dipwid/month-summary?${qs.toString()}`,
        { method: "GET" }
      );
      return Array.isArray(data?.data) ? data.data : [];
    },

    async deleteDipWid(id) {
      await request(`${BASE_URL}/api/investment/dipwid/${id}`, {
        method: "DELETE",
      });
      return true;
    },
  };

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
  }, []);

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
  }, [platformId]);

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
  }, [platformId, segmentId]);

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
  }, [platformId, segmentId, planId, month]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!platformId) return fail("Select platform");
    if (!segmentId) return fail("Select segment");

    const amt = Number(String(amount).replace(/[^\d]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) return fail("Amount must be greater than 0");

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
      toast("Saved successfully");
      setAmount("");
      setNote("");
      await refreshViews();
    } catch (e) {
      fail(e.message);
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
          toast("Deleted successfully");
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

  const money = (v) => {
    if (v === null || v === undefined) return "-";
    const s = String(v).trim();
    return s ? s : "-";
  };

  const fmtMonth = (val) => {
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "-";
      return new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return "-";
    }
  };

  const fmtDateTime = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    const datePart = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return `${datePart}, ${timePart}`;
  };

  const totals = useMemo(() => {
    return ledgerRows.reduce(
      (acc, r) => {
        const isDep = String(r.txn_type).toUpperCase() === "DEPOSIT";
        const amt = Number(String(r.amount ?? 0).replace(/[^\d.-]/g, "")) || 0;
        if (isDep) acc.deposit += amt;
        else acc.withdraw += amt;
        return acc;
      },
      { deposit: 0, withdraw: 0 }
    );
  }, [ledgerRows]);

  const net = totals.deposit - totals.withdraw;

  return (
    <div style={styles.page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden;
          font-family: Inter, Arial, sans-serif;
          background: #f7f8ff;
        }

        .fade-up {
          animation: fadeUp .35s ease;
        }

        .fade-in {
          animation: fadeIn .3s ease;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .page-btn {
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }

        .page-btn:hover {
          filter: brightness(1.03);
          box-shadow: 0 14px 28px rgba(15,23,42,.14);
        }

        .soft-card {
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }

        .soft-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(15,23,42,.10);
        }

        .field-control {
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .field-control:focus {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 4px rgba(124,58,237,.12);
          background: #ffffff !important;
        }

        .table-scroll::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .table-scroll::-webkit-scrollbar-thumb {
          background: #d7d8f7;
          border-radius: 999px;
        }

        .table-scroll::-webkit-scrollbar-track {
          background: #eff2ff;
        }

        @media (max-width: 1099px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 767px) {
          .desktop-only {
            display: none !important;
          }

          .page-space {
            padding: 10px !important;
          }

          .sticky-head {
            padding: 10px !important;
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .sticky-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }

          .sticky-actions button {
            flex: 1 !important;
          }

          .mini-stats {
            grid-template-columns: 1fr !important;
          }

          .mobile-card-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }

          .mobile-full-btn {
            width: 100% !important;
          }

          .popup-mobile {
            width: calc(100% - 24px) !important;
            max-width: 380px !important;
            padding: 18px 14px !important;
          }
        }

        @media (min-width: 768px) {
          .mobile-only {
            display: none !important;
          }
        }
      `}</style>

      <div style={styles.topbar} className="sticky-head">
        <div style={styles.topbarLeft}>
          <div style={styles.title}>Deposit / Withdrawal</div>
          <div style={styles.subtitle}>
            Track cash flow • Filter by platform, segment, plan • Monthly insights
          </div>
        </div>

        <div style={styles.topbarActions} className="sticky-actions">
          <Btn
            small
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={loading || busy === "refresh"}
            style={{ minWidth: 88 }}
          >
            ← Back
          </Btn>

          <Btn
            small
            variant="primary"
            onClick={refreshViews}
            disabled={busy === "refresh" || loading}
            style={{ minWidth: 100 }}
          >
            {busy === "refresh" || loading ? "Loading..." : "Refresh"}
          </Btn>
        </div>
      </div>

      <div style={styles.pageInner} className="page-space">
        <div style={styles.grid(isDesktop)} className="main-grid">
          <section style={styles.card} className="soft-card fade-up">
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>Add Entry</div>
                <div style={styles.cardMeta}>Required: Platform + Segment</div>
              </div>
            </div>

            <form style={styles.form} onSubmit={onSubmit} noValidate>
              <div style={styles.field}>
                <label style={styles.label}>Platform</label>
                <select
                  style={styles.select}
                  className="field-control"
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
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Segment</label>
                <select
                  style={styles.select}
                  className="field-control"
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
                <label style={styles.label}>Plan (Optional)</label>
                <select
                  style={styles.select}
                  className="field-control"
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

              <div style={styles.row2(isTabletUp)}>
                <div style={styles.field}>
                  <label style={styles.label}>Type</label>
                  <select
                    style={styles.select}
                    className="field-control"
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value)}
                  >
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAW">Withdraw</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Amount</label>
                  <input
                    style={styles.input}
                    className="field-control"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^\d]/g, ""))
                    }
                    inputMode="numeric"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Note (Optional)</label>
                <textarea
                  style={styles.textarea}
                  className="field-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note like bank transfer, cash, profit booking"
                />
              </div>

              <div style={styles.btnRow}>
                <Btn
                  variant="primary"
                  type="submit"
                  disabled={busy === "save"}
                  style={{ flex: 1 }}
                >
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
                  style={{ flex: 1 }}
                >
                  Clear
                </Btn>
              </div>

              <div style={styles.hintBox}>
                <div style={styles.hintTitle}>Tip</div>
                <div style={styles.hintText}>
                  Use <b>Deposit</b> for adding funds and <b>Withdraw</b> for
                  removing funds. Filter month from the right side to check ledger
                  and summary cleanly.
                </div>
              </div>
            </form>
          </section>

          <section style={styles.card} className="soft-card fade-up">
            <div style={styles.cardHeaderResponsive}>
              <div>
                <div style={styles.cardTitle}>Ledger</div>
                <div style={styles.cardMeta}>
                  {ledgerRows.length} entries • Balance flow overview
                </div>
              </div>

              <div style={styles.monthInputWrap}>
                <input
                  style={styles.monthInput}
                  className="field-control"
                  type="month"
                  value={month.slice(0, 7)}
                  onChange={(e) => setMonth(`${e.target.value}-01`)}
                />
              </div>
            </div>

            <div style={styles.statsRow} className="mini-stats">
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Deposit</div>
                <div style={{ ...styles.statValue, color: "#16a34a" }}>
                  {totals.deposit || 0}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Withdraw</div>
                <div style={{ ...styles.statValue, color: "#ef4444" }}>
                  {totals.withdraw || 0}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Net</div>
                <div
                  style={{
                    ...styles.statValue,
                    color: net >= 0 ? "#16a34a" : "#ef4444",
                  }}
                >
                  {net}
                </div>
              </div>
            </div>

            <div className="desktop-only">
              <div style={styles.tableWrap} className="table-scroll">
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
                      const isDep =
                        String(r.txn_type).toUpperCase() === "DEPOSIT";

                      return (
                        <tr key={r.dipwid_id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.primaryCellText}>
                              {fmtDateTime(r.txn_at)}
                            </div>
                            <div style={styles.secondaryCellText}>
                              #{r.dipwid_id}
                            </div>
                          </td>

                          <td style={styles.td}>
                            <span style={isDep ? styles.pillGreen : styles.pillRed}>
                              {isDep ? "Deposit" : "Withdraw"}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={
                                isDep
                                  ? styles.amountDeposit
                                  : styles.amountWithdraw
                              }
                            >
                              {money(r.amount)}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <span style={styles.pillNeutral}>
                              {money(r.running_balance)}
                            </span>
                          </td>

                          <td style={{ ...styles.td, maxWidth: 340 }}>
                            <div style={styles.wrapText}>
                              {r.note ? r.note : "-"}
                            </div>
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
            </div>

            <div className="mobile-only mobile-card-list" style={{ padding: 12 }}>
              {ledgerRows.length === 0 && !loading ? (
                <div style={styles.emptyCard}>No entries found.</div>
              ) : (
                ledgerRows.map((r) => {
                  const isDep = String(r.txn_type).toUpperCase() === "DEPOSIT";

                  return (
                    <div key={r.dipwid_id} style={styles.mobileLedgerCard}>
                      <div style={styles.mobileLedgerTop}>
                        <div>
                          <div style={styles.primaryCellText}>
                            {fmtDateTime(r.txn_at)}
                          </div>
                          <div style={styles.secondaryCellText}>
                            Entry #{r.dipwid_id}
                          </div>
                        </div>

                        <span style={isDep ? styles.pillGreen : styles.pillRed}>
                          {isDep ? "Deposit" : "Withdraw"}
                        </span>
                      </div>

                      <div style={styles.mobileInfoGrid}>
                        <div style={styles.infoItem}>
                          <span style={styles.infoItemLabel}>Amount</span>
                          <span
                            style={
                              isDep ? styles.amountDeposit : styles.amountWithdraw
                            }
                          >
                            {money(r.amount)}
                          </span>
                        </div>

                        <div style={styles.infoItem}>
                          <span style={styles.infoItemLabel}>Balance</span>
                          <span style={styles.pillNeutral}>
                            {money(r.running_balance)}
                          </span>
                        </div>
                      </div>

                      <div style={styles.noteBox}>
                        <div style={styles.infoItemLabel}>Note</div>
                        <div style={styles.wrapText}>{r.note ? r.note : "-"}</div>
                      </div>

                      <Btn
                        variant="danger"
                        small
                        onClick={() => onDelete(r.dipwid_id)}
                        disabled={busy === `del-${r.dipwid_id}`}
                        style={{ width: "100%" }}
                        className="mobile-full-btn"
                      >
                        {busy === `del-${r.dipwid_id}` ? "Deleting..." : "Delete"}
                      </Btn>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ height: 14 }} />

            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>Monthly Summary</div>
                <div style={styles.cardMeta}>Monthly deposit and withdrawal view</div>
              </div>
            </div>

            <div className="desktop-only">
              <div style={styles.tableWrap} className="table-scroll">
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
                          <span style={styles.pillNeutral}>
                            {money(m.deposits_count)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.pillNeutral}>
                            {money(m.withdrawals_count)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.amountDeposit}>
                            {money(m.total_deposit)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.amountWithdraw}>
                            {money(m.total_withdraw)}
                          </span>
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
            </div>

            <div className="mobile-only mobile-card-list" style={{ padding: 12 }}>
              {monthSummaryRows.length === 0 && !loading ? (
                <div style={styles.emptyCard}>No summary found.</div>
              ) : (
                monthSummaryRows.map((m, idx) => (
                  <div key={idx} style={styles.mobileSummaryCard}>
                    <div style={styles.mobileSummaryMonth}>
                      {fmtMonth(m.month_start)}
                    </div>

                    <div style={styles.mobileInfoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoItemLabel}>Deposits</span>
                        <span style={styles.pillNeutral}>
                          {money(m.deposits_count)}
                        </span>
                      </div>

                      <div style={styles.infoItem}>
                        <span style={styles.infoItemLabel}>Withdrawals</span>
                        <span style={styles.pillNeutral}>
                          {money(m.withdrawals_count)}
                        </span>
                      </div>

                      <div style={styles.infoItem}>
                        <span style={styles.infoItemLabel}>Total Deposit</span>
                        <span style={styles.amountDeposit}>
                          {money(m.total_deposit)}
                        </span>
                      </div>

                      <div style={styles.infoItem}>
                        <span style={styles.infoItemLabel}>Total Withdraw</span>
                        <span style={styles.amountWithdraw}>
                          {money(m.total_withdraw)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div style={styles.bottomSafeSpace}></div>
      </div>

      {modal.open ? (
        <div style={styles.overlay} className="fade-in" role="dialog" aria-modal="true">
          <div style={styles.modal} className="popup-mobile fade-up">
            <div style={styles.modalHead}>
              <div
                style={{
                  ...styles.modalIcon,
                  background:
                    modal.type === "success"
                      ? "linear-gradient(135deg, #16a34a, #22c55e)"
                      : modal.type === "error"
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : modal.type === "confirm"
                      ? "linear-gradient(135deg, #f59e0b, #f97316)"
                      : "linear-gradient(135deg, #6366f1, #7c3aed)",
                }}
              >
                {modal.type === "success"
                  ? "✓"
                  : modal.type === "error"
                  ? "!"
                  : modal.type === "confirm"
                  ? "?"
                  : "i"}
              </div>

              <h3 style={styles.modalTitle}>{modal.title}</h3>
              <button style={styles.xBtn} onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <div style={styles.modalBody}>{modal.message}</div>

            <div style={styles.modalFoot}>
              {modal.type === "confirm" ? (
                <>
                  <Btn variant="ghost" onClick={closeModal} style={{ flex: 1 }}>
                    {modal.cancelText}
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (typeof modal.onConfirm === "function") modal.onConfirm();
                      else closeModal();
                    }}
                    style={{ flex: 1 }}
                  >
                    {modal.confirmText}
                  </Btn>
                </>
              ) : (
                <Btn variant="primary" onClick={closeModal} style={{ width: "100%" }}>
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

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(900px 520px at 10% 10%, rgba(124,58,237,.14), transparent 60%), radial-gradient(900px 520px at 92% 12%, rgba(6,182,212,.12), transparent 60%), radial-gradient(900px 520px at 40% 96%, rgba(245,158,11,.12), transparent 60%), linear-gradient(135deg, #f6f8ff, #fff7f1)",
    color: "#0f172a",
    paddingBottom: "env(safe-area-inset-bottom)",
  },

  pageInner: {
    width: "100%",
    maxWidth: "1440px",
    margin: "0 auto",
    padding: "12px",
  },

  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    width: "100%",
    borderBottom: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.72)",
    backdropFilter: "blur(16px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
  },

  topbarLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  topbarActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 900,
    letterSpacing: ".2px",
    color: "#0f172a",
  },

  subtitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "rgba(15,23,42,.62)",
    lineHeight: 1.5,
  },

  grid: (wide) => ({
    width: "100%",
    display: "grid",
    gridTemplateColumns: wide ? "400px 1fr" : "1fr",
    gap: 14,
    alignItems: "start",
  }),

  card: {
    border: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.88)",
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 14px 36px rgba(15,23,42,0.08)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
    borderBottom: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.64)",
  },

  cardHeaderResponsive: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderBottom: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.64)",
    flexWrap: "wrap",
  },

  cardTitle: {
    fontSize: "15px",
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 2,
  },

  cardMeta: {
    fontSize: "12px",
    color: "rgba(15,23,42,.62)",
    fontWeight: 700,
  },

  monthInputWrap: {
    minWidth: 160,
  },

  monthInput: {
    width: "100%",
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,.12)",
    padding: "0 12px",
    outline: "none",
    background: "rgba(255,255,255,.94)",
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
  },

  form: {
    margin: "14px",
    display: "grid",
    gap: 12,
  },

  row2: (tabletUp) => ({
    display: "grid",
    gridTemplateColumns: tabletUp ? "1fr 1fr" : "1fr",
    gap: 12,
  }),

  field: {
    display: "grid",
    gap: 6,
  },

  label: {
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(15,23,42,.70)",
  },

  input: {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.12)",
    padding: "0 12px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },

  select: {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.12)",
    padding: "0 12px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },

  textarea: {
    minHeight: 94,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.12)",
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    resize: "vertical",
    lineHeight: 1.5,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },

  btnRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  btn: (variant, small) => ({
    height: small ? 36 : 46,
    padding: small ? "0 12px" : "0 16px",
    borderRadius: 14,
    border:
      variant === "primary"
        ? "1px solid rgba(15,23,42,.14)"
        : variant === "danger"
        ? "1px solid rgba(185,28,28,.30)"
        : "1px solid rgba(15,23,42,.12)",
    background:
      variant === "primary"
        ? "linear-gradient(135deg, #111827, #312e81)"
        : variant === "danger"
        ? "linear-gradient(135deg, #b91c1c, #ef4444)"
        : "linear-gradient(135deg, rgba(255,255,255,.94), rgba(248,250,252,.98))",
    color: variant === "primary" || variant === "danger" ? "#fff" : "#0f172a",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: small ? 12 : 14,
    boxShadow: "0 10px 22px rgba(15,23,42,0.10)",
    whiteSpace: "nowrap",
  }),

  btnDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  hintBox: {
    marginTop: 2,
    borderRadius: 16,
    border: "1px dashed rgba(124,58,237,.28)",
    background:
      "linear-gradient(135deg, rgba(124,58,237,.08), rgba(6,182,212,.06), rgba(245,158,11,.06))",
    padding: 12,
  },

  hintTitle: {
    fontWeight: 900,
    fontSize: 13,
    marginBottom: 6,
    color: "#312e81",
  },

  hintText: {
    fontSize: 12,
    lineHeight: 1.55,
    color: "rgba(15,23,42,.76)",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    padding: "14px 14px 0",
  },

  statCard: {
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.86)",
    padding: 12,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  },

  statLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(15,23,42,.60)",
  },

  statValue: {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 6,
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: 980,
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    fontSize: 12,
    color: "rgba(15,23,42,.64)",
    borderBottom: "1px solid rgba(15,23,42,.08)",
    padding: "12px 14px",
    background: "rgba(248,250,252,.94)",
    whiteSpace: "nowrap",
    fontWeight: 800,
  },

  td: {
    borderBottom: "1px solid rgba(226,232,240,.85)",
    padding: "12px 14px",
    fontSize: 13,
    verticalAlign: "top",
    fontWeight: 700,
    color: "#0f172a",
  },

  tr: {
    transition: "background 120ms ease",
  },

  primaryCellText: {
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.4,
  },

  secondaryCellText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
    marginTop: 4,
  },

  wrapText: {
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: 1.45,
    color: "rgba(15,23,42,.82)",
  },

  amountDeposit: {
    fontWeight: 900,
    color: "#16a34a",
  },

  amountWithdraw: {
    fontWeight: 900,
    color: "#ef4444",
  },

  pillGreen: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(34,197,94,.22)",
    background: "rgba(34,197,94,.10)",
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
  },

  pillRed: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(244,63,94,.22)",
    background: "rgba(244,63,94,.10)",
    color: "#9f1239",
    fontSize: 12,
    fontWeight: 800,
  },

  pillNeutral: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(241,245,249,.90)",
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
  },

  mobileLedgerCard: {
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  },

  mobileLedgerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },

  mobileInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },

  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,.06)",
    borderRadius: 12,
    padding: 10,
  },

  infoItemLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#64748b",
  },

  noteBox: {
    marginBottom: 12,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,.06)",
    borderRadius: 12,
    padding: 10,
  },

  mobileSummaryCard: {
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  },

  mobileSummaryMonth: {
    fontSize: 15,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 10,
  },

  emptyCard: {
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 700,
  },

  bottomSafeSpace: {
    width: "100%",
    height: 110,
    flexShrink: 0,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.44)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    zIndex: 9999,
  },

  modal: {
    width: "100%",
    maxWidth: 390,
    background: "#ffffff",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 20px 44px rgba(15,23,42,.20)",
    border: "1px solid rgba(15,23,42,.08)",
  },

  modalHead: {
    position: "relative",
    textAlign: "center",
    paddingTop: 4,
  },

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    margin: "0 auto 12px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 900,
    fontSize: 24,
  },

  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    color: "#0f172a",
  },

  xBtn: {
    position: "absolute",
    right: -2,
    top: -4,
    border: "none",
    background: "transparent",
    fontSize: 24,
    color: "#64748b",
    cursor: "pointer",
    lineHeight: 1,
  },

  modalBody: {
    marginTop: 12,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    fontWeight: 600,
  },

  modalFoot: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 18,
  },
};