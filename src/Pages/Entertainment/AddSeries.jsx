// src/pages/Entertainment/AddSeries.jsx
// Bootstrap-only, responsive, professional ADD page for SERIES
// Mirrors AddMovies UX 1:1: category + subcategory (selects), genres (checkboxes),
// suggestions, duplicate checks (name-only + composite), season add (>=2),
// ✨ NEW: "Watched?" Yes/No toggle (is_watched) — sent to POST /api/series and shown in preview.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useCallback,
} from "react";
import LoadingSpiner from "./LoadingSpiner";

const API_BASE = "https://express-backend-myapp.onrender.com/api";
const EP = {
  CATEGORIES: `${API_BASE}/series/categories`,
  SUBCATEGORIES: `${API_BASE}/series/subcategories`, // ?category_id=
  GENRES: `${API_BASE}/series/genres`,
  CREATE_SERIES: `${API_BASE}/series`,
  CREATE_SEASON: `${API_BASE}/series/seasons`,
  SERIES_COUNT: `${API_BASE}/series/count`,
  DUP_SERIES: `${API_BASE}/series/duplicate-series`,
  SUGGEST: `${API_BASE}/series/suggest`,
};

export default function AddSeries() {
  // Meta
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [genres, setGenres] = useState([]);
  const [nextSeq, setNextSeq] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Popups
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState("Series added successfully.");
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Form
  const [seriesName, setSeriesName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [year, setYear] = useState(""); // optional per schema (string for UX)
  const [genreIds, setGenreIds] = useState([]);
  const [isWatched, setIsWatched] = useState(false); // ✨ NEW toggle state

  // Seasons (2..N)
  const [seasons, setSeasons] = useState([]); // [{id, season_no:"2", year:""}]
  const seasonIdRef = useRef(0);
  const addSeason = useCallback(() => {
    const nextNum =
      seasons.length > 0
        ? Math.max(...seasons.map((s) => Number(s.season_no) || 2)) + 1
        : 2;
    const id = ++seasonIdRef.current;
    setSeasons((prev) => [...prev, { id, season_no: String(nextNum), year: "" }]);
  }, [seasons]);
  const updateSeason = useCallback(
    (id, field, value) =>
      setSeasons((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))),
    []
  );
  const removeSeason = useCallback(
    (id) => setSeasons((prev) => prev.filter((s) => s.id !== id)),
    []
  );

  // Poster (drag/drop)
  const [posterDataUrl, setPosterDataUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  // Genres dropdown
  const [genresOpen, setGenresOpen] = useState(false);
  const genresBtnRef = useRef(null);

  // Duplicates (name-only + composite)
  const [dupNameOnly, setDupNameOnly] = useState({
    loading: false,
    duplicate: false,
  });
  const [dupComposite, setDupComposite] = useState({
    loading: false,
    duplicate: false,
  });

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestBoxRef = useRef(null);

  // 🆕 Detect mobile to avoid scroll-jumps when calling select() on inputs
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || navigator.vendor || "";
      setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(ua));
    }
  }, []);

  // ----- Helpers -----
  const toTitleLocal = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
      .trim();
  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const clamp4 = (s) => onlyDigits(s).slice(0, 4);
  const isYear = (v) => /^\d{4}$/.test(String(v)) && +v >= 1888 && +v <= 2100;
  const isNullOrYear = (v) => v === "" || isYear(v);

  // STRICT integer helpers (avoid "" -> 0 and "0" as valid)
  const isInt = (v) => /^\d+$/.test(String(v)); // non-negative
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
          fetch(EP.SERIES_COUNT),
        ]);
        const [cData, gData, ctData] = await Promise.all([
          cRes.json(),
          gRes.json(),
          ctRes.json(),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(cData) ? cData : []);
        setGenres(Array.isArray(gData) ? gData : []);
        const total = Number(ctData?.total) || 0;
        setNextSeq(total + 1);
      } catch {
        if (!cancelled) {
          setErrorText("Failed to load categories/genres/count.");
          setShowError(true);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When category changes, fetch subcategories (series router)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSubcategoryId("");
      if (!isPositiveInt(categoryId)) {
        setSubcategories([]);
        return;
      }
      try {
        const u = new URL(EP.SUBCATEGORIES);
        u.searchParams.set("category_id", String(categoryId));
        const r = await fetch(u.toString());
        const j = await r.json();
        if (!cancelled) setSubcategories(Array.isArray(j) ? j : []);
      } catch {
        if (!cancelled) setSubcategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  // Close genres panel / suggestions on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (genresOpen) {
        const btn = genresBtnRef.current;
        const panel = document.getElementById("series-genres-panel");
        const inBtn = btn && btn.contains(e.target);
        const inPanel = panel && panel.contains(e.target);
        if (!inBtn && !inPanel) setGenresOpen(false);
      }
      if (suggestOpen) {
        const box = suggestBoxRef.current;
        if (box && !box.contains(e.target)) setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [genresOpen, suggestOpen]);

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
  const yearOk = isNullOrYear(year);
  const genresOk = genreIds.length > 0;
  const seasonsOk =
    seasons.every(
      (s) =>
        /^\d+$/.test(String(s.season_no)) &&
        Number(s.season_no) >= 2 &&
        isNullOrYear(s.year)
    ) && new Set(seasons.map((s) => Number(s.season_no))).size === seasons.length;

  const canPreview =
    seriesName.trim() && isPositiveInt(categoryId) && yearOk && genresOk && seasonsOk;

  // Drag & Drop
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPosterDataUrl(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    } else if (file) {
      setErrorText("Please drop an image file.");
      setShowError(true);
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
      setErrorText("Please choose an image file.");
      setShowError(true);
    }
  };

  // Genres select
  const toggleGenre = (id) => {
    const n = Number(id);
    setGenreIds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  // Suggestions
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = seriesName.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setSuggestOpen(false);
        return;
      }
      try {
        const u = new URL(EP.SUGGEST);
        u.searchParams.set("q", q);
        u.searchParams.set("limit", "8");
        const r = await fetch(u.toString());
        const j = await r.json();
        if (!cancelled) {
          setSuggestions(Array.isArray(j) ? j : []);
          setSuggestOpen(true);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setSuggestOpen(false);
        }
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [seriesName]);

  // Duplicate check: NAME-ONLY
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const name = seriesName.trim();
      if (!name) {
        setDupNameOnly({ loading: false, duplicate: false });
        return;
      }
      try {
        setDupNameOnly({ loading: true, duplicate: false });
        const u = new URL(EP.DUP_SERIES);
        u.searchParams.set("series_name", name);
        const r = await fetch(u.toString());
        const j = await r.json();
        if (!cancelled)
          setDupNameOnly({ loading: false, duplicate: Boolean(j?.duplicate) });
      } catch {
        if (!cancelled) setDupNameOnly({ loading: false, duplicate: false });
      }
    };
    const t = setTimeout(run, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [seriesName]);

  // Duplicate check: COMPOSITE (name + category + release_year + optional subcategory_id)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const name = seriesName.trim();
      if (!name || !isPositiveInt(categoryId) || !yearOk) {
        setDupComposite({ loading: false, duplicate: false });
        return;
      }
      try {
        setDupComposite({ loading: true, duplicate: false });
        const u = new URL(EP.DUP_SERIES);
        u.searchParams.set("series_name", name);
        u.searchParams.set("category_id", String(categoryId));
        if (year !== "") u.searchParams.set("release_year", String(year)); // <-- API expects release_year
        if (isPositiveInt(subcategoryId))
          u.searchParams.set("subcategory_id", String(subcategoryId));
        const r = await fetch(u.toString());
        const j = await r.json();
        if (!cancelled)
          setDupComposite({ loading: false, duplicate: Boolean(j?.duplicate) });
      } catch {
        if (!cancelled) setDupComposite({ loading: false, duplicate: false });
      }
    };
    const t = setTimeout(run, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [seriesName, categoryId, subcategoryId, year, yearOk]);

  // Submit
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!seriesName.trim() || !isPositiveInt(categoryId) || !yearOk) {
      setErrorText(
        "Series name, Category and a valid Year (empty or 1888–2100) are required."
      );
      setShowError(true);
      return;
    }
    if (!genresOk) {
      setErrorText("Please select at least one Genre.");
      setShowError(true);
      return;
    }
    if (!seasonsOk) {
      setErrorText(
        "Check seasons: unique season number (≥ 2) and year empty or 1888–2100."
      );
      setShowError(true);
      return;
    }
    if (dupNameOnly.duplicate || dupComposite.duplicate) {
      setErrorText("Duplicate series exists. Change the name or details.");
      setShowError(true);
      return;
    }

    setSubmitting(true);
    try {
      // 1) Create series (✨ send is_watched)
      const res = await fetch(EP.CREATE_SERIES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series_name: toTitleLocal(seriesName),
          category_id: Number(categoryId),
          subcategory_id: isPositiveInt(subcategoryId)
            ? Number(subcategoryId)
            : null, // optional
          release_year: year === "" ? null : Number(year),
          poster_url: posterDataUrl || null,
          genre_ids: genreIds,
          is_watched: Boolean(isWatched),
        }),
      });
      const seriesRow = await res.json();
      if (!res.ok) throw new Error(seriesRow?.error || "Failed to add series");

      // 2) Create extra seasons (>=2)
      for (const s of seasons) {
        // eslint-disable-next-line no-await-in-loop
        const pr = await fetch(EP.CREATE_SEASON, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            series_id: seriesRow.series_id,
            season_no: Number(s.season_no),
            year: s.year === "" ? null : Number(s.year),
          }),
        });
        if (!pr.ok) {
          const t = await pr.json().catch(() => ({}));
          throw new Error(t?.error || `Failed to add season ${s.season_no}`);
        }
      }

      // Success
      setSuccessText("Your series and seasons (if any) have been saved.");
      setShowSuccess(true);

      // Refresh next sequence
      try {
        const r = await fetch(EP.SERIES_COUNT);
        const j = await r.json();
        const total = Number(j?.total) || nextSeq || 0;
        setNextSeq(total + 1);
      } catch {
        /* ignore */
      }

      // Reset form
      setSeriesName("");
      setCategoryId("");
      setSubcategoryId("");
      setYear("");
      setGenreIds([]);
      setIsWatched(false);
      setPosterDataUrl("");
      setSeasons([]);
      setSuggestions([]);
      setSuggestOpen(false);
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
            width: 18,
            height: 18,
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
      <option value="">
        {subcategories.length ? "Select subcategory (optional)" : "No subcategories"}
      </option>
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
        className={`btn ${
          genresOk ? "btn-outline-secondary" : "btn-outline-danger"
        } w-100 d-flex justify-content-between align-items-center btn-lift`}
        onClick={() => setGenresOpen((s) => !s)}
        aria-expanded={genresOpen}
      >
        {selectedGenres.length
          ? `${selectedGenres.length} selected`
          : "Select genres (required)"}
        <span className="ms-2 small">▾</span>
      </button>

      {genresOpen && (
        <div
          id="series-genres-panel"
          className="mt-2 p-2 rounded shadow bg-white border"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            zIndex: 1055,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <div className="row g-2">
            {genres.map((g) => {
              const id = `genre-${g.genre_id}`;
              const checked = genreIds.includes(Number(g.genre_id));
              return (
                // full-width on very small screens, 2 columns from sm+
                <div className="col-12 col-sm-6" key={g.genre_id}>
                  <label
                    htmlFor={id}
                    className={`d-flex align-items-start gap-2 rounded border p-2 h-100 ${
                      checked ? "bg-light" : ""
                    }`}
                    style={{
                      cursor: "pointer",
                      userSelect: "none",
                      fontSize: "0.85rem",
                      lineHeight: 1.3,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      className="form-check-input m-0"
                      checked={checked}
                      onChange={() => toggleGenre(g.genre_id)}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span
                      className="flex-grow-1 text-wrap"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {g.name}
                    </span>
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
              style={{
                background:
                  "linear-gradient(135deg, rgba(13,110,253,.9), rgba(111,66,193,.9))",
                color: "#fff",
                cursor: "pointer",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
              onClick={() => toggleGenre(g.genre_id)}
              title="Click to remove"
            >
              {g.name} ✕
            </span>
          ))}
        </div>
      )}
      {!genresOk && (
        <div className="form-text text-danger">At least one genre is required.</div>
      )}
    </div>
  );

  const LivePreviewCard = () => (
    <div className="card border-0 shadow-sm">
      <div
        className="card-header fw-semibold d-flex align-items-center justify-content-between"
        style={{
          background:
            "linear-gradient(135deg, rgba(32,201,151,.15), rgba(111,66,193,.15))",
        }}
      >
        <span>Live Preview</span>
        {nextSeq != null && (
          <span className="badge text-bg-dark">Next Seq: {nextSeq}</span>
        )}
      </div>
      <div className="card-body">
        {seriesName ||
        categoryId ||
        subcategoryId ||
        year !== "" ||
        genreIds.length ||
        posterDataUrl ||
        seasons.length ||
        isWatched ? (
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span
                className={`badge rounded-pill ${
                  canPreview ? "text-bg-success" : "text-bg-secondary"
                }`}
              >
                {canPreview ? "Ready" : "Incomplete"}
              </span>
              {selectedCategory ? (
                <span
                  className="badge"
                  style={{ backgroundColor: selectedCategory.color }}
                >
                  {selectedCategory.name}
                </span>
              ) : (
                <span className="badge text-bg-warning">No Category</span>
              )}
              {selectedSubcategory && (
                <span className="badge text-bg-info">{selectedSubcategory.name}</span>
              )}
              {/* ✨ Watched badge */}
              <span
                className={`badge ${
                  isWatched ? "text-bg-primary" : "text-bg-secondary"
                }`}
              >
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
                <div
                  className="border rounded d-flex align-items-center justify-content-center"
                  style={{ width: 96, height: 128 }}
                >
                  <span className="text-muted small">No Poster</span>
                </div>
              )}

              <div className="flex-grow-1">
                <div className="fw-semibold">{toTitleLocal(seriesName || "—")}</div>
                <div className="text-muted small mt-1">Year: {year || "—"}</div>
                <div className="small mt-2">
                  Genres:{" "}
                  {selectedGenres.length
                    ? selectedGenres.map((g) => g.name).join(", ")
                    : "—"}
                </div>
                {seasons.length > 0 && (
                  <div className="small mt-2">
                    Extra Seasons:{" "}
                    {seasons
                      .map(
                        (s) => `S${s.season_no || "?"}(${s.year ? s.year : "—"})`
                      )
                      .join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted small">
            Start filling the form to see a live preview here.
          </div>
        )}
      </div>
    </div>
  );

  // Suggestion click
  const chooseSuggestion = (s) => {
    setSeriesName(s);
    setSuggestOpen(false);
  };

  // ✨ Nice bootstrap switch control
  const WatchedToggle = () => (
    <div className="d-flex align-items-center justify-content-between rounded border p-3 bg-white shadow-sm">
      <div>
        <div className="fw-semibold">Watched?</div>
        <div className="text-muted small">
          Mark if you’ve already watched this series.
        </div>
      </div>
      <div className="form-check form-switch ms-3" style={{ transform: "scale(1.1)" }}>
        <input
          className="form-check-input"
          type="checkbox"
          id="watchedSwitchSeries"
          checked={isWatched}
          onChange={(e) => setIsWatched(e.target.checked)}
          aria-label="Watched toggle"
        />
        <label className="form-check-label ms-2" htmlFor="watchedSwitchSeries">
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
                width: 72,
                height: 72,
                background:
                  "linear-gradient(135deg, rgba(25,135,84,.2), rgba(25,135,84,.1))",
                border: "2px solid rgba(25,135,84,.35)",
              }}
            >
              <span style={{ fontSize: 36, color: "rgb(25,135,84)" }}>✓</span>
            </div>
            <h5 className="mb-2">Series Added</h5>
            <p className="text-muted mb-4">{successText}</p>
            <button
              className="btn btn-success px-4 btn-lift"
              onClick={() => setShowSuccess(false)}
            >
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
                width: 72,
                height: 72,
                background:
                  "linear-gradient(135deg, rgba(220,53,69,.2), rgba(220,53,69,.1))",
                border: "2px solid rgba(220,53,69,.35)",
              }}
            >
              <span style={{ fontSize: 30, color: "rgb(220,53,69)", lineHeight: 1 }}>
                !
              </span>
            </div>
            <h5 className="mb-2">Action Failed</h5>
            <p className="text-muted mb-4">{errorText || "Something went wrong."}</p>
            <button
              className="btn btn-danger px-4 btn-lift"
              onClick={() => setShowError(false)}
            >
              Close
            </button>
          </div>
          <style>{`@keyframes popIn{from{transform:scale(.96);opacity:.6}to{transform:scale(1);opacity:1}}`}</style>
        </div>
      )}

      {/* Page Header */}
      <header
        className="border-bottom"
        style={{
          background:
            "linear-gradient(135deg, rgba(32,201,151,.08), rgba(111,66,193,.08))",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-1">
                <li className="breadcrumb-item">
                  <span className="text-muted">Entertainment</span>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Add Series
                </li>
              </ol>
            </nav>
            <h3 className="mb-0">📺 Add New Series</h3>
          </div>
          <div className="d-flex align-items-center gap-2">
            {nextSeq != null && (
              <span className="badge text-bg-dark">Next Seq: {nextSeq}</span>
            )}
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
                style={{
                  background:
                    "linear-gradient(135deg, rgba(32,201,151,.15), rgba(111,66,193,.15))",
                }}
              >
                <span>Series Details</span>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm btn-lift"
                    onClick={() => {
                      setSeriesName("");
                      setCategoryId("");
                      setSubcategoryId("");
                      setYear("");
                      setGenreIds([]);
                      setIsWatched(false);
                      setPosterDataUrl("");
                      setSeasons([]);
                      setSuggestions([]);
                      setSuggestOpen(false);
                      setDupNameOnly({ loading: false, duplicate: false });
                      setDupComposite({ loading: false, duplicate: false });
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm btn-lift"
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Save Series"}
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div className="row g-3">
                  {/* Series Name + suggestions */}
                  <div
                    className="col-12"
                    ref={suggestBoxRef}
                    style={{ position: "relative" }}
                  >
                    <label className="form-label">
                      Series Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={seriesName}
                      onChange={(e) => setSeriesName(e.target.value)}
                      placeholder="Enter series title"
                      required
                      onFocus={() => suggestions.length && setSuggestOpen(true)}
                      autoComplete="off"
                    />
                    {suggestOpen && suggestions.length > 0 && (
                      <div
                        className="mt-1 border rounded bg-white shadow-sm"
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          zIndex: 1056,
                          maxHeight: 260,
                          overflowY: "auto",
                        }}
                      >
                        {suggestions.map((s) => (
                          <div
                            key={s}
                            onClick={() => chooseSuggestion(s)}
                            className="px-3 py-2 suggestion-item"
                            style={{ cursor: "pointer", color: "red" }}

                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(13,110,253,.08)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {dupNameOnly.loading && (
                      <div className="form-text">Checking name duplicates…</div>
                    )}
                    {!dupNameOnly.loading && dupNameOnly.duplicate && (
                      <div className="small text-danger mt-1">
                        A series with this name already exists.
                      </div>
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
                    <label className="form-label">Year</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{4}"
                      className={`form-control ${
                        year !== "" && !yearOk ? "is-invalid" : ""
                      }`}
                      value={year}
                      onChange={(e) => setYear(clamp4(e.target.value))}
                      onPaste={(e) => {
                        e.preventDefault();
                        setYear(clamp4(e.clipboardData.getData("text")));
                      }}
                      onFocus={(e) => {
                        if (!isMobile) e.target.select();
                      }}
                      autoComplete="off"
                      placeholder="e.g., 2024 (optional)"
                    />
                    {year !== "" && !yearOk && (
                      <div className="invalid-feedback">Empty or 1888–2100.</div>
                    )}
                    <div className="form-text">
                      Season 1 is auto-created using this year.
                    </div>
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
                      {dupComposite.loading && (
                        <div className="form-text">
                          Checking duplicate (name + category + year + subcategory)…
                        </div>
                      )}
                      {!dupComposite.loading && dupComposite.duplicate && (
                        <div className="small text-danger">
                          Duplicate exists for these details.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Extra seasons */}
                  <div className="col-12">
                    <ExtraSeasons
                      seasons={seasons}
                      addSeason={addSeason}
                      updateSeason={updateSeason}
                      removeSeason={removeSeason}
                      clamp4={clamp4}
                      onlyDigits={onlyDigits}
                      isNullOrYear={isNullOrYear}
                      isMobile={isMobile} // 🆕 pass mobile info down
                    />
                  </div>

                  {/* Poster drag & drop */}
                  <div className="col-12">
                    <label className="form-label">Poster (drag & drop)</label>
                    <div
                      className={`border rounded-3 p-4 text-center ${
                        dragActive ? "bg-light" : ""
                      }`}
                      style={{
                        borderStyle: "dashed",
                        cursor: "pointer",
                        transition: "background .15s, transform .15s",
                      }}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={onClickDrop}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.01)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <div className="mb-2 fw-semibold">
                        Drop your image here{posterDataUrl ? " (ready)" : ""}
                      </div>
                      <div className="text-muted small">
                        JPG/PNG/WebP recommended. Click to choose a file.
                      </div>
                      {posterDataUrl ? (
                        <div className="mt-3">
                          <img
                            src={posterDataUrl}
                            alt="Poster preview"
                            className="img-thumbnail"
                            style={{ maxHeight: 180, objectFit: "cover" }}
                          />
                        </div>
                      ) : null}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={onFileChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT: Live Preview / Tips */}
          <div className="col-12 col-lg-4">
            {/* 🆕 sticky controlled only via CSS media queries */}
            <div className="preview-sticky">
              <LivePreviewCard />

              <div className="card border-0 shadow-sm mt-4">
                <div
                  className="card-header fw-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(32,201,151,.15), rgba(111,66,193,.15))",
                  }}
                >
                  Quick Tips
                </div>
                <div className="card-body small text-muted">
                  <ul className="mb-0 ps-3">
                    <li>Series title is auto-titlecased on save.</li>
                    <li>Season 1 is auto-created using the series year (optional).</li>
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
        .focus-ring:focus { border-color: rgba(32,201,151,.6); box-shadow: 0 0 0 .2rem rgba(32,201,151,.15); }
        .suggestion-item { user-select: none; }

        /* Desktop: make preview sticky */
        @media (min-width: 992px) {
          .preview-sticky {
            position: sticky;
            top: 24px;
          }
        }

        /* Mobile: no sticky to avoid layout / scroll jumps */
        @media (max-width: 991.98px) {
          .preview-sticky {
            position: static;
            top: auto;
          }
        }

        @keyframes popIn{from{transform:scale(.96);opacity:.6}to{transform:scale(1);opacity:1}}
      `}</style>
    </>
  );
}

/* =========================
   LOCAL HELPERS (optional export)
   ========================= */
export function toTitle(s) {
  return (s || "")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
    .trim();
}

/* =========================
   SEASONS SECTION (memoized rows)
   ========================= */

function ExtraSeasons({
  seasons,
  addSeason,
  updateSeason,
  removeSeason,
  clamp4,
  onlyDigits,
  isNullOrYear,
  isMobile, // 🆕
}) {
  return (
    <div className="mb-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="form-label mb-0">Extra Seasons (Season 2 and beyond)</label>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm btn-lift"
          onClick={addSeason}
        >
          + Add Season
        </button>
      </div>

      {seasons.length === 0 && (
        <div className="text-muted small">
          Season 1 is created automatically. Add Season 2+ here.
        </div>
      )}

      {seasons.map((s) => (
        <SeasonRow
          key={s.id}
          row={s}
          updateSeason={updateSeason}
          removeSeason={removeSeason}
          clamp4={clamp4}
          onlyDigits={onlyDigits}
          isNullOrYear={isNullOrYear}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

const SeasonRow = memo(function SeasonRow({
  row,
  updateSeason,
  removeSeason,
  clamp4,
  onlyDigits,
  isNullOrYear,
  isMobile,
}) {
  const seasonNum = String(row.season_no ?? "");
  const yearVal = String(row.year ?? "");
  const numValid = /^\d+$/.test(seasonNum) && Number(seasonNum) >= 2;
  const yrValid = isNullOrYear(yearVal);

  return (
    <div className="row g-2 align-items-end mb-2">
      {/* Season Number */}
      <div className="col-12 col-sm-6 col-md-3">
        <label className="form-label" htmlFor={`sn-${row.id}`}>
          Season Number
        </label>
        <input
          id={`sn-${row.id}`}
          type="text"
          inputMode="numeric"
          className={`form-control ${!numValid ? "is-invalid" : ""}`}
          value={seasonNum}
          onChange={(e) =>
            updateSeason(
              row.id,
              "season_no",
              onlyDigits(e.target.value).replace(/^0+/, "")
            )
          }
          onPaste={(e) => {
            e.preventDefault();
            const v = onlyDigits(e.clipboardData.getData("text")).replace(/^0+/, "");
            updateSeason(row.id, "season_no", v);
          }}
          onFocus={(e) => {
            if (!isMobile) e.target.select();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="2"
          autoComplete="off"
        />
        {!numValid && <div className="invalid-feedback">≥ 2 and unique.</div>}
      </div>

      {/* Season Year (optional) */}
      <div className="col-12 col-sm-6 col-md-3">
        <label className="form-label" htmlFor={`yr-${row.id}`}>
          Season Year
        </label>
        <input
          id={`yr-${row.id}`}
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          className={`form-control ${!yrValid ? "is-invalid" : ""}`}
          value={yearVal}
          onChange={(e) => updateSeason(row.id, "year", clamp4(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            updateSeason(row.id, "year", clamp4(e.clipboardData.getData("text")));
          }}
          onFocus={(e) => {
            if (!isMobile) e.target.select();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="e.g., 2026 (optional)"
          autoComplete="off"
        />
        {!yrValid && (
          <div className="invalid-feedback">Empty or 1888–2100.</div>
        )}
      </div>

      <div className="col-12 col-md-auto mt-2 mt-md-0">
        <button
          type="button"
          className="btn btn-outline-danger btn-lift"
          onClick={() => removeSeason(row.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
});
