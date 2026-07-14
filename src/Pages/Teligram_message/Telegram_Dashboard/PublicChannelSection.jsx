import React, { useState, useRef, useEffect } from 'react';
import { Modal, Spinner, Button } from 'react-bootstrap';
import { ThreeDotsVertical, XLg, Globe, PencilSquare, Trash, Share, Link45deg, Camera, Search, CheckLg, ExclamationTriangle } from 'react-bootstrap-icons';

const API = "/api/telegramlogin-channels";
const USERS_API = "/api/telegramlogin-users";

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getCurrentUserId = ()=>{ try{ const t=getToken(); const p=JSON.parse(atob(t.split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{return 0;} };
const resolveImg = (u)=>!u?"":(u.startsWith("data:")||u.startsWith("http")?u:u);
const formatIST = (iso)=>{ if(!iso) return ""; const d=new Date(iso); return `${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}`; };
const isOwner = (ch)=>{ const uid=String(getCurrentUserId()); if(uid==="0"){ const my=JSON.parse(localStorage.getItem("my_created_channels")||"[]"); return my.includes(String(ch.channel_id||ch.id)); } return String(ch.created_by_user_id)===uid || ch.is_owner===true || String(ch.member_role).toLowerCase()==="owner"; };

export default function PublicChannelSection({ channels=[], onUpdated, onDeleted, onOpen, onShareRequest, showCenterToast }){
  const [visible,setVisible]=useState(6);
  const [menuId,setMenuId]=useState(null);
  const [preview,setPreview]=useState(null);
  const [edit,setEdit]=useState({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false});
  const [share,setShare]=useState({show:false,ch:null,users:[],filtered:[],selected:[],search:"",loading:false,fetching:false});
  const [confirm,setConfirm]=useState({show:false,ch:null,mode:"delete"});
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const fileRef=useRef(null);
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); showCenterToast?.(m,t); setTimeout(()=>setToast({show:false,msg:""}),2600); };

  useEffect(()=>{ const h=e=>{ if(!e.target.closest('.mdot')&&!e.target.closest('.dmenu')) setMenuId(null); }; document.addEventListener('click',h); return()=>document.removeEventListener('click',h); },[]);
  useEffect(()=>setVisible(6),[channels.length]);

  const list=channels.slice(0,visible);
  const openCard=(ch,e)=>{ if(e.target.closest('.no-open')) return; onOpen?.(ch); };

  // UPDATE - logo real-time both sides
  const startEdit=(ch)=>{ setMenuId(null); setEdit({show:true,ch,name:ch.channel_name||"",desc:ch.channel_description||"",file:null,prev:ch.logo_url||ch.channel_logo_url||ch.channel_logo||"",loading:false}); };
  const onLogoPick=e=>{
    const f=e.target.files?.[0]; if(!f) return;
    setEdit(s=>({...s,file:f}));
    const r=new FileReader();
    r.onload=()=>setEdit(s=>({...s,prev:r.result})); // immediate preview in popup
    r.readAsDataURL(f);
  };
  const saveEdit=async()=>{
    if(edit.name.trim().length<3) return toastC("Name min 3 chars","danger");
    setEdit(s=>({...s,loading:true}));
    try{
      const fd=new FormData(); const did=getDeviceId();
      fd.append("channel_name",edit.name.trim());
      fd.append("channel_description",edit.desc.trim());
      fd.append("device_id",did);
      if(edit.file) fd.append("channel_logo",edit.file);
      const id=edit.ch.channel_id||edit.ch.id;
      const res=await fetch(`${API}/${id}`,{method:"PUT",headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:fd});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Update failed");
      const upd=d.channel;
      // real-time update in list both side
      onUpdated?.({...edit.ch,...upd,channel_name:upd.channel_name||edit.name.trim(),channel_description:upd.channel_description||edit.desc.trim(),logo_url:upd.channel_logo_url||edit.prev,channel_logo_url:upd.channel_logo_url||edit.prev});
      setEdit({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false}); toastC("Channel updated");
    }catch(e){ toastC(e.message,"danger"); setEdit(s=>({...s,loading:false})); }
  };

  // SHARE - PROPER LOGIC: only selected users get invite, self excluded, receiver gets in Link Requests
  const openShare=async(ch)=>{
    setMenuId(null); setShare({show:true,ch,users:[],filtered:[],selected:[],search:"",loading:false,fetching:true});
    try{
      const res=await fetch(`${USERS_API}/all-register-users?limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Users fetch failed");
      const uid=getCurrentUserId();
      const all=(d.users||[]).filter(u=> Number(u.telegram_user_id||u.id)!==Number(uid)); // self exclude
      setShare(s=>({...s,users:all,filtered:all,fetching:false}));
    }catch(e){ setShare(s=>({...s,fetching:false})); toastC(e.message,"danger"); }
  };
  const onSearch=v=>setShare(s=>{ const q=v.toLowerCase(); return {...s,search:v,filtered:s.users.filter(u=>(u.full_name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q))}; });
  const toggleSelect=(id)=>setShare(s=>{ const has=s.selected.includes(id); return {...s,selected:has?s.selected.filter(x=>x!==id):[...s.selected,id]}; });
  const doShare=async()=>{
    const ch=share.ch; const link=ch.share_link||`${window.location.origin}/channel/join/${ch.share_code||ch.channel_id}`;
    if(share.selected.length===0){ navigator.clipboard.writeText(link); toastC("No user selected - Invite URL copied"); setShare({show:false,ch:null,users:[],filtered:[],selected:[],search:"",loading:false,fetching:false}); return; }
    setShare(s=>({...s,loading:true}));
    try{
      // proper API - only receiver_ids get invitation
      const res=await fetch(`${API}/send-link`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},body:JSON.stringify({channel_id:ch.channel_id||ch.id,receiver_ids:share.selected})});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Share failed");
      navigator.clipboard.writeText(link);
      onShareRequest?.({...ch,invite_url:link}); // Navbar badge update if needed
      toastC(`Invite sent to ${d.sent_count||share.selected.length} user(s) & URL copied - only they will see in Link Requests`);
      setShare({show:false,ch:null,users:[],filtered:[],selected:[],search:"",loading:false,fetching:false});
    }catch(e){ toastC(e.message,"danger"); setShare(s=>({...s,loading:false})); }
  };

  const handleCopy=(ch)=>{ const url=ch.share_link||`${window.location.origin}/channel/join/${ch.share_code||ch.channel_id}`; navigator.clipboard.writeText(url); toastC("Invite URL copied"); setMenuId(null); };

  const askDelete=(ch)=>{ setMenuId(null); setConfirm({show:true,ch,mode:isOwner(ch)?"delete":"remove"}); };
  const doDelete=async()=>{
    const ch=confirm.ch; const id=String(ch.channel_id||ch.id); const did=getDeviceId();
    try{
      if(confirm.mode==="delete"){
        const res=await fetch(`${API}/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json","x-device-id":did},body:JSON.stringify({device_id:did})});
        const d=await res.json(); if(!res.ok) throw new Error(d.message||"Only owner device can delete");
        const my=JSON.parse(localStorage.getItem("my_created_channels")||"[]"); localStorage.setItem("my_created_channels",JSON.stringify(my.filter(x=>x!==id)));
        onDeleted?.(id); toastC("Channel permanently deleted");
      }else{
        const res=await fetch(`${API}/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":did}});
        const d=await res.json().catch(()=>({})); if(!res.ok && d.message) throw new Error(d.message);
        onDeleted?.(id); toastC("Removed from your dashboard");
      }
      setConfirm({show:false,ch:null,mode:"delete"});
    }catch(e){ toastC(e.message,"danger"); }
  };

  return (
    <>
      <div className="secw">
        <div className="sech"><span className="hico"><Globe size={12}/></span> Public Channels <span className="cbadge">{channels.length}</span></div>
        {channels.length===0? <div className="empty"><div className="edot"/> No public channels</div> :
          <div className="grid">
            {list.map(ch=>{ const id=String(ch.channel_id||ch.id); const logo=resolveImg(ch.logo_url||ch.channel_logo_url||ch.channel_logo); const owner=isOwner(ch); const active=menuId===id; return (
              <div key={id} className={`pcard ${active?'menu-open':''}`} style={active?{zIndex:9999}:{}} onClick={e=>openCard(ch,e)}>
                <div className="pcard-top">
                  <div className="logo no-open" onClick={()=>setPreview(logo||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.channel_name||'P')}&background=0D8ABC&color=fff`)}><img src={logo||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.channel_name||'P')}&background=0D8ABC&color=fff`} alt="logo"/></div>
                  <div className="pinfo"><div className="pname">{ch.channel_name}</div><span className="pbadge">Public</span><div className="pdate">{formatIST(ch.created_at)}</div></div>
                  <button className="mdot no-open" onClick={e=>{e.stopPropagation(); setMenuId(active?null:id);}}><ThreeDotsVertical size={16}/></button>
                  {active && <div className="dmenu" onClick={e=>e.stopPropagation()}>
                    {owner && <button onClick={()=>startEdit(ch)}><PencilSquare size={13}/> Update Channel</button>}
                    {owner && <button onClick={()=>openShare(ch)}><Share size={13}/> Share Channel</button>}
                    <button onClick={()=>handleCopy(ch)}><Link45deg size={14}/> Copy Channel URL</button>
                    <button onClick={()=>askDelete(ch)} className="del"><Trash size={13}/> {owner? "Delete Channel" : "Remove from Dashboard"}</button>
                  </div>}
                </div>
              </div>
            );})}
          </div>
        }
        {visible<channels.length && <button className="nextb" onClick={()=>setVisible(v=>v+6)}>Show More</button>}
      </div>

      {preview && <div className="pvw" onClick={()=>setPreview(null)}><div className="pvbox" onClick={e=>e.stopPropagation()}><button className="px" onClick={()=>setPreview(null)}><XLg size={14}/></button><img src={preview} alt="preview" className="pvimg"/></div></div>}

      {/* UPDATE MODAL - CENTER PROFESSIONAL, NOT CUT */}
      <Modal show={edit.show} onHide={()=>setEdit({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false})} centered dialogClassName="center-modal" contentClassName="pop-card">
        <Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">Update Public Channel</Modal.Title></Modal.Header>
        <Modal.Body className="pt-1">
          <div className="text-center mb-3">
            <div className="elogow" onClick={()=>fileRef.current?.click()}>
              <img src={edit.prev?.startsWith('data:')?edit.prev:resolveImg(edit.prev)||`https://ui-avatars.com/api/?name=P`} alt="" className="elogo"/>
              <span className="ecam"><Camera size={12}/></span>
            </div>
            <input ref={fileRef} type="file" hidden accept="image/*" onChange={onLogoPick}/>
            <div className="small text-muted mt-1" style={{fontSize:11}}>Click camera to change logo - instant preview</div>
          </div>
          <div className="ff"><label>Channel Name</label><input className="inp" value={edit.name} onChange={e=>setEdit(s=>({...s,name:e.target.value}))} maxLength={30} placeholder="Channel name"/></div>
          <div className="ff"><label>Description</label><textarea className="inp area" value={edit.desc} onChange={e=>setEdit(s=>({...s,desc:e.target.value}))} rows={2} maxLength={120} placeholder="Optional description"/></div>
          <div className="hint">Type cannot be changed • Public needs no PIN</div>
        </Modal.Body>
        <Modal.Footer className="b0"><Button size="sm" variant="light" className="rbtn" onClick={()=>setEdit({show:false})}>Cancel</Button><Button size="sm" onClick={saveEdit} disabled={edit.loading} className="pbtn">{edit.loading?<Spinner size="sm"/>:"Save Changes"}</Button></Modal.Footer>
      </Modal>

      {/* SHARE MODAL - CENTER, SELF EXCLUDE, ONLY SELECTED GET INVITE */}
      <Modal show={share.show} onHide={()=>setShare({show:false,ch:null,users:[],filtered:[],selected:[],search:"",loading:false,fetching:false})} centered dialogClassName="center-modal" contentClassName="pop-card">
        <Modal.Header closeButton className="b0"><Modal.Title className="fs-6 fw-bold">Share Public Channel</Modal.Title></Modal.Header>
        <Modal.Body className="pt-1">
          <div className="small text-muted mb-2">Select users. Only <b>selected users</b> will see invite in their <b>Navbar → Link Requests</b> (logo, name, Accept/Reject). Self excluded. Empty = just copy URL.</div>
          <div className="ssearch"><Search size={13}/><input value={share.search} onChange={e=>onSearch(e.target.value)} placeholder="Search name, email"/></div>
          <div className="ulist">
            {share.fetching? <div className="text-center py-4"><Spinner size="sm"/> Loading users...</div> :
             share.filtered.length===0? <div className="empty small">No users found</div> :
             share.filtered.map(u=>{ const uid=Number(u.telegram_user_id||u.id); const sel=share.selected.includes(uid); return <div key={uid} className={`uitem ${sel?'sel':''}`} onClick={()=>toggleSelect(uid)}><div className={`ucheck ${sel?'on':''}`}>{sel&&<CheckLg size={12}/>}</div><img src={resolveImg(u.profile_image_url)||`https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name||'U')}`} alt=""/><div className="uinfo"><div className="uname">{u.full_name}</div><div className="umail">{u.email}</div></div></div>; })}
          </div>
          <div className="small mt-2">Selected: <b>{share.selected.length}</b> {share.selected.length>0&&<span className="text-success">- only these users will get request</span>}</div>
        </Modal.Body>
        <Modal.Footer className="b0"><Button size="sm" variant="light" className="rbtn" onClick={()=>setShare({show:false})}>Cancel</Button><Button size="sm" onClick={doShare} disabled={share.loading} className="pbtn">{share.loading?<Spinner size="sm"/>:`Share (${share.selected.length}) & Copy URL`}</Button></Modal.Footer>
      </Modal>

      {/* DELETE / REMOVE CONFIRM - CENTER PROFESSIONAL */}
      <Modal show={confirm.show} onHide={()=>setConfirm({show:false,ch:null,mode:"delete"})} centered dialogClassName="center-modal" contentClassName="pop-card alert-pop"><Modal.Body className="text-center p-4"><div className="warn"><ExclamationTriangle size={20}/></div><div className="fw-bold fs-6 mt-2">{confirm.mode==="delete"?`Delete "${confirm.ch?.channel_name}" permanently?`:`Remove "${confirm.ch?.channel_name}"?`}</div><div className="small text-muted mt-1">{confirm.mode==="delete"?"Only from created device. Permanent for everyone.":"Only removes from your dashboard. Owner keeps it."}</div><div className="d-flex gap-2 justify-content-center mt-3"><Button size="sm" variant="light" className="rbtn" onClick={()=>setConfirm({show:false})}>Cancel</Button><Button size="sm" className={confirm.mode==="delete"?"dbtn":"pbtn"} onClick={doDelete}>{confirm.mode==="delete"?"Delete Permanently":"Remove"}</Button></div></Modal.Body></Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}><span className="jti">{toast.t==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
     .secw{width:100%;max-width:760px;margin:14px auto;padding:14px;background:linear-gradient(180deg,#fff,#fbfdff);border:1px solid #e2e8f0;border-radius:18px;box-sizing:border-box;overflow:visible;box-shadow:0 4px 18px rgba(15,23,42,.04)}
     .sech{font-size:13px;font-weight:900;display:flex;align-items:center;gap:8px;margin-bottom:12px}.hico{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#dbeafe,#e0f2fe);display:flex;align-items:center;justify-content:center;color:#2563eb;border:1px solid #bfdbfe}.cbadge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:800}
     .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;overflow:visible}@media(max-width:640px){.secw{width:calc(100% - 14px);margin:10px auto;padding:12px}.grid{grid-template-columns:1fr}}
     .pcard{position:relative;background:#fff;border:1px solid #eef2ff;border-radius:16px;padding:13px;overflow:visible;cursor:pointer;transition:.22s cubic-bezier(.16,1,.3,1)}.pcard:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(15,23,42,.08);border-color:#c7d2fe}.pcard.menu-open{z-index:9999!important;box-shadow:0 18px 40px rgba(0,0,0,.16)!important;border-color:#93c5fd!important}
     .pcard-top{display:flex;gap:11px;align-items:center;overflow:visible}
     .logo{width:50px;height:50px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid #e2e8f0;background:radial-gradient(120px 80px at 30% 20%,#eff6ff,#fff);cursor:zoom-in}.logo img{width:100%;height:100%;object-fit:cover;display:block}
     .pinfo{flex:1;min-width:0}.pname{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px}.pbadge{display:inline-block;margin-top:2px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px}.pdate{font-size:11px;color:#64748b;margin-top:3px}
     .mdot{width:34px;height:34px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.04)}.mdot:active{transform:scale(.9)}
     .dmenu{position:absolute;right:8px;top:56px;background:#ffffffee;backdrop-filter:blur(10px);border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 20px 44px rgba(0,0,0,.18);z-index:10000;min-width:212px;overflow:hidden;animation:pop.2s cubic-bezier(.16,1,.3,1)}.dmenu button{width:100%;height:42px;border:none;background:transparent;display:flex;align-items:center;gap:10px;padding:0 14px;font-size:13px;font-weight:650;text-align:left}.dmenu button:hover{background:#f8fafc}.dmenu button.del{color:#dc2626}.dmenu button.del:hover{background:#fef2f2}
     .nextb{margin:14px auto 2px;display:block;height:36px;padding:0 18px;border:1px solid #dbe2f0;border-radius:999px;background:#fff;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.04)}
     .empty{padding:14px;text-align:center;color:#94a3b8;font-size:12px;display:flex;gap:8px;align-items:center;justify-content:center}.edot{width:6px;height:6px;border-radius:50%;background:#cbd5e1}
     .pvw{position:fixed;inset:0;background:rgba(2,6,23,.84);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}.pvbox{position:relative;animation:pop.24s ease}.pvimg{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:18px;background:#000;box-shadow:0 20px 60px rgba(0,0,0,.5);display:block}.px{position:absolute;top:-10px;right:-10px;width:38px;height:38px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer}
     .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:18px!important;box-shadow:0 24px 64px rgba(15,23,42,.28)!important;overflow:visible!important;animation:pop.28s cubic-bezier(.16,1,.3,1)!important}.b0{border:0!important}.rbtn{border-radius:10px!important;font-weight:700!important;border:1px solid #e2e8f0!important}.pbtn{border-radius:10px!important;font-weight:800!important;background:linear-gradient(135deg,#2563eb,#06b6d4)!important;border:none!important;box-shadow:0 6px 16px rgba(37,99,235,.28)!important;color:#fff!important}.dbtn{border-radius:10px!important;font-weight:800!important;background:linear-gradient(135deg,#ef4444,#dc2626)!important;border:none!important;color:#fff!important}
     .ff{margin-bottom:12px}.ff label{font-size:11px;font-weight:800;letter-spacing:.2px;margin-bottom:5px;display:block;color:#334155}.inp{width:100%;border:1px solid #dbe2f0;border-radius:12px;padding:0 13px;font-size:13px;outline:none;background:#fff;transition:.15s}.inp:not(.area){height:42px}.inp.area{height:66px;padding:10px 13px;resize:none}.inp:focus{border-color:#93c5fd;box-shadow:0 0 0 4px #eff6ff}.hint{font-size:11px;color:#94a3b8}
     .elogow{position:relative;width:82px;height:82px;border-radius:50%;overflow:hidden;display:inline-block;border:2px dashed #93c5fd;background:radial-gradient(80px 60px at 30% 20%,#eff6ff,#fff);cursor:pointer;transition:.15s}.elogow:active{transform:scale(.96)}.elogo{width:100%;height:100%;object-fit:cover}.ecam{position:absolute;right:3px;bottom:3px;width:24px;height:24px;background:linear-gradient(135deg,#2563eb,#06b6d4);border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,.18)}
     .ssearch{display:flex;align-items:center;gap:9px;border:1px solid #dbe2f0;border-radius:12px;padding:0 12px;height:40px;background:#f8fafc;margin-bottom:10px;transition:.15s}.ssearch:focus-within{background:#fff;border-color:#93c5fd;box-shadow:0 0 0 4px #eff6ff}.ssearch input{border:none;outline:none;flex:1;font-size:13px;background:transparent}
     .ulist{max-height:300px;overflow:auto;border:1px solid #eef2ff;border-radius:14px;padding:6px;background:#fbfdff}.uitem{display:flex;align-items:center;gap:11px;padding:10px;border-radius:12px;cursor:pointer;transition:.15s;border:1px solid transparent}.uitem:hover{background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.04);border-color:#e2e8f0}.uitem.sel{background:#eff6ff;border-color:#bfdbfe;box-shadow:0 6px 14px rgba(37,99,235,.12)}.ucheck{width:22px;height:22px;border:1.5px solid #cbd5e1;border-radius:7px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.15s}.ucheck.on{background:#2563eb;border-color:#2563eb;color:#fff;box-shadow:0 4px 10px rgba(37,99,235,.28)}.uitem img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0}.uinfo{min-width:0;flex:1}.uname{font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.umail{font-size:10.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
     .warn{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#fef3c7,#fee2e2);border:1px solid #fecaca;color:#d97706;display:flex;align-items:center;justify-content:center;margin:0 auto}.alert-pop{overflow:hidden!important}
     .jtc{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:100000!important;pointer-events:none!important;padding:20px}.jtt{display:flex!important;gap:9px!important;align-items:center!important;padding:13px 18px!important;border-radius:14px!important;color:#fff!important;font-weight:850!important;font-size:13px!important;box-shadow:0 18px 40px rgba(0,0,0,.28)!important;pointer-events:auto!important;animation:pop.28s cubic-bezier(.16,1,.3,1)!important}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)!important}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important}.jti{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.24);display:flex;align-items:center;justify-content:center}
      @keyframes pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </>
  );
}