import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import LoadingSpiner from "./LoadingSpiner"; // adjust import path if needed

const API_BASE = "http://localhost:5000/api/library"; // your API endpoint
const PAGE_SIZE = 20;

const AllList = () => {
  const [activeTab, setActiveTab] = useState("movies"); // "movies" | "series"
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(""); // search state
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

  const styles = `
   :root {
  --bg: #f5f7fa;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e2e8f0;

  --accent: #2563eb;
  --accent-2: #7c3aed;
  --accent-3: #e7532b;

  --shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
  --shadow-2: 0 14px 34px rgba(15, 23, 42, 0.14);

  --pill-bg: #e0f2fe;
  --pill-text: #0369a1;

  --chip-bg: #f1f5f9;
  --chip-text: #334155;

  --danger: #ef4444;
  --ok: #059669;
}

.wrap {
  min-height: 100vh;
  background: var(--bg);
  padding: 28px;
  color: var(--text);
  font-family: "Inter", system-ui, sans-serif;
}

.screen {
  max-width: 1280px;
  margin: 0 auto;
}

/* --- Tabs --- */
.tabs {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid var(--border);
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  background: rgba(245, 247, 250, 0.9);
  backdrop-filter: blur(8px);
  z-index: 10;
  padding-top: 6px;
}

.tab {
  appearance: none;
  border: 0;
  background: #fff;
  color: #0f172a;
  border: 1px solid var(--border);
  border-bottom: 0;
  padding: 12px 18px;
  font-weight: 800;
  border-radius: 14px 14px 0 0;
  box-shadow: var(--shadow);
  transform: translateY(4px);
  transition: all 0.25s ease;
  font-size: 14px;
  letter-spacing: 0.3px;
}

.tab:hover {
  transform: translateY(2px);
  box-shadow: var(--shadow-2);
}

.tab.active {
  background: linear-gradient(180deg, #fff, var(--accent-3) 85%);
  color: #0f172a;
  border-color: #cbd5e1;
  transform: translateY(0);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.tab .tag {
  margin-left: 8px;
  font-size: 12px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 999px;
  padding: 2px 8px;
  font-weight: 700;
}

/* --- Summary Pills --- */
.summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 14px 0;
}

.pill {
  background: var(--pill-bg);
  color: var(--pill-text);
  border: 1px solid #bae6fd;
  border-radius: 9999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 6px rgba(3, 105, 161, 0.1);
}

/* --- Search Box --- */
.searchbox {
  margin: 14px 0;
  display: flex;
  gap: 10px;
}

.searchbox input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.searchbox input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  outline: none;
}

/* --- Grid Layout --- */
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(1, 1fr);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* --- Card --- */
.card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  background: var(--card);
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-2);
  border-color: var(--accent-2);
}
/* --- Poster --- */
.poster {
  width: 120px;
  height: 120px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: #f8fafc;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: contain;   /* ✅ Show full image, no zoom */
  object-position: center;
  background: #fff;      /* optional: add white bg behind transparent images */
  display: block;
}

.poster .ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-weight: 800;
  font-size: 12px;
  border-radius: 14px;
  background: repeating-linear-gradient(
    135deg,
    #f3f4f6,
    #f3f4f6 16px,
    #e5e7eb 16px,
    #e5e7eb 32px
  );
}


/* --- Card Body --- */
.body {
  min-width: 0;
}

.title {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 4px;
}

.title h3 {
  font-size: 16px;
  font-weight: 900;
  margin: 0;
  color: #111827;
  line-height: 1.3;
}

.seq {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 900;
  border-radius: 8px;
  padding: 3px 9px;
  font-size: 11px;
}

.sub {
  color: var(--muted);
  font-size: 13px;
}

.row {
  margin-top: 6px;
  color: #0f172a;
  font-size: 13px;
}

.label {
  color: var(--muted);
  font-weight: 700;
  margin-right: 6px;
}

.list-inline {
  display: inline;
  word-break: break-word;
}

/* --- Badges --- */
.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.badge {
  background: var(--chip-bg);
  color: var(--chip-text);
  border: 1px solid var(--border);
  border-radius: 9999px;
  padding: 5px 12px;
  font-weight: 700;
  font-size: 11px;
  transition: all 0.2s ease;
}

.badge.cat {
  border-color: currentColor;
  font-weight: 800;
}

.badge:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* --- Watched Labels --- */
.watched {
  margin-left: auto;
  font-weight: 900;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 9999px;
  border: 1px solid #bbf7d0;
  background: #ecfdf5;
  color: #065f46;
}

.notwatched {
  margin-left: auto;
  font-weight: 900;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 9999px;
  border: 1px solid #fecaca;
  background: #fff5f5;
  color: #b91c1c;
}

/* --- Pagination --- */
.pager {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: var(--shadow);
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 800;
  transition: all 0.25s ease;
  color: #fff;
  background: linear-gradient(90deg, var(--accent), #3b82f6);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
}

.btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.alt {
  background: linear-gradient(90deg, #64748b, #94a3b8);
}

.pageinfo {
  color: var(--muted);
  font-weight: 700;
  font-size: 14px;
}

.headerline {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

  `;

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
    fetchList(activeTab, page, search);
  }, [activeTab, page, search, fetchList]);

  const onTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    setSearch(""); // reset search when switching tab
  };

  const nextPage = () => {
    if (page < payload.total_pages) setPage((p) => p + 1);
  };
  const prevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const Cards = ({ items, type }) => (
    <div className="grid">
      {items.map((it) => {
        const hasPoster = Boolean(it.poster_url);
        const catColor = it.category?.color || "#334155";
        const watched = it.is_watched;
        const subtags = type === "movies" ? (it.parts || []) : (it.seasons || []);

        return (
          <div className="card" key={`${type}-${it.id}`}>
            <div className="poster">
              {hasPoster ? (
                <img src={it.poster_url} alt={`${it.title} poster`} />
              ) : (
                <div className="ph">NO POSTER</div>
              )}
            </div>
            <div className="body">
              <div className="headerline">
                <span className="seq">#{it.seq}</span>
                <div className="title">
                  <h3 title={it.title}>{it.title}</h3>
                </div>
                <span className={watched ? "watched" : "notwatched"}>
                  {watched ? "Watched" : "Not watched"}
                </span>
              </div>
              <div className="sub">{it.release_year ? `Year: ${it.release_year}` : "—"}</div>
              {!!subtags?.length && (
                <div className="row">
                  <span className="label">{type === "movies" ? "Parts:" : "Seasons:"}</span>
                  <span className="list-inline">{subtags.join(", ")}</span>
                </div>
              )}
              <div className="badges">
                {it.category?.name && (
                  <span
                    className="badge cat"
                    style={{ color: catColor, borderColor: catColor }}
                  >
                    {it.category.name}
                  </span>
                )}
                {it.subcategory?.name && <span className="badge">{it.subcategory.name}</span>}
              </div>
              {!!it.genres?.length && (
                <div className="badges">
                  {it.genres.map((g, idx) => (
                    <span key={idx} className="badge">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="wrap">
      <style>{styles}</style>
      <div className="screen">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "movies" ? "active" : ""}`}
            onClick={() => onTab("movies")}
          >
            Movies <span className="tag">Base</span>
          </button>
          <button
            className={`tab ${activeTab === "series" ? "active" : ""}`}
            onClick={() => onTab("series")}
          >
            Series <span className="tag">Base</span>
          </button>
        </div>

        {/* Search box */}
        <div className="searchbox">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        {/* Header summary */}
        <div className="summary">
          <span className="pill">Showing: {payload.items?.length || 0}</span>
          <span className="pill">Total: {payload.total || 0}</span>
          <span className="pill">
            Page: {payload.page} / {payload.total_pages}
          </span>
          <span className="pill">Type: {activeTab === "movies" ? "Movies" : "Series"}</span>
        </div>

        {/* Content */}
        {error ? (
          <div className="card" style={{ borderColor: "#fecaca" }}>
            <div className="body" style={{ color: "#7f1d1d", fontWeight: 900 }}>
              ⚠ {error}
            </div>
          </div>
        ) : loading ? (
          <div className="card">
            <div className="body" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LoadingSpiner /> <span>Loading {activeTab}…</span>
            </div>
          </div>
        ) : (
          <>
            <Cards items={payload.items || []} type={activeTab} />
            <div className="pager">
              <button className="btn alt" onClick={prevPage} disabled={page <= 1 || loading}>
                ← Previous
              </button>
              <div className="pageinfo">
                Page <strong>{page}</strong> of <strong>{payload.total_pages || 1}</strong>
              </div>
              <button
                className="btn"
                onClick={nextPage}
                disabled={page >= (payload.total_pages || 1) || loading}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AllList;
