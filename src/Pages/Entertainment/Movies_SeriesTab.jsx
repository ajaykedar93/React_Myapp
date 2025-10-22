// src/pages/Entertainment/Movies_SeriesTab.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import Navbar from "./Navbar";

// Subpages
import AddMovies from "./AddMovies";
import AddSeries from "./AddSeries";
import Fevarate from "./Fevarate";  // Import Fevarate (Favorites) page
import Manage from "./Manage";
import Allcategories from "./Allcategories";
import Download from "./Download";
import AllList from "./AllList";

function TabButton({ id, active, onClick, onKeyDown, children, c1, c2 }) {
  return (
    <li className="nav-item" role="presentation">
      <button
        id={`tab-${id}`}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={`panel-${id}`}
        className={`nav-link pill px-3 py-2 rounded-pill fw-medium ${active ? "active" : ""}`}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={{
          whiteSpace: "nowrap",
          // color variables used by CSS for gradients / focus / hover / ripple
          ["--c1"]: c1,
          ["--c2"]: c2,
        }}
      >
        <span className="pill-ripple" aria-hidden="true" />
        <span className="d-flex align-items-center justify-content-center w-100 gap-2">
          <span className="me-1" aria-hidden="true">{children && children[0]}</span>
          <span className="tab-label text-truncate">{children && children[1] ? children[1] : children}</span>
        </span>
      </button>
    </li>
  );
}

