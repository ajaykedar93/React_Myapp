// src/Pages/Entertainment/Manage.jsx
// Two-tab wrapper for MoviesManager & SeriesManager (Bootstrap-only, no JS libs)

import React, { useState, useCallback, useEffect, useRef } from "react";
import MoviesManager from "./MoviesManager";
import SeriesManager from "./SeriesManager";

export default function Manage() {
  const [tab, setTab] = useState("movies"); // 'movies' | 'series'
  const [switching, setSwitching] = useState(false);
  const tablistRef = useRef(null);

  // small top progress bar when switching tabs
  useEffect(() => {
    setSwitching(true);
    const t = setTimeout(() => setSwitching(false), 420);
    return () => clearTimeout(t);
  }, [tab]);

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

  // underline positioning
  const [underline, setUnderline] = useState({ x: 0, w: 0, visible: false });
  useEffect(() => {
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

  // ripple pointer for tabs
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

  return (
    <>
      {/* Header */}
      <header
        className="border-bottom"
        style={{
          background:
            "linear-gradient(135deg, rgba(32,201,151,.08), rgba(111,66,193,.08))",
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
            <h3 className="mb-0">🎛️ Manage Library</h3>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <main className="container my-3 my-md-4">
        <div className="card border-0 shadow-sm mb-3">
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

        {/* Panels (animated swap) */}
        <section
          id="tab-panel-movies"
          role="tabpanel"
          aria-labelledby="tab-movies"
          hidden={tab !== "movies"}
          className={`fade-panel ${tab === "movies" ? "show" : ""}`}
        >
          <MoviesManager />
        </section>

        <section
          id="tab-panel-series"
          role="tabpanel"
          aria-labelledby="tab-series"
          hidden={tab !== "series"}
          className={`fade-panel ${tab === "series" ? "show" : ""}`}
        >
          <SeriesManager />
        </section>
      </main>

      {/* Local styles (neutral/emerald/purple; no blue) */}
      <style>{`
        /* thin progress bar on tab switch */
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
        }
        .tab-pill.tab-idle{
          color:#343a40;
          border-color: rgba(0,0,0,.14);
          background: #fff;
        }
        .tab-pill.tab-idle:hover{
          transform: translateY(-1px);
          box-shadow: 0 .6rem 1.2rem rgba(0,0,0,.07);
          border-color: rgba(32,201,151,.55);
          background: rgba(32,201,151,.06);
        }
        .tab-pill.tab-active{
          color:#fff;
          border-color: transparent;
          background: linear-gradient(135deg, rgba(32,201,151,.92), rgba(111,66,193,.82));
          box-shadow: 0 10px 26px rgba(111,66,193,.22);
          transform: translateY(-1px);
        }
        .tab-pill:focus-visible{
          outline: none;
          box-shadow: 0 0 0 .22rem rgba(111,66,193,.3);
        }

        /* ripple */
        .pill-ripple{
          position:absolute; inset:0; pointer-events:none; opacity:0;
          background: radial-gradient(140px 70px at var(--x,50%) var(--y,50%),
            rgba(32,201,151,.25), transparent 60%);
          transition: opacity .35s ease;
        }
        .tab-pill:active .pill-ripple{ opacity:.6; transition: opacity .2s ease; }

        /* underline that picks gradient from active button */
        .tab-underline{
          position:absolute; left:0; bottom:-2px; height:4px; border-radius:8px;
          background: linear-gradient(90deg, rgba(32,201,151,1), rgba(111,66,193,1));
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1), opacity .15s ease;
        }

        /* content transition */
        .fade-panel{opacity:0; transform: translateY(6px); transition: opacity .22s ease, transform .22s ease;}
        .fade-panel.show{opacity:1; transform: translateY(0);}

        .breadcrumb { --bs-breadcrumb-divider-color: rgba(0,0,0,.35); }
      `}</style>

      {/* dynamic underline gradient syncing to active button colors */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function(){
            const list=document.querySelector('[role="tablist"]');
            if(!list) return;
            const underline=list.querySelector('.tab-underline');
            const apply=() => {
              const active=list.querySelector('.tab-pill.tab-active');
              if(!active || !underline) return;
              const c1=active.getAttribute('data-c1')||'#41c7a7';
              const c2=active.getAttribute('data-c2')||'#8f55e6';
              underline.style.background = 'linear-gradient(90deg,'+c1+','+c2+')';
            };
            const ro=new MutationObserver(apply);
            ro.observe(list,{attributes:true,subtree:true,attributeFilter:['class']});
            apply();
          })();
        `,
        }}
      />
    </>
  );
}
