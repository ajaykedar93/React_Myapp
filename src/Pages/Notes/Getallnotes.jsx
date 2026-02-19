// src/Notes/Getallnotes.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";
import Swal from "sweetalert2";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/notes";

/* ✅ Month list required for date parsing/pretty + sorting */
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
    const p = parseDMY(val);
    if (p) return `${p.day} ${p.monthShort} ${p.year}`;
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

/* ===== Badge colors ===== */
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
    // eslint-disable-next-line
  }, [ids.join("|"), depKey]);

  return { refs, needMore: map };
}

export default function Getallnotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [toast, setToast] = useState({ show: false, type: "", text: "" });
  const toastTimer = useRef(null);

  useEffect(() => {
    const id = "getallnotes-edge-to-edge-v3";
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      html, body { margin:0; padding:0; width:100%; overflow-x:hidden; }
      :root{
        --txt-11-13: clamp(11px, 2.8vw, 13px);
        --txt-12-14: clamp(12px, 3.2vw, 14px);
        --txt-14-16: clamp(14px, 3.8vw, 16px);
        --txt-16-20: clamp(16px, 4.6vw, 20px);

        --brandA:#14b8a6;
        --brandB:#22c55e;
        --brandC:#8b5cf6;

        --ink:#0b1221;
        --muted: rgba(15,23,42,.70);
      }

      /* ✅ FULL EDGE-TO-EDGE (NO OUTSIDE PADDING AT ALL) */
      .ga-root{
        width:100%;
        min-height:100dvh;
        margin:0;
        padding: 0;
        color: var(--ink);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        background:
          radial-gradient(1200px 600px at -10% -10%, rgba(20,184,166,0.18), transparent 60%),
          radial-gradient(1200px 600px at 110% -10%, rgba(34,197,94,0.16), transparent 60%),
          radial-gradient(900px 520px at 50% 120%, rgba(139,92,246,0.14), transparent 58%),
          linear-gradient(180deg, #ffffff 0%, #f7fffb 45%, #f6fbff 100%);
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 120px);
      }

      .ga-input:focus,
      .form-control:focus{
        border-color: rgba(20,184,166,.45) !important;
        box-shadow: 0 0 0 .2rem rgba(20,184,166,.16) !important;
      }

      /* ✅ Header/Search are FULL-WIDTH STRIPS */
      .ga-strip{
        width:100%;
        padding: 12px 12px;
      }

      .ga-title{
        font-size: var(--txt-16-20);
        font-weight: 1000;
        letter-spacing: .2px;
        background: linear-gradient(90deg,var(--brandA),var(--brandB),var(--brandC));
        -webkit-background-clip:text;
        background-clip:text;
        color: transparent;
        margin:0;
      }

      .ga-search input{
        border-radius: 14px;
        padding: 12px 14px;
        font-weight: 800;
      }

      /* ✅ GRID AREA (still edge-to-edge) */
      .ga-cardsWrap{
        width:100%;
        padding: 0 12px 12px; /* ✅ only inside list area, keeps cards touching edges nicely */
      }

      /* ✅ Cards grid with GAP */
      .ga-grid{
        display:grid;
        grid-template-columns: 1fr;
        gap: 14px;
      }
      @media(min-width: 576px){
        .ga-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media(min-width: 992px){
        .ga-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      @media(min-width: 1200px){
        .ga-grid{ grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }

      .ga-card{
        position: relative;
        border-radius: 18px;
        border: 1px solid rgba(2,6,23,0.10);
        background: rgba(255,255,255,0.96);
        box-shadow: 0 14px 30px rgba(0,0,0,0.06);
        overflow: hidden;
        padding: 14px;
        min-width: 0;
      }

      .ga-card::before{
        content:"";
        position:absolute;
        inset: 0 0 auto 0;
        height: 5px;
        background: linear-gradient(90deg,var(--brandA),var(--brandB),var(--brandC));
        opacity: .95;
      }

      .ga-badgeWrap{ position:absolute; top: 12px; right: 12px; z-index: 2; }
      .ga-badge{
        padding: .42rem .70rem;
        border-radius: 999px;
        font-weight: 950;
        font-size: 12px;
        border: 1px solid rgba(2,6,23,.10);
        background: rgba(255,255,255,.90);
        max-width: 100%;
        white-space: nowrap;
      }

      .np-badge-teal{ color:#0f766e; border-color: rgba(20,184,166,.30); background: rgba(20,184,166,.12); }
      .np-badge-emerald{ color:#047857; border-color: rgba(16,185,129,.30); background: rgba(16,185,129,.12); }
      .np-badge-amber{ color:#b45309; border-color: rgba(245,158,11,.30); background: rgba(245,158,11,.12); }
      .np-badge-indigo{ color:#3730a3; border-color: rgba(99,102,241,.30); background: rgba(99,102,241,.12); }
      .np-badge-rose{ color:#9f1239; border-color: rgba(244,63,94,.30); background: rgba(244,63,94,.12); }
      .np-badge-slate{ color:#334155; border-color: rgba(100,116,139,.30); background: rgba(100,116,139,.12); }
      .np-badge-violet{ color:#5b21b6; border-color: rgba(139,92,246,.30); background: rgba(139,92,246,.12); }

      .ga-meta{
        display:flex;
        align-items:center;
        justify-content: space-between;
        gap: 10px;
        padding-bottom: 10px;
        margin-bottom: 10px;
        border-bottom: 1px dashed rgba(2,6,23,0.10);
        padding-right: 92px;
        min-width: 0;
      }
      .ga-metaLeft{
        color: var(--muted);
        font-weight: 900;
        font-size: var(--txt-11-13);
        white-space: nowrap;
      }
      .ga-metaRight{
        color: var(--muted);
        font-weight: 900;
        font-size: var(--txt-11-13);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .ga-titleText{
        font-weight: 1000;
        margin: 0 0 6px 0;
        font-size: var(--txt-14-16);
        word-break: break-word;
      }

      .ga-details{
        color: rgba(15,23,42,.72);
        font-size: var(--txt-12-14);
        line-height: 1.55;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

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

      .ga-linkMini{
        border:none;
        background: transparent;
        padding: 0;
        margin-top: 8px;
        font-weight: 1000;
        color: var(--brandA);
        font-size: var(--txt-12-14);
      }

      .ga-actions{
        display:flex;
        justify-content:flex-end;
        margin-top: 12px;
      }

      .ga-btnDanger{
        border: 1px solid rgba(244,63,94,.30) !important;
        border-radius: 14px !important;
        font-weight: 950 !important;
        color: #9f1239 !important;
        background: rgba(244,63,94,.08) !important;
        padding: 10px 14px !important;
        width: 100%;
      }
      @media(min-width: 576px){
        .ga-btnDanger{ width: auto; }
      }
      .ga-btnDanger:hover{ background: rgba(244,63,94,.14) !important; }

      .ga-overlay{
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        z-index: 2400;
        background: rgba(2,6,23,0.35);
        padding: 14px;
      }
      .ga-overlayCard{
        width: min(520px, 92vw);
        background: #fff;
        border-radius: 18px;
        border: 1px solid rgba(2,6,23,.10);
        box-shadow: 0 20px 60px rgba(0,0,0,.20);
        padding: 16px;
      }
      .ga-overlayCard.success{ border-left: 6px solid #22c55e; }
      .ga-overlayCard.error{ border-left: 6px solid #ef4444; }
    `;
    document.head.appendChild(s);
  }, []);

  const showMsg = (type, text, ms = 1600) => {
    setToast({ show: true, type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ show: false, type: "", text: "" }), ms);
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
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const d = (n.details || "").toLowerCase();
      const u = (n.user_name || "").toLowerCase();
      return t.includes(q) || d.includes(q) || u.includes(q);
    });
  }, [notes, search]);

  const isExpanded = (id) => expandedIds.has(id);
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentIds = filtered.map((n) => n.id);
  const { refs: detailsRefs, needMore } = useOverflowMap(currentIds, `${search}|${filtered.length}`);

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

      showMsg("success", "Note deleted");
      await fetchNotes();
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ga-root">
      {/* ✅ FULL-WIDTH Title strip */}
      <div className="ga-strip">
        <h4 className="ga-title">Notes List</h4>
      </div>

      {/* ✅ FULL-WIDTH Search strip */}
      <div className="ga-strip ga-search">
        <input
          className="form-control ga-input"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ✅ Cards area (edge-to-edge + responsive) */}
      {loading ? (
        <div className="text-center py-4">
          <LoadingSpiner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-4 text-muted fs-12-14">No notes found.</div>
      ) : (
        <div className="ga-cardsWrap">
          <div className="ga-grid">
            {filtered.map((n) => {
              const datePretty = toPrettyDate(n.note_date);
              const badgeClass = getBadgeClassForDate(datePretty);
              const glow = getGlowForBadgeClass(badgeClass);

              const details = n.details || "-";
              const expanded = isExpanded(n.id);
              const showMore = needMore[n.id] && !expanded;

              return (
                <div
                  className="ga-card"
                  key={n.id}
                  style={{
                    borderColor: glow.replace(/0\.22\)$/, "0.38)"),
                    boxShadow: `0 14px 30px rgba(0,0,0,.06), 0 8px 22px ${glow}`,
                  }}
                >
                  <div className="ga-badgeWrap">
                    <span className={`ga-badge ${badgeClass}`}>{datePretty || "-"}</span>
                  </div>

                  <div className="ga-meta">
                    <div className="ga-metaLeft">#{n.id}</div>
                    <div className="ga-metaRight" title={n.user_name || ""}>
                      {n.user_name || ""}
                    </div>
                  </div>

                  <h6 className="ga-titleText" title={n.title || ""}>
                    {n.title || "-"}
                  </h6>

                  <div
                    ref={(el) => {
                      if (el) detailsRefs.current[n.id] = el;
                    }}
                    className={`ga-details ${expanded ? "" : "truncate-3"}`}
                    title={details}
                  >
                    {details}
                  </div>

                  {showMore && (
                    <button className="ga-linkMini" onClick={() => toggleExpand(n.id)} type="button">
                      Show more
                    </button>
                  )}
                  {expanded && (
                    <button className="ga-linkMini" onClick={() => toggleExpand(n.id)} type="button">
                      Show less
                    </button>
                  )}

                  <div className="ga-actions">
                    <button className="btn ga-btnDanger" onClick={() => deleteNote(n.id)} type="button" disabled={busy}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="ga-overlay" style={{ background: "rgba(255,255,255,0.78)" }}>
          <div className="ga-overlayCard" style={{ width: "min(420px, 92vw)" }}>
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
      {toast.show && (
        <div className="ga-overlay">
          <div className={`ga-overlayCard ${toast.type}`}>
            <h6 className="mb-1 fs-14-16" style={{ fontWeight: 950 }}>
              {toast.type === "error" ? "Error" : "Success"}
            </h6>
            <div className="fs-12-14" style={{ fontWeight: 800, color: "rgba(15,23,42,.78)" }}>
              {toast.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
