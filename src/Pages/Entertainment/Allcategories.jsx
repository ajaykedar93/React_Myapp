// src/pages/Entertainment/Allcategories.jsx
// Bootstrap-only Admin for Categories / Subcategories / Genres
// - Add + Delete only (no edit)
// - Professional layout with centered modals & alerts
// - Subcategory creation requires selecting a Category
// - Auto-refresh after each action
// - Busy state on destructive actions
// - API base comes from env (VITE_API_BASE) with localhost fallback

import React, { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api` : "http://localhost:5000/api");

const EP = {
  CATEGORIES: `${API_BASE}/categories`,
  SUBCATEGORIES: `${API_BASE}/subcategories`,
  GENRES: `${API_BASE}/genres`,
  CAT_ONE: (id) => `${API_BASE}/categories/${id}`,
  SUB_ONE: (id) => `${API_BASE}/subcategories/${id}`,
  GEN_ONE: (id) => `${API_BASE}/genres/${id}`,
};

// -------------------------------
// Reusable centered modal
// -------------------------------
function Modal({ children, onClose }) {
  const onBackdrop = (e) => {
    if (e.target.classList.contains("modal-backdrop-lite")) onClose?.();
  };
  return (
    <div className="modal-backdrop-lite" onMouseDown={onBackdrop}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="d-flex justify-content-end p-2 pb-0">
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        {children}
      </div>
      <style>{`
        .modal-backdrop-lite {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
          padding: 10px;
        }
        .modal-card {
          width: min(720px, 94vw);
          max-height: 92vh;
          background: #fff; border-radius: 1rem;
          box-shadow: 0 1rem 2rem rgba(0,0,0,.2);
          animation: popIn .18s ease-out;
          display: flex; flex-direction: column;
        }
        @keyframes popIn { from { transform: scale(.96); opacity:.6 } to { transform: scale(1); opacity:1 } }
      `}</style>
    </div>
  );
}

// -------------------------------
// Centered alert (success / error / info)
// -------------------------------
function AlertModal({ kind = "success", title, message, onClose }) {
  const color =
    kind === "success"
      ? "rgba(25,135,84,.15)"
      : kind === "danger"
      ? "rgba(220,53,69,.15)"
      : "rgba(13,110,253,.12)";
  const ring =
    kind === "success"
      ? "rgba(25,135,84,.35)"
      : kind === "danger"
      ? "rgba(220,53,69,.35)"
      : "rgba(13,110,253,.35)";
  const icon = kind === "success" ? "✓" : kind === "danger" ? "!" : "ℹ︎";

  return (
    <Modal onClose={onClose}>
      <div className="p-3 text-center">
        <div
          className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 68,
            height: 68,
            background: color,
            border: `2px solid ${ring}`,
            fontSize: 30,
          }}
        >
          {icon}
        </div>
        {title ? <h5 className="mb-1">{title}</h5> : null}
        {message ? <div className="text-muted mb-3">{message}</div> : null}
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// -------------------------------
// Delete confirm modal
// -------------------------------
function ConfirmDelete({ what = "item", name = "", onCancel, onConfirm, busy = false }) {
  return (
    <Modal onClose={onCancel}>
      <div className="p-3 text-center">
        <div
          className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 68,
            height: 68,
            background: "linear-gradient(135deg, rgba(220,53,69,.15), rgba(111,66,193,.1))",
            border: "2px solid rgba(220,53,69,.3)",
          }}
        >
          <span style={{ fontSize: 30, color: "rgb(220,53,69)" }}>!</span>
        </div>
        <h5 className="mb-2">Delete {what}</h5>
        <p className="text-muted mb-3">
          Are you sure you want to delete <b>{name}</b>?
        </p>
        <div className="d-flex justify-content-center gap-2">
          <button className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Allcategories() {
  // Data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [genres, setGenres] = useState([]);

  // Loading flags
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState({ cat: false, sub: false, gen: false });
  const [deleting, setDeleting] = useState(false);

  // Alerts / confirms
  const [successAlert, setSuccessAlert] = useState(null); // {title, message}
  const [errorAlert, setErrorAlert] = useState(null);     // {title, message}
  const [confirmDel, setConfirmDel] = useState(null);     // { scope: 'cat'|'sub'|'gen', id, label }

  // Add forms
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6f42c1"); // bootstrap purple-ish default
  const [subName, setSubName] = useState("");
  const [subCatId, setSubCatId] = useState("");
  const [genName, setGenName] = useState("");

  const isHexColor = (s) => typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
  const norm = (s = "") => String(s).replace(/\s+/g, " ").trim();

  // Load all lists
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, g] = await Promise.all([
        fetch(EP.CATEGORIES).then((r) => r.json()),
        fetch(EP.SUBCATEGORIES).then((r) => r.json()),
        fetch(EP.GENRES).then((r) => r.json()),
      ]);
      setCategories(Array.isArray(c) ? c : []);
      setSubcategories(Array.isArray(s) ? s : []);
      setGenres(Array.isArray(g) ? g : []);
    } catch {
      setErrorAlert({ title: "Load Failed", message: "Could not load categories/subcategories/genres." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Derived lookups
  const catById = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(Number(c.category_id), c);
    return map;
  }, [categories]);

  // Add: Category
  const addCategory = async (e) => {
    e?.preventDefault();
    const name = norm(catName);
    if (!name) {
      setErrorAlert({ title: "Validation", message: "Category name is required." });
      return;
    }
    if (!isHexColor(catColor)) {
      setErrorAlert({ title: "Validation", message: "Pick a valid hex color (e.g., #ff0000)." });
      return;
    }
    setAdding((s) => ({ ...s, cat: true }));
    try {
      const r = await fetch(EP.CATEGORIES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: String(catColor).toLowerCase() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Create failed");
      setCatName("");
      setCatColor("#6f42c1");
      await loadAll();
      setSuccessAlert({ title: "Saved", message: "Category added successfully." });
    } catch (e2) {
      setErrorAlert({ title: "Add Failed", message: e2.message || "Could not add category." });
    } finally {
      setAdding((s) => ({ ...s, cat: false }));
    }
  };

  // Add: Subcategory
  const addSubcategory = async (e) => {
    e?.preventDefault();
    const name = norm(subName);
    const cid = Number(subCatId);
    if (!cid) {
      setErrorAlert({ title: "Validation", message: "Please select a Category." });
      return;
    }
    if (!name) {
      setErrorAlert({ title: "Validation", message: "Subcategory name is required." });
      return;
    }
    setAdding((s) => ({ ...s, sub: true }));
    try {
      const r = await fetch(EP.SUBCATEGORIES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: cid, name }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Create failed");
      setSubName("");
      setSubCatId("");
      await loadAll();
      setSuccessAlert({ title: "Saved", message: "Subcategory added successfully." });
    } catch (e2) {
      setErrorAlert({ title: "Add Failed", message: e2.message || "Could not add subcategory." });
    } finally {
      setAdding((s) => ({ ...s, sub: false }));
    }
  };

  // Add: Genre
  const addGenre = async (e) => {
    e?.preventDefault();
    const name = norm(genName);
    if (!name) {
      setErrorAlert({ title: "Validation", message: "Genre name is required." });
      return;
    }
    setAdding((s) => ({ ...s, gen: true }));
    try {
      const r = await fetch(EP.GENRES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Create failed");
      setGenName("");
      await loadAll();
      setSuccessAlert({ title: "Saved", message: "Genre added successfully." });
    } catch (e2) {
      setErrorAlert({ title: "Add Failed", message: e2.message || "Could not add genre." });
    } finally {
      setAdding((s) => ({ ...s, gen: false }));
    }
  };

  // Delete handler (opens confirm)
  const onDelete = (scope, id, label) => setConfirmDel({ scope, id, label });

  // Confirm delete
  const confirmDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    const { scope, id } = confirmDel;
    const url =
      scope === "cat" ? EP.CAT_ONE(id)
      : scope === "sub" ? EP.SUB_ONE(id)
      : EP.GEN_ONE(id);

    try {
      const r = await fetch(url, { method: "DELETE" });
      let j = {};
      try { j = await r.json(); } catch (_) {}
      if (!r.ok) throw new Error(j?.error || "Delete failed");
      setConfirmDel(null);
      await loadAll();
      setSuccessAlert({ title: "Deleted", message: "Item deleted successfully." });
    } catch (e) {
      setErrorAlert({ title: "Delete Failed", message: e.message || "Could not delete item." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header
        className="border-bottom"
        style={{ background: "linear-gradient(135deg, rgba(255,193,7,.08), rgba(111,66,193,.08))" }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h3 className="mb-0">🗂️ Manage Categories / Subcategories / Genres</h3>
            <div className="text-muted small">Add and delete taxonomy used by Movies & Series.</div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container my-3">

        {/* Loading overlay */}
        {loading && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(255,255,255,.6)", zIndex: 1050 }}
          >
            <div className="spinner-border" role="status" aria-hidden="true"></div>
            <span className="ms-2 text-muted">Loading…</span>
          </div>
        )}

        <div className="row g-4">
          {/* Add Category */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div
                className="card-header fw-semibold"
                style={{ background: "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))" }}
              >
                Add Category
              </div>
              <div className="card-body">
                <form onSubmit={addCategory}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g., Movies, Web Series, Anime"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center gap-2">
                      Color
                      <span className="badge" style={{ background: catColor }}>sample</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text p-0" style={{ background: "transparent", borderRight: "none" }}>
                        <input
                          type="color"
                          className="form-control form-control-color border-0"
                          value={catColor}
                          onChange={(e) => setCatColor(e.target.value)}
                          title="Pick color"
                        />
                      </span>
                      <input
                        className="form-control"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        placeholder="#6f42c1"
                      />
                    </div>
                    <div className="form-text">
                      Must be a valid hex color like <code>#ff0000</code>.
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={adding.cat}>
                    {adding.cat ? "Saving…" : "Add Category"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Add Subcategory */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div
                className="card-header fw-semibold"
                style={{ background: "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))" }}
              >
                Add Subcategory
              </div>
              <div className="card-body">
                <form onSubmit={addSubcategory}>
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={subCatId} onChange={(e) => setSubCatId(e.target.value)}>
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Subcategory Name</label>
                    <input
                      className="form-control"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      placeholder="e.g., Hollywood, Tollywood, Thriller Series"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={adding.sub}>
                    {adding.sub ? "Saving…" : "Add Subcategory"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Add Genre */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div
                className="card-header fw-semibold"
                style={{ background: "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))" }}
              >
                Add Genre
              </div>
              <div className="card-body">
                <form onSubmit={addGenre}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={genName}
                      onChange={(e) => setGenName(e.target.value)}
                      placeholder="e.g., Action, Drama, Sci-Fi"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={adding.gen}>
                    {adding.gen ? "Saving…" : "Add Genre"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="row g-4 mt-1">
          {/* Categories list */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header fw-semibold">Categories</div>
              <div className="table-responsive scroll-box">
                <table className="table align-middle mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Name</th>
                      <th>Color</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length ? (
                      categories.map((c) => (
                        <tr key={c.category_id}>
                          <td className="fw-semibold">{c.name}</td>
                          <td>
                            <span className="badge" style={{ background: c.color }}>{c.color}</span>
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => onDelete("cat", c.category_id, c.name)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-3">
                          No categories
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Subcategories list */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header fw-semibold">Subcategories</div>
              <div className="table-responsive scroll-box">
                <table className="table align-middle mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcategories.length ? (
                      subcategories.map((s) => {
                        const cat = catById.get(Number(s.category_id));
                        return (
                          <tr key={s.subcategory_id}>
                            <td className="fw-semibold">{s.name}</td>
                            <td>
                              {cat ? (
                                <span className="badge" style={{ background: cat.color }}>{cat.name}</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onDelete("sub", s.subcategory_id, `${s.name}`)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-3">
                          No subcategories
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Genres list */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header fw-semibold">Genres</div>
              <div className="table-responsive scroll-box">
                <table className="table align-middle mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Name</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genres.length ? (
                      genres.map((g) => (
                        <tr key={g.genre_id}>
                          <td className="fw-semibold">{g.name}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => onDelete("gen", g.genre_id, g.name)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted py-3">
                          No genres
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm & Alerts */}
      {confirmDel && (
        <ConfirmDelete
          what={confirmDel.scope === "cat" ? "Category" : confirmDel.scope === "sub" ? "Subcategory" : "Genre"}
          name={confirmDel.label}
          onCancel={() => setConfirmDel(null)}
          onConfirm={confirmDelete}
          busy={deleting}
        />
      )}

      {successAlert && (
        <AlertModal
          kind="success"
          title={successAlert.title}
          message={successAlert.message}
          onClose={() => setSuccessAlert(null)}
        />
      )}
      {errorAlert && (
        <AlertModal
          kind="danger"
          title={errorAlert.title}
          message={errorAlert.message}
          onClose={() => setErrorAlert(null)}
        />
      )}

      {/* Small polish */}
      <style>{`
        .btn { transition: transform .12s ease, box-shadow .12s ease; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 .75rem 1.25rem rgba(0,0,0,.08)!important; }
        /* Per-section scroll boxes */
        .scroll-box {
          max-height: 340px;
          overflow-y: auto;
        }
        /* Keep table headers visible while scrolling inside the box */
        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 2;
        }
      `}</style>
    </>
  );
}
