// src/pages/Addfevlist.jsx
import React, { useEffect, useState } from "react";

const BASE = "https://express-backend-myapp.onrender.com";

const API = {
  list: `${BASE}/api/add-list-actress`,
  create: `${BASE}/api/add-list-actress`,
  update: (id) => `${BASE}/api/add-list-actress/${id}`,
  delete: (id) => `${BASE}/api/add-list-actress/${id}`,
  exportPdf: `${BASE}/api/add-list-actress/export/pdf`,
  exportTxt: `${BASE}/api/add-list-actress/export/txt`,
};

/* ---------- small helpers ---------- */
async function safeFetchJSON(url, options) {
  let resp;
  try {
    resp = await fetch(url, options);
  } catch (e) {
    throw new Error("Network error: " + (e?.message || "failed to fetch"));
  }
  if (!resp.ok) {
    let msg = `${resp.status}`;
    try {
      const j = await resp.json();
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  let payload;
  try {
    payload = await resp.json();
  } catch {
    return {};
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}

const PAGE_SIZE = 20;

function normalizeName(name) {
  if (!name) return "";
  return String(name)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// convert any DOB string to YYYY-MM-DD for <input type="date">
function toDateInputValue(dob) {
  if (!dob) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------- Center popup (success / error info) ---------- */
function CenterPopup({ open, title = "Info", message = "", tone = "info", onClose }) {
  if (!open) return null;
  const colorMap = {
    info: "#2563eb",
    success: "#16a34a",
    danger: "#dc2626",
  };
  const borderColor = colorMap[tone] || "#2563eb";

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 21000,
        background: "rgba(15,23,42,0.55)",
        padding: 12,
        fontFamily: "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white shadow-lg rounded-4 p-3 p-md-4"
        style={{
          maxWidth: 420,
          width: "100%",
          borderTop: `4px solid ${borderColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h5 className="fw-bold mb-2" style={{ color: borderColor }}>
          {title}
        </h5>
        <div className="mb-3" style={{ color: "#334155", fontSize: 14 }}>
          {message}
        </div>
        <div className="d-grid">
          <button className="btn btn-sm text-white fw-semibold" style={{ background: borderColor }} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Confirm dialog (delete) ---------- */
function ConfirmPopup({ open, title = "Confirm", message = "", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 21000,
        background: "rgba(15,23,42,0.6)",
        padding: 12,
        fontFamily: "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
      onClick={onCancel}
    >
      <div
        className="bg-white shadow-lg rounded-4 p-3 p-md-4"
        style={{
          maxWidth: 420,
          width: "100%",
          borderTop: "4px solid #dc2626",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h5 className="fw-bold mb-2 text-danger">{title}</h5>
        <div className="mb-3" style={{ color: "#334155", fontSize: 14 }}>
          {message}
        </div>
        <div className="d-grid gap-2">
          <button
            className="btn btn-sm text-white fw-semibold"
            style={{
              background: "linear-gradient(90deg, #ef4444 0%, #f97316 100%)",
              border: "none",
            }}
            onClick={onConfirm}
          >
            Yes, Delete
          </button>
          <button className="btn btn-sm btn-light fw-semibold" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Center overlay loader ---------- */
function OverlayLoader({ open, label = "Please wait…" }) {
  if (!open) return null;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
      style={{
        zIndex: 22000,
        background: "rgba(15,23,42,0.55)",
        padding: 16,
        fontFamily: "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        className="rounded-4 shadow-lg p-3 p-md-4"
        style={{
          width: "min(360px, 100%)",
          background:
            "linear-gradient(135deg, rgba(255,159,104,0.95), rgba(255,76,106,0.95))",
          color: "#fff",
        }}
      >
        <div className="d-flex flex-column align-items-center text-center">
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "999px",
              borderWidth: 4,
              borderStyle: "solid",
              borderTopColor: "#20c997",
              borderRightColor: "#12a4d9",
              borderBottomColor: "#ffe5c8",
              borderLeftColor: "#ff4c6a",
              animation: "afl-spin 0.8s linear infinite",
              marginBottom: 12,
            }}
          />
          <div className="fw-semibold mb-2" style={{ fontSize: 15 }}>
            {label}
          </div>
          <div
            className="w-100 rounded-pill overflow-hidden"
            style={{
              height: 6,
              background: "rgba(255,255,255,0.25)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "45%",
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #22c55e 0%, #06b6d4 50%, #a855f7 100%)",
                animation: "afl-bar 1.1s ease-in-out infinite alternate",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Edit modal ---------- */
function EditModal({ open, item, form, onChange, onCancel, onSave, saving }) {
  if (!open || !item) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 21000,
        background: "rgba(15,23,42,0.6)",
        padding: 12,
        fontFamily: "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-4 shadow-lg p-3 p-md-4"
        style={{ maxWidth: 520, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="fw-bold mb-0" style={{ color: "#0f172a" }}>
            Edit Actress #{item.seq ?? item.id}
          </h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
            ✕
          </button>
        </div>
        <p className="small text-muted mb-3">
          Update details and click <strong>Save Changes</strong>. Name will keep auto-capitalisation.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="mb-2">
            <label className="form-label small fw-semibold">
              Actress Name <span className="text-danger">*</span>
            </label>
            <input
              className="form-control form-control-sm"
              value={form.actress_name}
              onChange={(e) => onChange({ ...form, actress_name: e.target.value })}
            />
          </div>

          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">DOB</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={form.dob}
                onChange={(e) => onChange({ ...form, dob: e.target.value })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Country</label>
              <input
                className="form-control form-control-sm"
                value={form.country_name}
                onChange={(e) => onChange({ ...form, country_name: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-2">
            <label className="form-label small fw-semibold">Best Movie / Series</label>
            <input
              className="form-control form-control-sm"
              value={form.best_movie}
              onChange={(e) => onChange({ ...form, best_movie: e.target.value })}
            />
          </div>

          <div className="mt-2">
            <label className="form-label small fw-semibold">Best Thing / Notes</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={form.best_thing}
              onChange={(e) => onChange({ ...form, best_thing: e.target.value })}
            />
          </div>

          <div className="mt-3 d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-sm text-white px-3"
              style={{
                background:
                  "linear-gradient(90deg, #20c997 0%, #12a4d9 100%)",
                border: "none",
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Image lightbox (FULL SCREEN on click) ---------- */
function ImageLightbox({ open, src, title, onClose }) {
  if (!open || !src) return null;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{
        zIndex: 23000,
        background: "rgba(15,23,42,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        fontFamily: "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "min(600px, 100%)",
          width: "100%",
          maxHeight: "100%",
          background: "#020617",
          borderRadius: 16,
          padding: "12px 12px 16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: "999px",
            border: "1px solid rgba(148,163,184,0.8)",
            background: "rgba(15,23,42,0.9)",
            color: "#f9fafb",
            fontSize: 16,
            lineHeight: "28px",
            textAlign: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ✕
        </button>

        <div
          style={{
            width: "100%",
            flex: "1 1 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          <img
            src={src}
            alt={title || "Profile"}
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {title && (
          <div
            style={{
              width: "100%",
              textAlign: "center",
              color: "#e5e7eb",
              fontSize: 14,
              marginTop: 4,
              wordWrap: "break-word",
            }}
          >
            {title}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- main page ---------- */
export default function Addfevlist() {
  const [form, setForm] = useState({
    actress_name: "",
    dob: "",
    best_movie: "",
    best_thing: "",
    country_name: "",
  });
  const [profilePreview, setProfilePreview] = useState("");
  const [profileBase64, setProfileBase64] = useState("");

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [page, setPage] = useState(0);
  const [downloadType, setDownloadType] = useState("pdf");

  const [overlay, setOverlay] = useState({ open: false, label: "" });
  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
  });
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    actress_name: "",
    dob: "",
    best_movie: "",
    best_thing: "",
    country_name: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [imageModal, setImageModal] = useState({
    open: false,
    src: "",
    title: "",
  });

  const showOverlay = (label) => setOverlay({ open: true, label });
  const hideOverlay = () => setOverlay({ open: false, label: "" });

  const showPopup = (title, message, tone = "info") =>
    setPopup({ open: true, title, message, tone });
  const closePopup = () =>
    setPopup((p) => ({ ...p, open: false }));

  /* ----- load list ----- */
  const loadList = async () => {
    try {
      setLoadingList(true);
      setErrorMsg("");
      showOverlay("Loading actress list…");
      const data = await safeFetchJSON(API.list);
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
      setPage(0);
    } catch (e) {
      setErrorMsg(e.message || "Failed to load list");
      showPopup("Error", e.message || "Failed to load list", "danger");
    } finally {
      setLoadingList(false);
      hideOverlay();
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  /* ----- image handling (add form) ----- */
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setProfilePreview(dataUrl);
      setProfileBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /* ----- form submit (create) ----- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.actress_name.trim()) {
      setErrorMsg("Please enter actress name.");
      return;
    }

    const body = {
      actress_name: normalizeName(form.actress_name),
      dob: form.dob || null,
      best_movie: form.best_movie || null,
      best_thing: form.best_thing || null,
      country_name: form.country_name || null,
      profile_image_base64: profileBase64 || null,
    };

    try {
      setSubmitting(true);
      showOverlay("Saving new actress…");
      await safeFetchJSON(API.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSuccessMsg("Actress added successfully.");
      showPopup("Success", "Actress added successfully.", "success");
      setForm((f) => ({
        actress_name: "",
        dob: "",
        best_movie: "",
        best_thing: "",
        country_name: f.country_name,
      }));
      setProfilePreview("");
      setProfileBase64("");
      await loadList();
    } catch (e2) {
      setErrorMsg(e2.message || "Failed to add actress");
      showPopup("Error", e2.message || "Failed to add actress", "danger");
    } finally {
      setSubmitting(false);
      hideOverlay();
    }
  };

  /* ----- pagination ----- */
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const current = list.slice(start, start + PAGE_SIZE);

  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  /* ----- download ----- */
  const handleDownload = () => {
    const url = downloadType === "pdf" ? API.exportPdf : API.exportTxt;
    window.open(url, "_blank");
  };

  /* ----- edit / update handlers ----- */
  const handleOpenEdit = (row) => {
    setEditItem(row);
    setEditForm({
      actress_name: row.actress_name || "",
      dob: toDateInputValue(row.dob),
      best_movie: row.best_movie || "",
      best_thing: row.best_thing || "",
      country_name: row.country_name || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!editForm.actress_name.trim()) {
      showPopup("Validation", "Please enter actress name.", "danger");
      return;
    }

    const body = {
      actress_name: normalizeName(editForm.actress_name),
      dob: editForm.dob || null,
      best_movie: editForm.best_movie || null,
      best_thing: editForm.best_thing || null,
      country_name: editForm.country_name || null,
    };

    try {
      setSavingEdit(true);
      showOverlay("Updating actress details…");
      await safeFetchJSON(API.update(editItem.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      showPopup("Updated", "Actress details updated successfully.", "success");
      setEditItem(null);
      await loadList();
    } catch (e) {
      showPopup("Error", e.message || "Failed to update actress", "danger");
    } finally {
      setSavingEdit(false);
      hideOverlay();
    }
  };

  /* ----- delete handlers ----- */
  const handleConfirmDelete = async () => {
    if (!confirmDeleteFor) return;
    try {
      showOverlay("Deleting actress…");
      await safeFetchJSON(API.delete(confirmDeleteFor.id), {
        method: "DELETE",
      });
      showPopup("Deleted", "Actress deleted from list.", "success");
      setConfirmDeleteFor(null);
      await loadList();
    } catch (e) {
      showPopup("Error", e.message || "Failed to delete actress", "danger");
    } finally {
      hideOverlay();
    }
  };

  const getProfileImageUrl = (row) => {
    if (!row.profile_image_path) return "";
    if (row.profile_image_path.startsWith("http")) return row.profile_image_path;
    return `${BASE}${row.profile_image_path}`;
  };

  const openImageModal = (src, title) => {
    setImageModal({ open: true, src, title: title || "" });
  };

  const closeImageModal = () => {
    setImageModal({ open: false, src: "", title: "" });
  };

  return (
    <div
      className="min-vh-100 py-3 py-md-4"
      style={{
        background:
          "linear-gradient(135deg, #ffe5c8 0%, #ffd1e3 40%, #c8f5ff 100%)",
        fontFamily: "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="mb-3 text-center">
          <h3
            className="fw-bold mb-1"
            style={{ color: "#ff4c6a", letterSpacing: "0.03em" }}
          >
            Favourite Actress List
          </h3>
          <p className="mb-0" style={{ color: "#555", fontSize: 14 }}>
            Add your favourites, see them in order, update or delete, and export a beautiful list.
          </p>
        </div>

        {/* add form card */}
        <div
          className="card shadow border-0 mb-4"
          style={{
            borderRadius: 18,
            overflow: "hidden",
            animation: "afl-fade-in 0.5s ease-out",
          }}
        >
          <div
            className="card-header border-0 py-2"
            style={{
              background:
                "linear-gradient(90deg, #ff9f68 0%, #ff4c6a 100%)",
              color: "#fff",
            }}
          >
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="fw-semibold">Add Favourite Actress</span>
              <span className="badge rounded-pill bg-light text-dark">
                Total: {list.length}
              </span>
            </div>
          </div>
          <div
            className="card-body"
            style={{ background: "rgba(255,255,255,0.9)" }}
          >
            <form onSubmit={onSubmit}>
              <div className="row g-3">
                {/* left: text fields */}
                <div className="col-12 col-md-7">
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">
                      Actress Name <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Type actress name"
                      value={form.actress_name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          actress_name: e.target.value,
                        }))
                      }
                    />
                    <div className="form-text">
                      First letter of each word will be capitalised automatically.
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        DOB (optional)
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={form.dob}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, dob: e.target.value }))
                        }
                      />
                      <div className="form-text">
                        Will display like <b>2 Oct 2025</b>.
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        Country (optional)
                      </label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Country name"
                        value={form.country_name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            country_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="form-label small fw-semibold">
                      Best Movie / Series (optional)
                    </label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Best movie or series name"
                      value={form.best_movie}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          best_movie: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="mt-2">
                    <label className="form-label small fw-semibold">
                      Best Thing / Notes (optional)
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="What do you like most about her?"
                      value={form.best_thing}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          best_thing: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* right: image upload */}
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold">
                    Profile Image (optional)
                  </label>
                  <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    className="border border-2 rounded-3 d-flex flex-column align-items-center justify-content-center p-2 text-center"
                    style={{
                      minHeight: 160,
                      borderStyle: "dashed",
                      background:
                        "linear-gradient(135deg, #fff7e6 0%, #ffeaf3 100%)",
                      transition: "box-shadow 0.2s, transform 0.2s",
                    }}
                  >
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="preview"
                        className="rounded-3 mb-2"
                        style={{
                          maxWidth: "100%",
                          maxHeight: 140,
                          objectFit: "contain",
                          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                        }}
                      />
                    ) : (
                      <div className="mb-2 small" style={{ color: "#777" }}>
                        Drag &amp; drop image here, or pick file.
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control form-control-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                      }}
                    />
                  </div>
                  <div className="form-text">
                    Image is saved directly to database (binary).
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-sm text-white px-4 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(90deg, #ff9f68 0%, #ff4c6a 100%)",
                    border: "none",
                  }}
                >
                  {submitting ? "Saving..." : "Add to List"}
                </button>

                {successMsg && (
                  <span
                    className="small fw-semibold"
                    style={{ color: "#26a269" }}
                  >
                    {successMsg}
                  </span>
                )}
                {errorMsg && (
                  <span
                    className="small fw-semibold"
                    style={{ color: "#c01c28" }}
                  >
                    {errorMsg}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* download & controls */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <div className="d-flex align-items-center gap-2">
            <span className="small fw-semibold" style={{ color: "#555" }}>
              Export as:
            </span>
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={
                  "btn " +
                  (downloadType === "pdf"
                    ? "text-white"
                    : "btn-outline-light text-dark")
                }
                style={{
                  background:
                    downloadType === "pdf"
                      ? "#ff4c6a"
                      : "rgba(255,255,255,0.9)",
                  borderColor: "#ff4c6a",
                }}
                onClick={() => setDownloadType("pdf")}
              >
                PDF
              </button>
              <button
                type="button"
                className={
                  "btn " +
                  (downloadType === "txt"
                    ? "text-white"
                    : "btn-outline-light text-dark")
                }
                style={{
                  background:
                    downloadType === "txt"
                      ? "#ff9f68"
                      : "rgba(255,255,255,0.9)",
                  borderColor: "#ff9f68",
                }}
                onClick={() => setDownloadType("txt")}
              >
                Text
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm text-white ms-1 shadow-sm"
              style={{
                background:
                  "linear-gradient(90deg, #20c997 0%, #12a4d9 100%)",
                border: "none",
              }}
              onClick={handleDownload}
            >
              Download List
            </button>
          </div>

          <div className="small" style={{ color: "#555" }}>
            Showing{" "}
            <strong>
              {list.length === 0 ? 0 : start + 1}-
              {Math.min(start + PAGE_SIZE, list.length)}
            </strong>{" "}
            of <strong>{list.length}</strong>
          </div>
        </div>

        {/* list card */}
        <div
          className="card shadow border-0"
          style={{ borderRadius: 18, overflow: "hidden" }}
        >
          <div
            className="card-header border-0 py-2"
            style={{
              background:
                "linear-gradient(90deg, #20c997 0%, #12a4d9 100%)",
              color: "#fff",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Actress List</span>
              <span className="small">
                Page {page + 1} / {totalPages}
              </span>
            </div>
          </div>
          <div
            className="card-body p-0"
            style={{ background: "rgba(255,255,255,0.97)" }}
          >
            {loadingList ? (
              <div className="py-4 text-center text-muted">
                <div
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  style={{ color: "#ff4c6a" }}
                />
                Loading list…
              </div>
            ) : current.length === 0 ? (
              <div className="py-4 text-center text-muted">
                No actresses added yet.
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {current.map((row) => {
                  const imgUrl = getProfileImageUrl(row);
                  return (
                    <div
                      key={row.id}
                      className="list-group-item border-0 afl-actress-card"
                      style={{
                        margin: "10px 12px",
                        borderRadius: 12,
                        padding: "14px 12px 16px",
                        background: "#ffffff",
                        animation: "afl-fade-in-up 0.3s ease-out",
                      }}
                    >
                      <div className="d-flex flex-column align-items-center text-center gap-3">
                        <div
                          className="rounded-pill px-3 py-1 small fw-bold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, #ff9f68 0%, #ff4c6a 100%)",
                          }}
                        >
                          {row.seq ?? "-"}
                        </div>

                        {imgUrl && (
                          <div
                            className="afl-profile-img-wrapper"
                            style={{
                              width: "100%",
                              maxWidth: 260,
                              borderRadius: 12,
                              overflow: "hidden",
                              border: "1px solid #e5e7eb",
                              background: "#f9fafb",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              openImageModal(imgUrl, row.actress_name)
                            }
                          >
                            <img
                              src={imgUrl}
                              alt={row.actress_name || "Actress profile"}
                              loading="lazy"
                              className="afl-profile-img"
                            />
                          </div>
                        )}

                        <div style={{ maxWidth: 480 }}>
                          <div
                            className="fw-semibold"
                            style={{ color: "#111827", fontSize: 16 }}
                          >
                            {row.actress_name || "Unknown"}
                          </div>
                          <div className="small" style={{ color: "#6b7280" }}>
                            {row.country_name && (
                              <span className="me-2">
                                🌎 {row.country_name}
                              </span>
                            )}
                            {row.dob && <span>🎂 {row.dob}</span>}
                          </div>

                          {row.best_movie && (
                            <div className="small mt-2">
                              <span
                                className="badge rounded-pill me-1"
                                style={{
                                  backgroundColor: "#fff4d5",
                                  color: "#92400e",
                                }}
                              >
                                Best Movie / Series
                              </span>
                              <span style={{ color: "#374151" }}>
                                {row.best_movie}
                              </span>
                            </div>
                          )}

                          {row.best_thing && (
                            <div className="small mt-2">
                              <span
                                className="badge rounded-pill me-1"
                                style={{
                                  backgroundColor: "#ffece0",
                                  color: "#c05621",
                                }}
                              >
                                Best Thing
                              </span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "#f97316",
                                }}
                              >
                                {row.best_thing}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="d-flex flex-wrap gap-2 mt-1 justify-content-center">
                          <button
                            type="button"
                            className="btn btn-sm text-white px-3"
                            style={{
                              background:
                                "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
                              border: "none",
                              fontSize: 12,
                            }}
                            onClick={() => handleOpenEdit(row)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm text-white px-3"
                            style={{
                              background:
                                "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                              border: "none",
                              fontSize: 12,
                            }}
                            onClick={() => setConfirmDeleteFor(row)}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="card-footer border-0 d-flex justify-content-between align-items-center py-2"
            style={{ background: "rgba(255,255,255,0.95)" }}
          >
            <button
              type="button"
              className="btn btn-sm text-white px-3"
              style={{
                background:
                  "linear-gradient(135deg, #c0c0c0 0%, #9b9b9b 100%)",
                border: "none",
                opacity: canPrev ? 1 : 0.6,
              }}
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ◀ Prev
            </button>
            <span className="small" style={{ color: "#555" }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm text-white px-3"
              style={{
                background:
                  "linear-gradient(135deg, #ff9f68 0%, #ff4c6a 100%)",
                border: "none",
                opacity: canNext ? 1 : 0.6,
              }}
              disabled={!canNext}
              onClick={() => setPage((p) => (canNext ? p + 1 : p))}
            >
              Next ▶
            </button>
          </div>
        </div>
      </div>

      <OverlayLoader open={overlay.open} label={overlay.label} />
      <CenterPopup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        tone={popup.tone}
        onClose={closePopup}
      />
      <ConfirmPopup
        open={!!confirmDeleteFor}
        title="Delete Actress"
        message={
          confirmDeleteFor
            ? `Are you sure you want to delete "${confirmDeleteFor.actress_name}" from your list?`
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteFor(null)}
      />
      <EditModal
        open={!!editItem}
        item={editItem}
        form={editForm}
        onChange={setEditForm}
        onCancel={() => setEditItem(null)}
        onSave={handleSaveEdit}
        saving={savingEdit}
      />
      <ImageLightbox
        open={imageModal.open}
        src={imageModal.src}
        title={imageModal.title}
        onClose={closeImageModal}
      />
    </div>
  );
}

/* inject keyframes + custom styles (always overwrite) */
if (typeof document !== "undefined") {
  const css = `
    @keyframes afl-fade-in {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes afl-fade-in-up {
      0% { opacity: 0; transform: translateY(6px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes afl-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes afl-bar {
      0% { transform: translateX(-10%); }
      100% { transform: translateX(70%); }
    }

    .afl-actress-card {
      border: 1px solid #000;
    }

    /* default desktop/laptop: show full image inside square, no crop */
    .afl-profile-img-wrapper {
      max-width: 260px;
      height: 260px;
      margin-inline: auto;
    }
    .afl-profile-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* mobile view: keep behaviour (auto height, width 100%) */
    @media (max-width: 767.98px) {
      .afl-profile-img-wrapper {
        max-width: 260px;
        height: auto;
        margin-inline: auto;
      }
      .afl-profile-img {
        width: 100%;
        height: auto;
        object-fit: cover;
      }
    }
  `;

  let st = document.getElementById("addfevlist-style");
  if (!st) {
    st = document.createElement("style");
    st.id = "addfevlist-style";
    document.head.appendChild(st);
  }
  st.innerHTML = css;
}
