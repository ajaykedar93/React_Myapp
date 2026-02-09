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
  muted: "#6b7280",
};

export default function InvestmentDepositLogic() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);

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
  const [editForm, setEditForm] = useState({
    category_id: "",
    subcategory_id: "",
    deposit_amount: "",
    risk: "",
    reward: "",
    trading_days: "",
    ratio: "",
  });

  const [confirm, setConfirm] = useState({ show: false, message: "", onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ show: false, message: "", type: "success" }), 1800);
  };

  const askConfirm = (message, onConfirm) => {
    setConfirm({
      show: true,
      message,
      onConfirm: async () => {
        setConfirm({ show: false, message: "", onConfirm: null });
        await onConfirm?.();
      },
    });
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [c, s, d] = await Promise.all([
        axios.get(API_CATEGORY),
        axios.get(API_SUBCATEGORY),
        axios.get(API_DEPOSIT),
      ]);
      setCategories(Array.isArray(c.data) ? c.data : []);
      setSubcategories(Array.isArray(s.data) ? s.data : []);
      setDeposits(Array.isArray(d.data) ? d.data : []);
    } catch {
      showToast("Failed to load data", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredSubcategories = useMemo(() => {
    if (!form.category_id) return [];
    return subcategories.filter((s) => String(s.category_id) === String(form.category_id));
  }, [form.category_id, subcategories]);

  const filteredSubcategoriesEdit = useMemo(() => {
    if (!editForm.category_id) return [];
    return subcategories.filter((s) => String(s.category_id) === String(editForm.category_id));
  }, [editForm.category_id, subcategories]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "category_id") setForm((f) => ({ ...f, category_id: value, subcategory_id: "" }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
    if (name === "category_id") setEditForm((f) => ({ ...f, category_id: value, subcategory_id: "" }));
  };

  const validate = (obj) => {
    const { category_id, subcategory_id, deposit_amount, risk, reward, trading_days, ratio } = obj;
    if (!category_id || !subcategory_id || deposit_amount === "" || risk === "" || reward === "" || trading_days === "" || !ratio)
      return "Please fill all required fields.";
    if (Number(deposit_amount) <= 0) return "Deposit must be > 0.";
    if (Number(trading_days) <= 0) return "Trading days must be > 0.";
    return null;
  };

  const saveDeposit = async () => {
    const err = validate(form);
    if (err) return showToast(err, "danger");

    try {
      await axios.post(API_DEPOSIT, {
        category_id: Number(form.category_id),
        subcategory_id: Number(form.subcategory_id),
        deposit_amount: Number(form.deposit_amount),
        risk: Number(form.risk),
        reward: Number(form.reward),
        trading_days: Number(form.trading_days),
        ratio: String(form.ratio).trim(),
      });

      showToast("Saved successfully");
      await fetchAll();
      setForm({ category_id: "", subcategory_id: "", deposit_amount: "", risk: "", reward: "", trading_days: "", ratio: "" });
    } catch {
      showToast("Failed to save deposit", "danger");
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      category_id: String(row.category_id ?? ""),
      subcategory_id: String(row.subcategory_id ?? ""),
      deposit_amount: String(row.deposit_amount ?? ""),
      risk: String(row.risk ?? ""),
      reward: String(row.reward ?? ""),
      trading_days: String(row.trading_days ?? ""),
      ratio: String(row.ratio ?? ""),
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
  };

  const updateDeposit = async () => {
    if (!editRow?.deposit_id) return showToast("Invalid row selected", "danger");

    const err = validate(editForm);
    if (err) return showToast(err, "danger");

    try {
      // your PATCH route only updates allowed fields; extra fields will be ignored by backend filter
      await axios.patch(`${API_DEPOSIT}/${editRow.deposit_id}`, {
        deposit_amount: Number(editForm.deposit_amount),
        risk: Number(editForm.risk),
        reward: Number(editForm.reward),
        trading_days: Number(editForm.trading_days),
        ratio: String(editForm.ratio).trim(),
      });

      showToast("Updated successfully");
      closeEdit();
      await fetchAll();
    } catch {
      showToast("Failed to update deposit", "danger");
    }
  };

  // ✅ CORRECT DELETE for your API: /api/deposits/id/:deposit_id
  const deleteDeposit = async (row) => {
    askConfirm(`Delete logic for "${row.category_name} → ${row.subcategory_name}"?`, async () => {
      try {
        await axios.delete(`${API_DEPOSIT}/id/${row.deposit_id}`); // ✅ FIXED
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
    fontWeight: 800,
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: "nowrap",
    color: colors.text,
  };
  const thRight = { ...th, textAlign: "right" };
  const thCenter = { ...th, textAlign: "center" };
  const td = { padding: "10px 10px", verticalAlign: "middle", borderBottom: `1px solid ${colors.border}`, color: colors.text };
  const tdRight = { ...td, textAlign: "right" };

  const fmtMoney = (n) => {
    if (n === null || n === undefined) return "-";
    const v = Number(n);
    if (Number.isNaN(v)) return String(n);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDateOnly = (s) => {
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return "-";
    }
  };

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", paddingBottom: 28 }}>
      {toast.show && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "12%",
            transform: "translate(-50%, -50%)",
            background: toast.type === "success" ? colors.success : toast.type === "danger" ? colors.danger : colors.warning,
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 12,
            zIndex: 5000,
            fontWeight: 800,
            textAlign: "center",
            boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2
            style={{
              margin: 0,
              fontWeight: 900,
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Investment Deposit Logic
          </h2>

          <button className="btn-outline" onClick={fetchAll} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <p style={{ marginTop: 8, color: colors.muted, fontWeight: 600 }}>
          Add deposit logic for Category → Subcategory, then manage it from the table.
        </p>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Add Deposit</div>
              <div className="cardSub">Create new deposit logic</div>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label>Category *</label>
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
              <label>Subcategory *</label>
              <select name="subcategory_id" value={form.subcategory_id} onChange={handleFormChange} disabled={!form.category_id}>
                <option value="">Select Subcategory</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Deposit *</label>
              <input type="number" name="deposit_amount" value={form.deposit_amount} onChange={handleFormChange} placeholder="e.g., 5000" />
            </div>

            <div>
              <label>Risk *</label>
              <input type="number" name="risk" step="0.01" value={form.risk} onChange={handleFormChange} placeholder="e.g., 1" />
            </div>

            <div>
              <label>Reward *</label>
              <input type="number" name="reward" step="0.01" value={form.reward} onChange={handleFormChange} placeholder="e.g., 2" />
            </div>

            <div>
              <label>Trading Days *</label>
              <input type="number" name="trading_days" value={form.trading_days} onChange={handleFormChange} placeholder="e.g., 10" />
            </div>

            <div>
              <label>Ratio *</label>
              <input type="text" name="ratio" placeholder="e.g., 2:1" value={form.ratio} onChange={handleFormChange} />
            </div>
          </div>

          <button className="btn-primary" onClick={saveDeposit} disabled={loading}>
            {loading ? "Please wait..." : "Save"}
          </button>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="cardHeader">
            <div>
              <div className="cardTitle">All Deposits</div>
              <div className="cardSub">Total: {deposits.length}</div>
            </div>
          </div>

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
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: 18 }}>
                      Loading...
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: 18 }}>
                      No records
                    </td>
                  </tr>
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
                      <td style={{ ...td, textAlign: "center" }}>
                        <button className="btn-ghost" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        <button className="btn-ghost danger" onClick={() => deleteDeposit(r)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editOpen && (
        <div className="modalOverlay" onMouseDown={closeEdit}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">Edit Deposit</div>
                <div className="modalSub">
                  {editRow?.category_name} → {editRow?.subcategory_name}
                </div>
              </div>
              <button className="btn-close" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: 10 }}>
              <div>
                <label>Deposit *</label>
                <input type="number" name="deposit_amount" value={editForm.deposit_amount} onChange={handleEditChange} />
              </div>
              <div>
                <label>Risk *</label>
                <input type="number" name="risk" step="0.01" value={editForm.risk} onChange={handleEditChange} />
              </div>
              <div>
                <label>Reward *</label>
                <input type="number" name="reward" step="0.01" value={editForm.reward} onChange={handleEditChange} />
              </div>
              <div>
                <label>Trading Days *</label>
                <input type="number" name="trading_days" value={editForm.trading_days} onChange={handleEditChange} />
              </div>
              <div>
                <label>Ratio *</label>
                <input type="text" name="ratio" value={editForm.ratio} onChange={handleEditChange} />
              </div>
            </div>

            <div className="modalActions">
              <button className="btn-ghost" onClick={closeEdit}>
                Cancel
              </button>
              <button className="btn-primary" onClick={updateDeposit} disabled={loading}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirm.show && (
        <div className="modalOverlay" onMouseDown={() => setConfirm({ show: false, message: "", onConfirm: null })}>
          <div className="confirmCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirmTitle">Confirm</div>
            <div className="confirmMsg">{confirm.message}</div>
            <div className="modalActions">
              <button className="btn-ghost" onClick={() => setConfirm({ show: false, message: "", onConfirm: null })}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirm.onConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .card{
          background:${colors.surface};
          border-radius:16px;
          padding:18px;
          box-shadow:0 10px 28px rgba(0,0,0,0.06);
          border:1px solid ${colors.border};
        }
        .cardHeader{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:10px;
        }
        .cardTitle{ font-weight:900; font-size:16px; color:${colors.text}; }
        .cardSub{ font-weight:700; font-size:13px; color:${colors.muted}; margin-top:2px; }

        .form-grid{
          display:grid;
          grid-template-columns:repeat(4, minmax(0,1fr));
          gap:12px;
          margin-top:12px;
        }
        label{ font-weight:700; font-size:12px; margin-bottom:6px; display:block; color:${colors.text}; }
        input, select{
          width:100%;
          padding:10px 12px;
          border:1px solid ${colors.border};
          border-radius:10px;
          font-size:14px;
          outline:none;
          background:#fff;
        }

        .btn-primary{
          margin-top:14px;
          background:${colors.primary};
          color:#fff;
          border:none;
          padding:12px 14px;
          border-radius:12px;
          font-weight:900;
          width:100%;
          cursor:pointer;
        }
        .btn-outline{
          background:#fff;
          border:1px solid ${colors.primary};
          color:${colors.primary};
          padding:10px 12px;
          border-radius:12px;
          font-weight:900;
          cursor:pointer;
        }
        .btn-ghost{
          background:#fff;
          border:1px solid ${colors.primary};
          color:${colors.primary};
          border-radius:10px;
          padding:7px 10px;
          font-size:13px;
          font-weight:800;
          margin:2px;
          cursor:pointer;
        }
        .btn-ghost.danger{
          border-color:${colors.danger};
          color:${colors.danger};
        }
        .btn-danger{
          background:${colors.danger};
          border:none;
          color:#fff;
          padding:10px 14px;
          border-radius:12px;
          font-weight:900;
          cursor:pointer;
        }

        .table-responsive{
          overflow-x:auto;
          -webkit-overflow-scrolling:touch;
          border-radius:12px;
        }

        .modalOverlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.45);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:6000;
          padding:14px;
        }
        .modalCard{
          width:min(760px, 100%);
          background:#fff;
          border-radius:16px;
          border:1px solid ${colors.border};
          box-shadow:0 18px 60px rgba(0,0,0,0.2);
          padding:16px;
        }
        .modalHeader{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
        }
        .modalTitle{ font-weight:1000; font-size:16px; color:${colors.text}; }
        .modalSub{ font-weight:800; font-size:13px; color:${colors.muted}; margin-top:3px; }
        .btn-close{
          border:none;
          background:#f3f4f6;
          border-radius:10px;
          padding:8px 10px;
          cursor:pointer;
          font-weight:900;
        }
        .modalActions{
          display:flex;
          gap:10px;
          justify-content:flex-end;
          margin-top:14px;
          flex-wrap:wrap;
        }

        .confirmCard{
          width:min(420px, 100%);
          background:#fff;
          border-radius:16px;
          border:1px solid ${colors.border};
          box-shadow:0 18px 60px rgba(0,0,0,0.2);
          padding:16px;
        }
        .confirmTitle{ font-weight:1000; font-size:16px; }
        .confirmMsg{ margin-top:8px; color:${colors.text}; font-weight:700; }

        /* responsive */
        @media (max-width: 1024px){
          .form-grid{ grid-template-columns:repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 640px){
          .form-grid{ grid-template-columns:1fr; }
          table{ font-size:12px; }
        }
      `}</style>
    </div>
  );
}
