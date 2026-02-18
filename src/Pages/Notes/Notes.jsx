import React, { useEffect, useState, useRef, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Swal from "sweetalert2";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/notes";

/* ====== Date helpers (pretty: "2 Oct 2025") ====== */
const MONTHS = [
  { short: "Jan", num: 1 },
  { short: "Feb", num: 2 },
  { short: "Mar", num: 3 },
  { short: "Apr", num: 4 },
  { short: "May", num: 5 },
  { short: "Jun", num: 6 },
  { short: "Jul", num: 7 },
  { short: "Aug", num: 8 },
  { short: "Sep", num: 9 },
  { short: "Oct", num: 10 },
  { short: "Nov", num: 11 },
  { short: "Dec", num: 12 },
];

function daysInMonth(m, y) {
  return new Date(y, m, 0).getDate();
}
function toDMY(day, monthShort, year) {
  return `${Number(day)} ${monthShort} ${Number(year)}`;
}

function parseDMY(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [dStr, mStr, yStr] = parts;
  const day = Number(dStr);
  const year = Number(yStr);
  if (!day || !year || !MONTHS.find((m) => m.short === mStr)) return null;
  return { day, monthShort: mStr, year };
}

function normalizeDMY(str) {
  const p = parseDMY(String(str || "").trim());
  if (!p) return "";
  return toDMY(p.day, p.monthShort, p.year);
}

function toPrettyDate(val) {
  if (!val) return "";
  if (typeof val === "string") {
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = +m[1],
        mo = +m[2],
        d = +m[3];
      const monthShort = MONTHS[mo - 1]?.short || "Jan";
      return `${d} ${monthShort} ${y}`;
    }
    const already = normalizeDMY(val);
    if (already) return already;
  }
  const d = new Date(val);
  if (!isNaN(d)) {
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const da = d.getUTCDate();
    const monthShort = MONTHS[mo]?.short || "Jan";
    return `${da} ${monthShort} ${y}`;
  }
  return String(val);
}

function dmyToUTC(dmy) {
  const p = parseDMY(toPrettyDate(dmy));
  if (!p) return new Date(0);
  const mo = MONTHS.find((m) => m.short === p.monthShort)?.num || 1;
  return new Date(Date.UTC(p.year, mo - 1, p.day));
}

/* ===== Badge color helpers (NO default bootstrap blue look) ===== */
const BADGE_CLASSES = [
  "np-badge-teal",
  "np-badge-emerald",
  "np-badge-amber",
  "np-badge-indigo",
  "np-badge-rose",
  "np-badge-slate",
  "np-badge-violet",
];

