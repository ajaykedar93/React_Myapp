import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, Container, Modal, Spinner } from 'react-bootstrap';
import { Link45deg, ArrowClockwise, BoxArrowRight, CheckLg, XLg, ShieldLock, Stars } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

const API_BASE = "https://express-backend-myapp.onrender.com";
const FRONTEND_BASE = "https://react-myapp-omega.vercel.app";
const API = `${API_BASE}/api/telegramlogin-channels`;
const ALLMISS_API = `${API_BASE}/api/telegramlogin-allmiss`;

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const resolveLogo = (u)=>{ if(!u) return `https://ui-avatars.com/api/?name=C&background=0D8ABC&color=fff`; if(u.startsWith("http")||u.startsWith("data:")) return u; if(u.startsWith("/")) return `${API_BASE}${u}`; return u; };
const buildJoinUrl = (code) => `${FRONTEND_BASE}/#/channel/join/${code}`;
const isTrusted = (channelId) =>!!localStorage.getItem(`priv_trust_${channelId}_${getDeviceId()}`);

export default function DashboardNavbar({ onRefresh, onLogout, linkRequests: propRequests, onAcceptRequest, onRejectRequest }) {
  const navigate = useNavigate();
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [requests,setRequests]=useState([]);
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); setTimeout(()=>setToast({show:false,msg:"",t:"success"}),2800); };

  const dedupByChannel = (arr) => {
    const map = new Map();
    arr.forEach(r=>{ const key=String(r.channel_id); if(!map.has(key)) map.set(key,r); });
    return Array.from(map.values());
  };

  const fetchReceived = useCallback(async()=>{
    setLoading(true);
    try{
      const token=getToken(); const did=getDeviceId();
      let res = await fetch(`${ALLMISS_API}/received-links`,{headers:{Authorization:`Bearer ${token}`,"x-device-id":did}});
      if(!res.ok) res = await fetch(`${API}/received-links`,{headers:{Authorization:`Bearer ${token}`,"x-device-id":did}});
      const d = await res.json().catch(()=>({}));
      const list = d.links || d.invitations || d.requests || [];
      const norm = list.map(r=>({
        id: String(r.invitation_id||r.id),
        channel_id: String(r.channel_id),
        channelName: r.channel_name||"Channel",
        logo: resolveLogo(r.channel_logo_url||r.logo_url||r.channel_logo||""),
        type: (r.channel_type||r.type||"public").toLowerCase(),
        share_code: r.share_code,
        inviteUrl: r.share_link || buildJoinUrl(r.share_code||r.channel_id),
        pin: r.private_pin||r.private_pin_plain||r.pin||r.private_pin_plain||"",
        sender_name: r.sender_name||r.sender||""
      }));
      // ✅ only receiver - backend filter + frontend dedup + private trusted auto remove
      let filtered = dedupByChannel(norm);
      filtered = filtered.filter(r=>!(r.type==="private" && isTrusted(r.channel_id)) );
      setRequests(filtered);
    }catch{} finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ fetchReceived(); const t=setInterval(fetchReceived,20000); const onStorage=()=>fetchReceived(); window.addEventListener("storage",onStorage); return()=>{ clearInterval(t); window.removeEventListener("storage",onStorage); }; },[fetchReceived]);
  useEffect(()=>{ if(propRequests?.length>=0){ const norm = propRequests.map(r=>({...r, type:(r.type||r.channel_type||"public").toLowerCase() })); const f=dedupByChannel(norm).filter(r=>!(r.type==="private" && isTrusted(r.channel_id)) ); if(f.length) setRequests(f); } },[propRequests]);
  useEffect(()=>{ if(show) fetchReceived(); },[show]);

  const handleLogout = () => { onLogout?.(); localStorage.clear(); sessionStorage.clear(); navigate("/login"); };

  // ✅ PUBLIC: Accept = URL copy + DELETE request real-time
  // ✅ PRIVATE: Accept = URL+PIN copy, request STAY until open+PIN -> auto delete
  const handleAccept = async(req)=>{
    if(req.type==="public"){
      await navigator.clipboard.writeText(req.inviteUrl);
      try{ const token=getToken(); const did=getDeviceId(); await fetch(`${ALLMISS_API}/received-links/${req.id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({action:"accept"})}); }catch{}
      setRequests(p=>p.filter(x=>x.id!==req.id));
      onAcceptRequest?.(req.id);
      toastC("Public URL copied - Paste in Join Box","success");
      if(requests.length<=1) setTimeout(()=>setShow(false),400);
    }else{
      const text = `${req.inviteUrl}\nPIN: ${req.pin}`;
      await navigator.clipboard.writeText(text);
      toastC(`Private URL + Original PIN copied - PIN: ${req.pin} - Join kara, nanter open kartana hech PIN taka`,"success");
      // request delete nahi - open+verify nanter auto remove hoil (isTrusted filter)
    }
  };

  const handleReject = async(id)=>{
    try{ const token=getToken(); const did=getDeviceId(); await fetch(`${ALLMISS_API}/received-links/${id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({action:"reject"})}); }catch{}
    setRequests(p=>p.filter(x=>x.id!==id));
    onRejectRequest?.(id);
    toastC("Rejected & removed","success");
    if(requests.length<=1) setTimeout(()=>setShow(false),300);
  };

  const copyPinOnly = async(pin)=>{ await navigator.clipboard.writeText(pin); toastC(`Original PIN ${pin} copied`,"success"); };
  const copyUrlOnly = async(url)=>{ await navigator.clipboard.writeText(url); toastC("Hosted URL copied - Join Box madhe paste kara","success"); };

  return (
    <>
      <div style={{height:'env(safe-area-inset-top, 0px)', background:'#ffffff'}}/>
      <Navbar bg="white" fixed="top" className="navpro" style={{top:'env(safe-area-inset-top, 0px)',zIndex:1030}}>
        <Container fluid className="px-3">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center gap-2"><span className="dotlogo"/><h5 className="mb-0 fw-black" style={{fontSize:15,letterSpacing:-.4}}>Notes Dashboard</h5><span className="live">● LIVE</span></div>
            <div className="d-flex align-items-center gap-2">
              <button className="iconbtn pro" onClick={()=>{setShow(true); fetchReceived();}}><Link45deg size={16}/>{requests.length>0 && <span className="badge-dot">{requests.length>9?'9+':requests.length}</span>}</button>
              <button className="iconbtn" onClick={()=>{fetchReceived(); onRefresh?.();}}><ArrowClockwise size={14}/></button>
              <button className="logoutbtn" onClick={handleLogout}><BoxArrowRight size={13}/> Logout</button>
            </div>
          </div>
        </Container>
      </Navbar>
      <div style={{height:'calc(58px + env(safe-area-inset-top, 0px))'}}/>

      <Modal show={show} onHide={()=>setShow(false)} centered dialogClassName="center-modal" contentClassName="pop-card nav-pop modern">
        <Modal.Header closeButton className="b0 py-3 modal-head"><Modal.Title className="fs-6 fw-black d-flex align-items-center gap-2"><span className="linkico pro"><Stars size={14}/></span> Link Requests <span className="cbadge pro">{requests.length}</span></Modal.Title></Modal.Header>
        <Modal.Body className="p-0">
          {loading? <div className="text-center py-5"><Spinner size="sm"/> <div className="small fw-bold mt-2">Syncing invitations...</div></div> :
           requests.length===0? <div className="emptybox"><div className="emptyico pro"><Link45deg size={22}/></div><div className="fw-black small">No pending invitations</div><div className="hint">Fakt tula pathavlele private/public request disel. Private trust jhala ki auto remove.</div></div> :
           <div className="rlist">
             {requests.map(r=>(
               <div key={r.id} className={`ritem ${r.type}`}>
                 <img src={r.logo} alt="" className="rlogo"/>
                 <div className="rinfo">
                   <div className="rname">{r.channelName} {r.sender_name && <span className="from">· from {r.sender_name}</span>}</div>
                   <div className="rmeta">
                     <span className={`rbadge ${r.type}`}>{r.type}</span>
                     {r.type==="private" && r.pin && <span className="pinchip pro"><ShieldLock size={10}/> Original PIN: <b>{r.pin}</b></span>}
                   </div>
                   {r.type==="private" && r.pin? (
                     <div className="pinrow pro">
                       <code className="pincode pro">{r.pin}</code>
                       <button className="copyxs" onClick={()=>copyPinOnly(r.pin)}>Copy PIN</button>
                       <button className="copyxs url" onClick={()=>copyUrlOnly(r.inviteUrl)}>Copy URL</button>
                       <span className="pinhelp">Accept = URL+PIN copy, request open hoi paryant rahil. PIN takun open kela ki auto delete.</span>
                     </div>
                   ) : (
                     <div className="pinrow"><span className="pinhelp public">Public - Accept = URL copy + real-time delete</span></div>
                   )}
                 </div>
                 <div className="ract">
                   <button className={`abtn ${r.type}`} onClick={()=>handleAccept(r)}><CheckLg size={12}/> {r.type==="private"?"Accept & Copy":"Accept"}</button>
                   <button className="rbtnx" onClick={()=>handleReject(r.id)}><XLg size={11}/> Reject</button>
                 </div>
               </div>
             ))}
           </div>
          }
        </Modal.Body>
        <Modal.Footer className="b0 py-2 foot-note"><div className="small">Modern: Public accept = copy + instant remove. Private accept = copy URL+Original PIN, request trusted hoi paryant rahil. Private open + PIN verify jhala ki auto delete - real-time.</div></Modal.Footer>
      </Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}><span className="jti">✓</span>{toast.msg}</div></div>}

      <style>{`
  .navpro{backdrop-filter:blur(16px) saturate(180%);background:#ffffffee!important;border-bottom:1px solid #e2e8f0!important;box-shadow:0 8px 32px rgba(15,23,42,.06)!important;height:58px}
  .dotlogo{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#06b6d4);box-shadow:0 0 0 6px #eef2ff,0 0 20px #6366f144;display:inline-block;animation:pulse 2.2s infinite}
  .live{font-size:9px;font-weight:900;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 8px;border-radius:999px;letter-spacing:.4px}
  .iconbtn{width:38px;height:38px;border-radius:13px;border:1px solid #e2e8f0;background:linear-gradient(180deg,#fff,#f8fafc);display:flex;align-items:center;justify-content:center;position:relative;transition:.22s;box-shadow:0 2px 10px rgba(15,23,42,.05)}.iconbtn.pro{border-color:#c7d2fe;box-shadow:0 4px 14px rgba(99,102,241,.15)}.iconbtn:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(15,23,42,.1)}.iconbtn:active{transform:scale(.92)}
  .badge-dot{position:absolute;top:-8px;right:-8px;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 6px 16px rgba(239,68,68,.45);animation:pop.35s cubic-bezier(.16,1,.3,1)}
  .logoutbtn{height:38px;padding:0 15px;border-radius:999px;border:1px solid #fecdd3;background:linear-gradient(180deg,#fff,#fff1f2);color:#be123c;font-size:12px;font-weight:900;display:flex;align-items:center;gap:6px;box-shadow:0 2px 10px rgba(190,18,60,.08);transition:.2s}.logoutbtn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(190,18,60,.16)}
  .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:22px!important;box-shadow:0 32px 80px rgba(15,23,42,.28)!important;overflow:hidden!important;animation:popM.32s cubic-bezier(.16,1,.3,1)!important}.pop-card.modern{border:1px solid #e0e7ff!important;backdrop-filter:blur(16px)}.modal-head{background:linear-gradient(180deg,#fff,#f8fafc)!important;border-bottom:1px solid #f1f5f9!important}.b0{border:0!important}
  .linkico{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.08)}.linkico.pro{background:linear-gradient(135deg,#e0e7ff,#dbeafe);border:1px solid #c7d2fe;color:#4f46e5}
  .cbadge{font-size:11px;font-weight:900;padding:4px 10px;border-radius:999px}.cbadge.pro{background:linear-gradient(135deg,#eef2ff,#e0e7ff);color:#4f46e5;border:1px solid #c7d2fe}
  .emptybox{padding:32px 20px;text-align:center;background:radial-gradient(600px at 50% 0%,#f8fafc,#fff)}.emptyico{width:54px;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}.emptyico.pro{background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border:1px solid #e2e8f0;color:#64748b}.hint{font-size:11px;color:#94a3b8;margin-top:6px;max-width:320px;margin-left:auto;margin-right:auto;line-height:1.4}
  .rlist{max-height:420px;overflow:auto;scrollbar-width:thin}.ritem{display:flex;gap:14px;align-items:center;padding:16px 18px;border-bottom:1px solid #f1f5f9;transition:.18s;position:relative;overflow:hidden}.ritem::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:transparent;transition:.2s}.ritem.public::before{background:#6366f1}.ritem.private::before{background:#f43f5e}.ritem:hover{background:linear-gradient(90deg,#f8fafc,#ffffff);transform:translateX(1px)}.rlogo{width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 4px 14px rgba(15,23,42,.12);flex-shrink:0}.rinfo{flex:1;min-width:0}.rname{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px}.from{font-weight:600;color:#94a3b8;font-size:11px}.rmeta{display:flex;align-items:center;gap:7px;margin-top:5px;flex-wrap:wrap}.rbadge{font-size:9px;font-weight:900;padding:3px 9px;border-radius:999px;border:1px solid;text-transform:uppercase;letter-spacing:.4px}.rbadge.public{background:#eef2ff;color:#4f46e5;border-color:#c7d2fe}.rbadge.private{background:#fff1f2;color:#be123c;border-color:#fecdd3}.pinchip{font-size:11px;background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1px solid #fecdd3;color:#be123c;padding:4px 10px;border-radius:999px;display:flex;align-items:center;gap:5px;font-weight:800}.pinchip.pro{box-shadow:0 2px 10px rgba(244,63,94,.12)}
  .pinrow{display:flex;align-items:center;gap:8px;margin-top:9px;flex-wrap:wrap}.pinrow.pro{background:#fff7f8;border:1px dashed #fecdd3;border-radius:12px;padding:8px 10px}.pincode{padding:5px 12px;border-radius:10px;font-size:13px;letter-spacing:1.5px;font-weight:900}.pincode.pro{background:#0f172a;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.18)}.copyxs{font-size:11px;font-weight:800;border:1px solid #e2e8f0;background:#fff;border-radius:9px;padding:5px 11px;transition:.18s}.copyxs:hover{background:#0f172a;color:#fff;transform:translateY(-1px)}.copyxs.url{border-color:#c7d2fe;color:#4f46e5}.pinhelp{font-size:10px;line-height:1.3}.pinhelp.public{color:#6366f1;font-weight:600}.pinhelp:not(.public){color:#be123c;font-weight:600}
  .ract{display:flex;flex-direction:column;gap:8px;flex-shrink:0}.abtn{height:36px;padding:0 15px;border-radius:12px;border:none;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;gap:6px;transition:.2s;box-shadow:0 6px 16px rgba(0,0,0,.12)}.abtn.public{background:linear-gradient(135deg,#6366f1,#4f46e5);box-shadow:0 6px 16px rgba(99,102,241,.28)}.abtn.private{background:linear-gradient(135deg,#f43f5e,#be123c);box-shadow:0 6px 16px rgba(244,63,94,.28)}.abtn:hover{transform:translateY(-1px);filter:brightness(1.05)}.rbtnx{height:36px;padding:0 14px;border-radius:12px;border:1px solid #fecaca;background:#fff;color:#dc2626;font-size:12px;font-weight:800;display:flex;align-items:center;gap:5px;transition:.2s}.rbtnx:hover{background:#fef2f2;transform:translateY(-1px)}.abtn:active,.rbtnx:active{transform:scale(.94)}
  .foot-note{background:linear-gradient(180deg,#f8fafc,#fff)!important}.foot-note div{font-size:11px!important;color:#64748b!important;line-height:1.4}
  .jtc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100000;pointer-events:none;padding:20px}.jtt{display:flex;gap:10px;align-items:center;padding:14px 22px;border-radius:16px;color:#fff;font-weight:900;font-size:13px;box-shadow:0 20px 50px rgba(0,0,0,.32);animation:popM.36s cubic-bezier(.16,1,.3,1);pointer-events:auto;backdrop-filter:blur(8px)}.jtt.success{background:linear-gradient(135deg,#16a34aee,#15803dee)}.jtt.danger{background:linear-gradient(135deg,#ef4444ee,#dc2626ee)}.jti{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.24);display:flex;align-items:center;justify-content:center;font-weight:900}
   @keyframes pop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}@keyframes popM{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes pulse{0%{box-shadow:0 0 0 6px #eef2ff,0 0 20px #6366f144}50%{box-shadow:0 0 0 12px #eef2ff00,0 0 28px #6366f122}100%{box-shadow:0 0 0 6px #eef2ff,0 0 20px #6366f144}}
      `}</style>
    </>
  );
}