import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_CATEGORY =
  "https://express-backend-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY =
  "https://express-backend-myapp.onrender.com/api/investment_subcategory";

/* Elegant palette */
const palette = {
  ink: "#0f172a",
  bg: "#f7f8fc",
  card: "#ffffff",
  border: "#e6e9ef",
  primary: "#5b7cfa",
  primary2: "#7c5dfa",
  accent: "#00b3b3",
  success: "#10b981",
  danger: "#ef4444",
  warn: "#f59e0b",
  muted: "#6b7280",
  slate: "#334155",
  soft: "#f3f6ff",
};

export default function InvestmentCategoryManager() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [formCat, setFormCat] = useState({ category_name: "" });
  const [formSub, setFormSub] = useState({ category_id: "", subcategory_name: "" });
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);
  const [loading, setLoading] = useState({ cats: false, subs: false });
  const [confirm, setConfirm] = useState({ show: false, msg: "", onYes: null });
  const [popup, setPopup] = useState({ show: false, type: "success", msg: "" });

  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => String(s.category_id) === String(selectedCategoryId)),
    [subcategories, selectedCategoryId]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading((l) => ({ ...l, cats: true }));
        const res = await axios.get(API_CATEGORY);
        setCategories(res.data || []);
      } finally {
        setLoading((l) => ({ ...l, cats: false }));
      }
    })();

    (async () => {
      try {
        setLoading((l) => ({ ...l, subs: true }));
        const res = await axios.get(API_SUBCATEGORY);
        setSubcategories(res.data || []);
      } finally {
        setLoading((l) => ({ ...l, subs: false }));
      }
    })();
    // eslint-disable-next-line
  }, []);

  /* helpers */
  const toast = (msg, type = "success") => {
    setPopup({ show: true, type, msg });
    setTimeout(() => setPopup({ show: false, type: "success", msg: "" }), 1800);
  };
  const ask = (msg, onYes) => setConfirm({ show: true, msg, onYes });

  /* Category */
  const handleCatChange = (e) => setFormCat((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveCategory = async () => {
    if (!formCat.category_name.trim()) return toast("Category name required", "danger");
    try {
      if (editingCatId) {
        await axios.put(`${API_CATEGORY}/${editingCatId}`, { category_name: formCat.category_name.trim() });
        toast("Category updated");
      } else {
        await axios.post(API_CATEGORY, { category_name: formCat.category_name.trim() });
        toast("Category added");
      }
      setFormCat({ category_name: "" });
      setEditingCatId(null);
      const res = await axios.get(API_CATEGORY);
      setCategories(res.data || []);
    } catch (e) {
      toast(e?.response?.data?.error || "Error saving category", "danger");
    }
  };

  const editCategory = (c) => {
    setEditingCatId(c.category_id);
    setFormCat({ category_name: c.category_name });
  };

  const deleteCategory = (id, name) => {
    ask(`Delete category "${name}"? All related subcategories will also be removed.`, async () => {
      try {
        await axios.delete(`${API_CATEGORY}/${id}`);
        toast("Category deleted");
        const [rc, rs] = await Promise.all([axios.get(API_CATEGORY), axios.get(API_SUBCATEGORY)]);
        setCategories(rc.data || []);
        setSubcategories(rs.data || []);
        if (String(selectedCategoryId) === String(id)) setSelectedCategoryId("");
      } catch {
        toast("Failed to delete category", "danger");
      } finally {
        setConfirm({ show: false, msg: "", onYes: null });
      }
    });
  };

  /* Subcategory */
  const handleSubChange = (e) => {
    const { name, value } = e.target;
    setFormSub((f) => ({ ...f, [name]: value }));
  };

  const startAddSub = () => {
    setEditingSubId(null);
    setFormSub({ category_id: selectedCategoryId || "", subcategory_name: "" });
  };

  const saveSubcategory = async () => {
    if (!formSub.category_id || !formSub.subcategory_name.trim())
      return toast("Select category & enter subcategory name", "danger");

    try {
      if (editingSubId) {
        await axios.put(`${API_SUBCATEGORY}/${editingSubId}`, {
          category_id: Number(formSub.category_id),
          subcategory_name: formSub.subcategory_name.trim(),
        });
        toast("Subcategory updated");
      } else {
        await axios.post(API_SUBCATEGORY, {
          category_id: Number(formSub.category_id),
          subcategory_name: formSub.subcategory_name.trim(),
        });
        toast("Subcategory added");
      }
      setEditingSubId(null);
      setFormSub({ category_id: selectedCategoryId, subcategory_name: "" });
      const res = await axios.get(API_SUBCATEGORY);
      setSubcategories(res.data || []);
    } catch (e) {
      toast(e?.response?.data?.error || "Error saving subcategory", "danger");
    }
  };

  const editSub = (row) => {
    setEditingSubId(row.subcategory_id);
    setFormSub({ category_id: row.category_id, subcategory_name: row.subcategory_name });
  };

  const deleteSub = (row) => {
    ask(`Delete subcategory "${row.subcategory_name}"?`, async () => {
      try {
        await axios.delete(`${API_SUBCATEGORY}/${row.subcategory_id}`);
        toast("Subcategory deleted");
        const res = await axios.get(API_SUBCATEGORY);
        setSubcategories(res.data || []);
      } catch {
        toast("Failed to delete subcategory", "danger");
      } finally {
        setConfirm({ show: false, msg: "", onYes: null });
      }
    });
  };

  const selectedCategoryName =
    categories.find((c) => String(c.category_id) === String(selectedCategoryId))?.category_name || "";

  return (
    <div className="icm-page">
      {/* Hero */}
      <div className="icm-hero">
        <div className="icm-hero-inner">
          <div className="icm-hero-left">
            <div className="icm-title">Investment Category Manager</div>
            <div className="icm-subtitle">
              Clean, modern & mobile-perfect category + subcategory management.
            </div>

            <div className="icm-stats-sm">
              <span className="icm-pill">
                Categories <b>{categories.length}</b>
              </span>
              <span className="icm-pill">
                Subcategories <b>{subcategories.length}</b>
              </span>
            </div>
          </div>

          <div className="icm-hero-right">
            <div className="icm-filter-card">
              <div className="icm-filter-title">Filter Subcategories</div>
              <select
                className="form-select form-select-sm icm-select"
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setFormSub((f) => ({ ...f, category_id: e.target.value || "" }));
                }}
              >
                <option value="">Select Category…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>

              <div className="icm-filter-hint">
                {selectedCategoryId ? (
                  <>
                    Showing subcategories of <span className="icm-chip">{selectedCategoryName}</span>
                  </>
                ) : (
                  "Tip: Choose a category to see only its subcategories."
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="icm-shell">
        <div className="icm-grid">
          {/* Category Form */}
          <div className="icm-card">
            <div className="icm-card-head">
              <div className="icm-card-title">{editingCatId ? "Edit Category" : "Add Category"}</div>
              {loading.cats ? <span className="spinner-border spinner-border-sm text-primary" /> : null}
            </div>

            <div className="icm-card-body">
              <div className="icm-field-row">
                <input
                  type="text"
                  name="category_name"
                  className="form-control icm-input"
                  value={formCat.category_name}
                  onChange={handleCatChange}
                  placeholder="Category name"
                />

                <div className="icm-actions">
                  <button className="btn icm-sbtn icm-sbtn-add" onClick={saveCategory}>
                    {editingCatId ? "Update" : "Add"}
                  </button>

                  {editingCatId && (
                    <button
                      className="btn icm-sbtn icm-sbtn-cancel"
                      onClick={() => {
                        setEditingCatId(null);
                        setFormCat({ category_name: "" });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="icm-hint">Examples: Equity, F&amp;O, Crypto, Mutual Funds…</div>
            </div>
          </div>

          {/* Subcategory Form */}
          <div className="icm-card">
            <div className="icm-card-head">
              <div className="icm-card-title">{editingSubId ? "Edit Subcategory" : "Add Subcategory"}</div>
              {loading.subs ? <span className="spinner-border spinner-border-sm text-primary" /> : null}
            </div>

            <div className="icm-card-body">
              <div className="icm-field-grid">
                <select
                  name="category_id"
                  className="form-select icm-select"
                  value={formSub.category_id}
                  onChange={handleSubChange}
                >
                  <option value="">Select Category…</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  name="subcategory_name"
                  className="form-control icm-input"
                  value={formSub.subcategory_name}
                  onChange={handleSubChange}
                  placeholder="Subcategory name"
                />

                <div className="icm-actions">
                  <button className="btn icm-sbtn icm-sbtn-add2" onClick={saveSubcategory}>
                    {editingSubId ? "Update" : "Add"}
                  </button>

                  {editingSubId && (
                    <button className="btn icm-sbtn icm-sbtn-cancel" onClick={startAddSub}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="icm-hint">Examples: NIFTY50, BANKNIFTY, SIP, Intraday…</div>
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="icm-grid icm-grid-2">
          {/* Categories */}
          <div className="icm-card">
            <div className="icm-card-head">
              <div className="icm-card-title">Categories</div>
            </div>

            <div className="icm-card-body icm-tablewrap">
              <table className="table align-middle icm-table mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Name</th>
                    <th className="text-end" style={{ width: 190 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-4">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map((c, i) => (
                      <tr key={c.category_id}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="fw-semibold">{c.category_name}</td>
                        <td className="text-end">
                          <div className="icm-mini-actions">
                            <button className="btn btn-sm icm-mini icm-mini-edit" onClick={() => editCategory(c)}>
                              Edit
                            </button>
                            <button
                              className="btn btn-sm icm-mini icm-mini-del"
                              onClick={() => deleteCategory(c.category_id, c.category_name)}
                            >
                              Delete
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

          {/* Subcategories */}
          <div className="icm-card">
            <div className="icm-card-head">
              <div className="icm-card-title">
                {selectedCategoryId ? `Subcategories • ${selectedCategoryName}` : "Subcategories"}
              </div>
            </div>

            <div className="icm-card-body icm-tablewrap">
              {!selectedCategoryId ? (
                <div className="icm-empty">
                  <div className="icm-empty-title">Pick a Category</div>
                  <div className="icm-empty-sub">
                    Select a category from the top filter to view its subcategories.
                  </div>
                </div>
              ) : (
                <table className="table align-middle icm-table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th>Subcategory</th>
                      <th className="text-end" style={{ width: 190 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubcategories.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-4">
                          No subcategories yet.
                        </td>
                      </tr>
                    ) : (
                      filteredSubcategories.map((s, i) => (
                        <tr key={s.subcategory_id}>
                          <td className="text-muted">{i + 1}</td>
                          <td className="fw-semibold">{s.subcategory_name}</td>
                          <td className="text-end">
                            <div className="icm-mini-actions">
                              <button className="btn btn-sm icm-mini icm-mini-edit" onClick={() => editSub(s)}>
                                Edit
                              </button>
                              <button className="btn btn-sm icm-mini icm-mini-del" onClick={() => deleteSub(s)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {popup.show && (
        <div
          className="position-fixed top-50 start-50 translate-middle p-3 rounded-4 shadow"
          style={{
            zIndex: 2000,
            minWidth: 280,
            textAlign: "center",
            color: "#fff",
            background:
              popup.type === "success"
                ? `linear-gradient(135deg, ${palette.success}, ${palette.accent})`
                : `linear-gradient(135deg, ${palette.danger}, #ff6b6b)`,
            fontWeight: 800,
            animation: "fadeInOut 2s",
          }}
        >
          {popup.msg}
        </div>
      )}

      {/* Confirm */}
      {confirm.show && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg icm-modal">
              <div
                className="modal-header text-white"
                style={{ background: `linear-gradient(90deg, ${palette.primary2}, ${palette.primary})` }}
              >
                <h6 className="modal-title m-0">Please Confirm</h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setConfirm({ show: false, msg: "", onYes: null })}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0">{confirm.msg}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setConfirm({ show: false, msg: "", onYes: null })}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={() => confirm.onYes?.()}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {0%,100%{opacity:0}10%,90%{opacity:1}}

        /* ✅ full width on big screen (no "half page" feel) */
        .icm-shell{
          width: min(1240px, calc(100% - 24px));
          margin: 0 auto;
          padding: 14px 0 20px;
        }
        @media(min-width:992px){
          .icm-shell{ padding:18px 0 28px; }
        }

        .icm-page{ min-height:100vh; background:${palette.bg}; color:${palette.ink}; overflow-x:hidden; }

        .icm-hero{
          background:
            radial-gradient(800px 400px at 10% 10%, rgba(124,93,250,.25), transparent 50%),
            radial-gradient(700px 350px at 90% 30%, rgba(0,179,179,.18), transparent 55%),
            linear-gradient(135deg, rgba(91,124,250,.22), rgba(124,93,250,.12));
          border-bottom:1px solid ${palette.border};
        }
        .icm-hero-inner{
          width: min(1240px, calc(100% - 24px));
          margin: 0 auto;
          padding:18px 0;
          display:flex;
          gap:14px;
          flex-direction:column;
        }
        @media(min-width:992px){
          .icm-hero-inner{
            padding:26px 0;
            flex-direction:row;
            align-items:center;
            justify-content:space-between;
          }
        }

        .icm-title{
          font-weight:1000;
          font-size:1.25rem;
          letter-spacing:.2px;
          background: linear-gradient(90deg, ${palette.primary2}, ${palette.primary});
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }
        @media(min-width:992px){ .icm-title{ font-size:1.6rem; } }
        .icm-subtitle{ margin-top:6px; color:${palette.muted}; font-weight:650; font-size:.95rem; }

        .icm-stats-sm{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        .icm-pill{
          display:inline-flex; align-items:center; gap:6px;
          padding:6px 10px;
          border-radius:999px;
          background: rgba(255,255,255,.75);
          border:1px solid ${palette.border};
          box-shadow: 0 10px 22px rgba(15,23,42,.04);
          font-size:.82rem;
          color:${palette.slate};
          font-weight:800;
        }
        .icm-pill b{ font-weight:1000; color:${palette.ink}; }

        .icm-filter-card{
          background: rgba(255,255,255,.88);
          border: 1px solid ${palette.border};
          border-radius:18px;
          padding:12px;
          box-shadow: 0 14px 28px rgba(15,23,42,.06);
          width:100%;
        }
        @media(min-width:992px){ .icm-filter-card{ width:360px; } }
        .icm-filter-title{ font-weight:900; margin-bottom:8px; }
        .icm-filter-hint{ margin-top:8px; font-size:.8rem; color:${palette.muted}; font-weight:750; }
        .icm-chip{
          display:inline-block;
          padding:3px 8px;
          border-radius:999px;
          background:${palette.soft};
          border:1px solid ${palette.border};
          font-weight:900;
          color:${palette.slate};
        }

        .icm-grid{ display:grid; grid-template-columns:1fr; gap:14px; }
        @media(min-width:992px){ .icm-grid{ grid-template-columns:1fr 1fr; } }
        .icm-grid-2{ margin-top:14px; }

        .icm-card{
          background:${palette.card};
          border:1px solid ${palette.border};
          border-radius:18px;
          box-shadow: 0 12px 26px rgba(15,23,42,.06);
          overflow:hidden;
        }
        .icm-card-head{
          padding:12px 14px;
          border-bottom:1px solid ${palette.border};
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .icm-card-title{ font-weight:950; }
        .icm-card-body{ padding:14px; }

        .icm-input, .icm-select{
          border-radius:14px !important;
          border:1px solid ${palette.border} !important;
          box-shadow:none !important;
        }
        .icm-input:focus, .icm-select:focus{
          border-color: rgba(91,124,250,.6) !important;
          box-shadow: 0 0 0 .2rem rgba(91,124,250,.14) !important;
        }

        .icm-field-row{ display:flex; flex-direction:column; gap:10px; }
        @media(min-width:576px){ .icm-field-row{ flex-direction:row; align-items:center; } }
        .icm-field-row > .icm-input{ flex:1; }

        .icm-field-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
        @media(min-width:768px){ .icm-field-grid{ grid-template-columns:220px 1fr auto; align-items:center; } }

        .icm-actions{ display:flex; gap:8px; flex-wrap:wrap; }

        .icm-sbtn{
          border-radius:999px !important;
          font-weight:900 !important;
          padding:7px 12px !important;
          border:0 !important;
          font-size:.88rem !important;
          line-height:1 !important;
          box-shadow: 0 10px 18px rgba(15,23,42,.08);
          white-space:nowrap;
        }
        .icm-sbtn-add{ color:#fff !important; background: linear-gradient(135deg, ${palette.primary2}, ${palette.primary}) !important; }
        .icm-sbtn-add2{ color:#fff !important; background: linear-gradient(135deg, ${palette.accent}, ${palette.primary}) !important; }
        .icm-sbtn-cancel{
          background:#eef2ff !important;
          color:${palette.slate} !important;
          border:1px solid ${palette.border} !important;
          box-shadow:none !important;
        }

        .icm-hint{ margin-top:10px; font-size:.82rem; color:${palette.muted}; font-weight:700; }

        .icm-tablewrap{ padding:0; }
        .icm-table thead th{
          background:${palette.soft};
          border-bottom: 1px solid ${palette.border} !important;
          font-weight:900;
          color:#334155;
          position:sticky;
          top:0;
          z-index:1;
        }
        .icm-table td, .icm-table th{ padding:12px 14px; border-color:${palette.border} !important; }
        .icm-table tbody tr{ transition: background .15s ease; }
        .icm-table tbody tr:hover{ background: rgba(91,124,250,.06); }

        /* ✅ edit/delete SMALL always + EXTRA small on mobile */
        .icm-mini-actions{ display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
        .icm-mini{
          border-radius:999px !important;
          font-weight:900 !important;
          padding:6px 10px !important;
          border:0 !important;
          font-size:.82rem !important;
          line-height:1 !important;
        }
        .icm-mini-edit{ color:#fff !important; background: linear-gradient(135deg, ${palette.primary}, ${palette.primary2}) !important; }
        .icm-mini-del{ color:#fff !important; background: linear-gradient(135deg, ${palette.danger}, #ff6b6b) !important; }

        @media(max-width:576px){
          .icm-mini{ padding:5px 8px !important; font-size:.74rem !important; }
          .icm-mini-actions{ gap:6px; }
          .icm-card-body{ padding:12px; }
          .icm-table td, .icm-table th{ padding:10px 10px; }
        }

        .icm-empty{ padding:22px 14px; text-align:center; }
        .icm-empty-title{ font-weight:1000; font-size:1rem; }
        .icm-empty-sub{ margin-top:6px; color:${palette.muted}; font-weight:700; font-size:.9rem; }

        .icm-modal{ border-radius:18px; overflow:hidden; }
      `}</style>
    </div>
  );
}
