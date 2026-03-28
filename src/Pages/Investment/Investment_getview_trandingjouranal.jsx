// src/pages/Investment_getview_trandingjouranal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_getview_trandingjouranal() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    kind: "error",
  });

  const openError = (message) =>
    setModal({
      open: true,
      title: "Error",
      message: message || "Something went wrong",
      kind: "error",
    });

  const openInfo = (message) =>
    setModal({
      open: true,
      title: "Success",
      message: message || "Done",
      kind: "info",
    });

  const closeModal = () =>
    setModal({ open: false, title: "", message: "", kind: "error" });

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    journal_id: null,
    title: "Delete Entry",
    message: "Are you sure you want to delete this trading journal entry?",
  });

  const openDeleteConfirm = (journal_id) => {
    setDeleteConfirm({
      open: true,
      journal_id,
      title: "Delete Entry",
      message: "Are you sure you want to delete this trading journal entry?",
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({
      open: false,
      journal_id: null,
      title: "Delete Entry",
      message: "Are you sure you want to delete this trading journal entry?",
    });
  };

  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);
  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  });

  const [dailySummary, setDailySummary] = useState([]);

  const [edit, setEdit] = useState({
    open: false,
    journal_id: null,
    platform_id: "",
    segment_id: "",
    plan_id: null,
    trade_date: "",
    trade_name: "",
    profit: "0",
    loss: "0",
    brokerage: "0",
    trade_logic: "",
    mistakes: "",
  });

  const closeEdit = () =>
    setEdit({
      open: false,
      journal_id: null,
      platform_id: "",
      segment_id: "",
      plan_id: null,
      trade_date: "",
      trade_name: "",
      profit: "0",
      loss: "0",
      brokerage: "0",
      trade_logic: "",
      mistakes: "",
    });

  const [editSegments, setEditSegments] = useState([]);

  useEffect(() => {
    const shouldLock = !!edit.open || !!modal.open || !!deleteConfirm.open;
    if (shouldLock) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
  }, [edit.open, modal.open, deleteConfirm.open]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  const formatDayMonth = (value) => {
    if (!value) return { day: "--", month: "---" };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { day: "--", month: "---" };
    return {
      day: String(d.getDate()).padStart(2, "0"),
      month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    };
  };

  const toNumber = (v) => {
    const n = Number(String(v ?? 0).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumber = (v) => {
    if (v === null || v === undefined || v === "") return "0";
    const n = toNumber(v);
    return n.toFixed(10).replace(/\.?0+$/, "");
  };

  const netTone = (v) => {
    const n = toNumber(v);
    return n > 0 ? "pos" : n < 0 ? "neg" : "neu";
  };

  const toIntStr = (v) => String(v ?? "").replace(/[^\d]/g, "");

  const validateEdit = () => {
    if (!edit.trade_date) return "Trade date required";
    if (!String(edit.trade_name || "").trim()) return "Trade name required";
    if (!String(edit.platform_id || "").trim()) return "Platform required";
    if (!String(edit.segment_id || "").trim()) return "Segment required";
    if (!String(edit.trade_logic || "").trim()) return "Trade logic required";

    const p = toNumber(edit.profit);
    const l = toNumber(edit.loss);
    const b = toNumber(edit.brokerage);

    if (p < 0 || l < 0 || b < 0) {
      return "Profit, Loss and Brokerage must be 0 or more";
    }

    const ok =
      (p > 0 && l === 0) ||
      (l > 0 && p === 0) ||
      (p === 0 && l === 0);

    if (!ok) return "Either Profit or Loss should be greater than 0, not both";
    if (p === 0 && l === 0 && b > 0) {
      return "Brokerage not allowed when both profit and loss are 0";
    }

    return "";
  };

  const api = {
    async getPlatforms() {
      const res = await fetch(
        `${BASE_URL}/api/investment/platform-segment/platform`,
        { headers }
      );
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

    async getDailySummary({ platform_id, segment_id, month }) {
      const qs = new URLSearchParams();
      if (platform_id) qs.set("platform_id", String(platform_id));
      if (segment_id) qs.set("segment_id", String(segment_id));
      if (month) qs.set("month", month);

      const res = await fetch(
        `${BASE_URL}/api/investment/tradingjournal-view/daily-summary?${qs.toString()}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Daily summary fetch failed");
      return Array.isArray(data?.data) ? data.data : [];
    },

    async updateJournal(journal_id, payload) {
      const res = await fetch(
        `${BASE_URL}/api/investment/tradingjournal-view/${journal_id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Update failed");
      return data?.data;
    },

    async deleteJournal(journal_id) {
      const res = await fetch(
        `${BASE_URL}/api/investment/tradingjournal-view/${journal_id}`,
        {
          method: "DELETE",
          headers,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      return true;
    },
  };

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        setInitialLoading(true);
        const p = await api.getPlatforms();
        setPlatforms(p);
      } catch (e) {
        openError(e.message);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setSegments([]);
        setSegmentId("");
        if (!platformId) return;
        const s = await api.getSegments(platformId);
        setSegments(s);
      } catch (e) {
        openError(e.message);
      }
    })();
  }, [platformId]);

  useEffect(() => {
    (async () => {
      try {
        setEditSegments([]);
        if (!edit.open || !edit.platform_id) return;
        const s = await api.getSegments(edit.platform_id);
        setEditSegments(s);
      } catch (e) {
        openError(e.message);
      }
    })();
  }, [edit.open, edit.platform_id]);

  const refresh = async () => {
    try {
      setBusy("refresh");
      const rows = await api.getDailySummary({
        platform_id: platformId || null,
        segment_id: segmentId || null,
        month,
      });
      setDailySummary(Array.isArray(rows) ? rows : []);
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    refresh();
  }, [month, platformId, segmentId]);

  const onOpenUpdate = (r) => {
    setEdit({
      open: true,
      journal_id: r.journal_id,
      platform_id: String(r.platform_id ?? ""),
      segment_id: String(r.segment_id ?? ""),
      plan_id: r.plan_id ?? null,
      trade_date: (r.trade_date || "").slice(0, 10),
      trade_name: r.trade_name || "",
      profit: String(r.profit ?? 0),
      loss: String(r.loss ?? 0),
      brokerage: String(r.brokerage ?? 0),
      trade_logic: r.trade_logic || "",
      mistakes: r.mistakes || "",
    });
  };

  const onUpdate = async () => {
    const v = validateEdit();
    if (v) return openError(v);

    const payload = {
      platform_id: Number(edit.platform_id),
      segment_id: Number(edit.segment_id),
      plan_id: edit.plan_id === null || edit.plan_id === "" ? null : Number(edit.plan_id),
      trade_date: edit.trade_date,
      trade_name: String(edit.trade_name).trim(),
      profit: toNumber(edit.profit),
      loss: toNumber(edit.loss),
      brokerage: toNumber(edit.brokerage),
      trade_logic: String(edit.trade_logic).trim(),
      mistakes: String(edit.mistakes || "").trim()
        ? String(edit.mistakes).trim()
        : null,
    };

    try {
      setBusy(`upd-${edit.journal_id}`);
      await api.updateJournal(edit.journal_id, payload);
      openInfo("Trading journal updated successfully");
      closeEdit();
      await refresh();
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  const onDelete = async (journal_id) => {
    try {
      setBusy(`del-${journal_id}`);
      await api.deleteJournal(journal_id);
      closeDeleteConfirm();
      openInfo("Trading journal deleted successfully");
      await refresh();
    } catch (e) {
      openError(e.message);
    } finally {
      setBusy("");
    }
  };

  const totalProfit = dailySummary.reduce((sum, row) => sum + toNumber(row.profit), 0);
  const totalLoss = dailySummary.reduce((sum, row) => sum + toNumber(row.loss), 0);
  const totalBrokerage = dailySummary.reduce((sum, row) => sum + toNumber(row.brokerage), 0);
  const totalNet = dailySummary.reduce((sum, row) => sum + toNumber(row.net_total), 0);

  const SmallBtn = ({
    variant = "dark",
    outline = false,
    disabled,
    onClick,
    children,
    className = "",
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn ${outline ? `btn-outline-${variant}` : `btn-${variant}`} btn-sm tj-btn ${className}`}
    >
      {children}
    </button>
  );

  const NetBadge = ({ value }) => {
    const tone = netTone(value);
    return <span className={`tj-chip tj-${tone}`}>Net {formatNumber(value)}</span>;
  };

  return (
    <div className="tj-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: "Plus Jakarta Sans", sans-serif;
          background: #f7f8fc;
        }

        .tj-root {
          min-height: 100vh;
          width: 100%;
          color: #0f172a;
          background:
            radial-gradient(900px 500px at top left, rgba(124,58,237,.08), transparent 55%),
            radial-gradient(900px 500px at top right, rgba(59,130,246,.08), transparent 50%),
            linear-gradient(180deg, #f8fbff 0%, #f7f8fc 100%);
        }

        .tj-wrap {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 14px 28px;
        }

        .tj-header {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          background: rgba(255,255,255,.86);
          border-bottom: 1px solid rgba(15,23,42,.06);
          box-shadow: 0 8px 30px rgba(15,23,42,.04);
        }

        .tj-headerInner {
          max-width: 760px;
          margin: 0 auto;
          padding: 10px 12px 8px;
        }

        .tj-topRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .tj-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          line-height: 1.15;
          color: #0f172a;
        }

        .tj-sub {
          margin: 4px 0 0;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }

        .tj-miniWrap {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tj-miniStat {
          min-width: 76px;
          padding: 7px 9px;
          border-radius: 14px;
          background: rgba(255,255,255,.96);
          border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 10px 24px rgba(15,23,42,.05);
        }

        .tj-miniLabel {
          font-size: 9px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: .5px;
          margin-bottom: 2px;
        }

        .tj-miniValue {
          font-size: 12px;
          font-weight: 900;
          line-height: 1.1;
        }

        .tj-miniProfit .tj-miniValue { color: #15803d; }
        .tj-miniLoss .tj-miniValue { color: #be123c; }
        .tj-miniOverall.pos .tj-miniValue { color: #15803d; }
        .tj-miniOverall.neg .tj-miniValue { color: #be123c; }
        .tj-miniOverall.neu .tj-miniValue { color: #1d4ed8; }

        .tj-filterCard {
          margin-top: 14px;
          background: rgba(255,255,255,.88);
          border: 1px solid rgba(15,23,42,.08);
          border-radius: 22px;
          box-shadow: 0 16px 40px rgba(15,23,42,.05);
          overflow: hidden;
        }

        .tj-filterHead {
          padding: 14px 16px 10px;
          border-bottom: 1px solid rgba(15,23,42,.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .tj-filterTitle {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
        }

        .tj-filterMeta {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }

        .tj-filterBody {
          padding: 14px;
        }

        .tj-label {
          font-size: 11px;
          font-weight: 900;
          color: #475569;
          margin-bottom: 6px;
        }

        .tj-input,
        .tj-select,
        .tj-textarea {
          width: 100%;
          border: 1px solid rgba(15,23,42,.12);
          border-radius: 14px;
          padding: 11px 12px;
          outline: none;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          background: #fff;
          transition: .2s ease;
        }

        .tj-input:focus,
        .tj-select:focus,
        .tj-textarea:focus {
          border-color: rgba(37,99,235,.35);
          box-shadow: 0 0 0 4px rgba(37,99,235,.08);
        }

        .tj-btn {
          border-radius: 12px !important;
          font-weight: 800 !important;
          font-size: 12px !important;
          padding: .52rem .9rem !important;
          box-shadow: 0 8px 18px rgba(15,23,42,.08);
        }

        .tj-filterActions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .tj-list {
          margin-top: 16px;
          display: grid;
          gap: 14px;
        }

        .tj-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(250,251,255,.94));
          border: 1px solid rgba(15,23,42,.08);
          border-radius: 26px;
          box-shadow: 0 18px 40px rgba(15,23,42,.06);
        }

        .tj-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 5px;
          background: linear-gradient(180deg, #2563eb, #7c3aed);
        }

        .tj-cardTop {
          display: flex;
          gap: 12px;
          padding: 16px;
          align-items: flex-start;
        }

        .tj-dateBadge {
          min-width: 62px;
          max-width: 62px;
          border-radius: 20px;
          background: linear-gradient(180deg, #0f172a, #1e293b);
          color: #fff;
          padding: 10px 8px;
          text-align: center;
          box-shadow: 0 16px 28px rgba(15,23,42,.18);
        }

        .tj-dateDay {
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .tj-dateMonth {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          opacity: .92;
        }

        .tj-main {
          flex: 1;
          min-width: 0;
        }

        .tj-mainTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .tj-name {
          font-size: 16px;
          font-weight: 900;
          line-height: 1.25;
          color: #0f172a;
          margin: 0 0 4px;
          word-break: break-word;
        }

        .tj-subline {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          line-height: 1.4;
        }

        .tj-id {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 900;
          color: #475569;
          background: rgba(15,23,42,.05);
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,.06);
        }

        .tj-chipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .tj-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          border: 1px solid transparent;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.5);
        }

        .tj-profit {
          background: rgba(22,163,74,.12);
          color: #15803d;
          border-color: rgba(22,163,74,.15);
        }

        .tj-loss {
          background: rgba(225,29,72,.12);
          color: #be123c;
          border-color: rgba(225,29,72,.15);
        }

        .tj-brokerage {
          background: rgba(37,99,235,.10);
          color: #1d4ed8;
          border-color: rgba(37,99,235,.14);
        }

        .tj-pos {
          background: rgba(22,163,74,.12);
          color: #15803d;
          border-color: rgba(22,163,74,.15);
        }

        .tj-neg {
          background: rgba(225,29,72,.12);
          color: #be123c;
          border-color: rgba(225,29,72,.15);
        }

        .tj-neu {
          background: rgba(100,116,139,.10);
          color: #334155;
          border-color: rgba(100,116,139,.14);
        }

        .tj-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(15,23,42,.08), transparent);
          margin: 0 16px;
        }

        .tj-section {
          padding: 14px 16px 0;
        }

        .tj-section:last-child {
          padding-bottom: 16px;
        }

        .tj-sectionLabel {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .7px;
          color: #64748b;
          margin-bottom: 7px;
          text-transform: uppercase;
        }

        .tj-logicText {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.65;
          color: #0f172a;
          word-break: break-word;
        }

        .tj-mistakeBox {
          background: rgba(254,242,242,.8);
          border: 1px solid rgba(248,113,113,.18);
          color: #b91c1c;
          border-radius: 16px;
          padding: 12px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.6;
          word-break: break-word;
        }

        .tj-emptyMistake {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }

        .tj-actionBar {
          padding: 14px 16px 16px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tj-empty,
        .tj-loading {
          margin-top: 18px;
          background: rgba(255,255,255,.9);
          border: 1px solid rgba(15,23,42,.08);
          border-radius: 24px;
          padding: 28px 18px;
          text-align: center;
          box-shadow: 0 18px 40px rgba(15,23,42,.05);
        }

        .tj-emptyTitle,
        .tj-loadingTitle {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .tj-emptySub,
        .tj-loadingSub {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }

        .tj-modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15,23,42,.42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .tj-modal {
          width: min(720px, 96vw);
          max-height: 92vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 24px;
          border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 24px 60px rgba(0,0,0,.24);
        }

        .tj-modalHead {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(15,23,42,.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .tj-modalTitle {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        .tj-modalBody {
          padding: 18px;
          overflow: auto;
        }

        .tj-modalFooter {
          padding: 16px 18px;
          border-top: 1px solid rgba(15,23,42,.08);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tj-grid2 {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }

        .tj-confirm {
          width: min(360px, 94vw);
          background: #fff;
          border-radius: 24px;
          border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 24px 60px rgba(0,0,0,.24);
          overflow: hidden;
        }

        .tj-confirmBody {
          padding: 24px 20px 10px;
          text-align: center;
        }

        .tj-confirmIcon {
          width: 62px;
          height: 62px;
          margin: 0 auto 14px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
          color: #dc2626;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
        }

        .tj-confirmTitle {
          font-size: 18px;
          font-weight: 900;
          margin: 0 0 6px;
          color: #0f172a;
        }

        .tj-confirmText {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }

        .tj-confirmFooter {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 16px;
          border-top: 1px solid rgba(15,23,42,.06);
        }

        @media (max-width: 767.98px) {
          .tj-wrap {
            padding: 0 10px 20px;
          }

          .tj-header {
            position: sticky;
            top: 0;
            z-index: 40;
          }

          .tj-headerInner {
            padding: 8px 10px 6px;
          }

          .tj-topRow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .tj-topRow > div:first-child {
            min-width: 0;
            flex: 1;
          }

          .tj-title {
            font-size: 15px;
            line-height: 1.1;
            margin: 0;
          }

          .tj-sub {
            font-size: 9px;
            margin: 2px 0 0;
            line-height: 1.2;
          }

          .tj-miniWrap {
            gap: 5px;
            flex-wrap: nowrap;
            justify-content: flex-end;
            flex-shrink: 0;
          }

          .tj-miniStat {
            min-width: 56px;
            padding: 5px 6px;
            border-radius: 10px;
          }

          .tj-miniLabel {
            font-size: 8px;
            margin-bottom: 1px;
            letter-spacing: .3px;
          }

          .tj-miniValue {
            font-size: 10px;
            line-height: 1.05;
          }

          .tj-filterCard {
            margin-top: 8px;
            border-radius: 16px;
          }

          .tj-filterHead {
            padding: 9px 10px 7px;
            gap: 6px;
          }

          .tj-filterTitle {
            font-size: 12px;
          }

          .tj-filterMeta {
            font-size: 9px;
          }

          .tj-filterBody {
            padding: 10px;
          }

          .tj-label {
            font-size: 10px;
            margin-bottom: 4px;
          }

          .tj-input,
          .tj-select,
          .tj-textarea {
            padding: 9px 10px;
            font-size: 12px;
            border-radius: 10px;
          }

          .tj-filterActions {
            gap: 8px;
            margin-top: 10px;
          }

          .tj-btn {
            font-size: 11px !important;
            padding: .45rem .75rem !important;
            border-radius: 10px !important;
          }

          .tj-list {
            margin-top: 10px;
            gap: 12px;
          }

          .tj-card {
            border-radius: 18px;
          }

          .tj-cardTop {
            padding: 12px;
            gap: 10px;
          }

          .tj-dateBadge {
            min-width: 52px;
            max-width: 52px;
            padding: 8px 6px;
            border-radius: 14px;
          }

          .tj-dateDay {
            font-size: 16px;
            margin-bottom: 2px;
          }

          .tj-dateMonth {
            font-size: 8px;
          }

          .tj-mainTop {
            gap: 8px;
          }

          .tj-name {
            font-size: 14px;
            margin: 0 0 3px;
          }

          .tj-subline {
            font-size: 10px;
          }

          .tj-id {
            font-size: 9px;
            padding: 5px 8px;
          }

          .tj-chipRow {
            gap: 6px;
            margin-top: 8px;
          }

          .tj-chip {
            min-height: 28px;
            padding: 6px 9px;
            font-size: 10px;
          }

          .tj-divider {
            margin: 0 12px;
          }

          .tj-section {
            padding: 10px 12px 0;
          }

          .tj-section:last-child {
            padding-bottom: 12px;
          }

          .tj-sectionLabel {
            font-size: 9px;
            margin-bottom: 5px;
            letter-spacing: .5px;
          }

          .tj-logicText,
          .tj-mistakeBox,
          .tj-emptyMistake {
            font-size: 12px;
            line-height: 1.5;
          }

          .tj-mistakeBox {
            padding: 10px;
            border-radius: 12px;
          }

          .tj-actionBar {
            padding: 10px 12px 12px;
            gap: 8px;
          }

          .tj-empty,
          .tj-loading {
            margin-top: 12px;
            padding: 22px 14px;
            border-radius: 18px;
          }

          .tj-emptyTitle,
          .tj-loadingTitle {
            font-size: 16px;
          }

          .tj-emptySub,
          .tj-loadingSub {
            font-size: 12px;
          }

          .tj-modal {
            width: min(96vw, 720px);
            border-radius: 18px;
          }

          .tj-modalHead,
          .tj-modalBody,
          .tj-modalFooter {
            padding-left: 12px;
            padding-right: 12px;
          }

          .tj-confirm {
            border-radius: 18px;
          }
        }

        @media (min-width: 768px) {
          .tj-wrap,
          .tj-headerInner {
            max-width: 1120px;
          }

          .tj-grid2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tj-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tj-title {
            font-size: 24px;
          }

          .tj-sub {
            font-size: 12px;
          }

          .tj-miniStat {
            min-width: 92px;
          }
        }

        @media (min-width: 1200px) {
          .tj-list {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>

      <div className="tj-header">
        <div className="tj-headerInner">
          <div className="tj-topRow">
            <div>
              <h1 className="tj-title">Trading Journal View</h1>
              <p className="tj-sub">Mobile first professional view page</p>
            </div>

            <div className="tj-miniWrap">
              <div className="tj-miniStat tj-miniProfit">
                <div className="tj-miniLabel">Profit</div>
                <div className="tj-miniValue">{formatNumber(totalProfit)}</div>
              </div>

              <div className="tj-miniStat tj-miniLoss">
                <div className="tj-miniLabel">Loss</div>
                <div className="tj-miniValue">{formatNumber(totalLoss)}</div>
              </div>

              <div className={`tj-miniStat tj-miniOverall ${netTone(totalNet)}`}>
                <div className="tj-miniLabel">Overall</div>
                <div className="tj-miniValue">{formatNumber(totalNet)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tj-wrap">
        <div className="tj-filterCard">
          <div className="tj-filterHead">
            <div className="tj-filterTitle">Filter Trades</div>
            <div className="tj-filterMeta">
              Brokerage Total: {formatNumber(totalBrokerage)}
            </div>
          </div>

          <div className="tj-filterBody">
            <div className="tj-grid2">
              <div>
                <div className="tj-label">Platform</div>
                <select
                  className="tj-select"
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                >
                  <option value="">All Platforms</option>
                  {platforms.map((p) => (
                    <option key={p.platform_id} value={p.platform_id}>
                      {p.platform_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="tj-label">Segment</div>
                <select
                  className="tj-select"
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
              </div>

              <div>
                <div className="tj-label">Month</div>
                <input
                  className="tj-input"
                  type="month"
                  value={month.slice(0, 7)}
                  onChange={(e) => setMonth(`${e.target.value}-01`)}
                />
              </div>
            </div>

            <div className="tj-filterActions">
              <SmallBtn variant="dark" disabled={busy === "refresh"} onClick={refresh}>
                {busy === "refresh" ? "Refreshing..." : "Apply Filter"}
              </SmallBtn>

              <SmallBtn
                variant="secondary"
                outline
                onClick={() => {
                  setPlatformId("");
                  setSegmentId("");
                  const d = new Date();
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  setMonth(`${yyyy}-${mm}-01`);
                }}
              >
                Reset
              </SmallBtn>
            </div>
          </div>
        </div>

        {initialLoading ? (
          <div className="tj-loading">
            <div className="spinner-border text-dark mb-3" role="status" />
            <div className="tj-loadingTitle">Loading Trading Journal...</div>
            <div className="tj-loadingSub">Please wait while data is being fetched</div>
          </div>
        ) : dailySummary.length === 0 ? (
          <div className="tj-empty">
            <div className="tj-emptyTitle">No Trades Found</div>
            <div className="tj-emptySub">Try changing platform, segment or month filter.</div>
          </div>
        ) : (
          <div className="tj-list">
            {dailySummary.map((r) => {
              const dateParts = formatDayMonth(r.trade_date);

              return (
                <div className="tj-card" key={r.journal_id}>
                  <div className="tj-cardTop">
                    <div className="tj-dateBadge">
                      <div className="tj-dateDay">{dateParts.day}</div>
                      <div className="tj-dateMonth">{dateParts.month}</div>
                    </div>

                    <div className="tj-main">
                      <div className="tj-mainTop">
                        <div>
                          <h3 className="tj-name">{r.trade_name || "Trade Entry"}</h3>
                          <div className="tj-subline">
                            {r.platform_name || "-"} • {r.segment_name || "-"}
                          </div>
                          <div className="tj-subline" style={{ marginTop: 3 }}>
                            {formatDate(r.trade_date)}
                          </div>
                        </div>

                        <div className="tj-id">#{r.journal_id}</div>
                      </div>

                      <div className="tj-chipRow">
                        <span className="tj-chip tj-profit">
                          Profit {formatNumber(r.profit)}
                        </span>
                        <span className="tj-chip tj-loss">
                          Loss {formatNumber(r.loss)}
                        </span>
                        <span className="tj-chip tj-brokerage">
                          Brokerage {formatNumber(r.brokerage)}
                        </span>
                        <NetBadge value={r.net_total} />
                      </div>
                    </div>
                  </div>

                  <div className="tj-divider" />

                  <div className="tj-section">
                    <div className="tj-sectionLabel">Trade Logic</div>
                    <div className="tj-logicText">
                      {String(r.trade_logic || "").trim() ? r.trade_logic : "-"}
                    </div>
                  </div>

                  <div className="tj-section">
                    <div className="tj-sectionLabel">Mistakes</div>
                    {String(r.mistakes || "").trim() ? (
                      <div className="tj-mistakeBox">{r.mistakes}</div>
                    ) : (
                      <div className="tj-emptyMistake">No mistakes added</div>
                    )}
                  </div>

                  <div className="tj-actionBar">
                    <SmallBtn
                      variant="dark"
                      disabled={busy === `upd-${r.journal_id}`}
                      onClick={() => onOpenUpdate(r)}
                    >
                      Update
                    </SmallBtn>

                    <SmallBtn
                      variant="danger"
                      outline
                      disabled={busy === `del-${r.journal_id}`}
                      onClick={() => openDeleteConfirm(r.journal_id)}
                    >
                      Delete
                    </SmallBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {edit.open && (
        <div className="tj-modalOverlay" onClick={closeEdit}>
          <div className="tj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tj-modalHead">
              <div className="tj-modalTitle">Update Trade</div>
              <SmallBtn variant="secondary" outline onClick={closeEdit}>
                Close
              </SmallBtn>
            </div>

            <div className="tj-modalBody">
              <div className="tj-grid2">
                <div>
                  <div className="tj-label">Trade Date</div>
                  <input
                    type="date"
                    className="tj-input"
                    value={edit.trade_date}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, trade_date: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <div className="tj-label">Trade Name</div>
                  <input
                    className="tj-input"
                    value={edit.trade_name}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, trade_name: e.target.value }))
                    }
                    placeholder="Trade name"
                  />
                </div>

                <div>
                  <div className="tj-label">Platform</div>
                  <select
                    className="tj-select"
                    value={edit.platform_id}
                    onChange={(e) =>
                      setEdit((prev) => ({
                        ...prev,
                        platform_id: e.target.value,
                        segment_id: "",
                      }))
                    }
                  >
                    <option value="">Select Platform</option>
                    {platforms.map((p) => (
                      <option key={p.platform_id} value={p.platform_id}>
                        {p.platform_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="tj-label">Segment</div>
                  <select
                    className="tj-select"
                    value={edit.segment_id}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, segment_id: e.target.value }))
                    }
                    disabled={!edit.platform_id}
                  >
                    <option value="">Select Segment</option>
                    {editSegments.map((s) => (
                      <option key={s.segment_id} value={s.segment_id}>
                        {s.segment_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="tj-label">Profit</div>
                  <input
                    className="tj-input"
                    value={edit.profit}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, profit: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <div className="tj-label">Loss</div>
                  <input
                    className="tj-input"
                    value={edit.loss}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, loss: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <div className="tj-label">Brokerage</div>
                  <input
                    className="tj-input"
                    value={edit.brokerage}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, brokerage: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <div className="tj-label">Plan ID</div>
                  <input
                    className="tj-input"
                    value={edit.plan_id ?? ""}
                    onChange={(e) =>
                      setEdit((prev) => ({
                        ...prev,
                        plan_id: toIntStr(e.target.value),
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="tj-label">Trade Logic</div>
                  <textarea
                    className="tj-textarea"
                    rows="4"
                    value={edit.trade_logic}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, trade_logic: e.target.value }))
                    }
                    placeholder="Write trade logic"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="tj-label">Mistakes</div>
                  <textarea
                    className="tj-textarea"
                    rows="4"
                    value={edit.mistakes}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, mistakes: e.target.value }))
                    }
                    placeholder="Write mistakes if any"
                  />
                </div>
              </div>
            </div>

            <div className="tj-modalFooter">
              <SmallBtn
                variant="secondary"
                outline
                disabled={busy === `upd-${edit.journal_id}`}
                onClick={closeEdit}
              >
                Cancel
              </SmallBtn>

              <SmallBtn
                variant="dark"
                disabled={busy === `upd-${edit.journal_id}`}
                onClick={onUpdate}
              >
                {busy === `upd-${edit.journal_id}` ? "Saving..." : "Update Trade"}
              </SmallBtn>
            </div>
          </div>
        </div>
      )}

      {modal.open && (
        <div className="tj-modalOverlay" role="dialog" aria-modal="true">
          <div className="tj-confirm">
            <div className="tj-confirmBody">
              <div className="tj-confirmIcon">!</div>
              <h3 className="tj-confirmTitle">{modal.title}</h3>
              <p className="tj-confirmText">{modal.message}</p>
            </div>

            <div className="tj-confirmFooter">
              <SmallBtn variant="dark" onClick={closeModal}>
                OK
              </SmallBtn>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div className="tj-modalOverlay" onClick={closeDeleteConfirm}>
          <div className="tj-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="tj-confirmBody">
              <div className="tj-confirmIcon">🗑</div>
              <h3 className="tj-confirmTitle">{deleteConfirm.title}</h3>
              <p className="tj-confirmText">{deleteConfirm.message}</p>
            </div>

            <div className="tj-confirmFooter">
              <SmallBtn
                variant="secondary"
                outline
                disabled={busy === `del-${deleteConfirm.journal_id}`}
                onClick={closeDeleteConfirm}
              >
                Cancel
              </SmallBtn>

              <SmallBtn
                variant="danger"
                disabled={busy === `del-${deleteConfirm.journal_id}`}
                onClick={() => onDelete(deleteConfirm.journal_id)}
              >
                {busy === `del-${deleteConfirm.journal_id}` ? "Deleting..." : "Delete"}
              </SmallBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}