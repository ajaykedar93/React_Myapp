import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// pages/GetLoan.jsx
// Mobile-first professional layout.
// Shows categories, loads loans for selected category, each loan has Edit | Delete | Paid buttons.

export default function GetLoan() {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState('');
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate?.() || ((p) => window.location.href = p);

  useEffect(() => { fetchAllLoans(); }, []);

  async function fetchAllLoans() {
    try {
      setLoading(true);
      const res = await fetch('/api/loans');
      const data = await res.json();
      const distinct = Array.from(new Set(data.map(d => d.category).filter(Boolean)));
      setCategories(distinct);
      if (distinct.length) setSelected(distinct[0]);
      // store all loans locally for initial load
      setLoans(data);
    } catch (e) {
      console.error(e);
      setMsg({type:'error', text: 'Failed to load'});
    } finally { setLoading(false); }
  }

  async function fetchByCategory(cat) {
    if (!cat) return setLoans([]);
    try {
      setLoading(true);
      const res = await fetch(`/api/loans/category/${encodeURIComponent(cat)}`);
      const data = await res.json();
      setLoans(data);
    } catch (e) {
      console.error(e);
      setMsg({type:'error', text:'Failed to load category'});
    } finally { setLoading(false); }
  }

  useEffect(() => { if (selected) fetchByCategory(selected); }, [selected]);

  async function handleDelete(id) {
    if (!confirm('Delete this loan?')) return;
    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMsg({type:'success', text:'Deleted'});
      // refresh list
      fetchByCategory(selected);
    } catch (e) {
      console.error(e);
      setMsg({type:'error', text: e.message || 'Error'});
    }
  }

  function handleEdit(id) {
    // navigate to edit page (implement route separately)
    navigate(`/loans/edit/${id}`);
  }

  function handlePaid(id) {
    // navigate to paid page (implement separately)
    navigate(`/loans/${id}/pay`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold">Loans by Category</h2>
          <p className="text-sm text-gray-500">Select category to view loans.</p>

          <div className="mt-4">
            <label className="block text-xs text-gray-700">Category</label>
            <select className="mt-2 w-full p-3 rounded-lg border" value={selected} onChange={(e)=>setSelected(e.target.value)}>
              {categories.length===0 && <option value="">-- no category --</option>}
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-center text-sm text-gray-500 py-6">Loading...</div>
            ) : loans.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-6">No loans in this category</div>
            ) : (
              <ul className="space-y-3">
                {loans.map(loan => (
                  <li key={loan.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{loan.loan_title}</div>
                        <div className="text-xs text-gray-500 mt-1">Amount: ₹{Number(loan.loan_amount).toFixed(2)}</div>
                        <div className="text-xs text-gray-400">Paid: ₹{Number(loan.total_paid || 0).toFixed(2)} • Remaining: ₹{Number(loan.remaining_amount || loan.loan_amount).toFixed(2)}</div>
                      </div>
                      <div className="ml-2 text-right space-y-2">
                        <button onClick={()=>handleEdit(loan.id)} className="px-3 py-1 text-xs rounded bg-yellow-100">Edit</button>
                        <button onClick={()=>handleDelete(loan.id)} className="px-3 py-1 text-xs rounded bg-red-100">Delete</button>
                        <button onClick={()=>handlePaid(loan.id)} className="px-3 py-1 text-xs rounded bg-green-100">Paid</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {msg && (
            <div className={`mt-4 p-3 rounded ${msg.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>
          )}

        </div>
        <div className="mt-3 text-center text-xs text-gray-500">APIs used: <code className="bg-gray-100 px-2 py-1 rounded">GET /api/loans</code> and <code className="bg-gray-100 px-2 py-1 rounded">GET /api/loans/category/:category</code></div>
      </div>
    </div>
  );
}
