// src/pages/Download.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import LoadingSpiner from "./LoadingSpiner";
import { motion, AnimatePresence } from "framer-motion";

const itemsPerPage = 10;
const API_BASE = "https://express-backend-myapp.onrender.com/api";

/** Prev/Next-only pagination */
function PrevNext({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹ Prev
      </button>
      <span className="text-secondary small">
        Page <b>{page}</b> / {totalPages}
      </span>
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        Next ›
      </button>
    </div>
  );
}

/** Subtle shimmer skeleton line */
const LineSkeleton = ({ w = "80%" }) => (
  <div
    className="skeleton-line"
    style={{ width: w, height: 12, borderRadius: 8, marginBottom: 8 }}
  />
);

/** Section header with count & select-on-page helper */
function SectionHeader({
  title,
  total,
  onSelectAll,
  onClearPage,
  pageCount,
  hasAnySelectedOnPage,
}) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
      <h3 className="section-title m-0 d-flex align-items-center gap-2">
        <span className="section-pill" />
        <span>{title}</span>
      </h3>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="badge bg-dark-subtle text-dark">{total} total</span>
        {pageCount > 0 && (
          <>
            <button className="btn btn-soft btn-sm" onClick={onSelectAll}>
              Select {pageCount} on page
            </button>
            {hasAnySelectedOnPage && (
              <button className="btn btn-soft btn-sm" onClick={onClearPage}>
                Clear page selection
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const Download = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isWatched, setIsWatched] = useState("");
  const [search, setSearch] = useState("");

  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [exportType, setExportType] = useState("pdf");

  // independent pagination
  const [moviePage, setMoviePage] = useState(1);
  const [seriesPage, setSeriesPage] = useState(1);

  // selection
  const [selectedItems, setSelectedItems] = useState([]);

  // fetch categories
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/download/categories`);
        if (res.data && Array.isArray(res.data.categories)) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    })();
  }, []);

  // fetch data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/download`, {
          params: { search, category_id: selectedCategory, is_watched: isWatched },
        });
        setMovies(res.data.movies || []);
        setSeries(res.data.series || []);
        setMoviePage(1);
        setSeriesPage(1);
      } catch (err) {
        console.error("Error fetching movies/series:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [search, selectedCategory, isWatched]);

  // pagination helpers
  const slicePage = (arr, page) => {
    const start = (page - 1) * itemsPerPage;
    return arr.slice(start, start + itemsPerPage);
  };
  const totalMoviePages = Math.max(1, Math.ceil(movies.length / itemsPerPage));
  const totalSeriesPages = Math.max(1, Math.ceil(series.length / itemsPerPage));
  const paginatedMovies = useMemo(
    () => slicePage(movies, moviePage),
    [movies, moviePage]
  );
  const paginatedSeries = useMemo(
    () => slicePage(series, seriesPage),
    [series, seriesPage]
  );

  // selection helpers
  const keyOf = (item, type) => `${type}-${item.movie_id || item.series_id}`;
  const isSelectedKey = (key) => selectedItems.some((s) => s.key === key);
  const getSelectionNumber = (key) => {
    const idx = selectedItems.findIndex((s) => s.key === key);
    return idx >= 0 ? idx + 1 : null;
  };

  const toggleSelect = (item, type) => {
    const key = keyOf(item, type);
    setSelectedItems((prev) =>
      prev.some((s) => s.key === key)
        ? prev.filter((s) => s.key !== key)
        : [...prev, { key, ...item, type }]
    );
  };

  const selectAllOnPage = useCallback((list, type) => {
    setSelectedItems((prev) => {
      const additions = [];
      for (const it of list) {
        const key = keyOf(it, type);
        if (!prev.some((p) => p.key === key)) additions.push({ key, ...it, type });
      }
      return [...prev, ...additions];
    });
  }, []);

  const clearPageSelection = useCallback((list, type) => {
    setSelectedItems((prev) => {
      const pageKeys = new Set(list.map((it) => keyOf(it, type)));
      return prev.filter((p) => !pageKeys.has(p.key));
    });
  }, []);

  const hasAnySelectedOnPage = (list, type) =>
    list.some((it) => isSelectedKey(keyOf(it, type)));

  // export (improved for mobile / iOS)
  const handleExport = async () => {
    if (!selectedItems.length) return;
    try {
      const payload = { items: selectedItems, type: exportType };
      const res = await axios.post(`${API_BASE}/download/export`, payload, {
        responseType: "blob",
      });

      const ext =
        exportType === "excel"
          ? "xlsx"
          : exportType === "csv"
          ? "csv"
          : exportType === "txt"
          ? "txt"
          : "pdf";

      const fileName = `selected_movies_series.${ext}`;
      const contentType =
        res.headers["content-type"] ||
        (ext === "pdf"
          ? "application/pdf"
          : ext === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : ext === "csv"
          ? "text/csv"
          : "text/plain");

      const blob = new Blob([res.data], { type: contentType });

      // iOS Safari / some mobile browsers have trouble with direct download
      const isIOS =
        typeof navigator !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !window.MSStream;

      if (isIOS) {
        // Open in new tab; user can "Save to Files" or share
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          const win = window.open(dataUrl, "_blank");
          if (!win) {
            alert("Please allow pop-ups in your browser to download the file.");
          }
        };
        reader.readAsDataURL(blob);
        return;
      }

      // Normal desktop / Android path – direct download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting:", err);
      alert("Failed to export file. Please try again.");
    }
  };

  // animations
  const listContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { when: "beforeChildren", staggerChildren: 0.05 },
    },
  };
  const itemCard = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 },
    },
    exit: {
      opacity: 0,
      y: -6,
      scale: 0.98,
      transition: { duration: 0.12 },
    },
  };

  return (
    <div className="dl-root">
      {/* Sticky filter bar on mobile */}
      <div className="filter-wrap">
        <div className="container py-4">
          <motion.h2
            className="text-center mb-3 fw-bold gradient-text"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            🎬 Movies & Series Download
          </motion.h2>

          <div className="row g-2 justify-content-center">
            <div className="col-12 col-md-3">
              <select
                className="form-select shadow-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-2">
              <select
                className="form-select shadow-sm"
                value={isWatched}
                onChange={(e) => setIsWatched(e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Watched</option>
                <option value="false">Not Watched</option>
              </select>
            </div>

            <div className="col-6 col-md-3">
              <input
                type="text"
                className="form-control shadow-sm"
                placeholder="🔍 Search movies or series..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-6 col-md-2">
              <select
                className="form-select shadow-sm"
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="txt">Text</option>
              </select>
            </div>

            <div className="col-6 col-md-2 d-grid">
              <button
                className="btn btn-gradient shadow-sm"
                onClick={handleExport}
                disabled={selectedItems.length === 0}
                title={
                  selectedItems.length ? "Export selected" : "Select at least one item"
                }
              >
                ⬇ Download ({selectedItems.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selection toolbar (sticky bottom on mobile) */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div
            className="selection-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 270, damping: 24 }}
          >
            <div className="container d-flex align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-primary">
                  {selectedItems.length} selected
                </span>
                <div className="scroll-chips">
                  {selectedItems.slice(0, 6).map((s) => (
                    <span className="chip" key={s.key}>
                      {s.type === "movie" ? s.movie_name : s.series_name}
                    </span>
                  ))}
                  {selectedItems.length > 6 && (
                    <span className="chip muted">
                      +{selectedItems.length - 6} more
                    </span>
                  )}
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => setSelectedItems([])}
                >
                  Clear all
                </button>
                <button
                  className="btn btn-gradient btn-sm"
                  onClick={handleExport}
                  disabled={selectedItems.length === 0}
                >
                  Export {selectedItems.length}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="container content-pad">
        {/* Loading */}
        {loading && (
          <div className="row g-4">
            {[...Array(2)].map((_, col) => (
              <div className="col-12 col-lg-6" key={col}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h3 className="section-title shimmer">Loading…</h3>
                  <span className="badge bg-dark-subtle text-dark">—</span>
                </div>
                {[...Array(5)].map((__, i) => (
                  <div
                    className="card shadow-sm mb-3 border-0 skeleton-card"
                    key={i}
                  >
                    <div className="card-body">
                      <LineSkeleton w="30%" />
                      <LineSkeleton w="55%" />
                      <LineSkeleton w="40%" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="row g-4"
          >
            {/* Movies */}
            <div className="col-12 col-lg-6">
              <SectionHeader
                title="🎥 Movies"
                total={movies.length}
                onSelectAll={() => selectAllOnPage(paginatedMovies, "movie")}
                onClearPage={() => clearPageSelection(paginatedMovies, "movie")}
                pageCount={paginatedMovies.length}
                hasAnySelectedOnPage={hasAnySelectedOnPage(
                  paginatedMovies,
                  "movie"
                )}
              />

              <AnimatePresence mode="popLayout">
                {paginatedMovies.length === 0 ? (
                  <motion.div
                    className="empty-card"
                    variants={itemCard}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                  >
                    <div className="empty-emoji">😶</div>
                    <div className="empty-title">No movies found</div>
                    <div className="empty-sub">
                      Try changing filters or search.
                    </div>
                  </motion.div>
                ) : (
                  paginatedMovies.map((m) => {
                    const key = `movie-${m.movie_id}`;
                    const selected = isSelectedKey(key);
                    const number = getSelectionNumber(key);

                    return (
                      <motion.div
                        key={key}
                        className={`card shadow-sm hover-card mb-3 border-0 ${
                          selected ? "ring" : ""
                        }`}
                        variants={itemCard}
                        layout
                        whileHover={{ y: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                        }}
                        tabIndex={0}
                        onClick={(e) => {
                          // avoid double toggle when clicking checkbox
                          if (
                            e.target &&
                            e.target.closest &&
                            e.target.closest("input[type='checkbox']")
                          ) {
                            return;
                          }
                          toggleSelect(m, "movie");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleSelect(m, "movie");
                          }
                        }}
                      >
                        <div className="card-inner-gradient" />
                        <div className="card-body d-flex align-items-start gap-3 position-relative">
                          <motion.input
                            type="checkbox"
                            className="big-check"
                            checked={selected}
                            onChange={() => toggleSelect(m, "movie")}
                            aria-label={`Select ${m.movie_name}`}
                            whileTap={{ scale: 0.9 }}
                          />
                          <div className="w-100">
                            <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                              {number && (
                                <span className="badge rounded-pill bg-primary">
                                  {number}
                                </span>
                              )}
                              <h5 className="card-title fw-bold mb-0 truncate-1">
                                {m.movie_name}
                              </h5>
                              {m.release_year ? (
                                <span className="chip small neutral">
                                  ({m.release_year})
                                </span>
                              ) : null}
                            </div>

                            <div className="meta-row">
                              <span className="meta-key">Parts</span>
                              <span className="meta-val">
                                {m.parts?.length > 0
                                  ? m.parts.join(", ")
                                  : "Part 1"}
                              </span>
                            </div>

                            <div className="meta-row">
                              <span className="meta-key">Category</span>
                              <span
                                className="meta-val"
                                style={{ color: m.category_color }}
                              >
                                {m.category_name || "—"}
                              </span>
                            </div>

                            <span
                              className={`badge watched-pill ${
                                m.is_watched
                                  ? "bg-success"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {m.is_watched ? "Watched" : "Not Watched"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>

              <PrevNext
                page={moviePage}
                totalPages={totalMoviePages}
                onPage={setMoviePage}
              />
            </div>

            {/* Series */}
            <div className="col-12 col-lg-6">
              <SectionHeader
                title="📺 Series"
                total={series.length}
                onSelectAll={() => selectAllOnPage(paginatedSeries, "series")}
                onClearPage={() => clearPageSelection(paginatedSeries, "series")}
                pageCount={paginatedSeries.length}
                hasAnySelectedOnPage={hasAnySelectedOnPage(
                  paginatedSeries,
                  "series"
                )}
              />

              <AnimatePresence mode="popLayout">
                {paginatedSeries.length === 0 ? (
                  <motion.div
                    className="empty-card"
                    variants={itemCard}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                  >
                    <div className="empty-emoji">🫥</div>
                    <div className="empty-title">No series found</div>
                    <div className="empty-sub">
                      Adjust filters or search again.
                    </div>
                  </motion.div>
                ) : (
                  paginatedSeries.map((s) => {
                    const key = `series-${s.series_id}`;
                    const selected = isSelectedKey(key);
                    const number = getSelectionNumber(key);

                    return (
                      <motion.div
                        key={key}
                        className={`card shadow-sm hover-card mb-3 border-0 ${
                          selected ? "ring" : ""
                        }`}
                        variants={itemCard}
                        layout
                        whileHover={{ y: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                        }}
                        tabIndex={0}
                        onClick={(e) => {
                          if (
                            e.target &&
                            e.target.closest &&
                            e.target.closest("input[type='checkbox']")
                          ) {
                            return;
                          }
                          toggleSelect(s, "series");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleSelect(s, "series");
                          }
                        }}
                      >
                        <div className="card-inner-gradient" />
                        <div className="card-body d-flex align-items-start gap-3 position-relative">
                          <motion.input
                            type="checkbox"
                            className="big-check"
                            checked={selected}
                            onChange={() => toggleSelect(s, "series")}
                            aria-label={`Select ${s.series_name}`}
                            whileTap={{ scale: 0.9 }}
                          />
                          <div className="w-100">
                            <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                              {number && (
                                <span className="badge rounded-pill bg-primary">
                                  {number}
                                </span>
                              )}
                              <h5 className="card-title fw-bold mb-0 truncate-1">
                                {s.series_name}
                              </h5>
                              {s.release_year ? (
                                <span className="chip small neutral">
                                  ({s.release_year})
                                </span>
                              ) : null}
                            </div>

                            <div className="meta-row">
                              <span className="meta-key">Seasons</span>
                              <span className="meta-val">
                                {s.seasons?.length > 0
                                  ? s.seasons.join(", ")
                                  : "Season 1"}
                              </span>
                            </div>

                            <div className="meta-row">
                              <span className="meta-key">Category</span>
                              <span
                                className="meta-val"
                                style={{ color: s.category_color }}
                              >
                                {s.category_name || "—"}
                              </span>
                            </div>

                            <span
                              className={`badge watched-pill ${
                                s.is_watched
                                  ? "bg-success"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {s.is_watched ? "Watched" : "Not Watched"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>

              <PrevNext
                page={seriesPage}
                totalPages={totalSeriesPages}
                onPage={setSeriesPage}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .dl-root{
          background:
            radial-gradient(1200px 600px at -10% 0%, rgba(56,189,248,0.18), transparent 60%),
            radial-gradient(1100px 550px at 110% -10%, rgba(132,204,22,0.16), transparent 60%),
            linear-gradient(180deg, #eef6ff 0%, #f7fbff 45%, #f7fff7 100%);
          min-height: 100vh;
          width: 100%;
        }

        /* Sticky filter area with gentle depth */
        .filter-wrap{
          position: sticky;
          top: 0;
          z-index: 5;
          backdrop-filter: saturate(1.1) blur(6px);
          background: linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.7));
          border-bottom: 1px solid rgba(15,23,42,.06);
        }

        .gradient-text{
          background: linear-gradient(90deg, #0ea5e9, #22c55e, #8b5cf6);
          -webkit-background-clip: text; background-clip: text;
          color: transparent; letter-spacing: .2px;
        }

        .content-pad{ padding-bottom: 96px; } /* room for bottom selection bar on mobile */

        .section-title{
          color: #0b1221; font-weight: 800; letter-spacing: .2px;
        }
        .section-pill{
          width: 10px; height: 24px;
          border-radius: 999px;
          background: linear-gradient(180deg,#38bdf8,#22c55e);
        }

        .btn-gradient{
          background: linear-gradient(90deg,#10b981,#3b82f6);
          color:#fff; border:none; border-radius: 10px;
          transition: transform .18s ease, box-shadow .22s ease, filter .18s ease;
        }
        .btn-gradient:disabled{ opacity:.7; cursor:not-allowed; filter: grayscale(.1); }
        .btn-gradient:hover:not(:disabled){
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0,0,0,.15);
        }

        .btn-soft{
          background: rgba(15,23,42,.04);
          border: 1px solid rgba(15,23,42,.06);
          color: #0b1221;
          border-radius: 999px;
        }

        .hover-card{
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          transition: box-shadow .18s ease, transform .18s ease;
        }
        .hover-card:hover{ box-shadow: 0 16px 32px rgba(2,6,23,.08); }

        .card-inner-gradient{
          position:absolute;
          inset:0;
          background: radial-gradient(120% 120% at -10% -10%, rgba(59,130,246,0.09), transparent),
                      radial-gradient(110% 110% at 110% -10%, rgba(16,185,129,0.08), transparent);
          opacity:0;
          transition: opacity .18s ease;
          pointer-events:none;
        }
        .hover-card:hover .card-inner-gradient{
          opacity:1;
        }

        .ring{ outline: 2px solid rgba(34,197,94,.4); outline-offset: 2px; }

        .big-check{
          width: 22px; height: 22px; accent-color:#10b981;
          cursor:pointer; margin-top: 6px; flex: 0 0 auto;
        }
        @media (max-width: 576px){
          .big-check{ margin-top: 2px; }
        }

        .meta-row{
          font-size: .9rem; color:#334155;
          display:flex; gap:.5rem; margin:.25rem 0; flex-wrap:wrap;
        }
        .meta-key{
          display:inline-flex; align-items:center; gap:.35rem;
          background: rgba(2,6,23,.04);
          border:1px solid rgba(2,6,23,.06);
          border-radius: 999px; padding: .1rem .5rem; font-size:.75rem; color:#0b1221;
        }
        .meta-val{ color:#475569; }

        .chip{
          display:inline-flex; align-items:center; gap:.25rem;
          padding:.2rem .55rem; border-radius:999px; font-size:.75rem;
          background: rgba(2,6,23,.05); color:#0b1221; border:1px solid rgba(2,6,23,.06);
          white-space: nowrap;
        }
        .chip.small{ font-size:.72rem; padding:.15rem .45rem; }
        .chip.neutral{ background: rgba(148,163,184,.12); color:#334155; }
        .chip.muted{ background: rgba(15,23,42,.04); color:#64748b; }

        .watched-pill{
          margin-top:.25rem;
          border-radius:999px;
        }

        .truncate-1{
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 100%;
        }

        /* Empty card */
        .empty-card{
          border: 1px dashed rgba(15,23,42,.12);
          border-radius: 16px;
          background: linear-gradient(180deg,#fff, #f8fafc);
          padding: 1.25rem;
          text-align:center;
        }
        .empty-emoji{ font-size: 1.75rem; }
        .empty-title{ font-weight: 800; color:#0b1221; }
        .empty-sub{ color:#6b7280; font-size:.9rem; }

        /* Skeletons (shimmer) */
        .skeleton-card{
          background: linear-gradient(180deg,#fff,#f9fafb);
          border-radius: 14px;
        }
        .skeleton-line{
          background: linear-gradient(90deg, rgba(226,232,240,.35), rgba(226,232,240,.85), rgba(226,232,240,.35));
          background-size: 300% 100%;
          animation: shimmer 1.2s infinite;
        }
        .shimmer{ color: transparent; position:relative; }
        .shimmer::after{
          content:""; display:block; height: 1em; border-radius:.4em;
          background: linear-gradient(90deg, rgba(226,232,240,.35), rgba(226,232,240,.85), rgba(226,232,240,.35));
          background-size: 300% 100%; animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer{
          0%{background-position:0% 0}
          100%{background-position: -300% 0}
        }

        /* Sticky bottom selection bar */
        .selection-bar{
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 6;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(6px) saturate(1.1);
          border-top: 1px solid rgba(15,23,42,.08);
          padding: .5rem 0;
        }
        .scroll-chips{
          display:flex; gap:.35rem; overflow:auto; max-width: 60vw; padding-bottom:.2rem;
        }
      `}</style>
    </div>
  );
};

export default Download;
