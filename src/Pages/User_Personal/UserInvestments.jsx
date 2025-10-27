// src/pages/UserInvestments.jsx
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Swal from "sweetalert2";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";

const API = "https://express-backend-myapp.onrender.com/api/user_investment";

/* ---------- Month helpers ---------- */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const numToMonth = (n) => MONTHS[(n - 1 + 12) % 12];

/* ---------- Nice currency formatting ---------- */
const fmtMoney = (n) => {
  const num = Number(n ?? 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function UserInvestments() {
  /* ---------- Page style (once) ---------- */
  useEffect(() => {
    const id = "user-investments-style";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --pri:#06b6d4;
        --sec:#22c55e;
        --vio:#a78bfa;
        --ink:#0b1221;
        --mut:#64748b;
        --bg1:
          radial-gradient(1000px 500px at -10% -10%, rgba(6,182,212,0.18), transparent 60%),
          radial-gradient(1000px 500px at 110% -10%, rgba(34,197,94,0.16), transparent 60%),
          linear-gradient(180deg, #ffffff 0%, #fcfffb 45%, #f7fbff 100%);
      }
      .glass {
        backdrop-filter: blur(8px);
        background: rgba(255,255,255,0.9);
        border:1px solid rgba(15,23,42,0.12);
        border-radius:16px;
        box-shadow:0 10px 28px rgba(0,0,0,.06)
      }
      .chip{padding:.2rem .6rem; border-radius:999px; font-weight:700; font-size:.78rem; letter-spacing:.3px}
      .chip-profit{background:linear-gradient(90deg,#dcfce7,#86efac); color:#065f46; border:1px solid rgba(16,185,129,.3)}
      .chip-loss{background:linear-gradient(90deg,#fee2e2,#fca5a5); color:#7f1d1d; border:1px solid rgba(239,68,68,.3)}
      .btn-gradient{background:linear-gradient(90deg,var(--sec),var(--pri)); color:#05212a; border:none; font-weight:700; box-shadow:0 8px 24px -12px rgba(6,182,212,.6)}
      .btn-outline-soft{border:1px solid rgba(15,23,42,.12)}
      .sticky-top-shadow{
        position:sticky; top:0; z-index:9;
        box-shadow:0 10px 22px -18px rgba(0,0,0,.25);
        backdrop-filter: blur(6px)
      }
      .table thead th{position:sticky; top:0; z-index:1; background:#f8fafc}
      .card-hover{transition:transform .2s ease, box-shadow .2s ease}
      .card-hover:hover{transform:translateY(-1px); box-shadow:0 12px 26px rgba(0,0,0,.08)}
      /* Responsive visibility */
      @media (max-width: 991.98px){ .desktop-table{display:none !important} }
      @media (min-width: 992px){ .mobile-cards{display:none !important} }
      /* Tighter on very small screens */
      @media (max-width: 576px){
        .form-label{font-size:.9rem}
        .form-select, .form-control{font-size:.95rem; padding:.55rem .75rem}
      }
    `;
    document.head.appendChild(s);
  }, []);

  /* ---------- State ---------- */
  const now = new Date();
  const [form, setForm] = useState({
    useCurrentMonth: true,
    month_name: numToMonth(now.getUTCMonth()+1),
    year_value: now.getUTCFullYear(),
    job_income: "",
    extra_income: "",
    month_kharch: "",
    total_emi: "",
    other_kharch: "",
  });

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // filters + paging
  const [qYear, setQYear] = useState("");
  const [qMonth, setQMonth] = useState(""); // either number or name string
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // scroll to top on page change (within content scroller)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  /* ---------- Fetch list ---------- */
  const fetchList = async (opts = { resetPage: false }) => {
    try {
      if (opts.resetPage) setPage(1);
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(opts.resetPage ? 1 : page));
      params.set("pageSize", String(PAGE_SIZE));
      if (qYear) params.set("year", qYear);
      if (qMonth) {
        if (/^\d+$/.test(qMonth)) params.set("month", qMonth);
        else params.set("month_name", qMonth);
      }

      const res = await fetch(`${API}?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");

      setList(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", e.message || "Load failed", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page]);
  useEffect(() => { fetchList({ resetPage: true }); /* eslint-disable-next-line */ }, [qMonth, qYear]);

  /* ---------- Optimistic helpers ---------- */
  const upsertRow = (row) => {
    setList((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      if (i === -1) return [row, ...prev];
      const copy = prev.slice();
      copy[i] = row;
      return copy;
    });
  };
  const removeRow = (id) => {
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---------- Add ---------- */
  const addRecord = async () => {
    if (form.job_income === "" || isNaN(+form.job_income) || +form.job_income < 0) {
      return Swal.fire("Validation", "Job income must be a non-negative number.", "warning");
    }
    if (form.month_kharch === "" || isNaN(+form.month_kharch) || +form.month_kharch < 0) {
      return Swal.fire("Validation", "Month kharch must be a non-negative number.", "warning");
    }
    if (form.total_emi === "" || isNaN(+form.total_emi) || +form.total_emi < 0) {
      return Swal.fire("Validation", "Total EMI must be a non-negative number.", "warning");
    }

    const payload = {
      job_income: +form.job_income,
      month_kharch: +form.month_kharch,
      total_emi: +form.total_emi,
    };
    if (form.extra_income !== "" && !isNaN(+form.extra_income)) payload.extra_income = +form.extra_income;
    if (form.other_kharch !== "" && !isNaN(+form.other_kharch)) payload.other_kharch = +form.other_kharch;

    if (!form.useCurrentMonth) {
      payload.month_name = form.month_name;
      payload.year_value = Number(form.year_value);
    }

    setBusy(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Add failed");

      if (page === 1) upsertRow(json);
      setTotal((t) => t + 1);

      Swal.fire({
        icon: "success",
        title: "Saved",
        text: `${json.month_label} saved successfully.`,
        timer: 1400,
        showConfirmButton: false,
      });

      setForm((f) => ({
        ...f,
        job_income: "",
        extra_income: "",
        month_kharch: "",
        total_emi: "",
        other_kharch: "",
      }));

      await fetchList({ resetPage: true });
    } catch (e) {
      Swal.fire("Error", e.message || "Add failed", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Delete ---------- */
  const removeRecord = async (id, label) => {
    const r = await Swal.fire({
      title: "Delete?",
      text: `Remove record for ${label}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;

    const prevList = list;
    const prevTotal = total;
    removeRow(id);
    setTotal((t) => Math.max(0, t - 1));

    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Delete failed");
      }

      Swal.fire({ icon: "success", title: "Deleted", timer: 1100, showConfirmButton: false });

      const newCount = prevTotal - 1;
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      if (page > maxPage) {
        setPage(maxPage);
      } else {
        fetchList();
      }
    } catch (e) {
      setList(prevList);
      setTotal(prevTotal);
      Swal.fire("Error", e.message || "Delete failed", "error");
    }
  };

  /* ---------- Update ---------- */
  const [edit, setEdit] = useState(null);
  const saveEdit = async () => {
    if (!edit) return;
    const payload = {};

    if (edit.month_name && edit.year_value) {
      payload.month_name = edit.month_name;
      payload.year_value = Number(edit.year_value);
    }

    const nums = ["job_income","extra_income","month_kharch","total_emi","other_kharch"];
    for (const k of nums) {
      if (edit[k] !== "" && edit[k] !== null && edit[k] !== undefined) {
        const v = Number(edit[k]);
        if (!Number.isFinite(v) || v < 0) {
          return Swal.fire("Validation", `${k.replace("_"," ")} must be a non-negative number.`, "warning");
        }
        payload[k] = v;
      }
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");

      upsertRow(json);

      Swal.fire({ icon: "success", title: "Updated", timer: 1100, showConfirmButton: false });
      setEdit(null);
      fetchList();
    } catch (e) {
      Swal.fire("Error", e.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Derived ---------- */
  const yearsOptions = useMemo(() => {
    const y0 = now.getUTCFullYear();
    return Array.from({ length: 15 }, (_, i) => y0 - 7 + i);
  }, [now]);

  /* ---------- Render ---------- */
  return (
    <div
      className="container-fluid py-3 py-sm-4"
      style={{
        minHeight: "100%",
        background: "var(--bg1)",
        color: "var(--ink)",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        paddingLeft: "12px",
        paddingRight: "12px",
      }}
    >
      {/* Header */}
      <div className="glass p-2 p-sm-3 p-md-4 mb-3 sticky-top-shadow">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(180deg,#06b6d4,#22c55e)",
                display: "grid", placeItems: "center", color: "#05212a", fontWeight: 800,
                fontSize: 13
              }}
            >
              UI
            </div>
            <div>
              <h5
                className="m-0"
                style={{
                  background: "linear-gradient(90deg,#06b6d4,#22c55e,#a78bfa)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                User Investment (Monthly)
              </h5>
              <div className="text-muted small">
                Add month-end numbers. We auto-calc totals & Profit/Loss.
              </div>
            </div>
          </div>

          {/* Quick filters */}
          <div className="d-flex align-items-center gap-2 w-100 w-sm-auto">
            <select
              className="form-select form-select-sm flex-grow-1"
              value={qMonth}
              onChange={(e) => setQMonth(e.target.value)}
              aria-label="Filter month"
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              {[...Array(12)].map((_,i) =>
                <option key={i+1} value={String(i+1)}>{i+1} (#{i+1})</option>
              )}
            </select>

            <select
              className="form-select form-select-sm flex-grow-1"
              value={qYear}
              onChange={(e) => setQYear(e.target.value)}
              aria-label="Filter year"
            >
              <option value="">All Years</option>
              {yearsOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <button
              className="btn btn-outline-soft btn-sm"
              onClick={() => { setQMonth(""); setQYear(""); }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="glass p-2 p-sm-3 p-md-4 mb-4">
        <h6 className="mb-3">Add Month Investment</h6>

        {/* Month choice */}
        <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="useCurrent"
              checked={form.useCurrentMonth}
              onChange={(e) => setForm({ ...form, useCurrentMonth: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="useCurrent">Use current month</label>
          </div>

          {!form.useCurrentMonth && (
            <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-sm-auto">
              <select
                className="form-select"
                style={{ minWidth: 160 }}
                value={form.month_name}
                onChange={(e) => setForm({ ...form, month_name: e.target.value })}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <select
                className="form-select"
                style={{ minWidth: 130 }}
                value={form.year_value}
                onChange={(e) => setForm({ ...form, year_value: e.target.value })}
              >
                {yearsOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Numbers grid (mobile first) */}
        <div className="row g-2 g-sm-3">
          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Job Income *</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              className="form-control"
              placeholder="e.g. 45000"
              value={form.job_income}
              onChange={(e) => setForm({ ...form, job_income: e.target.value })}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Extra Income (optional)</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              className="form-control"
              placeholder="e.g. 5000"
              value={form.extra_income}
              onChange={(e) => setForm({ ...form, extra_income: e.target.value })}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Month Kharch *</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              className="form-control"
              placeholder="e.g. 12000"
              value={form.month_kharch}
              onChange={(e) => setForm({ ...form, month_kharch: e.target.value })}
            />
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Total EMI *</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              className="form-control"
              placeholder="e.g. 8000"
              value={form.total_emi}
              onChange={(e) => setForm({ ...form, total_emi: e.target.value })}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <label className="form-label">Other Kharch (optional)</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              className="form-control"
              placeholder="e.g. 3000"
              value={form.other_kharch}
              onChange={(e) => setForm({ ...form, other_kharch: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 d-flex gap-2 flex-wrap">
          <button
            className="btn btn-gradient px-4 py-2"
            onClick={addRecord}
            disabled={busy}
          >
            {busy ? "Saving…" : "Add Investment"}
          </button>
          <button
            className="btn btn-light px-3"
            onClick={() =>
              setForm((f) => ({
                ...f,
                job_income: "",
                extra_income: "",
                month_kharch: "",
                total_emi: "",
                other_kharch: "",
              }))
            }
          >
            Clear
          </button>
        </div>
      </div>

      {/* List Section */}
      <div className="glass p-2 p-sm-3">
        <div className="d-flex justify-content-between align-items-center px-1 py-2">
          <h6 className="m-0">Monthly Records</h6>
          <div className="text-muted small">Total: <b>{total}</b></div>
        </div>

        {/* Desktop Table */}
        <div className="desktop-table">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 56 }}>#</th>
                  <th style={{ minWidth: 150 }}>Month</th>
                  <th className="text-end">Income</th>
                  <th className="text-end">Kharch</th>
                  <th className="text-end">Net</th>
                  <th>Status</th>
                  <th className="text-end" style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-4"><LoadingSpiner/></td></tr>
                ) : list.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No records found.</td></tr>
                ) : (
                  list.map((r, i) => (
                    <tr key={r.id} className="align-middle">
                      <td>{(page - 1) * PAGE_SIZE + (i + 1)}</td>
                      <td>
                        <div className="fw-semibold">{r.month_label}</div>
                        <div className="text-muted small">{r.record_date}</div>
                      </td>
                      <td className="text-end">
                        <div className="fw-semibold">₹ {fmtMoney(r.total_income)}</div>
                        <div className="text-muted small">
                          Job: ₹{fmtMoney(r.job_income)} · Extra: ₹{fmtMoney(r.extra_income)}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="fw-semibold">₹ {fmtMoney(r.total_kharch)}</div>
                        <div className="text-muted small">
                          Kharch: ₹{fmtMoney(r.month_kharch)} · EMI: ₹{fmtMoney(r.total_emi)} · Other: ₹{fmtMoney(r.other_kharch)}
                        </div>
                      </td>
                      <td className="text-end fw-bold">₹ {fmtMoney(r.net_amount)}</td>
                      <td>
                        <span className={`chip ${r.profit_loss_status === "PROFIT" ? "chip-profit" : "chip-loss"}`}>
                          {r.profit_loss_status} · ₹ {fmtMoney(r.profit_loss_abs)}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() =>
                            setEdit({
                              ...r,
                              month_name: r.month_label.split(" ")[0],
                              year_value: r.month_label.split(" ")[1],
                              job_income: String(r.job_income ?? ""),
                              extra_income: String(r.extra_income ?? ""),
                              month_kharch: String(r.month_kharch ?? ""),
                              total_emi: String(r.total_emi ?? ""),
                              other_kharch: String(r.other_kharch ?? ""),
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeRecord(r.id, r.month_label)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="d-flex justify-content-between align-items-center p-3">
              <div className="text-muted small">
                Showing <b>{(page - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(page * PAGE_SIZE, total)}</b> of <b>{total}</b>
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </button>
                <span className="btn btn-light btn-sm disabled">{page} / {totalPages}</span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="mobile-cards p-1 p-sm-2">
          {loading ? (
            <div className="text-center py-4"><LoadingSpiner/></div>
          ) : list.length === 0 ? (
            <div className="text-center py-4 text-muted">No records found.</div>
          ) : (
            list.map((r) => (
              <div key={r.id} className="card card-hover mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{r.month_label}</div>
                      <div className="text-muted small">{r.record_date}</div>
                    </div>
                    <span className={`chip ${r.profit_loss_status === "PROFIT" ? "chip-profit" : "chip-loss"}`}>
                      {r.profit_loss_status}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="d-flex justify-content-between">
                      <div className="text-muted">Income</div>
                      <div className="fw-semibold">₹ {fmtMoney(r.total_income)}</div>
                    </div>
                    <div className="small text-muted">
                      Job: ₹{fmtMoney(r.job_income)} · Extra: ₹{fmtMoney(r.extra_income)}
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="d-flex justify-content-between">
                      <div className="text-muted">Kharch</div>
                      <div className="fw-semibold">₹ {fmtMoney(r.total_kharch)}</div>
                    </div>
                    <div className="small text-muted">
                      Kharch: ₹{fmtMoney(r.month_kharch)} · EMI: ₹{fmtMoney(r.total_emi)} · Other: ₹{fmtMoney(r.other_kharch)}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between mt-2">
                    <div className="text-muted">Net</div>
                    <div className="fw-bold">₹ {fmtMoney(r.net_amount)}</div>
                  </div>

                  <div className="d-flex gap-2 justify-content-end mt-3">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        setEdit({
                          ...r,
                          month_name: r.month_label.split(" ")[0],
                          year_value: r.month_label.split(" ")[1],
                          job_income: String(r.job_income ?? ""),
                          extra_income: String(r.extra_income ?? ""),
                          month_kharch: String(r.month_kharch ?? ""),
                          total_emi: String(r.total_emi ?? ""),
                          other_kharch: String(r.other_kharch ?? ""),
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeRecord(r.id, r.month_label)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Pagination (mobile) */}
          {!loading && total > 0 && (
            <div className="d-flex justify-content-between align-items-center p-2">
              <div className="text-muted small">
                {page} / {totalPages}
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {edit && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,.25)", zIndex: 1050 }}
          onClick={(e) => e.target === e.currentTarget && setEdit(null)}
        >
          <div className="glass mx-auto my-4 p-3 p-sm-4" style={{ maxWidth: 560 }}>
            <div className="d-flex justify-content-between align-items-start">
              <h5 className="m-0">Edit {edit.month_label}</h5>
              <button className="btn btn-light btn-sm" onClick={() => setEdit(null)}>✕</button>
            </div>

            {/* Month change */}
            <div className="d-flex gap-2 mt-3 flex-wrap">
              <select
                className="form-select"
                style={{ minWidth: 160 }}
                value={edit.month_name}
                onChange={(e) => setEdit({ ...edit, month_name: e.target.value })}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="form-select"
                style={{ minWidth: 130 }}
                value={edit.year_value}
                onChange={(e) => setEdit({ ...edit, year_value: e.target.value })}
              >
                {[...new Set([edit.year_value, ...yearsOptions])].sort().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Numbers */}
            <div className="row g-2 g-sm-3 mt-2">
              <div className="col-12 col-sm-6">
                <label className="form-label">Job Income</label>
                <input
                  className="form-control"
                  type="number" step="0.01" inputMode="decimal"
                  value={edit.job_income}
                  onChange={(e) => setEdit({ ...edit, job_income: e.target.value })}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Extra Income</label>
                <input
                  className="form-control"
                  type="number" step="0.01" inputMode="decimal"
                  value={edit.extra_income}
                  onChange={(e) => setEdit({ ...edit, extra_income: e.target.value })}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Month Kharch</label>
                <input
                  className="form-control"
                  type="number" step="0.01" inputMode="decimal"
                  value={edit.month_kharch}
                  onChange={(e) => setEdit({ ...edit, month_kharch: e.target.value })}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Total EMI</label>
                <input
                  className="form-control"
                  type="number" step="0.01" inputMode="decimal"
                  value={edit.total_emi}
                  onChange={(e) => setEdit({ ...edit, total_emi: e.target.value })}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Other Kharch</label>
                <input
                  className="form-control"
                  type="number" step="0.01" inputMode="decimal"
                  value={edit.other_kharch}
                  onChange={(e) => setEdit({ ...edit, other_kharch: e.target.value })}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-light" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-success" onClick={saveEdit} disabled={busy}>
                {busy ? "Saving…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-grid" style={{ placeItems:"center", background:"rgba(255,255,255,.65)", zIndex: 1100 }}>
          <div className="glass p-3 d-flex align-items-center gap-3">
            <LoadingSpiner />
            <div>Working…</div>
          </div>
        </div>
      )}
    </div>
  );
}
