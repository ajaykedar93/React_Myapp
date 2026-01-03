import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE = "https://express-backend-myapp.onrender.com";
const API = {
  countries: `${BASE}/api/act_favorite/countries`,
  create: `${BASE}/api/act_favorite/user-act-favorite`,
  list: `${BASE}/api/act_favorite/user-act-favorite`,
};

// Convert selected files → Base64 strings
const toDataUrls = async (files) => {
  const tasks = [...files].map(
    (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      })
  );
  return Promise.all(tasks);
};

const isUrl = (s) => /^https?:\/\/|^data:image\//i.test(s || "");

const safeUUID = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Math.random().toString(36).slice(2)}`;
  }
};

export default function AddFevActress() {
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [manualCountry, setManualCountry] = useState("");

  const [form, setForm] = useState({
    favorite_actress_name: "",
    age: "",
    actress_dob: "",
    favorite_movie_series: "",
    notes: "",
  });

  // Profile image: drag/drop OR URL
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileBase64, setProfileBase64] = useState(null);
  const [profileUrl, setProfileUrl] = useState("");

  // Gallery images: drag/drop OR multiple URLs
  const [dropFiles, setDropFiles] = useState([]); // [{id, src}]
  const [imagesToAdd, setImagesToAdd] = useState([]); // array of base64 or URLs
  const [galleryUrls, setGalleryUrls] = useState(""); // textarea (one per line)

  const [busy, setBusy] = useState(false);
  const [centerPopup, setCenterPopup] = useState({
    show: false,
    title: "",
    body: "",
    type: "info",
  });

  const dzProfile = useRef(null);
  const dzGallery = useRef(null);

  /* ---------- Styles (once) ---------- */
  useEffect(() => {
    const id = "addfav-actress-bright-pro-v1";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{
        --bg: #F6F9FF;
        --paper: #FFFFFF;
        --ink: #0B1220;
        --muted: rgba(11,18,32,.70);
        --line: rgba(11,18,32,.10);

        --accent1:#2563EB;
        --accent2:#7C3AED;
        --accent3:#06B6D4;
        --accent4:#22C55E;

        --danger:#EF4444;
      }

      html, body { width:100%; max-width:100%; overflow-x:hidden; }
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

      .page{
        min-height: 100dvh;
        display:flex;
        align-items:center;
        padding: 18px 0;
      }
      .shell{
        width: min(980px, calc(100vw - 18px));
        margin: 0 auto;
      }

      /* Header */
      .hero{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        margin-bottom: 14px;
      }
      .brand{
        display:flex;
        align-items:center;
        gap:12px;
      }
      .logo{
        width:46px; height:46px;
        border-radius:16px;
        background: linear-gradient(135deg, var(--accent1), var(--accent2), var(--accent3));
        color:#fff;
        display:grid;
        place-items:center;
        font-weight:900;
        letter-spacing:.5px;
        box-shadow: 0 20px 45px rgba(0,0,0,.14);
      }
      .title{
        margin:0;
        font-weight:900;
        font-size: clamp(20px, 3.8vw, 32px);
        line-height: 1.1;
        color: var(--ink);
      }
      .subtitle{
        margin: 6px 0 0;
        color: var(--muted);
        font-size: .95rem;
        font-weight: 700;
      }
      .badge-soft{
        border:1px solid var(--line);
        color: rgba(11,18,32,.75);
        padding: .42rem .7rem;
        border-radius: 999px;
        background: rgba(255,255,255,.70);
        font-weight: 800;
        font-size: .80rem;
        backdrop-filter: blur(6px);
      }

      /* Card */
      .card-pro{
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: 0 28px 70px rgba(2, 8, 23, .10);
        overflow:hidden;
      }
      .card-body-pro{
        padding: 14px;
      }
      @media (min-width: 768px){
        .card-body-pro{ padding: 18px; }
      }

      .divider{
        height:1px;
        background: var(--line);
        margin: 12px 0;
      }

      .form-label{
        color: rgba(11,18,32,.78);
        font-weight: 900;
        font-size: .92rem;
        letter-spacing: .2px;
      }

      /* Inputs (black text bold) */
      .form-control, .form-select, textarea.form-control{
        background: #fff !important;
        border: 1px solid rgba(11,18,32,.16) !important;
        color: var(--ink) !important;
        border-radius: 12px !important;
        box-shadow: none !important;
        font-weight: 800 !important;
      }
      .form-control::placeholder, textarea::placeholder{
        color: rgba(11,18,32,.45) !important;
        font-weight: 700 !important;
      }
      .form-control:focus, .form-select:focus, textarea.form-control:focus{
        border-color: rgba(37,99,235,.60) !important;
        box-shadow: 0 0 0 .22rem rgba(37,99,235,.18) !important;
      }

      /* Dropzone */
      .dropzone{
        border: 2px dashed rgba(37,99,235,.55);
        background: linear-gradient(180deg, rgba(37,99,235,.06), rgba(124,58,237,.04));
        padding: 14px;
        border-radius: 14px;
        text-align:center;
        transition: all .18s ease;
      }
      .dropzone.dragover{
        background: rgba(34,197,94,.10);
        border-color: rgba(34,197,94,.65);
        box-shadow: 0 0 0 4px rgba(34,197,94,.10);
      }

      .muted-hint{
        color: rgba(11,18,32,.65);
        font-size: .86rem;
        margin-top: 6px;
        font-weight: 700;
      }

      /* Buttons */
      .btn-pro{
        border-radius: 12px !important;
        font-weight: 900 !important;
        letter-spacing: .2px;
      }
      .btn-ghost{
        background: #fff !important;
        border: 1px solid rgba(11,18,32,.18) !important;
        color: var(--ink) !important;
      }
      .btn-ghost:hover{
        background: rgba(37,99,235,.06) !important;
        border-color: rgba(37,99,235,.30) !important;
      }

      .btn-primary-grad{
        background: linear-gradient(90deg, var(--accent1), var(--accent2), var(--accent3)) !important;
        border: none !important;
        color: #fff !important;
        box-shadow: 0 18px 45px rgba(37,99,235,.18);
      }
      .btn-primary-grad:hover{ opacity:.95; }

      .btn-danger-soft{
        background: rgba(239,68,68,.10) !important;
        border: 1px solid rgba(239,68,68,.30) !important;
        color: #991B1B !important;
        font-weight: 900 !important;
      }
      .btn-danger-soft:hover{ background: rgba(239,68,68,.14) !important; }

      /* Preview images */
      .profile-preview{
        width: clamp(120px, 26vw, 190px);
        height: clamp(120px, 26vw, 190px);
        border-radius: 14px;
        border: 1px solid rgba(11,18,32,.12);
        object-fit: cover;
        background: rgba(11,18,32,.03);
      }

      .thumb{
        width: 92px;
        height: 92px;
        border-radius: 12px;
        border: 1px solid rgba(11,18,32,.12);
        object-fit: cover;
        background: rgba(11,18,32,.03);
      }
      .thumb-grid{
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
        gap: 10px;
      }

      /* Popup */
      .center-backdrop{
        position:fixed; inset:0;
        background: rgba(2, 8, 23, .35);
        display:grid; place-items:center;
        z-index: 2200;
        padding: 14px;
      }
      .center-card{
        width: min(460px, calc(100vw - 22px));
        background: #fff;
        border: 1px solid rgba(11,18,32,.12);
        border-radius: 16px;
        box-shadow: 0 26px 70px rgba(2, 8, 23, .20);
        color: var(--ink);
      }

      /* Busy overlay */
      .busy{
        position:fixed; inset:0;
        background: rgba(2, 8, 23, .20);
        z-index: 9999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding: 18px;
      }
      .busy-card{
        background: #fff;
        border:1px solid rgba(11,18,32,.12);
        border-radius: 16px;
        padding: 14px 16px;
        display:flex;
        align-items:center;
        gap: 10px;
        box-shadow: 0 26px 70px rgba(2, 8, 23, .20);
      }
    `;
    document.head.appendChild(s);
  }, []);

  /* ---------- Popup helper ---------- */
  const showPopup = (title, body, type = "info", timeout = 2200) => {
    setCenterPopup({ show: true, title, body, type });
    window.clearTimeout(showPopup._t);
    showPopup._t = window.setTimeout(() => {
      setCenterPopup({ show: false, title: "", body: "", type: "info" });
    }, timeout);
  };

  /* ---------- Fetch countries ---------- */
  useEffect(() => {
    const controller = new AbortController();

    const loadCountries = async () => {
      try {
        setLoadingCountries(true);
        setCountriesError("");
        const res = await fetch(`${API.countries}?limit=200`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Countries request failed (${res.status}): ${txt || res.statusText}`);
        }

        const j = await res.json().catch(() => null);

        let list = [];
        if (j && Array.isArray(j.data)) list = j.data;
        else if (Array.isArray(j)) list = j;
        else if (j && Array.isArray(j.countries)) list = j.countries;

        if (!list.length) throw new Error("No countries found in response");
        setCountries(list);
      } catch (e) {
        if (e.name !== "AbortError") {
          setCountriesError(e.message || "Failed to load countries");
          setCountries([]);
        }
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
    return () => controller.abort();
  }, []);

  /* ---------- Profile: drag & drop / pick ---------- */
  const onProfileDrop = async (e) => {
    e.preventDefault();
    dzProfile.current?.classList.remove("dragover");
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const [src] = await toDataUrls([file]);
    setProfilePreview(src);
    setProfileBase64(src);
    setProfileUrl("");
  };

  const onProfilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const [src] = await toDataUrls([file]);
    setProfilePreview(src);
    setProfileBase64(src);
    setProfileUrl("");
    e.target.value = "";
  };

  const applyProfileUrl = (e) => {
    e?.preventDefault?.();
    const clean = (profileUrl || "").trim();
    if (!isUrl(clean)) {
      return showPopup("Invalid URL", "Please enter a valid image URL.", "danger");
    }
    setProfilePreview(clean);
    setProfileBase64(null);
  };

  /* ---------- Gallery: drag & drop / pick ---------- */
  const onGalleryDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dzGallery.current?.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const previews = await toDataUrls(files);
    setDropFiles((prev) => [...prev, ...previews.map((src) => ({ id: safeUUID(), src }))]);
    setImagesToAdd((prev) => [...prev, ...previews]);
  };

  const onGalleryPick = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const previews = await toDataUrls(files);
    setDropFiles((prev) => [...prev, ...previews.map((src) => ({ id: safeUUID(), src }))]);
    setImagesToAdd((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const addGalleryUrls = (e) => {
    e?.preventDefault?.();
    const lines = (galleryUrls || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length && isUrl(l));

    if (!lines.length) {
      return showPopup("No valid URLs", "Paste one image URL per line.", "danger");
    }

    const newThumbs = lines.map((src) => ({ id: safeUUID(), src }));
    setDropFiles((prev) => [...prev, ...newThumbs]);
    setImagesToAdd((prev) => [...prev, ...lines]);
    setGalleryUrls("");
  };

  const removePreview = (id) => {
    const next = dropFiles.filter((p) => p.id !== id);
    setDropFiles(next);
    setImagesToAdd(next.map((p) => p.src));
  };

  /* ---------- Create ---------- */
  const onCreate = async (e) => {
    e?.preventDefault?.();

    const favorite_actress_name = (form.favorite_actress_name || "").trim();
    const favorite_movie_series = (form.favorite_movie_series || "").trim();

    if (!favorite_actress_name || !favorite_movie_series) {
      return showPopup("Missing Fields", "Actress name & movie/series are required.", "danger");
    }

    const payload = {
      favorite_actress_name,
      favorite_movie_series,
      age: form.age ? Number(form.age) : null,
      actress_dob: form.actress_dob || null,
      profile_image: profileBase64 || (profileUrl && isUrl(profileUrl) ? profileUrl.trim() : null),
      notes: form.notes || null,
    };

    if (imagesToAdd.length) payload.images = imagesToAdd;

    if (selectedCountryId) payload.country_id = Number(selectedCountryId);
    else if ((manualCountry || "").trim()) payload.country_name = manualCountry.trim();

    try {
      setBusy(true);
      const res = await fetch(API.create, {
        method: "POST",
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

      if (!res.ok) {
        const msg = (json && (json.message || json.error)) || text || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      if (!json || json.success !== true) {
        throw new Error(json?.message || "Create failed (unexpected response)");
      }

      showPopup("Success", "Actress added successfully.", "success");

      // reset form
      setForm({
        favorite_actress_name: "",
        age: "",
        actress_dob: "",
        favorite_movie_series: "",
        notes: "",
      });
      setProfilePreview(null);
      setProfileBase64(null);
      setProfileUrl("");
      setDropFiles([]);
      setImagesToAdd([]);
      setSelectedCountryId("");
      setManualCountry("");
      setGalleryUrls("");
    } catch (e2) {
      showPopup("Error", e2.message || "Save failed", "danger");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setForm({
      favorite_actress_name: "",
      age: "",
      actress_dob: "",
      favorite_movie_series: "",
      notes: "",
    });
    setProfilePreview(null);
    setProfileBase64(null);
    setProfileUrl("");
    setDropFiles([]);
    setImagesToAdd([]);
    setSelectedCountryId("");
    setManualCountry("");
    setGalleryUrls("");
  };

  return (
    <div className="page">
      <div className="shell">
        {/* Header */}
        <div className="hero">
          <div className="brand">
            <div className="logo">AF</div>
            <div>
              <h1 className="title">Add Favourite Actress</h1>
              <div className="subtitle wrap-anywhere">
                Bright UI • Bold Black Text • Fully responsive • No cut text
              </div>
            </div>
          </div>

          <div className="d-none d-sm-block">
            <span className="badge-soft">Professional Form</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="card-pro">
          <div className="card-body-pro">
            {countriesError ? (
              <div className="alert alert-danger py-2 mb-3">
                <strong>Error:</strong> {countriesError}
              </div>
            ) : null}

            {/* Country */}
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label">Country</label>

                {loadingCountries ? (
                  <div className="d-flex align-items-center gap-2" style={{ color: "rgba(11,18,32,.75)", fontWeight: 800 }}>
                    <span className="spinner-border spinner-border-sm" />
                    Loading countries…
                  </div>
                ) : (
                  <>
                    <select
                      className="form-select"
                      value={selectedCountryId}
                      onChange={(e) => {
                        setSelectedCountryId(e.target.value);
                        setManualCountry("");
                      }}
                    >
                      <option value="">— Choose from list —</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.country_name || c.name || c.title}
                        </option>
                      ))}
                    </select>

                    {!selectedCountryId && (
                      <div className="mt-2">
                        <input
                          className="form-control"
                          placeholder="Or type a new country name"
                          value={manualCountry}
                          onChange={(e) => setManualCountry(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="divider" />

            {/* Actress Info */}
            <form onSubmit={onCreate}>
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label">Actress Name *</label>
                  <input
                    className="form-control"
                    value={form.favorite_actress_name}
                    onChange={(e) => setForm({ ...form, favorite_actress_name: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    min={0}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label">DOB</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.actress_dob}
                    onChange={(e) => setForm({ ...form, actress_dob: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Favorite Movie/Series *</label>
                  <input
                    className="form-control"
                    value={form.favorite_movie_series}
                    onChange={(e) => setForm({ ...form, favorite_movie_series: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Notes</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes…"
                  />
                </div>
              </div>

              <div className="divider" />

              {/* Profile */}
              <div className="row g-3 align-items-start">
                <div className="col-12 col-md-7">
                  <label className="form-label">Profile Image (optional)</label>

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
                    <div className="wrap-anywhere" style={{ fontWeight: 900, color: "#0B1220" }}>
                      Drag &amp; drop image here
                    </div>
                    <div className="muted-hint">or select a file</div>

                    <label className="btn btn-pro btn-ghost mt-2">
                      Select File
                      <input type="file" accept="image/*" hidden onChange={onProfilePick} />
                    </label>
                  </div>

                  <div className="mt-2">
                    <input
                      className="form-control"
                      placeholder="…or paste a profile image URL (https://… or data:image/…)"
                      value={profileUrl}
                      onChange={(e) => setProfileUrl(e.target.value)}
                    />
                    <div className="d-flex justify-content-end mt-2">
                      <button className="btn btn-pro btn-ghost" onClick={applyProfileUrl} type="button">
                        Use URL
                      </button>
                    </div>
                    <div className="muted-hint">Last action wins (URL vs file).</div>
                  </div>
                </div>

                <div className="col-12 col-md-5 d-flex justify-content-md-end">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" className="profile-preview" />
                  ) : (
                    <div
                      className="profile-preview d-flex align-items-center justify-content-center"
                      style={{ color: "rgba(11,18,32,.55)", fontWeight: 900 }}
                    >
                      No Preview
                    </div>
                  )}
                </div>
              </div>

              <div className="divider" />

              {/* Gallery */}
              <div className="mt-1">
                <label className="form-label">Extra Images (optional)</label>

                <div
                  ref={dzGallery}
                  className="dropzone"
                  onDrop={onGalleryDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    dzGallery.current?.classList.add("dragover");
                  }}
                  onDragLeave={() => dzGallery.current?.classList.remove("dragover")}
                >
                  <div className="wrap-anywhere" style={{ fontWeight: 900, color: "#0B1220" }}>
                    Drag &amp; drop multiple images here
                  </div>

                  <label className="btn btn-pro btn-ghost mt-2">
                    Select Files
                    <input type="file" accept="image/*" multiple hidden onChange={onGalleryPick} />
                  </label>

                  {dropFiles.length > 0 && (
                    <>
                      <div className="muted-hint mt-2">{dropFiles.length} image(s) selected</div>
                      <div className="thumb-grid mt-2">
                        {dropFiles.map((p) => (
                          <div key={p.id} className="d-flex flex-column align-items-center gap-2">
                            <img className="thumb" src={p.src} alt="" />
                            <button
                              className="btn btn-pro btn-danger-soft btn-sm"
                              onClick={(ev) => {
                                ev.preventDefault();
                                removePreview(p.id);
                              }}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-2">
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder={"…or paste image URLs (one per line)\nhttps://example.com/a.jpg\nhttps://example.com/b.png"}
                    value={galleryUrls}
                    onChange={(e) => setGalleryUrls(e.target.value)}
                  />
                  <div className="d-flex justify-content-end mt-2">
                    <button className="btn btn-pro btn-ghost" onClick={addGalleryUrls} type="button">
                      Add URLs
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex flex-wrap gap-2 justify-content-end mt-4">
                <button type="button" className="btn btn-pro btn-ghost" onClick={resetAll}>
                  Reset
                </button>
                <button type="submit" className="btn btn-pro btn-primary-grad px-4" disabled={busy}>
                  {busy ? "Saving…" : "Save Actress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Popup */}
      {centerPopup.show && (
        <div
          className="center-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setCenterPopup({ show: false, title: "", body: "", type: "info" })}
        >
          <div className="center-card p-3 text-center" onClick={(e) => e.stopPropagation()}>
            <h5 className="fw-bold mb-1" style={{ color: "#0B1220" }}>
              {centerPopup.title}
            </h5>
            <p className="mb-3" style={{ color: "rgba(11,18,32,.75)", fontWeight: 700 }}>
              {centerPopup.body}
            </p>
            <button
              className="btn btn-pro btn-primary-grad w-50"
              onClick={() => setCenterPopup({ show: false, title: "", body: "", type: "info" })}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="busy">
          <div className="busy-card">
            <span className="spinner-border spinner-border-sm" />
            <div className="fw-bold">Processing…</div>
          </div>
        </div>
      )}
    </div>
  );
}
