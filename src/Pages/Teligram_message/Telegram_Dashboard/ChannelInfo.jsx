import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { ArrowLeft, Camera, Download, Trash, PencilSquare, XLg, Globe, LockFill, PersonCircle } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const CHANNEL_API = `${API_BASE}/api/telegramlogin-channels`;
const NOTES_API = `${API_BASE}/api/telegramlogin-notes`;
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => localStorage.getItem("telegram_device_id") || `dev_${Date.now()}`;
const resolveImg = (u)=>{ if(!u) return ""; if(u.startsWith("data:")||u.startsWith("http")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const fmtFullIST = (iso)=> new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});

export default function ChannelInfo(){
  const { id } = useParams(); const navigate=useNavigate();
  const [channel,setChannel]=useState(null); const [members,setMembers]=useState([]); const [loading,setLoading]=useState(true); const [preview,setPreview]=useState(null); const [toast,setToast]=useState({show:false,msg:""});
  const fileRef=useRef(null);
  const myId = (()=>{ try{ const t=getToken(); return JSON.parse(atob(t.split('.')[1])).telegram_user_id; }catch{ return 0; }})();
  const showT=(m)=>{ setToast({show:true,msg:m}); setTimeout(()=>setToast({show:false,msg:""}),2000); };

  useEffect(()=>{
    const fetchInfo=async()=>{
      try{
        const h={Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()};
        const r=await fetch(`${CHANNEL_API}/${id}`,{headers:h}); const d=await r.json(); const ch=d.channel||d.data||d; setChannel(ch); setMembers(d.members||ch.members||[]);
        // also try notes/all to verify PIN access
        await fetch(`${NOTES_API}/${id}/all?page=1&limit=1`,{headers:h});
      }catch{} finally{ setLoading(false); }
    }; fetchInfo();
  },[id]);

  const isOwner = channel && (String(channel.created_by_user_id)===String(myId) || channel.is_owner===true);

  const changeLogo = async(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const fd=new FormData(); fd.append('channel_logo',f); fd.append('device_id',getDeviceId());
    const res=await fetch(`${CHANNEL_API}/${id}`,{method:'PUT', headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()}, body:fd});
    const d=await res.json(); if(res.ok){ setChannel(d.channel||d); showT("Logo updated"); } else showT(d.message);
  };

  const removeMember = async(uid)=>{
    if(!confirm("Remove this member?")) return;
    try{
      const res=await fetch(`${CHANNEL_API}/${id}/members/${uid}`,{method:'DELETE', headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId(), "Content-Type":"application/json"}, body:JSON.stringify({device_id:getDeviceId()})});
      let d=await res.json().catch(()=>({})); if(!res.ok){
        const r2=await fetch(`${API_BASE}/api/telegramlogin-allmiss/remove-member`,{method:'POST', headers:{Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json"}, body:JSON.stringify({channel_id:id, member_id:uid, device_id:getDeviceId()})}); d=await r2.json(); if(!r2.ok) throw new Error(d.message||"Failed");
      }
      setMembers(p=>p.filter(m=> String(m.telegram_user_id||m.id)!==String(uid))); showT("Member removed");
    }catch(e){ showT(e.message); }
  };

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;

  const logo=resolveImg(channel?.logo_url||channel?.channel_logo_url||channel?.channel_logo);

  return (
    <div className="info-shell">
      <div className="info-head"><button className="back-btn" onClick={()=>navigate(`/channel/${id}`)}><ArrowLeft size={16}/></button><span>Channel Info</span><span style={{width:32}}></span></div>
      <div className="info-scroll">
        <div className="info-card">
          <div className="logo-wrap" onClick={()=>setPreview(logo)}><img src={logo || `https://ui-avatars.com/api/?name=${channel?.channel_name}`} className="info-logo" alt=""/>{isOwner && <span className="cam-badge"><Camera size={10}/></span>}</div>
          <div className="info-name">{channel?.channel_name}</div>
          <span className={`type-badge ${channel?.channel_type==='private'?'priv':'pub'}`}>{channel?.channel_type==='private'?<><LockFill size={10}/> Private</>:<><Globe size={10}/> Public</>}</span>
          {isOwner && <div className="logo-actions"><button onClick={()=>fileRef.current?.click()}><PencilSquare size={11}/> Change Logo</button><button onClick={()=>{ const a=document.createElement('a'); a.href=logo; a.download=`${channel?.channel_name}_logo`; a.click(); }}><Download size={11}/> Download Logo</button></div>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={changeLogo}/>
        </div>
        <div className="detail-card">
          <div className="d-row"><b>Channel Description</b><span>{channel?.channel_description||channel?.description||'No description'}</span></div>
          <div className="d-row"><b>Created By</b><span>{channel?.created_by_name||channel?.creator_name||channel?.created_by||'Owner'}</span></div>
          <div className="d-row"><b>Created Date & Time</b><span>{fmtFullIST(channel?.created_at)} IST</span></div>
          <div className="d-row"><b>Total Members</b><span>{members.length}</span></div>
          <div className="d-row"><b>Channel ID</b><span>{channel?.channel_id||channel?.id}</span></div>
        </div>
        <div className="members-card">
          <div className="m-head"><PersonCircle size={14}/> Members ({members.length})</div>
          {members.map(m=>{
            const uid=m.telegram_user_id||m.id; const isMe=String(uid)===String(myId);
            return <div key={uid} className="m-item"><img src={resolveImg(m.profile_image_url)||`https://ui-avatars.com/api/?name=${m.full_name||m.username}`} alt=""/><div className="m-info"><div className="m-name">{m.full_name||m.username} {isMe&&'(You)'} {String(channel?.created_by_user_id)===String(uid)&&<span className="owner-tag">Owner</span>}</div><div className="m-mail">{m.email||m.username}</div></div>{isOwner &&!isMe && String(channel?.created_by_user_id)!==String(uid) && <button className="rm-btn" onClick={()=>removeMember(uid)}><Trash size={11}/> Remove</button>}</div>
          })}
        </div>
      </div>
      {preview && <div className="pvw" onClick={()=>setPreview(null)}><div className="pvbox" onClick={e=>e.stopPropagation()}><button className="px" onClick={()=>setPreview(null)}><XLg size={14}/></button><img src={preview} alt="" className="pvimg"/></div></div>}
      {toast.show && <div className="toast-center">{toast.msg}</div>}
      <style>{`
    .info-shell{position:fixed;inset:0;top:56px;background:#eef2f7;display:flex;flex-direction:column;overflow:hidden}
    .info-head{height:50px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:14px;font-weight:800;flex-shrink:0}
    .back-btn{width:32px;height:32px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center}
    .info-scroll{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px}
    .info-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
    .logo-wrap{position:relative;width:86px;height:86px;border-radius:50%;overflow:hidden;border:2px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,.08);cursor:pointer}.info-logo{width:100%;height:100%;object-fit:cover}.cam-badge{position:absolute;right:2px;bottom:2px;width:22px;height:22px;background:#0f172a;border:2px solid #fff;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center}
    .info-name{font-size:16px;font-weight:800}.type-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid;display:flex;align-items:center;gap:4px}.type-badge.pub{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}.type-badge.priv{background:#fef2f2;color:#991b1b;border-color:#fecaca}
    .logo-actions{display:flex;gap:8px;margin-top:6px}.logo-actions button{height:32px;padding:0 12px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px}
    .detail-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}.d-row{display:flex;flex-direction:column;gap:2px}.d-row b{font-size:11px;color:#475569}.d-row span{font-size:13px;font-weight:600;color:#0f172a;word-break:break-word}
    .members-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px}.m-head{font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:10px}.m-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9}.m-item img{width:34px;height:34px;border-radius:50%;object-fit:cover}.m-info{flex:1;min-width:0}.m-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m-mail{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.owner-tag{background:#fef3c7;border:1px solid #fde68a;color:#92400e;font-size:9px;padding:1px 6px;border-radius:999px;margin-left:6px}.rm-btn{height:26px;padding:0 10px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626;border-radius:8px;font-size:10px;font-weight:700;display:flex;align-items:center;gap:4px}
    .pvw{position:fixed;inset:0;background:rgba(2,6,23,.84);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}.pvbox{position:relative}.pvimg{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:18px;background:#000}.px{position:absolute;top:-10px;right:-10px;width:32px;height:32px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center}
    .toast-center{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 14px;border-radius:999px;font-size:11px;font-weight:700;z-index:99999}
      `}</style>
    </div>
  );
}