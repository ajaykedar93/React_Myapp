// ManageDocuments.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner";
import { FaFilePdf, FaFileWord, FaFileAlt, FaFileImage, FaFile } from "react-icons/fa";

const API_BASE = "https://express-myapp.onrender.com/api/documents";

const getFileIcon = (fileName) => {
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FaFilePdf />;
    case "doc":
    case "docx":
      return <FaFileWord />;
    case "txt":
      return <FaFileAlt />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return <FaFileImage />;
    default:
      return <FaFile />;
  }
};

const ManageDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    success: true,
    onConfirm: null,
    onCancel: null,
  });
  const [editDoc, setEditDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error(err);
      showPopup("Failed to fetch documents", false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const showPopup = (message, success = true, onConfirm = null, onCancel = null) => {
    setPopup({ visible: true, message, success, onConfirm, onCancel });
  };

  const closePopup = () =>
    setPopup({ visible: false, message: "", success: true, onConfirm: null, onCancel: null });

  const handleDelete = (id) => {
    showPopup(
      "Are you sure you want to delete this document?",
      true,
      async () => {
        try {
          await axios.delete(`${API_BASE}/${id}`);
          showPopup("Document deleted successfully!");
          fetchDocuments();
        } catch (err) {
          console.error(err);
          showPopup("Delete failed", false);
        }
      },
      () => closePopup()
    );
  };

  const handleUpdate = async (doc) => {
    try {
      const { label, purpose, category_id, document_id } = doc;
      await axios.put(`${API_BASE}/${document_id}`, { label, purpose, category_id });
      setEditDoc(null);
      showPopup("Document updated successfully!");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showPopup("Update failed", false);
    }
  };

  const handleChange = (e, doc, field) => {
    const value = e.target.value;
    setDocuments((prev) =>
      prev.map((d) => (d.document_id === doc.document_id ? { ...d, [field]: value } : d))
    );
  };

  return (
    <div className="manage-docs-page">
      {loading && <LoadingSpinner />}

      {/* Popup */}
      {popup.visible && (
        <motion.div
          className={`popup ${popup.success ? "ok" : "err"}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
        >
          <div className="popup-inner">
            <h6 className="popup-title">{popup.success ? "Notice" : "Error"}</h6>
            <p className="popup-msg">{popup.message}</p>

            {(popup.onConfirm || popup.onCancel) ? (
              <div className="popup-actions">
                {popup.onCancel && (
                  <button className="btn-ghost" onClick={() => { popup.onCancel(); closePopup(); }}>
                    Cancel
                  </button>
                )}
                {popup.onConfirm && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      popup.onConfirm();
                      closePopup();
                    }}
                  >
                    OK
                  </button>
                )}
              </div>
            ) : (
              <button className="btn-primary w100" onClick={closePopup}>
                OK
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="header">
        <motion.h2
          className="title"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          📂 Manage Documents
        </motion.h2>
        <div className="sub">Review, edit, download, or delete your uploaded documents.</div>
      </div>

      {/* Table Card */}
      <motion.div
        className="card"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th className="sticky">File</th>
                <th className="sticky">Label</th>
                <th className="sticky">Purpose</th>
                <th className="sticky">Category</th>
                <th className="sticky">Uploaded On</th>
                <th className="sticky">Status</th>
                <th className="sticky" style={{ minWidth: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.document_id}>
                  <td className="file-cell">
                    <span className="file-icon">{getFileIcon(doc.file_name)}</span>
                    <span className="file-name" title={doc.file_name}>{doc.file_name}</span>
                  </td>

                  <td>
                    {editDoc?.document_id === doc.document_id ? (
                      <input
                        className="inp"
                        value={doc.label || ""}
                        onChange={(e) => handleChange(e, doc, "label")}
                      />
                    ) : (
                      <span className="text-ink">{doc.label}</span>
                    )}
                  </td>

                  <td>
                    {editDoc?.document_id === doc.document_id ? (
                      <input
                        className="inp"
                        value={doc.purpose || ""}
                        onChange={(e) => handleChange(e, doc, "purpose")}
                        placeholder="Optional"
                      />
                    ) : (
                      <span className="text-muted">{doc.purpose || "-"}</span>
                    )}
                  </td>

                  <td>
                    {editDoc?.document_id === doc.document_id ? (
                      <select
                        className="sel"
                        value={doc.category_id || ""}
                        onChange={(e) => handleChange(e, doc, "category_id")}
                      >
                        <option value="">Select</option>
                        {categories.map((cat) => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.category_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="chip">{doc.category_name || "-"}</span>
                    )}
                  </td>

                  <td>
                    <span className="text-ink">
                      {doc.upload_date ? new Date(doc.upload_date).toLocaleString() : "-"}
                    </span>
                  </td>

                  <td>
                    <span className={`status ${String(doc.status).toLowerCase()}`}>
                      {doc.status}
                    </span>
                  </td>

                  <td className="actions">
                    {editDoc?.document_id === doc.document_id ? (
                      <div className="stack">
                        <button className="btn-save" onClick={() => handleUpdate(doc)}>Save</button>
                        <button className="btn-cancel" onClick={() => setEditDoc(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="stack">
                        <button className="btn-edit" onClick={() => setEditDoc(doc)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(doc.document_id)}>Delete</button>
                        <motion.a
                          className="btn-download"
                          href={`${API_BASE}/${doc.document_id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Download
                        </motion.a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Styles */}
      <style>{`
        :root{
          --bg: linear-gradient(135deg,#f7f8fc 0%,#eef6ff 100%);
          --card:#ffffff;
          --ink-900:#0b1220; --ink-700:#2a3242; --ink-600:#415067; --ink-500:#657289; --muted:#eef2f6;
          --border:#e6ecf5;
          --brand-grad: linear-gradient(90deg,#6f42c1,#d6336c);
          --ok:#12b981; --err:#ef4444;
          --chip:#f5f0ff; --chip-text:#5b3dbf; --chip-border:#e3d9ff;
          --sticky:#f8fafc;
          --btn1:#5b3dbf; --btn1h:#4c2fb3;
          --btn2:#ef4444; --btn2h:#dc2626;
          --btn3:#0ea5e9; --btn3h:#0284c7;
          --btn4:#9ca3af; --btn4h:#6b7280;
          --accent: linear-gradient(90deg,#ff7a59,#ffba42);
        }

        .manage-docs-page{
          min-height:100vh; background:var(--bg);
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          padding: 28px 16px 40px;
          display:flex; flex-direction:column; align-items:center;
        }

        .header{ width:100%; max-width:1200px; text-align:center; margin-bottom:14px; }
        .title{
          font-weight:900; letter-spacing:.3px;
          background: var(--brand-grad);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          margin:0 0 6px 0;
        }
        .sub{ color:var(--ink-600); font-size:14.5px; }

        .card{
          width:100%; max-width:1200px; background:var(--card);
          border:1px solid var(--border); border-radius:18px;
          box-shadow: 0 10px 34px rgba(22,34,66,.08);
          padding: 16px;
        }

        .table-wrap{ width:100%; overflow:auto; border-radius:12px; }
        .doc-table{ width:100%; border-collapse:separate; border-spacing:0; }
        .doc-table thead th{
          position:sticky; top:0; z-index:1; background:var(--sticky);
          border-bottom:1px solid var(--border); padding:12px 14px; font-weight:800;
          color:var(--ink-700); text-align:left; white-space:nowrap;
        }
        .doc-table tbody td{
          padding:12px 14px; border-bottom:1px solid var(--border); color:var(--ink-700);
        }
        .doc-table tbody tr:hover{ background:#fafbff; }

        .file-cell{ display:flex; align-items:center; gap:10px; }
        .file-icon{
          width:34px; height:34px; display:grid; place-items:center;
          background:var(--muted); border-radius:10px; color:#4b5563; font-size:16px;
        }
        .file-name{ max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink-900); font-weight:600; }

        .inp, .sel{
          width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:10px;
          outline:none; font-size:14px; color:var(--ink-700);
          background:#fff; transition: box-shadow .15s ease, border-color .15s ease;
        }
        .inp:focus, .sel:focus{ border-color:#c7d2fe; box-shadow:0 0 0 3px rgba(99,102,241,.18); }

        .chip{
          display:inline-block; padding:6px 10px; border-radius:999px;
          background:var(--chip); color:var(--chip-text); border:1px solid var(--chip-border);
          font-weight:700; font-size:12.5px;
        }
        .text-ink{ color:var(--ink-900); font-weight:600; }
        .text-muted{ color:var(--ink-500); }

        .status{
          padding:6px 10px; border-radius:10px; font-weight:800; font-size:12px;
          display:inline-block; border:1px solid var(--border);
        }
        .status.active{ background:#ecfdf5; color:#065f46; border-color:#bbf7d0; }
        .status.pending{ background:#fef3c7; color:#92400e; border-color:#fde68a; }
        .status.archived{ background:#f1f5f9; color:#334155; border-color:#e2e8f0; }

        .actions .stack{ display:flex; gap:10px; flex-wrap:wrap; }

        .btn-edit{ background:var(--btn1); }
        .btn-edit:hover{ background:var(--btn1h); }
        .btn-delete{ background:var(--btn2); }
        .btn-delete:hover{ background:var(--btn2h); }
        .btn-save{ background:var(--btn3); }
        .btn-save:hover{ background:var(--btn3h); }
        .btn-cancel{ background:var(--btn4); }
        .btn-cancel:hover{ background:var(--btn4h); }
        .btn-download{ background: var(--accent); }

        .btn-edit, .btn-delete, .btn-save, .btn-cancel, .btn-download{
          color:#fff; border:none; border-radius:12px; padding:8px 14px; font-weight:800; cursor:pointer;
          transform: translateZ(0); transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
          box-shadow: 0 4px 12px rgba(28,39,64,.12);
          text-decoration:none; display:inline-flex; align-items:center; justify-content:center;
        }
        .btn-edit:hover, .btn-delete:hover, .btn-save:hover, .btn-cancel:hover, .btn-download:hover{
          transform: translateY(-1px);
          filter: brightness(.98);
        }

        .empty{ text-align:center; padding:20px 0; color:var(--ink-500); }

        /* Popup */
        .popup{
          position: fixed; inset: 0; display:grid; place-items:center; z-index: 9999;
          backdrop-filter: blur(4px);
          background: rgba(10, 15, 30, .28);
          padding: 16px;
        }
        .popup-inner{
          width:100%; max-width:420px; background: rgba(255,255,255,.9);
          border:1px solid var(--border); border-radius:16px;
          box-shadow: 0 20px 48px rgba(16,24,40,.2);
          padding:18px;
        }
        .popup-title{ margin:0 0 6px 0; font-weight:900; color:var(--ink-900); }
        .popup-msg{ margin:0; color:var(--ink-700); }
        .popup-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:14px; }

        .btn-primary{
          background: var(--brand-grad); color:#fff; border:none; border-radius:12px;
          padding:10px 16px; font-weight:900; cursor:pointer;
        }
        .btn-ghost{
          background:#fff; color:var(--ink-700); border:1px dashed var(--border); border-radius:12px;
          padding:10px 16px; font-weight:900; cursor:pointer;
        }
        .w100{ width:100%; }
      `}</style>
    </div>
  );
};

export default ManageDocuments;
