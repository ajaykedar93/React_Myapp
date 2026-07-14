import React, { useState, useRef } from 'react';
import { Modal, Spinner, Button } from 'react-bootstrap';
import { PlusLg, Globe, LockFill, Camera, CheckLg, ShieldLock } from 'react-bootstrap-icons';

const CHANNEL_PREFIX = "/api/telegramlogin-channels";
const getChannelApi = () => {
  const raw = import.meta.env.VITE_TELEGRAM_CHANNELS_API_URL || import.meta.env.VITE_TELEGRAM_USERS_API_URL || "http://localhost:5000";
  const clean = String(raw).replace(/\/$/, "");
  if (clean.endsWith(CHANNEL_PREFIX)) return clean;
  if (/\/api\/[^/]+$/i.test(clean)) return clean.replace(/\/api\/[^/]+$/i, CHANNEL_PREFIX);
  return `${clean}${CHANNEL_PREFIX}`;
};
const CHANNEL_API = getChannelApi();
const API_ORIGIN = CHANNEL_API.replace(CHANNEL_PREFIX, "");
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("telegram_auth_token") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";

// AUTO DEVICE ID - user never enters
const getDeviceId = () => {
  let id = localStorage.getItem("telegram_device_id") || localStorage.getItem("device_id") || localStorage.getItem("x-device-id");
  if (!id) {
    id = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `dev_${Math.random().toString(36).slice(2,11)}${Date.now().toString(36)}`;
    localStorage.setItem("telegram_device_id", id);
    localStorage.setItem("device_id", id);
  }
  return id;
};
const checkTrust = () => localStorage.getItem("telegram_trust_login_enabled") === "true";

