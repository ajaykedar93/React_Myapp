// src/components/Footer.jsx
import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { FaDollarSign, FaGithub, FaWhatsapp, FaHeart, FaArrowUp } from "react-icons/fa";

const PANEL_ID = "footer-details-panel";

const Footer = () => {
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);

  const scrollToTop = () => {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch { window.scrollTo(0, 0); }
  };

  // When opening, ensure panel is in view (mobile)
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const t = setTimeout(() => {
      const y = contentRef.current.getBoundingClientRect().top + window.scrollY - 12;
      try { window.scrollTo({ top: y, behavior: "smooth" }); }
      catch { window.scrollTo(0, y); }
    }, 20);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <footer className={`pro-footer ${open ? "is-open" : ""}`} role="contentinfo" aria-label="Site footer">
      {/* Decorative top wave */}
      <div className="pro-footer__wave" aria-hidden="true">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" focusable="false">
          <path d="M0,96L48,85.3C96,75,192,53,288,58.7C384,64,480,96,576,101.3C672,107,768,85,864,64C960,43,1056,21,1152,16C1248,11,1344,21,1392,26.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"/>
        </svg>
      </div>

      {/* Single toggle button (mobile only) */}
      <div className="container px-3 pb-2 pt-3 d-md-none">
        <button
          type="button"
          className="btn btn-dark w-100 fw-semibold rounded-3"
          aria-controls={PANEL_ID}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? "Hide footer info" : "Show footer info"}
        </button>
      </div>

      {/* Collapsible details */}
      <div id={PANEL_ID} className="pro-footer__collapsible" ref={contentRef} aria-hidden={!open}>
        <Container className="py-3 py-md-4">
          <Row className="g-3 align-items-center text-center text-md-start">
            {/* Brand */}
            <Col xs={12} md={4}>
              <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2 pro-footer__brand">
                <span className="fw-bold pro-footer__at">@</span>
                <span className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-3 pro-footer__text">
                  Developed By
                  <FaDollarSign className="pro-footer__icon" aria-hidden="true" />
                  <strong className="pro-footer__name">Ajay Kedar</strong>
                </span>
              </div>
            </Col>

            {/* Links + chips */}
            <Col xs={12} md={4}>
              <nav className="d-flex flex-wrap justify-content-center align-items-center gap-2" aria-label="Social & contact links">
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

                <div className="d-flex flex-wrap justify-content-center gap-2 w-100 pro-footer__chip-container mt-1">
                  <a className="pro-footer__chip" href="tel:+919370470095" title="Call 9370470095">9370470095</a>
                  <a className="pro-footer__chip" href="tel:+919146963805" title="Call 9146963805">9146963805</a>
                  <a className="pro-footer__chip" href="mailto:ajaykedar3790@gmail.com" title="Email ajaykedar3790@gmail.com">ajaykedar3790@gmail.com</a>
                  <a className="pro-footer__chip" href="mailto:ajaykedar9657@gmail.com" title="Email ajaykedar9657@gmail.com">ajaykedar9657@gmail.com</a>
                </div>
              </nav>
            </Col>

            {/* Meta */}
            <Col xs={12} md={4}>
              <div className="d-flex align-items-center justify-content-center justify-content-md-end pro-footer__meta">
                <span className="text-white-50 small">
                  © {year} • Built with <FaHeart className="pro-footer__heart" aria-hidden="true" /> &amp; craft
                </span>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Back-to-top button */}
      <button type="button" className="pro-footer__top" onClick={scrollToTop} aria-label="Back to top">
        <FaArrowUp />
      </button>

      {/* Styles */}
      <style>{`
        :root{
          --grad-a:#0f2027; --grad-b:#203a43; --grad-c:#2c5364;
          --accent:#4caf50; --glow: rgba(76,175,80,.45); --gold:#ffeb3b;
        }
        .pro-footer{
          position: relative; width:100%;
          background: linear-gradient(120deg, var(--grad-a), var(--grad-b), var(--grad-c));
          background-size: 220% 220%; color:#fff; margin-top:auto; overflow:hidden;
          box-shadow: 0 -6px 24px rgba(0,0,0,.25); animation: gradShift 14s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce){ .pro-footer{ animation: none; } }

        .pro-footer__wave{ position:absolute; top:-1px; left:0; right:0; height:60px; opacity:.55; pointer-events:none; }
        .pro-footer__wave svg{ display:block; width:100%; height:100%; }
        .pro-footer__wave path{ fill: rgba(255,255,255,.06); }

        .pro-footer__text{
          background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 1px 1px rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.18); border-radius:12px;
        }
        .pro-footer__icon{ color: var(--accent); font-size:18px; filter: drop-shadow(0 0 6px var(--glow)); transition: transform .25s ease; }
        .pro-footer__text:hover .pro-footer__icon{ transform: scale(1.05) rotate(-8deg); }
        .pro-footer__name{ color: var(--gold); text-shadow: 0 0 10px rgba(255,235,59,.15); }

        .pro-footer__link{
          display:grid; place-items:center; width:40px; height:40px; border-radius:12px;
          background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
          color:#fff; font-size:18px; text-decoration:none; transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .pro-footer__link:hover{ transform: translateY(-2px); background: rgba(255,255,255,.12); box-shadow: 0 8px 24px rgba(0,0,0,.25); }

        .pro-footer__chip{
          display:inline-flex; align-items:center; justify-content:center; padding:8px 10px; border-radius:12px; font-weight:700; font-size:14px; color:#fff;
          background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); text-decoration:none; transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .pro-footer__chip:hover{ transform: translateY(-2px); background: rgba(255,255,255,.12); box-shadow: 0 8px 24px rgba(0,0,0,.25); }

        .pro-footer__heart{ color:#ef4444; margin:0 4px; filter: drop-shadow(0 0 6px rgba(239,68,68,.3)); }

        .pro-footer__top{
          position:absolute; right:18px; bottom:18px; width:44px; height:44px; border-radius:50%;
          border:1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color:#fff;
          display:grid; place-items:center; box-shadow:0 8px 24px rgba(0,0,0,.28);
          transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .pro-footer__top:hover{ transform: translateY(-2px); background: rgba(255,255,255,.16); box-shadow: 0 12px 30px rgba(0,0,0,.34); }

        /* Collapsible behavior */
        .pro-footer__collapsible{ max-height:0; opacity:0; overflow:hidden; transition:max-height .28s ease, opacity .24s ease; }
        .pro-footer.is-open .pro-footer__collapsible{ max-height:1400px; opacity:1; }

        /* Desktop: always open; hide the button */
        @media (min-width: 768px){
          .pro-footer__collapsible{ max-height:none !important; opacity:1 !important; overflow:visible !important; }
        }

        @keyframes gradShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
