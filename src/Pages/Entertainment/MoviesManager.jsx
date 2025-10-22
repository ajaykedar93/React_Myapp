// src/pages/Entertainment/MoviesManager.jsx
// Bootstrap-only Movies Manager (view / update / delete)
// - Same header, filters, table, view & delete modals
// - EDIT modal now only allows: Poster (drag/drop), Watched toggle, Parts (add/edit/delete)
// - Year is mandatory for every part; new parts must be part_number >= 2 (API requirement)
// - PUT /movies/:id now only sends { is_watched, poster_url } — no other movie fields are updated
// - Parts are still diffed and applied via /movies/parts endpoints
// - Subtle hover/active animations and a nicer toggle added

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useCallback,
} from "react";
import LoadingSpiner from "./LoadingSpiner";

const API_BASE = "http://localhost:5000/api";
const EP = {
  // meta & stats
  MOVIES_COUNT: `${API_BASE}/movies/count`,
  MOVIES_COUNT_BY_CAT: `${API_BASE}/movies/count/by-category`,
  CATEGORIES: `${API_BASE}/movies/categories`,
  SUBCATEGORIES: `${API_BASE}/movies/subcategories`,
  GENRES: `${API_BASE}/movies/genres`,
  // list & CRUD
  MOVIES: `${API_BASE}/movies`, // GET (list)
  MOVIE_ONE: (id) => `${API_BASE}/movies/${id}`, // GET, PUT, DELETE
  // parts CRUD
  CREATE_PART: `${API_BASE}/movies/parts`, // POST {movie_id, part_number, year}  (part_number >= 2)
  UPDATE_PART: (partId) => `${API_BASE}/movies/parts/${partId}`, // PUT {part_number, year}
  DELETE_PART: (partId) => `${API_BASE}/movies/parts/${partId}`, // DELETE
};

