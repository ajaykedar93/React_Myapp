import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Gettag_transaction from "./Gettag_transaction";
import Addtog_transaction from "./Addtog_transaction";
import Tag_catsub from "./Tag_catsub";
import PasswordManager from "./PasswordManager";
import GetPassword from "./GetPassword";
import UserInvestment from "./UserInvestments";

import InvoiceBill from "./Invoice_bill";
import GetInvoice from "./Get_invoice";

export default function TryNewPageTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("get_transaction");

  useEffect(() => {
    const id = "new-project-dashboard-tabs-v17";
    if (document.getElementById(id)) return;

    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      *{
        box-sizing:border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        overflow-x: hidden;
      }

      body{
        background:#f8fafc;
        font-family: Inter, "Segoe UI", sans-serif;
      }

      #root {
        width: 100%;
        min-height: 100vh;
      }

      :root{
        --tnpA:#0f172a;
        --tnpB:#1e293b;
        --tnpC:#334155;

        --tabMain1:#14b8a6;
        --tabMain2:#22c55e;
        --tabMain3:#8b5cf6;

        --tabTran1:#2563eb;
        --tabTran2:#06b6d4;
        --tabTran3:#7c3aed;

        --tabCat1:#f97316;
        --tabCat2:#ef4444;
        --tabCat3:#8b5cf6;

        --tabPass1:#0ea5e9;
        --tabPass2:#3b82f6;
        --tabPass3:#6366f1;

        --tabGetPass1:#10b981;
        --tabGetPass2:#14b8a6;
        --tabGetPass3:#06b6d4;

        --tabInvest1:#f59e0b;
        --tabInvest2:#f97316;
        --tabInvest3:#ef4444;

        --tabInvoice1:#7c3aed;
        --tabInvoice2:#ec4899;
        --tabInvoice3:#f97316;

        --tabGetInvoice1:#0f766e;
        --tabGetInvoice2:#2563eb;
        --tabGetInvoice3:#7c3aed;

        --tabTelegram1:#229ed9;
        --tabTelegram2:#2563eb;
        --tabTelegram3:#7c3aed;

        --line:#e2e8f0;
        --ink:#0f172a;
      }

      .tnp-page{
        min-height:100vh;
        width:100%;
        display:flex;
        flex-direction:column;
        background:
          radial-gradient(circle at top left, rgba(59,130,246,.08), transparent 28%),
          radial-gradient(circle at top right, rgba(168,85,247,.08), transparent 30%),
          linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        color:var(--ink);
      }

      .tnp-navbar{
        position:sticky;
        top:0;
        z-index:1200;
        width:100%;
        background:linear-gradient(135deg,var(--tnpA),var(--tnpB),var(--tnpC));
        border-bottom:1px solid rgba(255,255,255,.08);
        box-shadow:0 10px 30px rgba(15,23,42,.16);
        padding-top:max(env(safe-area-inset-top,0px),10px);
      }

      .tnp-nav-inner{
        width:100%;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:18px;
        padding:22px 18px 22px;
        min-height:96px;
      }

      .tnp-left{
        display:flex;
        align-items:flex-start;
        gap:14px;
        min-width:0;
        flex:1;
      }

      .tnp-title-wrap{
        display:flex;
        align-items:flex-start;
        gap:14px;
        min-width:0;
        width:100%;
      }

      .tnp-mark{
        width:13px;
        height:13px;
        border-radius:999px;
        flex-shrink:0;
        margin-top:6px;
        background:linear-gradient(135deg,#22c55e,#06b6d4);
        box-shadow:
          0 0 0 6px rgba(34,197,94,.15),
          0 0 18px rgba(6,182,212,.24);
      }

      .tnp-title-block{
        min-width:0;
        width:100%;
      }

      .tnp-title{
        color:#fff;
        font-size:24px;
        line-height:1.2;
        font-weight:1000;
        letter-spacing:.2px;
        white-space:normal;
        word-break:break-word;
        margin:0;
      }

      .tnp-subtitle{
        margin-top:6px;
        color:rgba(255,255,255,.72);
        font-size:12px;
        font-weight:700;
        line-height:1.5;
      }

      .tnp-right{
        display:flex;
        align-items:center;
        justify-content:flex-end;
        flex-shrink:0;
      }

      .tnp-back{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        min-height:34px;
        padding:7px 14px;
        font-size:11.5px;
        line-height:1;
        border-radius:10px;
        font-weight:900;
        letter-spacing:.2px;
        background:rgba(255,255,255,.10)!important;
        border:1px solid rgba(255,255,255,.18)!important;
        color:#fff!important;
        box-shadow:0 8px 20px rgba(0,0,0,.14);
        transition:all .2s ease;
        white-space:nowrap;
      }

      .tnp-back:hover{
        transform:translateY(-1px);
        background:rgba(255,255,255,.16)!important;
      }

      .tnp-back:active{
        transform:scale(.96);
      }

      .tnp-main{
        flex:1;
        width:100%;
        display:flex;
        flex-direction:column;
        padding:0;
        margin:0;
      }

      .tnp-tabsbar{
        width:100%;
        background:rgba(255,255,255,.88);
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
        border-bottom:1px solid var(--line);
        box-shadow:0 6px 18px rgba(15,23,42,.04);
      }

      .tnp-tabs-scroll{
        width:100%;
        overflow-x:auto;
        overflow-y:hidden;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;
        padding:12px 0;
      }

      .tnp-tabs-scroll::-webkit-scrollbar{
        display:none;
      }

      .tnp-tabs{
        display:flex;
        flex-wrap:nowrap;
        gap:10px;
        width:max-content;
        min-width:100%;
        padding:0 14px 0 14px;
      }

      .tnp-tabs::after{
        content:"";
        display:block;
        min-width:18px;
        height:1px;
        flex-shrink:0;
      }

      .tnp-tabbtn{
        min-height:42px;
        padding:10px 16px;
        border-radius:14px;
        border:1px solid #dbe3ee;
        background:linear-gradient(180deg,#ffffff,#f8fafc);
        color:#0f172a;
        font-size:12.5px;
        font-weight:1000;
        letter-spacing:.15px;
        white-space:nowrap;
        cursor:pointer;
        box-shadow:0 8px 18px rgba(15,23,42,.05);
        transition:all .2s ease;
      }

      .tnp-tabbtn:hover{
        transform:translateY(-1px);
        box-shadow:0 12px 24px rgba(15,23,42,.07);
      }

      .tnp-tabbtn:active{
        transform:scale(.97);
      }

      .tnp-tabbtn.active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabMain1),var(--tabMain2),var(--tabMain3));
        box-shadow:0 14px 28px rgba(34,197,94,.18);
      }

      .tnp-tabbtn.transaction-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabTran1),var(--tabTran2),var(--tabTran3));
        box-shadow:0 14px 28px rgba(37,99,235,.18);
      }

      .tnp-tabbtn.catsub-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabCat1),var(--tabCat2),var(--tabCat3));
        box-shadow:0 14px 28px rgba(249,115,22,.18);
      }

      .tnp-tabbtn.password-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabPass1),var(--tabPass2),var(--tabPass3));
        box-shadow:0 14px 28px rgba(59,130,246,.18);
      }

      .tnp-tabbtn.getpassword-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabGetPass1),var(--tabGetPass2),var(--tabGetPass3));
        box-shadow:0 14px 28px rgba(16,185,129,.18);
      }

      .tnp-tabbtn.investment-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabInvest1),var(--tabInvest2),var(--tabInvest3));
        box-shadow:0 14px 28px rgba(245,158,11,.18);
      }

      .tnp-tabbtn.invoice-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabInvoice1),var(--tabInvoice2),var(--tabInvoice3));
        box-shadow:0 14px 28px rgba(236,72,153,.18);
      }

      .tnp-tabbtn.telegram-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabTelegram1),var(--tabTelegram2),var(--tabTelegram3));
        box-shadow:0 14px 28px rgba(34,158,217,.20);
      }

      .tnp-tabbtn.getinvoice-active{
        color:#fff;
        border-color:transparent;
        background:linear-gradient(135deg,var(--tabGetInvoice1),var(--tabGetInvoice2),var(--tabGetInvoice3));
        box-shadow:0 14px 28px rgba(37,99,235,.18);
      }

      .tnp-tabline{
        width:100%;
        height:1px;
        background:linear-gradient(
          90deg,
          transparent 0%,
          rgba(148,163,184,.3) 12%,
          rgba(148,163,184,.55) 50%,
          rgba(148,163,184,.3) 88%,
          transparent 100%
        );
      }

      .tnp-content{
        width:100%;
        flex:1;
        padding:0 !important;
        margin:0 !important;
        padding-bottom:20px !important;
      }

      .tnp-content > *{
        width:100%;
        max-width:100%;
        padding:0 !important;
        margin:0 !important;
      }

      .tnp-content .container,
      .tnp-content .container-fluid,
      .tnp-content .row{
        margin:0 !important;
      }

      @media (max-width: 767.98px){
        .tnp-nav-inner{
          flex-direction:column;
          align-items:flex-start;
          justify-content:flex-start;
          gap:12px;
          padding:18px 12px 20px;
          min-height:118px;
        }

        .tnp-left{
          width:100%;
          flex-direction:column;
          gap:12px;
        }

        .tnp-right{
          width:100%;
          justify-content:flex-start;
          order:1;
        }

        .tnp-title-wrap{
          order:2;
          width:100%;
          align-items:flex-start;
        }

        .tnp-back{
          padding:6px 11px;
          font-size:11px;
          min-height:31px;
          border-radius:9px;
        }

        .tnp-title{
          font-size:20px;
          white-space:normal;
          word-break:break-word;
        }

        .tnp-subtitle{
          font-size:10.5px;
          margin-top:5px;
        }

        .tnp-mark{
          width:11px;
          height:11px;
          margin-top:5px;
        }

        .tnp-tabs-scroll{
          padding:10px 0;
        }

        .tnp-tabs{
          padding:0 10px 0 10px;
          gap:8px;
        }

        .tnp-tabs::after{
          min-width:14px;
        }

        .tnp-tabbtn{
          min-height:40px;
          padding:9px 14px;
          font-size:12px;
          border-radius:13px;
        }

        .tnp-main{
          padding-bottom:90px;
        }

        .tnp-content{
          padding-bottom:120px !important;
        }

        .tnp-content > *{
          padding-bottom:40px !important;
        }
      }

      @media (min-width: 768px){
        .tnp-nav-inner{
          flex-direction:row;
          align-items:center;
          justify-content:space-between;
          padding:22px 22px 22px;
          min-height:100px;
        }

        .tnp-left{
          flex-direction:row;
          align-items:flex-start;
          gap:14px;
        }

        .tnp-right{
          justify-content:flex-end;
        }

        .tnp-title{
          font-size:24px;
        }

        .tnp-subtitle{
          font-size:12px;
        }

        .tnp-back{
          font-size:11.3px;
          padding:7px 13px;
          min-height:33px;
        }

        .tnp-tabs{
          padding:0 20px 0 20px;
        }

        .tnp-tabs::after{
          min-width:20px;
        }

        .tnp-tabbtn{
          font-size:12.8px;
        }
      }

      @media (min-width: 1200px){
        .tnp-nav-inner{
          padding-left:26px;
          padding-right:26px;
          min-height:104px;
        }

        .tnp-title{
          font-size:26px;
        }

        .tnp-subtitle{
          font-size:12.5px;
        }

        .tnp-tabs{
          padding:0 24px 0 24px;
        }

        .tnp-tabs::after{
          min-width:24px;
        }
      }
    `;
    document.head.appendChild(s);

    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, []);

  return (
    <div className="tnp-page">
      <header className="tnp-navbar">
        <div className="tnp-nav-inner">
          <div className="tnp-left">
            <div className="tnp-title-wrap">
              <div className="tnp-mark" />
              <div className="tnp-title-block">
                <div className="tnp-title">New Project Dashboard</div>
                <div className="tnp-subtitle">
                  Modern responsive tabs with full screen professional page layout
                </div>
              </div>
            </div>
          </div>

          <div className="tnp-right">
            <button
              type="button"
              className="btn tnp-back"
              onClick={() => navigate("/new-features")}
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main className="tnp-main">
        <div className="tnp-tabsbar">
          <div className="tnp-tabs-scroll">
            <div className="tnp-tabs">
              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "tag_transaction" ? "transaction-active" : ""
                }`}
                onClick={() => setActiveTab("tag_transaction")}
              >
                Transaction
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "get_transaction" ? "active" : ""
                }`}
                onClick={() => setActiveTab("get_transaction")}
              >
                Get Transaction
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "tag_catsub" ? "catsub-active" : ""
                }`}
                onClick={() => setActiveTab("tag_catsub")}
              >
                Tag CatSub Manage
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "add_password" ? "password-active" : ""
                }`}
                onClick={() => setActiveTab("add_password")}
              >
                Add Password
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "get_password" ? "getpassword-active" : ""
                }`}
                onClick={() => setActiveTab("get_password")}
              >
                Get Password
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "investment_manage" ? "investment-active" : ""
                }`}
                onClick={() => setActiveTab("investment_manage")}
              >
                Investment Manage
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "invoice_bill" ? "invoice-active" : ""
                }`}
                onClick={() => setActiveTab("invoice_bill")}
              >
                Invoice
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "get_invoice" ? "getinvoice-active" : ""
                }`}
                onClick={() => setActiveTab("get_invoice")}
              >
                GET Invoice
              </button>

              <button
                type="button"
                className={`tnp-tabbtn ${
                  activeTab === "telegram" ? "telegram-active" : ""
                }`}
                onClick={() => navigate("/teligram-channels")}
                title="Open Telegram Channels"
                aria-label="Open Telegram Channels"
              >
                Telegram
              </button>
            </div>
          </div>

          <div className="tnp-tabline"></div>
        </div>

        <div className="tnp-content">
          {activeTab === "get_transaction" && <Gettag_transaction />}
          {activeTab === "tag_transaction" && <Addtog_transaction />}
          {activeTab === "tag_catsub" && <Tag_catsub />}
          {activeTab === "add_password" && <PasswordManager />}
          {activeTab === "get_password" && <GetPassword />}
          {activeTab === "investment_manage" && <UserInvestment />}
          {activeTab === "invoice_bill" && <InvoiceBill />}
          {activeTab === "get_invoice" && <GetInvoice />}
        </div>
      </main>
    </div>
  );
}