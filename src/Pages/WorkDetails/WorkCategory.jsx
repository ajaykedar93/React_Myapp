import React, { useEffect, useState, useMemo } from "react";

const API_BASE = "https://express-backend-myapp.onrender.com/api";

const WorkCategory = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);   // initial load
  const [busy, setBusy] = useState(false);         // add/update/delete
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

  // inline editing
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // delete confirm
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.id - b.id),
    [categories]
  );

  // utils
  const cleanName = (s) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "");

  const showToast = (type, msg) => {
    setToast({ open: true, type, msg });
    clearTimeout(window.__wc_toast);
    window.__wc_toast = setTimeout(() => setToast((t) => ({ ...t, open: false })), 2400);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/workcategory`);
const data = await res.json();
setCategories(Array.isArray(data) ? data : []);

    } catch (e) {
      showToast("error", "Failed to load categories.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Add
  const handleAdd = async (e) => {
    e.preventDefault();
    const name = cleanName(newCategory);
    if (!name) return showToast("error", "Enter a category name.");
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/workcategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Add failed");
      setNewCategory("");
      setCategories((prev) => [...prev, data]);
      showToast("success", "Category added.");
    } catch (e) {
      if (String(e.message).toLowerCase().includes("exists")) {
        showToast("error", "Category name already exists.");
      } else {
        showToast("error", "Could not add category.");
      }
    } finally {
      setBusy(false);
    }
  };

  // Start edit
  const startEdit = (id, name) => {
    setEditingId(id);
    setEditName(name);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  // Save edit
  const saveEdit = async (id) => {
    const name = cleanName(editName);
    if (!name) return showToast("error", "Enter a category name.");
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/workcategory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      cancelEdit();
      showToast("success", "Category updated.");
    } catch (e) {
      if (String(e.message).toLowerCase().includes("exists")) {
        showToast("error", "Category name already exists.");
      } else {
        showToast("error", "Could not update category.");
      }
    } finally {
      setBusy(false);
    }
  };

  // Confirm delete (open)
  const openDelete = (id, name) => {
    setConfirm({ open: true, id, name });
  };
  const closeDelete = () => setConfirm({ open: false, id: null, name: "" });

  // Delete
  const doDelete = async () => {
    const { id } = confirm;
    if (!id) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/workcategory/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast("success", "Category deleted.");
    } catch (e) {
      showToast("error", "Could not delete category.");
    } finally {
      setBusy(false);
      closeDelete();
    }
  };

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');
        :root{
          --bg:#f7f7fb;
          --card:#ffffff;
          --border:#e8eaf1;
          --muted:#64748b;
          --text:#0f172a;

          --brand-400:#c084fc;
          --brand-500:#a855f7;
          --brand-600:#9333ea;
          --brand-700:#7e22ce;
          --focus: rgba(168,85,247,.35);

          --danger:#ef4444;
          --danger-600:#dc2626;
          --good:#10b981;

          --accent:#0ea5e9;
          --accent-600:#0284c7;

          --shadow:0 10px 30px rgba(2,6,23,0.06);
        }

        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
        .wrap{ max-width: 920px; margin: 0 auto; padding: clamp(12px, 3vw, 24px) clamp(8px, 3vw, 16px) 60px; }

        .card{
          background: var(--card);
          border:1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
          padding: clamp(12px, 2.5vw, 18px);
        }

        .hd{
          text-align:center;
          margin: 6px 0 18px;
          font-weight: 800;
          font-family: 'Poppins', sans-serif;
          font-size: clamp(1.5rem, 5.5vw, 2.2rem);
          letter-spacing: .3px;
          color: var(--brand-500);
          text-shadow:
            -1px -1px 0 #000,
             1px -1px 0 #000,
            -1px  1px 0 #000,
             1px  1px 0 #000;
        }

        .topbar{
          display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
        }
        .muted{ color: var(--muted); font-size: clamp(.85rem, 2.5vw, .95rem); }
        .count{ color: var(--muted); font-weight:600; }

        .addbar{
          display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin: 14px 0 10px;
        }
        .input{
          flex:1 1 360px; padding: clamp(10px, 2.2vw, 12px); border-radius: 12px; border:1px solid var(--border); background:#fff;
          font-size: clamp(.95rem, 2.8vw, 1rem); outline:none;
        }
        .input:focus{ border-color: var(--brand-500); box-shadow: 0 0 0 3px var(--focus); }

        .btn{
          display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
          padding:.72rem 1rem; border-radius: 12px; border:1px solid transparent; cursor:pointer;
          font-weight:800; user-select:none; transition: transform .08s ease, box-shadow .16s ease, background .16s ease, border-color .16s ease, color .16s ease;
          min-width: 104px;
        }
        .btn:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--focus); }
        .btn:active{ transform: translateY(.5px) scale(.995); }

        .btn-primary{ background: var(--brand-500); color:#fff; border-color: var(--brand-700); }
        .btn-primary:hover{ background: var(--brand-600); }

        .btn-ghost{ background:#fff; color:#334155; border:1px solid var(--border); box-shadow:0 2px 8px rgba(0,0,0,.05); }
        .btn-ghost:hover{ background:#f8fafc; border-color:#cbd5e1; }

        .btn-danger{ background: var(--danger); color:#fff; border-color: var(--danger-600); }
        .btn-danger:hover{ background: var(--danger-600); }

        .btn-accent{ background: var(--accent); color:#fff; border-color: var(--accent-600); }
        .btn-accent:hover{ background: var(--accent-600); }

        .list{ display:flex; flex-direction:column; gap:12px; margin-top: 8px; }

        /* Grid row with named areas for perfect mobile stacking */
        .row{
          display:grid;
          grid-template-columns: 1fr auto;
          grid-template-areas: "name actions";
          gap: 12px;
          align-items:center;
          padding: 12px 14px;
          border:1px solid var(--border);
          background:#fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,.05);
        }
        .cell-name{ grid-area: name; min-width: 0; }
        .cell-actions{ grid-area: actions; }

        .nameWrap{
          display:flex; align-items:center; gap:10px; min-width: 0;
        }
        .name{
          font-weight:700; color:#111827; word-break: break-word; overflow:hidden; text-overflow: ellipsis;
        }
        .name-id{
          color: #475569; font-weight:800; background:#f1f5f9;
          border:1px solid #e2e8f0; padding:2px 8px; border-radius:10px; font-size:.75rem; flex:0 0 auto;
        }

        .row-actions{
          display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;
        }
        .row-actions .btn{ min-width: 104px; }

        .edit-wrap{
          display:flex; gap:10px; align-items:center; width:100%;
        }
        .edit-input{
          flex:1; min-width: 160px;
          padding: 10px 12px; border-radius: 10px; border:1px solid var(--border);
          outline:none; background:#fff; font-size:.95rem;
        }
        .edit-input:focus{ border-color: var(--brand-500); box-shadow:0 0 0 3px var(--focus); }

        /* Centered confirm (no dark overlay) */
        .confirm{
          position: fixed; top:50%; left:50%; transform: translate(-50%,-50%);
          width: 100%; max-width: 460px; background:#fff; border:1px solid var(--border);
          border-radius:16px; box-shadow:0 24px 60px rgba(2,6,23,.22); z-index: 9999; overflow:hidden;
          animation: pop .18s ease-out;
        }
        @keyframes pop{ from{ transform: translate(-50%, calc(-50% + 6px)) scale(.985); opacity:.9; } to{ transform: translate(-50%,-50%) scale(1); opacity:1; } }
        .confirm-hd{ padding: 14px 16px 6px; font-weight:800; }
        .confirm-bd{ padding: 6px 16px 12px; color:#334155; }
        .confirm-ft{ padding: 0 16px 16px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
        .confirm-ft .btn{ min-width: 120px; }

        /* Busy spinner (center, no overlay) */
        .busy{
          position: fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:10000; background: transparent; pointer-events:none;
        }
        .spin{
          width: 34px; height: 34px; border-radius:50%;
          border: 3px solid #e5e7eb; border-top-color: var(--brand-500); animation: sp 0.8s linear infinite;
        }
        @keyframes sp{ to{ transform: rotate(360deg) } }

        /* Toast */
        .toast{
          position: fixed; right: 16px; top: 16px; z-index: 10001;
          background: #fff; border:1px solid var(--border); border-radius:12px; box-shadow: 0 12px 30px rgba(2,6,23,.18);
          padding: 10px 14px; font-weight:700; max-width: 420px;
        }
        .toast.ok{ color: var(--good); }
        .toast.err{ color: var(--danger); }

        /* ---------- Mobile-first responsiveness ---------- */
        @media (max-width: 760px){
          .row{
            grid-template-columns: 1fr;
            grid-template-areas:
              "name"
              "actions";
            align-items: stretch;
          }
          .row-actions{
            justify-content: stretch;
          }
          .row-actions .btn{
            flex: 1 1 auto;
            min-width: 0;
          }
          .addbar{
            flex-direction: column;
          }
          .btn-primary{
            width: 100%;
          }
          .input{
            width: 100%;
          }
        }

        @media (max-width: 520px){
          .wrap{ padding-bottom: 52px; }
          .row{ gap: 10px; padding: 10px 12px; }
          .btn{ min-width: 92px; padding: .66rem .8rem; }
          .toast{
            left: 12px; right: 12px; top: 12px;
            transform: none; max-width: none;
          }
          .confirm{
            width: 92%;
          }
          .confirm-ft .btn{
            flex: 1 1 48%;
            min-width: 0;
          }
        }

        @media (max-width: 380px){
          .name{ font-size: .98rem; }
          .btn{ padding: .6rem .75rem; }
          .row-actions{ gap: 8px; }
        }
      `}</style>

      {busy && (
        <div className="busy">
          <div className="spin" />
        </div>
      )}

      {toast.open && (
        <div className={`toast ${toast.type === "error" ? "err" : "ok"}`}>
          {toast.msg}
        </div>
      )}

      <div className="card">
        <h2 className="hd">Work Categories</h2>

        <div className="topbar">
          <div className="muted">Manage your category list (add, rename, delete).</div>
          <div className="count">{sorted.length} total</div>
        </div>

        <form className="addbar" onSubmit={handleAdd}>
          <input
            className="input"
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add new category (e.g., Steel, Cement, Labour)"
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            + Add
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="muted">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="muted">No categories yet. Add your first category above.</div>
        ) : (
          <div className="list">
            {sorted.map((cat) => (
              <div key={cat.id} className="row">
                {/* LEFT: name / editing input */}
                <div className="cell-name">
                  {editingId === cat.id ? (
                    <div className="edit-wrap">
                      <input
                        className="edit-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Category name"
                        disabled={busy}
                      />
                    </div>
                  ) : (
                    <div className="nameWrap">
                      <span className="name">{cat.category_name}</span>
                      <span className="name-id">#{cat.id}</span>
                    </div>
                  )}
                </div>

                {/* RIGHT: actions always visible and full-sized on mobile */}
                <div className="cell-actions">
                  <div className="row-actions">
                    {editingId === cat.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-accent"
                          onClick={() => saveEdit(cat.id)}
                          disabled={busy}
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={cancelEdit}
                          disabled={busy}
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => startEdit(cat.id, cat.category_name)}
                          disabled={busy}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => openDelete(cat.id, cat.category_name)}
                          disabled={busy}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Centered confirm (no dark overlay) */}
      {confirm.open && (
        <div className="confirm" role="dialog" aria-modal="true">
          <div className="confirm-hd">Delete Category</div>
          <div className="confirm-bd">
            Are you sure you want to delete <b>{confirm.name}</b>? This action cannot be undone.
          </div>
          <div className="confirm-ft">
            <button className="btn btn-ghost" onClick={closeDelete} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" onClick={doDelete} disabled={busy}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCategory;
