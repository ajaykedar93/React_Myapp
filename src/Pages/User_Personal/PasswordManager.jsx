// src/pages/PasswordManager.jsx
import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx"; // your spinner

const BASE_URL = "http://localhost:5000/api/password-manager";
const TYPES = ["app", "website", "email", "mobile", "screen", "cloud", "document", "private_lock", "other"];

function initForm() {
  return { type: "app", name: "", username: "", password: "", additional_info: "" };
}

export default function PasswordManager() {
  const [form, setForm] = useState(initForm());
  const [busy, setBusy] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState({ show: false, type: "", text: "" });
  const toastTimerRef = useRef(null);

  // ===== Global styles =====
  useEffect(() => {
    const id = "pm-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      :root {
        --ink:#0b1221; --muted:#6b7280; --border:rgba(15,23,42,.12);
        --accent1:#06b6d4; --accent2:#22c55e; --accent3:#a78bfa;
        --shadow:0 12px 32px rgba(0,0,0,.08);
      }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .page-wrap {
        min-height:100vh;
        background:
          radial-gradient(1200px 600px at -10% -10%, rgba(6,182,212,0.18), transparent 60%),
          radial-gradient(1200px 600px at 110% -10%, rgba(34,197,94,0.16), transparent 60%),
          linear-gradient(180deg,#ffffff 0%,#fcfffb 45%,#f7fbff 100%);
        color:var(--ink);
      }
      .header {
        display:flex; justify-content:space-between; align-items:center;
        background:white; border-radius:18px; box-shadow:var(--shadow);
        padding:16px 24px; margin-bottom:24px;
      }
      .title {
        font-weight:800;
        font-size:1.8rem;
        background:linear-gradient(90deg,var(--accent1),var(--accent2),var(--accent3));
        -webkit-background-clip:text;
        background-clip:text;
        color:transparent;
        letter-spacing:0.3px;
        margin:0;
      }
      .subtitle {
        color:var(--muted);
        font-size:.9rem;
      }
      .form-card {
        background:#fff; border-radius:18px; box-shadow:var(--shadow);
        border:1px solid var(--border); padding:24px;
      }
      .btn-accent {
        border:none; border-radius:12px;
        background:linear-gradient(90deg,var(--accent2),var(--accent1));
        color:#05212a; font-weight:600;
        box-shadow:0 8px 20px -6px rgba(6,182,212,.4);
        transition:transform .2s ease, box-shadow .2s ease;
      }
      .btn-accent:hover {
        transform:translateY(-2px);
        box-shadow:0 12px 28px -6px rgba(6,182,212,.5);
      }
      .overlay-backdrop {
        position:fixed; inset:0; z-index:2000; display:grid; place-items:center;
        background:rgba(255,255,255,.72); backdrop-filter:blur(2px);
      }
      .overlay-card {
        min-width:260px; max-width:92vw;
        border:1px solid var(--border); border-radius:16px;
        background:#fff; padding:18px;
        text-align:center; box-shadow:var(--shadow);
      }
      .center-msg {
        position:fixed; inset:0; z-index:2100; display:grid; place-items:center;
        background:rgba(0,0,0,.2);
      }
      .center-msg .card {
        border-radius:16px; background:#fffdf7; padding:20px;
        box-shadow:var(--shadow); animation:scaleIn .25s ease both;
      }
      .center-msg .card.success { border:2px solid rgba(34,197,94,.45); }
      .center-msg .card.error { border:2px solid rgba(239,68,68,.45); }
      .center-msg button.close-btn {
        border:none; background:transparent; font-size:1.2rem; position:absolute; top:8px; right:10px;
        color:#64748b;
      }
      @keyframes scaleIn { from { transform:scale(.95); opacity:0; } to { transform:scale(1); opacity:1; } }
    `;
    document.head.appendChild(style);
  }, []);

  // ===== Lock scroll =====
  useEffect(() => {
    document.body.style.overflow = (busy || overlayMsg.show) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [busy, overlayMsg.show]);

  const showCenterMsg = (type, text, ms = 1800) => {
    setOverlayMsg({ show: true, type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setOverlayMsg({ show: false, type: "", text: "" }), ms);
  };

  const closeCenterMsg = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setOverlayMsg({ show: false, type: "", text: "" });
  };

  const save = async () => {
    setBusy(true);
    try {
      if (!form.name.trim()) { showCenterMsg("error", "Name is required"); return; }
      if (!form.password?.toString().length) { showCenterMsg("error", "Password / PIN is required"); return; }

      const payload = { ...form, additional_info: String(form.additional_info ?? "") };
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save");

      showCenterMsg("success", json?.message || "Added!");
      setForm(initForm());
    } catch (e) {
      showCenterMsg("error", e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-xxl py-4 page-wrap">
      {/* Header */}
      <div className="header">
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(180deg,#06b6d4,#22c55e)",
              display: "grid",
              placeItems: "center",
              color: "#05212a",
              fontWeight: 800,
              fontSize: "1.2rem",
            }}
          >
            🔐
          </div>
          <div>
            <h2 className="title">Password Manager</h2>
            <div className="subtitle">Add your credentials securely — fast, clean, and modern UI.</div>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="form-card">
        <h5 className="fw-bold mb-3">Add New Entry</h5>
        <div className="row g-3">
          <div className="col-md-3 col-sm-6">
            <label className="form-label">Type</label>
            <select
              className="form-select"
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
          <div className="col-md-3 col-sm-6">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Gmail, Netflix"
            />
          </div>
          <div className="col-md-3 col-sm-6">
            <label className="form-label">Username / Email</label>
            <input
              className="form-control"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="col-md-3 col-sm-6">
            <label className="form-label">Password / PIN</label>
            <input
              className="form-control"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter or paste"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Additional Info</label>
            <textarea
              className="form-control"
              rows="2"
              value={form.additional_info}
              onChange={(e) =>
                setForm({ ...form, additional_info: e.target.value })
              }
              placeholder="Optional notes (URL, hint, device, etc.)"
            />
          </div>
        </div>

        <div className="mt-4 d-flex justify-content-end">
          <button className="btn btn-accent px-4 py-2" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Add Password"}
          </button>
        </div>
      </div>

      {/* Busy overlay */}
      {busy && (
        <div className="overlay-backdrop">
          <div className="overlay-card d-flex flex-column align-items-center gap-2">
            <LoadingSpiner />
            <div className="text-muted">Working…</div>
          </div>
        </div>
      )}

      {/* Centered Toast */}
      {overlayMsg.show && (
        <div
          className="center-msg"
          onClick={(e) => {
            if (e.target.classList.contains("center-msg")) closeCenterMsg();
          }}
        >
          <div
            className={`card position-relative ${
              overlayMsg.type === "error" ? "error" : "success"
            }`}
          >
            <button
              className="close-btn"
              onClick={closeCenterMsg}
              aria-label="Close"
            >
              ×
            </button>
            <h6 className="fw-bold mb-1">
              {overlayMsg.type === "error" ? "Error" : "Success"}
            </h6>
            <div className="text-muted">{overlayMsg.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
