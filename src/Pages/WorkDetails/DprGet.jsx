import React, { useState, useEffect } from "react";

const DprGet = () => {
  const [dprList, setDprList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [months] = useState([
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ]);

  // ===== Popup state =====
  const [popup, setPopup] = useState({
    open: false,
    type: "confirm", // "confirm" | "success" | "error"
    title: "",
    message: "",
    onConfirm: null,
  });

  // ===== Helpers =====
  const getCurrentMonthName = () => months[new Date().getMonth()];

  const formatDate = (dateStr) => {
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Date(dateStr).toLocaleDateString("en-GB", options);
  };

  const groupedByDate = dprList.reduce((acc, item) => {
    const date = formatDate(item.work_date);
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});
  const allDates = Object.keys(groupedByDate);

  // ===== Fetch DPR by month =====
  const fetchDprByMonth = async (month) => {
    if (!month) return;
    setLoading(true);
    setError(null);
    setDprList([]);
    try {
      const res = await fetch(`http://localhost:5000/api/dpr/month/${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch DPR");
      setDprList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== Delete DPR by date =====
  const handleDelete = (date) => {
    showPopup(
      "confirm",
      "Delete DPR",
      `Are you sure you want to delete all entries for ${date}?`,
      async () => {
        try {
          setLoading(true);
          const res = await fetch(`http://localhost:5000/api/dpr/delete/${date}`, {
            method: "DELETE",
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "Failed to delete DPR");

          // Refresh list
          await fetchDprByMonth(selectedMonth);
          showPopup("success", "Deleted", `All DPR entries for ${date} have been deleted.`);
        } catch (err) {
          showPopup("error", "Delete Failed", err.message);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // ===== Download DPR PDF =====
  const handleDownload = async () => {
    if (!selectedMonth) return;
    try {
      const res = await fetch(`http://localhost:5000/api/dpr/export/${selectedMonth}`, {
        method: "GET",
      });
      if (!res.ok) throw new Error("Failed to download PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DPR_${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  };

  // ===== Popup handlers =====
  const showPopup = (type, title, message, onConfirm = null) => {
    setPopup({ open: true, type, title, message, onConfirm });
  };
  const closePopup = () => setPopup((p) => ({ ...p, open: false, onConfirm: null }));

  const confirmPopup = async () => {
    if (popup.onConfirm) await popup.onConfirm();
    closePopup();
  };

  // ===== Load current month on mount =====
  useEffect(() => {
    const currentMonth = getCurrentMonthName();
    setSelectedMonth(currentMonth);
    fetchDprByMonth(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap');

        :root {
          --bg: #f5f5f7;
          --card: #ffffff;
          --border: #d1d5db;
          --date-bg: #e2e8f0; 
          --title: #1f2937;
          --muted: #6b7280;
          --primary: #2563eb;
          --danger: #ef4444;
          --hover: #f3f4f6;
        }

        body { background: var(--bg); margin:0; font-family: 'Poppins', sans-serif; }
        .wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
        .hd { text-align: center; font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 700; color: var(--title); margin-bottom: 25px; }

        .controls { display:flex; justify-content:center; gap:15px; margin-bottom:25px; }
        select { padding:10px 15px; border-radius:8px; border:1px solid var(--border); font-size:1rem; }
        .btn-download, .btn-delete { padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; }
        .btn-download { background:var(--primary); color:white; }
        .btn-download:hover { opacity:0.9; }
        .btn-delete { background:#ef4444; color:white; }
        .btn-delete:hover { opacity:0.9; }

        .card { background: var(--card); border-radius: 16px; padding: 15px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border:1px solid var(--border); }

        .date-header { background: var(--date-bg); padding: 10px 15px; border-radius: 12px; font-weight:700; color: var(--title); margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; }

        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 10px; border-bottom:1px solid var(--border); }
        th { background: #f1f3f5; color: var(--primary); font-weight:600; text-align:left; }
        tr:nth-child(even) td { background: #f9fafb; }

        .time { font-weight:600; color:#374151; }
        .seq { font-weight:700; color:#1f2937; }

        .empty { text-align:center; color:var(--muted); font-size:1.1rem; margin-top:30px; }

        /* Popup styles */
        .modal-overlay { position: fixed; inset:0; background: rgba(15,23,42,0.45); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
        .modal-card { width:100%; max-width:420px; background:#fff; border-radius:16px; box-shadow:0 20px 50px rgba(2,6,23,0.25); overflow:hidden; animation:modalIn .18s ease-out; }
        @keyframes modalIn { from { transform: translateY(6px) scale(.985); opacity:.6; } to { transform: translateY(0) scale(1); opacity:1; } }
        .modal-hd { display:flex; align-items:center; gap:10px; padding:16px 18px 8px; }
        .badge--success { background:#ecfdf5;color:#059669;border:1px solid #a7f3d0; }
        .badge--error { background:#fef2f2;color:#b91c1c;border:1px solid #fecaca; }
        .modal-title { margin:0; font-weight:800; font-size:1.05rem; color:#0f172a; }
        .modal-body { padding:8px 18px 16px; color:#334155; line-height:1.5; }
        .modal-actions { padding:12px 18px 18px; display:flex; justify-content:flex-end; gap:10px; }
        .btn--ghost { background:#fff; color:#334155; border:1px solid #e5e7eb; }
      `}</style>

      <h2 className="hd">DPR Records</h2>

      <div className="controls">
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            if (e.target.value) fetchDprByMonth(e.target.value);
          }}
        >
          <option value="">-- Select Month --</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <button
          className="btn-download"
          disabled={!selectedMonth || dprList.length === 0}
          onClick={handleDownload}
        >
          ⬇ Download PDF
        </button>
      </div>

      {loading && <p style={{textAlign:'center'}}>Loading...</p>}
      {error && <p style={{color:'red', textAlign:'center'}}>{error}</p>}

      {!loading && !error && selectedMonth && dprList.length === 0 && (
        <p className="empty">No details found for {selectedMonth}</p>
      )}

      {!loading && !error && allDates.map((date) => {
        let seq = 1;
        return (
          <div className="card" key={date}>
            <div className="date-header">
              <span>{date}</span>
              <button className="btn-delete" onClick={() => handleDelete(date)}>Delete</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Details</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {groupedByDate[date].map((item, idx) => {
                  const rows = [];
                  if (item.details || item.work_time) {
                    rows.push(
                      <tr key={`main-${idx}`}>
                        <td className="seq">{seq++}</td>
                        <td>{item.details}</td>
                        <td className="time">{item.work_time}</td>
                      </tr>
                    );
                  }
                  if (Array.isArray(item.extra_details)) {
                    item.extra_details.forEach((extra, eIdx) => {
                      rows.push(
                        <tr key={`extra-${idx}-${eIdx}`}>
                          <td className="seq">{seq++}</td>
                          <td>{extra}</td>
                          <td className="time">{item.extra_times[eIdx]}</td>
                        </tr>
                      );
                    });
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ===== Popup ===== */}
      {popup.open && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-hd">
              {popup.type === "success" && <span className="badge--success">✓</span>}
              {popup.type === "error" && <span className="badge--error">!</span>}
              <h4 className="modal-title">{popup.title}</h4>
            </div>
            <div className="modal-body">{popup.message}</div>
            <div className="modal-actions">
              {popup.type === "confirm" && (
                <>
                  <button className="btn--ghost" onClick={closePopup}>Cancel</button>
                  <button className="btn-delete" onClick={confirmPopup}>OK</button>
                </>
              )}
              {popup.type !== "confirm" && (
                <button className="btn--ghost" onClick={closePopup}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DprGet;
