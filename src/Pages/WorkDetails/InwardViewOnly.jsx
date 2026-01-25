import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function InwardViewOnly() {
  /* ================= CONFIG ================= */

  const API_BASE = useMemo(() => "https://express-backend-myapp.onrender.com", []);
  const LIST_API = `${API_BASE}/api/inward-view`;

  const FRONTEND_VIEW_URL = "https://react-myapp-omega.vercel.app/#/inward-view";
  const STATIC_SHARE_URL = "https://freeshort.info/fpfG9N";

  /* ================= HELPERS ================= */

  const toISO = (v) => (v ? String(v).slice(0, 10) : "");

  const formatDDMMYYYY = (iso) => {
    const s = toISO(iso);
    if (!s) return "";
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };

  // ✅ HashRouter query reader: "#/inward-view?from=YYYY-MM-DD&to=YYYY-MM-DD"
  const getQueryDates = () => {
    if (typeof window === "undefined") return { from: "", to: "" };
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return { from: "", to: "" };
    const qs = hash.slice(qIndex + 1);
    const params = new URLSearchParams(qs);
    return {
      from: params.get("from") || "",
      to: params.get("to") || "",
    };
  };

  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    const { from, to } = getQueryDates();
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return qs.toString() ? `${FRONTEND_VIEW_URL}?${qs.toString()}` : FRONTEND_VIEW_URL;
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

  // ✅ keep only ONE toast state (duplicate removed)
  const [toast, setToast] = useState({ show: false, text: "" });

  /* ================= GROUPING ================= */

  const normalizeRows = (list) => {
    const safe = Array.isArray(list) ? list : [];
    return safe
      .map((r) => ({
        inward_id: r.inward_id ?? r.id ?? "",
        work_date: toISO(r.work_date),
        store: r.store ?? "",
        material: r.material ?? "",
        material_use: r.material_use ?? "",
        quantity: r.quantity ?? "",
        quantity_type: r.quantity_type ?? "",
        item_order: Number(r.item_order || 1),
      }))
      .filter((r) => r.work_date);
  };

  const groupByDate = (list) => {
    const sorted = [...list].sort((a, b) => {
      const d = a.work_date.localeCompare(b.work_date);
      if (d !== 0) return d;
      return (a.item_order || 1) - (b.item_order || 1);
    });

    const map = new Map();
    for (const r of sorted) {
      if (!map.has(r.work_date)) map.set(r.work_date, []);
      map.get(r.work_date).push(r);
    }

    const dates = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return dates.map((date, idx) => ({
      date,
      srNo: idx + 1, // ✅ Sr.No per date group only
      items: map.get(date) || [],
    }));
  };

  const groups = useMemo(() => groupByDate(normalizeRows(rows)), [rows]);

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
    const t = setInterval(fetchData, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  /* ================= ACTIONS ================= */

  const showToast = (text) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: "" }), 1500);
  };

  // ✅ share always copies static short url (hide original)
  const onShareLink = async () => {
    const ok = await copyToClipboard(STATIC_SHARE_URL);
    showToast(ok ? "Link copied ✅" : "Copy failed ❌");
  };

  // ✅ demo download (only admin)
  const onDownloadDemo = () => {
    showToast("Only admin can download 🔒");
  };

  /* ================= PORTAL ================= */

  const Portal = ({ children }) =>
    typeof document === "undefined" ? null : createPortal(children, document.body);

  /* ================= RENDER ================= */

  return (
    <div className="ivPage">
      <div className="ivHeader">
        <div className="ivHeaderTop">
          <div>
            <div className="ivTitle">Inward Details (View Only)</div>
            <div className="ivSub">
              {from && to ? `From ${formatDDMMYYYY(from)} to ${formatDDMMYYYY(to)}` : "Month All Records"}
            </div>
          </div>

          {/* ✅ right side buttons (professional + small download) */}
          <div className="ivActions">
            <button className="ivDownloadBtn" type="button" onClick={onDownloadDemo} title="Admin only">
              Download
            </button>

            <button className="ivShareBtn" type="button" onClick={onShareLink} title="Copy share link">
              Share Link
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ivCenter">Loading…</div>
      ) : groups.length === 0 ? (
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
              {groups.map((g) => (
                <React.Fragment key={g.date}>
                  {g.items.map((r, idx) => {
                    const showGroupCols = idx === 0;
                    const letter = String.fromCharCode(97 + idx); // a,b,c...

                    return (
                      <tr key={`${g.date}-${idx}`}>
                        <td className="ivSr">{showGroupCols ? g.srNo : ""}</td>
                        <td className="ivDate">{showGroupCols ? formatDDMMYYYY(g.date) : ""}</td>

                        <td>
                          <span className="ivLetterBlack">{letter})</span> {r.material}
                        </td>

                        <td>
                          {r.quantity ?? ""}
                          {r.quantity_type ? ` ${r.quantity_type}` : ""}
                        </td>

                        <td className="ivStore">{showGroupCols ? r.store : ""}</td>

                        <td>{r.material_use}</td>
                      </tr>
                    );
                  })}

                  {/* ✅ separator line */}
                  <tr className="ivSepRow" aria-hidden="true">
                    <td colSpan={6} className="ivSepTd">
                      <div className="ivSepLine" />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

.ivActions{
  display:flex;
  gap:8px;
  align-items:center;
}

/* Share button (primary) */
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

/* ✅ Small professional Download button (secondary) */
.ivDownloadBtn{
  background:rgba(255,255,255,.14);
  color:#fff;
  border:1px solid rgba(255,255,255,.28);
  padding:7px 10px;              /* ✅ smaller */
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  white-space:nowrap;
  font-size:12px;                /* ✅ smaller text */
}
.ivDownloadBtn:hover{
  background:rgba(255,255,255,.20);
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

.ivDate{
  white-space:nowrap;
  font-weight:900;
}

.ivStore{
  white-space:nowrap;
  font-weight:400;
}

.ivLetterBlack{
  font-weight:900;
  color:#111827;
}

/* ✅ separator */
.ivSepRow td{
  padding:0 !important;
  border-bottom:none !important;
  background:#fff;
}
.ivSepTd{
  padding:0 !important;
  border-bottom:none !important;
}
.ivSepLine{
  width:100%;
  border-top:1px solid #0b1220;
  margin:10px 0;
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
