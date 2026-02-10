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
  soft: "#f3f6ff",
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
    showToast._t = window.setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      1800
    );
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "category_id") setForm((f) => ({ ...f, category_id: value, subcategory_id: "" }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const validate = (obj) => {
    const { category_id, subcategory_id, deposit_amount, risk, reward, trading_days, ratio } = obj;
    if (
      !category_id ||
      !subcategory_id ||
      deposit_amount === "" ||
      risk === "" ||
      reward === "" ||
      trading_days === "" ||
      !ratio
    )
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
      setForm({
        category_id: "",
        subcategory_id: "",
        deposit_amount: "",
        risk: "",
        reward: "",
        trading_days: "",
        ratio: "",
      });
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

  // ✅ DELETE: /api/deposits/id/:deposit_id
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
    padding: "12px 12px",
    fontWeight: 900,
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: "nowrap",
    color: colors.text,
    background: colors.soft,
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const thRight = { ...th, textAlign: "right" };
  const thCenter = { ...th, textAlign: "center" };

  const td = {
    padding: "12px 12px",
    verticalAlign: "middle",
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
    background: "#fff",
  };
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
    <div className="idl-page">
      <style>{css}</style>

      {/* Toast */}
      {toast.show && (
        <div
          className={`idl-toast ${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {/* Header (full width, no extra outer padding) */}
      <div className="idl-topbar">
        <div className="idl-topbarInner">
          <div>
            <h2 className="idl-title">Investment Deposit Logic</h2>
            <p className="idl-subtitle">
              Add logic for Category → Subcategory, then manage it in the list.
            </p>
          </div>

          {/* ✅ Small refresh button */}
          <button className="idl-refreshBtn" onClick={fetchAll} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Content (full width) */}
      <div className="idl-content">
        {/* Add Card */}
        <div className="idl-card">
          <div className="idl-cardHead">
            <div>
              <div className="idl-cardTitle">Add Deposit</div>
              <div className="idl-cardSub">Create new deposit logic</div>
            </div>
          </div>

          <div className="idl-formGrid">
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

            <div>
              <label>Deposit *</label>
              <input
                type="number"
                name="deposit_amount"
                value={form.deposit_amount}
                onChange={handleFormChange}
                placeholder="e.g., 5000"
              />
            </div>

            <div>
              <label>Risk *</label>
              <input
                type="number"
                name="risk"
                step="0.01"
                value={form.risk}
                onChange={handleFormChange}
                placeholder="e.g., 1"
              />
            </div>

            <div>
              <label>Reward *</label>
              <input
                type="number"
                name="reward"
                step="0.01"
                value={form.reward}
                onChange={handleFormChange}
                placeholder="e.g., 2"
              />
            </div>

            <div>
              <label>Trading Days *</label>
              <input
                type="number"
                name="trading_days"
                value={form.trading_days}
                onChange={handleFormChange}
                placeholder="e.g., 10"
              />
            </div>

            <div>
              <label>Ratio *</label>
              <input
                type="text"
                name="ratio"
                placeholder="e.g., 2:1"
                value={form.ratio}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <button className="idl-primaryBtn" onClick={saveDeposit} disabled={loading}>
            {loading ? "Please wait…" : "Save"}
          </button>
        </div>

        {/* List Card */}
        <div className="idl-card">
          <div className="idl-cardHead">
            <div>
              <div className="idl-cardTitle">All Deposits</div>
              <div className="idl-cardSub">Total: {deposits.length}</div>
            </div>
          </div>

          <div className="idl-tableWrap">
            <table className="idl-table">
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
                    <td colSpan="10" style={{ textAlign: "center", padding: 18, background: "#fff" }}>
                      Loading…
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: 18, background: "#fff" }}>
                      No records
                    </td>
                  </tr>
                ) : (
                  deposits.map((r, i) => (
                    <tr key={r.deposit_id} className="idl-row">
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
                        <div className="idl-actions">
                          <button className="idl-miniBtn edit" onClick={() => openEdit(r)}>
                            Edit
                          </button>
                          <button className="idl-miniBtn del" onClick={() => deleteDeposit(r)}>
                            Delete
                          </button>
                        </div>
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
        <div className="idl-modalOverlay" onMouseDown={closeEdit}>
          <div className="idl-modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="idl-modalHeader">
              <div>
                <div className="idl-modalTitle">Edit Deposit</div>
                <div className="idl-modalSub">
                  {editRow?.category_name} → {editRow?.subcategory_name}
                </div>
              </div>
              <button className="idl-closeBtn" onClick={closeEdit} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="idl-formGrid" style={{ marginTop: 10 }}>
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

            <div className="idl-modalActions">
              <button className="idl-outlineBtn" onClick={closeEdit}>
                Cancel
              </button>
              <button className="idl-primaryBtn" onClick={updateDeposit} disabled={loading}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirm.show && (
        <div className="idl-modalOverlay" onMouseDown={() => setConfirm({ show: false, message: "", onConfirm: null })}>
          <div className="idl-confirmCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="idl-confirmTitle">Confirm</div>
            <div className="idl-confirmMsg">{confirm.message}</div>
            <div className="idl-modalActions">
              <button className="idl-outlineBtn" onClick={() => setConfirm({ show: false, message: "", onConfirm: null })}>
                Cancel
              </button>
              <button className="idl-dangerBtn" onClick={confirm.onConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
  .idl-page{
    min-height:100vh;
    width:100%;
    background: ${colors.bg};
    color: ${colors.text};
  }

  /* ✅ no big outer margins/padding */
  .idl-topbar{
    width:100%;
    padding: 16px 12px;
    background:
      radial-gradient(900px 400px at 10% 10%, rgba(95,75,182,.10), transparent 55%),
      radial-gradient(900px 400px at 95% 0%, rgba(31,95,120,.10), transparent 55%),
      linear-gradient(180deg, #ffffff, #f7f9ff);
    border-bottom: 1px solid ${colors.border};
  }
  .idl-topbarInner{
    width: min(1240px, calc(100% - 16px));
    margin: 0 auto;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap: 10px;
    flex-wrap:wrap;
  }

  .idl-title{
    margin:0;
    font-weight:1000;
    letter-spacing:.2px;
    background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary});
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    font-size: clamp(18px, 2.2vw, 26px);
  }
  .idl-subtitle{
    margin: 6px 0 0;
    color: ${colors.muted};
    font-weight: 700;
    font-size: 0.92rem;
  }

  /* ✅ small refresh button */
  .idl-refreshBtn{
    border: 1px solid ${colors.border};
    background: #fff;
    color: ${colors.text};
    border-radius: 999px;
    padding: 8px 12px;
    font-weight: 900;
    font-size: .88rem;
    cursor:pointer;
    box-shadow: 0 10px 20px rgba(0,0,0,0.06);
    white-space:nowrap;
  }
  .idl-refreshBtn:active{ transform: scale(.99); }
  .idl-refreshBtn:disabled{ opacity:.6; cursor:not-allowed; }

  .idl-content{
    width: min(1240px, calc(100% - 16px));
    margin: 0 auto;
    padding: 12px 0 18px; /* ✅ no side padding, just vertical */
    display:flex;
    flex-direction:column;
    gap: 14px;
  }

  .idl-card{
    background:${colors.surface};
    border-radius:18px;
    border:1px solid ${colors.border};
    box-shadow:0 14px 40px rgba(15,23,42,0.06);
    padding: 14px;
  }

  .idl-cardHead{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:12px;
    flex-wrap:wrap;
    margin-bottom: 10px;
  }
  .idl-cardTitle{ font-weight:1000; font-size: 15px; }
  .idl-cardSub{ margin-top:3px; font-weight:800; font-size: 12.5px; color:${colors.muted}; }

  .idl-formGrid{
    display:grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 10px;
  }
  .idl-formGrid label{
    font-weight: 850;
    font-size: 12px;
    margin-bottom: 6px;
    display:block;
  }
  .idl-formGrid input, .idl-formGrid select{
    width:100%;
    padding: 10px 12px;
    border:1px solid ${colors.border};
    border-radius: 12px;
    font-size: 14px;
    outline:none;
    background:#fff;
  }
  .idl-formGrid input:focus, .idl-formGrid select:focus{
    border-color: rgba(95,75,182,.55);
    box-shadow: 0 0 0 .2rem rgba(95,75,182,.12);
  }

  .idl-primaryBtn{
    margin-top: 12px;
    width:100%;
    border:0;
    border-radius: 14px;
    padding: 12px 14px;
    font-weight: 1000;
    cursor:pointer;
    color:#fff;
    background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
    box-shadow: 0 16px 32px rgba(95,75,182,0.18);
  }
  .idl-primaryBtn:active{ transform: translateY(1px); }
  .idl-primaryBtn:disabled{ opacity:.6; cursor:not-allowed; }

  .idl-outlineBtn{
    border: 1px solid ${colors.border};
    background:#fff;
    color:${colors.text};
    border-radius: 12px;
    padding: 10px 14px;
    font-weight: 900;
    cursor:pointer;
  }
  .idl-dangerBtn{
    border:0;
    background: linear-gradient(135deg, ${colors.danger}, #ff6b6b);
    color:#fff;
    border-radius: 12px;
    padding: 10px 14px;
    font-weight: 1000;
    cursor:pointer;
  }

  .idl-tableWrap{
    width:100%;
    overflow:auto;
    border-radius: 14px;
    border: 1px solid ${colors.border};
    background:#fff;
  }
  .idl-table{
    width:100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 14px;
  }
  .idl-row:hover td{ background: rgba(95,75,182,.04); }

  .idl-actions{
    display:flex;
    gap:8px;
    justify-content:center;
    flex-wrap:wrap;
  }

  /* ✅ small action buttons always (mobile + desktop) */
  .idl-miniBtn{
    border:0;
    border-radius: 999px;
    padding: 7px 10px;
    font-weight: 950;
    font-size: .82rem;
    cursor:pointer;
    color:#fff;
    white-space:nowrap;
    box-shadow: 0 10px 18px rgba(0,0,0,0.10);
  }
  .idl-miniBtn.edit{ background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); }
  .idl-miniBtn.del{ background: linear-gradient(135deg, ${colors.danger}, #ff6b6b); }
  .idl-miniBtn:active{ transform: scale(.99); }

  .idl-toast{
    position: fixed;
    left: 50%;
    top: 12%;
    transform: translate(-50%, -50%);
    color:#fff;
    padding: 12px 16px;
    border-radius: 14px;
    z-index: 5000;
    font-weight: 900;
    text-align:center;
    box-shadow: 0 18px 55px rgba(0,0,0,0.18);
    min-width: 260px;
  }
  .idl-toast.success{ background: linear-gradient(135deg, ${colors.success}, #22c55e); }
  .idl-toast.danger{ background: linear-gradient(135deg, ${colors.danger}, #ff6b6b); }
  .idl-toast.warning{ background: linear-gradient(135deg, ${colors.warning}, #fbbf24); }

  .idl-modalOverlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.45);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:6000;
    padding: 14px;
  }
  .idl-modalCard{
    width: min(820px, 100%);
    background:#fff;
    border-radius: 18px;
    border:1px solid ${colors.border};
    box-shadow: 0 22px 70px rgba(0,0,0,0.22);
    padding: 14px;
  }
  .idl-modalHeader{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:10px;
  }
  .idl-modalTitle{ font-weight:1000; font-size: 16px; }
  .idl-modalSub{ margin-top:3px; color:${colors.muted}; font-weight: 850; font-size: 12.5px; }
  .idl-closeBtn{
    border:0;
    background:#f3f4f6;
    border-radius: 12px;
    padding: 8px 10px;
    cursor:pointer;
    font-weight: 1000;
  }
  .idl-modalActions{
    display:flex;
    justify-content:flex-end;
    gap: 10px;
    flex-wrap:wrap;
    margin-top: 14px;
  }

  .idl-confirmCard{
    width: min(440px, 100%);
    background:#fff;
    border-radius: 18px;
    border:1px solid ${colors.border};
    box-shadow: 0 22px 70px rgba(0,0,0,0.22);
    padding: 14px;
  }
  .idl-confirmTitle{ font-weight: 1000; font-size: 16px; }
  .idl-confirmMsg{ margin-top: 8px; font-weight: 800; color:${colors.text}; }

  /* Responsive */
  @media (max-width: 1024px){
    .idl-formGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 640px){
    .idl-topbarInner, .idl-content{ width: calc(100% - 16px); }
    .idl-formGrid{ grid-template-columns: 1fr; }
    .idl-table{ font-size: 12px; }
    .idl-miniBtn{ padding: 6px 9px; font-size: .78rem; } /* ✅ even smaller on mobile */
    .idl-refreshBtn{ padding: 7px 10px; font-size: .82rem; }
  }
`;
