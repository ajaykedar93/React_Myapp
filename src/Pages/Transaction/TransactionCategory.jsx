// src/pages/TransactionCategory.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Use your app's full API base URL
const API_BASE = "http://localhost:5000/api/transaction-category";

// Validators
const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export default function TransactionCategory() {
  // Categories state
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");

  // Category form (create/edit)
  const [catForm, setCatForm] = useState({ category_name: "", category_color: "#000000" });
  const [editCatId, setEditCatId] = useState(null);

  // Selected category for subcategories
  const [selectedCatId, setSelectedCatId] = useState("");
  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.category_id) === String(selectedCatId)) || null,
    [selectedCatId, categories]
  );

  // Subcategories
  const [subcats, setSubcats] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subForm, setSubForm] = useState({ subcategory_name: "" });
  const [editSubId, setEditSubId] = useState(null);

  // Available category colors (optional endpoint)
  const [palette, setPalette] = useState([]);

  // Color filter (NEW)
  const [colorFilter, setColorFilter] = useState(""); // "#RRGGBB" or ""

  // UI feedback (center popup)
  const [popup, setPopup] = useState({ show: false, kind: "success", title: "", msg: "" });

  // Delete confirm dialog
  const [confirm, setConfirm] = useState({ show: false, title: "", onOk: null });

  // prevent double submit
  const busyRef = useRef(false);

  // ───────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────
  const showPopup = (kind, title, msg, ms = 1600) => {
    setPopup({ show: true, kind, title, msg });
    window.clearTimeout(showPopup._t || 0);
    showPopup._t = window.setTimeout(() => setPopup({ show: false, kind, title: "", msg: "" }), ms);
  };

  const resetCatForm = () => {
    setCatForm({ category_name: "", category_color: "#000000" });
    setEditCatId(null);
  };

  const resetSubForm = () => {
    setSubForm({ subcategory_name: "" });
    setEditSubId(null);
  };

  const fetchCategories = async () => {
    try {
      setCatLoading(true);
      setCatError("");
      const params = {};
      if (colorFilter && HEX_RE.test(colorFilter)) params.color = colorFilter.toUpperCase();
      const { data } = await axios.get(`${API_BASE}/categories`, { params });
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCatError("Failed to load categories.");
    } finally {
      setCatLoading(false);
    }
  };

  const fetchPalette = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/colors`);
      if (Array.isArray(data)) setPalette(data.filter((c) => HEX_RE.test(c)).map((c) => c.toUpperCase()));
    } catch {
      // Optional; ignore if missing
    }
  };

  const fetchSubcategories = async (catId) => {
    if (!catId) {
      setSubcats([]);
      return;
    }
    try {
      setSubLoading(true);
      const { data } = await axios.get(`${API_BASE}/categories/${catId}/subcategories`);
      setSubcats(Array.isArray(data) ? data : []);
    } catch {
      showPopup("error", "Subcategories", "Failed to load subcategories.");
      setSubcats([]);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchPalette();
  }, []);

  // Re-fetch whenever the color filter changes
  useEffect(() => {
    fetchCategories();
    // Reset selection when the list potentially changes
    setSelectedCatId("");
    setSubcats([]);
  }, [colorFilter]);

  useEffect(() => {
    fetchSubcategories(selectedCatId);
  }, [selectedCatId]);

  // ───────────────────────────────────────────────────────────
  // Category actions
  // ───────────────────────────────────────────────────────────
  const saveCategory = async () => {
    if (busyRef.current) return;
    const name = (catForm.category_name || "").trim();
    const color = (catForm.category_color || "").trim();

    if (!name) return showPopup("error", "Category", "Category name is required.");
    if (!HEX_RE.test(color)) return showPopup("error", "Category", "Color must be HEX like #RRGGBB.");

    try {
      busyRef.current = true;
      if (editCatId) {
        const { data } = await axios.put(`${API_BASE}/categories/${editCatId}`, {
          category_name: name,
          category_color: color.toUpperCase(),
        });
        setCategories((prev) => prev.map((c) => (c.category_id === data.category_id ? data : c)));
        showPopup("success", "Updated", "Category updated successfully.");
      } else {
        const { data } = await axios.post(`${API_BASE}/categories`, {
          category_name: name,
          category_color: color.toUpperCase(),
        });
        // Respect current filter: show it if it matches filter or if no filter
        setCategories((prev) => {
          const next = (!colorFilter || color.toUpperCase() === colorFilter.toUpperCase())
            ? [...prev, data]
            : prev;
          return next.sort((a, b) => a.category_name.localeCompare(b.category_name));
        });
        showPopup("success", "Added", "Category added successfully.");
      }
      resetCatForm();
      fetchPalette(); // refresh palette when colors change
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to save category.";
      showPopup("error", "Category", msg);
    } finally {
      busyRef.current = false;
    }
  };

  const startEditCategory = (cat) => {
    setEditCatId(cat.category_id);
    setCatForm({
      category_name: cat.category_name,
      category_color: cat.category_color || "#000000",
    });
  };

  const askDeleteCategory = (cat) => {
    setConfirm({
      show: true,
      title: `Delete category “${cat.category_name}”? This will also remove its subcategories.`,
      onOk: async () => {
        try {
          await axios.delete(`${API_BASE}/categories/${cat.category_id}`);
          setCategories((prev) => prev.filter((c) => c.category_id !== cat.category_id));
          if (String(cat.category_id) === String(selectedCatId)) {
            setSelectedCatId("");
            setSubcats([]);
          }
          showPopup("success", "Deleted", "Category deleted successfully.");
          fetchPalette();
        } catch (e) {
          const msg = e?.response?.data?.error || "Failed to delete category.";
          showPopup("error", "Category", msg);
        }
      },
    });
  };

  // ───────────────────────────────────────────────────────────
  // Subcategory actions
  // ───────────────────────────────────────────────────────────
  const saveSubcategory = async () => {
    if (busyRef.current) return;
    if (!selectedCatId) return showPopup("error", "Subcategory", "Choose a category first.");
    const name = (subForm.subcategory_name || "").trim();
    if (!name) return showPopup("error", "Subcategory", "Subcategory name is required.");

    try {
      busyRef.current = true;
      if (editSubId) {
        const { data } = await axios.put(`${API_BASE}/subcategories/${editSubId}`, {
          subcategory_name: name,
          category_id: selectedCatId,
        });
        setSubcats((prev) => prev.map((s) => (s.subcategory_id === data.subcategory_id ? data : s)));
        showPopup("success", "Updated", "Subcategory updated successfully.");
      } else {
        const { data } = await axios.post(`${API_BASE}/subcategories`, {
          subcategory_name: name,
          category_id: selectedCatId,
        });
        setSubcats((prev) =>
          [...prev, data].sort((a, b) => a.subcategory_name.localeCompare(b.subcategory_name))
        );
        showPopup("success", "Added", "Subcategory added successfully.");
      }
      resetSubForm();
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to save subcategory.";
      showPopup("error", "Subcategory", msg);
    } finally {
      busyRef.current = false;
    }
  };

  const startEditSub = (sub) => {
    setEditSubId(sub.subcategory_id);
    setSubForm({ subcategory_name: sub.subcategory_name });
  };

  const askDeleteSub = (sub) => {
    setConfirm({
      show: true,
      title: `Delete subcategory “${sub.subcategory_name}”?`,
      onOk: async () => {
        try {
          await axios.delete(`${API_BASE}/subcategories/${sub.subcategory_id}`);
          setSubcats((prev) => prev.filter((s) => s.subcategory_id !== sub.subcategory_id));
          showPopup("success", "Deleted", "Subcategory deleted successfully.");
        } catch (e) {
          const msg = e?.response?.data?.error || "Failed to delete subcategory.";
          showPopup("error", "Subcategory", msg);
        }
      },
    });
  };

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────
  return (
    <div className="container py-3 tc-root">
      <StyleBlock />

      {/* Header */}
      <div className="mb-3 text-center">
        <h3 className="tc-title mb-1">💳 Transaction Categories</h3>
        <p className="tc-sub mb-0">Create categories with colors and manage their subcategories.</p>
      </div>

      {/* Filter row */}
      <div className="tc-card p-3 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Filter by color:</span>
            <div className="d-flex flex-wrap gap-1">
              {palette.slice(0, 18).map((c) => {
                const active = colorFilter.toUpperCase() === c.toUpperCase();
                return (
                  <button
                    key={c}
                    type="button"
                    className={`chip-btn ${active ? "chip-active" : ""}`}
                    style={{ background: c }}
                    title={c}
                    onClick={() => setColorFilter(active ? "" : c.toUpperCase())}
                    aria-label={`Toggle color ${c}`}
                  />
                );
              })}
            </div>
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            {colorFilter && (
              <div className="d-flex align-items-center gap-2">
                <div className="color-chip" style={{ background: colorFilter }} />
                <code className="small text-muted">{colorFilter}</code>
              </div>
            )}
            <button className="btn-ghost" onClick={() => setColorFilter("")} disabled={!colorFilter}>
              Clear Filter
            </button>
            <button className="btn-ghost" onClick={fetchCategories} aria-label="Refresh categories">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Categories */}
        <div className="col-12 col-xl-6">
          <div className="tc-card p-3 h-100">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0 fw-bold">Categories</h5>
                <span className="badge rounded-pill bg-soft text-dark-600">
                  {catLoading ? "…" : categories.length}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                {palette.length > 0 && (
                  <div className="d-none d-md-flex align-items-center gap-2">
                    <span className="small text-muted">Pick color:</span>
                    <div className="d-flex flex-wrap gap-1">
                      {palette.slice(0, 10).map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="chip-btn"
                          style={{ background: c }}
                          title={c}
                          onClick={() => setCatForm((p) => ({ ...p, category_color: c }))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create/Edit form */}
            <div className="row g-2 mb-3">
              <div className="col-12">
                <label className="form-label mb-1">Category Name</label>
                <input
                  className="form-control"
                  placeholder="e.g., Office, Fuel, Groceries"
                  value={catForm.category_name}
                  onChange={(e) => setCatForm((p) => ({ ...p, category_name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveCategory()}
                  aria-label="Category name"
                />
              </div>
              <div className="col-6">
                <label className="form-label mb-1">Color (HEX)</label>
                <input
                  className={`form-control ${catForm.category_color && !HEX_RE.test(catForm.category_color) ? "is-invalid" : ""}`}
                  placeholder="#000000"
                  value={catForm.category_color}
                  onChange={(e) => setCatForm((p) => ({ ...p, category_color: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveCategory()}
                  aria-label="Category color hex"
                />
                <div className="invalid-feedback">Use HEX like #RRGGBB</div>
              </div>
              <div className="col-6 d-flex align-items-end">
                <div className="d-flex align-items-center gap-2 w-100">
                  <input
                    type="color"
                    className="form-control form-control-color flex-grow-0"
                    value={HEX_RE.test(catForm.category_color) ? catForm.category_color : "#000000"}
                    onChange={(e) => setCatForm((p) => ({ ...p, category_color: e.target.value }))}
                    title="Pick color"
                    aria-label="Pick color"
                  />
                  <div
                    className="color-chip"
                    style={{ background: HEX_RE.test(catForm.category_color) ? catForm.category_color : "#000000" }}
                  />
                  <div className="ms-auto d-flex gap-2">
                    {editCatId ? (
                      <>
                        <button className="btn-outline-ok" onClick={saveCategory} disabled={busyRef.current}>
                          Update
                        </button>
                        <button className="btn-ghost" onClick={resetCatForm} disabled={busyRef.current}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="btn-ink" onClick={saveCategory} disabled={busyRef.current}>
                        Add Category
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* List: readable & no cutoffs */}
            <div className="table-responsive">
              <table className="table align-middle table-readable">
                <thead>
                  <tr>
                    <th className="text-nowrap">#</th>
                    <th>Name</th>
                    <th>Color</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catLoading ? (
                    <tr><td colSpan={4}>Loading...</td></tr>
                  ) : catError ? (
                    <tr><td colSpan={4} className="text-danger">{catError}</td></tr>
                  ) : categories.length === 0 ? (
                    <tr><td colSpan={4} className="text-muted">No categories found.</td></tr>
                  ) : (
                    categories.map((c, idx) => (
                      <tr
                        key={c.category_id}
                        className={String(selectedCatId) === String(c.category_id) ? "row-active" : ""}
                      >
                        <td>{idx + 1}</td>
                        <td className="fw-semibold text-wrap">{c.category_name}</td>
                        <td>
                          <div className="d-inline-flex align-items-center gap-2">
                            <button
                              className="color-chip btn-as-chip"
                              style={{ background: c.category_color }}
                              title={`Filter by ${c.category_color}`}
                              onClick={() =>
                                setColorFilter((prev) =>
                                  prev.toUpperCase() === (c.category_color || "").toUpperCase()
                                    ? ""
                                    : (c.category_color || "").toUpperCase()
                                )
                              }
                            />
                            <code className="small text-muted">{c.category_color}</code>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex flex-wrap gap-2">
                            <button className="btn-ghost" onClick={() => startEditCategory(c)} disabled={busyRef.current}>
                              Edit
                            </button>
                            <button className="btn-soft" onClick={() => askDeleteCategory(c)} disabled={busyRef.current}>
                              Delete
                            </button>
                            <button
                              className="btn-ink"
                              onClick={() => setSelectedCatId(String(c.category_id))}
                              title="Manage subcategories"
                              disabled={busyRef.current}
                            >
                              Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subcategories */}
        <div className="col-12 col-xl-6">
          <div className="tc-card p-3 h-100">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
              <h5 className="mb-0 fw-bold">Subcategories</h5>
              <div className="d-flex align-items-center gap-2 w-100 w-sm-auto">
                <select
                  className="form-select"
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  aria-label="Select category for subcategories"
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <div className="d-flex align-items-center gap-2">
                    <div className="color-chip" style={{ background: selectedCategory.category_color }} />
                    <span className="small text-muted">{selectedCategory.category_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="row g-2 mb-3">
              <div className="col-12">
                <label className="form-label mb-1">Subcategory Name</label>
                <input
                  className="form-control"
                  placeholder="e.g., Stationery, Diesel, Snacks"
                  value={subForm.subcategory_name}
                  onChange={(e) => setSubForm({ subcategory_name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && saveSubcategory()}
                  disabled={!selectedCatId}
                  aria-label="Subcategory name"
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                {editSubId ? (
                  <>
                    <button className="btn-outline-ok me-2" onClick={saveSubcategory} disabled={!selectedCatId || busyRef.current}>
                      Update
                    </button>
                    <button className="btn-ghost" onClick={resetSubForm} disabled={busyRef.current}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="btn-ink" onClick={saveSubcategory} disabled={!selectedCatId || busyRef.current}>
                    Add Subcategory
                  </button>
                )}
              </div>
            </div>

            {/* List: readable & no cutoffs */}
            <div className="table-responsive">
              <table className="table align-middle table-readable">
                <thead>
                  <tr>
                    <th className="text-nowrap">#</th>
                    <th>Name</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCatId ? (
                    subLoading ? (
                      <tr><td colSpan={3}>Loading...</td></tr>
                    ) : subcats.length === 0 ? (
                      <tr><td colSpan={3} className="text-muted">No subcategories found.</td></tr>
                    ) : (
                      subcats.map((s, idx) => (
                        <tr key={s.subcategory_id}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold text-wrap">{s.subcategory_name}</td>
                          <td className="text-end">
                            <div className="d-inline-flex flex-wrap gap-2">
                              <button className="btn-ghost" onClick={() => startEditSub(s)} disabled={busyRef.current}>
                                Edit
                              </button>
                              <button className="btn-soft" onClick={() => askDeleteSub(s)} disabled={busyRef.current}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr><td colSpan={3} className="text-muted">Choose a category to view subcategories.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Center Popup (success/error) */}
      {popup.show && (
        <div className="center-popup-backdrop" role="status" aria-live="polite">
          <div className={`center-popup ${popup.kind === "error" ? "cp-err" : "cp-ok"}`}>
            <div className="cp-icon">
              {popup.kind === "error" ? "⚠️" : "✅"}
            </div>
            <div className="cp-content">
              {popup.title && <div className="cp-title">{popup.title}</div>}
              <div className="cp-msg">{popup.msg}</div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm */}
      {confirm.show && (
        <div className="modal-backdrop-tc" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h6 className="fw-bold mb-2">Please Confirm</h6>
            <p className="mb-3" style={{ color: "var(--ink-700)" }}>{confirm.title}</p>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirm({ show: false, title: "", onOk: null })}>
                Cancel
              </button>
              <button
                className="btn-soft"
                onClick={async () => {
                  const ok = confirm.onOk;
                  setConfirm({ show: false, title: "", onOk: null });
                  if (typeof ok === "function") await ok();
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Style block: neutral base + modern violet primary & emerald success; no Bootstrap blue */
function StyleBlock() {
  return (
    <style>{`
      :root{
        --ink-900:#0f172a; --ink-800:#1f2937; --ink-700:#334155; --ink-600:#475569; --ink-500:#64748b;
        --bg:#f6f8fb; --surface:#ffffff; --border:#e6e9ef;
        --brand:#7c3aed; --brand-2:#a78bfa; --brand-3:#6d28d9;
        --ok:#16a34a; --warn:#f59e0b; --danger:#dc2626;
      }
      .tc-root{ background:var(--bg); min-height:100vh; }
      .tc-card{ background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:0 10px 28px rgba(2,6,23,.06); }
      .tc-title{ font-weight:900; letter-spacing:.3px; color:var(--ink-900); }
      .tc-sub{ color:var(--ink-600); }
      .text-dark-600{ color:var(--ink-600)!important; }
      .bg-soft{ background:#f3f4f6!important; }

      .btn-ink{ background:var(--brand); color:#fff; border:none; border-radius:12px; padding:9px 14px; font-weight:800; }
      .btn-ink:hover{ filter:brightness(.98); }
      .btn-ghost{ background:#f4f5f9; border:1px dashed #ccd3e3; color:var(--ink-700); border-radius:12px; padding:9px 14px; font-weight:800; }
      .btn-soft{ background:#fef2f2; color:var(--danger); border:1px solid #fecaca; border-radius:12px; padding:9px 14px; font-weight:800; }
      .btn-outline-ok{ border:1px solid #86efac; color:#065f46; background:#ecfdf5; border-radius:12px; padding:9px 14px; font-weight:800; }

      .form-control, .form-select{ border-radius:12px; border:1px solid var(--border); }
      .form-control:focus, .form-select:focus{ border-color:var(--brand-2); box-shadow:0 0 0 3px rgba(167,139,250,.25); }

      .color-chip{ width:28px; height:28px; border-radius:8px; border:1px solid var(--border); box-shadow:inset 0 0 0 1px rgba(255,255,255,.35); }
      .btn-as-chip{ border:none; padding:0; }

      .chip-btn{ width:18px; height:18px; border-radius:6px; border:1px solid #e5e7eb; box-shadow:inset 0 0 0 1px rgba(255,255,255,.45); }
      .chip-btn:hover{ transform: translateY(-1px); }
      .chip-active{ outline: 2px solid var(--brand-2); outline-offset: 1px; }

      .row-active{ background:#fafafa; }

      /* Readable tables: allow wrapping, bigger line-height */
      .table-readable td, .table-readable th{
        white-space: normal !important;
        word-break: break-word;
        line-height: 1.35;
        font-size: 0.95rem;
      }
      .table thead th{ white-space:nowrap; }
      .table td{ vertical-align:middle; }

      /* CENTER POPUP */
      .center-popup-backdrop{
        position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
        z-index:1080; pointer-events:none;
      }
      .center-popup{
        pointer-events:auto;
        min-width: 280px; max-width: 90vw;
        border-radius: 16px; padding: 14px 16px;
        border: 1px solid var(--border);
        background: #ffffff;
        box-shadow: 0 20px 50px rgba(15,23,42,.25);
        display:flex; gap:12px; align-items:center;
        animation: cp-pop .18s ease-out;
      }
      .cp-ok{ border-color:#bbf7d0; box-shadow: 0 20px 50px rgba(22,163,74,.18); }
      .cp-err{ border-color:#fecaca; box-shadow: 0 20px 50px rgba(220,38,38,.18); }
      .cp-icon{ font-size: 20px; }
      .cp-content{ display:flex; flex-direction:column; gap:2px; }
      .cp-title{ font-weight:800; color:var(--ink-800); }
      .cp-msg{ color:var(--ink-600); }

      @keyframes cp-pop{ from{ transform: translateY(8px) scale(.98); opacity:.8 } to{ transform: translateY(0); scale(1); opacity:1 } }

      /* Confirm modal */
      .modal-backdrop-tc{ position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; z-index:1070; padding:16px; }
      .modal-card{ background:#fff; border-radius:16px; border:1px solid var(--border); box-shadow:0 16px 36px rgba(0,0,0,.25); padding:16px; width:100%; max-width:480px; animation:slide .18s ease-out; }
      @keyframes slide{ from{ transform: translateY(-14px); opacity:.8; } to{ transform: translateY(0); opacity:1; } }

      /* Responsive tweaks */
      @media (max-width: 576px) {
        .btn-ink, .btn-ghost, .btn-soft, .btn-outline-ok{ padding:8px 12px; }
      }
    `}</style>
  );
}
