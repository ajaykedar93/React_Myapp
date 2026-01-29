import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const firstLoadRef = useRef(true);

  const [toast, setToast] = useState({ show: false, text: "" });
  const toastTimerRef = useRef(null);

  /* ================= GROUPING ================= */

  const normalizeRows = (list) => {
    const safe = Array.isArray(list) ? list : [];
    return safe
      .map((r) => ({
        inward_id: r.inward_id ?? r.id ?? "",
        work_date: toISO(r.work_date),
        store: (r.store ?? "").trim(),
        material: r.material ?? "",
        material_use: r.material_use ?? "",
        quantity: r.quantity ?? "",
        quantity_type: r.quantity_type ?? "",
        item_order: Number(r.item_order || 1),
      }))
      .filter((r) => r.work_date);
  };

  const groupByDateThenStore = (list) => {
    const sorted = [...list].sort((a, b) => {
      const d = a.work_date.localeCompare(b.work_date);
      if (d !== 0) return d;

      const s = (a.store || "").localeCompare(b.store || "");
      if (s !== 0) return s;

      const o = (a.item_order || 1) - (b.item_order || 1);
      if (o !== 0) return o;

      return String(a.inward_id).localeCompare(String(b.inward_id));
    });

    const dateMap = new Map();

    for (const r of sorted) {
      if (!dateMap.has(r.work_date)) dateMap.set(r.work_date, new Map());
      const storeMap = dateMap.get(r.work_date);

      const storeKey = r.store || "—";
      if (!storeMap.has(storeKey)) storeMap.set(storeKey, []);
      storeMap.get(storeKey).push(r);
    }

    const dates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));

    return dates.map((date, idx) => {
      const storeMap = dateMap.get(date);

      const stores = Array.from(storeMap.entries())
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([store, items]) => ({
          store,
          items,
        }));

      return {
        date,
        srNo: idx + 1,
        stores,
      };
    });
  };

  const groups = useMemo(() => groupByDateThenStore(normalizeRows(rows)), [rows]);

  /* ================= FETCH ================= */

  const fetchData = async () => {
    if (firstLoadRef.current) setLoading(true);

    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const url = qs.toString() ? `${LIST_API}?${qs.toString()}` : LIST_API;

      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.success) {
        if (firstLoadRef.current) setRows([]);
        return;
      }

      setRows(Array.isArray(j.data) ? j.data : []);
    } catch {
      if (firstLoadRef.current) setRows([]);
    } finally {
      if (firstLoadRef.current) {
        setLoading(false);
        firstLoadRef.current = false;
      }
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* ================= ACTIONS ================= */

  const showToast = (text) => {
    setToast({ show: true, text });

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, text: "" });
    }, 650);
  };

  const onShareLink = async () => {
    const ok = await copyToClipboard(STATIC_SHARE_URL);
    showToast(ok ? "Link copied ✅" : "Copy failed ❌");
  };

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
          <div className="ivHeaderLeft">
            <div className="ivTitle">Inward Details (View Only)</div>
            <div className="ivSub">
              {from && to ? `From ${formatDDMMYYYY(from)} to ${formatDDMMYYYY(to)}` : "Month All Records"}
            </div>
          </div>

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
        <div className="ivTableWrap" role="region" aria-label="Inward table scroll area">
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
                  {g.stores.map((storeGroup, sIdx) => (
                    <React.Fragment key={`${g.date}-${storeGroup.store}-${sIdx}`}>
                      {storeGroup.items.map((r, idx) => {
                        const showDate = idx === 0;
                        const showSrNo = sIdx === 0 && idx === 0;
                        const showStore = idx === 0;
                        const letter = String.fromCharCode(97 + idx);

                        return (
                          <tr key={`${g.date}-${storeGroup.store}-${idx}-${r.inward_id}`}>
                            <td className="ivSr">{showSrNo ? g.srNo : ""}</td>
                            <td className="ivDate">{showDate ? formatDDMMYYYY(g.date) : ""}</td>

                            <td>
                              <span className="ivLetterBlack">{letter})</span> {r.material}
                            </td>

                            <td>
                              {r.quantity ?? ""}
                              {r.quantity_type ? ` ${r.quantity_type}` : ""}
                            </td>

                            <td className="ivStore">{showStore ? storeGroup.store || "—" : ""}</td>
                            <td>{r.material_use}</td>
                          </tr>
                        );
                      })}

                      {sIdx !== g.stores.length - 1 && (
                        <tr className="ivStoreSepRow" aria-hidden="true">
                          <td colSpan={6} className="ivStoreSepTd">
                            <div className="ivStoreSepLine" />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  <tr className="ivSepRow" aria-hidden="true">
                    <td colSpan={6} className="ivSepTd">
                      <div className="ivSepLine" />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>

            {/* ✅ bottom space inside table so last row never hides */}
            <tfoot>
              <tr aria-hidden="true">
                <td colSpan={6} className="ivTfootSpacer" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Portal>
        {toast.show && (
          <>
            <div className="ivToastBackdrop" />
            <div className="ivToast" role="status" aria-live="polite">
              {toast.text}
            </div>
          </>
        )}
      </Portal>

      <style>{css}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const css = `
:root{
  --iv-wrap-offset: 180px;      /* header + padding approx */
  --iv-table-bottom-gap: 140px; /* space for last row visibility */
}

html, body {
  height: 100%;
  background: #f6f8fc;
  margin: 0;
}

#root { min-height: 100%; background:#f6f8fc; }
* { box-sizing: border-box; }

.ivPage{
  min-height:100dvh;
  background:#f6f8fc;
  padding:16px;
}

/* Header */
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

.ivHeaderLeft{ min-width:0; }

.ivTitle{
  font-size:18px;
  font-weight:900;
  line-height:1.2;
  word-break:break-word;
}
.ivSub{ font-size:12px; opacity:.85; margin-top:4px; }

.ivActions{
  display:flex;
  gap:8px;
  align-items:center;
  flex-shrink:0;
  flex-wrap:wrap;
}

.ivShareBtn{
  background:#fff;
  color:#0b1220;
  border:none;
  padding:7px 10px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  white-space:nowrap;
  font-size:12px;
}

.ivDownloadBtn{
  background:rgba(255,255,255,.14);
  color:#fff;
  border:1px solid rgba(255,255,255,.28);
  padding:7px 10px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  white-space:nowrap;
  font-size:12px;
}
.ivDownloadBtn:hover{ background:rgba(255,255,255,.20); }

.ivCenter{
  text-align:center;
  padding:40px;
  color:#6b7280;
  font-weight:700;
}

/* ✅ IMPORTANT: Table area scrolls, header row stays fixed */
.ivTableWrap{
  background:#fff;
  border-radius:14px;
  overflow:auto; /* ✅ BOTH scroll */
  box-shadow:0 12px 30px rgba(0,0,0,.08);
  -webkit-overflow-scrolling: touch;

  /* ✅ fixed height scroll area => only body rows scroll */
  max-height: calc(100dvh - var(--iv-wrap-offset));
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
}

.ivTable{
  width:100%;
  border-collapse:collapse;
  font-size:13px;
  min-width:900px;
  background:#fff;
}

.ivTable th,
.ivTable td{
  padding:10px;
  border-bottom:1px solid #e5e7eb;
  text-align:left;
  vertical-align:top;
}

/* ✅ STICKY HEADER (won't scroll) */
.ivTable th{
  background:#f3f4f6;
  font-weight:900;
  white-space:nowrap;
  position: sticky;
  top: 0;
  z-index: 5;
}

.ivSr{ font-weight:900; white-space:nowrap; }
.ivDate{ white-space:nowrap; font-weight:900; }
.ivStore{ white-space:nowrap; font-weight:700; }
.ivLetterBlack{ font-weight:900; color:#111827; }

/* separators */
.ivSepRow td{
  padding:0 !important;
  border-bottom:none !important;
  background:#fff;
}
.ivSepTd{ padding:0 !important; border-bottom:none !important; }
.ivSepLine{
  width:100%;
  border-top:1px solid #0b1220;
  margin:10px 0;
}

.ivStoreSepRow td{
  padding:0 !important;
  border-bottom:none !important;
  background:#fff;
}
.ivStoreSepTd{ padding:0 !important; border-bottom:none !important; }
.ivStoreSepLine{
  width:100%;
  border-top:2px dotted #94a3b8;
  margin:10px 0;
}

/* ✅ bottom spacer INSIDE table */
.ivTfootSpacer{
  height: calc(var(--iv-table-bottom-gap) + env(safe-area-inset-bottom));
  border-bottom:none !important;
  padding:0 !important;
  background:#fff;
}

/* Toast */
.ivToastBackdrop{
  position:fixed;
  inset:0;
  background:transparent;
  z-index:999998;
}
.ivToast{
  position:fixed;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  background:#0b1220;
  color:#fff;
  padding:6px 10px;
  border-radius:10px;
  font-weight:900;
  font-size:12px;
  z-index:999999;
  box-shadow:0 10px 25px rgba(0,0,0,.22);
  max-width:85vw;
  text-align:center;
}

/* ✅ Mobile tuning */
@media (max-width: 560px){
  :root{
    --iv-wrap-offset: 230px;
    --iv-table-bottom-gap: 220px;
  }

  .ivHeaderTop{
    flex-direction:column;
    align-items:stretch;
  }
  .ivActions{
    justify-content:flex-start;
    margin-top:10px;
  }
  .ivTable{
    min-width:760px;
  }
}
`;
