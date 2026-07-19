import React, { useState, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { Globe, LockFill, Camera, PencilFill, ShieldLock, CheckLg, PlusLg, XLg, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'react-bootstrap-icons';
import heic2any from "heic2any";

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

export default function CreateChannel({ onChannelCreated, onChannelCreateFailed, showCenterToast }) {
  const [show, setShow] = useState(false);
  const [type, setType] = useState("public");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pin, setPin] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [logoTransform, setLogoTransform] = useState({ zoom: 1, x: 0, y: 0 });
  const [converting, setConverting] = useState(false);
  const fileRef = useRef(null);

  const handleLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = ""; // allow same file again

    if (f.size > 15 * 1024 * 1024) {
      showCenterToast?.("Max image size is 15MB", "danger");
      return;
    }

    const isHeic = f.type === "image/heic" || f.type === "image/heif" || f.type === "" || /\.heic$|\.heif$/i.test(f.name);

    try {
      setConverting(true);
      let finalFile = f;

      if (isHeic) {
        showCenterToast?.("Converting iPhone image...", "success");
        // Convert HEIC -> JPEG blob
        const convertedBlob = await heic2any({
          blob: f,
          toType: "image/jpeg",
          quality: 0.9,
        });

        // heic2any can return blob or array of blobs
        const blob = Array.isArray(convertedBlob)? convertedBlob[0] : convertedBlob;
        finalFile = new File([blob], f.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
      } else {
        // normal image check
        if (!f.type.startsWith("image/")) {
          showCenterToast?.("Please select an image file", "danger");
          return;
        }
      }

      // Create preview
      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(finalFile);
      setLogoFile(finalFile);
      setPreview(url);
      setLogoTransform({ zoom: 1, x: 0, y: 0 });
      showCenterToast?.("Logo added", "success");

    } catch (err) {
      console.error("HEIC convert error", err);
      showCenterToast?.("This HEIC image failed to convert. Try another image", "danger");
    } finally {
      setConverting(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setName(""); setDesc(""); setPin(""); setLogoFile(null); setPreview(""); setLogoTransform({ zoom: 1, x: 0, y: 0 }); setType("public");
  };

  const makePngLogo = () => new Promise((resolve, reject) => {
    if (!logoFile ||!preview) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const size = 500;
      const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d");
      context.beginPath(); context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); context.clip();
      const base = Math.max(size / image.width, size / image.height) * logoTransform.zoom;
      const width = image.width * base; const height = image.height * base;
      context.drawImage(image, (size - width) / 2 + logoTransform.x * 3, (size - height) / 2 + logoTransform.y * 3, width, height);
      canvas.toBlob(blob => blob? resolve(new File([blob], `channel-logo-${Date.now()}.png`, { type: "image/png" })) : reject(new Error("Could not prepare image")), "image/png", 0.92);
    };
    image.onerror = () => reject(new Error("This image format is not supported by this browser"));
    image.src = preview;
  });

  const handleCreate = () => {
    if (!name.trim()) { showCenterToast?.("Channel name required", "danger"); return; }
    if (type === "private" &&!/^\d{4}$/.test(pin)) { showCenterToast?.("Enter 4 digit PIN", "danger"); return; }

    const tempId = `pending_${Date.now()}`;
    const createType = type; const createName = name.trim(); const createDesc = desc.trim(); const createPin = pin;
    onChannelCreated?.({ channel_id: tempId, channel_name: createName, channel_description: createDesc, channel_type: createType, type: createType, is_private: createType === "private", logo_url: preview, channel_logo_url: preview, created_at: new Date().toISOString(), _pending: true });
    reset(); setShow(false);
    showCenterToast?.("Creating channel…", "success");

    void (async () => { try {
      const deviceId = getDeviceId();
      const token = getToken();
      if (!token) throw new Error("Login required");

      const fd = new FormData();
      fd.append("channel_name", createName);
      fd.append("name", createName);
      fd.append("channel_description", createDesc);
      fd.append("description", createDesc);
      fd.append("channel_type", createType);
      fd.append("type", createType);
      fd.append("device_id", deviceId);
      fd.append("deviceId", deviceId);
      fd.append("created_device_id", deviceId);
      if (createType === "private") {
        fd.append("security_pin", createPin);
        fd.append("pin", createPin);
        fd.append("private_pin", createPin);
      }
      // logoFile is already JPEG if it was HEIC
      // We still convert to circular PNG for final upload
      const pngLogo = await makePngLogo();
      if (pngLogo) {
        fd.append("channel_logo", pngLogo);
      } else if (logoFile) {
        // Fallback if canvas fails
        fd.append("channel_logo", logoFile);
      }

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
      showCenterToast?.(`${createType === "private"? "Private" : "Public"} channel created`, "success");

      const my = JSON.parse(localStorage.getItem("my_created_channels") || "[]");
      localStorage.setItem("my_created_channels", JSON.stringify([...my, String(ch.channel_id || ch.id)]));
      if (createType === "private") localStorage.setItem(`private_pin_${ch.channel_id || ch.id}`, createPin);
      onChannelCreated?.({...ch, _replacePendingId: tempId });
    } catch (e) {
      onChannelCreateFailed?.(tempId);
      showCenterToast?.(e.message || "Create failed", "danger");
    } })();
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
            <div className="logo-circle" onClick={() =>!converting && fileRef.current?.click()}>
              {converting? <span style={{fontSize:11, fontWeight:800}}>Converting...</span> : preview? <img src={preview} alt="logo" style={{transform:`translate(${logoTransform.x}px, ${logoTransform.y}px) scale(${logoTransform.zoom})`}} /> : <Camera size={22} color="#94a3b8" />}
            </div>
            <input ref={fileRef} type="file" hidden accept="image/*,.heic,.heif" onChange={handleLogo} />
            <div className="logo-below" onClick={() => fileRef.current?.click()}>
              <PencilFill size={10} /> {converting? "Processing..." : preview? "Change logo" : "Tap to add logo (JPG, PNG, HEIC supported)"}
            </div>
            {preview && <div className="logo-tools" aria-label="Adjust logo"><button type="button" onClick={()=>setLogoTransform(t=>({...t,zoom:Math.max(1,t.zoom-.1)}))}><ZoomOut size={13}/></button><button type="button" onClick={()=>setLogoTransform(t=>({...t,x:t.x-8}))}><ArrowLeft size={13}/></button><button type="button" onClick={()=>setLogoTransform(t=>({...t,y:t.y-8}))}><ArrowUp size={13}/></button><button type="button" onClick={()=>setLogoTransform(t=>({...t,y:t.y+8}))}><ArrowDown size={13}/></button><button type="button" onClick={()=>setLogoTransform(t=>({...t,x:t.x+8}))}><ArrowRight size={13}/></button><button type="button" onClick={()=>setLogoTransform(t=>({...t,zoom:Math.min(3,t.zoom+.1)}))}><ZoomIn size={13}/></button></div>}
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
              <button className="cc-create" onClick={handleCreate} disabled={!name.trim() || converting}><CheckLg size={14} /> Create</button>
            </div>
          </div>
        </div>
      </Modal>

      <style>{`
  .cc-wrap{padding:10px 12px;background:transparent}
  .cc-card{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;box-shadow:0 2px 12px rgba(15,23,42,.04)}
  .cc-card.btn-only{display:flex;justify-content:center;padding:16px}
  .cc-open-main{width:min(100%, 380px);height:48px;padding:0 24px;border-radius:999px;border:none;background:#0f172a;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 16px rgba(15,23,42,.18)}
  .cc-open-main:active{transform:scale(.97)}
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
  .logo-tools{display:flex;gap:5px;align-items:center}.logo-tools button{width:28px;height:28px;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#334155;display:grid;place-items:center}.logo-tools button:active{transform:scale(.92)}
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
    @media(max-width:480px){
    .cc-modal-dialog{width:min(94vw, 440px)!important;max-width:94vw!important;padding:16px!important;align-items:center!important;justify-content:center!important}
    .cc-pop{border-radius:20px!important;max-height:88dvh!important;width:100%!important}
    .cc-open-main{width:100%;max-width:100%}
    }
      `}</style>
    </>
  );
}