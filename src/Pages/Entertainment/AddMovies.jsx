// src/pages/Entertainment/AddMovies.jsx
// Bootstrap-only, responsive, colorful ADD page for MOVIES
// Uses your /api/movies/* endpoints; live suggestions & duplicate checks.
// ✨ NEW: "Watched?" Yes/No toggle (is_watched) — sent to POST /api/movies and shown in preview.

import React, { useEffect, useMemo, useRef, useState, memo, useCallback } from "react";

// If your spinner file is named LoadingSpinner.jsx, adjust this import accordingly.
import LoadingSpiner from "./LoadingSpiner";

// API endpoints
const API_BASE = "https://express-backend-myapp.onrender.com/api";
const EP = {
  CATEGORIES: `${API_BASE}/movies/categories`,
  SUBCATEGORIES: `${API_BASE}/movies/subcategories`,
  GENRES: `${API_BASE}/movies/genres`,
  CREATE_MOVIE: `${API_BASE}/movies`,
  CREATE_PART: `${API_BASE}/movies/parts`,
  MOVIES_COUNT: `${API_BASE}/movies/count`,
  DUP_MOVIE: `${API_BASE}/movies/duplicate-movie`,
  SUGGEST: `${API_BASE}/movies/suggest`,
};

export default function AddMovies() {
  // Meta
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]); // filtered by category
  const [genres, setGenres] = useState([]);
  const [nextSeq, setNextSeq] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Popups
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState("Movie added successfully.");
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Form
  const [movieName, setMovieName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState(""); // must be ID (nullable)
  const [year, setYear] = useState(""); // release_year string UX
  const [genreIds, setGenreIds] = useState([]); // int[]
  const [isWatched, setIsWatched] = useState(false); // ✨ NEW toggle state

  // Parts (2..N). Part-1 is auto via DB trigger using release_year
  const [parts, setParts] = useState([]); // [{id, part_number:"2", year:""}]
  const partIdRef = useRef(0);
  const addPart = useCallback(() => {
    const nextNum =
      parts.length > 0 ? Math.max(...parts.map((p) => Number(p.part_number) || 2)) + 1 : 2;
    const id = ++partIdRef.current;
    setParts((prev) => [...prev, { id, part_number: String(nextNum), year: "" }]);
  }, [parts]);
  const updatePart = useCallback((id, field, value) =>
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))), []);
  const removePart = useCallback((id) => setParts((prev) => prev.filter((p) => p.id !== id)), []);

  // Poster (drag/drop)
  const [posterDataUrl, setPosterDataUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  // Genres dropdown
  const [genresOpen, setGenresOpen] = useState(false);
  const genresBtnRef = useRef(null);

  // Duplicate checks
  const [dupNameOnly, setDupNameOnly] = useState({ loading: false, duplicate: false });
  const [dupComposite, setDupComposite] = useState({ loading: false, duplicate: false });

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestBoxRef = useRef(null);

  // ----- Helpers -----
  const toTitle = (s) => (s || "").toLowerCase().replace(/(^|\s)\S/g, (t) => t.toUpperCase()).trim();
  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const clamp4 = (s) => onlyDigits(s).slice(0, 4);
  const isYear = (v) => /^\d{4}$/.test(String(v)) && +v >= 1888 && +v <= 2100;

  // STRICT integer helpers (fixes empty-string / "0" issues)
  const isInt = (v) => /^\d+$/.test(String(v));              // non-negative integer string
  const isPositiveInt = (v) => /^\d+$/.test(String(v)) && Number(v) > 0;

  // Load meta (categories, genres, count)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMeta(true);
        const [cRes, gRes, ctRes] = await Promise.all([
          fetch(EP.CATEGORIES),
          fetch(EP.GENRES),
          fetch(EP.MOVIES_COUNT),
        ]);
        if (!cRes.ok || !gRes.ok || !ctRes.ok) throw new Error("Meta fetch failed");
        const [cData, gData, ctData] = await Promise.all([cRes.json(), gRes.json(), ctRes.json()]);
        if (cancelled) return;
        setCategories(Array.isArray(cData) ? cData : []);
        setGenres(Array.isArray(gData) ? gData : []);
        const total = Number(ctData?.total) || 0;
        setNextSeq(total + 1);
      } catch (err) {
        console.error("Meta load error:", err);
        if (!cancelled) {
          setErrorText("Failed to load categories/genres/count.");
          setShowError(true);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When category changes, load subcategories for that category
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSubcategoryId(""); // reset selection
      if (!isPositiveInt(categoryId)) { setSubcategories([]); return; }
      try {
        const u = new URL(EP.SUBCATEGORIES);
        u.searchParams.set("category_id", String(categoryId));
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error("Subcategories fetch failed");
        const j = await r.json();
        if (!cancelled) setSubcategories(Array.isArray(j) ? j : []);
      } catch (err) {
        console.error("Subcategories load error:", err);
        if (!cancelled) setSubcategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, [categoryId]);

  // Close genres panel on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!genresOpen) return;
      const btn = genresBtnRef.current;
      const panel = document.getElementById("movie-genres-panel");
      const inBtn = btn && btn.contains(e.target);
      const inPanel = panel && panel.contains(e.target);
      if (!inBtn && !inPanel) setGenresOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [genresOpen]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!suggestOpen) return;
      const box = suggestBoxRef.current;
      if (box && !box.contains(e.target)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [suggestOpen]);

  // Derived
  const selectedCategory = useMemo(
    () => categories.find((c) => c.category_id === Number(categoryId)),
    [categories, categoryId]
  );
  const selectedSubcategory = useMemo(
    () => subcategories.find((s) => s.subcategory_id === Number(subcategoryId)),
    [subcategories, subcategoryId]
  );
  const selectedGenres = useMemo(
    () => genres.filter((g) => genreIds.includes(Number(g.genre_id))),
    [genres, genreIds]
  );

  // Validation
  const yearOk = isYear(year);
  const genresOk = genreIds.length > 0;
  const partsOk =
    parts.every(
      (p) =>
        /^\d+$/.test(String(p.part_number)) &&
        Number(p.part_number) >= 2 &&
        isYear(p.year)
    ) && new Set(parts.map((p) => Number(p.part_number))).size === parts.length;

  const canPreview =
    movieName.trim() && isPositiveInt(categoryId) && yearOk && genresOk && partsOk;

  // Drag & Drop
  const onDragOver = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPosterDataUrl(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    } else if (file) {
      setErrorText("Please drop an image file."); setShowError(true);
    }
  };
  const onClickDrop = () => fileInputRef.current?.click();
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPosterDataUrl(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    } else if (file) {
      setErrorText("Please choose an image file."); setShowError(true);
    }
  };

  // Genres select
  const toggleGenre = (id) => {
    const n = Number(id);
    setGenreIds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  // Live suggestions
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = movieName.trim();
      if (q.length < 2) { setSuggestions([]); setSuggestOpen(false); return; }
      try {
        const u = new URL(EP.SUGGEST);
        u.searchParams.set("q", q);
        u.searchParams.set("limit", "8");
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error("Suggest fetch failed");
        const j = await r.json();
        if (!cancelled) {
          setSuggestions(Array.isArray(j) ? j : []);
          setSuggestOpen(true);
        }
      } catch (err) {
        console.error("Suggest error:", err);
        if (!cancelled) { setSuggestions([]); setSuggestOpen(false); }
      }
    };
    const t = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [movieName]);

  // Duplicate check: NAME-ONLY
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const name = movieName.trim();
      if (!name) { setDupNameOnly({ loading: false, duplicate: false }); return; }
      try {
        setDupNameOnly({ loading: true, duplicate: false });
        const u = new URL(EP.DUP_MOVIE);
        u.searchParams.set("movie_name", name);
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error("Dup name-only fetch failed");
        const j = await r.json();
        if (!cancelled) setDupNameOnly({ loading: false, duplicate: Boolean(j?.duplicate) });
      } catch (err) {
        console.error("Dup name-only error:", err);
        if (!cancelled) setDupNameOnly({ loading: false, duplicate: false });
      }
    };
    const t = setTimeout(run, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [movieName]);

  // Duplicate check: COMPOSITE (name + category + year + optional subcategory)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const name = movieName.trim();
      if (!name || !isPositiveInt(categoryId) || !yearOk) {
        setDupComposite({ loading: false, duplicate: false });
        return;
      }
      try {
        setDupComposite({ loading: true, duplicate: false });
        const u = new URL(EP.DUP_MOVIE);
        u.searchParams.set("movie_name", name);
        u.searchParams.set("category_id", String(categoryId));
        u.searchParams.set("release_year", String(year)); // <- matches API
        if (isPositiveInt(subcategoryId)) u.searchParams.set("subcategory_id", String(subcategoryId));
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error("Dup composite fetch failed");
        const j = await r.json();
        if (!cancelled) setDupComposite({ loading: false, duplicate: Boolean(j?.duplicate) });
      } catch (err) {
        console.error("Dup composite error:", err);
        if (!cancelled) setDupComposite({ loading: false, duplicate: false });
      }
    };
    const t = setTimeout(run, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [movieName, categoryId, subcategoryId, year, yearOk]);

  // Submit
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!movieName.trim() || !isPositiveInt(categoryId) || !yearOk) {
      setErrorText("Movie name, Category and a valid Year (1888–2100) are required.");
      setShowError(true);
      return;
    }
    if (!genresOk) {
      setErrorText("Please select at least one Genre.");
      setShowError(true);
      return;
    }
    if (!partsOk) {
      setErrorText("Check extra parts: unique part number (≥ 2) and valid year (1888–2100).");
      setShowError(true);
      return;
    }
    if (dupNameOnly.duplicate || dupComposite.duplicate) {
      setErrorText("Duplicate movie exists. Change the name or details.");
      setShowError(true);
      return;
    }

    setSubmitting(true);
    try {
      // 1) Create movie (✨ send is_watched)
      const res = await fetch(EP.CREATE_MOVIE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie_name: toTitle(movieName),
          category_id: Number(categoryId),
          subcategory_id: isPositiveInt(subcategoryId) ? Number(subcategoryId) : null, // optional
          release_year: Number(year),
          poster_url: posterDataUrl || null,
          genre_ids: genreIds, // already numbers
          is_watched: Boolean(isWatched),
        }),
      });
      const movieRow = await res.json();
      if (!res.ok) throw new Error(movieRow?.error || "Failed to add movie");

      // 2) Create extra parts (>=2)
      for (const p of parts) {
        // eslint-disable-next-line no-await-in-loop
        const pr = await fetch(EP.CREATE_PART, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movie_id: movieRow.movie_id,
            part_number: Number(p.part_number),
            year: Number(p.year),
          }),
        });
        if (!pr.ok) {
          const t = await pr.json().catch(() => ({}));
          throw new Error(t?.error || `Failed to add part ${p.part_number}`);
        }
      }

      // Success popup
      setSuccessText("Your movie and parts (if any) have been saved.");
      setShowSuccess(true);

      // Refresh next sequence
      try {
        const r = await fetch(EP.MOVIES_COUNT);
        const j = await r.json();
        const total = Number(j?.total) || nextSeq || 0;
        setNextSeq(total + 1);
      } catch { /* ignore */ }

      // Reset form
      setMovieName("");
      setCategoryId("");
      setSubcategoryId("");
      setYear("");
      setGenreIds([]);
      setIsWatched(false);
      setPosterDataUrl("");
      setParts([]);
      setSuggestions([]); setSuggestOpen(false);
      setDupNameOnly({ loading: false, duplicate: false });
      setDupComposite({ loading: false, duplicate: false });
    } catch (err) {
      setErrorText(err.message || "Something went wrong.");
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // UI bits
  const CategorySelect = () => (
    <div className="position-relative">
      <select
        className="form-select focus-ring"
        value={categoryId || ""}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label="Category"
        style={{ cursor: "pointer" }}
      >
        <option value="" disabled>
          {loadingMeta ? "Loading…" : "Select category"}
        </option>
        {categories.map((c) => (
          <option key={c.category_id} value={c.category_id}>
            {c.name}
          </option>
        ))}
      </select>

      {selectedCategory && (
        <span
          className="position-absolute top-50 translate-middle-y end-0 me-3 border rounded-circle"
          title={selectedCategory.name}
          style={{
            display: "inline-block",
            width: 18, height: 18,
            backgroundColor: selectedCategory.color,
            boxShadow: "0 0 0 2px rgba(0,0,0,.05)",
          }}
        />
      )}
      <div className="form-text mt-1">
        {selectedCategory ? (
          <>
            Selected:&nbsp;
            <span className="badge" style={{ backgroundColor: selectedCategory.color }}>
              {selectedCategory.name}
            </span>
          </>
        ) : (
          <span className="text-danger">Please choose a category.</span>
        )}
      </div>
    </div>
  );

  const SubcategorySelect = () => (
    <select
      className="form-select focus-ring"
      value={subcategoryId || ""}
      onChange={(e) => setSubcategoryId(e.target.value)}
      aria-label="Subcategory"
      disabled={!isPositiveInt(categoryId) || subcategories.length === 0}
    >
      <option value="">{subcategories.length ? "Select subcategory (optional)" : "No subcategories"}</option>
      {subcategories.map((s) => (
        <option key={s.subcategory_id} value={s.subcategory_id}>
          {s.name}
        </option>
      ))}
    </select>
  );

  const GenresMultiDropdown = () => (
    <div className="position-relative" ref={genresBtnRef}>
      <button
        type="button"
        className={`btn ${genresOk ? "btn-outline-secondary" : "btn-outline-danger"} w-100 d-flex justify-content-between align-items-center btn-lift`}
        onClick={() => setGenresOpen((s) => !s)}
        aria-expanded={genresOpen}
      >
        {selectedGenres.length ? `${selectedGenres.length} selected` : "Select genres (required)"}
        <span className="ms-2 small">▾</span>
      </button>

      {genresOpen && (
        <div
          id="movie-genres-panel"
          className="mt-2 p-2 rounded shadow bg-white border"
          style={{ position: "absolute", left: 0, right: 0, zIndex: 1055, maxHeight: 300, overflowY: "auto" }}
        >
          <div className="row g-2">
            {genres.map((g) => {
              const id = `genre-${g.genre_id}`;
              const checked = genreIds.includes(Number(g.genre_id));
              return (
                <div className="col-6" key={g.genre_id}>
                  <label
                    htmlFor={id}
                    className={`d-flex align-items-center gap-2 rounded border p-2 ${checked ? "bg-light" : ""}`}
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      className="form-check-input m-0"
                      checked={checked}
                      onChange={() => toggleGenre(g.genre_id)}
                      style={{ transform: "scale(1.05)" }}
                    />
                    <span className="flex-grow-1">{g.name}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!!selectedGenres.length && (
        <div className="mt-2 d-flex flex-wrap gap-2">
          {selectedGenres.map((g) => (
            <span
              key={g.genre_id}
              className="badge rounded-pill"
              style={{ background: "linear-gradient(135deg, rgba(13,110,253,.9), rgba(111,66,193,.9))", color: "#fff", cursor: "pointer" }}
              onClick={() => toggleGenre(g.genre_id)}
              title="Click to remove"
            >
              {g.name} ✕
            </span>
          ))}
        </div>
      )}
      {!genresOk && <div className="form-text text-danger">At least one genre is required.</div>}
    </div>
  );

  const LivePreviewCard = () => (
    <div className="card border-0 shadow-sm">
      <div
        className="card-header fw-semibold d-flex align-items-center justify-content-between"
        style={{ background: "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))" }}
      >
        <span>Live Preview</span>
        {nextSeq != null && <span className="badge text-bg-dark">Next Seq: {nextSeq}</span>}
      </div>
      <div className="card-body">
        {movieName || categoryId || subcategoryId || year || genreIds.length || posterDataUrl || parts.length || isWatched ? (
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className={`badge rounded-pill ${canPreview ? "text-bg-success" : "text-bg-secondary"}`}>
                {canPreview ? "Ready" : "Incomplete"}
              </span>
              {selectedCategory ? (
                <span className="badge" style={{ backgroundColor: selectedCategory.color }}>
                  {selectedCategory.name}
                </span>
              ) : (
                <span className="badge text-bg-warning">No Category</span>
              )}
              {selectedSubcategory && (
                <span className="badge text-bg-info">{selectedSubcategory.name}</span>
              )}
              {/* ✨ Watched badge */}
              <span className={`badge ${isWatched ? "text-bg-primary" : "text-bg-secondary"}`}>
                {isWatched ? "Watched: Yes" : "Watched: No"}
              </span>
            </div>

            <div className="d-flex gap-3 align-items-start">
              {posterDataUrl ? (
                <img
                  src={posterDataUrl}
                  alt="Poster preview"
                  className="rounded border"
                  style={{ width: 96, height: 128, objectFit: "cover" }}
                />
              ) : (
                <div className="border rounded d-flex align-items-center justify-content-center" style={{ width: 96, height: 128 }}>
                  <span className="text-muted small">No Poster</span>
                </div>
              )}

              <div className="flex-grow-1">
                <div className="fw-semibold">{toTitle(movieName || "—")}</div>
                <div className="text-muted small mt-1">
                  Year: {year || "—"}
                </div>
                <div className="small mt-2">
                  Genres: {selectedGenres.length ? selectedGenres.map((g) => g.name).join(", ") : "—"}
                </div>
                {parts.length > 0 && (
                  <div className="small mt-2">
                    Extra Parts: {parts.map((p) => `P${p.part_number || "?"}(${p.year || "—"})`).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted small">Start filling the form to see a live preview here.</div>
        )}
      </div>
    </div>
  );

  // Suggestion click
  const chooseSuggestion = (s) => {
    setMovieName(s);
    setSuggestOpen(false);
  };

  // ✨ Nice bootstrap switch control
  const WatchedToggle = () => (
    <div className="d-flex align-items-center justify-content-between rounded border p-3 bg-white shadow-sm">
      <div>
        <div className="fw-semibold">Watched?</div>
        <div className="text-muted small">Mark if you’ve already watched this movie.</div>
      </div>
      <div className="form-check form-switch ms-3" style={{ transform: "scale(1.1)" }}>
        <input
          className="form-check-input"
          type="checkbox"
          id="watchedSwitch"
          checked={isWatched}
          onChange={(e) => setIsWatched(e.target.checked)}
          aria-label="Watched toggle"
        />
        <label className="form-check-label ms-2" htmlFor="watchedSwitch">
          {isWatched ? "Yes" : "No"}
        </label>
      </div>
    </div>
  );

  return (
    <>
      {(loadingMeta || submitting) && (
        <LoadingSpiner message={loadingMeta ? "Loading…" : "Saving…"} fullScreen />
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.45)", zIndex: 2000 }}
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="bg-white rounded-4 shadow p-4 text-center"
            style={{ width: "min(520px, 92vw)", animation: "popIn .2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 72, height: 72,
                background: "linear-gradient(135deg, rgba(25,135,84,.2), rgba(25,135,84,.1))",
                border: "2px solid rgba(25,135,84,.35)",
              }}
            >
              <span style={{ fontSize: 36, color: "rgb(25,135,84)" }}>✓</span>
            </div>
            <h5 className="mb-2">Movie Added</h5>
            <p className="text-muted mb-4">{successText}</p>
            <button className="btn btn-success px-4 btn-lift" onClick={() => setShowSuccess(false)}>
              Done
            </button>
          </div>
          <style>{`@keyframes popIn{from{transform:scale(.96);opacity:.6}to{transform:scale(1);opacity:1}}`}</style>
        </div>
      )}

      {/* Error Popup */}
      {showError && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.45)", zIndex: 2000 }}
          onClick={() => setShowError(false)}
        >
          <div
            className="bg-white rounded-4 shadow p-4 text-center"
            style={{ width: "min(520px, 92vw)", animation: "popIn .2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 72, height: 72,
                background: "linear-gradient(135deg, rgba(220,53,69,.2), rgba(220,53,69,.1))",
                border: "2px solid rgba(220,53,69,.35)",
              }}
            >
              <span style={{ fontSize: 30, color: "rgb(220,53,69)", lineHeight: 1 }}>!</span>
            </div>
            <h5 className="mb-2">Action Failed</h5>
            <p className="text-muted mb-4">{errorText || "Something went wrong."}</p>
            <button className="btn btn-danger px-4 btn-lift" onClick={() => setShowError(false)}>
              Close
            </button>
          </div>
          <style>{`@keyframes popIn{from{transform:scale(.96);opacity:.6}to{transform:scale(1);opacity:1}}`}</style>
        </div>
      )}

      {/* Page Header */}
      <header
        className="border-bottom"
        style={{ background: "linear-gradient(135deg, rgba(255,193,7,.1), rgba(111,66,193,.08))" }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-1">
                <li className="breadcrumb-item">
                  <span className="text-muted">Entertainment</span>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Add Movie
                </li>
              </ol>
            </nav>
            <h3 className="mb-0">🎬 Add New Movie</h3>
          </div>
          <div className="d-flex align-items-center gap-2">
            {nextSeq != null && <span className="badge text-bg-dark">Next Seq: {nextSeq}</span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container my-4">
        <div className="row g-4">
          {/* LEFT: Form */}
          <div className="col-12 col-lg-8">
            <form className="card border-0 shadow" onSubmit={onSubmit}>
              <div
                className="card-header fw-semibold d-flex align-items-center justify-content-between"
                style={{ background: "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))" }}
              >
                <span>Movie Details</span>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm btn-lift"
                    onClick={() => {
                      setMovieName("");
                      setCategoryId("");
                      setSubcategoryId("");
                      setYear("");
                      setGenreIds([]);
                      setIsWatched(false);
                      setPosterDataUrl("");
                      setParts([]);
                      setSuggestions([]); setSuggestOpen(false);
                      setDupNameOnly({ loading: false, duplicate: false });
                      setDupComposite({ loading: false, duplicate: false });
                    }}
                  >
                    Reset
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm btn-lift" disabled={submitting}>
                    {submitting ? "Saving…" : "Save Movie"}
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div className="row g-3">
                  {/* Movie Name + suggestions */}
                  <div className="col-12" ref={suggestBoxRef} style={{ position: "relative" }}>
                    <label className="form-label">
                      Movie Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={movieName}
                      onChange={(e) => setMovieName(e.target.value)}
                      placeholder="Enter movie title"
                      required
                      onFocus={() => suggestions.length && setSuggestOpen(true)}
                      autoComplete="off"
                    />
                    {suggestOpen && suggestions.length > 0 && (
                      <div
                        className="mt-1 border rounded bg-white shadow-sm"
                        style={{ position: "absolute", left: 0, right: 0, zIndex: 1056, maxHeight: 260, overflowY: "auto" }}
                      >
                        {suggestions.map((s) => (
                          <div
                            key={s}
                            onClick={() => chooseSuggestion(s)}
                            className="px-3 py-2 suggestion-item"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(13,110,253,.08)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {dupNameOnly.loading && <div className="form-text">Checking name duplicates…</div>}
                    {!dupNameOnly.loading && dupNameOnly.duplicate && (
                      <div className="small text-danger mt-1">A movie with this name already exists.</div>
                    )}
                  </div>

                  {/* Category & Year */}
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Category <span className="text-danger">*</span>
                    </label>
                    <CategorySelect />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Year <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{4}"
                      className={`form-control ${year && !yearOk ? "is-invalid" : ""}`}
                      value={year}
                      onChange={(e) => setYear(clamp4(e.target.value))}
                      onPaste={(e) => {
                        e.preventDefault();
                        setYear(clamp4(e.clipboardData.getData("text")));
                      }}
                      onFocus={(e) => e.target.select()}
                      autoComplete="off"
                      placeholder="e.g., 2024"
                      required
                    />
                    {year && !yearOk && <div className="invalid-feedback">Must be 1888–2100.</div>}
                    <div className="form-text">Part 1 is auto-created with this year after save.</div>
                  </div>

                  {/* Subcategory (list from API) */}
                  <div className="col-12">
                    <label className="form-label">Subcategory</label>
                    <SubcategorySelect />
                  </div>

                  {/* Genres */}
                  <div className="col-12">
                    <label className="form-label">
                      Genres <span className="text-danger">*</span>
                    </label>
                    <GenresMultiDropdown />
                  </div>

                  {/* ✨ Watched toggle — BEFORE poster */}
                  <div className="col-12">
                    <WatchedToggle />
                  </div>

                  {/* Duplicate composite flag */}
                  {isPositiveInt(categoryId) && yearOk && (
                    <div className="col-12">
                      {dupComposite.loading && <div className="form-text">Checking duplicate (name + category + year + subcategory)…</div>}
                      {!dupComposite.loading && dupComposite.duplicate && (
                        <div className="small text-danger">Duplicate exists for these details.</div>
                      )}
                    </div>
                  )}

                  {/* Extra parts */}
                  <div className="col-12">
                    <ExtraParts
                      parts={parts}
                      addPart={addPart}
                      updatePart={updatePart}
                      removePart={removePart}
                      clamp4={clamp4}
                      onlyDigits={onlyDigits}
                      isYear={isYear}
                    />
                  </div>

                  {/* Poster drag & drop */}
                  <div className="col-12">
                    <label className="form-label">Poster (drag & drop)</label>
                    <div
                      className={`border rounded-3 p-4 text-center ${dragActive ? "bg-light" : ""}`}
                      style={{ borderStyle: "dashed", cursor: "pointer", transition: "background .15s, transform .15s" }}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={onClickDrop}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      <div className="mb-2 fw-semibold">Drop your image here{posterDataUrl ? " (ready)" : ""}</div>
                      <div className="text-muted small">JPG/PNG/WebP recommended. Click to choose a file.</div>
                      {posterDataUrl ? (
                        <div className="mt-3">
                          <img src={posterDataUrl} alt="Poster preview" className="img-thumbnail" style={{ maxHeight: 180, objectFit: "cover" }} />
                        </div>
                      ) : null}
                      <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={onFileChange} />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT: Live Preview / Tips */}
          <div className="col-12 col-lg-4">
            <div className="position-sticky" style={{ top: 24 }}>
              <LivePreviewCard />

              <div className="card border-0 shadow-sm mt-4">
                <div
                  className="card-header fw-semibold"
                  style={{ background: "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))" }}
                >
                  Quick Tips
                </div>
                <div className="card-body small text-muted">
                  <ul className="mb-0 ps-3">
                    <li>Movie title is auto-titlecased on save.</li>
                    <li>Part 1 is auto-created using the movie year.</li>
                    <li>Choose at least one genre to enable saving.</li>
                    <li>Use the Watched toggle to track what you’ve already seen.</li>
                    <li>Use high-resolution posters for best results.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Small polish for hover/focus animations */}
      <style>{`
        .btn-lift { transition: transform .12s ease, box-shadow .12s ease; }
        .btn-lift:hover { transform: translateY(-1px); box-shadow: 0 .75rem 1.25rem rgba(0,0,0,.08)!important; }
        .focus-ring { transition: border-color .12s ease, box-shadow .12s ease; }
        .focus-ring:focus { border-color: rgba(13,110,253,.6); box-shadow: 0 0 0 .2rem rgba(13,110,253,.15); }
        .suggestion-item { user-select: none; }
        @keyframes popIn{from{transform:scale(.96);opacity:.6}to{transform:scale(1);opacity:1}}
      `}</style>
    </>
  );
}

/* =========================
   LOCAL HELPERS (optional export)
   ========================= */
export function toTitle(s) {
  return (s || "").toLowerCase().replace(/(^|\s)\S/g, (t) => t.toUpperCase()).trim();
}

/* =========================
   PARTS SECTION (memoized rows)
   ========================= */

function ExtraParts({ parts, addPart, updatePart, removePart, clamp4, onlyDigits, isYear }) {
  return (
    <div className="mb-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="form-label mb-0">Extra Parts (Part 2 and beyond)</label>
        <button type="button" className="btn btn-outline-primary btn-sm btn-lift" onClick={addPart}>
          + Add Part
        </button>
      </div>

      {parts.length === 0 && (
        <div className="text-muted small">Part 1 is created automatically. Add Part 2+ here.</div>
      )}

      {parts.map((p) => (
        <PartRow
          key={p.id}
          row={p}
          updatePart={updatePart}
          removePart={removePart}
          clamp4={clamp4}
          onlyDigits={onlyDigits}
          isYear={isYear}
        />
      ))}
    </div>
  );
}

const PartRow = memo(function PartRow({ row, updatePart, removePart, clamp4, onlyDigits, isYear }) {
  const partNum = String(row.part_number ?? "");
  const yearVal = String(row.year ?? "");
  const numValid = /^\d+$/.test(partNum) && Number(partNum) >= 2;
  const yrValid = isYear(yearVal);

  return (
    <div className="row g-2 align-items-end mb-2">
      {/* Part Number */}
      <div className="col-6 col-md-3">
        <label className="form-label" htmlFor={`pn-${row.id}`}>Part Number</label>
        <input
          id={`pn-${row.id}`}
          type="text"
          inputMode="numeric"
          className={`form-control ${!numValid ? "is-invalid" : ""}`}
          value={partNum}
          onChange={(e) =>
            updatePart(row.id, "part_number", onlyDigits(e.target.value).replace(/^0+/, ""))
          }
          onPaste={(e) => {
            e.preventDefault();
            const v = onlyDigits(e.clipboardData.getData("text")).replace(/^0+/, "");
            updatePart(row.id, "part_number", v);
          }}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          placeholder="2"
          autoComplete="off"
        />
        {!numValid && <div className="invalid-feedback">≥ 2 and unique.</div>}
      </div>

      {/* Part Year (REQUIRED) */}
      <div className="col-6 col-md-3">
        <label className="form-label" htmlFor={`yr-${row.id}`}>Part Year</label>
        <input
          id={`yr-${row.id}`}
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          className={`form-control ${!yrValid ? "is-invalid" : ""}`}
          value={yearVal}
          onChange={(e) => updatePart(row.id, "year", clamp4(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            updatePart(row.id, "year", clamp4(e.clipboardData.getData("text")));
          }}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          placeholder="e.g., 2026"
          autoComplete="off"
        />
        {!yrValid && <div className="invalid-feedback">Required (1888–2100).</div>}
      </div>

      <div className="col-12 col-md-auto">
        <button type="button" className="btn btn-outline-danger btn-lift" onClick={() => removePart(row.id)}>
          Remove
        </button>
      </div>
    </div>
  );
});
