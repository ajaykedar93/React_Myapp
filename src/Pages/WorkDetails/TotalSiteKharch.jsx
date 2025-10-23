import React, { useState, useEffect } from "react";
import LoadingSpiner from "../Entertainment/LoadingSpiner";

const monthsList = [
  { id: 1, name: "January" }, { id: 2, name: "February" }, { id: 3, name: "March" },
  { id: 4, name: "April" }, { id: 5, name: "May" }, { id: 6, name: "June" },
  { id: 7, name: "July" }, { id: 8, name: "August" }, { id: 9, name: "September" },
  { id: 10, name: "October" }, { id: 11, name: "November" }, { id: 12, name: "December" },
];

const TotalSiteKharch = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalKharch, setTotalKharch] = useState(0);

  const addReceivedAmount = async () => {
    if (!receivedAmount || isNaN(receivedAmount) || Number(receivedAmount) <= 0) {
      alert("Enter a valid amount");
      return;
    }
    try {
      const res = await fetch("https://express-myapp.onrender.com/api/add-received-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_received: receivedAmount, payment_date: receivedDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add amount");
      setReceivedAmount("");
      fetchMonthSummary(selectedMonth);
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchMonthSummary = async (month) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`https://express-myapp.onrender.com/api/monthly-summary-sitekharch?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch summary");
      if (data.length > 0) {
        const monthData = data[0];
        setTotalReceived(monthData.total_received_rs || 0);
        setTotalKharch(monthData.total_kharch_rs || 0);
      } else {
        setTotalReceived(0);
        setTotalKharch(0);
      }
    } catch (err) {
      setError(err.message);
      setTotalReceived(0);
      setTotalKharch(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthSummary(selectedMonth);
  }, [selectedMonth]);

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg: #f5f6fa;
          --card: #ffffff;
          --border: #e0e0e0;
          --muted: #6b7280;
          --text: #111827;
          --title: #4b0082;
          --brand: #7c3aed;
          --highlight: #f59e0b;
          --success: #16a34a;
          --danger: #dc2626;
          --shadow-light: rgba(0,0,0,0.05);
          --shadow-strong: rgba(0,0,0,0.12);
        }

        body { background: var(--bg); font-family: 'Inter', sans-serif; margin:0; }
        .wrap { max-width: 960px; margin: 0 auto; padding: 25px 15px; }

        .hd { text-align:center; font-weight:700; font-size:clamp(2rem,5vw,2.8rem); color:var(--title); margin-bottom:25px; }

        .card {
          background: var(--card);
          border-radius: 20px;
          box-shadow: 0 10px 25px var(--shadow-light), 0 4px 15px var(--shadow-strong);
          padding: 25px;
          margin-bottom:25px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px var(--shadow-strong), 0 6px 20px var(--shadow-light); }

        h3 { font-weight:600; color: var(--brand); margin-bottom:18px; }

        .field { margin-bottom:18px; }
        label { display:block; font-weight:500; color:var(--muted); margin-bottom:6px; font-size:0.95rem; }
        input[type="number"], input[type="date"], select {
          width:100%; padding:14px 12px; border-radius:14px; border:1px solid var(--border);
          font-size:1rem; outline:none; transition: 0.3s; box-shadow: inset 0 1px 3px var(--shadow-light);
        }
        input:focus, select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.2); }

        button {
          padding:12px 22px; border:none; border-radius:12px; background: linear-gradient(90deg,#7c3aed,#a78bfa);
          color:white; font-weight:600; cursor:pointer; transition:0.3s; box-shadow:0 6px 15px rgba(124,58,237,0.25);
        }
        button:hover { opacity:0.9; transform: translateY(-1px); box-shadow:0 8px 20px rgba(124,58,237,0.3); }

        .summary { display:flex; justify-content:space-between; flex-wrap:wrap; gap:20px; margin-top:25px; }
        .summary div { flex:1; min-width:180px; background: var(--card); padding:20px; border-radius:16px;
          text-align:center; box-shadow: 0 5px 15px var(--shadow-light); transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .summary div:hover { transform: translateY(-3px); box-shadow: 0 12px 25px var(--shadow-strong); }
        .summary div h3 { margin-bottom:12px; font-size:1.1rem; color: var(--muted); font-weight:500; }
        .summary div p { font-size:1.8rem; font-weight:700; color:var(--title); }

        .cash-label { color: var(--highlight); font-weight:700; font-size:1rem; }

        @media(max-width:700px) { .summary { flex-direction:column; } }

      `}</style>

      <h2 className="hd">Total Site Kharch & Received</h2>

      {/* Add Received Amount */}
      <div className="card">
        <h3>Add Received Amount</h3>
        <div className="field">
          <label>Amount (Rs.)</label>
          <input
            type="number"
            value={receivedAmount}
            onChange={(e) => setReceivedAmount(e.target.value)}
            placeholder="Enter amount in Rs."
          />
        </div>
        <div className="field">
          <label>Date</label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Payment Mode</label>
          <p className="cash-label">Cash</p>
        </div>
        <button onClick={addReceivedAmount}>Add Amount</button>
      </div>

      {/* Month Selector + Summary */}
      <div className="card">
        <h3>Select Month</h3>
        <div className="field">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {monthsList.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {loading && <div style={{textAlign:'center',padding:'25px'}}><LoadingSpiner /></div>}
        {error && <p style={{color:'var(--danger)',fontWeight:'600'}}>{error}</p>}

        {!loading && !error && (
          <div className="summary">
            <div>
              <h3>Total Received ({monthsList[selectedMonth-1].name})</h3>
              <p>Rs. {totalReceived.toLocaleString()}</p>
            </div>
            <div>
              <h3>Total Kharch ({monthsList[selectedMonth-1].name})</h3>
              <p>Rs. {totalKharch.toLocaleString()}</p>
            </div>
            <div>
              <h3>Remaining Amount ({monthsList[selectedMonth-1].name})</h3>
              <p>Rs. {(totalReceived - totalKharch).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TotalSiteKharch;
