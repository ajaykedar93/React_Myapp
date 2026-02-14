// AddNote.jsx (FINAL: same UI/page, but uses notes_myapp API + INTEGER user_id)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

// ✅ UPDATED API (notes_myapp routes)
const API_BASE = "https://express-backend-myapp.onrender.com/api/notes-myapp";

export default function AddNote() {
  const { user, loading: authLoading } = useAuth();

  // ✅ token from AuthContext (same style)
  const token = user?.token || "";

  // ✅ user_id must be INTEGER now (admin.user_id SERIAL)
  // take from auth user only (same style) and ensure number
  const userIdRaw = user?.user_id ?? user?.id ?? null;
  const userId = useMemo(() => {
    const n = Number(userIdRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [userIdRaw]);

  const isAuthenticated = !!token && !!user;

  const authHeaders = useMemo(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [centerModal, setCenterModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel",
  });

  const openCenterModal = (payload) => setCenterModal({ open: true, ...payload });
  const closeCenterModal = () =>
    setCenterModal((p) => ({ ...p, open: false, onConfirm: null }));

  const fileRef = useRef(null);

  function to12HrFromInputTime(hhmm) {
    if (!hhmm) return "";
    const m = String(hhmm).match(/^(\d{2}):(\d{2})$/);
    if (!m) return "";
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ap = hh >= 12 ? "PM" : "AM";
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${String(hh).padStart(2, "0")}:${mm} ${ap}`;
  }

  const toInputTime = (hhmmampm) => {
    if (!hhmmampm) return "";
    const m = String(hhmmampm).match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!m) return "";
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ap = m[3].toUpperCase();
    if (ap === "AM") {
      if (hh === 12) hh = 0;
    } else {
      if (hh !== 12) hh += 12;
    }
    return `${String(hh).padStart(2, "0")}:${mm}`;
  };

  const toInputDate = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const m = String(ddmmyyyy).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return "";
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  };

  const fromInputDate = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const m = String(yyyymmdd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    const yyyy = m[1];
    const mm = m[2];
    const dd = m[3];
    return `${dd}/${mm}/${yyyy}`;
  };

  const getISTNow = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const dd = String(ist.getDate()).padStart(2, "0");
    const mm = String(ist.getMonth() + 1).padStart(2, "0");
    const yyyy = ist.getFullYear();

    const HH = String(ist.getHours()).padStart(2, "0");
    const Min = String(ist.getMinutes()).padStart(2, "0");

    const ddmmyyyy = `${dd}/${mm}/${yyyy}`;
    const inputTime = `${HH}:${Min}`;
    const time12 = to12HrFromInputTime(inputTime);

    return { ddmmyyyy, time12 };
  };

  const [form, setForm] = useState(() => {
    const n = getISTNow();
    return {
      note_title: "",
      note_description: "",
      note_info: "",
      note_date: n.ddmmyyyy,
      note_time: n.time12,
      imageFile: null,
      dateTouched: false,
      timeTouched: false,
    };
  });

  useEffect(() => {
    const tick = () => {
      setForm((p) => {
        const n = getISTNow();
        return {
          ...p,
          note_date: p.dateTouched ? p.note_date : n.ddmmyyyy,
          note_time: p.timeTouched ? p.note_time : n.time12,
        };
      });
    };
    tick();
    const id = window.setInterval(tick, 30 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFile = () => {
    setForm((p) => ({ ...p, imageFile: null }));
    if (fileRef.current) fileRef.current.value = "";
    openCenterModal({
      type: "info",
      title: "Attachment removed",
      message: "Selected file has been removed.",
      confirmText: "OK",
    });
  };

  const addNote = async (e) => {
    e.preventDefault();

    // ✅ userId must be INTEGER
    if (!userId) {
      openCenterModal({
        type: "error",
        title: "Login required",
        message: "Valid user id not found. Please login again.",
        confirmText: "OK",
      });
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("user_id", String(userId)); // ✅ send as string but numeric

      if (form.note_title) fd.append("note_title", form.note_title);
      if (form.note_description) fd.append("note_description", form.note_description);
      if (form.note_info) fd.append("note_info", form.note_info);

      if (form.note_date) fd.append("note_date", form.note_date);
      if (form.note_time) fd.append("note_time", form.note_time);

      if (form.imageFile) fd.append("image", form.imageFile);

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { ...authHeaders },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to add note.");

      openCenterModal({
        type: "success",
        title: "Saved",
        message: "Note added successfully.",
        confirmText: "OK",
      });

      const n = getISTNow();
      setForm({
        note_title: "",
        note_description: "",
        note_info: "",
        note_date: n.ddmmyyyy,
        note_time: n.time12,
        imageFile: null,
        dateTouched: false,
        timeTouched: false,
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      openCenterModal({
        type: "error",
        title: "Failed",
        message: err?.message || "Something went wrong.",
        confirmText: "OK",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    setPageLoading(false);
  }, [authLoading]);

  const showGlobalLoading = pageLoading || authLoading;

  const clearForm = () => {
    const n = getISTNow();
    setForm({
      note_title: "",
      note_description: "",
      note_info: "",
      note_date: n.ddmmyyyy,
      note_time: n.time12,
      imageFile: null,
      dateTouched: false,
      timeTouched: false,
    });
    if (fileRef.current) fileRef.current.value = "";
    openCenterModal({
      type: "info",
      title: "Cleared",
      message: "Form cleared.",
      confirmText: "OK",
    });
  };

  return (
    <div className="addnotePage">
      <style>{css}</style>

      {showGlobalLoading && (
        <div className="overlay">
          <div className="loaderCard">
            <div className="spinner" />
            <div className="loaderText">Loading…</div>
            <div className="loaderSub">Preparing your dashboard</div>
          </div>
        </div>
      )}

      {centerModal.open && (
        <div className="modalOverlay" onClick={closeCenterModal}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div
                className={`badge ${
                  centerModal.type === "success"
                    ? "ok"
                    : centerModal.type === "error"
                    ? "bad"
                    : centerModal.type === "confirm"
                    ? "warn"
                    : "info"
                }`}
              >
                {centerModal.type === "success"
                  ? "Success"
                  : centerModal.type === "error"
                  ? "Error"
                  : centerModal.type === "confirm"
                  ? "Confirm"
                  : "Info"}
              </div>
              <div className="modalTitle">{centerModal.title}</div>
              <div className="modalMsg">{centerModal.message}</div>
            </div>

            <div className="modalActions">
              <button className="btn primary" onClick={closeCenterModal}>
                {centerModal.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="topBar">
        <div className="topLeft">
          <div className="chip">ADD NOTE</div>
          <div className="topTitle">Create a bright new note ✨</div>
        </div>
      </div>

      <div className="shell">
        <div className="card edge">
          <div className="cardHead">
            <div className="headLeft">
              <div className="cardTitle">Note Details</div>
            </div>
            <div className="headRight">
              <div className="miniPill">Secure</div>
              <div className="miniPill pink">Fast Save</div>
            </div>
          </div>

          {!isAuthenticated || !userId ? (
            <div className="softInfo">
              <div className="softTitle">Login required</div>
              <div className="softText">Please login to add notes.</div>
              <div className="softActions">
                <button
                  className="btn ghost"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={addNote} className="form">
              <div className="grid2">
                <div className="field">
                  <label className="label">Title (optional)</label>
                  <input
                    className="input"
                    value={form.note_title}
                    onChange={(e) => setForm((p) => ({ ...p, note_title: e.target.value }))}
                    placeholder="Eg. Meeting points"
                  />
                </div>

                <div className="field">
                  <label className="label">Info (optional)</label>
                  <input
                    className="input"
                    value={form.note_info}
                    onChange={(e) => setForm((p) => ({ ...p, note_info: e.target.value }))}
                    placeholder="Eg. Name / number / details"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Description (optional)</label>
                <textarea
                  className="textarea"
                  value={form.note_description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, note_description: e.target.value }))
                  }
                  placeholder="Write your note…"
                />
              </div>

              <div className="grid3">
                <div className="field">
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={toInputDate(form.note_date)}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        note_date: fromInputDate(e.target.value),
                        dateTouched: true,
                      }))
                    }
                  />
                  <div className="micro">
                    API format: <span className="mono">dd/mm/yyyy</span>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Time</label>
                  <input
                    type="time"
                    className="input"
                    value={toInputTime(form.note_time)}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        note_time: to12HrFromInputTime(e.target.value),
                        timeTouched: true,
                      }))
                    }
                  />
                  <div className="micro">
                    API format: <span className="mono">hh:mm AM/PM</span>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Attachment (optional)</label>

                  <div className="fileRow">
                    <input
                      ref={fileRef}
                      type="file"
                      className="file"
                      accept="*/*"
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          imageFile: e.target.files?.[0] || null,
                        }))
                      }
                    />
                  </div>

                  <div className="fileHintRow">
                    <div className="fileHint">
                      {form.imageFile ? (
                        <span className="fileName">{form.imageFile.name}</span>
                      ) : (
                        <span className="fileEmpty">No file selected</span>
                      )}
                    </div>

                    {form.imageFile && (
                      <button
                        type="button"
                        className="btn mini danger"
                        onClick={removeFile}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="actions">
                <button className="btn primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Note"}
                </button>

                <button
                  type="button"
                  className="btn ghost"
                  onClick={clearForm}
                  disabled={saving}
                >
                  Clear
                </button>
              </div>

              <div className="bottomTip">📝 Notes are saved securely under your account.</div>
            </form>
          )}
        </div>
      </div>

      <div style={{ height: 18 }} />
    </div>
  );
}

const css = `
  *{ box-sizing:border-box; }
  html, body { margin:0; padding:0; width:100%; height:100%; overflow-x:hidden; }

  :root{
    --bg: #f6f9ff;
    --card: #ffffff;
    --text: #0f172a;
    --muted: rgba(15,23,42,.72);

    --blue: #2563eb;
    --pink: #ec4899;
    --green: #22c55e;
    --red: #ef4444;
    --amber: #f59e0b;
    --cyan: #06b6d4;

    --shadow: 0 18px 55px rgba(15,23,42,.12);
    --radius: 22px;

    --pagePad: clamp(12px, 3.2vw, 20px);
  }

  .addnotePage{
    min-height:100vh;
    width:100%;
    max-width:100%;
    overflow-x:hidden;
    background:
      radial-gradient(900px 520px at 15% 5%, rgba(37,99,235,.12), transparent 60%),
      radial-gradient(820px 520px at 90% 15%, rgba(124,58,237,.10), transparent 60%),
      radial-gradient(760px 520px at 55% 95%, rgba(236,72,153,.10), transparent 60%),
      linear-gradient(180deg, #ffffff, var(--bg));
  }

  .topBar{ padding: 14px var(--pagePad) 10px; }

  .topLeft{
    width:100%;
    max-width: 1100px;
    margin: 0 auto;
  }

  .chip{
    display:inline-flex;
    align-items:center;
    padding: 7px 11px;
    border-radius: 999px;
    font-weight: 1000;
    font-size: 11px;
    letter-spacing: .14em;
    color: rgba(37,99,235,1);
    background: rgba(37,99,235,.10);
    border: 1px solid rgba(37,99,235,.18);
  }
  .topTitle{
    margin-top: 10px;
    font-size: 20px;
    font-weight: 1100;
    color: var(--text);
  }

  .shell{
    width:100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0;
  }

  .card{
    width:100%;
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    background: var(--card);
    border-top: 1px solid rgba(15,23,42,.10);
    border-bottom: 1px solid rgba(15,23,42,.10);
    border-left: 0;
    border-right: 0;
    box-shadow: none;
    padding: var(--pagePad);
  }

  .cardHead{
    display:flex;
    justify-content:space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .headLeft{ display:flex; flex-direction:column; gap: 4px; }
  .headRight{ display:flex; gap: 8px; flex-wrap:wrap; }

  .miniPill{
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(34,197,94,.22);
    background: rgba(34,197,94,.10);
    color: rgba(34,197,94,1);
    font-weight: 1000;
    font-size: 12px;
  }
  .miniPill.pink{
    border-color: rgba(236,72,153,.22);
    background: rgba(236,72,153,.10);
    color: rgba(236,72,153,1);
  }

  .cardTitle{ font-size: 15px; font-weight: 1100; color: var(--text); }

  .form{ display:flex; flex-direction:column; gap: 12px; }
  .grid2{ display:grid; grid-template-columns: 1fr; gap: 12px; }
  .grid3{ display:grid; grid-template-columns: 1fr; gap: 12px; }

  .field{ display:flex; flex-direction:column; gap: 7px; }
  .label{ font-size: 12px; font-weight: 1100; color: rgba(15,23,42,.86); }

  .input, .textarea{
    width:100%;
    max-width:100%;
    border-radius: 16px;
    border: 1px solid rgba(37,99,235,.18);
    background: #fff;
    padding: 12px 12px;
    outline:none;
    color: var(--text);
    font-weight: 850;
  }
  .textarea{ min-height: 96px; resize: vertical; }

  .input:focus, .textarea:focus{
    border-color: rgba(236,72,153,.45);
    box-shadow: 0 0 0 4px rgba(236,72,153,.14);
  }

  .micro{ font-size: 11px; font-weight: 850; color: rgba(15,23,42,.62); }
  .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

  .file{
    width:100%;
    max-width:100%;
    border-radius: 16px;
    border: 1px dashed rgba(37,99,235,.35);
    background: rgba(37,99,235,.06);
    padding: 12px;
    font-weight: 900;
    color: rgba(15,23,42,.78);
  }

  .fileHintRow{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 10px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .fileName{
    display:inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(34,197,94,.10);
    border: 1px solid rgba(34,197,94,.20);
    color: rgba(34,197,94,1);
    font-weight: 1000;
    font-size: 12px;
    word-break: break-word;
  }
  .fileEmpty{
    display:inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(245,158,11,.10);
    border: 1px solid rgba(245,158,11,.22);
    color: rgba(245,158,11,1);
    font-weight: 1000;
    font-size: 12px;
  }

  .actions{ display:flex; gap: 10px; flex-wrap:wrap; margin-top: 2px; }

  .btn{
    border: none;
    cursor:pointer;
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 1100;
    transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active{ transform: scale(.985); }
  .btn:hover{ filter: brightness(1.02); }

  .btn.primary{
    color:#fff;
    background: linear-gradient(135deg, var(--blue), var(--pink));
    box-shadow: 0 14px 28px rgba(37,99,235,.18);
  }
  .btn.ghost{
    color: rgba(15,23,42,.88);
    background: linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.06));
    border: 1px solid rgba(37,99,235,.18);
  }
  .btn.danger{
    color:#fff;
    background: linear-gradient(135deg, var(--red), #fb7185);
    box-shadow: 0 12px 24px rgba(239,68,68,.18);
  }
  .btn.mini{
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 1100;
  }

  .bottomTip{
    margin-top: 4px;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(6,182,212,.10);
    border: 1px solid rgba(6,182,212,.18);
    color: rgba(15,23,42,.78);
    font-weight: 900;
    font-size: 12px;
  }

  .modalOverlay{
    position:fixed;
    inset:0;
    z-index: 1200;
    display:flex;
    align-items:center;
    justify-content:center;
    padding: var(--pagePad);
    background: rgba(37,99,235,.12);
    backdrop-filter: blur(10px);
  }
  .modalCard{
    width: min(420px, calc(100% - (var(--pagePad) * 2)));
    max-height: calc(100vh - (var(--pagePad) * 2));
    overflow:auto;
    -webkit-overflow-scrolling: touch;
    background: #fff;
    border: 1px solid rgba(15,23,42,.10);
    border-radius: 22px;
    padding: 16px;
    box-shadow: 0 26px 90px rgba(15,23,42,.18);
  }

  .modalTop{ display:flex; flex-direction:column; gap: 8px; }
  .badge{
    align-self:flex-start;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 1100;
    border: 1px solid rgba(37,99,235,.20);
    background: rgba(37,99,235,.10);
    color: rgba(37,99,235,1);
  }
  .badge.ok{
    border-color: rgba(34,197,94,.22);
    background: rgba(34,197,94,.10);
    color: rgba(34,197,94,1);
  }
  .badge.bad{
    border-color: rgba(239,68,68,.22);
    background: rgba(239,68,68,.10);
    color: rgba(239,68,68,1);
  }
  .badge.warn{
    border-color: rgba(245,158,11,.25);
    background: rgba(245,158,11,.12);
    color: rgba(245,158,11,1);
  }
  .modalTitle{ font-size: 15px; font-weight: 1200; color: var(--text); }
  .modalMsg{
    font-size: 12.5px;
    font-weight: 900;
    color: rgba(15,23,42,.70);
    line-height: 1.45;
    word-break: break-word;
  }
  .modalActions{
    display:flex;
    justify-content:flex-end;
    gap: 10px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .overlay{
    position:fixed;
    inset:0;
    z-index: 999;
    display:grid;
    place-items:center;
    background: rgba(255,255,255,.75);
    backdrop-filter: blur(10px);
  }
  .loaderCard{
    width: min(340px, 92vw);
    background: #fff;
    border: 1px solid rgba(15,23,42,.10);
    border-radius: 22px;
    padding: 18px;
    box-shadow: 0 22px 70px rgba(15,23,42,.16);
    display:flex;
    flex-direction:column;
    align-items:center;
    gap: 8px;
  }
  .spinner{
    width: 44px; height: 44px;
    border-radius: 999px;
    border: 4px solid rgba(37,99,235,.18);
    border-top-color: rgba(236,72,153,.95);
    animation: spin 1s linear infinite;
  }
  .loaderText{ font-size: 13px; font-weight: 1100; color: rgba(15,23,42,.86); }
  .loaderSub{ font-size: 12px; font-weight: 900; color: rgba(15,23,42,.62); }

  .softInfo{
    border: 1px solid rgba(239,68,68,.18);
    background: rgba(239,68,68,.08);
    border-radius: 18px;
    padding: 14px;
  }
  .softTitle{ font-weight:1100; color: var(--text); font-size: 14px; }
  .softText{ margin-top: 6px; font-weight: 900; color: rgba(15,23,42,.70); font-size: 12.5px; line-height:1.45; }
  .softActions{ margin-top: 10px; display:flex; justify-content:flex-end; }

  @media (min-width: 740px){
    .shell{ padding: 10px var(--pagePad) 26px; }
    .card{
      border-radius: var(--radius);
      border: 1px solid rgba(15,23,42,.10);
      box-shadow: var(--shadow);
      padding: 16px;
    }
    .grid2{ grid-template-columns: 1fr 1fr; }
    .grid3{ grid-template-columns: 1fr 1fr 1fr; }
    .topTitle{ font-size: 22px; }
  }

  @keyframes spin{ from{ transform: rotate(0deg);} to{ transform: rotate(360deg);} }
`;
