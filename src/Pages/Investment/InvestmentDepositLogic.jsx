import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_CATEGORY = "https://express-backend-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY = "https://express-backend-myapp.onrender.com/api/investment_subcategory";
const API_DEPOSIT = "https://express-backend-myapp.onrender.com/api/deposits";

const colors = {
  primary: "#5f4bb6",
  secondary: "#1f5f78",
  success: "#0f8a5f",
  danger: "#b33a3a",
  warning: "#b3833a",
  surface: "#fff",
  border: "#e6e9ef",
  bg: "#f6f8fb",
  text: "#1b2430",
};

export default function InvestmentDepositLogic() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  const [form, setForm] = useState({
    category_id: "",
    subcategory_id: "",
    deposit_amount: "",
    risk: "",
    reward: "",
    trading_days: "",
    ratio: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ ...form });

  const [confirm, setConfirm] = useState({
    show: false,
    message: "",
    onConfirm: null,
    onCancel: null,
  });

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const filteredSubcategories = useMemo(() => {
    const cat = selectedCategory || form.category_id;
    if (!cat) return [];
    return subcategories.filter((s) => String(s.category_id) === String(cat));
  }, [selectedCategory, form.category_id, subcategories]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 1800);
  };

  const askConfirm = (message, onConfirm) =>
    setConfirm({
      show: true,
      message,
      onConfirm: () => {
        setConfirm({ show: false });
        onConfirm?.();
      },
      onCancel: () => setConfirm({ show: false }),
    });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [c, s, d] = await Promise.all([
        axios.get(API_CATEGORY),
        axios.get(API_SUBCATEGORY),
        axios.get(API_DEPOSIT),
      ]);
      setCategories(c.data || []);
      setSubcategories(s.data || []);
      setDeposits(d.data || []);
    } catch {
      showToast("Failed to load data", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "category_id") {
      setSelectedCategory(value);
      setForm((f) => ({ ...f, subcategory_id: "" }));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const validate = (obj) => {
    const { category_id, subcategory_id, deposit_amount, risk, reward, trading_days, ratio } = obj;
    if (!category_id || !subcategory_id || !deposit_amount || !risk || !reward || !trading_days || !ratio)
      return "Please fill all required fields.";
    if (Number(trading_days) <= 0) return "Trading days must be > 0.";
    return null;
  };

  const saveDeposit = async () => {
    const err = validate(form);
    if (err) return showToast(err, "danger");
    try {
      const payload = {
        category_id: Number(form.category_id),
        subcategory_id: Number(form.subcategory_id),
        deposit_amount: Number(form.deposit_amount),
        risk: Number(form.risk),
        reward: Number(form.reward),
        trading_days: Number(form.trading_days),
        ratio: form.ratio,
      };
      await axios.post(API_DEPOSIT, payload);
      showToast("Saved successfully");
      await fetchAll();
      setForm({ category_id: "", subcategory_id: "", deposit_amount: "", risk: "", reward: "", trading_days: "", ratio: "" });
      setSelectedCategory("");
    } catch {
      showToast("Failed to save deposit", "danger");
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({ ...row });
    setEditOpen(true);
  };

  const updateDeposit = async () => {
    const err = validate(editForm);
    if (err) return showToast(err, "danger");
    try {
      await axios.patch(`${API_DEPOSIT}/${editRow.deposit_id}`, {
        deposit_amount: Number(editForm.deposit_amount),
        risk: Number(editForm.risk),
        reward: Number(editForm.reward),
        trading_days: Number(editForm.trading_days),
        ratio: editForm.ratio,
      });
      showToast("Updated successfully");
      setEditOpen(false);
      await fetchAll();
    } catch {
      showToast("Failed to update deposit", "danger");
    }
  };

  const deleteDeposit = async (row) => {
    askConfirm(`Delete logic for "${row.category_name} → ${row.subcategory_name}"?`, async () => {
      try {
        await axios.delete(`${API_DEPOSIT}/id/${row.deposit_id}`);
        showToast("Deleted");
        await fetchAll();
      } catch {
        showToast("Delete failed", "danger");
      }
    });
  };

  const th = {
    textAlign: "left",
    padding: "10px 10px",
    fontWeight: 700,
    borderBottom: "1px solid #eceff7",
    whiteSpace: "nowrap",
  };
  const thRight = { ...th, textAlign: "right" };
  const thCenter = { ...th, textAlign: "center" };
  const td = { padding: "10px 10px", verticalAlign: "middle" };
  const tdRight = { ...td, textAlign: "right" };

  function fmtMoney(n) {
    if (n === null || n === undefined) return "-";
    const v = Number(n);
    if (Number.isNaN(v)) return n;
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDateOnly(s) {
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return "-";
    }
  }

  /* ========================= JSX ========================= */
  return (
    <div style={{ background: colors.bg, minHeight: "100vh", paddingBottom: 24 }}>
      {/* Toast */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: toast.type === "success" ? colors.success : toast.type === "danger" ? colors.danger : colors.warning,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 12,
            zIndex: 2000,
            fontWeight: 700,
            textAlign: "center",
            animation: "fadeInOut 2s",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 12px" }}>
        <h2
          style={{
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 22,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Investment Deposit Logic
        </h2>

        {/* Add Form */}
        <div style={{ background: colors.surface, borderRadius: 14, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
          <h5 style={{ marginTop: 0 }}>Add / Update Deposit</h5>
          <div className="form-grid">
            {/* Form Fields */}
            {/* (kept same structure, will auto-stack on smaller devices) */}
            <div>
              <label>Category</label>
              <select name="category_id" value={form.category_id} onChange={handleFormChange}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Subcategory</label>
              <select
                name="subcategory_id"
                value={form.subcategory_id}
                onChange={handleFormChange}
                disabled={!form.category_id}
              >
                <option value="">Select Subcategory</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>
            <div><label>Deposit</label><input type="number" name="deposit_amount" value={form.deposit_amount} onChange={handleFormChange} /></div>
            <div><label>Risk</label><input type="number" name="risk" step="0.01" value={form.risk} onChange={handleFormChange} /></div>
            <div><label>Reward</label><input type="number" name="reward" step="0.01" value={form.reward} onChange={handleFormChange} /></div>
            <div><label>Trading Days</label><input type="number" name="trading_days" value={form.trading_days} onChange={handleFormChange} /></div>
            <div><label>Ratio</label><input type="text" name="ratio" placeholder="e.g., 2:1" value={form.ratio} onChange={handleFormChange} /></div>
          </div>
          <button className="btn-primary" onClick={saveDeposit}>Save (Add / Update)</button>
        </div>

        {/* Table Section */}
        <div style={{ marginTop: 16, background: colors.surface, borderRadius: 14, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
          <h5 style={{ marginTop: 0 }}>All Deposits ({deposits.length})</h5>
          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Category</th>
                  <th style={th}>Subcategory</th>
                  <th style={thRight}>Deposit</th>
                  <th style={thRight}>Risk</th>
                  <th style={thRight}>Reward</th>
                  <th style={thRight}>Days</th>
                  <th style={th}>Ratio</th>
                  <th style={th}>Updated</th>
                  <th style={thCenter}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{ textAlign: "center" }}>Loading...</td></tr>
                ) : deposits.length === 0 ? (
                  <tr><td colSpan="10" style={{ textAlign: "center" }}>No records</td></tr>
                ) : (
                  deposits.map((r, i) => (
                    <tr key={r.deposit_id}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{r.category_name}</td>
                      <td style={td}>{r.subcategory_name}</td>
                      <td style={tdRight}>{fmtMoney(r.deposit_amount)}</td>
                      <td style={tdRight}>{r.risk}</td>
                      <td style={tdRight}>{r.reward}</td>
                      <td style={tdRight}>{r.trading_days}</td>
                      <td style={td}>{r.ratio}</td>
                      <td style={td}>{fmtDateOnly(r.updated_at || r.created_at)}</td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-ghost" onClick={() => openEdit(r)}>Edit</button>
                        <button className="btn-ghost danger" onClick={() => deleteDeposit(r)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================== CSS ===================== */}
      <style>{`
        @keyframes fadeInOut { 0%,100%{opacity:0} 10%,90%{opacity:1} }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        label { font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block; }
        input, select {
          width: 100%;
          padding: 10px;
          border: 1px solid ${colors.border};
          border-radius: 8px;
          font-size: 14px;
        }
        .btn-primary {
          margin-top: 14px;
          background: ${colors.primary};
          color: #fff;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          width: 100%;
        }
        .btn-ghost {
          background: #fff;
          border: 1px solid ${colors.primary};
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 13px;
          margin: 2px;
        }
        .btn-ghost.danger {
          border-color: ${colors.danger};
          color: ${colors.danger};
        }
        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* 📱 MOBILE OPTIMIZATION */
        @media (max-width: 768px) {
          h2 { font-size: 1.4rem; }
          .btn-primary { font-size: 14px; }
          table { font-size: 12px; }
          th, td { padding: 6px; }
        }
        @media (max-width: 576px) {
          .form-grid { grid-template-columns: 1fr; }
          table { min-width: 800px; }
          h2 { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
}
