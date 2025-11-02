// src/pages/SitekharchGet.jsx
import React, { useEffect, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/sitekharch";

/* ---------- helpers ---------- */

// yyyy-mm from today
function getCurrentMonthStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// must be YYYY-MM
function isValidMonth(m) {
  return typeof m === "string" && /^\d{4}-\d{2}$/.test(m);
}

// never send NaN
function safeNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// same logic as backend
function calcRowTotal(row) {
  let total = 0;
  total += Number(row.amount || 0);
  total += Number(row.extra_amount || 0);

  const extras = Array.isArray(row.extra_items)
    ? row.extra_items
    : typeof row.extra_items === "string"
    ? (() => {
        try {
          return JSON.parse(row.extra_items);
        } catch {
          return [];
        }
      })()
    : [];

  for (const x of extras) {
    total += Number(x.amount || 0);
  }
  return total;
}

export default function SitekharchGet() {
  const [month, setMonth] = useState(getCurrentMonthStr());

  // kharch + received
  const [kharchRows, setKharchRows] = useState([]);
  const [receivedRows, setReceivedRows] = useState([]);

  // top summary
  const [totalReceived, setTotalReceived] = useState(0);

  // loading
  const [loading, setLoading] = useState(false);

  // popup
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // pagination (kharch)
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // edit modals
  const [editKharch, setEditKharch] = useState(null);
  const [editReceived, setEditReceived] = useState(null);

  // delete modals
  const [deleteKharch, setDeleteKharch] = useState(null);
  const [deleteReceived, setDeleteReceived] = useState(null);

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => {
      setPopup((p) => ({ ...p, show: false }));
    }, 2000);
  };

  // fetch kharch + received
  const fetchData = async (m) => {
    if (!isValidMonth(m)) {
      showPopup("error", "Invalid month");
      return;
    }
    setLoading(true);
    try {
      // 1) KHARCH
      const khRes = await fetch(`${BASE_URL}/kharch?month=${m}`);
      const khJson = await khRes.json();
      if (!khJson.ok) throw new Error(khJson.error || "Failed to load kharch");

      const normalized = khJson.data.map((row) => {
        if (typeof row.extra_items === "string") {
          try {
            row.extra_items = JSON.parse(row.extra_items);
          } catch {
            row.extra_items = [];
          }
        }
        if (!Array.isArray(row.extra_items)) {
          row.extra_items = [];
        }
        return row;
      });
      setKharchRows(normalized);
      setPage(0);

      // 2) RECEIVED
      const recRes = await fetch(`${BASE_URL}/received?month=${m}`);
      const recJson = await recRes.json();
      if (recJson.ok) {
        setReceivedRows(recJson.data || []);
        const recTotal = (recJson.data || []).reduce(
          (sum, r) => sum + Number(r.amount_received || 0),
          0
        );
        setTotalReceived(recTotal);
      } else {
        setReceivedRows([]);
        setTotalReceived(0);
      }
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Unable to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(month);
  }, [month]);

  // computed
  const totalKharch = kharchRows.reduce((sum, r) => sum + calcRowTotal(r), 0);
  const balance = totalReceived - totalKharch;

  // paginate kharch
  const start = page * pageSize;
  const end = start + pageSize;
  const pagedKharch = kharchRows.slice(start, end);
  const totalPages = Math.ceil(kharchRows.length / pageSize);

  /* ------------ actions: kharch ------------ */

  const handleUpdateKharchSubmit = async (e) => {
    e.preventDefault();
    if (!editKharch) return;

    const idNum = Number(editKharch.id);
    if (!Number.isFinite(idNum)) {
      showPopup("error", "Invalid id");
      return;
    }

    const payload = {
      kharch_date: editKharch.kharch_date
        ? editKharch.kharch_date.slice(0, 10)
        : null,
      amount: safeNum(editKharch.amount),
      details: editKharch.details || null,
      extra_amount: safeNum(editKharch.extra_amount),
      extra_details: editKharch.extra_details || null,
      extra_items: Array.isArray(editKharch.extra_items)
        ? editKharch.extra_items
        : [],
    };

    try {
      const res = await fetch(`${BASE_URL}/kharch/${idNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Update failed");

      showPopup("success", "Kharch updated ✔");
      setEditKharch(null);
      fetchData(month);
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Update failed");
    }
  };

  const handleDeleteKharch = async () => {
    if (!deleteKharch) return;
    const idNum = Number(deleteKharch.id);
    if (!Number.isFinite(idNum)) {
      showPopup("error", "Invalid id");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/kharch/${idNum}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");

      showPopup("success", "Kharch deleted ✅");
      setDeleteKharch(null);
      fetchData(month);
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Delete failed");
    }
  };

  /* ------------ actions: received ------------ */

  const handleUpdateReceivedSubmit = async (e) => {
    e.preventDefault();
    if (!editReceived) return;

    const idNum = Number(editReceived.id);
    if (!Number.isFinite(idNum)) {
      showPopup("error", "Invalid id");
      return;
    }

    const payload = {
      payment_date: editReceived.payment_date
        ? editReceived.payment_date.slice(0, 10)
        : null,
      amount_received: safeNum(editReceived.amount_received),
      details: editReceived.details || null,
      payment_mode: editReceived.payment_mode || "cash",
    };

    try {
      const res = await fetch(`${BASE_URL}/received/${idNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Update failed");

      showPopup("success", "Received updated ✔");
      setEditReceived(null);
      fetchData(month);
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Update failed");
    }
  };

  const handleDeleteReceived = async () => {
    if (!deleteReceived) return;
    const idNum = Number(deleteReceived.id);
    if (!Number.isFinite(idNum)) {
      showPopup("error", "Invalid id");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/received/${idNum}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");

      showPopup("success", "Received deleted ✅");
      setDeleteReceived(null);
      fetchData(month);
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Delete failed");
    }
  };

  // download pdf
  const handleDownload = () => {
    if (!isValidMonth(month)) return;
    window.open(`${BASE_URL}/download?month=${month}`, "_blank");
  };

  return (
    <>
      <style>{`
        .page-wrap {
          min-height: 100vh;
          background: linear-gradient(180deg, #f97316 0%, #fb7185 35%, #f97316 70%, #fde68a 100%);
          padding: 1rem .5rem 4rem;
        }
        @media (min-width: 576px) {
          .page-wrap { padding: 1.3rem 1rem 4rem; }
        }
        .header-card {
          background: rgba(255, 247, 237, 0.15);
          border-radius: 1.2rem;
          border: 1px solid rgba(254, 243, 199, 0.25);
          color: #fff;
          box-shadow: 0 18px 35px rgba(0,0,0,0.18);
        }
        .stat-box {
          background: rgba(250, 250, 250, 0.18);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: .9rem;
          padding: .65rem .9rem;
          color: #fff;
          backdrop-filter: blur(4px);
        }
        .stat-box h5 {
          color: #fff;
          font-weight: 700;
        }
        .section-card {
          background: #fff;
          border-radius: 1.2rem;
          border: none;
          box-shadow: 0 10px 30px rgba(15,23,42,.08);
        }
        .kharch-item {
          border: 1px solid rgba(249,115,22,.15);
          border-radius: 1rem;
          background: #fff;
          position: relative;
          padding-left: 3.5rem !important;
        }
        /* left circle number */
        .kharch-num {
          position: absolute;
          top: 1.1rem;
          left: 1rem;
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 9999px;
          background: #fb7185;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: .85rem;
          box-shadow: 0 4px 16px rgba(251,113,133,.35);
        }
        .badge-date {
          background: rgba(253, 186, 116, 0.18);
          color: #92400e;
          font-size: .7rem;
        }
        .popup-overlay-center {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .popup-card {
          max-width: 360px;
          width: 100%;
          border-radius: 1rem;
        }
        .received-card {
          border: 1px solid rgba(248,113,113,.15);
          border-radius: .8rem;
          background: #fff7ed;
        }
      `}</style>

      {/* POPUP */}
      {popup.show && (
        <div className="popup-overlay-center">
          <div
            className={`card popup-card ${
              popup.type === "success" ? "border-success" : "border-danger"
            }`}
          >
            <div
              className={`card-body text-center ${
                popup.type === "success"
                  ? "bg-success-subtle"
                  : "bg-danger-subtle"
              }`}
              style={{ borderRadius: "1rem" }}
            >
              <div style={{ fontSize: "2.2rem" }}>
                {popup.type === "success" ? "✅" : "⚠️"}
              </div>
              <p className="fw-semibold mb-1">{popup.message}</p>
              <small className="text-muted">closing in 2s…</small>
            </div>
          </div>
        </div>
      )}

      {/* EDIT KHARCH MODAL */}
      {editKharch && (
        <div className="popup-overlay-center">
          <div className="card popup-card" style={{ maxWidth: 430 }}>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <h6 className="mb-0">Edit Kharch</h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditKharch(null)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateKharchSubmit}>
                <div className="mb-2">
                  <label className="form-label small mb-1">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={
                      editKharch.kharch_date
                        ? editKharch.kharch_date.slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setEditKharch((p) => ({
                        ...p,
                        kharch_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.01"
                    value={editKharch.amount ?? ""}
                    onChange={(e) =>
                      setEditKharch((p) => ({ ...p, amount: e.target.value }))
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">Details</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editKharch.details || ""}
                    onChange={(e) =>
                      setEditKharch((p) => ({ ...p, details: e.target.value }))
                    }
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small mb-1">
                      Extra Amount
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.01"
                      value={editKharch.extra_amount ?? ""}
                      onChange={(e) =>
                        setEditKharch((p) => ({
                          ...p,
                          extra_amount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small mb-1">
                      Extra Details
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editKharch.extra_details || ""}
                      onChange={(e) =>
                        setEditKharch((p) => ({
                          ...p,
                          extra_details: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RECEIVED MODAL */}
      {editReceived && (
        <div className="popup-overlay-center">
          <div className="card popup-card" style={{ maxWidth: 430 }}>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <h6 className="mb-0">Edit Received</h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditReceived(null)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateReceivedSubmit}>
                <div className="mb-2">
                  <label className="form-label small mb-1">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={
                      editReceived.payment_date
                        ? editReceived.payment_date.slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setEditReceived((p) => ({
                        ...p,
                        payment_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.01"
                    value={editReceived.amount_received ?? ""}
                    onChange={(e) =>
                      setEditReceived((p) => ({
                        ...p,
                        amount_received: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">Mode</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editReceived.payment_mode || ""}
                    onChange={(e) =>
                      setEditReceived((p) => ({
                        ...p,
                        payment_mode: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small mb-1">Details</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editReceived.details || ""}
                    onChange={(e) =>
                      setEditReceived((p) => ({
                        ...p,
                        details: e.target.value,
                      }))
                    }
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE KHARCH MODAL */}
      {deleteKharch && (
        <div className="popup-overlay-center">
          <div className="card popup-card">
            <div className="card-body text-center">
              <h6 className="mb-2">Delete this kharch?</h6>
              <p className="small text-muted mb-3">
                {deleteKharch.kharch_date} – {deleteKharch.details || "—"}
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDeleteKharch(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={handleDeleteKharch}
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE RECEIVED MODAL */}
      {deleteReceived && (
        <div className="popup-overlay-center">
          <div className="card popup-card">
            <div className="card-body text-center">
              <h6 className="mb-2">Delete this received entry?</h6>
              <p className="small text-muted mb-3">
                {deleteReceived.payment_date} – ₹
                {Number(deleteReceived.amount_received || 0).toFixed(2)}
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDeleteReceived(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={handleDeleteReceived}
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE */}
      <div className="page-wrap">
        <div className="container-fluid" style={{ maxWidth: "1100px" }}>
          {/* HEADER */}
          <div className="header-card p-3 p-sm-4 mb-4 d-flex flex-column gap-3 gap-sm-0 flex-sm-row justify-content-between align-items-sm-center">
            <div>
              <p
                className="text-uppercase mb-1"
                style={{ letterSpacing: "0.12em", fontSize: "0.65rem" }}
              >
                Site Kharch – Monthly
              </p>
              <h5 className="mb-1">All Kharch for selected month</h5>
              <p className="mb-0 small opacity-75">
                View, edit or delete kharch. Below you can manage received
                entries for the same month.
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <input
                type="month"
                className="form-control"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ minWidth: "160px" }}
              />
              <button className="btn btn-outline-light" onClick={handleDownload}>
                Download PDF
              </button>
            </div>
          </div>

          {/* TOP STATS */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="stat-box">
                <p className="small mb-1" style={{ opacity: 0.9 }}>
                  Total Kharch
                </p>
                <h5 className="mb-0">₹{totalKharch.toFixed(2)}</h5>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="stat-box">
                <p className="small mb-1" style={{ opacity: 0.9 }}>
                  Total Received
                </p>
                <h5 className="mb-0">₹{totalReceived.toFixed(2)}</h5>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="stat-box">
                <p className="small mb-1" style={{ opacity: 0.9 }}>
                  Balance
                </p>
                <h5 className="mb-0">₹{(balance || 0).toFixed(2)}</h5>
              </div>
            </div>
          </div>

          {/* KHARCH LIST */}
          <div className="section-card p-3 p-sm-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Kharch details</h6>
              <small className="text-muted">
                {kharchRows.length} entries for {month}
              </small>
            </div>

            {loading ? (
              <p className="text-center my-4">Loading...</p>
            ) : kharchRows.length === 0 ? (
              <p className="text-center my-4 text-muted">
                No kharch for this month.
              </p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {pagedKharch.map((row, idx) => {
                  const total = calcRowTotal(row);
                  const displayIndex = start + idx + 1; // auto numbering
                  return (
                    <div
                      key={row.id}
                      className="p-3 kharch-item d-flex flex-column flex-md-row justify-content-between gap-3"
                    >
                      <div className="kharch-num">{displayIndex}</div>
                      <div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <span className="badge badge-date">
                            {row.kharch_date}
                          </span>
                          <span className="badge bg-success-subtle text-success-emphasis">
                            ₹{Number(row.amount || 0).toFixed(2)}
                          </span>
                          {row.extra_amount ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis">
                              +₹{Number(row.extra_amount).toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mb-1 fw-semibold">
                          {row.details || "—"}
                        </p>
                        {row.extra_details ? (
                          <p className="mb-1 small text-muted">
                            Extra: {row.extra_details}
                          </p>
                        ) : null}
                        {Array.isArray(row.extra_items) &&
                          row.extra_items.length > 0 && (
                            <p className="mb-1 small text-muted">
                              Extras:{" "}
                              {row.extra_items
                                .map(
                                  (x) =>
                                    `₹${x.amount || 0} (${x.details || ""})`
                                )
                                .join(", ")}
                            </p>
                          )}
                        <p className="mb-0 small text-secondary">
                          Total row: <b>₹{total.toFixed(2)}</b>
                        </p>
                      </div>
                      <div className="d-flex gap-2 align-items-start">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setEditKharch(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteKharch(row)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* pagination */}
            <div className="d-flex justify-content-between align-items-center mt-4">
              <small className="text-muted">
                Page {page + 1} of {totalPages || 1}
              </small>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page + 1 >= totalPages}
                  onClick={() =>
                    setPage((p) => (p + 1 < totalPages ? p + 1 : p))
                  }
                >
                  Next
                </button>
              </div>
            </div>

            {/* footer total */}
            <div className="mt-4 p-3 rounded bg-light d-flex flex-wrap justify-content-between gap-2">
              <span>Total kharch entries: {kharchRows.length}</span>
              <span>
                Total Kharch: <b>₹{totalKharch.toFixed(2)}</b>
              </span>
            </div>
          </div>

          {/* RECEIVED LIST */}
          <div className="section-card p-3 p-sm-4 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Received Amounts</h6>
              <small className="text-muted">
                {receivedRows.length} entries for {month}
              </small>
            </div>

            {loading ? (
              <p className="text-center my-3">Loading...</p>
            ) : receivedRows.length === 0 ? (
              <p className="text-center text-muted my-3">
                No received entries for this month.
              </p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {receivedRows.map((r, idx) => (
                  <div
                    key={r.id}
                    className="p-2 received-card d-flex justify-content-between align-items-start gap-2"
                  >
                    <div>
                      <div className="d-flex flex-wrap gap-2 mb-1 align-items-center">
                        <span className="badge bg-light text-dark">
                          #{idx + 1}
                        </span>
                        <span className="badge bg-light text-dark">
                          {r.payment_date}
                        </span>
                        <span className="badge bg-success-subtle text-success-emphasis">
                          ₹{Number(r.amount_received || 0).toFixed(2)}
                        </span>
                        <span className="badge bg-light text-muted">
                          {r.payment_mode || "cash"}
                        </span>
                      </div>
                      <p className="mb-0 small">{r.details || "—"}</p>
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setEditReceived(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setDeleteReceived(r)}
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 p-2 rounded bg-light d-flex justify-content-between">
              <span>Total Received (month)</span>
              <b>₹{totalReceived.toFixed(2)}</b>
            </div>
          </div>

          <div style={{ height: 40 }}></div>
        </div>
      </div>
    </>
  );
}
