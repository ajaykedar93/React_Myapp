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
    return `${y}-${m}`;
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
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ show: false, text: "" });
  const toastTimerRef = useRef(null);

  const pollRef = useRef(null);
  const abortRef = useRef(null);

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
  const fetchData = async ({ selectedMonth, silent = false }) => {
    // ✅ loader only for first load / month change
    if (!silent && rows.length === 0) setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const qs = new URLSearchParams();
      qs.set("month", selectedMonth);

      const url = `${LIST_API}?${qs.toString()}`;

      const r = await fetch(url, { cache: "no-store", signal: ac.signal });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.success) {
        if (!silent) setRows([]);
        return;
      }

      setRows(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      if (e?.name !== "AbortError") {
        if (!silent) setRows([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ fast load once + silent refresh every 20s
    setLoading(true);
    fetchData({ selectedMonth: month, silent: false });

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchData({ selectedMonth: month, silent: true });
    }, 20000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (abortRef.current) abortRef.current.abort();
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
  const noData = !loading && groups.length === 0;

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

      {/* ✅ body fills remaining height (NO extra white space) */}
      <div className="ivBody">
        {loading ? (
          <div className="ivCenter">Loading…</div>
        ) : noData ? (
          <div className="ivCenter ivNoData">No records found</div>
        ) : (
          <>
            {/* Desktop/Tablet Table */}
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

            {/* Mobile Cards */}
            <div className="ivCards" aria-label="Inward cards">
              {groups.map((g) => (
                <div className="ivCardGroup" key={`m-${g.date}`}>
                  <div className="ivCardGroupTop">
                    <div className="ivCardSr">Sr. {g.srNo}</div>
                    <div className="ivCardDate">{formatDDMMYYYY(g.date)}</div>
                  </div>

                  {g.stores.map((storeGroup, sIdx) => (
                    <div className="ivStoreBlock" key={`m-${g.date}-${storeGroup.store}-${sIdx}`}>
                      <div className="ivStorePill">{storeGroup.store || "—"}</div>

                      {storeGroup.items.map((r, idx) => {
                        const letter = String.fromCharCode(97 + idx);
                        return (
                          <div className="ivItemCard" key={`m-${g.date}-${storeGroup.store}-${idx}-${r.inward_id}`}>
                            <div className="ivItemTop">
                              <div className="ivItemTitle">
                                <span className="ivLetterBlack">{letter})</span> {r.material || "—"}
                              </div>
                              <div className="ivQty">
                                {(r.quantity ?? "") + (r.quantity_type ? ` ${r.quantity_type}` : "")}
                              </div>
                            </div>

                            <div className="ivItemMeta">
                              <div className="ivMetaRow">
                                <span className="ivMetaLabel">Use</span>
                                <span className="ivMetaValue">{r.material_use || "—"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Portal>
        {toast.show && (
          <>
            <div className="ivToastBackdrop" />
            <div className="ivToast" role="status" aria-live="polite">
              {toast.text}
            </div>
          </>
        )}

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
/* ✅ remove browser default gaps */
html, body { height: 100%; margin: 0; padding: 0; background: #f6f8fc; }
#root { height: 100%; }

/* ✅ full screen layout WITHOUT extra white space */
.ivPage{
  height: 100dvh;
  display:flex;
  flex-direction:column;
  background:#f6f8fc;

  /* ✅ only small safe-area padding (no big top/bottom) */
  padding-top: max(10px, env(safe-area-inset-top));
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}

* { box-sizing: border-box; }

.ivHeader{
  flex: 0 0 auto;
  background:#0b1220;
  color:#fff;
  padding:14px;
  border-radius:14px;
  margin-bottom:10px;
}

.ivHeaderTop{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:flex-start;
}

.ivTitle{ font-size:18px; font-weight:900; line-height:1.2; }
.ivSub{ font-size:12px; opacity:.85; margin-top:4px; }

.ivActions{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
}

.ivMonthBtn{
  background:rgba(255,255,255,.16);
  color:#fff;
  border:1px solid rgba(255,255,255,.28);
  padding:8px 12px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  font-size:12px;
}
.ivMonthBtn:hover{ background:rgba(255,255,255,.22); }

.ivShareBtn{
  background:#fff;
  color:#0b1220;
  border:none;
  padding:8px 12px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  font-size:12px;
}

.ivDownloadBtn{
  background:rgba(255,255,255,.14);
  color:#fff;
  border:1px solid rgba(255,255,255,.28);
  padding:8px 12px;
  border-radius:10px;
  font-weight:900;
  cursor:pointer;
  font-size:12px;
}
.ivDownloadBtn:hover{ background:rgba(255,255,255,.20); }

/* ✅ body fills remaining height (removes bottom blank area) */
.ivBody{
  flex: 1 1 auto;
  min-height: 0;
  display:block;
}

/* loader centered inside body */
.ivCenter{
  height: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#6b7280;
  font-weight:800;
}
.ivNoData{ color:#dc2626; font-weight:900; }

/* ===== Desktop Table ===== */
.ivTableWrap{
  height: 100%;
  background:#fff;
  border-radius:14px;
  overflow:auto;
  box-shadow:0 12px 30px rgba(0,0,0,.08);
  -webkit-overflow-scrolling: touch;

  /* ✅ only small inner padding, no huge blank */
  padding-bottom: 10px;
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
.ivSepLine{ width:100%; border-top:1px solid #0b1220; margin:10px 0; }

.ivStoreSepRow td{ padding:0 !important; border-bottom:none !important; background:#fff; }
.ivStoreSepLine{ width:100%; border-top:2px dotted #94a3b8; margin:10px 0; }

/* ===== Mobile Cards ===== */
.ivCards{ display:none; height: 100%; overflow:auto; padding-bottom: 10px; }

.ivCardGroup{
  background:#fff;
  border-radius:16px;
  box-shadow:0 12px 30px rgba(0,0,0,.08);
  padding:18px;
  margin-bottom:12px;
}

.ivCardGroupTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  margin-bottom:12px;
}

.ivCardSr{
  font-weight:900;
  color:#0b1220;
  font-size:12px;
  background:#f3f4f6;
  padding:7px 12px;
  border-radius:999px;
}

.ivCardDate{
  font-weight:900;
  color:#0b1220;
  font-size:12px;
}

.ivStoreBlock{ margin-top:14px; }

.ivStorePill{
  display:inline-flex;
  padding:8px 14px;
  border-radius:999px;
  background:#0b1220;
  color:#fff;
  font-weight:900;
  font-size:13px;
}

.ivItemCard{
  margin-top:14px;
  border:1px solid #e5e7eb;
  border-radius:14px;
  padding:16px;
  background:#fff;

  /* ✅ card height increased (not short) */
  min-height: 140px;

  display:flex;
  flex-direction:column;
  justify-content:space-between;
}

.ivItemTop{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
}

.ivItemTitle{
  font-weight:900;
  color:#111827;
  font-size:14px;
  line-height:1.35;
  word-break:break-word;
}

.ivQty{
  flex-shrink:0;
  font-weight:900;
  font-size:13px;
  background:#f3f4f6;
  color:#0b1220;
  padding:8px 12px;
  border-radius:12px;
  white-space:nowrap;
}

.ivItemMeta{ margin-top:12px; }
.ivMetaRow{ display:flex; justify-content:space-between; gap:10px; }
.ivMetaLabel{ font-weight:900; color:#6b7280; font-size:12px; }
.ivMetaValue{ font-weight:800; color:#111827; font-size:13px; text-align:right; word-break:break-word; }

/* Toast */
.ivToastBackdrop{ position:fixed; inset:0; background:transparent; z-index:999998; }
.ivToast{
  position:fixed;
  left:50%; top:50%;
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
.ivModalBackdrop{ position:fixed; inset:0; background: rgba(0,0,0,.25); z-index:999997; }
.ivModal{
  position:fixed;
  left:50%; top:50%;
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
.ivModalActions{ display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
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

/* ✅ Mobile layout */
@media (max-width: 760px){
  .ivHeaderTop{ flex-direction:column; align-items:stretch; }
  .ivActions{ margin-top:10px; }

  /* hide wide table, show cards */
  .ivTableWrap{ display:none; }
  .ivCards{ display:block; }
}
`;
