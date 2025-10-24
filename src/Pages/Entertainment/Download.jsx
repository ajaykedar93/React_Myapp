// src/pages/Download.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import LoadingSpiner from "./LoadingSpiner";
import { motion } from "framer-motion";

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

  // Selected items
  const [selectedItems, setSelectedItems] = useState([]);

  // Categories
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

  // Data
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

  // Pagination – EXACTLY 10 per page
  const slicePage = (arr, page) => {
    const start = (page - 1) * itemsPerPage;
    return arr.slice(start, start + itemsPerPage);
  };
  const totalMoviePages = Math.max(1, Math.ceil(movies.length / itemsPerPage));
  const totalSeriesPages = Math.max(1, Math.ceil(series.length / itemsPerPage));
  const paginatedMovies = slicePage(movies, moviePage);
  const paginatedSeries = slicePage(series, seriesPage);

  // Selections
  const toggleSelect = (item, type) => {
    const id = item.movie_id || item.series_id;
    const key = `${type}-${id}`;
    setSelectedItems((prev) =>
      prev.some((s) => s.key === key)
        ? prev.filter((s) => s.key !== key)
        : [...prev, { key, ...item, type }]
    );
  };
  const isSelectedKey = (key) => selectedItems.some((s) => s.key === key);
  const getSelectionNumber = (key) => {
    const idx = selectedItems.findIndex((s) => s.key === key);
    return idx >= 0 ? idx + 1 : null;
  };

  // Export
  const handleExport = async () => {
    try {
      const payload = { items: selectedItems, type: exportType };
      const res = await axios.post(`${API_BASE}/download/export`, payload, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      const ext =
        exportType === "excel" ? "xlsx" :
        exportType === "csv" ? "csv" :
        exportType === "txt" ? "txt" : "pdf";
      link.href = url;
      link.setAttribute("download", `selected_movies_series.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting:", err);
    }
  };

  return (
    <div className="dl-root">
      <div className="container py-5">
        {/* Title */}
        <motion.h2
          className="text-center mb-4 fw-bold gradient-text"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          🎬 Movies & Series Download
        </motion.h2>

        {/* Filters */}
        <div className="row mb-4 g-2 justify-content-center">
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

          <div className="col-12 col-md-2">
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

          <div className="col-12 col-md-3">
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
              title={selectedItems.length ? "Export selected" : "Select at least one item"}
            >
              ⬇ Download ({selectedItems.length})
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="d-flex justify-content-center my-5">
            <LoadingSpiner />
          </div>
        )}

        {!loading && (
          <div className="row g-4">
            {/* Movies */}
            <div className="col-12 col-lg-6">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="section-title">🎥 Movies</h3>
                <span className="badge bg-dark-subtle text-dark">{movies.length} total</span>
              </div>

              {paginatedMovies.length === 0 ? (
                <p className="text-muted">No movies found.</p>
              ) : (
                paginatedMovies.map((m) => {
                  const key = `movie-${m.movie_id}`;
                  const selected = isSelectedKey(key);
                  const number = getSelectionNumber(key);

                  return (
                    <motion.div
                      key={key}
                      className="card shadow-sm hover-card mb-3 border-0"
                      whileHover={{ y: -2 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      style={{
                        background: "linear-gradient(180deg, #ffffff, #f9fbff)",
                        borderRadius: 14,
                      }}
                    >
                      <div className="card-body d-flex align-items-start gap-3">
                        <input
                          type="checkbox"
                          className="big-check"
                          checked={selected}
                          onChange={() => toggleSelect(m, "movie")}
                          aria-label={`Select ${m.movie_name}`}
                        />
                        <div className="w-100">
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            {number && (
                              <span className="badge rounded-pill bg-primary">{number}</span>
                            )}
                            <h5 className="card-title fw-bold mb-0">{m.movie_name}</h5>
                            <span className="small text-secondary">({m.release_year})</span>
                          </div>
                          <div className="small text-secondary mb-1">
                            <span className="fw-semibold">Parts: </span>
                            {m.parts?.length > 0 ? m.parts.join(", ") : "Part 1"}
                          </div>
                          <div className="small mb-2">
                            <span className="fw-semibold">Category: </span>
                            <span style={{ color: m.category_color }}>{m.category_name}</span>
                          </div>
                          <span
                            className={`badge ${m.is_watched ? "bg-success" : "bg-warning text-dark"}`}
                          >
                            {m.is_watched ? "Watched" : "Not Watched"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              <PrevNext
                page={moviePage}
                totalPages={totalMoviePages}
                onPage={setMoviePage}
              />
            </div>

            {/* Series */}
            <div className="col-12 col-lg-6">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="section-title">📺 Series</h3>
                <span className="badge bg-dark-subtle text-dark">{series.length} total</span>
              </div>

              {paginatedSeries.length === 0 ? (
                <p className="text-muted">No series found.</p>
              ) : (
                paginatedSeries.map((s) => {
                  const key = `series-${s.series_id}`;
                  const selected = isSelectedKey(key);
                  const number = getSelectionNumber(key);

                  return (
                    <motion.div
                      key={key}
                      className="card shadow-sm hover-card mb-3 border-0"
                      whileHover={{ y: -2 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      style={{
                        background: "linear-gradient(180deg, #ffffff, #f9fffb)",
                        borderRadius: 14,
                      }}
                    >
                      <div className="card-body d-flex align-items-start gap-3">
                        <input
                          type="checkbox"
                          className="big-check"
                          checked={selected}
                          onChange={() => toggleSelect(s, "series")}
                          aria-label={`Select ${s.series_name}`}
                        />
                        <div className="w-100">
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            {number && (
                              <span className="badge rounded-pill bg-primary">{number}</span>
                            )}
                            <h5 className="card-title fw-bold mb-0">{s.series_name}</h5>
                            <span className="small text-secondary">({s.release_year})</span>
                          </div>
                          <div className="small text-secondary mb-1">
                            <span className="fw-semibold">Seasons: </span>
                            {s.seasons?.length > 0 ? s.seasons.join(", ") : "Season 1"}
                          </div>
                          <div className="small mb-2">
                            <span className="fw-semibold">Category: </span>
                            <span style={{ color: s.category_color }}>{s.category_name}</span>
                          </div>
                          <span
                            className={`badge ${s.is_watched ? "bg-success" : "bg-warning text-dark"}`}
                          >
                            {s.is_watched ? "Watched" : "Not Watched"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              <PrevNext
                page={seriesPage}
                totalPages={totalSeriesPages}
                onPage={setSeriesPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .dl-root {
          background:
            radial-gradient(1200px 600px at -10% 0%, rgba(56,189,248,0.18), transparent 60%),
            radial-gradient(1100px 550px at 110% -10%, rgba(132,204,22,0.16), transparent 60%),
            linear-gradient(180deg, #eef6ff 0%, #f7fbff 45%, #f7fff7 100%);
          min-height: 100vh; width: 100%;
        }
        .gradient-text {
          background: linear-gradient(90deg, #0ea5e9, #22c55e, #8b5cf6);
          -webkit-background-clip: text; background-clip: text;
          color: transparent; letter-spacing: .2px;
        }
        .section-title { color: #0b1221; font-weight: 800; letter-spacing: .2px; margin: 0; }
        .hover-card { transition: box-shadow .2s ease, transform .2s ease; }
        .hover-card:hover { box-shadow: 0 16px 32px rgba(2,6,23,0.08); }
        .btn-gradient {
          background: linear-gradient(90deg, #10b981, #3b82f6); color: #fff;
          transition: transform 0.2s ease, box-shadow 0.25s ease;
          border: none; border-radius: 10px;
        }
        .btn-gradient:disabled { opacity: .7; cursor: not-allowed; }
        .btn-gradient:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(0,0,0,0.15); }
        .big-check { width: 22px; height: 22px; accent-color: #10b981; cursor: pointer; margin-top: 6px; flex: 0 0 auto; }
        @media (max-width: 576px) { .big-check { margin-top: 2px; } }
      `}</style>
    </div>
  );
};

export default Download;
