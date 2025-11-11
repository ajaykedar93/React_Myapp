import React, { useEffect, useState, useRef, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Swal from "sweetalert2";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/notes";

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
function toPrettyDate(val) {
  if (!val) return "";
  if (typeof val === "string") {
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
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
function dmyToUTC(dmy) {
  const p = parseDMY(toPrettyDate(dmy));
  if (!p) return new Date(0);
  const mo = MONTHS.find(m => m.short === p.monthShort)?.num || 1;
  return new Date(Date.UTC(p.year, mo - 1, p.day));
}

/* ===== Badge color helpers ===== */
const BADGE_CLASSES = [
  "text-bg-primary",
  "text-bg-success",
  "text-bg-warning",
  "text-bg-info",
  "text-bg-danger",
  "text-bg-secondary",
  "text-bg-dark",
];
const BADGE_GLOW = {
  "text-bg-primary":  "rgba(13,110,253,0.22)",
  "text-bg-success":  "rgba(25,135,84,0.22)",
  "text-bg-warning":  "rgba(255,193,7,0.22)",
  "text-bg-info":     "rgba(13,202,240,0.22)",
  "text-bg-danger":   "rgba(220,53,69,0.22)",
  "text-bg-secondary":"rgba(108,117,125,0.22)",
  "text-bg-dark":     "rgba(33,37,41,0.22)",
};
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function getBadgeClassForDate(datePretty) {
  const idx = hashString(datePretty || "-") % BADGE_CLASSES.length;
  return BADGE_CLASSES[idx];
}
function getGlowForBadgeClass(badgeClass) {
  return BADGE_GLOW[badgeClass] || "rgba(0,0,0,0.12)";
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
      {label && <label className="form-label fs-12-14">{label}</label>}
      <div className="d-flex gap-2 flex-wrap">
        <select id={`${idPrefix}-day`} className="form-select fs-12-14" value={day} onChange={(e) => setDay(Number(e.target.value))} required={required} style={{ maxWidth: 110 }}>
          {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select id={`${idPrefix}-month`} className="form-select fs-12-14" value={monthShort} onChange={(e) => setMonthShort(e.target.value)} required={required} style={{ maxWidth: 140 }}>
          {MONTHS.map(m => <option key={m.short} value={m.short}>{m.short}</option>)}
        </select>
        <select id={`${idPrefix}-year`} className="form-select fs-12-14" value={year} onChange={(e) => setYear(Number(e.target.value))} required={required} style={{ maxWidth: 130 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="form-text mt-1 fs-11-13">Format: <strong>{toDMY(day, monthShort, year)}</strong></div>
    </div>
  );
}

/* ====== Hook: detect if a block overflows 3 lines ====== */
function useOverflowMap(ids, depKey) {
  const refs = useRef({});
  const [map, setMap] = useState({}); // { [id]: true/false }

  useEffect(() => {
    const calc = () => {
      const next = {};
      ids.forEach((id) => {
        const el = refs.current[id];
        if (!el) { next[id] = false; return; }

        // Temporarily remove clamp to get full height
        el.classList.add("no-clamp");
        const full = el.scrollHeight;
        el.classList.remove("no-clamp");

        const clamp = el.clientHeight; // height with 3-line clamp
        next[id] = full > clamp + 2;   // needs "Show more" only if overflowing
      });
      setMap(next);
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [ids.join("|"), depKey]);

  return { refs, needMore: map };
}

export default function Notes() {
  const [form, setForm] = useState({ title: "", note_date: "", details: "", user_name: "", user_email: "" });
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Search & Month filter
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("All");

  // Edit modal
  const [editItem, setEditItem] = useState(null);

  // Overlay toast
  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const toastTimerRef = useRef(null);

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Sections refs
  const addFormRef = useRef(null);
  const listRef = useRef(null);

  // Expanded note ids
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // ===== style once (adds spacing, pro card, smaller FAB) =====
  useEffect(() => {
    const id = "notes-page-style-cards";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --txt-10-12: clamp(10px, 2.7vw, 12px);
        --txt-11-13: clamp(11px, 2.8vw, 13px);
        --txt-12-14: clamp(12px, 3.2vw, 14px);
        --txt-13-15: clamp(13px, 3.4vw, 15px);
        --txt-14-16: clamp(14px, 3.8vw, 16px);
        --txt-16-20: clamp(16px, 4.6vw, 20px);

        --brand-1: #0ea5e9;
        --brand-2: #22c55e;
        --brand-3: #38bdf8;
        --ink-700:#334155;
      }

      .fs-10-12 { font-size: var(--txt-10-12); }
      .fs-11-13, .fs-11-13 * { font-size: var(--txt-11-13); }
      .fs-12-14, .fs-12-14 * { font-size: var(--txt-12-14); }
      .fs-13-15 { font-size: var(--txt-13-15); }
      .fs-14-16 { font-size: var(--txt-14-16); }

      .glass { backdrop-filter: blur(10px); background: rgba(255,255,255,0.92); border: 1px solid rgba(2,6,23,0.08); border-radius: 16px; box-shadow: 0 12px 28px rgba(0,0,0,0.06); }

      .section-tabs {
        background: linear-gradient(180deg,#ffffff, #f9fbff);
        border: 1px solid rgba(2,6,23,0.06);
        border-radius: 14px;
        padding: 6px;
      }
      .section-tabs .nav-link{
        border-radius: 999px;
        font-weight: 800;
        color: #0f172a;
        padding: .45rem .9rem;
      }
      .section-tabs .nav-link.active{
        background: linear-gradient(90deg, var(--brand-1), var(--brand-2));
        color: white;
        box-shadow: 0 8px 18px rgba(14,165,233,.25);
      }

      .overlay-backdrop{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(255,255,255,0.72); z-index:2000; animation:fadeIn .2s ease both; }
      .center-msg{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,0.25); z-index:2100; animation:fadeIn .2s ease both; }
      .center-msg .card{ min-width:280px; background:#fff; border:1px solid rgba(2,6,23,0.08); border-radius:16px; padding:18px; box-shadow:0 12px 30px rgba(0,0,0,0.08); animation:scaleIn .2s ease both; }
      .center-msg .card.success{ border-left:6px solid #22c55e;} .center-msg .card.error{ border-left:6px solid #ef4444;}

      .note-card { position: relative; border-radius: 16px; border: 1px solid rgba(2,6,23,0.08); transition: box-shadow .2s ease, border-color .2s ease, transform .15s ease; }
      .note-card:hover{ transform: translateY(-1px); box-shadow: 0 16px 30px rgba(0,0,0,.06); }
      .note-badge { position:absolute; top:12px; right:12px; }
      .note-badge .badge { padding:.4rem .65rem; font-weight:700; border-radius: 999px; font-size: var(--txt-10-12); }

      /* keep card text away from the badge (adds right padding) */
      .pr-badge { padding-right: 86px; }

      /* add a subtle divider for a more "professional" look */
      .note-meta { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding-bottom:.35rem; margin-bottom:.5rem; border-bottom:1px dashed rgba(2,6,23,0.08); }

      /* 3-line clamp */
      .truncate-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .truncate-3.no-clamp {
        display: block;
        -webkit-line-clamp: unset !important;
        -webkit-box-orient: unset !important;
        overflow: visible !important;
      }

      .btn-chip { border-radius: 999px; padding:.42rem .8rem; font-weight: 700; }
      .btn-link-mini{
        border: none; background: transparent; padding: 0; margin-top: .4rem;
        font-size: var(--txt-12-14); color: var(--brand-1); font-weight: 800;
        text-decoration: none;
      }
      .btn-link-mini:hover{ text-decoration: underline; color: var(--brand-3); }

      /* Smaller floating add button (always compact) */
      .fab-add { position: fixed; right: 14px; bottom: 14px; z-index: 2200; border-radius: 999px; width: 44px; height: 44px; display:grid; place-items:center; box-shadow: 0 10px 20px rgba(0,0,0,0.14); font-size: 20px; font-weight: 800; line-height: 1; }
      @media (min-width: 768px) {
        .fab-add { right: 18px; bottom: 18px; width: 44px; height: 44px; font-size: 20px; }
      }

      @media (max-width: 380px){
        .row.g-3 { --bs-gutter-x: .6rem; --bs-gutter-y: .6rem; }
      }

      .form-label { font-weight: 700; color: #334155; }
      .form-control, .form-select { font-size: var(--txt-12-14); padding: .55rem .75rem; border-radius: 12px; }

      .btn { font-weight: 800; }
      .btn-lg { font-size: var(--txt-13-15); }

      @keyframes fadeIn{from{opacity:0} to{opacity:1}}
      @keyframes scaleIn{from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1)}
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
      const res = await fetch(BASE_URL);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Fetch failed");
      let data = Array.isArray(json.data) ? json.data : [];
      data.sort((a,b) => dmyToUTC(b.note_date) - dmyToUTC(a.note_date));
      setNotes(data);
    } catch (err) {
      showCenterMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchNotes(); }, []);

  // add
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
      await fetchNotes();
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      await fetchNotes();
      setPage((p) => {
        const newTotal = Math.max(0, filtered.length - 1);
        const totalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
        return Math.min(p, totalPages);
      });
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
      await fetchNotes();
      showCenterMsg("success", "Updated successfully");
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Client-side filter: month + title search ----------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      const datePretty = toPrettyDate(n.note_date);
      const p = parseDMY(datePretty);
      const monthOk = monthFilter === "All" ? true : p?.monthShort === monthFilter;
      const titleOk = q ? n.title?.toLowerCase().includes(q) : true;
      return monthOk && titleOk;
    });
  }, [notes, search, monthFilter]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  // Reset to page 1 if month/search changes
  useEffect(() => { setPage(1); }, [search, monthFilter]);

  // Tabs (scroll to sections)
  const scrollToRef = (r) => r.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Expand helpers
  const isExpanded = (id) => expandedIds.has(id);
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ====== Need "Show more" only if 3-line clamp overflows ======
  const currentIds = pageItems.map(n => n.id);
  const { refs: detailsRefs, needMore } = useOverflowMap(currentIds, `${page}|${search}|${monthFilter}`);

  return (
    <div
      className="container-xxl py-3 py-md-4"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at -10% -10%, rgba(14,165,233,0.18), transparent 60%), radial-gradient(1200px 600px at 110% -10%, rgba(34,197,94,0.16), transparent 60%), linear-gradient(180deg, #ffffff 0%, #fcfffb 45%, #f7fbff 100%)",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        color: "#0b1221",
      }}
    >
      {/* Header */}
      <div className="glass p-3 p-md-4 mb-3 d-flex justify-content-between align-items-center flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(180deg,#0ea5e9,#22c55e)",
              display: "grid", placeItems: "center",
              color: "#05212a", fontWeight: 800, fontSize: "var(--txt-14-16)",
            }}
          >
            N
          </div>
          <div>
            <h4
              className="m-0"
              style={{
                background: "linear-gradient(90deg,#0ea5e9,#22c55e,#38bdf8)",
                WebkitBackgroundClip: "text", backgroundClip: "text",
                color: "transparent", fontSize: "var(--txt-16-20)",
                fontWeight: 900, letterSpacing: ".2px",
              }}
            >
              Notes Manager
            </h4>
            <div className="text-muted fs-11-13">Add and manage all your notes easily.</div>
          </div>
        </div>
        <div className="text-end mt-2 mt-md-0">
          <div className="text-muted fs-11-13">Total</div>
          <div className="fw-bold fs-14-16">{total}</div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="section-tabs mb-3">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <button className="nav-link active" onClick={() => scrollToRef(listRef)}>All Notes</button>
          </li>
          <li className="nav-item">
            <button className="nav-link" onClick={() => scrollToRef(addFormRef)}>Add Note</button>
          </li>
        </ul>
      </div>

      {/* 🔎 Search & Month */}
      <div className="glass p-3 mb-3 d-flex flex-wrap gap-2 align-items-end">
        <div className="flex-grow-1" style={{ minWidth: 200 }}>
          <label className="form-label mb-1 fs-12-14">Search by Title</label>
          <input
            className="form-control"
            placeholder="e.g. Buy groceries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ width: 160, minWidth: 148 }}>
          <label className="form-label mb-1 fs-12-14">Month</label>
          <select
            className="form-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="All">All</option>
            {MONTHS.map((m) => (
              <option key={m.short} value={m.short}>{m.short}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Form */}
      <div ref={addFormRef} className="glass p-3 p-md-4 mb-4">
        <h5 className="mb-3 fs-14-16">Add Note</h5>
        <div className="row g-3">
          <div className="col-md-4 col-12">
            <label className="form-label fs-12-14">Title</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Buy groceries"
            />
          </div>
          <div className="col-md-4 col-12">
            <DateSelect
              label="Date (2 Oct 2025)"
              value={form.note_date}
              onChange={(v) => setForm({ ...form, note_date: v })}
              idPrefix="add"
              required
            />
          </div>
            <div className="col-md-4 col-12">
              <label className="form-label fs-12-14">User Name (optional)</label>
              <input
                className="form-control"
                value={form.user_name}
                onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="col-12">
              <label className="form-label fs-12-14">Details</label>
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
          <button
            className="btn btn-success btn-lg px-5 py-2 w-100 w-md-auto"
            onClick={addNote}
            disabled={busy}
          >
            {busy ? "Saving..." : "Add Note"}
          </button>
        </div>
      </div>

      {/* Notes grid (paginated) */}
      <div ref={listRef} className="glass p-2 p-md-3">
        {loading ? (
          <div className="text-center py-4">
            <LoadingSpiner />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-4 text-muted fs-12-14">No notes found.</div>
        ) : (
          <div className="row g-3">
            {pageItems.map((n, idx) => {
              const datePretty = toPrettyDate(n.note_date);
              const badgeClass = getBadgeClassForDate(datePretty);
              const glow = getGlowForBadgeClass(badgeClass);
              const rowNumber = (page - 1) * PAGE_SIZE + (idx + 1);

              const details = n.details || "-";
              const expanded = isExpanded(n.id);
              const showMore = needMore[n.id] && !expanded;

              return (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={n.id}>
                  <div
                    className="note-card h-100 p-3 bg-white"
                    style={{
                      borderColor: glow.replace(/0\.22\)$/, "0.35)"),
                      boxShadow: `0 10px 24px rgba(0,0,0,.05), 0 4px 14px ${glow}`,
                    }}
                  >
                    {/* Date badge */}
                    <div className="note-badge">
                      <span className={`badge ${badgeClass}`}>
                        {datePretty || "-"}
                      </span>
                    </div>

                    {/* Meta row with subtle divider; right padding keeps space from badge */}
                    <div className="note-meta pr-badge">
                      <span className="text-muted fs-10-12">#{rowNumber}</span>
                      {n.user_name ? (
                        <span className="text-muted fs-10-12 text-truncate" title={n.user_name}>
                          {n.user_name}
                        </span>
                      ) : <span />}
                    </div>

                    <div className="pr-badge">
                      <h6
                        className="fw-bold mb-1"
                        title={n.title}
                        style={{ wordBreak: "break-word", fontSize: "var(--txt-14-16)" }}
                      >
                        {n.title}
                      </h6>

                      <div
                        ref={(el) => { if (el) detailsRefs.current[n.id] = el; }}
                        className={`text-secondary ${expanded ? "" : "truncate-3"}`}
                        title={details}
                        style={{ fontSize: "var(--txt-12-14)", lineHeight: 1.48 }}
                      >
                        {details}
                      </div>

                      {/* Show more / Show less */}
                      {showMore && (
                        <button
                          className="btn-link-mini"
                          onClick={() => toggleExpand(n.id)}
                          aria-label="Show more"
                        >
                          Show more
                        </button>
                      )}
                      {expanded && (
                        <button
                          className="btn-link-mini"
                          onClick={() => toggleExpand(n.id)}
                          aria-label="Show less"
                        >
                          Show less
                        </button>
                      )}
                    </div>

                    <div className="mt-3 d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-outline-primary btn-sm btn-chip fs-12-14"
                        onClick={() =>
                          setEditItem({
                            ...n,
                            note_date: datePretty || n.note_date,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm btn-chip fs-12-14"
                        onClick={() => deleteNote(n.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="d-flex flex-wrap align-items-center justify-content-between p-2 p-md-3 gap-2 mt-2">
            <div className="text-muted fs-12-14">
              Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{total}</b>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm fs-12-14"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </button>
              <span className="btn btn-light btn-sm disabled fs-12-14">
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm fs-12-14"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add button (compact) */}
      <button
        className="fab-add btn btn-success"
        onClick={() => scrollToRef(addFormRef)}
        aria-label="Add Note"
        title="Add Note"
      >
        +
      </button>

      {/* Edit Modal */}
      {editItem && (
        <div
          className="center-msg"
          onClick={(e) =>
            e.target.classList.contains("center-msg") && setEditItem(null)
          }
        >
          <div className="card" style={{ maxWidth: 520 }}>
            <h5 className="mb-3 fs-14-16">Edit Note</h5>
            <input
              className="form-control mb-2"
              value={editItem.title}
              onChange={(e) =>
                setEditItem({ ...editItem, title: e.target.value })
              }
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
              onChange={(e) =>
                setEditItem({ ...editItem, details: e.target.value })
              }
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
            <div className="fs-12-14 mt-2">Working…</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {overlayMsg.show && (
        <div className="center-msg">
          <div className={`card ${overlayMsg.type}`}>
            <h6 className="mb-1 fs-14-16">
              {overlayMsg.type === "error" ? "Error" : "Success"}
            </h6>
            <div className="fs-12-14">{overlayMsg.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
