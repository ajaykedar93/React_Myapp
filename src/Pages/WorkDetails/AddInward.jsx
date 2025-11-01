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
  const [extras, setExtras] = useState([]);
  const [showExtras, setShowExtras] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState({
    open: false,
    type: "success",
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

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingCats(true);
        const res = await fetch("https://express-backend-myapp.onrender.com/api/workcategory");
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

  const addExtraRow = () => setExtras((p) => [...p, { details: "", quantity: "", quantity_type: "" }]);
  const updateExtraRow = (i, f, v) => setExtras((p) => p.map((r, x) => (x === i ? { ...r, [f]: v } : r)));
  const removeExtraRow = (i) => setExtras((p) => p.filter((_, x) => x !== i));

  function showPopup(type, title, message) {
    setPopup({ open: true, type, title, message });
    clearTimeout(window.__popupTimer);
    window.__popupTimer = setTimeout(() => setPopup((p) => ({ ...p, open: false })), 2600);
  }
  const closePopup = () => {
    clearTimeout(window.__popupTimer);
    setPopup((p) => ({ ...p, open: false }));
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closePopup();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSubmit = async () => {
    if (!categoryId) return showPopup("error", "Missing Category", "Please select a category.");
    if (!details.trim()) return showPopup("error", "Details Required", "Please enter details of the inward.");

    const payload = {
      category_id: Number(categoryId),
      work_date: workDate || todayISO,
      work_time: workTime || null,
      details,
      quantity: quantity !== "" ? Number(quantity) : null,
      quantity_type: quantityType || null,
      extras_all: extras.map((e) => ({
        details: e.details || null,
        quantity: e.quantity !== "" ? Number(e.quantity) : null,
        quantity_type: e.quantity_type || null,
      })),
    };

    try {
      setSaving(true);
      const res = await fetch("https://express-backend-myapp.onrender.com/api/inward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save");

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
      setSaving(false);
    }
  };

  return (
    <div className="inward-wrap">
      <style>{`
        :root {
          --bg: #f9fafb;
          --card: #fff;
          --accent: #7c3aed;
          --accent-light: #c4b5fd;
          --border: #e5e7eb;
          --text: #111827;
          --muted: #6b7280;
        }

        .inward-wrap {
          max-width: 680px;
          margin: 0 auto;
          padding: 16px;
          background: var(--bg);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
        }

        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 6px 24px rgba(0,0,0,.05);
          margin-bottom: 30px;
        }

        h2 {
          text-align: center;
          font-size: 1.8rem;
          font-weight: 900;
          background: linear-gradient(90deg,#7c3aed,#c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }

        .grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }

        @media (min-width: 600px) {
          .grid-2 { grid-template-columns: 1fr 1fr; }
        }

        label {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--muted);
        }

        input, select, textarea {
          width: 100%;
          padding: 11px 14px;
          font-size: 0.95rem;
          border: 1px solid var(--border);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        textarea {
          resize: vertical;
          min-height: 90px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: none;
          padding: 12px;
          font-weight: 700;
          width: 100%;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .btn-primary {
          background: linear-gradient(90deg,#7c3aed,#a855f7);
          color: white;
        }

        .btn-primary:hover { opacity: .9; }

        .btn-yellow {
          background: linear-gradient(90deg,#facc15,#fbbf24);
          color: #1f2937;
          font-weight: 800;
        }

        .extra-row {
          border: 1px dashed var(--border);
          padding: 12px;
          border-radius: 10px;
          margin-top: 10px;
          background: #fff;
        }

        .btn-danger {
          background: linear-gradient(90deg,#ef4444,#dc2626);
          color: white;
          margin-top: 6px;
        }

        .popup-center {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2000;
          background: white;
          border-radius: 14px;
          border: 1px solid var(--border);
          width: 90%;
          max-width: 360px;
          box-shadow: 0 8px 28px rgba(0,0,0,.15);
          animation: fadeIn .2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }

        .popup-header {
          padding: 12px 16px;
          font-weight: 800;
          font-size: 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }

        .popup-body {
          padding: 14px 16px;
          color: var(--muted);
        }

        .popup-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }

        .busy {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.5);
          z-index: 3000;
        }

        @media (max-width: 480px) {
          .card { padding: 16px; }
          input, select, textarea { font-size: 0.9rem; }
          h2 { font-size: 1.5rem; }
        }
      `}</style>

      {saving && (
        <div className="busy">
          <LoadingSpiner />
        </div>
      )}

      <div className="card">
        <h2>Add Inward</h2>

        <div className="grid grid-2">
          <div>
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

          <div>
            <label>Date</label>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label>Time (optional)</label>
          <input
            type="text"
            placeholder="e.g., 10:00 AM – 12:30 PM"
            value={workTime}
            onChange={(e) => setWorkTime(e.target.value)}
          />
        </div>

        <div>
          <label>Details</label>
          <textarea
            placeholder="Describe the inward item/work..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <button className="btn btn-yellow" onClick={() => setShowExtras((v) => !v)}>
            {showExtras ? "Hide Extras" : "Add Extra Item"}
          </button>
        </div>

        <div className="grid grid-2">
          <div>
            <label>Quantity</label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label>Quantity Type</label>
            <input
              type="text"
              placeholder="e.g., bags, kg, liter"
              value={quantityType}
              onChange={(e) => setQuantityType(e.target.value)}
            />
          </div>
        </div>

        {showExtras &&
          extras.map((ex, i) => (
            <div key={i} className="extra-row">
              <label>Extra Details</label>
              <input
                type="text"
                value={ex.details}
                onChange={(e) => updateExtraRow(i, "details", e.target.value)}
                placeholder="Extra item details..."
              />
              <label>Extra Quantity</label>
              <input
                type="number"
                step="any"
                value={ex.quantity}
                onChange={(e) => updateExtraRow(i, "quantity", e.target.value)}
                placeholder="e.g., 2.5"
              />
              <label>Extra Quantity Type</label>
              <input
                type="text"
                value={ex.quantity_type}
                onChange={(e) => updateExtraRow(i, "quantity_type", e.target.value)}
                placeholder="e.g., ton, bags"
              />
              <button className="btn btn-danger" onClick={() => removeExtraRow(i)}>
                Remove
              </button>
            </div>
          ))}

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Inward"}
          </button>
        </div>
      </div>

      {popup.open && (
        <div className="popup-center">
          <div className="popup-header">{popup.title}</div>
          <div className="popup-body">{popup.message}</div>
          <div className="popup-footer">
            <button className="btn btn-yellow" onClick={closePopup}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddInward;
