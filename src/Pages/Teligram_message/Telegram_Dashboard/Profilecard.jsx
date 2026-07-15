import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Spinner, Button } from 'react-bootstrap';
import { PencilSquare, XLg, PersonCircle, CheckLg, Eye, EyeSlash, Camera, ZoomIn, ZoomOut, ArrowsMove } from 'react-bootstrap-icons';

const API_ROUTE_PREFIX = "/api/telegramlogin-users";
const getApiBase = () => {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_TELEGRAM_USERS_API_URL || "https://express-backend-myapp.onrender.com";
  const clean = String(raw).replace(/\/$/, ""); if(clean.endsWith(API_ROUTE_PREFIX)) return clean;
  if(/\/api\/[^/]+$/i.test(clean)) return clean.replace(/\/api\/[^/]+$/i, API_ROUTE_PREFIX); return `${clean}${API_ROUTE_PREFIX}`;
};
const API_ORIGIN = getApiBase().replace(API_ROUTE_PREFIX,"");
const resolveImg = (u)=>{ if(!u) return ""; if(u.startsWith("data:")) return u; if(u.startsWith("http")) return u; if(u.startsWith("/")) return `${API_ORIGIN}${u}`; return u; };

export default function ProfileCard({ userData, onUpdateProfile, onSendOTP, onVerifyOTP }){
  const [user,setUser]=useState(()=> userData || (()=>{ try{return JSON.parse(localStorage.getItem('telegram_user_details'))}catch{return null}})());
  const [imgVer,setImgVer]=useState(Date.now());
  const [showPreview,setShowPreview]=useState(false); const [showEdit,setShowEdit]=useState(false); const [showPwd,setShowPwd]=useState(false);
  const [toast,setToast]=useState({show:false,msg:'',type:'success'}); const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({fullName:'',email:'',newEmail:'',password:'',file:null,preview:''});
  const [otpStep,setOtpStep]=useState('none'); const [otpVal,setOtpVal]=useState({old:'',neW:''}); const [otpSent,setOtpSent]=useState({old:false,neW:false});
  const [showAdjust,setShowAdjust]=useState(false); const [adjustSrc,setAdjustSrc]=useState(""); const [scale,setScale]=useState(1); const [pos,setPos]=useState({x:0,y:0}); const [dragging,setDragging]=useState(false); const [start,setStart]=useState({x:0,y:0});
  const fileRef=useRef(null);
  const showToast=(m,t='success')=>{ setToast({show:true,msg:m,type:t}); setTimeout(()=>setToast({show:false}),2400); };
  useEffect(()=>{ if(userData){ setUser(userData); setImgVer(Date.now()); } },[userData]);

  const openEdit=()=>{ if(!user) return; setForm({fullName:user.fullName||user.full_name||'',email:user.email||'',newEmail:'',password:'',file:null,preview:''}); setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); setShowPwd(false); setShowEdit(true); };
  const onPick=e=>{ const f=e.target.files?.[0]; if(!f) return; if(!f.type.startsWith('image/')) return showToast('Only image','danger'); const r=new FileReader(); r.onload=()=>{ setAdjustSrc(r.result); setScale(1); setPos({x:0,y:0}); setShowAdjust(true); }; r.readAsDataURL(f); e.target.value=""; };
  const onDown=e=>{ setDragging(true); const p=e.touches?e.touches[0]:e; setStart({x:p.clientX-pos.x,y:p.clientY-pos.y}); }; const onMove=e=>{ if(!dragging) return; const p=e.touches?e.touches[0]:e; setPos({x:p.clientX-start.x,y:p.clientY-start.y}); }; const onUp=()=>setDragging(false);
  const confirmAdjust=()=>{ const im=new Image(); im.src=adjustSrc; im.onload=()=>{ const S=400,c=document.createElement('canvas'); c.width=S;c.height=S; const ctx=c.getContext('2d'); ctx.fillStyle="#fff"; ctx.fillRect(0,0,S,S); ctx.save(); ctx.beginPath(); ctx.arc(S/2,S/2,S/2,0,Math.PI*2); ctx.clip(); const cont=280,base=Math.max(cont/im.width,cont/im.height),fs=base*scale*(S/cont),w=im.width*fs,h=im.height*fs,x=S/2+pos.x*(S/cont)-w/2,y=S/2+pos.y*(S/cont)-h/2; ctx.drawImage(im,x,y,w,h); ctx.restore(); const url=c.toDataURL('image/jpeg',0.92); c.toBlob(b=>{ const file=new File([b],`av_${Date.now()}.jpg`,{type:'image/jpeg'}); setForm(p=>({...p,file,preview:url})); setShowAdjust(false); showToast('Adjusted'); },'image/jpeg',0.92); }; };
  const sendOld=async()=>{ setLoading(true); try{ await onSendOTP?.(user.email,'old'); setOtpStep('oldEmail'); setOtpSent(s=>({...s,old:true})); showToast('OTP sent to current email'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const verifyOld=async()=>{ if(otpVal.old.length!==6) return showToast('6 digit OTP','danger'); setLoading(true); try{ await onVerifyOTP?.(user.email,otpVal.old,'old'); setOtpStep('newEmail'); showToast('Current email verified'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const sendNew=async()=>{ if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail)) return showToast('Valid new email','danger'); setLoading(true); try{ await onSendOTP?.(form.newEmail,'new'); setOtpSent(s=>({...s,neW:true})); showToast('OTP sent to new email'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const verifyNew=async()=>{ if(otpVal.neW.length!==6) return showToast('6 digit','danger'); setLoading(true); try{ await onVerifyOTP?.(form.newEmail,otpVal.neW,'new'); setForm(p=>({...p,email:p.newEmail})); setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); showToast('New email verified'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const handleSave=async(e)=>{ e.preventDefault(); setLoading(true); try{ const payload={fullName:form.fullName,email:form.email,password:form.password||undefined,profileImage:form.file}; const up=await onUpdateProfile?.(payload); const newImg=form.preview||up?.profile_image_url||up?.profileImage||user.profile_image_url; const fin={...user,...up,full_name:form.fullName,fullName:form.fullName,email:form.email,profile_image_url:newImg,profileImage:newImg}; setUser(fin); setImgVer(Date.now()); localStorage.setItem('telegram_user_details',JSON.stringify(fin)); setShowEdit(false); showToast('Profile updated'); }catch(er){ showToast(er.message,'danger'); } setLoading(false); };

  if(!user) return null;
  const raw=user.profileImage||user.profile_image_url||""; let uImg=resolveImg(raw); if(uImg&&!uImg.startsWith('data:')) uImg+=`${uImg.includes('?')?'&':'?'}v=${imgVer}`;
  const eRaw=form.preview?raw:""; let eImg=form.preview?form.preview:uImg; const name=user.fullName||user.full_name||'User'; const email=user.email||''; const uname=user.username||''; const mobile=user.mobileNumber||user.mobile_no||'';

  return (
    <>
      <div className="pcw">
        <div className="pcc">
          <div className="pcr" onClick={()=>setShowPreview(true)}>
            <div className="ring">{uImg? <img src={uImg} alt={name} className="av"/> : <PersonCircle size={56} className="ph"/>}<span className="cam"><Camera size={11}/></span></div>
          </div>
          <div className="pct">
            <div className="pn">{name}</div>
            <div className="pu">@{uname||'username'}</div>
            <div className="pe" title={email}>{email}</div>
          </div>
        </div>
        {/* Small button BELOW card - no cut */}
        <div className="up-wrap"><button type="button" className="upb" onClick={openEdit}><PencilSquare size={12}/> Update Profile Details</button></div>
      </div>

      {/* Preview - center + X top-right exact corner + pinch zoom */}
      <Modal show={showPreview} onHide={()=>setShowPreview(false)} centered dialogClassName="center-modal" contentClassName="bg-transparent border-0 shadow-none">
        <div className="pv" onClick={()=>setShowPreview(false)}>
          <div className="pv-box" onClick={e=>e.stopPropagation()}>
            <button className="pxb" onClick={()=>setShowPreview(false)}><XLg size={14}/></button>
            <img src={uImg} alt="" className="pv-img" style={{touchAction:'pinch-zoom'}} />
          </div>
        </div>
      </Modal>

      <Modal show={showAdjust} onHide={()=>setShowAdjust(false)} centered backdrop="static" dialogClassName="center-modal" contentClassName="pop"><Modal.Header closeButton><Modal.Title className="fs-6 fw-bold"><ArrowsMove className="me-2" size={14}/>Adjust Image</Modal.Title></Modal.Header><Modal.Body className="text-center"><div className="adj" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}><img src={adjustSrc} alt="" style={{transform:`translate(${pos.x}px,${pos.y}px) scale(${scale})`}} draggable={false}/></div><div className="d-flex align-items-center gap-2 mt-3"><ZoomOut size={14}/><input type="range" min="1" max="3" step="0.02" value={scale} onChange={e=>setScale(parseFloat(e.target.value))} className="form-range flex-grow-1"/><ZoomIn size={14}/></div></Modal.Body><Modal.Footer><Button variant="light" size="sm" onClick={()=>setShowAdjust(false)}>Cancel</Button><Button size="sm" onClick={confirmAdjust} className="pbtn">OK & Use</Button></Modal.Footer></Modal>

      <Modal show={showEdit} onHide={()=>setShowEdit(false)} centered dialogClassName="center-modal" contentClassName="pop"><Modal.Header closeButton><Modal.Title className="fs-6 fw-bold">Update Profile</Modal.Title></Modal.Header>
        <Form onSubmit={handleSave}><Modal.Body>
          <div className="ec"><div className="ear" onClick={()=>fileRef.current?.click()}><img src={eImg||`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`} alt="" className="eimg"/><span className="ecam"><Camera size={13}/></span></div><div className="tap">Tap round logo to change</div><Form.Control ref={fileRef} type="file" accept="image/*" hidden onChange={onPick}/></div>
          <div className="ff"><label>Full Name</label><input className="inp" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required/></div>
          <div className="ff"><label>Username</label><input className="inp dis" value={uname} disabled/><small className="sm">Cannot change</small></div>
          <div className="ff"><label>Mobile</label><input className="inp dis" value={mobile} disabled/><small className="sm">Cannot change</small></div>
          <div className="ff"><label>Email</label>{otpStep==='none'?<div className="row2"><input className="inp dis flex" value={form.email} disabled/><button type="button" className="b1" onClick={sendOld}>{loading?<Spinner size="sm"/>:'Change'}</button></div>:<div className="otpb">{otpStep==='oldEmail'&&<><small>OTP sent to <b>{user.email}</b></small><div className="row2 mt"><input className="inp flex" placeholder="6-digit OTP" value={otpVal.old} onChange={e=>setOtpVal(p=>({...p,old:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="b2" onClick={verifyOld}><CheckLg/></button></div></>}{otpStep==='newEmail'&&<><input className="inp" placeholder="New email address" value={form.newEmail} onChange={e=>setForm(p=>({...p,newEmail:e.target.value}))}/>{!otpSent.neW?<button type="button" className="b1 full mt" onClick={sendNew}>Send OTP to new</button>:<div className="row2 mt"><input className="inp flex" placeholder="OTP for new email" value={otpVal.neW} onChange={e=>setOtpVal(p=>({...p,neW:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="b2" onClick={verifyNew}><CheckLg/></button></div>}</>}</div>}</div>
          <div className="ff"><label>New Password</label><div className="row2"><input className="inp flex" type={showPwd?'text':'password'} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Leave blank to keep"/><button type="button" className="ib" onClick={()=>setShowPwd(!showPwd)}>{showPwd?<EyeSlash size={14}/>:<Eye size={14}/>}</button></div></div>
        </Modal.Body><Modal.Footer><Button variant="light" size="sm" onClick={()=>setShowEdit(false)}>Cancel</Button><Button type="submit" size="sm" disabled={loading||otpStep!=='none'} className="pbtn">{loading?<Spinner size="sm"/>:'Save Changes'}</Button></Modal.Footer></Form>
      </Modal>

      {toast.show&&<div className="tc"><div className={`tt ${toast.type}`}><span className="ti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
       .pcw{padding:0 12px 6px;max-width:760px;margin:0 auto;overflow:visible}
       .pcc{background:#fff;border:1px solid #e2e8f0;border-radius:16px;display:flex;align-items:center;gap:12px;padding:12px 14px;box-shadow:0 2px 10px rgba(0,0,0,.03);overflow:visible}
       .pcr{position:relative;flex-shrink:0;cursor:pointer}.ring{width:60px;height:60px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#2563eb,#06b6d4);display:flex;align-items:center;justify-content:center;overflow:hidden}
       .av{width:56px;height:56px;border-radius:50%;object-fit:cover;display:block;background:#fff}.ph{color:#94a3b8;background:#fff;border-radius:50%}
       .cam{position:absolute;right:-2px;bottom:-1px;width:20px;height:20px;background:#0ea5e9;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
       .pct{flex:1;min-width:0;overflow:hidden}.pn{font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}.pu{font-size:12.5px;font-weight:600;color:#2563eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pe{font-size:12.5px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
       .up-wrap{display:flex;justify-content:flex-start;padding:8px 2px 0}.upb{height:34px;padding:0 14px;border:none;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(37,99,235,.22);cursor:pointer}
       .upb:active{transform:scale(.96)}
       .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}
       .pop{border:none!important;border-radius:18px!important;box-shadow:0 24px 60px rgba(0,0,0,.2)!important;overflow:hidden!important}
       .pbtn{background:linear-gradient(135deg,#2563eb,#06b6d4)!important;border:none!important;font-weight:800!important}
       .pv{display:flex;align-items:center;justify-content:center;padding:20px}.pv-box{position:relative}.pv-img{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:16px;background:#000;display:block;touch-action:pinch-zoom;animation:pop .25s ease}.pxb{position:absolute;top:0;right:0;transform:translate(35%,-35%);width:32px;height:32px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}
       .ec{text-align:center;margin-bottom:12px}.ear{position:relative;display:inline-block;cursor:pointer}.eimg{width:88px;height:88px;border-radius:50%;object-fit:cover;border:2px dashed #93c5fd;background:#f1f5f9}.ecam{position:absolute;right:2px;bottom:2px;width:26px;height:26px;background:#2563eb;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}.tap{font-size:11px;color:#64748b;margin-top:6px}
       .ff{margin-bottom:10px}.ff label{font-size:11px;font-weight:800;margin-bottom:3px;display:block;color:#334155}.inp{width:100%;height:38px;border:1px solid #dbe2f0;border-radius:10px;padding:0 12px;font-size:13px;outline:none}.inp:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.dis{background:#f8fafc}.sm{font-size:10px;color:#94a3b8}.row2{display:flex;gap:8px;align-items:center}.flex{flex:1;min-width:0}.mt{margin-top:8px}.full{width:100%}.b1{height:38px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-weight:700;font-size:12px;cursor:pointer}.b2{height:38px;width:42px;border:none;border-radius:10px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center}.ib{height:38px;width:40px;border:1px solid #dbe2f0;border-radius:10px;background:#fff}.otpb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px}
       .adj{width:280px;height:280px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:none}.adj img{max-width:100%;will-change:transform}
       .tc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99999;pointer-events:none}.tt{display:flex;gap:8px;align-items:center;padding:12px 16px;border-radius:12px;color:#fff;font-weight:700;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.2)}.tt.success{background:linear-gradient(135deg,#16a34a,#15803d)}.tt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)}.ti{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
       @keyframes pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </>
  );
}