const BADGE_GLOW = {
  "np-badge-teal": "rgba(20,184,166,0.22)",
  "np-badge-emerald": "rgba(16,185,129,0.22)",
  "np-badge-amber": "rgba(245,158,11,0.22)",
  "np-badge-indigo": "rgba(99,102,241,0.22)",
  "np-badge-rose": "rgba(244,63,94,0.22)",
  "np-badge-slate": "rgba(100,116,139,0.22)",
  "np-badge-violet": "rgba(139,92,246,0.22)",
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
      return (
        parseDMY(pretty) || {
          day: today.getUTCDate(),
          monthShort: MONTHS[today.getUTCMonth()].short,
          year: today.getUTCFullYear(),
        }
      );
    })();

  const [day, setDay] = useState(initialParsed.day);
  const [monthShort, setMonthShort] = useState(initialParsed.monthShort);
  const [year, setYear] = useState(initialParsed.year);

  useEffect(() => {
    const pretty = toPrettyDate(value);
    const p = parseDMY(pretty);
    if (p) {
      setDay(p.day);
      setMonthShort(p.monthShort);
      setYear(p.year);
    }
  }, [value]);

  const totalDays = daysInMonth(MONTHS.find((m) => m.short === monthShort)?.num || 1, year);

  useEffect(() => {
    if (day > totalDays) setDay(totalDays);
    // eslint-disable-next-line
  }, [monthShort, year]);

  useEffect(() => {
    onChange && onChange(toDMY(day, monthShort, year));
    // eslint-disable-next-line
  }, [day, monthShort, year]);

  const dayOptions = Array.from({ length: totalDays }, (_, i) => i + 1);
  const currentYear = today.getUTCFullYear();
  const years = Array.from({ length: 61 }, (_, i) => currentYear - 50 + i);

  return (
    <div className="w-100">
      {label && <label className="form-label fs-12-14">{label}</label>}
      <div className="d-flex gap-2 flex-wrap">
        <select
          id={`${idPrefix}-day`}
          className="form-select fs-12-14 np-input"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          required={required}
          style={{ maxWidth: 110 }}
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          id={`${idPrefix}-month`}
          className="form-select fs-12-14 np-input"
          value={monthShort}
          onChange={(e) => setMonthShort(e.target.value)}
          required={required}
          style={{ maxWidth: 140 }}
        >
          {MONTHS.map((m) => (
            <option key={m.short} value={m.short}>
              {m.short}
            </option>
          ))}
        </select>

        <select
          id={`${idPrefix}-year`}
          className="form-select fs-12-14 np-input"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          required={required}
          style={{ maxWidth: 130 }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="form-text mt-1 fs-11-13">
        Format: <strong>{toDMY(day, monthShort, year)}</strong>
      </div>
    </div>
  );
}

