import React, { useState, useRef } from 'react';
import { Modal, Spinner, Button } from 'react-bootstrap';
import { Link45deg, BoxArrowInRight, ShieldLock, CheckLg, Globe, LockFill } from 'react-bootstrap-icons';

const CHANNEL_PREFIX = "/api/telegramlogin-channels";
const ALLMISS_PREFIX = "/api/telegramlogin-allmiss";
const getApi = (prefix) => {
  const raw = import.meta.env.VITE_TELEGRAM_CHANNELS_API_URL || import.meta.env.VITE_TELEGRAM_USERS_API_URL || "http://localhost:5000";
  const clean = String(raw).replace(/\/$/, "");
  if (clean.endsWith(prefix)) return clean;
  if (/\/api\/[^/]+$/i.test(clean)) return clean.replace(/\/api\/[^/]+$/i, prefix);
  return `${clean}${prefix}`;
};
const CHANNEL_API = getApi(CHANNEL_PREFIX);
const ALLMISS_API = getApi(ALLMISS_PREFIX);

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("telegram_auth_token") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };

const extractCode = (v) => {
  const t = String(v||"").trim(); if(!t) return "";
  try{ const u=new URL(t); const p=u.pathname.split("/").filter(Boolean); const j=p.indexOf("join"); if(j>=0&&p[j+1]) return p[j+1]; return p[p.length-1]||t; }catch{ const p=t.split("/").filter(Boolean); return p[p.length-1]||t; }
};

const JoinChannelBox = ({ onChannelJoined, onOpenChannel }) => {
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [inlineErr, setInlineErr] = useState("");
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const inputRef = useRef(null);
  const showCenter = (m, t = 'success') => { setToast({ show: true, msg: m, type: t }); setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 2600); };

  const isValidInvite = (url) => {
    if (!url) return false;
    try { const u = new URL(url); if (!u.protocol.startsWith('http')) return false; return true; } catch { return url.length>=6; }
  };

  const handleJoin = async () => {
    const url = inviteUrl.trim(); setInlineErr("");
    if (!url) { const m="Paste invitation link"; setInlineErr(m); showCenter(m,"danger"); return; }
    if (!isValidInvite(url)) { const m="Invalid invitation link"; setInlineErr(m); showCenter(m,"danger"); return; }

    const code = extractCode(url);
    if(!code){ const m="Invalid share code"; setInlineErr(m); showCenter(m,"danger"); return; }

    setLoading(true);
    try {
      // ✅ NEW LOGIC: hosted URL direct join - Private la PIN nako, PIN open kartana lagel
      const res = await fetch(`${ALLMISS_API}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, "x-device-id": getDeviceId() },
        body: JSON.stringify({ share_code: code, code, device_id: getDeviceId() })
      });
      const data = await res.json().catch(()=>({}));

      if (res.status === 404 || res.status === 400) {
        throw new Error(data.message || "Invalid link - check hosted URL");
      }
      // ✅ backend ne PIN magitala tari join jhalay samja - PIN open la vicharu
      if (!res.ok && res.status!==403) throw new Error(data.message || "Join failed");

      const channel = data.channel || data.data || { channel_id: data.channel_id, channel_name: data.channel_name, channel_type: data.channel_type || "public" };
      
      setInviteUrl(""); setInlineErr("");
      showCenter(channel.channel_type==='private' ? "Private channel joined - PIN takun open kara" : "Channel joined successfully", "success");

      // ✅ Real-time add
      if (onChannelJoined) onChannelJoined(channel);

    } catch (e) {
      const m = e.message?.toLowerCase().includes("expire") ? "Invitation link expired" : e.message || "Invalid invitation link";
      setInlineErr(m); showCenter(m,"danger");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="jcw">
        <div className="jcc">
          <div className="jch"><Link45deg size={14}/> Join Channel</div>
          <div className="jcr">
            <div className="jciw">
              <Link45deg size={14} className="jci-ic"/>
              <input ref={inputRef} value={inviteUrl} onChange={e=>{setInviteUrl(e.target.value); setInlineErr("");}} onKeyDown={e=>e.key==='Enter'&&handleJoin()} placeholder="Paste invitation link (https://t.me/+...)" className="jci" />
            </div>
            <button className="jcb" onClick={handleJoin} disabled={loading}>{loading ? <Spinner size="sm"/> : <><BoxArrowInRight size={13}/> Join</>}</button>
          </div>
          {inlineErr && <div className="jce">{inlineErr}</div>}
        </div>
      </div>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.type}`}><span className="jti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
       .jcw{padding:10px 10px 8px;background:#f8fafc}.jcc{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;box-shadow:0 2px 12px rgba(15,23,42,.05);animation:jcIn .32s ease}
       .jch{font-size:11px;font-weight:900;letter-spacing:.3px;color:#0f172a;display:flex;align-items:center;gap:6px;margin-bottom:8px}
       .jcr{display:flex;gap:8px;align-items:center;width:100%}.jciw{flex:1;position:relative;display:flex;min-width:0}.jci-ic{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none}
       .jci{width:100%;height:36px;border:1px solid #dbe2f0;border-radius:10px;padding:0 12px 0 32px;font-size:13px;font-weight:600;outline:none;min-width:0;background:#fff;transition:.15s}.jci:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
       .jcb{height:36px;padding:0 16px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;box-shadow:0 4px 12px rgba(37,99,235,.22);transition:.2s}.jcb:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(37,99,235,.32)}.jcb:active{transform:scale(.97)}.jcb:disabled{opacity:.6}
       .jce{margin-top:8px;font-size:11.5px;font-weight:700;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:7px 10px;animation:shake .28s ease}
       .flex{flex:1}.jtc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:none;padding:20px}.jtt{display:flex;gap:8px;align-items:center;min-width:180px;max-width:320px;padding:12px 16px;border-radius:12px;color:#fff;font-size:13px;font-weight:800;box-shadow:0 14px 32px rgba(0,0,0,.24);animation:pop .32s cubic-bezier(.16,1,.3,1);pointer-events:auto;text-align:center;justify-content:center}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)}.jti{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0}
       @keyframes jcIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{from{opacity:0;transform:scale(.86) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
       @media(max-width:480px){.jci{font-size:12.5px}.jcb{padding:0 12px}}
      `}</style>
    </>
  );
};

export default JoinChannelBox;