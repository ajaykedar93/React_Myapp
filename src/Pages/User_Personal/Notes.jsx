import React, { useEffect, useState, useRef, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Swal from "sweetalert2";

const BASE_URL = "https://express-myapp.onrender.com/api/notes";

/* ====== Date helpers (pretty: "2 Oct 2025") ====== */
const MONTHS = [
  { short: "Jan", num: 1 }, { short: "Feb", num: 2 }, { short: "Mar", num: 3 },
  { short: "Apr", num: 4 }, { short: "May", num: 5 }, { short: "Jun", num: 6 },
  { short: "Jul", num: 7 }, { short: "Aug", num: 8 }, { short: "Sep", num: 9 },
  { short: "Oct", num: 10 }, { short: "Nov", num: 11 }, { short: "Dec", num: 12 },
];

function daysInMonth(m, y) { return new Date(y, m, 0).getDate(); }
function toDMY(day, monthShort, year) { return `${Number(day)} ${monthShort} ${Number(year)}`; }
function parseDMY(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [dStr, mStr, yStr] = parts;
  const day = Number(dStr);
  const monthShort = mStr;
  const year = Number(yStr);
  if (!day || !year || !MONTHS.find(m => m.short === monthShort)) return null;
  return { day, monthShort, year };
}
function normalizeDMY(str) {
  const p = parseDMY(str);
  if (!p) return "";
  return toDMY(p.day, p.monthShort, p.year);
}

/* ✅ Timezone-safe: always show the same calendar date as DB */
function toPrettyDate(val) {
  if (!val) return "";
  if (typeof val === "string") {
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/); // ISO/ISO-like
    if (m) {
      const y = +m[1], mo = +m[2], d = +m[3];
      const monthShort = MONTHS[mo - 1]?.short || "Jan";
      return `${d} ${monthShort} ${y}`;
    }
    const already = normalizeDMY(val);
    if (already) return already;
  }
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const mo = val.getUTCMonth();
    const d = val.getUTCDate();
    const monthShort = MONTHS[mo]?.short || "Jan";
    return `${d} ${monthShort} ${y}`;
  }
  const dobj = new Date(val);
  if (!isNaN(dobj)) {
    const y = dobj.getUTCFullYear();
    const mo = dobj.getUTCMonth();
    const d = dobj.getUTCDate();
    const monthShort = MONTHS[mo]?.short || "Jan";
    return `${d} ${monthShort} ${y}`;
  }
  return String(val);
}

