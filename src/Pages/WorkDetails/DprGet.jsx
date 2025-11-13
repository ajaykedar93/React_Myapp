// src/pages/DprGet.jsx
import React, { useState, useEffect, useMemo } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/dpr";

function getCurrentMonthName() {
  return new Date().toLocaleString("en-US", { month: "long" });
}

function ymd(dateLike) {
  if (!dateLike) return "";
  try {
    if (typeof dateLike === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateLike)) {
      return dateLike.slice(0, 10);
    }
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  } catch {
    return "";
  }
}

async function parseMaybeJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export default function DprGet() {
  const [month, setMonth] = useState(getCurrentMonthName());
  const [dprs, setDprs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // PAGINATION
  const PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const showPopup = (type, message, ms = 2000) => {
    setPopup({ show: true, type, message });
    window.clearTimeout(showPopup._t);
    showPopup._t = window.setTimeout(
      () => setPopup({ show: false, type: "success", message: "" }),
      ms
    );
  };

  const fetchDpr = async (m) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/month/${encodeURIComponent(m)}`);
      const data = await parseMaybeJson(res);
      if (!res.ok) {
        const msg = data?.error || data?.message || "Failed to load DPR";
        throw new Error(`${res.status}: ${msg}`);
      }
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setDprs(list);
    } catch (err) {
      console.error(err);
      showPopup("error", "Server error loading DPR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // when month changes, go to first page
    setCurrentPage(1);
    fetchDpr(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Clamp currentPage if total records shrink (e.g., after delete)
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(dprs.length / PER_PAGE) || 1);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [dprs.length, currentPage]);

  const confirmDelete = (row) =>
    setDeleteRow({ id: row.id, details: row.details });

  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        showPopup("success", "Deleted successfully ✅");
        setDeleteRow(null);
        await fetchDpr(month);
        return;
      }
      const data = await parseMaybeJson(res);
      if (!res.ok || data?.ok === false) {
        const msg = data?.error || data?.message || "Delete failed";
        throw new Error(`${res.status}: ${msg}`);
      }
      showPopup("success", "Deleted successfully ✅");
      setDeleteRow(null);
      await fetchDpr(month);
    } catch (err) {
      console.error(err);
      showPopup("error", "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (row) => {
    setEditRow({
      id: row.id,
      work_date: ymd(row.work_date),
      details: row.details || "",
      work_time: row.work_time || "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setLoading(true);

    const payload = {
      details: editRow.details || "",
      work_time: editRow.work_time || "",
      work_date: editRow.work_date ? ymd(editRow.work_date) : null,
    };

    try {
      const res = await fetch(`${BASE_URL}/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseMaybeJson(res);
      if (!res.ok || data?.ok === false) {
        const msg = data?.error || data?.message || "Update failed";
        throw new Error(`${res.status}: ${msg}`);
      }
      showPopup("success", "Updated successfully ✅");
      setEditRow(null);
      await fetchDpr(month);
    } catch (err) {
      console.error(err);
      showPopup("error", "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open(
      `${BASE_URL}/export/${encodeURIComponent(month)}`,
      "_blank"
    );
  };

  const handleGoDashboard = () => {
    // change path if your dashboard route is different
    window.location.href = "/dashboard";
  };

  const MONTHS = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    []
  );

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(dprs.length / PER_PAGE) || 1);
  const startIndex = (currentPage - 1) * PER_PAGE;
  const pageItems = dprs.slice(startIndex, startIndex + PER_PAGE);

  return (
    <>
      <style>{`
        :root{ --ink:#0f172a; --muted:#6b7280; }
        *{ box-sizing:border-box; }
        html, body, #root{ height:100%; }
        body{
          margin:0;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", sans-serif;
          color:var(--ink);
          font-size: clamp(13px, 1.7vw, 15px);
        }
        .page-wrap{
          min-height:100vh;
          background: linear-gradient(180deg,#0f172a 0%, #312e81 25%, #1e3a8a 60%, #f59e0b 100%);
          padding: clamp(12px, 2vw, 20px);
          padding-bottom: 48px; /* space so Next button is never hidden */
        }
        .container{ width:min(1100px,100%); margin:0 auto; }

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
          .header-right .dashboard-btn{ display:none; } /* keep mobile view same */
        }
        .title{ margin:0; font-weight:800; font-size: clamp(18px,2.4vw,22px); }
        .sub{ opacity:.9; }

        .header-right{
          display:flex;
          justify-content:flex-end;
        }
        .dashboard-btn{
          min-height:32px;
          padding:6px 14px;
          border-radius:999px;
          border:none;
          font-weight:700;
          cursor:pointer;
          background:linear-gradient(90deg,#22c55e,#16a34a);
          color:#fff;
          box-shadow:0 6px 16px rgba(0,0,0,.35);
          white-space:nowrap;
        }
        .dashboard-btn:active{
          transform:translateY(1px) scale(.98);
        }

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
        .btn-download{ background: linear-gradient(90deg,#f59e0b,#f97316); color:#fff; }
        .btn-download:hover{ opacity:.92; }

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

        .details{
          margin:6px 0 8px 0; font-weight:600; line-height:1.4;
          white-space: pre-wrap; overflow-wrap:anywhere; word-break:break-word;
        }
        .time{ color:var(--muted); }
        .extra{ margin:8px 0 0 18px; color:var(--muted); }
        .extra li{ margin-bottom:2px; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; }

        /* overlays */
        .overlay{
          position:fixed; inset:0; background:rgba(0,0,0,.45);
          display:flex; align-items:center; justify-content:center;
          z-index: 9999; backdrop-filter: blur(3px); padding:16px;
        }
        /* renamed from .modal to avoid Bootstrap collisions */
        .dialog{
          background:#fff; width:min(520px,100%);
          border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,.3);
          padding:16px; animation:fadeIn .25s ease;
        }
        .dialog h6{ margin:0 0 8px 0; }
        .field{ display:grid; gap:8px; margin-top:8px; }
        .field > label{ font-weight:700; }
        .dialog input, .dialog textarea{
          width:100%; border:1px solid #e5e7eb; border-radius:10px;
          padding:10px 12px; outline:none;
        }
        .dialog textarea{ min-height:110px; resize:vertical; }
        .dialog .btns{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
        @media (max-width:420px){ .dialog .btns{ grid-template-columns:1fr; } }

        .toast{
          background:#fff; border-radius:12px; padding:14px;
          border-top:6px solid transparent; width:min(340px,100%);
          text-align:center; box-shadow:0 12px 36px rgba(0,0,0,.25);
        }
        .toast.success{ border-top-color:#16a34a; }
        .toast.error{ border-top-color:#dc2626; }

        .loading{
          position:fixed; inset:0; background:rgba(0,0,0,.35);
          display:grid; place-items:center; z-index: 9998;
        }
        .spinner{
          width:58px; height:58px; border:5px solid rgba(255,255,255,.3);
          border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite;
        }

        .pagination{
          margin-top:16px;
          margin-bottom:8px;
          display:flex;
          justify-content:center;
          align-items:center;
          gap:12px;
          color:#f9fafb;
          font-weight:600;
        }
        .pagination button{
          border:none;
          border-radius:999px;
          padding:6px 14px;
          font-weight:600;
          cursor:pointer;
          background:#e5e7eb;
        }
        .pagination button:disabled{
          opacity:.5;
          cursor:default;
        }

        @keyframes spin{ to{ transform: rotate(360deg);} }
        @keyframes fadeIn{ from{opacity:0; transform: translateY(-6px);} to{opacity:1; transform: translateY(0);} }
      `}</style>

      {/* Popup */}
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

      {/* Edit Dialog */}
      {editRow && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="dialog">
            <h6>Edit DPR</h6>
            <form onSubmit={handleUpdate}>
              <div className="field">
                <label htmlFor="dt">Date</label>
                <input
                  id="dt"
                  type="date"
                  value={ymd(editRow.work_date)}
                  onChange={(e) =>
                    setEditRow({ ...editRow, work_date: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="det">Details</label>
                <textarea
                  id="det"
                  value={editRow.details || ""}
                  onChange={(e) =>
                    setEditRow({ ...editRow, details: e.target.value })
                  }
                  placeholder="Enter full details..."
                />
              </div>
              <div className="field">
                <label htmlFor="wt">Time</label>
                <input
                  id="wt"
                  value={editRow.work_time || ""}
                  onChange={(e) =>
                    setEditRow({ ...editRow, work_time: e.target.value })
                  }
                  placeholder="e.g., 02:30 PM"
                />
              </div>
              <div className="btns">
                <button className="btn btn-download" type="submit">
                  Save
                </button>
                <button
                  type="button"
                  className="btn select"
                  onClick={() => setEditRow(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteRow && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="dialog">
            <h6>Delete this DPR?</h6>
            <div className="details" style={{ marginTop: 6 }}>
              {deleteRow.details || "(no details)"}
            </div>
            <div className="btns">
              <button
                type="button"
                className="btn select"
                onClick={() => setDeleteRow(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-delete"
                onClick={handleDelete}
              >
                OK, Delete
              </button>
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
                <div className="sub">
                  Manage, update, or download monthly DPR details
                </div>
              </div>
              <div className="header-right">
                <button
                  type="button"
                  className="dashboard-btn"
                  onClick={handleGoDashboard}
                >
                  🏠 Dashboard
                </button>
              </div>
            </div>
            <div className="toolbar">
              <select
                className="select"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-download"
                onClick={handleDownload}
              >
                ⬇ Download PDF
              </button>
              <button
                type="button"
                className="btn select"
                onClick={() => fetchDpr(month)}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {!loading && dprs.length === 0 ? (
            <p
              style={{
                color: "#fff",
                textAlign: "center",
                margin: "18px 0",
                fontWeight: 700,
              }}
            >
              No DPR entries found for {month}.
            </p>
          ) : (
            <>
              <div className="list">
                {pageItems.map((dpr, i) => (
                  <article
                    key={dpr.id}
                    className="card"
                    aria-label={`DPR #${startIndex + i + 1}`}
                  >
                    <div className="card-head">
                      <div className="badges">
                        <span className="badge badge-grey">
                          #{startIndex + i + 1}
                        </span>
                        <span className="badge badge-date">
                          {ymd(dpr.work_date) || "-"}
                        </span>
                        {dpr.category_name && (
                          <span className="badge badge-grey">
                            {dpr.category_name}
                          </span>
                        )}
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => openEdit(dpr)}
                        >
                          ✏ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => confirmDelete(dpr)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>

                    <div className="details">{dpr.details || "-"}</div>
                    <div className="time">
                      ⏰ Time: <b>{dpr.work_time || "-"}</b>
                    </div>

                    {Array.isArray(dpr.extra_details) &&
                      dpr.extra_details.length > 0 && (
                        <ul className="extra">
                          {dpr.extra_details.map((extra, idx) => (
                            <li key={idx}>
                              {extra}
                              {dpr.extra_times?.[idx]
                                ? ` (${dpr.extra_times[idx]})`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                  </article>
                ))}
              </div>

              {/* Pagination Controls */}
              {dprs.length > 0 && (
                <div className="pagination">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>
                  <span>
                    Page {currentPage} of {totalPages} &nbsp;(
                    {dprs.length} records)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
