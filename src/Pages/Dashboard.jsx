// src/components/Dashboard.jsx
import React, { useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, Container, Row, Col } from "react-bootstrap";
import MainNavbar from "./MainNavbar";
import Footer from "./Footer";

import investmentImg from "../assets/investment.png";
import DocumentImg from "../assets/Document.png";
import moviesImg from "../assets/movies_series.png";
import transactionImg from "../assets/transaction_dollersign.png";
import workDetailsImg from "../assets/Word_Details.png";33

/** Measure fixed bars and expose CSS vars for perfect layout. */
function useFixedLayoutVars() {
  const measure = () => {
    const topStrip = document.querySelector(".top-strip");
    const navbar   = document.querySelector(".custom-navbar");
    const footer   = document.querySelector(".pro-footer");

    const topH  = topStrip?.offsetHeight ?? 0;
    const navH  = navbar?.offsetHeight ?? 0;
    const footH = footer?.offsetHeight ?? 0;

    const root = document.documentElement.style;
    root.setProperty("--top-strip", `${topH}px`);
    root.setProperty("--nav-core", `${navH}px`);
    root.setProperty("--nav-h", `${topH + navH}px`);
    root.setProperty("--footer-h", `${footH}px`);
  };

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    const topStrip = document.querySelector(".top-strip");
    const navbar   = document.querySelector(".custom-navbar");
    const footer   = document.querySelector(".pro-footer");

    if (topStrip) ro.observe(topStrip);
    if (navbar)   ro.observe(navbar);
    if (footer)   ro.observe(footer);

    window.addEventListener("resize", measure, { passive: true });
    const t = setTimeout(measure, 250);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useFixedLayoutVars();

  const handleCardClick = (path) => navigate(path);
  const onCardKey = (e, path) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick(path);
    }
  };

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  return (
    <div className="dashboard-container">
      {/* Fixed top nav */}
      <MainNavbar />

      {/* Only this area scrolls */}
      <main className="dashboard-scroll" role="main" aria-label="Main content">
        {/* Sticky banner */}
        <div className="manage-details-banner" role="heading" aria-level={1}>
          Manage All Personal Details
        </div>

        <Container className="dashboard-content">
          {/* Mobile-first responsive grid using Bootstrap row-cols */}
          <Row className="g-4 row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-5">
            <Col className="d-flex">
              <Card
                className="clickable-card square-card documents-card w-100"
                role="button" tabIndex={0}
                onClick={() => handleCardClick("/document")}
                onKeyDown={(e) => onCardKey(e, "/document")}
                aria-label="Open Documents"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Documents</h3>
                  <img src={DocumentImg} alt="Documents" loading="lazy" className="square-card__img" />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card investment-card w-100"
                role="button" tabIndex={0}
                onClick={() => handleCardClick("/investment")}
                onKeyDown={(e) => onCardKey(e, "/investment")}
                aria-label="Open Investment"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Investment</h3>
                  <img src={investmentImg} alt="Investment" loading="lazy" className="square-card__img" />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card movies-card w-100"
                role="button" tabIndex={0}
                onClick={() => handleCardClick("/movies-series")}
                onKeyDown={(e) => onCardKey(e, "/movies-series")}
                aria-label="Open Movies and Series"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Movies &amp; Series</h3>
                  <img src={moviesImg} alt="Movies and Series" loading="lazy" className="square-card__img" />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card transaction-card w-100"
                role="button" tabIndex={0}
                onClick={() => handleCardClick("/transaction")}
                onKeyDown={(e) => onCardKey(e, "/transaction")}
                aria-label="Open Transaction"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Transaction</h3>
                  <img src={transactionImg} alt="Transaction" loading="lazy" className="square-card__img" />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card work-details-card w-100"
                role="button" tabIndex={0}
                onClick={() => handleCardClick("/work-details")}
                onKeyDown={(e) => onCardKey(e, "/work-details")}
                aria-label="Open Work Details"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Work Details</h3>
                  <img
                    src={workDetailsImg}
                    alt="Work Details"
                    loading="lazy"
                    className="square-card__img"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </main>

      {/* Fixed footer */}
      <Footer />

      <style>{`
        :root{
          --top-strip: 0px;     /* JS overwrites */
          --nav-core: 86px;     /* JS overwrites */
          --nav-h: calc(var(--top-strip) + var(--nav-core));
          --footer-h: 110px;    /* JS overwrites */
        }

        html, body { margin: 0; padding: 0; }

        .dashboard-container {
          min-height: 100dvh;
          display: flex; flex-direction: column;
          overflow: hidden; /* only inner area scrolls */
          background: #f7fafc;
          -webkit-tap-highlight-color: transparent;
        }

        /* Fixed bars from your components */
        .custom-navbar {
          margin: 0 !important; position: fixed !important;
          top: var(--top-strip); left: 0; right: 0; z-index: 1190;
        }
        .top-strip { position: fixed !important; top: 0; left: 0; right: 0; height: 6px; z-index: 1200; }

        /* Footer fixed; measured by the hook */
        .dashboard-container .pro-footer {
          margin: 0 !important; position: fixed !important;
          left: 0; right: 0; bottom: 0; z-index: 1030;
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px);
          background-clip: padding-box;
        }

        /* Single scroll area uses remaining space exactly */
        .dashboard-scroll {
          margin-top: var(--nav-h);
          margin-bottom: var(--footer-h);
          height: calc(100dvh - var(--nav-h) - var(--footer-h));
          min-height: calc(100dvh - var(--nav-h) - var(--footer-h));
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-gutter: stable both-edges;
        }

        /* Optional nicer scrollbars for pointer devices */
        @media (pointer: fine) {
          .dashboard-scroll::-webkit-scrollbar { width: 10px; }
          .dashboard-scroll::-webkit-scrollbar-track { background: transparent; }
          .dashboard-scroll::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.15); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box;
          }
          .dashboard-scroll:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); }
        }

        .dashboard-content { padding: 16px 12px 24px; }
        .cards-container { margin: 16px 0 24px; }

        /* ==== PERFECT SQUARE CARDS ==== */
        .square-card{
          aspect-ratio: 1 / 1;          /* makes every card a square */
          border-radius: 16px; border: none; overflow: hidden;
          display: flex;                 /* allows height:100% on body */
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .square-card__content{
          height: 100%; width: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 16px; gap: 10px; text-align: center;
        }
        .square-card__img{
          max-width: 72%;
          max-height: 62%;
          object-fit: contain;
          border-radius: 12px;
          user-select: none; -webkit-user-drag: none;
        }
        @media (max-width: 576px){
          .square-card__img{ max-width: 78%; max-height: 66%; }
        }

        /* Hover/focus polish */
        @media (hover:hover){
          .square-card:hover { transform: translateY(-6px); box-shadow: 0 12px 24px rgba(16,24,40,.12); }
        }
        .square-card:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(59,130,246,.45), 0 12px 24px rgba(16,24,40,.12); transform: translateY(-2px); }

        .card-title { font-size: 1.15rem; font-weight: 800; letter-spacing: .3px; margin: 0; }

        /* Brand colors (kept) */
        .documents-card   { background-color: #ffeb3b; color: #0f172a; }
        .investment-card  { background-color: #22c55e; color: #ffffff; }
        .movies-card      { background-color: #3b82f6; color: #ffffff; }
        .transaction-card { background-color: #ef4444; color: #ffffff; }
        .work-details-card{ background-color: #a855f7; color: #ffffff; }

        /* Sticky banner */
        .manage-details-banner {
          position: sticky; top: 0; z-index: 5;
          font-family: 'Poppins','Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;
          font-weight: 800; font-size: 1.45rem; color: #d22212;
          background: linear-gradient(90deg, #e0eafc, #cfdef3);
          padding: 10px 18px; border-radius: 12px; text-align: center;
          margin: 8px auto 6px; max-width: 820px; box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          letter-spacing: .35px;
        }

        /* Mobile tweaks */
        @media (max-width: 576px){
          :root{ --nav-core: 74px; }
          .manage-details-banner { margin: 6px auto 4px; font-size: 1.3rem; padding: 9px 14px; }
          .card-title{ font-size: 1.05rem; }
        }
        @media (max-width: 768px){ :root{ --nav-core: 78px; } }
        @media (max-width: 992px){ :root{ --nav-core: 82px; } }

        @media (prefers-reduced-motion: reduce) {
          .square-card, .square-card:hover, .square-card:focus-visible { transition: none !important; transform: none !important; }
          .dashboard-scroll { scroll-behavior: auto; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
