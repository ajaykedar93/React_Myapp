// src/pages/AllList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import LoadingSpiner from "./LoadingSpiner"; // adjust path if needed

const API_BASE = "https://express-backend-myapp.onrender.com/api/library";
const PAGE_SIZE = 20;

export default function AllList() {
  const [activeTab, setActiveTab] = useState("movies"); // "movies" | "series"
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
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
  const [selectedItem, setSelectedItem] = useState(null); // ✅ popup

  // one fetch for both tabs
  const fetchList = useMemo(
    () => async (tab, pg, q) => {
      try {
        setError("");
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/list`, {
          params: {
            type: tab,
            page: pg,
            search: q || "",
          },
        });
        setPayload(data);
      } catch (e) {
        console.error(e);
        setError("Failed to load items.");
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

  /* ---------- parts / seasons (no extra year) ---------- */
  const renderSubtags = (item, type) => {
    const arr = type === "movies" ? item.parts : item.seasons;
    if (!arr || !arr.length) return null;

    return (
      <div className="mt-2">
        <p className="subt-title mb-1">
          {type === "movies" ? "Parts" : "Seasons"}
        </p>
        <div className="d-flex flex-wrap gap-1">
          {arr.map((p, idx) => {
            const text =
              typeof p === "string"
                ? p.trim()
                : `${type === "movies" ? "Part" : "Season"} ${p}`;
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

  /* ---------- cards ---------- */
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
                <div className="d-flex align-items-start gap-2">
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

                {/* parts / seasons */}
                {renderSubtags(it, type)}

                {/* category / subcategory */}
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

                {/* genres */}
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

  /* ---------- popup ---------- */
  const DetailModal = ({ item, onClose }) => {
    if (!item) return null;
    const type = item._type || (activeTab === "movies" ? "movies" : "series");
    const hasPoster = !!item.poster_url;

    return (
      <div className="details-overlay" onClick={onClose}>
        <div className="details-card" onClick={(e) => e.stopPropagation()}>
          <button className="details-close" onClick={onClose}>
            ×
          </button>
          <div className="d-flex gap-3 flex-wrap">
            {/* poster */}
            <div className="details-poster">
              {hasPoster ? (
                <img src={item.poster_url} alt={item.title} />
              ) : (
                <div className="details-ph">NO POSTER</div>
              )}
            </div>

            {/* content */}
            <div className="flex-grow-1">
              <h5 className="mb-1 d-flex gap-2 flex-wrap align-items-center">
                {item.title}
                <span
                  className={`status-pill ${item.is_watched ? "watched" : "not-watched"}`}
                >
                  {item.is_watched ? "Watched" : "Not watched"}
                </span>
              </h5>
              <p className="mb-2 text-muted small d-flex flex-wrap gap-2">
                <span>
                  {item.release_year
                    ? `Released: ${item.release_year}`
                    : "Release year: —"}
                </span>
                <span>• {type === "movies" ? "Movie" : "Series"}</span>
                <span>• #{item.seq}</span>
              </p>

              {/* parts / seasons */}
              {renderSubtags(item, type)}

              {/* category / subcategory BIG */}
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

              {/* genres */}
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

  return (
    <div className="container py-3 all-list-page">
      <style>{`
        .all-list-page{
          max-width: 1150px;
        }
        :root{
          --tab-active: linear-gradient(120deg, #14b8a6, #6366f1);
          --poster-h: 145px;
        }

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
          border: none;
          background: transparent;
          color: #94a3b8;
          font-weight: 600;
          padding: .5rem 1.1rem;
          border-radius: .75rem;
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          transition: all .16s ease;
          cursor: pointer;
        }
        .tab-btn:hover{
          background: rgba(148,163,184,.09);
          color: #e2e8f0;
        }
        .tab-btn.active{
          background: var(--tab-active);
          color: #fff;
          box-shadow: 0 12px 24px rgba(99,102,241,.25);
        }

        .search-wrap{
          margin-top: 1.4rem;
        }
        .search-wrap .form-control{
          border-radius: .9rem;
          border: 1px solid rgba(148,163,184,.35);
          background: #fff;
        }
        .search-wrap .form-control:focus{
          box-shadow: 0 0 0 .18rem rgba(20,184,166,.25);
        }

        /* cards */
        .lib-card{
          background: #fff;
          border-radius: 1rem;
          display: flex;
          gap: .9rem;
          padding: .9rem;
          min-height: 150px;
          box-shadow: 0 6px 18px rgba(15,23,42,.03);
          transition: transform .12s ease, box-shadow .12s ease, border .12s ease;
          cursor: pointer;
          /* ✅ small red border so cards are clearly separated */
          border: 1.5px solid rgba(248,113,113,.16);
        }
        .lib-card.is-movie{
          border-left: 4px solid rgba(248,113,113,.8);   /* red for movies */
        }
        .lib-card.is-series{
          border-left: 4px solid rgba(248,113,113,.45);  /* little lighter for series */
        }
        .lib-card:hover,
        .lib-card:focus-within{
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(15,23,42,.08);
          border-color: rgba(248,113,113,.4);
        }

        .lib-poster{
          width: 110px;
          height: var(--poster-h);
          background: #f8fafc;
          border: 1px solid rgba(148,163,184,.3);
          border-radius: .75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .lib-poster img{
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          background: #fff;
          display: block;
        }
        .lib-poster-ph{
          font-size: .6rem;
          font-weight: 700;
          color: #94a3b8;
          text-align: center;
          padding: .4rem;
        }

        .lib-body{
          flex: 1 1 auto;
          min-width: 0;
        }
        /* ✅ mobile friendly title - no cut */
        .lib-title{
          font-weight: 700;
          font-size: .92rem;
          max-width: 100%;
          white-space: normal;
          word-break: break-word;
        }

        .status-pill{
          margin-left: auto;
          padding: .25rem .55rem;
          font-size: .66rem;
          border-radius: 9999px;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .status-pill.watched{
          background: rgba(22,163,74,.08);
          border-color: rgba(22,163,74,.35);
          color: #166534;
        }
        .status-pill.not-watched{
          background: rgba(248,113,113,.12);
          border-color: rgba(248,113,113,.3);
          color: #b91c1c;
        }

        .seq-badge{
          background: rgba(15,118,110,.05);
          color: #0f766e;
        }
        .type-badge{
          background: rgba(99,102,241,.07);
          color: #4338ca;
        }

        .cat-badge{
          border: 1px solid;
          background: rgba(20,184,166,.04);
          font-size: .65rem;
        }
        /* ✅ bigger in popup */
        .cat-badge-big{
          background: rgba(14,165,233,.09);
          border: 1px solid rgba(14,165,233,.45);
          font-size: .72rem;
          font-weight: 600;
          color: #0f172a;
          padding: .35rem .7rem;
        }
        .subcat-badge{
          background: rgba(248,250,252,1);
          border: 1px solid rgba(148,163,184,.25);
          font-size: .65rem;
          color: #0f172a;
        }
        .genre-badge{
          background: rgba(15,23,42,.04);
          color: #0f172a;
          font-size: .62rem;
        }
        .subt-badge{
          background: rgba(236,252,203,.9);
          color: #365314;
          font-size: .62rem;
        }
        .subt-title{
          font-size: .65rem;
          font-weight: 600;
          color: #0f172a;
        }

        /* popup */
        .details-overlay{
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.42);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .details-card{
          background: #fff;
          border-radius: 1rem;
          max-width: 680px;
          width: 100%;
          min-height: 260px;
          box-shadow: 0 18px 46px rgba(15,23,42,.25);
          position: relative;
          padding: 1.2rem 1.3rem;
        }
        .details-close{
          position: absolute;
          top: .5rem;
          right: .5rem;
          border: none;
          background: rgba(15,23,42,.04);
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          font-size: 1.1rem;
          line-height: 1;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .details-poster{
          width: 150px;
          height: 200px;
          background: #f8fafc;
          border: 1px solid rgba(148,163,184,.3);
          border-radius: .75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .details-poster img{
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .details-ph{
          color: #94a3b8;
          font-size: .7rem;
          font-weight: 600;
        }

        /* mobile */
        @media (max-width: 575.98px){
          .lib-card{
            flex-direction: row;
          }
          .lib-poster{
            width: 90px;
            height: 130px;
          }
          .top-tabs{
            width: 100%;
            justify-content: center;
          }
          .details-card{
            max-height: 90vh;
            overflow-y: auto;
          }
          .details-poster{
            width: 120px;
            height: 170px;
          }
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

      {/* search */}
      <div className="search-wrap">
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
      </div>

      {/* chips */}
      <div className="mt-2 d-flex gap-2 flex-wrap">
        <span className="badge text-bg-light">
          Showing: {payload.items?.length || 0}
        </span>
        <span className="badge text-bg-secondary">
          Total: {payload.total || 0}
        </span>
        <span className="badge text-bg-dark">
          Page {page} / {payload.total_pages || 1}
        </span>
      </div>

      {/* content */}
      <div className="mt-3">
        {error ? (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <span className="me-2">⚠</span> {error}
          </div>
        ) : loading ? (
          <div className="card p-3 d-flex flex-row align-items-center gap-3">
            <LoadingSpiner /> <span>Loading {activeTab}…</span>
          </div>
        ) : (
          <>
            <Cards items={payload.items || []} type={activeTab} />

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