/* == Date selector that reads/writes "2 Oct 2025" == */
function DateSelect({ value, onChange, label, idPrefix = "ds", required = false }) {
  const today = new Date();
  const initialParsed =
    parseDMY(value) ||
    (() => {
      const pretty = toPrettyDate(value);
      return parseDMY(pretty) || {
        day: today.getUTCDate(),
        monthShort: MONTHS[today.getUTCMonth()].short,
        year: today.getUTCFullYear(),
      };
    })();

  const [day, setDay] = useState(initialParsed.day);
  const [monthShort, setMonthShort] = useState(initialParsed.monthShort);
  const [year, setYear] = useState(initialParsed.year);

  useEffect(() => {
    const pretty = toPrettyDate(value);
    const p = parseDMY(pretty);
    if (p) { setDay(p.day); setMonthShort(p.monthShort); setYear(p.year); }
  }, [value]);

  const totalDays = daysInMonth(MONTHS.find(m => m.short === monthShort)?.num || 1, year);
  useEffect(() => { if (day > totalDays) setDay(totalDays); }, [monthShort, year]); // eslint-disable-line
  useEffect(() => { onChange && onChange(toDMY(day, monthShort, year)); }, [day, monthShort, year]); // eslint-disable-line

  const dayOptions = Array.from({ length: totalDays }, (_, i) => i + 1);
  const currentYear = today.getUTCFullYear();
  const years = Array.from({ length: 61 }, (_, i) => currentYear - 50 + i);

  return (
    <div className="w-100">
      {label && <label className="form-label">{label}</label>}
      <div className="d-flex gap-2 flex-wrap">
        <select
          id={`${idPrefix}-day`}
          className="form-select"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          required={required}
          style={{ maxWidth: 110 }}
        >
          {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          id={`${idPrefix}-month`}
          className="form-select"
          value={monthShort}
          onChange={(e) => setMonthShort(e.target.value)}
          required={required}
          style={{ maxWidth: 140 }}
        >
          {MONTHS.map(m => <option key={m.short} value={m.short}>{m.short}</option>)}
        </select>
        <select
          id={`${idPrefix}-year`}
          className="form-select"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          required={required}
          style={{ maxWidth: 130 }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="form-text mt-1">Format: <strong>{toDMY(day, monthShort, year)}</strong></div>
    </div>
  );
}

export default function Notes() {
  const [form, setForm] = useState({
    title: "",
    note_date: "",    // "2 Oct 2025"
    details: "",
    user_name: "",    // optional
    user_email: "",   // optional
  });
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterDate, setFilterDate] = useState(""); // "2 Oct 2025"
  const [editItem, setEditItem] = useState(null);
  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const toastTimerRef = useRef(null);

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // ===== style once =====
  useEffect(() => {
    const id = "notes-page-style";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      .glass { backdrop-filter: blur(10px); background: rgba(255,255,255,0.9); border: 1px solid rgba(15,23,42,0.12); border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
      .overlay-backdrop{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(255,255,255,0.72); z-index:2000; animation:fadeIn .2s ease both; }
      .center-msg{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,0.25); z-index:2100; animation:fadeIn .2s ease both; }
      .center-msg .card{ min-width:280px; background:#fffdf7; border:1px solid rgba(15,23,42,0.12); border-radius:16px; padding:18px; box-shadow:0 12px 32px rgba(0,0,0,0.08); animation:scaleIn .2s ease both; }
      .center-msg .card.success{ border-color:rgba(34,197,94,.45);} .center-msg .card.error{ border-color:rgba(239,68,68,.45);}
      .table thead th { position: sticky; top: 0; background: #f8fafc; z-index: 1; }
      .truncate { max-width: 480px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      @media (max-width: 768px){ .truncate { max-width: 200px; } }
      @keyframes fadeIn{from{opacity:0} to{opacity:1}} @keyframes scaleIn{from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(s);
  }, []);

  // toast
  const showCenterMsg = (type, text, ms = 1600) => {
    setOverlayMsg({ show: true, type, text });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setOverlayMsg({ show: false, type: "", text: "" }), ms);
  };

  // fetch
  const fetchNotes = async () => {
    setLoading(true);
    try {
      let url = BASE_URL;
      const params = [];
      if (filterEmail) params.push(`user_email=${encodeURIComponent(filterEmail)}`);
      if (filterDate) params.push(`date=${encodeURIComponent(filterDate)}`);
      if (params.length) url += `?${params.join("&")}`;

      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Fetch failed");

      let data = Array.isArray(json.data) ? json.data : [];

      if (search.trim()) {
        const q = search.toLowerCase();
        data = data.filter((x) =>
          x.title.toLowerCase().includes(q) ||
          x.details?.toLowerCase().includes(q) ||
          x.user_name?.toLowerCase().includes(q)
        );
      }

      setNotes(data);
    } catch (err) {
      showCenterMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, [filterEmail, filterDate, search]);
  useEffect(() => { setPage(1); }, [filterEmail, filterDate, search]);

  // add (user fields are OPTIONAL)
  const addNote = async () => {
    if (!form.title) return showCenterMsg("error", "Title is required.");
    if (!form.note_date) return showCenterMsg("error", "Please select a date.");

    const normalized = normalizeDMY(form.note_date);
    if (!normalized) return showCenterMsg("error", "Invalid date format.");

    const payload = {
      title: form.title,
      note_date: normalized,
      details: form.details || "",
      user_name: form.user_name || "",
      user_email: form.user_email || "",
    };

    setBusy(true);
    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Add failed");
      setForm({ title: "", note_date: "", details: "", user_name: "", user_email: "" });
      showCenterMsg("success", "Note added successfully");
      fetchNotes();
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  // delete
  const deleteNote = async (id) => {
    const res = await Swal.fire({
      title: "Delete this note?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;

    setBusy(true);
    try {
      const r = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      showCenterMsg("success", "Note deleted");
      if ((page - 1) * PAGE_SIZE >= notes.length - 1) {
        setPage((p) => Math.max(1, p - 1));
      }
      fetchNotes();
    } catch (err) {
      showCenterMsg("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  // update
  const updateNote = async () => {
    if (!editItem) return;
    const normalized = normalizeDMY(editItem.note_date);
    if (!normalized) return showCenterMsg("error", "Invalid date format.");

    const payload = { ...editItem, note_date: normalized };

    setBusy(true);
    try {
      const res = await fetch(`${BASE_URL}/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Update failed");
      setEditItem(null);
      fetchNotes();
      showCenterMsg("success", "Updated successfully");
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  // pagination derived
  const total = notes.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return notes.slice(start, start + PAGE_SIZE);
  }, [notes, page]);
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div
      className="container-xxl py-4"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at -10% -10%, rgba(6,182,212,0.18), transparent 60%), " +
          "radial-gradient(1200px 600px at 110% -10%, rgba(34,197,94,0.16), transparent 60%), " +
          "linear-gradient(180deg, #ffffff 0%, #fcfffb 45%, #f7fbff 100%)",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        color: "#0b1221",
      }}
    >
      {/* Header */}
      <div className="glass p-3 p-md-4 mb-3 d-flex justify-content-between align-items-center flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(180deg,#06b6d4,#22c55e)",
              display: "grid",
              placeItems: "center",
              color: "#05212a",
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div>
            <h4
              className="m-0"
              style={{
                background: "linear-gradient(90deg,#06b6d4,#22c55e,#a78bfa)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Notes Manager
            </h4>
            <div className="text-muted small">Add and manage all your notes easily.</div>
          </div>
        </div>
        <div className="text-end mt-2 mt-md-0">
          <div className="text-muted small">Total</div>
          <div className="fw-bold">{total}</div>
        </div>
      </div>

      {/* Add Form */}
      <div className="glass p-3 p-md-4 mb-4">
        <h5 className="mb-3">Add Note</h5>
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">Title</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Buy groceries"
            />
          </div>
          <div className="col-md-3">
            <DateSelect
              label="Date (2 Oct 2025)"
              value={form.note_date}
              onChange={(v) => setForm({ ...form, note_date: v })}
              idPrefix="add"
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">User Name (optional)</label>
            <input
              className="form-control"
              value={form.user_name}
              onChange={(e) => setForm({ ...form, user_name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">User Email (optional)</label>
            <input
              className="form-control"
              value={form.user_email}
              onChange={(e) => setForm({ ...form, user_email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Details</label>
            <textarea
              className="form-control"
              rows="2"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="Write details..."
            ></textarea>
          </div>
        </div>
        <div className="mt-3 d-flex gap-2 flex-wrap">
          {/* Bigger button, full width on mobile */}
          <button
            className="btn btn-success btn-lg px-5 py-2 w-100 w-md-auto"
            onClick={addNote}
            disabled={busy}
          >
            {busy ? "Saving..." : "Add Note"}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass p-3 mb-3 d-flex flex-wrap gap-2 align-items-end">
        <div className="d-flex flex-column" style={{ maxWidth: 260 }}>
          <label className="form-label mb-1">Search</label>
          <input
            className="form-control"
            placeholder="Title / Name / Details"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="d-flex flex-column" style={{ maxWidth: 260 }}>
          <label className="form-label mb-1">Filter by Email</label>
          <input
            className="form-control"
            placeholder="you@example.com"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
          />
        </div>
        <div style={{ maxWidth: 460, flex: 1 }}>
          <DateSelect
            label="Filter by Date (optional)"
            value={filterDate}
            onChange={(v) => setFilterDate(v)}
            idPrefix="filter"
          />
        </div>
      </div>

      {/* Notes Table */}
      <div className="glass overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th style={{ minWidth: 180 }}>Title</th>
                <th style={{ minWidth: 150 }}>Date</th>
                <th style={{ minWidth: 160 }}>User</th>
                <th style={{ minWidth: 220 }}>Email</th>
                <th style={{ minWidth: 240 }}>Details</th>
                <th className="text-end" style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <LoadingSpiner />
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No notes found.
                  </td>
                </tr>
              ) : (
                pageItems.map((n, idx) => {
                  const display = toPrettyDate(n.note_date); // ✅ same as DB date
                  const rowNumber = (page - 1) * PAGE_SIZE + (idx + 1);
                  return (
                    <tr key={n.id}>
                      <td>{rowNumber}</td>
                      <td className="truncate" title={n.title}>{n.title}</td>
                      <td>{display || "-"}</td>
                      <td className="truncate" title={n.user_name || "-"}>{n.user_name || "-"}</td>
                      <td className="truncate" title={n.user_email || "-"}>{n.user_email || "-"}</td>
                      <td className="truncate" title={n.details || "-"}>{n.details || "-"}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() =>
                            setEditItem({ ...n, note_date: display || n.note_date })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => deleteNote(n.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="d-flex flex-wrap align-items-center justify-content-between p-3 gap-2">
            <div className="text-muted small">
              Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{total}</b>
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

      {/* Edit Modal */}
      {editItem && (
        <div
          className="center-msg"
          onClick={(e) => e.target.classList.contains("center-msg") && setEditItem(null)}
        >
          <div className="card" style={{ maxWidth: 520 }}>
            <h5 className="mb-3">Edit Note</h5>
            <input
              className="form-control mb-2"
              value={editItem.title}
              onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
            />
            <div className="mb-2">
              <DateSelect
                label="Date (2 Oct 2025)"
                value={editItem.note_date}
                onChange={(v) => setEditItem({ ...editItem, note_date: v })}
                idPrefix="edit"
                required
              />
            </div>
            <textarea
              className="form-control mb-3"
              rows="2"
              value={editItem.details || ""}
              onChange={(e) => setEditItem({ ...editItem, details: e.target.value })}
            ></textarea>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-light" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button className="btn btn-success px-4" onClick={updateNote}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busy Overlay */}
      {busy && (
        <div className="overlay-backdrop">
          <div className="d-flex flex-column align-items-center">
            <LoadingSpiner />
            <div>Working…</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {overlayMsg.show && (
        <div className="center-msg">
          <div className={`card ${overlayMsg.type}`}>
            <h6 className="mb-1">{overlayMsg.type === "error" ? "Error" : "Success"}</h6>
            <div>{overlayMsg.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
