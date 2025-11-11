import React, { useEffect, useState } from 'react';

// pages/Loan.jsx
// Mobile-first, professional layout. Uses only loan APIs (/api/loans).
// Default export a React component.

export default function Loan() {
  const [categories, setCategories] = useState([]);
  const [useCustom, setUseCustom] = useState(false);
  const [categorySelect, setCategorySelect] = useState('');
  const [categoryCustom, setCategoryCustom] = useState('');
  const [loanTitle, setLoanTitle] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanGetDate, setLoanGetDate] = useState(''); // expect format: 2 Oct 2025
  const [extraDetails, setExtraDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/loans'); // use loan API only
      const data = await res.json();
      const distinct = Array.from(new Set(data.map((r) => r.category).filter(Boolean)));
      setCategories(distinct);
      if (distinct.length && !categorySelect) setCategorySelect(distinct[0]);
    } catch (e) {
      console.error(e);
    }
  }

  // parse '2 Oct 2025' -> '2025-10-02' ISO for backend DATE
  function parseUserDateToISO(input) {
    if (!input) return null;
    const m = input.trim().match(/^([0-9]{1,2})\s+([A-Za-z]{3,})\s+([0-9]{4})$/);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const monStr = m[2].toLowerCase().slice(0,3);
    const year = parseInt(m[3], 10);
    const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
    const mon = months[monStr];
    if (!mon) return null;
    const mm = String(mon).padStart(2,'0');
    const dd = String(day).padStart(2,'0');
    return `${year}-${mm}-${dd}`;
  }

  function validateForm() {
    // category: exactly one of select or custom
    const cat = useCustom ? categoryCustom.trim() : categorySelect.trim();
    if (!cat) return 'Choose or type a category (only one).';
    if (!loanTitle.trim()) return 'Loan title required.';
    if (!loanAmount || isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) return 'Valid loan amount required.';
    if (loanGetDate) {
      if (!parseUserDateToISO(loanGetDate)) return 'Loan date must be like: 2 Oct 2025';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    const err = validateForm();
    if (err) { setMsg({ type: 'error', text: err }); return; }

    const category = useCustom ? categoryCustom.trim() : categorySelect.trim();
    const payload = {
      seq_no: null,
      category,
      loan_title: loanTitle.trim(),
      loan_amount: Number(parseFloat(loanAmount).toFixed(2)),
      loan_get_date: parseUserDateToISO(loanGetDate),
      extra_details: extraDetails.trim() || null
    };

    try {
      setLoading(true);
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      // success
      setMsg({ type: 'success', text: 'Loan added' });
      // reset
      setCategoryCustom('');
      setLoanTitle('');
      setLoanAmount('');
      setLoanGetDate('');
      setExtraDetails('');
      // refresh categories (new typed category may appear)
      fetchCategories();
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Error' });
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h1 className="text-lg font-semibold text-gray-900">Add Loan</h1>
          <p className="text-sm text-gray-500 mt-1">Quickly add loan details. Mobile-first layout.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Category</label>
              <div className="mt-2 flex space-x-2">
                <button type="button" onClick={() => setUseCustom(false)} className={`flex-1 py-2 rounded-lg border ${!useCustom ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}>Select</button>
                <button type="button" onClick={() => setUseCustom(true)} className={`flex-1 py-2 rounded-lg border ${useCustom ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}>Type</button>
              </div>

              {!useCustom ? (
                <select value={categorySelect} onChange={(e) => setCategorySelect(e.target.value)} className="mt-2 w-full p-3 rounded-lg border border-gray-200 bg-white">
                  <option value="">-- choose category --</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={categoryCustom} onChange={(e) => setCategoryCustom(e.target.value)} placeholder="Type category (e.g. Friend)" className="mt-2 w-full p-3 rounded-lg border border-gray-200" />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Loan Title</label>
              <input value={loanTitle} onChange={(e) => setLoanTitle(e.target.value)} placeholder="e.g. Friend loan" className="mt-2 w-full p-3 rounded-lg border border-gray-200" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Amount</label>
              <input value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} inputMode="numeric" placeholder="10000" className="mt-2 w-full p-3 rounded-lg border border-gray-200" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Loan Get Date (optional)</label>
              <input value={loanGetDate} onChange={(e) => setLoanGetDate(e.target.value)} placeholder="2 Oct 2025" className="mt-2 w-full p-3 rounded-lg border border-gray-200" />
              <p className="text-xs text-gray-400 mt-1">Format: <strong>2 Oct 2025</strong></p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Extra details (optional)</label>
              <textarea value={extraDetails} onChange={(e) => setExtraDetails(e.target.value)} rows={3} className="mt-2 w-full p-3 rounded-lg border border-gray-200" />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">{loading ? 'Saving...' : 'Add Loan'}</button>
            </div>

            {msg && (
              <div className={`p-3 rounded-md ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>
            )}

          </form>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">Uses API: <code className="bg-gray-100 px-2 py-1 rounded">POST /api/loans</code> and <code className="bg-gray-100 px-2 py-1 rounded">GET /api/loans</code></div>
      </div>
    </div>
  );
}
