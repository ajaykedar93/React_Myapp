import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { Search, ThreeDotsVertical, TypeBold, TypeUnderline, Palette, Image as ImgIcon, Paperclip, SendFill, XLg, Calendar, PencilSquare, Trash, Files, Eye, Download, ArrowLeft, CheckLg, LockFill, Globe2, XCircleFill, PlusLg, DashLg, PinAngleFill, FileEarmarkPdfFill, FileEarmarkExcelFill, FileEarmarkWordFill } from 'react-bootstrap-icons';

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
const getFileIcon = (name)=>{ const n=(name||"").toLowerCase(); if(n.endsWith('.pdf')) return <FileEarmarkPdfFill size={16} color="#dc2626"/>; if(n.endsWith('.xls')||n.endsWith('.xlsx')) return <FileEarmarkExcelFill size={16} color="#16a34a"/>; if(n.endsWith('.doc')||n.endsWith('.docx')) return <FileEarmarkWordFill size={16} color="#2563eb"/>; return "📎"; };

export default function ChannelChatScreen(){
  const { id } = useParams(); const navigate=useNavigate();
  const [channel,setChannel]=useState(null); const [notes,setNotes]=useState([]); const [loading,setLoading]=useState(true);
  const [searchOpen,setSearchOpen]=useState(false); const [q,setQ]=useState(""); const [qDate,setQDate]=useState("");
  const [file,setFile]=useState(null); const [filePreview,setFilePreview]=useState(""); const [editingId,setEditingId]=useState(null);
  const [menuId,setMenuId]=useState(null); const [menuUp,setMenuUp]=useState(false); const [toast,setToast]=useState({show:false,msg:"",green:false});
  const [attachUrls,setAttachUrls]=useState({}); const [loadingImgId,setLoadingImgId]=useState(null);
  const [imgViewer,setImgViewer]=useState({open:false,url:""}); const [logoView,setLogoView]=useState(false);
  const [boldOn,setBoldOn]=useState(false); const [ulOn,setUlOn]=useState(false); const [showFmt,setShowFmt]=useState(false);
  const [pinned,setPinned]=useState(()=>{ try{ return JSON.parse(localStorage.getItem(`pinned_${id}`)||"[]"); }catch{ return []; } });
  const listRef=useRef(null); const editorRef=useRef(null); const fileRef=useRef(null); const imgRef=useRef(null); const myId=getMyId();
  const showToast=(m,green=false)=>{ setToast({show:true,msg:m,green}); setTimeout(()=>setToast({show:false,msg:"",green:false}),1100); };
  const scrollBottom=()=> setTimeout(()=> listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:'smooth'}),100);
  const scrollToMsg=(nid)=>{ const el=document.getElementById(`msg_${nid}`); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('hl'); setTimeout(()=>el.classList.remove('hl'),1500); } };
  const getHeaders=()=>({ Authorization:`Bearer ${getToken()}`, "x-device-id":getDeviceId() });
  const getHeadersNoCT=()=>({ Authorization:`Bearer ${getToken()}`, "x-device-id":getDeviceId() });

  const fetchChannel=async()=>{ try{ const r=await fetch(`${CHANNEL_API}/${id}`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setChannel(d.channel||d.data||d); }catch{} };
  const fetchNotes=async()=>{ try{ const r=await fetch(`${NOTES_API}/${id}/all`,{headers:getHeaders()}); const d=await r.json(); if(r.ok) setNotes(d.notes||[]); }catch{} finally{ setLoading(false); } };
  useEffect(()=>{ fetchChannel(); fetchNotes(); },[id]);

  const placeCaretAtEnd=(el)=>{ if(!el) return; el.focus(); const range=document.createRange(); range.selectNodeContents(el); range.collapse(false); const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range); };
  const exec=(cmd,val=null)=>{ if(!editorRef.current) return; editorRef.current.focus(); document.execCommand(cmd,false,val); setTimeout(()=>placeCaretAtEnd(editorRef.current),10); };

  const loadSmall=async(nid)=>{
    if(attachUrls[nid]) return attachUrls[nid];
    try{ setLoadingImgId(nid); const r=await fetch(`${NOTES_API}/attachment/${nid}`,{headers:getHeaders()}); if(!r.ok) throw new Error(); const b=await r.blob(); const url=URL.createObjectURL(b); setAttachUrls(p=>({...p,[nid]:url})); return url; }catch{ return null; } finally{ setLoadingImgId(null); }
  };
  const viewBig=async(nid)=>{ const url=attachUrls[nid]||await loadSmall(nid); if(url) setImgViewer({open:true,url}); };
  const downloadOne=async(note)=>{
    try{
      let url=attachUrls[note.note_id];
      if(!url){ const r=await fetch(`${NOTES_API}/attachment/${note.note_id}`,{headers:getHeaders()}); if(!r.ok) throw new Error(); const blob=await r.blob(); url=URL.createObjectURL(blob); }
      const a=document.createElement('a'); a.href=url; a.download=note.attachment_name||`file_${Date.now()}`; document.body.appendChild(a); a.click(); a.remove(); showToast("Saved ✓",true);
    }catch{ showToast("Download failed"); }
  };

  const filtered=useMemo(()=>{
    const qq=q.trim().toLowerCase();
    return notes.filter(n=>{
      const txt=(n.note_text||"").replace(/<[^>]*>/g,'').toLowerCase();
      const fn=(n.attachment_name||"").toLowerCase();
      if(qq &&!(txt.includes(qq) || fn.includes(qq))) return false;
      if(qDate && new Date(n.created_at).toDateString()!==new Date(qDate).toDateString()) return false;
      return true;
    });
  },[notes,q,qDate]);

  const togglePin=(note)=>{
    let np=[]; const exists=pinned.find(p=>String(p.note_id)===String(note.note_id));
    if(exists) np=pinned.filter(p=>String(p.note_id)!==String(note.note_id)); else np=[note,...pinned].slice(0,5);
    setPinned(np); localStorage.setItem(`pinned_${id}`,JSON.stringify(np)); setMenuId(null); showToast(exists?"Unpinned":"Pinned 📌",true);
  };
  const handleDelete=async(noteId)=>{
    const prev=[...notes]; setNotes(p=>p.filter(x=>String(x.note_id)!==String(noteId))); setMenuId(null); showToast("Deleted",true);
    try{ const r=await fetch(`${NOTES_API}/${noteId}`,{method:'DELETE',headers:getHeaders()}); if(!r.ok) throw new Error(); }catch{ setNotes(prev); showToast("Failed"); }
  };
  const onFileSelect=(e)=>{
    const f=e.target.files?.[0]; if(!f) return; setFile(f);
    if(f.type.startsWith('image/')){ const url=URL.createObjectURL(f); setFilePreview(url); } else setFilePreview(""); e.target.value="";
  };
  const sendNote=async()=>{
    const html=editorRef.current?.innerHTML||""; const text=editorRef.current?.innerText?.trim()||""; if(!text &&!file) return;
    if(editingId){
      const eid=editingId; const prev=[...notes];
      setNotes(p=>p.map(n=> String(n.note_id)===String(eid)? {...n, note_text: html, attachment_name: file?.name||n.attachment_name} : n));
      setEditingId(null); if(editorRef.current) editorRef.current.innerHTML=""; const f=file; const fp=filePreview; setFile(null); setFilePreview("");
      if(fp && f?.type?.startsWith('image/')) setAttachUrls(p=>({...p,[eid]:fp}));
      try{ const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text',html); if(f) fd.append('attachment',f); const r=await fetch(`${NOTES_API}/${eid}`,{method:'PUT',headers:getHeadersNoCT(),body:fd}); const d=await r.json(); if(!r.ok) throw new Error(); setNotes(p=>p.map(n=> String(n.note_id)===String(eid)? d.note : n)); }catch{ setNotes(prev); showToast("Update failed"); }
      return;
    }
    const tempId=`tmp_${Date.now()}`; const tempFile=file; const tempPreview=filePreview;
    const optimistic={note_id:tempId, channel_id:Number(id), created_by_user_id:myId, created_by_name:"You", note_text: html||text, attachment_available:!!tempFile, attachment_category:tempFile?.type?.startsWith('image/')?'image': tempFile?'file':'text', attachment_name:tempFile?.name||"", created_at:new Date().toISOString()};
    setNotes(p=>[...p, optimistic]); if(tempPreview) setAttachUrls(p=>({...p,[tempId]:tempPreview}));
    if(editorRef.current) editorRef.current.innerHTML=""; setFile(null); setFilePreview(""); setBoldOn(false); setUlOn(false); scrollBottom();
    try{ const fd=new FormData(); fd.append('device_id',getDeviceId()); fd.append('note_text',html||text); if(tempFile) fd.append('attachment',tempFile); const res=await fetch(`${NOTES_API}/${id}/add`,{method:'POST',headers:getHeadersNoCT(),body:fd}); const d=await res.json(); if(!res.ok) throw new Error(); setNotes(p=>p.map(n=> String(n.note_id)===tempId? d.note : n)); if(tempPreview && d.note) setAttachUrls(p=>{ const np={...p}; np[d.note.note_id]=tempPreview; delete np[tempId]; return np; }); }catch{ setNotes(p=>p.filter(n=> String(n.note_id)!==tempId)); showToast("Failed"); }
  };
  const startEdit=(note)=>{ setEditingId(note.note_id); setMenuId(null); setShowFmt(true); setTimeout(()=>{ if(editorRef.current){ editorRef.current.innerHTML=note.note_text||""; placeCaretAtEnd(editorRef.current); }},60); };
  const handleDot=(e,mid)=>{ e.stopPropagation(); if(menuId===mid){ setMenuId(null); return; } const r=e.currentTarget.getBoundingClientRect(); setMenuUp(window.innerHeight - r.bottom < 160); setMenuId(mid); };

  if(loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner/></div>;
  let lastDate=""; const chName=channel?.channel_name||"Ajay Kedar"; const chLogo=resolveImg(channel?.logo_url||channel?.channel_logo_url); const isPrivate=channel?.channel_type==='private'; const initial=chName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||"AK";
  return (
    <div className="chat-shell" onClick={()=>setMenuId(null)}>
      <div className="nav-dark-outer">
        <div className="nav-dark-inner">
          <button className="nav-dark-btn" onClick={()=>navigate("/telegram_logidashboard")}><ArrowLeft size={18} color="#0f172a"/></button>
          <div className="nav-dark-mid">
            <div className="nav-dark-avatar" onClick={(e)=>{e.stopPropagation(); setLogoView(true);}}>
              {chLogo? <img src={chLogo} alt=""/> : <span>{initial}</span>}
            </div>
            <div className="nav-dark-txt" onClick={()=>navigate(`/channel/${id}/info`)}>
              <div className="nav-dark-name">{chName} {isPrivate? <LockFill size={13} color="#ef4444"/> : <Globe2 size={13} color="#2563eb"/>}</div>
              <div className="nav-dark-sub">Tap to view info</div>
            </div>
          </div>
          <button className="nav-dark-btn" onClick={(e)=>{e.stopPropagation(); setSearchOpen(!searchOpen);}}><Search size={16} color="#0f172a"/></button>
        </div>
      </div>

      {searchOpen && (
        <div className="search-panel" onClick={e=>e.stopPropagation()}>
          <div className="sp-input"><Search size={10}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." autoFocus /></div>
          <div className="sp-date"><Calendar size={10}/><input type="date" value={qDate} onChange={e=>setQDate(e.target.value)}/>{qDate && <button onClick={()=>setQDate("")} className="xclear"><XCircleFill size={11}/></button>}</div>
          {(q||qDate) && <button className="sp-clear" onClick={()=>{setQ(""); setQDate("");}}>Clear</button>}
        </div>
      )}

      {!searchOpen && pinned.length>0 && (
        <div className="pin-top-bar" onClick={()=>scrollToMsg(pinned[0].note_id)}>
          <div className="pin-top-left"><PinAngleFill size={12} color="#b45309"/></div>
          <div className="pin-top-text">{pinned[0].note_text? <span dangerouslySetInnerHTML={{__html:pinned[0].note_text.slice(0,50)}}/> : <span>{pinned[0].attachment_name?.slice(0,32)}</span>}</div>
          {pinned[0].attachment_category==='image' && attachUrls[pinned[0].note_id] && <img className="pin-top-thumb" src={attachUrls[pinned[0].note_id]} alt=""/>}
          <button className="pin-top-close" onClick={(e)=>{e.stopPropagation(); togglePin(pinned[0]);}}><XLg size={10}/></button>
        </div>
      )}

      <div className="msg-wrap" ref={listRef}>
        {filtered.map(note=>{
          const dStr=fmtDate(note.created_at); const showDate=dStr!==lastDate; if(showDate) lastDate=dStr;
          const isMe=String(note.created_by_user_id)===String(myId); const isImg=note.attachment_category==='image'||note.note_type==='image'; const isFile=note.attachment_available &&!isImg; const [bg,border]=badgeColor(dStr); const [ubg,uborder]=badgeColor(note.created_by_name||"A"); const imgUrl=attachUrls[note.note_id]; const isLoadingThis=loadingImgId===note.note_id; const isPinned=pinned.find(p=>String(p.note_id)===String(note.note_id));
          return (
            <React.Fragment key={note.note_id}>
              {showDate && <div className="date-pill" style={{background:bg,borderColor:border,color:border}}>{dStr}</div>}
              <div id={`msg_${note.note_id}`} className={`msg ${isMe?'me':'other'}`}>
                {!isMe && <div className="avatar" style={{background:ubg,borderColor:uborder,color:uborder}}>{(note.created_by_name||"U")[0].toUpperCase()}</div>}
                <div className={`bubble ${isPinned?'is-pinned':''}`}>
                  {isPinned && <div className="pin-only-badge"><PinAngleFill size={8}/> Pinned</div>}
                  {isImg && <div className="img-card" onClick={(e)=>{e.stopPropagation(); imgUrl? viewBig(note.note_id):loadSmall(note.note_id);}}>{imgUrl? <img src={imgUrl} className="img-full" alt=""/> : <div className="tap">{isLoadingThis? <Spinner animation="border" size="sm"/> : <><ImgIcon size={12}/><span>Tap to load</span></>}</div>}</div>}
                  {isFile && <div className="file-card"><span className="file-ico">{getFileIcon(note.attachment_name)}</span><div className="file-meta"><b>{note.attachment_name}</b><small>{(note.attachment_name||"").split('.').pop()} • Tap</small></div><button className="file-dl" onClick={(e)=>{e.stopPropagation(); downloadOne(note);}}><Download size={11}/></button></div>}
                  {note.note_text && <div className="b-text" dangerouslySetInnerHTML={{__html:note.note_text}}></div>}
                  <div className="b-time">{fmtTime(note.created_at)}</div>
                  <span className="m-dot" onClick={(e)=>handleDot(e,note.note_id)}><ThreeDotsVertical size={9}/></span>
                  {menuId===note.note_id && (
                    <div className={`m-menu ${menuUp?'up':''}`}>
                      <button className="opt-copy" onClick={()=>{navigator.clipboard.writeText((note.note_text||"").replace(/<[^>]*>/g,'')); setMenuId(null);}}><Files size={10}/>Copy</button>
                      {isImg && <><button className="opt-view" onClick={()=>{setMenuId(null); viewBig(note.note_id);}}><Eye size={10}/>View</button><button className="opt-down" onClick={()=>{setMenuId(null); downloadOne(note);}}><Download size={10}/>Download</button></>}
                      {isFile && <button className="opt-down" onClick={()=>{setMenuId(null); downloadOne(note);}}><Download size={10}/>Download</button>}
                      <button className="opt-pin" onClick={()=>togglePin(note)}><PinAngleFill size={10}/>{isPinned?"Unpin":"Pin"}</button>
                      {isMe && <><button className="opt-edit" onClick={()=>startEdit(note)}><PencilSquare size={10}/>Edit</button><button className="opt-del" onClick={()=>handleDelete(note.note_id)}><Trash size={10}/>Delete</button></>}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {(file || filePreview) && (
        <div className="preview-wrap">
          <div className="preview-thumb">{filePreview? <img src={filePreview} alt=""/> : <span>{getFileIcon(file?.name)}</span>}</div>
          <div className="preview-info"><span className="p-name">{file?.name}</span><span className="p-size">{file? (file.size/1024).toFixed(1)+' KB':''} {editingId?'• Editing':''}</span></div>
          <button className="preview-close-red" onClick={()=>{setFile(null); setFilePreview("");}}><XLg size={12} color="#fff"/></button>
        </div>
      )}

      <div className="fmt-row">
        <button className="fmt-main" onClick={(e)=>{e.stopPropagation(); setShowFmt(!showFmt);}}>{showFmt? <DashLg size={18}/>: <PlusLg size={18}/>}</button>
        <div className={`fmt-bar ${showFmt?'open':''}`}>
          <button className={`fmt-b bold ${boldOn?'on':''}`} onClick={()=>{setBoldOn(!boldOn); exec('bold');}}><TypeBold size={16}/></button>
          <button className={`fmt-b under ${ulOn?'on':''}`} onClick={()=>{setUlOn(!ulOn); exec('underline');}}><TypeUnderline size={16}/></button>
          <label className="fmt-b pal"><Palette size={16}/><input type="color" hidden onChange={e=>exec('foreColor',e.target.value)} /></label>
          <label className="fmt-b imgbtn"><ImgIcon size={16}/><input ref={imgRef} type="file" accept="image/*" hidden onChange={onFileSelect} /></label>
          <label className="fmt-b filebtn"><Paperclip size={16}/><input ref={fileRef} type="file" accept=".pdf,.xls,.xlsx,.doc,.docx,.txt,.csv" hidden onChange={onFileSelect} /></label>
        </div>
      </div>

      <div className="input-wrap">
        <div className="input-box" onClick={()=>{editorRef.current?.focus();}}>
          <div ref={editorRef} contentEditable suppressContentEditableWarning className="editor" data-placeholder="Enter text..." onFocus={()=>{ setTimeout(()=>placeCaretAtEnd(editorRef.current),10); scrollBottom(); }} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); sendNote();}}}></div>
        </div>
        <button className="send-out" onClick={sendNote}>{editingId?<CheckLg size={18}/>:<SendFill size={16}/>}</button>
      </div>

      {imgViewer.open && <div className="viewer" onClick={()=>setImgViewer({open:false,url:""})}><div className="v-box" onClick={e=>e.stopPropagation()}><img src={imgViewer.url} alt=""/><button className="v-close" onClick={()=>setImgViewer({open:false,url:""})}><XLg size={12}/></button></div></div>}
      {logoView && (
        <div className="viewer" onClick={()=>setLogoView(false)}>
          <div className="v-logo-center" onClick={e=>e.stopPropagation()}>
            {chLogo? <img src={chLogo} className="v-logo-big" alt=""/> : <div className="v-logo-fallback">{initial}</div>}
            <button className="v-logo-close" onClick={()=>setLogoView(false)}><XLg size={14} color="#fff"/></button>
          </div>
        </div>
      )}
      {toast.show && <div className={`center-toast ${toast.green?'green':''}`}>{toast.msg}</div>}

      <style>{`
*{box-sizing:border-box}
:root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--topSafe:var(--sat);--botSafe:var(--sab)}
.chat-shell{position:fixed;inset:0;display:flex;flex-direction:column;background:#f6f7fb;width:100vw;max-width:100vw;overflow:hidden}
.nav-dark-outer{padding:calc(4px + var(--topSafe)) 10px 4px;flex-shrink:0;background:#f6f7fb}
.nav-dark-inner{height:64px;background:linear-gradient(135deg,#ffffff 0%,#f0f9ff 46%,#e0f2fe 100%);border:1px solid #dbeafe;border-radius:22px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-shadow:0 8px 24px rgba(14,165,233,.18);position:relative;overflow:hidden}
.nav-dark-btn{width:42px;height:42px;min-width:42px;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s}
.nav-dark-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(14,165,233,.12)}
.nav-dark-mid{display:flex;align-items:center;gap:10px;flex:1;margin:0 10px;min-width:0}
.nav-dark-avatar{width:48px;height:48px;min-width:48px;border-radius:50%;background:#fff;border:2px solid #bfdbfe;overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:800;color:#1e293b;font-size:16px;flex-shrink:0;box-shadow:0 10px 28px rgba(15,23,42,.08)}
.nav-dark-avatar img{width:100%;height:100%;object-fit:cover;object-position:center}
.nav-dark-txt{display:flex;flex-direction:column;min-width:0;flex:1}.nav-dark-name{font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nav-dark-sub{font-size:12px;color:#475569;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.search-panel{display:flex;gap:6px;padding:8px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}.sp-input{flex:1;height:34px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#f8fafc}.sp-input input{flex:1;border:none;background:transparent;outline:none;font-size:12px}
.sp-date{height:34px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;gap:4px;padding:0 8px;background:#f8fafc}.sp-date input{border:none;background:transparent;outline:none;font-size:11px;width:110px}.xclear{border:none;background:transparent;color:#ef4444;display:flex}.sp-clear{height:34px;padding:0 10px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626;border-radius:8px;font-size:11px;font-weight:700}
.pin-top-bar{height:44px;background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #facc15;margin:6px 10px;border-radius:12px;display:flex;align-items:center;gap:8px;padding:0 10px;flex-shrink:0;cursor:pointer}
.pin-top-left{width:22px;height:22px;border-radius:6px;background:#fef3c7;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pin-top-text{flex:1;font-size:12px;color:#92400e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pin-top-thumb{width:28px;height:28px;border-radius:6px;object-fit:cover;border:1px solid #fde68a;flex-shrink:0}
.pin-top-close{width:24px;height:24px;border-radius:8px;background:#fff;border:1px solid #fde68a;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.msg-wrap{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}
.date-pill{align-self:center;font-size:9px;font-weight:700;padding:4px 12px;border-radius:999px;border:1px solid}
.msg{display:flex;gap:6px}.msg.me{justify-content:flex-end}.msg.hl{outline:2px solid #facc15;border-radius:12px}
.avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;border:1px solid;align-self:flex-end;flex-shrink:0}
.bubble{position:relative;max-width:76%;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:10px 24px 18px 12px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
.bubble.is-pinned{border-color:#facc15;background:#fffbeb}
.pin-only-badge{font-size:9px;font-weight:700;background:#facc15;color:#78350f;padding:2px 8px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;margin-bottom:6px}
.b-text{font-size:13.5px;line-height:1.45;word-break:break-word;color:#0f172a}
.b-time{position:absolute;right:8px;bottom:4px;font-size:9px;color:#94a3b8}
.m-dot{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.m-menu{position:absolute;right:0;top:26px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.14);z-index:99;min-width:120px;padding:4px;display:flex;flex-direction:column;gap:3px}
.m-menu.up{top:auto;bottom:26px}.m-menu button{height:28px;border:none;display:flex;align-items:center;gap:6px;padding:0 10px;font-size:11px;font-weight:600;border-radius:8px;cursor:pointer;width:100%;background:#fff}
.opt-copy{color:#0f172a}.opt-view{color:#a16207;background:#fefce8!important}.opt-down{color:#1d4ed8;background:#eff6ff!important}.opt-pin{color:#854d0e;background:#fef9c3!important}.opt-edit{color:#15803d;background:#f0fdf4!important}.opt-del{color:#dc2626!important;background:#fef2f2!important}
.file-card{display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin:4px 0;min-width:170px}.file-ico{width:32px;height:32px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;flex-shrink:0}.file-meta{display:flex;flex-direction:column;flex:1;min-width:0}.file-meta b{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}.file-meta small{font-size:9px;color:#64748b}.file-dl{width:28px;height:28px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center}
.img-card{max-width:180px;min-width:120px;max-height:160px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:4px 0}.img-full{width:100%;height:auto;max-height:160px;object-fit:contain}
.tap{padding:16px;display:flex;flex-direction:column;align-items:center;gap:4px;color:#94a3b8;font-size:9.5px}
.preview-wrap{height:66px;background:#fff;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;padding:0 12px;flex-shrink:0}
.preview-thumb{width:48px;height:48px;min-width:48px;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;background:#f8fafc;display:flex;align-items:center;justify-content:center}
.preview-thumb img{width:100%;height:100%;object-fit:cover}
.preview-info{flex:1;display:flex;flex-direction:column;min-width:0}.p-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}.p-size{font-size:10px;color:#64748b}
.preview-close-red{width:36px;height:36px;min-width:36px;border-radius:10px;background:#dc2626;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fmt-row{display:flex;align-items:center;gap:8px;padding:10px;background:#fff;border-top:1px solid #f1f5f9;flex-shrink:0;overflow-x:auto}
.fmt-main{width:44px;height:44px;min-width:44px;border-radius:12px;border:1px solid #0f172a;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fmt-bar{display:flex;gap:8px;align-items:center;overflow:hidden;max-width:0;opacity:0;transition:all.24s ease;pointer-events:none}
.fmt-bar.open{max-width:340px;opacity:1;pointer-events:auto}
.fmt-b{width:44px;height:44px;min-width:44px;border-radius:12px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.fmt-b.bold{background:#eff6ff;color:#2563eb}.fmt-b.under{background:#ede9fe;color:#7c3aed}.fmt-b.pal{background:#fef3c7;color:#d97706}.fmt-b.imgbtn{background:#f0fdf4;color:#16a34a}.fmt-b.filebtn{background:#ffedd5;color:#ea580c}
.fmt-b.on{background:#0f172a!important;color:#fff!important}
.input-wrap{display:flex;gap:8px;padding:8px 12px calc(8px + var(--botSafe));background:#fff;border-top:1px solid #e2e8f0;align-items:flex-end;flex-shrink:0;transition:all.18s ease}
.input-box{flex:1;border:1.5px solid #e2e8f0;border-radius:24px;background:#f8fafc;padding:4px 14px;transition:all.18s ease;min-height:44px;display:flex;align-items:center}
.input-box:focus-within{border-color:#7c3aed;background:#fff;box-shadow:0 0 0 4px rgba(124,58,237,0.12);transform:translateY(-1px)}
.input-box:active{transform:scale(0.985)}
.editor{flex:1;min-height:20px;max-height:100px;border:none;outline:none;background:transparent;font-size:14.5px;padding:8px 0;overflow-y:auto;white-space:pre-wrap}.editor:empty:before{content:attr(data-placeholder);color:#94a3b8}
.send-out{width:48px;height:48px;min-width:48px;border:none;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 18px rgba(124,58,237,0.35);transition:transform.15s}
.send-out:active{transform:scale(0.92)}
.viewer{position:fixed;inset:0;background:rgba(15,23,42,.88);backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
.v-box{position:relative}.v-box img{max-width:90vw;max-height:80vh;border-radius:14px;object-fit:contain}
.v-logo-center{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}
.v-logo-big{width:220px;height:220px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 10px 30px rgba(0,0,0,0.4)}
.v-logo-fallback{width:220px;height:220px;border-radius:50%;background:#e9e8ff;color:#1e1b4b;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:800;border:4px solid #fff}
.v-logo-close{position:absolute;top:-6px;right:-6px;width:32px;height:32px;border-radius:50%;border:2px solid #fff;background:#dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.v-close{position:absolute;top:-12px;right:-12px;width:28px;height:28px;border-radius:50%;border:none;background:#fff;display:flex;align-items:center;justify-content:center}
.center-toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0f172a;color:#fff;padding:7px 14px;border-radius:10px;font-size:11px;z-index:99999}
.center-toast.green{background:#16a34a;padding:6px 12px;border-radius:999px}
@media (max-width: 380px){.bubble{max-width:80%}.nav-dark-inner{height:60px}.nav-dark-avatar{width:42px;height:42px}}
      `}</style>
    </div>
  );
}
