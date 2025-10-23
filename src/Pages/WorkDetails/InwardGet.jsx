// src/pages/InwardGet.jsx
import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

const API_URL = "https://express-myapp.onrender.com/api/inward";

export default function InwardGet() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateRecord, setUpdateRecord] = useState(null);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  // -------- Fetch Data --------
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const url = new URL(API_URL);
      if (selectedDate) url.searchParams.append("date", selectedDate);
      else if (selectedMonth) url.searchParams.append("month", selectedMonth);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setRecords(data.data || []);
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to load inward records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDate, selectedMonth]);

  // -------- Delete --------
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      setShowDeleteConfirm(false);
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to delete record.");
    } finally {
      setLoading(false);
    }
  };

  // -------- Update --------
  const handleUpdate = async () => {
    if (!updateRecord?.id) return;
    try {
      setLoading(true);
      const { id, work_date, work_time, details, quantity, quantity_type } = updateRecord;
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_date, work_time, details, quantity, quantity_type })
      });
      if (!res.ok) throw new Error("Failed to update record");
      setShowUpdateModal(false);
      setUpdateRecord(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to update record.");
    } finally {
      setLoading(false);
    }
  };

  // -------- Download PDF --------
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      setError("");

      const url = new URL(`${API_URL}/export`);
      if (selectedDate) url.searchParams.append("date", selectedDate);
      else if (selectedMonth) url.searchParams.append("month", selectedMonth);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Failed to download PDF. Status: ${res.status}`);

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `inward_export_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to download PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="text-center fw-bold mb-4" style={{ color: "#ff5722" }}>
        📦 Inward Details
      </h2>

      {/* Filters */}
      <div className="row mb-3 g-3 justify-content-center">
        <div className="col-md-4">
          <label className="form-label fw-semibold text-secondary">Select Date</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedMonth(""); }}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold text-secondary">Select Month</label>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
          >
            <option value="">All Months</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Download Button */}
      <div className="text-center mb-3">
        <button className="btn btn-primary" onClick={handleDownloadPDF}>
          📥 Download PDF
        </button>
      </div>

      {/* Loading Spinner */}
      {loading && <LoadingSpiner />}

      {/* Error / Empty */}
      {error && <div className="alert alert-danger text-center fw-semibold">{error}</div>}
      {!loading && !error && records.length === 0 && (
        <div className="alert alert-warning text-center fw-semibold">No records found</div>
      )}

      {/* Records Table */}
      {!loading && !error && records.length > 0 && (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle text-center">
            <thead className="table-light">
              <tr>
                <th>Seq</th>
                <th>Date</th>
                <th>Details</th>
                <th>Quantity</th>
                <th>Quantity Type</th>
                <th>Work Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => (
                <tr key={rec.id}>
                  <td>{rec.seq_no ?? idx + 1}</td>
                  <td>{new Date(rec.work_date).toLocaleDateString()}</td>
                  <td>{rec.details}</td>
                  <td>{rec.quantity ?? "-"}</td>
                  <td>{rec.quantity_type ?? "-"}</td>
                  <td>{rec.work_time ?? "-"}</td>
                  <td>
                    <button
                      className="btn btn-success btn-sm me-2"
                      onClick={() => { setUpdateRecord(rec); setShowUpdateModal(true); }}
                    >
                      Update
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => { setDeleteId(rec.id); setShowDeleteConfirm(true); }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this record?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && updateRecord && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Record</h5>
                <button type="button" className="btn-close" onClick={() => setShowUpdateModal(false)}></button>
              </div>
              <div className="modal-body">
                {["work_date","work_time","details","quantity","quantity_type"].map(field => (
                  <div className="mb-2" key={field}>
                    <label className="form-label">{field.replace("_"," ").toUpperCase()}</label>
                    <input
                      type={field==="quantity"?"number":field==="work_date"?"date":"text"}
                      className="form-control"
                      value={field==="work_date"?updateRecord[field]?.split("T")[0]||"":updateRecord[field]||""}
                      onChange={(e)=>setUpdateRecord({...updateRecord,[field]:field==="quantity"?Number(e.target.value):e.target.value})}
                    />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handleUpdate}>Update</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
