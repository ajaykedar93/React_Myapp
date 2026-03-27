import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Investmentcatsub from "./Investment_platform_segment";
import InvestmentPlan from "./Investment_plan";
import TradingJournal from "./Investment_tradingjournal";
import DipWid from "./Investment_dipwid";
import GetTradingJournal from "./Investment_getview_trandingjouranal";
import InvestmentOverall from "./Investment_Overall";
import DownloadTradingJouranl from "./DownloadTradingJouranl"; // ✅ NEW IMPORT

export default function Investment_DashboardTab() {
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { key: "journal", label: "Trading Journal", render: TradingJournal },
      { key: "getjournal", label: "Get Trading Journal", render: GetTradingJournal },
      { key: "downloadjournal", label: "Download", render: DownloadTradingJouranl }, // ✅ NEW TAB
      { key: "overall", label: "Overall Report", render: InvestmentOverall },

      { key: "plan", label: "Trading Plan", render: InvestmentPlan },
      { key: "catsub", label: "Platform & Segment", render: Investmentcatsub },
      { key: "dipwid", label: "Deposit / Withdraw", render: DipWid },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "journal");
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.render || null;

  return (
    <div className="id3-root">
      <style>{styles}</style>

      <div className="id3-stickyWrap">
        <header className="id3-nav">
          <div className="id3-left">
            <div className="id3-logo" aria-hidden>
              💼
            </div>

            <div className="id3-titleWrap">
              <div className="id3-title">Investment Management</div>
              <div className="id3-sub">MY PERSONAL</div>
            </div>
          </div>

          <button className="id3-dashBtn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
        </header>

        <div className="id3-tabsBar">
          <div className="id3-tabsScroll" role="tablist" aria-label="Investment Tabs">
            {tabs.map((t) => {
              const active = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`id3-tab ${active ? "id3-tabActive" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  <span className="id3-tabText">{t.label}</span>
                  {active ? <span className="id3-tabGlow" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="id3-scrollArea">
        <div key={activeTab} className="id3-view">
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>
      </main>
    </div>
  );
}

const styles = `
  :root{
    --g1:#ff3d8d;
    --g2:#ffb703;
    --g3:#7c3aed;
    --g4:#00d4ff;

    --glass: rgba(255,255,255,.90);
    --glass2: rgba(255,255,255,.78);
    --text: rgba(17,24,39,.96);
    --muted: rgba(75,85,99,.92);

    --radius: 18px;
    --shadow2: 0 10px 28px rgba(0,0,0,.12);
  }

  *{ box-sizing:border-box; }

  body { margin: 0; }

  .id3-root{
    height: 100vh;
    height: 100dvh;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    background:
      radial-gradient(900px 520px at 12% 10%, rgba(255,61,141,.26), transparent 60%),
      radial-gradient(900px 520px at 92% 18%, rgba(255,183,3,.18), transparent 60%),
      radial-gradient(900px 520px at 40% 92%, rgba(0,212,255,.18), transparent 60%),
      linear-gradient(135deg, rgba(124,58,237,.92), rgba(255,61,141,.88));
  }

  .id3-stickyWrap{
    position: sticky;
    top: 0;
    z-index: 80;
  }

  .id3-nav{
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 12px;
    background: var(--glass);
    border-bottom: 1px solid rgba(255,255,255,.45);
    backdrop-filter: blur(12px);
  }

  .id3-left{
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .id3-logo{
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    color: #fff;
    flex: 0 0 auto;
    font-size: 18px;
    background: linear-gradient(135deg, var(--g1), var(--g2));
    box-shadow: 0 14px 28px rgba(255,61,141,.22);
  }

  .id3-titleWrap{
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .id3-title{
    font-weight: 950;
    letter-spacing: .2px;
    color: var(--text);
    font-size: 15px;
    white-space: normal;
    line-height: 1.15;
    word-break: break-word;
  }

  .id3-sub{
    font-size: 11px;
    font-weight: 800;
    color: var(--muted);
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 72vw;
  }

  .id3-dashBtn{
    border: 0;
    cursor: pointer;
    padding: 9px 11px;
    border-radius: 14px;
    font-weight: 950;
    letter-spacing: .2px;
    color: #fff;
    white-space: nowrap;
    font-size: 12px;
    background: linear-gradient(135deg, var(--g3), var(--g4));
    box-shadow: 0 14px 28px rgba(124,58,237,.20);
    transition: transform .08s ease, filter .15s ease;
    flex: 0 0 auto;
  }

  .id3-dashBtn:active{ transform: translateY(1px); }
  .id3-dashBtn:hover{ filter: brightness(1.02); }

  .id3-tabsBar{
    background: var(--glass2);
    border-bottom: 1px solid rgba(255,255,255,.45);
    backdrop-filter: blur(12px);
    padding: 8px 8px;
  }

  .id3-tabsScroll{
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 2px;
    scroll-behavior: smooth;
    scrollbar-width: none;
  }

  .id3-tabsScroll::-webkit-scrollbar{ display:none; }

  .id3-tab{
    position: relative;
    flex: 0 0 auto;
    border: 1px solid rgba(0,0,0,.10);
    background: rgba(255,255,255,.78);
    color: rgba(17,24,39,.92);
    padding: 8px 12px;
    border-radius: 999px;
    font-weight: 950;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform .10s ease, background .18s ease, border-color .18s ease, color .18s ease;
    overflow: hidden;
  }

  .id3-tab:active{ transform: scale(.98); }

  .id3-tabText{
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
  }

  .id3-tabActive{
    color: #fff;
    border-color: rgba(255,255,255,.35);
    background: linear-gradient(135deg, var(--g1), var(--g2));
    box-shadow: 0 12px 24px rgba(255,61,141,.18);
  }

  .id3-tabGlow{
    position: absolute;
    inset: -40% -20%;
    background:
      radial-gradient(circle at 30% 30%, rgba(255,255,255,.32), transparent 55%),
      radial-gradient(circle at 70% 60%, rgba(255,255,255,.18), transparent 58%);
    transform: rotate(10deg);
    animation: glowMove 1.6s ease-in-out infinite;
    pointer-events: none;
    mix-blend-mode: overlay;
  }

  @keyframes glowMove{
    0%{ transform: translateX(-10px) rotate(10deg); opacity:.75; }
    50%{ transform: translateX(10px) rotate(10deg); opacity:1; }
    100%{ transform: translateX(-10px) rotate(10deg); opacity:.75; }
  }

  .id3-scrollArea{
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 0;
    margin: 0;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }

  .id3-view{
    width: 100%;
    animation: viewIn .22s ease-out;
  }

  @keyframes viewIn{
    from{ opacity: 0; transform: translateY(6px); }
    to{ opacity: 1; transform: translateY(0); }
  }

  @media (min-width: 980px){
    .id3-stickyWrap{
      padding: 16px 16px 0;
    }

    .id3-nav{
      border-radius: var(--radius);
      box-shadow: var(--shadow2);
      border: 1px solid rgba(255,255,255,.40);
      padding: 14px 16px;
      height: 150px;
    }

    .id3-title{ font-size: 18px; }
    .id3-sub{ max-width: none; }

    .id3-tabsBar{
      margin-top: 10px;
      border-radius: var(--radius);
      box-shadow: var(--shadow2);
      border: 1px solid rgba(255,255,255,.40);
      padding: 10px 10px;
    }

    .id3-dashBtn{ font-size: 13px; padding: 10px 14px; }

    .id3-scrollArea{
      padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
    }
  }
`;