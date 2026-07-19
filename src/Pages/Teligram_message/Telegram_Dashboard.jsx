// ✅ FINAL - Dashboard + Footer Safe Gap Mobile Fix
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal, Form, Spinner, Button } from "react-bootstrap";
import { PencilSquare, XLg, PersonCircle, CheckLg, Eye, EyeSlash, Camera, ZoomIn, ZoomOut, ArrowsMove, CodeSlash } from "react-bootstrap-icons";

import DashboardNavbar from "../Teligram_message/Telegram_Dashboard/DashboardNavbar";
import JoinChannelBox from "../Teligram_message/Telegram_Dashboard/JoinChannelBox";
import CreateChannel from "../Teligram_message/Telegram_Dashboard/CreateChannel";
import PublicChannelSection from "../Teligram_message/Telegram_Dashboard/PublicChannelSection";
import PrivateChannelSection from "../Teligram_message/Telegram_Dashboard/PrivateChannelSection";

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const api = (p) => `${API_BASE}${p.startsWith("/")? p : `/${p}`}`;
const API_URL = api("/api/telegramlogin-users");
const CHANNEL_API = api("/api/telegramlogin-channels");
const ALLMISS_API = api("/api/telegramlogin-allmiss");
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("telegram_auth_token") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const resolveImg = (u) => { if(!u) return ""; if(u.startsWith("data:")||u.startsWith("http")||u.startsWith("blob:")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };

const getChannelStorageKey = (id) => `tg_channel_logo_${id}`;
const getChannelTransformKey = (id) => `tg_channel_logo_transform_${id}`;
const cacheChannelLogo = (channel) => {
  const id = String(channel.channel_id || channel.id || "");
  if(!id) return;
  const logo = channel.logo_url || channel.channel_logo_url || channel.channel_logo || "";
  if(logo) localStorage.setItem(getChannelStorageKey(id), logo);
  const transform = {
    logo_zoom: channel.logo_zoom,
    logo_x: channel.logo_x,
    logo_y: channel.logo_y,
  };
  if(transform.logo_zoom !== undefined || transform.logo_x !== undefined || transform.logo_y !== undefined) {
    localStorage.setItem(getChannelTransformKey(id), JSON.stringify(transform));
  }
};
const normalizeLogoUrl = (url="") => {
  if(!url) return "";
  return url.split('?')[0];
};
const hydrateChannels = (channels=[]) => {
  return (channels || []).map((channel) => {
    const id = String(channel.channel_id || channel.id || "");
    if(!id) return channel;
    const savedLogo = localStorage.getItem(getChannelStorageKey(id));
    const savedTransform = localStorage.getItem(getChannelTransformKey(id));
    let hydrated = {...channel};
    if(savedLogo) {
      const currentLogo = hydrated.logo_url || hydrated.channel_logo_url || hydrated.channel_logo || "";
      const normalizedCurrent = normalizeLogoUrl(currentLogo);
      const normalizedSaved = normalizeLogoUrl(savedLogo);
      if(!currentLogo || (normalizedCurrent && normalizedSaved && normalizedCurrent === normalizedSaved) || !normalizedCurrent) {
        hydrated = {
          ...hydrated,
          logo_url: savedLogo,
          channel_logo_url: savedLogo,
          channel_logo: savedLogo,
        };
      }
    }
    if(savedTransform) {
      try{
        const parsed = JSON.parse(savedTransform);
        hydrated = {...hydrated, ...parsed};
      }catch{}
    }
    return hydrated;
  });
};

function ProfileCard({ userData, onUpdateProfile, onSendOTP, onVerifyOTP }){
  const [user,setUser]=useState(()=> userData || (()=>{ try{return JSON.parse(localStorage.getItem('telegram_user_details')||"null")}catch{return null}})());
  const [imgVer,setImgVer]=useState(Date.now());
  const [showPreview,setShowPreview]=useState(false); const [showEdit,setShowEdit]=useState(false); const [showPwd,setShowPwd]=useState(false);
  const [toast,setToast]=useState({show:false,msg:'',type:'success'}); const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({fullName:'',email:'',newEmail:'',password:'',file:null,preview:''});
  const [otpStep,setOtpStep]=useState('none'); const [otpVal,setOtpVal]=useState({old:'',neW:''}); const [otpSent,setOtpSent]=useState({old:false,neW:false});
  const [showAdjust,setShowAdjust]=useState(false); const [adjustSrc,setAdjustSrc]=useState(""); const [scale,setScale]=useState(1); const [pos,setPos]=useState({x:0,y:0}); const [dragging,setDragging]=useState(false); const [start,setStart]=useState({x:0,y:0});
  const fileRef=useRef(null);
  const showT=(m,t='success')=>{ setToast({show:true,msg:m,type:t}); setTimeout(()=>setToast({show:false,msg:'',type:'success'}),2400); };
  useEffect(()=>{ if(userData){ setUser(userData); setImgVer(Date.now()); } },[userData]);
  const openEdit=()=>{ if(!user) return; setForm({fullName:user.fullName||user.full_name||'',email:user.email||'',newEmail:'',password:'',file:null,preview:''}); setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); setShowPwd(false); setShowEdit(true); };
  const onPick=e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ setAdjustSrc(r.result); setScale(1); setPos({x:0,y:0}); setShowAdjust(true); }; r.readAsDataURL(f); e.target.value=""; };
  const onDown=e=>{ setDragging(true); const p=e.touches?e.touches[0]:e; setStart({x:p.clientX-pos.x,y:p.clientY-pos.y}); }; const onMove=e=>{ if(!dragging) return; const p=e.touches?e.touches[0]:e; setPos({x:p.clientX-start.x,y:p.clientY-start.y}); }; const onUp=()=>setDragging(false);
  const confirmAdjust=()=>{ const im=new Image(); im.src=adjustSrc; im.onload=()=>{ const S=400,c=document.createElement('canvas'); c.width=S;c.height=S; const ctx=c.getContext('2d'); ctx.fillStyle="#fff"; ctx.fillRect(0,0,S,S); ctx.save(); ctx.beginPath(); ctx.arc(S/2,S/2,S/2,0,Math.PI*2); ctx.clip(); const cont=280,base=Math.max(cont/im.width,cont/im.height),fs=base*scale*(S/cont),w=im.width*fs,h=im.height*fs,x=S/2+pos.x*(S/cont)-w/2,y=S/2+pos.y*(S/cont)-h/2; ctx.drawImage(im,x,y,w,h); ctx.restore(); const url=c.toDataURL('image/jpeg',0.92); c.toBlob(b=>{ const file=new File([b],`av_${Date.now()}.jpg`,{type:'image/jpeg'}); setForm(p=>({...p,file,preview:url})); setShowAdjust(false); },'image/jpeg',0.92); }; };
  const sendOld=async()=>{ setLoading(true); try{ await onSendOTP?.(user.email,'old'); setOtpStep('oldEmail'); setOtpSent(s=>({...s,old:true})); showT('OTP sent to old email'); }catch(e){ showT(e.message,'danger'); } setLoading(false); };
  const verifyOld=async()=>{ if(otpVal.old.length!==6) return showT('6 digit OTP','danger'); setLoading(true); try{ await onVerifyOTP?.(user.email,otpVal.old,'old'); setOtpStep('newEmail'); showT('Old email verified'); }catch(e){ showT(e.message,'danger'); } setLoading(false); };
  const sendNew=async()=>{ if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail)) return showT('Valid email','danger'); setLoading(true); try{ await onSendOTP?.(form.newEmail,'new'); setOtpSent(s=>({...s,neW:true})); showT('OTP to new email'); }catch(e){ showT(e.message,'danger'); } setLoading(false); };
  const verifyNew=async()=>{ if(otpVal.neW.length!==6) return showT('6 digit','danger'); setLoading(true); try{ await onVerifyOTP?.(form.newEmail,otpVal.neW,'new'); setForm(p=>({...p,email:p.newEmail})); setOtpStep('none'); showT('New email verified'); }catch(e){ showT(e.message,'danger'); } setLoading(false); };
  const handleSave=async(e)=>{ e.preventDefault(); setLoading(true); try{ const payload={fullName:form.fullName,email:form.email,password:form.password||undefined,profileImage:form.file}; const up=await onUpdateProfile?.(payload); const newImg=form.preview||up?.profile_image_url||up?.profileImage||user.profile_image_url; const fin={...user,...up,full_name:form.fullName,fullName:form.fullName,email:form.email,profile_image_url:newImg,profileImage:newImg}; setUser(fin); setImgVer(Date.now()); localStorage.setItem('telegram_user_details',JSON.stringify(fin)); setShowEdit(false); showT('Profile updated'); }catch(er){ showT(er.message,'danger'); } setLoading(false); };
  if(!user) return null;
  const raw=user.profileImage||user.profile_image_url||""; let uImg=resolveImg(raw); if(uImg&&!uImg.startsWith('data:')) uImg+=`${uImg.includes('?')?'&':'?'}v=${imgVer}`;
  const eImg=form.preview?form.preview:uImg; const name=user.fullName||user.full_name||'User'; const email=user.email||''; const uname=user.username||''; const mobile=user.mobileNumber||user.mobile_no||'';
  return (
    <>
      <div className="my-pcw-fixed">
        <div className="my-pcc" onClick={()=>setShowPreview(true)}>
          <div className="my-pcr"><div className="my-ring">{uImg?<img src={uImg} alt={name} className="my-av"/>:<PersonCircle size={52}/>}</div><span className="my-cam"><Camera size={11}/></span></div>
          <div className="my-pct"><div className="my-pn">{name}</div><div className="my-pu">@{uname||'username'}</div><div className="my-pe">{email}</div></div>
        </div>
        <div className="my-upw"><button type="button" className="my-upb" onClick={(e)=>{e.stopPropagation(); openEdit();}}><PencilSquare size={12}/> Update Profile</button></div>
      </div>
      <Modal show={showPreview} onHide={()=>setShowPreview(false)} centered dialogClassName="my-center" contentClassName="my-pop bg-transparent border-0 shadow-none"><div className="my-pv" onClick={()=>setShowPreview(false)}><div className="my-pvbox" onClick={e=>e.stopPropagation()}><button className="my-pxb" onClick={()=>setShowPreview(false)}><XLg size={14}/></button><img src={uImg} alt="" className="my-pvimg" /></div></div></Modal>
      <Modal show={showAdjust} onHide={()=>setShowAdjust(false)} centered dialogClassName="my-center" contentClassName="my-pop"><Modal.Header closeButton><Modal.Title className="fs-6 fw-bold"><ArrowsMove size={14} className="me-1"/>Adjust</Modal.Title></Modal.Header><Modal.Body className="text-center"><div className="my-adj" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}><img src={adjustSrc} alt="" style={{transform:`translate(${pos.x}px,${pos.y}px) scale(${scale})`}} draggable={false}/></div><div className="d-flex gap-2 mt-3 align-items-center"><ZoomOut size={14}/><input type="range" min="1" max="3" step="0.02" value={scale} onChange={e=>setScale(parseFloat(e.target.value))} className="form-range flex-grow-1"/><ZoomIn size={14}/></div></Modal.Body><Modal.Footer><Button variant="light" size="sm" onClick={()=>setShowAdjust(false)}>Cancel</Button><Button size="sm" onClick={confirmAdjust} className="my-pbtn">Use</Button></Modal.Footer></Modal>
      <Modal show={showEdit} onHide={()=>setShowEdit(false)} centered dialogClassName="my-center" contentClassName="my-pop"><Modal.Header closeButton><Modal.Title className="fs-6 fw-bold">Update Profile</Modal.Title></Modal.Header><Form onSubmit={handleSave}><Modal.Body><div className="my-ec"><div className="my-ear" onClick={()=>fileRef.current?.click()}><img src={eImg||`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`} alt="" className="my-eimg"/><span className="my-ecam"><Camera size={13}/></span></div><div className="my-tap">Tap to change</div><Form.Control ref={fileRef} type="file" accept="image/*" hidden onChange={onPick}/></div><div className="my-ff"><label>Full Name</label><input className="my-inp" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required/></div><div className="my-ff"><label>Username</label><input className="my-inp dis" value={uname} disabled/></div><div className="my-ff"><label>Mobile</label><input className="my-inp dis" value={mobile} disabled/></div><div className="my-ff"><label>Email</label>{otpStep==='none'?<div className="my-row"><input className="my-inp dis flex" value={form.email} disabled/><button type="button" className="my-b1" onClick={sendOld}>{loading?<Spinner size="sm"/>:'Change'}</button></div>:<div className="my-otpb">{otpStep==='oldEmail'&&<><small>OTP to {user.email}</small><div className="my-row mt"><input className="my-inp flex" placeholder="6-digit" value={otpVal.old} onChange={e=>setOtpVal(p=>({...p,old:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="my-b2" onClick={verifyOld}><CheckLg/></button></div></>}{otpStep==='newEmail'&&<><input className="my-inp" placeholder="New email" value={form.newEmail} onChange={e=>setForm(p=>({...p,newEmail:e.target.value}))}/>{!otpSent.neW?<button type="button" className="my-b1 full mt" onClick={sendNew}>Send OTP</button>:<div className="my-row mt"><input className="my-inp flex" placeholder="OTP" value={otpVal.neW} onChange={e=>setOtpVal(p=>({...p,neW:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="my-b2" onClick={verifyNew}><CheckLg/></button></div>}</>}</div>}</div><div className="my-ff"><label>New Password</label><div className="my-row"><input className="my-inp flex" type={showPwd?'text':'password'} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Leave blank"/><button type="button" className="my-ib" onClick={()=>setShowPwd(!showPwd)}>{showPwd?<EyeSlash size={14}/>:<Eye size={14}/>}</button></div></div></Modal.Body><Modal.Footer><Button variant="light" size="sm" onClick={()=>setShowEdit(false)}>Cancel</Button><Button type="submit" size="sm" disabled={loading} className="my-pbtn">{loading?<Spinner size="sm"/>:'Save'}</Button></Modal.Footer></Form></Modal>
      {toast.show&&<div className="my-tc"><div className={`my-tt ${toast.type}`}><span className="my-ti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}
    </>
  );
}

export default function Telegram_Dashboard(){
  const navigate=useNavigate();
  const params=useParams();
  const [user,setUser]=useState(null); const [loading,setLoading]=useState(true);
  const [publicChannels,setPublicChannels]=useState([]); const [privateChannels,setPrivateChannels]=useState([]);
  const [toast,setToast]=useState({show:false,msg:'',type:'success'});
  const showCenter=(m,t='success')=>{ setToast({show:true,msg:m,type:t}); setTimeout(()=>setToast({show:false,msg:'',type:'success'}),2600); };

  useEffect(()=>{ const check=async()=>{ const token=getToken(); if(!token) return navigate("/telegram-login"); try{ const r=await fetch(`${API_URL}/me`,{headers:{Authorization:`Bearer ${token}`}}); if(!r.ok) throw new Error("Auth failed"); const d=await r.json(); const u=d.user||d; setUser({telegram_user_id:u.telegram_user_id,fullName:u.full_name,full_name:u.full_name,username:u.username,email:u.email,mobileNumber:u.mobile_no,mobile_no:u.mobile_no,profileImage:u.profile_image_url,profile_image_url:u.profile_image_url}); try{ const r2=await fetch(`${CHANNEL_API}/my-channels`,{headers:{Authorization:`Bearer ${token}`}}); if(r2.ok){ const d2=await r2.json(); const all = hydrateChannels(d2.channels||d2.data||[]); all.forEach(cacheChannelLogo); setPublicChannels(all.filter(c=>!(c.is_private||c.type==='private'||c.channel_type==='private'))||[]); setPrivateChannels(all.filter(c=>c.is_private||c.type==='private'||c.channel_type==='private')||[]); } }catch{} }catch{ localStorage.clear(); navigate("/telegram-login"); } finally{ setLoading(false); } }; check(); },[navigate]);

  useEffect(()=>{
    const tryAutoJoin=async()=>{
      const token=getToken(); if(!token) return;
      const hashCode = window.location.hash.match(/\/channel\/join\/([^/?#]+)/)?.[1] || "";
      const paramCode = params?.share_code || params?.code || "";
      const pathCode = window.location.pathname.match(/\/channel\/join\/([^/]+)/)?.[1] || "";
      const finalCode = (paramCode || hashCode || pathCode || "").trim();
      if(!finalCode) return;
      try{
        const r=await fetch(`${ALLMISS_API}/join`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":getDeviceId()},body:JSON.stringify({share_code:finalCode,code:finalCode,device_id:getDeviceId()})});
        const d=await r.json(); if(!r.ok) throw new Error(d.message||"Invalid link");
        showCenter(d.channel?.channel_type==="private"?"Private joined - PIN takun open kara":"Channel joined");
        window.history.replaceState(null,"",window.location.pathname + window.location.search);
        handleRefresh();
      }catch(e){ showCenter(e.message,"danger"); }
    };
    if(!loading) tryAutoJoin();
  },[loading, params]);

  const handleRefresh=async()=>{ const t=getToken(); try{ const r=await fetch(`${API_URL}/me`,{headers:{Authorization:`Bearer ${t}`}}); const d=await r.json(); const u=d.user||d; setUser({telegram_user_id:u.telegram_user_id,fullName:u.full_name,full_name:u.full_name,username:u.username,email:u.email,mobileNumber:u.mobile_no,mobile_no:u.mobile_no,profileImage:u.profile_image_url,profile_image_url:u.profile_image_url}); const r2=await fetch(`${CHANNEL_API}/my-channels`,{headers:{Authorization:`Bearer ${t}`}}); if(r2.ok){ const d2=await r2.json(); const all = hydrateChannels(d2.channels||d2.data||[]);
        all.forEach(cacheChannelLogo);
        setPublicChannels(all.filter(c=>!(c.is_private||c.type==='private'||c.channel_type==='private'))||[]);
        setPrivateChannels(all.filter(c=>c.is_private||c.type==='private'||c.channel_type==='private')||[]);
      } showCenter("Refreshed"); }catch{ showCenter("Refresh failed","danger"); } };
  const handleLogout=()=>{ localStorage.clear(); sessionStorage.clear(); navigate("/telegram-login"); };
  const handleUpdateProfile=async(fd)=>{ const token=getToken(); const uid=user?.telegram_user_id; const f=new FormData(); if(fd.fullName) f.append("full_name",fd.fullName); if(fd.email&&fd.email!==user.email) f.append("email",fd.email); if(fd.password) f.append("password",fd.password); if(fd.profileImage) f.append("profile_image",fd.profileImage); const r=await fetch(`${API_URL}/${uid}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`},body:f}); const res=await r.json(); if(!r.ok) throw new Error(res.message||"Update failed"); const u=res.user; const fmt={telegram_user_id:u.telegram_user_id,fullName:u.full_name,full_name:u.full_name,username:u.username,email:u.email,mobileNumber:u.mobile_no,mobile_no:u.mobile_no,profileImage:u.profile_image_url,profile_image_url:u.profile_image_url}; setUser(fmt); localStorage.setItem("telegram_user_details",JSON.stringify(u)); return fmt; };
  const handleSendOTP=async(email,type)=>{ const token=getToken(); const ep=type==="new"?`${API_URL}/update-email/send-new-code`:`${API_URL}/update-email/send-old-code`; const body=type==="new"?{email}:{}; const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.message); return d; };
  const handleVerifyOTP=async(email,otp,type)=>{ const token=getToken(); const ep=type==="new"?`${API_URL}/update-email/verify-new-code`:`${API_URL}/update-email/verify-old-code`; const body=type==="new"?{email,code:otp}:{code:otp}; const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.message); return d; };
  const handleChannelJoined=(ch)=>{ handleRefresh(); showCenter("Channel joined - real-time"); };
  const handleChannelCreated=(ch)=>{ const isP=ch.is_private||ch.type==='private'||ch.channel_type==='private'; const setChannels=isP?setPrivateChannels:setPublicChannels; setChannels(p=>ch._replacePendingId?p.map(x=>String(x.channel_id||x.id)===String(ch._replacePendingId)?{...ch,_pending:false}:x):[ch,...p]); };
  const handleChannelCreateFailed=(pendingId)=>{ setPublicChannels(p=>p.filter(x=>String(x.channel_id||x.id)!==String(pendingId))); setPrivateChannels(p=>p.filter(x=>String(x.channel_id||x.id)!==String(pendingId))); };
  const handleOpenChannel = (ch) => {
    const cid = ch.channel_id || ch.id;
    if(!cid) return;
    localStorage.setItem('current_channel', JSON.stringify(ch));
    localStorage.setItem('current_channel_id', String(cid));
    navigate(`/channel/${cid}`);
  };

  const handleShareRequest=()=>{ showCenter("Invite sent - only receiver sees in Link Requests"); };

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border"/></div>;

  return (
    <>
      <div className="top-safe"/><DashboardNavbar onRefresh={handleRefresh} onLogout={handleLogout} />
      <div className="dash-shell">
        <div className="dash-fixed-wrap">
          <div className="dash-fixed-inner">
            <ProfileCard userData={user} onUpdateProfile={handleUpdateProfile} onSendOTP={handleSendOTP} onVerifyOTP={handleVerifyOTP} />
          </div>
        </div>
        <div className="dash-scroll">
          <div className="dash-scroll-inner">
            <JoinChannelBox onChannelJoined={handleChannelJoined} onOpenChannel={handleOpenChannel} />
            <CreateChannel onChannelCreated={handleChannelCreated} onChannelCreateFailed={handleChannelCreateFailed} showCenterToast={showCenter} />
            <PublicChannelSection channels={publicChannels} onUpdated={(u)=>{ cacheChannelLogo(u); setPublicChannels(p=>p.map(x=>String(x.channel_id||x.id)===String(u.channel_id||u.id)?{...x,...u}:x)); }} onDeleted={(id)=>setPublicChannels(p=>p.filter(x=>String(x.channel_id||x.id)!==String(id)))} onOpen={handleOpenChannel} onShareRequest={handleShareRequest} showCenterToast={showCenter} />
            <PrivateChannelSection channels={privateChannels} onUpdated={(u)=>{ cacheChannelLogo(u); setPrivateChannels(p=>p.map(x=>String(x.channel_id||x.id)===String(u.channel_id||u.id)?{...x,...u}:x)); }} onDeleted={(id)=>setPrivateChannels(p=>p.filter(x=>String(x.channel_id||x.id)!==String(id)))} onOpen={handleOpenChannel} onShareRequest={handleShareRequest} showCenterToast={showCenter} />
            <div className="bottom-safe-space" />
          </div>
        </div>
      </div>

      <footer className="dev-footer">
        <span className="red-icon"><CodeSlash size={16} /></span>
        <span>Developed By <b>Ajay Kedar</b></span>
      </footer>
      <div className="footer-bottom-safe"></div>

      {toast.show&&<div className="jtc"><div className={`jtt ${toast.type}`}><span className="jti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}
      <style>{`
       :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--topSafe:var(--sat);--botSafe:min(var(--sab),8px);--navH:56px;--footH:38px}
       html,body{margin:0;background:#eef2f7;overflow:hidden;height:100dvh}
      .top-safe{position:fixed;top:0;left:0;right:0;height:var(--topSafe);background:#fff;z-index:1045}
       nav.navbar{position:fixed!important;top:var(--topSafe)!important;left:0!important;right:0!important;z-index:1044!important;height:var(--navH)!important;backdrop-filter:blur(18px)!important;background:rgba(255,255,255,0.96)!important;border-bottom:1px solid #e9eef5!important;box-shadow:0 1px 0 #f1f5f9,0 8px 24px rgba(15,23,42,.04)!important}
      .dash-shell{position:fixed;top:calc(var(--navH) + var(--topSafe));left:0;right:0;bottom:calc(var(--footH) + var(--botSafe) + 4px);display:flex;flex-direction:column;background:linear-gradient(180deg,#f6f8fb 0%,#eef2f7 100%);overflow:hidden}
      .dash-fixed-wrap{flex-shrink:0;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border-bottom:1px solid #e8eef7;box-shadow:0 8px 24px rgba(15,23,42,.05);z-index:10;padding:12px 12px;backdrop-filter:blur(12px)}
      .dash-fixed-inner{max-width:760px;margin:0 auto;width:100%}
      .dash-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:12px 12px 0;scrollbar-width:thin}
      .dash-scroll-inner{max-width:760px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:10px}
      .bottom-safe-space{height:calc(48px + var(--botSafe));flex-shrink:0}
      .my-pcw-fixed{width:100%;display:flex;flex-direction:column;gap:10px}
      .my-pcc{background:#fff;border:1px solid #e9eef5;border-radius:20px;display:flex;align-items:center;gap:14px;padding:14px 16px;box-shadow:0 2px 12px rgba(15,23,42,.04);transition:.2s;cursor:pointer}
      .my-pcr{position:relative;flex-shrink:0}.my-ring{width:64px;height:64px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#0ea5e9 0%,#2563eb 45%,#7c3aed 100%);display:flex;align-items:center;justify-content:center;overflow:hidden}.my-av{width:58px;height:58px;border-radius:50%;object-fit:cover;display:block;background:#fff;border:2px solid #fff}.my-cam{position:absolute;right:-2px;bottom:-1px;width:22px;height:22px;background:#0ea5e9;border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
      .my-pct{flex:1;min-width:0}.my-pn{font-size:16px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.my-pu{font-size:12.5px;font-weight:700;color:#2563eb}.my-pe{font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .my-upw{display:flex;justify-content:center}.my-upb{height:38px;padding:0 18px;border:none;border-radius:999px;background:linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;gap:7px;box-shadow:0 6px 16px rgba(14,165,233,.28)}
      .cc-wrap{padding:4px 0!important;background:transparent!important}
      .cc-wrap.cc-card{box-shadow:none!important;border:none!important;background:transparent!important;padding:0!important;max-width:100%!important}
      .cc-wrap.cc-card.btn-only{padding:0!important;display:flex!important;justify-content:center!important;width:100%!important}
      .cc-wrap.cc-card.btn-only.cc-open-main{width:100%!important;max-width:100%!important;height:48px!important;border-radius:14px!important}
      .secw,.grid{overflow:visible!important}
      .pcard{overflow:visible!important;position:relative;background:#fff;border:1px solid #e9eef5;border-radius:16px}
      .center-modal,.my-center{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 24px)!important}
      .pop-card,.my-pop{border:none!important;border-radius:22px!important;box-shadow:0 28px 80px rgba(15,23,42,.26)!important;overflow:hidden!important}
      .jtc{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:100000!important;pointer-events:none!important;padding:20px}.jtt{display:flex!important;gap:10px!important;align-items:center!important;padding:14px 20px!important;border-radius:14px!important;color:#fff!important;font-weight:800!important;box-shadow:0 20px 44px rgba(0,0,0,.28)!important}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)!important}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important}
      .my-pv{display:flex;align-items:center;justify-content:center;padding:16px}.my-pvbox{position:relative}.my-pvimg{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:18px;background:#000}.my-pxb{position:absolute;top:-8px;right:-8px;width:34px;height:34px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center}
      .my-ec{text-align:center;margin-bottom:14px}.my-ear{position:relative;display:inline-block;cursor:pointer}.my-eimg{width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px dashed #93c5fd;background:#f1f5f9}.my-ecam{position:absolute;right:2px;bottom:2px;width:28px;height:28px;background:linear-gradient(135deg,#2563eb,#06b6d4);border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}.my-tap{font-size:11px;color:#64748b;margin-top:8px}
      .my-ff{margin-bottom:12px}.my-ff label{font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#334155}.my-inp{width:100%;height:42px;border:1px solid #dbe2f0;border-radius:12px;padding:0 13px;font-size:13px;outline:none;background:#fff}.dis{background:#f8fafc;color:#64748b}.my-row{display:flex;gap:8px;align-items:center}.flex{flex:1;min-width:0}.mt{margin-top:8px}.full{width:100%}.my-b1{height:42px;padding:0 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-weight:800;font-size:12px}.my-b2{height:42px;width:46px;border:none;border-radius:12px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center}.my-ib{height:42px;width:44px;border:1px solid #dbe2f0;border-radius:12px;background:#fff}.my-otpb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}
      .my-adj{width:300px;height:300px;margin:0 auto;background:#0f172a;border-radius:18px;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:none}.my-adj img{max-width:100%;will-change:transform}
      .my-tc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99999;pointer-events:none}.my-tt{display:flex;gap:8px;align-items:center;padding:12px 18px;border-radius:14px;color:#fff;font-weight:800;font-size:13px;box-shadow:0 16px 36px rgba(0,0,0,.26)}.my-tt.success{background:linear-gradient(135deg,#16a34a,#15803d)}.my-tt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)}.my-ti{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
      .my-pbtn{background:linear-gradient(135deg,#0ea5e9,#2563eb)!important;border:none!important;font-weight:800!important;border-radius:12px!important}

       /* ✅ FOOTER + SAFE GAP - MOBILE MEIN HIDE NAHI HOGA */
      .dev-footer{position:fixed;left:0;right:0;bottom:calc(var(--sab) + 10px);height:var(--footH);display:flex;align-items:center;justify-content:center;gap:7px;background:#ffffff;border-top:1px solid #e8eef5;box-shadow:0 -6px 24px rgba(15,23,42,.06);z-index:1060;font-size:11.5px;font-weight:700;color:#334155;letter-spacing:.2px}
      .red-icon{color:#ef4444!important;display:flex;align-items:center;justify-content:center}
      .red-icon svg{color:#ef4444!important;fill:#ef4444!important;stroke:#ef4444!important}
      .dev-footer b{color:#0f172a;font-weight:800}
      .footer-bottom-safe{position:fixed;left:0;right:0;bottom:0;height:calc(var(--sab) + 10px);background:#ffffff;z-index:1059}

       @keyframes pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
       @media(max-width:480px){
       .dev-footer{height:40px;font-size:11px;bottom:calc(var(--sab) + 14px)}
       .footer-bottom-safe{height:calc(var(--sab) + 14px)}
       .dash-shell{bottom:calc(var(--footH) + var(--sab) + 14px)}
       }
      `}</style>
    </>
  );
}
