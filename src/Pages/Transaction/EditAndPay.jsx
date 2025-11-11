// pages/EditAndPay.jsx
// Contains two components for canvas: EditLoan and PayLoan (export both)
// Mobile-first, professional. Uses /api/loans and /api/loans/:id/pay

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ---------------- EditLoan.jsx ----------------
export function EditLoan() {
  const { id } = useParams?.() || { id: null };
  const navigate = useNavigate?.() || ((p) => window.location.href = p);
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`/api/loans/${id}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Not found');
      setLoan(j.loan);
    } catch (e) { setMsg({type:'error', text: e.message}); }
    finally { setLoading(false); }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const body = {
        category: loan.category,
        loan_title: loan.loan_title,
        loan_amount: Number(parseFloat(loan.loan_amount).toFixed(2)),
        loan_get_date: loan.loan_get_date || null,
        extra_details: loan.extra_details || null,
        seq_no: loan.seq_no || null
      };
      const res = await fetch(`/api/loans/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Update failed');
      setMsg({type:'success', text:'Updated'});
      setTimeout(()=>navigate('/loans'),800);
    } catch (e) { setMsg({type:'error', text: e.message}); }
    finally { setLoading(false); }
  }

  if (!id) return <div className="p-4">Invalid loan id</div>;

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-medium">Edit Loan</h3>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {loan && (
          <form onSubmit={save} className="space-y-3 mt-3">
            <input className="w-full p-3 border rounded" value={loan.category} onChange={e=>setLoan({...loan, category: e.target.value})} />
            <input className="w-full p-3 border rounded" value={loan.loan_title} onChange={e=>setLoan({...loan, loan_title: e.target.value})} />
            <input className="w-full p-3 border rounded" value={loan.loan_amount} onChange={e=>setLoan({...loan, loan_amount: e.target.value})} inputMode="numeric" />
            <input className="w-full p-3 border rounded" value={loan.loan_get_date || ''} onChange={e=>setLoan({...loan, loan_get_date: e.target.value})} placeholder="YYYY-MM-DD or leave" />
            <textarea className="w-full p-3 border rounded" value={loan.extra_details || ''} onChange={e=>setLoan({...loan, extra_details: e.target.value})} />
            <div className="flex space-x-2">
              <button className="flex-1 py-2 bg-indigo-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={()=>navigate('/loans')} className="flex-1 py-2 border rounded">Cancel</button>
            </div>
            {msg && <div className={`p-2 rounded ${msg.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>}
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------- PayLoan.jsx ----------------
export function PayLoan() {
  const { id } = useParams?.() || { id: null };
  const navigate = useNavigate?.() || ((p) => window.location.href = p);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) { setMsg({type:'error', text:'Valid amount needed'}); return; }
    try {
      setLoading(true);
      // if file use FormData
      if (file) {
        const fd = new FormData();
        fd.append('paid_amount', Number(parseFloat(amount).toFixed(2)));
        if (date) fd.append('paid_date', date);
        fd.append('screenshot', file);
        const res = await fetch(`/api/loans/${id}/pay`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
      } else {
        const res = await fetch(`/api/loans/${id}/pay`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ paid_amount: Number(parseFloat(amount).toFixed(2)), paid_date: date || null, screenshot: null }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Save failed');
      }
      setMsg({type:'success', text:'Payment added'});
      setTimeout(()=>navigate('/loans'),800);
    } catch (e) { setMsg({type:'error', text: e.message}); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-medium">Add Payment</h3>
        <form onSubmit={submit} className="space-y-3 mt-3">
          <input className="w-full p-3 border rounded" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Paid amount" inputMode="numeric" />
          <input className="w-full p-3 border rounded" value={date} onChange={e=>setDate(e.target.value)} placeholder="YYYY-MM-DD (optional)" />
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} className="w-full" />
          <div className="flex space-x-2">
            <button className="flex-1 py-2 bg-green-600 text-white rounded">{loading ? 'Saving...' : 'Add Payment'}</button>
            <button type="button" onClick={()=>navigate('/loans')} className="flex-1 py-2 border rounded">Cancel</button>
          </div>
          {msg && <div className={`p-2 rounded ${msg.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>}
        </form>
      </div>
    </div>
  );
}

// Default export placeholder if needed
export default function Placeholder() { return null; }
