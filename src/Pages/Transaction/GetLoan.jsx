// src/Pages/Transactions/GetLoan.jsx
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE = "http://localhost:5000/api"; // GET from /loans

export default function GetLoan() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [toast, setToast] = useState({ show: false, type: "success", msg: "" });
  const [selected, setSelected] = useState(null); // details modal
  const [firstLoad, setFirstLoad] = useState(true);

  const categories = useMemo(
    () => [
      "Personal",
      "Any Person",
      "Loan Apps",
      "Friends",
      "Family Member",
      "Work Advance",
      "Any App",
      "Other",
    ],
    []
  );

  const ui = {
    bg: "#f6f8fb",
    surface: "#ffffff",
    border: "#e6e9ef",
    ink: "#0f172a",
    chip: "#0f8a5f",
    accent: "#e85a19",
  };

  function notify(msg, type = "success") {
    setToast({ show: true, type, msg });
    // auto hide
    setTimeout(() => setToast({ show: false, type, msg: "" }), 1800);
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, []);

  async function fetchList() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);

      const res = await fetch(`${BASE}/loans?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          // Endpoint missing → not an error toast loop, just info
          setList([]);
          setFirstLoad(false);
          notify("Endpoint not found (check GET /api/loans).", "danger");
          return;
        }
        setList([]);
        setFirstLoad(false);
        notify("Failed to load loans", "danger");
        return;
      }

      const data = await res.json().catch(() => []);
      setList(Array.isArray(data) ? data : []);
      setFirstLoad(false);
    } catch (e) {
      setList([]);
      setFirstLoad(false);
      notify("Server not reachable. Start backend.", "danger");
    } finally {
      setLoading(false);
    }
  }

  function amount(num) {
    const n = Number(num || 0);
    return `₹${n.toFixed(2)}`;
    // For full localization:
    // return n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
  }

  // Quick stats
  const totalPrincipal = list.reduce((a, b) => a + Number(b.loan_amount || 0), 0);
  const totalPaid = list.reduce((a, b) => a + Number(b.amount_paid || 0), 0);
  const totalRemain = list.reduce((a, b) => a + Number(b.amount_remaining || 0), 0);

  return (
    <>
      <style>{`
        .wrap { background:${ui.bg}; min-height:60vh; }
        .card-clean { background:${ui.surface}; border:1px solid ${ui.border}; border-radius:16px; box-shadow:0 10px 28px rgba(2,6,23,.06); }
        .pill { border:1px solid ${ui.border}; background:#fff; border-radius:999px; padding:.25rem .6rem; font-weight:600;}
        .badge-cat { background:${ui.chip}; color:#fff; font-weight:700; }
        .btn-ghost { background:#fff; border:1px solid ${ui.border}; color:${ui.ink}; }
        .btn-accent { background:${ui.accent}; color:#fff; border:none; font-weight:700; }
        .alert-floating { position: fixed; top:50%; left:50%; transform: translate(-50%,-50%); z-index:2000; min-width:260px; }
        .table>thead th { background:#fafafa; }
        .muted { color:#6b7280; }
        .stat { border:1px solid ${ui.border}; background:#fff; border-radius:12px; padding:10px 12px; font-weight:800;}
        .empty { border:1px dashed ${ui.border}; background:#fff; border-radius:16px; padding:22px; text-align:center; }
        .loader-sm {
          width: 1.2rem; height: 1.2rem; border: 2px solid #ddd; border-top-color: ${ui.accent}; border-radius: 50%;
          animation: spin .7s linear infinite; display:inline-block; vertical-align:middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Mobile tightening */
        @media (max-width: 576px){
          .stat { font-size:.92rem; padding:8px 10px; }
          .table { font-size: .9rem; }
        }
      `}</style>

      {/* Centered toast */}
      {toast.show && (
        <div className={`alert alert-${toast.type} text-center shadow alert-floating`}>
          {toast.msg}
        </div>
      )}

      <div className="wrap container-fluid p-2 p-sm-3">
        <div className="card-clean p-3 p-sm-4">
          {/* Header + Filters */}
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
            <h2 className="h5 m-0">Loans</h2>
            <div className="d-flex gap-2 w-100 w-sm-auto">
              <input
                className="form-control"
                placeholder="Search title"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" onClick={fetchList} disabled={loading}>
                {loading ? (<><span className="loader-sm me-2" /> Filtering</>) : "Filter"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="row g-2 mt-3">
            <div className="col-12 col-sm-4">
              <div className="stat">Principal: {amount(totalPrincipal)}</div>
            </div>
            <div className="col-12 col-sm-4">
              <div className="stat">Paid: {amount(totalPaid)}</div>
            </div>
            <div className="col-12 col-sm-4">
              <div className="stat">Remaining: {amount(totalRemain)}</div>
            </div>
          </div>

          {/* Table / Empty / Loader */}
          <div className="mt-3">
            {firstLoad && loading ? (
              <div className="empty">
                <span className="loader-sm me-2" />
                Loading loans...
              </div>
            ) : list.length === 0 ? (
              <div className="empty">
                <div className="fw-bold mb-1">No loans found</div>
                <div className="muted mb-3">Try changing filters or add a new loan from the Add page.</div>
                <button className="btn btn-ghost" onClick={fetchList} disabled={loading}>
                  {loading ? (<><span className="loader-sm me-2" /> Reloading</>) : "Reload"}
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th className="text-end">Amount</th>
                      <th className="text-end">Paid</th>
                      <th className="text-end">Remain</th>
                      <th>Repay Date</th>
                      <th>Disbursed</th>
                      <th>IST Created</th>
                      <th style={{ width: 90 }}>More</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => (
                      <tr key={row.loan_id}>
                        <td className="fw-semibold">{row.loan_title}</td>
                        <td>
                          <span className="badge badge-cat rounded-pill">
                            {row.loan_category || "Other"}
                          </span>
                        </td>
                        <td className="text-end">{amount(row.loan_amount)}</td>
                        <td className="text-end">{amount(row.amount_paid)}</td>
                        <td className="text-end">{amount(row.amount_remaining)}</td>
                        <td>{row.repayment_date || "-"}</td>
                        <td>{row.disbursed_date || "-"}</td>
                        <td>{row.created_at_ist || "-"}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setSelected(row)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loading && (
                  <div className="text-center my-2">
                    <span className="loader-sm me-2" />
                    Updating...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="muted mt-2">
            Tip: If you see “Endpoint not found”, confirm your server exposes <code>GET {BASE}/loans</code>
            and returns a JSON array.
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selected && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.35)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header">
                <h5 className="modal-title">Loan Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="m-0">{selected.loan_title}</h6>
                      <span className="badge badge-cat rounded-pill">
                        {selected.loan_category || "Other"}
                      </span>
                    </div>
                    {selected.details && <div className="mt-2">{selected.details}</div>}
                  </div>

                  <div className="col-6">
                    <div className="small text-muted">Loan Amount</div>
                    <div className="fw-bold">{amount(selected.loan_amount)}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Amount Paid</div>
                    <div className="fw-bold">{amount(selected.amount_paid)}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Remaining</div>
                    <div className="fw-bold">{amount(selected.amount_remaining)}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Extra Interest</div>
                    <div className="fw-bold">{amount(selected.extra_interest)}</div>
                  </div>

                  <div className="col-6">
                    <div className="small text-muted">Repayment Date</div>
                    <div className="fw-bold">{selected.repayment_date || "-"}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Disbursed Date</div>
                    <div className="fw-bold">{selected.disbursed_date || "-"}</div>
                  </div>

                  <div className="col-6">
                    <div className="small text-muted">Other Expense Amount</div>
                    <div className="fw-bold">{amount(selected.other_expense_amount)}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">IST Created</div>
                    <div className="fw-bold">{selected.created_at_ist || "-"}</div>
                  </div>

                  {/* EMI schedule (array) */}
                  <div className="col-12">
                    <div className="small text-muted mb-1">EMI Schedule</div>
                    {Array.isArray(selected.emi_schedule) && selected.emi_schedule.length ? (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th className="text-end">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.emi_schedule.map((e, idx) => (
                              <tr key={idx}>
                                <td>{e.date}</td>
                                <td className="text-end">{amount(e.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="muted">No EMI entries</div>
                    )}
                  </div>

                  {/* additional_details (object) */}
                  <div className="col-12">
                    <div className="small text-muted mb-1">Additional Details</div>
                    {selected.additional_details && Object.keys(selected.additional_details).length ? (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selected.additional_details).map(([k, v]) => (
                              <tr key={k}>
                                <td className="fw-semibold">{k}</td>
                                <td>{String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="muted">No extra fields</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
