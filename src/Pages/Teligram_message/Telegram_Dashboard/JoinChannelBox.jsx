import React, { useState, useRef } from 'react';
import { Modal, Spinner, Button } from 'react-bootstrap';
import { Link45deg, BoxArrowInRight, ShieldLock, CheckLg, Globe, LockFill } from 'react-bootstrap-icons';

const CHANNEL_PREFIX = "/api/telegramlogin-channels";
const getChannelApi = () => {
  const raw = import.meta.env.VITE_TELEGRAM_CHANNELS_API_URL || import.meta.env.VITE_TELEGRAM_USERS_API_URL || "http://localhost:5000";
  const clean = String(raw).replace(/\/$/, "");
  if (clean.endsWith(CHANNEL_PREFIX)) return clean;
  if (/\/api\/[^/]+$/i.test(clean)) return clean.replace(/\/api\/[^/]+$/i, CHANNEL_PREFIX);
  return `${clean}${CHANNEL_PREFIX}`;
};
const CHANNEL_API = getChannelApi();
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("telegram_auth_token") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";
const checkTrust = () => localStorage.getItem("telegram_trust_login_enabled") === "true";

const JoinChannelBox = ({ onChannelJoined, onOpenChannel }) => {
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [inlineErr, setInlineErr] = useState("");
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [pinModal, setPinModal] = useState({ show: false, channel: null, pin: '', err: '', loading: false });

  const inputRef = useRef(null);
  const showCenter = (m, t = 'success') => { setToast({ show: true, msg: m, type: t }); setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 2600); };

  const isValidInvite = (url) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      if (!u.protocol.startsWith('http')) return false;
      const hostOk = u.hostname.includes('t.me') || u.hostname.includes('telegram') || u.hostname.includes('localhost') || u.hostname.includes('127.0.0.1');
      const pathOk = u.pathname.length > 1 || u.search.length > 0;
      return hostOk ? pathOk : true; // allow custom invite domains too
    } catch { return false; }
  };

  const handleJoin = async () => {
    const url = inviteUrl.trim(); setInlineErr("");

    if (!url) { const m="Paste invitation link"; setInlineErr(m); showCenter(m,"danger"); return; }
    if (!isValidInvite(url)) { const m="Invalid invitation link"; setInlineErr(m); showCenter(m,"danger"); return; }

    const used = JSON.parse(localStorage.getItem("used_invites") || "[]");
    if (used.includes(url)) { const m="This invitation link has already been used."; setInlineErr(m); showCenter(m,"danger"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${CHANNEL_API}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ invite_url: url, invitation_url: url })
      });
      const data = await res.json().catch(()=>({}));

      if (res.status === 409 || (data.message && data.message.toLowerCase().includes("already"))) {
        const m="This invitation link has already been used."; setInlineErr(m); showCenter(m,"danger"); return;
      }
      if (res.status === 410 || (data.message && data.message.toLowerCase().includes("expire"))) {
        const m="Invitation link expired"; setInlineErr(m); showCenter(m,"danger"); return;
      }
      if (!res.ok) throw new Error(data.message || "Invalid invitation link");

      const channel = data.channel || data.data || data;
      if (!channel || (!channel.channel_id && !channel.id)) throw new Error("Invalid invitation link");

      localStorage.setItem("used_invites", JSON.stringify([...used, url]));
      setInviteUrl(""); setInlineErr(""); showCenter(channel.is_private || channel.type==='private' ? "Private channel joined" : "Channel joined successfully", "success");

      if (onChannelJoined) onChannelJoined(channel);

      // Private -> ask PIN before open
      const isPriv = channel.is_private || channel.type==='private' || channel.channel_type==='private';
      if (isPriv) {
        const key = `trusted_pin_${channel.channel_id || channel.id}`;
        if (checkTrust() && localStorage.getItem(key)==="true") { if(onOpenChannel) onOpenChannel(channel); }
        else { setTimeout(()=> setPinModal({ show:true, channel, pin:'', err:'', loading:false }), 300); }
      } else {
        if (onOpenChannel) onOpenChannel(channel);
      }

    } catch (e) {
      const m = e.message?.toLowerCase().includes("expire") ? "Invitation link expired" : e.message || "Invalid invitation link";
      setInlineErr(m); showCenter(m,"danger");
    } finally { setLoading(false); }
  };

  const verifyPin = async () => {
    if (!/^\d{4}$/.test(pinModal.pin)) { setPinModal(s=>({...s,err:"Enter 4-digit PIN"})); return; }
    setPinModal(s=>({...s,loading:true,err:''}));
    try{
      const res = await fetch(`${CHANNEL_API}/verify-pin`, {
        method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},
        body:JSON.stringify({ channel_id: pinModal.channel.channel_id || pinModal.channel.id, pin: pinModal.pin })
      });
      const d = await res.json().catch(()=>({})); if(!res.ok) throw new Error(d.message||"Invalid PIN");
      if (checkTrust()) localStorage.setItem(`trusted_pin_${pinModal.channel.channel_id||pinModal.channel.id}`,"true");
      setPinModal({ show:false, channel:null, pin:'', err:'', loading:false });
      showCenter("PIN verified","success");
      if(onOpenChannel) onOpenChannel(pinModal.channel);
    }catch(e){ setPinModal(s=>({...s,err:e.message||"Invalid PIN",loading:false})); }
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

      <Modal show={pinModal.show} onHide={()=>setPinModal({show:false,channel:null,pin:'',err:'',loading:false})} centered backdrop="static">
        <Modal.Header closeButton className="py-2"><Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2"><ShieldLock size={15}/> Private Channel PIN</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="small mb-2">Enter 4-digit PIN for <b>{pinModal.channel?.channel_name||pinModal.channel?.name||'Private Channel'}</b></div>
          <div className="jcr">
            <input type="password" inputMode="numeric" maxLength={4} className="jci flex text-center fw-bold" style={{letterSpacing:8,fontSize:16}} placeholder="••••" value={pinModal.pin} onChange={e=>setPinModal(s=>({...s,pin:e.target.value.replace(/\D/g,'').slice(0,4)}))} autoFocus />
            <button className="jcb" onClick={verifyPin} disabled={pinModal.loading || pinModal.pin.length!==4}>{pinModal.loading?<Spinner size="sm"/>:<CheckLg size={16}/>}</button>
          </div>
          {pinModal.err && <div className="jce mt-2">{pinModal.err}</div>}
          {checkTrust() ? <div className="small text-success mt-2">✓ Trust enabled - PIN once on this device</div> : <div className="small text-muted mt-2">Trust disabled - PIN required every time</div>}
        </Modal.Body>
      </Modal>

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