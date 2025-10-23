import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_CATEGORY = "https://express-myapp.onrender.com/api/investment_category";
const API_SUBCATEGORY = "https://express-myapp.onrender.com/api/investment_subcategory";
const API_DEPOSIT = "https://express-myapp.onrender.com/api/deposits";

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
  const [editForm, setEditForm] = useState({
    category_id: "",
    subcategory_id: "",
    deposit_amount: "",
    risk: "",
    reward: "",
    trading_days: "",
    ratio: "",
  });

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
        setConfirm({ show: false, message: "", onConfirm: null, onCancel: null });
        onConfirm?.();
      },
      onCancel: () =>
        setConfirm({ show: false, message: "", onConfirm: null, onCancel: null }),
    });

  const fetchCategories = async () => {
    try {
      const res = await axios.get(API_CATEGORY);
      setCategories(res.data);
    } catch {
      showToast("Failed to fetch categories", "danger");
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await axios.get(API_SUBCATEGORY);
      setSubcategories(res.data);
    } catch {
      showToast("Failed to fetch subcategories", "danger");
    }
  };

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_DEPOSIT);
      setDeposits(res.data || []);
    } catch {
      showToast("Failed to fetch deposits", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchDeposits();
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
    const {
      category_id,
      subcategory_id,
      deposit_amount,
      risk,
      reward,
      trading_days,
      ratio,
    } = obj;
    if (
      !category_id ||
      !subcategory_id ||
      !deposit_amount ||
      !risk ||
      !reward ||
      !trading_days ||
      !ratio
    ) {
      return "Please fill all required fields.";
    }
    if (Number(trading_days) <= 0) return "Trading days must be > 0.";
    if (String(ratio).length > 10) return "Ratio must be ≤ 10 characters.";
    return null;
  };

  const saveDeposit = async () => {
    const err = validate(form);
    if (err) return showToast(err, "danger");

    const payload = {
      category_id: Number(form.category_id),
      subcategory_id: Number(form.subcategory_id),
      deposit_amount: Number(form.deposit_amount),
      risk: Number(form.risk),
      reward: Number(form.reward),
      trading_days: Number(form.trading_days),
      ratio: form.ratio,
      // withdrawal_amount removed from UI & payload
    };

    try {
      await axios.post(API_DEPOSIT, payload);
      showToast("Saved successfully");
      await fetchDeposits();
      setForm({
        category_id: "",
        subcategory_id: "",
        deposit_amount: "",
        risk: "",
        reward: "",
        trading_days: "",
        ratio: "",
      });
      setSelectedCategory("");
    } catch {
      showToast("Failed to save deposit", "danger");
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      category_id: row.category_id,
      subcategory_id: row.subcategory_id,
      deposit_amount: row.deposit_amount,
      risk: row.risk,
      reward: row.reward,
      trading_days: row.trading_days,
      ratio: row.ratio || "",
    });
    setEditOpen(true);
  };

  const updateDeposit = async () => {
    const err = validate(editForm);
    if (err) return showToast(err, "danger");

    const byIdUrl = `${API_DEPOSIT}/${editRow?.deposit_id ?? ""}`;

    const body = {
      deposit_amount: Number(editForm.deposit_amount),
      risk: Number(editForm.risk),
      reward: Number(editForm.reward),
      trading_days: Number(editForm.trading_days),
      ratio: editForm.ratio,
      // withdrawal_amount removed from UI & payload
    };

    try {
      if (editRow?.deposit_id) {
        await axios.patch(byIdUrl, body);
      } else {
        await axios.post(API_DEPOSIT, {
          ...body,
          category_id: Number(editForm.category_id),
          subcategory_id: Number(editForm.subcategory_id),
        });
      }
      showToast("Updated successfully");
      setEditOpen(false);
      await fetchDeposits();
    } catch {
      try {
        await axios.post(API_DEPOSIT, {
          ...body,
          category_id: Number(editForm.category_id),
          subcategory_id: Number(editForm.subcategory_id),
        });
        showToast("Updated successfully");
        setEditOpen(false);
        await fetchDeposits();
      } catch {
        showToast("Failed to update deposit", "danger");
      }
    }
  };

  const deleteDeposit = async (row) => {
    const run = async () => {
      try {
        if (row.deposit_id) {
          await axios.delete(`${API_DEPOSIT}/id/${row.deposit_id}`);
          showToast("Deleted");
          await fetchDeposits();
          return;
        }
      } catch {}
      try {
        await axios.delete(`${API_DEPOSIT}/${row.category_id}/${row.subcategory_id}`);
        showToast("Deleted");
        await fetchDeposits();
      } catch {
        showToast("Delete failed", "danger");
      }
    };
    askConfirm(`Delete logic for "${row.category_name} → ${row.subcategory_name}"?`, run);
  };

  const styles = {
    page: {
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      background: colors.bg,
      minHeight: "100vh",
      paddingBottom: 24,
    },
    container: { maxWidth: 1100, margin: "24px auto", padding: "0 16px" },
    card: {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      padding: 20,
      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    },
    heading: {
      fontWeight: 800,
      textAlign: "center",
      marginBottom: 22,
      background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: colors.text,
      marginBottom: 6,
      display: "block",
    },
    input: {
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      padding: "10px 12px",
      width: "100%",
      background: "#fff",
    },
    button: {
      background: colors.primary,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "12px 16px",
      fontWeight: 700,
    },
    buttonGhost: {
      background: "#fff",
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
      borderRadius: 10,
      padding: "10px 14px",
      fontWeight: 700,
    },
    tableWrap: { overflowX: "auto", marginTop: 8 },
    badge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      background: "#eef0ff",
    },
  };

  return (
    <div style={styles.page}>
      {toast.show && (
        <div
          className="toast-center"
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2000,
            background:
              toast.type === "success"
                ? colors.success
                : toast.type === "warning"
                ? colors.warning
                : colors.danger,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
            textAlign: "center",
            minWidth: 280,
            animation: "fadeInOut 2s",
          }}
        >
          {toast.message}
        </div>
      )}

      {confirm.show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 1800,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div style={{ ...styles.card, maxWidth: 420, width: "100%" }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Please Confirm</h4>
            <p style={{ marginTop: 0 }}>{confirm.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button style={styles.buttonGhost} onClick={confirm.onCancel}>
                Cancel
              </button>
              <button style={styles.button} onClick={confirm.onConfirm}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 1500,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div style={{ ...styles.card, maxWidth: 760, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0 }}>Edit Deposit Logic</h4>
              <button style={styles.buttonGhost} onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>

            <div
              className="row"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 16,
                marginTop: 12,
              }}
            >
              <div style={{ gridColumn: "span 6" }}>
                <label style={styles.label}>Category</label>
                <div style={{ ...styles.input, background: "#fafafa" }}>
                  {editRow?.category_name} (ID: {editForm.category_id})
                </div>
              </div>
              <div style={{ gridColumn: "span 6" }}>
                <label style={styles.label}>Subcategory</label>
                <div style={{ ...styles.input, background: "#fafafa" }}>
                  {editRow?.subcategory_name} (ID: {editForm.subcategory_id})
                </div>
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <label style={styles.label}>Deposit Amount</label>
                <input
                  style={styles.input}
                  type="number"
                  name="deposit_amount"
                  value={editForm.deposit_amount}
                  onChange={handleEditChange}
                />
              </div>
              <div style={{ gridColumn: "span 3" }}>
                <label style={styles.label}>Risk</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  name="risk"
                  value={editForm.risk}
                  onChange={handleEditChange}
                />
              </div>
              <div style={{ gridColumn: "span 3" }}>
                <label style={styles.label}>Reward</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  name="reward"
                  value={editForm.reward}
                  onChange={handleEditChange}
                />
              </div>
              <div style={{ gridColumn: "span 3" }}>
                <label style={styles.label}>Trading Days</label>
                <input
                  style={styles.input}
                  type="number"
                  name="trading_days"
                  value={editForm.trading_days}
                  onChange={handleEditChange}
                />
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <label style={styles.label}>Ratio</label>
                <input
                  style={styles.input}
                  type="text"
                  name="ratio"
                  value={editForm.ratio}
                  onChange={handleEditChange}
                  placeholder="e.g., 2:1"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button style={styles.buttonGhost} onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button style={styles.button} onClick={updateDeposit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        <h2 style={styles.heading}>Investment Deposit Logic</h2>

        <div style={styles.card}>
          <h5 style={{ marginTop: 0 }}>Add / Update Deposit</h5>
          <div
            className="grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 16,
              marginTop: 8,
            }}
          >
            <div style={{ gridColumn: "span 3" }}>
              <label style={styles.label}>Category</label>
              <select
                name="category_id"
                className="form-select"
                style={styles.input}
                value={form.category_id}
                onChange={handleFormChange}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={styles.label}>Subcategory</label>
              <select
                name="subcategory_id"
                className="form-select"
                style={styles.input}
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

            <div style={{ gridColumn: "span 2" }}>
              <label style={styles.label}>Deposit Amount</label>
              <input
                type="number"
                name="deposit_amount"
                style={styles.input}
                value={form.deposit_amount}
                onChange={handleFormChange}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={styles.label}>Risk</label>
              <input
                type="number"
                step="0.01"
                name="risk"
                style={styles.input}
                value={form.risk}
                onChange={handleFormChange}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={styles.label}>Reward</label>
              <input
                type="number"
                step="0.01"
                name="reward"
                style={styles.input}
                value={form.reward}
                onChange={handleFormChange}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={styles.label}>Trading Days</label>
              <input
                type="number"
                name="trading_days"
                style={styles.input}
                value={form.trading_days}
                onChange={handleFormChange}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={styles.label}>Ratio</label>
              <input
                type="text"
                name="ratio"
                style={styles.input}
                value={form.ratio}
                onChange={handleFormChange}
                placeholder="e.g., 2:1"
              />
            </div>

            <div style={{ gridColumn: "span 12", marginTop: 6 }}>
              <button style={styles.button} onClick={saveDeposit}>
                Save (Add / Update)
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h5 style={{ marginTop: 0 }}>All Deposits</h5>
            <span style={styles.badge}>{deposits.length} items</span>
          </div>
          <div style={styles.tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#fafbff" }}>
                  <th style={th}>#</th>
                  <th style={th}>Category</th>
                  <th style={th}>Subcategory</th>
                  <th style={thRight}>Deposit</th>
                  <th style={thRight}>Risk</th>
                  <th style={thRight}>Reward</th>
                  <th style={thRight}>Trading Days</th>
                  <th style={thRight}>Traded</th>
                  <th style={th}>Ratio</th>
                  <th style={th}>Updated (Date)</th>
                  <th style={thCenter}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: 16, textAlign: "center" }}>
                      Loading...
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: 16, textAlign: "center" }}>
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  deposits.map((row, idx) => (
                    <tr key={row.deposit_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={td}>{idx + 1}</td>
                      <td style={td}>{row.category_name || row.category_id}</td>
                      <td style={td}>{row.subcategory_name || row.subcategory_id}</td>
                      <td style={tdRight}>{fmtMoney(row.deposit_amount)}</td>
                      <td style={tdRight}>{fmtNum(row.risk)}</td>
                      <td style={tdRight}>{fmtNum(row.reward)}</td>
                      <td style={tdRight}>{row.trading_days}</td>
                      <td style={tdRight}>{row.traded_days ?? 0}</td>
                      <td style={td}>{row.ratio || "-"}</td>
                      <td style={td}>{fmtDateOnly(row.updated_at || row.created_at)}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          <button style={styles.buttonGhost} onClick={() => openEdit(row)}>
                            Edit
                          </button>
                          <button
                            style={{ ...styles.buttonGhost, borderColor: colors.danger, color: colors.danger }}
                            onClick={() => deleteDeposit(row)}
                          >
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

      <style>{`
        @keyframes fadeInOut { 0%,100%{opacity:0} 10%,90%{opacity:1} }
        .form-select { appearance: auto; }
        @media (max-width: 768px) {
          .grid { grid-template-columns: repeat(12, 1fr); }
        }
      `}</style>
    </div>
  );
}

/* ---------- small helpers ---------- */
const th = { textAlign: "left", padding: "10px 10px", fontWeight: 700, borderBottom: "1px solid #eceff7", whiteSpace: "nowrap" };
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
function fmtNum(n) {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (Number.isNaN(v)) return n;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Show date only (no time), localized and professional. */
function fmtDateOnly(s) {
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}
