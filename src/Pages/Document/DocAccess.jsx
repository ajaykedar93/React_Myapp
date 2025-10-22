// DocAccess.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner";

const API_BASE = "http://localhost:5000/api/documents";

const fileEmojiByMime = {
  "application/pdf": "📄",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
  "image/gif": "🖼️",
  "text/plain": "📃",
  default: "📁",
};

const DocAccess = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Category fetch error:", err);
    }
  };

  const handleCategorySelect = async (catId) => {
    setSelectedCat(catId);
    if (!catId) return setDocuments([]);
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/category/${catId}`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error("Fetch documents error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEmoji = (mime) => fileEmojiByMime[mime] || fileEmojiByMime.default;

  const handleView = (doc) => window.open(`${API_BASE}/view/${doc.document_id}`, "_blank");
  const handleDownload = (doc) => {
    const a = document.createElement("a");
    a.href = `${API_BASE}/${doc.document_id}/file`;
    a.download = doc.file_name;
    a.click();
  };

  return (
    <div className="doc-access">
      {loading && <LoadingSpinner />}

      <div className="hero">
        <motion.h2
          className="title"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          📂 Access Documents by Category
        </motion.h2>
        <p className="sub">Quickly filter, view, and download your documents.</p>
      </div>

      {/* Category selector — options show colorful text (uses each category's color) */}
      <motion.div
        className="controls"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <label className="lbl">Category</label>
        <select
          value={selectedCat}
          onChange={(e) => handleCategorySelect(e.target.value)}
          className="select colorful"
        >
          <option value="">All categories</option>
          {categories.map((cat) => {
            const color = cat.color || cat.category_color || "#111827";
            // Use a colored dot + name; the option text itself inherits the color style.
            return (
              <option
                key={cat.category_id}
                value={cat.category_id}
                style={{ color }}
              >
                ● {cat.category_name}
              </option>
            );
          })}
        </select>
      </motion.div>

      <motion.div
        className="card"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {documents.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🗂️</div>
            <div className="empty-title">No documents to show</div>
            <div className="empty-sub">
              Select a category above to see matching files.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th className="sticky">File</th>
                  <th className="sticky">Label</th>
                  <th className="sticky">Purpose</th>
                  <th className="sticky">Uploaded</th>
                  <th className="sticky">Status</th>
                  <th className="sticky" style={{ minWidth: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.document_id}>
                    <td className="file-cell">
                      <span className="file-emoji">{getEmoji(doc.file_type)}</span>
                      <span className="file-name" title={doc.file_name}>{doc.file_name}</span>
                    </td>
                    <td className="text-ink">{doc.label}</td>
                    <td className="text-muted">{doc.purpose || "-"}</td>
                    <td className="text-ink">
                      {doc.upload_date ? new Date(doc.upload_date).toLocaleString() : "-"}
                    </td>
                    <td>
                      <span className={`status ${String(doc.status).toLowerCase()}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="btn view" onClick={() => handleView(doc)}>View</button>
                      <button className="btn download" onClick={() => handleDownload(doc)}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <style>{`
        :root{
          --bg: linear-gradient(135deg,#f7f8fc 0%,#eef6ff 100%);
          --card:#ffffff;
          --ink-900:#0b1220; --ink-700:#2a3242; --ink-600:#415067; --ink-500:#657289;
          --muted:#eef2f6; --border:#e6ecf5; --sticky:#f8fafc;
          --brand-grad: linear-gradient(90deg,#6f42c1,#d6336c);
          --view:#0ea5e9; --viewH:#0284c7;
          --download:#f59e0b; --downloadH:#d97706;
        }

        .doc-access{
          min-height:100vh; background:var(--bg);
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          padding: 28px 16px 40px;
          display:flex; flex-direction:column; align-items:center;
        }

        .hero{ width:100%; max-width:1200px; text-align:center; margin-bottom:10px; }
        .title{
          font-weight:900; letter-spacing:.3px; margin:0;
          background: var(--brand-grad); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        }
        .sub{ color:var(--ink-600); margin-top:6px; }

        .controls{
          width:100%; max-width:1200px; background:var(--card); border:1px solid var(--border);
          border-radius:16px; box-shadow:0 10px 34px rgba(22,34,66,.06);
          padding:14px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;
        }
        .lbl{ font-weight:800; color:var(--ink-700); }
        .select{
          min-width:240px; flex:1; padding:10px 12px; border-radius:12px; border:1px solid var(--border);
          outline:none; background:#fff; color:var(--ink-700); font-weight:600;
          appearance: none; /* cleaner look */
          background-image: linear-gradient(45deg, transparent 50%, #9aa4b2 50%),
                            linear-gradient(135deg, #9aa4b2 50%, transparent 50%),
                            linear-gradient(to right, #fff, #fff);
          background-position: calc(100% - 18px) calc(1em + 2px),
                               calc(100% - 13px) calc(1em + 2px),
                               100% 0;
          background-size: 5px 5px, 5px 5px, 2.5em 2.5em;
          background-repeat: no-repeat;
        }
        .select:focus{ border-color:#c7d2fe; box-shadow:0 0 0 3px rgba(99,102,241,.18); }
        /* Make option colors render consistently across browsers that support it */
        .select.colorful option { font-weight: 700; }

        .card{
          width:100%; max-width:1200px; background:var(--card);
          border:1px solid var(--border); border-radius:18px; margin-top:14px;
          box-shadow: 0 10px 34px rgba(22,34,66,.08); padding: 12px;
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
        .file-emoji{
          width:36px; height:36px; display:grid; place-items:center;
          background:var(--muted); border-radius:10px; font-size:18px;
        }
        .file-name{
          max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          color:var(--ink-900); font-weight:700;
        }
        .text-ink{ color:var(--ink-900); font-weight:600; }
        .text-muted{ color:var(--ink-500); }

        .status{
          padding:6px 10px; border-radius:12px; font-weight:900; font-size:12px; border:1px solid var(--border);
        }
        .status.active{ background:#ecfdf5; color:#065f46; border-color:#bbf7d0; }
        .status.pending{ background:#fff7ed; color:#9a3412; border-color:#fed7aa; }
        .status.archived{ background:#f1f5f9; color:#334155; border-color:#e2e8f0; }

        .actions{ display:flex; gap:10px; flex-wrap:wrap; }
        .btn{
          color:#fff; border:none; border-radius:12px; padding:8px 14px; font-weight:900; cursor:pointer;
          box-shadow: 0 4px 12px rgba(28,39,64,.12);
          transform: translateZ(0); transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
        }
        .btn:hover{ transform: translateY(-1px); filter: brightness(.98); }
        .btn.view{ background: var(--view); }
        .btn.view:hover{ background: var(--viewH); }
        .btn.download{ background: var(--download); }
        .btn.download:hover{ background: var(--downloadH); }

        .empty{
          display:grid; place-items:center; text-align:center; padding:26px 10px;
        }
        .empty-emoji{ font-size:42px; }
        .empty-title{ font-weight:900; color:var(--ink-900); margin-top:8px; }
        .empty-sub{ color:var(--ink-600); font-size:14.5px; margin-top:4px; }

        @media (max-width: 768px) {
          .file-name{ max-width:180px; }
          .btn{ padding:7px 12px; font-size:.92rem; }
        }
      `}</style>
    </div>
  );
};

export default DocAccess;
