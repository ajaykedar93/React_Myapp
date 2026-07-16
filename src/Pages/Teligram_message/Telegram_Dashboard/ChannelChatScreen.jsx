import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { Search, ThreeDotsVertical, TypeBold, TypeUnderline, Palette, Image as ImgIcon, Paperclip, SendFill, XLg, Calendar, PencilSquare, Trash, Files, Eye, Download, ArrowLeft, CheckLg, LockFill } from 'react-bootstrap-icons';

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
  const [searchOpen,setSearchOpen]=useState(false); const [q,setQ]=useState(""); const [qUser,setQUser]=useState(""); const [qDate,setQDate]=useState("");
  const [file,setFile]=useState(null); const [filePreview,setFilePreview]=useState(""); const [editingId,setEditingId]=useState(null);
  const [menuId,setMenuId]=useState(null); const [menuUp,setMenuUp]=useState(false); const [toast,setToast]=useState({show:false,msg:""});
  const [attachUrls,setAttachUrls]=useState({}); const [imgViewer,setImgViewer]=useState({open:false,url:""}); const [logoView,setLogoView]=useState(false);
  const [boldOn,setBoldOn]=useState(false); const [ulOn,setUlOn]=useState(false);
  const listRef=useRef(null); const editorRef=useRef(null); const fileRef=useRef(null); const imgRef=useRef(null); const myId=getMyId();
  const showToast=(m)=>{ setToast({show:true,msg:m}); setTimeout(()=>setToast({show:false,msg:""}),1800); };
  const scrollBottom=()=> setTimeout(()=> listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:'smooth'}),100);
  const getHeaders=()=>({ Authorization:`Bearer ${getToken()}`, "x-device-id":getDeviceId() });

  const fetchChannel=async()=>{ try{ const r=await fetch(`${CHANNEL_API}/${id}`,{headers:getHeaders()}); const d=await r.json(); setChannel(d.channel||d.data||d); }catch{} };
  const fetchNotes=async()=>{ try{ const r=await fetch(`${NOTES_API}/${id}/all?page=1&limit=10000`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setNotes(d.notes||[]); }catch{} finally{ setLoading(false); } };
  useEffect(()=>{ fetchChannel(); fetchNotes(); },[id]);
  useEffect(()=>{ if(notes.length) scrollBottom(); },[notes]);

  const exec=(cmd,val=null)=>{ editorRef.current?.focus(); document.execCommand(cmd,false,val); };

  // LOAD small in bubble - no viewer
  const loadSmall=async(noteId)=>{
    if(attachUrls[noteId]) return;
    try{
      const r=await fetch(`${NOTES_API}/attachment/${noteId}`,{headers:getHeaders()});
      if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||"Server error"); }
      const blob=await r.blob(); if(blob.size===0) throw new Error("Empty");
      const url=URL.createObjectURL(blob);
      setAttachUrls(p=>({...p,[noteId]:url}));
    }catch(e){ showToast(e.message); }
  };
  // VIEW center
  const viewBig=(noteId)=>{
    const url=attachUrls[noteId];
    if(url) setImgViewer({open:true,url});
    else loadSmall(noteId).then(()=>{ const u=attachUrls[noteId]; if(u) setImgViewer({open:true,url:u}); });
  };

  const downloadOne=async(note)=>{
    try{
      let url=attachUrls[note.note_id];
      if(!url){
        const r=await fetch(`${NOTES_API}/attachment/${note.note_id}`,{headers:getHeaders()}); if(!r.ok) throw new Error();
        const b=await r.blob(); url=URL.createObjectURL(b); setAttachUrls(p=>({...p,[note.note_id]:url}));
      }
      const a=document.createElement('a'); a.href=url; a.download=note.attachment_name||'image.jpg'; a.click();
    }catch{ showToast("Download failed"); }
  };

  const sendNote=async()=>{
    const html=editorRef.current?.innerHTML||""; const text=editorRef.current?.innerText?.trim()||"";
    if(!text &&!file) return;
    const tempHtml=html; const tempFile=file;
    if(editorRef.current) editorRef.current.innerHTML=""; setFile(null); setFilePreview(""); setBoldOn(false); setUlOn(false);
    const tempId=`tmp_${Date.now()}`;
    const optimistic={note_id:tempId, channel_id:Number(id), created_by_user_id:myId, created_by_name:"You", note_text:tempHtml||text, attachment_available:!!tempFile, attachment_category:tempFile?.type?.startsWith('image/')?'image':'other', attachment_name:tempFile?.name||"", created_at:new Date().toISOString(), updated_at:new Date().toISOString()};
    if(!editingId) setNotes(p=>[...p, optimistic]);
    try{
      const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text', tempHtml||text); if(tempFile) fd.append('attachment', tempFile);
      const url=editingId? `${NOTES_API}/${editingId}` : `${NOTES_API}/${id}/add`; const method=editingId? 'PUT':'POST';
      const res=await fetch(url,{method, headers:getHeaders(), body:fd}); const d=await res.json(); if(!res.ok) throw new Error(d.message);
      if(editingId){ setNotes(p=>p.map(n=> String(n.note_id)===String(editingId)? d.note : n)); setEditingId(null); }
      else { setNotes(p=>p.map(n=> String(n.note_id)===tempId? d.note : n)); }
      scrollBottom();
    }catch(e){ if(!editingId) setNotes(p=>p.filter(n=> String(n.note_id)!==tempId)); showToast(e.message); }
  };

  const handleDot=(e,mid)=>{
    e.stopPropagation();
    if(menuId===mid){ setMenuId(null); return; }
    const rect=e.currentTarget.getBoundingClientRect();
    setMenuUp(window.innerHeight - rect.bottom < 180);
    setMenuId(mid);
  };

  const filtered=notes.filter(n=>{
    const txt=(n.note_text||"").replace(/<[^>]*>/g,'').toLowerCase();
    if(q &&!txt.includes(q.toLowerCase())) return false;
    if(qUser &&!String(n.created_by_name||"").toLowerCase().includes(qUser.toLowerCase())) return false;
    if(qDate){ const d1=new Date(n.created_at).toDateString(); const d2=new Date(qDate).toDateString(); if(d1!==d2) return false; }
    return true;
  });

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;
  let lastDate="";
  return (
    <div className="chat-shell">
      <div className="chat-head">
        <div className="ch-left">
          <button className="back-btn" onClick={()=>navigate(-1)}><ArrowLeft size={16}/></button>
          <div className="logo-ring" onClick={()=>setLogoView(true)}><img src={resolveImg(channel?.logo_url||channel?.channel_logo_url)||`https://ui-avatars.com/api/?name=${channel?.channel_name}`} className="ch-logo" alt=""/></div>
          <div className="ch-name-box" onClick={()=>navigate(`/channel/${id}/info`)}>
            <div className="ch-name">{channel?.channel_name} {channel?.channel_type==='private' && <LockFill size={10}/>}</div>
            <div className="ch-sub">Tap for info • {channel?.channel_type}</div>
          </div>
        </div>
        <button className="icon-btn" onClick={()=>setSearchOpen(!searchOpen)}><Search size={14}/></button>
      </div>

      {channel?.channel_description && <div className="desc-card">{channel.channel_description}</div>}
      {searchOpen && <div className="search-panel"><div className="s-grid"><div className="s-item"><Search size={11}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Text"/></div><div className="s-item"><Search size={11}/><input value={qUser} onChange={e=>setQUser(e.target.value)} placeholder="User"/></div><div className="s-item"><Calendar size={11}/><input type="date" value={qDate} onChange={e=>setQDate(e.target.value)}/></div></div></div>}

      <div className="msg-wrap" ref={listRef} onClick={()=>setMenuId(null)}>
        {filtered.map(note=>{
          const dStr=fmtDate(note.created_at); const showDate=dStr!==lastDate; if(showDate) lastDate=dStr;
          const isMe=String(note.created_by_user_id)===String(myId); const isImg=note.attachment_category==='image' || note.note_type==='image'; const [bg,border]=badgeColor(dStr); const [ubg,uborder]=badgeColor(note.created_by_name||"A"); const imgUrl=attachUrls[note.note_id];
          return (
            <React.Fragment key={note.note_id}>
              {showDate && <div className="date-pill" style={{background:bg, borderColor:border, color:border}}>{dStr}</div>}
              <div className={`msg ${isMe?'me':'other'}`}>
                {!isMe && <div className="avatar" style={{background:ubg, borderColor:uborder, color:uborder}}>{(note.created_by_name||"U")[0].toUpperCase()}</div>}
                <div className="bubble">
                  {!isMe && <span className="uname" style={{background:ubg, color:uborder, border:`1px solid ${uborder}`}}>{note.created_by_name}</span>}
                  {isImg && <div className="img-ph" onClick={()=> imgUrl? viewBig(note.note_id) : loadSmall(note.note_id)}>{imgUrl? <img src={imgUrl} alt="" className="b-img"/> : <><ImgIcon size={16}/><span>Tap to load</span></>}</div>}
                  {note.note_text && <div className="b-text" dangerouslySetInnerHTML={{__html:note.note_text}}></div>}
                  {note.attachment_available && note.attachment_category!=='image' && <div className="f-card"><span>{note.attachment_name}</span><button onClick={()=>downloadOne(note)}><Download size={11}/></button></div>}
                  <div className="b-time">{fmtTime(note.created_at)}</div>
                  <span className="m-dot" onClick={(e)=>handleDot(e,note.note_id)}><ThreeDotsVertical size={10}/></span>
                  {menuId===note.note_id && (
                    <div className={`m-menu ${menuUp?'up':''}`}>
                      <button onClick={()=>{navigator.clipboard.writeText((note.note_text||"").replace(/<[^>]*>/g,'')); setMenuId(null); showToast("Copied");}}><Files size={11}/>Copy</button>
                      {isImg && <><button onClick={()=>{setMenuId(null); viewBig(note.note_id);}}><Eye size={11}/>View</button><button onClick={()=>{setMenuId(null); downloadOne(note);}}><Download size={11}/>Download</button></>}
                      {isMe && <>
                        <button onClick={()=>{ setEditingId(note.note_id); setMenuId(null); setTimeout(()=>{ if(editorRef.current){ editorRef.current.innerHTML=note.note_text||""; editorRef.current.focus(); }},100); }}><PencilSquare size={11}/>Edit</button>
                        <label className="m-btn"><ImgIcon size={11}/>Change<input type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); setFilePreview(URL.createObjectURL(f)); setEditingId(note.note_id); setMenuId(null); }}/></label>
                        <button className="del" onClick={async()=>{ setMenuId(null); await fetch(`${NOTES_API}/${note.note_id}`,{method:'DELETE',headers:getHeaders()}); setNotes(p=>p.filter(x=> String(x.note_id)!==String(note.note_id))); showToast("Deleted");}}><Trash size={11}/>Delete</button>
                      </>}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {filePreview && <div className="preview-bar small"><img src={filePreview} alt=""/><span>{file?.name}</span><button onClick={()=>{setFile(null);setFilePreview(""); setEditingId(null);}}><XLg size={10}/></button></div>}

      <div className="fmt-bar">
        <button className={`fmt-b ${boldOn?'active':''}`} onClick={()=>{ setBoldOn(!boldOn); exec('bold'); }}><TypeBold size={14}/></button>
        <button className={`fmt-b ${ulOn?'active':''}`} onClick={()=>{ setUlOn(!ulOn); exec('underline'); }}><TypeUnderline size={14}/></button>
        <label className="fmt-b c"><Palette size={14}/><input type="color" hidden onChange={e=>exec('foreColor', e.target.value)}/></label>
        <label className="fmt-b g"><ImgIcon size={14}/><input ref={imgRef} type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); setFilePreview(URL.createObjectURL(f)); }}/></label>
        <label className="fmt-b o"><Paperclip size={14}/><input ref={fileRef} type="file" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); if(f.type.startsWith('image/')) setFilePreview(URL.createObjectURL(f)); }}/></label>
      </div>

      <div className="input-bar">
        <div ref={editorRef} contentEditable suppressContentEditableWarning className="editor" data-placeholder="Type message..." onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendNote(); }}}></div>
        <button className="send" onClick={sendNote}>{editingId?<CheckLg size={16}/>:<SendFill size={14}/>}</button>
      </div>

      {imgViewer.open && <div className="viewer" onClick={()=>setImgViewer({open:false,url:""})}><div className="v-box" onClick={e=>e.stopPropagation()}><img src={imgViewer.url} alt=""/><button className="v-close" onClick={()=>setImgViewer({open:false,url:""})}><XLg size={12}/></button></div></div>}
      {logoView && <div className="viewer" onClick={()=>setLogoView(false)}><div className="v-box" onClick={e=>e.stopPropagation()}><img src={resolveImg(channel?.logo_url||channel?.channel_logo_url)} alt="" style={{width:200,height:200,borderRadius:'50%',border:'3px solid #fff'}}/><button className="v-close" onClick={()=>setLogoView(false)}><XLg size={12}/></button></div></div>}
      {toast.show && <div className="center-toast">{toast.msg}</div>}

      <style>{`
:root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px)}
.chat-shell{position:fixed;inset:0;display:flex;flex-direction:column;background:#f5f7fb;overflow:hidden;padding-top:var(--sat)}
.chat-head{position:relative;height:60px;flex-shrink:0;background:linear-gradient(90deg,#fff7ed,#fef2f2);border-bottom:3px solid transparent;border-image:linear-gradient(90deg,#ef4444,#f97316) 1;display:flex;align-items:center;justify-content:space-between;padding:0 10px;z-index:20;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.ch-left{display:flex;align-items:center;gap:8px;flex:1;min-width:0}.back-btn{width:34px;height:34px;border:none;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center}.logo-ring{width:42px;height:42px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center}.ch-logo{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #fff}
.ch-name-box{flex:1;min-width:0;cursor:pointer}.ch-name{font-size:14px;font-weight:900;background:linear-gradient(90deg,#0f172a,#dc2626);-webkit-background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch-sub{font-size:10px;color:#9a3412;font-weight:600}
.icon-btn{width:36px;height:36px;border:none;border-radius:11px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.desc-card{flex-shrink:0;background:#fff;border-bottom:1px solid #fee2e2;padding:8px 14px;font-size:11px;color:#7f1d1d;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.search-panel{flex-shrink:0;background:#fff;border-bottom:1px solid #fee2e2;padding:10px}
.s-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}.s-item{height:32px;border:1px solid #fecaca;border-radius:8px;padding:0 8px;display:flex;align-items:center;gap:6px;background:#fff7ed}.s-item input{flex:1;border:none;background:transparent;outline:none;font-size:11px;min-width:0}
.msg-wrap{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
.date-pill{align-self:center;border-radius:999px;padding:6px 16px;font-size:11px;font-weight:900;border:1px solid}
.msg{display:flex;gap:6px;max-width:100%}.msg.me{justify-content:flex-end}.msg.other{justify-content:flex-start}.avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;align-self:flex-end;border:1px solid}
.bubble{position:relative;max-width:78%;background:#fff;border:1px solid #fee2e2;border-radius:18px;padding:8px 28px 18px 10px;box-shadow:0 2px 8px rgba(0,0,0,.04);word-break:break-word;min-width:70px}.msg.me.bubble{background:linear-gradient(135deg,#ffedd5,#fed7aa);border-color:#fdba74}
.uname{font-size:9px;font-weight:800;padding:1px 6px;border-radius:999px;margin-bottom:2px;display:inline-block}
.img-ph{width:170px;height:110px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:#9a3412;font-size:10px;margin:3px 0 2px 0;overflow:hidden}.b-img{width:100%;height:100%;object-fit:cover;display:block}
.b-text{font-size:13.5px;line-height:1.35;white-space:pre-wrap;word-break:break-word;margin-top:2px}
.f-card{display:flex;align-items:center;gap:6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:5px 7px;font-size:11px;margin-top:2px}
.b-time{position:absolute;right:8px;bottom:2px;font-size:9px;color:#7c2d12;font-weight:700}
.m-dot{position:absolute;top:4px;right:4px;width:18px;height:18px;border-radius:6px;background:#fff;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;cursor:pointer}
.m-menu{position:absolute;right:0;top:22px;background:#fff;border:1px solid #fee2e2;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.14);z-index:999;min-width:124px;padding:3px;display:flex;flex-direction:column;gap:0px}
.m-menu.up{top:auto;bottom:22px}
.m-menu button,.m-btn{height:26px;border:none;background:#fff;display:flex;align-items:center;gap:7px;padding:0 9px;font-size:11px;font-weight:600;border-radius:6px;cursor:pointer;line-height:1}
.m-menu button:hover,.m-btn:hover{background:#fff7ed}
.m-menu button.del{color:#dc2626;background:#fef2f2}
.preview-bar.small{height:48px;background:#fff;border-top:1px solid #fee2e2;display:flex;align-items:center;gap:8px;padding:0 10px;flex-shrink:0}.preview-bar.small img{width:36px;height:36px;border-radius:6px;object-fit:cover}
.fmt-bar{flex-shrink:0;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:8px 10px;background:#fff;border-top:1px solid #fee2e2}
.fmt-b{width:100%;height:38px;border-radius:10px;border:1px solid #fecaca;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.fmt-b.active{background:#dc2626!important;color:#fff!important;border-color:#dc2626!important}
.input-bar{flex-shrink:0;display:flex;gap:8px;align-items:flex-end;padding:8px 10px;background:#fff;border-top:1px solid #fee2e2;padding-bottom:calc(10px + var(--sab))}
.editor{flex:1;min-height:38px;max-height:110px;border:1px solid #fecaca;border-radius:18px;padding:8px 12px;font-size:13px;overflow-y:auto;outline:none;background:#fff7ed}.editor:empty:before{content:attr(data-placeholder);color:#9ca3af}.editor:focus{background:#fff;border-color:#f97316}
.send{width:42px;height:42px;border:none;border-radius:50%;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.viewer{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px}
.v-box{position:relative}.v-box img{max-width:88vw;max-height:78vh;border-radius:12px;display:block}.v-close{position:absolute;top:-10px;right:-10px;width:26px;height:26px;border-radius:50%;border:none;background:#fff;color:#000;display:flex;align-items:center;justify-content:center}
.center-toast{position:fixed;top:calc(70px + var(--sat));left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:7px 12px;border-radius:999px;font-size:11px;font-weight:700;z-index:9999}
      `}</style>
    </div>
  );
}