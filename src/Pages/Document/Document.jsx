// Document.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner";
import { useAuth } from "../../context/AuthContext"; // <-- useAuth only

const API_BASE = "https://express-backend-myapp.onrender.com/api";

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
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          role="status"
          aria-live="polite"
        >
          {popup.message}
        </motion.div>
      )}

      <motion.h2
        className="page-title"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        📁 Document Upload & Management
      </motion.h2>

      {/* Upload Card */}
      <motion.div
        className="upload-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
          aria-label="File drop area"
        >
          <input {...getInputProps()} aria-label="Choose file" />
          {file ? (
            <p className="mb-0 text-truncate" title={file.name}>
              Selected file: <strong>{file.name}</strong>
            </p>
          ) : isDragActive ? (
            <p className="mb-0">Drop the file here…</p>
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
            type="button"
          >
            Reset
          </button>
          <button className="btn-upload" onClick={handleUpload} disabled={loading} type="button">
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </motion.div>

      {/* (Optional) Documents list/table can be rendered here) */}

      {/* Styles */}
      <style>{`
        :root{
          --orange-900:#e65100;
          --orange-700:#ff8f00;
          --orange-500:#ffa726;
          --orange-400:#ffb74d;
          --orange-300:#ffcc80;
          --orange-200:#ffe0b2;
          --orange-100:#fff3e0;
          --shadow: 0 10px 30px rgba(0,0,0,0.1);
          --shadow-hover: 0 15px 35px rgba(0,0,0,0.15);
          --radius: 16px;
        }

        /* Full-height app layout with safe-area padding for iOS notches */
        .doc-page{
          background: linear-gradient(135deg, #fff8e1, var(--orange-200));
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          padding: clamp(16px, 2.5vw, 30px) clamp(12px, 2vw, 20px);
          padding-top: calc(env(safe-area-inset-top, 0px) + clamp(12px,1.5vw,20px));
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + clamp(12px,1.5vw,20px));
          font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }

        .page-title{
          text-align:center;
          font-size: clamp(1.4rem, 2.2vw, 2.2rem);
          line-height:1.2;
          font-weight: 800;
          margin: 0 0 clamp(20px, 3vw, 40px);
          color: var(--orange-900);
          width: 100%;
          word-break: break-word;
        }

        .upload-card, .table-card{
          background: #fff;
          border-radius: var(--radius);
          padding: clamp(18px, 2.2vw, 30px);
          margin-bottom: clamp(18px, 2.2vw, 30px);
          box-shadow: var(--shadow);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          width: min(100%, 1200px);
          box-sizing: border-box;
        }
        .upload-card:hover, .table-card:hover{ transform: translateY(-4px); box-shadow: var(--shadow-hover); }

        .dropzone{
          border: 2px dashed var(--orange-700);
          border-radius: 12px;
          padding: clamp(22px, 4vw, 50px);
          text-align: center;
          font-weight: 700;
          color: var(--orange-700);
          font-size: clamp(0.95rem, 1.1vw, 1rem);
          transition: all 0.3s ease;
          cursor: pointer;
          overflow: hidden;
        }
        .dropzone-active{ background-color: var(--orange-100); }
        .mb-0{ margin-bottom:0; }
        .text-truncate{
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Responsive grid for inputs: auto-fit columns with a sensible min */
        .form-row{
          display: grid;
          gap: clamp(10px, 1.2vw, 15px);
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          margin-top: clamp(16px, 2vw, 25px);
        }

        .form-input{
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid var(--orange-300);
          font-size: 1rem;
          transition: all 0.2s ease;
          min-width: 0; /* prevents overflow in grid cells on tiny screens */
          box-sizing: border-box;
          background: #fff;
        }
        .form-input:focus{
          outline: none;
          border-color: var(--orange-400);
          box-shadow: 0 0 0 4px rgba(255, 183, 77, 0.25);
        }

        .actions{
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .btn-upload{
          background: linear-gradient(90deg, var(--orange-500), #ff7043);
          color: #fff;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
          touch-action: manipulation;
        }
        .btn-upload:disabled{ opacity: 0.7; cursor: not-allowed; }
        .btn-upload:hover{ transform: translateY(-1px); box-shadow: 0 8px 20px rgba(255, 112, 67, 0.35); }

        .btn-ghost{
          background: #fff7ed;
          color: #9a5a22;
          border: 1px dashed #f5c38a;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .btn-ghost:hover{ background: #ffedd5; }

        /* App-like toast pinned under the notch area with max-width */
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
        .popup-message.success{ background:#2e7d32; }
        .popup-message.error{ background:#c62828; }

        /* Ultra-small phones tweaks */
        @media (max-width: 360px){
          .form-row{ grid-template-columns: 1fr; }
        }

        /* Reduce motion if user prefers */
        @media (prefers-reduced-motion: reduce){
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
        }
      `}</style>
    </div>
  );
};

export default Document;
