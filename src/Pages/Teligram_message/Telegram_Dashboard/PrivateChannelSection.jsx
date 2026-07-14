import React, { useState, useRef, useEffect } from 'react';
import { Modal, Spinner, Button, Form } from 'react-bootstrap';
import { ThreeDotsVertical, XLg, LockFill, PencilSquare, Trash, Share, Link45deg, Camera, Search, CheckLg, KeyFill, ShieldLock } from 'react-bootstrap-icons';

const API = "/api/telegramlogin-channels";
const USERS_API = "/api/telegramlogin-users";
const ALLMISS_API = "/api/telegramlogin-allmiss";

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getUid = ()=>{ try{ const p=JSON.parse(atob(getToken().split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{return 0;} };
const img = (u)=>!u?"":(u.startsWith("data:")||u.startsWith("http")?u:u);
const fmt = (iso)=>{ if(!iso) return ""; const d=new Date(iso); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}); };
const isOwner = (ch)=>{ const uid=String(getUid()); if(uid==="0"){ const my=JSON.parse(localStorage.getItem("my_created_channels")||"[]"); return my.includes(String(ch.channel_id||ch.id)); } return String(ch.created_by_user_id)===uid || ch.is_owner===true || String(ch.member_role).toLowerCase()==="owner"; };

export default function PrivateChannelSection({ channels=[], onUpdated, onDeleted, onOpen, onShareRequest, showCenterToast }){
  const [visible,setVisible]=useState(6);
  const [menuId,setMenuId]=useState(null);
  const [preview,setPreview]=useState(null);
  const [edit,setEdit]=useState({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false});
  const [share,setShare]=useState({show:false,ch:null,users:[],filtered:[],sel:[],search:"",loading:false,fetching:false});
  const [pinBox,setPinBox]=useState({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false});
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const fileRef=useRef(null);
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); showCenterToast?.(m,t); setTimeout(()=>setToast({show:false}),2600); };

  useEffect(()=>{ const h=e=>{ if(!e.target.closest('.mdot')&&!e.target.closest('.dmenu')) setMenuId(null); }; document.addEventListener('click',h); return()=>document.removeEventListener('click',h); },[]);
  useEffect(()=>setVisible(6),[channels.length]);

  const list=channels.slice(0,visible);
  const openCard=(ch,e)=>{ if(e.target.closest('.no-open')) return; setPinBox({show:true,mode:"open",ch,pin:"",trust:true,err:"",loading:false}); };

  // UPDATE - owner only, PIN change nahi, Private->Public nahi
  const startEdit=(ch)=>{ setMenuId(null); setEdit({show:true,ch,name:ch.channel_name||"",desc:ch.channel_description||"",file:null,prev:ch.logo_url||ch.channel_logo_url||"",loading:false}); };
  const onPick=e=>{ const f=e.target.files?.[0]; if(!f) return; setEdit(s=>({...s,file:f})); const r=new FileReader(); r.onload=()=>setEdit(s=>({...s,prev:r.result})); r.readAsDataURL(f); };
  const saveEdit=async()=>{
    if(edit.name.trim().length<3) return toastC("Min 3 chars","danger");
    setEdit(s=>({...s,loading:true}));
    try{ const fd=new FormData(); fd.append("channel_name",edit.name.trim()); fd.append("channel_description",edit.desc.trim()); fd.append("device_id",getDeviceId()); if(edit.file) fd.append("channel_logo",edit.file); const id=edit.ch.channel_id||edit.ch.id; const res=await fetch(`${API}/${id}`,{method:"PUT",headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},body:fd}); const d=await res.json(); if(!res.ok) throw new Error(d.message||"Update failed"); onUpdated?.({...edit.ch,...d.channel}); setEdit({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false}); toastC("Private channel updated - PIN locked"); }catch(e){ toastC(e.message,"danger"); setEdit(s=>({...s,loading:false})); }
  };

  // SHARE - self exclude, URL+PIN
  const openShare=async(ch)=>{ setMenuId(null); setShare({show:true,ch,users:[],filtered:[],sel:[],search:"",loading:false,fetching:true}); try{ const res=await fetch(`${USERS_API}/all-register-users?limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}}); const d=await res.json(); if(!res.ok) throw new Error(d.message); const all=(d.users||[]).filter(u=>Number(u.telegram_user_id)!==getUid()); setShare(s=>({...s,users:all,filtered:all,fetching:false})); }catch(e){ setShare(s=>({...s,fetching:false})); toastC(e.message,"danger"); } };
  const doShare=async()=>{ if(share.sel.length===0) return toastC("Select at least 1 user","danger"); setShare(s=>({...s,loading:true})); try{ const ch=share.ch; const res=await fetch(`${API}/send-link`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},body:JSON.stringify({channel_id:ch.channel_id||ch.id,receiver_ids:share.sel})}); const d=await res.json(); if(!res.ok) throw new Error(d.message); const link=ch.share_link||`${window.location.origin}/channel/join/${ch.share_code}`; navigator.clipboard.writeText(link); onShareRequest?.({...ch,invite_url:link,type:'private'}); toastC(`URL + PIN sent to ${d.sent_count||share.sel.length} users`); setShare({show:false,ch:null,users:[],filtered:[],sel:[],search:"",loading:false,fetching:false}); }catch(e){ toastC(e.message,"danger"); setShare(s=>({...s,loading:false})); } };

  const copyUrl=(ch)=>{ const url=ch.share_link||`${window.location.origin}/channel/join/${ch.share_code||ch.channel_id}`; navigator.clipboard.writeText(url); toastC("URL copied - PIN not copied"); setMenuId(null); };
  const copyPin=async(ch)=>{ let pin=ch.pin||ch.security_pin_plain||ch.security_pin; if(!pin){ try{ const r=await fetch(`${API}/${ch.channel_id||ch.id}/pin`,{headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()}}); const d=await r.json(); pin=d.pin||d.security_pin_plain; }catch{} } if(!pin) return toastC("PIN only owner can copy","danger"); navigator.clipboard.writeText(pin); toastC("PIN copied - URL not copied"); setMenuId(null); };

  // PIN LOGIC - SAME PIN FOR OPEN/DELETE/REMOVE
  const askPin=(ch,mode)=>{ setMenuId(null); setPinBox({show:true,mode,ch,pin:"",trust:true,err:"",loading:false}); };
  const submitPin=async()=>{
    if(!/^\d{4}$/.test(pinBox.pin)) return setPinBox(s=>({...s,err:"Enter 4-digit same PIN"}));
    setPinBox(s=>({...s,loading:true,err:""})); const ch=pinBox.ch; const id=ch.channel_id||ch.id; const did=getDeviceId();
    try{
      if(pinBox.mode==="open"){ const res=await fetch(`${API}/${id}/verify-pin`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({security_pin:pinBox.pin,device_id:did,trust_device:pinBox.trust})}); const d=await res.json(); if(!res.ok) throw new Error(d.message||"Wrong PIN"); setPinBox({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false}); onOpen?.(ch); return; }
      if(pinBox.mode==="delete"){ const res=await fetch(`${API}/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json","x-device-id":did},body:JSON.stringify({device_id:did,security_pin:pinBox.pin})}); const d=await res.json(); if(!res.ok) throw new Error(d.message||"Only created device + same PIN can delete"); onDeleted?.(String(id)); toastC("Private channel permanently deleted"); setPinBox({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false}); return; }
      if(pinBox.mode==="remove"){ const res=await fetch(`${ALLMISS_API}/remove/${id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({security_pin:pinBox.pin})}); const d=await res.json(); if(!res.ok) throw new Error(d.message||"Same PIN required"); onDeleted?.(String(id)); toastC("Removed from your dashboard only"); setPinBox({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false}); return; }
    }catch(e){ setPinBox(s=>({...s,err:e.message,loading:false})); }
  };

  return (
    <>
      <div className="secw priv-sec">
        <div className="sech"><span className="hico privico"><LockFill size={12}/></span> Private Channels <span className="cbadge privb">{channels.length}</span><span className="lockhint"><ShieldLock size={10}/> PIN Locked</span></div>
        {channels.length===0? <div className="empty"><div className="edot privdot"/> No private channels yet</div> :
          <div className="grid">{list.map(ch=>{ const id=String(ch.channel_id||ch.id); const logo=img(ch.logo_url||ch.channel_logo_url); const owner=isOwner(ch); const active=menuId===id; return(
            <div key={id} className={`pcard privcard ${active?'menu-open':''}`} style={active?{zIndex:9999}:{}} onClick={(e)=>openCard(ch,e)}>
              <div className="ring privring"/>
              <div className="pcard-top">
                <div className="logo privlogo no-open" onClick={()=>setPreview(logo||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.channel_name||'P')}`)}><img src={logo||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.channel_name||'P')}&background=fee2e2&color=991b1b`} alt=""/></div>
                <div className="pinfo"><div className="pname">{ch.channel_name}</div><div className="row2"><span className="pbadge priv">Private</span><span className="dot"/><span className="pdate">{fmt(ch.created_at)}</span></div></div>
                <button className="mdot no-open" onClick={e=>{e.stopPropagation(); setMenuId(active?null:id);}}><ThreeDotsVertical size={15}/></button>
                {active && <div className="dmenu" onClick={e=>e.stopPropagation()}>
                  {owner && <button onClick={()=>startEdit(ch)}><PencilSquare size={13}/> Update Channel</button>}
                  {owner && <button onClick={()=>openShare(ch)}><Share size={13}/> Share (URL+PIN)</button>}
                  <button onClick={()=>copyUrl(ch)}><Link45deg size={14}/> Copy URL Only</button>
                  <button onClick={()=>copyPin(ch)}><KeyFill size={13}/> Copy PIN Only</button>
                  {owner? <button className="del" onClick={()=>askPin(ch,"delete")}><Trash size={13}/> Delete Channel</button> : <button className="del" onClick={()=>askPin(ch,"remove")}><Trash size={13}/> Remove from Dashboard</button>}
                </div>}
              </div>
            </div>
          );})}</div>
        }
        {visible<channels.length && <button className="nextb privnext" onClick={()=>setVisible(v=>v+6)}>Show More</button>}
      </div>

      {preview && <div className="pvw" onClick={()=>setPreview(null)}><div className="pvbox" onClick={e=>e.stopPropagation()}><button className="px" onClick={()=>setPreview(null)}><XLg size={15}/></button><img src={preview} alt="" className="pvimg"/></div></div>}

      {/* UPDATE MODAL - CENTER */}
      <Modal show={edit.show} onHide={()=>setEdit({show:false})} centered dialogClassName="center-modal" contentClassName="pop-card"><Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">Update Private Channel</Modal.Title></Modal.Header><Modal.Body className="pt-1">
        <div className="text-center mb-3"><div className="elogow privelogow" onClick={()=>fileRef.current?.click()}><img src={edit.prev?.startsWith('data:')?edit.prev:img(edit.prev)||`https://ui-avatars.com/api/?name=P`} className="elogo" alt=""/><span className="ecam privecam"><Camera size={11}/></span></div><input ref={fileRef} type="file" hidden accept="image/*" onChange={onPick}/></div>
        <div className="ff"><label>Name</label><input className="inp" value={edit.name} onChange={e=>setEdit(s=>({...s,name:e.target.value}))} maxLength={30}/></div>
        <div className="ff"><label>Description</label><textarea className="inp area" value={edit.desc} onChange={e=>setEdit(s=>({...s,desc:e.target.value}))} maxLength={120}/></div>
        <div className="hint danger">PIN cannot be changed • Private cannot become Public</div>
      </Modal.Body><Modal.Footer className="b0"><Button size="sm" variant="light" className="rbtn" onClick={()=>setEdit({show:false})}>Cancel</Button><Button size="sm" onClick={saveEdit} disabled={edit.loading} className="pbtn privbtn">{edit.loading?<Spinner size="sm"/>:"Save Changes"}</Button></Modal.Footer></Modal>

      {/* SHARE - CENTER, SELF EXCLUDE */}
      <Modal show={share.show} onHide={()=>setShare({show:false})} centered dialogClassName="center-modal" contentClassName="pop-card"><Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">Share Private Channel</Modal.Title></Modal.Header><Modal.Body className="pt-1">
        <div className="small text-muted mb-2">Select users. Private shares <b>URL + PIN</b>. Receiver gets in <b>Link Requests</b>. Self excluded.</div>
        <div className="ssearch privsearch"><Search size={13}/><input value={share.search} onChange={e=>{ const v=e.target.value; const q=v.toLowerCase(); setShare(s=>({...s,search:v,filtered:s.users.filter(u=>(u.full_name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q))})); }} placeholder="Search name or email"/></div>
        <div className="ulist privulist">{share.fetching? <div className="text-center py-4"><Spinner size="sm"/> Loading</div> : share.filtered.length===0? <div className="empty small">No users</div> : share.filtered.map(u=>{ const uid=Number(u.telegram_user_id||u.id); const sel=share.sel.includes(uid); return <div key={uid} className={`uitem ${sel?'sel privsel':''}`} onClick={()=>setShare(s=>{ const has=s.sel.includes(uid); return {...s,sel:has?s.sel.filter(x=>x!==uid):[...s.sel,uid]}; })}><div className={`ucheck ${sel?'on privon':''}`}>{sel&&<CheckLg size={11}/>}</div><img src={img(u.profile_image_url)||`https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name||'U')}`} alt=""/><div className="uinfo"><div className="uname">{u.full_name}</div><div className="umail">{u.email}</div></div></div>})}</div>
        <div className="mt-2 small">Selected: <b>{share.sel.length}</b> (URL+PIN will be sent)</div>
      </Modal.Body><Modal.Footer className="b0"><Button size="sm" variant="light" className="rbtn" onClick={()=>setShare({show:false})}>Cancel</Button><Button size="sm" onClick={doShare} disabled={share.loading} className="pbtn privbtn">{share.loading?<Spinner size="sm"/>:`Share URL+PIN (${share.sel.length})`}</Button></Modal.Footer></Modal>

      {/* PIN BOX - CENTER PROFESSIONAL */}
      <Modal show={pinBox.show} onHide={()=>setPinBox({show:false,mode:"open",ch:null,pin:"",trust:true,err:"",loading:false})} centered dialogClassName="center-modal" contentClassName="pop-card alert-pop"><Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">{pinBox.mode==="delete"?"Delete Private - Same PIN":pinBox.mode==="remove"?"Remove - Same PIN":"Enter Private PIN"}</Modal.Title></Modal.Header><Modal.Body className="pt-1">
        <div className="pinico"><ShieldLock size={18}/></div>
        <div className="ff"><label>4-digit Same PIN (cannot reset)</label><input className="inp pinp" type="password" maxLength={4} value={pinBox.pin} onChange={e=>setPinBox(s=>({...s,pin:e.target.value.replace(/\D/g,"")}))} placeholder="••••" autoFocus/></div>
        {pinBox.mode==="open" && <Form.Check type="checkbox" label="Trust This Device (PIN once on this device)" checked={pinBox.trust} onChange={e=>setPinBox(s=>({...s,trust:e.target.checked}))} className="mt-2 smallchk"/>}
        {pinBox.mode==="delete" && <div className="hint danger mt-2">Owner only • Only from created device • Same PIN • Permanent delete for everyone</div>}
        {pinBox.mode==="remove" && <div className="hint mt-2">Same PIN required • Only removes from your dashboard • Owner still keeps channel</div>}
        {pinBox.err && <div className="errbox">{pinBox.err}</div>}
      </Modal.Body><Modal.Footer className="b0"><Button size="sm" variant="light" className="rbtn" onClick={()=>setPinBox({show:false})}>Cancel</Button><Button size="sm" onClick={submitPin} disabled={pinBox.loading} className={pinBox.mode==="delete"?"dbtn":"pbtn privbtn"}>{pinBox.loading?<Spinner size="sm"/>:(pinBox.mode==="delete"?"Delete Permanently":pinBox.mode==="remove"?"Remove":"Verify & Open")}</Button></Modal.Footer></Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}><span className="jti">{toast.t==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
     .secw.priv-sec{background:linear-gradient(180deg,#fff,#fff7f8);border-color:#ffe4e6}
     .secw{width:100%;max-width:760px;margin:14px auto;padding:14px;border:1px solid #e2e8f0;border-radius:18px;box-sizing:border-box;overflow:visible;box-shadow:0 4px 18px rgba(15,23,42,.04)}
     .sech{font-size:13px;font-weight:900;display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}.hico{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;border:1px solid}.privico{background:linear-gradient(135deg,#fee2e2,#ffe4e6);color:#dc2626;border-color:#fecaca}.cbadge{padding:2px 9px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid}.privb{background:#fee2e2;color:#991b1b;border-color:#fecaca}.lockhint{margin-left:auto;font-size:10px;font-weight:700;color:#be123c;background:#fff1f2;border:1px solid #fecdd3;padding:2px 8px;border-radius:999px;display:flex;align-items:center;gap:4px}
     .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;overflow:visible}@media(max-width:640px){.secw{width:calc(100% - 16px);margin:10px auto}.grid{grid-template-columns:1fr}.lockhint{margin-left:0}}
     .pcard{position:relative;background:#fff;border-radius:16px;padding:13px;overflow:visible;cursor:pointer;transition:.22s cubic-bezier(.16,1,.3,1)}.privcard{border:1px solid #ffe4e6;background:linear-gradient(180deg,#fff,#fffafb)}.privcard:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(220,38,38,.10);border-color:#fca5a5}.pcard.menu-open{z-index:9999!important;box-shadow:0 18px 40px rgba(0,0,0,.16)!important}.ring{position:absolute;inset:-1px;border-radius:16px;opacity:0;pointer-events:none;transition:.22s}.privring{background:linear-gradient(135deg,#fca5a533,#f43f5e33)}.pcard:hover.ring{opacity:1}
     .pcard-top{display:flex;gap:11px;align-items:center;overflow:visible}
     .logo{width:50px;height:50px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#fff;border:1px solid #e2e8f0;transition:.15s}.privlogo{border-color:#fecdd3;background:radial-gradient(80px 60px at 30% 20%,#fff1f2,#fff)}.logo:active{transform:scale(.94)}.logo img{width:100%;height:100%;object-fit:cover;display:block}
     .pinfo{flex:1;min-width:0}.pname{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row2{display:flex;align-items:center;gap:6px;margin-top:3px}.pbadge{font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;border:1px solid}.pbadge.priv{background:#fee2e2;color:#be123c;border-color:#fecaca}.dot{width:3px;height:3px;border-radius:50%;background:#cbd5e1}.pdate{font-size:11px;color:#64748b}
     .mdot{width:34px;height:34px;border:1px solid #ffe4e6;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.04)}.mdot:active{transform:scale(.9)}
     .dmenu{position:absolute;right:8px;top:56px;background:#ffffffee;backdrop-filter:blur(10px);border:1px solid #ffe4e6;border-radius:14px;box-shadow:0 20px 44px rgba(0,0,0,.18);z-index:10000;min-width:220px;overflow:hidden;animation:pop.2s cubic-bezier(.16,1,.3,1)}.dmenu button{width:100%;height:42px;border:none;background:transparent;display:flex;align-items:center;gap:10px;padding:0 14px;font-size:13px;font-weight:650;text-align:left}.dmenu button:hover{background:#fff1f2}.dmenu button.del{color:#dc2626}.dmenu button.del:hover{background:#fef2f2}
     .nextb{margin:14px auto 2px;display:block;height:36px;padding:0 18px;border-radius:999px;font-weight:800;transition:.15s}.privnext{border:1px solid #fecdd3;background:#fff;color:#be123c}.nextb:active{transform:scale(.96)}
     .empty{padding:14px;text-align:center;color:#94a3b8;font-size:12px;display:flex;gap:8px;align-items:center;justify-content:center}.edot{width:6px;height:6px;border-radius:50%}.privdot{background:#fca5a5}
     .pvw{position:fixed;inset:0;background:rgba(2,6,23,.84);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}.pvbox{position:relative;animation:pop.24s ease}.pvimg{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:18px;background:#000;box-shadow:0 20px 60px rgba(0,0,0,.5);display:block}.px{position:absolute;top:-10px;right:-10px;width:38px;height:38px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer}
     .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:18px!important;box-shadow:0 24px 64px rgba(15,23,42,.28)!important;animation:pop.28s cubic-bezier(.16,1,.3,1)!important;overflow:hidden!important}.b0{border:0!important}.rbtn{border-radius:10px!important;font-weight:700!important;border:1px solid #e2e8f0!important}.pbtn{border-radius:10px!important;font-weight:800!important;border:none!important}.privbtn{background:linear-gradient(135deg,#dc2626,#991b1b)!important;box-shadow:0 8px 18px rgba(220,38,38,.28)!important;color:#fff!important}.dbtn{border-radius:10px!important;font-weight:800!important;background:linear-gradient(135deg,#ef4444,#dc2626)!important;border:none!important;color:#fff!important}
     .ff{margin-bottom:12px}.ff label{font-size:11px;font-weight:800;margin-bottom:5px;display:block;color:#334155}.inp{width:100%;border:1px solid #fca5a5;border-radius:12px;padding:0 13px;height:42px;font-size:13px;outline:none;background:#fff;transition:.15s}.inp.area{height:66px;padding:10px 13px;resize:none}.inp:focus{border-color:#f87171;box-shadow:0 0 0 4px #fef2f2}.pinp{letter-spacing:6px;font-weight:800;text-align:center;font-size:18px!important}.hint{font-size:11px}.hint.danger{color:#dc2626;font-weight:600}.errbox{margin-top:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600}
     .elogow{position:relative;width:78px;height:78px;border-radius:50%;overflow:hidden;display:inline-block;border:2px dashed #fca5a5;cursor:pointer}.privelogow{background:radial-gradient(80px 60px at 30% 20%,#fff1f2,#fff)}.elogo{width:100%;height:100%;object-fit:cover}.ecam{position:absolute;right:3px;bottom:3px;width:22px;height:22px;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}.privecam{background:linear-gradient(135deg,#dc2626,#991b1b);box-shadow:0 4px 10px rgba(0,0,0,.18)}
     .ssearch{display:flex;align-items:center;gap:9px;border-radius:12px;padding:0 12px;height:40px;margin-bottom:10px;transition:.15s}.privsearch{border:1px solid #fecdd3;background:#fff7f8}.privsearch:focus-within{background:#fff;border-color:#f87171;box-shadow:0 0 0 4px #fef2f2}.ssearch input{border:none;outline:none;flex:1;font-size:13px;background:transparent}
     .ulist{max-height:300px;overflow:auto;border-radius:14px;padding:6px}.privulist{border:1px solid #ffe4e6;background:#fffafb}.uitem{display:flex;align-items:center;gap:11px;padding:10px;border-radius:12px;cursor:pointer;transition:.15s;border:1px solid transparent}.uitem:hover{background:#fff;border-color:#fecdd3;box-shadow:0 4px 12px rgba(0,0,0,.04)}.uitem.sel{box-shadow:0 6px 14px rgba(220,38,38,.12)}.privsel{background:#fff1f2!important;border-color:#fecaca!important}.ucheck{width:22px;height:22px;border:1.5px solid #cbd5e1;border-radius:7px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ucheck.on{background:#dc2626;border-color:#dc2626;color:#fff}.privon{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important;box-shadow:0 4px 10px rgba(220,38,38,.28)}.uitem img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #ffe4e6}.uinfo{min-width:0;flex:1}.uname{font-size:12.5px;font-weight:800}.umail{font-size:10.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
     .pinico{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#fee2e2,#ffedd5);border:1px solid #fecaca;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}.smallchk{font-size:12px}.smallchk.form-check-input:checked{background-color:#dc2626;border-color:#dc2626}
     .jtc{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:100000!important;pointer-events:none!important;padding:20px}.jtt{display:flex!important;gap:9px!important;align-items:center!important;padding:13px 18px!important;border-radius:14px!important;color:#fff!important;font-weight:850!important;font-size:13px!important;box-shadow:0 18px 40px rgba(0,0,0,.28)!important;pointer-events:auto!important;animation:pop.28s cubic-bezier(.16,1,.3,1)!important}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)!important}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important}.jti{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.24);display:flex;align-items:center;justify-content:center}
      @keyframes pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </>
  );
}