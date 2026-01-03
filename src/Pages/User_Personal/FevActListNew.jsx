import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

/** ===== FULL API URLS ===== */
const BASE = "https://express-backend-myapp.onrender.com";
const API = {
  LIST: `${BASE}/api/add-list-actress`,
  CREATE: `${BASE}/api/add-list-actress`,
  UPDATE: (id) => `${BASE}/api/add-list-actress/${id}`,
  DELETE: (id) => `${BASE}/api/add-list-actress/${id}`,
  EXPORT_PDF: `${BASE}/api/add-list-actress/export/pdf`,
  EXPORT_TXT: `${BASE}/api/add-list-actress/export/txt`,
};

/** ===== Helpers ===== */
const toDataUrls = async (files) => {
  const arr = [...files];
  const tasks = arr.map(
    (f) =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(f);
      })
  );
  return Promise.all(tasks);
};

const safeText = (v) => (v == null ? "" : String(v).trim());

/** ✅ Same image logic as old page */
const getProfileImageUrlLikeOldPage = (row) => {
  const p =
    row?.profile_image_path ||
    row?.profileImagePath ||
    row?.profile_image_url ||
    row?.profile_image ||
    row?.image_url ||
    row?.image ||
    row?.img ||
    "";

  if (!p) return "";
  const s = String(p).trim();
  if (!s) return "";

  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return `${BASE}${s}`;
  return `${BASE}/${s}`;
};

