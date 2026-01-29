// src/pages/Entertainment/Movies_SeriesTab.jsx
import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import Navbar from "./Navbar";

// Subpages
import AddMovies from "./AddMovies";
import AddSeries from "./AddSeries";
import Fevarate from "./Fevarate";
import Manage from "./Manage";
import Allcategories from "./Allcategories";
import Download from "./Download";
import AllList from "./AllList";

/** Expose total fixed top height as --fixed-top so nothing hides under the navbar */
function useFixedTopOffset() {
  useLayoutEffect(() => {
    const getFixedTop = () => {
      const all = Array.from(document.body.querySelectorAll("*"));
      let total = 0;
      for (const el of all) {
        const cs = window.getComputedStyle(el);
        if (cs.position === "fixed" && (cs.top === "0px" || cs.top === "0")) {
          const rect = el.getBoundingClientRect();
          if (rect.height > 0 && rect.top === 0) total += rect.height;
        }
      }
      document.documentElement.style.setProperty("--fixed-top", `${Math.round(total)}px`);
    };

    getFixedTop();
    const ro = new ResizeObserver(getFixedTop);
    ro.observe(document.documentElement);
    window.addEventListener("resize", getFixedTop);
    window.addEventListener("orientationchange", getFixedTop);
    if (document.fonts?.ready) document.fonts.ready.then(getFixedTop).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", getFixedTop);
      window.removeEventListener("orientationchange", getFixedTop);
    };
  }, []);
}

function TabButton({ id, active, onClick, onKeyDown, children, c1, c2 }) {
  return (
    <li className="nav-item" role="presentation">
      <button
        id={`tab-${id}`}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={`panel-${id}`}
        className={`nav-link pill rounded-pill fw-medium ${active ? "active" : ""}`}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={{ ["--c1"]: c1, ["--c2"]: c2 }}
      >
        <span className="pill-ripple" aria-hidden="true" />
        <span className="d-flex align-items-center justify-content-center w-100 gap-2 tab-content-wrap">
          <span className="me-1" aria-hidden="true">
            {children && children[0]}
          </span>
          <span className="tab-label text-truncate">{children && children[1] ? children[1] : children}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Underline INSIDE the UL.
 * ✅ Fix: don’t auto-scroll while user is manually scrolling/dragging.
 */
function ActiveUnderlineInsideUL({ activeKey, c1, c2, isUserScrollingRef }) {
  const ulRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, visible: false });

  useEffect(() => {
    const ul = ulRef.current?.parentElement;
    if (!ul) return;

    const compute = () => {
      const btn = ul.querySelector(`#tab-${activeKey}`);
      if (!btn) return;

      const left = btn.offsetLeft;
      const top = btn.offsetTop + btn.offsetHeight - 4;
      const width = btn.offsetWidth;
      setPos({ left, top, width, visible: true });

      // ✅ Only auto-center AFTER user finishes scrolling (not during drag)
      if (!isUserScrollingRef?.current) {
        btn.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      }
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(ul);

    window.addEventListener("resize", compute);
    window.addEventListener("__tab_resize", compute);
    const raf = requestAnimationFrame(compute);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("__tab_resize", compute);
      cancelAnimationFrame(raf);
    };
  }, [activeKey, isUserScrollingRef]);

  return (
    <div
      ref={ulRef}
      className="tab-underline"
      aria-hidden="true"
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.width,
        opacity: pos.visible ? 1 : 0,
        ["--u1"]: c1,
        ["--u2"]: c2,
      }}
    />
  );
}

