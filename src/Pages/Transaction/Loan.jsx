// src/Pages/Transactions/Loan.jsx
import React, { useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE = "http://localhost:5000/api"; // POST to /loans

export default function Loan() {
  const [saving, setSaving] = useState(false);

  // Centered toast/alert state
  const [toast, setToast] = useState({
    show: false,
    type: "success", // success | warning | danger | info
    title: "",
    msg: "",
  });

  // Centered confirm/info modal
  const [modal, setModal] = useState({
    show: false,
    title: "",
    body: "",
    onOk: null,
    okText: "OK",
  });

  const categories = useMemo(
    () => [
      "Personal",
      "Any Person",
      "Loan Apps",
      "Friends",
      "Family Member",
      "Work Advance",
      "Any App",
      "Other",
    ],
    []
  );

  // Form state (add-only)
  const [form, setForm] = useState({
    loan_title: "",
    loan_amount: "",
    repayment_date: "",
    disbursed_date: "",
    loan_category: "Other",
    details: "",
    extra_interest: "",
    amount_paid: "",
    number_of_emi: "",
    other_expense_amount: "",
    other_expense_details: "",
  });

  // Dynamic Extra Fields -> will be serialized into additional_details JSON
  const [extraFields, setExtraFields] = useState([{ key: "", value: "" }]);

  // EMI schedule builder -> [{date, amount}]
  const [emis, setEmis] = useState([{ date: "", amount: "" }]);

  const ui = {
    bg: "#f6f8fb",
    surface: "#ffffff",
    border: "#e6e9ef",
    ink: "#0f172a",
    inkMuted: "#64748b",
    accent: "#16a34a",   // green (not default bootstrap blue)
    accent2: "#e85a19",  // orange
    danger: "#dc2626",
  };

  function notify(msg, type = "success", title = "") {
    setToast({ show: true, type, title, msg });
    window.clearTimeout((notify)._t);
    (notify)._t = window.setTimeout(
      () => setToast({ show: false, type, title: "", msg: "" }),
      2200
    );
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addExtraRow() {
    setExtraFields((ar) => [...ar, { key: "", value: "" }]);
  }
  function updateExtraRow(i, k, v) {
    setExtraFields((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function removeExtraRow(i) {
    setExtraFields((rows) => rows.filter((_, idx) => idx !== i));
  }

  function addEmiRow() {
    setEmis((rows) => [...rows, { date: "", amount: "" }]);
  }
  function updateEmiRow(i, k, v) {
    setEmis((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function removeEmiRow(i) {
    setEmis((rows) => rows.filter((_, idx) => idx !== i));
  }

  function buildAdditionalDetails() {
    const obj = {};
    extraFields.forEach(({ key, value }) => {
      if (key?.trim()) obj[key.trim()] = value;
    });
    return obj;
  }

  function buildEmiSchedule() {
    const out = [];
    emis.forEach(({ date, amount }) => {
      if (date && amount !== "") {
        const num = Number(amount);
        if (!isNaN(num)) out.push({ date, amount: num });
      }
    });
    return out.length ? out : null;
  }

  async function save() {
    // Validations (mobile-friendly centered alerts)
    if (!form.loan_title.trim())
      return notify("Loan title is required", "warning", "Missing Title");
    if (form.loan_amount === "" || isNaN(Number(form.loan_amount)))
      return notify("Please enter a valid loan amount", "warning", "Invalid Amount");

    const payload = {
      loan_title: form.loan_title.trim(),
      loan_amount: Number(form.loan_amount),
      repayment_date: form.repayment_date || null,
      disbursed_date: form.disbursed_date || null,
      loan_category: form.loan_category || "Other",
      details: form.details || null,
      extra_interest: form.extra_interest !== "" ? Number(form.extra_interest) : null,
      amount_paid: form.amount_paid !== "" ? Number(form.amount_paid) : 0,
      number_of_emi: form.number_of_emi !== "" ? Number(form.number_of_emi) : null,
      emi_schedule: buildEmiSchedule(), // array or null
      other_expense_amount:
        form.other_expense_amount !== "" ? Number(form.other_expense_amount) : null,
      other_expense_details: form.other_expense_details || null,
      additional_details: buildAdditionalDetails(), // JSON object (even if empty)
    };

    try {
      setSaving(true);
      const res = await fetch(`${BASE}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 404) {
          return notify(
            "Endpoint not found. Confirm backend route: POST /api/loans",
            "danger",
            "API 404"
          );
        }
        let errMsg = "Save failed";
        try {
          const j = await res.json();
          errMsg = j.error || errMsg;
        } catch {}
        return notify(errMsg, "danger", "Error");
      }

      // Success modal (centered)
      setModal({
        show: true,
        title: "Loan Added",
        body:
          "Your loan has been saved successfully. You can add another loan or go back.",
        onOk: () => setModal((m) => ({ ...m, show: false })),
        okText: "Great!",
      });

      // Reset
      setForm({
        loan_title: "",
        loan_amount: "",
        repayment_date: "",
        disbursed_date: "",
        loan_category: "Other",
        details: "",
        extra_interest: "",
        amount_paid: "",
        number_of_emi: "",
        other_expense_amount: "",
        other_expense_details: "",
      });
      setExtraFields([{ key: "", value: "" }]);
      setEmis([{ date: "", amount: "" }]);
    } catch (e) {
      notify(
        "Server not reachable. Please ensure backend is running at http://localhost:5000",
        "danger",
        "Network Error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        :root{
          --fs-sm: clamp(.82rem, 2.2vw, .95rem);
          --fs-md: clamp(.92rem, 2.6vw, 1.05rem);
          --fs-lg: clamp(1.05rem, 3.5vw, 1.35rem);
          --btn-pad: clamp .45rem .9rem;
        }
        .loan-shell { background:${ui.bg}; min-height: 60vh; }
        .card-clean {
          background:${ui.surface};
          border:1px solid ${ui.border};
          border-radius:16px;
          box-shadow:0 10px 28px rgba(2,6,23,.06);
        }
        .btn-accent {
          background:${ui.accent}; color:#fff; border:none; font-weight:700;
          padding:.55rem 1rem; border-radius:10px; font-size:var(--fs-sm);
        }
        .btn-accent:hover { filter: brightness(0.97); }
        .btn-ghost {
          background:#fff; border:1px solid ${ui.border}; color:${ui.ink};
          border-radius:10px; font-weight:600; padding:.55rem 1rem; font-size:var(--fs-sm);
        }
        .section-title { font-weight:800; font-size:var(--fs-md); margin-bottom:.35rem; }
        .muted { color:${ui.inkMuted}; font-size:var(--fs-sm); }
        .pill {
          border:1px solid ${ui.border}; background:#fff; border-radius:999px;
          padding:.25rem .6rem; font-weight:600; font-size:var(--fs-sm);
        }
        .alert-floating {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2000; min-width: 280px; max-width: 90vw;
          border-radius: 12px; box-shadow: 0 20px 40px rgba(2,6,23,.18);
          font-size: var(--fs-sm);
        }
        /* Centered modal overlay (no Bootstrap blue) */
        .custom-modal-backdrop {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35);
          z-index: 2000; display:flex; align-items:center; justify-content:center;
          padding: 1rem;
        }
        .custom-modal {
          background: #fff; border: 1px solid ${ui.border};
          border-radius: 16px; width: 100%; max-width: 520px;
          box-shadow: 0 30px 80px rgba(2,6,23,.25);
        }
        .custom-modal .modal-header { border-bottom: 1px solid ${ui.border}; }
        .custom-modal .modal-footer { border-top: 1px solid ${ui.border}; }
        .title { font-size: var(--fs-lg); font-weight: 800; margin: 0; }
        .form-label{ font-weight:700; font-size: var(--fs-sm); }
        .form-control, .form-select { font-size: var(--fs-sm); border-radius: 10px; }
        .btn-danger-custom{
          background:${ui.danger}; color:#fff; border:none; font-weight:700;
          border-radius:10px; padding:.55rem 1rem; font-size:var(--fs-sm);
        }
      `}</style>

      {/* Centered Alert */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="position-relative"
      >
        {toast.show && (
          <div className={`alert alert-${toast.type} text-center shadow alert-floating`} role="alert">
            {toast.title && <div className="fw-bold mb-1">{toast.title}</div>}
            <div>{toast.msg}</div>
          </div>
        )}
      </div>

      {/* Centered Modal */}
      {modal.show && (
        <div className="custom-modal-backdrop" role="dialog" aria-modal="true">
          <div className="custom-modal">
            <div className="modal-header d-flex align-items-center justify-content-between px-3 py-2">
              <h5 className="m-0">{modal.title || "Message"}</h5>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setModal((m) => ({ ...m, show: false }))}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body px-3 py-3">
              <div className="text-secondary" style={{ fontSize: "var(--fs-sm)" }}>
                {modal.body}
              </div>
            </div>
            <div className="modal-footer px-3 py-2 d-flex justify-content-end gap-2">
              <button
                className="btn btn-accent"
                onClick={() => (modal.onOk ? modal.onOk() : setModal((m) => ({ ...m, show: false })))}
              >
                {modal.okText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="loan-shell container-fluid p-2 p-sm-3">
        <div className="card-clean p-3 p-sm-4">
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
            <h2 className="title">Add Loan</h2>
            <span className="pill">Clean &amp; Mobile-first</span>
          </div>

          {/* Basic */}
          <div className="mt-3">
            <div className="section-title">Basic Details</div>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Loan Title *</label>
                <input
                  className="form-control"
                  value={form.loan_title}
                  onChange={(e) => setField("loan_title", e.target.value)}
                  placeholder="e.g., Phone Purchase EMI"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Amount *</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.loan_amount}
                  onChange={(e) => setField("loan_amount", e.target.value)}
                  placeholder="e.g., 25000"
                  inputMode="decimal"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={form.loan_category}
                  onChange={(e) => setField("loan_category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Repayment Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.repayment_date}
                  onChange={(e) => setField("repayment_date", e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Disbursed Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.disbursed_date}
                  onChange={(e) => setField("disbursed_date", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Financial Optional */}
          <div className="mt-4">
            <div className="section-title">Financial (Optional)</div>
            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <label className="form-label">Extra Interest</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.extra_interest}
                  onChange={(e) => setField("extra_interest", e.target.value)}
                  placeholder="e.g., 350"
                  inputMode="decimal"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Amount Paid</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.amount_paid}
                  onChange={(e) => setField("amount_paid", e.target.value)}
                  placeholder="e.g., 10000"
                  inputMode="decimal"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Number of EMIs</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.number_of_emi}
                  onChange={(e) => setField("number_of_emi", e.target.value)}
                  placeholder="e.g., 12"
                  inputMode="numeric"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Other Expense Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.other_expense_amount}
                  onChange={(e) => setField("other_expense_amount", e.target.value)}
                  placeholder="e.g., 199"
                  inputMode="decimal"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Other Expense Details</label>
                <textarea
                  rows="2"
                  className="form-control"
                  value={form.other_expense_details}
                  onChange={(e) => setField("other_expense_details", e.target.value)}
                  placeholder="Describe additional charges, processing fees, etc."
                />
              </div>
              <div className="col-12">
                <label className="form-label">Details</label>
                <textarea
                  rows="2"
                  className="form-control"
                  value={form.details}
                  onChange={(e) => setField("details", e.target.value)}
                  placeholder="Any notes about the loan..."
                />
              </div>
            </div>
          </div>

          {/* EMI Schedule Builder */}
          <div className="mt-4">
            <div className="section-title d-flex justify-content-between align-items-center">
              <span>EMI Schedule (Optional)</span>
              <button type="button" onClick={addEmiRow} className="btn btn-ghost">
                + Add EMI
              </button>
            </div>
            <div className="row g-2">
              {emis.map((r, i) => (
                <div className="col-12" key={`emi-${i}`}>
                  <div className="row g-2 align-items-end">
                    <div className="col-6">
                      <label className="form-label">EMI Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={r.date}
                        onChange={(e) => updateEmiRow(i, "date", e.target.value)}
                      />
                    </div>
                    <div className="col-5">
                      <label className="form-label">EMI Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={r.amount}
                        onChange={(e) => updateEmiRow(i, "amount", e.target.value)}
                        placeholder="e.g., 1500"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="col-1 d-grid">
                      <button
                        type="button"
                        className="btn btn-danger-custom"
                        onClick={() => removeEmiRow(i)}
                        disabled={emis.length === 1}
                        title="Remove"
                        aria-label="Remove EMI"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Fields (Key/Value) */}
          <div className="mt-4">
            <div className="section-title d-flex justify-content-between align-items-center">
              <span>Additional Extra Fields (Optional)</span>
              <button type="button" onClick={addExtraRow} className="btn btn-ghost">
                + Add Field
              </button>
            </div>
            <div className="row g-2">
              {extraFields.map((r, i) => (
                <div className="col-12" key={`ex-${i}`}>
                  <div className="row g-2 align-items-end">
                    <div className="col-5">
                      <label className="form-label">Field Name</label>
                      <input
                        className="form-control"
                        placeholder="e.g., AccountNumber"
                        value={r.key}
                        onChange={(e) => updateExtraRow(i, "key", e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Value</label>
                      <input
                        className="form-control"
                        placeholder="e.g., 1234-5678"
                        value={r.value}
                        onChange={(e) => updateExtraRow(i, "value", e.target.value)}
                      />
                    </div>
                    <div className="col-1 d-grid">
                      <button
                        type="button"
                        className="btn btn-danger-custom"
                        onClick={() => removeExtraRow(i)}
                        disabled={extraFields.length === 1}
                        title="Remove"
                        aria-label="Remove field"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="muted mt-2">
              These key/value pairs are saved inside <code>additional_details</code> (JSON).
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 d-flex flex-wrap justify-content-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={() =>
                setModal({
                  show: true,
                  title: "Leave Page?",
                  body: "Your unsaved changes will be lost. Do you want to go back?",
                  onOk: () => {
                    setModal((m) => ({ ...m, show: false }));
                    window.history.back();
                  },
                  okText: "Go Back",
                })
              }
            >
              Cancel
            </button>
            <button className="btn btn-accent" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Loan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
