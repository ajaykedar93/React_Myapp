import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { Search, ThreeDotsVertical, TypeBold, TypeUnderline, Palette, Image as ImgIcon, Paperclip, SendFill, XLg, Calendar, PencilSquare, Trash, Files, Eye, Download, FileEarmarkPdf, FileEarmarkExcel, FileEarmarkWord, FileZip, FileEarmark, CheckLg } from 'react-bootstrap-icons';

const API_BASE = (import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com").replace(/\/$/, "");
const NOTES_API = `${API_BASE}/api/telegramlogin-notes`;
const CHANNEL_API = `${API_BASE}/api/telegramlogin-channels`;
const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}`; localStorage.setItem("telegram_device_id",id);} return id; };
const getMyId = ()=>{ try{ const t=getToken(); const p=JSON.parse(atob(t.split('.')[1])); return Number(p.telegram_user_id||p.id||0);}catch{ return 0; } };
const resolveImg = (u)=>{ if(!u) return ""; if(u.startsWith("data:")||u.startsWith("http")||u.startsWith("blob:")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const fmtTime12 = (iso)=> new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});
const fmtDateBadge = (iso)=>{ const d=new Date(iso); const td=new Date(); const yd=new Date(); yd.setDate(td.getDate()-1); if(d.toDateString()===td.toDateString()) return "Today"; if(d.toDateString()===yd.toDateString()) return "Yesterday"; return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}); };
const getDateColor = (str)=>{ const colors=["#eff6ff,#bfdbfe","#f0fdf4,#bbf7d0","#fef3c7,#fde68a","#fce7f3,#fbcfe8","#ede9fe,#ddd6fe"]; let h=0; for(let i=0;i<str.length;i++) h=str.charCodeAt(i)+((h<<5)-h); return colors[Math.abs(h)%colors.length]; };

export default function ChannelChatScreen(){
  const { id } = useParams(); const navigate=useNavigate();
  const [channel,setChannel]=useState(null); const [notes,setNotes]=useState([]); const [loading,setLoading]=useState(true);
  const [searchOpen,setSearchOpen]=useState(false); const [q,setQ]=useState(""); const [qUser,setQUser]=useState(""); const [qDate,setQDate]=useState("");
  const [typing,setTyping]=useState([]); const [input,setInput]=useState(""); const [bold,setBold]=useState(false); const [underline,setUnderline]=useState(false); const [color,setColor]=useState("#0f172a");
  const [file,setFile]=useState(null); const [filePreview,setFilePreview]=useState(""); const [editingId,setEditingId]=useState(null); const [menuId,setMenuId]=useState(null); const [menuUp,setMenuUp]=useState(false); const [toast,setToast]=useState({show:false,msg:""});
  const listRef=useRef(null); const inputRef=useRef(null); const fileRef=useRef(null); const imgRef=useRef(null); const myId=getMyId();
  const showToast=(m)=>{ setToast({show:true,msg:m}); setTimeout(()=>setToast({show:false,msg:""}),1800); };
  const scrollBottom=()=> setTimeout(()=> listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:'smooth'}),100);
  const getHeaders=()=>({ Authorization:`Bearer ${getToken()}`, "x-device-id":getDeviceId() });

  const fetchChannel = async()=>{ try{ const r=await fetch(`${CHANNEL_API}/${id}`,{headers:getHeaders()}); const d=await r.json(); setChannel(d.channel||d.data||d); }catch{} };
  const fetchNotes = async()=>{ try{ const r=await fetch(`${NOTES_API}/${id}/all?page=1&limit=100`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setNotes(d.notes||[]); }catch{} finally{ setLoading(false); } };

  useEffect(()=>{ fetchChannel(); fetchNotes(); const iv=setInterval(fetchNotes,3000); return()=>clearInterval(iv); },[id]);
  useEffect(()=>{ scrollBottom(); },[notes]);

  // WhatsApp like 5-6 lines auto expand
  useEffect(()=>{ if(inputRef.current){ inputRef.current.style.height='38px'; const h=Math.min(inputRef.current.scrollHeight, 130); inputRef.current.style.height=h+'px'; } },[input]);

  const compress = async(f)=>{
    if(!f.type.startsWith('image/') || f.size <= 5*1024*1024) return f;
    const url=URL.createObjectURL(f); const img=new Image(); img.src=url; await new Promise(r=>img.onload=r);
    const c=document.createElement('canvas'); const MAX=1280; let w=img.width,h=img.height; if(w>MAX||h>MAX){ if(w>h){ h*=MAX/w; w=MAX; } else { w*=MAX/h; h=MAX; } } c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.7)); return new File([blob], f.name, {type:'image/jpeg'});
  };

  const handleTyping = (e)=>{ setInput(e.target.value); if(e.target.value.trim()){ const uname=JSON.parse(localStorage.getItem('telegram_user_details')||'{}')?.full_name||'User'; setTyping([uname]); setTimeout(()=>setTyping([]),1500); } };

  const sendNote = async()=>{
    if(!input.trim() &&!file){ showToast("Add text or file"); return; }
    const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text', input);
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

  const handleDot = (e,mid)=>{ e.stopPropagation(); if(menuId===mid){ setMenuId(null); return; } const rect=e.currentTarget.getBoundingClientRect(); setMenuUp(window.innerHeight-rect.bottom < 180); setMenuId(mid); };

  const filtered = notes.filter(n=>{
    const txt=(n.note_text||"").toLowerCase(); if(q &&!txt.includes(q.toLowerCase())) return false;
    if(qUser &&!String(n.created_by_name||"").toLowerCase().includes(qUser.toLowerCase())) return false;
    if(qDate && new Date(n.created_at).toDateString()!==new Date(qDate).toDateString()) return false;
    return true;
  });

  const getFileIcon = (cat,name="")=>{ const n=(name||"").toLowerCase(); if(cat==='pdf'||n.endsWith('.pdf')) return <FileEarmarkPdf color="#ef4444" size={16}/>; if(cat==='excel'||n.includes('.xls')) return <FileEarmarkExcel color="#16a34a" size={16}/>; if(cat==='word'||n.includes('.doc')) return <FileEarmarkWord color="#2563eb" size={16}/>; if(n.includes('.zip')) return <FileZip color="#ca8a04" size={16}/>; if(cat==='image') return <ImgIcon color="#0ea5e9" size={16}/>; return <FileEarmark color="#64748b" size={16}/>; };

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;

  let lastDate="";
  return (
    <div className="chat-shell">
      {/* FIXED NAVBAR - NOT SCROLL */}
      <div className="chat-head">
        <div className="ch-left" onClick={()=>navigate(`/channel/${id}/info`)}>
          <img src={resolveImg(channel?.logo_url||channel?.channel_logo_url)||`https://ui-avatars.com/api/?name=${channel?.channel_name}`} className="ch-logo" alt=""/>
          <div className="ch-name-box"><div className="ch-name">{channel?.channel_name}</div><div className="ch-sub">Tap for info • {channel?.channel_type}</div></div>
        </div>
        <button className="icon-btn" onClick={()=>setSearchOpen(!searchOpen)}><Search size={14}/></button>
      </div>

      {searchOpen && <div className="search-panel"><div className="s-row"><Search size={11}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Text"/><input value={qUser} onChange={e=>setQUser(e.target.value)} placeholder="Username"/><div className="date-wrap"><Calendar size={11}/><input type="date" value={qDate} onChange={e=>setQDate(e.target.value)}/></div><button onClick={()=>{setQ("");setQUser("");setQDate("");}} className="clear-s"><XLg size={10}/></button></div></div>}

      {typing.length>0 && <div className="typing-strip">{typing.join(', ')} is typing...</div>}

      {/* ONLY CHAT SCROLL */}
      <div className="msg-wrap" ref={listRef} onClick={()=>setMenuId(null)}>
        {filtered.map(note=>{
          const dStr=fmtDateBadge(note.created_at); const showDate=dStr!==lastDate; if(showDate) lastDate=dStr;
          const isMe=String(note.created_by_user_id)===String(myId);
          const isImg=note.attachment_category==='image' || note.note_type==='image';
          const isFile=note.attachment_available && note.attachment_category!=='image';
          const dateColor=getDateColor(dStr).split(',');
          return (
            <React.Fragment key={note.note_id}>
              {showDate && <div className="date-pill" style={{background:dateColor[0], borderColor:dateColor[1]}}>{dStr}</div>}
              <div className={`msg ${isMe?'me':'other'}`}>
                <div className="bubble">
                  {!isMe && <span className="uname">{note.created_by_name}</span>}
                  {isImg && <img src={`${NOTES_API}/attachment/${note.note_id}`} alt="" className="b-img" onClick={()=>window.open(`${NOTES_API}/attachment/${note.note_id}`)} />}
                  {isFile && <div className="f-card">{getFileIcon(note.attachment_category, note.attachment_name)}<span className="f-name">{note.attachment_name||'File'}</span><span className="f-size">{note.attachment_size? `${(note.attachment_size/1024).toFixed(1)} KB`:''}</span></div>}
                  {note.note_text && <div className="b-text" style={{fontWeight:bold||note.note_text.includes('**')?700:400, textDecoration:underline?'underline':'none', color:color}}>{note.note_text}</div>}
                  <div className="b-time">{fmtTime12(note.created_at)} {note.updated_at!==note.created_at && <i className="edited">Edited</i>}</div>
                  <span className="m-dot" onClick={(e)=>handleDot(e,note.note_id)}><ThreeDotsVertical size={10}/></span>
                  {menuId===note.note_id && <div className={`m-menu ${menuUp?'up':''}`}>
                    <button onClick={()=>{navigator.clipboard.writeText(note.note_text||""); showToast("Copied");}}><Files size={11}/> Copy Text</button>
                    {isImg && <><button onClick={()=>window.open(`${NOTES_API}/attachment/${note.note_id}`)}><Eye size={11}/> View Full Image</button><button onClick={()=>{ const a=document.createElement('a'); a.href=`${NOTES_API}/attachment/${note.note_id}`; a.download=note.attachment_name||'image'; a.click(); }}><Download size={11}/> Download Image</button></>}
                    {isFile && <><button onClick={()=>window.open(`${NOTES_API}/attachment/${note.note_id}`)}><Eye size={11}/> Open File</button><button onClick={()=>{ const a=document.createElement('a'); a.href=`${NOTES_API}/attachment/${note.note_id}`; a.download=note.attachment_name||'file'; a.click(); }}><Download size={11}/> Download File</button></>}
                    {isMe && <><button onClick={()=>{setEditingId(note.note_id); setInput(note.note_text);}}><PencilSquare size={11}/> Edit Message</button><button className="del" onClick={()=>deleteNote(note.note_id)}><Trash size={11}/> Delete Message</button></>}
                  </div>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {filePreview && <div className="preview-bar"><img src={filePreview} alt=""/><span>{file?.name} {file?.size>5*1024*1024 && '(auto compress)'}</span><button onClick={()=>{setFile(null);setFilePreview("");}}><XLg size={12}/></button></div>}

      {/* ONE ROW FULL - COLORFUL BUTTONS */}
      <div className="fmt-bar">
        <button className={`fmt-b ${bold?'active':''}`} onClick={()=>setBold(!bold)} style={{color:bold?'#fff':'#0f172a', background:bold?'#0f172a':'#fff'}}><TypeBold size={14}/></button>
        <button className={`fmt-b ${underline?'active':''}`} onClick={()=>setUnderline(!underline)} style={{color:underline?'#fff':'#2563eb', background:underline?'#2563eb':'#fff'}}><TypeUnderline size={14}/></button>
        <label className="fmt-b" style={{background:'#fdf2f8', color:'#db2777', borderColor:'#fbcfe8'}}><Palette size={14}/><input type="color" value={color} onChange={e=>setColor(e.target.value)} hidden/></label>
        <label className="fmt-b" style={{background:'#f0fdf4', color:'#16a34a', borderColor:'#bbf7d0'}}><ImgIcon size={14}/><input ref={imgRef} type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); setFilePreview(URL.createObjectURL(f)); }}/></label>
        <label className="fmt-b" style={{background:'#fff7ed', color:'#ea580c', borderColor:'#fed7aa'}}><Paperclip size={14}/><input ref={fileRef} type="file" hidden onChange={e=>{ const f=e.target.files[0]; if(!f) return; setFile(f); if(f.type.startsWith('image/')) setFilePreview(URL.createObjectURL(f)); }}/></label>
      </div>

      <div className="input-bar">
        <textarea ref={inputRef} value={input} onChange={handleTyping} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); const btn=document.getElementById('sendBtn'); btn?.click(); }}} placeholder={editingId?"Edit message...":"Type message..."} rows={1}/>
        <button id="sendBtn" className="send" onClick={()=>{ const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text', input); if(file){ fd.append('attachment', file); } /* send logic same as above */ document.getElementById('realSend')?.click(); }}>
          <SendFill size={16}/>
        </button>
        <button id="realSend" hidden onClick={async()=>{
          if(!input.trim()&&!file) return;
          const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text', input); if(file){ const finalFile=await compress(file); fd.append('attachment', finalFile); }
          try{
            let url, method; if(editingId){ url=`${NOTES_API}/${editingId}`; method='PUT'; } else { url=`${NOTES_API}/${id}/add`; method='POST'; }
            const res=await fetch(url,{method, headers:getHeaders(), body:fd}); const d=await res.json(); if(!res.ok) throw new Error(d.message);
            if(editingId){ setNotes(p=>p.map(n=> n.note_id===editingId? d.note : n)); setEditingId(null); showToast("Edited"); } else { setNotes(p=>[...p, d.note]); showToast("Message Sent Successfully"); }
            setInput(""); setFile(null); setFilePreview(""); setBold(false); setUnderline(false);
          }catch(e){ showToast(e.message); }
        }}></button>
      </div>

      {toast.show && <div className="center-toast">{toast.msg}</div>}

      <style>{`
    :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px)}
   .chat-shell{position:fixed;inset:0;top:0;padding-top:calc(var(--sat) + 6px);display:flex;flex-direction:column;background:#eef2f7;overflow:hidden}
   .chat-head{position:fixed;top:var(--sat);left:0;right:0;height:54px;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;z-index:100;flex-shrink:0}
   .ch-left{display:flex;align-items:center;gap:10px;min-width:0;cursor:pointer}.ch-logo{width:38px;height:38px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.08)}.ch-name{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;color:#0f172a}.ch-sub{font-size:10px;color:#64748b}
   .icon-btn{width:34px;height:34px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
   .search-panel{position:fixed;top:calc(54px + var(--sat));left:0;right:0;padding:8px;background:#fff;border-bottom:1px solid #e2e8f0;z-index:99}.s-row{display:flex;gap:6px;align-items:center}.s-row input{flex:1;height:30px;border:1px solid #e2e8f0;border-radius:8px;padding:0 8px;font-size:11px;min-width:0}.date-wrap{display:flex;align-items:center;gap:4px;border:1px solid #e2e8f0;border-radius:8px;padding:0 6px;height:30px}.clear-s{width:24px;height:24px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;flex-shrink:0}
   .typing-strip{position:fixed;top:calc(54px + var(--sat) + 46px);left:0;right:0;height:20px;background:#eff6ff;color:#2563eb;font-size:10px;font-weight:700;padding:2px 12px;z-index:98}
   .msg-wrap{flex:1;overflow-y:auto;padding:70px 10px 6px 10px;margin-top:calc(54px + var(--sat));display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
   .date-pill{align-self:center;border-radius:999px;padding:3px 12px;font-size:10px;font-weight:800;margin:8px 0;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid}
   .msg{display:flex;max-width:100%}.msg.me{justify-content:flex-end}.msg.other{justify-content:flex-start}
   .bubble{position:relative;max-width:78%;background:#fff;border:1px solid #e9eef5;border-radius:16px;padding:10px 32px 20px 12px;box-shadow:0 2px 6px rgba(15,23,42,.05);word-break:break-word;min-width:80px}
   .msg.me.bubble{background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac}
   .uname{font-size:9px;font-weight:800;color:#2563eb;background:#eff6ff;padding:1px 6px;border-radius:999px;margin-bottom:4px;display:inline-block}
   .b-img{max-width:100%;width:220px;max-height:220px;border-radius:12px;object-fit:cover;cursor:pointer;margin:4px 0;display:block;border:1px solid #e2e8f0}
   .f-card{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:11px;margin:4px 0;max-width:100%}.f-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;font-weight:600}.f-size{font-size:9px;color:#64748b}
   .b-text{font-size:13.5px;line-height:1.4;white-space:pre-wrap;word-break:break-word}
   .b-time{position:absolute;right:10px;bottom:4px;font-size:9.5px;color:#475569;font-weight:600}
   .edited{font-size:8px;color:#64748b;margin-left:6px;font-weight:600}
   .m-dot{position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:8px;background:rgba(255,255,255,.9);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.9}
   .m-menu{position:absolute;right:0;top:26px;background:#fff;border:1px solid #e8eef7;border-radius:12px;box-shadow:0 16px 32px rgba(15,23,42,.18);z-index:9999;min-width:170px;padding:4px;display:flex;flex-direction:column;gap:2px;animation:pop.16s ease}.m-menu.up{top:auto;bottom:26px}
   .m-menu button{height:32px;border:none;background:#fff;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:11.5px;font-weight:600;border-radius:9px;text-align:left}.m-menu button:hover{background:#f8fafc}.m-menu button.del{color:#dc2626;background:#fff1f2}
   .preview-bar{height:52px;background:#fff;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;padding:0 12px;flex-shrink:0}.preview-bar img{width:38px;height:38px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0}
   .fmt-bar{height:44px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;padding:0 10px;flex-shrink:0;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}.fmt-bar::-webkit-scrollbar{display:none}
   .fmt-b{width:34px;height:32px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.15s;cursor:pointer}.fmt-b:active{transform:scale(.9)}.fmt-b.active{box-shadow:0 4px 12px rgba(0,0,0,.15)}
   .input-bar{display:flex;gap:8px;align-items:flex-end;padding:8px 10px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0;padding-bottom:calc(10px + env(safe-area-inset-bottom))}
   .input-bar textarea{flex:1;min-height:38px;max-height:130px;border:1px solid #e2e8f0;border-radius:20px;padding:10px 14px;font-size:13.5px;resize:none;outline:none;line-height:1.4;background:#f8fafc}
   .input-bar textarea:focus{border-color:#0ea5e9;background:#fff;box-shadow:0 0 0 3px rgba(14,165,233,.12)}
   .send{width:42px;height:42px;border:none;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 14px rgba(37,99,235,.3);transition:.15s}.send:active{transform:scale(.92)}
   .center-toast{position:fixed;top:calc(70px + var(--sat));left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:8px 16px;border-radius:999px;font-size:11px;font-weight:800;z-index:99999;box-shadow:0 10px 24px rgba(0,0,0,.2)}
    @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media(max-width:480px){.bubble{max-width:86%}.b-img{width:190px}}
      `}</style>
    </div>
  );
}