export default function Movies_SeriesTab() {
  useFixedTopOffset();

  const [activeTab, setActiveTab] = useState("movies");
  const tablistRef = useRef(null);

  // ✅ track manual scroll/drag state (stops auto-centering)
  const isUserScrollingRef = useRef(false);
  const scrollEndTimerRef = useRef(null);

  const tabs = useMemo(
    () => [
      { key: "movies", label: "Movies", icon: "🎬", component: <AddMovies />, c1: "#ff6b6b", c2: "#f06595" },
      { key: "series", label: "Series", icon: "📺", component: <AddSeries />, c1: "#51cf66", c2: "#0ca678" },
      { key: "manage", label: "Manage", icon: "⚙️", component: <Manage />, c1: "#339af0", c2: "#845ef7" },
      { key: "category", label: "Categories", icon: "🏷", component: <Allcategories />, c1: "#fcc419", c2: "#f08c00" },
      { key: "fevarate", label: "Favorites", icon: "❤️", component: <Fevarate />, c1: "#f06595", c2: "#d6336c" },
      { key: "download", label: "Download", icon: "⬇️", component: <Download />, c1: "#4dabf7", c2: "#15aabf" },
      { key: "all-list", label: "Movies & Series", icon: "🎞️", component: <AllList />, c1: "#ddce34", c2: "#fc3d80" },
    ],
    []
  );

  const active = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  const handleKeyNav = (idx) => (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const last = tabs.length - 1;
    let nextIndex = idx;

    if (e.key === "ArrowLeft") nextIndex = idx === 0 ? last : idx - 1;
    if (e.key === "ArrowRight") nextIndex = idx === last ? 0 : idx + 1;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = last;

    setActiveTab(tabs[nextIndex].key);

    const listEl = tablistRef.current;
    if (listEl) {
      const btn = listEl.querySelectorAll("button[role='tab']")[nextIndex];
      btn?.focus();
      btn?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  };

  useEffect(() => {
    const onResize = () => window.dispatchEvent(new Event("__tab_resize"));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ Free scroll: mark user-scrolling while they scroll/drag
  useEffect(() => {
    const el = tablistRef.current;
    if (!el) return;

    const markScrolling = () => {
      isUserScrollingRef.current = true;
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 180);
    };

    el.addEventListener("scroll", markScrolling, { passive: true });
    el.addEventListener("pointerdown", markScrolling, { passive: true });
    el.addEventListener("touchstart", markScrolling, { passive: true });

    return () => {
      el.removeEventListener("scroll", markScrolling);
      el.removeEventListener("pointerdown", markScrolling);
      el.removeEventListener("touchstart", markScrolling);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  // ✅ Mouse wheel vertical -> horizontal (kept)
  useEffect(() => {
    const el = tablistRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <>
      <Navbar />

      {/* Header */}
      <header
        className="border-bottom"
        style={{
          background: "linear-gradient(135deg, rgba(13,110,253,.06), rgba(111,66,193,.06))",
          paddingTop: "clamp(0px, var(--fixed-top, 0px), 120px)",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
              style={{
                width: 44,
                height: 44,
                background: "radial-gradient(120px 120px at 30% 30%, rgba(13,110,253,.2), rgba(111,66,193,.15))",
              }}
              aria-hidden="true"
            >
              <span style={{ fontSize: 20 }} role="img" aria-label="clapper">
                🎞️
              </span>
            </div>
            <div>
              <h1 className="h5 mb-1 mb-md-0">Entertainment Hub</h1>
              <p className="text-muted mb-0 d-none d-md-block">Add & manage Movies/Series, and export your lists.</p>
            </div>
          </div>

          <span
            className="badge rounded-pill px-3 py-2"
            style={{
              background: `linear-gradient(135deg, ${active.c1}, ${active.c2})`,
              color: "#fff",
              boxShadow: "0 8px 20px rgba(0,0,0,.15)",
            }}
          >
            {active.icon} {active.label}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="ent-page">
        {/* Sticky tab bar */}
        <div
          className="position-sticky bg-white pt-2 tabbar-sticky"
          style={{ zIndex: 1020, top: "var(--fixed-top, 0px)", boxShadow: "0 8px 18px rgba(2,6,23,.06)" }}
        >
          <div className="position-relative ent-shell">
            <ul
              ref={tablistRef}
              className="nav nav-pills eh-tabs"
              role="tablist"
              aria-label="Entertainment tabs"
            >
              {tabs.map((t, i) => (
                <TabButton
                  key={t.key}
                  id={t.key}
                  active={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                  onKeyDown={handleKeyNav(i)}
                  c1={t.c1}
                  c2={t.c2}
                >
                  {[
                    <span className="me-1" aria-hidden="true" key="i">
                      {t.icon}
                    </span>,
                    <span key="l">{t.label}</span>,
                  ]}
                </TabButton>
              ))}

              <ActiveUnderlineInsideUL
                activeKey={activeTab}
                c1={active.c1}
                c2={active.c2}
                isUserScrollingRef={isUserScrollingRef}
              />
            </ul>
          </div>
        </div>

        {/* Active tab content */}
        <div className="tab-content ent-shell ent-scope">
          <div id={`panel-${active.key}`} role="tabpanel" aria-labelledby={`tab-${active.key}`} className="tab-pane fade show active">
            <div className="card border-0 shadow-sm ent-card">
              <div className="card-body">
                <h2 className="h5 mb-3">
                  {active.icon} {active.label}
                </h2>
                {active.component}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        :root{
          --tab-min: 130px;
          --tab-max: 260px;
          --tap: 44px;
        }

        .ent-page{ width:100%; margin:0; padding:0; }
        .ent-shell{
          width:100%;
          margin:0;
          padding:0;
          max-width:980px;
          margin-inline:auto;
        }

        @media (max-width: 768px){
          .ent-shell{ max-width: 100%; }
          :root{ --tab-min: 110px; --tab-max: 340px; }
        }

        .tab-content.ent-shell{ margin-top:0 !important; padding:0 !important; }

        .ent-card{ border-radius:0; }
        @media (min-width: 992px){
          .ent-card{ border-radius:16px; margin-top:12px; margin-bottom:12px; }
        }
        .ent-card > .card-body{ padding:0 !important; }

        /* ✅ KEY FIX: remove scroll-snap forcing “one-by-one” scrolling */
        .eh-tabs{
          display:flex;
          align-items:stretch;
          gap:.5rem;
          padding:.5rem;

          flex-wrap: nowrap;
          overflow-x: auto;
          overflow-y: hidden;

          /* ❌ removed snap to stop step-by-step */
          scroll-snap-type: none;

          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;

          scrollbar-width: thin;
          scroll-behavior: smooth;

          mask-image: none;

          position: relative;
          scrollbar-gutter: stable both-edges;
        }

        .eh-tabs::-webkit-scrollbar{ height: 8px; }
        .eh-tabs::-webkit-scrollbar-thumb{ border-radius: 999px; background: rgba(15,23,42,.18); }
        .eh-tabs::-webkit-scrollbar-track{ background: transparent; }

        .eh-tabs .nav-item{
          flex: 0 0 auto;
          min-width: var(--tab-min);
          max-width: var(--tab-max);
          /* ❌ removed snap align */
        }

        .nav-pills .nav-link.pill{
          position: relative;
          --bg1: color-mix(in oklab, var(--c1) 12%, #fff);
          --bg2: color-mix(in oklab, var(--c2) 12%, #fff);
          background: linear-gradient(135deg, var(--bg1), var(--bg2));
          border: 1px solid #e8edf2;
          color: #2b2f32;
          transition: transform .12s ease, box-shadow .18s ease, background .18s ease, color .18s ease, border-color .18s ease, filter .18s ease;
          overflow: hidden;
          isolation: isolate;
          min-height: var(--tap);
          font-size: clamp(12px, 2.8vw, 15px);
          padding: clamp(7px, 1.8vw, 10px) clamp(12px, 3vw, 16px);
          line-height: 1.2;
          white-space: nowrap;
          user-select: none;
        }

        @media (min-width: 992px){
          .nav-pills .nav-link.pill{
            font-size: 15px;
            padding: 10px 16px;
          }
        }

        .tab-label{ display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        .nav-pills .nav-link.pill:hover{
          transform: translateY(-1px);
          box-shadow: 0 10px 22px color-mix(in oklab, var(--c2) 22%, transparent);
          color:#111;
          background: linear-gradient(135deg,
            color-mix(in oklab, var(--c1) 26%, #fff 0%),
            color-mix(in oklab, var(--c2) 26%, #fff 0%)
          );
          border-color: color-mix(in oklab, var(--c2) 32%, #e8edf2);
        }

        .nav-pills .nav-link.pill:focus-visible{
          outline:none;
          box-shadow: 0 0 0 .22rem color-mix(in oklab, var(--c1) 35%, var(--c2) 35%, #0000 30%);
        }

        .nav-pills .nav-link.pill.active{
          color:#fff;
          background: linear-gradient(135deg, var(--c1), var(--c2));
          border-color: transparent;
          box-shadow: 0 10px 26px color-mix(in oklab, var(--c2) 28%, transparent), 0 0 0 1px color-mix(in oklab, #fff 20%, #0000 80%) inset;
          transform: translateY(-1px);
          filter: saturate(1.02);
        }

        .pill .pill-ripple{
          position:absolute; inset:0;
          pointer-events:none;
          opacity:0;
          background: radial-gradient(140px 60px at var(--x,50%) var(--y,50%),
            color-mix(in oklab, var(--c1) 32%, transparent),
            transparent 60%);
          transition: opacity .35s ease;
        }
        .pill:active .pill-ripple{ opacity:.55; transition: opacity .2s ease; }

        .tab-underline{
          position:absolute;
          height:4px;
          border-radius:8px;
          background: linear-gradient(90deg, var(--u1), var(--u2));
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
          pointer-events:none;
          transition: transform .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1), opacity .15s ease,
                      background .2s ease, top .28s cubic-bezier(.2,.8,.2,1), left .28s cubic-bezier(.2,.8,.2,1);
        }

        .tabbar-sticky{ border-bottom:1px solid #eef2f6; }

        .ent-scope{ font-size:1rem; line-height:1.5; }
        .ent-scope :where(p, li, span, small, strong, em){ font-size:1rem; }

        @media (max-width: 720px){
          .eh-tabs{ padding:.35rem .4rem; gap:.4rem; }
        }

        @media (prefers-reduced-motion: reduce){
          .eh-tabs{ scroll-behavior: auto; }
          .nav-pills .nav-link.pill{ transition:none !important; }
        }
      `}</style>

      {/* Ripple */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('pointerdown', (e) => {
              const pill = e.target.closest('.nav-link.pill');
              if (!pill) return;
              const r = pill.getBoundingClientRect();
              const rr = pill.querySelector('.pill-ripple');
              if (!rr) return;
              rr.style.setProperty('--x', (e.clientX - r.left) + 'px');
              rr.style.setProperty('--y', (e.clientY - r.top) + 'px');
            });
          `,
        }}
      />
    </>
  );
}