/* ====== Hook: detect if a block overflows 3 lines ====== */
function useOverflowMap(ids, depKey) {
  const refs = useRef({});
  const [map, setMap] = useState({});

  useEffect(() => {
    const calc = () => {
      const next = {};
      ids.forEach((id) => {
        const el = refs.current[id];
        if (!el) {
          next[id] = false;
          return;
        }

        el.classList.add("no-clamp");
        const full = el.scrollHeight;
        el.classList.remove("no-clamp");

        const clamp = el.clientHeight;
        next[id] = full > clamp + 2;
      });
      setMap(next);
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [ids.join("|"), depKey]);

  return { refs, needMore: map };
}

export default function NotesProfessional() {
  const [form, setForm] = useState({
    title: "",
    note_date: "",
    details: "",
    user_name: "",
    user_email: "",
  });

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("All");
  const [editItem, setEditItem] = useState(null);

  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const toastTimerRef = useRef(null);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  const addFormRef = useRef(null);
  const listRef = useRef(null);

  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // ✅ Edge-to-edge + professional theme CSS (no bootstrap blue)
  // ✅ MOBILE: no outer padding at all + no gutters in cards grid
  useEffect(() => {
    const id = "notes-pro-style-edge-pro";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      html, body { margin:0; padding:0; width:100%; overflow-x:hidden; }
      .np-root{ width:100%; min-height:100vh; padding:0; margin:0; }

      :root{
        --txt-10-12: clamp(10px, 2.7vw, 12px);
        --txt-11-13: clamp(11px, 2.8vw, 13px);
        --txt-12-14: clamp(12px, 3.2vw, 14px);
        --txt-14-16: clamp(14px, 3.8vw, 16px);
        --txt-16-20: clamp(16px, 4.6vw, 20px);

        /* Pro palette (teal/emerald/violet) */
        --brandA:#14b8a6;
        --brandB:#22c55e;
        --brandC:#8b5cf6;

        --ink:#0b1221;
        --muted: rgba(15,23,42,.70);

        /* ✅ ZERO outside/inside padding (edge-to-edge) */
        --gutter: 0px;
      }

      .np-inner{ width:100%; padding: var(--gutter); }

      .fs-11-13, .fs-11-13 * { font-size: var(--txt-11-13); }
      .fs-12-14, .fs-12-14 * { font-size: var(--txt-12-14); }
      .fs-14-16 { font-size: var(--txt-14-16); }

      /* Replace default bootstrap focus blue glow */
      .np-input:focus,
      .form-control:focus,
      .form-select:focus{
        border-color: rgba(20,184,166,.45) !important;
        box-shadow: 0 0 0 .2rem rgba(20,184,166,.16) !important;
      }

      .np-glass{
        backdrop-filter: blur(12px);
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(2,6,23,0.08);
        border-radius: 18px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.07);
      }

      .np-title{
        background: linear-gradient(90deg,var(--brandA),var(--brandB),var(--brandC));
        -webkit-background-clip:text;
        background-clip:text;
        color: transparent;
        font-weight: 950;
        letter-spacing: .2px;
      }

      .np-tabs{
        background: linear-gradient(180deg,#fff,#f8fbff);
        border: 1px solid rgba(2,6,23,0.06);
        border-radius: 16px;
        padding: 6px;
      }
      .np-tabs .nav-link{
        border-radius: 999px;
        font-weight: 900;
        color: var(--ink);
        padding: .5rem 1rem;
      }
      .np-tabs .nav-link.active{
        background: linear-gradient(90deg,var(--brandA),var(--brandB));
        color: white;
        box-shadow: 0 10px 22px rgba(20,184,166,.22);
      }

      .np-btnGrad{
        border: 0;
        color: white !important;
        font-weight: 950;
        border-radius: 14px;
        background: linear-gradient(90deg,var(--brandA),var(--brandB));
        box-shadow: 0 14px 26px rgba(2,6,23,.12);
      }

      .np-btnSoft{
        border: 1px solid rgba(2,6,23,.10) !important;
        border-radius: 14px !important;
        font-weight: 900 !important;
        color: var(--ink) !important;
        background: rgba(255,255,255,.92) !important;
      }
      .np-btnDanger{
        border: 1px solid rgba(244,63,94,.26) !important;
        border-radius: 14px !important;
        font-weight: 900 !important;
        color: rgba(190,18,60,1) !important;
        background: rgba(244,63,94,.08) !important;
      }

      .np-card{
        position: relative;
        border-radius: 18px;
        border: 1px solid rgba(2,6,23,0.08);
        background: rgba(255,255,255,.98);
        transition: transform .16s ease, box-shadow .20s ease;
        overflow: hidden;
      }
      .np-card::before{
        content:"";
        position:absolute;
        inset: 0 0 auto 0;
        height: 5px;
        background: linear-gradient(90deg,var(--brandA),var(--brandB),var(--brandC));
        opacity: .92;
      }

      .np-badgeWrap{ position:absolute; top: 12px; right: 12px; z-index: 2; }
      .np-badge{
        padding: .42rem .70rem;
        border-radius: 999px;
        font-weight: 900;
        font-size: var(--txt-10-12);
        border: 1px solid rgba(2,6,23,.10);
        background: rgba(255,255,255,.86);
      }

      /* Date badge themes */
      .np-badge-teal{ color:#0f766e; border-color: rgba(20,184,166,.30); background: rgba(20,184,166,.12); }
      .np-badge-emerald{ color:#047857; border-color: rgba(16,185,129,.30); background: rgba(16,185,129,.12); }
      .np-badge-amber{ color:#b45309; border-color: rgba(245,158,11,.30); background: rgba(245,158,11,.12); }
      .np-badge-indigo{ color:#3730a3; border-color: rgba(99,102,241,.30); background: rgba(99,102,241,.12); }
      .np-badge-rose{ color:#9f1239; border-color: rgba(244,63,94,.30); background: rgba(244,63,94,.12); }
      .np-badge-slate{ color:#334155; border-color: rgba(100,116,139,.30); background: rgba(100,116,139,.12); }
      .np-badge-violet{ color:#5b21b6; border-color: rgba(139,92,246,.30); background: rgba(139,92,246,.12); }

      .np-meta{
        display:flex;
        align-items:center;
        justify-content: space-between;
        gap: .6rem;
        padding-bottom: .45rem;
        margin-bottom: .55rem;
        border-bottom: 1px dashed rgba(2,6,23,0.10);
      }
      .np-prBadge{ padding-right: 90px; }

      .truncate-3{
        display:-webkit-box;
        -webkit-line-clamp:3;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }
      .truncate-3.no-clamp{
        display:block;
        -webkit-line-clamp: unset !important;
        -webkit-box-orient: unset !important;
        overflow: visible !important;
      }
      .np-linkMini{
        border:none;
        background: transparent;
        padding: 0;
        margin-top: .45rem;
        font-weight: 950;
        color: var(--brandA);
        font-size: var(--txt-12-14);
      }

      .np-chipBtn{
        border-radius: 999px;
        padding: .44rem .86rem;
        font-weight: 900;
      }

      /* Replace btn-outline-primary look (no bootstrap blue) */
      .np-chipEdit{
        border: 1px solid rgba(20,184,166,.35) !important;
        color: #0f766e !important;
        background: rgba(20,184,166,.08) !important;
      }
      .np-chipEdit:hover{ background: rgba(20,184,166,.14) !important; }

      .np-chipDelete{
        border: 1px solid rgba(244,63,94,.30) !important;
        color: #9f1239 !important;
        background: rgba(244,63,94,.08) !important;
      }
      .np-chipDelete:hover{ background: rgba(244,63,94,.14) !important; }

      .np-fab{
        position: fixed;
        right: 14px;
        bottom: 14px;
        width: 48px;
        height: 48px;
        border-radius: 999px;
        display:grid;
        place-items:center;
        z-index: 2200;
        font-size: 22px;
        font-weight: 950;
        box-shadow: 0 16px 34px rgba(0,0,0,.16);
      }

      .np-overlay{
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        z-index: 2400;
        background: rgba(2,6,23,0.35);
        padding: 14px;
      }
      .np-overlayCard{
        width: min(540px, 92vw);
        background: #fff;
        border-radius: 18px;
        border: 1px solid rgba(2,6,23,.10);
        box-shadow: 0 20px 60px rgba(0,0,0,.20);
        padding: 16px;
      }
      .np-overlayCard.success{ border-left: 6px solid #22c55e; }
      .np-overlayCard.error{ border-left: 6px solid #ef4444; }

      .form-label{ font-weight: 900; color: rgba(15,23,42,.78); }
      .form-control, .form-select{
        border-radius: 14px;
        border: 1px solid rgba(2,6,23,.12);
        padding: .58rem .80rem;
        font-size: var(--txt-12-14);
      }

      /* Make layout edge-to-edge but keep nice spacing INSIDE cards */
      .np-edgeBlock{ margin: 0; border-radius: 0; border-left: 0; border-right: 0; }
      .np-edgeGap{ padding: clamp(10px, 3.2vw, 16px); }

      /* ✅ KILL bootstrap gutters when we want true edge-to-edge grid */
      .np-gridEdge.row,
      .np-gridEdge .row{
        --bs-gutter-x: 0 !important;
        --bs-gutter-y: 0 !important;
      }
      .np-gridEdge > [class*="col-"]{
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      @media (max-width: 575px){
        /* ✅ MOBILE: no outside padding anywhere */
        .np-edgeGap{ padding: 0 !important; }
        .np-fab{ right: 12px; bottom: 12px; }

        /* Optional: make cards flush like full-width strips on mobile */
        .np-card{
          border-radius: 0 !important;
          border-left: 0 !important;
          border-right: 0 !important;
        }
      }
    `;
    document.head.appendChild(s);
  }, []);

  const showCenterMsg = (type, text, ms = 1600) => {
    setOverlayMsg({ show: true, type, text });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setOverlayMsg({ show: false, type: "", text: "" }),
      ms
    );
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE_URL);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Fetch failed");

      const data = Array.isArray(json.data) ? json.data : [];
      data.sort((a, b) => {
        const d = dmyToUTC(b.note_date) - dmyToUTC(a.note_date);
        if (d !== 0) return d;
        return (b.id || 0) - (a.id || 0);
      });

      setNotes(data);
    } catch (err) {
      showCenterMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const addNote = async () => {
    if (!form.title.trim()) return showCenterMsg("error", "Title is required.");
    if (!form.note_date) return showCenterMsg("error", "Please select a date.");

    const normalized = normalizeDMY(form.note_date);
    if (!normalized) return showCenterMsg("error", "Invalid date format.");

    const payload = {
      title: form.title.trim(),
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

      setForm((f) => ({ ...f, title: "", details: "", user_name: "", user_email: "" }));
      showCenterMsg("success", "Note added successfully");
      await fetchNotes();
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async (id) => {
    const res = await Swal.fire({
      title: "Delete this note?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#14b8a6",
      cancelButtonColor: "#f43f5e",
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

  const updateNote = async () => {
    if (!editItem) return;
    if (!String(editItem.title || "").trim()) return showCenterMsg("error", "Title is required.");

    const normalized = normalizeDMY(editItem.note_date);
    if (!normalized) return showCenterMsg("error", "Invalid date format.");

    const payload = {
      title: String(editItem.title || "").trim(),
      note_date: normalized,
      details: editItem.details || "",
      user_name: editItem.user_name || "",
      user_email: editItem.user_email || "",
    };

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      const datePretty = toPrettyDate(n.note_date);
      const p = parseDMY(datePretty);
      const monthOk = monthFilter === "All" ? true : p?.monthShort === monthFilter;
      const titleOk = q ? (n.title || "").toLowerCase().includes(q) : true;
      return monthOk && titleOk;
    });
  }, [notes, search, monthFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    setPage(1);
  }, [search, monthFilter]);

  const isExpanded = (id) => expandedIds.has(id);
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentIds = pageItems.map((n) => n.id);
  const { refs: detailsRefs, needMore } = useOverflowMap(currentIds, `${page}|${search}|${monthFilter}`);

  const scrollToRef = (r) => r.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div
      className="np-root"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at -10% -10%, rgba(20,184,166,0.18), transparent 60%), radial-gradient(1200px 600px at 110% -10%, rgba(34,197,94,0.16), transparent 60%), radial-gradient(900px 520px at 50% 120%, rgba(139,92,246,0.14), transparent 58%), linear-gradient(180deg, #ffffff 0%, #f7fffb 45%, #f6fbff 100%)",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        color: "#0b1221",
      }}
    >
      <div className="np-inner">
        {/* Header (edge-to-edge) */}
        <div className="np-glass np-edgeBlock np-edgeGap mb-2 d-flex justify-content-between align-items-center flex-wrap">
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "linear-gradient(180deg,#14b8a6,#22c55e,#8b5cf6)",
                display: "grid",
                placeItems: "center",
                color: "#05212a",
                fontWeight: 950,
                fontSize: "var(--txt-14-16)",
                boxShadow: "0 14px 26px rgba(2,6,23,.10)",
              }}
            >
              N
            </div>
            <div>
              <h4 className="m-0 np-title" style={{ fontSize: "var(--txt-16-20)" }}>
                Notes Manager
              </h4>
              <div className="text-muted fs-11-13">Add unlimited notes (same date allowed) • Professional UI</div>
            </div>
          </div>

          <div className="text-end mt-2 mt-md-0">
            <div className="text-muted fs-11-13">Total</div>
            <div className="fw-bold fs-14-16">{total}</div>
          </div>
        </div>

        {/* Tabs (edge-to-edge) */}
        <div className="np-tabs np-edgeBlock np-edgeGap mb-2">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button className="nav-link active" onClick={() => scrollToRef(listRef)} type="button">
                All Notes
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link" onClick={() => scrollToRef(addFormRef)} type="button">
                Add Note
              </button>
            </li>
          </ul>
        </div>

        {/* Search + Month (edge-to-edge) */}
        <div className="np-glass np-edgeBlock np-edgeGap mb-2 d-flex flex-wrap gap-2 align-items-end">
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <label className="form-label mb-1 fs-12-14">Search by Title</label>
            <input
              className="form-control np-input"
              placeholder="e.g. Buy groceries"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: 170, minWidth: 160 }}>
            <label className="form-label mb-1 fs-12-14">Month</label>
            <select className="form-select np-input" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="All">All</option>
              {MONTHS.map((m) => (
                <option key={m.short} value={m.short}>
                  {m.short}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Form (edge-to-edge) */}
        <div ref={addFormRef} className="np-glass np-edgeBlock np-edgeGap mb-2">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 className="mb-0 fs-14-16" style={{ fontWeight: 950 }}>
              Add Note
            </h5>
            <span className="text-muted fs-11-13">
              Date format: <b>2 Oct 2025</b>
            </span>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-4 col-12">
              <label className="form-label fs-12-14">Title</label>
              <input
                className="form-control np-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Buy groceries"
              />
            </div>

            <div className="col-md-4 col-12">
              <DateSelect
                label="Date"
                value={form.note_date}
                onChange={(v) => setForm({ ...form, note_date: v })}
                idPrefix="add"
                required
              />
            </div>

            <div className="col-md-4 col-12">
              <label className="form-label fs-12-14">User Name (optional)</label>
              <input
                className="form-control np-input"
                value={form.user_name}
                onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="col-12">
              <label className="form-label fs-12-14">Details</label>
              <textarea
                className="form-control np-input"
                rows="2"
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder="Write details…"
              />
            </div>
          </div>

          <div className="mt-3 d-flex gap-2 flex-wrap">
            <button className="btn np-btnGrad btn-lg px-5 py-2 w-100 w-md-auto" onClick={addNote} disabled={busy} type="button">
              {busy ? "Saving…" : "Add Note"}
            </button>

            <button
              className="btn np-btnSoft btn-lg px-4 py-2 w-100 w-md-auto"
              onClick={() => setForm((f) => ({ ...f, title: "", details: "", user_name: "", user_email: "" }))}
              disabled={busy}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Notes List (edge-to-edge) */}
        <div ref={listRef} className="np-glass np-edgeBlock np-edgeGap">
          {loading ? (
            <div className="text-center py-4">
              <LoadingSpiner />
            </div>
          ) : pageItems.length === 0 ? (
            <div className="text-center py-4 text-muted fs-12-14">No notes found.</div>
          ) : (
            // ✅ TRUE EDGE-TO-EDGE GRID: no gutters, no outer padding on mobile
            <div className="row g-0 np-gridEdge">
              {pageItems.map((n, idx) => {
                const datePretty = toPrettyDate(n.note_date);
                const badgeClass = getBadgeClassForDate(datePretty);
                const glow = getGlowForBadgeClass(badgeClass);
                const rowNumber = (page - 1) * PAGE_SIZE + (idx + 1);

                const details = n.details || "-";
                const expanded = isExpanded(n.id);
                const showMore = needMore[n.id] && !expanded;

                return (
                  <div className="col-12 col-sm-6 col-lg-4 col-xl-3 p-0" key={n.id}>
                    <div
                      className="np-card h-100 p-3"
                      style={{
                        borderColor: glow.replace(/0\.22\)$/, "0.38)"),
                        boxShadow: `0 12px 30px rgba(0,0,0,.06), 0 6px 20px ${glow}`,
                      }}
                    >
                      <div className="np-badgeWrap">
                        <span className={`np-badge ${badgeClass}`}>{datePretty || "-"}</span>
                      </div>

                      <div className="np-meta np-prBadge">
                        <span className="text-muted fs-11-13">#{rowNumber}</span>
                        {n.user_name ? (
                          <span className="text-muted fs-11-13 text-truncate" title={n.user_name}>
                            {n.user_name}
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>

                      <div className="np-prBadge">
                        <h6 className="fw-bold mb-1" title={n.title} style={{ wordBreak: "break-word", fontWeight: 950 }}>
                          {n.title}
                        </h6>

                        <div
                          ref={(el) => {
                            if (el) detailsRefs.current[n.id] = el;
                          }}
                          className={`text-secondary ${expanded ? "" : "truncate-3"}`}
                          title={details}
                          style={{ fontSize: "var(--txt-12-14)", lineHeight: 1.52 }}
                        >
                          {details}
                        </div>

                        {showMore && (
                          <button className="np-linkMini" onClick={() => toggleExpand(n.id)} type="button">
                            Show more
                          </button>
                        )}
                        {expanded && (
                          <button className="np-linkMini" onClick={() => toggleExpand(n.id)} type="button">
                            Show less
                          </button>
                        )}
                      </div>

                      <div className="mt-3 d-flex justify-content-end gap-2 flex-wrap">
                        <button
                          className="btn btn-sm np-chipBtn np-chipEdit fs-12-14"
                          onClick={() => setEditItem({ ...n, note_date: datePretty || n.note_date })}
                          type="button"
                        >
                          Edit
                        </button>
                        <button className="btn btn-sm np-chipBtn np-chipDelete fs-12-14" onClick={() => deleteNote(n.id)} type="button">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && total > 0 && (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
              <div className="text-muted fs-12-14">
                Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{total}</b>
              </div>

              <div className="btn-group">
                <button
                  className="btn btn-sm np-btnSoft fs-12-14"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  ‹ Prev
                </button>
                <span className="btn btn-light btn-sm disabled fs-12-14">
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-sm np-btnSoft fs-12-14"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Add */}
        <button className="np-fab btn np-btnGrad" onClick={() => scrollToRef(addFormRef)} type="button" aria-label="Add Note">
          +
        </button>

        {/* Edit Modal */}
        {editItem && (
          <div className="np-overlay" onClick={(e) => e.target.classList.contains("np-overlay") && setEditItem(null)}>
            <div className="np-overlayCard">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="mb-0 fs-14-16" style={{ fontWeight: 950 }}>
                  Edit Note
                </h5>
                <button className="btn np-btnSoft btn-sm" onClick={() => setEditItem(null)} type="button">
                  ✕
                </button>
              </div>

              <label className="form-label fs-12-14">Title</label>
              <input
                className="form-control np-input mb-2"
                value={editItem.title || ""}
                onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
              />

              <div className="mb-2">
                <DateSelect
                  label="Date"
                  value={editItem.note_date}
                  onChange={(v) => setEditItem({ ...editItem, note_date: v })}
                  idPrefix="edit"
                  required
                />
              </div>

              <label className="form-label fs-12-14">Details</label>
              <textarea
                className="form-control np-input mb-3"
                rows="3"
                value={editItem.details || ""}
                onChange={(e) => setEditItem({ ...editItem, details: e.target.value })}
              />

              <div className="d-flex justify-content-end gap-2 flex-wrap">
                <button className="btn np-btnSoft" onClick={() => setEditItem(null)} type="button">
                  Cancel
                </button>
                <button className="btn np-btnGrad px-4" onClick={updateNote} type="button" disabled={busy}>
                  {busy ? "Updating…" : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Busy Overlay */}
        {busy && (
          <div className="np-overlay" style={{ background: "rgba(255,255,255,0.78)" }}>
            <div className="np-overlayCard" style={{ width: "min(420px, 92vw)" }}>
              <div className="d-flex flex-column align-items-center">
                <LoadingSpiner />
                <div className="fs-12-14 mt-2" style={{ fontWeight: 900, color: "rgba(15,23,42,.75)" }}>
                  Working…
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {overlayMsg.show && (
          <div className="np-overlay">
            <div className={`np-overlayCard ${overlayMsg.type}`}>
              <h6 className="mb-1 fs-14-16" style={{ fontWeight: 950 }}>
                {overlayMsg.type === "error" ? "Error" : "Success"}
              </h6>
              <div className="fs-12-14" style={{ fontWeight: 800, color: "rgba(15,23,42,.78)" }}>
                {overlayMsg.text}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
