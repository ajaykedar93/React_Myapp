import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE = "https://express-backend-myapp.onrender.com";
const API = {
  countries: `${BASE}/api/act_favorite/countries`,
  create: `${BASE}/api/act_favorite`,
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

// quick URL sanity check (https/http or data:image)
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
    const id = "addfav-final-url";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      body { font-family: Inter, system-ui, sans-serif; background:#f9fafb; }
      .card-glass { background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);border:1px solid rgba(0,0,0,.05);transition:transform .2s ease }
      .card-glass:hover{ transform: translateY(-2px); }
      .dropzone { border:2px dashed #a5b4fc;background:#f8fafc;padding:16px;border-radius:12px;text-align:center;transition:all .2s ease }
      .dropzone.dragover{ background:#eef2ff;border-color:#6366f1 }
      .thumb { width:90px;height:90px;border-radius:10px;object-fit:cover;border:1px solid #d1d5db }
      .thumb-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px }
      .center-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:2000;animation:fadeIn .25s ease }
      .center-card { background:#fff;border-radius:16px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:scaleUp .25s ease }
      .btn-gradient { background:linear-gradient(90deg,#2563eb,#8b5cf6,#22c55e);color:#fff;border:none;font-weight:600 }
      .btn-gradient:hover{ opacity:.9 }
      .muted-hint{ font-size:.85rem;color:#6b7280 }
      @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes scaleUp{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(s);
  }, []);

  /* ---------- Fetch countries (list only) ---------- */
  useEffect(() => {
    const controller = new AbortController();
    const loadCountries = async () => {
      try {
        setLoadingCountries(true);
        const res = await fetch(`${API.countries}?limit=200`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(
            `Countries request failed (${res.status}): ${txt || res.statusText}`
          );
        }
        const j = await res.json().catch(() => ({}));
        // Your /api/countries returns { success, data }
        if (j?.success) setCountries(Array.isArray(j.data) ? j.data : []);
        else throw new Error(j?.message || "Countries load failed");
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
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
    setProfileUrl(""); // prefer the dropped file
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

  // Use URL for profile preview
  const applyProfileUrl = (e) => {
    e?.preventDefault?.();
    const clean = (profileUrl || "").trim();
    if (!isUrl(clean)) {
      return setCenterPopup({
        show: true,
        title: "Invalid URL",
        body: "Please enter a valid image URL.",
        type: "danger",
      });
    }
    setProfilePreview(clean);
    setProfileBase64(null); // prefer URL when set
  };

  /* ---------- Gallery: drag & drop / pick ---------- */
  const onGalleryDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dzGallery.current?.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const previews = await toDataUrls(files);
    setDropFiles((prev) => [
      ...prev,
      ...previews.map((src) => ({ id: safeUUID(), src })),
    ]);
    setImagesToAdd((prev) => [...prev, ...previews]);
  };
  const onGalleryPick = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const previews = await toDataUrls(files);
    setDropFiles((prev) => [
      ...prev,
      ...previews.map((src) => ({ id: safeUUID(), src })),
    ]);
    setImagesToAdd((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  // Add gallery URLs (one per line)
  const addGalleryUrls = (e) => {
    e?.preventDefault?.();
    const lines = (galleryUrls || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length && isUrl(l));
    if (!lines.length) {
      return setCenterPopup({
        show: true,
        title: "No valid URLs",
        body: "Paste one image URL per line.",
        type: "danger",
      });
    }
    const newThumbs = lines.map((src) => ({ id: safeUUID(), src }));
    setDropFiles((prev) => [...prev, ...newThumbs]);
    setImagesToAdd((prev) => [...prev, ...lines]);
    setGalleryUrls("");
  };

  const removePreview = (id) => {
    const next = dropFiles.filter((p) => p.id !== id);
    setDropFiles(next);
    // sync imagesToAdd to remain in same order as thumbnails
    setImagesToAdd(next.map((p) => p.src));
  };

  /* ---------- Popup helper ---------- */
  const showPopup = (title, body, type = "info", timeout = 2200) => {
    setCenterPopup({ show: true, title, body, type });
    window.clearTimeout(showPopup._t);
    showPopup._t = window.setTimeout(
      () => setCenterPopup({ show: false, title: "", body: "", type: "info" }),
      timeout
    );
  };

  /* ---------- Create ---------- */
  const onCreate = async (e) => {
    e?.preventDefault?.();
    const favorite_actress_name = (form.favorite_actress_name || "").trim();
    const favorite_movie_series = (form.favorite_movie_series || "").trim();
    if (!favorite_actress_name || !favorite_movie_series) {
      return showPopup(
        "Missing Fields",
        "Actress name & movie/series required",
        "danger"
      );
    }

    const payload = {
      favorite_actress_name,
      favorite_movie_series,
      age: form.age ? Number(form.age) : null,
      actress_dob: form.actress_dob || null,
      // choose profile: base64 (drop) OR url
      profile_image:
        profileBase64 ||
        (profileUrl && isUrl(profileUrl) ? profileUrl.trim() : null),
      notes: form.notes || null,
    };

    // Optional gallery (mix of base64 & URLs)
    if (imagesToAdd.length) payload.images = imagesToAdd;

    // Backend accepts country_id OR country_name (userActFavorite router)
    if (selectedCountryId) payload.country_id = Number(selectedCountryId);
    else if ((manualCountry || "").trim())
      payload.country_name = manualCountry.trim();

    try {
      setBusy(true);
      const res = await fetch(API.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Robust non-200 & JSON handling
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg =
          (json && (json.message || json.error)) ||
          text ||
          `Request failed (${res.status})`;
        throw new Error(msg);
      }

      if (!json?.success) {
        throw new Error(json?.message || "Create failed");
      }

      showPopup("Success", "Actress added successfully", "success");

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

  return (
    <div className="container py-4">
      <div className="text-center mb-3">
        <h3
          style={{
            background: "linear-gradient(90deg,#2563eb,#8b5cf6,#22c55e)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            fontWeight: 800,
          }}
        >
          Add Favourite Actress
        </h3>
        <p className="text-muted mb-0">
          Drag & drop or paste URLs — your choice.
        </p>
      </div>

      <div className="card card-glass p-3 p-sm-4">
        {/* Country */}
        <label className="form-label fw-semibold">Country</label>
        {loadingCountries ? (
          <div className="text-muted mb-3">
            <span className="spinner-border spinner-border-sm text-primary me-2" />
            Loading countries…
          </div>
        ) : (
          <>
            <select
              className="form-select mb-2"
              value={selectedCountryId}
              onChange={(e) => {
                setSelectedCountryId(e.target.value);
                setManualCountry("");
              }}
            >
              <option value="">— Choose from list —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.country_name}
                </option>
              ))}
            </select>
            {!selectedCountryId && (
              <input
                className="form-control"
                placeholder="Or type a new country name"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
              />
            )}
          </>
        )}

        <hr className="my-3" />

        {/* Actress Info */}
        <form onSubmit={onCreate}>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label">Actress Name *</label>
              <input
                className="form-control"
                value={form.favorite_actress_name}
                onChange={(e) =>
                  setForm({ ...form, favorite_actress_name: e.target.value })
                }
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="form-control"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                min={0}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">DOB</label>
              <input
                type="date"
                className="form-control"
                value={form.actress_dob}
                onChange={(e) =>
                  setForm({ ...form, actress_dob: e.target.value })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Favorite Movie/Series *</label>
              <input
                className="form-control"
                value={form.favorite_movie_series}
                onChange={(e) =>
                  setForm({ ...form, favorite_movie_series: e.target.value })
                }
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Notes</label>
              <textarea
                rows="2"
                className="form-control"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Profile: drag/drop OR URL */}
          <div className="mt-3">
            <label className="form-label fw-semibold">
              Profile Image (optional)
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
              <div>Drag & drop a profile image here, or</div>
              <label className="btn btn-outline-primary btn-sm mt-2">
                Select File
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onProfilePick}
                />
              </label>
              {profilePreview && (
                <div className="text-center mt-3">
                  <img
                    src={profilePreview}
                    alt="Profile"
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: 12,
                      border: "1px solid #ccc",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
            </div>
            <div className="mt-2">
              <input
                className="form-control"
                placeholder="…or paste a profile image URL (https://… or data:image/…)"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
              />
              <div className="d-flex justify-content-end mt-2">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={applyProfileUrl}
                >
                  Use URL
                </button>
              </div>
              <div className="muted-hint">
                If both are provided, last action wins (URL vs drop).
              </div>
            </div>
          </div>

          {/* Gallery: drag/drop OR multiple URLs */}
          <div className="mt-4">
            <label className="form-label fw-semibold">
              Extra Images (optional)
            </label>
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
              <div>Drag & drop multiple images here, or</div>
              <label className="btn btn-outline-primary btn-sm mt-2">
                Select Files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={onGalleryPick}
                />
              </label>

              {dropFiles.length > 0 && (
                <>
                  <div className="text-muted small mt-2">
                    {dropFiles.length} image(s) selected
                  </div>
                  <div className="thumb-grid mt-2">
                    {dropFiles.map((p) => (
                      <div
                        key={p.id}
                        className="d-flex flex-column align-items-center gap-1"
                      >
                        <img className="thumb" src={p.src} alt="" />
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={(ev) => {
                            ev.preventDefault();
                            removePreview(p.id);
                          }}
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
                placeholder={
                  "…or paste image URLs (one per line)\nhttps://example.com/a.jpg\nhttps://example.com/b.png"
                }
                value={galleryUrls}
                onChange={(e) => setGalleryUrls(e.target.value)}
              />
              <div className="d-flex justify-content-end mt-2">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={addGalleryUrls}
                >
                  Add URLs
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="text-end mt-4">
            <button
              type="button"
              className="btn btn-light me-2"
              onClick={() => {
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
              }}
            >
              Reset
            </button>
            <button type="submit" className="btn btn-gradient" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Popup */}
      {centerPopup.show && (
        <div
          className="center-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setCenterPopup({ show: false })}
        >
          <div
            className="center-card p-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="fw-bold">{centerPopup.title}</h5>
            <p className="text-muted">{centerPopup.body}</p>
            <button
              className="btn btn-gradient w-50"
              onClick={() => setCenterPopup({ show: false })}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(255,255,255,.7)", zIndex: 9999 }}
        >
          <div
            className="spinner-border text-primary me-2"
            role="status"
            aria-label="saving"
          />
          <div className="fw-semibold">Processing…</div>
        </div>
      )}
    </div>
  );
}
