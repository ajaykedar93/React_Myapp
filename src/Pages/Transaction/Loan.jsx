// src/pages/GetLoan.jsx
import React, { useEffect, useState } from 'react';

// EXACT base you gave:
const API_BASE = 'http://localhost:5000/loan';
// Category API exactly as requested: http://localhost:5000/loan/loan-categories
const CATS_URL = `${API_BASE}/loan-categories`;

// YYYY-MM-DD -> "2 Oct 2025"
function fmtDate(d) {
  if (!d) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) {
    const [, Y, M, D] = m;
    const dt = new Date(Number(Y), Number(M) - 1, Number(D));
    if (isNaN(dt)) return '-';
    const day = dt.getDate();
    const mon = dt.toLocaleString('en-GB', { month: 'short' });
    const yr = dt.getFullYear();
    return `${day} ${mon} ${yr}`;
  }
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  const day = dt.getDate();
  const mon = dt.toLocaleString('en-GB', { month: 'short' });
  const yr = dt.getFullYear();
  return `${day} ${mon} ${yr}`;
}

export default function GetLoan() {
  // UI
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Data
  const [loans, setLoans] = useState([]);
  const [cats, setCats] = useState([]);

  // Editing (inline)
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({ loan_title: '', loan_amount: '' });

  // Add form (always visible) – ONLY the fields you asked for
  const [addValues, setAddValues] = useState({
    loan_title: '',
    loan_amount: '',
    // category: either existing id OR new text
    mode: 'existing', // 'existing' | 'new'
    loan_category_id: '',
    new_category: '',
    // optional:
    extra_amount: '',
    extra_amount_on: '',
    details: ''
  });

  // Theme
  const accent = '#FF7A59';
  const accentHover = '#FF5E3A';
  const bgSoft = '#FFF4EE';
  const cardBg = '#FFFFFF';
  const text = '#292524';
  const success = '#22c55e';
  const danger = '#ef4444';

  // Styles with clamp() for compact, responsive sizing
  const styles = {
    app: { minHeight: '100vh', background: bgSoft, color: text },
    container: { width: '100%', maxWidth: 820, margin: '0 auto', padding: '16px 12px' },
    grid: { display: 'grid', gap: 12 },
    card: {
      background: cardBg,
      border: '1px solid #f0e7e3',
      borderRadius: 16,
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      padding: 'clamp(10px, 2.4vw, 16px)'
    },
    h1: { fontSize: 'clamp(16px, 3.6vw, 20px)', fontWeight: 800, marginBottom: 6 },
    labelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 'clamp(11px, 2.8vw, 12px)', fontWeight: 700, opacity: .85, marginBottom: 4 },
    hint: { fontSize: 'clamp(10px, 2.6vw, 11px)', opacity: .7 },
    input: {
      borderRadius: 10,
      border: '1px solid #e8dcd7',
      padding: 'clamp(6px, 2.2vw, 8px) clamp(8px, 2.6vw, 10px)',
      outline: 'none',
      width: '100%',
      fontSize: 'clamp(12px, 2.8vw, 13px)'
    },
    textarea: {
      borderRadius: 10,
      border: '1px solid #e8dcd7',
      padding: 'clamp(6px, 2.2vw, 8px) clamp(8px, 2.6vw, 10px)',
      outline: 'none',
      width: '100%',
      fontSize: 'clamp(12px, 2.8vw, 13px)',
      minHeight: 70,
      resize: 'vertical'
    },
    pill: {
      fontSize: 'clamp(10px, 2.6vw, 11px)',
      padding: '2px 8px',
      borderRadius: 999,
      background: '#FFE4DB',
      color: '#7a4a41',
      marginLeft: 8
    },
    sub: { fontSize: 'clamp(11px, 2.8vw, 12px)', opacity: .75 },

    // Buttons auto-fit width on small screens
    btn: {
      background: accent,
      border: 'none',
      borderRadius: 12,
      padding: 'clamp(6px, 2.2vw, 8px) clamp(10px, 3vw, 12px)',
      fontWeight: 800,
      color: '#fff',
      fontSize: 'clamp(12px, 2.8vw, 13px)',
      cursor: 'pointer',
      flex: '1 1 auto'
    },
    btnGhost: {
      background: '#FFD0C2',
      border: 'none',
      borderRadius: 12,
      padding: 'clamp(6px, 2.2vw, 8px) clamp(10px, 3vw, 12px)',
      fontWeight: 800,
      color: '#6b4f4b',
      fontSize: 'clamp(12px, 2.8vw, 13px)',
      cursor: 'pointer',
      flex: '1 1 auto'
    },

    row2: { display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' },
    row3: { display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr 1fr' },
    actionsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 },

    spinnerWrap: {
      position: 'fixed', inset: 0, background: 'rgba(255,250,247,.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    },
    spinner: {
      width: 46, height: 46, border: '4px solid #ffe2d8',
      borderTop: `4px solid ${accent}`, borderRadius: '50%',
      animation: 'spin .8s linear infinite'
    },
    toast: {
      position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      background: '#fff', border: '1px solid #f0e7e3', borderRadius: 16,
      boxShadow: '0 10px 30px rgba(0,0,0,.1)', padding: '14px 16px', zIndex: 10000,
      minWidth: 260, textAlign: 'center', color: text
    },
    radioWrap: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }
  };

  const responsiveCSS = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 560px){
      .row-2 { grid-template-columns: 1fr !important; }
      .row-3 { grid-template-columns: 1fr !important; }
      .stack-sm { flex-direction: column; }
    }
    @media (min-width: 561px) and (max-width: 839px){
      .row-3 { grid-template-columns: 1fr 1fr !important; }
    }
  `;

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: '' }), 2300);
  };

  // API: Categories
  const loadCategories = async () => {
    const res = await fetch(`${CATS_URL}?active=true`);
    if (!res.ok) throw new Error(`Categories HTTP ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : json.data;
    if (!Array.isArray(arr)) throw new Error('Invalid categories response');
    setCats(arr);
  };

  // API: Loans list
  const loadLoans = async () => {
    const res = await fetch(`${API_BASE}`);
    if (!res.ok) throw new Error(`Loans HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Unexpected loans response');
    setLoans(json);
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadLoans(), loadCategories()]);
      } catch (e) {
        showToast('error', e.message || 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Edit
  const startEdit = (loan) => {
    setEditing(loan.loan_id);
    setEditValues({
      loan_title: loan.loan_title ?? '',
      loan_amount: loan.loan_amount ?? ''
    });
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditValues({ loan_title: '', loan_amount: '' });
  };

  const saveEdit = async (loan_id) => {
    try {
      const payload = {
        loan_title: (editValues.loan_title || '').trim(),
        loan_amount: Number(editValues.loan_amount)
      };
      if (!payload.loan_title) throw new Error('Title required');
      if (isNaN(payload.loan_amount) || payload.loan_amount < 0) {
        throw new Error('Amount must be ≥ 0');
      }
      const res = await fetch(`${API_BASE}/${loan_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      showToast('success', 'Updated ✅');
      cancelEdit();
      await loadLoans();
    } catch (err) {
      showToast('error', err.message || 'Update failed');
    }
  };

  // Delete
  const delLoan = async (loan_id) => {
    if (!window.confirm('Delete this loan?')) return;
    try {
      const res = await fetch(`${API_BASE}/${loan_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      showToast('success', 'Deleted ✅');
      await loadLoans();
    } catch (err) {
      showToast('error', err.message || 'Delete failed');
    }
  };

  // Add helpers
  const resetAdd = () =>
    setAddValues({
      loan_title: '',
      loan_amount: '',
      mode: 'existing',
      loan_category_id: '',
      new_category: '',
      extra_amount: '',
      extra_amount_on: '',
      details: ''
    });

  // Create category if user chose "new"
  const ensureCategoryId = async () => {
    if (addValues.mode === 'existing') {
      const id = addValues.loan_category_id ? Number(addValues.loan_category_id) : null;
      if (!id) throw new Error('Select a category');
      return id;
    }
    // mode === 'new'
    const name = (addValues.new_category || '').trim();
    if (!name) throw new Error('Enter category name');
    const res = await fetch(CATS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, is_active: true })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Category HTTP ${res.status}`);
    }
    const json = await res.json();
    const cat = json.data || json; // handle either shape
    // Support either {loan_category_id: X} or {id: X}
    const newId = cat.loan_category_id ?? cat.id;
    if (!newId) throw new Error('Category created but no id returned');
    // refresh dropdown for future use
    try { await loadCategories(); } catch {}
    return Number(newId);
  };

  // Submit Add
  const submitAdd = async () => {
    try {
      const v = addValues;
      const payload = {
        loan_title: (v.loan_title || '').trim(),
        loan_amount: v.loan_amount === '' ? null : Number(v.loan_amount),
        // loan_category_id will be ensured below
        extra_amount: v.extra_amount === '' ? null : Number(v.extra_amount),
        extra_amount_on: v.extra_amount_on || null,
        details: v.details || null
      };

      if (!payload.loan_title) throw new Error('Loan title is required');
      if (payload.loan_amount === null || isNaN(payload.loan_amount) || payload.loan_amount < 0) {
        throw new Error('Valid loan amount is required');
      }

      // Only one category path is allowed; enforce:
      if (addValues.mode === 'existing' && addValues.new_category.trim()) {
        throw new Error('Use either dropdown OR manual category, not both');
      }
      if (addValues.mode === 'new' && addValues.loan_category_id) {
        throw new Error('Use either dropdown OR manual category, not both');
      }

      const categoryId = await ensureCategoryId();
      payload.loan_category_id = categoryId;

      const res = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      showToast('success', 'Loan added ✅');
      resetAdd();
      await loadLoans();
    } catch (err) {
      showToast('error', err.message || 'Add failed');
    }
  };

  return (
    <div style={styles.app}>
      <style>{responsiveCSS}</style>

      {loading && (
        <div style={styles.spinnerWrap}>
          <div style={styles.spinner}></div>
        </div>
      )}

      {toast.show && (
        <div style={styles.toast}>
          <div
            style={{
              fontWeight: 800,
              marginBottom: 6,
              color: toast.type === 'success' ? success : danger
            }}
          >
            {toast.type === 'success' ? 'Success' : 'Notice'}
          </div>
          <div>{toast.message}</div>
        </div>
      )}

      <div style={styles.container}>
        {/* Header */}
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={styles.h1}>Loans</div>
          <div style={styles.sub}>Base URL: <b>{API_BASE}</b></div>
        </div>

        {/* ADD SECTION — always visible, only required + optional fields you specified */}
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 'clamp(14px,3.2vw,16px)' }}>
            Add New Loan
          </div>

          <div style={styles.grid}>
            {/* Title */}
            <div>
              <div style={styles.label}>Loan Title *</div>
              <input
                style={styles.input}
                value={addValues.loan_title}
                onChange={(e) => setAddValues(v => ({ ...v, loan_title: e.target.value }))}
                placeholder="e.g., Bike finance"
              />
            </div>

            {/* Amount */}
            <div>
              <div style={styles.label}>Loan Amount (₹) *</div>
              <input
                style={styles.input}
                type="number" min="0" step="0.01"
                value={addValues.loan_amount}
                onChange={(e) => setAddValues(v => ({ ...v, loan_amount: e.target.value }))}
                placeholder="50000"
              />
            </div>

            {/* Category mode */}
            <div>
              <div style={{ ...styles.label, marginBottom: 8 }}>Category *</div>
              <div style={styles.radioWrap}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    name="catMode"
                    checked={addValues.mode === 'existing'}
                    onChange={() => setAddValues(v => ({ ...v, mode: 'existing', new_category: '' }))}
                  />
                  <span className="hint" style={styles.hint}>Use existing</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    name="catMode"
                    checked={addValues.mode === 'new'}
                    onChange={() => setAddValues(v => ({ ...v, mode: 'new', loan_category_id: '' }))}
                  />
                  <span className="hint" style={styles.hint}>Enter new</span>
                </label>
              </div>

              {addValues.mode === 'existing' ? (
                <div style={{ marginTop: 8 }}>
                  <select
                    style={styles.input}
                    value={addValues.loan_category_id}
                    onChange={(e) => setAddValues(v => ({ ...v, loan_category_id: e.target.value }))}
                  >
                    <option value="">-- Select category --</option>
                    {cats.map(c => (
                      <option key={c.loan_category_id || c.id} value={c.loan_category_id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <input
                    style={styles.input}
                    value={addValues.new_category}
                    onChange={(e) => setAddValues(v => ({ ...v, new_category: e.target.value }))}
                    placeholder="e.g., Personal Loan"
                  />
                </div>
              )}
            </div>

            {/* Optional: Extra Amount + Date */}
            <div className="row-2" style={{ ...styles.row2 }}>
              <div>
                <div style={styles.label}>Extra Amount (₹) <span style={styles.hint}>(optional)</span></div>
                <input
                  style={styles.input}
                  type="number" min="0" step="0.01"
                  value={addValues.extra_amount}
                  onChange={(e) => setAddValues(v => ({ ...v, extra_amount: e.target.value }))}
                  placeholder="1500"
                />
              </div>
              <div>
                <div style={styles.label}>
                  Extra Amount Date <span style={styles.hint}>(optional)</span>
                </div>
                <input
                  style={styles.input}
                  type="date"
                  value={addValues.extra_amount_on}
                  onChange={(e) => setAddValues(v => ({ ...v, extra_amount_on: e.target.value }))}
                />
                {addValues.extra_amount_on && (
                  <div style={{ marginTop: 4, ...styles.hint }}>
                    {fmtDate(addValues.extra_amount_on)}
                  </div>
                )}
              </div>
            </div>

            {/* Optional: Details */}
            <div>
              <div style={styles.label}>Details <span style={styles.hint}>(optional)</span></div>
              <textarea
                style={styles.textarea}
                value={addValues.details}
                onChange={(e) => setAddValues(v => ({ ...v, details: e.target.value }))}
                placeholder="Notes / processing info…"
              />
            </div>

            {/* Actions */}
            <div className="stack-sm" style={styles.actionsRow}>
              <button
                style={styles.btn}
                onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
                onClick={submitAdd}
              >
                Save Loan
              </button>
              <button style={styles.btnGhost} onClick={resetAdd}>Reset</button>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div style={styles.grid}>
          {loans.map((ln) => (
            <div key={ln.loan_id} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                {editing === ln.loan_id ? (
                  <input
                    style={{ ...styles.input, fontWeight: 800 }}
                    value={editValues.loan_title}
                    onChange={(e) => setEditValues((v) => ({ ...v, loan_title: e.target.value }))}
                  />
                ) : (
                  <div style={{ fontWeight: 800, fontSize: 'clamp(14px,3vw,16px)' }}>{ln.loan_title}</div>
                )}
                <span style={styles.pill}>{ln.category_name}</span>
              </div>

              <div style={{ marginTop: 8, fontSize: 'clamp(11px,2.6vw,12px)', opacity: .75 }}>
                Created: <b>{fmtDate(ln.created_on)}</b>
              </div>

              <div className="row-3" style={{ ...styles.row3, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 'clamp(11px,2.6vw,12px)', opacity: .7 }}>Amount</div>
                  {editing === ln.loan_id ? (
                    <input
                      style={styles.input}
                      type="number" min="0" step="0.01"
                      value={editValues.loan_amount}
                      onChange={(e) => setEditValues((v) => ({ ...v, loan_amount: e.target.value }))}
                    />
                  ) : (
                    <div style={{ fontWeight: 700 }}>₹{Number(ln.loan_amount || 0).toFixed(2)}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 'clamp(11px,2.6vw,12px)', opacity: .7 }}>Paid</div>
                  <div style={{ fontWeight: 700 }}>₹{Number(ln.total_paid || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'clamp(11px,2.6vw,12px)', opacity: .7 }}>Remaining</div>
                  <div style={{ fontWeight: 700 }}>₹{Number(ln.amount_remaining || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="stack-sm" style={styles.actionsRow}>
                {editing === ln.loan_id ? (
                  <>
                    <button
                      style={styles.btn}
                      onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
                      onClick={() => saveEdit(ln.loan_id)}
                    >
                      Save
                    </button>
                    <button style={styles.btnGhost} onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      style={styles.btn}
                      onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
                      onClick={() => startEdit(ln)}
                    >
                      Update
                    </button>
                    <button style={styles.btnGhost} onClick={() => delLoan(ln.loan_id)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 28 }} />
      </div>
    </div>
  );
}
