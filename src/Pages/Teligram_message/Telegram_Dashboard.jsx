import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Form, Spinner, Button } from 'react-bootstrap';
import { PencilSquare, XLg, PersonCircle, CheckLg, Eye, EyeSlash, Camera, ZoomIn, ZoomOut, ArrowsMove, BoxArrowRight } from 'react-bootstrap-icons';

import DashboardNavbar from "../Teligram_message/Telegram_Dashboard/DashboardNavbar";
import JoinChannelBox from "../Teligram_message/Telegram_Dashboard/JoinChannelBox";
import CreateChannel from "../Teligram_message/Telegram_Dashboard/CreateChannel";
import PublicChannelSection from "../Teligram_message/Telegram_Dashboard/PublicChannelSection";
import PrivateChannelSection from "../Teligram_message/Telegram_Dashboard/PrivateChannelSection";

const API_URL = "/api/telegramlogin-users";
const CHANNEL_API = "/api/telegramlogin-channels";
const API_ROUTE_PREFIX = "/api/telegramlogin-users";

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("telegram_auth_token") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";
const getApiBase = () => {
  const raw = import.meta.env.VITE_TELEGRAM_USERS_API_URL || "http://localhost:5000";
  const clean = String(raw).replace(/\/$/, ""); if (clean.endsWith(API_ROUTE_PREFIX)) return clean;
  if (/\/api\/[^/]+$/i.test(clean)) return clean.replace(/\/api\/[^/]+$/i, API_ROUTE_PREFIX); return `${clean}${API_ROUTE_PREFIX}`;
};
const API_ORIGIN = getApiBase().replace(API_ROUTE_PREFIX, "");
const resolveImg = (u) => { if(!u) return ""; if(u.startsWith("data:")) return u; if(u.startsWith("http")) return u; if(u.startsWith("/")) return `${API_ORIGIN}${u}`; return u; };

