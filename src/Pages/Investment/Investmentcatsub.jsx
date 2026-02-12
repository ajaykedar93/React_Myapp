// Investmentcatsub.jsx
// ✅ Bootstrap responsive (mobile + desktop)
// ✅ Vibrant theme (NO bootstrap blue)
// ✅ Category select -> ONLY that category subcategories show
// ✅ Subcategory add WITHOUT checkbox (Options auto-detect from name)
// ✅ Update/Delete buttons (NO icons)
// ✅ All popups + alerts centered (modal + toast centered)

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investmentcatsub() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id ?? null;

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  const [catName, setCatName] = useState("");
  const [subName, setSubName] = useState("");

  const [editingCat, setEditingCat] = useState(null); // {category_id, category_name}
  const [editingSub, setEditingSub] = useState(null); // {subcategory_id, subcategory_name, category_id}

  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [toast, setToast] = useState(null); // {type, message}
  const [confirm, setConfirm] = useState(null); // {title, message, onConfirm}

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (userId) h["x-user-id"] = String(userId);
    return h;
  }, [userId]);

  function showToast(type, message) {
    setToast({ type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  async function safeFetch(path, options = {}) {
    if (!userId) throw new Error("Login required");

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });

    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  }

  // Auto detect Options from text (backend doesn't require, but okay if you store it later)
  function autoIsOptions(name) {
    const s = String(name || "").toLowerCase();
    return s.includes("option");
  }

  async function loadCategories() {
    try {
      setLoadingCats(true);
      const data = await safeFetch("/api/investment/category", { method: "GET" });
      const list = data?.data || [];
      setCategories(list);

      setSelectedCategoryId((prev) => {
        if (prev && list.some((c) => c.category_id === prev)) return prev;
        return list[0]?.category_id ?? null;
      });
    } catch (e) {
      showToast("danger", e.message || "Failed to load categories");
    } finally {
      setLoadingCats(false);
    }
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      setLoadingSubs(true);
      const data = await safeFetch(`/api/investment/subcategory?category_id=${categoryId}`, { method: "GET" });
      setSubcategories(data?.data || []);
    } catch (e) {
      showToast("danger", e.message || "Failed to load subcategories");
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadSubcategories(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, userId]);

  // ---------------- CATEGORY CRUD ----------------
  async function createCategory(e) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return showToast("warning", "Category required");

    try {
      const res = await safeFetch("/api/investment/category", {
        method: "POST",
        body: JSON.stringify({ category_name: name }),
      });

      setCatName("");
      showToast("success", "Category added");

      await loadCategories();
      const newId = res?.data?.category_id;
      if (newId) setSelectedCategoryId(newId);
    } catch (e2) {
      showToast("danger", e2.message || "Create failed");
    }
  }

  async function updateCategory() {
    const name = (editingCat?.category_name || "").trim();
    if (!name) return showToast("warning", "Category required");

    try {
      await safeFetch(`/api/investment/category/${editingCat.category_id}`, {
        method: "PUT",
        body: JSON.stringify({ category_name: name }),
      });

      setEditingCat(null);
      showToast("success", "Category updated");
      await loadCategories();
    } catch (e) {
      showToast("danger", e.message || "Update failed");
    }
  }

  function askDeleteCategory(categoryId) {
    setConfirm({
      title: "Delete Category",
      message: "Category आणि सर्व subcategories delete होतील. Continue?",
      onConfirm: async () => {
        try {
          await safeFetch(`/api/investment/category/${categoryId}`, { method: "DELETE" });
          setConfirm(null);
          showToast("success", "Category deleted");
          await loadCategories();
        } catch (e) {
          setConfirm(null);
          showToast("danger", e.message || "Delete failed");
        }
      },
    });
  }

  // ---------------- SUBCATEGORY CRUD ----------------
  async function createSubcategory(e) {
    e.preventDefault();
    if (!selectedCategoryId) return showToast("warning", "Select category first");

    const name = subName.trim();
    if (!name) return showToast("warning", "Subcategory required");

    try {
      await safeFetch("/api/investment/subcategory", {
        method: "POST",
        body: JSON.stringify({
          category_id: selectedCategoryId,
          subcategory_name: name,
          // backend currently ignores is_options if column not present
          is_options: autoIsOptions(name),
        }),
      });

      setSubName("");
      showToast("success", "Subcategory added");
      await loadSubcategories(selectedCategoryId);
    } catch (e2) {
      showToast("danger", e2.message || "Create failed");
    }
  }

  async function updateSubcategory() {
    const name = (editingSub?.subcategory_name || "").trim();
    if (!name) return showToast("warning", "Subcategory required");

    try {
      await safeFetch(`/api/investment/subcategory/${editingSub.subcategory_id}`, {
        method: "PUT",
        body: JSON.stringify({
          subcategory_name: name,
          category_id: editingSub.category_id,
          is_options: autoIsOptions(name),
        }),
      });

      setEditingSub(null);
      showToast("success", "Subcategory updated");
      await loadSubcategories(selectedCategoryId);
    } catch (e) {
      showToast("danger", e.message || "Update failed");
    }
  }

  function askDeleteSubcategory(subcategoryId) {
    setConfirm({
      title: "Delete Subcategory",
      message: "ही subcategory permanently delete होईल. Continue?",
      onConfirm: async () => {
        try {
          await safeFetch(`/api/investment/subcategory/${subcategoryId}`, { method: "DELETE" });
          setConfirm(null);
          showToast("success", "Subcategory deleted");
          await loadSubcategories(selectedCategoryId);
        } catch (e) {
          setConfirm(null);
          showToast("danger", e.message || "Delete failed");
        }
      },
    });
  }

  // ---------------- LOGIN VIEW ----------------
  if (!userId) {
    return (
      <div className="container-fluid p-0 min-vh-100 d-flex align-items-center justify-content-center cs-bg">
        <style>{localCss}</style>
        <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: "92%" }}>
          <div className="card-body text-center">
            <h5 className="mb-2">Login required</h5>
            <div className="text-muted">Please login again.</div>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryName =
    categories.find((c) => c.category_id === selectedCategoryId)?.category_name || "None";

  return (
    <div className="container-fluid p-0 min-vh-100 cs-bg">
      <style>{localCss}</style>

      {/* Header */}
      <div className="cs-header sticky-top">
        <div className="d-flex align-items-center justify-content-between px-3 py-2">
          <div className="fw-bold cs-title">Category & Subcategory</div>
          <span className="badge cs-badgeUser">User: {userId}</span>
        </div>
      </div>

      {/* Body */}
      <div className="container-fluid px-2 px-md-3 py-3">
        <div className="row g-3">
          {/* Categories */}
          <div className="col-12 col-lg-5">
            <div className="card shadow-sm border-0 h-100 cs-card">
              <div className="card-header cs-cardHead d-flex align-items-center justify-content-between">
                <div className="fw-semibold">Categories</div>
                <div className="small opacity-75">{loadingCats ? "Loading..." : categories.length}</div>
              </div>

              <div className="card-body">
                <form className="row g-2" onSubmit={createCategory}>
                  <div className="col-8">
                    <input
                      className="form-control cs-input"
                      placeholder="Add category"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      maxLength={60}
                    />
                  </div>
                  <div className="col-4 d-grid">
                    <button className="btn cs-btnMain btn-sm" type="submit">
                      Add
                    </button>
                  </div>
                </form>

                <hr className="my-3" />

                {categories.length === 0 && !loadingCats ? (
                  <div className="alert alert-light border small mb-0">No categories</div>
                ) : (
                  <div className="list-group">
                    {categories.map((cat) => {
                      const active = cat.category_id === selectedCategoryId;
                      return (
                        <div
                          key={cat.category_id}
                          className={`list-group-item d-flex align-items-center justify-content-between cs-row ${
                            active ? "cs-rowActive" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="btn btn-link p-0 text-start flex-grow-1 text-decoration-none"
                            onClick={() => setSelectedCategoryId(cat.category_id)}
                            style={{ color: "inherit" }}
                          >
                            <div className="fw-semibold">{cat.category_name}</div>
                            <div className="small text-muted">#{cat.category_id}</div>
                          </button>

                          <div className="d-flex gap-2 ms-3">
                            <button
                              type="button"
                              className="btn btn-sm cs-btnSoft"
                              onClick={() =>
                                setEditingCat({ category_id: cat.category_id, category_name: cat.category_name })
                              }
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm cs-btnDangerSoft"
                              onClick={() => askDeleteCategory(cat.category_id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subcategories */}
          <div className="col-12 col-lg-7">
            <div className="card shadow-sm border-0 h-100 cs-card">
              <div className="card-header cs-cardHead d-flex align-items-center justify-content-between">
                <div className="fw-semibold">Subcategories</div>
                <div className="small opacity-75">{loadingSubs ? "Loading..." : subcategories.length}</div>
              </div>

              <div className="card-body">
                <div className="mb-2">
                  <span className="small text-muted">Selected:</span>{" "}
                  <span className="fw-semibold cs-selectedName">{selectedCategoryName}</span>
                </div>

                <form className="row g-2 align-items-center" onSubmit={createSubcategory}>
                  <div className="col-12 col-md-8">
                    <input
                      className="form-control cs-input"
                      placeholder="Add subcategory"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      disabled={!selectedCategoryId}
                      maxLength={60}
                    />
                  </div>

                  <div className="col-12 col-md-4 d-grid">
                    <button className="btn cs-btnMain btn-sm" type="submit" disabled={!selectedCategoryId}>
                      Add
                    </button>
                  </div>
                </form>

                <hr className="my-3" />

                {!selectedCategoryId ? (
                  <div className="alert alert-light border small mb-0">Select a category first</div>
                ) : subcategories.length === 0 && !loadingSubs ? (
                  <div className="alert alert-light border small mb-0">No subcategories</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0 cs-table">
                      <thead>
                        <tr>
                          <th>Subcategory</th>
                          <th style={{ width: 130 }}>Type</th>
                          <th style={{ width: 240 }} className="text-end">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subcategories.map((sub) => {
                          const isOpt = !!sub.is_options;
                          return (
                            <tr key={sub.subcategory_id}>
                              <td>
                                <div className="fw-semibold">{sub.subcategory_name}</div>
                                <div className="small text-muted">#{sub.subcategory_id}</div>
                              </td>
                              <td>
                                {isOpt ? (
                                  <span className="badge cs-badgeOpt">OPTIONS</span>
                                ) : (
                                  <span className="badge cs-badgeNorm">NORMAL</span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="d-inline-flex gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm cs-btnSoft"
                                    onClick={() =>
                                      setEditingSub({
                                        subcategory_id: sub.subcategory_id,
                                        subcategory_name: sub.subcategory_name,
                                        category_id: sub.category_id,
                                      })
                                    }
                                  >
                                    Update
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm cs-btnDangerSoft"
                                    onClick={() => askDeleteSubcategory(sub.subcategory_id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCat && (
        <div className="cs-modalBg" onMouseDown={() => setEditingCat(null)}>
          <div className="cs-modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-bold">Update Category</div>
              <button className="btn btn-sm cs-btnClose" onClick={() => setEditingCat(null)}>
                Close
              </button>
            </div>

            <input
              className="form-control cs-input"
              value={editingCat.category_name}
              onChange={(e) => setEditingCat((p) => ({ ...p, category_name: e.target.value }))}
              maxLength={60}
            />

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-sm cs-btnSoft" onClick={() => setEditingCat(null)}>
                Cancel
              </button>
              <button className="btn btn-sm cs-btnMain" onClick={updateCategory}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {editingSub && (
        <div className="cs-modalBg" onMouseDown={() => setEditingSub(null)}>
          <div className="cs-modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-bold">Update Subcategory</div>
              <button className="btn btn-sm cs-btnClose" onClick={() => setEditingSub(null)}>
                Close
              </button>
            </div>

            <input
              className="form-control cs-input"
              value={editingSub.subcategory_name}
              onChange={(e) => setEditingSub((p) => ({ ...p, subcategory_name: e.target.value }))}
              maxLength={60}
            />

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-sm cs-btnSoft" onClick={() => setEditingSub(null)}>
                Cancel
              </button>
              <button className="btn btn-sm cs-btnMain" onClick={updateSubcategory}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div className="cs-modalBg" onMouseDown={() => setConfirm(null)}>
          <div className="cs-modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="fw-bold mb-1">{confirm.title}</div>
            <div className="text-muted small">{confirm.message}</div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-sm cs-btnSoft" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-sm cs-btnDanger" onClick={confirm.onConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="cs-toastWrap">
          <div className={`alert alert-${toast.type} shadow-sm mb-0 py-2 px-3 text-center`}>
            <div className="small fw-semibold">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const localCss = `
  /* Colors: teal + purple + lime */
  .cs-bg{
    background:
      radial-gradient(1000px 520px at 14% 12%, rgba(20,184,166,.16), transparent 62%),
      radial-gradient(1000px 520px at 92% 20%, rgba(168,85,247,.12), transparent 62%),
      radial-gradient(900px 520px at 50% 90%, rgba(163,230,53,.10), transparent 64%),
      linear-gradient(135deg, rgba(2,132,199,.06), rgba(99,102,241,.07));
  }

  .cs-header{
    background: rgba(255,255,255,.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0,0,0,.06);
  }

  .cs-badgeUser{
    background: linear-gradient(135deg, #14b8a6, #a855f7);
    border: 0;
  }

  .cs-card{ border-radius: 16px; overflow: hidden; }
  .cs-cardHead{
    background: linear-gradient(135deg, rgba(20,184,166,.10), rgba(168,85,247,.10));
    border-bottom: 1px solid rgba(0,0,0,.05);
  }

  .cs-input{
    border: 1px solid rgba(0,0,0,.10);
  }
  .cs-input:focus{
    border-color: rgba(20,184,166,.35);
    box-shadow: 0 0 0 .2rem rgba(20,184,166,.16);
  }

  .cs-row{ border-color: rgba(0,0,0,.06); }
  .cs-rowActive{
    background: rgba(20,184,166,.10);
    border-color: rgba(20,184,166,.18);
  }
  .cs-selectedName{ color: #14b8a6; }

  .cs-btnMain{
    color: #fff !important;
    border: 0 !important;
    background: linear-gradient(135deg, #14b8a6, #a855f7) !important;
  }
  .cs-btnSoft{
    border: 1px solid rgba(168,85,247,.22) !important;
    color: rgba(88,28,135,.95) !important;
    background: rgba(168,85,247,.08) !important;
  }
  .cs-btnDangerSoft{
    border: 1px solid rgba(239,68,68,.24) !important;
    color: rgba(239,68,68,.95) !important;
    background: rgba(239,68,68,.08) !important;
  }
  .cs-btnDanger{
    border: 0 !important;
    color: #fff !important;
    background: linear-gradient(135deg, #ef4444, #fb7185) !important;
  }
  .cs-btnClose{
    border: 1px solid rgba(0,0,0,.10) !important;
    background: rgba(255,255,255,.86) !important;
  }

  .cs-table > :not(caption) > * > *{
    border-bottom-color: rgba(0,0,0,.06) !important;
  }

  .cs-badgeOpt{
    background: linear-gradient(135deg, #a855f7, #22c55e);
    border: 0;
  }
  .cs-badgeNorm{
    background: rgba(17,24,39,.10);
    color: rgba(17,24,39,.92);
  }

  .cs-modalBg{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    display: grid;
    place-items: center;
    z-index: 1055;
    padding: 12px;
  }
  .cs-modalCard{
    width: min(520px, 95vw);
    background: #fff;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 18px 60px rgba(0,0,0,.22);
  }

  .cs-toastWrap{
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: min(520px, 92vw);
    z-index: 2000;
  }

  @media (min-width: 992px){
    .table thead th{
      position: sticky; 
      top: 0;
      background: #fff;
      z-index: 1;
    }
  }
`;
