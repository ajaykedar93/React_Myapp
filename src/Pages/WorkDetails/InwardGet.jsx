// src/pages/InwardGet.jsx
import React, { useEffect, useState } from "react";

const API_BASE = "https://express-backend-myapp.onrender.com/api"; // backend root
const PAGE_SIZE = 10;

function getCurrentMonthName() {
  return new Date().toLocaleString("en-US", { month: "long" });
}

export default function InwardGet() {
  const [month, setMonth] = useState(getCurrentMonthName());
  const [inwards, setInwards] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // simple center popup
  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "success", message: "" }), 2000);
  };

  // fetch with page awareness
  const fetchInward = async (m, currentPage = 0) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inward?month=${encodeURIComponent(m)}`);
      const data = await res.json();
      if (data.data) {
        const list = data.data;
        // if current page is now too big (e.g. we deleted last item on last page), shift back
        const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
        let newPage = currentPage;
        if (newPage >= totalPages) {
          newPage = totalPages - 1;
        }
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

  // initial + when month changes
  useEffect(() => {
    fetchInward(month, 0);
  }, [month]);

  const handleDownload = () => {
    // frontend download
    window.open(
      `${API_BASE}/inward/export?month=${encodeURIComponent(month)}`,
      "_blank"
    );
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      const res = await fetch(`${API_BASE}/inward/${deleteRow.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showPopup("success", "Deleted successfully ✅");
        setDeleteRow(null);
        // refetch but stay on current page
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

    // clean payload
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

  // pagination
  const totalPages = Math.ceil(inwards.length / PAGE_SIZE) || 1;
  const paged = inwards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <style>{`
        body {
          font-family: 'Inter', 'Poppins', sans-serif;
          background-color: #fffaf5;
        }
        .page-wrap {
          min-height: 100vh;
          background: linear-gradient(180deg, #ff8a00 0%, #ff5f6d 45%, #ff758c 70%, #fbc2eb 100%);
          padding: 1rem;
          color: #fff;
          overflow-x: hidden;
        }
        .header-card {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 1.2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 8px 25px rgba(255, 94, 98, 0.3);
          padding: 1.2rem 1.5rem;
          margin-bottom: 1.2rem;
          transition: all .4s ease;
        }
        .header-card:hover {
          transform: scale(1.01);
          box-shadow: 0 10px 35px rgba(255, 88, 88, 0.4);
        }
        .record-card {
          background: linear-gradient(145deg, #fffdfc, #fff0e6);
          border-radius: 1rem;
          padding: 1rem 1.2rem;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          color: #212121;
        }
        .record-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(255, 111, 97, 0.3);
        }
        .btn-glow {
          background: linear-gradient(90deg, #ff8a00, #ff3d7f);
          border: none;
          color: #fff;
          border-radius: 8px;
          padding: .45rem 1rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .btn-glow:hover {
          background: linear-gradient(90deg, #ff3d7f, #ff8a00);
          box-shadow: 0 0 15px rgba(255, 83, 73, 0.6);
        }
        .select-month {
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.5);
          color: #111;
          font-weight: 600;
        }
        .select-month:focus {
          outline: none;
          box-shadow: 0 0 6px rgba(255,140,0,0.6);
        }
        .popup-center {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .popup-box {
          background: #fffaf5;
          border-radius: 1rem;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 10px 40px rgba(255, 98, 81, 0.3);
          max-width: 340px;
          width: 100%;
          animation: fadeIn .4s ease;
        }
        .popup-box.success { border-top: 6px solid #22c55e; }
        .popup-box.error { border-top: 6px solid #ef4444; }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .badge-date {
          background: rgba(255,165,0,0.15);
          color: #b45309;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: .75rem;
        }
        /* center loader */
        .loader-wrap {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9998;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Global popup */}
      {popup.show && (
        <div className="popup-center">
          <div className={`popup-box ${popup.type}`}>
            <h5>{popup.type === "success" ? "✅ Success" : "⚠️ Error"}</h5>
            <p>{popup.message}</p>
            <small>Closing in 2s…</small>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRow && (
        <div className="popup-center">
          <div className="popup-box" style={{ textAlign: "left" }}>
            <h6>Edit Inward Record</h6>
            <form onSubmit={handleUpdate}>
              <label>Date</label>
              <input
                type="date"
                className="form-control mb-2"
                value={
                  editRow.work_date
                    ? editRow.work_date.toString().slice(0, 10)
                    : ""
                }
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
              <label>Quantity</label>
              <input
                className="form-control mb-2"
                type="number"
                value={editRow.quantity ?? ""}
                onChange={(e) =>
                  setEditRow({ ...editRow, quantity: e.target.value })
                }
              />
              <label>Quantity Type</label>
              <input
                className="form-control mb-2"
                value={editRow.quantity_type || ""}
                onChange={(e) =>
                  setEditRow({ ...editRow, quantity_type: e.target.value })
                }
              />
              <label>Work Time</label>
              <input
                className="form-control mb-3"
                value={editRow.work_time || ""}
                onChange={(e) =>
                  setEditRow({ ...editRow, work_time: e.target.value })
                }
              />
              <button className="btn-glow w-100 mb-2" type="submit">
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

      {/* Delete Confirm */}
      {deleteRow && (
        <div className="popup-center">
          <div className="popup-box">
            <h6>🗑️ Delete this record?</h6>
            <p>{deleteRow.details}</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setDeleteRow(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* loading overlay */}
      {loading && (
        <div className="loader-wrap">
          <div className="spinner"></div>
        </div>
      )}

      {/* Main Page */}
      <div className="page-wrap">
        <div className="container-fluid" style={{ maxWidth: "1000px" }}>
          <div className="header-card d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
            <div>
              <h5 className="mb-1 fw-semibold">
                🧾 Inward Records – {month}
              </h5>
              <small>Manage inward entries: view, edit, delete, or download</small>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-2 mt-sm-0">
              <select
                className="form-select select-month"
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
              <button className="btn-glow" onClick={handleDownload}>
                ⬇️ Download PDF
              </button>
            </div>
          </div>

          {!loading && inwards.length === 0 ? (
            <p className="text-center text-light my-4 fs-5">
              No inward records found for {month}.
            </p>
          ) : (
            <>
              <div className="d-flex flex-column gap-3">
                {paged.map((rec) => (
                  <div key={rec.id} className="record-card">
                    <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-danger">#{rec.seq_no}</span>
                        <span className="badge-date">
                          {rec.work_date
                            ? new Date(rec.work_date).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      <div className="d-flex gap-2 mt-2 mt-sm-0">
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => setEditRow(rec)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteRow(rec)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <p className="fw-semibold mb-1 text-dark">
                      {rec.details}
                    </p>
                    <p className="small text-muted mb-1">
                      Qty: <b>{rec.quantity ?? "-"}</b>{" "}
                      {rec.quantity_type || ""}
                    </p>
                    <p className="small text-muted mb-0">
                      Work Time: {rec.work_time || "-"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <small className="text-light fw-medium">
                  Page {page + 1} of {totalPages || 1}
                </small>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-light"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← Prev
                  </button>
                  <button
                    className="btn btn-sm btn-outline-light"
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