/* ===== FIXED PROFILE - OLD LOGIC SAME, UI ONLY ROUND + EMAIL FULL + NO CSS CONFLICT ===== */
function FixedProfileCard({ userData, onUpdateProfile, onSendOTP, onVerifyOTP }){
  const [user, setUser] = useState(()=> userData || (()=>{ try{ const s=localStorage.getItem('telegram_user_details'); return s?JSON.parse(s):null;}catch{return null}})());
  const [imgVer,setImgVer]=useState(Date.now());
  const [showPreview,setShowPreview]=useState(false); const [showEdit,setShowEdit]=useState(false); const [showPwd,setShowPwd]=useState(false);
  const [toast,setToast]=useState({show:false,msg:'',type:'success'}); const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({fullName:'',email:'',newEmail:'',password:'',file:null,preview:''});
  const [otpStep,setOtpStep]=useState('none'); const [otpVal,setOtpVal]=useState({old:'',neW:''}); const [otpSent,setOtpSent]=useState({old:false,neW:false});
  const [showAdjust,setShowAdjust]=useState(false); const [adjustSrc,setAdjustSrc]=useState(""); const [scale,setScale]=useState(1); const [pos,setPos]=useState({x:0,y:0}); const [dragging,setDragging]=useState(false); const [start,setStart]=useState({x:0,y:0});
  const fileRef=useRef(null); const showToast=(m,t='success')=>{ setToast({show:true,msg:m,type:t}); setTimeout(()=>setToast({show:false}),2400); };
  useEffect(()=>{ if(userData){ setUser(userData); setImgVer(Date.now()); } },[userData]);

  const openEdit=()=>{ if(!user) return; setForm({fullName:user.fullName||user.full_name||'',email:user.email||'',newEmail:'',password:'',file:null,preview:''}); setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); setShowPwd(false); setShowEdit(true); };
  const onPickImage=(e)=>{ const f=e.target.files?.[0]; if(!f) return; if(!f.type.startsWith('image/')) return showToast('Only image','danger'); const r=new FileReader(); r.onload=()=>{ setAdjustSrc(r.result); setScale(1); setPos({x:0,y:0}); setShowAdjust(true); }; r.readAsDataURL(f); e.target.value=""; };
  const onDown=e=>{ setDragging(true); const p=e.touches?e.touches[0]:e; setStart({x:p.clientX-pos.x,y:p.clientY-pos.y}); }; const onMove=e=>{ if(!dragging) return; const p=e.touches?e.touches[0]:e; setPos({x:p.clientX-start.x,y:p.clientY-start.y}); }; const onUp=()=>setDragging(false);
  const confirmAdjust=()=>{ const img=new window.Image(); img.src=adjustSrc; img.onload=()=>{ const SIZE=400, canvas=document.createElement('canvas'); canvas.width=SIZE; canvas.height=SIZE; const ctx=canvas.getContext('2d'); ctx.fillStyle="#fff"; ctx.fillRect(0,0,SIZE,SIZE); ctx.save(); ctx.beginPath(); ctx.arc(SIZE/2,SIZE/2,0,Math.PI*2); ctx.clip(); const cont=280, base=Math.max(cont/img.width,cont/img.height), fScale=base*scale*(SIZE/cont); const w=img.width*fScale, h=img.height*fScale; const x=SIZE/2+pos.x*(SIZE/cont)-w/2, y=SIZE/2+pos.y*(SIZE/cont)-h/2; ctx.drawImage(img,x,y,w,h); ctx.restore(); const dataUrl=canvas.toDataURL('image/jpeg',0.92); canvas.toBlob(b=>{ const file=new File([b],`avatar_${Date.now()}.jpg`,{type:'image/jpeg'}); setForm(p=>({...p,file,preview:dataUrl})); setShowAdjust(false); showToast('Adjusted','success'); },'image/jpeg',0.92); }; };
  const sendOld=async()=>{ setLoading(true); try{ await onSendOTP?.(user.email,'old'); setOtpStep('oldEmail'); setOtpSent(s=>({...s,old:true})); showToast('OTP sent','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const verifyOld=async()=>{ if(otpVal.old.length!==6) return showToast('6 digit','danger'); setLoading(true); try{ await onVerifyOTP?.(user.email,otpVal.old,'old'); setOtpStep('newEmail'); showToast('Verified','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const sendNew=async()=>{ if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail)) return showToast('Valid email','danger'); setLoading(true); try{ await onSendOTP?.(form.newEmail,'new'); setOtpSent(s=>({...s,neW:true})); showToast('OTP to new','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const verifyNew=async()=>{ if(otpVal.neW.length!==6) return showToast('6 digit','danger'); setLoading(true); try{ await onVerifyOTP?.(form.newEmail,otpVal.neW,'new'); setForm(p=>({...p,email:p.newEmail})); setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); showToast('Email verified','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const handleSave=async(e)=>{ e.preventDefault(); setLoading(true); try{ const payload={fullName:form.fullName,email:form.email,password:form.password||undefined,profileImage:form.file}; const updated=await onUpdateProfile?.(payload); const newImg=form.preview||updated?.profile_image_url||updated?.profileImage||user.profile_image_url; const finalUser={...user,...updated,full_name:form.fullName,fullName:form.fullName,email:form.email,profile_image_url:newImg,profileImage:newImg}; setUser(finalUser); setImgVer(Date.now()); localStorage.setItem('telegram_user_details',JSON.stringify(finalUser)); setShowEdit(false); showToast('Profile updated','success'); }catch(err){ showToast(err.message||'Failed','danger'); } setLoading(false); };

  if(!user) return null;
  const raw=user.profileImage||user.profile_image_url||""; let uImg=resolveImg(raw); if(uImg&&!uImg.startsWith('data:')) uImg+=`${uImg.includes('?')?'&':'?'}v=${imgVer}`;
  const eRaw=form.preview?raw:""; let eImg=form.preview?form.preview:uImg; const name=user.fullName||user.full_name||'User'; const email=user.email||''; const uname=user.username||'';

  return (
    <>
      <div className="my-prof-wrap">
        <div className="my-prof-card">
          <div className="my-prof-left">
            <div className="my-prof-avatar-box" onClick={()=>setShowPreview(true)}>
              <div className="my-prof-ring">{uImg?<img src={uImg} alt="" className="my-prof-img"/>:<PersonCircle size={58} className="my-prof-ph"/>}</div>
              <span className="my-prof-cam"><Camera size={11}/></span>
            </div>
            <div className="my-prof-info">
              <div className="my-prof-name">{name}</div>
              <div className="my-prof-uname">@{uname||'username'}</div>
              <div className="my-prof-email" title={email}>{email}</div>
            </div>
          </div>
          <button type="button" className="my-prof-btn" onClick={openEdit}><PencilSquare size={12}/> Update Profile</button>
        </div>
      </div>

      <Modal show={showPreview} onHide={()=>setShowPreview(false)} centered dialogClassName="center-modal" contentClassName="bg-transparent border-0 shadow-none"><div className="my-pv" onClick={()=>setShowPreview(false)}><button className="my-px" onClick={()=>setShowPreview(false)}><XLg size={14}/></button><img src={uImg||'https://via.placeholder.com/500'} alt="" className="my-pvimg" onClick={e=>e.stopPropagation()} /></div></Modal>

      <Modal show={showAdjust} onHide={()=>setShowAdjust(false)} centered backdrop="static" dialogClassName="center-modal" contentClassName="my-pop"><Modal.Header closeButton className="py-2"><Modal.Title className="fs-6 fw-bold"><ArrowsMove size={14} className="me-1"/> Adjust Image</Modal.Title></Modal.Header><Modal.Body className="text-center"><div className="my-adj-wrap" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}><div className="my-adj-box"><img src={adjustSrc} alt="" className="my-adj-img" style={{transform:`translate(${pos.x}px,${pos.y}px) scale(${scale})`}} draggable={false}/></div><div className="my-adj-mask"/><div className="my-adj-grid"/></div><div className="my-adj-ctrl"><ZoomOut size={14}/><input type="range" min="1" max="3" step="0.02" value={scale} onChange={e=>setScale(parseFloat(e.target.value))} className="my-adj-range"/><ZoomIn size={14}/></div></Modal.Body><Modal.Footer><Button size="sm" variant="light" onClick={()=>setShowAdjust(false)}>Cancel</Button><Button size="sm" onClick={confirmAdjust} className="my-pbtn">OK & Use</Button></Modal.Footer></Modal>

      <Modal show={showEdit} onHide={()=>setShowEdit(false)} centered dialogClassName="center-modal" contentClassName="my-pop"><Modal.Header closeButton className="py-2"><Modal.Title className="fs-6 fw-bold">Update Profile</Modal.Title></Modal.Header>
        <Form onSubmit={handleSave}><Modal.Body>
          <div className="my-ec"><div className="my-ear" onClick={()=>fileRef.current?.click()}><img src={eImg||uImg||`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`} alt="" className="my-eimg"/><span className="my-ecam"><Camera size={13}/></span></div><div className="my-tap">Tap round image to change - drag & zoom</div><Form.Control ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage}/></div>
          <div className="my-ff"><label>Full Name</label><input className="my-inp" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} required/></div>
          <div className="my-ff"><label>Username</label><input className="my-inp dis" value={uname} disabled/></div>
          <div className="my-ff"><label>Email</label>{otpStep==='none'?<div className="my-row"><input className="my-inp dis flex" value={form.email} disabled/><button type="button" className="my-b1" onClick={sendOld}>{loading?<Spinner size="sm"/>:'Change'}</button></div>:<div className="my-otpb">{otpStep==='oldEmail'&&<><small>OTP to <b>{user.email}</b></small><div className="my-row mt"><input className="my-inp flex" placeholder="6-digit" value={otpVal.old} onChange={e=>setOtpVal(p=>({...p,old:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="my-b2" onClick={verifyOld}><CheckLg/></button></div></>}{otpStep==='newEmail'&&<><input className="my-inp" placeholder="New email" value={form.newEmail} onChange={e=>setForm(p=>({...p,newEmail:e.target.value}))}/>{!otpSent.neW?<button type="button" className="my-b1 full mt" onClick={sendNew}>Send OTP</button>:<div className="my-row mt"><input className="my-inp flex" placeholder="OTP" value={otpVal.neW} onChange={e=>setOtpVal(p=>({...p,neW:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="my-b2" onClick={verifyNew}><CheckLg/></button></div>}</>}</div>}</div>
          <div className="my-ff"><label>New Password</label><div className="my-row"><input className="my-inp flex" type={showPwd?'text':'password'} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Leave blank"/><button type="button" className="my-ib" onClick={()=>setShowPwd(!showPwd)}>{showPwd?<EyeSlash size={15}/>:<Eye size={15}/>}</button></div></div>
        </Modal.Body><Modal.Footer><Button size="sm" variant="light" onClick={()=>setShowEdit(false)}>Cancel</Button><Button size="sm" type="submit" disabled={loading||otpStep!=='none'} className="my-pbtn">{loading?<Spinner size="sm"/>:'Save Changes'}</Button></Modal.Footer></Form>
      </Modal>
      {toast.show&&<div className="my-tc"><div className={`my-tt ${toast.type}`}><span className="my-ti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}
      <style>{`
      .my-prof-wrap{padding:0 0 2px;overflow:visible}.my-prof-card{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;display:flex;align-items:center;gap:12px;padding:12px 14px;overflow:visible;position:relative;z-index:1}
      .my-prof-left{display:flex;align-items:center;gap:14px;flex:1;min-width:0}
      .my-prof-avatar-box{position:relative;flex-shrink:0;cursor:pointer}
      .my-prof-ring{width:62px;height:62px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#2563eb,#06b6d4);display:flex;align-items:center;justify-content:center;overflow:hidden}
      .my-prof-img{width:58px!important;height:58px!important;border-radius:50%!important;object-fit:cover!important;display:block!important;background:#fff}
      .my-prof-ph{color:#94a3b8;background:#fff;border-radius:50%}
      .my-prof-cam{position:absolute;right:-2px;bottom:-1px;width:20px;height:20px;background:#2563eb;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;pointer-events:none}
      .my-prof-info{flex:1;min-width:0;display:flex;flex-direction:column;overflow:visible}
      .my-prof-name{font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
      .my-prof-uname{font-size:12px;font-weight:700;color:#2563eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .my-prof-email{font-size:12px;color:#334155;white-space:normal!important;word-break:break-all!important;overflow-wrap:anywhere!important;line-height:1.35;max-width:100%}
      .my-prof-btn{height:36px;padding:0 14px;border:none;border-radius:999px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-size:12.5px;font-weight:800;display:flex;gap:6px;align-items:center;cursor:pointer!important;pointer-events:auto!important;position:relative;z-index:5;flex-shrink:0;white-space:nowrap;box-shadow:0 6px 14px rgba(37,99,235,.22)}
       @media(max-width:560px){.my-prof-card{flex-wrap:wrap}.my-prof-info{flex-basis:calc(100% - 80px)}.my-prof-btn{margin-left:76px}}
      .my-ec{text-align:center;margin-bottom:12px}.my-ear{position:relative;display:inline-block;cursor:pointer}.my-eimg{width:92px;height:92px;border-radius:50%;object-fit:cover;background:#f1f5f9;border:2px dashed #93c5fd;display:block}.my-ecam{position:absolute;right:2px;bottom:2px;width:26px;height:26px;background:#2563eb;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
      .my-tap{font-size:11px;color:#64748b;margin-top:6px}.my-ff{margin-bottom:12px}.my-ff label{font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#334155}.my-inp{width:100%;height:40px;border:1px solid #dbe2f0;border-radius:10px;padding:0 12px;font-size:13px;outline:none}.my-inp:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.dis{background:#f8fafc}.my-row{display:flex;gap:8px;align-items:center}.flex{flex:1;min-width:0}.mt{margin-top:8px}.full{width:100%}.my-b1{height:40px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-weight:800;font-size:12px;cursor:pointer}.my-b2{height:40px;width:44px;border:none;border-radius:10px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center}.my-ib{height:40px;width:42px;border:1px solid #dbe2f0;border-radius:10px;background:#fff}.my-otpb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px}
      .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.my-pop{border:none!important;border-radius:18px!important;box-shadow:0 24px 64px rgba(15,23,42,.24)!important;animation:my-pop.28s ease!important;overflow:hidden!important}.my-pbtn{background:linear-gradient(135deg,#2563eb,#06b6d4)!important;border:none!important;font-weight:800!important;border-radius:10px!important}
      .my-pv{position:relative;display:flex;justify-content:center}.my-pvimg{max-width:90vw;max-height:84vh;object-fit:contain;background:#000;border-radius:16px}.my-px{position:absolute;top:-10px;right:-10px;width:36px;height:36px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
      .my-adj-wrap{position:relative;width:280px;height:280px;margin:0 auto;overflow:hidden;border-radius:16px;background:#0f172a;touch-action:none;cursor:grab}.my-adj-box{width:100%;height:100%;display:flex;align-items:center;justify-content:center}.my-adj-img{max-width:100%;max-height:100%;will-change:transform;user-select:none;pointer-events:none}.my-adj-mask{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 9999px rgba(0,0,0,.55);border:2px dashed rgba(255,255,255,.85);pointer-events:none}.my-adj-grid{position:absolute;inset:0;border-radius:50%;pointer-events:none}.my-adj-ctrl{display:flex;align-items:center;gap:10px;margin-top:12px}.my-adj-range{flex:1;accent-color:#2563eb}
      .my-tc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99999;pointer-events:none;padding:20px}.my-tt{display:flex;gap:8px;align-items:center;padding:12px 18px;border-radius:12px;color:#fff;font-weight:800;font-size:13px;box-shadow:0 14px 32px rgba(0,0,0,.24)}.my-tt.success{background:linear-gradient(135deg,#16a34a,#15803d)}.my-tt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)}.my-ti{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
       @keyframes my-pop{from{opacity:0;transform:scale(.88) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>
    </>
  );
}

const Telegram_Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [linkRequests, setLinkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publicChannels, setPublicChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const showCenter = (m, t = 'success') => { setToast({ show: true, msg: m, type: t }); setTimeout(() => setToast({ show: false }), 2600); };

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken(); if (!token) { navigate("/telegram-login"); return; }
      try { const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error(); const d=await res.json(); const u=d.user||d; setUser({ telegram_user_id:u.telegram_user_id, fullName:u.full_name, full_name:u.full_name, username:u.username, email:u.email, mobileNumber:u.mobile_no, mobile_no:u.mobile_no, profileImage:u.profile_image_url, profile_image_url:u.profile_image_url }); fetchMyChannels(token); } catch{ navigate("/telegram-login"); } finally{ setLoading(false); }
    }; checkAuth();
  }, [navigate]);

  const fetchMyChannels = async (token) => { try{ const t=token||getToken(); let r=await fetch(`${CHANNEL_API}/my-channels`,{headers:{Authorization:`Bearer ${t}`}}); if(!r.ok) r=await fetch(`${CHANNEL_API}/list`,{headers:{Authorization:`Bearer ${t}`}}); const d=await r.json(); const all=d.channels||d.data||[]; setPublicChannels(all.filter(c=>!c.is_private&&c.type!=='private'&&c.channel_type!=='private')); setPrivateChannels(all.filter(c=>c.is_private||c.type==='private'||c.channel_type==='private')); }catch{} };
  const handleRefresh=async()=>{ const t=getToken(); const r=await fetch(`${API_URL}/me`,{headers:{Authorization:`Bearer ${t}`}}); const d=await r.json(); const u=d.user||d; setUser({telegram_user_id:u.telegram_user_id,fullName:u.full_name,full_name:u.full_name,username:u.username,email:u.email,mobileNumber:u.mobile_no,mobile_no:u.mobile_no,profileImage:u.profile_image_url,profile_image_url:u.profile_image_url}); fetchMyChannels(t); showCenter("Refreshed"); };
  const handleLogout=()=>{ localStorage.clear(); sessionStorage.clear(); navigate("/telegram-login"); };
  const handleUpdateProfile=async(fd)=>{ const token=getToken(); const uid=user?.telegram_user_id; const f=new FormData(); if(fd.fullName) f.append("full_name",fd.fullName); if(fd.email&&fd.email!==user.email) f.append("email",fd.email); if(fd.password) f.append("password",fd.password); if(fd.profileImage) f.append("profile_image",fd.profileImage); const r=await fetch(`${API_URL}/${uid}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`},body:f}); const res=await r.json(); if(!r.ok) throw new Error(res.message); const u=res.user; return {telegram_user_id:u.telegram_user_id,fullName:u.full_name,full_name:u.full_name,username:u.username,email:u.email,mobileNumber:u.mobile_no,mobile_no:u.mobile_no,profileImage:u.profile_image_url,profile_image_url:u.profile_image_url}; };
  const handleSendOTP=async(email,type)=>{ const token=getToken(); const ep=type==="new"?`${API_URL}/update-email/send-new-code`:`${API_URL}/update-email/send-old-code`; const body=type==="new"?{email}:{}; const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.message); return d; };
  const handleVerifyOTP=async(email,otp,type)=>{ const token=getToken(); const ep=type==="new"?`${API_URL}/update-email/verify-new-code`:`${API_URL}/update-email/verify-old-code`; const body=type==="new"?{email,code:otp}:{code:otp}; const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.message); return d; };
  const handleChannelJoined=(ch)=>{ const isP=ch.is_private||ch.type==='private'||ch.channel_type==='private'; if(isP) setPrivateChannels(p=>[ch,...p]); else setPublicChannels(p=>[ch,...p]); };
  const handleChannelCreated=(ch)=>{ const isP=ch.is_private||ch.type==='private'; if(isP) setPrivateChannels(p=>[ch,...p]); else setPublicChannels(p=>[ch,...p]); };
  const handleOpenChannel=(ch)=>navigate(`/channel/${ch.channel_id||ch.id}`);
  const handleShareRequest=(ch)=>{ setLinkRequests(r=>[{id:Date.now(),channel_name:ch.channel_name,invite_url:ch.invite_url,pin:ch.pin,type:ch.type||'public'},...r]); showCenter("Invite sent - only selected user sees","success"); };
  const handleAcceptRequest=(id)=>{ const req=linkRequests.find(r=>r.id===id); if(req) navigator.clipboard.writeText(req.pin?`${req.invite_url}\nPIN:${req.pin}`:req.invite_url||""); setLinkRequests(p=>p.filter(r=>r.id!==id)); showCenter("Copied"); };
  const handleRejectRequest=(id)=>{ setLinkRequests(p=>p.filter(r=>r.id!==id)); showCenter("Rejected"); };
  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;

  return (
    <>
      <div className="top-safe" />
      <DashboardNavbar onRefresh={handleRefresh} onLogout={handleLogout} linkRequests={linkRequests} onAcceptRequest={handleAcceptRequest} onRejectRequest={handleRejectRequest} trustThisDevice={localStorage.getItem("telegram_trust_login_enabled")==="true"} />
      <div className="dash-root"><div className="dash-content">
        <FixedProfileCard userData={user} onUpdateProfile={handleUpdateProfile} onSendOTP={handleSendOTP} onVerifyOTP={handleVerifyOTP} />
        <JoinChannelBox onChannelJoined={handleChannelJoined} onOpenChannel={handleOpenChannel} />
        <CreateChannel onChannelCreated={handleChannelCreated} showCenterToast={showCenter} />
        <PublicChannelSection channels={publicChannels} onUpdated={(u)=>setPublicChannels(p=>p.map(x=>String(x.channel_id||x.id)===String(u.channel_id||u.id)?{...x,...u}:x))} onDeleted={(id)=>setPublicChannels(p=>p.filter(x=>String(x.channel_id||x.id)!==String(id)))} onOpen={handleOpenChannel} onShareRequest={handleShareRequest} showCenterToast={showCenter} />
        <PrivateChannelSection channels={privateChannels} onUpdated={(u)=>setPrivateChannels(p=>p.map(x=>String(x.channel_id||x.id)===String(u.channel_id||u.id)?{...x,...u}:x))} onDeleted={(id)=>setPrivateChannels(p=>p.filter(x=>String(x.channel_id||x.id)!==String(id)))} onOpen={handleOpenChannel} onShareRequest={handleShareRequest} showCenterToast={showCenter} />
      </div></div>
      {toast.show&&<div className="jtc"><div className={`jtt ${toast.type}`}><span className="jti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}
      <style>{`
       :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px)} html,body{margin:0;background:#f6f8fb;overflow-x:hidden}
      .top-safe{position:fixed;top:0;left:0;right:0;height:var(--sat);background:#fff;z-index:1036}
      .dash-root{min-height:100vh;background:#f6f8fb;padding-bottom:calc(20px + var(--sab))}.dash-content{max-width:760px;margin:0 auto;padding:calc(62px + var(--sat)) 10px 0}
       nav.navbar{position:fixed!important;top:var(--sat)!important;left:0!important;right:0!important;z-index:1035!important;height:56px!important;backdrop-filter:blur(12px)!important;background:#ffffffee!important;border-bottom:1px solid #e2e8f0!important}
      .secw,.grid,.pcard,.pcard-top{overflow:visible!important}.pcard.menu-open{z-index:9999!important}.dmenu{z-index:10000!important}
      .jtc{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:100000!important;pointer-events:none!important}.jtt{display:flex!important;gap:8px!important;padding:13px 18px!important;border-radius:14px!important;color:#fff!important;font-weight:800!important;box-shadow:0 16px 36px rgba(0,0,0,.26)!important}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)!important}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important}.jti{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
       @media(max-width:560px){.dash-content{padding-left:10px;padding-right:10px}}
      `}</style>
    </>
  );
};
export default Telegram_Dashboard;