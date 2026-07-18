import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, Container, Modal, Spinner } from 'react-bootstrap';
import { Link45deg, ArrowClockwise, BoxArrowRight, CheckLg, XLg, ShieldLock } from 'react-bootstrap-icons';
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

export default function DashboardNavbar({ onRefresh, onLogout }) {
  const navigate = useNavigate();
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [requests,setRequests]=useState([]);
  const [acceptedMap,setAcceptedMap]=useState({});
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});
  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); setTimeout(()=>setToast({show:false}),2600); };

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
        logo: resolveLogo(r.channel_logo_url||r.logo_url||""),
        type: (r.channel_type||r.type||"public").toLowerCase(),
        inviteUrl: r.share_link || buildJoinUrl(r.share_code||r.channel_id),
        pin: r.private_pin||r.private_pin_plain||r.pin||"",
      }));
      let filtered = dedupByChannel(norm).filter(r=>!(r.type==="private" && isTrusted(r.channel_id)));
      setRequests(filtered);
    }catch{} finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ fetchReceived(); const t=setInterval(fetchReceived,25000); return()=>clearInterval(t); },[fetchReceived]);
  useEffect(()=>{ if(show) fetchReceived(); },[show]);

  const handleLogout = () => { onLogout?.(); localStorage.clear(); sessionStorage.clear(); navigate("/telegram-login"); };

  // ✅ PRIVATE: Accept = ONLY URL copy + PIN navbar la show, request open hoi paryant rahil
  // ✅ PUBLIC: Accept = URL copy + instant delete
  const handleAccept = async(req)=>{
    const token=getToken(); const did=getDeviceId();
    if(req.type==="public"){
      await navigator.clipboard.writeText(req.inviteUrl).catch(()=>{});
      try{ await fetch(`${ALLMISS_API}/received-links/${req.id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({action:"accept"})}); }catch{}
      setRequests(p=>p.filter(x=>x.id!==req.id));
      toastC("Link copied — paste it in the Join Channel box");
      if(requests.length<=1) setTimeout(()=>setShow(false),300);
    }else{
      // FAKT URL COPY, PIN NAKO COPY
      await navigator.clipboard.writeText(req.inviteUrl).catch(()=>{});
      setAcceptedMap(m=>({...m,[req.id]:true}));
      toastC(`Link copied — remember PIN ${req.pin}; you need it to open this private channel`);
    }
  };

  const handleReject = async(id)=>{
    try{ const token=getToken(); const did=getDeviceId(); await fetch(`${ALLMISS_API}/received-links/${id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({action:"reject"})}); }catch{}
    setRequests(p=>p.filter(x=>x.id!==id));
    setAcceptedMap(m=>{ const n={...m}; delete n[id]; return n; });
    toastC("Rejected");
    if(requests.length<=1) setTimeout(()=>setShow(false),250);
  };

  return (
    <>
      <div className="safe-top" />
      <Navbar fixed="top" className="nav-modern">
        <Container fluid className="nav-inner">
          <div className="nav-left"><span className="dot" /> <span className="nav-title">Notes Dashboard</span></div>
          <div className="nav-right">
            <button className="nbtn" onTouchStart={e=>e.currentTarget.classList.add('touched')} onTouchEnd={e=>e.currentTarget.classList.remove('touched')} onClick={()=>{setShow(true); fetchReceived();}}>
              <Link45deg size={18} />{requests.length>0 && <i className="n-badge">{requests.length}</i>}
            </button>
            <button className="nbtn" onTouchStart={e=>e.currentTarget.classList.add('touched')} onTouchEnd={e=>e.currentTarget.classList.remove('touched')} onClick={()=>{fetchReceived(); onRefresh?.();}}><ArrowClockwise size={16} /></button>
            <button className="nbtn logout" onTouchStart={e=>e.currentTarget.classList.add('touched')} onTouchEnd={e=>e.currentTarget.classList.remove('touched')} onClick={handleLogout}><BoxArrowRight size={16} /></button>
          </div>
        </Container>
      </Navbar>
      <div className="nav-spacer" />

      <Modal show={show} onHide={()=>setShow(false)} centered dialogClassName="center-modal" contentClassName="pop-clean">
        <Modal.Header closeButton className="pop-head">
          <Modal.Title className="pop-title">Link Requests <span className="cnt">{requests.length}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body className="pop-body">
          {loading? <div className="center-py"><Spinner size="sm" /></div> :
           requests.length===0? <div className="empty">No pending requests</div> :
           <div className="req-list">
             {requests.map(r=>{
               const isPrivAccepted =!!acceptedMap[r.id];
               return(
                 <div key={r.id} className="req-item">
                   <img src={r.logo} alt="" className="req-logo" />
                   <div className="req-info">
                     <div className="req-name">{r.channelName}</div>
                     <div className="req-sub">
                       <span className={`tp ${r.type}`}>{r.type}</span>
                       {r.type==="private" &&!isPrivAccepted && <span className="sub-text">Accept to see PIN</span>}
                       {r.type==="private" && isPrivAccepted && <span className="pin-pill"><ShieldLock size={10}/> PIN: <b>{r.pin}</b></span>}
                     </div>
                     {r.type==="private" && isPrivAccepted && <div className="pin-hint">Link copied. Keep this PIN safe — you need it to open the private channel.</div>}
                   </div>
                   <div className="req-act">
                     {!isPrivAccepted? (
                       <>
                         <button className="sbtn accept" onClick={()=>handleAccept(r)}><CheckLg size={11}/>Accept</button>
                         <button className="sbtn reject" onClick={()=>handleReject(r.id)}><XLg size={10}/>Reject</button>
                       </>
                     ) : (
                       r.type==="private"? <div className="accepted-label">PIN saved — open channel when ready</div> : null
                     )}
                     {isPrivAccepted && r.type==="private" && <button className="sbtn reject small" onClick={()=>handleReject(r.id)}>Dismiss</button>}
                   </div>
                 </div>
               )
             })}
           </div>
          }
        </Modal.Body>
      </Modal>

      {toast.show && <div className="t-center"><div className={`t-box ${toast.t}`}>{toast.msg}</div></div>}

      <style>{`
      .safe-top{height:env(safe-area-inset-top,0px);background:linear-gradient(135deg,#e0f2fe,#f0f9ff);position:fixed;top:0;left:0;right:0;z-index:1040}
      .nav-modern{top:env(safe-area-inset-top,0px)!important;height:58px!important;background:linear-gradient(135deg,#ffffff 0%,#f0f9ff 50%,#e0f2fe 100%)!important;backdrop-filter:blur(20px) saturate(180%)!important;border-bottom:1px solid #dbeafe!important;box-shadow:0 4px 20px rgba(14,165,233,.12)!important;z-index:1030!important}
      .nav-inner{display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 14px!important}
      .nav-left{display:flex;align-items:center;gap:10px}
      .dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#2563eb);box-shadow:0 0 0 5px #e0f2fe,0 0 12px #0ea5e988;display:inline-block}
      .nav-title{font-size:14.5px;font-weight:800;letter-spacing:-0.3px;color:#0f172a}
      .nav-right{display:flex;align-items:center;gap:9px}
      .nbtn{width:38px;height:38px;border-radius:12px;border:1px solid #dbeafe;background:linear-gradient(180deg,#fff,#f8fbff);display:flex;align-items:center;justify-content:center;position:relative;color:#0f172a;transition:all.18s ease;box-shadow:0 2px 8px rgba(14,165,233,.08)}
      .nbtn:hover{background:#fff;transform:translateY(-1px);box-shadow:0 6px 16px rgba(14,165,233,.18);border-color:#93c5fd}
      .nbtn:active,.nbtn.touched{transform:scale(.88)!important;background:#e0f2fe!important;box-shadow:inset 0 2px 6px rgba(14,165,233,.2)!important}
      .nbtn.logout{border-color:#ffe4e6;color:#be123c;background:linear-gradient(180deg,#fff,#fff1f2)}.nbtn.logout:hover{background:#fff1f2;border-color:#fecdd3}
      .n-badge{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 10px rgba(239,68,68,.4)}
      .nav-spacer{height:calc(58px + env(safe-area-inset-top,0px))}

      .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important}
      .pop-clean{border:none!important;border-radius:20px!important;box-shadow:0 24px 60px rgba(15,23,42,.18)!important;overflow:hidden!important}
      .pop-head{background:linear-gradient(180deg,#fff,#f8fbff)!important;border-bottom:1px solid #e0f2fe!important;padding:14px 18px!important}
      .pop-title{font-size:14px!important;font-weight:800!important;display:flex;align-items:center;gap:8px}
      .cnt{font-size:11px;font-weight:800;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:999px}
      .pop-body{padding:0!important;background:#fff}
      .center-py{padding:40px;text-align:center}
      .empty{padding:36px;text-align:center;font-size:13px;font-weight:600;color:#94a3b8}
      .req-list{max-height:420px;overflow:auto}
      .req-item{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #f1f5f9;transition:.15s;background:#fff}
      .req-item:hover{background:#f8fbff}
      .req-logo{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid #e0f2fe;flex-shrink:0}
      .req-info{flex:1;min-width:0}
      .req-name{font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .req-sub{display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap}
      .tp{font-size:9px;font-weight:800;text-transform:uppercase;padding:2px 6px;border-radius:999px;border:1px solid}
      .tp.public{background:#eff6ff;color:#2563eb;border-color:#dbeafe}.tp.private{background:#fff1f2;color:#be123c;border-color:#ffe4e6}
      .sub-text{font-size:11px;color:#94a3b8}
      .pin-pill{font-size:11px;color:#be123c;background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1px solid #fecdd3;padding:4px 10px;border-radius:999px;display:flex;align-items:center;gap:4px;font-weight:800;box-shadow:0 2px 8px rgba(244,63,94,.12)}
      .pin-hint{font-size:10px;color:#64748b;margin-top:5px;line-height:1.3;max-width:220px}
      .req-act{display:flex;flex-direction:column;gap:6px;flex-shrink:0;align-items:flex-end}
      .sbtn{height:28px;padding:0 12px;border-radius:8px;border:none;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;transition:all.15s ease;cursor:pointer}
      .sbtn.accept{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;box-shadow:0 3px 10px rgba(15,23,42,.18)}.sbtn.accept:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(15,23,42,.24)}.sbtn.accept:active{transform:scale(.9)}
      .sbtn.reject{background:#fff;border:1px solid #fecdd3;color:#be123c}.sbtn.reject:hover{background:#fff1f2}.sbtn.reject:active{transform:scale(.9)}
      .sbtn.small{height:24px;font-size:10px;padding:0 10px;margin-top:2px}
      .accepted-label{font-size:10px;color:#16a34a;font-weight:700;text-align:right}
      .t-center{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99999;pointer-events:none;padding:20px}
      .t-box{padding:11px 16px;border-radius:12px;color:#fff;font-size:12px;font-weight:800;box-shadow:0 12px 32px rgba(0,0,0,.2);animation:pop.3s}
      .t-box.success{background:linear-gradient(135deg,#16a34a,#15803d)}.t-box.danger{background:#ef4444}
       @keyframes pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </>
  );
}
