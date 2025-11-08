// src/pages/Entertainment/Manage_Movies.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import LoadingSpiner from "./LoadingSpiner";

const API_BASE = "https://express-backend-myapp.onrender.com/api";

const EP = {
  MOVIES: `${API_BASE}/movies`,
  MOVIE_ONE: (id) => `${API_BASE}/movies/${id}`,
  MOVIES_COUNT: `${API_BASE}/movies/count`,
  MOVIES_COUNT_BY_CAT: `${API_BASE}/movies/count/by-category`,
  CATEGORIES: `${API_BASE}/movies/categories`,
  SUBCATEGORIES: `${API_BASE}/movies/subcategories`,
  GENRES: `${API_BASE}/movies/genres`,
  CREATE_PART: `${API_BASE}/movies/parts`,
  UPDATE_PART: (partId) => `${API_BASE}/movies/parts/${partId}`,
  DELETE_PART: (partId) => `${API_BASE}/movies/parts/${partId}`,
};

export default function Manage_Movies() {
  // --- basic ---
  const [busyCount, setBusyCount] = useState(0);
  const [movies, setMovies] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listProgress, setListProgress] = useState(0);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 10;

  // --- meta / stats ---
  const [categories, setCategories] = useState([]);
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsByCat, setStatsByCat] = useState([]);

  // --- modals ---
  const [viewMovie, setViewMovie] = useState(null);
  const [editMovie, setEditMovie] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // --- edit state ---
  const [editPoster, setEditPoster] = useState("");
  const [editIsWatched, setEditIsWatched] = useState(false);
  const [editParts, setEditParts] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // list loading controllers
  const listAbortRef = useRef(null);
  const fakeProgRef = useRef(null);

  // keep/restore scroll position for list area
  const listWrapRef = useRef(null);
  const lastScrollRef = useRef(0);

  // ---- helpers ----
  const withSpinner = useCallback(async (fn) => {
    setBusyCount((c) => c + 1);
    try {
      return await fn();
    } finally {
      setBusyCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const fetchJson = useCallback(
    async (input, init) =>
      withSpinner(async () => {
        const r = await fetch(input, init);
        let j = null;
        try {
          j = await r.json();
        } catch {
          /* ignore */
        }
        if (!r.ok) {
          const msg = j?.error || j?.message || `Request failed (${r.status})`;
          throw new Error(msg);
        }
        return j;
      }),
    [withSpinner]
  );

  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const clamp4 = (s) => onlyDigits(s).slice(0, 4);
  const isYear = (v) => /^\d{4}$/.test(String(v)) && +v >= 1888 && +v <= 2100;
  const isDataUrl = (s) =>
    typeof s === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(s);

  // ---- meta once ----
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        setBusyCount((c) => c + 1);
        const [cats, total, byCat] = await Promise.all([
          fetch(EP.CATEGORIES, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.MOVIES_COUNT, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.MOVIES_COUNT_BY_CAT, { signal: ac.signal }).then((r) =>
            r.json()
          ),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setStatsTotal(Number(total?.total) || 0);
        setStatsByCat(Array.isArray(byCat) ? byCat : []);
      } catch (e) {
        if (e.name !== "AbortError") setErrorMsg("Could not load movie metadata.");
      } finally {
        setBusyCount((c) => Math.max(0, c - 1));
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const selectedCatMeta = useMemo(() => {
    if (!categoryFilter) return null;
    const id = Number(categoryFilter);
    return statsByCat.find((c) => c.category_id === id) || null;
  }, [categoryFilter, statsByCat]);

  // ---- smooth fake progress helpers ----
  const clearFake = () => {
    if (fakeProgRef.current) {
      clearInterval(fakeProgRef.current);
      fakeProgRef.current = null;
    }
  };
  const startFake = () => {
    clearFake();
    setListProgress(8);
    fakeProgRef.current = setInterval(() => {
      setListProgress((p) => (p < 90 ? p + 2 : p));
    }, 110);
  };
  const finishProgress = () => {
    clearFake();
    setListProgress(100);
    setTimeout(() => setListProgress(0), 250);
  };

  // ---- load list ----
  const loadList = useCallback(
    async (opts = { restoreScroll: false }) => {
      if (opts.restoreScroll && listWrapRef.current) {
        lastScrollRef.current = listWrapRef.current.scrollTop;
      }
      listAbortRef.current?.abort();
      const ac = new AbortSignal.abort ? new AbortController() : new AbortController();
      listAbortRef.current = ac;

      setLoadingList(true);
      startFake();

      try {
        setBusyCount((c) => c + 1);
        const u = new URL(EP.MOVIES);
        if (q.trim()) u.searchParams.set("q", q.trim());
        if (categoryFilter) u.searchParams.set("category_id", categoryFilter);
        u.searchParams.set("limit", String(limit));
        u.searchParams.set("offset", String(page * limit));

        const res = await fetch(u.toString(), { signal: ac.signal });
        if (!res.ok) throw new Error("List fetch failed");

        const contentLen = Number(res.headers.get("content-length") || 0);
        if (res.body && contentLen > 0) {
          const reader = res.body.getReader();
          let received = 0;
          const chunks = [];
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            chunks.push(value);
            const pct = Math.min(99, Math.floor((received / contentLen) * 100));
            setListProgress(pct);
          }
          const blob = new Blob(chunks, { type: "application/json" });
          const text = await blob.text();
          const json = JSON.parse(text || "[]");
          setMovies(Array.isArray(json) ? json : []);
        } else {
          const j = await res.json();
          setMovies(Array.isArray(j) ? j : []);
        }

        finishProgress();
      } catch (e) {
        if (e.name === "AbortError") return;
        setMovies([]);
        setErrorMsg("Could not fetch movies.");
        clearFake();
        setListProgress(0);
      } finally {
        setLoadingList(false);
        setBusyCount((c) => Math.max(0, c - 1));
        requestAnimationFrame(() => {
          if (opts.restoreScroll && listWrapRef.current) {
            listWrapRef.current.scrollTop = lastScrollRef.current || 0;
          }
        });
      }
    },
    [q, categoryFilter, page]
  );

  useEffect(() => {
    loadList();
    return () => listAbortRef.current?.abort();
  }, [loadList]);

  // ---- VIEW movie ----
  const openView = async (movieId) => {
    try {
      const j = await fetchJson(EP.MOVIE_ONE(movieId));
      setViewMovie(j);
    } catch (e) {
      setErrorMsg(e.message || "Could not open movie.");
    }
  };

  // ---- EDIT movie ----
  const openEdit = async (movieId) => {
    try {
      const j = await fetchJson(EP.MOVIE_ONE(movieId));
      setEditMovie({
        movie_id: j.movie_id,
        movie_name: j.movie_name,
      });
      setEditPoster(j.poster_url || "");
      setEditIsWatched(Boolean(j.is_watched));
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
      setErrorMsg(e.message || "Could not open for edit.");
    }
  };

  // drag/drop poster
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
      setErrorMsg("Please drop an image file.");
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
      setErrorMsg("Please choose an image file.");
    }
  };

  // ---- save edit ----
  const saveEdit = async () => {
    if (!editMovie) return;

    if (editPoster && !(isDataUrl(editPoster) || /^https?:\/\//i.test(editPoster))) {
      setErrorMsg("Poster must be a data:image/* or http(s) URL.");
      return;
    }

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
      setErrorMsg(
        "Each part needs a valid year (1888–2100) and part number ≥ 1. New parts must be ≥ 2."
      );
      return;
    }

    setEditSubmitting(true);
    try {
      // Optimistic UI
      setMovies((arr) =>
        arr.map((m) =>
          m.movie_id === editMovie.movie_id
            ? { ...m, poster_url: editPoster || null, is_watched: !!editIsWatched }
            : m
        )
      );

      // 1) update base fields
      await fetchJson(EP.MOVIE_ONE(editMovie.movie_id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_url: editPoster || null,
          is_watched: Boolean(editIsWatched),
        }),
      });

      // 2) sync parts (diff)
      const j2 = await fetchJson(EP.MOVIE_ONE(editMovie.movie_id));
      const currentParts = Array.isArray(j2.parts) ? j2.parts : [];

      const byId = new Map(
        currentParts.filter((p) => p.part_id != null).map((p) => [Number(p.part_id), p])
      );
      const byKey = new Map(currentParts.map((p) => [`${p.part_number}`, p]));

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
          if (needsUpdate) toUpdate.push({ part_id: Number(np.part_id), part_number: Number(np.part_number), year: np.year });
        } else {
          const matched = byKey.get(String(np.part_number));
          if (matched && matched.part_id != null) {
            seenIds.add(Number(matched.part_id));
            const needsUpdate =
              Number(matched.part_number) !== Number(np.part_number) ||
              Number(matched.year || 0) !== Number(np.year || 0);
            if (needsUpdate) {
              toUpdate.push({ part_id: Number(matched.part_id), part_number: Number(np.part_number), year: np.year });
            }
          } else {
            if (Number(np.part_number) < 2) {
              setErrorMsg("Cannot create Part #1. New parts must be ≥ 2.");
              setEditSubmitting(false);
              return;
            }
            toCreate.push({ part_number: Number(np.part_number), year: np.year });
          }
        }
      }

      const toDelete = currentParts
        .filter((p) => p.part_id != null && !seenIds.has(Number(p.part_id)))
        .map((p) => Number(p.part_id));

      for (const c of toCreate) {
        // eslint-disable-next-line no-await-in-loop
        await fetchJson(EP.CREATE_PART, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movie_id: editMovie.movie_id, part_number: c.part_number, year: c.year }),
        });
      }
      for (const u of toUpdate) {
        // eslint-disable-next-line no-await-in-loop
        await fetchJson(EP.UPDATE_PART(u.part_id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ part_number: u.part_number, year: u.year }),
        });
      }
      for (const did of toDelete) {
        // eslint-disable-next-line no-await-in-loop
        await fetchJson(EP.DELETE_PART(did), { method: "DELETE" });
      }

      setEditMovie(null);
      await loadList({ restoreScroll: true }); // keep page & position
      setSuccessMsg("Movie updated.");
    } catch (e) {
      setErrorMsg(e.message || "Could not update movie.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- DELETE movie ----
  const doDelete = async () => {
    if (!confirmDel) return;
    const deletingId = confirmDel.movie_id;

    // Optimistic remove
    setMovies((arr) => arr.filter((m) => m.movie_id !== deletingId));

    try {
      await fetchJson(EP.MOVIE_ONE(deletingId), { method: "DELETE" });
      setConfirmDel(null);

      const willBeEmpty = movies.length <= 1;
      if (willBeEmpty && page > 0) {
        setPage((p) => p - 1);
        await loadList({ restoreScroll: false });
      } else {
        await loadList({ restoreScroll: true });
      }

      setSuccessMsg("Movie deleted.");
    } catch (e) {
      setErrorMsg(e.message || "Could not delete movie.");
      await loadList({ restoreScroll: true });
    }
  };

  // ---- desktop row ----
  const Row = memo(function Row({ row, onView, onEdit, onDelete }) {
    return (
      <tr>
        <td className="text-muted">{row.display_no}</td>
        <td className="fw-semibold">{row.movie_name}</td>
        <td>
          {row.category_name ? (
            <span
              className="badge"
              style={{
                background: "linear-gradient(135deg,#6366f1,#10b981)",
                border: 0,
              }}
            >
              {row.category_name}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td>{row.release_year || "—"}</td>
        <td>
          {row.parts?.length
            ? row.parts.map((p) => `P${p.part_number}(${p.year})`).join(", ")
            : "—"}
        </td>
        <td>
          <span
            className={`badge ${row.is_watched ? "bg-success-subtle" : "bg-secondary-subtle"}`}
            style={{ color: row.is_watched ? "#0f766e" : "#475569" }}
          >
            {row.is_watched ? "Watched" : "Pending"}
          </span>
        </td>
        <td className="text-end">
          <button className="btn btn-sm btn-outline-secondary btn-anim me-1" onClick={() => onView(row.movie_id)}>
            View
          </button>
          <button className="btn btn-sm btn-outline-primary btn-anim me-1" onClick={() => onEdit(row.movie_id)}>
            Edit
          </button>
          <button
            className="btn btn-sm btn-outline-danger btn-anim"
            onClick={() => onDelete({ movie_id: row.movie_id, movie_name: row.movie_name })}
          >
            Delete
          </button>
        </td>
      </tr>
    );
  });

  return (
    <>
      {/* global spinner for non-list work (view/edit/delete) */}
      {busyCount > 0 && <LoadingSpiner message="Loading…" fullScreen />}

      {/* SINGLE full-page centered progress for LIST loading */}
      {loadingList && <CenterPageProgress percent={listProgress} label="Loading movies…" />}

      {/* top hero */}
      <header
        className="border-bottom"
        style={{
          background:
            "radial-gradient(circle at top, rgba(99,102,241,.12), rgba(15,118,110,.03) 45%, #fff 82%)",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <div className="text-muted small mb-1">Entertainment / Movies</div>
            <h3 className="mb-1" style={{ fontWeight: 800, letterSpacing: "-.025rem" }}>
              🎥 Manage Movies
            </h3>
            <p className="text-muted mb-0" style={{ maxWidth: 480 }}>
              Professional list, full-screen view, mobile-first UI.
            </p>
          </div>
          <div className="text-end d-none d-md-block">
            <span
              className="badge rounded-pill"
              style={{
                background: "linear-gradient(135deg,#f97316,#facc15)",
                color: "#0f172a",
              }}
            >
              Total: {statsTotal}
            </span>
          </div>
        </div>
      </header>

      {/* filters */}
      <div className="container mt-3">
        <div className="card border-0 shadow-sm" style={{ borderRadius: "1.15rem" }}>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label small text-muted">Search</label>
                <input
                  type="text"
                  className="form-control"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search by title..."
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small text-muted">Category</label>
                <select
                  className="form-select"
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
              <div className="col-12 col-md-4 text-md-end">
                <label className="form-label d-block small text-muted">&nbsp;</label>
                <button
                  className="btn btn-soft me-2 btn-anim"
                  onClick={() => {
                    setQ("");
                    setCategoryFilter("");
                    setPage(0);
                  }}
                >
                  Reset
                </button>
                <button className="btn btn-emerald btn-anim" onClick={() => loadList({ restoreScroll: false })}>
                  Refresh
                </button>
              </div>
            </div>

            {categoryFilter ? (
              <div className="mt-3 small text-muted">
                <span
                  className="badge rounded-pill me-2"
                  style={{
                    backgroundColor: selectedCatMeta?.category_color || "rgba(99,102,241,.14)",
                    color: "#0f172a",
                  }}
                >
                  {selectedCatMeta?.category_name || "Selected"}
                </span>
                {selectedCatMeta ? `Total in this category: ${selectedCatMeta.total}` : "—"}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* list */}
      <div className="container my-3">
        <div className="card border-0 shadow-sm" style={{ borderRadius: "1.15rem", overflow: "hidden" }}>
          <div
            className="card-header d-flex justify-content-between align-items-center"
            style={{ background: "linear-gradient(90deg, rgba(15,118,110,.08), rgba(99,102,241,.14))" }}
          >
            <span className="fw-semibold">Movies</span>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Page {page + 1}</span>
            </div>
          </div>

          {/* mobile cards */}
          <div className="d-md-none p-2 mm-mobile-list" ref={listWrapRef}>
            {movies.length ? (
              <div className="d-flex flex-column gap-2">
                {movies.map((m) => (
                  <div key={m.movie_id} className="mm-mobile-card">
                    <div className="mm-mobile-top">
                      <div className="mm-mobile-media">
                        {m.poster_url ? (
                          <img src={m.poster_url} alt={m.movie_name} />
                        ) : (
                          <div className="mm-mobile-avatar">
                            {(m.movie_name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mm-mobile-meta">
                        <div className="mm-mobile-title">{m.movie_name}</div>
                        <div className="mm-mobile-tags">
                          {m.category_name ? <span className="mm-tag mm-tag-cat">{m.category_name}</span> : null}
                          {m.release_year ? <span className="mm-tag">{m.release_year}</span> : null}
                          <span className={`mm-tag ${m.is_watched ? "mm-tag-ok" : "mm-tag-muted"}`}>
                            {m.is_watched ? "Watched" : "Pending"}
                          </span>
                        </div>
                        <div className="mm-mobile-extra">
                          Parts:{" "}
                          {m.parts?.length ? m.parts.map((p) => `P${p.part_number}(${p.year})`).join(", ") : "—"}
                        </div>
                      </div>
                      <div className="mm-mobile-right">
                        <div
                          className={`mm-watch-dot ${m.is_watched ? "yes" : "no"}`}
                          title={m.is_watched ? "Watched" : "Not watched"}
                        />
                      </div>
                    </div>
                    <div className="mm-mobile-actions">
                      <button className="mm-btn mm-btn-soft" onClick={() => openView(m.movie_id)}>
                        👁 View
                      </button>
                      <button className="mm-btn mm-btn-green" onClick={() => openEdit(m.movie_id)}>
                        ✏️ Edit
                      </button>
                      <button
                        className="mm-btn mm-btn-danger"
                        onClick={() =>
                          setConfirmDel({ movie_id: m.movie_id, movie_name: m.movie_name })
                        }
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-muted">No movies found.</div>
            )}
          </div>

          {/* desktop table */}
          <div className="table-responsive d-none d-md-block position-relative" ref={listWrapRef}>
            <table className="table align-middle mb-0">
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Year</th>
                  <th>Parts</th>
                  <th>Watched</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.length ? (
                  movies.map((m) => (
                    <Row
                      key={m.movie_id}
                      row={m}
                      onView={openView}
                      onEdit={openEdit}
                      onDelete={setConfirmDel}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No movies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="text-muted small">Total: {statsTotal}</div>
            <div className="btn-group">
              <button
                className="btn btn-soft btn-sm btn-anim"
                disabled={page === 0 || loadingList}
                onClick={async () => {
                  setPage((p) => Math.max(0, p - 1));
                  await new Promise((r) => setTimeout(r, 0));
                }}
              >
                ← Prev
              </button>
              <button
                className="btn btn-soft btn-sm btn-anim"
                disabled={movies.length < limit || loadingList}
                onClick={async () => {
                  setPage((p) => p + 1);
                  await new Promise((r) => setTimeout(r, 0));
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW modal */}
      {viewMovie && (
        <CenterModal onClose={() => setViewMovie(null)} size="lg">
          <div className="movie-view-sheet">
            <div className="movie-view-poster">
              {viewMovie.poster_url ? (
                <img src={viewMovie.poster_url} alt={viewMovie.movie_name} />
              ) : (
                <div className="movie-view-placeholder">
                  <span>{viewMovie.movie_name?.[0] || "?"}</span>
                </div>
              )}
            </div>
            <div className="movie-view-body">
              <h4 className="mv-title">{viewMovie.movie_name}</h4>
              <div className="mv-meta">
                {viewMovie.release_year ? <span className="mv-chip">{viewMovie.release_year}</span> : null}
                {viewMovie.category_name ? (
                  <span className="mv-chip mv-chip-accent">{viewMovie.category_name}</span>
                ) : null}
                <span className={`mv-chip ${viewMovie.is_watched ? "mv-chip-success" : "mv-chip-muted"}`}>
                  {viewMovie.is_watched ? "Watched" : "Not Watched"}
                </span>
              </div>

              <div className="mv-block">
                <span className="mv-label">Subcategory</span>
                <div className="mv-value">{viewMovie.subcategory_name || "—"}</div>
              </div>

              <div className="mv-block">
                <span className="mv-label">Parts</span>
                <div className="mv-value mv-chips">
                  {viewMovie.parts?.length ? (
                    viewMovie.parts.map((p) => (
                      <span key={p.part_id || p.part_number} className="mv-chip">
                        P{p.part_number} ({p.year})
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">No parts</span>
                  )}
                </div>
              </div>

              <div className="mv-block">
                <span className="mv-label">Genres</span>
                <div className="mv-value mv-chips">
                  {viewMovie.genres?.length ? (
                    viewMovie.genres.map((g) => (
                      <span key={g.name} className="mv-chip mv-chip-soft">
                        {g.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </div>
              </div>

              <p className="text-muted small mt-2 mb-0">
                *Quick view — edit if you want to change poster, watched, or parts.
              </p>
            </div>
          </div>
        </CenterModal>
      )}

      {/* EDIT modal */}
      {editMovie && (
        <CenterModal onClose={() => setEditMovie(null)} size="lg">
          <h5 className="mb-2">
            Update Movie <span className="text-muted">— {editMovie.movie_name}</span>
          </h5>

          <div className="modal-body scroll-area">
            {/* Poster */}
            <label className="form-label">Poster (drag & drop or click)</label>
            <div
              className={`mm-dropzone mb-3 ${dragActive ? "glow" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={onPickPoster}
            >
              <div className="fw-semibold mb-1">
                {editPoster ? "Poster selected" : "Drop image here or click to browse"}
              </div>
              <div className="text-muted small">JPG / PNG / WebP</div>
              {editPoster ? (
                <img
                  src={editPoster}
                  alt="Poster preview"
                  className="img-thumbnail mt-2"
                  style={{ maxHeight: 220, objectFit: "cover", borderRadius: "1rem" }}
                />
              ) : null}
              <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={onFileChange} />
            </div>

            {/* Watched */}
            <label className="form-label">Watched?</label>
            <div className="d-flex align-items-center justify-content-between border rounded p-2 mb-3">
              <span className="text-muted small">Mark this if you already watched it.</span>
              <label className="mm-switch ms-2">
                <input
                  type="checkbox"
                  checked={editIsWatched}
                  onChange={(e) => setEditIsWatched(e.target.checked)}
                />
                <span className="mm-slider" />
                <span className="mm-switch-label">{editIsWatched ? "Yes" : "No"}</span>
              </label>
            </div>

            {/* Parts — MOBILE FIRST cards, Desktop table */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">Parts</label>
              <button
                className="btn btn-sm btn-emerald btn-anim"
                type="button"
                onClick={() =>
                  setEditParts((p) => [
                    ...p,
                    { part_number: Math.max(2, (p[p.length - 1]?.part_number || p.length + 1)), year: "" },
                  ])
                }
              >
                + Add Part
              </button>
            </div>

            {/* Mobile / small screens: card list with BIG inputs */}
            <div className="d-md-none">
              {editParts?.length ? (
                <div className="d-flex flex-column gap-2">
                  {editParts.map((p, idx) => (
                    <div key={idx} className="mm-part-card">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="fw-semibold">Part #{p.part_number || "?"}</div>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setEditParts((arr) => arr.filter((_, i) => i !== idx))}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="row g-2 mt-1">
                        <div className="col-6">
                          <label className="form-label small">Part #</label>
                          <input
                            className="form-control mm-input"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={p.part_number}
                            onChange={(e) => {
                              const v = onlyDigits(e.target.value);
                              setEditParts((arr) => {
                                const copy = [...arr];
                                copy[idx] = { ...copy[idx], part_number: v ? Number(v) : "" };
                                return copy;
                              });
                            }}
                            placeholder="2"
                          />
                          <small className="text-muted">New parts must be ≥ 2</small>
                        </div>
                        <div className="col-6">
                          <label className="form-label small">Year</label>
                          <input
                            className={`form-control mm-input ${p.year && isYear(p.year) ? "" : "is-invalid"}`}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={p.year}
                            onChange={(e) => {
                              const v = clamp4(e.target.value);
                              setEditParts((arr) => {
                                const copy = [...arr];
                                copy[idx] = { ...copy[idx], year: v };
                                return copy;
                              });
                            }}
                            placeholder="2025"
                          />
                          {(!p.year || !isYear(p.year)) && (
                            <div className="invalid-feedback">Enter full year (1888–2100)</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small">No parts yet.</p>
              )}
            </div>

            {/* Desktop: compact table (still large enough to see full year) */}
            <div className="d-none d-md-block">
              {editParts?.length ? (
                <div className="table-responsive mb-2">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr className="table-light">
                        <th style={{ width: 160 }}>Part #</th>
                        <th style={{ width: 200 }}>Year</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {editParts.map((p, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              className="form-control mm-input"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={p.part_number}
                              onChange={(e) => {
                                const v = onlyDigits(e.target.value);
                                setEditParts((arr) => {
                                  const copy = [...arr];
                                  copy[idx] = { ...copy[idx], part_number: v ? Number(v) : "" };
                                  return copy;
                                });
                              }}
                              placeholder="2"
                            />
                            <small className="text-muted">New parts must be ≥ 2</small>
                          </td>
                          <td>
                            <input
                              className={`form-control mm-input ${p.year && isYear(p.year) ? "" : "is-invalid"}`}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={p.year}
                              onChange={(e) => {
                                const v = clamp4(e.target.value);
                                setEditParts((arr) => {
                                  const copy = [...arr];
                                  copy[idx] = { ...copy[idx], year: v };
                                  return copy;
                                });
                              }}
                              placeholder="2025"
                            />
                            {(!p.year || !isYear(p.year)) && (
                              <div className="invalid-feedback">Enter full year (1888–2100)</div>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-danger btn-anim"
                              onClick={() => setEditParts((arr) => arr.filter((_, i) => i !== idx))}
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
                <p className="text-muted small">No parts yet.</p>
              )}
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-end gap-2">
            <button className="btn btn-emerald btn-anim" onClick={saveEdit} disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </CenterModal>
      )}

      {/* delete modal */}
      {confirmDel && (
        <CenterModal onClose={() => setConfirmDel(null)} size="sm">
          <div className="text-center">
            <div
              className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 64,
                height: 64,
                background: "linear-gradient(135deg, rgba(248,113,113,.15), rgba(99,102,241,.12))",
              }}
            >
              <span style={{ fontSize: 28, color: "#dc2626" }}>!</span>
            </div>
            <h5 className="mb-2">Delete movie?</h5>
            <p className="text-muted mb-3">
              {confirmDel.movie_name}
              <br />
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <button className="btn btn-soft btn-anim" onClick={() => setConfirmDel(null)}>
                Cancel
              </button>
              <button className="btn btn-outline-danger btn-anim" onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>
        </CenterModal>
      )}

      {/* alerts */}
      {successMsg && (
        <Toastish kind="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Toastish>
      )}
      {errorMsg && (
        <Toastish kind="danger" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Toastish>
      )}

      {/* styles */}
      <style>{`
        .btn-emerald{
          background: linear-gradient(135deg,#10b981,#0f766e);
          border: none;
          color: #fff;
        }
        .btn-soft{
          background: rgba(15,23,42,.03);
          border: 1px solid rgba(15,23,42,.02);
        }
        .btn-anim{ transition: transform .12s ease, box-shadow .12s ease, filter .12s ease; }
        .btn-anim:hover{ transform: translateY(-1px); box-shadow: 0 .5rem 1.1rem rgba(15,23,42,.12); filter: brightness(1.02); }

        .mm-dropzone{
          border:2px dashed rgba(16,185,129,.35);
          border-radius:1rem;
          background:rgba(255,255,255,.4);
          text-align:center;
          padding:1.2rem .8rem;
          cursor:pointer;
          transition: box-shadow .12s ease, transform .12s ease;
        }
        .mm-dropzone.glow{ box-shadow: 0 0 0 .2rem rgba(16,185,129,.12); transform: scale(1.01); }

        .mm-switch{ position:relative; display:inline-flex; align-items:center; gap:.35rem; }
        .mm-switch input{ display:none; }
        .mm-slider{ width:50px; height:28px; background:#e2e8f0; border-radius:999px; position:relative; transition: background .18s ease; }
        .mm-slider::after{ content:""; position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:999px; background:#fff; transition: transform .18s ease; box-shadow:0 2px 6px rgba(0,0,0,.15); }
        .mm-switch input:checked + .mm-slider{ background:linear-gradient(135deg,#10b981,#6366f1); }
        .mm-switch input:checked + .mm-slider::after{ transform:translateX(22px); }
        .mm-switch-label{ font-size:.75rem; font-weight:700; color:#0f172a; }

        .toastish{
          position:fixed; top:1rem; right:1rem;
          background:#fff; border-radius:.75rem;
          box-shadow:0 14px 35px rgba(15,23,42,.15);
          padding:.5rem .75rem; display:flex; gap:.5rem; align-items:center;
          z-index:9999; min-width:200px;
        }
        @media (max-width:575.98px){ .toastish{ left: .5rem; right: .5rem; } }

        /* MOBILE LIST */
        .mm-mobile-list{ background: radial-gradient(circle at 10% 10%, rgba(99,102,241,.03), #fff 70%); max-height: 70vh; overflow: auto; }
        .mm-mobile-card{
          background: #ffffff;
          border: 1px solid rgba(15,23,42,.03);
          border-radius: 1rem;
          padding: .75rem .8rem .6rem;
          display: flex; flex-direction: column; gap: .55rem;
          box-shadow: 0 8px 30px rgba(15,23,42,.05);
        }
        .mm-mobile-top{ display: flex; gap: .65rem; align-items: flex-start; }
        .mm-mobile-media img{ width: 52px; height: 70px; object-fit: cover; border-radius: .75rem; box-shadow: 0 9px 18px rgba(15,23,42,.25); }
        .mm-mobile-avatar{ width: 52px; height: 52px; border-radius: 1rem; background: linear-gradient(135deg,#6366f1,#10b981); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; }
        .mm-mobile-meta{ flex: 1; min-width: 0; }
        .mm-mobile-title{
          font-weight: 600; font-size: .92rem; color: #0f172a; line-height: 1.15; margin-bottom: .25rem;
          white-space: normal; word-break: normal; overflow-wrap: anywhere;
        }
        .mm-mobile-tags{ display:flex; flex-wrap:wrap; gap:.25rem; margin-bottom:.25rem; }
        .mm-tag{ background: rgba(148,163,184,.12); border-radius: 999px; padding: .08rem .55rem .15rem; font-size: .65rem; line-height: 1.2; color: #0f172a; white-space: normal; overflow-wrap:anywhere; }
        .mm-tag-cat{ background: linear-gradient(135deg,rgba(99,102,241,.18),rgba(16,185,129,.25)); }
        .mm-tag-ok{ background: rgba(16,185,129,.15); color: #065f46; font-weight: 500; }
        .mm-tag-muted{ background: rgba(148,163,184,.12); color: #475569; }
        .mm-mobile-extra{ font-size: .63rem; color: #94a3b8; }
        .mm-mobile-right{ display:flex; align-items:flex-start; }
        .mm-watch-dot{ width: 16px; height: 16px; border-radius: 999px; border: 2px solid #fff; box-shadow: 0 0 0 2px rgba(15,23,42,.12); }
        .mm-watch-dot.yes{ background: linear-gradient(135deg,#10b981,#22c55e); }
        .mm-watch-dot.no{ background: rgba(148,163,184,.35); }
        .mm-mobile-actions{ display:flex; gap:.4rem; }
        .mm-btn{ flex:1; border:none; border-radius:.7rem; font-size:.7rem; font-weight:500; padding:.35rem .4rem .45rem; display:flex; align-items:center; justify-content:center; gap:.25rem; transition: transform .12s ease, box-shadow .12s ease; }
        .mm-btn:active{ transform: translateY(1px); }
        .mm-btn-soft{ background: rgba(15,23,42,.015); border:1px solid rgba(148,163,184,.12); }
        .mm-btn-green{ background: linear-gradient(135deg,#10b981,#0f766e); color:#fff; }
        .mm-btn-danger{ background: rgba(248,113,113,.12); color:#b91c1c; }

        /* Movie view */
        .movie-view-sheet{ display:flex; gap:1.25rem; }
        .movie-view-poster img{ width:180px; max-height:250px; height:auto; object-fit:cover; border-radius:1.1rem; box-shadow:0 18px 35px rgba(15,23,42,.3); }
        .movie-view-placeholder{
          width:180px; max-height:250px; aspect-ratio: 9 / 12; border-radius:1.1rem;
          background:linear-gradient(140deg, rgba(99,102,241,.6), rgba(16,185,129,.6));
          display:flex; align-items:center; justify-content:center; color:#fff; font-size:2.5rem; font-weight:800; box-shadow:0 18px 35px rgba(15,23,42,.3);
        }
        .movie-view-body{ flex:1; min-width:200px; }
        .mv-title{ font-weight:700; margin-bottom:.35rem; }
        .mv-meta{ display:flex; gap:.35rem; flex-wrap:wrap; margin-bottom:.85rem; }
        .mv-chip{ background:rgba(15,23,42,.03); border-radius:999px; padding:.25rem .75rem; font-size:.7rem; font-weight:500; color:#0f172a; }
        .mv-chip-accent{ background:linear-gradient(135deg,#6366f1,#10b981); color:#fff; }
        .mv-chip-success{ background:rgba(16,185,129,.12); color:#065f46; }
        .mv-chip-muted{ background:rgba(148,163,184,.2); color:#0f172a; }
        .mv-block{ margin-bottom:.6rem; }
        .mv-label{ font-size:.68rem; text-transform:uppercase; letter-spacing:.04em; color:#94a3b8; display:block; margin-bottom:.2rem; }
        .mv-value{ font-size:.8rem; }
        .mv-chips{ display:flex; gap:.35rem; flex-wrap:wrap; }
        .mv-chip-soft{ background:rgba(99,102,241,.12); color:#1f2937; }

        @media (max-width:768px){
          .movie-view-sheet{ flex-direction:column; }
          .movie-view-poster img, .movie-view-placeholder{ width:100%; height:auto; max-height:260px; object-fit:contain; border-radius:1rem; }
        }

        .scroll-area{ max-height:70vh; overflow-y:auto; }
        @media (max-width:575.98px){ .scroll-area{ max-height:72vh; } }

        /* EDIT PARTS: mobile cards */
        .mm-part-card{
          border:1px solid rgba(15,23,42,.06);
          border-radius:1rem;
          padding:.75rem;
          background:#fff;
          box-shadow: 0 6px 18px rgba(15,23,42,.06);
        }
        .mm-input{
          font-size:1rem; /* bigger text so digits don't look clipped */
          padding:.55rem .65rem;
          border-radius:.75rem;
        }
      `}</style>
    </>
  );
}

/* SINGLE full-page centered progress for list loads */
function CenterPageProgress({ percent = 0, label = "Loading…" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255,255,255,.78)",
        backdropFilter: "blur(2px)",
        zIndex: 9997,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 18px 40px rgba(15,23,42,.18)",
          width: "min(360px, 92vw)",
          padding: "1rem 1.25rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: ".35rem" }}>{label}</div>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "#eef2f7",
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,.35)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percent}%`,
              transition: "width .15s ease",
              background:
                "linear-gradient(90deg, rgba(20,184,166,1), rgba(99,102,241,1))",
            }}
          />
        </div>
        <div style={{ fontSize: ".8rem", color: "#64748b", marginTop: ".35rem" }}>
          {percent}%
        </div>
      </div>
    </div>
  );
}

/* centered modal */
function CenterModal({ children, onClose, size = "md" }) {
  const onBackdrop = (e) => {
    if (e.target.classList.contains("mm-backdrop")) onClose?.();
  };
  return (
    <div
      className="mm-backdrop"
      onMouseDown={onBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        backdropFilter: "blur(4px)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`mm-modal mm-${size}`}
        style={{
          background: "#fff",
          borderRadius: "1rem",
          width: size === "sm" ? "min(420px, 100%)" : size === "lg" ? "min(920px, 100%)" : "min(660px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 20px 50px rgba(15,23,42,.28)",
          animation: "mm-pop .16s ease-out",
          position: "relative",
        }}
      >
        <div className="d-flex justify-content-end p-2 pb-0">
          <button className="btn btn-sm btn-soft btn-anim" onClick={onClose} style={{ borderRadius: 999 }}>
            ✕
          </button>
        </div>
        <div style={{ padding: "1rem" }}>{children}</div>

        <style>{`
          @keyframes mm-pop{ from{transform:scale(.97); opacity:.6} to{transform:scale(1); opacity:1} }
          @media (max-width:575.98px){
            .mm-modal{ width: 100%; height: 100%; max-height: 100vh; border-radius: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}

/* toast */
function Toastish({ children, kind = "info", onClose }) {
  const color =
    kind === "success"
      ? "rgba(16,185,129,.12)"
      : kind === "danger"
      ? "rgba(248,113,113,.15)"
      : "rgba(99,102,241,.12)";
  return (
    <div className="toastish" style={{ background: color }}>
      <div style={{ fontWeight: 700, fontSize: ".78rem" }}>
        {kind === "success" ? "✓" : kind === "danger" ? "!" : "i"}
      </div>
      <div style={{ fontSize: ".75rem" }}>{children}</div>
      <button className="btn btn-sm btn-soft" style={{ borderRadius: 999, padding: "0 .45rem" }} onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
