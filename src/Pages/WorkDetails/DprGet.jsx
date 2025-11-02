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
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "success", message: "" }), 2000);
  };

  // fetch DPRs for month
  const fetchDpr = async (m) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/month/${encodeURIComponent(m)}`);
      const data = await res.json();
      if (data.ok) {
        setDprs(data.data || []);
      } else {
        showPopup("error", data.error || "Failed to load DPR");
      }
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

  // delete ------------
  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${deleteRow.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showPopup("success", "Deleted successfully ✅");
        setDeleteRow(null);
        // reload same month
        fetchDpr(month);
      } else {
        showPopup("error", data.error || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      showPopup("error", "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  // update ------------
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setLoading(true);

    // ensure date is yyyy-mm-dd
    const cleanDate = editRow.work_date
      ? editRow.work_date.toString().slice(0, 10)
      : null;

    const payload = {
      details: editRow.details,
      work_time: editRow.work_time,
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
        // reload same month
        fetchDpr(month);
      } else {
        showPopup("error", data.error || "Update failed");
      }
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
        body { font-family: 'Segoe UI', sans-serif; }

        .page-wrap { 
          min-height: 100vh; 
          background: linear-gradient(180deg,#0f172a,#312e81 25%,#1e3a8a 60%,#f59e0b 100%);
          padding:1rem;
        }
        .header-card {
          background: rgba(15,23,42,.92);
          color: #fff;
          border-radius: 1.2rem;
          padding: 1.1rem 1.3rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,.3);
        }
        .month-select {
          background: #f3f4f6;
          border: none;
          border-radius: 0.6rem;
          padding: 0.45rem 0.8rem;
          font-weight: 500;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.08);
        }
        .btn-download {
          background: linear-gradient(90deg,#f59e0b,#f97316);
          color: #fff;
          border: none;
          border-radius: 0.6rem;
          padding: 0.45rem 0.9rem;
          font-weight: 600;
        }
        .btn-download:hover { opacity: 0.9; }

        .dpr-card {
          background: linear-gradient(180deg,#ffffff,#f8fafc);
          border-radius: 1rem;
          padding: 1.2rem;
          box-shadow: 0 10px 25px rgba(15,23,42,.08);
          border: 1px solid #e2e8f0;
        }
        .date-bold {
          font-weight: 700;
          color: #1e40af;
          font-size: 0.9rem;
        }
        .btn-edit {
          background: #2563eb;
          border: none;
          color: #fff;
          font-size: 0.8rem;
          padding: 0.35rem 0.8rem;
          border-radius: 0.5rem;
        }
        .btn-delete {
          background: #dc2626;
          border: none;
          color: #fff;
          font-size: 0.8rem;
          padding: 0.35rem 0.8rem;
          border-radius: 0.5rem;
        }
        .btn-edit:hover { background: #1d4ed8; }
        .btn-delete:hover { background: #b91c1c; }

        .popup-center {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(3px);
        }
        .popup-box {
          background: #fff;
          border-radius: 1rem;
          padding: 1.8rem 2rem;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,.3);
          max-width: 340px;
          width: 90%;
          animation: fadeIn .3s ease;
        }
        .popup-box.success { border-top: 5px solid #16a34a; }
        .popup-box.error { border-top: 5px solid #dc2626; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* loading overlay */
        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9990;
        }
        .spinner {
          width: 58px;
          height: 58px;
          border: 5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* global popup */}
      {popup.show && (
        <div className="popup-center">
          <div className={`popup-box ${popup.type}`}>
            <h5>{popup.type === "success" ? "✅ Success" : "⚠️ Error"}</h5>
            <p className="mb-1">{popup.message}</p>
            <small>Closing in 2s…</small>
          </div>
        </div>
      )}

      {/* edit modal */}
      {editRow && (
        <div className="popup-center">
          <div className="popup-box" style={{ textAlign: "left" }}>
            <h6>Edit DPR</h6>
            <form onSubmit={handleUpdate}>
              <label>Date</label>
              <input
                type="date"
                className="form-control mb-2"
                value={editRow.work_date ? editRow.work_date.toString().slice(0, 10) : ""}
                onChange={(e) =>
                  setEditRow({ ...editRow, work_date: e.target.value })
                }
              />
              <label>Details</label>
              <input
                className="form-control mb-2"
                value={editRow.details || ""}
                onChange={(e) =>
                  setEditRow({ ...editRow, details: e.target.value })
                }
              />
              <label>Time</label>
              <input
                className="form-control mb-3"
                value={editRow.work_time || ""}
                onChange={(e) =>
                  setEditRow({ ...editRow, work_time: e.target.value })
                }
              />
              <button className="btn btn-edit w-100 mb-2" type="submit">
                Save
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => setEditRow(null)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* delete modal */}
      {deleteRow && (
        <div className="popup-center">
          <div className="popup-box">
            <h6>Delete this DPR?</h6>
            <p>{deleteRow.details}</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setDeleteRow(null)}
              >
                Cancel
              </button>
              <button className="btn btn-delete" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* page */}
      <div className="page-wrap">
        <div className="container-fluid" style={{ maxWidth: "1100px" }}>
          <div className="header-card d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
            <div>
              <h5 className="mb-1">📋 DPR Records – {month}</h5>
              <small>Manage, update, or download professional monthly DPR details</small>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-2 mt-sm-0">
              <select
                className="month-select"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {[
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
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <button className="btn-download" onClick={handleDownload}>
                ⬇ Download PDF
              </button>
            </div>
          </div>

          {!loading && dprs.length === 0 ? (
            <p className="text-center text-light my-4">
              No DPR entries found for {month}.
            </p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {dprs.map((dpr, i) => (
                <div key={dpr.id} className="dpr-card">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary-subtle text-dark">
                        #{i + 1}
                      </span>
                      <span className="date-bold">
                        {dpr.work_date
                          ? dpr.work_date.toString().slice(0, 10)
                          : "-"}
                      </span>
                      {dpr.category_name && (
                        <span className="badge bg-dark text-white">
                          {dpr.category_name}
                        </span>
                      )}
                    </div>
                    <div className="d-flex gap-2 mt-2 mt-sm-0">
                      <button
                        className="btn-edit"
                        onClick={() => setEditRow(dpr)}
                      >
                        ✏ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => setDeleteRow(dpr)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                  <p className="fw-semibold mb-1">{dpr.details}</p>
                  <p className="text-muted small mb-2">
                    ⏰ Time: <b>{dpr.work_time || "-"}</b>
                  </p>
                  {Array.isArray(dpr.extra_details) &&
                    dpr.extra_details.length > 0 && (
                      <ul className="small text-muted mb-0">
                        {dpr.extra_details.map((extra, idx) => (
                          <li key={idx}>
                            {extra}{" "}
                            {dpr.extra_times?.[idx] &&
                              `(${dpr.extra_times[idx]})`}
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
