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
import workDetailsImg from "../assets/Word_Details.png";
import notesImg from "../assets/notes.png"; // ✅ ADD THIS

/** Measure fixed bars and expose CSS vars for perfect layout. */
function useFixedLayoutVars() {
  const measure = () => {
    const topStrip = document.querySelector(".top-strip");
    const navbar = document.querySelector(".custom-navbar");
    const footer = document.querySelector(".pro-footer");

    const topH = topStrip?.offsetHeight ?? 0;
    const navH = navbar?.offsetHeight ?? 0;
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
    const navbar = document.querySelector(".custom-navbar");
    const footer = document.querySelector(".pro-footer");

    if (topStrip) ro.observe(topStrip);
    if (navbar) ro.observe(navbar);
    if (footer) ro.observe(footer);

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
      <MainNavbar />

      <main className="dashboard-scroll" role="main" aria-label="Main content">
        <div className="manage-details-banner" role="heading" aria-level={1}>
          Manage All Personal Details
        </div>

        <Container className="dashboard-content">
          {/* ✅ UPDATED: 6 cards grid */}
          <Row className="dashboard-cards-row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-6">
            <Col className="d-flex">
              <Card
                className="clickable-card square-card documents-card w-100"
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick("/document")}
                onKeyDown={(e) => onCardKey(e, "/document")}
                aria-label="Open Documents"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Documents</h3>
                  <img
                    src={DocumentImg}
                    alt="Documents"
                    loading="lazy"
                    className="square-card__img"
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card investment-card w-100"
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick("/investment")}
                onKeyDown={(e) => onCardKey(e, "/investment")}
                aria-label="Open Investment"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Investment</h3>
                  <img
                    src={investmentImg}
                    alt="Investment"
                    loading="lazy"
                    className="square-card__img"
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card movies-card w-100"
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick("/movies-series")}
                onKeyDown={(e) => onCardKey(e, "/movies-series")}
                aria-label="Open Movies and Series"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Movies &amp; Series</h3>
                  <img
                    src={moviesImg}
                    alt="Movies and Series"
                    loading="lazy"
                    className="square-card__img"
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card transaction-card w-100"
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick("/transaction")}
                onKeyDown={(e) => onCardKey(e, "/transaction")}
                aria-label="Open Transaction"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Transaction</h3>
                  <img
                    src={transactionImg}
                    alt="Transaction"
                    loading="lazy"
                    className="square-card__img"
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col className="d-flex">
              <Card
                className="clickable-card square-card work-details-card w-100"
                role="button"
                tabIndex={0}
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

            {/* ✅ NEW: NOTES CARD */}
            <Col className="d-flex">
              <Card
                className="clickable-card square-card notes-card w-100"
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick("/notes")}
                onKeyDown={(e) => onCardKey(e, "/notes")}
                aria-label="Open Notes"
              >
                <Card.Body className="square-card__content">
                  <h3 className="card-title mb-2">Notes</h3>
                  <img
                    src={notesImg}
                    alt="Notes"
                    loading="lazy"
                    className="square-card__img"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </main>

      <Footer />

      <style>{`
        :root{
          --top-strip: 0px;
          --nav-core: 86px;
          --nav-h: calc(var(--top-strip) + var(--nav-core));
          --footer-h: 110px;
        }

        html, body { margin: 0; padding: 0; height: 100%; overflow-y: auto; background: #f7fafc; }

        /* ✅ IMPORTANT: remove overflow hidden => page scroll will work on mobile */
        .dashboard-container {
          min-height: 100dvh;
          background: #f7fafc;
          -webkit-tap-highlight-color: transparent;
        }

        .custom-navbar {
          margin: 0 !important;
          position: fixed !important;
          top: var(--top-strip);
          left: 0; right: 0;
          z-index: 1190;
        }

        .top-strip {
          position: fixed !important;
          top: 0; left: 0; right: 0;
          height: 6px;
          z-index: 1200;
        }

        .dashboard-container .pro-footer {
          margin: 0 !important;
          position: fixed !important;
          left: 0; right: 0;
          bottom: 0;
          z-index: 1030;
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px);
          background-clip: padding-box;
        }

        /* ✅ PAGE SCROLL (no inner scroll box) */
        .dashboard-scroll {
          /* create space for fixed navbar */
          padding-top: 10px;
          margin-top: var(--nav-h);

          /* create space for fixed footer so content never hides */
          padding-bottom: calc(var(--footer-h) + 24px + env(safe-area-inset-bottom, 0px));

          /* no height/overflow here => body scroll handles it */
          height: auto;
          overflow: visible;
        }

        .dashboard-content { padding: 16px 12px 24px; }

        /* ✅ FORCE CARD GAP ON MOBILE (overrides global rules) */
        .dashboard-content .dashboard-cards-row{
          --bs-gutter-x: 18px;
          --bs-gutter-y: 18px;
        }

        @media (max-width: 576px){
          .dashboard-content .dashboard-cards-row{
            --bs-gutter-x: 16px !important;
            --bs-gutter-y: 16px !important;
            margin-left: calc(var(--bs-gutter-x) / -2) !important;
            margin-right: calc(var(--bs-gutter-x) / -2) !important;
          }

          .dashboard-content .dashboard-cards-row > *{
            padding-left: calc(var(--bs-gutter-x) / 2) !important;
            padding-right: calc(var(--bs-gutter-x) / 2) !important;
            margin-top: 0 !important;
            margin-bottom: var(--bs-gutter-y) !important;
          }

          .dashboard-content .dashboard-cards-row > *:last-child{
            margin-bottom: 6px !important;
          }
        }

        /* ==== PERFECT SQUARE CARDS ==== */
        .square-card{
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          border: none;
          overflow: hidden;
          display: flex;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .square-card__content{
          height: 100%; width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          gap: 10px;
          text-align: center;
        }

        .square-card__img{
          max-width: 72%;
          max-height: 62%;
          object-fit: contain;
          border-radius: 12px;
          user-select: none;
          -webkit-user-drag: none;
        }

        @media (max-width: 576px){
          .square-card__img{ max-width: 78%; max-height: 66%; }
        }

        @media (hover:hover){
          .square-card:hover { transform: translateY(-6px); box-shadow: 0 12px 24px rgba(16,24,40,.12); }
        }

        .square-card:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(59,130,246,.45), 0 12px 24px rgba(16,24,40,.12);
          transform: translateY(-2px);
        }

        .card-title { font-size: 1.15rem; font-weight: 800; letter-spacing: .3px; margin: 0; }

        .documents-card   { background-color: #ffeb3b; color: #0f172a; }
        .investment-card  { background-color: #22c55e; color: #ffffff; }
        .movies-card      { background-color: #f83db7; color: #ffffff; }
        .transaction-card { background-color: #ef4444; color: #ffffff; }
        .work-details-card{ background-color: #a855f7; color: #ffffff; }
        .notes-card       { background-color: #0ea5e9; color: #ffffff; } /* ✅ NEW COLOR */

        /* ✅ sticky banner but doesn't break mobile scroll */
        .manage-details-banner {
          position: sticky;
          top: 0;
          z-index: 5;
          font-family: 'Poppins','Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;
          font-weight: 800;
          font-size: 1.45rem;
          color: #d22212;
          background: linear-gradient(90deg, #e0eafc, #cfdef3);
          padding: 10px 18px;
          border-radius: 12px;
          text-align: center;
          margin: 8px auto 6px;
          max-width: 820px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          letter-spacing: .35px;
        }

        @media (max-width: 576px){
          :root{ --nav-core: 74px; }
          .manage-details-banner { margin: 6px auto 4px; font-size: 1.3rem; padding: 9px 14px; }
          .card-title{ font-size: 1.05rem; }
        }
        @media (max-width: 768px){ :root{ --nav-core: 78px; } }
        @media (max-width: 992px){ :root{ --nav-core: 82px; } }

        @media (prefers-reduced-motion: reduce) {
          .square-card, .square-card:hover, .square-card:focus-visible {
            transition: none !important; transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
