// src/pages/Investment_dipwid.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_dipwid() {
  const navigate = useNavigate();

  const getCurrentMonthValue = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const ALL_MONTHS_VALUE = "ALL";

  const getToken = () => localStorage.getItem("token") || "";

  const getHeaders = () => {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
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

  const [month, setMonth] = useState(getCurrentMonthValue());

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const openModal = ({
    type = "info",
    title = "",
    message = "",
    confirmText = "OK",
    cancelText = "Cancel",
    onConfirm = null,
  }) => {
    setModal({
      open: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

  const closeModal = () => {
    setModal({
      open: false,
      type: "info",
      title: "",
      message: "",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: null,
    });
  };

  useEffect(() => {
    if (!modal.open) return;
    if (modal.type === "success" || modal.type === "error") {
      const timer = setTimeout(() => closeModal(), 1800);
      return () => clearTimeout(timer);
    }
  }, [modal]);

  const toast = (message) =>
    openModal({ type: "success", title: "Success", message });

  const fail = (message) =>
    openModal({ type: "error", title: "Error", message });

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

    if (!res.ok) {
      throw new Error(data?.message || "Request failed");
    }

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
      if (month && month !== ALL_MONTHS_VALUE) qs.set("month", `${month}-01`);

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

  const formatDateOnly = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  const getMonthKey = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const money = (value) => {
    const num = Number(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatMonthLabel = (monthValue) => {
    if (!monthValue) return "-";
    if (monthValue === ALL_MONTHS_VALUE) return "All Months";

    const [year, monthNum] = monthValue.split("-");
    const d = new Date(Number(year), Number(monthNum) - 1, 1);
    if (Number.isNaN(d.getTime())) return "-";

    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
    }).format(d);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.getPlatforms();
        setPlatforms(data);
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

        const data = await api.getSegments(platformId);
        setSegments(data);
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

        const data = await api.getPlans(platformId, segmentId);
        setPlans(data);
      } catch (e) {
        fail(e.message);
      }
    })();
  }, [platformId, segmentId]);

  const availableMonths = useMemo(() => {
    const set = new Set();

    ledgerRows.forEach((row) => {
      const mk = getMonthKey(row.txn_at);
      if (mk) set.add(mk);
    });

    monthSummaryRows.forEach((row) => {
      const mk = getMonthKey(row.month_start);
      if (mk) set.add(mk);
    });

    set.add(getCurrentMonthValue());

    return [ALL_MONTHS_VALUE, ...Array.from(set).sort((a, b) => b.localeCompare(a))];
  }, [ledgerRows, monthSummaryRows]);

  const refreshViews = async () => {
    try {
      setLoading(true);

      const ledger = await api.getLedger({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        plan_id: planId ? Number(planId) : null,
      });

      const summary = await api.getMonthSummary({
        platform_id: platformId ? Number(platformId) : null,
        segment_id: segmentId ? Number(segmentId) : null,
        month: month === ALL_MONTHS_VALUE ? null : month,
      });

      const finalLedger =
        month === ALL_MONTHS_VALUE
          ? Array.isArray(ledger)
            ? ledger
            : []
          : Array.isArray(ledger)
          ? ledger.filter((row) => getMonthKey(row.txn_at) === month)
          : [];

      const finalSummary =
        month === ALL_MONTHS_VALUE
          ? Array.isArray(summary)
            ? summary
            : []
          : Array.isArray(summary)
          ? summary.filter((row) => getMonthKey(row.month_start) === month)
          : [];

      setLedgerRows(finalLedger);
      setMonthSummaryRows(finalSummary);
    } catch (e) {
      fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId, segmentId, planId, month]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!platformId) return fail("Select platform");
    if (!segmentId) return fail("Select segment");

    const amt = Number(String(amount).replace(/[^\d]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      return fail("Amount must be greater than 0");
    }

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
      setAmount("");
      setNote("");
      setTxnType("DEPOSIT");
      await refreshViews();
      toast("Saved successfully");
    } catch (e) {
      fail(e.message);
    } finally {
      setBusy("");
    }
  };

  const onDelete = (id) => {
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
          closeModal();
          await refreshViews();
          toast("Deleted successfully");
        } catch (e) {
          fail(e.message);
        } finally {
          setBusy("");
        }
      },
    });
  };

  const totals = useMemo(() => {
    return ledgerRows.reduce(
      (acc, row) => {
        const amountNum =
          Number(String(row.amount ?? 0).replace(/[^\d.-]/g, "")) || 0;
        const isDeposit = String(row.txn_type).toUpperCase() === "DEPOSIT";

        if (isDeposit) acc.deposit += amountNum;
        else acc.withdraw += amountNum;

        return acc;
      },
      { deposit: 0, withdraw: 0 }
    );
  }, [ledgerRows]);

  const overallSummary = useMemo(() => {
    return monthSummaryRows.reduce(
      (acc, row) => {
        acc.deposit += Number(String(row.total_deposit ?? 0).replace(/[^\d.-]/g, "")) || 0;
        acc.withdraw += Number(String(row.total_withdraw ?? 0).replace(/[^\d.-]/g, "")) || 0;
        acc.depositCount += Number(row.deposits_count ?? 0) || 0;
        acc.withdrawCount += Number(row.withdrawals_count ?? 0) || 0;
        return acc;
      },
      { deposit: 0, withdraw: 0, depositCount: 0, withdrawCount: 0 }
    );
  }, [monthSummaryRows]);

  const net = totals.deposit - totals.withdraw;
  const overallNet = overallSummary.deposit - overallSummary.withdraw;

  const Btn = ({
    children,
    onClick,
    type = "button",
    variant = "primary",
    disabled = false,
    style = {},
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.btn,
        ...(variant === "primary" ? styles.btnPrimary : {}),
        ...(variant === "ghost" ? styles.btnGhost : {}),
        ...(variant === "danger" ? styles.btnDanger : {}),
        ...(disabled ? styles.btnDisabled : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );

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
          font-family: Inter, Arial, sans-serif;
          background: #f8fafc;
          overflow-x: hidden;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .desktop-table {
          display: none;
        }

        .mobile-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-mobile-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1100px) {
          .main-grid {
            grid-template-columns: 360px minmax(0, 1fr);
            align-items: start;
          }
        }

        @media (min-width: 900px) {
          .desktop-table {
            display: block;
          }

          .mobile-cards {
            display: none;
          }

          .summary-mobile-cards {
            display: none;
          }
        }

        @media (max-width: 899px) {
          .desktop-summary-table {
            display: none;
          }
        }

        @media (min-width: 900px) {
          .desktop-summary-table {
            display: block;
          }
        }
      `}</style>

      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <h1 style={styles.title}>Deposit & Withdrawal Management</h1>
          <div style={styles.topbarSubTitle}>
            Manage entries, track monthly flow, and view ledger summary
          </div>
        </div>
      </div>

      <div style={styles.container}>
        <div className="main-grid">
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>Add Entry</div>
              <div style={styles.cardSubTitle}>Create deposit or withdrawal entry</div>
            </div>

            <form onSubmit={onSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Platform</label>
                <select
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  style={styles.input}
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
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  style={styles.input}
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
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  style={styles.input}
                  disabled={!platformId || !segmentId}
                >
                  <option value="">Select Plan</option>
                  {plans.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_name ? p.plan_name : `Plan #${p.plan_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Type</label>
                  <select
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value)}
                    style={styles.input}
                  >
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAW">Withdraw</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Amount</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                    style={styles.input}
                    placeholder="Enter amount"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={styles.textarea}
                  placeholder="Enter note"
                />
              </div>

              <div style={styles.btnRow}>
                <Btn type="submit" variant="primary" disabled={busy === "save"} style={{ flex: 1 }}>
                  {busy === "save" ? "Saving..." : "Save"}
                </Btn>

                <Btn
                  type="button"
                  variant="ghost"
                  disabled={busy === "save"}
                  onClick={() => {
                    setTxnType("DEPOSIT");
                    setAmount("");
                    setNote("");
                  }}
                  style={{ flex: 1 }}
                >
                  Clear
                </Btn>
              </div>
            </form>
          </section>

          <section style={styles.card}>
            <div style={styles.headerRow}>
              <div style={{ minWidth: 0 }}>
                <div style={styles.cardTitle}>Ledger</div>
                <div style={styles.cardSubTitle}>
                  {loading
                    ? "Loading..."
                    : month === ALL_MONTHS_VALUE
                    ? `${ledgerRows.length} total entries from all months`
                    : `${ledgerRows.length} entries in ${formatMonthLabel(month)}`}
                </div>
              </div>

              <div style={styles.monthBox}>
                <label style={styles.label}>Month List</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={styles.input}
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="stats-grid" style={styles.statsWrap}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {month === ALL_MONTHS_VALUE ? "Overall Deposit" : "Total Deposit"}
                </div>
                <div style={{ ...styles.statValue, color: "#15803d" }}>
                  {money(totals.deposit)}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {month === ALL_MONTHS_VALUE ? "Overall Withdrawal" : "Total Withdrawal"}
                </div>
                <div style={{ ...styles.statValue, color: "#dc2626" }}>
                  {money(totals.withdraw)}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {month === ALL_MONTHS_VALUE ? "Overall Net" : "Net"}
                </div>
                <div
                  style={{
                    ...styles.statValue,
                    color: net >= 0 ? "#15803d" : "#dc2626",
                  }}
                >
                  {money(net)}
                </div>
              </div>
            </div>

            <div className="desktop-table" style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Balance</th>
                    <th style={styles.th}>Note</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.tdCenter}>
                        No entries found for {formatMonthLabel(month)}
                      </td>
                    </tr>
                  ) : (
                    ledgerRows.map((r) => {
                      const isDeposit =
                        String(r.txn_type).toUpperCase() === "DEPOSIT";

                      return (
                        <tr key={r.dipwid_id}>
                          <td style={styles.td}>{formatDateOnly(r.txn_at)}</td>
                          <td style={styles.td}>
                            <span style={isDeposit ? styles.badgeGreen : styles.badgeRed}>
                              {isDeposit ? "Deposit" : "Withdraw"}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={isDeposit ? styles.amountDeposit : styles.amountWithdraw}>
                              {money(r.amount)}
                            </span>
                          </td>
                          <td style={styles.td}>{money(r.running_balance)}</td>
                          <td style={styles.td}>{r.note || "-"}</td>
                          <td style={styles.td}>
                            <Btn
                              variant="danger"
                              disabled={busy === `del-${r.dipwid_id}`}
                              onClick={() => onDelete(r.dipwid_id)}
                            >
                              {busy === `del-${r.dipwid_id}` ? "..." : "Delete"}
                            </Btn>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {!loading && ledgerRows.length === 0 ? (
                <div style={styles.emptyState}>
                  No entries found for {formatMonthLabel(month)}
                </div>
              ) : (
                ledgerRows.map((r) => {
                  const isDeposit = String(r.txn_type).toUpperCase() === "DEPOSIT";

                  return (
                    <div key={r.dipwid_id} style={styles.mobileCard}>
                      <div style={styles.mobileCardTop}>
                        <div style={styles.mobileDate}>{formatDateOnly(r.txn_at)}</div>
                        <span style={isDeposit ? styles.badgeGreen : styles.badgeRed}>
                          {isDeposit ? "Deposit" : "Withdraw"}
                        </span>
                      </div>

                      <div style={styles.mobileInfoGrid}>
                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Amount</div>
                          <div style={isDeposit ? styles.amountDeposit : styles.amountWithdraw}>
                            {money(r.amount)}
                          </div>
                        </div>

                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Balance</div>
                          <div style={styles.mobileInfoValue}>{money(r.running_balance)}</div>
                        </div>
                      </div>

                      <div style={styles.mobileNoteBox}>
                        <div style={styles.mobileInfoLabel}>Note</div>
                        <div style={styles.mobileInfoValue}>{r.note || "-"}</div>
                      </div>

                      <Btn
                        variant="danger"
                        disabled={busy === `del-${r.dipwid_id}`}
                        onClick={() => onDelete(r.dipwid_id)}
                        style={{ width: "100%" }}
                      >
                        {busy === `del-${r.dipwid_id}` ? "Deleting..." : "Delete"}
                      </Btn>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={styles.cardTitle}>Monthly Summary</div>
              <div style={styles.cardSubTitle}>
                {month === ALL_MONTHS_VALUE
                  ? "Showing overall summary for all available months"
                  : `Selected month: ${formatMonthLabel(month)}`}
              </div>
            </div>

            <div className="stats-grid" style={{ marginTop: 12, marginBottom: 10 }}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {month === ALL_MONTHS_VALUE ? "All Months Deposit Count" : "Deposit Count"}
                </div>
                <div style={{ ...styles.statValue, color: "#15803d" }}>
                  {money(overallSummary.depositCount)}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {month === ALL_MONTHS_VALUE ? "All Months Withdrawal Count" : "Withdrawal Count"}
                </div>
                <div style={{ ...styles.statValue, color: "#dc2626" }}>
                  {money(overallSummary.withdrawCount)}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {month === ALL_MONTHS_VALUE ? "Overall Calculating" : "Overall Calculating"}
                </div>
                <div
                  style={{
                    ...styles.statValue,
                    color: overallNet >= 0 ? "#15803d" : "#dc2626",
                  }}
                >
                  {money(overallNet)}
                </div>
              </div>
            </div>

            <div className="desktop-summary-table" style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Deposits</th>
                    <th style={styles.th}>Withdrawals</th>
                    <th style={styles.th}>Total Deposit</th>
                    <th style={styles.th}>Total Withdrawal</th>
                    <th style={styles.th}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && monthSummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.tdCenter}>
                        No summary found for {formatMonthLabel(month)}
                      </td>
                    </tr>
                  ) : (
                    monthSummaryRows.map((m, index) => {
                      const dep = Number(String(m.total_deposit ?? 0).replace(/[^\d.-]/g, "")) || 0;
                      const wit = Number(String(m.total_withdraw ?? 0).replace(/[^\d.-]/g, "")) || 0;
                      const rowNet = dep - wit;

                      return (
                        <tr key={index}>
                          <td style={styles.td}>
                            {month === ALL_MONTHS_VALUE
                              ? formatMonthLabel(getMonthKey(m.month_start))
                              : formatMonthLabel(month)}
                          </td>
                          <td style={styles.td}>{money(m.deposits_count)}</td>
                          <td style={styles.td}>{money(m.withdrawals_count)}</td>
                          <td style={styles.td}>
                            <span style={styles.amountDeposit}>{money(m.total_deposit)}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.amountWithdraw}>{money(m.total_withdraw)}</span>
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                color: rowNet >= 0 ? "#15803d" : "#dc2626",
                                fontWeight: 700,
                              }}
                            >
                              {money(rowNet)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="summary-mobile-cards">
              {!loading && monthSummaryRows.length === 0 ? (
                <div style={styles.emptyState}>
                  No summary found for {formatMonthLabel(month)}
                </div>
              ) : (
                monthSummaryRows.map((m, index) => {
                  const dep = Number(String(m.total_deposit ?? 0).replace(/[^\d.-]/g, "")) || 0;
                  const wit = Number(String(m.total_withdraw ?? 0).replace(/[^\d.-]/g, "")) || 0;
                  const rowNet = dep - wit;

                  return (
                    <div key={index} style={styles.mobileCard}>
                      <div style={styles.mobileSummaryTitle}>
                        {month === ALL_MONTHS_VALUE
                          ? formatMonthLabel(getMonthKey(m.month_start))
                          : formatMonthLabel(month)}
                      </div>

                      <div style={styles.mobileInfoGrid}>
                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Deposits</div>
                          <div style={styles.mobileInfoValue}>{money(m.deposits_count)}</div>
                        </div>

                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Withdrawals</div>
                          <div style={styles.mobileInfoValue}>{money(m.withdrawals_count)}</div>
                        </div>

                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Total Deposit</div>
                          <div style={styles.amountDeposit}>{money(m.total_deposit)}</div>
                        </div>

                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Total Withdrawal</div>
                          <div style={styles.amountWithdraw}>{money(m.total_withdraw)}</div>
                        </div>

                        <div style={styles.mobileInfoItem}>
                          <div style={styles.mobileInfoLabel}>Net</div>
                          <div
                            style={{
                              color: rowNet >= 0 ? "#15803d" : "#dc2626",
                              fontWeight: 700,
                              fontSize: "14px",
                            }}
                          >
                            {money(rowNet)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {modal.open && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>{modal.title}</div>
            <div style={styles.modalMessage}>{modal.message}</div>

            <div style={styles.modalBtnRow}>
              {modal.type === "confirm" ? (
                <>
                  <Btn variant="ghost" onClick={closeModal} style={{ flex: 1 }}>
                    {modal.cancelText}
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (typeof modal.onConfirm === "function") {
                        modal.onConfirm();
                      }
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
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)",
  },

  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e5e7eb",
  },

  topbarInner: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "14px 14px 12px",
  },

  title: {
    margin: 0,
    fontSize: "20px",
    lineHeight: 1.2,
    fontWeight: 800,
    color: "#111827",
    wordBreak: "break-word",
  },

  topbarSubTitle: {
    marginTop: 4,
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.5,
  },

  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "12px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e8edf5",
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    minWidth: 0,
    overflow: "hidden",
  },

  cardHeader: {
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
  },

  cardSubTitle: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 1.5,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },

  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    minWidth: 0,
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    padding: "0 12px",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
    color: "#111827",
  },

  textarea: {
    width: "100%",
    minHeight: "96px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    background: "#fff",
    color: "#111827",
  },

  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  btnRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  btn: {
    minHeight: "34px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: "9px",
    border: "none",
    cursor: "pointer",
    transition: "0.2s ease",
    whiteSpace: "nowrap",
  },

  btnPrimary: {
    background: "linear-gradient(135deg, #4f46e5, #4338ca)",
    color: "#fff",
  },

  btnGhost: {
    background: "#eef2ff",
    color: "#3730a3",
  },

  btnDanger: {
    background: "#fee2e2",
    color: "#b91c1c",
  },

  btnDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  monthBox: {
    width: "100%",
    maxWidth: "220px",
  },

  statsWrap: {
    marginBottom: 14,
  },

  statCard: {
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "12px",
  },

  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: 600,
    marginBottom: 6,
  },

  statValue: {
    fontSize: "22px",
    fontWeight: 800,
    lineHeight: 1.1,
    wordBreak: "break-word",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    marginTop: 10,
    background: "#fff",
  },

  table: {
    width: "100%",
    minWidth: "820px",
    borderCollapse: "collapse",
    background: "#fff",
  },

  th: {
    background: "#f8fafc",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 700,
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },

  td: {
    fontSize: "14px",
    color: "#111827",
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle",
  },

  tdCenter: {
    padding: "18px",
    textAlign: "center",
    fontSize: "14px",
    color: "#6b7280",
  },

  badgeGreen: {
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    display: "inline-block",
  },

  badgeRed: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    display: "inline-block",
  },

  amountDeposit: {
    color: "#15803d",
    fontWeight: 700,
    fontSize: "14px",
  },

  amountWithdraw: {
    color: "#dc2626",
    fontWeight: 700,
    fontSize: "14px",
  },

  emptyState: {
    border: "1px dashed #cbd5e1",
    background: "#f8fafc",
    color: "#64748b",
    borderRadius: "14px",
    padding: "18px 14px",
    textAlign: "center",
    fontSize: "14px",
  },

  mobileCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "12px",
    background: "#ffffff",
    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
  },

  mobileCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  mobileDate: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
  },

  mobileInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 10,
  },

  mobileInfoItem: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "10px",
    border: "1px solid #edf2f7",
  },

  mobileInfoLabel: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: 600,
    marginBottom: 6,
  },

  mobileInfoValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 700,
    wordBreak: "break-word",
  },

  mobileNoteBox: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "10px",
    border: "1px solid #edf2f7",
    marginBottom: 10,
  },

  mobileSummaryTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: 10,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    zIndex: 1000,
  },

  modalBox: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
    padding: "18px",
  },

  modalTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#111827",
    marginBottom: 8,
  },

  modalMessage: {
    fontSize: "14px",
    color: "#4b5563",
    lineHeight: 1.6,
    marginBottom: 16,
  },

  modalBtnRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
};