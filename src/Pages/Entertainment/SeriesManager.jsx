// src/pages/Entertainment/SeriesManager.jsx
// Bootstrap-only Series Manager (view / update / delete)
// - Header Category dropdown controls list + shows only that category's total
// - Filters row = Search only
// - Table: # | Title | Category | Year | Seasons | Watched? | Actions
// - View modal: centered; poster LEFT, details RIGHT (both centered inside the popup); ONLY top-right ✕ close
// - Edit modal: centered; Poster (drag/drop) → Watched toggle → Seasons editor
//   - Save updates ONLY poster_url & is_watched (partial PUT) + seasons diff (create/update/delete)
// - Centered alerts & delete confirm; auto-refresh after actions; abort stale requests
// - Page size = 10

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useCallback,
} from "react";
import LoadingSpiner from "./LoadingSpiner";

const API_BASE = "https://express-myapp.onrender.com/api";
const EP = {
  SERIES_COUNT: `${API_BASE}/series/count`,
  SERIES_COUNT_BY_CAT: `${API_BASE}/series/count/by-category`,
  CATEGORIES: `${API_BASE}/series/categories`,
  SUBCATEGORIES: `${API_BASE}/series/subcategories`,
  GENRES: `${API_BASE}/series/genres`,
  SERIES: `${API_BASE}/series`,
  SERIES_ONE: (id) => `${API_BASE}/series/${id}`, // GET, PUT(partial poster/is_watched), DELETE
  CREATE_SEASON: `${API_BASE}/series/seasons`,
  UPDATE_SEASON: (seasonId) => `${API_BASE}/series/seasons/${seasonId}`,
  DELETE_SEASON: (seasonId) => `${API_BASE}/series/seasons/${seasonId}`,
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
        <button className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export default function SeriesManager() {
  // ======= initial meta loading =======
  const [loadingInit, setLoadingInit] = useState(true);

  // ======= list state =======
  const [loadingList, setLoadingList] = useState(true);
  const [series, setSeries] = useState([]);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 10;

  // ======= meta / stats =======
  const [categories, setCategories] = useState([]);
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsByCat, setStatsByCat] = useState([]);

  // ======= modals =======
  const [viewSeries, setViewSeries] = useState(null); // server row
  const [editSeries, setEditSeries] = useState(null); // { series_id, series_name }
  const [confirmDel, setConfirmDel] = useState(null); // { series_id, series_name }

  // alerts
  const [successAlert, setSuccessAlert] = useState(null);
  const [errorAlert, setErrorAlert] = useState(null);

  // ======= edit modal state (poster/watch + seasons only) =======
  const [editPoster, setEditPoster] = useState("");
  const [editIsWatched, setEditIsWatched] = useState(false);
  const [editSeasons, setEditSeasons] = useState([]); // [{season_id?, season_no, year}]
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
        const [c, ct, bc] = await Promise.all([
          fetch(EP.CATEGORIES, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.SERIES_COUNT, { signal: ac.signal }).then((r) => r.json()),
          fetch(EP.SERIES_COUNT_BY_CAT, { signal: ac.signal }).then((r) =>
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
        if (!cancelled) setLoadingInit(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  // ======= derived category total =======
  const selectedCatMeta = useMemo(() => {
    if (!categoryFilter) return null;
    const id = Number(categoryFilter);
    return statsByCat.find((c) => c.category_id === id) || null;
  }, [categoryFilter, statsByCat]);
  const selectedCatCount = useMemo(
    () => (selectedCatMeta ? Number(selectedCatMeta.total) : null),
    [selectedCatMeta]
  );

  // ======= load list whenever filters/page change =======
  const listAbortRef = useRef(null);
  const loadList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;
    setLoadingList(true);
    try {
      const u = new URL(EP.SERIES);
      if (q.trim()) u.searchParams.set("q", q.trim());
      if (isInt(categoryFilter)) u.searchParams.set("category_id", categoryFilter);
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("offset", String(page * limit));
      const r = await fetch(u.toString(), { signal: ac.signal });
      if (!r.ok) throw new Error("List fetch failed");
      const j = await r.json();
      setSeries(Array.isArray(j) ? j : []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setSeries([]);
      setErrorAlert({
        title: "Load Failed",
        message: "Could not fetch series list.",
      });
    } finally {
      setLoadingList(false);
    }
  }, [q, categoryFilter, page]);

  useEffect(() => {
    if (!loadingInit) loadList();
  }, [loadList, loadingInit]);

  // ======= refresh stats helper =======
  const refreshStats = useCallback(async () => {
    try {
      const [ct, bc] = await Promise.all([
        fetch(EP.SERIES_COUNT).then((r) => r.json()),
        fetch(EP.SERIES_COUNT_BY_CAT).then((r) => r.json()),
      ]);
      setStatsTotal(Number(ct?.total) || 0);
      setStatsByCat(Array.isArray(bc) ? bc : []);
    } catch { /* ignore */ }
  }, []);

  // ======= view modal open =======
  const openView = async (seriesId) => {
    try {
      const r = await fetch(EP.SERIES_ONE(seriesId));
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to fetch");
      setViewSeries(j);
    } catch (e) {
      setErrorAlert({
        title: "Open Failed",
        message: e.message || "Could not open series details.",
      });
    }
  };

  // ======= edit modal open (prefill limited fields) =======
  const openEdit = async (seriesId) => {
    try {
      const r = await fetch(EP.SERIES_ONE(seriesId));
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to fetch");
      setEditSeries({ series_id: j.series_id, series_name: j.series_name });
      setEditIsWatched(Boolean(j.is_watched));
      setEditPoster(j.poster_url || "");
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
      setErrorAlert({
        title: "Open Failed",
        message: e.message || "Could not open series for edit.",
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

  // ======= save update (partial PUT for poster/is_watched, + seasons diff) =======
  const saveUpdate = async () => {
    if (!editSeries) return;

    // Validate poster (if provided)
    if (editPoster && !(isDataUrl(editPoster) || /^https?:\/\//i.test(editPoster))) {
      setErrorAlert({
        title: "Validation",
        message: "Poster must be a data:image/* URL or http(s) URL.",
      });
      return;
    }

    // Validate seasons
    const normalized = (editSeasons || []).map((s, idx) => ({
      season_id: s.season_id,
      season_no: Number(s.season_no) || idx + 1,
      year: s.year === "" ? null : Number(s.year),
    }));

    const badSeason = normalized.some(
      (s) =>
        !(Number.isInteger(s.season_no) && s.season_no >= 1) ||
        (s.year !== null && !(Number.isInteger(s.year) && s.year >= 1888 && s.year <= 2100))
    );
    if (badSeason) {
      setErrorAlert({
        title: "Validation",
        message: "Check seasons: Season # ≥ 1 and Year empty or 1888–2100.",
      });
      return;
    }

    // unique season numbers
    const seasonNos = normalized.map((s) => s.season_no);
    if (new Set(seasonNos).size !== seasonNos.length) {
      setErrorAlert({
        title: "Validation",
        message: "Season numbers must be unique.",
      });
      return;
    }

    setEditSubmitting(true);
    try {
      // 1) Partial update (poster_url & is_watched only)
      const r = await fetch(EP.SERIES_ONE(editSeries.series_id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_url: editPoster || null,
          is_watched: Boolean(editIsWatched),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to update series (poster/watched)");

      // 2) Refetch to get latest seasons to diff
      const r2 = await fetch(EP.SERIES_ONE(editSeries.series_id));
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2?.error || "Failed to refetch series");
      const currentSeasons = Array.isArray(j2.seasons) ? j2.seasons : [];

      const byId = new Map(
        currentSeasons
          .filter((s) => s.season_id != null)
          .map((s) => [Number(s.season_id), s])
      );
      const byKey = new Map(currentSeasons.map((s) => [`${s.season_no}`, s]));

      const toCreate = [];
      const toUpdate = [];
      const seenIds = new Set();

      for (const ns of normalized) {
        if (ns.season_id && byId.has(Number(ns.season_id))) {
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
          const matched = byKey.get(String(ns.season_no));
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
            toCreate.push({
              season_no: Number(ns.season_no),
              year: ns.year,
            });
          }
        }
      }

      const toDelete = currentSeasons
        .filter((s) => s.season_id != null && !seenIds.has(Number(s.season_id)))
        .map((s) => Number(s.season_id));

      // 3) Apply seasons ops
      for (const c of toCreate) {
        // eslint-disable-next-line no-await-in-loop
        const pr = await fetch(EP.CREATE_SEASON, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            series_id: editSeries.series_id,
            season_no: c.season_no,
            year: c.year,
          }),
        });
        if (!pr.ok) {
          const t = await pr.json().catch(() => ({}));
          throw new Error(t?.error || `Failed to create season S${c.season_no}`);
        }
      }
      for (const u of toUpdate) {
        // eslint-disable-next-line no-await-in-loop
        const pr = await fetch(EP.UPDATE_SEASON(u.season_id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            season_no: u.season_no,
            year: u.year,
          }),
        });
        if (!pr.ok) {
          const t = await pr.json().catch(() => ({}));
          throw new Error(t?.error || `Failed to update season S${u.season_no}`);
        }
      }
      for (const did of toDelete) {
        // eslint-disable-next-line no-await-in-loop
        const pr = await fetch(EP.DELETE_SEASON(did), { method: "DELETE" });
        if (!pr.ok) {
          const t = await pr.json().catch(() => ({}));
          throw new Error(t?.error || "Failed to delete season");
        }
      }

      setEditSeries(null);
      await Promise.all([loadList(), refreshStats()]);
      setSuccessAlert({ title: "Updated", message: "Series saved successfully." });
    } catch (e) {
      setErrorAlert({
        title: "Update Failed",
        message: e.message || "Could not update series.",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  // ======= delete =======
  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      const r = await fetch(EP.SERIES_ONE(confirmDel.series_id), { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Delete failed");
      setConfirmDel(null);
      await Promise.all([loadList(), refreshStats()]);
      setSuccessAlert({ title: "Deleted", message: "Series deleted successfully." });
    } catch (e) {
      setErrorAlert({
        title: "Delete Failed",
        message: e.message || "Could not delete series.",
      });
    }
  };

  // ======= table row =======
  const Row = memo(function Row({ row, onView, onEdit, onDelete }) {
    return (
      <tr>
        <td className="text-muted">{row.display_no}</td>
        <td className="fw-semibold">{row.series_name}</td>
        <td>
          {row.category_name ? (
            <span
              className="badge bg-gradient"
              style={{ background: "linear-gradient(135deg,#20c997,#6f42c1)" }}
            >
              {row.category_name}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td>{row.release_year}</td>
        <td>
          {row.seasons?.length
            ? row.seasons.map((s) => `S${s.season_no}(${s.year})`).join(", ")
            : "—"}
        </td>
        <td>
          <span className={`badge ${row.is_watched ? "text-bg-success" : "text-bg-secondary"}`}>
            {row.is_watched ? "Yes" : "No"}
          </span>
        </td>
        <td className="text-end">
          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => onView(row.series_id)}>
            View
          </button>
          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => onEdit(row.series_id)}>
            Edit
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDelete({ series_id: row.series_id, series_name: row.series_name })}
          >
            Delete
          </button>
        </td>
      </tr>
    );
  });

  // ======= UI =======

  // Show a big centered spinner while the first batch of APIs (meta/stats) are loading
  if (loadingInit) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <LoadingSpiner />
      </div>
    );
  }

  return (
    <>
      {/* Header / Stats with Category dropdown (controls list) */}
      <header
        className="border-bottom"
        style={{
          background: "linear-gradient(135deg, rgba(32,201,151,.08), rgba(111,66,193,.08))",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h3 className="mb-0">📺 Series Manager</h3>
            <div className="text-muted small">Browse, view, update, and delete series.</div>
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

              {/* Totals */}
              {categoryFilter ? (
                <span
                  className="badge align-self-end"
                  style={{ backgroundColor: selectedCatMeta?.category_color || "#6c757d" }}
                  title={
                    selectedCatMeta
                      ? `${selectedCatMeta.category_name}: ${selectedCatCount}`
                      : "Selected category"
                  }
                >
                  {selectedCatMeta?.category_name || "Category"}: {selectedCatCount ?? 0}
                </span>
              ) : (
                <span className="badge text-bg-dark align-self-end">Total: {statsTotal}</span>
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
                  className="btn btn-outline-secondary me-2"
                  onClick={() => {
                    setQ("");
                    setPage(0);
                  }}
                >
                  Reset
                </button>
                <button className="btn btn-primary" onClick={() => loadList()}>
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
              background: "linear-gradient(135deg, rgba(32,201,151,.15), rgba(111,66,193,.15))",
            }}
          >
            Series
          </div>
        <div className="table-responsive position-relative">
            {loadingList && (
              <div
                className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center"
                style={{ inset: 0, background: "rgba(255,255,255,.6)", zIndex: 1 }}
              >
                <LoadingSpiner />
              </div>
            )}
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Year</th>
                  <th>Seasons</th>
                  <th>Watched?</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loadingList && series.length ? (
                  series.map((s) => (
                    <Row key={s.series_id} row={s} onView={openView} onEdit={openEdit} onDelete={setConfirmDel} />
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
          <div className="card-footer d-flex justify-content-between align-items-center">
            <div className="text-muted small">Page {page + 1}</div>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={series.length < limit}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal (centered popup, LEFT image, RIGHT details) */}
      {viewSeries && (
        <Modal onClose={() => setViewSeries(null)} size="md">
          <div className="px-2 pb-3">
            <h5 className="mb-3 text-center">Series Details</h5>
            <div className="d-flex flex-wrap align-items-start gap-3 justify-content-center">
              {/* LEFT: Poster */}
              {viewSeries.poster_url ? (
                <img
                  src={viewSeries.poster_url}
                  alt="Poster"
                  className="rounded border shadow-sm"
                  style={{ width: 200, height: 265, objectFit: "cover" }}
                />
              ) : (
                <div
                  className="border rounded d-flex align-items-center justify-content-center bg-light"
                  style={{ width: 200, height: 265 }}
                >
                  <span className="text-muted small">No Poster</span>
                </div>
              )}

              {/* RIGHT: Details */}
              <div className="flex-grow-1" style={{ minWidth: 260, maxWidth: 420 }}>
                <div className="mb-1"><span className="text-muted">Name:</span> {viewSeries.series_name}</div>
                <div className="mb-1">
                  <span className="text-muted">Seasons:</span>{" "}
                  {viewSeries.seasons?.length
                    ? viewSeries.seasons.map((s) => `S${s.season_no}(${s.year})`).join(", ")
                    : "—"}
                </div>
                <div className="mb-1"><span className="text-muted">Category:</span> {viewSeries.category_name || "—"}</div>
                <div className="mb-1"><span className="text-muted">Subcategory:</span> {viewSeries.subcategory_name || "—"}</div>
                <div className="mb-1">
                  <span className="text-muted">Genres:</span>{" "}
                  {viewSeries.genres?.length ? viewSeries.genres.map((g) => g.name).join(", ") : "—"}
                </div>
                <div className="mb-1"><span className="text-muted">Year:</span> {viewSeries.release_year}</div>
                <div className="mb-1">
                  <span className="text-muted">Watched:</span>{" "}
                  <span className={`badge ${viewSeries.is_watched ? "text-bg-success" : "text-bg-secondary"}`}>
                    {viewSeries.is_watched ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal (Poster → Watched → Seasons) */}
      {editSeries && (
        <Modal onClose={() => setEditSeries(null)} size="lg">
          <div className="modal-head mb-2">
            <h5 className="mb-0">Update Series</h5>
            <div className="text-muted small">{editSeries.series_name}</div>
          </div>

          <div className="modal-body scroll-area">
            <div className="row g-3">
              {/* Poster drag & drop FIRST */}
              <div className="col-12">
                <label className="form-label">Poster (drag & drop)</label>
                <div
                  className={`border rounded-3 p-3 text-center ${dragActive ? "drop-on" : ""}`}
                  style={{
                    borderStyle: "dashed",
                    cursor: "pointer",
                    transition: "background .12s, transform .12s",
                  }}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={onPickPoster}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  title="Drop an image or click to choose"
                >
                  <div className="mb-1 fw-semibold">
                    Drop your image here{editPoster ? " (ready)" : ""}
                  </div>
                  <div className="text-muted small">JPG/PNG/WebP recommended. Click to choose a file.</div>
                  {editPoster ? (
                    <div className="mt-2">
                      <img
                        src={editPoster}
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

              {/* Watched toggle SECOND */}
              <div className="col-12">
                <label className="form-label">Watched?</label>
                <div className="d-flex align-items-center justify-content-between rounded border p-3 bg-white">
                  <div className="text-muted small">Mark if you’ve watched this series.</div>
                  <button
                    type="button"
                    className={`switch ${editIsWatched ? "on" : ""}`}
                    onClick={() => setEditIsWatched((v) => !v)}
                    aria-pressed={editIsWatched}
                    aria-label="Toggle watched"
                  >
                    <span className="knob" />
                    <span className="label">{editIsWatched ? "Yes" : "No"}</span>
                  </button>
                </div>
              </div>

              {/* Seasons editor THIRD */}
              <div className="col-12">
                <label className="form-label d-flex align-items-center justify-content-between">
                  <span>Seasons</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() =>
                      setEditSeasons((p) => [
                        ...p,
                        {
                          season_no: (p[p.length - 1]?.season_no || p.length) + 1,
                          year: "",
                        },
                      ])
                    }
                  >
                    + Add Season
                  </button>
                </label>

                {editSeasons?.length ? (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr className="table-light">
                          <th style={{ width: 140 }}>Season #</th>
                          <th style={{ width: 180 }}>Year</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editSeasons.map((s, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                className="form-control form-control-sm"
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
                                placeholder="1"
                              />
                            </td>
                            <td>
                              <input
                                className={`form-control form-control-sm ${s.year && !isYear(s.year) ? "is-invalid" : ""}`}
                                value={s.year}
                                onChange={(e) => {
                                  const v = clamp4(e.target.value);
                                  setEditSeasons((arr) => {
                                    const copy = [...arr];
                                    copy[idx] = { ...copy[idx], year: v };
                                    return copy;
                                  });
                                }}
                                placeholder="e.g., 2022"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setEditSeasons((arr) => arr.filter((_, i) => i !== idx))}
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
                  <div className="text-muted small">No seasons. Add if this title has multiple seasons.</div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-end gap-2">
            <button className="btn btn-primary" disabled={editSubmitting} onClick={saveUpdate}>
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
                background: "linear-gradient(135deg, rgba(220,53,69,.15), rgba(111,66,193,.1))",
                border: "2px solid rgba(220,53,69,.3)",
              }}
            >
              <span style={{ fontSize: 28, color: "rgb(220,53,69)" }}>!</span>
            </div>
            <h5 className="mb-2">Delete Series</h5>
            <p className="text-muted">
              Are you sure you want to delete <b>{confirmDel.series_name}</b>?
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setConfirmDel(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={doDelete}>
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

      {/* Small styles & Pro toggle */}
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

        /* Drag over hint */
        .drop-on { background: rgba(32,201,151,.06); }

        /* Pro switch */
        .switch {
          position: relative;
          width: 74px;
          height: 34px;
          border-radius: 9999px;
          border: 1px solid rgba(0,0,0,.12);
          background: #f1f3f5;
          display: inline-flex;
          align-items: center;
          padding: 3px;
          transition: background .15s ease, border-color .15s ease;
          user-select: none;
        }
        .switch .knob {
          width: 28px; height: 28px; border-radius: 50%;
          background: #fff; box-shadow: 0 6px 14px rgba(0,0,0,.15);
          transform: translateX(0);
          transition: transform .18s cubic-bezier(.2,.8,.2,1);
        }
        .switch .label {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; color: #6c757d;
        }
        .switch.on {
          background: linear-gradient(135deg,#20c997,#0d6efd);
          border-color: rgba(13,110,253,.35);
        }
        .switch.on .knob { transform: translateX(40px); }
        .switch.on .label { color: #fff; }
      `}</style>
    </>
  );
}

/* =========================
   CENTERED MODAL (no Bootstrap JS)
   - Sizes: sm / md / lg via class
   - Only a single ✕ close button
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
            className="btn btn-sm btn-outline-secondary"
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
