// DocCategory.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner";

const API_BASE = "https://express-myapp.onrender.com/api/documents";

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

  const handleAddCategory = async () => {
    if (!newCategory.category_name.trim())
      return showPopup("Category name is required", false);
    try {
      const res = await axios.post(`${API_BASE}/categories`, newCategory);
      if (res.data.success) {
        fetchCategories();
        setNewCategory({ category_name: "", subcategory: "", description: "", color: "#6B7280" });
        showPopup("Category added successfully!");
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
          fetchCategories();
          showPopup("Category deleted successfully!");
        } catch (err) {
          console.error(err);
          showPopup("Delete failed", false);
        }
      },
      () => setPopup({ visible: false, message: "", success: true, onConfirm: null, onCancel: null })
    );
  };

  return (
    <div className="category-page">
      {loading && <LoadingSpinner />}

      {popup.visible && (
        <motion.div
          className={`popup-message ${popup.success ? "success" : "error"}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {popup.message}
          {(popup.onConfirm || popup.onCancel) && (
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", gap: "10px" }}>
              {popup.onConfirm && (
                <button
                  className="btn-popup-ok"
                  onClick={() => {
                    popup.onConfirm();
                    setPopup({ visible: false, message: "", success: true, onConfirm: null, onCancel: null });
                  }}
                >
                  OK
                </button>
              )}
              {popup.onCancel && (
                <button
                  className="btn-popup-cancel"
                  onClick={() => {
                    popup.onCancel();
                    setPopup({ visible: false, message: "", success: true, onConfirm: null, onCancel: null });
                  }}
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3>Add New Category</h3>
        <div className="form-group">
          <input
            type="text"
            placeholder="Category Name"
            value={newCategory.category_name}
            onChange={(e) => setNewCategory({ ...newCategory, category_name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Subcategory (optional)"
            value={newCategory.subcategory}
            onChange={(e) => setNewCategory({ ...newCategory, subcategory: e.target.value })}
          />
          <input
            type="text"
            placeholder="Description"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
          />
          <input
            type="color"
            value={newCategory.color}
            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
          />
          <button className="btn-add" onClick={handleAddCategory}>
            Add Category
          </button>
        </div>
      </motion.div>

      <motion.div
        className="category-table-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
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
                <td>{cat.category_name}</td>
                <td>{cat.subcategory || "-"}</td>
                <td>{cat.description || "-"}</td>
                <td>
                  <div style={{ width: "24px", height: "24px", background: cat.color, borderRadius: "4px" }}></div>
                </td>
                <td>
                  <button className="btn-delete" onClick={() => handleDeleteCategory(cat.category_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <style>{`
        .category-page { padding: 30px 20px; font-family: 'Inter', sans-serif; background: #f4f6f8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
        .page-title { font-size: 2rem; font-weight: 700; margin-bottom: 25px; color: #1b5e20; text-align: center; }
        .add-category-card, .category-table-card { background: #fff; padding: 25px; border-radius: 12px; width: 100%; max-width: 900px; margin-bottom: 25px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .add-category-card h3 { margin-bottom: 15px; color: #333; }
        .form-group { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .form-group input[type="text"] { padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; flex: 1; }
        .form-group input[type="color"] { width: 50px; height: 40px; border: none; cursor: pointer; }
        .btn-add { padding: 8px 16px; border-radius: 8px; background: #1e88e5; color: #fff; border: none; cursor: pointer; font-weight: 500; }
        .btn-add:hover { background: #1565c0; }

        .category-table { width: 100%; border-collapse: collapse; }
        .category-table th, .category-table td { padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; }
        .category-table th { background: #a5d6a7; color: #1b5e20; font-weight: 600; }
        .category-table tr:hover { background: #f1f8e9; }
        .btn-delete { padding: 6px 12px; border-radius: 8px; background: #f44336; color: #fff; border: none; cursor: pointer; font-weight: 500; }
        .btn-delete:hover { background: #d32f2f; }

        .popup-message { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 18px 30px; border-radius: 12px; font-weight: 600; z-index: 9999; text-align: center; color: white; font-size: 1rem; }
        .popup-message.success { background: #22c55e; } 
        .popup-message.error { background: #ef4444; }
        .btn-popup-ok { background: #1e88e5; color: white; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 500; border: none; }
        .btn-popup-ok:hover { background: #1565c0; }
        .btn-popup-cancel { background: #9e9e9e; color: white; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 500; border: none; }
        .btn-popup-cancel:hover { background: #616161; }

        @media (max-width: 768px) {
          .form-group { flex-direction: column; align-items: stretch; }
          .form-group input, .form-group button { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default DocCategory;
