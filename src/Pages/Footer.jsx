// src/components/Footer.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaDollarSign, FaGithub, FaWhatsapp, FaHeart, FaArrowUp, FaTimes } from "react-icons/fa";

const PANEL_ID = "footer-collapsible-panel";

const Footer = () => {
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);          // collapsible (mobile)
  const [sheetOpen, setSheetOpen] = useState(false); // full-screen popup (mobile)
  const contentRef = useRef(null);
  const closeBtnRef = useRef(null);

  const scrollToTop = () => {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch { window.scrollTo(0, 0); }
  };

  // Ensure panel is fully visible when opened (mobile collapsible)
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const t = setTimeout(() => {
      const y = contentRef.current.getBoundingClientRect().top + window.scrollY - 12;
      try { window.scrollTo({ top: y, behavior: "smooth" }); }
      catch { window.scrollTo(0, y); }
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  // ===== Full-screen sheet focus & keyboard handling (mobile) =====
  useEffect(() => {
    if (!sheetOpen) return;
    // focus the close button when sheet opens
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKey = (e) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  // Prevent background scroll when sheet is open
  useEffect(() => {
    if (!sheetOpen) return;
    const { overflow, touchAction } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = overflow || "";
      document.body.style.touchAction = touchAction || "";
    };
  }, [sheetOpen]);

  // footer inner content extracted to reuse in both places
  const FooterInner = () => (
    <div className="pro-footer__inner">
      <div className="pro-footer__brand" aria-label="Brand credit">
        <span className="pro-footer__at">@</span>
        <span className="pro-footer__text">
          Developed By
          <FaDollarSign className="pro-footer__icon" aria-hidden="true" />
          <strong className="pro-footer__name">Ajay Kedar</strong>
        </span>
      </div>

      <nav className="pro-footer__links" aria-label="Social & contact links">
        <a
          className="pro-footer__link"
          href="https://github.com/ajaykedar93"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          title="GitHub"
        >
          <FaGithub />
        </a>

        <a
          className="pro-footer__link"
          href="https://wa.me/919370470095"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp 9370470095"
          title="WhatsApp 9370470095"
        >
          <FaWhatsapp />
        </a>

        <div className="pro-footer__chip-container">
          <a className="pro-footer__chip" href="tel:+919370470095" aria-label="Call 9370470095" title="Call 9370470095">
            9370470095
          </a>
          <a className="pro-footer__chip" href="tel:+919146963805" aria-label="Call 9146963805" title="Call 9146963805">
            9146963805
          </a>
          <a className="pro-footer__chip" href="mailto:ajaykedar3790@gmail.com" aria-label="Email ajaykedar3790@gmail.com" title="Email ajaykedar3790@gmail.com">
            ajaykedar3790@gmail.com
          </a>
          <a className="pro-footer__chip" href="mailto:ajaykedar9657@gmail.com" aria-label="Email ajaykedar9657@gmail.com" title="Email ajaykedar9657@gmail.com">
            ajaykedar9657@gmail.com
          </a>
        </div>
      </nav>

      <div className="pro-footer__meta" aria-label="Footer meta">
        <span>
          © {year} • Built with <FaHeart className="pro-footer__heart" aria-hidden="true" /> &amp; craft
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Toggle & Fullscreen controls (mobile only) */}
      <div className="pro-footer__toggle-wrap" aria-hidden="false">
        <div className="pro-footer__toggle-grid">
          <button
            type="button"
            className="pro-footer__toggle"
            onClick={() => setOpen((v) => !v)}
            aria-controls={PANEL_ID}
            aria-expanded={open}
          >
            <span className="sr-only">Footer info</span>
            {open ? "Hide footer info" : "Show footer info"}
          </button>

          <button
            type="button"
            className="pro-footer__toggle pro-footer__toggle--accent"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-controls="footer-fullsheet"
          >
            Open full footer
          </button>
        </div>
      </div>

      <footer className={`pro-footer ${open ? "is-open" : ""}`} role="contentinfo" aria-label="Site footer">
        {/* Decorative top wave */}
        <div className="pro-footer__wave" aria-hidden="true">
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" focusable="false">
            <path d="M0,96L48,85.3C96,75,192,53,288,58.7C384,64,480,96,576,101.3C672,107,768,85,864,64C960,43,1056,21,1152,16C1248,11,1344,21,1392,26.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"/>
          </svg>
        </div>

        {/* Main content (collapsible on mobile) */}
        <div id={PANEL_ID} className="pro-footer__collapsible" ref={contentRef}>
          <FooterInner />
        </div>

        {/* Back-to-top button */}
        <button type="button" className="pro-footer__top" onClick={scrollToTop} aria-label="Back to top">
          <FaArrowUp />
        </button>

        {/* Styles */}
        <style>{`
          .sr-only{
            position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
          }

          :root{
            --ink-100:#e5e7eb; --ink-300:#cbd5e1; --ink-600:#475569; --ink-800:#1f2937; --surface:#0b1321;
            --grad-a:#0f2027; --grad-b:#203a43; --grad-c:#2c5364;
            --accent:#4caf50; --accent-2:#22c55e; --glow: rgba(76,175,80,0.45);
            --gold:#ffeb3b;
          }

          /* Toggle area (mobile only) */
          .pro-footer__toggle-wrap{
            display:none;
          }
          .pro-footer__toggle-grid{
            display:flex; gap:8px; padding:8px 10px; background:transparent;
          }
          .pro-footer__toggle{
            flex:1;
            border:0;
            background:#0f172a;
            color:#fff;
            font-weight:800;
            letter-spacing:.2px;
            padding:10px 14px;
            cursor:pointer;
            box-shadow: 0 -2px 8px rgba(0,0,0,.15);
            border-radius:10px;
          }
          .pro-footer__toggle--accent{
            background: #0ea5e9;
          }
          .pro-footer__toggle:focus-visible{ outline: 3px solid rgba(34,197,94,.45); outline-offset: 2px; }

          .pro-footer{
            position:relative; width:100%;
            background: linear-gradient(120deg, var(--grad-a), var(--grad-b), var(--grad-c));
            background-size: 220% 220%;
            color:#fff; margin-top:auto; overflow:hidden;
            box-shadow: 0 -6px 24px rgba(0,0,0,.25);
            animation: gradShift 14s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce){ .pro-footer{ animation: none; } }

          .pro-footer__wave{
            position:absolute; top:-1px; left:0; right:0; height:60px; opacity:.55; pointer-events:none;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,.25));
          }
          .pro-footer__wave svg{ display:block; width:100%; height:100%; }
          .pro-footer__wave path{ fill: rgba(255,255,255,.06); }

          .pro-footer__collapsible{
            transition: max-height .28s ease, opacity .24s ease;
            will-change: max-height, opacity;
          }

          .pro-footer__inner{
            max-width: 1200px; margin: 0 auto; padding: 32px 20px 38px;
            display:grid; gap:14px; align-items:center;
            grid-template-columns: 1.2fr auto 1fr;
          }
          @media (max-width: 900px){
            .pro-footer__inner{ grid-template-columns: 1fr; text-align:center; gap:10px; }
          }

          .pro-footer__brand{
            display:flex; align-items:center; gap:10px;
            justify-content:flex-start; font-size:16px; letter-spacing:.2px;
          }
          @media (max-width: 900px){ .pro-footer__brand{ justify-content:center; } }
          .pro-footer__at{ font-weight:800; opacity:.9; transform: translateY(-1px); text-shadow: 0 2px 8px rgba(0,0,0,.3); }
          .pro-footer__text{
            display:flex; align-items:center; gap:10px; flex-wrap:wrap;
            background: rgba(255,255,255,.04); padding:8px 12px; border-radius:12px;
            border: 1px solid rgba(255,255,255,.08);
            box-shadow: inset 0 1px 1px rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.18);
          }
          .pro-footer__icon{
            color: var(--accent); font-size: 18px; filter: drop-shadow(0 0 6px var(--glow));
            transition: transform .25s ease;
          }
          .pro-footer__text:hover .pro-footer__icon{ transform: scale(1.05) rotate(-8deg); }
          .pro-footer__name{ color: var(--gold); text-shadow: 0 0 10px rgba(255,235,59,.15); }

          .pro-footer__links{
            display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;
          }
          .pro-footer__link{
            display:grid; place-items:center; width:40px; height:40px; border-radius:12px;
            background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
            color:#fff; font-size:18px; transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
            outline: none; text-decoration:none;
          }
          .pro-footer__link:focus-visible{ box-shadow: 0 0 0 3px rgba(34,197,94,.45); }
          .pro-footer__link:hover{
            transform: translateY(-2px);
            background: rgba(255,255,255,.12);
            box-shadow: 0 8px 24px rgba(0,0,0,.25), 0 0 12px rgba(34,197,94,.18);
          }

          .pro-footer__chip-container{
            display:flex; gap:12px; justify-content:center; flex-wrap:wrap; max-width: 100%;
          }
          .pro-footer__chip{
            display:inline-flex; align-items:center; justify-content:center; gap:6px;
            padding:8px 10px; border-radius:12px; font-weight:700; font-size:14px; color:#fff;
            background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
            text-decoration:none; transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
            word-break: break-word;
          }
          .pro-footer__chip:hover{
            transform: translateY(-2px);
            background: rgba(255,255,255,.12);
            box-shadow: 0 8px 24px rgba(0,0,0,.25), 0 0 12px rgba(34,197,94,.18);
          }
          .pro-footer__chip:focus-visible{ outline: 3px solid rgba(34,197,94,.45); outline-offset: 2px; }

          .pro-footer__meta{
            display:flex; align-items:center; justify-content:flex-end; gap:8px; color: var(--ink-100);
            font-size:14px; opacity:.92;
          }
          @media (max-width: 900px){ .pro-footer__meta{ justify-content:center; } }
          .pro-footer__heart{ color:#ef4444; margin:0 4px; filter: drop-shadow(0 0 6px rgba(239,68,68,.3)); }

          .pro-footer__top{
            position: absolute; right: 18px; bottom: 18px; width:44px; height:44px;
            border-radius:50%; border:1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08);
            color:#fff; display:grid; place-items:center; cursor:pointer;
            box-shadow: 0 8px 24px rgba(0,0,0,.28);
            transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
          }
          .pro-footer__top:hover{
            transform: translateY(-2px);
            background: rgba(255,255,255,.16);
            box-shadow: 0 12px 30px rgba(0,0,0,.34), 0 0 12px rgba(34,197,94,.22);
          }
          .pro-footer__top:focus-visible{ outline: 3px solid rgba(34,197,94,.45); outline-offset: 2px; }

          /* Mobile behavior */
          @media (max-width: 768px){
            .pro-footer__toggle-wrap{
              display:block; position:sticky; bottom:0; z-index:1030;
              padding-bottom: env(safe-area-inset-bottom, 0px);
              background: transparent;
            }
            .pro-footer__collapsible{
              max-height: 0;
              opacity: 0;
              overflow: hidden;
            }
            .pro-footer.is-open .pro-footer__collapsible{
              max-height: 1200px;
              opacity: 1;
            }
            .pro-footer__inner{ padding: 24px 14px 30px; }
            .pro-footer__links{ gap: 10px; }
            .pro-footer__link{ width:36px; height:36px; font-size:16px; }
            .pro-footer__chip{ padding:6px 8px; font-size:13px; }
            .pro-footer__brand{ font-size:15px; }
          }

          /* Desktop: always expanded; no toggle */
          @media (min-width: 769px){
            .pro-footer__toggle-wrap{ display:none; }
            .pro-footer__collapsible{ max-height: none !important; opacity: 1 !important; overflow: visible !important; }
          }

          /* Full-screen mobile sheet */
          .pro-footer-sheet{
            position: fixed;
            inset: 0;
            z-index: 1400;
            display: none; /* hidden by default, enabled on mobile via media query */
          }
          .pro-footer-sheet__backdrop{
            position:absolute; inset:0; background: rgba(0,0,0,.45);
          }
          .pro-footer-sheet__panel{
            position:absolute; inset: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px) 0;
            background: linear-gradient(120deg, var(--grad-a), var(--grad-b), var(--grad-c));
            color:#fff;
            display:flex; flex-direction:column;
            height: 100%;
            max-height: 100%;
            box-shadow: 0 -6px 24px rgba(0,0,0,.35);
            animation: fadeIn .2s ease;
          }
          .pro-footer-sheet__header{
            display:flex; align-items:center; justify-content:space-between;
            padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.12);
          }
          .pro-footer-sheet__title{
            font-weight: 900; letter-spacing:.2px;
          }
          .pro-footer-sheet__close{
            display:inline-flex; align-items:center; justify-content:center;
            width:38px; height:38px; border-radius:10px; border:1px solid rgba(255,255,255,.2);
            background: rgba(255,255,255,.08); color:#fff; cursor:pointer;
          }
          .pro-footer-sheet__close:focus-visible{ outline: 3px solid rgba(34,197,94,.45); outline-offset: 2px; }

          .pro-footer-sheet__body{
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            padding: 12px 10px 18px;
          }

          /* Reuse the same inner layout inside the sheet, but let it breathe */
          .pro-footer-sheet .pro-footer__inner{
            max-width: 720px; margin: 0 auto; padding: 14px 10px 24px;
          }

          @media (max-width: 768px){
            .pro-footer-sheet{ display:block; }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* Animated gradient background */
          @keyframes gradShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </footer>

      {/* ===== Full-screen mobile sheet ===== */}
      {sheetOpen && (
        <div
          id="footer-fullsheet"
          className="pro-footer-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-fullsheet-title"
          onClick={(e) => {
            // close on backdrop click
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="pro-footer-sheet__backdrop" onClick={() => setSheetOpen(false)} />
          <div className="pro-footer-sheet__panel">
            <div className="pro-footer-sheet__header">
              <div id="footer-fullsheet-title" className="pro-footer-sheet__title">Footer Information</div>
              <button
                ref={closeBtnRef}
                className="pro-footer-sheet__close"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="pro-footer-sheet__body">
              {/* Reuse exactly the same inner content for full-screen */}
              <FooterInner />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
