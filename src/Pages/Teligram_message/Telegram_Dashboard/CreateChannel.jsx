import React, { useState, useRef } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { Globe, LockFill, Camera, PencilFill, ShieldLock, CheckLg, PlusLg, XLg } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const CHANNEL_API = `${API_BASE}/api/telegramlogin-channels`;

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("telegram_auth_token") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";
const getDeviceId = () => {
  let id = localStorage.getItem("telegram_device_id") || localStorage.getItem("device_id");
  if (!id) {
    id = `dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`;
    localStorage.setItem("telegram_device_id", id);
    localStorage.setItem("device_id", id);
  }
  return id;
};

export default function CreateChannel({ onChannelCreated, showCenterToast }) {
  const [show, setShow] = useState(false);
  const [type, setType] = useState("public");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pin, setPin] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { showCenterToast?.("Only image allowed", "danger"); return; }
    if (f.size > 4 * 1024 * 1024) { showCenterToast?.("Max 4MB", "danger"); return; }
    setLogoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => { setName(""); setDesc(""); setPin(""); setLogoFile(null); setPreview(""); setType("public"); };

  const handleCreate = async () => {
    if (!name.trim()) { showCenterToast?.("Channel name required", "danger"); return; }
    if (type === "private" &&!/^\d{4}$/.test(pin)) { showCenterToast?.("Enter 4 digit PIN", "danger"); return; }

    setLoading(true);
    try {
      const deviceId = getDeviceId();
      const token = getToken();
      if (!token) throw new Error("Login required");

      const fd = new FormData();
      fd.append("channel_name", name.trim());
      fd.append("name", name.trim());
      fd.append("channel_description", desc.trim());
      fd.append("description", desc.trim());
      fd.append("channel_type", type);
      fd.append("type", type);
      fd.append("device_id", deviceId);
      fd.append("deviceId", deviceId);
      fd.append("created_device_id", deviceId);
      if (type === "private") {
        fd.append("security_pin", pin);
        fd.append("pin", pin);
        fd.append("private_pin", pin);
      }
      if (logoFile) fd.append("channel_logo", logoFile);

      let res = await fetch(`${CHANNEL_API}/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-device-id": deviceId,
          "x-device": deviceId,
        },
        body: fd
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`${CHANNEL_API}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-device-id": deviceId,
            "x-device": deviceId,
          },
          body: fd
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Create failed");

      const ch = data.channel || data.data || data;
      showCenterToast?.(`${type === "private"? "Private" : "Public"} channel created`, "success");

      const my = JSON.parse(localStorage.getItem("my_created_channels") || "[]");
      localStorage.setItem("my_created_channels", JSON.stringify([...my, String(ch.channel_id || ch.id)]));
      if (type === "private") localStorage.setItem(`private_pin_${ch.channel_id || ch.id}`, pin);

      reset(); setShow(false);
      onChannelCreated?.(ch);
    } catch (e) {
      showCenterToast?.(e.message || "Create failed", "danger");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="cc-wrap">
        <div className="cc-card btn-only">
          <button className="cc-open-main" onClick={() => setShow(true)}><PlusLg size={15}/> Create Channel</button>
        </div>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered dialogClassName="cc-modal-dialog" contentClassName="cc-pop">
        <div className="cc-mhead">
          <span>Create Channel</span>
          <button className="cc-x" onClick={() => setShow(false)}><XLg size={14} /></button>
        </div>
        <div className="cc-mbody">
          <div className="cc-toggle">
            <button className={`tbtn ${type === "public"? "active" : ""}`} onClick={() => setType("public")}><Globe size={14} /> Public</button>
            <button className={`tbtn ${type === "private"? "active" : ""}`} onClick={() => setType("private")}><LockFill size={12} /> Private</button>
          </div>

          <div className="logo-block">
            <div className="logo-circle" onClick={() => fileRef.current?.click()}>
              {preview? <img src={preview} alt="logo" /> : <Camera size={22} color="#94a3b8" />}
            </div>
            <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleLogo} />
            <div className="logo-below" onClick={() => fileRef.current?.click()}>
              <PencilFill size={10} /> {preview? "Change logo" : "Tap to add logo"}
            </div>
          </div>

          <div className="cc-fields">
            <input className="cc-inp" value={name} onChange={e => setName(e.target.value)} placeholder="Channel name *" maxLength={60} />
            <textarea className="cc-inp area" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} maxLength={180} />
            {type === "private" && (
              <>
                <div className="pin-head"><ShieldLock size={12} /> Private PIN - 4 digit</div>
                <div className="pin-box">
                  <ShieldLock size={14} className="pin-ico" />
                  <input className="pin-inp" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••" maxLength={4} />
                </div>
              </>
            )}
            <div className="cc-actions">
              <button className="cc-cancel" onClick={() => { reset(); setShow(false); }}>Cancel</button>
              <button className="cc-create" onClick={handleCreate} disabled={loading ||!name.trim()}>{loading? <Spinner size="sm" /> : <><CheckLg size={14} /> Create</>}</button>
            </div>
          </div>
        </div>
      </Modal>

      <style>{`
   .cc-wrap{padding:10px 12px;background:transparent}
   .cc-card{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;box-shadow:0 2px 12px rgba(15,23,42,.04)}
   .cc-card.btn-only{display:flex;justify-content:center;padding:16px}
    /* ✅ WIDTH INCREASE */
   .cc-open-main{width:min(100%, 380px);height:48px;padding:0 24px;border-radius:999px;border:none;background:#0f172a;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 16px rgba(15,23,42,.18)}
   .cc-open-main:active{transform:scale(.97)}

    /* ✅ CENTER + TOP/BOTTOM SAFE SPACE - MOBILE RESPONSIVE */
   .cc-modal-dialog{width:min(440px,94vw)!important;margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:100dvh!important;padding:16px!important}
   .cc-pop{width:100%!important;border:none!important;border-radius:20px!important;box-shadow:0 28px 80px rgba(15,23,42,.28)!important;overflow:hidden!important;background:#fff!important;display:flex!important;flex-direction:column!important;max-height:90dvh!important;margin:auto!important}
   .cc-mhead{height:54px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:800;border-bottom:1px solid #f1f5f9;flex-shrink:0;background:#fff}
   .cc-x{width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center}
   .cc-mbody{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 16px calc(18px + env(safe-area-inset-bottom));background:#fff}
   .cc-toggle{display:flex;gap:10px;justify-content:center;margin-bottom:18px}
   .tbtn{height:38px;padding:0 18px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:13px;font-weight:700;color:#475569;display:flex;align-items:center;gap:6px}
   .tbtn.active{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}.tbtn.active:last-child{background:#fef9c3;border-color:#fde68a;color:#854d0e}
   .logo-block{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:18px}
   .logo-circle{width:86px;height:86px;border-radius:50%;border:1.5px dashed #cbd5e1;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}
   .logo-circle img{width:100%;height:100%;object-fit:cover}
   .logo-below{font-size:11px;font-weight:700;color:#64748b;display:flex;align-items:center;gap:5px;cursor:pointer}
   .cc-fields{display:flex;flex-direction:column;gap:12px}
   .cc-inp{width:100%;height:44px;border:1px solid #e2e8f0;border-radius:14px;padding:0 14px;font-size:13px;font-weight:600;outline:none;background:#fff}
   .cc-inp.area{height:auto;min-height:64px;padding:12px 14px;resize:none}
   .pin-head{font-size:11px;font-weight:800;color:#334155;display:flex;align-items:center;gap:6px;margin-top:4px}
   .pin-box{height:48px;border:1px solid #fde68a;background:#fefce8;border-radius:14px;display:flex;align-items:center;justify-content:center;position:relative}
   .pin-ico{position:absolute;left:14px;color:#ca8a04;pointer-events:none}
   .pin-inp{width:100%;height:100%;border:none;outline:none;background:transparent;font-size:22px;font-weight:900;letter-spacing:10px;text-align:center!important;display:block}
   .cc-actions{display:flex;gap:10px;margin-top:6px;padding-bottom:env(safe-area-inset-bottom)}
   .cc-cancel{flex:1;height:44px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;font-weight:700}
   .cc-create{flex:1;height:44px;border-radius:12px;border:none;background:#0f172a;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px}
   .cc-create:disabled{opacity:.5}

    /* ✅ Mobile la pan center, hide nahi */
    @media(max-width:480px){
     .cc-modal-dialog{width:min(94vw, 440px)!important;max-width:94vw!important;padding:16px!important;align-items:center!important;justify-content:center!important}
     .cc-pop{border-radius:20px!important;max-height:88dvh!important;width:100%!important}
     .cc-open-main{width:100%;max-width:100%}
    }
      `}</style>
    </>
  );
}