/* -------------------------------
   Small centered popup for messages
-------------------------------- */
function AlertModal({ kind = "success", title, message, onClose }) {
  const color =
    kind === "success"
      ? "rgba(25,135,84,.15)"
      : kind === "danger"
      ? "rgba(220,53,69,.15)"
      : "rgba(13,110,253,.12)";
  const ring =
    kind === "success"
      ? "rgba(25,135,84,.35)"
      : kind === "danger"
      ? "rgba(220,53,69,.35)"
      : "rgba(13,110,253,.35)";
  const icon = kind === "success" ? "✓" : kind === "danger" ? "!" : "ℹ︎";

  return (
    <Modal onClose={onClose} size="md">
      <div className="text-center">
        <div
          className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 64,
            height: 64,
            background: color,
            border: `2px solid ${ring}`,
            fontSize: 28,
          }}
        >
          {icon}
        </div>
        {title ? <h5 className="mb-1">{title}</h5> : null}
        {message ? <div className="text-muted mb-3">{message}</div> : null}
        <button className="btn btn-primary btn-anim" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export default function MoviesManager() {
  // ======= global busy spinner for ALL API calls =======
  const [busyCount, setBusyCount] = useState(0);
  const withSpinner = useCallback(async (fn) => {
    setBusyCount((c) => c + 1);
    try {
      return await fn();
    } finally {
      setBusyCount((c) => Math.max(0, c - 1));
    }
  }, []);

  // unified fetch helper (JSON + errors)
  const fetchJson = useCallback(
    async (input, init) =>
      withSpinner(async () => {
        const r = await fetch(input, init);
        let j = null;
        try {
          j = await r.json();
        } catch {
          /* no body */
        }
        if (!r.ok) {
          const msg = j?.error || j?.message || `Request failed (${r.status})`;
          throw new Error(msg);
        }
        return j;
      }),
    [withSpinner]
  );

  // ======= list state =======
  const [loadingList, setLoadingList] = useState(true);
  const [movies, setMovies] = useState([]);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 10;

  // ======= meta / stats =======
  const [categories, setCategories] = useState([]);
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsByCat, setStatsByCat] = useState([]);

  // ======= modals =======
  const [viewMovie, setViewMovie] = useState(null);
  const [editMovie, setEditMovie] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  // centered alerts
  const [successAlert, setSuccessAlert] = useState(null);
  const [errorAlert, setErrorAlert] = useState(null);

  // ======= edit modal state (ONLY poster, watched, parts) =======
  const [editPoster, setEditPoster] = useState("");
  const [editParts, setEditParts] = useState([]); // [{part_id?, part_number, year}]
  const [editIsWatched, setEditIsWatched] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ======= helpers =======
  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const clamp4 = (s) => onlyDigits(s).slice(0, 4);
  const isYear = (v) => /^\d{4}$/.test(String(v)) && +v >= 1888 && +v <= 2100;
  const isInt = (v) => Number.isInteger(Number(v));
  const isDataUrl = (s) =>
    typeof s === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(s);

  // ======= load categories + stats once =======
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        setBusyCount((c) => c + 1);
        const [c, ct, bc] = await Promise.all([
          fetch(EP.CATEGORIES, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.MOVIES_COUNT, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.MOVIES_COUNT_BY_CAT, { signal: ac.signal }).then((r) =>
            r.json()
          ),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(c) ? c : []);
        setStatsTotal(Number(ct?.total) || 0);
        setStatsByCat(Array.isArray(bc) ? bc : []);
      } catch (e) {
        if (e.name !== "AbortError") {
          setErrorAlert({
            title: "Load Failed",
            message: "Could not load categories/stats.",
          });
        }
      } finally {
        setBusyCount((c) => Math.max(0, c - 1));
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  // ======= derived: selected category meta & count =======
  const selectedCatMeta = useMemo(() => {
    if (!categoryFilter) return null;
    const id = Number(categoryFilter);
    return statsByCat.find((c) => c.category_id === id) || null;
  }, [categoryFilter, statsByCat]);

  const selectedCatCount = useMemo(
    () => (selectedCatMeta ? Number(selectedCatMeta.total) : null),
    [selectedCatMeta]
  );

  // ======= load list whenever q/category/page change (cancel stale requests) =======
  const listAbortRef = useRef(null);
  const loadList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;

    setLoadingList(true);
    try {
      setBusyCount((c) => c + 1);
      const u = new URL(EP.MOVIES);
      if (q.trim()) u.searchParams.set("q", q.trim());
      if (isInt(categoryFilter))
        u.searchParams.set("category_id", String(categoryFilter));
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("offset", String(page * limit));
      const r = await fetch(u.toString(), { signal: ac.signal });
      if (!r.ok) throw new Error("List fetch failed");
      const j = await r.json();
      setMovies(Array.isArray(j) ? j : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        setMovies([]);
        setErrorAlert({
          title: "Load Failed",
          message: "Could not fetch movies list.",
        });
      }
    } finally {
      setLoadingList(false);
      setBusyCount((c) => Math.max(0, c - 1));
    }
  }, [q, categoryFilter, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ======= refresh stats helper =======
  const refreshStats = useCallback(async () => {
    try {
      await withSpinner(async () => {
        const [ct, bc] = await Promise.all([
          fetch(EP.MOVIES_COUNT).then((r) => r.json()),
          fetch(EP.MOVIES_COUNT_BY_CAT).then((r) => r.json()),
        ]);
        setStatsTotal(Number(ct?.total) || 0);
        setStatsByCat(Array.isArray(bc) ? bc : []);
      });
    } catch {
      /* ignore */
    }
  }, [withSpinner]);

  // ======= view modal open (slim modal, centered, only ✕) =======
  const openView = async (movieId) => {
    try {
      const j = await fetchJson(EP.MOVIE_ONE(movieId));
      setViewMovie(j);
    } catch (e) {
      setErrorAlert({
        title: "Open Failed",
        message: e.message || "Could not open movie details.",
      });
    }
  };

  // ======= edit modal open (prefill ONLY poster/watched/parts) =======
  const openEdit = async (movieId) => {
    try {
      const j = await fetchJson(EP.MOVIE_ONE(movieId));
      // Keep ONLY fields we show/edit in this modal
      setEditMovie({
        movie_id: j.movie_id,
        movie_name: j.movie_name, // just to show in the header
      });
      setEditIsWatched(Boolean(j.is_watched));
      setEditPoster(j.poster_url || "");
      setEditParts(
        Array.isArray(j.parts)
          ? j.parts.map((p) => ({
              part_id: p.part_id ?? undefined,
              part_number: Number(p.part_number) || 1,
              year: String(p.year || ""),
            }))
          : []
      );
    } catch (e) {
      setErrorAlert({
        title: "Open Failed",
        message: e.message || "Could not open movie for edit.",
      });
    }
  };

  // poster drag/drop (edit modal)
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
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
      reader.onload = (ev) => setEditPoster(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    } else if (file) {
      setErrorAlert({ title: "Invalid File", message: "Please drop an image file." });
    }
  };
  const onPickPoster = () => fileInputRef.current?.click();
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditPoster(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    } else if (file) {
      setErrorAlert({ title: "Invalid File", message: "Please choose an image file." });
    }
  };

  // ======= save update (PUT movie minimal, then diff parts: POST/PUT/DELETE) =======
  const saveUpdate = async () => {
    if (!editMovie) return;

    // Validate poster (if provided)
    if (
      editPoster &&
      !(isDataUrl(editPoster) || /^https?:\/\//i.test(editPoster))
    ) {
      setErrorAlert({
        title: "Validation",
        message: "Poster must be a data:image/* URL or http(s) URL.",
      });
      return;
    }

    // Parts normalization — YEAR REQUIRED for ALL; part # must be >=1 (update) and >=2 (create)
    const normalized = (editParts || []).map((p, idx) => ({
      part_id: p.part_id,
      part_number: Number(p.part_number) || idx + 1,
      year: p.year === "" ? null : Number(p.year),
    }));

    const badPart =
      normalized.length > 0 &&
      normalized.some(
        (p) =>
          !(Number.isInteger(p.part_number) && p.part_number >= 1) ||
          p.year === null ||
          !isYear(p.year)
      );

    if (badPart) {
      setErrorAlert({
        title: "Validation",
        message:
          "Each part must have a valid Year (1888–2100). Part # must be ≥ 1. New parts must be ≥ 2.",
      });
      return;
    }

    setEditSubmitting(true);
    try {
      // 1) Update movie via PUT …/movies/:id with ONLY allowed fields
      await fetchJson(EP.MOVIE_ONE(editMovie.movie_id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_url: editPoster || null,
          is_watched: Boolean(editIsWatched),
        }),
      });

      // 2) Re-fetch to get current parts, then diff
      const j2 = await fetchJson(EP.MOVIE_ONE(editMovie.movie_id));
      const currentParts = Array.isArray(j2.parts) ? j2.parts : [];

      const byId = new Map(
        currentParts
          .filter((p) => p.part_id != null)
          .map((p) => [Number(p.part_id), p])
      );
      const byKey = new Map(
        currentParts.map((p) => [`${p.part_number}`, p])
      );

      const toCreate = [];
      const toUpdate = [];
      const seenIds = new Set();

      for (const np of normalized) {
        if (np.part_id && byId.has(Number(np.part_id))) {
          seenIds.add(Number(np.part_id));
          const srv = byId.get(Number(np.part_id));
          const needsUpdate =
            Number(srv.part_number) !== Number(np.part_number) ||
            Number(srv.year || 0) !== Number(np.year || 0);
          if (needsUpdate) {
            toUpdate.push({
              part_id: Number(np.part_id),
              part_number: Number(np.part_number),
              year: np.year,
            });
          }
        } else {
          const matched = byKey.get(String(np.part_number));
          if (matched && matched.part_id != null) {
            seenIds.add(Number(matched.part_id));
            const needsUpdate =
              Number(matched.part_number) !== Number(np.part_number) ||
              Number(matched.year || 0) !== Number(np.year || 0);
            if (needsUpdate) {
              toUpdate.push({
                part_id: Number(matched.part_id),
                part_number: Number(np.part_number),
                year: np.year,
              });
            }
          } else {
            // Creating new part — must be >= 2 (API rule)
            if (Number(np.part_number) < 2) {
              setErrorAlert({
                title: "Validation",
                message:
                  "Cannot create Part #1. New parts must have Part # ≥ 2.",
              });
              setEditSubmitting(false);
              return;
            }
            toCreate.push({
              part_number: Number(np.part_number),
              year: np.year,
            });
          }
        }
      }

      const toDelete = currentParts
        .filter((p) => p.part_id != null && !seenIds.has(Number(p.part_id)))
        .map((p) => Number(p.part_id));

      // 3) Apply parts ops
      for (const c of toCreate) {
        // eslint-disable-next-line no-await-in-loop
        await fetchJson(EP.CREATE_PART, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movie_id: editMovie.movie_id,
            part_number: c.part_number,
            year: c.year,
          }),
        });
      }
      for (const u of toUpdate) {
        // eslint-disable-next-line no-await-in-loop
        await fetchJson(EP.UPDATE_PART(u.part_id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            part_number: u.part_number,
            year: u.year,
          }),
        });
      }
      for (const did of toDelete) {
        // eslint-disable-next-line no-await-in-loop
        await fetchJson(EP.DELETE_PART(did), { method: "DELETE" });
      }

      setEditMovie(null);
      await Promise.all([loadList(), refreshStats()]);
      setSuccessAlert({
        title: "Updated",
        message: "Movie changes saved.",
      });
    } catch (e) {
      setErrorAlert({
        title: "Update Failed",
        message: e.message || "Could not update movie.",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  // ======= delete =======
  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await fetchJson(EP.MOVIE_ONE(confirmDel.movie_id), { method: "DELETE" });
      setConfirmDel(null);
      await Promise.all([loadList(), refreshStats()]);
      setSuccessAlert({
        title: "Deleted",
        message: "Movie deleted successfully.",
      });
    } catch (e) {
      setErrorAlert({
        title: "Delete Failed",
        message: e.message || "Could not delete movie.",
      });
    }
  };

  // ======= table row =======
  const Row = memo(function Row({ row, onView, onEdit, onDelete }) {
    return (
      <tr>
        <td className="text-muted">{row.display_no}</td>
        <td className="fw-semibold">{row.movie_name}</td>
        <td>
          {row.category_name ? (
            <span
              className="badge bg-gradient"
              style={{ background: "linear-gradient(135deg,#0d6efd,#6f42c1)" }}
            >
              {row.category_name}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td>{row.release_year}</td>
        <td>
          {row.parts?.length
            ? row.parts.map((p) => `P${p.part_number}(${p.year})`).join(", ")
            : "—"}
        </td>
        <td>
          <span
            className={`badge ${
              row.is_watched ? "text-bg-success" : "text-bg-secondary"
            }`}
          >
            {row.is_watched ? "Yes" : "No"}
          </span>
        </td>
        <td className="text-end">
          <button
            className="btn btn-sm btn-outline-secondary me-1 btn-anim"
            onClick={() => onView(row.movie_id)}
          >
            View
          </button>
          <button
            className="btn btn-sm btn-outline-primary me-1 btn-anim"
            onClick={() => onEdit(row.movie_id)}
          >
            Edit
          </button>
          <button
            className="btn btn-sm btn-outline-danger btn-anim"
            onClick={() =>
              onDelete({ movie_id: row.movie_id, movie_name: row.movie_name })
            }
          >
            Delete
          </button>
        </td>
      </tr>
    );
  });

  return (
    <>
      {busyCount > 0 && <LoadingSpiner message="Loading…" fullScreen />}

      {/* Header / Stats with Category dropdown */}
      <header
        className="border-bottom"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,193,7,.08), rgba(111,66,193,.08))",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h3 className="mb-0">🎬 Movies Manager</h3>
            <div className="text-muted small">
              Browse, view, update, and delete movies.
            </div>
          </div>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex align-items-end gap-2">
              <div>
                <label className="form-label mb-1">Category</label>
                <select
                  className="form-select form-select-sm"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Totals: selected category total or overall */}
              {categoryFilter ? (
                <span
                  className="badge align-self-end"
                  style={{
                    backgroundColor:
                      selectedCatMeta?.category_color || "#6c757d",
                  }}
                  title={
                    selectedCatMeta
                      ? `${selectedCatMeta.category_name}: ${selectedCatCount}`
                      : "Selected category"
                  }
                >
                  {selectedCatMeta?.category_name || "Category"}:{" "}
                  {selectedCatCount ?? 0}
                </span>
              ) : (
                <span className="badge text-bg-dark align-self-end">
                  Total: {statsTotal}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filters (Search only) */}
      <div className="container mt-3">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-8 col-lg-6">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-control"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Title contains..."
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label d-block">&nbsp;</label>
                <button
                  className="btn btn-outline-secondary me-2 btn-anim"
                  onClick={() => {
                    setQ("");
                    setPage(0);
                  }}
                >
                  Reset
                </button>
                <button
                  className="btn btn-primary btn-anim"
                  onClick={() => loadList()}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="container my-3">
        <div className="card border-0 shadow-sm">
          <div
            className="card-header fw-semibold"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,193,7,.15), rgba(111,66,193,.15))",
            }}
          >
            Movies
          </div>
          <div className="table-responsive position-relative">
            {loadingList && (
              <div
                className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center"
                style={{ inset: 0, background: "rgba(255,255,255,.6)", zIndex: 1 }}
              >
                <div className="spinner-border" role="status" aria-hidden="true"></div>
                <span className="ms-2 text-muted">Loading…</span>
              </div>
            )}
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Year</th>
                  <th>Parts</th>
                  <th>Watched?</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loadingList && movies.length ? (
                  movies.map((m) => (
                    <Row
                      key={m.movie_id}
                      row={m}
                      onView={openView}
                      onEdit={openEdit}
                      onDelete={setConfirmDel}
                    />
                  ))
                ) : !loadingList ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No movies found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="card-footer d-flex justify-content-between align-items-center">
            <div className="text-muted small">Page {page + 1}</div>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm btn-anim"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              <button
                className="btn btn-outline-secondary btn-sm btn-anim"
                disabled={movies.length < limit}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal (slimmer width, centered, only ✕) */}
      {viewMovie && (
        <Modal onClose={() => setViewMovie(null)} size="sm">
          <div className="d-flex align-items-start gap-3 flex-wrap justify-content-center">
            {/* Left: Poster */}
            {viewMovie.poster_url ? (
              <img
                src={viewMovie.poster_url}
                alt="Poster"
                className="rounded border"
                style={{ width: 148, height: 196, objectFit: "cover" }}
              />
            ) : (
              <div
                className="border rounded d-flex align-items-center justify-content-center bg-light"
                style={{ width: 148, height: 196 }}
              >
                <span className="text-muted small">No Poster</span>
              </div>
            )}

            {/* Right: Fields */}
            <div className="flex-grow-1" style={{ minWidth: 260, maxWidth: 420 }}>
              <h5 className="mb-2 text-center">Movie Details</h5>

              <div className="mb-1">
                <span className="text-muted">Name:</span> {viewMovie.movie_name}
              </div>

              <div className="mb-1">
                <span className="text-muted">Parts:</span>{" "}
                {viewMovie.parts?.length
                  ? viewMovie.parts.map((p) => `P${p.part_number}(${p.year})`).join(", ")
                  : "—"}
              </div>

              <div className="mb-1">
                <span className="text-muted">Category:</span>{" "}
                {viewMovie.category_name || "—"}
              </div>

              <div className="mb-1">
                <span className="text-muted">Subcategory:</span>{" "}
                {viewMovie.subcategory_name || "—"}
              </div>

              <div className="mb-1">
                <span className="text-muted">Genres:</span>{" "}
                {viewMovie.genres?.length
                  ? viewMovie.genres.map((g) => g.name).join(", ")
                  : "—"}
              </div>

              <div className="mb-1">
                <span className="text-muted">Year:</span> {viewMovie.release_year}
              </div>

              <div className="mb-1">
                <span className="text-muted">Watched:</span>{" "}
                <span
                  className={`badge ${
                    viewMovie.is_watched ? "text-bg-success" : "text-bg-secondary"
                  }`}
                >
                  {viewMovie.is_watched ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal (ONLY poster, watched, parts) */}
      {editMovie && (
        <Modal onClose={() => setEditMovie(null)} size="lg">
          <div className="modal-head mb-2">
            <h5 className="mb-0">
              Update Movie
              <span className="text-muted ms-2">— {editMovie.movie_name}</span>
            </h5>
          </div>

          <div className="modal-body scroll-area">
            <div className="row g-3">
              {/* Poster drag & drop */}
              <div className="col-12">
                <label className="form-label">Poster (drag & drop)</label>
                <div
                  className={`border rounded-3 p-3 text-center dropzone ${dragActive ? "bg-light glow" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={onPickPoster}
                  title="Drop an image or click to choose"
                >
                  <div className="mb-1 fw-semibold">
                    Drop your image here{editPoster ? " (ready)" : ""}
                  </div>
                  <div className="text-muted small">
                    JPG/PNG/WebP recommended. Click to choose a file.
                  </div>
                  {editPoster ? (
                    <div className="mt-2">
                      <img
                        src={editPoster}
                        alt="Poster preview"
                        className="img-thumbnail"
                        style={{ maxHeight: 160, objectFit: "cover" }}
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

              {/* Watched toggle — fancy */}
              <div className="col-12">
                <label className="form-label">Watched?</label>
                <div className="d-flex align-items-center justify-content-between rounded border p-2 bg-white">
                  <div className="text-muted small">Mark if you’ve watched this movie.</div>
                  <label className="switch ms-3" title="Toggle watched">
                    <input
                      type="checkbox"
                      checked={editIsWatched}
                      onChange={(e) => setEditIsWatched(e.target.checked)}
                    />
                    <span className="slider" />
                    <span className="switch-label">{editIsWatched ? "Yes" : "No"}</span>
                  </label>
                </div>
              </div>

              {/* Parts editor */}
              <div className="col-12">
                <label className="form-label d-flex align-items-center justify-content-between">
                  <span>Parts</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success btn-anim"
                    onClick={() =>
                      setEditParts((p) => [
                        ...p,
                        {
                          part_number: Math.max(
                            2,
                            (p[p.length - 1]?.part_number || p.length + 1)
                          ),
                          year: "",
                        },
                      ])
                    }
                    title="Add new part (Part # ≥ 2)"
                  >
                    + Add Part
                  </button>
                </label>

                {editParts?.length ? (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr className="table-light">
                          <th style={{ width: 140 }}>Part #</th>
                          <th style={{ width: 180 }}>Year (required)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editParts.map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                className={`form-control form-control-sm ${
                                  Number(p.part_number) >= 1 ? "" : "is-invalid"
                                }`}
                                value={p.part_number}
                                onChange={(e) => {
                                  const v = onlyDigits(e.target.value);
                                  setEditParts((arr) => {
                                    const copy = [...arr];
                                    copy[idx] = {
                                      ...copy[idx],
                                      part_number: v ? Number(v) : "",
                                    };
                                    return copy;
                                  });
                                }}
                                placeholder="2"
                              />
                              <div className="form-text">
                                New parts must be <b>≥ 2</b>
                              </div>
                            </td>
                            <td>
                              <input
                                className={`form-control form-control-sm ${
                                  p.year && isYear(p.year) ? "" : "is-invalid"
                                }`}
                                value={p.year}
                                onChange={(e) => {
                                  const v = clamp4(e.target.value);
                                  setEditParts((arr) => {
                                    const copy = [...arr];
                                    copy[idx] = { ...copy[idx], year: v };
                                    return copy;
                                  });
                                }}
                                placeholder="e.g., 2022"
                              />
                              {(!p.year || !isYear(p.year)) && (
                                <div className="invalid-feedback">Year required (1888–2100)</div>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger btn-anim"
                                onClick={() =>
                                  setEditParts((arr) => arr.filter((_, i) => i !== idx))
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted small">
                    No parts. Add if this title has extra parts.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-end gap-2">
            <button
              className="btn btn-primary btn-anim"
              disabled={editSubmitting}
              onClick={saveUpdate}
            >
              {editSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm (centered) */}
      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)} size="sm">
          <div className="text-center">
            <div
              className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 64,
                height: 64,
                background:
                  "linear-gradient(135deg, rgba(220,53,69,.15), rgba(111,66,193,.1))",
                border: "2px solid rgba(220,53,69,.3)",
              }}
            >
              <span style={{ fontSize: 28, color: "rgb(220,53,69)" }}>!</span>
            </div>
            <h5 className="mb-2">Delete Movie</h5>
            <p className="text-muted">
              Are you sure you want to delete <b>{confirmDel.movie_name}</b>?
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                className="btn btn-outline-secondary btn-anim"
                onClick={() => setConfirmDel(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger btn-anim" onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Centered alerts */}
      {successAlert && (
        <AlertModal
          kind="success"
          title={successAlert.title}
          message={successAlert.message}
          onClose={() => setSuccessAlert(null)}
        />
      )}
      {errorAlert && (
        <AlertModal
          kind="danger"
          title={errorAlert.title}
          message={errorAlert.message}
          onClose={() => setErrorAlert(null)}
        />
      )}

      {/* Small styles + animations + fancy toggle */}
      <style>{`
        .modal-backdrop-lite {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
          padding: 10px;
        }
        .modal-card {
          width: min(var(--modal-w, 900px), 94vw);
          max-height: 92vh;
          background: #fff; border-radius: 1rem;
          box-shadow: 0 1rem 2rem rgba(0,0,0,.2);
          animation: popIn .18s ease-out;
          display: flex; flex-direction: column;
        }
        .modal-card.size-sm { --modal-w: 720px; }
        .modal-card.size-md { --modal-w: 820px; }
        .modal-card.size-lg { --modal-w: 900px; }
        .modal-head { padding: .5rem 1rem 0 1rem; }
        .modal-body { padding: .5rem 1rem 1rem 1rem; }
        .scroll-area { overflow: auto; }
        .modal-footer {
          padding: .75rem 1rem;
          border-top: 1px solid rgba(0,0,0,.06);
          position: sticky; bottom: 0; background: #fff;
        }
        @keyframes popIn { from { transform: scale(.96); opacity:.6 } to { transform: scale(1); opacity:1 } }
        .bg-gradient { color: #fff; }

        /* Buttons hover/active animation */
        .btn-anim {
          transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
        }
        .btn-anim:hover {
          transform: translateY(-1px);
          box-shadow: 0 .35rem .8rem rgba(0,0,0,.12);
          filter: brightness(1.02);
        }
        .btn-anim:active {
          transform: translateY(0);
          box-shadow: 0 .15rem .45rem rgba(0,0,0,.18) inset;
        }

        /* Dropzone subtle glow on drag */
        .dropzone {
          border-style: dashed;
          cursor: pointer;
          transition: background .12s, transform .12s, box-shadow .12s;
        }
        .dropzone:hover { transform: scale(1.01); }
        .dropzone.glow {
          box-shadow: 0 0 0 .25rem rgba(13,110,253,.12);
        }

        /* Pretty switch */
        .switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          user-select: none;
          cursor: pointer;
        }
        .switch input {
          display: none;
        }
        .switch .slider {
          position: relative;
          width: 50px;
          height: 28px;
          background: #dee2e6;
          border-radius: 999px;
          transition: background .18s ease, box-shadow .18s ease;
          box-shadow: inset 0 2px 6px rgba(0,0,0,.12);
        }
        .switch .slider::after {
          content: "";
          position: absolute;
          top: 3px; left: 3px;
          width: 22px; height: 22px;
          background: #fff;
          border-radius: 50%;
          transition: transform .18s ease, box-shadow .18s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
        }
        .switch input:checked + .slider {
          background: linear-gradient(135deg, #0d6efd, #6f42c1);
        }
        .switch input:checked + .slider::after {
          transform: translateX(22px);
          box-shadow: 0 2px 6px rgba(13,110,253,.4);
        }
        .switch .switch-label {
          min-width: 28px;
          text-align: left;
          font-weight: 600;
          color: #495057;
        }
      `}</style>
    </>
  );
}

/* =========================
   CENTERED MODAL (no Bootstrap JS)
   - Only a single ✕ close button. No bottom Close in View modal.
   - Supports sizes: sm / md / lg
   ========================= */
function Modal({ children, onClose, size = "md" }) {
  const onBackdrop = (e) => {
    if (e.target.classList.contains("modal-backdrop-lite")) onClose?.();
  };
  return (
    <div className="modal-backdrop-lite" onMouseDown={onBackdrop}>
      <div
        className={`modal-card size-${size}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="d-flex justify-content-end p-2 pb-0">
          <button
            className="btn btn-sm btn-outline-secondary btn-anim"
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
