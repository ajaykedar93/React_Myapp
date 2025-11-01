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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/categories`);
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      showPopup("error", "Failed to load categories");
    }
  };

  const fetchSubcategories = async (id) => {
    try {
      const { data } = await axios.get(`${API_BASE}/categories/${id}/subcategories`);
      setSubcats(Array.isArray(data) ? data : []);
    } catch {
      setSubcats([]);
    }
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) return showPopup("error", "Enter category name");
    try {
      const { data } = await axios.post(`${API_BASE}/categories`, {
        category_name: newCat.name,
        category_color: newCat.color,
      });
      setCategories([...categories, data]);
      setNewCat({ name: "", color: "#0284C7" });
      showPopup("success", "Category added");
    } catch {
      showPopup("error", "Failed to add category");
    }
  };

  const addSubcategory = async () => {
    if (!selectedCat) return showPopup("error", "Select category first");
    if (!newSub.trim()) return showPopup("error", "Enter subcategory name");
    try {
      const { data } = await axios.post(`${API_BASE}/subcategories`, {
        subcategory_name: newSub,
        category_id: selectedCat.category_id,
      });
      setSubcats([...subcats, data]);
      setNewSub("");
      showPopup("success", "Subcategory added");
    } catch {
      showPopup("error", "Failed to add subcategory");
    }
  };

  const showPopup = (type, msg) => {
    setPopup({ type, msg });
    setTimeout(() => setPopup(null), 2000);
  };

  return (
    <div className="wrap">
      <style>{`
        body {
          background: linear-gradient(180deg, #E0F7FA, #F1F5F9);
          font-family: 'Inter', sans-serif;
        }
        .wrap {
          padding: 14px;
          max-width: 640px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 16px;
        }
        .header h2 {
          font-weight: 900;
          color: #0F172A;
          font-size: 1.6rem;
          margin: 0;
        }
        .header p {
          color: #475569;
          font-size: .9rem;
        }

        .card {
          background: #FFFFFF;
          border-radius: 18px;
          padding: 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);
          margin-bottom: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }
        label {
          font-weight: 700;
          color: #0F172A;
          font-size: .85rem;
        }
        input[type=text], input[type=color] {
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: .95rem;
        }

        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 800;
          width: 100%;
          margin-top: 4px;
          cursor: pointer;
          transition: .15s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #06B6D4, #0EA5E9);
          color: white;
        }
        .btn-primary:hover {
          filter: brightness(.96);
        }
        .btn-secondary {
          background: #E0F2FE;
          color: #075985;
          font-weight: 700;
        }
        .btn-secondary:hover {
          background: #BAE6FD;
        }

        .cat-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cat-item {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cat-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .color-dot {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          border: 1px solid #94A3B8;
        }

        .sub-list {
          background: #F1F5F9;
          padding: 10px;
          border-radius: 12px;
          margin-top: 10px;
        }
        .sub-item {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px 10px;
          margin-bottom: 6px;
          color: #0F172A;
          font-weight: 600;
        }

        .popup {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: #FFFFFF;
          border-radius: 12px;
          padding: 10px 16px;
          box-shadow: 0 6px 24px rgba(0,0,0,0.15);
          font-weight: 700;
          z-index: 9999;
        }
        .popup.success {
          color: #047857;
          border-left: 4px solid #10B981;
        }
        .popup.error {
          color: #B91C1C;
          border-left: 4px solid #EF4444;
        }

        @media (min-width: 600px) {
          .card { padding: 20px; }
        }
      `}</style>

      <div className="header">
        <h2>Transaction Categories</h2>
        <p>Organize your spending beautifully 💸</p>
      </div>

      {/* Add Category */}
      <div className="card">
        <h4 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>Add Category</h4>
        <div className="field">
          <label>Category Name</label>
          <input
            type="text"
            placeholder="e.g., Office, Travel, Shopping"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Color</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="color"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
              style={{ width: "50px", height: "36px", borderRadius: "8px" }}
            />
            <input
              type="text"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={addCategory}>
          Add Category
        </button>
      </div>

      {/* Category List */}
      <div className="card">
        <h4 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>All Categories</h4>
        <div className="cat-list">
          {categories.length === 0 ? (
            <div className="text-muted small">No categories found</div>
          ) : (
            categories.map((c) => (
              <div key={c.category_id} className="cat-item">
                <div className="cat-left">
                  <div className="color-dot" style={{ background: c.category_color }}></div>
                  <span style={{ fontWeight: 700 }}>{c.category_name}</span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 10px" }}
                  onClick={() => {
                    setSelectedCat(c);
                    fetchSubcategories(c.category_id);
                  }}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subcategory Section */}
      {selectedCat && (
        <div className="card">
          <h4 style={{ fontWeight: 900, color: "#0F172A" }}>
            {selectedCat.category_name} — Subcategories
          </h4>
          <div className="field">
            <label>Add Subcategory</label>
            <input
              type="text"
              placeholder="e.g., Snacks, Transport"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={addSubcategory}>
            Add Subcategory
          </button>

          <div className="sub-list">
            {subcats.length === 0 ? (
              <div className="text-muted small">No subcategories found</div>
            ) : (
              subcats.map((s) => (
                <div key={s.subcategory_id} className="sub-item">
                  {s.subcategory_name}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Popup */}
      {popup && <div className={`popup ${popup.type}`}>{popup.msg}</div>}
    </div>
  );
};

export default TransactionCategory;
