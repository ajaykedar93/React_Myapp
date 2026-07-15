import React, { useState, useRef, useEffect } from 'react';
import { Modal, Spinner, Button, Form } from 'react-bootstrap';
import { ThreeDotsVertical, LockFill, PencilSquare, Trash, Share, Link45deg, Search, CheckLg } from 'react-bootstrap-icons';

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
  const [preview,setPreview]=useState(null);
  const [edit,setEdit]=useState({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false});
  const [share,setShare]=useState({show:false,ch:null,users:[],filtered:[],sel:[],search:"",pinInput:"",loading:false,fetching:false});
  const [pinBox,setPinBox]=useState({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false});
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const fileRef=useRef(null);
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); showCenterToast?.(m,t); setTimeout(()=>setToast(s=>({...s,show:false})),2600); };

  useEffect(()=>{ const h=e=>{ if(!e.target.closest('.mdot')&&!e.target.closest('.dmenu')) setMenuId(null); }; document.addEventListener('click',h); return()=>document.removeEventListener('click',h); },[]);
  useEffect(()=>setVisible(6),[channels?.length]);

  const list = (channels||[]).slice(0,visible);
  const openCard=(ch,e)=>{ if(e.target.closest('.no-open')) return; const id=String(ch.channel_id||ch.id); if(isTrusted(id)){ onOpen?.(ch); return; } setPinBox({show:true,mode:"open",ch,pin:"",trust:true,err:"",loading:false}); };

  const startEdit=(ch)=>{ setMenuId(null); setEdit({show:true,ch,name:ch.channel_name||"",desc:ch.channel_description||"",file:null,prev:ch.logo_url||ch.channel_logo_url||"",loading:false}); };
  const saveEdit=async()=>{
    if((edit.name||"").trim().length<3) return toastC("Min 3 chars","danger");
    setEdit(s=>({...s,loading:true}));
    try{
      const fd=new FormData();
      fd.append("channel_name",edit.name.trim());
      fd.append("channel_description",(edit.desc||"").trim());
      fd.append("device_id",getDeviceId());
      if(edit.file) fd.append("channel_logo",edit.file);
      const id=edit.ch.channel_id||edit.ch.id;
      const res=await fetch(`${API}/${id}`,{method:"PUT",headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},body:fd});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Update failed");
      onUpdated?.({...edit.ch,...(d.channel||d)}); setEdit({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false}); toastC("Private updated");
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
      toastC(`Shared to ${d.sent_count||share.sel.length} - fakt receiver la Link Request madhe PIN disnar`);
      setShare({show:false,ch:null,users:[],filtered:[],sel:[],search:"",pinInput:"",loading:false,fetching:false});
    }catch(e){ toastC(e.message,"danger"); setShare(s=>({...s,loading:false})); }
  };

  const copyUrl=(ch)=>{ try{ navigator.clipboard.writeText(getJoinUrl(ch)); }catch{} toastC("Hosted URL copied"); setMenuId(null); };
  const askPin=(ch,mode)=>{ setMenuId(null); setPinBox({show:true,mode,ch,pin:"",trust:true,err:"",loading:false}); };

  const submitPin=async()=>{
    if(!/^\d{4,8}$/.test(pinBox.pin)) return setPinBox(s=>({...s,err:"4-8 digit PIN taka"}));
    setPinBox(s=>({...s,loading:true,err:""}));
    const ch=pinBox.ch; const id=String(ch.channel_id||ch.id); const did=getDeviceId();
    try{
      if(pinBox.mode==="open"){
        const res=await fetch(`${API}/${id}/verify-pin`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({security_pin:pinBox.pin,device_id:did,trust_device:pinBox.trust,trust_this_device:pinBox.trust})});
        const d=await res.json(); if(!res.ok) throw new Error(d.message||"Wrong PIN");
        if(pinBox.trust) localStorage.setItem(`priv_trust_${id}_${did}`,"1");
        setPinBox({show:false,ch:null,pin:"",trust:true,err:"",loading:false}); onOpen?.(ch); toastC("Verified - trusted"); return;
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
            <div key={id} className={`pcard privcard ${active?'menu-open':''}`} style={active?{zIndex:9999}:{}} onClick={(e)=>openCard(ch,e)}>
              <div className="pcard-top">
                <div className="logo no-open" onClick={()=>setPreview(img(logo))}><img src={img(logo)} alt=""/></div>
                <div className="pinfo"><div className="pname">{ch.channel_name||"Private"}</div><div className="row2"><span className="pbadge priv">Private</span><span className="pdate">{fmt(ch.created_at)}</span>{!owner && trusted && <span className="pinchip">Trusted</span>}</div></div>
                <button className="mdot no-open" onClick={e=>{e.stopPropagation(); setMenuId(active?null:id);}}><ThreeDotsVertical size={15}/></button>
                {active && <div className="dmenu" onClick={e=>e.stopPropagation()}>
                  {owner && <button onClick={()=>startEdit(ch)}><PencilSquare size={13}/> Update</button>}
                  {owner && <button onClick={()=>openShare(ch)}><Share size={13}/> Share Original PIN</button>}
                  <button onClick={()=>copyUrl(ch)}><Link45deg size={14}/> Copy Hosted URL</button>
                  {owner? <button className="del" onClick={()=>askPin(ch,"delete")}><Trash size={13}/> Delete</button> : <button className="del" onClick={()=>askPin(ch,"remove")}><Trash size={13}/> Remove</button>}
                </div>}
              </div>
            </div>
          );})}</div>
        }
        {channels?.length>visible && <div className="text-center mt-2"><Button size="sm" variant="light" onClick={()=>setVisible(v=>v+6)}>Load more</Button></div>}
      </div>

      {preview && <div className="imgprev" onClick={()=>setPreview(null)}><img src={preview} alt=""/><button className="xbtn" onClick={()=>setPreview(null)}>✕</button></div>}

      <Modal show={edit.show} onHide={()=>setEdit(s=>({...s,show:false}))} centered><Modal.Header closeButton><Modal.Title className="fs-6 fw-bold">Update Private</Modal.Title></Modal.Header><Modal.Body>
        <div className="text-center mb-3"><div className="elogo" onClick={()=>fileRef.current?.click()}><img src={edit.prev?img(edit.prev):`https://ui-avatars.com/api/?name=P`} alt=""/><span className="ecam">📷</span></div><Form.Control ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; setEdit(s=>({...s,file:f})); const r=new FileReader(); r.onload=()=>setEdit(s=>({...s,prev:r.result})); r.readAsDataURL(f); }}/></div>
        <div className="ff"><label>Name</label><input className="inp" value={edit.name} onChange={e=>setEdit(s=>({...s,name:e.target.value}))}/></div>
        <div className="ff"><label>Description</label><textarea className="inp ta" value={edit.desc} onChange={e=>setEdit(s=>({...s,desc:e.target.value}))}/></div>
      </Modal.Body><Modal.Footer><Button size="sm" variant="light" onClick={()=>setEdit(s=>({...s,show:false}))}>Cancel</Button><Button size="sm" onClick={saveEdit} disabled={edit.loading} className="pbtn privbtn">{edit.loading?<Spinner size="sm"/>:"Save"}</Button></Modal.Footer></Modal>

      <Modal show={share.show} onHide={()=>setShare({show:false})} centered dialogClassName="center-modal" contentClassName="pop-card"><Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">Share Private - Original PIN</Modal.Title></Modal.Header><Modal.Body>
        <div className="small text-muted mb-2">Original PIN receiver chya Link Requests la logo+PIN disnar, open kela ki auto remove.</div>
        <div className="ff"><label>Original PIN *</label><input className="inp pinp" type="password" inputMode="numeric" maxLength={8} value={share.pinInput} onChange={e=>setShare(s=>({...s,pinInput:e.target.value.replace(/\D/g,"")}))} placeholder="••••"/></div>
        <div className="ssearch"><Search size={13}/><input value={share.search} onChange={e=>{ const v=e.target.value; const q=v.toLowerCase(); setShare(s=>({...s,search:v,filtered:s.users.filter(u=>(u.full_name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q))})); }} placeholder="Search"/></div>
        <div className="ulist">{share.fetching? <div className="text-center py-3"><Spinner size="sm"/></div> : share.filtered.length===0? <div className="text-center py-3 small text-muted">No users</div> : share.filtered.map(u=>{ const uid=Number(u.telegram_user_id||u.id); const sel=share.sel.includes(uid); return <div key={uid} className={`uitem ${sel?'sel':''}`} onClick={()=>setShare(s=>{ const has=s.sel.includes(uid); return {...s,sel:has?s.sel.filter(x=>x!==uid):[...s.sel,uid]}; })}><div className={`ucheck ${sel?'on':''}`}>{sel&&<CheckLg size={11}/>}</div><img src={img(u.profile_image_url)} alt="" className="uava"/><div className="uinfo"><div className="uname">{u.full_name||u.username}</div><div className="uemail">{u.email||""}</div></div></div>})}</div>
      </Modal.Body><Modal.Footer className="b0"><Button size="sm" variant="light" onClick={()=>setShare(s=>({...s,show:false}))}>Cancel</Button><Button size="sm" onClick={doShare} disabled={share.loading||share.sel.length===0} className="pbtn privbtn">{share.loading?<Spinner size="sm"/>:`Share to ${share.sel.length}`}</Button></Modal.Footer></Modal>

      <Modal show={pinBox.show} onHide={()=>setPinBox(s=>({...s,show:false}))} centered dialogClassName="center-modal" contentClassName="pop-card"><Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">{pinBox.mode==="open"?"Enter Private PIN":pinBox.mode}</Modal.Title></Modal.Header><Modal.Body>
        <input className="inp pinp" type="password" inputMode="numeric" maxLength={8} value={pinBox.pin} onChange={e=>setPinBox(s=>({...s,pin:e.target.value.replace(/\D/g,"")}))} placeholder="••••" autoFocus/>
        {pinBox.mode==="open" && <Form.Check label="Trust this device" checked={pinBox.trust} onChange={e=>setPinBox(s=>({...s,trust:e.target.checked}))} className="mt-3 small fw-bold"/>}
        {pinBox.err && <div className="errbox mt-2">{pinBox.err}</div>}
      </Modal.Body><Modal.Footer className="b0"><Button size="sm" variant="light" onClick={()=>setPinBox(s=>({...s,show:false}))}>Cancel</Button><Button size="sm" onClick={submitPin} disabled={pinBox.loading} className="pbtn privbtn">{pinBox.loading?<Spinner size="sm"/>:"Verify"}</Button></Modal.Footer></Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}>{toast.msg}</div></div>}

      <style>{`.secw{max-width:760px;margin:14px auto;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:visible}.sech{display:flex;align-items:center;gap:8px;font-weight:900;font-size:14px;margin-bottom:12px}.hico{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center}.privico{background:linear-gradient(135deg,#fee2e2,#fecdd3);color:#be123c;border:1px solid #fecaca}.cbadge{font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px}.privb{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;overflow:visible}.pcard{border:1px solid #ffe4e6;background:linear-gradient(180deg,#fff,#fff8f9);border-radius:16px;padding:13px;transition:.15s;overflow:visible;position:relative;cursor:pointer}.pcard:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(190,18,60,.08)}.pcard.menu-open{z-index:9999}.pcard-top{display:flex;gap:11px;align-items:center}.logo{width:46px;height:46px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.08)}.logo img{width:100%;height:100%;object-fit:cover}.pinfo{flex:1;min-width:0}.pname{font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row2{display:flex;gap:6px;align-items:center;margin-top:3px;flex-wrap:wrap}.pbadge{font-size:9px;font-weight:900;padding:2px 7px;border-radius:999px;border:1px solid}.pbadge.priv{background:#fee2e2;color:#9f1239;border-color:#fecaca}.pdate{font-size:10px;color:#94a3b8}.pinchip{font-size:10px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;padding:1px 7px;border-radius:999px;font-weight:800}.mdot{width:32px;height:32px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center}.dmenu{position:absolute;top:54px;right:10px;z-index:10000;min-width:210px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 16px 36px rgba(15,23,42,.18);padding:6px;display:flex;flex-direction:column}.dmenu button{height:38px;border:none;background:transparent;text-align:left;padding:0 12px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}.dmenu button:hover{background:#f8fafc}.dmenu .del{color:#dc2626}.imgprev{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px}.imgprev img{max-width:90vw;max-height:85vh;border-radius:18px}.xbtn{position:absolute;top:20px;right:20px;width:36px;height:36px;border-radius:50%;border:none;background:#fff}.center-modal{display:flex!important;align-items:center!important;justify-content:center!important}.pop-card{border:none!important;border-radius:20px!important;box-shadow:0 28px 80px rgba(15,23,42,.26)!important}.b0{border:0!important}.ff{margin-bottom:10px}.ff label{font-size:11px;font-weight:800;color:#334155;margin-bottom:4px;display:block}.inp{width:100%;height:44px;border:1px solid #e2e8f0;border-radius:12px;padding:0 14px;font-size:13px;background:#fff}.inp:focus{outline:none;border-color:#be123c;box-shadow:0 0 0 4px #ffe4e6}.ta{height:80px;padding-top:10px;resize:none}.pinp{letter-spacing:6px;text-align:center;font-weight:900;font-size:16px}.ssearch{height:42px;border:1px solid #e2e8f0;border-radius:12px;display:flex;align-items:center;gap:8px;padding:0 12px;margin:10px 0;background:#f8fafc}.ssearch input{border:none;outline:none;background:transparent;flex:1;font-size:13px}.ulist{max-height:260px;overflow:auto;border:1px solid #f1f5f9;border-radius:12px}.uitem{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid #f8fafc}.uitem.sel{background:#fff1f2}.ucheck{width:20px;height:20px;border-radius:6px;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center}.ucheck.on{background:#be123c;border-color:#be123c;color:#fff}.uava{width:34px;height:34px;border-radius:50%;object-fit:cover}.uinfo{flex:1;min-width:0}.uname{font-size:13px;font-weight:800}.uemail{font-size:11px;color:#64748b}.elogo{width:72px;height:72px;border-radius:50%;overflow:hidden;position:relative;margin:0 auto;border:2px dashed #fecdd3;cursor:pointer}.elogo img{width:100%;height:100%;object-fit:cover}.ecam{position:absolute;inset:0;background:rgba(0,0,0,.35);color:#fff;display:flex;align-items:center;justify-content:center}.errbox{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;text-align:center}.pbtn{border:none!important;font-weight:800!important;border-radius:12px!important}.privbtn{background:linear-gradient(135deg,#be123c,#e11d48)!important}.jtc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100000;pointer-events:none}.jtt{padding:12px 18px;border-radius:14px;color:#fff;font-weight:800}.jtt.success{background:#16a34a}.jtt.danger{background:#ef4444}.empty{padding:18px;text-align:center;font-size:13px;color:#94a3b8;border:1px dashed #e2e8f0;border-radius:12px}`}</style>
    </>
  );
}