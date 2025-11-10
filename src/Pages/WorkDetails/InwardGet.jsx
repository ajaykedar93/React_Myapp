// src/pages/InwardGet.jsx
import React, { useEffect, useState } from "react";

const API_BASE = "https://express-backend-myapp.onrender.com/api";
const PAGE_SIZE = 10;

function getCurrentMonthName() {
  return new Date().toLocaleString("en-US", { month: "long" });
}

export default function InwardGet() {
  const [month, setMonth] = useState(getCurrentMonthName());
  const [inwards, setInwards] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, type: "success", message: "" });
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "success", message: "" }), 2000);
  };

  const fetchInward = async (m, currentPage = 0) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inward?month=${encodeURIComponent(m)}`);
      const data = await res.json();
      if (data.data) {
        const list = data.data;
        const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
        let newPage = currentPage;
        if (newPage >= totalPages) newPage = totalPages - 1;
        setInwards(list);
        setPage(newPage);
      } else {
        showPopup("error", data.error || "Failed to load records");
      }
    } catch (err) {
      console.error(err);
      showPopup("error", "Server error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInward(month, 0);
  }, [month]);

  const handleDownload = () => {
    window.open(`${API_BASE}/inward/export?month=${encodeURIComponent(month)}`, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      const res = await fetch(`${API_BASE}/inward/${deleteRow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showPopup("success", "Deleted successfully ✅");
        setDeleteRow(null);
        fetchInward(month, page);
      } else {
        showPopup("error", data.error || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      showPopup("error", "Delete failed");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editRow) return;

    const payload = {
      work_date: editRow.work_date ? editRow.work_date.toString().slice(0, 10) : null,
      work_time: editRow.work_time || null,
      details: editRow.details || "",
      quantity:
        editRow.quantity === "" || editRow.quantity == null
          ? null
          : Number(editRow.quantity),
      quantity_type: editRow.quantity_type || null,
    };

    try {
      const res = await fetch(`${API_BASE}/inward/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        showPopup("success", "Updated successfully ✅");
        setEditRow(null);
        fetchInward(month, page);
      } else {
        showPopup("error", data.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      showPopup("error", "Update failed");
    }
  };

  const totalPages = Math.ceil(inwards.length / PAGE_SIZE) || 1;
  const paged = inwards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <style>{`
        :root{
          --bg: #fffaf5;
          --grad1: #ff8a00;
          --grad2: #ff5f6d;
          --grad3: #ff758c;
          --grad4: #fbc2eb;
          --cardBg: #ffffff;
          --ink: #111827;
          --muted: #6b7280;
          --ring: rgba(255, 99, 71, 0.25);
        }
        * { box-sizing: border-box; }
        html, body, #root { height: 100%; }
        body {
          margin: 0;
          background: var(--bg);
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Poppins", sans-serif;
          color: var(--ink);
          font-size: clamp(14px, 1.9vw, 16px);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .page-wrap {
          min-height: 100vh;
          background: linear-gradient(180deg, var(--grad1) 0%, var(--grad2) 45%, var(--grad3) 70%, var(--grad4) 100%);
          padding: clamp(12px, 2vw, 20px);
        }
        .container {
          width: min(1100px, 100%);
          margin: 0 auto;
        }

        /* HEADER */
        .header-card {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 16px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 8px 24px rgba(255, 94, 98, 0.25);
          padding: clamp(12px, 2vw, 18px);
          color: #fff;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .header-row{
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
        }
        @media (max-width: 560px){
          .header-row{
            grid-template-columns: 1fr;
          }
        }
        .header-title {
          margin: 0;
          font-weight: 700;
          font-size: clamp(18px, 2.6vw, 22px);
        }
        .header-sub { opacity: .9; font-size: .95em; }

        /* FLEXIBLE TOOLBAR (auto-fit into columns, stretch on mobile) */
        .toolbar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 8px;
          width: 100%;
        }
        .select, .btn {
          width: 100%;
        }

        .select {
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.92);
          color: #111;
          font-weight: 600;
          padding: 10px 12px;
          min-height: 40px;
          outline: none;
        }
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
          min-height: 40px;
          white-space: nowrap;
        }
        .btn:active { transform: translateY(1px) scale(.99); }
        .btn-primary {
          background: linear-gradient(90deg, #ff8a00, #ff3d7f);
          color: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,.15);
        }
        .btn-outline-light{
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255,255,255,.8);
        }
        .btn-danger { background: #dc2626; color: #fff; }
        .btn-warning { background: #f59e0b; color: #111; }
        .btn-sm{ padding: 8px 10px; border-radius: 8px; font-size: .9em; min-height: 36px; }

        /* tighten on very small screens */
        @media (max-width: 380px){
          .btn, .select { padding: 8px 10px; min-height: 38px; }
        }

        /* record list */
        .list {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }
        .card {
          background: var(--cardBg);
          border-radius: 14px;
          padding: clamp(12px, 2vw, 16px);
          box-shadow: 0 6px 20px rgba(0,0,0,.08);
          transition: box-shadow .2s ease, transform .2s ease;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,.10); }

        /* card header */
        .card-top{
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: start;
          margin-bottom: 6px;
        }
        @media (max-width: 460px){
          .card-top{
            grid-template-columns: 1fr;
          }
          .actions{ justify-content: flex-start; }
        }
        .idbar{
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 999px; padding: 6px 10px; font-weight: 700; font-size: .85em;
        }
        .pill-red{ background: #fee2e2; color: #991b1b; }
        .pill-amber{ background: #fff7ed; color: #9a3412; }

        .actions{
          display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;
        }

        /* details block — keep multi-line text */
        .details{
          margin: 6px 0 8px 0;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.4;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .meta{
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px;
          color: var(--muted);
          font-size: .95em;
        }
        @media (max-width: 820px){
          .meta{ grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 480px){
          .meta{ grid-template-columns: 1fr; }
        }
        .meta .kv{
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 10px;
        }
        .kv b{ color: #0f172a; }

        /* pagination */
        .pager{
          display: flex; justify-content: space-between; align-items: center;
          color: #fff; margin-top: 14px; gap: 10px; flex-wrap: wrap;
        }
        .pager small { font-weight: 600; }
        .pager .group{ display: flex; gap: 8px; flex-wrap: wrap; }

        /* overlay / popup */
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 16px;
        }
        .modal {
          background: #fff; border-radius: 16px; width: min(520px, 100%);
          box-shadow: 0 16px 48px rgba(0,0,0,.25); padding: 16px;
          animation: fadeIn .2s ease;
        }
        .modal h6{ margin: 0 0 8px 0; font-size: 1.05em; }
        .modal .row{ display: grid; gap: 8px; margin-top: 8px; }
        .modal .row > label{ font-weight: 600; font-size: .95em; }
        .modal input, .modal textarea{
          width: 100%; padding: 10px 12px; border-radius: 10px;
          border: 1px solid #e5e7eb; outline: none;
        }
        .modal textarea{ min-height: 110px; resize: vertical; }
        .modal .btns{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
        @media (max-width: 420px){
          .modal .btns{ grid-template-columns: 1fr; }
        }

        .toast {
          background: #fff; border-radius: 12px;
          border-top: 6px solid transparent;
          padding: 14px; width: min(340px, 100%); text-align: center;
          box-shadow: 0 12px 36px rgba(0,0,0,.25);
        }
        .toast.success{ border-top-color: #22c55e; }
        .toast.error{ border-top-color: #ef4444; }
        .toast small{ color: #6b7280; }

        .loader {
          position: fixed; inset: 0; display: grid; place-items: center;
          background: rgba(0,0,0,.25); z-index: 40;
        }
        .spinner{
          width: 54px; height: 54px; border: 5px solid rgba(255,255,255,.35);
          border-top-color: #fff; border-radius: 999px; animation: spin .7s linear infinite;
        }
        @keyframes spin{ to{ transform: rotate(360deg);} }
        @keyframes fadeIn{ from{opacity:0; transform: scale(.96);} to{opacity:1; transform: scale(1);} }
      `}</style>

      {/* Global popup */}
      {popup.show && (
        <div className="overlay" role="alert" aria-live="assertive">
          <div className={`toast ${popup.type}`}>
            <h5 style={{ margin: 0 }}>
              {popup.type === "success" ? "✅ Success" : "⚠️ Error"}
            </h5>
            <p style={{ margin: "6px 0" }}>{popup.message}</p>
            <small>Closing in 2s…</small>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRow && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h6>Edit Inward Record</h6>
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
              <div className="row" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label htmlFor="qty">Quantity</label>
                  <input
                    id="qty"
                    type="number"
                    value={editRow.quantity ?? ""}
                    onChange={(e) => setEditRow({ ...editRow, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="qt">Quantity Type</label>
                  <input
                    id="qt"
                    value={editRow.quantity_type || ""}
                    onChange={(e) => setEditRow({ ...editRow, quantity_type: e.target.value })}
                    placeholder="e.g., kg, pcs"
                  />
                </div>
              </div>
              <div className="row">
                <label htmlFor="wt">Work Time</label>
                <input
                  id="wt"
                  value={editRow.work_time || ""}
                  onChange={(e) => setEditRow({ ...editRow, work_time: e.target.value })}
                  placeholder="e.g., 02:30 PM"
                />
              </div>
              <div className="btns">
                <button className="btn btn-primary" type="submit">Save</button>
                <button type="button" className="btn btn-outline-light" onClick={() => setEditRow(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteRow && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h6>🗑️ Delete this record?</h6>
            <div className="details" style={{ marginTop: 6 }}>{deleteRow.details}</div>
            <div className="btns">
              <button className="btn btn-outline-light" onClick={() => setDeleteRow(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* loading overlay */}
      {loading && (
        <div className="loader" aria-busy="true" aria-live="polite">
          <div className="spinner" />
        </div>
      )}

      {/* Main Page */}
      <div className="page-wrap">
        <div className="container">
          <div className="header-card">
            <div className="header-row">
              <div>
                <h5 className="header-title">🧾 Inward Records – {month}</h5>
                <div className="header-sub">Manage inward entries: view, edit, delete, or download</div>
              </div>
            </div>

            {/* FLEX toolbar (buttons scale on small screens) */}
            <div className="toolbar">
              <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
                {[
                  "January","February","March","April","May","June",
                  "July","August","September","October","November","December",
                ].map((m) => (<option key={m}>{m}</option>))}
              </select>
              <button className="btn btn-primary" onClick={handleDownload}>⬇️ Download PDF</button>
              <button className="btn btn-outline-light" onClick={() => fetchInward(month, page)}>↻ Refresh</button>
            </div>
          </div>

          {(!loading && inwards.length === 0) ? (
            <p style={{ color: "#fff", textAlign: "center", margin: "18px 0", fontWeight: 600 }}>
              No inward records found for {month}.
            </p>
          ) : (
            <>
              <div className="list">
                {paged.map((rec) => (
                  <article key={rec.id} className="card" aria-label={`Inward #${rec.seq_no || rec.id}`}>
                    <div className="card-top">
                      <div className="idbar">
                        <span className="pill pill-red">#{rec.seq_no ?? rec.id}</span>
                        <span className="pill pill-amber">
                          {rec.work_date ? new Date(rec.work_date).toLocaleDateString() : "-"}
                        </span>
                      </div>
                      <div className="actions">
                        <button className="btn btn-sm btn-warning" onClick={() => setEditRow(rec)}>✏️ Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteRow(rec)}>🗑️ Delete</button>
                      </div>
                    </div>

                    <div className="details">{rec.details || "-"}</div>

                    <div className="meta">
                      <div className="kv">Qty:&nbsp;<b>{rec.quantity ?? "-"}</b></div>
                      <div className="kv">Type:&nbsp;<b>{rec.quantity_type || "-"}</b></div>
                      <div className="kv">Work Time:&nbsp;<b>{rec.work_time || "-"}</b></div>
                      <div className="kv">ID:&nbsp;<b>{rec.id}</b></div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              <div className="pager">
                <small>Page {page + 1} of {totalPages}</small>
                <div className="group">
                  <button
                    className="btn btn-outline-light btn-sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← Prev
                  </button>
                  <button
                    className="btn btn-outline-light btn-sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
