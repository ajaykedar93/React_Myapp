// src/pages/AllList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = "https://express-backend-myapp.onrender.com/api/library";
const PAGE_SIZE = 20;

export default function AllList() {
  const [activeTab, setActiveTab] = useState("movies"); // "movies" | "series"
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [payload, setPayload] = useState({
    ok: true,
    type: "movies",
    page: 1,
    page_size: PAGE_SIZE,
    total: 0,
    total_pages: 1,
    items: [],
  });
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // UI-only filter
  const [viewFilter, setViewFilter] = useState("all"); // "all" | "watched" | "not-watched"

  const abortRef = useRef(null);
  const fakeRef = useRef(null);

  const clearProgressTimers = () => {
    if (fakeRef.current) {
      clearInterval(fakeRef.current);
      fakeRef.current = null;
    }
  };

  const startFakeProgress = () => {
    clearProgressTimers();
    setProgress(10);
    fakeRef.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 2 : p));
    }, 120);
  };

  const stopProgress = () => {
    clearProgressTimers();
    setProgress(100);
    setTimeout(() => setProgress(0), 300);
  };

  const fetchList = useMemo(
    () => async (tab, pg, q) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setError("");
        setLoading(true);
        setProgress(0);
        startFakeProgress();

        const { data } = await axios.get(`${API_BASE}/list`, {
          params: { type: tab, page: pg, search: q || "" },
          signal: controller.signal,
          onDownloadProgress: (evt) => {
            if (evt.total) {
              const pct = Math.min(99, Math.floor((evt.loaded / evt.total) * 100));
              setProgress(pct);
            }
          },
        });

        setPayload(data);
        stopProgress();
      } catch (e) {
        if (axios.isCancel?.(e) || e.name === "CanceledError" || e.code === "ERR_CANCELED") {
          return;
        }
        console.error(e);
        setError("Failed to load items.");
        clearProgressTimers();
        setProgress(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => fetchList(activeTab, page, search), 220);
    return () => clearTimeout(t);
  }, [activeTab, page, search, fetchList]);

  const handleTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  const nextPage = () => {
    if (page < (payload.total_pages || 1)) setPage((p) => p + 1);
  };
  const prevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const renderSubtags = (item, type) => {
    const arr = type === "movies" ? item.parts : item.seasons;
    if (!arr || !arr.length) return null;

    return (
      <div className="mt-2">
        <p className="subt-title mb-1">{type === "movies" ? "Parts" : "Seasons"}</p>
        <div className="d-flex flex-wrap gap-1">
          {arr.map((p, idx) => {
            const text =
              typeof p === "string" ? p.trim() : `${type === "movies" ? "Part" : "Season"} ${p}`;
            return (
              <span key={idx} className="badge subt-badge">
                {text}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const Cards = ({ items, type }) => (
    <div className="row g-3 g-md-4 mt-3">
      {items.map((it) => {
        const hasPoster = !!it.poster_url;
        const catColor = it.category?.color || "#14b8a6";
        const watched = it.is_watched;
        return (
          <div className="col-12 col-md-6 col-lg-4" key={`${type}-${it.id}`}>
            <article
              className={`lib-card ${type === "movies" ? "is-movie" : "is-series"}`}
              tabIndex={0}
              onClick={() => setSelectedItem({ ...it, _type: type })}
            >
              {/* poster */}
              <div className="lib-poster">
                {hasPoster ? (
                  <img
                    src={it.poster_url}
                    alt={it.title || "Poster"}
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="lib-poster-ph">NO POSTER</div>
                )}
              </div>

              {/* text */}
              <div className="lib-body">
                <div className="lib-header d-flex align-items-start gap-2 flex-wrap">
                  <h6 className="lib-title mb-0" title={it.title}>
                    {it.title}
                  </h6>
                  <span
                    className={`status-pill ${watched ? "watched" : "not-watched"}`}
                    title={watched ? "Watched" : "Not watched"}
                  >
                    {watched ? "Watched" : "Not watched"}
                  </span>
                </div>

                <div className="text-muted small mt-1 d-flex gap-2 flex-wrap align-items-center">
                  {it.release_year ? <span>📅 {it.release_year}</span> : <span>📅 —</span>}
                  <span className="badge seq-badge">#{it.seq}</span>
                  <span className="badge type-badge">
                    {type === "movies" ? "Movie" : "Series"}
                  </span>
                </div>

                {renderSubtags(it, type)}

                <div className="mt-2 d-flex flex-wrap gap-2">
                  {it.category?.name && (
                    <span
                      className="badge cat-badge"
                      style={{ borderColor: catColor, color: catColor }}
                      title={it.category.name}
                    >
                      {it.category.name}
                    </span>
                  )}
                  {it.subcategory?.name && (
                    <span className="badge subcat-badge" title={it.subcategory.name}>
                      {it.subcategory.name}
                    </span>
                  )}
                </div>

                {!!it.genres?.length && (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {it.genres.map((g, i) => (
                      <span key={i} className="badge genre-badge">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );

  const DetailModal = ({ item, onClose }) => {
    if (!item) return null;
    const type = item._type || (activeTab === "movies" ? "movies" : "series");
    const hasPoster = !!item.poster_url;

    return (
      <div className="details-overlay" onClick={onClose}>
        <div className="details-card" onClick={(e) => e.stopPropagation()}>
          <button className="details-close" onClick={onClose}>×</button>
          <div className="d-flex gap-3 flex-wrap">
            <div className="details-poster">
              {hasPoster ? <img src={item.poster_url} alt={item.title} /> : <div className="details-ph">NO POSTER</div>}
            </div>

            <div className="flex-grow-1">
              <h5 className="mb-1 d-flex gap-2 flex-wrap align-items-center">
                {item.title}
                <span className={`status-pill ${item.is_watched ? "watched" : "not-watched"}`}>
                  {item.is_watched ? "Watched" : "Not watched"}
                </span>
              </h5>
              <p className="mb-2 text-muted small d-flex flex-wrap gap-2">
                <span>{item.release_year ? `Released: ${item.release_year}` : "Release year: —"}</span>
                <span>• {type === "movies" ? "Movie" : "Series"}</span>
                <span>• #{item.seq}</span>
              </p>

              {renderSubtags(item, type)}

              <div className="mt-3 d-flex flex-wrap gap-2">
                {item.category?.name && (
                  <span className="badge cat-badge-big" title={item.category.name}>
                    {item.category.name}
                  </span>
                )}
                {item.subcategory?.name && (
                  <span className="badge subcat-badge" title={item.subcategory.name}>
                    {item.subcategory.name}
                  </span>
                )}
              </div>

              {!!item.genres?.length && (
                <div className="mt-3 d-flex flex-wrap gap-1">
                  {item.genres.map((g, idx) => (
                    <span key={idx} className="badge genre-badge">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Derived filtered items (client-side only)
  const filteredItems = useMemo(() => {
    const items = payload.items || [];
    if (viewFilter === "watched") return items.filter((i) => i.is_watched);
    if (viewFilter === "not-watched") return items.filter((i) => !i.is_watched);
    return items;
  }, [payload.items, viewFilter]);

  const watchedCount = useMemo(
    () => (payload.items || []).filter((i) => i.is_watched).length,
    [payload.items]
  );
  const notWatchedCount = useMemo(
    () => (payload.items || []).filter((i) => !i.is_watched).length,
    [payload.items]
  );

  return (
    <div className="container py-3 all-list-page">
      <style>{`
        .all-list-page{ max-width: 1150px; }
        :root{ --tab-active: linear-gradient(120deg, #14b8a6, #6366f1); --poster-h: 145px; }
        html { font-size: 100%; }
        body { line-height: 1.4; }

        /* title stays readable, wraps by words */
        .lib-header { row-gap: .25rem; }
        .lib-title{
          font-weight: 800;
          font-size: clamp(1rem, 2.8vw, 1.15rem);
          line-height: 1.25;
          max-width: 100%;
          white-space: normal;
          word-break: normal;
          overflow-wrap: anywhere;
          hyphens: auto;
          letter-spacing: normal;
          flex: 1 1 180px;
          min-width: 0;
        }

        /* make sure ALL badge-like chips never hide text */
        .badge{
          white-space: normal;
          line-height: 1.15;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .lib-body, .details-card { font-size: clamp(0.9rem, 2.6vw, 0.98rem); }
        .badge, .status-pill { font-size: clamp(0.6rem, 2.1vw, 0.72rem); }

        .top-tabs{
          background: rgba(255,255,255,.01);
          border-radius: 1rem;
          padding: .4rem;
          display: inline-flex;
          gap: .5rem;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(148,163,184,.2);
          box-shadow: 0 6px 30px rgba(15,23,42,.08);
        }
        .tab-btn{
          border: none; background: transparent; color: #94a3b8; font-weight: 700;
          padding: .55rem 1.1rem; border-radius: .75rem; display: inline-flex; align-items: center;
          gap: .4rem; transition: all .16s ease; cursor: pointer; font-size: clamp(0.9rem, 2.6vw, 1rem);
        }
        .tab-btn:hover{ background: rgba(148,163,184,.09); color: #0f172a; }
        .tab-btn.active{ background: var(--tab-active); color: #fff; box-shadow: 0 12px 24px rgba(99,102,241,.25); }

        .search-wrap{ margin-top: 1.4rem; }
        .search-wrap .form-control{
          border-radius: .9rem; border: 1px solid rgba(148,163,184,.35); background: #fff;
        }
        .search-wrap .form-control:focus{ box-shadow: 0 0 0 .18rem rgba(20,184,166,.25); }

        /* Filter toggle group */
        .filter-toggle{
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          padding: .35rem;
          border-radius: .9rem;
          border: 1px solid rgba(148,163,184,.35);
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(15,23,42,.04);
          flex-wrap: nowrap;
        }
        .filter-btn{
          border: none;
          padding: .45rem .8rem;
          border-radius: .7rem;
          font-weight: 700;
          font-size: clamp(0.8rem, 2.3vw, 0.92rem);
          color: #475569;
          background: transparent;
          cursor: pointer;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease, color .12s ease;
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          white-space: nowrap;
          min-width: 0;
        }
        .filter-btn:hover{ background: rgba(148,163,184,.12); color: #0f172a; }
        .filter-btn.active{
          color: #fff;
          background: linear-gradient(120deg, #0ea5e9, #6366f1);
          box-shadow: 0 10px 22px rgba(99,102,241,.25);
          transform: translateY(-1px);
        }
        .filter-btn .dot{
          width: .55rem; height: .55rem; border-radius: 999px; background: #cbd5e1;
          flex-shrink: 0;
        }
        .filter-btn.active .dot{ background: #fff; }

        .lib-card{
          background: #fff; border-radius: 1rem; display: flex; gap: .9rem; align-items: flex-start;
          padding: .9rem; min-height: 150px; box-shadow: 0 6px 18px rgba(15,23,42,.03);
          transition: transform .12s ease, box-shadow .12s ease, border .12s ease; cursor: pointer;
          border: 1.5px solid rgba(248,113,113,.16);
        }
        .lib-card.is-movie{ border-left: 4px solid rgba(248,113,113,.8); }
        .lib-card.is-series{ border-left: 4px solid rgba(248,113,113,.45); }
        .lib-card:hover, .lib-card:focus-within{
          transform: translateY(-2px); box-shadow: 0 12px 24px rgba(15,23,42,.08);
          border-color: rgba(248,113,113,.4);
        }

        .lib-poster{
          width: 110px; height: var(--poster-h); background: #f8fafc; border: 1px solid rgba(148,163,184,.3);
          border-radius: .75rem; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
        }
        .lib-poster img{ width: 100%; height: 100%; object-fit: contain; object-position: center; background: #fff; display: block; }
        .lib-poster-ph{ font-size: .6rem; font-weight: 700; color: #94a3b8; text-align: center; padding: .4rem; }

        .status-pill{
          margin-left: auto; padding: .28rem .6rem; border-radius: 9999px; border: 1px solid transparent; white-space: nowrap;
        }
        .status-pill.watched{ background: rgba(22,163,74,.08); border-color: rgba(22,163,74,.35); color: #166534; }
        .status-pill.not-watched{ background: rgba(248,113,113,.12); border-color: rgba(248,113,113,.3); color: #b91c1c; }

        .seq-badge{ background: rgba(15,118,110,.05); color: #0f766e; }
        .type-badge{ background: rgba(99,102,241,.07); color: #4338ca; }

        .cat-badge{ border: 1px solid; background: rgba(20,184,166,.04); }

        /* Subcategory — black text */
        .subcat-badge{
          background: #f8fafc;
          border: 1px solid rgba(148,163,184,.25);
          color: #0f172a !important;
        }

        .cat-badge-big{
          background: rgba(14,165,233,.09); border: 1px solid rgba(14,165,233,.45); font-weight: 600;
          color: #0f172a; padding: .35rem .7rem;
        }

        .genre-badge{ background: rgba(15,23,42,.04); color: #0f172a; }
        .subt-badge{ background: rgba(236,252,203,.9); color: #365314; }
        .subt-title{ font-weight: 700; color: #0f172a; font-size: clamp(0.68rem, 2vw, 0.75rem); }

        /* progress */
        .load-wrap{ display:flex; align-items:center; gap:.75rem; }
        .progress{ height: 10px; width: 220px; background: #eef2f7; border-radius: 999px; overflow: hidden; border: 1px solid rgba(148,163,184,.35); }
        .progress > .bar{ height: 100%; width: 0%; background: linear-gradient(90deg, #14b8a6, #6366f1); transition: width .15s ease; }

        /* popup */
        .details-overlay{
          position: fixed; inset: 0; background: rgba(15,23,42,.42); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;
        }
        .details-card{
          background: #fff; border-radius: 1rem; max-width: 680px; width: 100%; min-height: 260px;
          box-shadow: 0 18px 46px rgba(15,23,42,.25); position: relative; padding: 1.2rem 1.3rem;
        }
        .details-close{
          position: absolute; top: .5rem; right: .5rem; border: none; background: rgba(15,23,42,.04);
          width: 32px; height: 32px; border-radius: 9999px; font-size: 1.1rem; line-height: 1; display: grid; place-items: center; cursor: pointer;
        }
        .details-poster{
          width: 150px; height: 200px; background: #f8fafc; border: 1px solid rgba(148,163,184,.3);
          border-radius: .75rem; display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .details-poster img{ width: 100%; height: 100%; object-fit: contain; }
        .details-ph{ color: #94a3b8; font-size: .7rem; font-weight: 600; }

        /* search + filter layout */
        .actions-row{
          display: grid;
          grid-template-columns: 1fr auto;
          gap: .75rem;
          align-items: center;
        }
        @media (max-width: 575.98px){
          .actions-row{
            grid-template-columns: 1fr;
          }
        }

        /* Mobile tweaks so third button never hides */
        @media (max-width: 575.98px){
          .filter-toggle{
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: .4rem;
            padding: .25rem;
          }
          .filter-btn{
            width: 100%;
            justify-content: center;
            /* allow wrapping if ultra-narrow; otherwise keep compact */
            white-space: normal;
            padding: .5rem .4rem;
            font-size: clamp(0.72rem, 3.6vw, 0.9rem);
          }
          .filter-btn .dot{ display: none; } /* save space on small screens */
        }
        @media (max-width: 360px){
          .status-pill{ margin-left: 0; }
        }

        /* mobile cards */
        @media (max-width: 575.98px){
          .lib-card{ display: grid; grid-template-columns: 92px 1fr; column-gap: .9rem; min-height: auto; }
          .lib-poster{ width: 92px; height: 128px; }
          .top-tabs{ width: 100%; justify-content: center; }
          .details-card{ max-height: 90vh; overflow-y: auto; }
          .details-poster{ width: 120px; height: 170px; }
          .row > [class*="col-"] { width: 100%; }
        }
      `}</style>

      {/* top bar */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="top-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "movies" ? "active" : ""}`}
            onClick={() => handleTab("movies")}
          >
            🎬 Movies
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "series" ? "active" : ""}`}
            onClick={() => handleTab("series")}
          >
            📺 Series
          </button>
        </div>

        <a
          href={`${API_BASE}/list?type=${activeTab}&page=${page}&search=${encodeURIComponent(
            search
          )}`}
          target="_blank"
          rel="noreferrer"
          className="small text-muted"
        >
          Open API ↗
        </a>
      </div>

      {/* search + filter */}
      <div className="search-wrap">
        <div className="actions-row">
          {/* Search input */}
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">🔎</span>
            <input
              type="search"
              className="form-control border-start-0"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>

          {/* Filter Toggle */}
          <div
            className="filter-toggle"
            role="tablist"
            aria-label="Filter by watched status"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "all"}
              className={`filter-btn ${viewFilter === "all" ? "active" : ""}`}
              onClick={() => setViewFilter("all")}
              title="Show all"
            >
              <span className="dot" />
              ALL
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "watched"}
              className={`filter-btn ${viewFilter === "watched" ? "active" : ""}`}
              onClick={() => setViewFilter("watched")}
              title="Show only watched"
            >
              <span className="dot" />
              Watched
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "not-watched"}
              className={`filter-btn ${viewFilter === "not-watched" ? "active" : ""}`}
              onClick={() => setViewFilter("not-watched")}
              title="Show only not watched"
            >
              <span className="dot" />
              Not Watched
            </button>
          </div>
        </div>
      </div>

      {/* chips */}
      <div className="mt-2 d-flex gap-2 flex-wrap">
        <span className="badge text-bg-light">Showing: {filteredItems.length}</span>
        <span className="badge text-bg-secondary">Total (page): {payload.items?.length || 0}</span>
        <span className="badge text-bg-success">Watched: {watchedCount}</span>
        <span className="badge text-bg-danger">Not watched: {notWatchedCount}</span>
        <span className="badge text-bg-dark">Page {page} / {payload.total_pages || 1}</span>
      </div>

      {/* content */}
      <div className="mt-3">
        {error ? (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <span className="me-2">⚠</span> {error}
          </div>
        ) : loading ? (
          <div className="card p-3 d-flex flex-row align-items-center justify-content-between">
            <div className="load-wrap">
              <div className="progress" aria-label="Loading progress">
                <div className="bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="small text-muted fw-semibold">{progress}%</span>
            </div>
            <span className="small text-muted">Loading {activeTab}…</span>
          </div>
        ) : (
          <>
            {/* pass filtered items to Cards */}
            <Cards items={filteredItems} type={activeTab} />

            <div className="d-flex justify-content-between align-items-center mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={prevPage}
                disabled={page <= 1 || loading}
              >
                ← Prev
              </button>
              <div className="text-muted small fw-semibold">
                Page {page} of {payload.total_pages || 1}
              </div>
              <button
                type="button"
                className="btn btn-success"
                onClick={nextPage}
                disabled={page >= (payload.total_pages || 1) || loading}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* popup */}
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
