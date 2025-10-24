import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_CATEGORY = "https://express-backend-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY = "https://express-backend-myapp.onrender.com/api/investment_subcategory";

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
  }, []);

  /* ---------- helpers ---------- */
  const toast = (msg, type = "success") => {
    setPopup({ show: true, type, msg });
    setTimeout(() => setPopup({ show: false, type: "success", msg: "" }), 1800);
  };
  const ask = (msg, onYes) => setConfirm({ show: true, msg, onYes });

  /* ---------- Category ---------- */
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

  /* ---------- Subcategory ---------- */
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

  /* ---------- UI ---------- */
  return (
    <div className="container-fluid py-3" style={{ minHeight: "100vh", background: palette.bg }}>
      <div className="container">
        {/* Header */}
        <div className="text-center mb-4">
          <h2
            className="fw-bolder mb-2"
            style={{
              background: `linear-gradient(90deg, ${palette.primary}, ${palette.primary2})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: ".3px",
            }}
          >
            Investment Category Manager
          </h2>
          <p className="text-muted m-0 small">Organize your categories and subcategories effortlessly.</p>
        </div>

        {/* Toolbar */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3 justify-content-between">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="badge text-bg-light border">Categories: <b>{categories.length}</b></span>
            <span className="badge text-bg-light border">Subcategories: <b>{subcategories.length}</b></span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <label className="small text-muted">Filter Subcategories</label>
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 220 }}
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
          </div>
        </div>

        {/* Forms */}
        <div className="row g-3">
          {/* Category Form */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3">{editingCatId ? "Edit Category" : "Add Category"}</h5>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    name="category_name"
                    className="form-control"
                    value={formCat.category_name}
                    onChange={handleCatChange}
                    placeholder="Category name"
                  />
                  <button className="btn btn-primary" onClick={saveCategory}>
                    {editingCatId ? "Update" : "Add"}
                  </button>
                  {editingCatId && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setEditingCatId(null);
                        setFormCat({ category_name: "" });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <small className="text-muted">Examples: Equity, F&O, Crypto, Mutual Funds…</small>
              </div>
            </div>
          </div>

          {/* Subcategory Form */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3">{editingSubId ? "Edit Subcategory" : "Add Subcategory"}</h5>
                <div className="row g-2">
                  <div className="col-12 col-sm-5">
                    <select
                      name="category_id"
                      className="form-select"
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
                  </div>
                  <div className="col-12 col-sm-7">
                    <div className="input-group">
                      <input
                        type="text"
                        name="subcategory_name"
                        className="form-control"
                        value={formSub.subcategory_name}
                        onChange={handleSubChange}
                        placeholder="Subcategory name"
                      />
                      <button className="btn btn-primary" onClick={saveSubcategory}>
                        {editingSubId ? "Update" : "Add"}
                      </button>
                      {editingSubId && (
                        <button className="btn btn-outline-secondary" onClick={startAddSub}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <small className="text-muted">Examples: NIFTY50, BANKNIFTY, SIP, Intraday…</small>
              </div>
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="row g-3 mt-1">
          {/* Category List */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 d-flex justify-content-between">
                <h6 className="fw-bold m-0">Categories</h6>
                {loading.cats && <span className="spinner-border spinner-border-sm text-primary" />}
              </div>
              <div className="card-body pt-0">
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c, i) => (
                        <tr key={c.category_id}>
                          <td>{i + 1}</td>
                          <td className="fw-semibold">{c.category_name}</td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary" onClick={() => editCategory(c)}>
                                Edit
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => deleteCategory(c.category_id, c.category_name)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan="3" className="text-center text-muted py-3">
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Subcategory List */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 d-flex justify-content-between">
                <h6 className="fw-bold m-0">
                  {selectedCategoryId
                    ? `Subcategories • ${
                        categories.find((c) => String(c.category_id) === String(selectedCategoryId))
                          ?.category_name || ""
                      }`
                    : "Subcategories"}
                </h6>
                {loading.subs && <span className="spinner-border spinner-border-sm text-primary" />}
              </div>
              <div className="card-body pt-0">
                {!selectedCategoryId ? (
                  <div className="text-center text-muted py-4">
                    <p className="mb-2">Select a category to view its subcategories.</p>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    >
                      Choose Category ↑
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Subcategory</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubcategories.map((s, i) => (
                          <tr key={s.subcategory_id}>
                            <td>{i + 1}</td>
                            <td className="fw-semibold">{s.subcategory_name}</td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-primary" onClick={() => editSub(s)}>
                                  Edit
                                </button>
                                <button className="btn btn-outline-danger" onClick={() => deleteSub(s)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredSubcategories.length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center text-muted py-3">
                              No subcategories yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toast Popup */}
        {popup.show && (
          <div
            className="position-fixed top-50 start-50 translate-middle p-3 rounded-4 shadow"
            style={{
              zIndex: 2000,
              minWidth: 300,
              textAlign: "center",
              color: "#fff",
              background:
                popup.type === "success"
                  ? `linear-gradient(135deg, ${palette.success}, ${palette.accent})`
                  : `linear-gradient(135deg, ${palette.danger}, #ff6b6b)`,
              fontWeight: 700,
              animation: "fadeInOut 2s",
            }}
          >
            {popup.msg}
          </div>
        )}

        {/* Confirm Modal */}
        {confirm.show && (
          <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div
                  className="modal-header text-white"
                  style={{
                    background: `linear-gradient(90deg, ${palette.primary2}, ${palette.primary})`,
                  }}
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
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setConfirm({ show: false, msg: "", onYes: null })}
                  >
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
          /* RESPONSIVE STYLES */
          @media(max-width:992px){
            .row.g-3>[class*='col-']{flex:0 0 100%;max-width:100%;}
            .table{font-size:.9rem;}
            .form-select-sm, .form-control, .input-group button{width:100%!important;}
            .btn-group-sm{flex-wrap:wrap;gap:6px;}
          }
          @media(max-width:576px){
            h2.fw-bolder{font-size:1.4rem;}
            .badge{font-size:.75rem;}
            .container-fluid{padding:10px;}
          }
        `}</style>
      </div>
    </div>
  );
}
