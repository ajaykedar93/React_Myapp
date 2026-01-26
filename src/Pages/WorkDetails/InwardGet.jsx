import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

export default function InwardGet({ refreshToken = 0 }) {
  const API_BASE = useMemo(() => "https://express-backend-myapp.onrender.com", []);
  const LIST_API = `${API_BASE}/api/inward`;
  const ONE_API = (id) => `${API_BASE}/api/inward/${id}`;
  const DELETE_API = (id) => `${API_BASE}/api/inward/${id}`;
  const PDF_API = `${API_BASE}/api/inward/pdf`;

  const navigate = useNavigate();
  const location = useLocation();

  const formatDDMMYYYY = (iso) => {
    const s = String(iso || "").slice(0, 10);
    if (!s || s.length !== 10) return s || "";
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}/${m}/${y}`;
  };

  const formatMonthTitle = (ym) => {
    const [y, m] = String(ym || "").split("-");
    const monthIdx = Number(m || 0) - 1;
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (!y || monthIdx < 0 || monthIdx > 11) return ym || "";
    return `${names[monthIdx]} ${y}`;
  };

  // ✅ Single date input (not applied until Apply click)
  const [selectedDate, setSelectedDate] = useState("");
  const [appliedDate, setAppliedDate] = useState(""); // when applied, this controls filtering

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [overlay, setOverlay] = useState({ open: false, text: "Please wait..." });

  const [dlg, setDlg] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    onOk: null,
    okText: "OK",
    showCancel: false,
    cancelText: "Cancel",
    onCancel: null,
  });

  const openDlg = (cfg) =>
    setDlg({
      open: true,
      type: cfg.type || "info",
      title: cfg.title || "",
      message: cfg.message || "",
      onOk: cfg.onOk || null,
      okText: cfg.okText || "OK",
      showCancel: !!cfg.showCancel,
      cancelText: cfg.cancelText || "Cancel",
      onCancel: cfg.onCancel || null,
    });

  const closeDlg = () => setDlg((m) => ({ ...m, open: false }));

  const [imageViewer, setImageViewer] = useState({
    open: false,
    url: "",
    isPdf: false,
    title: "",
  });

  // ✅ make relative file_url absolute
  const computeFileUrl = (it) => {
    const f = it?.file_url || "";
    if (f) {
      if (String(f).startsWith("/")) return `${API_BASE}${f}`;
      return f;
    }
    if (it?.upload_id) return `${API_BASE}/api/inward/upload/${it.upload_id}/view`;
    if (it?.image_path) return it.image_path;
    return "";
  };

  const flatten = (records) => {
    const out = [];
    for (const rec of records) {
      const items = Array.isArray(rec.items) ? rec.items : [];
      for (const it of items) {
        out.push({
          inward_id: rec.id,
          seq_no: rec.seq_no,
          work_date: String(rec.work_date || "").slice(0, 10),
          store: rec.store || "",
          item_id: it.id,
          item_order: it.item_order,
          material: it.material || "",
          quantity: it.quantity,
          quantity_type: it.quantity_type || "",
          material_use: it.material_use || "",
          image_url: computeFileUrl(it),
          upload_id: it.upload_id || null,
          mime_type: it.mime_type || "",
        });
      }
    }
    out.sort((a, b) => {
      const da = String(a.work_date || "");
      const db = String(b.work_date || "");
      if (da !== db) return da.localeCompare(db);
      const sa = Number(a.seq_no || 0);
      const sb = Number(b.seq_no || 0);
      if (sa !== sb) return sa - sb;
      return (a.item_order || 0) - (b.item_order || 0);
    });
    return out;
  };

  // ✅ abortable fetch
  const abortRef = useRef(null);

  const buildListUrl = (dateISO) => {
    const qs = new URLSearchParams();
    if (dateISO) {
      qs.set("from", dateISO);
      qs.set("to", dateISO);
    }
    return qs.toString() ? `${LIST_API}?${qs.toString()}` : LIST_API;
  };

  // ✅ SAFE JSON (handles HTML / empty too)
  const safeReadJson = async (resp) => {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return resp.json().catch(() => ({}));
    }
    const txt = await resp.text().catch(() => "");
    return { success: false, message: txt ? String(txt).slice(0, 300) : "Server Error" };
  };

  const fetchList = async ({ dateISO = "" } = {}) => {
    try {
      if (abortRef.current) abortRef.current.abort();
    } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const url = buildListUrl(dateISO);
      const r = await fetch(url, { signal: controller.signal });
      const data = await safeReadJson(r);

      if (!r.ok || !data?.success) {
        openDlg({ type: "error", title: "Failed", message: data?.message || "Unable to load inward list." });
        setRows([]);
        setLoading(false);
        return;
      }

      const headers = Array.isArray(data.data) ? data.data : [];
      if (headers.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const hasItemsInline = Array.isArray(headers[0]?.items);
      if (hasItemsInline) {
        setRows(flatten(headers));
        setLoading(false);
        return;
      }

      const tasks = headers.map((h) =>
        fetch(ONE_API(h.id), { signal: controller.signal })
          .then((rr) => safeReadJson(rr))
          .then((dd) => (dd?.success && dd?.data ? dd.data : null))
          .catch(() => null)
      );

      const all = await Promise.all(tasks);
      const detailed = all.filter(Boolean);

      setRows(flatten(detailed));
      setLoading(false);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setLoading(false);
      openDlg({ type: "error", title: "Network Error", message: "Server not reachable." });
    }
  };

  // ✅ FIRST LOAD
  useEffect(() => {
    fetchList({ dateISO: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ refreshToken change => refresh with currently applied filter
  const firstTokenSkip = useRef(true);
  useEffect(() => {
    if (firstTokenSkip.current) {
      firstTokenSkip.current = false;
      return;
    }
    fetchList({ dateISO: appliedDate || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // ✅ when coming back from update page => refresh
  useEffect(() => {
    if (location?.state?.refresh === true) {
      if (typeof location?.state?.date === "string") {
        setSelectedDate(location.state.date);
        setAppliedDate(location.state.date);
        fetchList({ dateISO: location.state.date });
      } else {
        fetchList({ dateISO: appliedDate || "" });
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state]);

  const downloadPdf = () => {
    const qs = new URLSearchParams();
    if (appliedDate) {
      qs.set("from", appliedDate);
      qs.set("to", appliedDate);
    }
    const url = qs.toString() ? `${PDF_API}?${qs.toString()}` : PDF_API;
    window.open(url, "_blank");
  };

  const openImage = (row, displaySeq) => {
    const src = row?.image_url || "";
    if (!src) {
      openDlg({ type: "info", title: "No File", message: "This row has no bill file." });
      return;
    }

    const mt = String(row?.mime_type || "").toLowerCase();
    let isPdf = mt === "application/pdf";

    if (!mt) {
      const clean = String(src).toLowerCase().split("?")[0];
      if (clean.endsWith(".pdf")) isPdf = true;
    }

    setImageViewer({
      open: true,
      url: src,
      isPdf,
      title: `Sr.No ${displaySeq} • ${row.material}`,
    });
  };

  const closeImage = () => setImageViewer({ open: false, url: "", isPdf: false, title: "" });

  const goUpdatePage = (inwardId, displaySeq) => {
    navigate(`/work-details/inward/update/${inwardId}`, {
      state: { displaySeq, date: appliedDate || "", returnTo: location.pathname },
    });
  };

  // ✅ Delete popup OK/Cancel FIX
  const confirmDelete = (inwardId, displaySeq) => {
    openDlg({
      type: "error",
      title: "Delete Inward",
      message: `Are you sure you want to delete Sr.No ${displaySeq}?`,
      okText: "Delete",
      showCancel: true,
      cancelText: "Cancel",
      onCancel: () => closeDlg(),
      onOk: async () => {
        closeDlg();
        setOverlay({ open: true, text: "Deleting..." });

        try {
          const r = await fetch(DELETE_API(inwardId), { method: "DELETE" });
          const data = await safeReadJson(r);

          setOverlay({ open: false, text: "Please wait..." });

          if (r.ok && data?.success) {
            setRows((prev) => prev.filter((x) => String(x.inward_id) !== String(inwardId)));
            openDlg({ type: "success", title: "Deleted", message: `Sr.No ${displaySeq} deleted successfully.` });
            // ✅ optional refresh for safety
            fetchList({ dateISO: appliedDate || "" });
            return;
          }

          openDlg({ type: "error", title: "Failed", message: data?.message || "Delete failed." });
          fetchList({ dateISO: appliedDate || "" });
        } catch {
          setOverlay({ open: false, text: "Please wait..." });
          openDlg({ type: "error", title: "Network Error", message: "Server not reachable." });
          fetchList({ dateISO: appliedDate || "" });
        }
      },
    });
  };

  const applyDate = () => {
    const d = String(selectedDate || "").slice(0, 10);
    setAppliedDate(d);
    fetchList({ dateISO: d });
  };

  const clearDate = () => {
    setSelectedDate("");
    setAppliedDate("");
    fetchList({ dateISO: "" });
  };

  const setRipplePoint = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--rx", `${x}%`);
    el.style.setProperty("--ry", `${y}%`);
  };

  const Portal = ({ children }) => {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
  };

  const closeIfBackdropClick = (e, fn) => {
    if (e.target === e.currentTarget) fn();
  };

  // ✅ IMPORTANT: DO NOT use onClickCapture
  const stopAll = (e) => {
    e.stopPropagation();
  };

  const filteredRows = useMemo(() => {
    if (!appliedDate) return rows;
    return rows.filter((r) => String(r.work_date || "").slice(0, 10) === appliedDate);
  }, [rows, appliedDate]);

  const groupedByMonth = useMemo(() => {
    const headerMap = new Map();
    for (const r of filteredRows) {
      if (!headerMap.has(r.inward_id)) {
        headerMap.set(r.inward_id, {
          inward_id: r.inward_id,
          seq_no: r.seq_no,
          work_date: r.work_date,
          store: r.store,
          items: [],
        });
      }
      headerMap.get(r.inward_id).items.push(r);
    }

    const monthMap = new Map();

    for (const h of headerMap.values()) {
      const dateISO = String(h.work_date || "").slice(0, 10);
      const ym = dateISO.slice(0, 7);

      if (!monthMap.has(ym)) monthMap.set(ym, { ym, datesMap: new Map(), entriesFlat: [] });

      monthMap.get(ym).entriesFlat.push(h);

      if (!monthMap.get(ym).datesMap.has(dateISO)) monthMap.get(ym).datesMap.set(dateISO, { dateISO, entries: [] });
      monthMap.get(ym).datesMap.get(dateISO).entries.push(h);
    }

    const months = Array.from(monthMap.values()).sort((a, b) => String(b.ym).localeCompare(String(a.ym)));

    for (const m of months) {
      m.entriesFlat.sort((a, b) => {
        const da = String(a.work_date || "");
        const db = String(b.work_date || "");
        if (da !== db) return da.localeCompare(db);
        return Number(a.inward_id || 0) - Number(b.inward_id || 0);
      });

      const seqMap = new Map();
      m.entriesFlat.forEach((e, idx) => seqMap.set(e.inward_id, idx + 1));

      const dateCards = Array.from(m.datesMap.values()).sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));

      for (const d of dateCards) {
        d.entries = d.entries
          .map((e) => ({
            ...e,
            display_seq: seqMap.get(e.inward_id) || null,
            items: [...(e.items || [])].sort((x, y) => (x.item_order || 0) - (y.item_order || 0)),
          }))
          .sort((a, b) => (a.display_seq || 0) - (b.display_seq || 0));
      }

      m.dateCards = dateCards;
      m.totalRecords = m.entriesFlat.length;
    }

    return months;
  }, [filteredRows]);

  return (
    <div className="igPage">
      <div className="igTopbar">
        <div>
          <div className="igTopbar__title">Inward List</div>
          {appliedDate ? <div className="igTopbar__sub">Showing: {formatDDMMYYYY(appliedDate)}</div> : null}
        </div>

        <div className="igTopbarActions">
          <button type="button" className="igBtn igBtn--outline igRipple" onPointerDown={setRipplePoint} onClick={() => fetchList({ dateISO: appliedDate || "" })}>
            Refresh
          </button>
          <button type="button" className="igBtn igBtn--primary igRipple" onPointerDown={setRipplePoint} onClick={downloadPdf}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="igFilters">
        <div className="igField">
          <label>Select Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        <div className="igFilterBtns">
          <button type="button" className="igBtn igBtn--dark igRipple" onPointerDown={setRipplePoint} onClick={applyDate}>
            Apply
          </button>

          <button
            type="button"
            className="igBtn igBtn--ghost igRipple"
            onPointerDown={setRipplePoint}
            onClick={clearDate}
            disabled={!selectedDate && !appliedDate}
            title={!selectedDate && !appliedDate ? "Nothing to clear" : "Clear date"}
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="igCenterPad">
          <div className="igMiniLoader" />
          <div className="igMuted">Loading...</div>
        </div>
      ) : groupedByMonth.length === 0 ? (
        <div className="igEmpty">
          <div className="igEmptyCard">
            <div className="igEmptyTitle">No inward records</div>
            <div className="igEmptySub">Try a different date or clear filter.</div>
            <div className="igEmptyActions">
              <button type="button" className="igBtn igBtn--dark igRipple" onPointerDown={setRipplePoint} onClick={() => fetchList({ dateISO: appliedDate || "" })}>
                Refresh
              </button>
              <button type="button" className="igBtn igBtn--ghost igRipple" onPointerDown={setRipplePoint} onClick={clearDate}>
                Clear Date
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="igList">
          {groupedByMonth.map((month) => (
            <div className="igMonthWrap" key={month.ym}>
              <div className="igMonthHeader">
                <div className="igMonthTitle">{formatMonthTitle(month.ym)}</div>
                <div className="igMonthCount">{month.totalRecords} record(s)</div>
              </div>

              {month.dateCards.map((day) => (
                <div className="igDateCard" key={day.dateISO}>
                  <div className="igDateHeader">
                    <div className="igDateHeaderLeft">
                      <div className="igDateHeaderTitle">Date</div>
                      <div className="igDateHeaderValue">{formatDDMMYYYY(day.dateISO)}</div>
                    </div>
                    <div className="igDateHeaderRight">
                      <div className="igDateHeaderCount">{day.entries.length} record(s)</div>
                    </div>
                  </div>

                  <div className="igDateBody">
                    {day.entries.map((g) => (
                      <div className="igCard" key={g.inward_id}>
                        <div className="igCardHead">
                          <div className="igHeadLeft">
                            <div className="igSrLine">
                              <span className="igSrLabel">Sr.No</span>
                              <span className="igPill">{g.display_seq}</span>
                              <span className="igStorePill" title="Store">
                                {g.store}
                              </span>
                            </div>
                            <div className="igDateLine">
                              <span className="igDateDot" />
                              <span className="igDateText">{formatDDMMYYYY(g.work_date)}</span>
                            </div>
                          </div>

                          <div className="igHeadRight">
                            <button type="button" className="igBtn igBtn--outline igRipple" onPointerDown={setRipplePoint} onClick={() => goUpdatePage(g.inward_id, g.display_seq)}>
                              Update
                            </button>
                            <button type="button" className="igBtn igBtn--danger igRipple" onPointerDown={setRipplePoint} onClick={() => confirmDelete(g.inward_id, g.display_seq)}>
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="igTableWrap">
                          <table className="igTbl igTbl--auto">
                            <thead>
                              <tr>
                                <th className="col-sub">Sub No</th>
                                <th className="col-mat">Material</th>
                                <th className="col-qty">Quantity</th>
                                <th className="col-store">Store</th>
                                <th className="col-use">Material Use</th>
                                <th className="col-bill">Bill</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.items.map((r) => (
                                <tr key={r.item_id || `${r.inward_id}-${r.item_order}`}>
                                  <td className="igSubNo">{String.fromCharCode(96 + (r.item_order || 1))})</td>

                                  <td className="igMaterial">
                                    <div className="igCellMain">{r.material}</div>
                                  </td>

                                  <td className="igQty">
                                    <span className="igQtyWrap">
                                      <span className="igQtyNum">{r.quantity ?? ""}</span>
                                      {r.quantity_type ? <span className="igQtyType">{r.quantity_type}</span> : null}
                                    </span>
                                  </td>

                                  <td className="igStoreCell">{g.store}</td>

                                  <td className="igUse">
                                    <div className="igClamp2" title={r.material_use}>
                                      {r.material_use}
                                    </div>
                                  </td>

                                  <td className="igBillCell">
                                    <button type="button" className="igBtn igBtn--small igBtn--sky igRipple" onPointerDown={setRipplePoint} onClick={() => openImage(r, g.display_seq)}>
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="igMobileActions">
                          <button type="button" className="igBtn igBtn--outline igBtnTiny igRipple" onPointerDown={setRipplePoint} onClick={() => goUpdatePage(g.inward_id, g.display_seq)}>
                            Update
                          </button>
                          <button type="button" className="igBtn igBtn--danger igBtnTiny igRipple" onPointerDown={setRipplePoint} onClick={() => confirmDelete(g.inward_id, g.display_seq)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Portal>
        {overlay.open && (
          <div className="igOverlay" role="status" aria-live="polite">
            <div className="igOverlayCard">
              <div className="igSpinner" />
              <div className="igOverlayText">{overlay.text}</div>
              <div className="igOverlaySub">Please wait…</div>
            </div>
          </div>
        )}

        {dlg.open && (
          <div className="igDlgOverlay" role="dialog" aria-modal="true" onClick={(e) => closeIfBackdropClick(e, closeDlg)}>
            {/* ✅ FIX: onClick (NOT onClickCapture) */}
            <div className="igDlg igDlgScrollable" onClick={stopAll}>
              <div className={`igDlgTop igDlgTop--${dlg.type}`}>
                <div className="igDlgTitle">{dlg.title}</div>
              </div>

              <div className="igDlgBody igDlgBodyScroll">
                <pre className="igDlgMsg">{dlg.message}</pre>
              </div>

              <div className="igDlgActions">
                {dlg.showCancel && (
                  <button
                    className="igBtn igBtn--outline igRipple"
                    type="button"
                    onPointerDown={setRipplePoint}
                    onClick={() => {
                      if (typeof dlg.onCancel === "function") dlg.onCancel();
                      else closeDlg();
                    }}
                  >
                    {dlg.cancelText}
                  </button>
                )}

                <button
                  className="igBtn igBtn--dark igRipple"
                  type="button"
                  onPointerDown={setRipplePoint}
                  onClick={() => {
                    if (typeof dlg.onOk === "function") return dlg.onOk();
                    closeDlg();
                  }}
                >
                  {dlg.okText}
                </button>
              </div>
            </div>
          </div>
        )}

        {imageViewer.open && (
          <div className="igImgOverlay" role="dialog" aria-modal="true" onClick={(e) => closeIfBackdropClick(e, closeImage)}>
            {/* ✅ FIX: onClick (NOT onClickCapture) */}
            <div className="igImgModal igImgModalSafe" onClick={stopAll}>
              <div className="igImgTop">
                <div className="igImgTitle">{imageViewer.title}</div>
                <button type="button" className="igXBtn igRipple" onPointerDown={setRipplePoint} onClick={closeImage} aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="igImgBody">
                {imageViewer.isPdf ? (
                  <iframe title="Bill PDF" src={imageViewer.url} className="igPdfFrame" />
                ) : (
                  <img src={imageViewer.url} alt="Bill" className="igImgView" />
                )}
              </div>
            </div>
          </div>
        )}
      </Portal>

      <style>{css}</style>
    </div>
  );
}

const css = `
// ✅ तुझं CSS जसं आहे तसंच ठेव (same)

:root{
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --modal-pad: 16px;
}

.igPage{
  min-height:100svh;
  width:100%;
  background:#f6f8fc;
  margin:0;
  padding:0;
  display:flex;
  flex-direction:column;
  overflow-x:hidden;
}

/* ✅ BIG SCREEN: remove outside spaces (full page) */
.igTopbar{
  width:100%;
  margin:0;
  border-radius:0;
  background:linear-gradient(135deg,#0b1220,#0f2147);
  color:#fff;
  padding:14px 16px;
  box-sizing:border-box;
  display:flex;
  gap:12px;
  justify-content:space-between;
  align-items:flex-start;
  box-shadow:0 14px 40px rgba(11,18,32,0.14);
}
.igTopbar__title{font-size:18px;font-weight:900;letter-spacing:0.2px;}
.igTopbar__sub{margin-top:4px;font-size:12px;font-weight:800;opacity:.85;}
.igTopbarActions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;}

/* filter */
.igFilters{
  width:100%;
  margin:0;
  background:#fff;
  border-top:1px solid rgba(0,0,0,0.08);
  border-bottom:1px solid rgba(0,0,0,0.08);
  border-left:0;border-right:0;
  border-radius:0;
  padding:12px 16px;
  display:flex;
  gap:10px;
  align-items:flex-end;
  flex-wrap:wrap;
  box-sizing:border-box;
  box-shadow:0 10px 30px rgba(11,18,32,0.06);
}
.igField label{display:block;font-size:12px;font-weight:900;color:#111827;margin-bottom:6px;}
.igField input{
  width:220px;
  box-sizing:border-box;
  border:1px solid rgba(0,0,0,0.15);
  border-radius:12px;
  padding:10px 10px;
  font-size:14px;
  outline:none;
  background:#fff;
}
.igFilterBtns{display:flex;gap:10px;flex-wrap:wrap;}

/* buttons */
.igBtn{
  border:0;border-radius:12px;
  padding:9px 11px;
  font-weight:900;cursor:pointer;font-size:13px;line-height:1;
  transition:transform .08s ease, filter .15s ease, opacity .2s ease, box-shadow .15s ease;
  user-select:none;position:relative;overflow:hidden;
  touch-action:manipulation;
  -webkit-tap-highlight-color: transparent;
}
.igBtn:hover{filter:brightness(0.98);}
.igBtn:active{transform:scale(0.98);filter:brightness(0.96);}
.igBtn:disabled{opacity:0.55;cursor:not-allowed;}
.igBtn:focus-visible{outline:3px solid rgba(59,130,246,0.45);outline-offset:2px;}

.igBtn--primary{background:#ffffff;color:#0b1220;border:1px solid rgba(255,255,255,0.25);}
.igBtn--dark{background:#0b1220;color:#fff;box-shadow:0 10px 22px rgba(11,18,32,0.18);}
.igBtn--outline{background:#fff;color:#0b1220;border:1px solid rgba(11,18,32,0.18);}
.igBtn--danger{background:#fee2e2;color:#b91c1c;border:1px solid rgba(185,28,28,0.18);}
.igBtn--ghost{background:rgba(11,18,32,0.08);color:#0b1220;border:1px solid rgba(11,18,32,0.06);}
.igBtn--emerald{background:rgba(16,185,129,0.16);color:#065f46;border:1px solid rgba(16,185,129,0.20);}
.igBtn--sky{background:rgba(37,99,235,0.12);color:#1d4ed8;border:1px solid rgba(37,99,235,0.18);}
.igBtn--small{padding:7px 10px;font-size:12px;border-radius:10px;}
.igBtnTiny{padding:8px 10px;font-size:13px;border-radius:12px;}

/* ripple */
.igRipple::after{
  content:"";
  position:absolute;inset:0;
  background: radial-gradient(circle at var(--rx, 50%) var(--ry, 50%), rgba(255,255,255,0.45), transparent 45%);
  opacity:0;transition: opacity .25s ease;
}
.igRipple:active::after{opacity:1;}

/* center */
.igCenterPad{padding:28px;text-align:center;}
.igMuted{font-size:12px;color:#6b7280;}
.igMiniLoader{width:34px;height:34px;border-radius:999px;border:4px solid rgba(11,18,32,0.15);border-top-color:#0b1220;animation:igSpin 0.9s linear infinite;margin:0 auto 10px;}
@keyframes igSpin{to{transform:rotate(360deg);}}

/* empty */
.igEmpty{padding:14px 16px 18px;display:flex;justify-content:center;}
.igEmptyCard{
  width:100%;
  max-width:620px;
  background:#fff;
  border:1px solid rgba(0,0,0,0.08);
  border-radius:18px;
  padding:16px;
  box-shadow:0 14px 40px rgba(11,18,32,0.08);
}
.igEmptyTitle{font-size:16px;font-weight:900;color:#0b1220;}
.igEmptySub{margin-top:6px;font-size:12px;color:#6b7280;line-height:1.4;}
.igEmptyActions{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;}

/* list */
.igList{
  padding:12px 16px 16px;
  display:flex;
  flex-direction:column;
  gap:12px;
  box-sizing:border-box;
}

.igMonthWrap{width:100%;margin:0;display:flex;flex-direction:column;gap:12px;}
.igMonthHeader{
  display:flex;justify-content:space-between;align-items:center;gap:10px;
  padding:12px 14px;
  background:linear-gradient(135deg,#0b1220,#0f2147);
  color:#fff;border-radius:18px;
  box-shadow:0 14px 40px rgba(11,18,32,0.14);
}
.igMonthTitle{font-size:16px;font-weight:1000;letter-spacing:0.2px;}
.igMonthCount{font-size:12px;font-weight:900;opacity:0.9;}

.igDateCard{width:100%;margin:0;background:transparent;}
.igDateHeader{
  display:flex;justify-content:space-between;align-items:flex-end;gap:10px;
  padding:12px 14px;margin-bottom:10px;
  background:linear-gradient(135deg, rgba(37,99,235,0.14), rgba(16,185,129,0.12));
  border:1px solid rgba(0,0,0,0.06);
  border-radius:18px;
  box-shadow:0 12px 34px rgba(11,18,32,0.07);
}
.igDateHeaderTitle{font-size:12px;font-weight:900;color:#475569;}
.igDateHeaderValue{font-size:18px;font-weight:1000;color:#0b1220;letter-spacing:0.2px;}
.igDateHeaderCount{font-size:12px;font-weight:900;color:#475569;}
.igDateBody{display:flex;flex-direction:column;gap:12px;}

.igCard{
  width:100%;
  background:#fff;
  border:1px solid rgba(0,0,0,0.08);
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 14px 40px rgba(11,18,32,0.08);
}
.igCardHead{padding:14px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;}
.igHeadLeft{display:flex;flex-direction:column;gap:6px;min-width:0;}
.igSrLine{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.igSrLabel{font-size:12px;color:#6b7280;font-weight:900;}
.igPill{display:inline-flex;align-items:center;justify-content:center;padding:6px 12px;border-radius:999px;background:rgba(37,99,235,0.12);color:#1d4ed8;font-weight:900;}
.igStorePill{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;background:rgba(16,185,129,0.14);color:#065f46;font-weight:900;font-size:12px;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.igDateLine{display:flex;align-items:center;gap:8px;}
.igDateDot{width:10px;height:10px;border-radius:999px;background:rgba(16,185,129,0.25);border:2px solid rgba(16,185,129,0.45);}
.igDateText{font-weight:900;color:#0b1220;font-size:13px;}
.igHeadRight{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;}

.igTableWrap{
  width:100%;
  overflow-x:auto;
  border-top:1px solid rgba(0,0,0,0.06);
  -webkit-overflow-scrolling:touch;
}
.igTbl--auto{width:100%;table-layout:auto;border-collapse:collapse;font-size:13px;min-width:860px;}
.igTbl th,.igTbl td{padding:10px 10px;border-bottom:1px solid rgba(0,0,0,0.06);vertical-align:top;}
.igTbl th{text-align:left;font-weight:900;background:#f3f4f6;color:#0b1220;white-space:nowrap;}

.col-sub{width:80px;}
.col-qty{width:150px;}
.col-store{width:200px;}
.col-bill{width:120px;}
.col-mat{min-width:200px;}
.col-use{min-width:260px;}

.igSubNo{font-weight:900;color:#0b1220;white-space:nowrap;}
.igMaterial{font-weight:800;color:#0b1220;min-width:200px;}
.igCellMain{white-space:normal;word-break:break-word;line-height:1.25;}
.igQty{white-space:nowrap;font-weight:800;}
.igQtyWrap{display:inline-flex;gap:6px;align-items:baseline;}
.igQtyNum{font-variant-numeric: tabular-nums;}
.igQtyType{font-weight:800;color:#334155;}
.igStoreCell{white-space:nowrap;font-weight:800;color:#0b1220;max-width:280px;overflow:hidden;text-overflow:ellipsis;}
.igUse{color:#111827;line-height:1.25;}
.igClamp2{
  display:-webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow:hidden;
  white-space:normal;
  word-break:break-word;
}

.igMobileActions{display:none;padding:12px;gap:10px;background:#fff;justify-content:flex-end;border-top:1px solid rgba(0,0,0,0.06);}

@media (max-width: 720px){
  .igPage{
    padding-left: var(--safe-left);
    padding-right: var(--safe-right);
  }

  .igTopbar{padding-left: calc(12px + var(--safe-left)); padding-right: calc(12px + var(--safe-right));}
  .igFilters{padding-left: calc(12px + var(--safe-left)); padding-right: calc(12px + var(--safe-right));}
  .igList{padding-left: calc(12px + var(--safe-left)); padding-right: calc(12px + var(--safe-right));}

  .igHeadRight{display:none;}
  .igMobileActions{display:flex;}

  .igField{flex:1 1 100%;}
  .igField input{width:100%;}

  .igBtn{padding:8px 10px;font-size:12px;border-radius:11px;}
  .igBtn--small{padding:6px 9px;font-size:11.5px;border-radius:10px;}
  .igBtnTiny{padding:7px 9px;font-size:12px;border-radius:11px;}
}

/* overlays */
.igOverlay{position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.45); display:flex; justify-content:center; overflow:auto; -webkit-overflow-scrolling:touch;}
.igDlgOverlay{position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.55); display:flex; justify-content:center; overflow:auto; -webkit-overflow-scrolling:touch;}
.igImgOverlay{position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.72); display:flex; justify-content:center; overflow:auto; -webkit-overflow-scrolling:touch;}

.igOverlay,.igDlgOverlay,.igImgOverlay{align-items:flex-start; padding:16px;}
@media (min-width: 769px){
  .igOverlay,.igDlgOverlay,.igImgOverlay{align-items:center; padding:16px;}
}
@media (max-width: 768px){
  .igOverlay,.igDlgOverlay,.igImgOverlay{
    align-items:center !important;
    padding:
      calc(var(--modal-pad) + var(--safe-top))
      calc(var(--modal-pad) + var(--safe-right))
      calc(var(--modal-pad) + var(--safe-bottom))
      calc(var(--modal-pad) + var(--safe-left)) !important;
  }
}

.igOverlayCard{width:100%;max-width:360px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,0.25);padding:18px;display:flex;flex-direction:column;align-items:center;gap:10px;}
.igSpinner{width:42px;height:42px;border-radius:999px;border:4px solid rgba(11,18,32,0.18);border-top-color:#0b1220;animation:igSpin 0.9s linear infinite;}
.igOverlayText{font-weight:900;color:#0b1220;font-size:16px;text-align:center;}
.igOverlaySub{font-size:12px;color:#6b7280;text-align:center;}

/* dialogs */
.igDlg{width:100%;max-width:520px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);}
.igDlgScrollable{max-height: calc(100svh - 32px);display:flex;flex-direction:column;}
@media (max-width: 768px){
  .igDlgScrollable{
    max-height: calc(100svh - (var(--modal-pad)*2) - var(--safe-top) - var(--safe-bottom));
  }
}
.igDlgTop{padding:14px 16px;}
.igDlgTop--success{background:rgba(16,185,129,0.15);}
.igDlgTop--error{background:rgba(239,68,68,0.15);}
.igDlgTop--info{background:rgba(59,130,246,0.15);}
.igDlgTitle{font-weight:900;color:#0b1220;font-size:16px;}
.igDlgBody{padding:14px 16px;}
.igDlgBodyScroll{overflow:auto;-webkit-overflow-scrolling:touch;}
.igDlgMsg{margin:0;white-space:pre-wrap;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;color:#111827;line-height:1.4;}
.igDlgActions{padding:12px 16px 16px;display:flex;justify-content:flex-end;gap:10px;background:#fff;border-top:1px solid rgba(0,0,0,0.06);}

/* viewer */
.igImgModalSafe{max-height:calc(100svh - 32px);display:flex;flex-direction:column;}
@media (max-width: 768px){
  .igImgModalSafe{
    max-height: calc(100svh - (var(--modal-pad)*2) - var(--safe-top) - var(--safe-bottom));
  }
}
.igImgModal{width:100%;max-width:900px;background:#0b1220;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.35);}
.igImgTop{display:flex;align-items:center;justify-content:space-between;padding:12px 12px;color:#fff;}
.igImgTitle{font-weight:900;font-size:14px;opacity:0.95;}
.igXBtn{border:0;background:rgba(255,255,255,0.14);color:#fff;border-radius:12px;padding:8px 12px;font-weight:900;cursor:pointer;}
.igImgBody{background:#111827;overflow:auto;}
.igImgView{width:100%;max-height:70svh;object-fit:contain;display:block;}
.igPdfFrame{width:100%;height:70svh;border:0;display:block;background:#111827;}
`;
