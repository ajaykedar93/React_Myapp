// src/pages/GetLoan.jsx
import React, { useEffect, useMemo, useState } from "react";

// EXACT base you gave:
const API_BASE = "http://localhost:5000/loan";

// YYYY-MM-DD -> "2 Oct 2025"
function fmtDate(d) {
  if (!d) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) {
    const [, Y, M, D] = m;
    const dt = new Date(Number(Y), Number(M) - 1, Number(D));
    if (isNaN(dt)) return "-";
    const day = dt.getDate();
    const mon = dt.toLocaleString("en-GB", { month: "short" });
    const yr = dt.getFullYear();
    return `${day} ${mon} ${yr}`;
  }
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  const day = dt.getDate();
  const mon = dt.toLocaleString("en-GB", { month: "short" });
  const yr = dt.getFullYear();
  return `${day} ${mon} ${yr}`;
}
const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function GetLoan() {
  // UI
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });

  // Data
  const [loans, setLoans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const selectedLoan = useMemo(
    () => loans.find((l) => String(l.loan_id) === String(selectedId)) || null,
    [loans, selectedId]
  );

  // Payments (for selected loan)
  const [payments, setPayments] = useState([]);

  // Add Payment form
  const [payValues, setPayValues] = useState({
    paid_amount: "",
    details: "",
    paid_on: todayISO(), // default current date
  });
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  // Theme
  const accent = "#FF7A59";
  const accentHover = "#FF5E3A";
  const bgSoft = "#FFF4EE";
  const cardBg = "#FFFFFF";
  const text = "#292524";
  const success = "#22c55e";
  const danger = "#ef4444";

  const styles = {
    app: { minHeight: "100vh", background: bgSoft, color: text },
    container: { width: "100%", maxWidth: 920, margin: "0 auto", padding: "16px 12px" },
    grid: { display: "grid", gap: 12 },
    card: {
      background: cardBg,
      border: "1px solid #f0e7e3",
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      padding: "clamp(10px, 2.4vw, 16px)",
    },
    h1: { fontSize: "clamp(16px, 3.6vw, 20px)", fontWeight: 800, marginBottom: 6 },
    label: { fontSize: "clamp(11px, 2.8vw, 12px)", fontWeight: 700, opacity: 0.85, marginBottom: 4 },
    input: {
      borderRadius: 10,
      border: "1px solid #e8dcd7",
      padding: "clamp(6px, 2.2vw, 8px) clamp(8px, 2.6vw, 10px)",
      outline: "none",
      width: "100%",
      fontSize: "clamp(12px, 2.8vw, 13px)",
    },
    textarea: {
      borderRadius: 10,
      border: "1px solid #e8dcd7",
      padding: "clamp(6px, 2.2vw, 8px) clamp(8px, 2.6vw, 10px)",
      outline: "none",
      width: "100%",
      fontSize: "clamp(12px, 2.8vw, 13px)",
      minHeight: 70,
      resize: "vertical",
    },
    pill: {
      fontSize: "clamp(10px, 2.6vw, 11px)",
      padding: "2px 8px",
      borderRadius: 999,
      background: "#FFE4DB",
      color: "#7a4a41",
      marginLeft: 8,
    },
    sub: { fontSize: "clamp(11px, 2.8vw, 12px)", opacity: 0.75 },
    btn: {
      background: accent,
      border: "none",
      borderRadius: 12,
      padding: "clamp(6px, 2.2vw, 8px) clamp(10px, 3vw, 12px)",
      fontWeight: 800,
      color: "#fff",
      fontSize: "clamp(12px, 2.8vw, 13px)",
      cursor: "pointer",
      flex: "1 1 auto",
    },
    btnGhost: {
      background: "#FFD0C2",
      border: "none",
      borderRadius: 12,
      padding: "clamp(6px, 2.2vw, 8px) clamp(10px, 3vw, 12px)",
      fontWeight: 800,
      color: "#6b4f4b",
      fontSize: "clamp(12px, 2.8vw, 13px)",
      cursor: "pointer",
      flex: "1 1 auto",
    },
    row2: { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" },
    row3: { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" },
    actionsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
    spinnerWrap: {
      position: "fixed",
      inset: 0,
      background: "rgba(255,250,247,.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    spinner: {
      width: 46,
      height: 46,
      border: "4px solid #ffe2d8",
      borderTop: `4px solid ${accent}`,
      borderRadius: "50%",
      animation: "spin .8s linear infinite",
    },
    toast: {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%,-50%)",
      background: "#fff",
      border: "1px solid #f0e7e3",
      borderRadius: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,.1)",
      padding: "14px 16px",
      zIndex: 10000,
      minWidth: 260,
      textAlign: "center",
      color: text,
    },
    loanList: { display: "grid", gap: 10 },
    loanItem: (active) => ({
      border: active ? `2px solid ${accent}` : "1px solid #f0e7e3",
      borderRadius: 12,
      padding: 10,
      background: "#fff",
      cursor: "pointer",
    }),
    drop: {
      border: "2px dashed #f0b8a7",
      borderRadius: 12,
      padding: 14,
      textAlign: "center",
      background: "#fff7f3",
      userSelect: "none",
    },
    preview: {
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      fontSize: 12,
      opacity: 0.85,
    },
    tiny: { fontSize: 11, opacity: 0.75 },
    payTable: { width: "100%", borderCollapse: "collapse" },
    payThTd: { borderBottom: "1px solid #eee", padding: "8px 6px", fontSize: 13 },
  };

  const responsiveCSS = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 560px){
      .row-2 { grid-template-columns: 1fr !important; }
      .row-3 { grid-template-columns: 1fr !important; }
      .stack-sm { flex-direction: column; }
    }
    @media (min-width: 561px) and (max-width: 839px){
      .row-3 { grid-template-columns: 1fr 1fr !important; }
    }
  `;

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: "" }), 2300);
  };

  // API helpers that accept {success,data} or raw arrays
  const normData = (json) => (Array.isArray(json) ? json : json?.data);

  const loadLoans = async () => {
    const res = await fetch(`${API_BASE}`);
    if (!res.ok) throw new Error(`Loans HTTP ${res.status}`);
    const json = await res.json();
    const arr = normData(json);
    if (!Array.isArray(arr)) throw new Error("Unexpected loans response");
    setLoans(arr);
    if (!selectedId && arr.length) setSelectedId(arr[0].loan_id);
  };

  const loadPayments = async (loanId) => {
    if (!loanId) return setPayments([]);
    const res = await fetch(`${API_BASE}/loans/${loanId}/payments`);
    if (!res.ok) throw new Error(`Payments HTTP ${res.status}`);
    const json = await res.json();
    const arr = normData(json);
    if (!Array.isArray(arr)) throw new Error("Unexpected payments response");
    setPayments(arr);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadLoans();
      } catch (e) {
        showToast("error", e.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (selectedId) await loadPayments(selectedId);
      } catch (e) {
        showToast("error", e.message || "Load failed");
      }
    })();
  }, [selectedId]); // load payments when selected loan changes

  // Select UI
  const onPickLoan = (id) => setSelectedId(id);

  // Drag & drop proof
  const onFile = (file) => {
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  };
  const onBrowse = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };
  const clearProof = () => {
    setProofFile(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
  };

  // Add Payment
  const submitPayment = async () => {
    try {
      if (!selectedLoan) throw new Error("Select a loan first");
      const amt = payValues.paid_amount === "" ? null : Number(payValues.paid_amount);
      if (amt === null || isNaN(amt) || amt <= 0) throw new Error("Enter a valid paid amount (> 0)");

      const fd = new FormData();
      fd.append("paid_amount", String(amt));
      // default current date unless user changed (we already set default)
      if (payValues.paid_on) fd.append("paid_on", payValues.paid_on);
      if (payValues.details) fd.append("details", payValues.details);
      if (proofFile) fd.append("proof", proofFile);

      const res = await fetch(`${API_BASE}/loans/${selectedLoan.loan_id}/payments`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || `HTTP ${res.status}`);
      }

      showToast("success", "Payment added ✅");
      // refresh loan list & payments for updated totals
      await Promise.all([loadLoans(), loadPayments(selectedLoan.loan_id)]);
      // keep the same selected ID after loans reload
      setSelectedId(selectedLoan.loan_id);
      // reset payment form except date stays today
      setPayValues({ paid_amount: "", details: "", paid_on: todayISO() });
      clearProof();
    } catch (err) {
      showToast("error", err.message || "Add payment failed");
    }
  };

  // Update loan (optional inline title/amount quick edit)
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({ loan_title: "", loan_amount: "" });
  const startEdit = (loan) => {
    setEditing(loan.loan_id);
    setEditValues({ loan_title: loan.loan_title ?? "", loan_amount: loan.loan_amount ?? "" });
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditValues({ loan_title: "", loan_amount: "" });
  };
  const saveEdit = async (loan_id) => {
    try {
      const title = (editValues.loan_title || "").trim();
      const amount = Number(editValues.loan_amount);
      if (!title) throw new Error("Title required");
      if (isNaN(amount) || amount < 0) throw new Error("Amount must be ≥ 0");
      const res = await fetch(`${API_BASE}/${loan_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loan_title: title, loan_amount: amount }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
      showToast("success", "Updated ✅");
      cancelEdit();
      await loadLoans();
      setSelectedId(loan_id);
    } catch (err) {
      showToast("error", err.message || "Update failed");
    }
  };

  return (
    <div style={styles.app}>
      <style>{responsiveCSS}</style>

      {loading && (
        <div style={styles.spinnerWrap}>
          <div style={styles.spinner}></div>
        </div>
      )}

      {toast.show && (
        <div style={styles.toast}>
          <div
            style={{
              fontWeight: 800,
              marginBottom: 6,
              color: toast.type === "success" ? success : danger,
            }}
          >
            {toast.type === "success" ? "Success" : "Notice"}
          </div>
          <div>{toast.message}</div>
        </div>
      )}

      <div style={styles.container}>
        {/* Header */}
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={styles.h1}>Loans & Payments</div>
          <div style={styles.sub}>Base URL: <b>{API_BASE}</b></div>

          {/* Quick selector */}
          <div className="row-2" style={{ ...styles.row2, marginTop: 10 }}>
            <div>
              <div style={styles.label}>Pick a Loan</div>
              <select
                style={styles.input}
                value={selectedId || ""}
                onChange={(e) => onPickLoan(e.target.value)}
              >
                {loans.length === 0 && <option value="">No loans yet</option>}
                {loans.map((l) => (
                  <option key={l.loan_id} value={l.loan_id}>
                    {l.loan_title} — ₹{Number(l.loan_amount || 0).toFixed(2)} ({l.category_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={styles.label}>Selected</div>
              <div className="stack-sm" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>
                  {selectedLoan ? selectedLoan.loan_title : "-"}
                </div>
                {selectedLoan && <span style={styles.pill}>{selectedLoan.category_name}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* All loans list (click to select) */}
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: "clamp(14px,3.2vw,16px)" }}>
            All Loans
          </div>
          <div style={styles.loanList}>
            {loans.map((ln) => (
              <div
                key={ln.loan_id}
                style={styles.loanItem(String(ln.loan_id) === String(selectedId))}
                onClick={() => onPickLoan(ln.loan_id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  {editing === ln.loan_id ? (
                    <input
                      style={{ ...styles.input, fontWeight: 800 }}
                      value={editValues.loan_title}
                      onChange={(e) => setEditValues((v) => ({ ...v, loan_title: e.target.value }))}
                    />
                  ) : (
                    <div style={{ fontWeight: 800, fontSize: "clamp(14px,3vw,16px)" }}>{ln.loan_title}</div>
                  )}
                  <span style={styles.pill}>{ln.category_name}</span>
                </div>

                <div style={{ marginTop: 6, fontSize: "clamp(11px,2.6vw,12px)", opacity: 0.75 }}>
                  Created: <b>{fmtDate(ln.created_on)}</b>
                </div>

                <div className="row-3" style={{ ...styles.row3, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: "clamp(11px,2.6vw,12px)", opacity: 0.7 }}>Amount</div>
                    {editing === ln.loan_id ? (
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues.loan_amount}
                        onChange={(e) => setEditValues((v) => ({ ...v, loan_amount: e.target.value }))}
                      />
                    ) : (
                      <div style={{ fontWeight: 700 }}>₹{Number(ln.loan_amount || 0).toFixed(2)}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "clamp(11px,2.6vw,12px)", opacity: 0.7 }}>Paid</div>
                    <div style={{ fontWeight: 700 }}>₹{Number(ln.total_paid || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "clamp(11px,2.6vw,12px)", opacity: 0.7 }}>Remaining</div>
                    <div style={{ fontWeight: 700 }}>₹{Number(ln.amount_remaining || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="stack-sm" style={{ ...styles.actionsRow, marginTop: 10 }}>
                  {editing === ln.loan_id ? (
                    <>
                      <button
                        style={styles.btn}
                        onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          saveEdit(ln.loan_id);
                        }}
                      >
                        Save
                      </button>
                      <button
                        style={styles.btnGhost}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          cancelEdit();
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      style={styles.btnGhost}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        startEdit(ln);
                      }}
                    >
                      Quick Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Payment for selected loan */}
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: "clamp(14px,3.2vw,16px)" }}>
            Add Payment {selectedLoan ? `for "${selectedLoan.loan_title}"` : ""}
          </div>

          <div className="row-2" style={{ ...styles.row2 }}>
            <div>
              <div style={styles.label}>Paid Amount (₹) *</div>
              <input
                style={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={payValues.paid_amount}
                onChange={(e) => setPayValues((v) => ({ ...v, paid_amount: e.target.value }))}
                placeholder="e.g., 1500"
              />
            </div>
            <div>
              <div style={styles.label}>Paid On (defaults to today)</div>
              <input
                style={styles.input}
                type="date"
                value={payValues.paid_on}
                onChange={(e) => setPayValues((v) => ({ ...v, paid_on: e.target.value }))}
              />
              <div style={styles.tiny}>Display: <b>{fmtDate(payValues.paid_on)}</b></div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={styles.label}>Details (optional)</div>
            <textarea
              style={styles.textarea}
              value={payValues.details}
              onChange={(e) => setPayValues((v) => ({ ...v, details: e.target.value }))}
              placeholder="Notes…"
            />
          </div>

          {/* Proof drag & drop (optional) */}
          <div style={{ marginTop: 10 }}>
            <div style={styles.label}>Proof Image (drag & drop optional)</div>
            <div
              style={styles.drop}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={onDrop}
            >
              <div>Drag & drop an image here, or click to browse.</div>
              <input
                type="file"
                accept="image/*"
                onChange={onBrowse}
                style={{ marginTop: 8 }}
              />
            </div>
            {proofPreview && (
              <div style={styles.preview}>
                <img
                  src={proofPreview}
                  alt="proof preview"
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
                />
                <div style={{ flex: "1 1 auto" }}>
                  <div><b>{proofFile?.name}</b></div>
                  <div style={styles.tiny}>{Math.round((proofFile?.size || 0) / 1024)} KB</div>
                </div>
                <button style={styles.btnGhost} onClick={clearProof}>Remove</button>
              </div>
            )}
          </div>

          <div className="stack-sm" style={styles.actionsRow}>
            <button
              style={styles.btn}
              onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
              onClick={submitPayment}
            >
              Save Payment
            </button>
            <button
              style={styles.btnGhost}
              onClick={() => {
                setPayValues({ paid_amount: "", details: "", paid_on: todayISO() });
                clearProof();
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Recent Payments of selected loan (optional view) */}
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: "clamp(14px,3.2vw,16px)" }}>
            Recent Payments {selectedLoan ? `— ${selectedLoan.loan_title}` : ""}
          </div>
          {(!payments || payments.length === 0) ? (
            <div style={styles.tiny}>No payments yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.payTable}>
                <thead>
                  <tr>
                    <th style={styles.payThTd}>Date</th>
                    <th style={styles.payThTd}>Amount (₹)</th>
                    <th style={styles.payThTd}>Details</th>
                    <th style={styles.payThTd}>Proof?</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td style={styles.payThTd}>{fmtDate(p.paid_on || p.created_on)}</td>
                      <td style={styles.payThTd}>₹{Number(p.paid_amount || 0).toFixed(2)}</td>
                      <td style={styles.payThTd}>{p.details || "-"}</td>
                      <td style={styles.payThTd}>{p.has_proof ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ height: 28 }} />
      </div>
    </div>
  );
}
