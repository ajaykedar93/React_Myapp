import React, { useState, useRef, useEffect } from 'react';
import { Modal, Spinner, Button, Form } from 'react-bootstrap';
import { ThreeDotsVertical, LockFill, PencilSquare, Trash, Share, Link45deg, Search, CheckLg, XLg, Camera, PencilFill, ExclamationTriangle, ZoomIn, ZoomOut } from 'react-bootstrap-icons';

const API_BASE = "https://express-backend-myapp.onrender.com";
const FRONTEND_BASE = "https://react-myapp-omega.vercel.app";
const API = `${API_BASE}/api/telegramlogin-channels`;
const USERS_API = `${API_BASE}/api/telegramlogin-users`;
const ALLMISS_API = `${API_BASE}/api/telegramlogin-allmiss`;

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getUid = ()=>{ try{ const t=getToken(); if(!t) return 0; const p=JSON.parse(atob(t.split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{return 0;} };
const img = (u)=>{ if(!u) return `https://ui-avatars.com/api/?name=P&background=fee2e2&color=991b1b`; if(u.startsWith("data:")||u.startsWith("http")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const fmt = (iso)=>{ try{ if(!iso) return ""; const d=new Date(iso); if(isNaN(d)) return ""; return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});}catch{return "";} };
const isOwner = (ch)=>{ try{ const uid=String(getUid()); const raw=localStorage.getItem("my_created_channels"); const my=raw?JSON.parse(raw):[]; if(uid==="0") return my.includes(String(ch.channel_id||ch.id)); return String(ch.created_by_user_id)===uid || ch.is_owner===true || String(ch.member_role||"").toLowerCase()==="owner" || my.includes(String(ch.channel_id||ch.id)); }catch{ return ch.is_owner===true; } };
const getJoinUrl = (ch) => `${FRONTEND_BASE}/#/channel/join/${ch.share_code||ch.channel_id||ch.id}`;
const isTrusted = (id) => { try{ return localStorage.getItem(`priv_trust_${id}_${getDeviceId()}`)==="1"; }catch{return false;} };

export default function PrivateChannelSection({ channels=[], onUpdated, onDeleted, onOpen, showCenterToast }){
  const [visible,setVisible]=useState(6);
  const [menuId,setMenuId]=useState(null);
  const [menuUp,setMenuUp]=useState(false);
  const [preview,setPreview]=useState(null);
  const [edit,setEdit]=useState({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false});
  const [adjust,setAdjust]=useState({open:false,src:"",scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false});
  const [share,setShare]=useState({show:false,ch:null,users:[],filtered:[],sel:[],search:"",pinInput:"",loading:false,fetching:false});
  const [pinBox,setPinBox]=useState({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false});
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const fileRef=useRef(null);
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); showCenterToast?.(m,t); setTimeout(()=>setToast(s=>({...s,show:false})),2600); };

  useEffect(()=>{ const h=e=>{ if(!e.target.closest('.mdot-wrap')&&!e.target.closest('.dmenu')) setMenuId(null); }; document.addEventListener('click',h); return()=>document.removeEventListener('click',h); },[]);
  useEffect(()=>setVisible(6),[channels?.length]);

  const list = (channels||[]).slice(0,visible);

  // ✅ PRIVATE CHECK FAKT YA PAGE VAR
  const openCard=(ch,e)=>{
    if(e.target.closest('.no-open')) return;
    const id=String(ch.channel_id||ch.id);
    if(isOwner(ch)){ // owner la PIN nako
      onOpen?.(ch);
      return;
    }
    if(isTrusted(id)){
      // already verified - direct open, pudhchya page var check nako
      onOpen?.(ch);
      return;
    }
    // first time - PIN box dakhav
    setPinBox({show:true,mode:"open",ch,pin:"",trust:true,err:"",loading:false});
  };

  const handleDotClick = (e, id) => {
    e.stopPropagation();
    if(menuId===id){ setMenuId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuUp(spaceBelow < 160);
    setMenuId(id);
  };

  const startEdit=(ch)=>{ setMenuId(null); setEdit({show:true,ch,name:ch.channel_name||"",desc:ch.channel_description||"",file:null,prev:ch.logo_url||ch.channel_logo_url||"",loading:false}); setAdjust({open:false,src:"",scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false}); };
  const onAdjustPick=(file)=>{
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      setEdit(s=>({...s,file,prev:reader.result}));
      setAdjust({open:true,src:reader.result,scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false});
    };
    reader.readAsDataURL(file);
  };
  const getPoint=(e)=>{ const p=e.touches?.[0]||e; return {x:p.clientX,y:p.clientY}; };
  const onAdjustDown=(e)=>{ e.preventDefault(); const point=getPoint(e); setAdjust(a=>({...a,dragging:true,start:{x:point.x-a.pos.x,y:point.y-a.pos.y}})); };
  const onAdjustMove=(e)=>{ if(!adjust.dragging) return; const point=getPoint(e); setAdjust(a=>({...a,pos:{x:point.x-a.start.x,y:point.y-a.start.y},modified:true})); };
  const onAdjustUp=()=>{ if(adjust.dragging) setAdjust(a=>({...a,dragging:false})); };
  const onAdjustWheel=(e)=>{ if(!adjust.open) return; e.preventDefault(); const delta = e.deltaY > 0 ? -0.05 : 0.05; setAdjust(a=>({ ...a, scale: Math.min(3, Math.max(1, a.scale + delta)), modified:true })); };
  const createAdjustedLogo=()=>{
    return new Promise((resolve)=>{
      const sourceUrl = adjust.src || (edit.file ? URL.createObjectURL(edit.file) : "");
      if(!sourceUrl){ resolve(edit.file); return; }
      const image=new Image(); image.crossOrigin="anonymous";
      const tempUrl = (!adjust.src && edit.file) ? sourceUrl : null;
      image.onload=()=>{
        const size=500; const canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size;
        const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,size,size);
        ctx.save(); ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
        const base=Math.max(size/image.width,size/image.height);
        const renderScale=base * adjust.scale;
        const width=image.width * renderScale;
        const height=image.height * renderScale;
        const x=size/2 + adjust.pos.x - width/2;
        const y=size/2 + adjust.pos.y - height/2;
        ctx.drawImage(image,x,y,width,height);
        ctx.restore();
        canvas.toBlob((blob)=>{
          if(tempUrl) URL.revokeObjectURL(tempUrl);
          if(blob){ resolve(new File([blob],`channel_logo_${Date.now()}.png`,{type:'image/png'})); }
          else { resolve(edit.file); }
        },'image/png');
      };
      image.onerror=()=>{
        if(tempUrl) URL.revokeObjectURL(tempUrl);
        resolve(edit.file);
      };
      image.src=sourceUrl;
    });
  };
  const onLogoPick = (e) => {
    const f=e.target.files?.[0]; if(!f) return;
    onAdjustPick(f);
  };
  const openAdjustModal=()=>{
    const source = edit.prev || edit.ch?.logo_url || edit.ch?.channel_logo_url || edit.ch?.logo_url || "";
    if(!source) return toastC("No logo to adjust","danger");
    setAdjust(a=>({ ...a, open:true, src:source, scale:a.scale, pos:a.pos, modified:false }));
  };
  const saveEdit=async()=>{
    if((edit.name||"").trim().length<3) return toastC("Min 3 chars","danger");
    setEdit(s=>({...s,loading:true}));
    try{
      const fd=new FormData();
      fd.append("channel_name",edit.name.trim());
      fd.append("channel_description",(edit.desc||"").trim());
      fd.append("device_id",getDeviceId());
      if(edit.file || adjust.modified){
        const adjustedFile = await createAdjustedLogo();
        if(adjustedFile) fd.append("channel_logo",adjustedFile);
      }
      const id=edit.ch.channel_id||edit.ch.id;
      const res=await fetch(`${API}/${id}`,{method:"PUT",headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},body:fd});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Update failed");
      const updated = d.channel||d.data||d;
      const updatedChannel = {...edit.ch,...updated,channel_logo_url:updated.channel_logo_url||updated.logo_url||updated.channel_logo||edit.prev,logo_zoom:adjust.scale,logo_x:adjust.pos.x,logo_y:adjust.pos.y};
      onUpdated?.(updatedChannel); setEdit({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false}); setAdjust({open:false,src:"",scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false}); toastC("Private updated");
    }catch(e){ toastC(e.message,"danger"); setEdit(s=>({...s,loading:false})); }
  };

  const openShare=async(ch)=>{
    setMenuId(null);
    setShare({show:true,ch,users:[],filtered:[],sel:[],search:"",pinInput:"",loading:false,fetching:true});
    try{
      const res=await fetch(`${USERS_API}/all-register-users?limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Users load failed");
      const all=(d.users||d.data||[]).filter(u=>Number(u.telegram_user_id||u.id)!==getUid());
      setShare(s=>({...s,users:all,filtered:all,fetching:false}));
    }catch(e){ setShare(s=>({...s,fetching:false})); toastC(e.message,"danger"); }
  };

  const doShare=async()=>{
    if(share.sel.length===0) return toastC("Select user","danger");
    if(!/^\d{4,8}$/.test(share.pinInput)) return toastC("Enter original 4-8 digit PIN","danger");
    setShare(s=>({...s,loading:true}));
    try{
      const ch=share.ch;
      const res=await fetch(`${ALLMISS_API}/send-link`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},
        body:JSON.stringify({ channel_id: ch.channel_id||ch.id, receiver_ids: share.sel, security_pin: share.pinInput })
      });
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Share failed");
      try{ await navigator.clipboard.writeText(`${getJoinUrl(ch)}\nPIN: ${share.pinInput}`); }catch{}
      toastC(`Shared to ${d.sent_count||share.sel.length}`);
      setShare({show:false,ch:null,users:[],filtered:[],sel:[],search:"",pinInput:"",loading:false,fetching:false});
    }catch(e){ toastC(e.message,"danger"); setShare(s=>({...s,loading:false})); }
  };

  const copyUrl=(ch)=>{ try{ navigator.clipboard.writeText(getJoinUrl(ch)); }catch{} toastC("Hosted URL copied"); setMenuId(null); };
  const askPin=(ch,mode)=>{ setMenuId(null); setPinBox({show:true,mode,ch,pin:"",trust:true,err:"",loading:false}); };

  // ✅ FIXED PIN LOGIC - EKDA VERIFY -> PARAT NAKO
  const submitPin=async()=>{
    if(!/^\d{4,8}$/.test(pinBox.pin)) return setPinBox(s=>({...s,err:"4-8 digit PIN taka"}));
    setPinBox(s=>({...s,loading:true,err:""}));
    const ch=pinBox.ch; const id=String(ch.channel_id||ch.id); const did=getDeviceId();
    try{
      if(pinBox.mode==="open"){
        const res=await fetch(`${API}/${id}/verify-pin`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({security_pin:pinBox.pin,device_id:did,trust_device:pinBox.trust})});
        const d=await res.json(); if(!res.ok) throw new Error(d.message||"Wrong PIN");
        // ✅ 3 thikani save - pudhchya page var check nako
        localStorage.setItem(`priv_trust_${id}_${did}`,"1");
        localStorage.setItem(`verified_${id}`,"1");
        try{
          const old=JSON.parse(localStorage.getItem('verified_pins')||'{}');
          old[id]=Date.now();
          localStorage.setItem('verified_pins', JSON.stringify(old));
        }catch{}
        setPinBox({show:false,ch:null,pin:"",trust:true,err:"",loading:false});
        onOpen?.(ch); // ata direct open - delay nahi
        toastC("Verified");
        return;
      }
      if(pinBox.mode==="delete"){
        const res=await fetch(`${API}/${id}`,{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({device_id:did,security_pin:pinBox.pin})});
        const d=await res.json(); if(!res.ok) throw new Error(d.message||"Wrong PIN"); onDeleted?.(id); toastC("Deleted"); setPinBox({show:false}); return;
      }
      if(pinBox.mode==="remove"){
        const res=await fetch(`${ALLMISS_API}/remove/${id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({security_pin:pinBox.pin})});
        const d=await res.json(); if(!res.ok) throw new Error(d.message||"Wrong PIN"); onDeleted?.(id); toastC("Removed"); setPinBox({show:false}); return;
      }
    }catch(e){ setPinBox(s=>({...s,err:e.message,loading:false})); toastC(e.message,"danger"); }
  };

  return (
    <>
      <div className="secw priv-sec">
        <div className="sech"><span className="hico privico"><LockFill size={12}/></span> Private Channels <span className="cbadge privb">{channels?.length||0}</span></div>
        {!channels || channels.length===0? <div className="empty">No private channels</div> :
          <div className="grid">{list.map(ch=>{ const id=String(ch.channel_id||ch.id); const logo=ch.logo_url||ch.channel_logo_url||""; const owner=isOwner(ch); const trusted=isTrusted(id); const active=menuId===id; return(
            <div key={id} className={`pcard privcard ${active?'menu-open':''}`} onClick={(e)=>openCard(ch,e)}>
              <div className="pcard-top">
                <div className="logo no-open" onClick={()=>setPreview(img(logo))}><img src={img(logo)} alt="" style={ch.logo_zoom?{transform:`translate(${ch.logo_x||0}px,${ch.logo_y||0}px) scale(${ch.logo_zoom||1})`}:undefined}/></div>
                <div className="pinfo"><div className="pname">{ch.channel_name||"Private"}</div><div className="row2"><span className="pbadge priv">Private</span><span className="pdate">{fmt(ch.created_at)}</span>{!owner && trusted && <span className="pinchip">Trusted</span>}</div></div>
                <div className="mdot-wrap no-open">
                  <button className="mdot" onClick={(e)=>handleDotClick(e,id)}><ThreeDotsVertical size={14}/></button>
                  {active && <div className={`dmenu ${menuUp?'up':''}`} onClick={e=>e.stopPropagation()}>
                    {owner && <button onClick={()=>startEdit(ch)}><PencilSquare size={12}/> Update</button>}
                    {owner && <button onClick={()=>openShare(ch)}><Share size={12}/> Share PIN</button>}
                    <button onClick={()=>copyUrl(ch)}><Link45deg size={13}/> Copy Link</button>
                    {owner? <button className="de52l" onClick={()=>askPin(ch,"delete")}><Trash size={12}/> Delete</button> : <button className="del" onClick={()=>askPin(ch,"remove")}><Trash size={12}/> Remove</button>}
                  </div>}
                </div>
              </div>
            </div>
          );})}</div>
        }
        {channels?.length>visible && <div className="text-center mt-2"><Button size="sm" variant="light" className="nextb" onClick={()=>setVisible(v=>v+6)}>Load more</Button></div>}
      </div>

      {preview && <div className="imgprev" onClick={()=>setPreview(null)}><img src={preview} alt=""/><button className="xbtn" onClick={()=>setPreview(null)}><XLg size={14}/></button></div>}

      <Modal show={edit.show} onHide={()=>setEdit(s=>({...s,show:false}))} centered dialogClassName="center-modal" contentClassName="pop-card">
        <div className="mhead"><span>Update Private</span><button className="mx" onClick={()=>setEdit(s=>({...s,show:false}))}><XLg size={14}/></button></div>
        <div className="mbody">
          <div className="logo-block">
            <div className="logo-circle" onClick={()=>fileRef.current?.click()}>
              {edit.prev? <img src={img(edit.prev)} alt="" /> : <Camera size={20} color="#94a3b8"/>}
            </div>
            <input ref={fileRef} type="file" hidden accept="image/*" onChange={onLogoPick}/>
            <div className="logo-below" onClick={()=>fileRef.current?.click()}><PencilFill size={10}/> Tap to change</div>
            {edit.prev && <button type="button" className="adj-link" onClick={openAdjustModal}><ZoomIn size={12}/> Adjust logo</button>}
          </div>
          <div className="ff"><label>Name</label><input className="inp" value={edit.name} onChange={e=>setEdit(s=>({...s,name:e.target.value}))}/></div>
          <div className="ff"><label>Description</label><textarea className="inp area" value={edit.desc} onChange={e=>setEdit(s=>({...s,desc:e.target.value}))}/></div>
          <div className="mfoot">
            <button className="cb-cancel" onClick={()=>setEdit(s=>({...s,show:false}))}>Cancel</button>
            <button className="cb-save" onClick={saveEdit} disabled={edit.loading}>{edit.loading?<Spinner size="sm"/>:"Save"}</button>
          </div>
        </div>
      </Modal>
      <Modal show={adjust.open} onHide={()=>setAdjust(a=>({...a,open:false,dragging:false}))} centered dialogClassName="center-modal" contentClassName="pop-card">
        <div className="mhead"><span>Adjust Logo</span><button className="mx" onClick={()=>setAdjust(a=>({...a,open:false,dragging:false}))}><XLg size={14}/></button></div>
        <div className="mbody">
          <div className="adjust-area" onMouseDown={onAdjustDown} onMouseMove={onAdjustMove} onMouseUp={onAdjustUp} onMouseLeave={onAdjustUp} onTouchStart={onAdjustDown} onTouchMove={onAdjustMove} onTouchEnd={onAdjustUp} onWheel={onAdjustWheel}>
            {adjust.src ? <img src={adjust.src} alt="adjust" style={{transform:`translate(${adjust.pos.x}px, ${adjust.pos.y}px) scale(${adjust.scale})`}} draggable={false} /> : <div className="adjust-empty">Logo preview</div>}
            <div className="adjust-mask" />
          </div>
          <div className="control-row">
            <button type="button" className="adj-btn" onClick={()=>setAdjust(a=>({...a,scale:Math.max(1,a.scale-0.1),modified:true}))}><ZoomOut size={14}/></button>
            <input type="range" min="1" max="3" step="0.02" value={adjust.scale} onChange={e=>setAdjust(a=>({...a,scale:parseFloat(e.target.value),modified:true}))} className="adj-range" />
            <button type="button" className="adj-btn" onClick={()=>setAdjust(a=>({...a,scale:Math.min(3,a.scale+0.1),modified:true}))}><ZoomIn size={14}/></button>
          </div>
          <div className="adjust-foot">Drag image to reposition. Use zoom buttons or mouse wheel.</div>
          <div className="mfoot">
            <button className="cb-cancel" onClick={()=>setAdjust(a=>({...a,open:false,dragging:false}))}>Close</button>
            <button className="cb-save" onClick={()=>setAdjust(a=>({...a,open:false}))}>Done</button>
          </div>
        </div>
      </Modal>

      <Modal show={share.show} onHide={()=>setShare({show:false})} centered dialogClassName="center-modal" contentClassName="pop-card">
        <div className="mhead"><span>Share Private</span><button className="mx" onClick={()=>setShare(s=>({...s,show:false}))}><XLg size={14}/></button></div>
        <div className="mbody share-body">
          <div className="ff"><label>Original PIN *</label><input className="inp pinp" type="password" inputMode="numeric" maxLength={8} value={share.pinInput} onChange={e=>setShare(s=>({...s,pinInput:e.target.value.replace(/\D/g,"")}))} placeholder="••••"/></div>
          <div className="ssearch"><Search size={13}/><input value={share.search} onChange={e=>{ const v=e.target.value; const q=v.toLowerCase(); setShare(s=>({...s,search:v,filtered:s.users.filter(u=>(u.full_name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q))})); }} placeholder="Search users..."/></div>
          <div className="ulist">{share.fetching? <div className="text-center py-3"><Spinner size="sm"/></div> : share.filtered.length===0? <div className="empty small">No users</div> : share.filtered.map(u=>{ const uid=Number(u.telegram_user_id||u.id); const sel=share.sel.includes(uid); return <div key={uid} className={`uitem ${sel?'sel':''}`} onClick={()=>setShare(s=>{ const has=s.sel.includes(uid); return {...s,sel:has?s.sel.filter(x=>x!==uid):[...s.sel,uid]}; })}><div className={`ucheck ${sel?'on':''}`}>{sel&&<CheckLg size={10}/>}</div><img src={img(u.profile_image_url)} alt="" className="uava"/><div className="uinfo"><div className="uname">{u.full_name||u.username}</div><div className="uemail">{u.email||""}</div></div></div>})}</div>
        </div>
        <div className="mfoot">
          <button className="cb-cancel" onClick={()=>setShare(s=>({...s,show:false}))}>Cancel</button>
          <button className="cb-save" onClick={doShare} disabled={share.loading||share.sel.length===0}>{share.loading?<Spinner size="sm"/>:`Share ${share.sel.length?`(${share.sel.length})`:''}`}</button>
        </div>
      </Modal>

      <Modal show={pinBox.show} onHide={()=>setPinBox(s=>({...s,show:false}))} centered dialogClassName="center-modal" contentClassName="pop-card">
        <div className="mhead"><span>{pinBox.mode==="open"?"Enter PIN":pinBox.mode}</span><button className="mx" onClick={()=>setPinBox(s=>({...s,show:false}))}><XLg size={14}/></button></div>
        <div className="mbody">
          <input className="inp pinp" type="password" inputMode="numeric" maxLength={8} value={pinBox.pin} onChange={e=>setPinBox(s=>({...s,pin:e.target.value.replace(/\D/g,"")}))} placeholder="••••" autoFocus/>
          {pinBox.mode==="open" && <Form.Check label="Trust this device - next time PIN nako" checked={pinBox.trust} onChange={e=>setPinBox(s=>({...s,trust:e.target.checked}))} className="mt-3 small fw-bold"/>}
          {pinBox.err && <div className="errbox mt-2">{pinBox.err}</div>}
        </div>
        <div className="mfoot">
          <button className="cb-cancel" onClick={()=>setPinBox(s=>({...s,show:false}))}>Cancel</button>
          <button className="cb-save" onClick={submitPin} disabled={pinBox.loading}>{pinBox.loading?<Spinner size="sm"/>:"Verify"}</button>
        </div>
      </Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}>{toast.msg}</div></div>}

      <style>{`
.secw{max-width:760px;margin:14px auto;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:visible}
.sech{display:flex;align-items:center;gap:8px;font-weight:900;font-size:14px;margin-bottom:12px}.hico{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center}.privico{background:linear-gradient(135deg,#fee2e2,#fecdd3);color:#be123c;border:1px solid #fecaca}.cbadge{font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px}.privb{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;overflow:visible}
.pcard{border:1px solid #ffe4e6;background:linear-gradient(180deg,#fff,#fff8f9);border-radius:16px;padding:13px;transition:.15s;overflow:visible;position:relative;cursor:pointer}.pcard:hover{transform:translateY(-1px)}.pcard.menu-open{z-index:9999;box-shadow:0 18px 40px rgba(0,0,0,.16)}
.pcard-top{display:flex;gap:11px;align-items:center;overflow:visible}
.logo{width:46px;height:46px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.08)}.logo img{width:100%;height:100%;object-fit:cover}
.pinfo{flex:1;min-width:0}.pname{font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row2{display:flex;gap:6px;align-items:center;margin-top:3px;flex-wrap:wrap}.pbadge{font-size:9px;font-weight:900;padding:2px 7px;border-radius:999px;border:1px solid}.pbadge.priv{background:#fee2e2;color:#9f1239;border-color:#fecaca}.pdate{font-size:10px;color:#94a3b8}.pinchip{font-size:9px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;padding:1px 7px;border-radius:999px;font-weight:800}
.mdot-wrap{position:relative;flex-shrink:0}
.mdot{width:30px;height:30px;border-radius:9px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;transition:.12s}.mdot:active{transform:scale(.9)}
.dmenu{position:absolute;right:0;top:36px;z-index:99999;min-width:148px;background:#fff;border:1px solid #e8eef7;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.18);padding:4px;display:flex;flex-direction:column;gap:2px;animation:pop .16s ease}
.dmenu.up{top:auto!important;bottom:36px!important}
.dmenu button{height:32px;border:none;background:#fff;text-align:left;padding:0 10px;border-radius:8px;font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:8px;white-space:nowrap;transition:.12s}.dmenu button:hover{background:#f8fafc}.dmenu button:active{transform:scale(.96)}.dmenu .del{color:#dc2626}
.imgprev{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px}.imgprev img{max-width:90vw;max-height:85vh;border-radius:18px}.xbtn{position:absolute;top:20px;right:20px;width:32px;height:32px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center}
.center-modal{display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:20px!important;box-shadow:0 28px 80px rgba(15,23,42,.26)!important;overflow:hidden!important}
.mhead{height:50px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;border-bottom:1px solid #f1f5f9;background:#fff;flex-shrink:0}.mx{width:30px;height:30px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center}.mbody{padding:16px;background:#fff;max-height:70vh;overflow-y:auto}.mfoot{display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #f1f5f9;background:#fff;flex-shrink:0}
.ff{margin-bottom:10px}.ff label{font-size:11px;font-weight:800;color:#334155;margin-bottom:4px;display:block}.inp{width:100%;height:42px;border:1px solid #e2e8f0;border-radius:12px;padding:0 12px;font-size:13px;background:#fff}.inp.area{height:66px;padding:10px 12px;resize:none}.pinp{letter-spacing:6px;text-align:center;font-weight:900;font-size:16px}
.ssearch{height:38px;border:1px solid #e2e8f0;border-radius:11px;display:flex;align-items:center;gap:8px;padding:0 11px;margin:8px 0;background:#f8fafc}.ssearch input{border:none;outline:none;background:transparent;flex:1;font-size:12px}
.ulist{max-height:260px;overflow:auto;border:1px solid #f1f5f9;border-radius:12px;background:#fbfdff;padding:4px}.uitem{display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:10px;transition:.12s}.uitem.sel{background:#fff1f2;border:1px solid #fecaca}.ucheck{width:18px;height:18px;border-radius:6px;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ucheck.on{background:#be123c;border-color:#be123c;color:#fff}.uava{width:32px;height:32px;border-radius:50%;object-fit:cover}.uinfo{flex:1;min-width:0}.uname{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.uemail{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logo-block{display:flex;flex-direction:column;align-items:center;gap:7px;margin-bottom:16px}.logo-circle{width:76px;height:76px;border-radius:50%;border:1.5px dashed #fecdd3;background:#fff8f9;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}.logo-circle img{width:100%;height:100%;object-fit:cover}.logo-below{font-size:10px;font-weight:700;color:#9f1239;display:flex;align-items:center;gap:4px;cursor:pointer}.adj-link{font-size:11px;font-weight:700;color:#9f1239;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;gap:4px}.adjust-area{position:relative;width:100%;height:260px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:12px}.adjust-area img{max-width:none;min-width:100%;min-height:100%;user-select:none;pointer-events:none}.adjust-mask{position:absolute;inset:0;box-shadow:inset 0 0 0 9999px rgba(15,23,42,.35);border-radius:16px;pointer-events:none}.control-row{display:flex;align-items:center;gap:8px;margin-bottom:10px}.adj-btn{width:36px;height:36px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;display:flex;align-items:center;justify-content:center;cursor:pointer}.adj-range{flex:1;height:28px}.adjust-foot{font-size:11px;color:#64748b;text-align:center;margin-bottom:8px}
.cb-cancel{flex:1;height:38px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;transition:.15s}.cb-save{flex:1;height:38px;border-radius:10px;border:none;background:#0f172a;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;transition:.15s}.cb-cancel:active,.cb-save:active{transform:scale(.96)}
.errbox{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;text-align:center}
.jtc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100000;pointer-events:none}.jtt{padding:11px 16px;border-radius:12px;color:#fff;font-weight:800;font-size:12px}.jtt.success{background:#16a34a}.jtt.danger{background:#ef4444}
.empty{padding:18px;text-align:center;font-size:13px;color:#94a3b8;border:1px dashed #e2e8f0;border-radius:12px}.nextb{height:34px;border-radius:999px;font-size:12px;font-weight:700}
@keyframes pop{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
`}</style>
    </>
  );
}