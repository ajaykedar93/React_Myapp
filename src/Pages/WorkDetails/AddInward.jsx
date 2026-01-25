import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function AddInward() {
  const API_BASE = useMemo(() => "https://express-backend-myapp.onrender.com", []);
  const ADD_API_URL = `${API_BASE}/api/inward`;

  const todayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const emptyItem = () => ({
    material: "",
    quantity: "",
    quantity_type: "",
    material_use: "",
  });

  const [workDate, setWorkDate] = useState(todayISO());
  const [store, setStore] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);

  // ✅ one bill for whole inward (optional)
  const [billFile, setBillFile] = useState(null);
  const [billPreviewName, setBillPreviewName] = useState("");
  const [billKey, setBillKey] = useState(Math.random().toString(36).slice(2));

  const [overlay, setOverlay] = useState({ open: false, text: "Please wait..." });

  const [modal, setModal] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const openModal = (type, title, message) => setModal({ open: true, type, title, message });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const addItemRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItemRow = (idx) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const updateItem = (idx, patch) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const resetForm = () => {
    setWorkDate(todayISO());
    setStore("");
    setItems([emptyItem()]);
    setBillFile(null);
    setBillPreviewName("");
    setBillKey(Math.random().toString(36).slice(2));
  };

  /**
   * ✅ RULES (as you asked):
   * - Date mandatory
   * - Store mandatory
   * - a) (index 0): material + material_use mandatory
   * - b/c/...: material mandatory, material_use optional
   * - qty/qty_type optional
   * - ignore fully empty rows (except a)
   */
  const validateForSave = () => {
    const errs = [];
    const s = (store || "").trim();

    if (!workDate) errs.push("Date is required.");
    if (!s) errs.push("Store is required.");

    // keep idx for correct a/b/c letters in errors
    const cleanAll = items.map((it, idx) => ({
      __idx: idx,
      material: (it.material || "").trim(),
      quantity: it.quantity === "" ? null : Number(it.quantity),
      quantity_type: (it.quantity_type || "").trim() || null,
      material_use: (it.material_use || "").trim(), // may be ""
    }));

    // ✅ a) mandatory both
    const a = cleanAll[0] || { __idx: 0, material: "", quantity: null, quantity_type: null, material_use: "" };
    if (!a.material) errs.push("a) Material is required.");
    if (!a.material_use) errs.push("a) Material Use is required.");

    // ✅ quantity number check (all rows)
    cleanAll.forEach((it) => {
      if (it.quantity !== null && Number.isNaN(it.quantity)) {
        errs.push(`${String.fromCharCode(97 + it.__idx)}) Quantity must be a number.`);
      }
    });

    // ✅ b/c/... include only if user typed anything
    const restTouched = cleanAll.slice(1).filter((it) => {
      const touched = !!it.material || !!it.material_use || it.quantity !== null || !!it.quantity_type;
      return touched;
    });

    // ✅ b/c/... material mandatory, use optional
    restTouched.forEach((it) => {
      const letter = String.fromCharCode(97 + it.__idx);
      if (!it.material) errs.push(`${letter}) Material is required.`);
      // material_use optional => no error
    });

    // ✅ final items to send:
    // - always include a
    // - include only touched rows after a
    const finalItems = [a, ...restTouched].map((it) => ({
      material: it.material,
      quantity: it.quantity,
      quantity_type: it.quantity_type,
      material_use: it.material_use || null, // send null if empty
      __idx: it.__idx,
    }));

    // ✅ duplicates inside same form (date + store + material + material_use)
    const seen = new Set();
    for (const it of finalItems) {
      const m = (it.material || "").toLowerCase();
      const u = (it.material_use || "").toLowerCase(); // null => ""
      const k = `${workDate}||${s.toLowerCase()}||${m}||${u}`;
      if (seen.has(k)) {
        const letter = String.fromCharCode(97 + it.__idx);
        errs.push(`Duplicate inside form not allowed (${letter}). Same Date + Store + Material + Material Use.`);
        break;
      }
      seen.add(k);
    }

    // remove __idx before sending
    const payloadItems = finalItems.map(({ __idx, ...rest }) => rest);

    return { ok: errs.length === 0, errs, clean: payloadItems, store: s };
  };

  const onBillSelected = (file) => {
    setBillFile(file);
    setBillPreviewName(file ? file.name : "");
  };

  const removeBill = () => {
    setBillFile(null);
    setBillPreviewName("");
    setBillKey(Math.random().toString(36).slice(2));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const v = validateForSave();
    if (!v.ok) {
      openModal("error", "Please fix these", v.errs.join("\n"));
      return;
    }

    setSaving(true);
    setOverlay({ open: true, text: "Saving inward... Please wait" });

    try {
      const fd = new FormData();
      fd.append("work_date", workDate);
      fd.append("store", v.store);
      fd.append("items", JSON.stringify(v.clean));
      if (billFile) fd.append("bill", billFile);

      const r = await fetch(ADD_API_URL, { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));

      setOverlay({ open: false, text: "Please wait..." });

      if (r.ok && data?.success) {
        const seq = data?.data?.seq_no ? ` (Sr.No: ${data.data.seq_no})` : "";
        openModal("success", "Saved Successfully", `Inward entry added${seq}.`);
        resetForm();
        return;
      }

      if (r.status === 409) {
        openModal("error", "Duplicate Not Allowed", "Same Date + Store + Material + Material Use already exists.");
        return;
      }

      if (r.status === 400 && data?.errors?.length) {
        openModal("error", "Validation failed", data.errors.join("\n"));
        return;
      }

      openModal("error", "Failed to Save", data?.message ? String(data.message) : "Something went wrong.");
    } catch (err) {
      setOverlay({ open: false, text: "Please wait..." });
      openModal("error", "Network Error", "Server not reachable. Please check backend and try again.");
    } finally {
      setSaving(false);
    }
  };

  const setRipplePoint = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--rx", `${x}%`);
    el.style.setProperty("--ry", `${y}%`);
  };

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <div className="ai-page">
      <div className="ai-topbar">
        <div className="ai-topbar__title">Add Inward</div>
      </div>

      <div className="ai-whiteSection">
        <div className="ai-field">
          <label>
            Date <span className="ai-req">*</span>
          </label>
          <div className="ai-dateWrapWhite">
            <input
              className="ai-dateInputWhite"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
            />
            <span className="ai-dateIconWhite" aria-hidden="true">
              📅
            </span>
          </div>
        </div>
      </div>

      <form className="ai-card" onSubmit={onSubmit}>
        <section className="ai-section">
          <div className="ai-field">
            <label>
              Store <span className="ai-req">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Main Store"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              required
            />
            <div className="ai-muted" style={{ marginTop: 6 }}>
              Note: This inward will have <b>only one Store</b> and <b>only one Bill file</b> (optional).
            </div>
          </div>
        </section>

        <div className="ai-divider" />

        <section className="ai-section">
          <div className="ai-sectionHead">
            <div>
              <div className="ai-h2">Bill File (Optional)</div>
              <div className="ai-muted">One image/PDF for complete inward entry (not per material).</div>
            </div>
          </div>

          <div className="ai-fileBox">
            <input
              key={billKey}
              className="ai-fileInput"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => onBillSelected(e.target.files?.[0] || null)}
            />

            <div className="ai-fileMeta">
              <div className={`ai-pill ${billFile ? "ai-pill--ok" : "ai-pill--wait"}`}>
                {billFile ? "Selected" : "No file"}
              </div>

              <div className="ai-hint">
                {billPreviewName ? (
                  <>
                    Selected: <span className="ai-mono">{billPreviewName}</span>
                  </>
                ) : (
                  <>Choose a single bill file (optional).</>
                )}
              </div>

              {billFile && (
                <button
                  type="button"
                  className="ai-btn ai-btn--danger ai-btn--small ai-ripple"
                  onPointerDown={setRipplePoint}
                  onClick={removeBill}
                >
                  Remove Bill File
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="ai-divider" />

        <section className="ai-section">
          <div className="ai-sectionHead">
            <div>
              <div className="ai-h2">Materials</div>
              <div className="ai-muted">
                <b>a)</b> Material Use is <b>mandatory</b>. <b>b/c/...</b> Material Use is <b>optional</b>.
              </div>
            </div>

            <button
              type="button"
              className="ai-btn ai-btn--ghost ai-ripple"
              onPointerDown={setRipplePoint}
              onClick={addItemRow}
            >
              + Add Material
            </button>
          </div>

          <div className="ai-items">
            {items.map((it, idx) => {
              const letter = String.fromCharCode(97 + idx);
              const isA = idx === 0;

              return (
                <div className="ai-itemRow" key={idx}>
                  <div className="ai-itemBadge">{letter})</div>

                  <div className="ai-itemGrid">
                    <div className="ai-field">
                      <label>
                        Material <span className="ai-req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Cement"
                        value={it.material}
                        onChange={(e) => updateItem(idx, { material: e.target.value })}
                      />
                    </div>

                    <div className="ai-field">
                      <label>Quantity (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 10"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      />
                    </div>

                    <div className="ai-field">
                      <label>Qty Type (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., Bag / Kg / Nos"
                        value={it.quantity_type}
                        onChange={(e) => updateItem(idx, { quantity_type: e.target.value })}
                      />
                    </div>

                    <div className="ai-field ai-spanAll">
                      <label>
                        Material Use{" "}
                        {isA ? <span className="ai-req">*</span> : <span className="ai-opt">(Optional)</span>}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={isA ? "Write full usage details (required for a)" : "Usage details (optional for b/c/...) "}
                        value={it.material_use}
                        onChange={(e) => updateItem(idx, { material_use: e.target.value })}
                      />
                    </div>

                    <div className="ai-rowActions">
                      <button
                        type="button"
                        className="ai-btn ai-btn--danger ai-ripple"
                        onPointerDown={setRipplePoint}
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                      >
                        Remove Row
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="ai-divider" />

        <section className="ai-section ai-actions">
          <button
            type="button"
            className="ai-btn ai-btn--ghost ai-ripple"
            onPointerDown={setRipplePoint}
            onClick={resetForm}
            disabled={saving}
          >
            Clear
          </button>

          <button
            type="submit"
            className="ai-btn ai-btn--primary ai-ripple"
            onPointerDown={setRipplePoint}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Inward"}
          </button>
        </section>
      </form>

      {portalTarget &&
        createPortal(
          overlay.open ? (
            <div className="ai-overlay" role="status" aria-live="polite">
              <div className="ai-overlayCard">
                <div className="ai-spinner" />
                <div className="ai-overlayText">{overlay.text}</div>
                <div className="ai-overlaySub">Please wait…</div>
              </div>
            </div>
          ) : null,
          portalTarget
        )}

      {portalTarget &&
        createPortal(
          modal.open ? (
            <div className="ai-modalOverlay" role="dialog" aria-modal="true" onClick={closeModal}>
              <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                <div className={`ai-modalTop ai-modalTop--${modal.type}`}>
                  <div className="ai-modalTitle">{modal.title}</div>
                </div>
                <div className="ai-modalBody">
                  <pre className="ai-modalMsg">{modal.message}</pre>
                </div>
                <div className="ai-modalActions">
                  <button
                    className="ai-btn ai-btn--primary ai-ripple"
                    onPointerDown={setRipplePoint}
                    type="button"
                    onClick={closeModal}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          ) : null,
          portalTarget
        )}

      <style>{css}</style>
    </div>
  );
}

const css = `
.ai-page{min-height:100vh;width:100%;background:#f5f7fb;margin:0;padding:0;display:flex;flex-direction:column;}
.ai-topbar{width:100%;background:#0b1220;color:#fff;padding:14px 14px;box-sizing:border-box;}
.ai-topbar__title{font-size:18px;font-weight:900;}
.ai-whiteSection{width:100%;background:#fff;border-bottom:1px solid rgba(0,0,0,0.08);padding:12px;box-sizing:border-box;}
.ai-field label{display:block;font-size:12px;font-weight:900;color:#111827;margin-bottom:6px;}
.ai-field input,.ai-field textarea{
  width:100%;box-sizing:border-box;border:1px solid rgba(0,0,0,0.15);
  border-radius:12px;padding:10px 10px;font-size:14px;outline:none;background:#fff;
}
.ai-field textarea{resize:vertical;}
.ai-req{color:#ef4444;margin-left:6px;font-weight:900;}
.ai-opt{color:#6b7280;margin-left:6px;font-weight:800;}
.ai-dateWrapWhite{position:relative;display:flex;align-items:center;width:100%;}
.ai-dateInputWhite{
  width:100%;max-width:260px;border:1px solid rgba(0,0,0,0.15);
  border-radius:12px;padding:10px 42px 10px 10px;font-size:14px;outline:none;background:#fff;color:#111827;
}
.ai-dateIconWhite{position:absolute;right:7px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:16px;opacity:0.9;}
.ai-card{width:100%;margin:0;padding:0;background:#fff;box-sizing:border-box;}
.ai-section{padding:12px;box-sizing:border-box;}
.ai-divider{height:1px;background:rgba(0,0,0,0.08);width:100%;}
.ai-h2{font-size:16px;font-weight:900;color:#0b1220;}
.ai-muted{font-size:12px;color:#6b7280;margin-top:4px;}
.ai-hint{font-size:12px;color:#6b7280;margin-top:6px;}
.ai-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;word-break:break-all;}
.ai-sectionHead{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;}
.ai-items{margin-top:12px;display:flex;flex-direction:column;gap:12px;}
.ai-itemRow{display:flex;gap:10px;width:100%;background:#f9fafb;border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:10px;box-sizing:border-box;}
.ai-itemBadge{min-width:30px;height:30px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#0b1220;color:#fff;font-weight:900;}
.ai-itemGrid{flex:1;display:grid;grid-template-columns:1fr;gap:10px;}
.ai-spanAll{grid-column:1 / -1;}
.ai-rowActions{grid-column:1 / -1;display:flex;justify-content:flex-end;gap:10px;}
.ai-fileBox{width:100%;display:flex;flex-direction:column;gap:10px;padding:12px;border:1px dashed rgba(0,0,0,0.22);border-radius:12px;background:#fff;box-sizing:border-box;}
.ai-fileInput{width:100%;border:1px solid rgba(0,0,0,0.15);border-radius:12px;padding:8px;background:#fff;}
.ai-fileMeta{display:flex;flex-direction:column;gap:8px;}
.ai-pill{width:fit-content;font-size:12px;padding:6px 10px;border-radius:999px;font-weight:900;}
.ai-pill--ok{background:rgba(16,185,129,0.15);color:#065f46;}
.ai-pill--wait{background:rgba(234,179,8,0.15);color:#7c5d00;}
.ai-btn{border:0;border-radius:12px;padding:10px 12px;font-weight:900;cursor:pointer;font-size:14px;user-select:none;transition: transform .08s ease, filter .15s ease, opacity .15s ease;position:relative; overflow:hidden;}
.ai-btn:disabled{opacity:0.6;cursor:not-allowed;}
.ai-btn:active{transform:scale(0.97);}
.ai-btn:focus-visible{outline:3px solid rgba(59,130,246,0.5); outline-offset:2px;}
.ai-btn--primary{background:#0b1220;color:#fff;}
.ai-btn--ghost{background:rgba(11,18,32,0.08);color:#0b1220;}
.ai-btn--danger{background:rgba(220,38,38,0.12);color:#b91c1c;}
.ai-btn--small{padding:9px 12px;font-size:13px;border-radius:12px;}
.ai-actions{display:flex;gap:10px;justify-content:space-between;}
.ai-ripple::after{content:"";position:absolute;inset:0;background: radial-gradient(circle at var(--rx, 50%) var(--ry, 50%), rgba(255,255,255,0.45), transparent 45%);opacity:0;transition: opacity .25s ease;}
.ai-ripple:active::after{opacity:1;}
@media (min-width:900px){.ai-itemGrid{grid-template-columns:1.2fr 0.6fr 0.6fr;align-items:start;}.ai-spanAll{grid-column:1 / -1;}}
.ai-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:999999;}
.ai-overlayCard{width:100%;max-width:360px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,0.25);padding:18px;display:flex;flex-direction:column;align-items:center;gap:10px;}
.ai-spinner{width:42px;height:42px;border-radius:999px;border:4px solid rgba(11,18,32,0.18);border-top-color:#0b1220;animation:aiSpin 0.9s linear infinite;}
@keyframes aiSpin{to{transform:rotate(360deg);}}
.ai-overlayText{font-weight:900;color:#0b1220;font-size:16px;text-align:center;}
.ai-overlaySub{font-size:12px;color:#6b7280;text-align:center;}
.ai-modalOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:1000000;}
.ai-modal{width:100%;max-width:520px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);}
.ai-modalTop{padding:14px 16px;}
.ai-modalTop--success{background:rgba(16,185,129,0.15);}
.ai-modalTop--error{background:rgba(239,68,68,0.15);}
.ai-modalTop--info{background:rgba(59,130,246,0.15);}
.ai-modalTitle{font-weight:900;color:#0b1220;font-size:16px;}
.ai-modalBody{padding:14px 16px;}
.ai-modalMsg{margin:0;white-space:pre-wrap;word-break:break-word;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;color:#111827;line-height:1.4;}
.ai-modalActions{padding:12px 16px 16px;display:flex;justify-content:flex-end;gap:10px;}
`;
