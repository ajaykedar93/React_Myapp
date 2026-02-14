// src/components/NotesN.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Nav } from "react-bootstrap";

import AddNote from "../Notes/AddNote";
import GetNote from "../Notes/GetNote";

export default function NotesN() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("add");

  const infoLines = useMemo(
    () => [
      "Capture your ideas, tasks, and quick thoughts in one place — clean & organized.",
      "Use tabs below to add new notes or view/manage your saved notes anytime.",
    ],
    []
  );

  return (
    <div className="notes-page">
      <style>{css}</style>

      {/* Top Navbar */}
      <header className="notes-navbar sticky-top">
        <Container fluid className="px-3">
          <div className="notes-nav-inner">
            <div className="notes-title-wrap">
              <div className="notes-mark" aria-hidden />
              <div className="notes-title" title="Notes Manage">
                Notes Manage
              </div>
            </div>

            <Button
              className="btn-dashboard"
              onClick={() => navigate("/dashboard")}
              aria-label="Go to Dashboard"
            >
              Dashboard
            </Button>
          </div>
        </Container>
      </header>

      {/* Content */}
      <main className="notes-main">
        <Container className="px-3 px-md-4">
          {/* ONLY 2 LINES */}
          <div className="notes-info">
            <div className="notes-info-line">{infoLines[0]}</div>
            <div className="notes-info-line">{infoLines[1]}</div>
          </div>

          {/* Tabs */}
          <div className="tabs-wrap">
            <Nav
              variant="pills"
              className="notes-tabs"
              activeKey={activeTab}
              onSelect={(k) => k && setActiveTab(k)}
            >
              <Nav.Item>
                <Nav.Link eventKey="add" className="notes-tab">
                  Add Notes
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link eventKey="get" className="notes-tab">
                  Get Notes
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          {/* Tab Content */}
          <div className="tab-panel">
            <div className="panel-inner">
              {activeTab === "add" ? <AddNote /> : <GetNote />}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}

const css = `
  .notes-page{
    min-height: 100dvh;
    background:
      radial-gradient(900px 420px at 12% 0%, rgba(245,158,11,.14), transparent 55%),
      radial-gradient(900px 420px at 90% 10%, rgba(220,38,38,.10), transparent 55%),
      radial-gradient(860px 420px at 70% 90%, rgba(34,197,94,.08), transparent 55%),
      #f3f4f6;
    color: #0f172a;
    font-family: "Times New Roman", Times, Georgia, serif;
  }

  /* Navbar */
  .notes-navbar{
    background: rgba(17, 24, 39, .92);
    border-bottom: 1px solid rgba(255,255,255,.08);
    backdrop-filter: blur(10px);
    z-index: 1200;
    padding-top: max(env(safe-area-inset-top, 0px), 10px);
  }

  .notes-nav-inner{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 10px;
    padding: 35px 0 14px; /* keep your same height */
  }

  /* ✅ Allow title to stay fully visible on mobile */
  .notes-title-wrap{
    display:flex;
    align-items:center;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;            /* take available space */
  }

  .notes-mark{
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #f59e0b;
    box-shadow: 0 0 0 6px rgba(245,158,11,.22);
    flex: 0 0 auto;
  }

  .notes-title{
    color:#fff;
    font-weight: 900;
    letter-spacing: .35px;
    font-size: 19px;
    line-height: 1.1;

    /* ✅ do NOT cut title */
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    flex: 0 0 auto;
  }

  /* ✅ Dashboard button always fully visible on mobile */
  .btn-dashboard{
    background: #f59e0b !important;
    border: 1px solid rgba(0,0,0,.18) !important;
    color: #1f2937 !important;
    font-weight: 900 !important;
    border-radius: 12px !important;
    padding: 9px 14px !important;
    box-shadow: 0 10px 22px rgba(0,0,0,.18);
    transition: transform .15s ease, background .15s ease;

    flex: 0 0 auto;            /* don't shrink */
    width: auto;
    white-space: nowrap;       /* keep full word */
  }

  .btn-dashboard:hover{
    background: #eab308 !important;
    transform: translateY(-1px);
  }
  .btn-dashboard:active{ transform: translateY(0px); }

  /* Main */
  .notes-main{ padding: 16px 0 28px; }

  .notes-info{ margin-top: 12px; margin-bottom: 12px; }
  .notes-info-line{
    color:#b91c1c;
    font-weight: 800;
    font-size: 15px;
    line-height: 1.25;
  }
  .notes-info-line + .notes-info-line{ margin-top: 6px; }

  /* Tabs */
  .tabs-wrap{ margin-top: 10px; }
  .notes-tabs{ gap: 10px; flex-wrap: wrap; }

  .notes-tab{
    border-radius: 14px !important;
    padding: 10px 16px !important;
    font-weight: 900 !important;
    letter-spacing: .2px;
    border: 1px solid rgba(0,0,0,.08) !important;
    background: rgba(255,255,255,.9) !important;
    color: rgba(17,24,39,.85) !important;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .notes-tab:hover{
    transform: translateY(-2px);
    box-shadow: 0 14px 26px rgba(0,0,0,.10);
  }
  .notes-tab:active{ transform: translateY(0px); }

  .notes-tabs .nav-link.active{
    background: rgba(17, 24, 39, .92) !important;
    color:#fff !important;
    border-color: rgba(245,158,11,.55) !important;
    box-shadow: 0 18px 34px rgba(0,0,0,.14);
  }

  /* Panel */
  .tab-panel{
    margin-top: 12px;
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 18px;
    box-shadow: 0 14px 34px rgba(0,0,0,.08);
    overflow: hidden;
  }
  .panel-inner{ padding: 14px; }

  @media (min-width: 768px){
    .panel-inner{ padding: 18px; }
    .notes-title{ font-size: 20px; }
    .notes-info-line{ font-size: 16px; }
  }

  /* ✅ Mobile: keep full title + full dashboard button */
  @media (max-width: 576px){
    .notes-nav-inner{
      gap: 8px;
    }

    .notes-title{
      font-size: 18px;   /* slightly smaller so it fits */
    }

    .btn-dashboard{
      padding: 8px 10px !important;  /* smaller but still "Dashboard" visible */
      border-radius: 12px !important;
      font-size: 14px;
    }

    .notes-tab{ padding: 9px 12px !important; }
  }

  @media (max-width: 360px){
    .notes-title{ font-size: 16.5px; }  /* extra small phones */
    .btn-dashboard{ padding: 7px 9px !important; font-size: 13.5px; }
  }

  @media (prefers-reduced-motion: reduce){
    .notes-tab, .btn-dashboard{ transition:none !important; }
    .notes-tab:hover, .btn-dashboard:hover{ transform:none !important; }
  }
`;
