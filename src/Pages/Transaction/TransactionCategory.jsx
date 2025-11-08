import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "https://express-backend-myapp.onrender.com/api/transaction-category";

const TransactionCategory = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [subcats, setSubcats] = useState([]);
  const [newCat, setNewCat] = useState({ name: "", color: "#0284C7" });
  const [newSub, setNewSub] = useState("");
  const [popup, setPopup] = useState(null);

  // category edit/delete modals
  const [editOpen, setEditOpen] = useState(false);
  const [editModel, setEditModel] = useState({ id: null, name: "", color: "#0284C7" });
  const [editBusy, setEditBusy] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // subcategory edit/delete modals
  const [subEditOpen, setSubEditOpen] = useState(false);
  const [subEditModel, setSubEditModel] = useState({ id: null, name: "" });
  const [subEditBusy, setSubEditBusy] = useState(false);

  const [subConfirmOpen, setSubConfirmOpen] = useState(false);
  const [subDeletingId, setSubDeletingId] = useState(null);
  const [subDeleteBusy, setSubDeleteBusy] = useState(false);

  // flags
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addSubBusy, setAddSubBusy] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const showPopup = (type, msg) => {
    setPopup({ type, msg });
    setTimeout(() => setPopup(null), 1800);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/categories`);
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      showPopup("error", "Failed to load categories");
    } finally { setLoading(false); }
  };

  const fetchSubcategories = async (id) => {
    try {
      setSubLoading(true);
      const { data } = await axios.get(`${API_BASE}/categories/${id}/subcategories`);
      setSubcats(Array.isArray(data) ? data : []);
    } catch {
      setSubcats([]);
    } finally { setSubLoading(false); }
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) return showPopup("error", "Enter category name");
    try {
      setAddBusy(true);
      const { data } = await axios.post(`${API_BASE}/categories`, {
        category_name: newCat.name,
        category_color: newCat.color,
      });
      setCategories((prev) => [...prev, data]);
      setNewCat({ name: "", color: "#0284C7" });
      showPopup("success", "Category added");
    } catch {
      showPopup("error", "Failed to add category");
    } finally { setAddBusy(false); }
  };

  const addSubcategory = async () => {
    if (!selectedCat) return showPopup("error", "Select category first");
    if (!newSub.trim()) return showPopup("error", "Enter subcategory name");
    try {
      setAddSubBusy(true);
      const { data } = await axios.post(`${API_BASE}/subcategories`, {
        subcategory_name: newSub,
        category_id: selectedCat.category_id,
      });
      setSubcats((prev) => [...prev, data]);
      setNewSub("");
      showPopup("success", "Subcategory added");
    } catch {
      showPopup("error", "Failed to add subcategory");
    } finally { setAddSubBusy(false); }
  };

  // ===== Category: Edit =====
  const openEdit = (cat) => {
    setEditModel({
      id: cat.category_id,
      name: cat.category_name,
      color: cat.category_color || "#0284C7",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const { id, name, color } = editModel;
    if (!id) return;
    if (!name.trim()) return showPopup("error", "Enter category name");
    try {
      setEditBusy(true);
      const { data } = await axios.put(`${API_BASE}/categories/${id}`, {
        category_name: name.trim(),
        category_color: color,
      });
      setCategories((prev) => prev.map((c) => (c.category_id === id ? data : c)));
      if (selectedCat?.category_id === id) setSelectedCat(data);
      setEditOpen(false);
      showPopup("success", "Category updated");
    } catch {
      showPopup("error", "Failed to update category");
    } finally { setEditBusy(false); }
  };

  // ===== Category: Delete =====
  const askDelete = (id) => { setDeletingId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setDeleteBusy(true);
      await axios.delete(`${API_BASE}/categories/${deletingId}`);
      setCategories((prev) => prev.filter((c) => c.category_id !== deletingId));
      if (selectedCat?.category_id === deletingId) { setSelectedCat(null); setSubcats([]); }
      showPopup("success", "Category deleted");
    } catch {
      showPopup("error", "Failed to delete category");
    } finally {
      setDeleteBusy(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  // ===== Subcategory: Edit =====
  const openSubEdit = (sub) => {
    setSubEditModel({ id: sub.subcategory_id, name: sub.subcategory_name });
    setSubEditOpen(true);
  };

  const saveSubEdit = async () => {
    const { id, name } = subEditModel;
    if (!id) return;
    if (!name.trim()) return showPopup("error", "Enter subcategory name");
    try {
      setSubEditBusy(true);
      const { data } = await axios.put(`${API_BASE}/subcategories/${id}`, {
        subcategory_name: name.trim(),
      });
      setSubcats((prev) => prev.map((s) => (s.subcategory_id === id ? data : s)));
      setSubEditOpen(false);
      showPopup("success", "Subcategory updated");
    } catch {
      showPopup("error", "Failed to update subcategory");
    } finally { setSubEditBusy(false); }
  };

  // ===== Subcategory: Delete =====
  const askSubDelete = (id) => { setSubDeletingId(id); setSubConfirmOpen(true); };

  const confirmSubDelete = async () => {
    if (!subDeletingId) return;
    try {
      setSubDeleteBusy(true);
      await axios.delete(`${API_BASE}/subcategories/${subDeletingId}`);
      setSubcats((prev) => prev.filter((s) => s.subcategory_id !== subDeletingId));
      showPopup("success", "Subcategory deleted");
    } catch {
      showPopup("error", "Failed to delete subcategory");
    } finally {
      setSubDeleteBusy(false);
      setSubConfirmOpen(false);
      setSubDeletingId(null);
    }
  };

  return (
    <div className="tc-wrap">
      <style>{`
        .tc-wrap { padding:14px; max-width:760px; margin:0 auto; }
        .tc-header { text-align:center; margin-bottom:16px; }
        .tc-header-title { font-weight:900; color:#0f172a; font-size:1.45rem; margin:0; }
        .tc-header-sub { color:#475569; font-size:.9rem; }

        .tc-card { background:#fff; border-radius:18px; padding:16px; border:1px solid #e2e8f0;
          box-shadow:0 6px 24px rgba(15,23,42,0.04); margin-bottom:16px; }

        .tc-field { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
        .tc-label { font-weight:700; color:#0f172a; font-size:.83rem; }
        .tc-input, .tc-color-input-text { border:1px solid #cbd5e1; border-radius:10px; padding:9px 11px;
          font-size:.9rem; outline:none; transition:.15s; width:100%; }
        .tc-input:focus, .tc-color-input-text:focus { border-color:#0ea5e9; box-shadow:0 0 0 2px rgba(14,165,233,.12); }

        .tc-btn { border:none; border-radius:10px; padding:10px 14px; font-weight:800; cursor:pointer; transition:.15s;
          display:inline-flex; justify-content:center; align-items:center; gap:6px; min-height:42px; }
        .tc-btn:disabled { opacity:.7; cursor:not-allowed; }
        .tc-btn-primary { background:linear-gradient(135deg,#06b6d4,#0ea5e9); color:#fff; width:100%; }
        .tc-btn-primary:hover { filter:brightness(.96); }
        .tc-btn-secondary { background:#e0f2fe; color:#075985; font-weight:700; padding:8px 12px; font-size:.8rem; }
        .tc-btn-outline { background:#fff; color:#0f172a; border:1px solid #cbd5e1; padding:8px 12px; font-size:.8rem; }
        .tc-btn-danger { background:linear-gradient(135deg,#ef4444,#f87171); color:#fff; padding:8px 12px; font-size:.8rem; }

        .tc-cat-list { display:flex; flex-direction:column; gap:10px; }
        .tc-cat-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:10px 12px;
          display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .tc-cat-left { display:flex; align-items:center; gap:10px; min-width:0; }
        .tc-color-dot { width:22px; height:22px; border-radius:8px; border:1px solid #94a3b8; flex:0 0 22px; }
        .tc-cat-name { font-weight:700; color:#0f172a; font-size:0.92rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; max-width:210px; }

        .tc-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
        .tc-actions .tc-btn { min-width:92px; }

        .tc-sub-list { background:#f1f5f9; padding:10px; border-radius:12px; margin-top:10px; }
        .tc-sub-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
        .tc-sub-item { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:8px 10px;
          color:#0f172a; font-weight:600; font-size:clamp(0.72rem,2.5vw,0.85rem); max-width:100%; }
        .tc-sub-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .tc-sub-actions .tc-btn { min-width:92px; }

        .tc-popup { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#fff; border-radius:12px;
          padding:10px 16px; box-shadow:0 6px 24px rgba(0,0,0,0.15); font-weight:700; z-index:9999; max-width:90%; text-align:center; }
        .tc-popup.success { color:#047857; border-left:4px solid #10b981; }
        .tc-popup.error   { color:#b91c1c; border-left:4px solid #ef4444; }

        /* Modal base */
        .modal-wrap { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:1000; padding:12px; }
        .modal-card { background:#fff; border-radius:14px; border:1px solid #e2e8f0; width:min(520px, 94vw); box-shadow:0 18px 48px rgba(15,23,42,.22); }
        .modal-head { padding:12px 14px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .modal-body { padding:14px; }
        .modal-actions { padding:12px 14px; border-top:1px solid #e2e8f0; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; }

        /* mobile tweaks */
        @media (max-width: 520px) {
          .tc-wrap { padding: 10px 8px 60px; }
          .tc-header-title { font-size: clamp(1.05rem, 4.4vw, 1.25rem); }
          .tc-card { padding: 13px 12px 14px; border-radius: 14px; }
          .tc-cat-item { flex-wrap: wrap; }
          .tc-cat-name { max-width: 140px; font-size: clamp(0.74rem, 3.7vw, 0.92rem); }
          .tc-actions { width:100%; justify-content:flex-start; }
          .tc-actions .tc-btn { flex:1 1 auto; min-width:0; }
          .tc-btn-secondary, .tc-btn-outline, .tc-btn-danger { font-size: .78rem; padding: 10px 12px; }

          .tc-sub-actions { width:100%; }
          .tc-sub-actions .tc-btn { flex:1 1 auto; min-width:0; }
          .tc-sub-row { gap:10px; }
        }
        @media (max-width: 380px) {
          .tc-cat-name { max-width: 120px; }
        }
      `}</style>

      <div className="tc-header">
        <h2 className="tc-header-title">Transaction Categories</h2>
        <p className="tc-header-sub">Organize your spending beautifully 💸</p>
      </div>

      {/* Add Category */}
      <div className="tc-card">
        <h4 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>Add Category</h4>
        <div className="tc-field">
          <label className="tc-label">Category Name</label>
          <input
            type="text"
            className="tc-input"
            placeholder="e.g., Office, Travel, Shopping"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
          />
        </div>
        <div className="tc-field">
          <label className="tc-label">Color</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="color"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
              style={{ width: 50, height: 36, borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <input
              type="text"
              className="tc-color-input-text"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
              placeholder="#0284C7"
            />
          </div>
        </div>
        <button className="tc-btn tc-btn-primary" onClick={addCategory} disabled={addBusy}>
          {addBusy ? "Saving…" : "Add Category"}
        </button>
      </div>

      {/* Category List */}
      <div className="tc-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <h4 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>All Categories</h4>
          {loading && <span className="text-muted" style={{ fontSize: 13 }}>Loading…</span>}
        </div>

        <div className="tc-cat-list">
          {!categories.length ? (
            <div className="text-muted small">No categories found</div>
          ) : (
            categories.map((c) => (
              <div key={c.category_id} className="tc-cat-item">
                <div className="tc-cat-left">
                  <div className="tc-color-dot" style={{ background: c.category_color }}></div>
                  <span className="tc-cat-name" title={c.category_name}>{c.category_name}</span>
                </div>

                <div className="tc-actions">
                  <button
                    className="tc-btn tc-btn-secondary"
                    onClick={() => {
                      setSelectedCat(c);
                      fetchSubcategories(c.category_id);
                    }}
                  >
                    View
                  </button>

                  <button className="tc-btn tc-btn-outline" onClick={() => openEdit(c)}>
                    Edit
                  </button>

                  <button className="tc-btn tc-btn-danger" onClick={() => askDelete(c.category_id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subcategory Section */}
      {selectedCat && (
        <div className="tc-card">
          <h4 style={{ fontWeight: 900, color: "#0F172A" }}>
            {selectedCat.category_name} — Subcategories
          </h4>

          <div className="tc-sub-top" style={{ marginBottom: 8 }}>
            <div style={{ flex: "1 1 260px" }}>
              <label className="tc-label">Add Subcategory</label>
              <input
                type="text"
                className="tc-input"
                placeholder="e.g., Snacks, Transport"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
              />
            </div>
            <button className="tc-btn tc-btn-primary" onClick={addSubcategory} disabled={addSubBusy}>
              {addSubBusy ? "Adding…" : "Add Subcategory"}
            </button>
          </div>

          <div className="tc-sub-list">
            {subLoading ? (
              <div className="text-muted small">Loading…</div>
            ) : !subcats.length ? (
              <div className="text-muted small">No subcategories found</div>
            ) : (
              subcats.map((s) => (
                <div key={s.subcategory_id} className="tc-sub-row">
                  <div className="tc-sub-item" title={s.subcategory_name}>
                    {s.subcategory_name}
                  </div>
                  <div className="tc-sub-actions">
                    <button
                      className="tc-btn tc-btn-outline"
                      onClick={() => openSubEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="tc-btn tc-btn-danger"
                      onClick={() => askSubDelete(s.subcategory_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== EDIT CATEGORY MODAL ===== */}
      {editOpen && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Edit category">
          <div className="modal-card">
            <div className="modal-head">
              <strong>Edit Category</strong>
              <button className="tc-btn tc-btn-outline" onClick={() => setEditOpen(false)} disabled={editBusy}>Close</button>
            </div>
            <div className="modal-body">
              <div className="tc-field">
                <label className="tc-label">Category Name</label>
                <input
                  className="tc-input"
                  value={editModel.name}
                  onChange={(e) => setEditModel((m) => ({ ...m, name: e.target.value }))}
                />
              </div>
              <div className="tc-field">
                <label className="tc-label">Color</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={editModel.color}
                    onChange={(e) => setEditModel((m) => ({ ...m, color: e.target.value }))}
                    style={{ width: 50, height: 36, borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                  <input
                    className="tc-color-input-text"
                    value={editModel.color}
                    onChange={(e) => setEditModel((m) => ({ ...m, color: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="tc-btn tc-btn-outline" onClick={() => setEditOpen(false)} disabled={editBusy}>Cancel</button>
              <button className="tc-btn tc-btn-primary" onClick={saveEdit} disabled={editBusy}>
                {editBusy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CATEGORY CONFIRM ===== */}
      {confirmOpen && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Delete category">
          <div className="modal-card">
            <div className="modal-head">
              <strong>Delete Category</strong>
              <button className="tc-btn tc-btn-outline" onClick={() => setConfirmOpen(false)} disabled={deleteBusy}>Close</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "#334155" }}>
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="tc-btn tc-btn-outline" onClick={() => setConfirmOpen(false)} disabled={deleteBusy}>Cancel</button>
              <button className="tc-btn tc-btn-danger" onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT SUBCATEGORY MODAL ===== */}
      {subEditOpen && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Edit subcategory">
          <div className="modal-card">
            <div className="modal-head">
              <strong>Edit Subcategory</strong>
              <button className="tc-btn tc-btn-outline" onClick={() => setSubEditOpen(false)} disabled={subEditBusy}>Close</button>
            </div>
            <div className="modal-body">
              <div className="tc-field">
                <label className="tc-label">Subcategory Name</label>
                <input
                  className="tc-input"
                  value={subEditModel.name}
                  onChange={(e) => setSubEditModel((m) => ({ ...m, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="tc-btn tc-btn-outline" onClick={() => setSubEditOpen(false)} disabled={subEditBusy}>Cancel</button>
              <button className="tc-btn tc-btn-primary" onClick={saveSubEdit} disabled={subEditBusy}>
                {subEditBusy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE SUBCATEGORY CONFIRM ===== */}
      {subConfirmOpen && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Delete subcategory">
          <div className="modal-card">
            <div className="modal-head">
              <strong>Delete Subcategory</strong>
              <button className="tc-btn tc-btn-outline" onClick={() => setSubConfirmOpen(false)} disabled={subDeleteBusy}>Close</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "#334155" }}>
                Are you sure you want to delete this subcategory? This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="tc-btn tc-btn-outline" onClick={() => setSubConfirmOpen(false)} disabled={subDeleteBusy}>Cancel</button>
              <button className="tc-btn tc-btn-danger" onClick={confirmSubDelete} disabled={subDeleteBusy}>
                {subDeleteBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup */}
      {popup && <div className={`tc-popup ${popup.type}`}>{popup.msg}</div>}
    </div>
  );
};

export default TransactionCategory;
