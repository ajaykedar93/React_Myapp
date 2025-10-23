// Document.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner";
import { useAuth } from "../../context/AuthContext"; // <-- useAuth only

const API_BASE = "https://express-myapp.onrender.com/api";

const Document = () => {
  const { user } = useAuth(); // expects { user_id, token, ... }
  const userId = user?.id ?? user?.user_id ?? null;

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: "", success: true });

  // Optional: attach auth token globally when available
  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [user?.token]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE}/documents/categories`);
        setCategories(res.data);
      } catch (err) {
        console.error("Category fetch error:", err);
      }
    };
    const fetchDocuments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/documents`);
        setDocuments(res.data);
      } catch (err) {
        console.error("Documents fetch error:", err);
      }
    };
    fetchCategories();
    fetchDocuments();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) {
        setSubcategories([]);
        setSelectedSubcategory("");
        return;
      }
      try {
        const res = await axios.get(
          `${API_BASE}/documents/categories/${selectedCategory}/subcategories`
        );
        setSubcategories(res.data || []);
      } catch (err) {
        console.error("Subcategories fetch error:", err);
        setSubcategories([]);
      }
    };
    fetchSubcategories();
  }, [selectedCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
  });

  const showPopup = (message, success = true) => {
    setPopup({ visible: true, message, success });
    setTimeout(() => setPopup({ visible: false, message: "", success: true }), 2500);
  };

  const handleUpload = async () => {
    if (!userId) return showPopup("Please sign in to upload documents.", false);
    if (!file) return showPopup("Please select a file.", false);
    if (!label) return showPopup("Label is required.", false);
    if (!selectedCategory) return showPopup("Select a category.", false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label);
    formData.append("purpose", purpose);
    formData.append("category_id", selectedCategory);
    formData.append("subcategory_id", selectedSubcategory || "");
    formData.append("user_id", userId); // <-- from AuthContext

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setLabel("");
      setPurpose("");
      setSelectedCategory("");
      setSelectedSubcategory("");
      const res = await axios.get(`${API_BASE}/documents`);
      setDocuments(res.data);
      showPopup("Document uploaded successfully!");
    } catch (err) {
      console.error(err);
      showPopup("Upload failed. Try again.", false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure to delete this document?")) return;
    try {
      await axios.delete(`${API_BASE}/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc.document_id !== id));
      showPopup("Document deleted successfully!");
    } catch (err) {
      console.error(err);
      showPopup("Delete failed.", false);
    }
  };

  return (
    <div className="doc-page">
      {loading && <LoadingSpinner />}
      {popup.visible && (
        <motion.div
          className={`popup-message ${popup.success ? "success" : "error"}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {popup.message}
        </motion.div>
      )}

      <motion.h2
        className="page-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        📁 Document Upload & Management
      </motion.h2>

      {/* Upload Card */}
      <motion.div
        className="upload-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
        >
          <input {...getInputProps()} />
          {file ? (
            <p className="mb-0 text-truncate">Selected file: {file.name}</p>
          ) : isDragActive ? (
            <p className="mb-0">Drop the file here...</p>
          ) : (
            <p className="mb-0">Drag & Drop any document or click to select</p>
          )}
        </div>

        <div className="form-row mt-3">
          <input
            type="text"
            className="form-input"
            placeholder="Label (required)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Purpose (optional)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          {/* Category Dropdown */}
          <select
            className="form-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>

          {/* Subcategory Dropdown (optional) */}
          {subcategories.length > 0 && (
            <select
              className="form-input"
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
            >
              <option value="">Select Subcategory (optional)</option>
              {subcategories.map((sub) => (
                <option key={sub.subcategory_id} value={sub.subcategory_id}>
                  {sub.subcategory_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="actions">
          <button
            className="btn-ghost"
            onClick={() => {
              setFile(null);
              setLabel("");
              setPurpose("");
              setSelectedCategory("");
              setSelectedSubcategory("");
            }}
          >
            Reset
          </button>
          <button className="btn-upload" onClick={handleUpload} disabled={loading}>
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </motion.div>

      {/* (Optional) Documents list/table goes here; unchanged) */}

      {/* Styles */}
      <style>{`
        .doc-page {
          background: linear-gradient(135deg, #fff8e1, #ffe0b2);
          min-height: 100vh;
          width: 100%;
          padding: 30px 20px;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .page-title {
          text-align: center;
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 40px;
          color: #e65100;
          width: 100%;
        }
        .upload-card, .table-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          width: 95%;
          max-width: 1200px;
        }
        .upload-card:hover, .table-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }
        .dropzone {
          border: 2px dashed #ff8f00;
          border-radius: 12px;
          padding: 50px;
          text-align: center;
          font-weight: 600;
          color: #ff8f00;
          font-size: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .dropzone-active { background-color: #fff3e0; }
        .form-row { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 25px; }
        .form-input { flex: 1; padding: 12px 18px; border-radius: 10px; border: 1px solid #ffcc80; font-size: 1rem; transition: all 0.3s ease; min-width: 220px; }
        .form-input:focus { outline: none; border-color: #ffb74d; box-shadow: 0 0 5px rgba(255,183,77,0.5); }
        .actions { display:flex; gap:10px; justify-content:flex-end; margin-top: 16px; }
        .btn-upload { background: linear-gradient(90deg, #ffa726, #ff7043); color: #fff; padding: 12px 22px; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
        .btn-upload:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(255,112,67,0.35); }
        .btn-ghost { background: #fff7ed; color: #9a5a22; border: 1px dashed #f5c38a; border-radius: 12px; padding: 12px 16px; font-weight: 700; }
        .btn-ghost:hover { background: #ffedd5; }
        .popup-message { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 15px 30px; border-radius: 12px; font-weight: 600; z-index: 9999; text-align: center; color: white; font-size: 1rem; }
        .popup-message.success { background: #2e7d32; }
        .popup-message.error { background: #c62828; }
        @media (max-width: 768px) {
          .form-row { flex-direction: column; }
          .form-input { width: 100%; }
          .upload-card { padding: 20px; width: 95%; }
          .dropzone { padding: 35px; font-size: 0.95rem; }
        }
      `}</style>
    </div>
  );
};

export default Document;