const CreateChannel = ({ onChannelCreated, showCenterToast }) => {
  const [show, setShow] = useState(false);
  const [type, setType] = useState('public'); // public | private
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pin, setPin] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPrev, setLogoPrev] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState({ show:false, msg:'', t:'success' });

  const fileRef = useRef(null);
  const toastC = (m,t='success')=>{ setToast({show:true,msg:m,t}); showCenterToast?.(m,t); setTimeout(()=>setToast({show:false,msg:'',t:'success'}),2600); };

  const reset = () => { setName(""); setDesc(""); setPin(""); setLogoFile(null); setLogoPrev(""); setErr(""); setType('public'); };

  const onLogo = (e) => {
    const f=e.target.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')){ toastC("Only image allowed","danger"); return; }
    setLogoFile(f); const r=new FileReader(); r.onload=()=>setLogoPrev(r.result); r.readAsDataURL(f);
  };

  const handleCreate = async () => {
    setErr("");
    if(name.trim().length<3){ setErr("Channel name min 3 chars"); return; }
    if(type==='private' && !/^\d{4,8}$/.test(pin)){ setErr("Private PIN must be 4-8 digits"); return; }

    setLoading(true);
    try{
      const deviceId = getDeviceId(); // auto
      const fd = new FormData();
      fd.append("channel_name", name.trim());
      fd.append("name", name.trim());
      fd.append("channel_description", desc.trim());
      fd.append("description", desc.trim());
      fd.append("channel_type", type);
      fd.append("type", type);
      fd.append("device_id", deviceId);
      fd.append("deviceId", deviceId);

      if(type==='private'){
        fd.append("security_pin", pin);
        fd.append("pin", pin);
      }
      if(logoFile){
        fd.append("channel_logo", logoFile); // API expects this key
      }

      const res = await fetch(`${CHANNEL_API}/create`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${getToken()}`, "x-device-id": deviceId, "x-device": deviceId },
        body: fd
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.message || "Create failed");

      const apiCh = data.channel;
      // Normalize to frontend shape for Public/Private sections
      const normalized = {
        channel_id: apiCh.channel_id,
        id: apiCh.channel_id,
        channel_name: apiCh.channel_name,
        name: apiCh.channel_name,
        channel_description: apiCh.channel_description,
        description: apiCh.channel_description,
        channel_type: apiCh.channel_type,
        type: apiCh.channel_type,
        is_private: apiCh.channel_type === 'private',
        has_channel_logo: apiCh.has_channel_logo,
        logo_url: apiCh.channel_logo_url ? (apiCh.channel_logo_url.startsWith('http')?apiCh.channel_logo_url:`${API_ORIGIN}${apiCh.channel_logo_url}`) : logoPrev,
        channel_logo: apiCh.channel_logo_url,
        invite_url: apiCh.share_link,
        invitation_url: apiCh.share_link,
        share_code: apiCh.share_code,
        share_link: apiCh.share_link,
        created_at: apiCh.created_at,
        created_device_id: apiCh.created_device_id,
        is_owner: true,
        pin: type==='private'? pin : undefined
      };

      // Owner device rule - Public delete only from this device
      const my = JSON.parse(localStorage.getItem("my_created_channels")||"[]");
      localStorage.setItem("my_created_channels", JSON.stringify([...my, String(normalized.channel_id)]));
      if(type==='private'){
        localStorage.setItem(`private_pin_${normalized.channel_id}`, pin);
        if(checkTrust()) localStorage.setItem(`trusted_pin_${normalized.channel_id}`,"true");
      }

      if(onChannelCreated) onChannelCreated(normalized);
      setShow(false); reset();
      toastC(type==='private'?"Private channel created":"Public channel created","success");
    }catch(e){
      setErr(e.message); toastC(e.message,"danger");
    }finally{ setLoading(false); }
  };

  return (
    <>
      <div className="crw"><div className="crc"><button className="crb" onClick={()=>setShow(true)}><PlusLg size={11}/> Create Channel</button><span className="crhint">Public or Private with auto device</span></div></div>

      <Modal show={show} onHide={()=>{setShow(false); setErr("");}} centered backdrop="static">
        <Modal.Header closeButton className="py-2"><Modal.Title className="fs-6 fw-bold">Create Channel</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="crtype">
            <button className={`ctb ${type==='public'?'on':''}`} onClick={()=>setType('public')}><Globe size={13}/> Public</button>
            <button className={`ctb ${type==='private'?'on priv':''}`} onClick={()=>setType('private')}><LockFill size={11}/> Private</button>
          </div>

          <div className="clogo-wrap">
            <div className="clogo" onClick={()=>fileRef.current?.click()}>
              {logoPrev ? <img src={logoPrev} alt="logo" className="clogo-img"/> : <Camera size={18}/>}
              <span className="clogo-cam"><Camera size={10}/></span>
            </div>
            <div className="small text-muted" style={{fontSize:11}}>Logo any size • round preview</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo}/>
          </div>

          <div className="ff"><label>Channel Name *</label><input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Tech Updates" maxLength={30}/></div>
          <div className="ff"><label>Description <span className="opt">(optional)</span></label><textarea className="inp area" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="About channel" rows={2} maxLength={120}/></div>

          {type==='private' && (
            <div className="ff pinbox">
              <label><ShieldLock size={11}/> 4-digit PIN * <span className="opt">can't change later, same PIN to open & delete</span></label>
              <input type="password" inputMode="numeric" maxLength={8} className="inp text-center fw-bold" style={{letterSpacing:8,fontSize:16}} placeholder="••••" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,8))}/>
              <div className="small mt-1" style={{fontSize:11,color:'#64748b'}}>{checkTrust() ? "✓ Trust enabled - PIN once on this device" : "Trust disabled - PIN every time"}</div>
            </div>
          )}

          {err && <div className="jce">{err}</div>}
          <div className="crules small">{type==='public' ? <><b>Public:</b> Opens direct • Owner delete only on same auto device_id • Share = Invite URL only</> : <><b>Private:</b> PIN to open & delete • Owner can delete any device via PIN • Share = Invite URL + PIN • Accept copies only</>}</div>
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button size="sm" variant="light" onClick={()=>setShow(false)}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={loading || !name.trim() || (type==='private' && pin.length<4)} style={{background:'linear-gradient(135deg,#2563eb,#06b6d4)',border:'none',fontWeight:800,minWidth:90}}>{loading?<Spinner size="sm"/>:<><CheckLg size={13}/> Create</>}</Button>
        </Modal.Footer>
      </Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}><span className="jti">{toast.t==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
       .crw{padding:6px 10px 10px;background:#f8fafc}.crc{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:10px}
       .crb{height:32px;padding:0 14px;border:none;border-radius:999px;background:#0f172a;color:#fff;font-size:12px;font-weight:800;display:flex;gap:6px;align-items:center}.crhint{font-size:11px;color:#64748b;font-weight:600}
       .crtype{display:flex;gap:8px;margin-bottom:12px}.ctb{flex:1;height:36px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px}.ctb.on{border-color:#2563eb;background:#eff6ff;color:#2563eb}.ctb.on.priv{border-color:#d97706;background:#fffbeb;color:#92400e}
       .clogo-wrap{text-align:center;margin-bottom:12px}.clogo{position:relative;width:72px;height:72px;border-radius:50%;border:2px dashed #cbd5e1;background:#f8fafc;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden}.clogo-img{width:100%;height:100%;object-fit:cover}.clogo-cam{position:absolute;right:0;bottom:0;width:20px;height:20px;background:#2563eb;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
       .ff{margin-bottom:11px}.ff label{font-size:11px;font-weight:800;margin-bottom:4px;display:block}.opt{font-weight:600;color:#94a3b8;font-size:10px}.inp{width:100%;border:1px solid #dbe2f0;border-radius:10px;padding:0 12px;font-size:13px;font-weight:600;outline:none}.inp:not(.area){height:38px}.inp.area{height:56px;padding:8px 12px;resize:none}.pinbox{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px}.jce{margin-top:8px;font-size:11.5px;font-weight:700;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:7px 10px}.crules{margin-top:8px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:8px 10px;line-height:1.4;color:#475569;font-size:11px}
       .jtc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:none;padding:20px}.jtt{display:flex;gap:8px;align-items:center;padding:12px 16px;border-radius:12px;color:#fff;font-weight:800;font-size:13px;box-shadow:0 14px 32px rgba(0,0,0,.24);animation:pop .28s ease}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)}.jti{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}@keyframes pop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </>
  );
};

export default CreateChannel;