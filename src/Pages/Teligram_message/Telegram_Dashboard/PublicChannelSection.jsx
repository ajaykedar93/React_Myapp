import React, { useState, useRef, useEffect } from 'react';
import { Modal, Spinner, Button } from 'react-bootstrap';
import { ThreeDotsVertical, XLg, Globe, PencilSquare, Trash, Share, Link45deg, Camera, Search, CheckLg, ExclamationTriangle, PencilFill, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const FRONTEND_BASE = (import.meta.env.VITE_APP_URL || "https://react-myapp-omega.vercel.app").replace(/\/$/, "");
const API = `${API_BASE}/api/telegramlogin-channels`;
const USERS_API = `${API_BASE}/api/telegramlogin-users`;
const ALLMISS_API = `${API_BASE}/api/telegramlogin-allmiss`;

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getCurrentUserId = ()=>{ try{ const t=getToken(); const p=JSON.parse(atob(t.split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{return 0;} };
const normalizeLogoUrl = (u)=>{
  if(!u) return "";
  const value = String(u).trim();
  if(value.startsWith("data:")||value.startsWith("blob:")) return value;
  if(/^https?:\/\//i.test(value)) return value;
  if(value.startsWith("/")) return `${API_BASE}${value}`;
  if(value.startsWith("api/")) return `${API_BASE}/${value}`;
  return `${API_BASE}/${value}`;
};
const resolveImg = (u)=>normalizeLogoUrl(u);
const defaultAvatar = (name="P") => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
const appendCacheBuster = (url)=>{ if(!url) return url; if(url.startsWith('data:')||url.startsWith('blob:')) return url; return `${url}${url.includes('?')?'&':'?'}v=${Date.now()}`; };
const formatIST = (iso)=>{ if(!iso) return ""; const d=new Date(iso); return `${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}`; };
const getChannelLogo = (ch)=>{ const raw = ch.logo_url||ch.channel_logo_url||ch.channel_logo||""; const resolved = normalizeLogoUrl(raw); return resolved || defaultAvatar(ch.channel_name||"P"); };
const handleImgError = (e, name)=>{ const fallback = defaultAvatar(name||"P"); if(e.currentTarget.src !== fallback){ e.currentTarget.onerror = null; e.currentTarget.src = fallback; } };
const isOwner = (ch)=>{ const uid=String(getCurrentUserId()); if(uid==="0"){ const my=JSON.parse(localStorage.getItem("my_created_channels")||"[]"); return my.includes(String(ch.channel_id||ch.id)); } return String(ch.created_by_user_id)===uid || ch.is_owner===true || String(ch.member_role).toLowerCase()==="owner"; };
const getJoinUrl = (ch) => `${FRONTEND_BASE}/#/channel/join/${ch.share_code||ch.channel_id||ch.id}`;

export default function PublicChannelSection({ channels=[], onUpdated, onDeleted, onOpen, showCenterToast }){
  const [visible,setVisible]=useState(6);
  const [menuId,setMenuId]=useState(null);
  const [menuUp,setMenuUp]=useState(false);
  const [preview,setPreview]=useState(null);
  const [edit,setEdit]=useState({show:false,ch:null,name:"",desc:"",file:null,prev:"",loading:false});
  const [share,setShare]=useState({show:false,ch:null,users:[],filtered:[],selected:[],search:"",loading:false,fetching:false});
  const [confirm,setConfirm]=useState({show:false,ch:null,mode:"delete"});
  const [adjust,setAdjust]=useState({open:false,src:"",scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false});
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const fileRef=useRef(null);
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); showCenterToast?.(m,t); setTimeout(()=>setToast({show:false,msg:""}),2600); };

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
  const createAdjustedLogo=({withPreview=false}={})=>{
    return new Promise((resolve)=>{
      const sourceUrl = adjust.src || (edit.file ? URL.createObjectURL(edit.file) : "");
      if(!sourceUrl){ resolve(withPreview?{file:edit.file,preview:edit.prev}:edit.file); return; }
      const image=new Image();
      if (/^https?:\/\//i.test(sourceUrl)) {
        image.crossOrigin = "anonymous";
      }
      const tempUrl = (!adjust.src && edit.file) ? sourceUrl : null;
      image.onload=()=>{
        try {
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
          const finalize=(blob)=>{
            if(tempUrl) URL.revokeObjectURL(tempUrl);
            if(blob){
              const file=new File([blob],`channel_logo_${Date.now()}.png`,{type:'image/png'});
              if(withPreview){ resolve({file,preview:canvas.toDataURL('image/png')}); }
              else { resolve(file); }
            } else {
              resolve(withPreview?{file:edit.file,preview:edit.prev}:edit.file);
            }
          };
          canvas.toBlob((blob)=>finalize(blob),'image/png');
        } catch (err) {
          if(tempUrl) URL.revokeObjectURL(tempUrl);
          console.error('Logo adjust error:', err);
          resolve(withPreview?{file:edit.file,preview:edit.prev}:edit.file);
        }
      };
      image.onerror=()=>{
        if(tempUrl) URL.revokeObjectURL(tempUrl);
        resolve(withPreview?{file:edit.file,preview:edit.prev}:edit.file);
      };
      image.src=sourceUrl;
    });
  };

  useEffect(()=>{ const h=e=>{ if(!e.target.closest('.mdot-wrap')&&!e.target.closest('.dmenu')) setMenuId(null); }; document.addEventListener('click',h); return()=>document.removeEventListener('click',h); },[]);
  useEffect(()=>setVisible(6),[channels.length]);

  const list=channels.slice(0,visible);
  const openCard=(ch,e)=>{ if(e.target.closest('.no-open')) return; onOpen?.(ch); };

  const handleDotClick = (e, id) => {
    e.stopPropagation();
    if(menuId===id){ setMenuId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const up = spaceBelow < 160; // khali jagah kami asel tar var
    setMenuUp(up);
    setMenuId(id);
  };

  const startEdit=(ch)=>{ setMenuId(null); setEdit({show:true,ch,name:ch.channel_name||"",desc:ch.channel_description||"",file:null,prev:ch.logo_url||ch.channel_logo_url||ch.channel_logo||"",loading:false}); setAdjust({open:false,src:"",scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false}); };
  const onLogoPick=e=>{
    const f=e.target.files?.[0]; if(!f) return;
    onAdjustPick(f);
  };
  const openAdjustModal=()=>{
    const source = edit.prev || edit.ch?.logo_url || edit.ch?.channel_logo_url || edit.ch?.channel_logo || "";
    if(!source) return toastC("No logo to adjust","danger");
    setAdjust(a=>({ ...a, open:true, src:source, scale:a.scale, pos:a.pos, modified:false }));
  };
  const applyAdjustedPreview=async()=>{
    const result = await createAdjustedLogo({withPreview:true});
    if(result?.preview){
      setEdit(s=>({...s,prev:result.preview}));
      setAdjust(a=>({...a,open:false,preview:result.preview,modified:true}));
    } else {
      setAdjust(a=>({...a,open:false}));
    }
  };
  const saveEdit=async()=>{
    if(edit.name.trim().length<3) return toastC("Name min 3 chars","danger");
    // Render the edit first; image conversion and the API request can continue afterwards.
    const optimisticChannel={...edit.ch,channel_name:edit.name.trim(),channel_description:edit.desc.trim(),logo_url:edit.prev||edit.ch.logo_url,channel_logo_url:edit.prev||edit.ch.channel_logo_url,logo_zoom:adjust.scale,logo_x:adjust.pos.x,logo_y:adjust.pos.y};
    onUpdated?.(optimisticChannel);
    setEdit({show:false, ch:null, name:"", desc:"", file:null, prev:"", loading:false});
    setAdjust({open:false,src:"",scale:1,pos:{x:0,y:0},dragging:false,start:{x:0,y:0},modified:false});
    try{
      const fd=new FormData(); const did=getDeviceId();
      fd.append("channel_name",edit.name.trim());
      fd.append("name",edit.name.trim());
      fd.append("channel_description",edit.desc.trim());
      fd.append("description",edit.desc.trim());
      fd.append("device_id",did);
      if(edit.file || adjust.modified){
        const adjustedFile = await createAdjustedLogo();
        if(adjustedFile) {
          fd.append("channel_logo",adjustedFile);
        } else if (edit.file) {
          fd.append("channel_logo",edit.file);
        }
      }
      const id=edit.ch.channel_id||edit.ch.id;
      const url = (edit.file || adjust.modified) ? `${API}/${id}/logo` : `${API}/${id}`;
      const res=await fetch(url,{method:"PUT",headers:{Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:fd});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Update failed");
      const upd=d.channel||d.data||d;
      const updatedLogo = upd.channel_logo_url||upd.logo_url||upd.channel_logo||edit.prev;
      onUpdated?.({...edit.ch,...upd,channel_name:upd.channel_name||edit.name.trim(),logo_url:appendCacheBuster(updatedLogo),logo_zoom:adjust.scale,logo_x:adjust.pos.x,logo_y:adjust.pos.y});
      toastC("Channel updated");
    }catch(e){ console.error('Public channel update error:', e); toastC(e.message,"danger"); setEdit(s=>({...s,loading:false})); }
  };

  const openShare=async(ch)=>{
    setMenuId(null); setShare({show:true,ch,users:[],filtered:[],selected:[],search:"",loading:false,fetching:true});
    try{
      const res=await fetch(`${USERS_API}/all-register-users?limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}});
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Users fetch failed");
      const uid=getCurrentUserId();
      const all=(d.users||[]).filter(u=> Number(u.telegram_user_id||u.id)!==Number(uid));
      setShare(s=>({...s,users:all,filtered:all,fetching:false}));
    }catch(e){ setShare(s=>({...s,fetching:false})); toastC(e.message,"danger"); }
  };
  const onSearch=v=>setShare(s=>{ const q=v.toLowerCase(); return {...s,search:v,filtered:s.users.filter(u=>(u.full_name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q))}; });
  const toggleSelect=(id)=>setShare(s=>{ const has=s.selected.includes(id); return {...s,selected:has?s.selected.filter(x=>x!==id):[...s.selected,id]}; });

  const doShare=()=>{
    const ch=share.ch; const joinUrl = getJoinUrl(ch);
    if(share.selected.length===0){ navigator.clipboard.writeText(joinUrl); toastC("Hosted URL copied"); return; }
    const selected=[...share.selected];
    setShare({show:false,ch:null,users:[],filtered:[],selected:[],search:"",loading:false,fetching:false});
    toastC(`Sending invite to ${selected.length}`);
    void (async()=>{ try{
      const res=await fetch(`${ALLMISS_API}/send-link`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":getDeviceId()},
        body:JSON.stringify({ channel_id: ch.channel_id||ch.id, receiver_ids: selected, invite_url: joinUrl })
      });
      const d=await res.json(); if(!res.ok) throw new Error(d.message||"Share failed");
      navigator.clipboard.writeText(joinUrl);
      toastC(`Invite sent to ${d.sent_count||selected.length}`);
    }catch(e){ toastC(e.message||"Share failed","danger"); } })();
  };

  const handleCopy=(ch)=>{ const url=getJoinUrl(ch); navigator.clipboard.writeText(url); toastC("Hosted URL copied"); setMenuId(null); };
  const askDelete=(ch)=>{ setMenuId(null); setConfirm({show:true,ch,mode:isOwner(ch)?"delete":"remove"}); };
  const doDelete=()=>{
    const ch=confirm.ch; const id=String(ch.channel_id||ch.id); const did=getDeviceId();
    const mode=confirm.mode;
    onDeleted?.(id);
    setConfirm({show:false});
    toastC(mode==="delete"?"Channel deleted":"Channel removed");
    void (async()=>{ try{
      if(mode==="delete"){
        const res=await fetch(`${API}/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json","x-device-id":did},body:JSON.stringify({device_id:did})});
        const d=await res.json(); if(!res.ok) throw new Error(d.message||"Only owner can delete");
        const my=JSON.parse(localStorage.getItem("my_created_channels")||"[]"); localStorage.setItem("my_created_channels",JSON.stringify(my.filter(x=>x!==id)));
      }else{
        const res=await fetch(`${ALLMISS_API}/remove/${id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,"x-device-id":did},body:JSON.stringify({})});
        const d=await res.json().catch(()=>({})); if(!res.ok && d.message) throw new Error(d.message);
      }
    }catch(e){ toastC(e.message||"Request failed. Please refresh to verify.","danger"); } })();
  };

  return (
    <>
      <div className="secw">
        <div className="sech"><span className="hico"><Globe size={12}/></span> Public Channels <span className="cbadge">{channels.length}</span></div>
        {channels.length===0? <div className="empty"><div className="edot"/> No public channels</div> :
          <div className="grid">
            {list.map((ch)=>{ const id=String(ch.channel_id||ch.id); const logo=getChannelLogo(ch); const owner=isOwner(ch); const active=menuId===id; return (
              <div key={id} className={`pcard ${active?'menu-open':''}`} onClick={e=>openCard(ch,e)}>
                <div className="pcard-top">
                  <div className="logo no-open" onClick={()=>setPreview(logo)}><img src={logo} alt="logo" onError={(e)=>handleImgError(e,ch.channel_name||'P')} style={ch.logo_zoom?{transform:`translate(${ch.logo_x||0}px,${ch.logo_y||0}px) scale(${ch.logo_zoom||1})`}:undefined}/></div>
                  <div className="pinfo"><div className="pname">{ch.channel_name}</div><span className="pbadge">Public</span><div className="pdate">{formatIST(ch.created_at)}</div></div>
                  <div className="mdot-wrap no-open">
                    <button className="mdot" onClick={(e)=>handleDotClick(e,id)}><ThreeDotsVertical size={14}/></button>
                    {active && <div className={`dmenu ${menuUp?'up':''}`} onClick={e=>e.stopPropagation()}>
                      {owner && <button onClick={()=>startEdit(ch)}><PencilSquare size={12}/> Update</button>}
                      {owner && <button onClick={()=>openShare(ch)}><Share size={12}/> Share</button>}
                      <button onClick={()=>handleCopy(ch)}><Link45deg size={13}/> Copy Link</button>
                      <button onClick={()=>askDelete(ch)} className="del"><Trash size={12}/> {owner? "Delete" : "Remove"}</button>
                    </div>}
                  </div>
                </div>
              </div>
            );})}
          </div>
        }
        {visible<channels.length && <button className="nextb" onClick={()=>setVisible(v=>v+6)}>Show More</button>}
      </div>

      {preview && <div className="pvw" onClick={()=>setPreview(null)}><div className="pvbox" onClick={e=>e.stopPropagation()}><button className="px" onClick={()=>setPreview(null)}><XLg size={14}/></button><img src={preview} alt="preview" className="pvimg"/></div></div>}

      <Modal show={edit.show} onHide={()=>setEdit(s=>({...s,show:false}))} centered dialogClassName="center-modal" contentClassName="pop-card">
        <div className="mhead"><span>Update Public Channel</span><button className="mx" onClick={()=>setEdit(s=>({...s,show:false}))}><XLg size={14}/></button></div>
        <div className="mbody">
          <div className="logo-block">
            <div className="logo-circle" onClick={()=>fileRef.current?.click()}>
              {edit.prev? <img src={edit.prev?.startsWith('data:')?edit.prev:normalizeLogoUrl(edit.prev)} alt="" onError={(e)=>handleImgError(e,edit.name||'P')} /> : <Camera size={20} color="#94a3b8"/>}
            </div>
            <input ref={fileRef} type="file" hidden accept="image/*" onChange={onLogoPick}/>
            <div className="logo-below" onClick={()=>fileRef.current?.click()}><PencilFill size={10}/> Tap to change</div>
            {edit.prev && <button type="button" className="adj-link" onClick={openAdjustModal}><ZoomIn size={12}/> Adjust logo</button>}
          </div>
          <div className="ff"><label>Channel Name</label><input className="inp" value={edit.name} onChange={e=>setEdit(s=>({...s,name:e.target.value}))} maxLength={30}/></div>
          <div className="ff"><label>Description</label><textarea className="inp area" value={edit.desc} onChange={e=>setEdit(s=>({...s,desc:e.target.value}))} rows={2} maxLength={120}/></div>
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
            {adjust.src ? <img src={adjust.src} alt="adjust" style={{transform:`translate(${adjust.pos.x}px, ${adjust.pos.y}px) scale(${adjust.scale})`}} draggable={false} /> : <div className="adjust-empty">Select logo above to adjust</div>}
            <div className="adjust-mask" />
          </div>
          <div className="control-row">
            <button type="button" className="adj-btn" onClick={()=>setAdjust(a=>({...a,scale:Math.max(1,a.scale-0.1)}))}><ZoomOut size={14}/></button>
            <input type="range" min="1" max="3" step="0.02" value={adjust.scale} onChange={e=>setAdjust(a=>({...a,scale:parseFloat(e.target.value)}))} className="adj-range" />
            <button type="button" className="adj-btn" onClick={()=>setAdjust(a=>({...a,scale:Math.min(3,a.scale+0.1)}))}><ZoomIn size={14}/></button>
          </div>
          <div className="move-row"><button type="button" className="move-btn" onClick={()=>setAdjust(a=>({...a,pos:{...a.pos,x:a.pos.x-10},modified:true}))}><ArrowLeft size={13}/></button><button type="button" className="move-btn" onClick={()=>setAdjust(a=>({...a,pos:{...a.pos,y:a.pos.y-10},modified:true}))}><ArrowUp size={13}/></button><button type="button" className="move-btn" onClick={()=>setAdjust(a=>({...a,pos:{...a.pos,y:a.pos.y+10},modified:true}))}><ArrowDown size={13}/></button><button type="button" className="move-btn" onClick={()=>setAdjust(a=>({...a,pos:{...a.pos,x:a.pos.x+10},modified:true}))}><ArrowRight size={13}/></button></div>
          <div className="mfoot">
            <button className="cb-cancel" onClick={()=>setAdjust(a=>({...a,open:false,dragging:false}))}>Close</button>
            <button className="cb-save" onClick={applyAdjustedPreview}>Done</button>
          </div>
        </div>
      </Modal>

      <Modal show={share.show} onHide={()=>setShare(s=>({...s,show:false}))} centered dialogClassName="center-modal" contentClassName="pop-card">
        <div className="mhead"><span>Share Channel</span><button className="mx" onClick={()=>setShare(s=>({...s,show:false}))}><XLg size={14}/></button></div>
        <div className="mbody share-body">
          <div className="ssearch"><Search size={13}/><input value={share.search} onChange={e=>onSearch(e.target.value)} placeholder="Search users..."/></div>
          <div className="ulist">
            {share.fetching? <div className="text-center py-4"><Spinner size="sm"/></div> :
             share.filtered.length===0? <div className="empty small">No users</div> :
             share.filtered.map(u=>{ const uid=Number(u.telegram_user_id||u.id); const sel=share.selected.includes(uid); return <div key={uid} className={`uitem ${sel?'sel':''}`} onClick={()=>toggleSelect(uid)}><div className={`ucheck ${sel?'on':''}`}>{sel&&<CheckLg size={10}/>}</div><img src={resolveImg(u.profile_image_url)||`https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name||'U')}`} alt=""/><div className="uinfo"><div className="uname">{u.full_name}</div><div className="umail">{u.email}</div></div></div>; })}
          </div>
        </div>
        <div className="mfoot">
          <button className="cb-cancel" onClick={()=>setShare(s=>({...s,show:false}))}>Cancel</button>
          <button className="cb-save" onClick={doShare} disabled={share.loading}>{share.loading?<Spinner size="sm"/>:`Share ${share.selected.length?`(${share.selected.length})`:''}`}</button>
        </div>
      </Modal>

      <Modal show={confirm.show} onHide={()=>setConfirm({show:false})} centered dialogClassName="center-modal" contentClassName="pop-card alert-pop"><div className="p-4 text-center"><div className="warn"><ExclamationTriangle size={20}/></div><div className="fw-bold fs-6 mt-2">{confirm.mode==="delete"?`Delete "${confirm.ch?.channel_name}"?`:`Remove "${confirm.ch?.channel_name}"?`}</div><div className="d-flex gap-2 justify-content-center mt-3"><Button size="sm" variant="light" className="cb-cancel" onClick={()=>setConfirm({show:false})}>Cancel</Button><Button size="sm" className={confirm.mode==="delete"?"cb-del":"cb-save"} onClick={doDelete}>{confirm.mode==="delete"?"Delete":"Remove"}</Button></div></div></Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}><span className="jti">{toast.t==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
 .secw{width:100%;max-width:760px;margin:14px auto;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:visible;box-shadow:0 4px 18px rgba(15,23,42,.04)}
 .sech{font-size:13px;font-weight:900;display:flex;align-items:center;gap:8px;margin-bottom:12px}.hico{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#dbeafe,#e0f2fe);display:flex;align-items:center;justify-content:center;color:#2563eb;border:1px solid #bfdbfe}.cbadge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:800}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;overflow:visible}@media(max-width:640px){.grid{grid-template-columns:1fr}}
 .pcard{position:relative;background:#fff;border:1px solid #eef2ff;border-radius:16px;padding:13px;overflow:visible;cursor:pointer;transition:.15s}
 .pcard-top{display:flex;gap:11px;align-items:center;overflow:visible}
 .logo{width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid #e2e8f0}.logo img{width:100%;height:100%;object-fit:cover}
 .pinfo{flex:1;min-width:0}.pname{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pbadge{display:inline-block;margin-top:2px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:9px;font-weight:800;padding:2px 7px;border-radius:999px}.pdate{font-size:10px;color:#64748b;margin-top:3px}
 .mdot-wrap{position:relative;flex-shrink:0}
 .mdot{width:30px;height:30px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;transition:.12s}.mdot:active{transform:scale(.9)}
 .dmenu{position:absolute;right:0;top:36px;background:#fff;border:1px solid #e8eef7;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.18);z-index:99999;min-width:148px;padding:4px;animation:pop.16s ease;display:flex;flex-direction:column;gap:2px}
 .dmenu.up{top:auto!important;bottom:36px!important}
 .dmenu button{width:100%;height:32px;border:none;background:#fff;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:11.5px;font-weight:600;border-radius:8px;transition:.12s;white-space:nowrap}.dmenu button:hover{background:#f8fafc}.dmenu button:active{transform:scale(.96)}.dmenu button.del{color:#dc2626}
 .nextb{margin:14px auto 2px;display:block;height:34px;padding:0 16px;border:1px solid #dbe2f0;border-radius:999px;background:#fff;font-weight:700;font-size:12px}
 .pvw{position:fixed;inset:0;background:rgba(2,6,23,.84);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}.pvbox{position:relative}.pvimg{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:18px;background:#000}.px{position:absolute;top:-10px;right:-10px;width:32px;height:32px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center}
 .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:20px!important;box-shadow:0 24px 64px rgba(15,23,42,.22)!important;overflow:hidden!important}
 .mhead{height:50px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;border-bottom:1px solid #f1f5f9;background:#fff;flex-shrink:0}.mx{width:30px;height:30px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;transition:.15s}.mx:active{transform:scale(.9)}
 .mbody{padding:16px;background:#fff;max-height:70vh;overflow-y:auto}.mfoot{display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #f1f5f9;background:#fff;flex-shrink:0}
 .ff{margin-bottom:12px}.ff label{font-size:11px;font-weight:700;margin-bottom:5px;display:block;color:#334155}.inp{width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:0 12px;font-size:13px;outline:none;background:#fff;height:42px}.inp.area{height:60px;padding:10px 12px;resize:none}
 .logo-block{display:flex;flex-direction:column;align-items:center;gap:7px;margin-bottom:16px}.logo-circle{width:76px;height:76px;border-radius:50%;border:1.5px dashed #cbd5e1;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}.logo-circle img{width:100%;height:100%;object-fit:cover}.logo-below{font-size:10px;font-weight:700;color:#64748b;display:flex;align-items:center;gap:4px;cursor:pointer}.adj-link{font-size:11px;font-weight:700;color:#2563eb;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;gap:4px}.adjust-area{position:relative;width:100%;height:260px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:12px}.adjust-area img{max-width:none;min-width:100%;min-height:100%;user-select:none;pointer-events:none}.adjust-mask{position:absolute;inset:0;box-shadow:inset 0 0 0 9999px rgba(15,23,42,.35);border-radius:16px;pointer-events:none}.control-row{display:flex;align-items:center;gap:8px;margin-bottom:10px}.adj-btn{width:36px;height:36px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;display:flex;align-items:center;justify-content:center;cursor:pointer}.adj-range{flex:1;height:28px}.move-row{display:flex;justify-content:center;gap:8px;margin:-2px 0 12px}.move-btn{width:32px;height:32px;border:1px solid #dbeafe;border-radius:10px;background:#f8fbff;color:#2563eb;display:flex;align-items:center;justify-content:center}.adjust-foot{font-size:11px;color:#64748b;text-align:center;margin-bottom:8px}
 .cb-cancel{flex:1;height:38px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;transition:.15s}.cb-save{flex:1;height:38px;border-radius:10px;border:none;background:#0f172a;color:#fff;font-size:12px;font-weight:800;transition:.15s;display:flex;align-items:center;justify-content:center;gap:6px}.cb-cancel:active,.cb-save:active{transform:scale(.96)}.cb-del{flex:1;height:38px;border-radius:10px;border:none;background:#ef4444;color:#fff;font-weight:700}
 .ssearch{display:flex;align-items:center;gap:8px;border:1px solid #e2e8f0;border-radius:11px;padding:0 11px;height:38px;background:#f8fafc;margin-bottom:10px}.ssearch input{border:none;outline:none;flex:1;font-size:12px;background:transparent}
 .ulist{max-height:300px;overflow:auto;border:1px solid #eef2ff;border-radius:12px;padding:4px;background:#fbfdff}.uitem{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:.12s}.uitem.sel{background:#eff6ff;border:1px solid #bfdbfe}.ucheck{width:18px;height:18px;border:1.5px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ucheck.on{background:#0f172a;border-color:#0f172a;color:#fff}.uitem img{width:32px;height:32px;border-radius:50%;object-fit:cover}.uinfo{min-width:0;flex:1}.uname{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.umail{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .warn{width:42px;height:42px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto}
 .jtc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100000;pointer-events:none;padding:20px}.jtt{display:flex;gap:8px;align-items:center;padding:11px 16px;border-radius:12px;color:#fff;font-weight:700;font-size:12px;box-shadow:0 12px 30px rgba(0,0,0,.18)}.jtt.success{background:#16a34a}.jtt.danger{background:#ef4444}
   @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </>
  );
}
