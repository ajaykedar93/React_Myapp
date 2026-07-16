import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { ArrowLeft, Globe, LockFill, PersonBadge, Hash, InfoCircle, PeopleFill, ShieldCheck, Link45deg, PersonCircle, Trash, XLg } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const CHANNEL_API = `${API_BASE}/api/telegramlogin-channels`;
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => localStorage.getItem("telegram_device_id") || `dev_${Date.now()}`;
const resolveImg = (u)=>{ if(!u) return ""; if(u.startsWith("data:")||u.startsWith("http")||u.startsWith("blob:")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const getInitials = (name)=>{ if(!name) return "C"; const w=name.trim().split(/\s+/); if(w.length>=2) return (w[0][0]+w[1][0]).toUpperCase(); return w[0][0].toUpperCase(); };

export default function ChannelInfo(){
  const { id } = useParams(); const navigate=useNavigate();
  const [channel,setChannel]=useState(null); const [members,setMembers]=useState([]); const [loading,setLoading]=useState(true); const [preview,setPreview]=useState(null); const [toast,setToast]=useState({show:false,msg:""}); const [logoErr,setLogoErr]=useState(false);
  const myId = (()=>{ try{ const t=getToken(); return JSON.parse(atob(t.split('.')[1])).telegram_user_id; }catch{ return 0; }})();
  const showT=(m)=>{ setToast({show:true,msg:m}); setTimeout(()=>setToast({show:false,msg:""}),2000); };

  useEffect(()=>{
    const fetchInfo=async()=>{
      try{
        const h={Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()};
        const r=await fetch(`${CHANNEL_API}/${id}`,{headers:h}); const d=await r.json(); const ch=d.channel||d.data||d; setChannel(ch);
        const r2=await fetch(`${CHANNEL_API}/${id}/members`,{headers:h}); const d2=await r2.json();
        if(r2.ok){ setMembers(d2.members||[]); } else { setMembers(d.members||ch.members||[]); }
      }catch{} finally{ setLoading(false); }
    }; fetchInfo();
  },[id]);

  const isOwner = channel && (String(channel.created_by_user_id)===String(myId) || String(channel.owner_id)===String(myId) || channel.is_owner===true);
  const logoUrl = resolveImg(channel?.channel_logo_url||channel?.logo_url||channel?.channel_logo);
  const showLogo = logoUrl &&!logoErr;
  const initials = getInitials(channel?.channel_name||"Channel");

  const removeMember = async(uid)=>{
    if(!confirm("Remove this member?")) return;
    try{
      const res=await fetch(`${CHANNEL_API}/${id}/members/${uid}`,{method:'DELETE', headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId(),"Content-Type":"application/json"}, body:JSON.stringify({device_id:getDeviceId()})});
      let d=await res.json().catch(()=>({}));
      if(!res.ok){
        const r2=await fetch(`${API_BASE}/api/telegramlogin-allmiss/remove-member`,{method:'POST', headers:{Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json"}, body:JSON.stringify({channel_id:id, member_id:uid, device_id:getDeviceId()})}); d=await r2.json(); if(!r2.ok) throw new Error(d.message||"Failed");
      }
      setMembers(p=>p.filter(m=> String(m.telegram_user_id||m.id)!==String(uid)));
      showT("Removed");
    }catch(e){ showT(e.message); }
  };

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border"/></div>;

  return (
    <div className="info-shell">
      <div className="info-head">
        <button className="back-btn" onClick={()=>navigate(`/channel/${id}`)}><ArrowLeft size={16}/></button>
        <span className="head-title">Channel Info</span>
        <button className="head-icon" onClick={()=>{navigator.clipboard.writeText(channel?.share_link||window.location.href); showT("Link copied");}}><Link45deg size={16}/></button>
      </div>

      <div className="info-scroll">
        <div className="info-card">
          <div className="card-glow"></div>
          <div className="logo-wrap" onClick={()=>showLogo && setPreview(logoUrl)}>
            <div className="logo-ring">
              {showLogo? <img src={logoUrl} onError={()=>setLogoErr(true)} className="info-logo" alt=""/> : <div className="initial-logo">{initials}</div>}
            </div>
          </div>
          <div className="info-name">{channel?.channel_name||"Channel"}</div>
          <div className="info-desc">{channel?.channel_description||"No description"}</div>
          <span className={`type-badge ${channel?.channel_type==='private'?'priv':'pub'}`}>
            {channel?.channel_type==='private'?<><LockFill size={11}/> Private</>:<><Globe size={11}/> Public</>}
          </span>
        </div>

        <div className="detail-card">
          <div className="d-head"><InfoCircle size={14}/> About Channel</div>
          <div className="d-row"><span className="d-ico blue"><PersonBadge size={12}/></span><div className="d-txt"><b>Owner Name</b><span>{channel?.owner_name||channel?.created_by_name||'Owner'}</span></div></div>
          <div className="d-row"><span className="d-ico green"><PersonCircle size={12}/></span><div className="d-txt"><b>Channel Name</b><span>{channel?.channel_name}</span></div></div>
          <div className="d-row"><span className="d-ico yellow"><PeopleFill size={12}/></span><div className="d-txt"><b>Total Members</b><span>{members.length} Members</span></div></div>
          <div className="d-row"><span className="d-ico purple"><Hash size={12}/></span><div className="d-txt"><b>Channel ID</b><span className="mono">{channel?.channel_id||id}</span></div></div>
          <div className="d-row"><span className="d-ico pink"><ShieldCheck size={12}/></span><div className="d-txt"><b>Security</b><span>{channel?.channel_type==='private'?'PIN Protected':'Open to All'}</span></div></div>
        </div>

        <div className="members-card">
          <div className="m-head"><PeopleFill size={13}/> Members <span className="m-count">{members.length}</span></div>
          {members.length===0? <div className="empty-m">No members yet</div> :
            members.map(m=>{
              const uid=m.telegram_user_id||m.id; const isMe=String(uid)===String(myId);
              const av=resolveImg(m.profile_image_url); const mInit=getInitials(m.full_name||m.username||'U');
              const isChannelOwner=String(channel?.created_by_user_id)===String(uid) || String(channel?.owner_id)===String(uid);
              return <div key={uid} className="m-item">
                <div className="m-av-wrap">{av? <img src={av} alt="" onError={e=>e.target.style.display='none'}/> : <div className="m-initial">{mInit}</div>}</div>
                <div className="m-info"><div className="m-name">{m.full_name||m.username} {isMe&&<span className="you-tag">You</span>} {isChannelOwner&&<span className="owner-tag">Owner</span>}</div><div className="m-mail">{m.email||m.username}</div></div>
                {isOwner &&!isMe &&!isChannelOwner && <button className="rm-btn" onClick={()=>removeMember(uid)}><Trash size={11}/> Remove</button>}
              </div>
            })}
        </div>
      </div>

      {preview && <div className="pvw" onClick={()=>setPreview(null)}><div className="pvbox"><button className="px" onClick={()=>setPreview(null)}><XLg size={14}/></button><img src={preview} alt="" className="pvimg"/></div></div>}
      {toast.show && <div className="toast-center">{toast.msg}</div>}

      <style>{`
 :root{--sat:env(safe-area-inset-top,0px)}
.info-shell{position:fixed;inset:0;top:0;padding-top:var(--sat);background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);display:flex;flex-direction:column;overflow:hidden}
.info-head{height:58px;background:linear-gradient(90deg,#e0f2fe,#ede9fe,#fce7f3);border-bottom:2px solid transparent;border-image:linear-gradient(90deg,#ef4444,#f97316) 1;display:flex;align-items:center;justify-content:space-between;padding:0 12px;flex-shrink:0;z-index:10}
.back-btn,.head-icon{width:36px;height:36px;border:none;border-radius:11px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;cursor:pointer}
.head-title{font-size:14px;font-weight:900;background:linear-gradient(90deg,#0f172a,#dc2626);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.info-scroll{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}
.info-card{position:relative;background:#fff;border:1px solid #e9eef5;border-radius:22px;padding:28px 18px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;box-shadow:0 10px 30px rgba(15,23,42,.06)}
.card-glow{position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:180px;height:180px;background:radial-gradient(circle,#c7d2fe 0%,#f0abfc 40%,transparent 70%);opacity:.35;pointer-events:none}
.logo-wrap{position:relative;width:96px;height:96px;cursor:pointer;margin-bottom:6px}.logo-ring{width:100%;height:100%;border-radius:50%;padding:3px;background:linear-gradient(135deg,#06b6d4,#8b5cf6,#ec4899);display:flex;align-items:center;justify-content:center}.info-logo{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #fff;background:#fff}
.initial-logo{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;border:3px solid #fff}
.info-name{font-size:18px;font-weight:900;color:#0f172a}.info-desc{font-size:12px;color:#64748b;max-width:280px;line-height:1.4;background:#f8fafc;border:1px solid #f1f5f9;padding:6px 12px;border-radius:999px}
.type-badge{font-size:11px;font-weight:800;padding:5px 14px;border-radius:999px;border:1px solid;display:flex;align-items:center;gap:6px}.type-badge.pub{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}.type-badge.priv{background:#fef2f2;color:#991b1b;border-color:#fecaca}
.detail-card{background:#fff;border:1px solid #e9eef5;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:4px}.d-head{font-size:12px;font-weight:900;display:flex;align-items:center;gap:6px;margin-bottom:6px}.d-row{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:12px}.d-ico{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center}.d-ico.blue{background:#eff6ff;color:#2563eb}.d-ico.green{background:#f0fdf4;color:#16a34a}.d-ico.yellow{background:#fef3c7;color:#d97706}.d-ico.purple{background:#ede9fe;color:#7c3aed}.d-ico.pink{background:#fce7f3;color:#db2777}.d-txt{display:flex;flex-direction:column;flex:1}.d-txt b{font-size:11px;color:#64748b}.d-txt span{font-size:13px;font-weight:700;color:#0f172a}.mono{font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:6px}
.members-card{background:#fff;border:1px solid #e9eef5;border-radius:18px;padding:14px}.m-head{font-size:13px;font-weight:900;display:flex;align-items:center;gap:8px;margin-bottom:12px}.m-count{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:800}
.m-item{display:flex;align-items:center;gap:12px;padding:10px 6px;border-bottom:1px solid #f1f5f9}.m-av-wrap{width:40px;height:40px}.m-av-wrap img{width:100%;height:100%;border-radius:50%;object-fit:cover}.m-initial{width:100%;height:100%;border-radius:50%;background:#cbd5e1;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900}
.m-info{flex:1;min-width:0}.m-name{font-size:13px;font-weight:800;display:flex;gap:6px;flex-wrap:wrap}.m-mail{font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.you-tag{background:#dcfce7;color:#15803d;border:1px solid #86efac;font-size:9px;padding:1px 7px;border-radius:999px}.owner-tag{background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-size:9px;padding:2px 8px;border-radius:999px}
.rm-btn{height:28px;padding:0 10px;border-radius:8px;background:#fff1f2;color:#dc2626;border:1px solid #fecaca;font-size:10px;font-weight:800;display:flex;align-items:center;gap:4px}
.empty-m{padding:16px;text-align:center;color:#94a3b8;font-size:12px;border:1px dashed #e2e8f0;border-radius:12px}
.pvw{position:fixed;inset:0;background:rgba(15,23,42,.82);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}.pvbox{position:relative}.pvimg{max-width:92vw;max-height:84vh;border-radius:20px}.px{position:absolute;top:-12px;right:-12px;width:36px;height:36px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center}
.toast-center{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 18px;border-radius:999px;font-size:11px;font-weight:800;z-index:99999}
      `}</style>
    </div>
  );
}