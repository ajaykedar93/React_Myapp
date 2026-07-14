import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Spinner, Button } from 'react-bootstrap';
import { PencilSquare, XLg, PersonCircle, CheckLg, Eye, EyeSlash, Camera, ZoomIn, ZoomOut, ArrowsMove } from 'react-bootstrap-icons';

const API_ROUTE_PREFIX = "/api/telegramlogin-users";
const getApiBase = () => {
  const raw = import.meta.env.VITE_TELEGRAM_USERS_API_URL || "https://express-backend-myapp.onrender.com" || "http://localhost:5000";
  const clean = String(raw).replace(/\/$/, "");
  if (clean.endsWith(API_ROUTE_PREFIX)) return clean;
  if (/\/api\/[^/]+$/i.test(clean)) return clean.replace(/\/api\/[^/]+$/i, API_ROUTE_PREFIX);
  return `${clean}${API_ROUTE_PREFIX}`;
};
const API_ORIGIN = getApiBase().replace(API_ROUTE_PREFIX, "");
const resolveImg = (u) => { if(!u) return ""; if(u.startsWith("data:")) return u; if(u.startsWith("http")) return u; if(u.startsWith("/")) return `${API_ORIGIN}${u}`; return u; };

const ProfileCard = ({ userData, onUpdateProfile, onSendOTP, onVerifyOTP }) => {
  const [user, setUser] = useState(() => {
    if (userData) return userData;
    try { const s = localStorage.getItem('telegram_user_details'); return s?JSON.parse(s):null; } catch { return null; }
  });
  const [imgVer, setImgVer] = useState(Date.now());
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [toast, setToast] = useState({ show:false, msg:'', type:'success' });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName:'', email:'', newEmail:'', password:'', file:null, preview:'' });
  const [otpStep, setOtpStep] = useState('none');
  const [otpVal, setOtpVal] = useState({ old:'', neW:'' });
  const [otpSent, setOtpSent] = useState({ old:false, neW:false });

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustSrc, setAdjustSrc] = useState("");
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({x:0,y:0});
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({x:0,y:0});
  const fileRef = useRef(null);
  const showToast = (m,t='success')=>{ setToast({show:true,msg:m,type:t}); setTimeout(()=>setToast({show:false,msg:'',type:'success'}),2400); };

  useEffect(()=>{ if(userData){ setUser(userData); setImgVer(Date.now()); } },[userData]);

  const openEdit = () => {
    if(!user) return;
    setForm({ fullName: user.fullName||user.full_name||'', email: user.email||'', newEmail:'', password:'', file:null, preview:'' });
    setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); setShowPwd(false); setShowEdit(true);
  };

  const onPickImage = (e) => {
    const f=e.target.files?.[0]; if(!f) return;
    if(!f.type.startsWith('image/')) return showToast('Only image','danger');
    const r=new FileReader(); r.onload=()=>{ setAdjustSrc(r.result); setScale(1); setPos({x:0,y:0}); setShowAdjust(true); }; r.readAsDataURL(f);
    e.target.value="";
  };

  const onDown = e=>{ setDragging(true); const p=e.touches?e.touches[0]:e; setStart({x:p.clientX-pos.x,y:p.clientY-pos.y}); };
  const onMove = e=>{ if(!dragging) return; const p=e.touches?e.touches[0]:e; setPos({x:p.clientX-start.x,y:p.clientY-start.y}); };
  const onUp = ()=>setDragging(false);

  const confirmAdjust = () => {
    const img=new window.Image(); img.src=adjustSrc;
    img.onload=()=>{
      const SIZE=400, canvas=document.createElement('canvas'); canvas.width=SIZE; canvas.height=SIZE;
      const ctx=canvas.getContext('2d'); ctx.fillStyle="#fff"; ctx.fillRect(0,0,SIZE,SIZE);
      ctx.save(); ctx.beginPath(); ctx.arc(SIZE/2,SIZE/2,SIZE/2,0,Math.PI*2); ctx.clip();
      const cont=280, base=Math.max(cont/img.width, cont/img.height), fScale=base*scale*(SIZE/cont);
      const w=img.width*fScale, h=img.height*fScale;
      const x=SIZE/2+pos.x*(SIZE/cont)-w/2, y=SIZE/2+pos.y*(SIZE/cont)-h/2;
      ctx.drawImage(img,x,y,w,h); ctx.restore();
      const dataUrl=canvas.toDataURL('image/jpeg',0.92);
      canvas.toBlob(b=>{ const file=new File([b],`avatar_${Date.now()}.jpg`,{type:'image/jpeg'}); setForm(p=>({...p,file,preview:dataUrl})); setShowAdjust(false); showToast('Adjusted','success'); },'image/jpeg',0.92);
    };
  };

  const sendOld=async()=>{ setLoading(true); try{ await onSendOTP?.(user.email,'old'); setOtpStep('oldEmail'); setOtpSent(s=>({...s,old:true})); showToast('OTP sent to old email','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const verifyOld=async()=>{ if(otpVal.old.length!==6) return showToast('6 digit OTP','danger'); setLoading(true); try{ await onVerifyOTP?.(user.email,otpVal.old,'old'); setOtpStep('newEmail'); showToast('Old email verified','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const sendNew=async()=>{ if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail)) return showToast('Valid new email','danger'); setLoading(true); try{ await onSendOTP?.(form.newEmail,'new'); setOtpSent(s=>({...s,neW:true})); showToast('OTP sent to new email','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };
  const verifyNew=async()=>{ if(otpVal.neW.length!==6) return showToast('6 digit OTP','danger'); setLoading(true); try{ await onVerifyOTP?.(form.newEmail,otpVal.neW,'new'); setForm(p=>({...p,email:p.newEmail})); setOtpStep('none'); setOtpVal({old:'',neW:''}); setOtpSent({old:false,neW:false}); showToast('Email verified & updated','success'); }catch(e){ showToast(e.message,'danger'); } setLoading(false); };

  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true);
    try{
      const payload={ fullName:form.fullName, email:form.email, password:form.password||undefined, profileImage:form.file };
      const updated = await onUpdateProfile?.(payload);
      const newImg = form.preview || updated?.profile_image_url || updated?.profileImage || user.profile_image_url || user.profileImage;
      const finalUser = { ...user, ...updated, full_name:form.fullName, fullName:form.fullName, email:form.email, profile_image_url:newImg, profileImage:newImg };
      setUser(finalUser); setImgVer(Date.now());
      localStorage.setItem('telegram_user_details', JSON.stringify(finalUser));
      setForm({ fullName:finalUser.fullName, email:finalUser.email, newEmail:'', password:'', file:null, preview:'' });
      setShowEdit(false); showToast('Profile updated','success');
    }catch(err){ showToast(err.message||'Failed','danger'); } setLoading(false);
  };

  if(!user) return null;
  const rawUserImg = user.profileImage || user.profile_image_url || "";
  let userImg = resolveImg(rawUserImg); if(userImg && !userImg.startsWith('data:')) userImg+= (userImg.includes('?')?'&':'?')+`v=${imgVer}`;
  const editImgRaw = form.preview ? form.preview : rawUserImg;
  let editImg = resolveImg(editImgRaw); if(editImg && !editImg.startsWith('data:') && !form.preview) editImg+= (editImg.includes('?')?'&':'?')+`v=${imgVer}`;
  const name=user.fullName||user.full_name||'User', email=user.email||'', uname=user.username||'';

  return (
    <>
      <div className="pcw">
        <div className="pcc">
          <div className="pcr" onClick={()=>setShowPreview(true)}>
            <div className="ring">{userImg?<img src={userImg} alt={name} className="av"/>:<PersonCircle size={62} className="av ph"/>}</div>
            <span className="cam"><Camera size={11}/></span>
          </div>
          <div className="pct">
            <div className="pn">{name}</div>
            <div className="pu">@{uname||'username'}</div>
            <div className="pe" title={email}>{email}</div>
          </div>
          <button type="button" className="upb" onClick={(e)=>{e.stopPropagation(); openEdit();}}><PencilSquare size={12}/> Update Profile</button>
        </div>
      </div>

      <Modal show={showPreview} onHide={()=>setShowPreview(false)} centered dialogClassName="center-modal" contentClassName="bg-transparent border-0 shadow-none"><div className="pv" onClick={()=>setShowPreview(false)}><button type="button" className="pxb" onClick={()=>setShowPreview(false)}><XLg size={14}/></button><img src={userImg||'https://via.placeholder.com/500'} alt="p" className="pvimg" onClick={e=>e.stopPropagation()} /></div></Modal>

      <Modal show={showAdjust} onHide={()=>setShowAdjust(false)} centered backdrop="static" dialogClassName="center-modal" contentClassName="pop-card"><Modal.Header closeButton className="py-2"><Modal.Title className="fs-6 fw-bold"><ArrowsMove size={14} className="me-1"/> Adjust Image</Modal.Title></Modal.Header><Modal.Body className="text-center"><div className="adj-wrap" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}><div className="adj-box"><img src={adjustSrc} alt="adj" className="adj-img" style={{transform:`translate(${pos.x}px,${pos.y}px) scale(${scale})`}} draggable={false}/></div><div className="adj-mask"/><div className="adj-grid"/></div><div className="adj-ctrl"><ZoomOut size={14}/><input type="range" min="1" max="3" step="0.02" value={scale} onChange={e=>setScale(parseFloat(e.target.value))} className="adj-range"/><ZoomIn size={14}/></div><div className="small text-muted" style={{fontSize:11}}>Drag to move • Slider to zoom • Saves inside round</div></Modal.Body><Modal.Footer className="py-2"><Button size="sm" variant="light" onClick={()=>setShowAdjust(false)}>Cancel</Button><Button size="sm" onClick={confirmAdjust} className="pbtn">OK & Use</Button></Modal.Footer></Modal>

      <Modal show={showEdit} onHide={()=>setShowEdit(false)} centered dialogClassName="center-modal" contentClassName="pop-card"><Modal.Header closeButton className="py-2"><Modal.Title className="fs-6 fw-bold">Update Profile</Modal.Title></Modal.Header>
        <Form onSubmit={handleSave}><Modal.Body>
          <div className="ec"><div className="ear" onClick={()=>fileRef.current?.click()}><img src={editImg||'https://ui-avatars.com/api/?name='+encodeURIComponent(name)} alt="edit" className="eimg"/><span className="ecam"><Camera size={13}/></span></div><div className="tap">Tap to change - adjust inside round</div><Form.Control ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage}/></div>
          <div className="ff"><label>Full Name</label><input className="inp" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} required/></div>
          <div className="ff"><label>Username</label><input className="inp dis" value={uname} disabled/><small>Read only</small></div>
          <div className="ff"><label>Mobile</label><input className="inp dis" value={user.mobileNumber||user.mobile_no||''} disabled/><small>Read only</small></div>
          <div className="ff"><label>Email</label>{otpStep==='none'?<div className="row2"><input className="inp dis flex" value={form.email} disabled/><button type="button" className="b1" onClick={sendOld}>{loading?<Spinner size="sm"/>:'Change'}</button></div>:<div className="otpb">{otpStep==='oldEmail'&&<><small>Verify: <b>{user.email}</b></small><div className="row2 mt"><input className="inp flex" placeholder="6-digit OTP" value={otpVal.old} onChange={e=>setOtpVal(p=>({...p,old:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="b2" onClick={verifyOld}><CheckLg/></button></div></>}{otpStep==='newEmail'&&<><input className="inp" placeholder="New email" value={form.newEmail} onChange={e=>setForm(p=>({...p,newEmail:e.target.value}))}/>{!otpSent.neW?<button type="button" className="b1 full mt" onClick={sendNew}>Send OTP to new</button>:<div className="row2 mt"><input className="inp flex" placeholder="OTP for new" value={otpVal.neW} onChange={e=>setOtpVal(p=>({...p,neW:e.target.value.replace(/\D/g,'').slice(0,6)}))}/><button type="button" className="b2" onClick={verifyNew}><CheckLg/></button></div>}</>}</div>}</div>
          <div className="ff"><label>New Password (optional)</label><div className="row2"><input className="inp flex" type={showPwd?'text':'password'} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Leave blank to keep"/><button type="button" className="ib" onClick={()=>setShowPwd(!showPwd)}>{showPwd?<EyeSlash size={15}/>:<Eye size={15}/>}</button></div></div>
        </Modal.Body><Modal.Footer className="py-2"><Button size="sm" variant="light" onClick={()=>setShowEdit(false)}>Cancel</Button><Button size="sm" type="submit" disabled={loading||otpStep!=='none'} className="pbtn">{loading?<Spinner size="sm"/>:'Save Changes'}</Button></Modal.Footer></Form>
      </Modal>

      {toast.show&&<div className="tc"><div className={`tt ${toast.type}`}><span className="ti">{toast.type==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
       .pcw{padding:10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;overflow:visible}
       .pcc{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;display:flex;align-items:center;gap:12px;padding:12px 14px;overflow:visible;position:relative;z-index:1}
       .pcr{position:relative;cursor:pointer;flex-shrink:0;z-index:2}.ring{width:62px;height:62px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#2563eb,#06b6d4);overflow:hidden;display:flex;align-items:center;justify-content:center}
       .av{width:58px;height:58px;border-radius:50%;object-fit:cover!important;background:#fff;display:block}.av.ph{color:#64748b;background:#fff}
       .cam{position:absolute;right:-2px;bottom:-1px;width:20px;height:20px;background:#2563eb;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;pointer-events:none}
       .pct{flex:1;min-width:0;overflow:visible}.pn{font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pu{font-size:12px;font-weight:700;color:#2563eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pe{font-size:12px;color:#475569;white-space:normal!important;word-break:break-all!important;overflow-wrap:anywhere!important;line-height:1.35;max-width:100%} /* FIX cut */
       .upb{height:36px;padding:0 14px;border:none;border-radius:999px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-size:12.5px;font-weight:800;display:flex;gap:6px;align-items:center;cursor:pointer!important;pointer-events:auto!important;position:relative;z-index:5;flex-shrink:0;white-space:nowrap;box-shadow:0 6px 14px rgba(37,99,235,.22)}.upb:active{transform:scale(.96)}
       @media(max-width:560px){.pcc{flex-wrap:wrap}.pct{flex-basis:calc(100% - 80px)}.upb{margin-left:74px}}
       .ec{text-align:center;margin-bottom:14px}.ear{position:relative;display:inline-block;cursor:pointer}.eimg{width:92px;height:92px;border-radius:50%;object-fit:cover;background:#f1f5f9;border:2px dashed #93c5fd;display:block}.ecam{position:absolute;right:2px;bottom:2px;width:26px;height:26px;background:#2563eb;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
       .tap{font-size:11px;color:#64748b;margin-top:6px}.ff{margin-bottom:12px}.ff label{font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#334155}.inp{width:100%;height:40px;border:1px solid #dbe2f0;border-radius:10px;padding:0 12px;font-size:13.5px;outline:none;min-width:0;transition:.15s}.inp:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.dis{background:#f8fafc;color:#475569}.row2{display:flex;gap:8px;align-items:center}.flex{flex:1;min-width:0}.mt{margin-top:8px}.full{width:100%}.b1{height:40px;padding:0 16px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;font-weight:800;font-size:12px;flex-shrink:0;cursor:pointer}.b2{height:40px;width:44px;border:none;border-radius:10px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}.ib{height:40px;width:42px;border:1px solid #dbe2f0;border-radius:10px;background:#fff;cursor:pointer}.otpb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px}
       .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:18px!important;box-shadow:0 24px 64px rgba(15,23,42,.24)!important;overflow:hidden!important;animation:pop .28s cubic-bezier(.16,1,.3,1)}.pbtn{background:linear-gradient(135deg,#2563eb,#06b6d4)!important;border:none!important;font-weight:800!important;border-radius:10px!important}
       .pv{position:relative;display:flex;justify-content:center}.pvimg{max-width:90vw;max-height:84vh;object-fit:contain;background:#000;border-radius:16px;display:block}.pxb{position:absolute;top:-10px;right:-10px;width:36px;height:36px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}
       .adj-wrap{position:relative;width:280px;height:280px;margin:0 auto;overflow:hidden;border-radius:16px;background:#0f172a;touch-action:none;cursor:grab}.adj-box{width:100%;height:100%;display:flex;align-items:center;justify-content:center}.adj-img{max-width:100%;max-height:100%;will-change:transform;user-select:none;pointer-events:none}.adj-mask{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 9999px rgba(0,0,0,.55);border:2px dashed rgba(255,255,255,.85);pointer-events:none}.adj-grid{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at center, transparent 67%, rgba(255,255,255,.12) 68%);pointer-events:none}.adj-ctrl{display:flex;align-items:center;gap:10px;margin-top:12px}.adj-range{flex:1;accent-color:#2563eb}
       .tc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:10000;pointer-events:none;padding:20px}.tt{display:flex;gap:8px;align-items:center;padding:12px 18px;border-radius:12px;color:#fff;font-weight:800;font-size:13px;box-shadow:0 14px 32px rgba(0,0,0,.24);pointer-events:auto;animation:pop .28s ease}.tt.success{background:linear-gradient(135deg,#16a34a,#15803d)}.tt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)}.ti{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
       @keyframes pop{from{opacity:0;transform:scale(.88) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>
    </>
  );
};
export default ProfileCard;