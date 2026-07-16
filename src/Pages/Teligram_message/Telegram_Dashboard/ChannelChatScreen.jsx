import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { Search, ThreeDotsVertical, TypeBold, TypeUnderline, Palette, Image as ImgIcon, Paperclip, SendFill, XLg, Calendar, PencilSquare, Trash, Files, Eye, Download, ArrowLeft, CheckLg, LockFill, XCircleFill } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const NOTES_API = `${API_BASE}/api/telegramlogin-notes`;
const CHANNEL_API = `${API_BASE}/api/telegramlogin-channels`;
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getMyId = ()=>{ try{ const p=JSON.parse(atob(getToken().split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{ return 0; } };
const resolveImg = (u)=>{ if(!u) return ""; if(u.startsWith("data:")||u.startsWith("http")||u.startsWith("blob:")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const fmtTime = (iso)=> new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});
const fmtDate = (iso)=> new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
const badgeColor = (str)=>{ const c=[["#eff6ff","#2563eb"],["#f0fdf4","#16a34a"],["#fef3c7","#d97706"],["#fce7f3","#db2777"],["#ede9fe","#7c3aed"],["#ffedd5","#ea580c"]]; let h=0; for(let i=0;i<(str||"").length;i++) h=str.charCodeAt(i)+((h<<5)-h); return c[Math.abs(h)%c.length]; };

export default function ChannelChatScreen(){
  const { id } = useParams(); const navigate=useNavigate();
  const [channel,setChannel]=useState(null); const [notes,setNotes]=useState([]); const [loading,setLoading]=useState(true);
  const [searchOpen,setSearchOpen]=useState(false); const [q,setQ]=useState(""); const [qDate,setQDate]=useState("");
  const [file,setFile]=useState(null); const [filePreview,setFilePreview]=useState(""); const [editingId,setEditingId]=useState(null);
  const [menuId,setMenuId]=useState(null); const [menuUp,setMenuUp]=useState(false); const [toast,setToast]=useState({show:false,msg:"",green:false});
  const [attachUrls,setAttachUrls]=useState({}); const [imgViewer,setImgViewer]=useState({open:false,url:""}); const [logoView,setLogoView]=useState(false);
  const [boldOn,setBoldOn]=useState(false); const [ulOn,setUlOn]=useState(false);
  const listRef=useRef(null); const editorRef=useRef(null); const fileRef=useRef(null); const imgRef=useRef(null); const myId=getMyId();
  const showToast=(m,green=false)=>{ setToast({show:true,msg:m,green}); setTimeout(()=>setToast({show:false,msg:"",green:false}),1200); };
  const scrollBottom=()=> setTimeout(()=> listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:'smooth'}),100);
  const getHeaders=()=>({ Authorization:`Bearer ${getToken()}`, "x-device-id":getDeviceId() });

  const fetchChannel=async()=>{ try{ const r=await fetch(`${CHANNEL_API}/${id}`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setChannel(d.channel||d.data||d); }catch{} };
  const fetchNotes=async()=>{ try{ const r=await fetch(`${NOTES_API}/${id}/all`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setNotes(d.notes||[]); }catch{} finally{ setLoading(false); } };
  useEffect(()=>{ fetchChannel(); fetchNotes(); },[id]);

  const exec=(cmd,val=null)=>{ editorRef.current?.focus(); document.execCommand(cmd,false,val); };
  const loadSmall=async(nid)=>{
    if(attachUrls[nid]) return attachUrls[nid];
    try{ const r=await fetch(`${NOTES_API}/attachment/${nid}`,{headers:getHeaders()}); if(!r.ok) throw new Error(); const b=await r.blob(); const url=URL.createObjectURL(b); setAttachUrls(p=>({...p,[nid]:url})); return url; }catch{ showToast("Image failed"); return null; }
  };
  const viewBig=async(nid)=>{ const url=attachUrls[nid]||await loadSmall(nid); if(url) setImgViewer({open:true,url}); };
  const downloadOne=async(note)=>{ const url=attachUrls[note.note_id]||await loadSmall(note.note_id); if(!url) return; const a=document.createElement('a'); a.href=url; a.download=note.attachment_name||'image.jpg'; a.click(); };

  const sendNote=async()=>{
    const html=editorRef.current?.innerHTML||""; const text=editorRef.current?.innerText?.trim()||"";
    if(!text &&!file) return;
    showToast("Sending...",true);
    const tempHtml=html; const tempFile=file;
    if(editorRef.current) editorRef.current.innerHTML=""; setFile(null); setFilePreview(""); setBoldOn(false); setUlOn(false);
    const tempId=`tmp_${Date.now()}`; const optimistic={note_id:tempId, channel_id:Number(id), created_by_user_id:myId, created_by_name:"You", note_text:tempHtml||text, attachment_available:!!tempFile, attachment_category:tempFile?.type?.startsWith('image/')?'image':'other', attachment_name:tempFile?.name||"", created_at:new Date().toISOString()};
    if(!editingId) setNotes(p=>[...p, optimistic]);
    try{
      const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text', tempHtml||text); if(tempFile) fd.append('attachment', tempFile);
      const url=editingId? `${NOTES_API}/${editingId}` : `${NOTES_API}/${id}/add`; const res=await fetch(url,{method:editingId?'PUT':'POST', headers:getHeaders(), body:fd}); const d=await res.json(); if(!res.ok) throw new Error(d.message);
      if(editingId){ setNotes(p=>p.map(n=> String(n.note_id)===String(editingId)? d.note : n)); setEditingId(null); } else setNotes(p=>p.map(n=> String(n.note_id)===tempId? d.note : n));
      showToast("Sent",true); scrollBottom();
    }catch(e){ if(!editingId) setNotes(p=>p.filter(n=> String(n.note_id)!==tempId)); showToast(e.message); }
  };

  const handleDot=(e,mid)=>{ e.stopPropagation(); if(menuId===mid){ setMenuId(null); return; } const rect=e.currentTarget.getBoundingClientRect(); setMenuUp(window.innerHeight - rect.bottom < 180); setMenuId(mid); };

  const filtered=notes.filter(n=>{
    const txt=(n.note_text||"").replace(/<[^>]*>/g,'').toLowerCase();
    if(q &&!txt.includes(q.toLowerCase()) &&!(n.attachment_name||"").toLowerCase().includes(q.toLowerCase())) return false;
    if(qDate && new Date(n.created_at).toDateString()!==new Date(qDate).toDateString()) return false;
    return true;
  });

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;
  let lastDate="";
  return (
    <div className="chat-shell" onClick={()=>setMenuId(null)}>
      {/* CLEAN PROFESSIONAL NAVBAR */}
      <div className="chat-head">
        <div className="ch-left">
          <button className="back-btn" onClick={()=>navigate("/telegram_logidashboard")}><ArrowLeft size={16}/></button>
          <div className="logo-ring" onClick={(e)=>{e.stopPropagation(); setLogoView(true);}}>
            <img src={resolveImg(channel?.logo_url||channel?.channel_logo_url)||`https://ui-avatars.com/api/?name=${channel?.channel_name}`} className="ch-logo" alt=""/>
          </div>
          <div className="ch-name-box" onClick={()=>navigate(`/channel/${id}/info`)}>
            <div className="ch-name">{channel?.channel_name||"Channel"} {channel?.channel_type==='private' && <LockFill size={11} color="#ef4444"/>}</div>
            <div className="ch-desc">{(channel?.channel_description||"Tap for info • "+channel?.channel_type||"").slice(0,42)}{(channel?.channel_description||"").length>42?"...":""}</div>
          </div>
        </div>
        <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); setSearchOpen(!searchOpen);}}><Search size={15}/></button>
      </div>

      {searchOpen && (
        <div className="search-panel" onClick={e=>e.stopPropagation()}>
          <div className="sp-input"><Search size={11}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search text..." /></div>
          <div className="sp-date"><Calendar size={11}/><input type="date" value={qDate} onChange={e=>setQDate(e.target.value)}/>{qDate && <button onClick={()=>setQDate("")} className="xclear"><XCircleFill size={13}/></button>}</div>
          {(q||qDate) && <button className="sp-clear" onClick={()=>{setQ(""); setQDate("");}}>Clear</button>}
        </div>
      )}

      <div className="msg-wrap" ref={listRef}>
        {filtered.map(note=>{
          const dStr=fmtDate(note.created_at); const showDate=dStr!==lastDate; if(showDate) lastDate=dStr;
          const isMe=String(note.created_by_user_id)===String(myId); const isImg=note.attachment_category==='image'||note.note_type==='image'; const [bg,border]=badgeColor(dStr); const [ubg,uborder]=badgeColor(note.created_by_name||"A"); const imgUrl=attachUrls[note.note_id];
          return (
            <React.Fragment key={note.note_id}>
              {showDate && <div className="date-pill" style={{background:bg,borderColor:border,color:border}}>{dStr}</div>}
              <div className={`msg ${isMe?'me':'other'}`}>
                {!isMe && <div className="avatar" style={{background:ubg,borderColor:uborder,color:uborder}}>{(note.created_by_name||"U")[0].toUpperCase()}</div>}
                <div className="bubble">
                  {!isMe && <span className="uname" style={{background:ubg,color:uborder,border:`1px solid ${uborder}`}}>{note.created_by_name}</span>}
                  {isImg && <div className="img-card" onClick={(e)=>{e.stopPropagation(); imgUrl? viewBig(note.note_id):loadSmall(note.note_id);}}>{imgUrl? <img src={imgUrl} className="img-full" alt=""/> : <div className="tap"><ImgIcon size={16}/><span>Tap to load</span></div>}</div>}
                  {note.note_text && <div className="b-text" dangerouslySetInnerHTML={{__html:note.note_text}}></div>}
                  <div className="b-time">{fmtTime(note.created_at)}</div>
                  <span className="m-dot" onClick={(e)=>handleDot(e,note.note_id)}><ThreeDotsVertical size={9}/></span>
                  {menuId===note.note_id && (
                    <div className={`m-menu ${menuUp?'up':''}`} onClick={e=>e.stopPropagation()}>
                      <button className="opt-copy"><Files size={11}/>Copy</button>
                      {isImg && <><button className="opt-view" onClick={()=>{setMenuId(null); viewBig(note.note_id);}}><Eye size={11}/>View</button><button className="opt-down" onClick={()=>{setMenuId(null); downloadOne(note);}}><Download size={11}/>Download</button></>}
                      {isMe && <><button className="opt-edit" onClick={()=>{setEditingId(note.note_id); setMenuId(null); if(editorRef.current){editorRef.current.innerHTML=note.note_text||""; editorRef.current.focus();}}}><PencilSquare size={11}/>Edit</button><button className="opt-del" onClick={async()=>{ setMenuId(null); await fetch(`${NOTES_API}/${note.note_id}`,{method:'DELETE',headers:getHeaders()}); setNotes(p=>p.filter(x=> String(x.note_id)!==String(note.note_id)));}}><Trash size={11}/>Delete</button></>}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {filePreview && <div className="preview-bar"><img src={filePreview} alt=""/><span>{file?.name}</span><button onClick={()=>{setFile(null);setFilePreview("");}}><XLg size={10}/></button></div>}

      <div className="fmt-bar">
        <button className={`fmt-b bold ${boldOn?'on':''}`} onClick={()=>{setBoldOn(!boldOn); exec('bold');}}><TypeBold size={14}/></button>
        <button className={`fmt-b under ${ulOn?'on':''}`} onClick={()=>{setUlOn(!ulOn); exec('underline');}}><TypeUnderline size={14}/></button>
        <label className="fmt-b pal"><Palette size={14}/><input type="color" hidden onChange={e=>exec('foreColor',e.target.value)}/></label>
        <label className="fmt-b imgbtn"><ImgIcon size={14}/><input ref={imgRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files[0]; if(!f) return; setFile(f); setFilePreview(URL.createObjectURL(f));}}/></label>
        <label className="fmt-b filebtn"><Paperclip size={14}/><input ref={fileRef} type="file" hidden onChange={e=>{const f=e.target.files[0]; if(!f) return; setFile(f); if(f.type.startsWith('image/')) setFilePreview(URL.createObjectURL(f));}}/></label>
      </div>

      <div className="input-area">
        <div className="input-outer">
          <div ref={editorRef} contentEditable suppressContentEditableWarning className="editor" data-placeholder="Enter text..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); sendNote();}}}></div>
          <button className="send-btn" onClick={sendNote}>{editingId?<CheckLg size={15}/>:<SendFill size={13}/>}</button>
        </div>
      </div>

      {imgViewer.open && <div className="viewer" onClick={()=>setImgViewer({open:false,url:""})}><div className="v-box" onClick={e=>e.stopPropagation()}><img src={imgViewer.url} alt=""/><button className="v-close" onClick={()=>setImgViewer({open:false,url:""})}><XLg size={11}/></button></div></div>}
      {logoView && <div className="viewer" onClick={()=>setLogoView(false)}><div className="v-logo-box" onClick={e=>e.stopPropagation()}><img src={resolveImg(channel?.logo_url||channel?.channel_logo_url)} className="v-logo" alt=""/><button className="v-close-logo" onClick={()=>setLogoView(false)}><XLg size={12}/></button></div></div>}
      {toast.show && <div className={`center-toast ${toast.green?'green':''}`}>{toast.msg}</div>}

      <style>{`
.chat-shell{position:fixed;inset:0;display:flex;flex-direction:column;background:#f8fafc}
.chat-head{height:58px;background:#ffffff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.ch-left{display:flex;align-items:center;gap:9px;flex:1;min-width:0}.back-btn{width:34px;height:34px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center}.icon-btn{width:36px;height:36px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center}
.logo-ring{width:42px;height:42px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#e2e8f0,#f1f5f9);border:1px solid #e2e8f0;flex-shrink:0}.ch-logo{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#fff}
.ch-name-box{flex:1;min-width:0;cursor:pointer}.ch-name{font-size:14px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px}.ch-desc{font-size:11px;color:#64748b;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.search-panel{display:flex;gap:6px;padding:8px 10px;background:#fff;border-bottom:1px solid #e2e8f0;align-items:center}.sp-input{flex:1;height:34px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;gap:6px;padding:0 9px;background:#f8fafc}.sp-input input{flex:1;border:none;background:transparent;outline:none;font-size:11px}.sp-date{height:34px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;gap:5px;padding:0 7px;background:#f8fafc}.sp-date input{border:none;background:transparent;outline:none;font-size:11px;width:108px}.xclear{border:none;background:transparent;color:#ef4444;display:flex}.sp-clear{height:34px;padding:0 9px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626;border-radius:10px;font-size:10px;font-weight:700}
.msg-wrap{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
.date-pill{align-self:center;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid}
.msg{display:flex;gap:6px}.msg.me{justify-content:flex-end}.avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;border:1px solid;align-self:flex-end}
.bubble{position:relative;max-width:68%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:5px 22px 14px 8px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.uname{font-size:8px;font-weight:700;padding:1px 5px;border-radius:999px;display:inline-block;margin-bottom:1px}
.img-card{width:auto;max-width:180px;min-width:120px;max-height:160px;border-radius:9px;overflow:hidden;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:2px 0}
.img-full{width:100%;height:auto;max-height:160px;object-fit:contain;display:block}
.tap{display:flex;flex-direction:column;align-items:center;gap:3px;padding:16px;color:#64748b;font-size:10px}
.b-text{font-size:12.5px;line-height:1.3;white-space:pre-wrap;word-break:break-word}
.b-time{position:absolute;right:5px;bottom:1px;font-size:8.5px;color:#94a3b8}
.m-dot{position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:5px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer}
/* COMPACT DROPDOWN - NO BIG SPACE */
.m-menu{position:absolute;right:0;top:22px;background:#fff;border:1px solid #e2e8f0;border-radius:9px;box-shadow:0 6px 18px rgba(0,0,0,.12);z-index:99;min-width:108px;max-width:118px;padding:2px;display:flex;flex-direction:column;gap:0}
.m-menu.up{top:auto;bottom:22px}
.m-menu button{height:24px;border:none;display:flex;align-items:center;gap:5px;padding:0 7px;font-size:10px;font-weight:600;border-radius:6px;cursor:pointer;line-height:1;white-space:nowrap;width:100%;background:#fff;margin:0}
.m-menu button + button{margin-top:1px}
.opt-copy{color:#0f172a}.opt-view{color:#ca8a04;background:#fefce8!important}.opt-down{color:#2563eb;background:#eff6ff!important}.opt-edit{color:#16a34a;background:#f0fdf4!important}.opt-del{color:#dc2626!important;background:#fef2f2!important}
.fmt-bar{display:flex;gap:8px;padding:8px 10px;background:#fff;border-top:1px solid #f1f5f9;justify-content:space-between}
.fmt-b{width:42px;height:42px;border-radius:10px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.fmt-b.bold{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}.fmt-b.under{background:#ede9fe;color:#7c3aed;border-color:#ddd6fe}.fmt-b.pal{background:#fef3c7;color:#d97706;border-color:#fde68a}.fmt-b.imgbtn{background:#f0fdf4;color:#16a34a;border-color:#bbf7d0}.fmt-b.filebtn{background:#ffedd5;color:#ea580c;border-color:#fed7aa}
.fmt-b.on{background:#0f172a!important;color:#fff!important;transform:scale(1.05)}
.input-area{padding:8px 10px;background:#fff;border-top:1px solid #e2e8f0}
.input-outer{display:flex;align-items:flex-end;gap:8px;border:1.5px solid #e2e8f0;border-radius:24px;padding:4px 4px 4px 14px;background:#f8fafc;transition:.15s}
.input-outer:focus-within{border-color:#0f172a;background:#fff;box-shadow:0 0 0 3px rgba(15,23,42,.08)}
.editor{flex:1;min-height:20px;max-height:90px;border:none;outline:none;background:transparent;font-size:13px;padding:8px 0;overflow-y:auto}.editor:empty:before{content:attr(data-placeholder);color:#94a3b8}
.send-btn{width:36px;height:36px;border:none;border-radius:50%;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.18)}
.preview-bar{height:44px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#fff;border-top:1px solid #e2e8f0}.preview-bar img{width:34px;height:34px;border-radius:6px;object-fit:cover}
.viewer{position:fixed;inset:0;background:rgba(15,23,42,.82);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center}
.v-box{position:relative}.v-box img{max-width:88vw;max-height:78vh;border-radius:12px;object-fit:contain}
.v-logo-box{position:relative;width:220px;height:220px}.v-logo{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #fff;background:#fff}
.v-close{position:absolute;top:-10px;right:-10px;width:26px;height:26px;border-radius:50%;border:none;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.v-close-logo{position:absolute;top:-6px;right:-6px;width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center}
.center-toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0f172a;color:#fff;padding:5px 10px;border-radius:6px;font-size:10px;font-weight:700;z-index:99999}
.center-toast.green{background:#16a34a;color:#fff;font-size:10px;padding:4px 10px;border-radius:999px;top:52%}
      `}</style>
    </div>
  );
}