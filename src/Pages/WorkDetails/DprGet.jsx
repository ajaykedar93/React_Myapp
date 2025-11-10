// src/pages/DprGet.jsx
import React, { useState, useEffect } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/dpr";

function getCurrentMonthName() {
  return new Date().toLocaleString("en-US", { month: "long" });
}

export default function DprGet() {
  const [month, setMonth] = useState(getCurrentMonthName());
  const [dprs, setDprs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, type: "success", message: "" });
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "success", message: "" }), 2000);
  };

  const fetchDpr = async (m) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/month/${encodeURIComponent(m)}`);
      const data = await res.json();
      if (data.ok) setDprs(data.data || []);
      else showPopup("error", data.error || "Failed to load DPR");
    } catch (err) {
      console.error(err);
      showPopup("error", "Server error loading DPR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDpr(month);
  }, [month]);

  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${deleteRow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        showPopup("success", "Deleted successfully ✅");
        setDeleteRow(null);
        fetchDpr(month);
      } else showPopup("error", data.error || "Delete failed");
    } catch (err) {
      console.error(err);
      showPopup("error", "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setLoading(true);

    const cleanDate = editRow.work_date ? editRow.work_date.toString().slice(0, 10) : null;
    const payload = {
      details: editRow.details || "",
      work_time: editRow.work_time || "",
      work_date: cleanDate,
    };

    try {
      const res = await fetch(`${BASE_URL}/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showPopup("success", "Updated successfully ✅");
        setEditRow(null);
        fetchDpr(month);
      } else showPopup("error", data.error || "Update failed");
    } catch (err) {
      console.error(err);
      showPopup("error", "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open(`${BASE_URL}/export/${encodeURIComponent(month)}`, "_blank");
  };

  return (
    <>
      <style>{`
        :root{
          --ink:#0f172a; --muted:#6b7280;
        }
        *{ box-sizing:border-box; }
        html, body, #root{ height:100%; }
        body{
          margin:0;
          font-family: Inter, "Segoe UI", system-ui, -apple-system, Roboto, Arial, "Noto Sans", sans-serif;
          color:var(--ink);
          /* slightly smaller but responsive text */
          font-size: clamp(13px, 1.7vw, 15px);
        }
        .page-wrap{
          min-height:100vh;
          background: linear-gradient(180deg,#0f172a 0%, #312e81 25%, #1e3a8a 60%, #f59e0b 100%);
          padding: clamp(12px, 2vw, 20px);
        }
        .container{
          width:min(1100px,100%);
          margin:0 auto;
        }

        /* header */
        .header{
          background: rgba(15,23,42,.92);
          color:#fff;
          border-radius:16px;
          padding: clamp(12px,2vw,18px);
          box-shadow:0 10px 30px rgba(0,0,0,.3);
          display:grid; gap:10px;
        }
        .header-top{
          display:grid;
          grid-template-columns: 1fr auto;
          gap:10px; align-items:center;
        }
        @media (max-width:560px){
          .header-top{ grid-template-columns:1fr; }
        }
        .title{ margin:0; font-weight:800; font-size: clamp(18px,2.4vw,22px); }
        .sub{ opacity:.9; }

        /* responsive toolbar */
        .toolbar{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:8px;
        }
        .select, .btn{
          width:100%;
          min-height:38px;
          border-radius:10px;
          font-weight:700;
        }
        .select{
          background:#f3f4f6;
          border:1px solid #e5e7eb;
          padding:8px 10px;
          color:#111;
        }
        .btn{
          border:none; cursor:pointer;
          padding:9px 12px;
          transition:transform .15s ease, opacity .2s ease;
          white-space:nowrap;
        }
        .btn:active{ transform: translateY(1px) scale(.99); }
        .btn-download{
          background: linear-gradient(90deg,#f59e0b,#f97316);
          color:#fff;
        }
        .btn-download:hover{ opacity:.92; }

        /* list/cards */
        .list{ display:grid; gap:12px; margin-top:14px; }
        .card{
          background: linear-gradient(180deg,#ffffff,#f8fafc);
          border-radius:14px;
          padding: clamp(12px,2vw,16px);
          box-shadow:0 10px 25px rgba(15,23,42,.08);
          border:1px solid #e2e8f0;
        }
        .card-head{
          display:grid; grid-template-columns:1fr auto;
          gap:10px; align-items:start; margin-bottom:6px;
        }
        @media (max-width:460px){ .card-head{ grid-template-columns:1fr; } }
        .badges{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .badge{
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 8px; border-radius:999px; font-weight:800; font-size:.85em;
        }
        .badge-grey{ background:#e5e7eb; color:#111827; }
        .badge-date{ background:#dbeafe; color:#1e40af; }

        .actions{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .btn-edit{ background:#2563eb; color:#fff; border:none; border-radius:8px; padding:8px 10px; font-weight:700; }
        .btn-delete{ background:#dc2626; color:#fff; border:none; border-radius:8px; padding:8px 10px; font-weight:700; }
        .btn-edit:hover{ opacity:.95; } .btn-delete:hover{ opacity:.95; }

        /* FULL text blocks — show everything, wrap long strings, keep line breaks */
        .details{
          margin:6px 0 8px 0; font-weight:600; line-height:1.4;
          white-space: pre-wrap;         /* keep newlines from DB */
          overflow-wrap: anywhere;       /* very long words/URLs */
          word-break: break-word;        /* fallback */
        }
        .time{
          color:var(--muted);
        }
        .extra{
          margin:8px 0 0 18px;
          color:var(--muted);
        }
        .extra li{
          margin-bottom:2px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* modals / overlays */
        .overlay{
          position:fixed; inset:0; background:rgba(0,0,0,.45);
          display:flex; align-items:center; justify-content:center;
          z-index:99; backdrop-filter: blur(3px); padding:16px;
        }
        .modal{
          background:#fff; width:min(520px,100%);
          border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,.3);
          padding:16px; animation:fadeIn .25s ease;
        }
        .modal h6{ margin:0 0 8px 0; }
        .row{ display:grid; gap:8px; margin-top:8px; }
        .row > label{ font-weight:700; }
        .modal input, .modal textarea{
          width:100%; border:1px solid #e5e7eb; border-radius:10px;
          padding:10px 12px; outline:none;
        }
        .modal textarea{ min-height:110px; resize:vertical; }
        .modal .btns{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
        @media (max-width:420px){ .modal .btns{ grid-template-columns:1fr; } }

        .toast{
          background:#fff; border-radius:12px; padding:14px;
          border-top:6px solid transparent; width:min(340px,100%);
          text-align:center; box-shadow:0 12px 36px rgba(0,0,0,.25);
        }
        .toast.success{ border-top-color:#16a34a; }
        .toast.error{ border-top-color:#dc2626; }

        .loading{
          position:fixed; inset:0; background:rgba(0,0,0,.35);
          display:grid; place-items:center; z-index:90;
        }
        .spinner{
          width:58px; height:58px; border:5px solid rgba(255,255,255,.3);
          border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite;
        }

        @keyframes spin{ to{ transform: rotate(360deg);} }
        @keyframes fadeIn{ from{opacity:0; transform: translateY(-6px);} to{opacity:1; transform: translateY(0);} }
      `}</style>

      {/* Popup */}
      {popup.show && (
        <div className="overlay" role="alert" aria-live="assertive">
          <div className={`toast ${popup.type}`}>
            <h5 style={{ margin: 0 }}>{popup.type === "success" ? "✅ Success" : "⚠️ Error"}</h5>
            <p style={{ margin: "6px 0" }}>{popup.message}</p>
            <small>Closing in 2s…</small>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRow && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h6>Edit DPR</h6>
            <form onSubmit={handleUpdate}>
              <div className="row">
                <label htmlFor="dt">Date</label>
                <input
                  id="dt"
                  type="date"
                  value={editRow.work_date ? editRow.work_date.toString().slice(0, 10) : ""}
                  onChange={(e) => setEditRow({ ...editRow, work_date: e.target.value })}
                />
              </div>
              <div className="row">
                <label htmlFor="det">Details</label>
                <textarea
                  id="det"
                  value={editRow.details || ""}
                  onChange={(e) => setEditRow({ ...editRow, details: e.target.value })}
                  placeholder="Enter full details..."
                />
              </div>
              <div className="row">
                <label htmlFor="wt">Time</label>
                <input
                  id="wt"
                  value={editRow.work_time || ""}
                  onChange={(e) => setEditRow({ ...editRow, work_time: e.target.value })}
                  placeholder="e.g., 02:30 PM"
                />
              </div>
              <div className="btns">
                <button className="btn btn-download" type="submit">Save</button>
                <button type="button" className="btn select" onClick={() => setEditRow(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteRow && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h6>Delete this DPR?</h6>
            <div className="details" style={{ marginTop: 6 }}>{deleteRow.details}</div>
            <div className="btns">
              <button className="btn select" onClick={() => setDeleteRow(null)}>Cancel</button>
              <button className="btn btn-delete" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading" aria-busy="true" aria-live="polite">
          <div className="spinner" />
        </div>
      )}

      {/* Page */}
      <div className="page-wrap">
        <div className="container">
          <div className="header">
            <div className="header-top">
              <div>
                <h5 className="title">📋 DPR Records – {month}</h5>
                <div className="sub">Manage, update, or download monthly DPR details</div>
              </div>
            </div>
            <div className="toolbar">
              <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
                {[
                  "January","February","March","April","May","June",
                  "July","August","September","October","November","December",
                ].map((m) => (<option key={m}>{m}</option>))}
              </select>
              <button className="btn btn-download" onClick={handleDownload}>⬇ Download PDF</button>
              <button className="btn select" onClick={() => fetchDpr(month)}>↻ Refresh</button>
            </div>
          </div>

          {(!loading && dprs.length === 0) ? (
            <p style={{ color: "#fff", textAlign: "center", margin: "18px 0", fontWeight: 700 }}>
              No DPR entries found for {month}.
            </p>
          ) : (
            <div className="list">
              {dprs.map((dpr, i) => (
                <article key={dpr.id} className="card" aria-label={`DPR #${i + 1}`}>
                  <div className="card-head">
                    <div className="badges">
                      <span className="badge badge-grey">#{i + 1}</span>
                      <span className="badge badge-date">
                        {dpr.work_date ? dpr.work_date.toString().slice(0, 10) : "-"}
                      </span>
                      {dpr.category_name && (
                        <span className="badge badge-grey">{dpr.category_name}</span>
                      )}
                    </div>
                    <div className="actions">
                      <button className="btn-edit" onClick={() => setEditRow(dpr)}>✏ Edit</button>
                      <button className="btn-delete" onClick={() => setDeleteRow(dpr)}>🗑 Delete</button>
                    </div>
                  </div>

                  {/* FULL details shown, wrapped and respecting line breaks */}
                  <div className="details">{dpr.details || "-"}</div>

                  <div className="time">⏰ Time: <b>{dpr.work_time || "-"}</b></div>

                  {Array.isArray(dpr.extra_details) && dpr.extra_details.length > 0 && (
                    <ul className="extra">
                      {dpr.extra_details.map((extra, idx) => (
                        <li key={idx}>
                          {extra}
                          {dpr.extra_times?.[idx] ? ` (${dpr.extra_times[idx]})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
