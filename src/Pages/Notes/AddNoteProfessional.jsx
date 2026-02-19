import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";

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

/* == Date selector that reads/writes "2 Oct 2025" == */
function DateSelect({ value, onChange, label, idPrefix = "ds", required = false }) {
  const today = new Date();
  const initialParsed =
    parseDMY(value) || {
      day: today.getUTCDate(),
      monthShort: MONTHS[today.getUTCMonth()].short,
      year: today.getUTCFullYear(),
    };

  const [day, setDay] = useState(initialParsed.day);
  const [monthShort, setMonthShort] = useState(initialParsed.monthShort);
  const [year, setYear] = useState(initialParsed.year);

  useEffect(() => {
    const p = parseDMY(value);
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

export default function AddNoteProfessional() {
  const [form, setForm] = useState({
    title: "",
    note_date: "",
    details: "",
    user_name: "",
    user_email: "",
  });

  const [busy, setBusy] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const id = "add-note-pro-style-v1";
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      html, body { margin:0; padding:0; width:100%; overflow-x:hidden; }
      :root{
        --txt-10-12: clamp(10px, 2.7vw, 12px);
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

      .np-page{
        width:100%;
        min-height:100dvh;
        padding: 0;
        margin: 0;
        background:
          radial-gradient(1200px 600px at -10% -10%, rgba(20,184,166,0.18), transparent 60%),
          radial-gradient(1200px 600px at 110% -10%, rgba(34,197,94,0.16), transparent 60%),
          radial-gradient(900px 520px at 50% 120%, rgba(139,92,246,0.14), transparent 58%),
          linear-gradient(180deg, #ffffff 0%, #f7fffb 45%, #f6fbff 100%);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color: var(--ink);
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 110px);
      }

      .fs-11-13, .fs-11-13 * { font-size: var(--txt-11-13); }
      .fs-12-14, .fs-12-14 * { font-size: var(--txt-12-14); }
      .fs-14-16 { font-size: var(--txt-14-16); }

      .np-input:focus,
      .form-control:focus,
      .form-select:focus{
        border-color: rgba(20,184,166,.45) !important;
        box-shadow: 0 0 0 .2rem rgba(20,184,166,.16) !important;
      }

      /* Edge-to-edge blocks */
      .np-block{
        width: 100%;
        margin: 0;
        border-radius: 0;
        border-left: 0;
        border-right: 0;
        border: 1px solid rgba(2,6,23,0.08);
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(12px);
        box-shadow: 0 14px 40px rgba(0,0,0,0.07);
        padding: clamp(12px, 3.2vw, 16px);
      }

      .np-title{
        background: linear-gradient(90deg,var(--brandA),var(--brandB),var(--brandC));
        -webkit-background-clip:text;
        background-clip:text;
        color: transparent;
        font-weight: 950;
        letter-spacing: .2px;
        margin: 0;
        font-size: var(--txt-16-20);
        line-height: 1.1;
      }

      .np-sub{
        margin-top: 6px;
        color: var(--muted);
        font-weight: 800;
        font-size: var(--txt-12-14);
      }

      .form-label{ font-weight: 900; color: rgba(15,23,42,.78); }
      .form-control, .form-select{
        border-radius: 14px;
        border: 1px solid rgba(2,6,23,.12);
        padding: .58rem .80rem;
        font-size: var(--txt-12-14);
      }

      .np-btnGrad{
        border: 0;
        color: white !important;
        font-weight: 950;
        border-radius: 14px;
        background: linear-gradient(90deg,var(--brandA),var(--brandB),var(--brandC));
        box-shadow: 0 14px 26px rgba(2,6,23,.12);
        padding: 12px 16px;
        width: 100%;
      }
      .np-btnSoft{
        border: 1px solid rgba(2,6,23,.10) !important;
        border-radius: 14px !important;
        font-weight: 900 !important;
        color: var(--ink) !important;
        background: rgba(255,255,255,.92) !important;
        padding: 12px 16px;
        width: 100%;
      }

      @media(min-width: 576px){
        .np-btnGrad, .np-btnSoft{ width: auto; }
        .np-wrap{
          max-width: 1100px;
          margin: 0 auto;
        }
        .np-block{
          border-radius: 18px;
          margin: 12px;
        }
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
        width: min(520px, 92vw);
        background: #fff;
        border-radius: 18px;
        border: 1px solid rgba(2,6,23,.10);
        box-shadow: 0 20px 60px rgba(0,0,0,.20);
        padding: 16px;
      }
      .np-overlayCard.success{ border-left: 6px solid #22c55e; }
      .np-overlayCard.error{ border-left: 6px solid #ef4444; }
    `;
    document.head.appendChild(s);
  }, []);

  const showCenterMsg = (type, text, ms = 1600) => {
    setOverlayMsg({ show: true, type, text });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setOverlayMsg({ show: false, type: "", text: "" }), ms);
  };

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

      setForm({ title: "", note_date: "", details: "", user_name: "", user_email: "" });
      showCenterMsg("success", "Note added successfully ✅");
    } catch (e) {
      showCenterMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="np-page">
      <div className="np-wrap">
        {/* Header */}
        <div className="np-block">
          <h4 className="np-title">Add Note</h4>
          <div className="np-sub">Date format: <b>2 Oct 2025</b></div>
        </div>

        {/* Form */}
        <div className="np-block">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label fs-12-14">Title</label>
              <input
                className="form-control np-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Buy groceries"
              />
            </div>

            <div className="col-12 col-md-4">
              <DateSelect
                label="Date"
                value={form.note_date}
                onChange={(v) => setForm({ ...form, note_date: v })}
                idPrefix="add"
                required
              />
            </div>

            <div className="col-12 col-md-4">
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
                rows="3"
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder="Write details…"
              />
            </div>
          </div>

          <div className="mt-3 d-flex gap-2 flex-wrap">
            <button className="btn np-btnGrad" onClick={addNote} disabled={busy} type="button">
              {busy ? "Saving…" : "Add Note"}
            </button>

            <button
              className="btn np-btnSoft"
              onClick={() => setForm({ title: "", note_date: "", details: "", user_name: "", user_email: "" })}
              disabled={busy}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Busy overlay */}
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
  );
}