const normalizeImage = (val) => {
  if (!val) return "";
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return "";
    if (/^data:image\//i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return `${BASE}${s}`;

    // raw base64 (fallback)
    const base64ish = s.length > 80 && /^[A-Za-z0-9+/=\s]+$/.test(s.replace(/\s/g, ""));
    if (base64ish) return `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
  }
  if (typeof val === "object" && val) {
    return (
      normalizeImage(val.src) ||
      normalizeImage(val.url) ||
      normalizeImage(val.image) ||
      normalizeImage(val.base64) ||
      ""
    );
  }
  if (Array.isArray(val)) {
    for (const v of val) {
      const got = normalizeImage(v);
      if (got) return got;
    }
  }
  return "";
};

const extractList = (json) => {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (json.data && Array.isArray(json.data.data)) return json.data.data;
  if (Array.isArray(json.rows)) return json.rows;
  if (json.data && Array.isArray(json.data.rows)) return json.data.rows;
  return [];
};

export default function FevActListNew() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    actress_name: "",
    dob: "",
    best_movie: "",
    best_thing: "",
    country_name: "",
  });

  const [profileBase64, setProfileBase64] = useState("");

  const dzProfile = useRef(null);

  const [imgModal, setImgModal] = useState({ open: false, src: "", name: "" });

  const [toast, setToast] = useState({ show: false, text: "", type: "ok" });
  const toastTimer = useRef(null);

  const [busy, setBusy] = useState(false);

  /** inject CSS */
  useEffect(() => {
    const id = "fev-act-list-new-css-edit-fixed-card-popup-big";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --bg:#F6F9FF; --paper:#FFFFFF; --ink:#0B1220; --muted:rgba(11,18,32,.72);
        --line:rgba(11,18,32,.10); --accent1:#2563EB; --accent2:#7C3AED; --accent3:#06B6D4;
        --danger:#EF4444; --orange:#f97316; --blueDark:#0B3A8A;
      }
      html, body{ width:100%; max-width:100%; overflow-x:hidden; }
      body{
        margin:0;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        background:
          radial-gradient(900px 420px at 15% -10%, rgba(37,99,235,.18), transparent 60%),
          radial-gradient(900px 520px at 85% 0%, rgba(124,58,237,.16), transparent 60%),
          radial-gradient(900px 520px at 55% 120%, rgba(6,182,212,.14), transparent 60%),
          linear-gradient(180deg, var(--bg), #fff);
        color: var(--ink);
      }
      *{ min-width:0; }
      .wrap-anywhere{ overflow-wrap:anywhere; word-break:break-word; }

      .page{ min-height:100dvh; padding: 14px 0 26px; }
      .shell{ width:min(1200px, calc(100vw - 18px)); margin:0 auto; }

      .hero{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom: 12px; }
      .brand{ display:flex; align-items:center; gap:12px; }
      .logo{
        width:46px; height:46px; border-radius:16px;
        background: linear-gradient(135deg, var(--accent1), var(--accent2), var(--accent3));
        color:#fff; display:grid; place-items:center; font-weight:900; letter-spacing:.5px;
        box-shadow:0 18px 45px rgba(0,0,0,.12); flex:0 0 auto;
      }
      .title{ margin:0; font-weight:900; font-size: clamp(20px, 3.6vw, 32px); line-height:1.1; }
      .subtitle{ margin:6px 0 0; color: var(--muted); font-weight:800; font-size:.95rem; }

      .card-pro{ background: var(--paper); border: 1px solid var(--line); border-radius: 18px;
        box-shadow: 0 28px 70px rgba(2, 8, 23, .10); overflow:hidden;
      }
      .card-body-pro{ padding: 14px; }
      @media (min-width: 768px){ .card-body-pro{ padding: 18px; } }

      .divider{ height:1px; background: var(--line); margin: 12px 0; }

      .form-label{ color: rgba(11,18,32,.80); font-weight: 900; font-size: .92rem; letter-spacing: .2px; }
      .form-control{
        background:#fff !important; border:1px solid rgba(11,18,32,.16) !important; color: var(--ink) !important;
        border-radius:12px !important; font-weight:800 !important; box-shadow:none !important;
      }
      .form-control::placeholder{ color: rgba(11,18,32,.45) !important; font-weight:700 !important; }
      .form-control:focus{
        border-color: rgba(37,99,235,.60) !important; box-shadow: 0 0 0 .22rem rgba(37,99,235,.18) !important;
      }

      .btn-pro{ border-radius:12px !important; font-weight:900 !important; letter-spacing:.2px; white-space: normal !important; }
      .btn-ghost{ background:#fff !important; border:1px solid rgba(11,18,32,.18) !important; color: var(--ink) !important; }
      .btn-ghost:hover{ background: rgba(37,99,235,.06) !important; border-color: rgba(37,99,235,.30) !important; }
      .btn-primary-grad{
        background: linear-gradient(90deg, var(--accent1), var(--accent2), var(--accent3)) !important;
        border:none !important; color:#fff !important; box-shadow: 0 18px 45px rgba(37,99,235,.16);
      }
      .btn-danger-soft{
        background: rgba(239,68,68,.10) !important; border: 1px solid rgba(239,68,68,.30) !important;
        color: #991B1B !important; font-weight: 900 !important;
      }
      .btn-edit-soft{
        background: rgba(37,99,235,.10) !important;
        border: 1px solid rgba(37,99,235,.35) !important;
        color: #1E3A8A !important;
        font-weight: 900 !important;
      }

      .dropzone{
        border: 2px dashed rgba(37,99,235,.55);
        background: linear-gradient(180deg, rgba(37,99,235,.06), rgba(124,58,237,.04));
        padding: 14px; border-radius: 14px; text-align:center; transition: all .18s ease;
      }
      .dropzone.dragover{ background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.65); box-shadow: 0 0 0 4px rgba(34,197,94,.10); }
      .hint{ color: rgba(11,18,32,.65); font-weight: 800; font-size: .86rem; margin-top: 6px; }

      .img-card{
        background:#fff; border:1px solid rgba(11,18,32,.10); border-radius:16px; overflow:hidden;
        box-shadow: 0 18px 40px rgba(2,8,23,.08); height:100%;
      }

      .card-head-name{
        padding: 12px 14px;
        border-bottom: 1px solid rgba(11,18,32,.08);
        background: linear-gradient(180deg, rgba(37,99,235,.06), rgba(255,255,255,.0));
        font-weight: 900;
        font-size: 1.05rem;
      }

      /* ✅ LIST: little increase image size */
      .img-wrap{
        width:100%;
        height: clamp(240px, 34vw, 360px); /* ✅ little bigger */
        background: rgba(11,18,32,.03);
        display:flex; align-items:center; justify-content:center;
        overflow:hidden;
        cursor:pointer;
        padding: 10px;
      }
      .img-fit{
        width:100%;
        height:100%;
        object-fit: contain;
        display:block;
      }

      .img-thumb{
        width: 72px; height: 72px; border-radius: 12px; border: 1px solid rgba(11,18,32,.10);
        object-fit: contain; background: rgba(11,18,32,.03); padding: 6px;
      }

      .best-thing{ color: var(--orange); font-weight: 900; }
      .best-movie{ color: var(--blueDark); font-weight: 900; }

      /* ✅ POPUP: image bigger + actress name only after image end */
      .modal-backdrop-pro{
        position:fixed; inset:0; background: rgba(2, 8, 23, .38); z-index: 3000;
        display:flex; align-items:center; justify-content:center; padding: 14px;
      }
      .modal-card-pro{
        width: min(980px, calc(100vw - 20px));  /* ✅ bigger */
        background:#fff; border-radius: 18px;
        border: 1px solid rgba(11,18,32,.12);
        box-shadow: 0 28px 80px rgba(2,8,23,.28);
        overflow:hidden; position:relative;
      }
      .modal-close{
        position:absolute; top: 10px; right: 10px; width: 36px; height: 36px; border-radius: 999px;
        border: 1px solid rgba(11,18,32,.14); background: rgba(255,255,255,.92);
        display:grid; place-items:center; cursor:pointer; font-weight: 900; line-height: 1; z-index: 2;
      }
      .modal-img-area{
        width: 100%;
        height: min(78vh, 640px);              /* ✅ fixed bigger height */
        background: rgba(11,18,32,.03);
        display:flex; align-items:center; justify-content:center;
        padding: 14px;
      }
      .modal-img{
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;                   /* ✅ full image show */
        display:block;
      }
      .modal-name{
        padding: 12px 14px 14px;              /* ✅ always AFTER image */
        font-weight: 900;
        color: var(--ink);
        text-align:center;
        border-top: 1px solid rgba(11,18,32,.10);
        background: #fff;
      }

      .busy{
        position:fixed; inset:0; background: rgba(2, 8, 23, .20); z-index: 9999;
        display:flex; align-items:center; justify-content:center; padding: 18px;
      }
      .busy-card{
        background:#fff; border:1px solid rgba(11,18,32,.12); border-radius:16px; padding: 14px 16px;
        display:flex; align-items:center; gap: 10px; box-shadow: 0 26px 70px rgba(2, 8, 23, .20); font-weight: 900;
      }

      .toast-center{
        position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        z-index: 5000; background: #fff; border-radius: 14px; border: 1px solid rgba(11,18,32,.12);
        box-shadow: 0 28px 80px rgba(2,8,23,.20); padding: .75rem 1rem;
        min-width: 220px; max-width: calc(100vw - 24px); text-align: center; font-weight: 900;
      }
      .toast-ok{ border-left: 6px solid #22C55E; }
      .toast-err{ border-left: 6px solid var(--danger); }
    `;
    document.head.appendChild(s);
  }, []);

  const showToast = (text, type = "ok", ms = 1600) => {
    setToast({ show: true, text, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast({ show: false, text: "", type: "ok" }),
      ms
    );
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await fetch(API.LIST);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok) throw new Error(json?.message || text || `Failed (${res.status})`);
      setItems(extractList(json));
    } catch (e) {
      showToast(e.message || "List load failed", "err");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) =>
      JSON.stringify(it || {}).toLowerCase().includes(qq)
    );
  }, [items, q]);

  const onProfileDrop = async (e) => {
    e.preventDefault();
    dzProfile.current?.classList.remove("dragover");
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const [src] = await toDataUrls([file]);
    setProfileBase64(src);
  };

  const onProfilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const [src] = await toDataUrls([file]);
    setProfileBase64(src);
    e.target.value = "";
  };

  const openImg = (src, name) => {
    const fixed = normalizeImage(src);
    if (!fixed) return;
    setImgModal({ open: true, src: fixed, name: name || "" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      actress_name: "",
      dob: "",
      best_movie: "",
      best_thing: "",
      country_name: "",
    });
    setProfileBase64("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const actress_name = safeText(form.actress_name);
    if (!actress_name) return showToast("Actress name required", "err");

    const payload = {
      actress_name,
      dob: form.dob || null,
      best_movie: safeText(form.best_movie) || null,
      best_thing: safeText(form.best_thing) || null,
      country_name: safeText(form.country_name) || null,
      ...(profileBase64 ? { profile_image_base64: profileBase64 } : {}),
    };

    setBusy(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? API.UPDATE(editingId) : API.CREATE;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok)
        throw new Error(
          json?.message ||
            text ||
            `${isEdit ? "Update" : "Create"} failed (${res.status})`
        );

      showToast(isEdit ? "Updated ✅" : "Actress Added ✅", "ok");
      resetForm();
      await loadList();
    } catch (e2) {
      showToast(e2.message || "Save failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (it) => {
    const id = it?.id || it?._id;
    if (!id) return showToast("Missing id", "err");

    setBusy(true);
    try {
      const res = await fetch(API.DELETE(id), { method: "DELETE" });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok)
        throw new Error(json?.message || text || `Delete failed (${res.status})`);

      showToast("Deleted ✅", "ok");
      await loadList();

      if (editingId && String(editingId) === String(id)) resetForm();
    } catch (e) {
      showToast(e.message || "Delete failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const onEdit = (it) => {
    const id = it?.id || it?._id;
    if (!id) return showToast("Missing id", "err");

    setEditingId(id);
    setForm({
      actress_name: it?.actress_name || it?.name || "",
      dob: it?.dob || it?.actress_dob || "",
      best_movie: it?.best_movie || it?.favorite_movie_series || "",
      best_thing: it?.best_thing || "",
      country_name: it?.country_name || "",
    });
    setProfileBase64("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openExport = (url) => window.open(url, "_blank");

  const Field = ({ label, value, kind }) => {
    const v = safeText(value);
    if (!v) return null;
    const cls =
      kind === "thing" ? "best-thing" : kind === "movie" ? "best-movie" : "";
    return (
      <div className="wrap-anywhere" style={{ color: "rgba(11,18,32,.78)", fontWeight: 800 }}>
        <b>{label}:</b> <span className={cls}>{v}</span>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="shell">
        <div className="hero">
          <div className="brand">
            <div className="logo">FA</div>
            <div className="wrap-anywhere">
              <h1 className="title">Fev Actress List (New)</h1>
              <div className="subtitle">✅ Popup image bigger • Name shows only below image</div>
            </div>
          </div>

          <div className="d-none d-sm-block">
            <span
              className="badge rounded-pill"
              style={{
                border: "1px solid rgba(11,18,32,.12)",
                fontWeight: 900,
                background: "rgba(255,255,255,.7)",
              }}
            >
              Professional UI
            </span>
          </div>
        </div>

        {/* ADD / EDIT FORM */}
        <div className="card-pro mb-3">
          <div className="card-body-pro">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h5 className="m-0" style={{ fontWeight: 900 }}>
                {editingId ? "Edit Actress Details" : "Add Actress Details"}
              </h5>

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-pro btn-ghost"
                  onClick={() => openExport(API.EXPORT_PDF)}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="btn btn-pro btn-ghost"
                  onClick={() => openExport(API.EXPORT_TXT)}
                >
                  Download TXT
                </button>
              </div>
            </div>

            <div className="divider" />

            <form onSubmit={onSubmit}>
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label">Actress Name *</label>
                  <input
                    className="form-control"
                    value={form.actress_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, actress_name: e.target.value }))
                    }
                    placeholder="Enter actress name"
                    required
                  />
                </div>

                <div className="col-12 col-md-3">
                  <label className="form-label">DOB</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.dob}
                    onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                  />
                </div>

                <div className="col-12 col-md-3">
                  <label className="form-label">Country</label>
                  <input
                    className="form-control"
                    value={form.country_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, country_name: e.target.value }))
                    }
                    placeholder="Country name"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Best Movie / Series</label>
                  <input
                    className="form-control"
                    value={form.best_movie}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, best_movie: e.target.value }))
                    }
                    placeholder="Movie or series"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Best Thing</label>
                  <input
                    className="form-control"
                    value={form.best_thing}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, best_thing: e.target.value }))
                    }
                    placeholder="Your best thing"
                  />
                </div>
              </div>

              <div className="divider" />

              {/* Only Profile Image */}
              <div className="row g-3 align-items-start">
                <div className="col-12 col-lg-6">
                  <label className="form-label">
                    Profile Image (Drag & Drop)
                    {editingId ? " - optional (pick only if you want change)" : ""}
                  </label>

                  <div
                    ref={dzProfile}
                    className="dropzone"
                    onDrop={onProfileDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      dzProfile.current?.classList.add("dragover");
                    }}
                    onDragLeave={() => dzProfile.current?.classList.remove("dragover")}
                  >
                    <div style={{ fontWeight: 900 }} className="wrap-anywhere">
                      Drag & drop profile image here
                    </div>
                    <div className="hint">or select file</div>

                    <label className="btn btn-pro btn-ghost mt-2">
                      Select Profile
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={onProfilePick}
                      />
                    </label>

                    {profileBase64 ? (
                      <div className="mt-3 d-flex align-items-center gap-2">
                        <img
                          src={normalizeImage(profileBase64)}
                          alt="profile"
                          className="img-thumb"
                          onClick={() =>
                            openImg(profileBase64, form.actress_name || "Actress")
                          }
                          style={{ cursor: "pointer" }}
                        />
                        <div
                          className="wrap-anywhere"
                          style={{ fontWeight: 900, color: "rgba(11,18,32,.8)" }}
                        >
                          Click image to view
                        </div>
                        <button
                          type="button"
                          className="btn btn-pro btn-danger-soft btn-sm ms-auto"
                          onClick={() => setProfileBase64("")}
                        >
                          Remove
                        </button>
                      </div>
                    ) : editingId ? (
                      <div className="hint mt-2">
                        (Edit mode) Image remains same if you don’t select new.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-pro btn-ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      actress_name: "",
                      dob: "",
                      best_movie: "",
                      best_thing: "",
                      country_name: "",
                    });
                    setProfileBase64("");
                  }}
                >
                  {editingId ? "Cancel Edit" : "Reset"}
                </button>

                <button
                  type="submit"
                  className="btn btn-pro btn-primary-grad px-4"
                  disabled={busy}
                >
                  {busy ? "Saving..." : editingId ? "Update Actress" : "Save Actress"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* LIST */}
        <div className="card-pro">
          <div className="card-body-pro">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h5 className="m-0" style={{ fontWeight: 900 }}>
                Actress List
              </h5>

              <div
                className="d-flex flex-wrap gap-2"
                style={{ minWidth: "min(520px, 100%)" }}
              >
                <input
                  className="form-control"
                  placeholder="Search anything…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button
                  className="btn btn-pro btn-ghost"
                  type="button"
                  onClick={loadList}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="divider" />

            {loading ? (
              <div
                className="text-center py-4"
                style={{ fontWeight: 900, color: "rgba(11,18,32,.75)" }}
              >
                <span className="spinner-border spinner-border-sm me-2" />
                Loading list…
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="text-center py-4"
                style={{ fontWeight: 900, color: "rgba(11,18,32,.65)" }}
              >
                No records found
              </div>
            ) : (
              <div className="row g-3">
                {filtered.map((it, idx) => {
                  const id = it?.id || it?._id || idx;
                  const name = it?.actress_name || it?.name || "Actress";

                  const profile =
                    getProfileImageUrlLikeOldPage(it) ||
                    normalizeImage(it?.profile_image_base64) ||
                    normalizeImage(it?.profile_image_raw) ||
                    "";

                  return (
                    <div key={id} className="col-12 col-md-6 col-xl-4">
                      <div className="img-card">
                        <div className="card-head-name wrap-anywhere">
                          {idx + 1}. {name}
                        </div>

                        <div
                          className="img-wrap"
                          onClick={() => profile && openImg(profile, name)}
                          title={profile ? "Click to open" : ""}
                        >
                          {profile ? (
                            <img src={profile} alt={name} className="img-fit" />
                          ) : (
                            <div
                              className="wrap-anywhere"
                              style={{
                                fontWeight: 900,
                                color: "rgba(11,18,32,.55)",
                              }}
                            >
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <div className="small">
                            {it?.dob || it?.actress_dob ? (
                              <Field label="DOB" value={it?.dob || it?.actress_dob} />
                            ) : null}
                            {it?.country_name ? (
                              <Field label="Country" value={it?.country_name} />
                            ) : null}
                            {it?.best_movie || it?.favorite_movie_series ? (
                              <Field
                                label="Best Movie / Series"
                                value={it?.best_movie || it?.favorite_movie_series}
                                kind="movie"
                              />
                            ) : null}
                            {it?.best_thing ? (
                              <Field label="Best Thing" value={it?.best_thing} kind="thing" />
                            ) : null}
                          </div>

                          <div className="divider" />

                          <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-pro btn-edit-soft"
                              onClick={() => {
                                const editId = it?.id || it?._id;
                                if (!editId) return showToast("Missing id", "err");
                                setEditingId(editId);
                                setForm({
                                  actress_name: it?.actress_name || it?.name || "",
                                  dob: it?.dob || it?.actress_dob || "",
                                  best_movie: it?.best_movie || it?.favorite_movie_series || "",
                                  best_thing: it?.best_thing || "",
                                  country_name: it?.country_name || "",
                                });
                                setProfileBase64("");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              disabled={busy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-pro btn-danger-soft"
                              onClick={() => onDelete(it)}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imgModal.open && (
        <div
          className="modal-backdrop-pro"
          role="dialog"
          aria-modal="true"
          onClick={() => setImgModal({ open: false, src: "", name: "" })}
        >
          <div className="modal-card-pro" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-close"
              title="Close"
              onClick={() => setImgModal({ open: false, src: "", name: "" })}
            >
              ✕
            </div>

            {/* ✅ image first */}
            <div className="modal-img-area">
              <img className="modal-img" src={imgModal.src} alt={imgModal.name} />
            </div>

            {/* ✅ name ONLY after image end (below) */}
            <div className="modal-name wrap-anywhere">{imgModal.name}</div>
          </div>
        </div>
      )}

      {busy && (
        <div className="busy">
          <div className="busy-card">
            <span className="spinner-border spinner-border-sm" />
            Processing…
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`toast-center ${toast.type === "err" ? "toast-err" : "toast-ok"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
