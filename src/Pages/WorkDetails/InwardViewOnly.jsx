import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function InwardViewOnly() {
  /* ================= CONFIG ================= */

  const API_BASE = useMemo(() => "https://express-backend-myapp.onrender.com", []);
  const LIST_API = `${API_BASE}/api/inward-view`;

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

  const getCurrentMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // YYYY-MM
  };

  const monthToLabel = (ym) => {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "";
    const [y, m] = ym.split("-").map(Number);
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleString("en-IN", { month: "short", year: "numeric" });
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

  const [month, setMonth] = useState(getCurrentMonth);
  const [monthOpen, setMonthOpen] = useState(false);

  const [rows, setRows] = useState([]);

  // ✅ Only for FIRST load (or explicit month change)
  const [initialLoading, setInitialLoading] = useState(true);

  // ✅ Silent refresh flag (no UI loading)
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef(null);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);

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
        .map(([store, items]) => ({ store, items }));

      return { date, srNo: idx + 1, stores };
    });
  };

  const groups = useMemo(() => groupByDateThenStore(normalizeRows(rows)), [rows]);

  /* ================= FETCH ================= */

  const fetchData = async (selectedMonth, { silent = false } = {}) => {
    // ✅ Prevent overlapping calls (poll + month change)
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Abort previous request if any
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // ✅ UI flags
    if (silent) setRefreshing(true);
    else setInitialLoading(true);

    try {
      const qs = new URLSearchParams();
      qs.set("month", selectedMonth);

      const url = `${LIST_API}?${qs.toString()}`;

      const r = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.success) {
        // ✅ Silent refresh should NOT clear the table (no flicker)
        if (!silent) setRows([]);
        return;
      }

      const incoming = Array.isArray(j.data) ? j.data : [];

      // ✅ Update rows without clearing first (smooth)
      setRows(incoming);
    } catch (e) {
      // Abort is normal, ignore
      if (e?.name !== "AbortError") {
        if (!silent) setRows([]);
      }
    } finally {
      if (silent) setRefreshing(false);
      else setInitialLoading(false);

      inFlightRef.current = false;
    }
  };

  const startPolling = (m) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      // ✅ silent refresh = no loading UI + no scroll jump
      fetchData(m, { silent: true });
    }, 20000);
  };

  // ✅ first load + start polling
  useEffect(() => {
    fetchData(month, { silent: false });
    startPolling(month);

    // ✅ pause polling when tab hidden (less flicker + better UX)
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        // refresh once silently when user comes back
        fetchData(month, { silent: true });
        startPolling(month);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (pollRef.current) clearInterval(pollRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line
  }, []);

  // ✅ month change: fetch + restart polling
  useEffect(() => {
    // ✅ Don't show “loading” in center after first load, but for month change we do a clean load
    fetchData(month, { silent: false });
    startPolling(month);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line
  }, [month]);

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

  const onDownloadDemo = () => showToast("Only admin can download 🔒");

  /* ================= PORTAL ================= */

  const Portal = ({ children }) =>
    typeof document === "undefined" ? null : createPortal(children, document.body);

  /* ================= RENDER ================= */

  const noData = !initialLoading && groups.length === 0;

  return (
    <div className="ivPage">
      <div className="ivHeader">
        <div className="ivHeaderTop">
          <div className="ivHeaderLeft">
            <div className="ivTitle">Inward Details (View Only)</div>
            <div className="ivSub">Month: {monthToLabel(month)}</div>
          </div>

          <div className="ivActions">
            <button className="ivMonthBtn" type="button" onClick={() => setMonthOpen(true)}>
              {monthToLabel(month)}
            </button>

            <button className="ivDownloadBtn" type="button" onClick={onDownloadDemo} title="Admin only">
              Download
            </button>

            <button className="ivShareBtn" type="button" onClick={onShareLink} title="Copy share link">
              Share Link
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Only show Loading on FIRST load / Month change */}
      {initialLoading ? (
        <div className="ivCenter">Loading…</div>
      ) : noData ? (
        <div className="ivCenter ivNoData">No records found</div>
      ) : (
        <>
          {/* ✅ very subtle “Refreshing…” badge (optional professional) */}
          {refreshing && <div className="ivRefreshPill">Refreshing…</div>}

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
            </table>
          </div>
        </>
      )}

      <Portal>
        {/* Toast */}
        {toast.show && (
          <>
            <div className="ivToastBackdrop" />
            <div className="ivToast" role="status" aria-live="polite">
              {toast.text}
            </div>
          </>
        )}

        {/* Month Modal */}
        {monthOpen && (
          <>
            <div className="ivModalBackdrop" onClick={() => setMonthOpen(false)} />
            <div className="ivModal" role="dialog" aria-modal="true">
              <div className="ivModalTitle">Select Month</div>

              <input className="ivMonthInput" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />

              <div className="ivModalActions">
                <button className="ivModalBtnGhost" type="button" onClick={() => setMonthOpen(false)}>
                  Close
                </button>
                <button
                  className="ivModalBtn"
                  type="button"
                  onClick={() => {
                    setMonthOpen(false);
                    showToast("Month updated ✅");
                  }}
                >
                  Done
                </button>
              </div>
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
  /* ✅ Small professional spacing */
  --iv-wrap-offset: 150px;
}

html, body { height: 100%; background: #f6f8fc; margin: 0; scroll-behavior:smooth; }
#root { min-height: 100%; background:#f6f8fc; }
* { box-sizing: border-box; }

.ivPage{
  min-height:100dvh;
  background:#f6f8fc;
  padding:10px; /* ✅ reduced */
}

.ivHeader{
  background:#0b1220;
  color:#fff;
  padding:14px; /* ✅ reduced */
  border-radius:14px;
  margin-bottom:10px; /* ✅ reduced */
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

.ivMonthBtn{
  background:rgba(255,255,255,.16);
  color:#fff;
  border:1px solid rgba(255,255,255,.28);
  padding:7px 10px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  white-space:nowrap;
  font-size:12px;
}
.ivMonthBtn:hover{ background:rgba(255,255,255,.22); }

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
  padding:28px;
  color:#6b7280;
  font-weight:800;
}

.ivNoData{
  color:#dc2626;
  font-weight:900;
}

/* ✅ Smooth + professional scroll */
.ivTableWrap{
  background:#fff;
  border-radius:14px;
  overflow:auto;
  box-shadow:0 12px 30px rgba(0,0,0,.08);
  -webkit-overflow-scrolling: touch;
  max-height: calc(100dvh - var(--iv-wrap-offset));
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
  scroll-behavior: smooth;
  padding-bottom: 14px; /* ✅ small bottom breathing space */
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

.ivSepRow td{ padding:0 !important; border-bottom:none !important; background:#fff; }
.ivSepTd{ padding:0 !important; border-bottom:none !important; }
.ivSepLine{ width:100%; border-top:1px solid #0b1220; margin:10px 0; }

.ivStoreSepRow td{ padding:0 !important; border-bottom:none !important; background:#fff; }
.ivStoreSepTd{ padding:0 !important; border-bottom:none !important; }
.ivStoreSepLine{ width:100%; border-top:2px dotted #94a3b8; margin:10px 0; }

/* ✅ small refresh indicator */
.ivRefreshPill{
  display:inline-block;
  margin: 0 0 8px 2px;
  padding: 5px 10px;
  background:#0b1220;
  color:#fff;
  border-radius:999px;
  font-weight:900;
  font-size:11px;
  width: fit-content;
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

/* Month modal */
.ivModalBackdrop{
  position:fixed;
  inset:0;
  background: rgba(0,0,0,.25);
  z-index:999997;
}
.ivModal{
  position:fixed;
  left:50%;
  top:50%;
  transform: translate(-50%,-50%);
  width: min(92vw, 360px);
  background:#fff;
  border-radius:14px;
  padding:14px;
  z-index:999999;
  box-shadow:0 16px 40px rgba(0,0,0,.22);
}
.ivModalTitle{ font-weight:900; color:#0b1220; margin-bottom:10px; }
.ivMonthInput{
  width:100%;
  padding:10px;
  border-radius:12px;
  border:1px solid #e5e7eb;
  font-weight:800;
  outline:none;
}
.ivModalActions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:12px;
}
.ivModalBtn{
  background:#0b1220;
  color:#fff;
  border:none;
  padding:8px 12px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
}
.ivModalBtnGhost{
  background:#f3f4f6;
  color:#0b1220;
  border:none;
  padding:8px 12px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
}

@media (max-width: 560px){
  :root{
    --iv-wrap-offset: 220px;
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
