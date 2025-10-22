// src/components/Footer.jsx
import React from "react";
import { FaDollarSign, FaGithub, FaWhatsapp, FaHeart, FaArrowUp } from "react-icons/fa";

const Footer = () => {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className="pro-footer" role="contentinfo" aria-label="Site footer">
      {/* Decorative top wave */}
      <div className="pro-footer__wave" aria-hidden="true">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" focusable="false">
          <path d="M0,96L48,85.3C96,75,192,53,288,58.7C384,64,480,96,576,101.3C672,107,768,85,864,64C960,43,1056,21,1152,16C1248,11,1344,21,1392,26.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"/>
        </svg>
      </div>

      {/* Main content */}
      <div className="pro-footer__inner">
        <div className="pro-footer__brand" aria-label="Brand credit">
          <span className="pro-footer__at">@</span>
          <span className="pro-footer__text">
            Developed By
            <FaDollarSign className="pro-footer__icon" aria-hidden="true" />
            <strong className="pro-footer__name">Ajay Kedar</strong>
          </span>
        </div>

        {/* Social & contact */}
        <nav className="pro-footer__links" aria-label="Social & contact links">
          {/* GitHub */}
          <a
            className="pro-footer__link"
            href="https://github.com/ajaykedar93"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            title="GitHub"
          >
            <FaGithub />
          </a>

          {/* WhatsApp → opens chat to 9370470095 (+91) */}
          <a
            className="pro-footer__link"
            href="https://wa.me/919370470095"
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp 9370470095"
            title="WhatsApp 9370470095"
          >
            <FaWhatsapp />
          </a>

          {/* Hide these on small screens */}
          <div className="pro-footer__chip-container">
            <a
              className="pro-footer__chip pro-footer__chip--hidden-mobile"
              href="tel:+919370470095"
              aria-label="Call 9370470095"
              title="Call 9370470095"
            >
              9370470095
            </a>

            <a
              className="pro-footer__chip pro-footer__chip--hidden-mobile"
              href="tel:+919146963805"
              aria-label="Call 9146963805"
              title="Call 9146963805"
            >
              9146963805
            </a>

            <a
              className="pro-footer__chip pro-footer__chip--hidden-mobile"
              href="mailto:ajaykedar3790@gmail.com"
              aria-label="Email ajaykedar3790@gmail.com"
              title="Email ajaykedar3790@gmail.com"
            >
              ajaykedar3790@gmail.com
            </a>

            <a
              className="pro-footer__chip pro-footer__chip--hidden-mobile"
              href="mailto:ajaykedar9657@gmail.com"
              aria-label="Email ajaykedar9657@gmail.com"
              title="Email ajaykedar9657@gmail.com"
            >
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

      {/* Back-to-top button */}
      <button className="pro-footer__top" onClick={scrollToTop} aria-label="Back to top">
        <FaArrowUp />
      </button>

      {/* Styles */}
      <style>{`
        :root{
          --ink-100:#e5e7eb; --ink-300:#cbd5e1; --ink-600:#475569; --ink-800:#1f2937; --surface:#0b1321;
          --grad-a:#0f2027; --grad-b:#203a43; --grad-c:#2c5364;
          --accent:#4caf50; --accent-2:#22c55e; --glow: rgba(76,175,80,0.45);
          --gold:#ffeb3b;
        }
        .pro-footer{
          position:relative; width:100%;
          background: linear-gradient(120deg, var(--grad-a), var(--grad-b), var(--grad-c));
          background-size: 220% 220%;
          color:#fff; margin-top:auto; overflow:hidden;
          box-shadow: 0 -6px 24px rgba(0,0,0,.25);
          animation: gradShift 14s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce){ .pro-footer{ animation: none; } }

        /* Top wave divider */
        .pro-footer__wave{
          position:absolute; top:-1px; left:0; right:0; height:60px; opacity:.55; pointer-events:none;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,.25));
        }
        .pro-footer__wave svg{ display:block; width:100%; height:100%; }
        .pro-footer__wave path{ fill: rgba(255,255,255,.06); }

        .pro-footer__inner{
          max-width: 1200px; margin: 0 auto; padding: 32px 20px 38px;
          display:grid; gap:14px; align-items:center;
          grid-template-columns: 1.2fr auto 1fr;
        }
        @media (max-width: 900px){
          .pro-footer__inner{ grid-template-columns: 1fr; text-align:center; gap:10px; }
        }

        /* Brand line */
        .pro-footer__brand{
          display:flex; align-items:center; gap:10px;
          justify-content:flex-start; font-size:16px; letter-spacing:.2px;
        }
        @media (max-width: 900px){ .pro-footer__brand{ justify-content:center; } }
        .pro-footer__at{
          font-weight:800; opacity:.9; transform: translateY(-1px);
          text-shadow: 0 2px 8px rgba(0,0,0,.3);
        }
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

        /* Links row */
        .pro-footer__links{
          display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;
        }
        /* Icon buttons */
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
        /* Text chips (phones/emails) */
        .pro-footer__chip-container{
          display:flex; gap:12px; justify-content:center;
        }
        .pro-footer__chip--hidden-mobile{
          display:none;
        }
        @media (max-width: 900px){
          .pro-footer__chip--hidden-mobile{
            display:none;
          }
        }

        .pro-footer__chip{
          display:inline-flex; align-items:center; justify-content:center; gap:6px;
          padding:8px 10px; border-radius:12px; font-weight:700; font-size:14px; color:#fff;
          background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
          text-decoration:none; transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .pro-footer__chip:hover{
          transform: translateY(-2px);
          background: rgba(255,255,255,.12);
          box-shadow: 0 8px 24px rgba(0,0,0,.25), 0 0 12px rgba(34,197,94,.18);
        }
        .pro-footer__chip:focus-visible{ outline: 3px solid rgba(34,197,94,.45); outline-offset: 2px; }

        /* Meta */
        .pro-footer__meta{
          display:flex; align-items:center; justify-content:flex-end; gap:8px; color: var(--ink-100);
          font-size:14px; opacity:.92;
        }
        @media (max-width: 900px){ .pro-footer__meta{ justify-content:center; } }
        .pro-footer__heart{ color:#ef4444; margin:0 4px; filter: drop-shadow(0 0 6px rgba(239,68,68,.3)); }

        /* Back to top */
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

        /* Animated gradient background */
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
