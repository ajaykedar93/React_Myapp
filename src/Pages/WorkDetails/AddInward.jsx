import React, { useEffect, useMemo, useState } from "react";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

const AddInward = () => {
  // ---------- State ----------
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [workTime, setWorkTime] = useState("");
  const [details, setDetails] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityType, setQuantityType] = useState("");

  // Multiple extra rows
  const [extras, setExtras] = useState([]); // [{details:"", quantity:"", quantity_type:""}]
  const [showExtras, setShowExtras] = useState(false);

  // Loading flags
  const [loadingCats, setLoadingCats] = useState(false); // no spinner for this now
  const [saving, setSaving] = useState(false);           // spinner ONLY while saving

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
    setWorkDate((v) => v || todayISO);
  }, [todayISO]);

  // Fetch categories (no spinner overlay for this now)
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
    setExtras((prev) => [...prev, { details: "", quantity: "", quantity_type: "" }]);
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
    clearTimeout(window.__inwardPopupTimer);
    window.__inwardPopupTimer = setTimeout(() => {
      setPopup((p) => ({ ...p, open: false }));
    }, 2600);
  }
  function closePopup() {
    clearTimeout(window.__inwardPopupTimer);
    setPopup((p) => ({ ...p, open: false }));
  }
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closePopup();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Submit ----------
  const handleSubmit = async () => {
    const finalDate = workDate?.trim() ? workDate : todayISO;

    if (!categoryId) return showPopup("error", "Missing Category", "Please select a category.");
    if (!details.trim()) return showPopup("error", "Details Required", "Please enter details of the inward.");

    // Map the first extra to legacy columns; also send all in extras_all (backend may use JSONB).
    const firstExtra = extras[0] || { details: null, quantity: null, quantity_type: null };

    const payload = {
      category_id: Number(categoryId),
      work_date: finalDate,
      work_time: workTime || null,
      details: details || null,
      quantity: quantity !== "" ? Number(quantity) : null,
      quantity_type: quantityType || null,

      extra_details: firstExtra.details || null,
      extra_quantity:
        firstExtra.quantity !== "" && firstExtra.quantity != null
          ? Number(firstExtra.quantity)
          : null,
      extra_quantity_type: firstExtra.quantity_type || null,

      extras_all: extras.map((e) => ({
        details: e.details || null,
        quantity: e.quantity !== "" && e.quantity != null ? Number(e.quantity) : null,
        quantity_type: e.quantity_type || null,
      })),
    };

    try {
      setSaving(true); // ⬅️ spinner ON only during save
      const res = await fetch("https://express-myapp.onrender.com/api/inward", {
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
      setWorkTime("");
      setDetails("");
      setQuantity("");
      setQuantityType("");
      setExtras([]);
      setShowExtras(false);

      showPopup("success", "Saved", "Inward entry added successfully.");
    } catch (err) {
      showPopup("error", "Save Failed", err?.message || "Could not add inward entry.");
    } finally {
      setSaving(false); // ⬅️ spinner OFF
    }
  };

  return (
    <div className="wrap">
      {/* Internal CSS only */}
     <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Poppins:wght@700;800;900&display=swap');

  :root{
    --bg:#f7f7fb;
    --bg-grad:
      radial-gradient(1200px 520px at -10% -10%, rgba(14,165,233,.08), transparent 60%),
      radial-gradient(900px 520px at 110% 10%, rgba(168,85,247,.10), transparent 60%),
      var(--bg);

    --card:#ffffff;
    --card-tint: rgba(139,92,246,.10);
    --border:#e8eaf1;
    --muted:#64748b;
    --text:#0f172a;

    --brand:#7e22ce;      /* purple */
    --brand-2:#a855f7;    /* lighter */
    --brand-3:#6b21a8;    /* darker */

    --ring: rgba(168,85,247,.28);
    --danger:#ef4444;
    --warn:#f59e0b;       /* yellow for Add Extra */
    --warn-2:#fbbf24;

    --ink-700:#2b3447; --ink-600:#475569; --ink-500:#667085;

    --shadow-card: 0 28px 80px rgba(23,34,66,.12), 0 10px 26px rgba(23,34,66,.07);
    --shadow-soft: 0 10px 28px rgba(23,34,66,.08);
  }

  *{ box-sizing:border-box }
  html,body,#root{ height:100% }
  body{
    margin:0;
    color:var(--text);
    background: var(--bg-grad);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .wrap{ max-width: 760px; margin: 0 auto; padding: 20px 14px 64px; }

  .card{
    background: var(--card);
    border:1px solid var(--border);
    border-radius:18px;
    box-shadow: var(--shadow-card);
    padding: 20px;
    position: relative;
    overflow: hidden;
    animation: cardIn .24s ease-out;
  }
  @keyframes cardIn{
    from{ transform: translateY(6px); opacity:.85; }
    to{ transform: translateY(0); opacity:1; }
  }
  .card::after{
    content:"";
    position:absolute; inset:auto -8% -8% auto;
    width: 360px; height: 360px; border-radius: 50%;
    background: radial-gradient(closest-side, var(--card-tint), transparent 70%);
    filter: blur(6px);
    pointer-events:none;
  }

  /* Heading */
  .hd{
    text-align:center;
    margin: 6px 0 18px;
    font-weight: 900;
    font-family: 'Poppins', sans-serif;
    font-size: clamp(1.75rem, 6vw, 2.5rem);
    line-height: 1.15;
    letter-spacing: .3px;
    color: #facc15;
    text-shadow:
      -1px -1px 0 #000,
       1px -1px 0 #000,
      -1px  1px 0 #000,
       1px  1px 0 #000;
  }

  /* Layout & spacing */
  .grid{ display:grid; gap:14px; grid-template-columns: 1fr; }
  @media (min-width: 540px){ .grid-2{ grid-template-columns: 1fr 1fr; } }

  .section{ display:flex; flex-direction:column; gap:14px; margin-bottom: 8px; }

  /* Fields */
  .field{ display:flex; flex-direction:column; gap:8px; position:relative; }
  label{
    font-size:.85rem; color:var(--ink-600); font-weight:800; letter-spacing:.2px;
  }
  input, select, textarea{
    width:100%;
    padding:12px 14px;
    border-radius:14px;
    border:1px solid var(--border);
    outline:none;
    background:#fff;
    color:var(--text);
    font-size:.98rem;
    transition: border-color .12s ease, box-shadow .12s ease, transform .04s ease, background .2s ease;
  }
  input::placeholder, textarea::placeholder{ color:#9aa5b4; }
  textarea{ min-height: 96px; resize: vertical; }

  /* Active / focus states */
  input:hover, select:hover, textarea:hover{
    border-color:#d8dcf0;
    background:#fcfdff;
  }
  input:focus, select:focus, textarea:focus{
    border-color: var(--brand-2);
    box-shadow: 0 0 0 3px var(--ring);
    background:#ffffff;
  }
  input:disabled, select:disabled, textarea:disabled{
    background:#f6f7fb; color:#9aa0ad; cursor:not-allowed;
  }

  /* Buttons */
  .btn{
    display:inline-flex; align-items:center; justify-content:center; gap:.55rem;
    font-weight:900; letter-spacing:.2px;
    border-radius:14px; border:1px solid transparent;
    padding:.8rem 1rem; cursor:pointer; user-select:none;
    transition: transform .12s ease, filter .12s ease, box-shadow .12s ease, background .12s ease;
    box-shadow: var(--shadow-soft);
  }
  .btn:focus-visible{ outline:none; box-shadow: 0 0 0 3px var(--ring), var(--shadow-soft); }
  .btn:active{ transform: translateY(.5px) scale(.995); }

  .btn-primary{
    background: linear-gradient(180deg, var(--brand-2), var(--brand-3));
    color:#fff; border-color: rgba(124,58,237,.32);
    width:100%;
  }
  .btn-primary:hover{ filter: brightness(.98); transform: translateY(-1px); }

  .btn-danger{
    background: linear-gradient(180deg, #ef4444, #dc2626);
    color:#fff; border-color:#dc2626;
  }
  .btn-danger:hover{ filter: brightness(.98); transform: translateY(-1px); }

  .btn-yellow{
    background: linear-gradient(180deg, var(--warn-2), var(--warn));
    color:#1f2937; border-color:#eab308;
  }
  .btn-yellow:hover{ filter: brightness(.98); transform: translateY(-1px); }

  .controls-inline{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

  /* Extras */
  .extra-wrap{ display:flex; flex-direction:column; gap:12px; }
  .extra-row{
    display:flex; flex-wrap:wrap; gap:12px; padding:12px;
    border:1px dashed var(--border); border-radius:14px; background:#fff;
    transition: background .12s ease, box-shadow .12s ease;
  }
  .extra-row:hover{ background:#f9fbff; box-shadow: 0 6px 18px rgba(23,34,66,.06); }
  .extra-col{ flex: 1 1 160px; display:flex; flex-direction:column; gap:8px; }

  /* Centered popup with NO dark overlay */
  .popup-center {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    width: 100%;
    max-width: 440px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: 0 28px 80px rgba(23,34,66,.22);
    overflow: hidden;
    animation: pop .18s ease-out;
  }
  @keyframes pop{
    from{ transform: translate(-50%, calc(-50% + 6px)) scale(.985); opacity:.85; }
    to{ transform: translate(-50%, -50%) scale(1); opacity:1; }
  }
  .modal-head{ display:flex; align-items:center; gap:10px; padding:14px 16px 6px; }
  .badge{
    width:34px;height:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;
  }
  .ok{ background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; }
  .err{ background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
  .inf{ background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .modal-title{ margin:0; font-weight:900; font-size:1.05rem; color:var(--text); }
  .modal-body{ padding:8px 16px 14px; color:var(--ink-600); line-height:1.55; }
  .modal-actions{ padding: 0 16px 16px; display:flex; justify-content:flex-end; }

  /* Saving spinner: centered, NO dark background */
  .busy{
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    background: transparent;
    pointer-events: none;
  }

  /* Small helper text */
  .note{ font-size:.82rem; color:#94a3b8; margin-top:-6px; margin-bottom:6px; }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce){
    .card, .popup-center, .btn { animation: none !important; transition: none !important; }
  }
`}</style>


      {/* Spinner ONLY while saving */}
      {saving && (
        <div className="busy">
          <LoadingSpiner />
        </div>
      )}

      <div className="card">
        <h2 className="hd">Add Inward</h2>

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
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
        </div>

        {/* Time (optional) */}
        <div className="section">
          <div className="field">
            <label>Time (optional)</label>
            <input
              type="text"
              placeholder="e.g., 10:00 AM – 12:30 PM"
              value={workTime}
              onChange={(e) => setWorkTime(e.target.value)}
            />
          </div>
        </div>

        {/* Details + (Only here: Add Extra controls in yellow) */}
        <div className="section">
          <div className="field">
            <div className="controls-inline" style={{ justifyContent: "space-between" }}>
              <label style={{ margin: 0 }}>Details</label>
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
            <textarea
              placeholder="Describe the inward item/work..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        {/* Quantity + Type */}
        <div className="grid grid-2 section">
          <div className="field">
            <label>Quantity</label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Quantity Type</label>
            <input
              type="text"
              placeholder="e.g., bags, kg, liter"
              value={quantityType}
              onChange={(e) => setQuantityType(e.target.value)}
            />
          </div>
        </div>

        {/* Extras (multiple) */}
        {showExtras && (
          <div className="extra-wrap">
            {extras.length === 0 && (
              <div style={{ color: "#64748b", fontSize: ".85rem" }}>
                Click <b>+ Add Row</b> to insert extra items. All extras use the same date.
              </div>
            )}

            {extras.map((ex, idx) => (
              <div key={idx} className="extra-row">
                <div className="extra-col">
                  <label>Extra Details</label>
                  <input
                    type="text"
                    placeholder="Extra item details..."
                    value={ex.details}
                    onChange={(e) => updateExtraRow(idx, "details", e.target.value)}
                  />
                </div>
                <div className="extra-col">
                  <label>Extra Quantity</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 2.5"
                    value={ex.quantity}
                    onChange={(e) => updateExtraRow(idx, "quantity", e.target.value)}
                  />
                </div>
                <div className="extra-col">
                  <label>Extra Quantity Type</label>
                  <input
                    type="text"
                    placeholder="e.g., ton, bags"
                    value={ex.quantity_type}
                    onChange={(e) => updateExtraRow(idx, "quantity_type", e.target.value)}
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
            {saving ? "Saving..." : "Save Inward"}
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
    </div>
  );
};

export default AddInward;
