// src/Pages/Entertainment/Manage.jsx
// Two-tab wrapper for MoviesManager & SeriesManager (Bootstrap-only, mobile-first)

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import MoviesManager from "./Manage_Movies";
import SeriesManager from "./Manage_Series";

export default function Manage() {
  const [tab, setTab] = useState("movies"); // 'movies' | 'series'
  const [switching, setSwitching] = useState(false);
  const tablistRef = useRef(null);

  // preview modal state (for "view" click in child components)
  const [preview, setPreview] = useState({
    show: false,
    type: "",
    title: "",
    year: "",
    poster: "",
    description: "",
    meta: null,
  });

  /* ========== tiny progress bar when switching ========== */
  useEffect(() => {
    setSwitching(true);
    const t = setTimeout(() => setSwitching(false), 420);
    return () => clearTimeout(t);
  }, [tab]);

  /* ========== keyboard left/right for tabs ========== */
  const onKeyDownTabs = useCallback(
    (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = tab === "movies" ? "series" : "movies";
        setTab(next);
        const nextId = next === "movies" ? "tab-movies" : "tab-series";
        document.getElementById(nextId)?.focus();
      }
    },
    [tab]
  );

  /* ========== underline positioning (React, no <script>) ========== */
  const [underline, setUnderline] = useState({ x: 0, w: 0, visible: false });
  useLayoutEffect(() => {
    const list = tablistRef.current;
    if (!list) return;
    const btn = list.querySelector(`#tab-${tab}`);
    if (!btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setUnderline({
      x: btnRect.left - listRect.left + list.scrollLeft,
      w: btnRect.width,
      visible: true,
    });
  }, [tab]);

  // sync underline gradient to active tab colors
  useEffect(() => {
    const list = tablistRef.current;
    if (!list) return;
    const underlineEl = list.querySelector(".tab-underline");
    if (!underlineEl) return;
    const active = list.querySelector(".tab-pill.tab-active");
    if (!active) return;
    const c1 = active.getAttribute("data-c1") || "#41c7a7";
    const c2 = active.getAttribute("data-c2") || "#8f55e6";
    underlineEl.style.background = `linear-gradient(90deg, ${c1}, ${c2})`;
  }, [tab, underline]);

  /* ========== ripple pointer ========== */
  useEffect(() => {
    const onPointer = (e) => {
      const pill = e.target.closest(".tab-pill");
      if (!pill) return;
      const r = pill.getBoundingClientRect();
      const rr = pill.querySelector(".pill-ripple");
      if (!rr) return;
      rr.style.setProperty("--x", `${e.clientX - r.left}px`);
      rr.style.setProperty("--y", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  /* ========== when child clicks VIEW ========== */
  const handlePreview = (item = {}, from = tab) => {
    setPreview({
      show: true,
      type: from,
      title: item.title || item.name || "Untitled",
      year: item.release_year || item.year || "",
      poster: item.poster_url || item.poster || "",
      description:
        item.description ||
        item.overview ||
        "No description available for this entry.",
      meta: item,
    });
  };
  const closePreview = () => setPreview((p) => ({ ...p, show: false }));

  return (
    <>
      {/* Header */}
      <header
        className="border-bottom"
        style={{
          background:
            "radial-gradient(circle at top, rgba(32,201,151,.08), rgba(111,66,193,.04) 45%, #fff 80%)",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-1">
                <li className="breadcrumb-item">
                  <span className="text-muted">Entertainment</span>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Manage
                </li>
              </ol>
            </nav>
            <h3
              className="mb-0"
              style={{
                fontWeight: 800,
                letterSpacing: "-0.02rem",
                fontSize: "clamp(1.25rem, 2.5vw, 1.55rem)",
              }}
            >
              🎛️ Manage Library
            </h3>
            <p
              className="text-muted mb-0"
              style={{ fontSize: "clamp(.7rem, 2.4vw, .82rem)" }}
            >
              Maintain movies and series — clean, sorted, mobile-first.
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <main className="container my-3 my-md-4">
        <div
          className="card border-0 shadow-sm mb-3"
          style={{ borderRadius: "1.25rem", overflow: "hidden" }}
        >
          {/* tiny progress bar */}
          {switching && <div className="progress-thin" aria-hidden="true" />}

          <div className="card-body pb-0">
            <div
              ref={tablistRef}
              className="d-flex flex-wrap gap-2 position-relative"
              role="tablist"
              aria-label="Movies and Series tabs"
              onKeyDown={onKeyDownTabs}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "movies"}
                aria-controls="tab-panel-movies"
                id="tab-movies"
                onClick={() => setTab("movies")}
                className={`btn tab-btn tab-pill ${
                  tab === "movies" ? "tab-active" : "tab-idle"
                }`}
                data-c1="#41c7a7"
                data-c2="#8f55e6"
              >
                <span className="pill-ripple" />
                🎬 Movies
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={tab === "series"}
                aria-controls="tab-panel-series"
                id="tab-series"
                onClick={() => setTab("series")}
                className={`btn tab-btn tab-pill ${
                  tab === "series" ? "tab-active" : "tab-idle"
                }`}
                data-c1="#8f55e6"
                data-c2="#41c7a7"
              >
                <span className="pill-ripple" />
                📚 Series
              </button>

              {/* Active underline */}
              <span
                className="tab-underline"
                style={{
                  transform: `translateX(${underline.x}px)`,
                  width: underline.w,
                  opacity: underline.visible ? 1 : 0,
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Panels */}
        <section
          id="tab-panel-movies"
          role="tabpanel"
          aria-labelledby="tab-movies"
          hidden={tab !== "movies"}
          className={`fade-panel ${tab === "movies" ? "show" : ""}`}
        >
          {/* pass preview handler » children will call onPreview(item) */}
          <MoviesManager onPreview={handlePreview} />
        </section>

        <section
          id="tab-panel-series"
          role="tabpanel"
          aria-labelledby="tab-series"
          hidden={tab !== "series"}
          className={`fade-panel ${tab === "series" ? "show" : ""}`}
        >
          <SeriesManager onPreview={handlePreview} />
        </section>
      </main>

      {/* Center Preview Modal */}
      {preview.show && (
        <div
          className="manage-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div
            className="manage-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h5 className="mb-0" style={{ fontWeight: 700 }}>
                  {preview.title}
                </h5>
                <small className="text-muted">
                  {preview.type === "movies" ? "Movie" : "Series"}
                  {preview.year ? ` • ${preview.year}` : ""}
                </small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={closePreview}
              >
                Close
              </button>
            </div>

            <div className="d-flex gap-3 flex-wrap">
              {preview.poster ? (
                <img
                  src={preview.poster}
                  alt={preview.title}
                  style={{
                    width: 120,
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 14,
                    boxShadow: "0 12px 26px rgba(0,0,0,.15)",
                  }}
                />
              ) : (
                <div className="poster-placeholder">
                  <span>{preview.title?.[0] || "?"}</span>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 200 }}>
                <p
                  className="mb-2"
                  style={{ fontSize: "clamp(.7rem, 2.3vw, .85rem)" }}
                >
                  {preview.description}
                </p>
                {preview.meta?.genres?.length ? (
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {preview.meta.genres.map((g) => (
                      <span key={g} className="badge bg-light text-dark">
                        {g}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-muted mb-0" style={{ fontSize: "0.7rem" }}>
                  *Quick view — open item in full page to edit or manage parts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local styles */}
      <style>{`
        :root{
          --ink-900:#0f172a;
          --ink-700:#334155;
          --ink-500:#64748b;
        }

        /* progress */
        .progress-thin{
          height:3px;
          background: linear-gradient(90deg, rgba(32,201,151,1), rgba(111,66,193,1));
          animation: slide 0.42s ease-out forwards;
          border-top-left-radius:.25rem;border-top-right-radius:.25rem;
        }
        @keyframes slide{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1)}}

        .tab-btn {
          border-radius: 999px;
          padding: .55rem 1.05rem;
          border-width: 1px;
          transition:
            transform .12s ease,
            box-shadow .18s ease,
            background .18s ease,
            color .18s ease,
            border-color .18s ease;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          font-size: clamp(.7rem, 2.3vw, .85rem);
        }
        .tab-pill.tab-idle{
          color:#343a40;
          border-color: rgba(0,0,0,.10);
          background: rgba(255,255,255,.7);
          backdrop-filter: blur(4px);
        }
        .tab-pill.tab-idle:hover{
          transform: translateY(-1px);
          box-shadow: 0 .6rem 1.2rem rgba(0,0,0,.07);
          border-color: rgba(32,201,151,.35);
          background: rgba(32,201,151,.04);
        }
        .tab-pill.tab-active{
          color:#fff;
          border-color: transparent;
          background: linear-gradient(135deg, rgba(32,201,151,.92), rgba(111,66,193,.82));
          box-shadow: 0 10px 26px rgba(111,66,193,.2);
          transform: translateY(-1px);
        }
        .tab-pill:focus-visible{
          outline: none;
          box-shadow: 0 0 0 .22rem rgba(111,66,193,.26);
        }

        /* ripple */
        .pill-ripple{
          position:absolute; inset:0; pointer-events:none; opacity:0;
          background: radial-gradient(140px 70px at var(--x,50%) var(--y,50%),
            rgba(255,255,255,.35), transparent 60%);
          transition: opacity .35s ease;
        }
        .tab-pill:active .pill-ripple{ opacity:.55; transition: opacity .2s ease; }

        /* underline */
        .tab-underline{
          position:absolute; left:0; bottom:-6px; height:4px; border-radius:999px;
          background: linear-gradient(90deg, rgba(32,201,151,1), rgba(111,66,193,1));
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1), opacity .15s ease;
        }

        /* panels */
        .fade-panel{opacity:0; transform: translateY(6px); transition: opacity .22s ease, transform .22s ease;}
        .fade-panel.show{opacity:1; transform: translateY(0);}

        .breadcrumb { --bs-breadcrumb-divider-color: rgba(0,0,0,.35); }

        /* modal */
        .manage-modal-backdrop{
          position:fixed; inset:0; background:rgba(15,23,42,.4);
          backdrop-filter:blur(3px);
          display:flex; align-items:center; justify-content:center;
          padding:1rem; z-index:9999;
        }
        .manage-modal{
          background:#fff;
          border-radius:1rem;
          width:min(560px, 100%);
          max-height:92vh;
          overflow-y:auto;
          box-shadow:0 20px 45px rgba(15,23,42,.22);
          padding:1rem 1.1rem 1.1rem;
        }
        .poster-placeholder{
          width:120px; height:160px;
          border-radius:14px;
          background:linear-gradient(140deg, rgba(32,201,151,.5), rgba(111,66,193,.4));
          display:flex; align-items:center; justify-content:center;
          color:#fff;
          font-size:2.2rem; font-weight:800;
        }

        /* mobile first */
        @media (max-width: 575.98px){
          .tab-btn{ flex:1 1 calc(50% - .45rem); justify-content:center; }
          .manage-modal{ width:100%; border-radius:.75rem; }
        }
      `}</style>
    </>
  );
}
