// src/components/Notes/GetNote.jsx (EDGE-TO-EDGE + MOBILE: IMG LEFT + BUTTON RIGHT SAME ROW)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE = "https://express-backend-myapp.onrender.com/api/notes-myapp";

export default function GetNote() {
  const { user, loading: authLoading } = useAuth();

  const token = user?.token || "";

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

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const [centerModal, setCenterModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel",
  });

  const openCenterModal = (payload) =>
    setCenterModal({ open: true, ...payload });

  const closeCenterModal = () =>
    setCenterModal((p) => ({ ...p, open: false, onConfirm: null }));

  const [editModal, setEditModal] = useState({
    open: false,
    saving: false,
    noteId: null,
    note_title: "",
    note_description: "",
    note_info: "",
    note_date: "",
    note_time: "",
    has_image: false, // kept for data integrity, but UI won't show image
  });

  const openEditModal = (note) => {
    setEditModal({
      open: true,
      saving: false,
      noteId: note.note_id,
      note_title: note.note_title || "",
      note_description: note.note_description || "",
      note_info: note.note_info || "",
      note_date: note.note_date || "",
      note_time: note.note_time || "",
      has_image: !!note.has_image,
    });
  };

  const closeEditModal = () =>
    setEditModal((p) => ({ ...p, open: false, saving: false }));

  const safeText = (v) => (v == null || v === "" ? "—" : String(v));

  const withUserQuery = (url) => {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}user_id=${encodeURIComponent(String(userId ?? ""))}`;
  };

  const getImageUrl = (noteId) => withUserQuery(`${API_BASE}/${noteId}/image`);

  // Image viewer (used from main list "View Image" button)
  const [imgViewer, setImgViewer] = useState({ open: false, src: "", alt: "" });
  const openImage = (src, alt = "note") =>
    setImgViewer({ open: true, src, alt });
  const closeImage = () => setImgViewer({ open: false, src: "", alt: "" });

  // Reset edit modal scroll TOP
  const editCardRef = useRef(null);
  useEffect(() => {
    if (!editModal.open) return;
    requestAnimationFrame(() => {
      if (editCardRef.current) editCardRef.current.scrollTop = 0;
    });
  }, [editModal.open, editModal.noteId]);

  // Lock background scroll when any modal open
  useEffect(() => {
    const anyOpen =
      imgViewer.open || editModal.open || centerModal.open || authLoading;
    if (!anyOpen) return;

    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [imgViewer.open, editModal.open, centerModal.open, authLoading]);

  const fetchNotes = async () => {
    if (!userId) return;

    setNotesLoading(true);
    try {
      const res = await fetch(withUserQuery(API_BASE), {
        method: "GET",
        headers: { ...authHeaders },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load notes.");

      setNotes(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      openCenterModal({
        type: "error",
        title: "Failed",
        message: err?.message || "Something went wrong.",
        confirmText: "OK",
      });
    } finally {
      setNotesLoading(false);
    }
  };

  const confirmDelete = (noteId) => {
    openCenterModal({
      type: "confirm",
      title: "Delete note?",
      message: "This note will be deleted permanently.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: () => deleteNote(noteId),
    });
  };

  const deleteNote = async (noteId) => {
    closeCenterModal();
    if (!userId) return;

    try {
      setNotesLoading(true);

      const res = await fetch(withUserQuery(`${API_BASE}/${noteId}`), {
        method: "DELETE",
        headers: { ...authHeaders },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete note.");

      openCenterModal({
        type: "success",
        title: "Deleted",
        message: "Note removed successfully.",
        confirmText: "OK",
      });

      await fetchNotes();
    } catch (err) {
      openCenterModal({
        type: "error",
        title: "Failed",
        message: err?.message || "Something went wrong.",
        confirmText: "OK",
      });
      setNotesLoading(false);
    }
  };

  // UPDATE (multipart)
  const updateNote = async () => {
    if (!userId || !editModal.noteId) return;

    setEditModal((p) => ({ ...p, saving: true }));
    try {
      const fd = new FormData();
      fd.append("user_id", String(userId));

      fd.append("note_title", editModal.note_title || "");
      fd.append("note_description", editModal.note_description || "");
      fd.append("note_info", editModal.note_info || "");
      fd.append("note_date", editModal.note_date || "");
      fd.append("note_time", editModal.note_time || "");

      const res = await fetch(`${API_BASE}/${editModal.noteId}`, {
        method: "PUT",
        headers: { ...authHeaders },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update note.");

      closeEditModal();
      openCenterModal({
        type: "success",
        title: "Updated",
        message: "Note updated successfully.",
        confirmText: "OK",
      });

      await fetchNotes();
    } catch (err) {
      openCenterModal({
        type: "error",
        title: "Update failed",
        message: err?.message || "Something went wrong.",
        confirmText: "OK",
      });
      setEditModal((p) => ({ ...p, saving: false }));
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId]);

  const orderedNotes = useMemo(() => (Array.isArray(notes) ? notes : []), [notes]);

  const pad2 = (n) => String(n).padStart(2, "0");

  const normalizeDate = (s) => {
    const v = String(s ?? "").trim();
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [yy, mm, dd] = v.split("-");
      return `${dd}/${mm}/${yy}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    return v;
  };

  const normalizeTime = (s) => {
    const v = String(s ?? "").trim();
    if (!v) return "";

    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(v)) {
      const [time, ap] = v.split(/\s+/);
      const [hh, mm] = time.split(":");
      return `${pad2(parseInt(hh, 10))}:${mm} ${ap.toUpperCase()}`;
    }

    if (/^\d{1,2}:\d{2}$/.test(v)) {
      let [H, M] = v.split(":").map((x) => parseInt(x, 10));
      const ap = H >= 12 ? "PM" : "AM";
      H = H % 12;
      if (H === 0) H = 12;
      return `${pad2(H)}:${pad2(M)} ${ap}`;
    }

    return v;
  };

  const getStamp = (note) => {
    const d = normalizeDate(note?.note_date || "");
    const t = normalizeTime(note?.note_time || "");
    if (d && t) return `${d} • ${t}`;
    if (d) return d;
    if (t) return t;
    return "01/01/2026 • 12:00 AM";
  };

  return (
    <div className="getnotePage">
      <style>{css}</style>

      {/* Global Loading */}
      {authLoading &&
        createPortal(
          <div className="overlay">
            <div className="loaderCard">
              <div className="spinner" />
              <div className="loaderText">Loading…</div>
              <div className="loaderSub">Getting your notes</div>
            </div>
          </div>,
          document.body
        )}

      {/* Center Modal */}
      {centerModal.open &&
        createPortal(
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
                {centerModal.type === "confirm" && (
                  <button className="btn ghost" onClick={closeCenterModal}>
                    {centerModal.cancelText || "Cancel"}
                  </button>
                )}

                <button
                  className={`btn ${
                    centerModal.type === "confirm" ? "danger" : "primary"
                  }`}
                  onClick={() => {
                    if (
                      centerModal.type === "confirm" &&
                      typeof centerModal.onConfirm === "function"
                    ) {
                      centerModal.onConfirm();
                    } else {
                      closeCenterModal();
                    }
                  }}
                >
                  {centerModal.confirmText || "OK"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Update Modal (NO IMAGE SECTION) */}
      {editModal.open &&
        createPortal(
          <div className="editOverlay" onClick={closeEditModal}>
            <div
              ref={editCardRef}
              className="editCard"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="editHead">
                <div className="editTitle">Update Note</div>
                <div className="editSub">
                  ID: <span className="mono">{safeText(editModal.noteId)}</span>
                </div>
              </div>

              <div className="editBody">
                <div className="field">
                  <label className="label">Title</label>
                  <input
                    className="input"
                    value={editModal.note_title}
                    onChange={(e) =>
                      setEditModal((p) => ({ ...p, note_title: e.target.value }))
                    }
                    placeholder="Eg. Meeting points"
                  />
                </div>

                <div className="field">
                  <label className="label">Info</label>
                  <input
                    className="input"
                    value={editModal.note_info}
                    onChange={(e) =>
                      setEditModal((p) => ({ ...p, note_info: e.target.value }))
                    }
                    placeholder="Eg. Name / number / details"
                  />
                </div>

                <div className="field">
                  <label className="label">Description</label>
                  <textarea
                    className="textarea"
                    value={editModal.note_description}
                    onChange={(e) =>
                      setEditModal((p) => ({
                        ...p,
                        note_description: e.target.value,
                      }))
                    }
                    placeholder="Write your note…"
                  />
                </div>

                <div className="grid2">
                  <div className="field">
                    <label className="label">Date</label>
                    <input
                      className="input"
                      value={editModal.note_date}
                      onChange={(e) =>
                        setEditModal((p) => ({ ...p, note_date: e.target.value }))
                      }
                      placeholder="dd/mm/yyyy"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Time</label>
                    <input
                      className="input"
                      value={editModal.note_time}
                      onChange={(e) =>
                        setEditModal((p) => ({ ...p, note_time: e.target.value }))
                      }
                      placeholder="hh:mm AM/PM"
                    />
                  </div>
                </div>
              </div>

              <div className="editActions">
                <button
                  className="btn ghost"
                  onClick={closeEditModal}
                  disabled={editModal.saving}
                >
                  Cancel
                </button>
                <button
                  className="btn warn"
                  onClick={updateNote}
                  disabled={editModal.saving}
                >
                  {editModal.saving ? "Updating…" : "Update"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Image Viewer (center popup) */}
      {imgViewer.open &&
        createPortal(
          <div className="imgOverlay" onClick={closeImage}>
            <div className="imgFrame" onClick={(e) => e.stopPropagation()}>
              <button className="imgClose" onClick={closeImage} aria-label="Close">
                ✕
              </button>
              <img className="imgFull" src={imgViewer.src} alt={imgViewer.alt} />
            </div>
          </div>,
          document.body
        )}

      <div className="pageTitle">Get Notes</div>

      {!isAuthenticated || !userId ? (
        <div className="fullCard warnCard">
          <div className="warnTitle">Login required</div>
          <div className="warnSub">Please login again. User id not found.</div>
        </div>
      ) : (
        <>
          {notesLoading && (
            <div className="miniLoadingRow">
              <span className="miniSpin" /> Loading notes…
            </div>
          )}

          {!notesLoading && orderedNotes.length === 0 && (
            <div className="fullCard emptyCard">
              <div className="emptyIcon">📭</div>
              <div className="emptyTitle">No notes yet</div>
              <button className="btn primary" onClick={fetchNotes}>
                Refresh
              </button>
            </div>
          )}

          <div className="list">
            {orderedNotes.map((n, idx) => {
              const seq = idx + 1;
              const title = n.note_title ? n.note_title : "Untitled";
              const info = n.note_info ? n.note_info : "";
              const desc = n.note_description ? n.note_description : "";
              const stamp = getStamp(n);

              return (
                <div key={n.note_id} className="noteCard">
                  <div className="noteHead">
                    <div className="seq">{seq}</div>
                    <div className="headRight">
                      <button
                        type="button"
                        className="btn mini warn"
                        onClick={() => openEditModal(n)}
                        disabled={notesLoading}
                      >
                        Update
                      </button>

                      <button
                        type="button"
                        className="btn mini danger"
                        onClick={() => confirmDelete(n.note_id)}
                        disabled={notesLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="stampBar">
                    <span className="stampIcon">🕒</span>
                    <span className="stampText">{stamp}</span>
                  </div>

                  <div className="titleBadge">{title}</div>
                  {info ? <div className="infoBadge">{info}</div> : null}

                  <div className="descBox">
                    {desc ? desc : <span className="muted">No description</span>}
                  </div>

                  {n.has_image ? (
                    <div className="imgRow">
                      <img
                        className="imgThumb"
                        src={getImageUrl(n.note_id)}
                        alt="note"
                        loading="lazy"
                        onError={() =>
                          openCenterModal({
                            type: "error",
                            title: "Image error",
                            message: "Could not load image for this note.",
                            confirmText: "OK",
                          })
                        }
                      />

                      <button
                        type="button"
                        className="btn mini ghost viewBtn"
                        onClick={() => openImage(getImageUrl(n.note_id), "note")}
                      >
                        View Image
                      </button>
                    </div>
                  ) : (
                    <div className="noImg">No image</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const css = `
  *{ box-sizing:border-box; }
  html, body { margin:0; padding:0; width:100%; height:100%; overflow-x:hidden; }

  :root{
    --text:#000000;
    --muted: rgba(0,0,0,.70);
    --blue:#2563eb;
    --red:#ef4444;
    --amber:#f59e0b;
    --green:#22c55e;
    --shadow2: 0 26px 90px rgba(0,0,0,.18);
    --in: clamp(12px, 3.2vw, 18px);
  }

  .getnotePage{
    min-height: 100dvh;
    width:100%;
    background:
      radial-gradient(900px 520px at 15% 5%, rgba(37,99,235,.10), transparent 60%),
      radial-gradient(820px 520px at 90% 15%, rgba(245,158,11,.10), transparent 60%),
      radial-gradient(760px 520px at 55% 95%, rgba(34,197,94,.10), transparent 60%),
      linear-gradient(180deg, #ffffff, #f3f6ff);
    padding: 0;
  }

  .pageTitle{
    padding: 14px var(--in) 10px;
    font-size: 18px;
    font-weight: 1100;
    color: var(--text);
  }

  .list{
    width:100%;
    display:flex;
    flex-direction:column;
    gap: 0;
    padding: 0;
    margin: 0;
  }

  .noteCard{
    width:100%;
    border-top: 1px solid rgba(0,0,0,.18);
    border-bottom: 1px solid rgba(0,0,0,.18);
    border-left: 0;
    border-right: 0;
    background: rgba(255,255,255,.96);
    border-radius: 0;
    padding: var(--in);
    box-shadow: none;
  }
  .noteCard + .noteCard{ border-top: 0; }

  .noteHead{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .seq{
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display:grid;
    place-items:center;
    font-weight: 1200;
    color: #fff;
    background: linear-gradient(135deg, var(--blue), #60a5fa);
    box-shadow: 0 10px 22px rgba(37,99,235,.18);
  }

  .headRight{ display:flex; gap: 8px; flex-wrap: wrap; justify-content:flex-end; }

  .stampBar{
    margin-top: 2px;
    margin-bottom: 10px;
    padding: 8px 10px;
    border-radius: 14px;
    background: rgba(245,158,11,.18);
    border: 1px solid rgba(245,158,11,.28);
    display:flex;
    align-items:center;
    gap: 8px;
  }
  .stampIcon{ font-size: 13px; line-height: 1; }
  .stampText{
    color: #000;
    font-weight: 1100;
    font-size: 12px;
    letter-spacing: .2px;
    word-break: break-word;
  }

  .titleBadge{
    margin-top: 4px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(37,99,235,.08);
    border: 1px solid rgba(37,99,235,.18);
    color: #000;
    font-size: 15px;
    font-weight: 1400;
    word-break: break-word;
  }

  .infoBadge{
    margin-top: 10px;
    padding: 9px 12px;
    border-radius: 14px;
    background: rgba(34,197,94,.08);
    border: 1px solid rgba(34,197,94,.18);
    color: #000;
    font-size: 13px;
    font-weight: 1200;
    word-break: break-word;
  }

  .descBox{
    margin-top: 10px;
    padding: 12px;
    border-radius: 14px;
    background: #fff;
    border: 1px solid rgba(0,0,0,.14);
    color: #000;
    font-size: 13px;
    font-weight: 1100;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .muted{ color: var(--muted); font-weight: 1100; }

  /* ✅ IMAGE ROW: always same row (img left, button right) */
  .imgRow{
    margin-top: 12px;
    display:flex;
    align-items:center;
    gap: 10px;
    flex-wrap: nowrap;       /* ✅ stop wrapping */
  }

  .imgThumb{
    width: 74px;
    height: 74px;
    border-radius: 14px;
    object-fit: cover;
    border: 1px solid rgba(0,0,0,.16);
    box-shadow: 0 10px 24px rgba(0,0,0,.12);
    flex: 0 0 auto;
  }

  /* ✅ button takes remaining space on mobile, stays right side */
  .viewBtn{
    flex: 1 1 auto;
    text-align: center;
    min-width: 120px;
  }

  @media (max-width: 576px){
    .imgThumb{ width: 66px; height: 66px; border-radius: 12px; }
    .viewBtn{ width: 100%; }
  }

  .noImg{ margin-top: 12px; font-size: 12px; font-weight: 1200; color: rgba(0,0,0,.72); }

  .btn{
    border:none;
    cursor:pointer;
    border-radius: 14px;
    padding: 11px 14px;
    font-weight: 1200;
    transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active{ transform: scale(.985); }
  .btn:disabled{ opacity:.65; cursor:not-allowed; }

  .btn.mini{ padding: 10px 12px; border-radius: 12px; font-size: 12px; }
  .btn.primary{ color:#fff; background: linear-gradient(135deg, var(--blue), #60a5fa); box-shadow: 0 12px 24px rgba(37,99,235,.18); }
  .btn.ghost{ color: #000; background: rgba(37,99,235,.08); border: 1px solid rgba(37,99,235,.18); }
  .btn.warn{ color: #000; background: linear-gradient(135deg, rgba(245,158,11,.20), rgba(245,158,11,.10)); border: 1px solid rgba(245,158,11,.28); }
  .btn.danger{ color:#fff; background: linear-gradient(135deg, var(--red), #fb7185); box-shadow: 0 12px 24px rgba(239,68,68,.18); }

  .miniLoadingRow{
    padding: 12px var(--in);
    display:flex;
    align-items:center;
    gap: 8px;
    font-weight: 1200;
    font-size: 12px;
    color: rgba(0,0,0,.78);
  }
  .miniSpin{
    width: 14px; height: 14px;
    border-radius: 999px;
    border: 3px solid rgba(37,99,235,.20);
    border-top-color: rgba(37,99,235,.95);
    animation: spin 1s linear infinite;
    display:inline-block;
  }

  .fullCard{
    width: 100%;
    margin: 0;
    border-top: 1px solid rgba(0,0,0,.14);
    border-bottom: 1px solid rgba(0,0,0,.14);
    border-left: 0;
    border-right: 0;
    border-radius: 0;
    background: rgba(255,255,255,.96);
    padding: var(--in);
    color: #000;
  }
  .warnCard{ background: rgba(245,158,11,.10); border-top: 1px dashed rgba(245,158,11,.35); border-bottom: 1px dashed rgba(245,158,11,.35); }
  .warnTitle{ font-weight: 1400; color: #000; }
  .warnSub{ margin-top: 6px; font-weight: 1200; color: rgba(0,0,0,.78); }
  .emptyCard{ display:flex; flex-direction:column; gap: 10px; align-items:flex-start; }
  .emptyIcon{ font-size: 26px; }
  .emptyTitle{ font-weight: 1400; color: #000; }

  .modalOverlay,
  .editOverlay,
  .imgOverlay,
  .overlay{
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    z-index: 99999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding: var(--in);
    padding-bottom: calc(var(--in) + env(safe-area-inset-bottom));
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .modalOverlay{ background: rgba(37,99,235,.14); backdrop-filter: blur(12px); }
  .editOverlay{ background: rgba(6,182,212,.14); backdrop-filter: blur(12px); }
  .imgOverlay{ background: rgba(15,23,42,.75); backdrop-filter: blur(10px); }
  .overlay{ background: rgba(255,255,255,.75); backdrop-filter: blur(10px); }

  .modalCard{
    width: min(460px, 100%);
    max-height: calc(100dvh - (var(--in) * 2) - env(safe-area-inset-bottom));
    overflow: auto;
    background: #fff;
    border: 1px solid rgba(0,0,0,.14);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 20px 70px rgba(0,0,0,.16);
    margin: auto;
    color: #000;
  }

  .modalTop{ display:flex; flex-direction:column; gap: 8px; }

  .badge{
    align-self:flex-start;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 1300;
    border: 1px solid rgba(37,99,235,.20);
    background: rgba(37,99,235,.10);
    color: rgba(37,99,235,1);
  }
  .badge.ok{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color: rgba(34,197,94,1); }
  .badge.bad{ border-color: rgba(239,68,68,.22); background: rgba(239,68,68,.10); color: rgba(239,68,68,1); }
  .badge.warn{ border-color: rgba(245,158,11,.25); background: rgba(245,158,11,.12); color: rgba(245,158,11,1); }

  .modalTitle{ font-size: 15px; font-weight: 1400; color: #000; }
  .modalMsg{ font-size: 12.5px; font-weight: 1200; color: rgba(0,0,0,.78); line-height: 1.45; }
  .modalActions{ display:flex; justify-content:flex-end; gap: 10px; margin-top: 12px; flex-wrap: wrap; }

  .editCard{
    width: min(820px, 100%);
    max-height: calc(100dvh - (var(--in) * 2) - env(safe-area-inset-bottom));
    overflow: auto;
    background: #fff;
    border: 1px solid rgba(0,0,0,.16);
    border-radius: 22px;
    box-shadow: var(--shadow2);
    display:flex;
    flex-direction:column;
    margin: auto;
    color: #000;
  }

  .editHead{
    padding: 14px 16px;
    border-bottom: 1px solid rgba(0,0,0,.12);
    background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(37,99,235,.08));
    position: sticky;
    top: 0;
    z-index: 2;
  }
  .editTitle{ font-size: 16px; font-weight: 1500; color: #000; }
  .editSub{ margin-top: 4px; font-size: 12px; font-weight: 1200; color: rgba(0,0,0,.78); }
  .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

  .editBody{ padding: 16px; display:flex; flex-direction:column; gap: 12px; }
  .field{ display:flex; flex-direction:column; gap: 7px; }
  .label{ font-size: 12px; font-weight: 1300; color: #000; }

  .input, .textarea{
    width:100%;
    border-radius: 16px;
    border: 1px solid rgba(37,99,235,.18);
    background: #fff;
    padding: 12px 12px;
    outline:none;
    color: #000;
    font-weight: 1100;
    line-height: 1.2;
    min-height: 46px;
    height: auto;
    font: inherit;
  }
  .textarea{ min-height: 92px; resize: vertical; line-height: 1.45; }

  .grid2{ display:grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 720px){ .grid2{ grid-template-columns: 1fr 1fr; } }

  .editActions{
    padding: 12px 16px 14px;
    border-top: 1px solid rgba(0,0,0,.12);
    display:flex;
    justify-content:flex-end;
    gap: 10px;
    flex-wrap: wrap;
    background: rgba(255,255,255,.98);
    position: sticky;
    bottom: 0;
    z-index: 2;
  }

  .imgFrame{
    width: min(1100px, 100%);
    max-height: calc(100dvh - (var(--in) * 2) - env(safe-area-inset-bottom));
    position: relative;
    display:flex;
    align-items:center;
    justify-content:center;
    padding: 10px;
    margin: auto;
  }
  .imgClose{
    position:absolute;
    top: 8px;
    right: 8px;
    border:none;
    cursor:pointer;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    font-size: 20px;
    font-weight: 1200;
    color: #fbf9f9;
    background: rgba(14, 14, 14, 0.97);
    backdrop-filter: blur(8px);
    display:grid;
    place-items:center;
  }
  .imgFull{
    max-width: 100%;
    max-height: calc(100dvh - (var(--in) * 2) - env(safe-area-inset-bottom));
    object-fit: contain;
    border-radius: 18px;
    box-shadow: 0 30px 120px rgba(0,0,0,.35);
    display:block;
  }

  .loaderCard{
    width: min(340px, 92vw);
    background: #fff;
    border: 1px solid rgba(0,0,0,.14);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 16px 44px rgba(0,0,0,.14);
    display:flex;
    flex-direction:column;
    align-items:center;
    gap: 8px;
    margin: auto;
    color: #000;
  }
  .spinner{
    width: 42px; height: 42px;
    border-radius: 999px;
    border: 4px solid rgba(37,99,235,.18);
    border-top-color: rgba(37,99,235,.95);
    animation: spin 1s linear infinite;
  }
  .loaderText{ font-size: 13px; font-weight: 1300; color: #000; }
  .loaderSub{ font-size: 12px; font-weight: 1200; color: rgba(0,0,0,.78); }

  @media (max-height: 650px){
    .modalOverlay, .editOverlay, .imgOverlay{ align-items: flex-start; }
  }

  @keyframes spin{ from{ transform: rotate(0deg);} to{ transform: rotate(360deg);} }
`;
