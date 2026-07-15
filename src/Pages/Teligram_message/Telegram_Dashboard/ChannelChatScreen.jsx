import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { Search, ThreeDotsVertical, TypeBold, TypeUnderline, Palette, Image as ImgIcon, Paperclip, SendFill, XLg, Calendar, PencilSquare, Trash, Files, Eye, Download, FileEarmarkPdf, FileEarmarkExcel, FileEarmarkWord, FileZip, FileEarmark, ArrowLeft, CheckLg } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const NOTES_API = `${API_BASE}/api/telegramlogin-notes`;
const CHANNEL_API = `${API_BASE}/api/telegramlogin-channels`;
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getMyId = ()=>{ try{ const t=getToken(); const p=JSON.parse(atob(t.split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{ return 0; } };
const resolveImg = (u)=>{ if(!u) return ""; if(u.startsWith("data:")||u.startsWith("http")||u.startsWith("blob:")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const fmtTime12 = (iso)=> new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});
const fmtDateBadge = (iso)=>{ const d=new Date(iso); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}); };
const parseNote = (raw)=>{ try{ const o=JSON.parse(raw); if(o && typeof o.t==='string') return {text:o.t, bold:!!o.b, underline:!!o.u, color:o.c||"#0f172a"}; }catch{} return {text:raw||"", bold:false, underline:false, color:"#0f172a"}; };
const getDateColor = (str)=>{ const cols=[["#eff6ff","#3b82f6"],["#f0fdf4","#16a34a"],["#fef3c7","#d97706"],["#fce7f3","#db2777"],["#ede9fe","#7c3aed"],["#ffedd5","#ea580c"]]; let h=0; for(let i=0;i<str.length;i++) h=str.charCodeAt(i)+((h<<5)-h); return cols[Math.abs(h)%cols.length]; };

export default function ChannelChatScreen(){
  const { id } = useParams(); const navigate=useNavigate();
  const [channel,setChannel]=useState(null); const [notes,setNotes]=useState([]); const [loading,setLoading]=useState(true);
  const [searchOpen,setSearchOpen]=useState(false); const [q,setQ]=useState(""); const [qUser,setQUser]=useState(""); const [qDate,setQDate]=useState("");
  const [input,setInput]=useState(""); const [bold,setBold]=useState(false); const [underline,setUnderline]=useState(false); const [color,setColor]=useState("#0f172a");
  const [file,setFile]=useState(null); const [filePreview,setFilePreview]=useState(""); const [editingId,setEditingId]=useState(null); const [menuId,setMenuId]=useState(null); const [menuUp,setMenuUp]=useState(false); const [toast,setToast]=useState({show:false,msg:""});
  const [attachUrls,setAttachUrls]=useState({});
  const listRef=useRef(null); const inputRef=useRef(null); const fileRef=useRef(null); const imgRef=useRef(null); const myId=getMyId();
  const showToast=(m)=>{ setToast({show:true,msg:m}); setTimeout(()=>setToast({show:false,msg:""}),1800); };
  const scrollBottom=()=> setTimeout(()=> listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:'smooth'}),100);
  const getHeaders=()=>({ Authorization:`Bearer ${getToken()}`, "x-device-id":getDeviceId() });

  const fetchChannel = async()=>{ try{ const r=await fetch(`${CHANNEL_API}/${id}`,{headers:getHeaders()}); const d=await r.json(); setChannel(d.channel||d.data||d); }catch{} };
  const fetchNotes = async()=>{ try{ const r=await fetch(`${NOTES_API}/${id}/all?page=1&limit=100`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setNotes(d.notes||[]); }catch{} finally{ setLoading(false); } };

  useEffect(()=>{ fetchChannel(); fetchNotes(); const iv=setInterval(fetchNotes,3000); return()=>clearInterval(iv); },[id]);
  useEffect(()=>{ scrollBottom(); },[notes]);
  useEffect(()=>{ if(inputRef.current){ inputRef.current.style.height='40px'; const h=Math.min(inputRef.current.scrollHeight, 130); inputRef.current.style.height=h+'px'; } },[input]);

  // Load attachments with auth as blob
  useEffect(()=>{
    const load = async()=>{
      for(const n of notes){
        if(n.attachment_available &&!attachUrls[n.note_id]){
          try{
            const r=await fetch(`${NOTES_API}/attachment/${n.note_id}`,{headers:getHeaders()});
            if(r.ok){ const blob=await r.blob(); const url=URL.createObjectURL(blob); setAttachUrls(p=>({...p,[n.note_id]:url})); }
          }catch{}
        }
      }
    }; load();
  },[notes]);

  const compress = async(f)=>{
    if(!f.type.startsWith('image/') || f.size <= 5*1024*1024) return f;
    const url=URL.createObjectURL(f); const img=new Image(); img.src=url; await new Promise(r=>img.onload=r);
    const c=document.createElement('canvas'); const MAX=1280; let w=img.width,h=img.height; if(w>MAX||h>MAX){ if(w>h){ h*=MAX/w; w=MAX; } else { w*=MAX/h; h=MAX; } } c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.7)); return new File([blob], f.name, {type:'image/jpeg'});
  };

  const sendNote = async()=>{
    if(!input.trim() &&!file){ showToast("Add text or file"); return; }
    const fd=new FormData(); fd.append('device_id',getDeviceId());
    const dataObj={t:input, b:bold, u:underline, c:color};
    fd.append('note_text', JSON.stringify(dataObj));
    if(file){ const finalFile=await compress(file); fd.append('attachment', finalFile); }
    try{
      let url, method; if(editingId){ url=`${NOTES_API}/${editingId}`; method='PUT'; } else { url=`${NOTES_API}/${id}/add`; method='POST'; }
      const res=await fetch(url,{method, headers:getHeaders(), body:fd}); const d=await res.json(); if(!res.ok) throw new Error(d.message||'Failed');
      if(editingId){ setNotes(p=>p.map(n=> n.note_id===editingId? d.note : n)); setEditingId(null); showToast("Edited"); }
      else { setNotes(p=>[...p, d.note]); showToast("Message Sent Successfully"); }
      setInput(""); setFile(null); setFilePreview(""); setBold(false); setUnderline(false); scrollBottom();
    }catch(e){ showToast(e.message); }
  };

  const deleteNote = async(noteId)=>{ try{ const r=await fetch(`${NOTES_API}/${noteId}`,{method:'DELETE', headers:getHeaders()}); const d=await r.json(); if(!r.ok) throw new Error(d.message); setNotes(p=>p.filter(n=> n.note_id!==noteId)); showToast("Deleted"); setMenuId(null); }catch(e){ showToast(e.message); } };

  const downloadAttach = async(note)=>{
    try{
      const r=await fetch(`${NOTES_API}/attachment/${note.note_id}`,{headers:getHeaders()});
      if(!r.ok) throw new Error("Failed"); const blob=await r.blob(); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=note.attachment_name||'file'; a.click(); URL.revokeObjectURL(url);
    }catch(e){ showToast(e.message); }
  };

  const handleDot = (e,mid)=>{ e.stopPropagation(); if(menuId===mid){ setMenuId(null); return; } const rect=e.currentTarget.getBoundingClientRect(); setMenuUp(window.innerHeight-rect.bottom < 160); setMenuId(mid); };

  const filtered = notes.filter(n=>{
    const {text}=parseNote(n.note_text||""); if(q &&!text.toLowerCase().includes(q.toLowerCase())) return false;
    if(qUser &&!String(n.created_by_name||"").toLowerCase().includes(qUser.toLowerCase())) return false;
    if(qDate && new Date(n.created_at).toDateString()!==new Date(qDate).toDateString()) return false;
    return true;
  });

  const getFileIcon = (cat,name="")=>{ const n=(name||"").toLowerCase(); if(cat==='pdf'||n.endsWith('.pdf')) return <FileEarmarkPdf color="#ef4444" size={14}/>; if(cat==='excel'||n.includes('.xls')) return <FileEarmarkExcel color="#16a34a" size={14}/>; if(cat==='word'||n.includes('.doc')) return <FileEarmarkWord color="#2563eb" size={14}/>; if(n.includes('.zip')) return <FileZip color="#ca8a04" size={14}/>; if(cat==='image') return <ImgIcon color="#0ea5e9" size={14}/>; return <FileEarmark color="#64748b" size={14}/>; };

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;

  let lastDate="";
  return (
    <div className="chat-shell">
      {/* PROFESSIONAL HEADER - FRESH COLORS */}
      <div className="chat-head">
        <div className="ch-left">
          <button className="back-btn" onClick={()=>navigate(-1)}><ArrowLeft size={16}/></button>
          <div className="logo-ring" onClick={()=>navigate(`/channel/${id}/info`)}>
            <img src={resolveImg(channel?.logo_url||channel?.channel_logo_url)||`https://ui-avatars.com/api/?name=${channel?.channel_name}`} className="ch-logo" alt=""/>
          </div>
          <div className="ch-name-box" onClick={()=>navigate(`/channel/${id}/info`)}>
            <div className="ch-name">{channel?.channel_name}</div>
            <div className="ch-sub">{channel?.channel_type} • Tap for info</div>
          </div>
        </div>
        <button className="icon-btn search-btn" onClick={()=>setSearchOpen(!searchOpen)}><Search size={14}/></button>
      </div>

      {searchOpen && <div className="search-panel">
        <div className="s-title">Search Messages <button className="s-close" onClick={()=>setSearchOpen(false)}><XLg size={12}/></button></div>
        <div className="s-grid">
          <div className="s-item"><Search size={10}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Text"/></div>
          <div className="s-item"><Search size={10}/><input value={qUser} onChange={e=>setQUser(e.target.value)} placeholder="Username"/></div>
          <div className="s-item"><Calendar size={10}/><input type="date" value={qDate} onChange={e=>setQDate(e.target.value)}/></div>
        </div>
        {(q||qUser||qDate) && <button className="clear-all" onClick={()=>{setQ("");setQUser("");setQDate("");}}>Clear Filters</button>}
      </div>}

      <div className="msg-wrap" ref={listRef} onClick={()=>setMenuId(null)}>
        {filtered.map(note=>{
          const dStr=fmtDateBadge(note.created_at); const showDate=dStr!==lastDate; if(showDate) lastDate=dStr;
          const isMe=String(note.created_by_user_id)===String(myId);
          const {text, bold: b, underline: u, color: c} = parseNote(note.note_text||"");
          const isImg=note.attachment_category==='image' || note.note_type==='image';
          const isFile=note.attachment_available && note.attachment_category!=='image';
          const [bg,border]=getDateColor(dStr);
          const imgUrl=attachUrls[note.note_id];
          return (
            <React.Fragment key={note.note_id}>
              {showDate && <div className="date-pill" style={{background:bg, borderColor:border, color:border}}>{dStr}</div>}
              <div className={`msg ${isMe?'me':'other'}`}>
                <div className="bubble">
                  {!isMe && <span className="uname">{note.created_by_name}</span>}
                  {isImg && (imgUrl? <img src={imgUrl} alt="" className="b-img" onClick={()=>window.open(imgUrl)} /> : <div className="b-img loading">Loading image...</div>)}
                  {isFile && <div className="f-card">{getFileIcon(note.attachment_category, note.attachment_name)}<span className="f-name">{note.attachment_name||'File'}</span><span className="f-size">{note.attachment_size? `${(note.attachment_size/1024).toFixed(0)} KB`:''}</span></div>}
                  {text && <div className="b-text" style={{fontWeight:b?700:400, textDecoration:u?'underline':'none', color:c}}>{text} {note.updated_at!==note.created_at && <i className="edited">Edited</i>}</div>}
                  <div className="b-time">{fmtTime12(note.created_at)}</div>
                  <span className="m-dot" onClick={(e)=>handleDot(e,note.note_id)}><ThreeDotsVertical size={10}/></span>
                  {menuId===note.note_id && <div className={`m-menu ${menuUp?'up':''}`}>
                    <button onClick={()=>{navigator.clipboard.writeText(text); showToast("Copied");}}><Files size={10}/> Copy</button>
                    {isImg && <><button onClick={()=>imgUrl && window.open(imgUrl)}><Eye size={10}/> View</button><button onClick={()=>downloadAttach(note)}><Download size={10}/> Download</button></>}
                    {isFile && <><button onClick={()=>downloadAttach(note)}><Eye size={10}/> Open</button><button onClick={()=>downloadAttach(note)}><Download size={10}/> Download</button></>}
                    {isMe && <><button onClick={()=>{setEditingId(note.note_id); const p=parseNote(note.note_text); setInput(p.text); setBold(p.bold); setUnderline(p.underline); setColor(p.color);}}><PencilSquare size={10}/> Edit</button><button className="del" onClick={()=>deleteNote(note.note_id)}><Trash size={10}/> Delete</button></>}
                  </div>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {filePreview && <div className="preview-bar"><img src={filePreview} alt=""/><span>{file?.name} {file?.size>5*1024*1024 && '(compressing)'}</span><button onClick={()=>{setFile(null);setFilePreview("");}}><XLg size={10}/></button></div>}

      {/* ONE ROW - SAME SIZE - COLORFUL */}
      <div className="fmt-bar">
        <button className={`fmt-b ${bold?'active':''}`} onClick={()=>setBold(!bold)}><TypeBold size={13}/></button>
        <button className={`fmt-b ${underline?'active':''}`} onClick={()=>setUnderline(!underline)}><TypeUnderline size={13}/></button>
        <label className="fmt-b color-b"><Palette size={13}/><input type="color" value={color} onChange={e=>setColor(e.target.value)} hidden/></label>
        <label className="fmt-b img-b"><ImgIcon size={13}/><input ref={imgRef} type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); setFilePreview(URL.createObjectURL(f)); }}/></label>
        <label className="fmt-b file-b"><Paperclip size={13}/><input ref={fileRef} type="file" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); if(f.type.startsWith('image/')) setFilePreview(URL.createObjectURL(f)); }}/></label>
      </div>

      <div className="input-bar">
        <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder={editingId?"Edit message...":"Type message..."} rows={1} style={{fontWeight:bold?700:400, textDecoration:underline?'underline':'none', color}}/>
        <button className="send" onClick={sendNote}>{editingId?<CheckLg size={16}/>:<SendFill size={15}/>}</button>
      </div>

      {toast.show && <div className="center-toast">{toast.msg}</div>}

      <style>{`
    :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px)}
  .chat-shell{position:fixed;inset:0;top:0;padding-top:calc(var(--sat) + 0px);display:flex;flex-direction:column;background:linear-gradient(180deg,#f8fafc,#eef2f7);overflow:hidden}
  .chat-head{position:fixed;top:var(--sat);left:0;right:0;height:58px;background:linear-gradient(90deg,#ffffff,#f8fbff);backdrop-filter:blur(16px);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;z-index:100;box-shadow:0 2px 12px rgba(15,23,42,.06)}
  .ch-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1}.back-btn{width:32px;height:32px;border:none;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#334155}.logo-ring{width:40px;height:40px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);display:flex;align-items:center;justify-content:center;flex-shrink:0}.ch-logo{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #fff;background:#fff}.ch-name-box{min-width:0;cursor:pointer;flex:1}.ch-name{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;color:#0f172a}.ch-sub{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .icon-btn{width:36px;height:36px;border:none;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.search-btn{background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#2563eb;border:1px solid #bfdbfe}
  .search-panel{position:fixed;top:calc(58px + var(--sat));left:0;right:0;background:#fff;border-bottom:1px solid #e2e8f0;padding:12px;z-index:99;animation:pop.18s ease;box-shadow:0 8px 20px rgba(0,0,0,.06)}.s-title{font-size:11px;font-weight:800;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;color:#334155}.s-close{width:22px;height:22px;border:1px solid #e2e8f0;border-radius:6px;background:#fff}.s-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}.s-item{height:34px;border:1px solid #e2e8f0;border-radius:10px;padding:0 8px;display:flex;align-items:center;gap:6px;background:#f8fafc}.s-item input{flex:1;border:none;background:transparent;outline:none;font-size:11px;min-width:0}.clear-all{margin-top:8px;height:28px;padding:0 12px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626;border-radius:8px;font-size:10px;font-weight:700}
  .msg-wrap{flex:1;overflow-y:auto;padding:74px 10px 6px 10px;margin-top:calc(58px + var(--sat));display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
  .date-pill{align-self:center;border-radius:999px;padding:4px 14px;font-size:11px;font-weight:800;margin:10px 0;box-shadow:0 2px 6px rgba(0,0,0,.06);border:1px solid}
  .msg{display:flex;max-width:100%}.msg.me{justify-content:flex-end}.msg.other{justify-content:flex-start}
  .bubble{position:relative;max-width:78%;background:#fff;border:1px solid #e9eef5;border-radius:18px;padding:10px 34px 22px 12px;box-shadow:0 2px 8px rgba(15,23,42,.04);word-break:break-word;min-width:90px}
  .msg.me.bubble{background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac}
  .uname{font-size:9px;font-weight:800;color:#2563eb;background:#eff6ff;padding:1px 6px;border-radius:999px;margin-bottom:4px;display:inline-block}
  .b-img{max-width:100%;width:220px;max-height:240px;border-radius:12px;object-fit:cover;cursor:pointer;margin:4px 0;display:block;border:1px solid #e2e8f0;background:#f1f5f9}.b-img.loading{display:flex;align-items:center;justify-content:center;height:120px;font-size:11px;color:#64748b}
  .f-card{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:11px;margin:4px 0;max-width:100%}.f-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;font-weight:600}.f-size{font-size:9px;color:#64748b}
  .b-text{font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
  .b-time{position:absolute;right:12px;bottom:4px;font-size:10px;color:#475569;font-weight:600}
  .edited{font-size:8px;color:#64748b;margin-left:6px;font-weight:600}
  .m-dot{position:absolute;top:6px;right:8px;width:18px;height:18px;border-radius:7px;background:rgba(255,255,255,.9);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .m-menu{position:absolute;right:0;top:26px;background:#fff;border:1px solid #e8eef7;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,.16);z-index:9999;min-width:130px;padding:3px;display:flex;flex-direction:column;gap:1px;animation:pop.14s ease}.m-menu.up{top:auto;bottom:26px}
  .m-menu button{height:26px;border:none;background:#fff;display:flex;align-items:center;gap:6px;padding:0 10px;font-size:10.5px;font-weight:600;border-radius:7px;text-align:left}.m-menu button:hover{background:#f8fafc}.m-menu button.del{color:#dc2626;background:#fff1f2}
  .preview-bar{height:48px;background:#fff;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;padding:0 10px;flex-shrink:0}.preview-bar img{width:34px;height:34px;border-radius:7px;object-fit:cover;border:1px solid #e2e8f0}.preview-bar span{flex:1;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-bar button{width:24px;height:24px;border:1px solid #e2e8f0;border-radius:6px;background:#fff}
  .fmt-bar{height:42px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:6px;align-items:center;padding:0 10px;flex-shrink:0;overflow:hidden;justify-content:space-between}
  .fmt-b{width:36px;height:32px;border:1px solid #e2e8f0;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.15s;cursor:pointer;background:#fff}.fmt-b:active{transform:scale(.9)}.fmt-b.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
  .fmt-b:nth-child(1){color:#0f172a}.fmt-b:nth-child(2){color:#2563eb}.color-b{background:#fdf2f8!important;color:#db2777!important;border-color:#fbcfe8!important}.img-b{background:#f0fdf4!important;color:#16a34a!important;border-color:#bbf7d0!important}.file-b{background:#fff7ed!important;color:#ea580c!important;border-color:#fed7aa!important}
  .input-bar{display:flex;gap:8px;align-items:flex-end;padding:8px 10px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0;padding-bottom:calc(10px + var(--sab))}
  .input-bar textarea{flex:1;min-height:40px;max-height:130px;border:1px solid #e2e8f0;border-radius:20px;padding:10px 14px;font-size:13.5px;resize:none;outline:none;line-height:1.4;background:#f8fafc}
  .input-bar textarea:focus{border-color:#0ea5e9;background:#fff;box-shadow:0 0 0 3px rgba(14,165,233,.12)}
  .send{width:42px;height:42px;border:none;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 14px rgba(37,99,235,.28);transition:.15s}.send:active{transform:scale(.92)}
  .center-toast{position:fixed;top:calc(70px + var(--sat));left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:8px 16px;border-radius:999px;font-size:11px;font-weight:800;z-index:99999;box-shadow:0 10px 24px rgba(0,0,0,.2)}
    @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media(max-width:480px){.bubble{max-width:86%}.b-img{width:200px}.s-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}