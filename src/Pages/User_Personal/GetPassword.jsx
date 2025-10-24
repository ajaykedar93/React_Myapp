// src/pages/GetPassword.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Swal from "sweetalert2";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/password-manager";
const TYPES = ["", "app", "website", "email", "mobile", "screen", "cloud", "document", "private_lock", "other"];
const TYPE_COLORS = {
  app: "bg-success-subtle text-success-emphasis",
  website: "bg-warning-subtle text-warning-emphasis",
  email: "bg-warning-subtle text-warning-emphasis",
  mobile: "bg-danger-subtle text-danger-emphasis",
  screen: "bg-success-subtle text-success-emphasis",
  cloud: "bg-secondary-subtle text-secondary-emphasis",
  document: "bg-warning-subtle text-warning-emphasis",
  private_lock: "bg-secondary-subtle text-secondary-emphasis",
  other: "bg-success-subtle text-success-emphasis",
};

export default function GetPassword() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingTable, setLoadingTable] = useState(true);
  const [overlayMsg, setOverlayMsg] = useState({ show:false, type:"", text:"" });
  const [showPwRow, setShowPwRow] = useState({});
  const [editItem, setEditItem] = useState(null);

  // NEW: pagination (10 per page)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const toastTimerRef = useRef(null);
  const abortRef = useRef(null);

  const showCenterMsg = (kind, text, ms=1500) => {
    setOverlayMsg({ show:true, type:kind, text });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=> setOverlayMsg({ show:false, type:"", text:""}), ms);
  };

  // styles once (animations + polish)
  useEffect(() => {
    const id = "pm-style";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .glass { backdrop-filter:blur(10px); background:rgba(255,255,255,.9); border:1px solid rgba(15,23,42,.10); box-shadow:0 12px 32px rgba(0,0,0,.07); border-radius:16px; }

      /* Buttons */
      .btn-soft { background:rgba(2, 132, 199, .08); border:1px solid rgba(2,132,199,.18); }
      .btn-soft:hover { background:rgba(2, 132, 199, .12); }
      .btn-ripple { position:relative; overflow:hidden; }
      .btn-ripple::after {
        content:""; position:absolute; inset:auto; width:0; height:0; border-radius:999px; opacity:.25; background:currentColor; transform:translate(-50%, -50%);
        pointer-events:none; transition:width .4s ease, height .4s ease, opacity .6s ease;
      }
      .btn-ripple:active::after { width:220px; height:220px; opacity:.18; }

      /* Modal */
      .edit-modal { position:fixed; inset:0; z-index:2200; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; overflow-y:auto; padding:24px; animation:fadeIn .2s ease both; }
      .edit-card { background:#fff; border-radius:18px; box-shadow:0 20px 50px rgba(0,0,0,.25); padding:24px; width:96%; max-width:640px; position:relative; animation:scaleIn .18s ease both; max-height:90vh; display:flex; flex-direction:column; }
      .edit-card-body { overflow-y:auto; flex:1; padding-right:4px; }
      .edit-footer { position:sticky; bottom:0; background:#fff; padding-top:12px; padding-bottom:4px; text-align:right; border-top:1px solid rgba(0,0,0,.1); }
      .edit-card h5 { text-align:center; font-weight:700; margin-bottom:1rem; background:linear-gradient(90deg,#06b6d4,#22c55e,#a78bfa); -webkit-background-clip:text; color:transparent; }

      /* Overlay toast */
      .overlay-backdrop { position:fixed; inset:0; z-index:2000; display:grid; place-items:center; background:rgba(255,255,255,.72); backdrop-filter:blur(2px); }
      .overlay-card { background:#fff; border-radius:16px; padding:18px; text-align:center; box-shadow:0 12px 32px rgba(0,0,0,.08); }

      /* Table polish */
      .table thead th { position:sticky; top:0; background:#f8fafc; z-index:1; }
      .pw-dots { letter-spacing:2px; font-size:1.05rem; }
      .row-appear { animation:slideFadeIn .22s ease both; }
      .table-hover tbody tr:hover { transform:translateY(-1px); transition:transform .15s ease, box-shadow .15s ease; box-shadow:0 2px 12px rgba(0,0,0,.04); }

      /* --- Action button sizing --- */
      /* Default (desktop/tablet): keep normal Bootstrap size */
      /* Large screens: make ONLY action buttons bigger and easier to click */
      @media (min-width: 992px) {
        .btn-action {
          padding: .55rem .9rem;
          font-size: .95rem;
          line-height: 1.2;
          border-radius: .5rem;
        }
      }

      /* --- Mobile tweaks (≤576px) --- */
      @media (max-width: 576px) {
        .container-xxl { padding-left: 10px !important; padding-right: 10px !important; }
        .glass { border-radius: 12px; }
        .table thead { display:none; }
        .table tbody tr { display:block; border-bottom:1px solid rgba(0,0,0,.06); padding:0.5rem 0.25rem; }
        .table tbody td { display:flex; justify-content:space-between; padding:.35rem .5rem; gap:10px; }
        .td-label { font-weight:600; color:#6b7280; margin-right:.75rem; }
        .text-end { text-align:right !important; }
        /* Only action buttons become compact on mobile */
        .btn-action { 
          padding: .25rem .5rem; 
          font-size: .75rem; 
          line-height: 1.2; 
          border-radius: .3rem; 
        }
        /* tighten selects and inputs on bar & modal */
        .form-control, .form-select { 
          min-height: 36px; 
          padding: 6px 10px; 
          font-size: .9rem; 
        }
        .btn-close { transform: scale(.9); }
      }

      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes scaleIn { from { transform:scale(.96); opacity:0 } to { transform:scale(1); opacity:1 } }
      @keyframes slideFadeIn { from { transform:translateY(6px); opacity:0 } to { transform:translateY(0); opacity:1 } }
    `;
    document.head.appendChild(s);
  }, []);

  // lock scroll when overlay open (ONLY for busy/toast; NOT for edit modal)
  useEffect(()=> {
    const hasOverlay = busy || overlayMsg.show;
    document.body.style.overflow = hasOverlay ? "hidden" : "";
    return ()=> { document.body.style.overflow = ""; }
  }, [busy, overlayMsg.show, editItem]);

  // fetch
  const fetchList = async (signal) => {
    setLoadingTable(true);
    try {
      let url = BASE_URL;
      const qs = [];
      if (type) qs.push(`type=${encodeURIComponent(type)}`);
      if (qs.length) url += `?${qs.join("&")}`;

      const res = await fetch(url, { signal });
      const json = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to fetch");
      let data = Array.isArray(json.data) ? json.data : [];
      if (q.trim()) {
        const qq = q.trim().toLowerCase();
        data = data.filter(it =>
          (it.name||"").toLowerCase().includes(qq) ||
          (it.username||"").toLowerCase().includes(qq) ||
          (it.additional_info ? JSON.stringify(it.additional_info).toLowerCase().includes(qq) : false)
        );
      }
      setItems(data);
    } catch(e) {
      if (e.name !== "AbortError") showCenterMsg("error", e.message);
    } finally { setLoadingTable(false); }
  };

  // refetch on filter/search
  useEffect(()=> {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const t = setTimeout(()=> fetchList(ctl.signal), 150);
    setPage(1);
    return ()=> { clearTimeout(t); ctl.abort(); };
  }, [type, q]);

  // CRUD helpers
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      showCenterMsg("success","Copied!");
    } catch {
      showCenterMsg("error","Copy failed");
    }
  };

  const deleteRecord = async (id) => {
    const row = items.find(x=>x.id===id);
    const name = row?.name || "this entry";
    const res = await Swal.fire({
      title:"Delete Entry?",
      html:`<div style="font-size:1rem">Are you sure you want to remove <b>${name}</b>?</div>`,
      icon:"warning", showCancelButton:true,
      confirmButtonText:"Yes, delete", cancelButtonText:"Cancel",
      confirmButtonColor:"#06b6d4", cancelButtonColor:"#ef4444",
      background:"#fff", color:"#111827"
    });
    if(!res.isConfirmed) return;

    setBusy(true);
    try {
      const r = await fetch(`${BASE_URL}/${id}`, { method:"DELETE" });
      if(!r.ok) throw new Error("Delete failed");
      setItems(prev=>prev.filter(x=>x.id!==id));
      showCenterMsg("success","Deleted");
    } catch(e){ showCenterMsg("error",e.message); }
    finally{ setBusy(false); }
  };

  const handleUpdate = async ()=> {
    if(!editItem) return;
    if(!String(editItem.name||"").trim()){ showCenterMsg("error","Name required"); return; }
    if(!String(editItem.password||"").trim()){ showCenterMsg("error","Password required"); return; }

    setBusy(true);
    try {
      const res = await fetch(`${BASE_URL}/${editItem.id}`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(editItem)
      });
      const j = await res.json().catch(()=>{});
      if(!res.ok) throw new Error(j?.message || "Update failed");
      setItems(prev=>prev.map(x=>x.id===editItem.id ? editItem : x));
      showCenterMsg("success","Updated");
      setEditItem(null);
    } catch(e){ showCenterMsg("error",e.message); }
    finally{ setBusy(false); }
  };

  const activeCount = useMemo(()=> items.length, [items]);

  // pagination derived
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));
  const pageItems = useMemo(()=>{
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  // Render helpers
  const renderAI = (ai)=> {
    if (!ai) return "-";
    if (typeof ai === "string") return ai;
    try { return JSON.stringify(ai); } catch { return String(ai); }
  };

  // mobile cell helper
  const TD = ({label, children, className}) => (
    <td className={className}>
      <span className="td-label d-sm-none">{label}</span>
      <span>{children}</span>
    </td>
  );

  return (
    <div className="container-xxl py-4" style={{ background:"linear-gradient(180deg,#fff,#f7fbff)", minHeight:"100vh", color:"#0b1221" }}>
      {/* Header */}
      <div className="glass p-3 p-md-4 mb-3 d-flex justify-content-between align-items-center flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(180deg,#06b6d4,#22c55e)",display:"grid",placeItems:"center",color:"#05212a",fontWeight:800}}>PW</div>
          <div>
            <h4 className="m-0" style={{background:"linear-gradient(90deg,#06b6d4,#22c55e,#a78bfa)",WebkitBackgroundClip:"text",color:"transparent"}}>Saved Passwords</h4>
            <div className="text-muted small">Search, edit, copy, and manage securely</div>
          </div>
        </div>
        <div className="text-end mt-2 mt-md-0">
          <div className="text-muted small">Total</div>
          <div className="fw-bold">{activeCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass p-2 p-md-3 mb-3 d-flex flex-wrap align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">Type</span>
          <select className="form-select" style={{width:220}} value={type} onChange={e=>setType(e.target.value)}>
            {TYPES.map(t=><option key={t||"all"} value={t}>{t||"All"}</option>)}
          </select>
        </div>
        <div className="ms-auto" style={{minWidth:240}}>
          <input
            className="form-control"
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search by name or notes"
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="glass p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover m-0 align-middle">
            <thead>
              <tr>
                <th style={{width:56}}>#</th>
                <th style={{minWidth:110}}>Type</th>
                <th style={{minWidth:160}}>Name</th>
                <th className="d-none d-sm-table-cell" style={{minWidth:160}}>Username</th>
                <th style={{minWidth:220}}>Password</th>
                <th className="d-none d-lg-table-cell" style={{minWidth:220}}>Notes</th>
                <th className="text-end" style={{width:210}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr><td colSpan="7" className="text-center py-5"><LoadingSpiner/></td></tr>
              ) : pageItems.length===0 ? (
                <tr><td colSpan="7" className="text-center py-5 text-muted">No data found</td></tr>
              ) : (
                pageItems.map((r, idx) => {
                  const i = (page - 1) * PAGE_SIZE + idx;
                  const visible = !!showPwRow[r.id];
                  const dots = "•".repeat(Math.min(r.password?.length || 3, 12));
                  return (
                    <tr key={r.id} className="row-appear">
                      <TD label="#" >{i+1}</TD>
                      <TD label="Type">
                        <span className={`badge ${TYPE_COLORS[r.type]||"bg-secondary-subtle"}`}>{r.type||"other"}</span>
                      </TD>
                      <TD label="Name">{r.name}</TD>
                      <TD label="Username" className="d-none d-sm-table-cell">
                        <span className="font-monospace">{r.username || "-"}</span>
                        {r.username && (
                          <button
                            className="btn btn-outline-secondary ms-2 btn-ripple btn-action"
                            onClick={()=>copyToClipboard(r.username)}
                            title="Copy username"
                          >
                            Copy
                          </button>
                        )}
                      </TD>
                      <TD label="Password">
                        <span className="font-monospace">{visible ? (r.password || "-") : <span className="pw-dots">{dots}</span>}</span>
                        {r.password && (
                          <>
                            <button
                              className="btn btn-soft ms-2 btn-ripple btn-action"
                              onClick={()=>setShowPwRow(s=>({...s,[r.id]:!visible}))}
                              title={visible ? "Hide password" : "Show password"}
                            >
                              {visible ? "Hide" : "Show"}
                            </button>
                            <button
                              className="btn btn-outline-secondary ms-2 btn-ripple btn-action"
                              onClick={()=>copyToClipboard(r.password)}
                              title="Copy password"
                            >
                              Copy
                            </button>
                          </>
                        )}
                      </TD>
                      <TD label="Notes" className="d-none d-lg-table-cell">{renderAI(r.additional_info)}</TD>
                      <TD label="Actions" className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                          {r.username && (
                            <button
                              className="btn btn-outline-secondary btn-ripple btn-action"
                              onClick={()=>copyToClipboard(`${r.username}`)}
                              title="Copy username"
                            >
                              Copy U
                            </button>
                          )}
                          {r.password && (
                            <button
                              className="btn btn-outline-secondary btn-ripple btn-action"
                              onClick={()=>copyToClipboard(`${r.password}`)}
                              title="Copy password"
                            >
                              Copy P
                            </button>
                          )}
                          <button className="btn btn-outline-primary btn-ripple btn-action" onClick={()=>setEditItem({...r})}>
                            Edit
                          </button>
                          <button className="btn btn-outline-danger btn-ripple btn-action" onClick={()=>deleteRecord(r.id)}>
                            Delete
                          </button>
                        </div>
                      </TD>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (kept standard sizes) */}
        {!loadingTable && activeCount > 0 && (
          <div className="d-flex align-items-center justify-content-between p-3">
            <div className="text-muted small">
              Showing <b>{(page-1)*PAGE_SIZE + 1}</b>–<b>{Math.min(page*PAGE_SIZE, activeCount)}</b> of <b>{activeCount}</b>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm btn-ripple"
                disabled={page <= 1}
                onClick={()=>setPage(p=>Math.max(1, p-1))}
              >
                ‹ Prev
              </button>
              <span className="btn btn-light btn-sm disabled">{page} / {totalPages}</span>
              <button
                className="btn btn-outline-secondary btn-sm btn-ripple"
                disabled={page >= totalPages}
                onClick={()=>setPage(p=>Math.min(totalPages, p+1))}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="edit-modal" onClick={e=>e.target.classList.contains("edit-modal") && setEditItem(null)}>
          <div className="edit-card">
            <button className="btn-close position-absolute top-0 end-0 m-3" onClick={()=>setEditItem(null)}></button>
            <h5>Edit Password</h5>
            <div className="edit-card-body">
              <div className="mb-3">
                <label className="form-label">Type</label>
                <select className="form-select" value={editItem.type||""} onChange={e=>setEditItem({...editItem,type:e.target.value})}>
                  {TYPES.map(t=><option key={t||"sel"} value={t}>{t||"Select type"}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input className="form-control" value={editItem.name||""} onChange={e=>setEditItem({...editItem,name:e.target.value})}/>
              </div>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input className="form-control" value={editItem.username||""} onChange={e=>setEditItem({...editItem,username:e.target.value})}/>
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input className="form-control" value={editItem.password||""} onChange={e=>setEditItem({...editItem,password:e.target.value})}/>
              </div>
              <div className="mb-3">
                <label className="form-label">Additional Info</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={typeof editItem.additional_info === "string" ? editItem.additional_info : (editItem.additional_info ? JSON.stringify(editItem.additional_info) : "")}
                  onChange={e=>setEditItem({...editItem,additional_info:e.target.value})}
                ></textarea>
              </div>
            </div>
            <div className="edit-footer">
              <button className="btn btn-light me-2 btn-ripple btn-action" onClick={()=>setEditItem(null)}>Cancel</button>
              <button className="btn btn-success px-4 btn-ripple btn-action" onClick={handleUpdate}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="overlay-backdrop">
          <div className="overlay-card d-flex flex-column align-items-center">
            <LoadingSpiner/>
            <div className="text-muted mt-2">Working…</div>
          </div>
        </div>
      )}

      {/* Center toast */}
      {overlayMsg.show && (
        <div className="overlay-backdrop" style={{background:"transparent", pointerEvents:"none"}}>
          <div
            className="overlay-card"
            style={{
              pointerEvents:"auto",
              borderLeft: overlayMsg.type === "error" ? "6px solid #ef4444" : "6px solid #22c55e",
              minWidth: 220
            }}
          >
            {overlayMsg.text}
          </div>
        </div>
      )}
    </div>
  );
}
