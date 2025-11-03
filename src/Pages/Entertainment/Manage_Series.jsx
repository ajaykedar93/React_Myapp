// src/pages/Entertainment/Manage_Series.jsx
// Mobile-first, professional Series manager (list + view + edit + delete)

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import LoadingSpiner from "./LoadingSpiner";

// ===== API ROOT =====
const API_BASE = "https://express-backend-myapp.onrender.com/api";
const EP = {
  SERIES: `${API_BASE}/series`,
  SERIES_ONE: (id) => `${API_BASE}/series/${id}`,
  SERIES_COUNT: `${API_BASE}/series/count`,
  SERIES_COUNT_BY_CAT: `${API_BASE}/series/count/by-category`,
  CATEGORIES: `${API_BASE}/series/categories`,
  SUBCATEGORIES: `${API_BASE}/series/subcategories`,
  GENRES: `${API_BASE}/series/genres`,
  // seasons (same style as movies parts — adjust to your backend)
  CREATE_SEASON: `${API_BASE}/series/seasons`,
  UPDATE_SEASON: (id) => `${API_BASE}/series/seasons/${id}`,
  DELETE_SEASON: (id) => `${API_BASE}/series/seasons/${id}`,
};

export default function Manage_Series() {
  // global busy
  const [busy, setBusy] = useState(0);

  // list + filters
  const [series, setSeries] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 10;

  // meta
  const [categories, setCategories] = useState([]);
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsByCat, setStatsByCat] = useState([]);

  // modals
  const [viewSeries, setViewSeries] = useState(null);
  const [editSeries, setEditSeries] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  // edit state
  const [editPoster, setEditPoster] = useState("");
  const [editIsWatched, setEditIsWatched] = useState(false);
  const [editSeasons, setEditSeasons] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // toasts
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const withBusy = useCallback(async (fn) => {
    setBusy((c) => c + 1);
    try {
      return await fn();
    } finally {
      setBusy((c) => Math.max(0, c - 1));
    }
  }, []);

  // ====== load meta once ======
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        setBusy((c) => c + 1);
        const [cats, total, byCat] = await Promise.all([
          fetch(EP.CATEGORIES, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.SERIES_COUNT, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.SERIES_COUNT_BY_CAT, { signal: ac.signal }).then((r) =>
            r.json()
          ),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setStatsTotal(Number(total?.total) || 0);
        setStatsByCat(Array.isArray(byCat) ? byCat : []); // by category
      } catch (e) {
        if (e.name !== "AbortError") {
          setErrorMsg("Could not load series metadata.");
        }
      } finally {
        if (!cancelled) setBusy((c) => Math.max(0, c - 1));
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  // selected cat
  const selectedCatMeta = useMemo(() => {
    if (!categoryFilter) return null;
    const id = Number(categoryFilter);
    return statsByCat.find((c) => c.category_id === id) || null;
  }, [categoryFilter, statsByCat]);

  // ====== load list whenever filters change ======
  const listAbortRef = useRef(null);
  const loadList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;
    setLoadingList(true);
    try {
      const u = new URL(EP.SERIES);
      if (q.trim()) u.searchParams.set("q", q.trim());
      if (categoryFilter !== "") u.searchParams.set("category_id", categoryFilter);
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("offset", String(page * limit));
      const r = await fetch(u.toString(), { signal: ac.signal });
      if (!r.ok) throw new Error("List failed");
      const j = await r.json();
      setSeries(Array.isArray(j) ? j : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        setSeries([]);
        setErrorMsg("Could not fetch series.");
      }
    } finally {
      setLoadingList(false);
    }
  }, [q, categoryFilter, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ===== helpers =====
  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const clamp4 = (s) => onlyDigits(s).slice(0, 4);
  const isYear = (v) => /^\d{4}$/.test(String(v)) && +v >= 1888 && +v <= 2100;
  const isDataUrl = (s) =>
    typeof s === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(s);

  // ===== view modal open =====
  const openView = async (seriesId) => {
    try {
      const j = await withBusy(async () => {
        const r = await fetch(EP.SERIES_ONE(seriesId));
        const jj = await r.json();
        if (!r.ok) throw new Error(jj?.error || "Could not open series.");
        return jj;
      });
      setViewSeries(j);
    } catch (e) {
      setErrorMsg(e.message || "Could not open series.");
    }
  };

  // ===== edit modal open =====
  const openEdit = async (seriesId) => {
    try {
      const j = await withBusy(async () => {
        const r = await fetch(EP.SERIES_ONE(seriesId));
        const jj = await r.json();
        if (!r.ok) throw new Error(jj?.error || "Could not open for edit.");
        return jj;
      });

      setEditSeries({
        series_id: j.series_id,
        series_name: j.series_name,
      });
      setEditPoster(j.poster_url || "");
      setEditIsWatched(Boolean(j.is_watched));
      setEditSeasons(
        Array.isArray(j.seasons)
          ? j.seasons.map((s) => ({
              season_id: s.season_id ?? undefined,
              season_no: Number(s.season_no) || 1,
              year: String(s.year || ""),
            }))
          : []
      );
    } catch (e) {
      setErrorMsg(e.message || "Could not open for edit.");
    }
  };

  // drag/drop
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

  // ===== save edit =====
  const saveEdit = async () => {
    if (!editSeries) return;

    if (
      editPoster &&
      !(isDataUrl(editPoster) || /^https?:\/\//i.test(editPoster))
    ) {
      setErrorMsg("Poster must be a data:image/* or http(s) URL.");
      return;
    }

    // normalize seasons
    const normalized = (editSeasons || []).map((s, idx) => ({
      season_id: s.season_id,
      season_no: Number(s.season_no) || idx + 1,
      year: s.year === "" ? null : Number(s.year),
    }));

    const badSeason =
      normalized.length > 0 &&
      normalized.some(
        (s) =>
          !(Number.isInteger(s.season_no) && s.season_no >= 1) ||
          s.year === null ||
          !isYear(s.year)
      );

    if (badSeason) {
      setErrorMsg(
        "Each season needs a valid year (1888–2100) and season number ≥ 1. New seasons must be ≥ 2."
      );
      return;
    }

    setEditSubmitting(true);
    try {
      // 1) update series (poster + is_watched)
      await withBusy(async () => {
        const r = await fetch(EP.SERIES_ONE(editSeries.series_id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poster_url: editPoster || null,
            is_watched: Boolean(editIsWatched),
          }),
        });
        const jj = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(jj?.error || "Could not update series.");
      });

      // 2) re-fetch current seasons & diff
      const j2 = await withBusy(async () => {
        const r = await fetch(EP.SERIES_ONE(editSeries.series_id));
        const jj = await r.json();
        if (!r.ok) throw new Error(jj?.error || "Could not refresh seasons.");
        return jj;
      });
      const currentSeasons = Array.isArray(j2.seasons) ? j2.seasons : [];

      const byId = new Map(
        currentSeasons
          .filter((s) => s.season_id != null)
          .map((s) => [Number(s.season_id), s])
      );
      const byNo = new Map(
        currentSeasons.map((s) => [String(s.season_no), s])
      );

      const toCreate = [];
      const toUpdate = [];
      const seenIds = new Set();

      for (const ns of normalized) {
        if (ns.season_id && byId.has(Number(ns.season_id))) {
          // existing
          seenIds.add(Number(ns.season_id));
          const srv = byId.get(Number(ns.season_id));
          const needsUpdate =
            Number(srv.season_no) !== Number(ns.season_no) ||
            Number(srv.year || 0) !== Number(ns.year || 0);
          if (needsUpdate) {
            toUpdate.push({
              season_id: Number(ns.season_id),
              season_no: Number(ns.season_no),
              year: ns.year,
            });
          }
        } else {
          // match by season_no
          const matched = byNo.get(String(ns.season_no));
          if (matched && matched.season_id != null) {
            seenIds.add(Number(matched.season_id));
            const needsUpdate =
              Number(matched.season_no) !== Number(ns.season_no) ||
              Number(matched.year || 0) !== Number(ns.year || 0);
            if (needsUpdate) {
              toUpdate.push({
                season_id: Number(matched.season_id),
                season_no: Number(ns.season_no),
                year: ns.year,
              });
            }
          } else {
            // create new
            if (Number(ns.season_no) < 2) {
              setErrorMsg("Cannot create Season #1. New seasons must be ≥ 2.");
              setEditSubmitting(false);
              return;
            }
            toCreate.push({
              season_no: Number(ns.season_no),
              year: ns.year,
            });
          }
        }
      }

      const toDelete = currentSeasons
        .filter(
          (s) => s.season_id != null && !seenIds.has(Number(s.season_id))
        )
        .map((s) => Number(s.season_id));

      // apply
      for (const c of toCreate) {
        // eslint-disable-next-line no-await-in-loop
        await withBusy(async () => {
          const r = await fetch(EP.CREATE_SEASON, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              series_id: editSeries.series_id,
              season_no: c.season_no,
              year: c.year,
            }),
          });
          if (!r.ok) throw new Error("Could not create season.");
        });
      }
      for (const u of toUpdate) {
        // eslint-disable-next-line no-await-in-loop
        await withBusy(async () => {
          const r = await fetch(EP.UPDATE_SEASON(u.season_id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              season_no: u.season_no,
              year: u.year,
            }),
          });
          if (!r.ok) throw new Error("Could not update season.");
        });
      }
      for (const did of toDelete) {
        // eslint-disable-next-line no-await-in-loop
        await withBusy(async () => {
          const r = await fetch(EP.DELETE_SEASON(did), { method: "DELETE" });
          if (!r.ok) throw new Error("Could not delete season.");
        });
      }

      setEditSeries(null);
      await loadList();
      setSuccessMsg("Series updated.");
    } catch (e) {
      setErrorMsg(e.message || "Could not update series.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ===== delete =====
  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await withBusy(async () => {
        const r = await fetch(EP.SERIES_ONE(confirmDel.series_id), {
          method: "DELETE",
        });
        const jj = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(jj?.error || "Could not delete series.");
      });
      setConfirmDel(null);
      await loadList();
      setSuccessMsg("Series deleted.");
    } catch (e) {
      setErrorMsg(e.message || "Could not delete series.");
    }
  };

  return (
    <>
      {busy > 0 && <LoadingSpiner message="Loading…" fullScreen />}

      {/* TOP HERO */}
      <header
        className="border-bottom"
        style={{
          background:
            "linear-gradient(140deg, rgba(14,165,233,.15), rgba(124,58,237,.08) 40%, rgba(15,23,42,0))",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="text-muted small mb-1">Entertainment / Series</div>
            <h3
              className="mb-1"
              style={{ fontWeight: 800, letterSpacing: "-.02rem" }}
            >
              📺 Manage Series
            </h3>
            <p className="text-muted mb-0" style={{ maxWidth: 520 }}>
              Search, filter, view, edit and delete series — mobile-first.
            </p>
          </div>
          <div className="text-end d-none d-md-block">
            <span
              className="badge rounded-pill"
              style={{
                background: "linear-gradient(120deg,#0f766e,#22c55e)",
                color: "#fff",
                fontSize: ".7rem",
                padding: ".4rem .8rem",
              }}
            >
              Total Series: {statsTotal}
            </span>
          </div>
        </div>
      </header>

      {/* FILTERS CARD */}
      <div className="container mt-3">
        <div
          className="card border-0 shadow-sm"
          style={{ borderRadius: "1.15rem" }}
        >
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
                {categoryFilter ? (
                  <div className="mt-2 small text-muted d-flex align-items-center gap-2">
                    <span
                      className="rounded-pill px-2 py-1"
                      style={{
                        background:
                          selectedCatMeta?.category_color ||
                          "rgba(14,165,233,.12)",
                      }}
                    >
                      {selectedCatMeta?.category_name || "Selected"}
                    </span>
                    <span>
                      Total: {selectedCatMeta ? selectedCatMeta.total : "—"}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="col-12 col-md-4 text-md-end">
                <label className="form-label d-block small text-muted">
                  &nbsp;
                </label>
                <button
                  className="btn btn-soft me-2"
                  onClick={() => {
                    setQ("");
                    setCategoryFilter("");
                    setPage(0);
                  }}
                >
                  Reset
                </button>
                <button
                  className="btn btn-emerald"
                  onClick={loadList}
                  style={{ color: "#fff" }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIST CARD */}
      <div className="container my-3">
        <div
          className="card border-0 shadow-sm"
          style={{ borderRadius: "1.15rem", overflow: "hidden" }}
        >
          <div
            className="card-header d-flex justify-content-between align-items-center"
            style={{
              background:
                "linear-gradient(90deg, rgba(14,165,233,.12), rgba(124,58,237,.12))",
            }}
          >
            <span className="fw-semibold">Series</span>
            <span className="text-muted small">Page {page + 1}</span>
          </div>

          {/* MOBILE LIST (attractive, with poster + buttons) */}
          <div className="d-md-none p-2 mm-series-mobile">
            {loadingList ? (
              <div className="text-center py-3 text-muted">
                <div className="spinner-border spinner-border-sm me-2" />
                Loading…
              </div>
            ) : series.length ? (
              <div className="d-flex flex-column gap-2">
                {series.map((s) => (
                  <div key={s.series_id} className="mm-series-card">
                    <div className="mm-series-top">
                      <div className="mm-series-media">
                        {s.poster_url ? (
                          <img src={s.poster_url} alt={s.series_name} />
                        ) : (
                          <div className="mm-series-avatar">
                            {(s.series_name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mm-series-meta">
                        <div className="mm-series-title">{s.series_name}</div>
                        <div className="mm-series-tags">
                          {s.category_name ? (
                            <span className="mm-tag mm-tag-cat">
                              {s.category_name}
                            </span>
                          ) : null}
                          {s.release_year ? (
                            <span className="mm-tag">{s.release_year}</span>
                          ) : null}
                          <span
                            className={`mm-tag ${
                              s.is_watched ? "mm-tag-ok" : "mm-tag-muted"
                            }`}
                          >
                            {s.is_watched ? "Watched" : "Pending"}
                          </span>
                        </div>
                        <div className="mm-series-extra">
                          Seasons:{" "}
                          {s.seasons?.length
                            ? s.seasons
                                .map(
                                  (p) => `S${p.season_no}(${p.year || "—"})`
                                )
                                .join(", ")
                            : "—"}
                        </div>
                      </div>
                      <div className="mm-series-right">
                        <div
                          className={`mm-watch-dot ${
                            s.is_watched ? "yes" : "no"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="mm-series-actions">
                      <button
                        className="mm-btn mm-btn-soft"
                        onClick={() => openView(s.series_id)}
                      >
                        👁 View
                      </button>
                      <button
                        className="mm-btn mm-btn-green"
                        onClick={() => openEdit(s.series_id)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="mm-btn mm-btn-danger"
                        onClick={() =>
                          setConfirmDel({
                            series_id: s.series_id,
                            series_name: s.series_name,
                          })
                        }
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-muted">No series found.</div>
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="table-responsive d-none d-md-block position-relative">
            {loadingList && (
              <div
                className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center"
                style={{ inset: 0, background: "rgba(255,255,255,.6)", zIndex: 1 }}
              >
                <div className="spinner-border" role="status" aria-hidden="true" />
                <span className="ms-2 text-muted">Loading…</span>
              </div>
            )}
            <table className="table align-middle mb-0">
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Year</th>
                  <th>Seasons</th>
                  <th>Watched</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loadingList && series.length ? (
                  series.map((s) => (
                    <tr key={s.series_id}>
                      <td className="text-muted">{s.display_no}</td>
                      <td className="fw-semibold d-flex align-items-center gap-2">
                        {s.poster_url ? (
                          <img
                            src={s.poster_url}
                            alt={s.series_name}
                            style={{
                              width: 38,
                              height: 50,
                              objectFit: "cover",
                              borderRadius: ".4rem",
                            }}
                          />
                        ) : null}
                        {s.series_name}
                      </td>
                      <td>
                        {s.category_name ? (
                          <span
                            className="badge"
                            style={{
                              background:
                                "linear-gradient(135deg,#0f766e,#22c55e)",
                              border: 0,
                            }}
                          >
                            {s.category_name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{s.release_year || "—"}</td>
                      <td>
                        {s.seasons?.length
                          ? s.seasons
                              .map((p) => `S${p.season_no}(${p.year || "—"})`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.is_watched
                              ? "bg-success-subtle"
                              : "bg-secondary-subtle"
                          }`}
                          style={{ color: s.is_watched ? "#0f766e" : "#475569" }}
                        >
                          {s.is_watched ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => openView(s.series_id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEdit(s.series_id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            setConfirmDel({
                              series_id: s.series_id,
                              series_name: s.series_name,
                            })
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : !loadingList ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No series found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* FOOTER / PAGINATION */}
          <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="text-muted small">Total: {statsTotal}</div>
            <div className="btn-group">
              <button
                className="btn btn-soft btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              <button
                className="btn btn-soft btn-sm"
                disabled={series.length < limit}
                onClick={() => setPage((p) => p + 1)}   
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODAL (full-page on mobile, poster not cropped) */}
      {viewSeries && (
        <CenterModal onClose={() => setViewSeries(null)} size="lg">
          <div className="series-view-sheet">
            <div className="series-view-poster">
              {viewSeries.poster_url ? (
                <img src={viewSeries.poster_url} alt={viewSeries.series_name} />
              ) : (
                <div className="series-view-placeholder">
                  <span>{viewSeries.series_name?.[0] || "S"}</span>
                </div>
              )}
            </div>
            <div className="series-view-body">
              <h4 className="sv-title">{viewSeries.series_name}</h4>
              <div className="sv-meta">
                {viewSeries.release_year ? (
                  <span className="sv-chip">{viewSeries.release_year}</span>
                ) : null}
                {viewSeries.category_name ? (
                  <span className="sv-chip sv-chip-accent">
                    {viewSeries.category_name}
                  </span>
                ) : null}
                <span
                  className={`sv-chip ${
                    viewSeries.is_watched ? "sv-chip-success" : "sv-chip-muted"
                  }`}
                >
                  {viewSeries.is_watched ? "Watched" : "Not Watched"}
                </span>
              </div>

              <div className="sv-block">
                <span className="sv-label">Subcategory</span>
                <div className="sv-value">
                  {viewSeries.subcategory_name || "—"}
                </div>
              </div>

              <div className="sv-block">
                <span className="sv-label">Seasons</span>
                <div className="sv-value sv-chips">
                  {viewSeries.seasons?.length ? (
                    viewSeries.seasons.map((p) => (
                      <span
                        key={p.season_id || p.season_no}
                        className="sv-chip sv-chip-soft"
                      >
                        S{p.season_no} ({p.year || "—"})
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">No seasons</span>
                  )}
                </div>
              </div>

              <div className="sv-block">
                <span className="sv-label">Genres</span>
                <div className="sv-value sv-chips">
                  {viewSeries.genres?.length ? (
                    viewSeries.genres.map((g) => (
                      <span key={g.name} className="sv-chip">
                        {g.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </div>
              </div>

              <p className="text-muted small mt-2 mb-0">
                *Quick view — edit if you want to change poster, watched, or seasons.
              </p>
            </div>
          </div>
        </CenterModal>
      )}

      {/* EDIT MODAL */}
      {editSeries && (
        <CenterModal onClose={() => setEditSeries(null)} size="lg">
          <h5 className="mb-2">
            Update Series{" "}
            <span className="text-muted">— {editSeries.series_name}</span>
          </h5>

          <div className="modal-body scroll-area">
            <label className="form-label">Poster (drop or click)</label>
            <div
              className={`mm-dropzone mb-3 ${dragActive ? "glow" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={onPickPoster}
            >
              <div className="fw-semibold mb-1">
                Drop image here {editPoster ? " (selected)" : ""}
              </div>
              <div className="text-muted small">JPG/PNG/WebP. Click to browse.</div>
              {editPoster ? (
                <img
                  src={editPoster}
                  alt="Poster preview"
                  className="img-thumbnail mt-2"
                  style={{ maxHeight: 150, objectFit: "cover" }}
                />
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={onFileChange}
              />
            </div>

            <label className="form-label">Watched?</label>
            <div className="d-flex align-items-center justify-content-between border rounded p-2 mb-3">
              <span className="text-muted small">
                Mark this if you already watched it.
              </span>
              <label className="mm-switch ms-2">
                <input
                  type="checkbox"
                  checked={editIsWatched}
                  onChange={(e) => setEditIsWatched(e.target.checked)}
                />
                <span className="mm-slider" />
                <span className="mm-switch-label">
                  {editIsWatched ? "Yes" : "No"}
                </span>
              </label>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">Seasons</label>
              <button
                className="btn btn-sm btn-emerald"
                type="button"
                onClick={() =>
                  setEditSeasons((p) => [
                    ...p,
                    {
                      season_no: Math.max(
                        2,
                        (p[p.length - 1]?.season_no || p.length + 1)
                      ),
                      year: "",
                    },
                  ])
                }
              >
                + Add Season
              </button>
            </div>

            {editSeasons?.length ? (
              <div className="table-responsive mb-2">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr className="table-light">
                      <th>No</th>
                      <th>Year</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {editSeasons.map((s, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            className={`form-control form-control-sm ${
                              Number(s.season_no) >= 1 ? "" : "is-invalid"
                            }`}
                            value={s.season_no}
                            onChange={(e) => {
                              const v = onlyDigits(e.target.value);
                              setEditSeasons((arr) => {
                                const copy = [...arr];
                                copy[idx] = {
                                  ...copy[idx],
                                  season_no: v ? Number(v) : "",
                                };
                                return copy;
                              });
                            }}
                          />
                          <small className="text-muted">
                            New seasons must be ≥ 2
                          </small>
                        </td>
                        <td>
                          <input
                            className={`form-control form-control-sm ${
                              s.year && isYear(s.year) ? "" : "is-invalid"
                            }`}
                            value={s.year}
                            onChange={(e) => {
                              const v = clamp4(e.target.value);
                              setEditSeasons((arr) => {
                                const copy = [...arr];
                                copy[idx] = { ...copy[idx], year: v };
                                return copy;
                              });
                            }}
                            placeholder="2025"
                          />
                          {(!s.year || !isYear(s.year)) && (
                            <div className="invalid-feedback">
                              Year 1888–2100
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              setEditSeasons((arr) =>
                                arr.filter((_, i) => i !== idx)
                              )
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
              <p className="text-muted small">No seasons yet.</p>
            )}
          </div>

          <div className="modal-footer d-flex justify-content-end gap-2">
            <button
              className="btn btn-emerald"
              onClick={saveEdit}
              disabled={editSubmitting}
            >
              {editSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </CenterModal>
      )}

      {/* DELETE MODAL */}
      {confirmDel && (
        <CenterModal onClose={() => setConfirmDel(null)} size="sm">
          <div className="text-center">
            <div
              className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 64,
                height: 64,
                background:
                  "linear-gradient(135deg, rgba(248,113,113,.15), rgba(124,58,237,.12))",
              }}
            >
              <span style={{ fontSize: 28, color: "#dc2626" }}>!</span>
            </div>
            <h5 className="mb-2">Delete series?</h5>
            <p className="text-muted mb-3">
              {confirmDel.series_name}
              <br />
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <button
                className="btn btn-soft"
                onClick={() => setConfirmDel(null)}
              >
                Cancel
              </button>
              <button className="btn btn-outline-danger" onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>
        </CenterModal>
      )}

      {/* TOASTS */}
      {errorMsg && (
        <Toastish kind="danger" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Toastish>
      )}
      {successMsg && (
        <Toastish kind="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Toastish>
      )}

      {/* styles */}
      <style>{`
        .btn-soft{
          background: rgba(15,23,42,.03);
          border: 1px solid rgba(15,23,42,.02);
        }
        .btn-emerald{
          background: linear-gradient(135deg,#0f766e,#22c55e);
          border: none;
          color: #fff;
        }
        .mm-dropzone{
          border:2px dashed rgba(14,165,233,.35);
          border-radius:1rem;
          background:rgba(255,255,255,.4);
          text-align:center;
          padding:1.2rem .8rem;
          cursor:pointer;
          transition: box-shadow .12s ease, transform .12s ease;
        }
        .mm-dropzone.glow{
          box-shadow: 0 0 0 .2rem rgba(14,165,233,.12);
          transform: scale(1.01);
        }
        .mm-switch{
          position:relative; display:inline-flex; align-items:center; gap:.35rem;
        }
        .mm-switch input{ display:none; }
        .mm-slider{
          width:50px; height:28px; background:#e2e8f0;
          border-radius:999px;
          position:relative;
          transition: background .18s ease;
        }
        .mm-slider::after{
          content:"";
          position:absolute; top:3px; left:3px;
          width:22px; height:22px; border-radius:999px;
          background:#fff;
          transition: transform .18s ease;
          box-shadow:0 2px 6px rgba(0,0,0,.15);
        }
        .mm-switch input:checked + .mm-slider{
          background:linear-gradient(135deg,#0f766e,#22c55e);
        }
        .mm-switch input:checked + .mm-slider::after{
          transform:translateX(22px);
        }
        .mm-switch-label{
          font-size:.7rem; font-weight:600; color:#0f172a;
        }

        .mm-series-mobile{
          background: radial-gradient(circle at 10% 10%, rgba(14,165,233,.03), #fff 70%);
        }
        .mm-series-card{
          background: #ffffff;
          border: 1px solid rgba(15,23,42,.03);
          border-radius: 1rem;
          padding: .75rem .8rem .6rem;
          display: flex;
          flex-direction: column;
          gap: .55rem;
          box-shadow: 0 8px 30px rgba(15,23,42,.05);
        }
        .mm-series-top{
          display: flex;
          gap: .65rem;
          align-items: flex-start;
        }
        .mm-series-media img{
          width: 54px;
          height: 74px;
          object-fit: cover;
          border-radius: .75rem;
          box-shadow: 0 9px 18px rgba(15,23,42,.25);
        }
        .mm-series-avatar{
          width: 54px;
          height: 54px;
          border-radius: 1rem;
          background: linear-gradient(135deg,#0ea5e9,#6366f1);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#fff;
          font-weight:700;
        }
        .mm-series-meta{
          flex: 1;
          min-width: 0;
        }
        .mm-series-title{
          font-weight: 600;
          font-size: .92rem;
          color: #0f172a;
          line-height: 1.05;
          margin-bottom: .25rem;
        }
        .mm-series-tags{
          display:flex;
          flex-wrap:wrap;
          gap:.25rem;
          margin-bottom:.25rem;
        }
        .mm-tag{
          background: rgba(148,163,184,.12);
          border-radius: 999px;
          padding: .08rem .55rem .15rem;
          font-size: .65rem;
          line-height: 1.2;
          color: #0f172a;
        }
        .mm-tag-cat{
          background: linear-gradient(135deg,rgba(14,165,233,.18),rgba(124,58,237,.2));
          color: #0f172a;
        }
        .mm-tag-ok{
          background: rgba(16,185,129,.19);
          color: #065f46;
          font-weight: 500;
        }
        .mm-tag-muted{
          background: rgba(148,163,184,.12);
          color: #475569;
        }
        .mm-series-extra{
          font-size: .63rem;
          color: #94a3b8;
        }
        .mm-series-right{
          display:flex;
          align-items:flex-start;
        }
        .mm-watch-dot{
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px rgba(15,23,42,.12);
        }
        .mm-watch-dot.yes{
          background: linear-gradient(135deg,#10b981,#22c55e);
        }
        .mm-watch-dot.no{
          background: rgba(148,163,184,.35);
        }
        .mm-series-actions{
          display:flex;
          gap:.4rem;
        }
        .mm-btn{
          flex:1;
          border:none;
          border-radius:.7rem;
          font-size:.7rem;
          font-weight:500;
          padding:.35rem .4rem .45rem;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:.25rem;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .mm-btn:active{
          transform: translateY(1px);
        }
        .mm-btn-soft{
          background: rgba(15,23,42,.01);
          border:1px solid rgba(148,163,184,.12);
        }
        .mm-btn-green{
          background: linear-gradient(135deg,#10b981,#0f766e);
          color:#fff;
        }
        .mm-btn-danger{
          background: rgba(248,113,113,.12);
          color:#b91c1c;
        }

        /* VIEW SHEET */
        .series-view-sheet{
          display:flex;
          gap:1.25rem;
        }
        .series-view-poster img{
          width:210px;
          max-height:280px;
          height:auto;
          object-fit:contain;
          border-radius:1.1rem;
          box-shadow:0 18px 35px rgba(15,23,42,.3);
          background:#fff;
        }
        .series-view-placeholder{
          width:210px;
          max-height:280px;
          aspect-ratio: 9 / 12;
          border-radius:1.1rem;
          background:linear-gradient(140deg, rgba(14,165,233,.6), rgba(124,58,237,.6));
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-size:2.5rem; font-weight:800;
          box-shadow:0 18px 35px rgba(15,23,42,.3);
        }
        .series-view-body{
          flex:1;
          min-width:200px;
        }
        .sv-title{
          font-weight:700;
          margin-bottom:.35rem;
        }
        .sv-meta{
          display:flex; gap:.35rem; flex-wrap:wrap;
          margin-bottom:.85rem;
        }
        .sv-chip{
          background:rgba(15,23,42,.03);
          border-radius:999px;
          padding:.25rem .75rem;
          font-size:.7rem;
          font-weight:500;
          color:#0f172a;
        }
        .sv-chip-accent{
          background:linear-gradient(135deg,#0ea5e9,#6366f1);
          color:#fff;
        }
        .sv-chip-success{
          background:rgba(16,185,129,.12);
          color:#065f46;
        }
        .sv-chip-muted{
          background:rgba(148,163,184,.2);
          color:#0f172a;
        }
        .sv-block{
          margin-bottom:.6rem;
        }
        .sv-label{
          font-size:.68rem;
          text-transform:uppercase;
          letter-spacing:.04em;
          color:#94a3b8;
          display:block;
          margin-bottom:.2rem;
        }
        .sv-value{
          font-size:.8rem;
        }
        .sv-chips{
          display:flex;
          gap:.35rem;
          flex-wrap:wrap;
        }
        .sv-chip-soft{
          background:rgba(99,102,241,.12);
          color:#1f2937;
        }

        /* mobile: view fullscreen */
        @media (max-width:768px){
          .series-view-sheet{
            flex-direction:column;
          }
          .series-view-poster img,
          .series-view-placeholder{
            width:100%;
            height:auto;
            max-height:280px;
            object-fit:contain;
            border-radius:1rem;
          }
        }

        .scroll-area{
          max-height:60vh;
          overflow-y:auto;
        }
        @media (max-width:575.98px){
          .scroll-area{
            max-height:58vh;
          }
        }

        .toastish{
          position:fixed; top:1rem; right:1rem;
          background:#fff; border-radius:.75rem;
          box-shadow:0 14px 35px rgba(15,23,42,.15);
          padding:.5rem .75rem; display:flex; gap:.5rem; align-items:center;
          z-index:9999; min-width:200px;
        }
        @media (max-width:575.98px){
          .toastish{ left:.5rem; right:.5rem; }
        }
      `}</style>
    </>
  );
}

/* ===== Centered modal (full on mobile) ===== */
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
        background: "rgba(15,23,42,.5)",
        backdropFilter: "blur(3px)",
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
          width:
            size === "sm"
              ? "min(420px, 100%)"
              : size === "lg"
              ? "min(920px, 100%)"
              : "min(660px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 20px 50px rgba(15,23,42,.28)",
          animation: "mm-pop .16s ease-out",
          position: "relative",
        }}
      >
        <div className="d-flex justify-content-end p-2 pb-0">
          <button
            className="btn btn-sm btn-soft"
            onClick={onClose}
            style={{ borderRadius: 999 }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "1rem" }}>{children}</div>

        <style>{`
          @keyframes mm-pop{
            from{transform:scale(.97); opacity:.6}
            to{transform:scale(1); opacity:1}
          }
          @media (max-width:575.98px){
            .mm-modal{
              width: 100%;
              height: 100%;
              max-height: 100vh;
              border-radius: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ===== toast ===== */
function Toastish({ children, kind = "info", onClose }) {
  const color =
    kind === "success"
      ? "rgba(16,185,129,.12)"
      : kind === "danger"
      ? "rgba(248,113,113,.15)"
      : "rgba(59,130,246,.12)";
  return (
    <div className="toastish" style={{ background: color }}>
      <div style={{ fontWeight: 700, fontSize: ".78rem" }}>
        {kind === "success" ? "✓" : kind === "danger" ? "!" : "i"}
      </div>
      <div style={{ fontSize: ".75rem" }}>{children}</div>
      <button
        className="btn btn-sm btn-soft"
        style={{ borderRadius: 999, padding: "0 .45rem" }}
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
