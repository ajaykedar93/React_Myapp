// src/components/NotesN.jsx (FINAL + MOBILE bottom safe space so end details won't hide)
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Nav } from "react-bootstrap";

import AddNote from "../Notes/AddNote";
import GetNote from "../Notes/GetNote";
import Notes from "./Notes";

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
        <Container className="notes-container px-0 px-md-4">
          {/* ONLY 2 LINES */}
          <div className="notes-info notes-pad">
            <div className="notes-info-line">{infoLines[0]}</div>
            <div className="notes-info-line">{infoLines[1]}</div>
          </div>

          {/* Tabs */}
          <div className="tabs-wrap notes-pad">
            <Nav
              variant="pills"
              className="notes-tabs"
              activeKey={activeTab}
              onSelect={(k) => k && setActiveTab(k)}
            >
              <Nav.Item>
                <Nav.Link eventKey="notes" className="notes-tab" role="tab">
                  Notes
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link eventKey="add" className="notes-tab" role="tab">
                  Add Notes
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link eventKey="get" className="notes-tab" role="tab">
                  Get Notes
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          {/* Tab Content */}
          <div className="tab-panel">
            <div className="panel-inner">
              {activeTab === "notes" ? (
                <Notes />
              ) : activeTab === "add" ? (
                <AddNote />
              ) : (
                <GetNote />
              )}
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
      radial-gradient(900px 420px at 90% 10%, rgba(124,58,237,.12), transparent 55%),
      radial-gradient(860px 420px at 70% 90%, rgba(236,72,153,.10), transparent 55%),
      #f3f4f6;
    color: #0f172a;
    font-family: "Times New Roman", Times, Georgia, serif;
  }

  /* ✅ HARD EDGE RESET */
  html, body { margin:0; padding:0; width:100%; overflow-x:hidden; }
  .notes-page { width:100%; }
  .notes-main { width:100%; }

  /* ✅ remove underline */
  .notes-tabs .nav-link,
  .notes-tabs .nav-link:hover,
  .notes-tabs .nav-link:focus,
  .notes-tabs .nav-link:active{
    text-decoration: none !important;
    box-shadow: none;
    outline: none;
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
    padding: 35px 0 14px;
  }

  .notes-title-wrap{
    display:flex;
    align-items:center;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;
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
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    flex: 0 0 auto;
  }

  .btn-dashboard{
    background: #f59e0b !important;
    border: 1px solid rgba(0,0,0,.18) !important;
    color: #1f2937 !important;
    font-weight: 900 !important;
    border-radius: 12px !important;
    padding: 9px 14px !important;
    box-shadow: 0 10px 22px rgba(0,0,0,.18);
    transition: transform .15s ease, background .15s ease, box-shadow .15s ease;
    flex: 0 0 auto;
    width: auto;
    white-space: nowrap;
  }

  .btn-dashboard:hover{
    background: #eab308 !important;
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgba(0,0,0,.22);
  }
  .btn-dashboard:active{ transform: translateY(0px); }

  /* Main */
  .notes-main{ padding: 16px 0 28px; }

  /* ✅ pad only where needed */
  .notes-pad{
    padding-left: 12px;
    padding-right: 12px;
  }

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

  .notes-tabs{
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .notes-tab{
    border-radius: 14px !important;
    padding: 10px 16px !important;
    font-weight: 1000 !important;
    letter-spacing: .2px;
    border: 1px solid rgba(0,0,0,.08) !important;
    background: rgba(255,255,255,.92) !important;
    color: rgba(17,24,39,.88) !important;
    box-shadow: 0 10px 22px rgba(0,0,0,.06);
    transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .notes-tab:hover{
    transform: translateY(-2px);
    box-shadow: 0 14px 26px rgba(0,0,0,.10);
    filter: brightness(1.01);
  }
  .notes-tab:active{ transform: translateY(0px); }

  .notes-tabs .nav-link.active{
    color:#fff !important;
    border-color: rgba(245,158,11,.55) !important;
    background: linear-gradient(135deg, rgba(245,158,11,1), rgba(236,72,153,1), rgba(124,58,237,1)) !important;
    box-shadow:
      0 18px 36px rgba(0,0,0,.16),
      0 0 0 4px rgba(236,72,153,.14);
    transform: translateY(-1px);
  }

  .notes-tabs .nav-link.active::before{
    content:"";
    position:absolute;
    inset:-40%;
    background:
      radial-gradient(circle at 30% 30%, rgba(255,255,255,.42), transparent 55%),
      radial-gradient(circle at 70% 70%, rgba(255,255,255,.24), transparent 55%);
    transform: rotate(12deg);
    opacity: .85;
    z-index: -1;
  }

  .notes-tabs .nav-link.active::after{
    content:"";
    position:absolute;
    left: 14px;
    right: 14px;
    bottom: 8px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,.55);
    box-shadow: 0 8px 20px rgba(255,255,255,.18);
    opacity: .9;
    z-index: -1;
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
    .notes-pad{ padding-left: 0; padding-right: 0; }
  }

  /* ✅ MOBILE EDGE-TO-EDGE + BOTTOM SAFE SPACE (so last details won't hide) */
  @media (max-width: 576px){
    .notes-container{ padding-left: 0 !important; padding-right: 0 !important; }

    .tab-panel{
      border-radius: 0 !important;
      border-left: 0 !important;
      border-right: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      box-shadow: 0 10px 24px rgba(0,0,0,.08);
    }

    .panel-inner{ padding: 0 !important; }

    .notes-pad{ padding-left: 12px; padding-right: 12px; }

    .notes-nav-inner{ gap: 8px; }
    .notes-title{ font-size: 18px; }
    .btn-dashboard{ padding: 8px 10px !important; border-radius: 12px !important; font-size: 14px; }
    .notes-tab{ padding: 9px 12px !important; }

    /* ✅ THE FIX: keep small blank space at bottom for mobile nav bars */
    .notes-main{
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 70px) !important;
    }
  }

  @media (max-width: 360px){
    .notes-title{ font-size: 16.5px; }
    .btn-dashboard{ padding: 7px 9px !important; font-size: 13.5px; }
  }

  @media (prefers-reduced-motion: reduce){
    .notes-tab, .btn-dashboard{ transition:none !important; }
    .notes-tab:hover, .btn-dashboard:hover{ transform:none !important; }
    .notes-tabs .nav-link.active{ transform:none !important; }
  }
`;
