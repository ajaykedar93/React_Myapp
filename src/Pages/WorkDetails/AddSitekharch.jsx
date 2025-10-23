import React, { useEffect, useMemo, useState } from "react";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

const AddSitekharch = () => {
  // ---------- State ----------
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [kharchDate, setKharchDate] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");

  // Multiple extra rows: [{ amount: "", details: "" }]
  const [extras, setExtras] = useState([]);
  const [showExtras, setShowExtras] = useState(false);

  // Loading flags
  const [loadingCats, setLoadingCats] = useState(false); // no overlay for this
  const [saving, setSaving] = useState(false); // spinner only while saving

  // Popup state
  const [popup, setPopup] = useState({
    open: false,
    type: "success", // success | error | info
    title: "",
    message: "",
  });

  // ---------- Helpers ----------
  const todayISO = useMemo(() => {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  useEffect(() => {
    setKharchDate((v) => v || todayISO);
  }, [todayISO]);

  // Fetch categories
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingCats(true);
        const res = await fetch("https://express-myapp.onrender.com/api/workcategory");
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        setCategories([]);
        showPopup("error", "Load Failed", "Could not load categories. Please try again.");
      } finally {
        setLoadingCats(false);
      }
    };
    run();
  }, []);

  // ---------- Extras management ----------
  const addExtraRow = () => {
    setExtras((prev) => [...prev, { amount: "", details: "" }]);
    setShowExtras(true);
  };

  const updateExtraRow = (idx, field, value) => {
    setExtras((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const removeExtraRow = (idx) => {
    setExtras((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---------- Popup helpers ----------
  function showPopup(type, title, message) {
    setPopup({ open: true, type, title, message });
    clearTimeout(window.__skPopupTimer);
    window.__skPopupTimer = setTimeout(() => {
      setPopup((p) => ({ ...p, open: false }));
    }, 2600);
  }

  function closePopup() {
    clearTimeout(window.__skPopupTimer);
    setPopup((p) => ({ ...p, open: false }));
  }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closePopup();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Submit ----------
  const handleSubmit = async () => {
    const finalDate = kharchDate?.trim() ? kharchDate : todayISO;

    if (!categoryId) return showPopup("error", "Missing Category", "Please select a category.");
    if (amount === "" || amount == null) return showPopup("error", "Amount Required", "Please enter amount.");
    if (!details.trim()) return showPopup("error", "Details Required", "Please enter details.");

    // Map first extra to legacy (optional), send all extras in extras_all
    const firstExtra = extras[0] || { amount: null, details: null };

    const payload = {
      category_id: Number(categoryId),
      kharch_date: finalDate,
      amount: Number(amount),
      details: details || null,

      // Optional single legacy fields:
      extra_amount:
        firstExtra.amount !== "" && firstExtra.amount != null ? Number(firstExtra.amount) : null,
      extra_details: firstExtra.details || null,

      // Full array for JSONB:
      extras_all: extras
        .map((e) => ({
          amount: e.amount !== "" && e.amount != null ? Number(e.amount) : null,
          details: e.details || null,
        }))
        .filter((e) => e.amount !== null || (e.details && e.details.trim() !== "")),
    };

    try {
      setSaving(true);
      const res = await fetch("https://express-myapp.onrender.com/api/sitekharch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let body;
        try {
          body = await res.json();
        } catch {
          body = {};
        }
        throw new Error(body.error || `Failed to save (status ${res.status})`);
      }

      // Reset (keep date & category for faster next entry)
      setAmount("");
      setDetails("");
      setExtras([]);
      setShowExtras(false);

      showPopup("success", "Saved", "Site kharch entry added successfully.");
    } catch (err) {
      showPopup("error", "Save Failed", err?.message || "Could not add site kharch entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wrap">
      {/* Internal CSS only */}
      <style>{/* CSS styling from your code */}</style>

      {/* Spinner ONLY while saving */}
      {saving && (
        <div className="busy">
          <LoadingSpiner />
        </div>
      )}

      <div className="card">
        <h2 className="hd">Add Site Kharch</h2>

        {/* Category + Date */}
        <div className="grid grid-2 section">
          <div className="field">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Date (defaults to today)</label>
            <input
              type="date"
              value={kharchDate}
              onChange={(e) => setKharchDate(e.target.value)}
            />
          </div>
        </div>

        {/* Amount + Details */}
        <div className="grid grid-2 section">
          <div className="field">
            <label>Amount</label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: "auto / span 1" }}>
            <label>Details</label>
            <input
              type="text"
              placeholder="e.g., Cement bags"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        {/* Details area with Add Extra controls */}
        <div className="section">
          <div className="field">
            <div className="controls-inline" style={{ justifyContent: "space-between" }}>
              <label style={{ margin: 0 }}>Extras (optional)</label>
              <div className="controls-inline">
                <button
                  type="button"
                  className="btn btn-yellow"
                  onClick={() => setShowExtras((v) => !v)}
                >
                  {showExtras ? "Hide Extras" : "Add Extra Item"}
                </button>
                {showExtras && (
                  <button type="button" className="btn btn-yellow" onClick={addExtraRow}>
                    + Add Row
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Extras (multiple) */}
        {showExtras && (
          <div className="extra-wrap">
            {extras.length === 0 && (
              <div style={{ color: "#64748b", fontSize: ".85rem" }}>
                Click <b>+ Add Row</b> to insert extra amounts. All extras use the same date & category.
              </div>
            )}
            {extras.map((ex, idx) => (
              <div key={idx} className="extra-row">
                <div className="extra-col">
                  <label>Extra Amount</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 250"
                    value={ex.amount}
                    onChange={(e) => updateExtraRow(idx, "amount", e.target.value)}
                  />
                </div>
                <div className="extra-col">
                  <label>Extra Details</label>
                  <input
                    type="text"
                    placeholder="e.g., Tea & snacks"
                    value={ex.details}
                    onChange={(e) => updateExtraRow(idx, "details", e.target.value)}
                  />
                </div>
                <div style={{ flex: "0 0 100%", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeExtraRow(idx)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="section">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Kharch"}
          </button>
        </div>
      </div>

      {/* Center Popup (NO overlay) */}
      {popup.open && (
        <div className="popup-center" role="dialog" aria-modal="true">
          <div className="modal-head">
            <span
              className={`badge ${
                popup.type === "success" ? "ok" : popup.type === "error" ? "err" : "inf"
              }`}
            >
              {popup.type === "success" ? "✓" : popup.type === "error" ? "!" : "i"}
            </span>
            <h3 className="modal-title">{popup.title}</h3>
          </div>
          <div className="modal-body">{popup.message}</div>
          <div className="modal-actions">
            <button className="btn btn-yellow" onClick={closePopup}>OK</button>
          </div>
        </div>
      )}
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap');
  
  :root {
    --bg: #f7f7fb;
    --card: #ffffff;
    --border: #e8eaf1;
    --muted: #64748b;
    --text: #0f172a;
    --brand: #7e22ce;    /* Purple */
    --brand-2: #a855f7;  /* Lighter purple */
    --brand-3: #6b21a8;  /* Darker purple */
    --danger: #ef4444;   /* Red */
    --success: #10b981;  /* Green */
    --warning: #f59e0b;  /* Yellow */
    --neutral-light: #f3f4f6;
    --neutral-dark: #1f2937;
    --highlight: #facc15; /* Yellow for highlight */
    --ring: rgba(168,85,247, .32);
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
    font-family: 'Poppins', sans-serif;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-size: 1rem;
    line-height: 1.5;
  }

  .wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 16px 12px 56px;
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(2,6,23,0.06);
    padding: 20px;
    transition: all 0.3s ease-in-out;
  }

  /* Heading Style */
  .hd {
    text-align: center;
    margin: 6px 0 18px;
    font-weight: 700;
    font-size: clamp(1.75rem, 6vw, 2.5rem);
    line-height: 1.15;
    color: var(--highlight);
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    animation: fadeIn 0.6s ease-in-out;
  }

  /* Grid Layout */
  .grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
  }

  @media (min-width: 520px) {
    .grid-2 {
      grid-template-columns: 1fr 1fr;
    }
  }

  .section {
    margin-bottom: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 0.9rem;
    color: var(--muted);
    font-weight: 600;
  }

  input, select, textarea {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--border);
    outline: none;
    background-color: #fff;
    font-size: 1rem;
    transition: border-color 0.3s ease;
  }

  input:focus, select:focus, textarea:focus {
    border-color: var(--brand-2);
    box-shadow: 0 0 0 3px var(--ring);
  }

  textarea {
    min-height: 96px;
    resize: vertical;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 700;
    border-radius: 12px;
    border: 1px solid transparent;
    padding: 12px 18px;
    cursor: pointer;
    transition: transform 0.2s ease, background-color 0.3s ease;
  }

  .btn:hover {
    transform: scale(1.05);
  }

  .btn-primary {
    background-color: var(--brand-2);
    color: white;
    border-color: var(--brand-3);
  }

  .btn-primary:hover {
    background-color: var(--brand);
  }

  .btn-danger {
    background-color: var(--danger);
    color: white;
    border-color: #dc2626;
  }

  .btn-danger:hover {
    background-color: #dc2626;
  }

  .btn-yellow {
    background-color: var(--warning);
    color: var(--neutral-dark);
    border-color: #fbbf24;
  }

  .btn-yellow:hover {
    background-color: var(--highlight);
  }

  /* Extras Section */
  .extra-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .extra-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background-color: #fff;
    transition: background-color 0.3s ease;
  }

  .extra-row:hover {
    background-color: var(--neutral-light);
  }

  .extra-col {
    flex: 1 1 160px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Centered Popup */
  .popup-center {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    max-width: 420px;
    background-color: #fff;
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(2,6,23,.18);
    padding: 16px;
    animation: pop 0.3s ease-out;
  }

  @keyframes pop {
    from {
      transform: translate(-50%, calc(-50% + 10px)) scale(0.98);
      opacity: 0.8;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  .modal-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
  }

  .badge {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
  }

  .ok {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
  }

  .err {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  .inf {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }

  .modal-body {
    padding: 8px 16px;
    color: #334155;
  }

  .modal-actions {
    padding: 0 16px 16px;
    display: flex;
    justify-content: flex-end;
  }

  .popup-center .modal-title {
    font-weight: 700;
    font-size: 1.1rem;
    margin: 0;
  }

  /* Spinner Styles */
  .busy {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    background: transparent;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
`}</style>

{/* Rest of your JSX code */}

    </div>
  );
};

export default AddSitekharch;
