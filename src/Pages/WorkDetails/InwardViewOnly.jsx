import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function InwardViewOnly() {
  /* ================= CONFIG ================= */

  // ✅ Backend (API) base
  const API_BASE = useMemo(() => "https://express-backend-myapp.onrender.com", []);
  const LIST_API = `${API_BASE}/api/inward-view`;

  // ✅ Frontend (Share link) base (Vercel host) - HashRouter route
  const FRONTEND_VIEW_URL = "https://react-myapp-omega.vercel.app/#/inward-view";

  /* ================= HELPERS ================= */

  const formatDDMMYYYY = (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };

  // ✅ HashRouter: read from/to from hash query
  const getQueryDates = () => {
    if (typeof window === "undefined") return { from: "", to: "" };

    // Example hash: "#/inward-view?from=2026-01-01&to=2026-01-31"
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");

    if (qIndex === -1) return { from: "", to: "" };

    const qs = hash.slice(qIndex + 1); // "from=...&to=..."
    const params = new URLSearchParams(qs);

    return {
      from: params.get("from") || "",
      to: params.get("to") || "",
    };
  };

  // ✅ Share link ALWAYS opens correct page + keeps same filters
  const getShareUrl = () => {
    if (typeof window === "undefined") return "";

    const { from, to } = getQueryDates();

    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    return qs.toString()
      ? `${FRONTEND_VIEW_URL}?${qs.toString()}`
      : FRONTEND_VIEW_URL;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  /* ================= STATE ================= */

  const [{ from, to }] = useState(getQueryDates);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ show: false, text: "" });

  /* ================= FETCH ================= */

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const url = qs.toString() ? `${LIST_API}?${qs.toString()}` : LIST_API;

      const r = await fetch(url);
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.success) {
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(Array.isArray(j.data) ? j.data : []);
      setLoading(false);
    } catch {
      setRows([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 20000); // 🔁 auto refresh
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  /* ================= SHARE ================= */

  const onShareLink = async () => {
    const link = getShareUrl();
    const ok = await copyToClipboard(link);
    setToast({ show: true, text: ok ? "Link copied ✅" : "Copy failed ❌" });
    setTimeout(() => setToast({ show: false, text: "" }), 1500);
  };

  /* ================= PORTAL ================= */

  const Portal = ({ children }) =>
    typeof document === "undefined" ? null : createPortal(children, document.body);

  /* ================= RENDER ================= */

  return (
    <div className="ivPage">
      {/* HEADER */}
      <div className="ivHeader">
        <div className="ivHeaderTop">
          <div>
            <div className="ivTitle">Inward Register (View Only)</div>
            <div className="ivSub">
              {from && to
                ? `From ${formatDDMMYYYY(from)} to ${formatDDMMYYYY(to)}`
                : "All Records"}
            </div>
          </div>

          <button className="ivShareBtn" type="button" onClick={onShareLink} title="Copy share link">
            Share Link
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="ivCenter">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="ivCenter">No records found</div>
      ) : (
        <div className="ivTableWrap">
          <table className="ivTable">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Date</th>
                <th>Material</th>
                <th>Quantity</th>
                <th>Store</th>
                <th>Material Use</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.inward_id}-${i}`}>
                  <td className="ivSr">{r.sr_no}</td>
                  <td>{formatDDMMYYYY(r.work_date)}</td>
                  <td>
                    <b>{String.fromCharCode(96 + (r.item_order || 1))}) </b>
                    {r.material}
                  </td>
                  <td>
                    {r.quantity ?? ""}
                    {r.quantity_type ? ` ${r.quantity_type}` : ""}
                  </td>
                  <td>{r.store}</td>
                  <td>{r.material_use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TOAST */}
      <Portal>{toast.show && <div className="ivToast">{toast.text}</div>}</Portal>

      <style>{css}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const css = `
.ivPage{
  min-height:100vh;
  background:#f6f8fc;
  padding:16px;
}

.ivHeader{
  background:#0b1220;
  color:#fff;
  padding:16px;
  border-radius:14px;
  margin-bottom:14px;
}

.ivHeaderTop{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
}

.ivTitle{font-size:18px;font-weight:900;}
.ivSub{font-size:12px;opacity:.85;margin-top:4px;}

.ivShareBtn{
  background:#fff;
  color:#0b1220;
  border:none;
  padding:9px 14px;
  border-radius:12px;
  font-weight:900;
  cursor:pointer;
  white-space:nowrap;
}

.ivCenter{
  text-align:center;
  padding:40px;
  color:#6b7280;
  font-weight:700;
}

.ivTableWrap{
  background:#fff;
  border-radius:14px;
  overflow:auto;
  box-shadow:0 12px 30px rgba(0,0,0,.08);
}

.ivTable{
  width:100%;
  border-collapse:collapse;
  font-size:13px;
  min-width:900px;
}

.ivTable th,
.ivTable td{
  padding:10px;
  border-bottom:1px solid #e5e7eb;
  text-align:left;
  vertical-align:top;
}

.ivTable th{
  background:#f3f4f6;
  font-weight:900;
  white-space:nowrap;
}

.ivSr{
  font-weight:900;
  white-space:nowrap;
}

/* toast */
.ivToast{
  position:fixed;
  left:50%;
  bottom:24px;
  transform:translateX(-50%);
  background:#0b1220;
  color:#fff;
  padding:10px 14px;
  border-radius:999px;
  font-weight:900;
  z-index:999999;
}
`;
