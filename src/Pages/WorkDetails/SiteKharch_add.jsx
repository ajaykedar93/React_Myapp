// src/pages/SiteKharch_add.jsx
import React, { useState } from "react";

// change this to your backend
const BASE_URL = "https://express-backend-myapp.onrender.com/api/sitekharch";

export default function SiteKharch_add() {
  // ---------- SITE KHARCH STATE ----------
  const [kharchDate, setKharchDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [kharchAmount, setKharchAmount] = useState("");
  const [kharchDetails, setKharchDetails] = useState("");

  // ---------- RECEIVED STATE ----------
  const [recvDate, setRecvDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [recvAmount, setRecvAmount] = useState("");
  const [recvDetails, setRecvDetails] = useState("");
  const [recvMode, setRecvMode] = useState("cash");

  // ---------- POPUP ----------
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => {
      setPopup((p) => ({ ...p, show: false }));
    }, 2000);
  };

  // submit site kharch
  const handleSubmitKharch = async (e) => {
    e.preventDefault();

    // ✅ ONLY date, amount, details
    const payload = {
      kharch_date: kharchDate,
      amount: Number(kharchAmount || 0),
      details: kharchDetails,
    };

    try {
      const res = await fetch(`${BASE_URL}/kharch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add site kharch");
      }

      // reset
      setKharchAmount("");
      setKharchDetails("");
      showPopup("success", "✅ Site kharch added successfully!");
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Something went wrong 😕");
    }
  };

  // submit received
  const handleSubmitReceived = async (e) => {
    e.preventDefault();
    const payload = {
      payment_date: recvDate,
      amount_received: Number(recvAmount || 0),
      details: recvDetails,
      payment_mode: recvMode,
    };

    try {
      const res = await fetch(`${BASE_URL}/received`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add received amount");
      }

      setRecvAmount("");
      setRecvDetails("");
      setRecvMode("cash");
      showPopup("success", "💰 Received amount saved!");
    } catch (err) {
      console.error(err);
      showPopup("error", err.message || "Something went wrong 😕");
    }
  };

  return (
    <>
      {/* small inline styles just for bootstrap version */}
      <style>{`
        .app-bg {
          min-height: 100vh;
          background: radial-gradient(circle at 10% 20%, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 45%, rgba(252,176,69,1) 95%);
          display: flex;
          justify-content: center;
          padding: 1.25rem 0;
        }
        .kharch-card {
          border: none;
          border-radius: 1.5rem;
          box-shadow: 0 10px 35px rgba(19,16,34,0.12);
          backdrop-filter: blur(2px);
        }
        .header-card {
          background: linear-gradient(120deg, #6d28d9 0%, #9333ea 40%, #f97316 100%);
          border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,0.35);
          color: #fff;
          box-shadow: 0 10px 30px rgba(65, 39, 160, 0.3);
        }
        .btn-soft {
          border: none;
          border-radius: 999px;
          font-weight: 500;
          transition: all .14s ease-in-out;
        }
        .btn-soft:active {
          transform: scale(.985);
        }
        .btn-primary-grad {
          background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 30%, #a855f7 90%);
        }
        .btn-primary-grad:hover {
          filter: brightness(1.05);
        }
        .btn-green-grad {
          background: linear-gradient(135deg, #059669 0%, #10b981 60%, #6ee7b7 100%);
        }
        .btn-green-grad:hover {
          filter: brightness(1.04);
        }
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .popup-card {
          border-radius: 1.25rem;
          max-width: 360px;
          width: 100%;
        }
        @media (max-width: 576px) {
          .wrapper-col {
            padding-left: .75rem;
            padding-right: .75rem;
          }
        }
      `}</style>

      {/* POPUP */}
      {popup.show && (
        <div className="popup-overlay">
          <div
            className={`card popup-card ${
              popup.type === "success" ? "border-success" : "border-danger"
            }`}
          >
            <div
              className={`card-body text-center ${
                popup.type === "success" ? "bg-success-subtle" : "bg-danger-subtle"
              }`}
              style={{ borderRadius: "1.25rem" }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: "0.4rem" }}>
                {popup.type === "success" ? "🎉" : "⚠️"}
              </div>
              <h6 className="mb-1">{popup.message}</h6>
              <small className="text-muted">closes in 2 seconds...</small>
            </div>
          </div>
        </div>
      )}

      {/* PAGE */}
      <div className="app-bg">
        <div className="container-fluid" style={{ maxWidth: "650px" }}>
          <div className="row justify-content-center">
            <div className="col-12 wrapper-col">

              {/* header */}
              <div className="card header-card mb-4 p-3 p-md-4">
                <p className="text-uppercase small mb-1" style={{ letterSpacing: "0.1em" }}>
                  Site Kharch Panel
                </p>
                <h5 className="mb-1 fw-semibold">Add Expense &amp; Received</h5>
                <p className="mb-0 small opacity-75">
                  Mobile first · clean cards · gradient buttons
                </p>
              </div>

              {/* SITE KHARCH FORM */}
              <form onSubmit={handleSubmitKharch} className="card kharch-card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                    <div>
                      <h6 className="mb-1">Add Site Kharch</h6>
                      <small className="text-muted">Amount · details</small>
                    </div>
                    <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill">
                      Expense
                    </span>
                  </div>

                  {/* date + amount */}
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small mb-1">Date</label>
                      <input
                        type="date"
                        value={kharchDate}
                        onChange={(e) => setKharchDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={kharchAmount}
                        onChange={(e) => setKharchAmount(e.target.value)}
                        required
                        placeholder="0.00"
                        className="form-control"
                      />
                    </div>
                  </div>

                  {/* details */}
                  <div className="mt-3">
                    <label className="form-label small mb-1">Details</label>
                    <textarea
                      rows={2}
                      value={kharchDetails}
                      onChange={(e) => setKharchDetails(e.target.value)}
                      placeholder="Ex. bricks, labour payment, sand truck..."
                      className="form-control"
                      style={{ resize: "none" }}
                    ></textarea>
                  </div>

                  <div className="mt-3 d-grid">
                    <button type="submit" className="btn btn-green-grad text-white py-2">
                      Save Site Kharch
                    </button>
                  </div>
                </div>
              </form>

              {/* RECEIVED FORM (NO CHANGE) */}
              <form onSubmit={handleSubmitReceived} className="card kharch-card mb-5">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="mb-1">Add Received Amount</h6>
                      <small className="text-muted">
                        Owner / client / advance received
                      </small>
                    </div>
                    <span className="badge bg-info-subtle text-info-emphasis rounded-pill px-3 py-2">
                      Received
                    </span>
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small mb-1">Date</label>
                      <input
                        type="date"
                        value={recvDate}
                        onChange={(e) => setRecvDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={recvAmount}
                        onChange={(e) => setRecvAmount(e.target.value)}
                        required
                        placeholder="0.00"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label small mb-1">Details</label>
                    <input
                      type="text"
                      value={recvDetails}
                      onChange={(e) => setRecvDetails(e.target.value)}
                      placeholder="Ex. from owner, material refund..."
                      className="form-control"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="form-label small mb-1">Payment Mode</label>
                    <select
                      value={recvMode}
                      onChange={(e) => setRecvMode(e.target.value)}
                      className="form-select"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="upi">UPI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="mt-3 d-grid">
                    <button type="submit" className="btn btn-primary-grad text-white py-2">
                      Save Received Amount
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
