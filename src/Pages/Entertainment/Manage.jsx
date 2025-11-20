// src/Pages/Entertainment/Manage.jsx
// Two-tab wrapper for MoviesManager & SeriesManager (lazy-loaded, mobile-first, colorful)

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
  Suspense,
} from "react";

// 🌟 Lazy load for fast initial paint
const MoviesManager = React.lazy(() => import("./Manage_Movies"));
const SeriesManager = React.lazy(() => import("./Manage_Series"));

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
    const t = setTimeout(() => setSwitching(false), 360);
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

  /* ========== underline positioning (GPU-friendly) ========== */
  const [underline, setUnderline] = useState({ x: 0, w: 0, visible: false });
  useLayoutEffect(() => {
    const list = tablistRef.current;
    if (!list) return;
    const btn = list.querySelector(`#tab-${tab}`);
    if (!btn) return;
    const update = () => {
      const listRect = list.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setUnderline({
        x: btnRect.left - listRect.left + list.scrollLeft,
        w: btnRect.width,
        visible: true,
      });
    };
    // rAF to avoid layout thrash on mount/resize
    const raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
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

  /* ========== ripple pointer (cheap visual) ========== */
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

  /* ========== prefetch the other tab on hover/focus (snappy switch) ========== */
  const prefetch = (which) => {
    if (which === "movies") import("./Manage_Movies");
    if (which === "series") import("./Manage_Series");
  };

  /* ========== when child clicks VIEW ========== */
  const handlePreview = (item = {}, from = tab) => {
    setPreview({
      show: true,
      type: from,
      title: item.title || item.movie_name || item.name || "Untitled",
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
        className="border-bottom fancy-header"
        style={{
          background:
            "radial-gradient(1200px 300px at 20% -10%, rgba(99,102,241,.18), transparent), radial-gradient(1200px 300px at 80% -10%, rgba(16,185,129,.18), transparent), linear-gradient(180deg, #ffffff, #fbfbff)",
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
              style={{ fontSize: "clamp(.7rem, 2.4vw, .86rem)" }}
            >
              Maintain movies and series — clean, colorful, mobile-first.
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <main className="container my-3 my-md-4">
        <div
          className="card border-0 shadow-sm mb-3 glass-card"
          style={{ borderRadius: "1.25rem", overflow: "hidden" }}
        >
          {/* tiny progress bar on tab switch */}
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
                onMouseEnter={() => prefetch("movies")}
                onFocus={() => prefetch("movies")}
                className={`btn tab-btn tab-pill ${
                  tab === "movies" ? "tab-active" : "tab-idle"
                }`}
                data-c1="#22c55e"
                data-c2="#6366f1"
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
                onMouseEnter={() => prefetch("series")}
                onFocus={() => prefetch("series")}
                className={`btn tab-btn tab-pill ${
                  tab === "series" ? "tab-active" : "tab-idle"
                }`}
                data-c1="#6366f1"
                data-c2="#22c55e"
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
          <Suspense fallback={<CenterSkeleton label="Loading movies…" />}>
            <MoviesManager onPreview={handlePreview} />
          </Suspense>
        </section>

        <section
          id="tab-panel-series"
          role="tabpanel"
          aria-labelledby="tab-series"
          hidden={tab !== "series"}
          className={`fade-panel ${tab === "series" ? "show" : ""}`}
        >
          <Suspense fallback={<CenterSkeleton label="Loading series…" />}>
            <SeriesManager onPreview={handlePreview} />
          </Suspense>
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
          <div className="manage-modal" onClick={(e) => e.stopPropagation()}>
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
                  style={{ fontSize: "clamp(.7rem, 2.3vw, .9rem)" }}
                >
                  {preview.description}
                </p>
                {preview.meta?.genres?.length ? (
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {preview.meta.genres.map((g) => (
                      <span
                        key={g.name || g}
                        className="badge bg-light text-dark"
                      >
                        {g.name || g}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-muted mb-0" style={{ fontSize: "0.7rem" }}>
                  *Quick view — open item to edit poster, parts, or status.
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

        /* header glow for colorfulness */
        .fancy-header{
          position:relative;
        }
        .fancy-header::after{
          content:"";
          position:absolute; inset:0;
          pointer-events:none;
          background:
            radial-gradient(400px 140px at 12% 10%, rgba(99,102,241,.14), transparent 60%),
            radial-gradient(420px 150px at 88% 10%, rgba(16,185,129,.14), transparent 60%);
          mix-blend-mode: screen;
        }

        /* subtle glass card */
        .glass-card{
          background: rgba(255,255,255,.72);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(15,23,42,.06);
        }

        /* tiny top progress */
        .progress-thin{
          height:3px;
          background: linear-gradient(90deg, #22c55e, #6366f1);
          animation: slide 0.36s ease-out forwards;
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
          font-size: clamp(.72rem, 2.3vw, .9rem);
          will-change: transform;
        }
        .tab-pill.tab-idle{
          color:#0f172a;
          border-color: rgba(15,23,42,.10);
          background: rgba(255,255,255,.8);
          backdrop-filter: blur(6px);
        }
        .tab-pill.tab-idle:hover{
          transform: translateY(-1px);
          box-shadow: 0 .6rem 1.2rem rgba(0,0,0,.07);
          border-color: rgba(99,102,241,.35);
          background: linear-gradient(135deg, rgba(99,102,241,.06), rgba(34,197,94,.06));
        }
        .tab-pill.tab-active{
          color:#fff;
          border-color: transparent;
          background: linear-gradient(135deg, #22c55e, #6366f1);
          box-shadow: 0 10px 26px rgba(99,102,241,.22);
          transform: translateY(-1px);
        }
        .tab-pill:focus-visible{
          outline: none;
          box-shadow: 0 0 0 .22rem rgba(99,102,241,.26);
        }

        /* ripple */
        .pill-ripple{
          position:absolute; inset:0; pointer-events:none; opacity:0;
          background: radial-gradient(200px 120px at var(--x,50%) var(--y,50%),
            rgba(255,255,255,.35), transparent 60%);
          transition: opacity .35s ease;
        }
        .tab-pill:active .pill-ripple{ opacity:.55; transition: opacity .2s ease; }

        /* underline */
        .tab-underline{
          position:absolute; left:0; bottom:-6px; height:4px; border-radius:999px;
          background: linear-gradient(90deg, #22c55e, #6366f1);
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1), opacity .15s ease;
          will-change: transform, width;
        }

        /* panels */
        .fade-panel{opacity:0; transform: translateY(6px); transition: opacity .22s ease, transform .22s ease;}
        .fade-panel.show{opacity:1; transform: translateY(0);}

        .breadcrumb { --bs-breadcrumb-divider-color: rgba(0,0,0,.35); }

        /* modal */
        .manage-modal-backdrop{
          position:fixed; inset:0; background:rgba(15,23,42,.45);
          backdrop-filter:blur(4px);
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
          border:1px solid rgba(15,23,42,.06);
        }
        .poster-placeholder{
          width:120px; height:160px;
          border-radius:14px;
          background:linear-gradient(140deg, rgba(99,102,241,.5), rgba(34,197,94,.5));
          display:flex; align-items:center; justify-content:center;
          color:#fff;
          font-size:2.2rem; font-weight:800;
        }

        /* centered / mobile-top skeleton loader with % bar */
        .center-skel-wrap{
          position: relative;
          display:flex;
          align-items:center;
          justify-content:center;
          min-height: 60vh;
        }
        .center-skel{
          width:min(420px, 92vw);
          background:#fff;
          border-radius:1rem;
          padding:1rem 1.25rem 1.1rem;
          box-shadow:0 18px 40px rgba(15,23,42,.12);
          border:1px solid rgba(15,23,42,.06);
        }
        .center-progress-shell{
          position:relative;
          width:100%;
          height:10px;
          border-radius:999px;
          background:#eef2f7;
          overflow:hidden;
          margin:.35rem 0 .4rem;
        }
        .center-progress-fill{
          height:100%;
          width:0;
          border-radius:inherit;
          background: linear-gradient(90deg, #22c55e, #6366f1);
          transition: width .25s ease-out;
        }

        /* mobile first */
        @media (max-width: 575.98px){
          .tab-btn{ flex:1 1 calc(50% - .45rem); justify-content:center; }
          .manage-modal{ width:100%; border-radius:.9rem; }
          /* move loader up on mobile (not touching very top) */
          .center-skel-wrap{
            align-items:flex-start;
            padding-top:3.5rem;
            min-height: 60vh;
          }
        }

        /* respect reduced motion */
        @media (prefers-reduced-motion: reduce){
          *{ animation: none !important; transition: none !important; }
        }
      `}</style>
    </>
  );
}

/* Centered skeleton used while lazy tabs load, with % progress bar.
   Desktop: centered on screen.
   Mobile: same bar but near the top (not touching the top). */
function CenterSkeleton({ label = "Loading…" }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setProgress((prev) => {
        // Fast at start, slower later, cap at 95%
        if (prev >= 95) return prev;
        if (prev < 60) return prev + 10;
        if (prev < 85) return prev + 4;
        return prev + 1;
      });
    }, 260);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="center-skel-wrap" role="status" aria-live="polite">
      <div className="center-skel">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{label}</div>
          <div style={{ fontWeight: 700, fontSize: ".8rem", color: "#4b5563" }}>
            {Math.round(progress)}%
          </div>
        </div>

        <div className="center-progress-shell">
          <div
            className="center-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <small className="text-muted" style={{ fontSize: ".7rem" }}>
          Preparing your data…
        </small>
      </div>
    </div>
  );
}