export default function Movies_SeriesTab() {
  const [activeTab, setActiveTab] = useState("movies");
  const tablistRef = useRef(null);

  // Nice gradients per tab (editable)
  const tabs = useMemo(
    () => [
      {
        key: "movies",
        label: "Movies",
        icon: "🎬",
        component: <AddMovies />,
        c1: "#ff6b6b",
        c2: "#f06595",
      },
      {
        key: "series",
        label: "Series",
        icon: "📺",
        component: <AddSeries />,
        c1: "#51cf66",
        c2: "#0ca678",
      },
      {
        key: "manage",
        label: "Manage",
        icon: "⚙️",
        component: <Manage />,
        c1: "#339af0",
        c2: "#845ef7",
      },
      {
        key: "category",
        label: "Categories",
        icon: "🏷",
        component: <Allcategories />,
        c1: "#fcc419",
        c2: "#f08c00",
      },
      {
        key: "fevarate",
        label: "Favorites",
        icon: "❤️",
        component: <Fevarate />,
        c1: "#f06595",
        c2: "#d6336c",
      },
      {
        key: "download",
        label: "Download",
        icon: "⬇️",
        component: <Download />,
        c1: "#4dabf7",
        c2: "#15aabf",
      },
      {
        key: "all-list",
        label: "Movies & Series",
        icon: "🎞️",
        component: <AllList />,
        c1: "#ddce34",
        c2: "#fc3d80",
      },
    ],
    []
  );

  const active = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  // Keyboard navigation for the tab bar
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
      btn?.scrollIntoView({ inline: "nearest", behavior: "smooth", block: "nearest" });
    }
  };

  // Keep underline in sync on resize & scroll
  useEffect(() => {
    const onResize = () => {
      // trigger re-render for underline by toggling activeTab (no-op) - simpler: call a custom event
      const evt = new Event("__tab_resize");
      window.dispatchEvent(evt);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    // set a CSS variable for tab count so we can try equal widths where possible
    const listEl = tablistRef.current;
    if (listEl) {
      listEl.style.setProperty("--tab-count", tabs.length);
    }
  }, [tabs.length]);

  return (
    <>
      <Navbar />

      {/* Header */}
      <header
        className="border-bottom"
        style={{
          background: "linear-gradient(135deg, rgba(13,110,253,.06), rgba(111,66,193,.06))",
        }}
      >
        <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
              style={{
                width: 44,
                height: 44,
                background:
                  "radial-gradient(120px 120px at 30% 30%, rgba(13,110,253,.2), rgba(111,66,193,.15))",
              }}
              aria-hidden="true"
            >
              <span style={{ fontSize: 20 }} role="img" aria-label="clapper">
                🎞️
              </span>
            </div>
            <div>
              <h1 className="h5 mb-1 mb-md-0">Entertainment Hub</h1>
              <p className="text-muted mb-0 d-none d-md-block">
                Add & manage Movies/Series, and export your lists.
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
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
        </div>
      </header>

      {/* Body */}
      <div className="container my-4">
        {/* Tab bar */}
        <div className="position-sticky top-0 bg-white pt-2" style={{ zIndex: 1020 }}>
          <div className="position-relative">
            <ul
              ref={tablistRef}
              className="nav nav-pills"
              role="tablist"
              style={{ gap: ".45rem", overflowX: "auto", WebkitOverflowScrolling: "touch" }}
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
                    <span className="me-1" aria-hidden="true">{t.icon}</span>,
                    <span>{t.label}</span>,
                  ]}
                </TabButton>
              ))}
            </ul>
            <ActiveUnderline tabs={tabs} activeKey={activeTab} c1={active.c1} c2={active.c2} />
          </div>
        </div>

        {/* Active tab content */}
        <div className="tab-content mt-3">
          <div
            id={`panel-${active.key}`}
            role="tabpanel"
            aria-labelledby={`tab-${active.key}`}
            className="tab-pane fade show active"
          >
            <div className="card border-0 shadow-sm">
              <div className="card-body p-3 p-md-4">
                <h2 className="h5 mb-3">
                  {active.icon} {active.label}
                </h2>
                {active.component}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* Root: we expose tab count to allow equal-width behavior when possible */
        ul[role='tablist'] { --tab-count: 6; }

        /* Layout: make tabs equal width as much as possible, but keep a sensible min width and allow scroll on small screens */
        .nav-pills { display: flex; gap: .45rem; align-items: stretch; padding: .5rem; }
        .nav-pills .nav-item { flex: 1 1 0; min-width: 110px; max-width: 320px; }
        .nav-pills .nav-link.pill { display: block; width: 100%; text-align: center; padding-left: .75rem; padding-right: .75rem; box-sizing: border-box; }

        /* Truncate long labels so widths never change */
        .tab-label { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Fancy pill buttons (colorized via --c1 / --c2) */
        .nav-pills .nav-link.pill {
          position: relative;
          --bg1: color-mix(in srgb, var(--c1) 12%, #fff);
          --bg2: color-mix(in srgb, var(--c2) 12%, #fff);
          background: linear-gradient(135deg, var(--bg1), var(--bg2));
          border: 1px solid transparent;
          color: #2b2f32;
          transition: transform .12s ease, box-shadow .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
          overflow: hidden;
          isolation: isolate;
        }
        /* Hover uses a slightly darker tint pulled from the variables */
        .nav-pills .nav-link.pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px color-mix(in srgb, var(--c2) 24%, transparent);
          color: #111;
          background: linear-gradient(135deg, color-mix(in srgb, var(--c1) 28%, #000 6%), color-mix(in srgb, var(--c2) 28%, #000 6%));
        }
        /* Focus ring uses the tab's colors */
        .nav-pills .nav-link.pill:focus-visible {
          outline: none;
          box-shadow: 0 0 0 .22rem color-mix(in srgb, var(--c1) 35%, var(--c2) 35%, #0000 30%);
        }
        .nav-pills .nav-link.pill.active {
          color: #fff;
          background: linear-gradient(135deg, var(--c1), var(--c2));
          border-color: transparent;
          box-shadow: 0 10px 26px color-mix(in srgb, var(--c2) 32%, transparent);
          transform: translateY(-1px);
        }

        /* Soft ripple on interaction */
        .pill .pill-ripple {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: radial-gradient(120px 60px at var(--x,50%) var(--y,50%), color-mix(in srgb, var(--c1) 30%, transparent), transparent 60%);
          transition: opacity .35s ease;
        }
        .pill:active .pill-ripple { opacity: .55; transition: opacity .2s ease; }

        /* Active underline */
        .tab-underline {
          position: absolute;
          height: 4px;
          left: 0;
          bottom: 0;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--u1), var(--u2));
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1), opacity .15s ease, background .2s ease;
        }

        /* Small screens: don't squish labels — enable horizontal scrolling and fixed min-width */
        @media (max-width: 720px) {
          .nav-pills { padding: .35rem; }
          .nav-pills .nav-item { flex: 0 0 auto; min-width: 120px; }
        }

        /* Very large screens: allow a max width so pills don't become absurdly wide */
        @media (min-width: 1200px) {
          .nav-pills .nav-item { max-width: 260px; }
        }
      `}</style>

      {/* Pointer position for ripple */}
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

          // ensure underline updates when tabs scroll/resize
          window.addEventListener('__tab_resize', () => {
            const evt = new Event('resize');
            window.dispatchEvent(evt);
          });
        `,
        }}
      />
    </>
  );
}

/**
 * Active underline that tracks the active pill button and inherits its colors.
 */
function ActiveUnderline({ tabs, activeKey, c1, c2 }) {
  const containerRef = useRef(null);
  const [rect, setRect] = useState({ x: 0, w: 0, visible: false });

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const compute = () => {
      const btn = parent.querySelector(`#tab-${activeKey}`);
      const list = parent.querySelector("ul.nav");
      if (!btn || !list) return;
      const btnRect = btn.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      setRect({
        x: btnRect.left - listRect.left + list.scrollLeft,
        w: btnRect.width,
        visible: true,
      });
    };

    compute();

    // update on scroll & resize
    const list = parent.querySelector("ul.nav");
    window.addEventListener("resize", compute);
    list?.addEventListener("scroll", compute);
    window.addEventListener('__tab_resize', compute);

    return () => {
      window.removeEventListener("resize", compute);
      list?.removeEventListener("scroll", compute);
      window.removeEventListener('__tab_resize', compute);
    };
  }, [tabs, activeKey]);

  return (
    <div
      ref={containerRef}
      className="tab-underline"
      aria-hidden="true"
      style={{
        transform: `translateX(${rect.x}px)`,
        width: rect.w,
        opacity: rect.visible ? 1 : 0,
        ["--u1"]: c1,
        ["--u2"]: c2,
      }}
    />
  );
}
