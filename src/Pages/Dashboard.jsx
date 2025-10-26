// src/components/Dashboard.jsx
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, Container, Row, Col, Modal, Button } from "react-bootstrap";
import MainNavbar from "./MainNavbar";
import Footer from "./Footer";

import documentsImg from "../assets/documents.png";
import investmentImg from "../assets/investment.png";
import moviesImg from "../assets/movies_series.png";
import transactionImg from "../assets/transaction_new.png";
import workDetailsImg from "../assets/work_details.png";

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

  const [footerModalOpen, setFooterModalOpen] = useState(false);
  const [footerHtml, setFooterHtml] = useState("");

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

  // Copy EXACT footer (with class) so styles apply; then show it in modal
  const openFooterModal = () => {
    const el = document.querySelector(".pro-footer");
    const html = el ? el.outerHTML : ""; // <-- key change (outerHTML)
    setFooterHtml(html);
    setFooterModalOpen(true);
  };

  return (
    <div className="dashboard-container">
      <MainNavbar />
      <Footer />

      {/* Mobile-only floating footer button */}
      <button
        className="footer-fab"
        aria-label="Show footer information"
        onClick={openFooterModal}
      >
        <span className="fab-icon" aria-hidden="true">ℹ️</span>
      </button>

      {/* Only this area scrolls */}
      <div className="dashboard-scroll" role="main" aria-label="Main content">
        <div className="manage-details-banner" role="heading" aria-level={1}>
          Manage All Personal Details
        </div>

        <Container className="dashboard-content">
          <div className="cards-container mt-3" aria-label="Quick sections">
            {/* Bootstrap row-cols utilities for perfect mobile layout */}
            <Row className="g-4 row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-5">
              <Col className="d-flex">
                <Card
                  className="clickable-card documents-card w-100 h-100"
                  onClick={() => handleCardClick("/document")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => onCardKey(e, "/document")}
                  aria-label="Open Documents"
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center w-100">
                    <Card.Title as="h3" className="card-title">Documents</Card.Title>
                    <Card.Img variant="top" src={documentsImg} alt="Documents" loading="lazy" />
                  </Card.Body>
                </Card>
              </Col>

              <Col className="d-flex">
                <Card
                  className="clickable-card investment-card w-100 h-100"
                  onClick={() => handleCardClick("/investment")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => onCardKey(e, "/investment")}
                  aria-label="Open Investment"
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center w-100">
                    <Card.Title as="h3" className="card-title">Investment</Card.Title>
                    <Card.Img variant="top" src={investmentImg} alt="Investment" loading="lazy" />
                  </Card.Body>
                </Card>
              </Col>

              <Col className="d-flex">
                <Card
                  className="clickable-card movies-card w-100 h-100"
                  onClick={() => handleCardClick("/movies-series")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => onCardKey(e, "/movies-series")}
                  aria-label="Open Movies and Series"
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center w-100">
                    <Card.Title as="h3" className="card-title">Movies & Series</Card.Title>
                    <Card.Img variant="top" src={moviesImg} alt="Movies and Series" loading="lazy" />
                  </Card.Body>
                </Card>
              </Col>

              <Col className="d-flex">
                <Card
                  className="clickable-card transaction-card w-100 h-100"
                  onClick={() => handleCardClick("/transaction")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => onCardKey(e, "/transaction")}
                  aria-label="Open Transaction"
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center w-100">
                    <Card.Title as="h3" className="card-title">Transaction</Card.Title>
                    <Card.Img variant="top" src={transactionImg} alt="Transaction" loading="lazy" />
                  </Card.Body>
                </Card>
              </Col>

              <Col className="d-flex">
                <Card
                  className="clickable-card work-details-card w-100 h-100"
                  onClick={() => handleCardClick("/work-details")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => onCardKey(e, "/work-details")}
                  aria-label="Open Work Details"
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center w-100">
                    <Card.Title as="h3" className="card-title">Work Details</Card.Title>
                    <Card.Img
                      variant="top"
                      src={workDetailsImg}
                      alt="Work Details"
                      loading="lazy"
                      style={{ height: 200, objectFit: "contain" }}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Professional center modal with close icon */}
      <Modal
        show={footerModalOpen}
        onHide={() => setFooterModalOpen(false)}
        centered
        aria-labelledby="footer-info-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="footer-info-title">Footer Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Exact clone of footer element */}
          {footerHtml ? (
            <div
              className="footer-modal-content"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
          ) : (
            <div className="text-muted">No footer information available.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setFooterModalOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

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

        /* Fixed bars */
        .custom-navbar { margin: 0 !important; position: fixed !important; top: var(--top-strip); left: 0; right: 0; z-index: 1190; }
        .top-strip { position: fixed !important; top: 0; left: 0; right: 0; height: 6px; z-index: 1200; }
        .dashboard-container .pro-footer { margin: 0 !important; position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 1030;
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px); background-clip: padding-box; }

        /* Mobile-only floating action button above footer */
        .footer-fab {
          position: fixed;
          right: 14px;
          bottom: calc(var(--footer-h) + 16px);
          z-index: 1300;
          border: none;
          border-radius: 9999px;
          padding: 12px 16px;
          background: #111827;   /* neutral dark to work with any footer color scheme */
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(2,6,23,0.18);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .footer-fab .fab-icon { font-size: 18px; line-height: 1; }
        .footer-fab:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,.45); }
        @media (min-width: 577px) { .footer-fab { display: none; } }

        /* Single scroll area uses remaining space exactly */
        .dashboard-scroll {
          margin-top: var(--nav-h);
          margin-bottom: var(--footer-h);

          height: calc(100svh - var(--nav-h) - var(--footer-h));
          min-height: calc(100svh - var(--nav-h) - var(--footer-h));

          height: calc(100dvh - var(--nav-h) - var(--footer-h));
          min-height: calc(100dvh - var(--nav-h) - var(--footer-h));

          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-gutter: stable both-edges;
        }

        /* Desktop scrollbar (optional) */
        @media (pointer: fine) {
          .dashboard-scroll::-webkit-scrollbar { width: 10px; }
          .dashboard-scroll::-webkit-scrollbar-track { background: transparent; }
          .dashboard-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
          .dashboard-scroll:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); }
        }

        .dashboard-content { padding: 16px 12px 24px; }
        .cards-container { margin: 16px 0 24px; }

        .card {
          cursor: pointer;
          border-radius: 16px;
          border: none; outline: none;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          transition: transform .22s ease, box-shadow .22s ease;
          overflow: visible;
        }
        .card:focus-visible { box-shadow: 0 0 0 4px rgba(59,130,246,.45), 0 12px 24px rgba(16,24,40,.12); transform: translateY(-2px); }
        .card:hover { transform: translateY(-6px); box-shadow: 0 12px 24px rgba(16,24,40,.12); }

        .card img { width: 100%; max-height: 200px; object-fit: contain; border-radius: 10px; margin-bottom: 10px;
          user-select: none; -webkit-user-drag: none; }

        .card-title { font-size: 1.15rem; font-weight: 800; letter-spacing: .3px; margin-bottom: 12px; }

        /* Keep your colors (unchanged) */
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
          padding: 10px 18px;
          border-radius: 12px;
          text-align: center;
          margin: 8px auto 6px;
          max-width: 820px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          letter-spacing: .35px;
        }

        /* Render the footer correctly inside the modal */
        .footer-modal-content .pro-footer {
          position: static !important;
          inset: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
          width: 100% !important;
          z-index: auto !important;
          background-clip: initial !important;
          padding-bottom: 0 !important; /* avoid safe-area padding inside modal */
          box-shadow: none; /* optional: remove sticky shadow in modal */
        }
        .footer-modal-content .pro-footer > * { max-width: 100%; }

        /* Mobile-first: show FULL card content, never hide */
        @media (max-width: 576px){
          :root{ --nav-core: 74px; }
          .manage-details-banner { margin: 6px auto 4px; font-size: 1.3rem; padding: 9px 14px; }
          .card-title{ font-size: 1.05rem; }
          .card img{ max-height: none; height: auto; }
          .card .card-body { width: 100%; }
        }

        @media (max-width: 768px){
          :root{ --nav-core: 78px; }
        }

        @media (max-width: 992px){
          :root{ --nav-core: 82px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .card, .card:hover, .card:focus-visible { transition: none !important; transform: none !important; }
          .dashboard-scroll { scroll-behavior: auto; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
