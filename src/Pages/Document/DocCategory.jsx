// DocCategory.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner";

const API_BASE = "https://express-backend-myapp.onrender.com/api/documents";

const DocCategory = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    success: true,
    onConfirm: null,
    onCancel: null
  });
  const [newCategory, setNewCategory] = useState({
    category_name: "",
    subcategory: "",
    description: "",
    color: "#6B7280"
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      showPopup("Failed to fetch categories", false);
    } finally {
      setLoading(false);
    }
  };

  const showPopup = (message, success = true, onConfirm = null, onCancel = null) => {
    setPopup({ visible: true, message, success, onConfirm, onCancel });
  };

  const resetPopup = () =>
    setPopup({ visible: false, message: "", success: true, onConfirm: null, onCancel: null });

  const handleAddCategory = async () => {
    if (!newCategory.category_name.trim())
      return showPopup("Category name is required", false);
    try {
      const res = await axios.post(`${API_BASE}/categories`, newCategory);
      if (res.data?.success || res.status === 201) {
        await fetchCategories();
        setNewCategory({
          category_name: "",
          subcategory: "",
          description: "",
          color: "#6B7280"
        });
        showPopup("Category added successfully!");
      } else {
        showPopup("Failed to add category", false);
      }
    } catch (err) {
      console.error(err);
      showPopup("Failed to add category", false);
    }
  };

  const handleDeleteCategory = (id) => {
    showPopup(
      "Are you sure you want to delete this category?",
      true,
      async () => {
        try {
          await axios.delete(`${API_BASE}/categories/${id}`);
          await fetchCategories();
          showPopup("Category deleted successfully!");
        } catch (err) {
          console.error(err);
          showPopup("Delete failed", false);
        }
      },
      () => resetPopup()
    );
  };

  // Allow Enter key to submit "Add Category" from any input
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
  };

  return (
    <div className="category-page">
      {loading && <LoadingSpinner />}

      {popup.visible && (
        <motion.div
          className={`popup-message ${popup.success ? "success" : "error"}`}
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          role="dialog"
          aria-modal="true"
          aria-live="polite"
        >
          {popup.message}
          {(popup.onConfirm || popup.onCancel) && (
            <div className="popup-actions">
              {popup.onConfirm && (
                <button
                  className="btn-popup-ok"
                  onClick={async () => {
                    const fn = popup.onConfirm;
                    resetPopup();
                    await fn();
                  }}
                  type="button"
                >
                  OK
                </button>
              )}
              {popup.onCancel && (
                <button
                  className="btn-popup-cancel"
                  onClick={() => {
                    popup.onCancel();
                    resetPopup();
                  }}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      <motion.h2
        className="page-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        📂 Document Categories
      </motion.h2>

      <motion.div
        className="add-category-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="card-title">Add New Category</h3>
        <div className="form-grid" onKeyDown={handleKeyDown}>
          <input
            type="text"
            placeholder="Category Name"
            value={newCategory.category_name}
            onChange={(e) => setNewCategory({ ...newCategory, category_name: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Subcategory (optional)"
            value={newCategory.subcategory}
            onChange={(e) => setNewCategory({ ...newCategory, subcategory: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Description"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            className="input"
          />
          <div className="color-wrap">
            <input
              aria-label="Pick a color"
              title="Pick a color"
              type="color"
              value={newCategory.color}
              onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              className="color"
            />
          </div>
          <button className="btn-add" onClick={handleAddCategory} type="button">
            Add Category
          </button>
        </div>
      </motion.div>

      <motion.div
        className="category-table-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="table-wrap" role="region" aria-label="Categories" tabIndex={0}>
          <table className="category-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Subcategory</th>
                <th>Description</th>
                <th>Color</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.category_id}>
                  <td data-label="Name">{cat.category_name}</td>
                  <td data-label="Subcategory">{cat.subcategory || "-"}</td>
                  <td data-label="Description">{cat.description || "-"}</td>
                  <td data-label="Color">
                    <div
                      className="color-box"
                      style={{ background: cat.color || "#6B7280" }}
                      title={cat.color || "#6B7280"}
                    />
                  </td>
                  <td data-label="Actions">
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteCategory(cat.category_id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <style>{`
        :root{
          --green-900:#1b5e20;
          --green-700:#2e7d32;
          --green-300:#a5d6a7;
          --blue-600:#1e88e5;
          --blue-700:#1565c0;
          --red-600:#ef4444;
          --red-700:#d32f2f;
          --neutral-50:#f4f6f8;
          --shadow: 0 10px 30px rgba(0,0,0,0.08);
          --shadow-strong: 0 12px 28px rgba(0,0,0,0.12);
          --radius: 12px;
        }

        .category-page{
          padding: clamp(16px,2.5vw,30px) clamp(12px,2vw,20px);
          padding-top: calc(env(safe-area-inset-top,0px) + clamp(12px,1.5vw,20px));
          padding-bottom: calc(env(safe-area-inset-bottom,0px) + clamp(12px,1.5vw,20px));
          font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          background: var(--neutral-50);
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }

        .page-title{
          font-size: clamp(1.4rem, 2.2vw, 2rem);
          font-weight: 800;
          margin: 0 0 clamp(18px, 2.5vw, 25px);
          color: var(--green-900);
          text-align: center;
          width: 100%;
        }

        .add-category-card, .category-table-card{
          background: #fff;
          padding: clamp(18px, 2.2vw, 25px);
          border-radius: var(--radius);
          width: min(100%, 1000px);
          margin-bottom: clamp(18px, 2.2vw, 25px);
          box-shadow: var(--shadow);
        }
        .add-category-card:hover, .category-table-card:hover{ box-shadow: var(--shadow-strong); }

        .card-title{
          margin: 0 0 12px;
          color: #333;
          font-weight: 700;
          font-size: clamp(1.05rem, 1.5vw, 1.2rem);
        }

        /* Responsive grid for the add form */
        .form-grid{
          display: grid;
          gap: clamp(10px, 1.2vw, 14px);
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          align-items: start;
        }

        .input{
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #d8dee6;
          background: #fff;
          font-size: 0.98rem;
          transition: box-shadow .15s, border-color .15s;
          min-width: 0;
          box-sizing: border-box;
        }
        .input:focus{
          outline: none;
          border-color: var(--blue-600);
          box-shadow: 0 0 0 4px rgba(30, 136, 229, 0.18);
        }

        .color-wrap{
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border: 1px dashed #d8dee6;
          border-radius: 10px;
          min-height: 44px;
        }
        .color{
          width: 52px;
          height: 36px;
          border: none;
          padding: 0;
          background: transparent;
          cursor: pointer;
        }

        .btn-add{
          padding: 12px 16px;
          border-radius: 10px;
          background: var(--blue-600);
          color: #fff;
          border: none;
          cursor: pointer;
          font-weight: 700;
          justify-self: end;
          transition: transform .12s, box-shadow .12s, background .12s;
        }
        .btn-add:hover{ background: var(--blue-700); transform: translateY(-1px); }
        @media (max-width: 640px){
          .btn-add{ justify-self: stretch; }
        }

        /* Table wrapper for horizontal scroll on small screens */
        .table-wrap{
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: var(--radius);
        }
        .category-table{
          width: 100%;
          border-collapse: collapse;
          min-width: 680px; /* keeps columns readable; wrapper scrolls on phones */
        }
        .category-table th, .category-table td{
          padding: 12px 14px;
          border-bottom: 1px solid #eaeef2;
          text-align: left;
          white-space: nowrap;
        }
        .category-table thead th{
          background: var(--green-300);
          color: var(--green-900);
          font-weight: 700;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .category-table tbody tr:hover{ background: #f6fbf7; }
        .empty{ text-align: center; padding: 20px 10px; color:#637083; }

        .color-box{
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6);
          display: inline-block;
        }

        .btn-delete{
          padding: 8px 12px;
          border-radius: 10px;
          background: var(--red-600);
          color: #fff;
          border: none;
          cursor: pointer;
          font-weight: 700;
          transition: background .12s, transform .12s;
        }
        .btn-delete:hover{ background: var(--red-700); transform: translateY(-1px); }

        /* App-like popup (toast / confirm) pinned under notch */
        .popup-message{
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 12px);
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 700;
          z-index: 9999;
          text-align: center;
          color: #fff;
          font-size: clamp(0.9rem, 1vw, 1rem);
          max-width: min(92vw, 520px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          word-break: break-word;
        }
        .popup-message.success{ background: #22c55e; }
        .popup-message.error{ background: #ef4444; }
        .popup-actions{
          margin-top: 10px;
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-popup-ok, .btn-popup-cancel{
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 700;
        }
        .btn-popup-ok{ background: var(--blue-600); color:#fff; }
        .btn-popup-ok:hover{ background: var(--blue-700); }
        .btn-popup-cancel{ background: #9e9e9e; color: #fff; }
        .btn-popup-cancel:hover{ background: #616161; }

        /* Mobile stacked table (optional alternative)
           If you prefer true "cards" on phones, uncomment this block and remove min-width on table.
        */
        /* 
        @media (max-width: 560px){
          .category-table, .category-table thead, .category-table tbody, .category-table th, .category-table td, .category-table tr{
            display: block;
          }
          .category-table thead{ display: none; }
          .category-table tr{
            background: #fff;
            margin-bottom: 10px;
            border-radius: 10px;
            border: 1px solid #eef2f7;
            overflow: hidden;
          }
          .category-table td{
            border: none;
            padding: 10px 14px;
            position: relative;
            display: grid;
            grid-template-columns: 40% 1fr;
            gap: 8px;
          }
          .category-table td::before{
            content: attr(data-label);
            font-weight: 700;
            color: #334155;
          }
        }
        */

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce){
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
      `}</style>
    </div>
  );
};

export default DocCategory;
