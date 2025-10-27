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

  const fetchList = useMemo(
    () => async (tab, pg, q) => {
      try {
        setError("");
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/list`, {
          params: { type: tab, page: pg, search: q || "" },
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
    const t = setTimeout(() => fetchList(activeTab, page, search), 250);
    return () => clearTimeout(t);
  }, [activeTab, page, search, fetchList]);

  const onTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  const nextPage = () => page < (payload.total_pages || 1) && setPage((p) => p + 1);
  const prevPage = () => page > 1 && setPage((p) => p - 1);

  const Cards = ({ items, type }) => (
    <div className="row g-3 g-md-4">
      {items.map((it) => {
        const hasPoster = !!it.poster_url;
        const catColor = it.category?.color || "#6c757d";
        const watched = it.is_watched;
        const subtags = type === "movies" ? it.parts || [] : it.seasons || [];

        return (
          <div className="col-12 col-md-6 col-xl-4" key={`${type}-${it.id}`}>
            <div
              className="card h-100 shadow-sm custom-card"
              tabIndex={0}
              aria-label={`${type === "movies" ? "Movie" : "Series"}: ${it.title}`}
            >
              <div className="card-body d-flex gap-3">
                {/* Poster — fixed portrait box, image contained (no crop/zoom) */}
                <div className="poster-box">
                  {hasPoster ? (
                    <img
                      src={it.poster_url}
                      alt={`${it.title} poster`}
                      onError={(e) => { e.currentTarget.src = ""; e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="poster-ph">NO POSTER</div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex align-items-start gap-2 flex-wrap">
                    <span className="badge text-bg-light text-dark fw-bold">#{it.seq}</span>
                    <h6 className="mb-0 fw-bold text-truncate" title={it.title}>
                      {it.title}
                    </h6>
                    <span className={`ms-auto badge ${watched ? "text-bg-success" : "text-bg-secondary"}`}>
                      {watched ? "Watched" : "Not watched"}
                    </span>
                  </div>

                  <div className="text-muted small mt-1">
                    {it.release_year ? `Year: ${it.release_year}` : "—"}
                  </div>

                  {!!subtags.length && (
                    <div className="mt-1 small">
                      <span className="text-secondary fw-semibold me-1">
                        {type === "movies" ? "Parts:" : "Seasons:"}
                      </span>
                      <span className="text-wrap">{subtags.join(", ")}</span>
                    </div>
                  )}

                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {it.category?.name && (
                      <span
                        className="badge border rounded-pill fw-semibold"
                        style={{ color: catColor, borderColor: catColor }}
                        title={it.category.name}
                      >
                        {it.category.name}
                      </span>
                    )}
                    {it.subcategory?.name && (
                      <span className="badge text-bg-light rounded-pill">{it.subcategory.name}</span>
                    )}
                  </div>

                  {!!it.genres?.length && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {it.genres.map((g, idx) => (
                        <span key={idx} className="badge text-bg-secondary rounded-pill">
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
      })}
    </div>
  );

  return (
    <div className="container py-3">
      <style>{`
        :root{
          --tab-grad: linear-gradient(135deg, #0f172a, #334155);
          --tab-active:#16a34a;
          --tab-active-2:#0e9f6e;
          --tab-text:#e2e8f0;
          --ring: rgba(16,185,129,.35);
          --card-green-soft: rgba(22,163,74,.45);
          --card-green-strong: rgba(22,163,74,.9);
          --poster-w: 120px;
          --poster-h: 160px;
        }

        .focus-ring:focus { outline: none; box-shadow: 0 0 0 .2rem var(--ring); }

        /* Tabs */
        .nav-pills .nav-link{
          color: var(--tab-text);
          background: var(--tab-grad);
          border: 1px solid rgba(148,163,184,.25);
          border-radius: .8rem;
          font-weight: 700;
          letter-spacing:.2px;
          box-shadow: 0 6px 14px rgba(2,6,23,.18);
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .nav-pills .nav-link:hover{
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(2,6,23,.22);
        }
        .nav-pills .nav-link.active{
          color: #fff;
          background: linear-gradient(135deg, var(--tab-active), var(--tab-active-2));
          border-color: rgba(16,185,129,.5);
          box-shadow: 0 10px 28px rgba(5,150,105,.35);
          transform: translateY(-1px);
        }

        /* Cards — always-on green border + hover glow */
        .custom-card{
          position: relative;
          border-radius: 1rem;
          border: 2px solid var(--card-green-soft) !important;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          cursor: default;
        }
        .custom-card:hover,
        .custom-card:focus,
        .custom-card:focus-within{
          border-color: var(--card-green-strong) !important;
          box-shadow: 0 .9rem 1.6rem rgba(22,163,74,.22);
          transform: translateY(-2px);
          cursor: pointer;
        }
        .custom-card:focus-visible{
          box-shadow: 0 0 0 .2rem var(--ring), 0 .9rem 1.6rem rgba(22,163,74,.22);
        }

        /* Poster box: portrait, no crop/zoom, image fully contained */
        .poster-box{
          width: var(--poster-w);
          height: var(--poster-h);
          border-radius: .6rem;
          border: 1px solid #dee2e6;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .poster-box img{
          width: 100%;
          height: 100%;
          object-fit: contain;       /* ✅ fit inside */
          object-position: center;
          display: block;
          image-rendering: auto;
          background: #fff;
        }
        .poster-ph{
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-weight: 800;
          font-size: 12px;
          background: repeating-linear-gradient(
            135deg,
            #f8fafc, #f8fafc 16px,
            #eef2f7 16px, #eef2f7 32px
          );
          border-radius: .6rem;
        }

        .sticky-top.bg-body{
          backdrop-filter: blur(6px);
          border-bottom: 1px solid rgba(226,232,240,.6);
        }

        @media (prefers-reduced-motion: reduce){
          .custom-card, .nav-pills .nav-link { transition: none; }
        }

        /* Slightly smaller poster on very small screens */
        @media (max-width: 390px){
          :root{ --poster-w: 100px; --poster-h: 140px; }
        }
      `}</style>

      {/* Tabs */}
      <div className="sticky-top bg-body pt-2 pb-2">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "movies" ? "active" : ""}`}
              onClick={() => onTab("movies")}
              type="button"
            >
              Movies <span className="badge text-bg-light ms-2">Base</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "series" ? "active" : ""}`}
              onClick={() => onTab("series")}
              type="button"
            >
              Series <span className="badge text-bg-light ms-2">Base</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Search */}
      <div className="mt-3">
        <div className="input-group">
          <span className="input-group-text bg-white">
            <span className="text-muted">🔎</span>
          </span>
          <input
            type="search"
            className="form-control focus-ring"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            aria-label="Search"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="d-flex flex-wrap gap-2 mt-3">
        <span className="badge rounded-pill text-bg-info">Showing: {payload.items?.length || 0}</span>
        <span className="badge rounded-pill text-bg-secondary">Total: {payload.total || 0}</span>
        <span className="badge rounded-pill text-bg-light">Page: {payload.page} / {payload.total_pages}</span>
        <span className="badge rounded-pill text-bg-dark">Type: {activeTab === "movies" ? "Movies" : "Series"}</span>
      </div>

      {/* Content */}
      <div className="mt-3">
        {error ? (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <span className="me-2">⚠</span> {error}
          </div>
        ) : loading ? (
          <div className="card shadow-sm custom-card" tabIndex={0}>
            <div className="card-body d-flex align-items-center gap-2">
              <LoadingSpiner /> <span>Loading {activeTab}…</span>
            </div>
          </div>
        ) : (
          <>
            <Cards items={payload.items || []} type={activeTab} />

            {/* Pagination */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <button
                className="btn btn-outline-secondary"
                onClick={prevPage}
                disabled={page <= 1 || loading}
                type="button"
              >
                ← Previous
              </button>

              <div className="text-muted fw-semibold">
                Page <span className="text-dark">{page}</span> of{" "}
                <span className="text-dark">{payload.total_pages || 1}</span>
              </div>

              <button
                className="btn btn-success"
                onClick={nextPage}
                disabled={page >= (payload.total_pages || 1) || loading}
                type="button"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
