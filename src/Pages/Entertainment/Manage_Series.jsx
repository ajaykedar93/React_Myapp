// src/pages/Entertainment/Manage_Series.jsx
// Mobile-first, professional Series manager (list + view popup)
// uses series APIs from your Express backend

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import LoadingSpiner from "./LoadingSpiner"; // you already have this

// ===== API ROOT =====
const API_BASE = "https://express-backend-myapp.onrender.com/api";
const EP = {
  SERIES: `${API_BASE}/series`,
  SERIES_ONE: (id) => `${API_BASE}/series/${id}`,
  SERIES_COUNT: `${API_BASE}/series/count`,
  SERIES_COUNT_BY_CAT: `${API_BASE}/series/count/by-category`,
  CATEGORIES: `${API_BASE}/series/categories`,
  SUBCATEGORIES: `${API_BASE}/series/subcategories`, // future use
  GENRES: `${API_BASE}/series/genres`, // future use
};

export default function Manage_Series() {
  // loading guard for first APIs
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

  // modal
  const [viewSeries, setViewSeries] = useState(null);

  // toasts
  const [errorMsg, setErrorMsg] = useState(null);

  // helper to show global spinner
  const withBusy = useCallback(async (fn) => {
    setBusy((c) => c + 1);
    try {
      return await fn();
    } finally {
      setBusy((c) => Math.max(0, c - 1));
    }
  }, []);

  // ====== load meta once (categories + totals) ======
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
        setStatsByCat(Array.isArray(byCat) ? byCat : []);
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

  // pick selected category meta
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

  // ====== view modal open ======
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
              Search, filter, and quick-view all your series in a modern, mobile-first layout.
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
                  className="btn me-2"
                  style={{
                    background: "rgba(15,23,42,.035)",
                    border: "1px solid rgba(15,23,42,.02)",
                  }}
                  onClick={() => {
                    setQ("");
                    setCategoryFilter("");
                    setPage(0);
                  }}
                >
                  Reset
                </button>
                <button
                  className="btn"
                  style={{
                    background: "linear-gradient(120deg,#0f766e,#22c55e)",
                    color: "#fff",
                  }}
                  onClick={loadList}
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

          {/* MOBILE LIST */}
          <div className="d-md-none p-2">
            {loadingList ? (
              <div className="text-center py-3 text-muted">
                <div className="spinner-border spinner-border-sm me-2" />
                Loading…
              </div>
            ) : series.length ? (
              <div className="d-flex flex-column gap-2">
                {series.map((s) => (
                    <div
                      key={s.series_id}
                      className="mm-series-card p-2 rounded-3 shadow-sm"
                    >
                      <div className="d-flex justify-content-between gap-2">
                        <div>
                          <div className="fw-semibold">{s.series_name}</div>
                          <div className="text-muted small">
                            {s.release_year || "—"}
                            {s.category_name ? ` • ${s.category_name}` : ""}
                          </div>
                        </div>
                        <span
                          className={`badge ${
                            s.is_watched
                              ? "bg-success-subtle"
                              : "bg-secondary-subtle"
                          }`}
                          style={{
                            color: s.is_watched ? "#0f766e" : "#475569",
                            height: "fit-content",
                          }}
                        >
                          {s.is_watched ? "Watched" : "Pending"}
                        </span>
                      </div>
                      <div className="text-muted xsmall mt-1">
                        Seasons:{" "}
                        {s.seasons?.length
                          ? s.seasons
                              .map((p) => `S${p.season_no}(${p.year || "—"})`)
                              .join(", ")
                          : "—"}
                      </div>
                      <div className="mt-2 d-flex gap-1 flex-wrap">
                        <button
                          className="btn btn-sm btn-soft flex-fill"
                          onClick={() => openView(s.series_id)}
                        >
                          View
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
                      <td className="fw-semibold">{s.series_name}</td>
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
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openView(s.series_id)}
                        >
                          View
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

      {/* VIEW MODAL (centered, full mobile) */}
      {viewSeries && (
        <CenterModal onClose={() => setViewSeries(null)}>
          <div className="d-flex flex-wrap gap-3 justify-content-center">
            {/* poster */}
            {viewSeries.poster_url ? (
              <img
                src={viewSeries.poster_url}
                alt={viewSeries.series_name}
                style={{
                  width: 180,
                  height: 255,
                  objectFit: "cover",
                  borderRadius: "1rem",
                  boxShadow: "0 12px 30px rgba(15,23,42,.25)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 180,
                  height: 255,
                  borderRadius: "1rem",
                  background:
                    "linear-gradient(140deg, rgba(14,165,233,.7), rgba(124,58,237,.7))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1.6rem",
                }}
              >
                {viewSeries.series_name?.[0] || "S"}
              </div>
            )}

            {/* details */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <h5 className="mb-1">{viewSeries.series_name}</h5>
              <p className="text-muted mb-2 small">
                {viewSeries.category_name || "—"}{" "}
                {viewSeries.release_year ? `• ${viewSeries.release_year}` : ""}
              </p>

              <div className="mb-1">
                <span className="text-muted">Subcategory:</span>{" "}
                {viewSeries.subcategory_name || "—"}
              </div>
              <div className="mb-1">
                <span className="text-muted">Seasons:</span>{" "}
                {viewSeries.seasons?.length
                  ? viewSeries.seasons
                      .map((p) => `S${p.season_no}(${p.year || "—"})`)
                      .join(", ")
                  : "—"}
              </div>
              <div className="mb-1">
                <span className="text-muted">Genres:</span>{" "}
                {viewSeries.genres?.length
                  ? viewSeries.genres.map((g) => g.name).join(", ")
                  : "—"}
              </div>
              <div className="mb-1">
                <span className="text-muted">Watched:</span>{" "}
                <span
                  className={`badge ${
                    viewSeries.is_watched
                      ? "bg-success-subtle"
                      : "bg-secondary-subtle"
                  }`}
                  style={{
                    color: viewSeries.is_watched ? "#0f766e" : "#475569",
                  }}
                >
                  {viewSeries.is_watched ? "Yes" : "No"}
                </span>
              </div>

              <p className="text-muted small mt-2 mb-0">
                *This is a quick view. You can extend this popup later to edit.
              </p>
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

      {/* styles */}
      <style>{`
        .btn-soft{
          background: rgba(15,23,42,.03);
          border: 1px solid rgba(15,23,42,.02);
        }
        .mm-series-card{
          background: rgba(255,255,255,1);
          border: 1px solid rgba(15,23,42,.03);
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .mm-series-card:hover{
          transform: translateY(-1px);
          box-shadow:0 .6rem 1.5rem rgba(15,23,42,.08);
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

/* ===== Centered modal (like movies) ===== */
function CenterModal({ children, onClose }) {
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
        className="mm-modal"
        style={{
          background: "#fff",
          borderRadius: "1rem",
          width: "min(720px, 100%)",
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
            .mm-modal{ width:100%; height:auto; max-height:92vh; border-radius:.85rem; }
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
