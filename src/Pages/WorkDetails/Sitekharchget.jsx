import React, { useEffect, useState } from "react";
import LoadingSpiner from "../Entertainment/LoadingSpiner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SitekharchGet = () => {
  const [siteKharchList, setSiteKharchList] = useState([]); // actual rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // totals coming from backend
  const [totals, setTotals] = useState({
    expense: 0,
    received: 0,
    balance: 0,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const recordsPerPage = 10;

  // Date/Month Filters
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --- PDF Export ---
  const handleDownloadPDF = () => {
    const input = document.getElementById("siteKharchTable");
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      let filename = "SiteKharch";
      if (selectedDate) filename += `_${selectedDate}`;
      else if (selectedMonth) filename += `_${selectedMonth}`;
      pdf.save(`${filename}.pdf`);
    });
  };

  // --- Fetch API ---
  const fetchSiteKharch = async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(0);
    try {
      let url = "";

      if (selectedDate) {
        url = `https://express-backend-myapp.onrender.com/api/sitekharch?from=${selectedDate}&to=${selectedDate}`;
      } else if (selectedMonth) {
        const [year, month] = selectedMonth.split("-");
        // month in Date() is 0-based, so pass Number(month)
        const from = `${year}-${month}-01`;
        const to = new Date(year, Number(month), 0).toISOString().split("T")[0];
        url = `https://express-backend-myapp.onrender.com/api/sitekharch?from=${from}&to=${to}`;
      } else {
        // fallback: all
        url = `https://express-backend-myapp.onrender.com/api/sitekharch`;
      }

      const res = await fetch(url);
      const data = await res.json();

      // 🔴 IMPORTANT:
      // our new API returns { totals: {...}, data: [...] }
      if (res.ok) {
        if (Array.isArray(data)) {
          // older API shape fallback
          setSiteKharchList(data);
          setTotals({
            expense: data.reduce((t, it) => {
              const base = Number(it.amount || 0);
              const extra = it.extra_items
                ? it.extra_items.reduce(
                    (s, e) => s + Number(e.amount || 0),
                    0
                  )
                : 0;
              return t + base + extra;
            }, 0),
            received: 0,
            balance: 0,
          });
          if (data.length === 0) setError("No records found");
        } else {
          // ✅ new shape
          const { data: rows, totals } = data;
          if (!rows || rows.length === 0) {
            setError("No records found");
          }
          setSiteKharchList(rows || []);
          setTotals({
            expense: totals?.expense || 0,
            received: totals?.received || 0,
            balance: totals?.balance || 0,
          });
        }
      } else {
        throw new Error(data.error || "Failed to fetch data.");
      }
    } catch (err) {
      setError(err.message);
      setSiteKharchList([]);
      setTotals({ expense: 0, received: 0, balance: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `https://express-backend-myapp.onrender.com/api/sitekharch/${id}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        setShowConfirm(false);
        fetchSiteKharch();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchSiteKharch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedMonth]);

  // -------- Pagination logic --------
  const startIndex = currentPage * recordsPerPage;
  const currentRecords = siteKharchList.slice(
    startIndex,
    startIndex + recordsPerPage
  );
  const totalPages = Math.ceil(siteKharchList.length / recordsPerPage);

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root {
          --bg: #f9fafb;
          --card: #ffffff;
          --border: #e5e7eb;
          --muted: #6b7280;
          --text: #111827;
          --title: #1d4ed8;
          --brand-2: #8b5cf6;
          --highlight: #facc15;
          --danger: #ef4444;
          --table-odd: #f3f4f6;
          --table-even: #ffffff;
          --table-hover: #e0e7ff;
        }
        body { background: var(--bg); margin: 0; font-family: 'Poppins', sans-serif; }
        .wrap { max-width: 100%; margin: 0 auto; padding: 24px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); padding: 24px; }
        .hd { text-align: center; margin: 8px 0 20px; font-weight: 700; font-size: clamp(1.75rem, 6vw, 2.3rem); color: var(--title); }
        .filters { display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
        .field { flex:1; min-width:160px; }
        label { font-size: 0.9rem; color: var(--muted); font-weight: 600; display: block; margin-bottom: 6px; }
        input[type="date"], input[type="month"] { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); font-size: 1rem; }
        .btn-main { background: var(--brand-2); color: #fff; padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; transition:0.3s; }
        .btn-main:hover { background:#7c3aed; }
        .table-container { margin-top: 24px; overflow-x: auto; border-radius:12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; }
        th { background-color: var(--brand-2); color: white; font-weight:600; position: sticky; top: 0; }
        tbody tr:nth-child(odd) { background-color: var(--table-odd); }
        tbody tr:nth-child(even) { background-color: var(--table-even); }
        tbody tr:hover { background-color: var(--table-hover); transition:0.3s; }
        td, th { border-bottom: 1px solid var(--border); color: var(--text); }
        .extra-row td { background: #faf5ff; font-size: 0.9rem; padding-left: 30px; }
        .total-row td { font-weight: 700; background: #e0e7ff; }
        .delete-btn { color: white; background: var(--danger); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.3s; }
        .delete-btn:hover { opacity: 0.9; }
        .pagination { display:flex; justify-content:center; gap:10px; margin-top:15px; align-items:center; }
        .pagination button { padding:6px 12px; border-radius:6px; border:1px solid var(--brand-2); background:#fff; color:var(--brand-2); cursor:pointer; font-weight:600; }
        .pagination button:disabled { opacity:0.5; cursor:default; }
        .confirm-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999; }
        .confirm-box { background: var(--card); padding: 20px; border-radius: 12px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.2); }
        .confirm-buttons { margin-top: 20px; display:flex; justify-content:center; gap: 10px; }
        .btn { padding: 8px 16px; border-radius: 8px; border:none; cursor:pointer; font-weight:600; }
        .btn-cancel { background: var(--muted); color:white; }
        .btn-ok { background: var(--danger); color:white; }
      `}</style>

      <div className="card">
        <h2 className="hd">Site Kharch Records</h2>

        {/* Filters */}
        <div className="filters">
          <div className="field">
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedMonth("");
              }}
            />
          </div>

          <div className="field">
            <label>Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDate("");
              }}
            />
          </div>
        </div>

        <button className="btn-main" onClick={handleDownloadPDF}>
          Download PDF
        </button>

        {/* TABLE */}
        <div className="table-container" id="siteKharchTable">
          <table>
            <thead>
              <tr>
                <th>Seq No</th>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Details</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ use paginated list */}
              {currentRecords.map((item, idx) => {
                const globalIndex = startIndex + idx; // keep numbering correct across pages
                const extras = Array.isArray(item.extra_items)
                  ? item.extra_items
                  : [];
                const totalAmount =
                  Number(item.amount || 0) +
                  extras.reduce(
                    (sum, e) => sum + Number(e.amount || 0),
                    0
                  );

                return (
                  <React.Fragment key={item.id || globalIndex}>
                    <tr>
                      <td>{globalIndex + 1}</td>
                      <td>{formatDate(item.kharch_date)}</td>
                      <td>
                        <b>{item.category_name || "-"}</b>
                      </td>
                      <td>{item.amount}</td>
                      <td>{item.details}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => {
                            setDeleteId(item.id);
                            setShowConfirm(true);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {extras.map((extra, eIdx) => (
                      <tr
                        className="extra-row"
                        key={`${item.id || globalIndex}-extra-${eIdx}`}
                      >
                        <td>{`${globalIndex + 1}.${eIdx + 1}`}</td>
                        <td></td>
                        <td>Extra</td>
                        <td>{extra.amount}</td>
                        <td>{extra.details}</td>
                        <td></td>
                      </tr>
                    ))}

                    <tr className="total-row">
                      <td colSpan="4" style={{ textAlign: "right" }}>
                        Total:
                      </td>
                      <td>{totalAmount}</td>
                      <td></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <LoadingSpiner />
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              color: "red",
              fontWeight: "600",
              marginTop: "10px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && siteKharchList.length > 0 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 0}
            >
              Prev
            </button>
            <span>
              Page {currentPage + 1} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage + 1 >= totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* ✅ bottom totals (for ALL pages, from backend) */}
        <div style={{ textAlign: "center", marginTop: "18px", lineHeight: 1.5 }}>
          <strong>Total Expense (all): ₹{totals.expense}</strong><br />
          <strong>Total Received: ₹{totals.received}</strong><br />
          <strong>
            Balance:{" "}
            <span style={{ color: totals.balance < 0 ? "red" : "green" }}>
              ₹{totals.balance}
            </span>
          </strong>
        </div>
      </div>

      {/* delete confirm */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div>Are you sure you want to delete this record?</div>
            <div className="confirm-buttons">
              <button
                className="btn btn-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-ok"
                onClick={() => handleDelete(deleteId)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitekharchGet;
