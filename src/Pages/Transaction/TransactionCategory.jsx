import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE =
  "https://express-backend-myapp.onrender.com/api/transaction-category";

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

  const showPopup = (type, msg) => {
    setPopup({ type, msg });
    setTimeout(() => setPopup(null), 2000);
  };

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
      const { data } = await axios.get(
        `${API_BASE}/categories/${id}/subcategories`
      );
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
      setCategories((prev) => [...prev, data]);
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
      setSubcats((prev) => [...prev, data]);
      setNewSub("");
      showPopup("success", "Subcategory added");
    } catch {
      showPopup("error", "Failed to add subcategory");
    }
  };

  return (
    <div className="tc-wrap">
      <style>{`
        .tc-wrap {
          padding: 14px;
          max-width: 640px;
          margin: 0 auto;
        }

        .tc-header {
          text-align: center;
          margin-bottom: 16px;
        }
        .tc-header-title {
          font-weight: 900;
          color: #0f172a;
          font-size: 1.45rem;
          margin: 0;
        }
        .tc-header-sub {
          color: #475569;
          font-size: .9rem;
        }

        .tc-card {
          background: #ffffff;
          border-radius: 18px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.04);
          margin-bottom: 16px;
        }

        .tc-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }
        .tc-label {
          font-weight: 700;
          color: #0f172a;
          font-size: .83rem;
        }
        .tc-input,
        .tc-color-input-text {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 9px 11px;
          font-size: .9rem;
          outline: none;
          transition: .15s;
          width: 100%;
        }
        .tc-input:focus,
        .tc-color-input-text:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 2px rgba(14, 165, 233, .12);
        }

        .tc-btn {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 800;
          width: 100%;
          margin-top: 4px;
          cursor: pointer;
          transition: .15s;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        .tc-btn-primary {
          background: linear-gradient(135deg, #06b6d4, #0ea5e9);
          color: white;
        }
        .tc-btn-primary:hover {
          filter: brightness(.96);
        }

        .tc-btn-secondary {
          background: #e0f2fe;
          color: #075985;
          font-weight: 700;
          width: auto;
          padding: 6px 11px;
          font-size: .78rem;
        }

        .tc-cat-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tc-cat-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .tc-cat-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .tc-color-dot {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          border: 1px solid #94a3b8;
          flex: 0 0 22px;
        }
        /* 👇 auto-size text */
        .tc-cat-name {
          font-weight: 700;
          color: #0f172a;
          /* desktop */
          font-size: 0.9rem;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          max-width: 180px;
        }

        .tc-sub-list {
          background: #f1f5f9;
          padding: 10px;
          border-radius: 12px;
          margin-top: 10px;
        }
        .tc-sub-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 10px;
          margin-bottom: 6px;
          color: #0f172a;
          font-weight: 600;
          /* auto-size for subs also */
          font-size: clamp(0.72rem, 2.5vw, 0.85rem);
        }

        .tc-popup {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          border-radius: 12px;
          padding: 10px 16px;
          box-shadow: 0 6px 24px rgba(0,0,0,0.15);
          font-weight: 700;
          z-index: 9999;
          max-width: 90%;
          text-align: center;
        }
        .tc-popup.success {
          color: #047857;
          border-left: 4px solid #10b981;
        }
        .tc-popup.error {
          color: #b91c1c;
          border-left: 4px solid #ef4444;
        }

        /* mobile */
        @media (max-width: 520px) {
          .tc-wrap {
            padding: 10px 8px 60px;
          }
          .tc-header-title {
            font-size: clamp(1.05rem, 4.4vw, 1.25rem);
          }
          .tc-card {
            padding: 13px 12px 14px;
            border-radius: 14px;
          }
          .tc-cat-item {
            flex-wrap: wrap;
          }
          /* 👇 on very small screens shrink names automatically */
          .tc-cat-name {
            max-width: 130px;
            font-size: clamp(0.74rem, 3.7vw, 0.9rem);
          }
          .tc-btn-secondary {
            font-size: 0.72rem;
            padding: 5px 10px;
          }
          .tc-input,
          .tc-color-input-text {
            font-size: 0.83rem;
          }
        }

        /* extra tiny screens */
        @media (max-width: 380px) {
          .tc-cat-name {
            max-width: 110px;
            font-size: clamp(0.7rem, 3.6vw, 0.8rem);
          }
        }
      `}</style>

      <div className="tc-header">
        <h2 className="tc-header-title">Transaction Categories</h2>
        <p className="tc-header-sub">Organize your spending beautifully 💸</p>
      </div>

      {/* Add Category */}
      <div className="tc-card">
        <h4 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>
          Add Category
        </h4>
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
              onChange={(e) =>
                setNewCat({ ...newCat, color: e.target.value })
              }
              style={{
                width: "50px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            />
            <input
              type="text"
              className="tc-color-input-text"
              value={newCat.color}
              onChange={(e) =>
                setNewCat({ ...newCat, color: e.target.value })
              }
            />
          </div>
        </div>
        <button className="tc-btn tc-btn-primary" onClick={addCategory}>
          Add Category
        </button>
      </div>

      {/* Category List */}
      <div className="tc-card">
        <h4 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>
          All Categories
        </h4>
        <div className="tc-cat-list">
          {categories.length === 0 ? (
            <div className="text-muted small">No categories found</div>
          ) : (
            categories.map((c) => (
              <div key={c.category_id} className="tc-cat-item">
                <div className="tc-cat-left">
                  <div
                    className="tc-color-dot"
                    style={{ background: c.category_color }}
                  ></div>
                  <span className="tc-cat-name">{c.category_name}</span>
                </div>
                <button
                  className="tc-btn tc-btn-secondary"
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
        <div className="tc-card">
          <h4 style={{ fontWeight: 900, color: "#0F172A" }}>
            {selectedCat.category_name} — Subcategories
          </h4>
          <div className="tc-field">
            <label className="tc-label">Add Subcategory</label>
            <input
              type="text"
              className="tc-input"
              placeholder="e.g., Snacks, Transport"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
            />
          </div>
          <button className="tc-btn tc-btn-primary" onClick={addSubcategory}>
            Add Subcategory
          </button>

          <div className="tc-sub-list">
            {subcats.length === 0 ? (
              <div className="text-muted small">No subcategories found</div>
            ) : (
              subcats.map((s) => (
                <div key={s.subcategory_id} className="tc-sub-item">
                  {s.subcategory_name}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Popup */}
      {popup && (
        <div className={`tc-popup ${popup.type}`}>{popup.msg}</div>
      )}
    </div>
  );
};

export default TransactionCategory;
