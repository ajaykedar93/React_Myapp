// src/pages/PasswordManager.jsx
import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";

const BASE_URL = "https://express-backend-myapp.onrender.com/api/password-manager";
const TYPES = ["app", "website", "email", "mobile", "screen", "cloud", "document", "private_lock", "other"];

function initForm() {
  return { type: "app", name: "", username: "", password: "", additional_info: "" };
}

export default function PasswordManager() {
  const [form, setForm] = useState(initForm());
  const [busy, setBusy] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const id = "pm-clean-style-v3";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      :root{
        --ink:#0f172a;
        --muted:#64748b;
        --line:rgba(15,23,42,.08);

        --c1:#2563eb;
        --c2:#06b6d4;
        --c3:#8b5cf6;

        --bg1:#f8fbff;
        --bg2:#f4f8ff;
        --bg3:#f9fbff;

        --shadow:0 14px 32px rgba(15,23,42,.08);
        --shadow-soft:0 8px 22px rgba(37,99,235,.16);
      }

      html, body {
        margin:0;
        padding:0;
        width:100%;
        max-width:100%;
        overflow-x:hidden;
      }

      *{
        box-sizing:border-box;
        min-width:0;
      }

      body{
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color:var(--ink);
      }

      .pm-page{
        min-height:100dvh;
        width:100%;
        padding:10px;
        background:
          radial-gradient(circle at top left, rgba(37,99,235,.14), transparent 28%),
          radial-gradient(circle at top right, rgba(139,92,246,.12), transparent 28%),
          linear-gradient(180deg, var(--bg1), var(--bg2), var(--bg3));
      }

      .pm-shell{
        width:100%;
        max-width:980px;
        margin:0 auto;
      }

      .pm-header{
        display:flex;
        align-items:center;
        gap:12px;
        background:rgba(255,255,255,.92);
        border:1px solid rgba(255,255,255,.7);
        border-radius:22px;
        box-shadow:var(--shadow);
        padding:16px;
        margin-bottom:14px;
        backdrop-filter:blur(10px);
      }

      .pm-logo{
        width:50px;
        height:50px;
        border-radius:16px;
        flex:0 0 auto;
        display:grid;
        place-items:center;
        background:linear-gradient(135deg,var(--c1),var(--c2),var(--c3));
        color:#fff;
        font-size:1.2rem;
        box-shadow:0 12px 28px rgba(37,99,235,.22);
      }

      .pm-title{
        margin:0;
        font-size:1.1rem;
        font-weight:900;
        line-height:1.15;
        background:linear-gradient(90deg,var(--c1),var(--c2),var(--c3));
        -webkit-background-clip:text;
        background-clip:text;
        color:transparent;
      }

      .pm-card{
        background:rgba(255,255,255,.95);
        border:1px solid var(--line);
        border-radius:22px;
        box-shadow:var(--shadow);
        overflow:hidden;
      }

      .pm-card-top{
        padding:15px 16px 10px;
        border-bottom:1px solid rgba(15,23,42,.05);
      }

      .pm-card-title{
        margin:0;
        font-size:1rem;
        font-weight:800;
        color:#0f172a;
      }

      .pm-card-body{
        padding:16px;
      }

      .pm-label{
        font-size:.8rem;
        font-weight:700;
        color:#334155;
        margin-bottom:6px;
      }

      .pm-input,
      .pm-select,
      .pm-textarea{
        border-radius:14px !important;
        border:1px solid rgba(148,163,184,.34) !important;
        background:linear-gradient(180deg,#ffffff,#f8fbff) !important;
        color:#0f172a !important;
        font-size:.92rem;
        padding:.72rem .9rem !important;
        box-shadow:none !important;
        transition:border-color .18s ease, box-shadow .18s ease, transform .08s ease;
      }

      .pm-input:focus,
      .pm-select:focus,
      .pm-textarea:focus{
        border-color:rgba(37,99,235,.45) !important;
        box-shadow:0 0 0 .22rem rgba(37,99,235,.10) !important;
        background:#fff !important;
      }

      .pm-textarea{
        min-height:110px;
        resize:vertical;
      }

      .pm-actions{
        display:flex;
        flex-direction:column;
        gap:10px;
        margin-top:16px;
      }

      .pm-btn{
        width:100%;
        border:none;
        border-radius:14px;
        padding:.84rem 1rem;
        font-size:.92rem;
        font-weight:800;
        position:relative;
        overflow:hidden;
        transition:transform .14s ease, box-shadow .18s ease, filter .18s ease;
      }

      .pm-btn:before{
        content:"";
        position:absolute;
        inset:0;
        background:linear-gradient(90deg, rgba(255,255,255,.16), rgba(255,255,255,0));
        transform:translateX(-100%);
        transition:transform .35s ease;
      }

      .pm-btn:hover:before{
        transform:translateX(100%);
      }

      .pm-btn:hover{
        transform:translateY(-1px);
      }

      .pm-btn:active{
        transform:scale(.97);
      }

      .pm-btn:disabled{
        opacity:.75;
        transform:none;
      }

      .pm-btn-main{
        background:linear-gradient(135deg,var(--c1),var(--c2),var(--c3));
        color:#fff;
        box-shadow:var(--shadow-soft);
      }

      .pm-btn-main:hover{
        filter:brightness(1.03);
        box-shadow:0 12px 26px rgba(37,99,235,.22);
      }

      .pm-btn-reset{
        background:linear-gradient(180deg,#ffffff,#f8fafc);
        color:#1e293b;
        border:1px solid rgba(148,163,184,.24);
        box-shadow:0 8px 18px rgba(15,23,42,.04);
      }

      .pm-btn-reset:hover{
        background:#f8fbff;
      }

      .overlay-backdrop{
        position:fixed;
        inset:0;
        z-index:2000;
        display:grid;
        place-items:center;
        background:rgba(255,255,255,.74);
        backdrop-filter:blur(4px);
        padding:16px;
      }

      .overlay-card{
        min-width:240px;
        max-width:92vw;
        border:1px solid rgba(15,23,42,.10);
        border-radius:18px;
        background:#fff;
        padding:18px;
        text-align:center;
        box-shadow:0 20px 40px rgba(15,23,42,.14);
      }

      .center-msg{
        position:fixed;
        inset:0;
        z-index:2100;
        display:grid;
        place-items:center;
        background:rgba(15,23,42,.22);
        padding:16px;
      }

      .center-msg .card{
        width:min(100%, 340px);
        position:relative;
        border-radius:18px;
        background:#fff;
        padding:18px 18px 16px;
        box-shadow:0 18px 40px rgba(15,23,42,.18);
        animation:scaleIn .2s ease both;
        border:none;
      }

      .center-msg .card.success{
        border:2px solid rgba(34,197,94,.34);
      }

      .center-msg .card.error{
        border:2px solid rgba(239,68,68,.34);
      }

      .pm-msg-title{
        font-size:1rem;
        font-weight:800;
        margin-bottom:6px;
        color:#0f172a;
      }

      .pm-msg-text{
        font-size:.88rem;
        color:#64748b;
        line-height:1.45;
      }

      .close-btn{
        border:none;
        background:transparent;
        font-size:1.15rem;
        position:absolute;
        top:8px;
        right:10px;
        color:#64748b;
        line-height:1;
      }

      @keyframes scaleIn{
        from{ transform:scale(.95); opacity:0; }
        to{ transform:scale(1); opacity:1; }
      }

      @media (min-width:768px){
        .pm-page{
          padding:18px;
        }

        .pm-title{
          font-size:1.45rem;
        }

        .pm-card-top{
          padding:18px 20px 12px;
        }

        .pm-card-body{
          padding:20px;
        }

        .pm-actions{
          flex-direction:row;
          justify-content:flex-end;
        }

        .pm-btn{
          width:auto;
          min-width:150px;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    document.body.style.overflow = busy || overlayMsg.show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [busy, overlayMsg.show]);

  const showCenterMsg = (type, text, ms = 1800) => {
    setOverlayMsg({ show: true, type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setOverlayMsg({ show: false, type: "", text: "" });
    }, ms);
  };

  const closeCenterMsg = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setOverlayMsg({ show: false, type: "", text: "" });
  };

  const save = async () => {
    setBusy(true);
    try {
      if (!form.name.trim()) {
        showCenterMsg("error", "Name is required");
        return;
      }

      if (!form.password?.toString().length) {
        showCenterMsg("error", "Password / PIN is required");
        return;
      }

      const payload = {
        ...form,
        additional_info: String(form.additional_info ?? ""),
      };

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to save");
      }

      showCenterMsg("success", json?.message || "Added successfully");
      setForm(initForm());
    } catch (e) {
      showCenterMsg("error", e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setForm(initForm());
  };

  return (
    <div className="pm-page">
      <div className="pm-shell">
        <div className="pm-header">
          <div className="pm-logo">🔐</div>
          <h2 className="pm-title">Password Manager</h2>
        </div>

        <div className="pm-card">
          <div className="pm-card-top">
            <h5 className="pm-card-title">Add Entry</h5>
          </div>

          <div className="pm-card-body">
            <div className="row g-3">
              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label pm-label">Type</label>
                <select
                  className="form-select pm-select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label pm-label">Name</label>
                <input
                  className="form-control pm-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Gmail, Netflix"
                />
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label pm-label">Username</label>
                <input
                  className="form-control pm-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label pm-label">Password</label>
                <input
                  className="form-control pm-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>

              <div className="col-12">
                <label className="form-label pm-label">Info</label>
                <textarea
                  className="form-control pm-textarea"
                  rows="4"
                  value={form.additional_info}
                  onChange={(e) =>
                    setForm({ ...form, additional_info: e.target.value })
                  }
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="pm-actions">
              <button
                type="button"
                className="pm-btn pm-btn-reset"
                onClick={resetForm}
                disabled={busy}
              >
                Reset
              </button>

              <button
                type="button"
                className="pm-btn pm-btn-main"
                onClick={save}
                disabled={busy}
              >
                {busy ? "Saving..." : "Add Password"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {busy && (
        <div className="overlay-backdrop">
          <div className="overlay-card d-flex flex-column align-items-center gap-2">
            <LoadingSpiner />
            <div className="text-muted small">Working...</div>
          </div>
        </div>
      )}

      {overlayMsg.show && (
        <div
          className="center-msg"
          onClick={(e) => {
            if (e.target.classList.contains("center-msg")) closeCenterMsg();
          }}
        >
          <div className={`card ${overlayMsg.type === "error" ? "error" : "success"}`}>
            <button
              className="close-btn"
              onClick={closeCenterMsg}
              aria-label="Close"
              type="button"
            >
              ×
            </button>

            <div className="pm-msg-title">
              {overlayMsg.type === "error" ? "Error" : "Success"}
            </div>
            <div className="pm-msg-text">{overlayMsg.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}