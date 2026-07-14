import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, Container, Button, Modal, Spinner } from 'react-bootstrap';
import { Link45deg, ArrowClockwise, BoxArrowRight, CheckLg, XLg, ShieldLock } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

const API = "/api/telegramlogin-channels";
const ALLMISS_API = "/api/telegramlogin-allmiss";

const getToken = () => localStorage.getItem("telegram_token") || localStorage.getItem("token") || "";
const getDeviceId = () => { let id=localStorage.getItem("telegram_device_id"); if(!id){ id=`dev_${Date.now()}${Math.random().toString(36).slice(2,6)}`; localStorage.setItem("telegram_device_id",id);} return id; };
const img = (u)=>!u?"https://ui-avatars.com/api/?name=C&background=0D8ABC&color=fff":(u.startsWith("data:")||u.startsWith("http")?u:u);

export default function DashboardNavbar({ onRefresh, onLogout, linkRequests: propRequests, onAcceptRequest, onRejectRequest }) {
  const navigate = useNavigate();
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [requests,setRequests]=useState(propRequests||[]);
  const [toast,setToast]=useState({show:false,msg:"",t:"success"});

  const toastC=(m,t="success")=>{ setToast({show:true,msg:m,t}); setTimeout(()=>setToast({show:false}),2600); };

  const fetchReceived = useCallback(async()=>{
    setLoading(true);
    try{
      const token=getToken(); const did=getDeviceId();
      let res = await fetch(`${API}/received-links`,{headers:{Authorization:`Bearer ${token}`,"x-device-id":did}});
      if(!res.ok){ res = await fetch(`${ALLMISS_API}/received`,{headers:{Authorization:`Bearer ${token}`,"x-device-id":did}}); }
      const d = await res.json().catch(()=>({}));
      const list = d.invitations || d.requests || d.data || [];
      // Normalize
      const norm = list.map(r=>({
        id: String(r.id||r.invitation_id||r.invitationId),
        channel_id: r.channel_id,
        channelName: r.channel_name||r.channelName||"Channel",
        logo: img(r.channel_logo_url||r.logo_url||r.logo),
        type: (r.channel_type||r.type||"public").toLowerCase(),
        share_code: r.share_code,
        inviteUrl: r.share_link||r.invite_url||`${window.location.origin}/channel/join/${r.share_code||r.channel_id}`,
        pin: r.security_pin_plain||r.pin||r.security_pin||"",
        sender_name: r.sender_name||r.sender||""
      }));
      setRequests(norm);
    }catch{ /* silent */ } finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ if(propRequests && propRequests.length>0) setRequests(propRequests); else fetchReceived(); },[propRequests,fetchReceived]);
  useEffect(()=>{ if(propRequests) setRequests(propRequests); },[propRequests]);

  const handleLogout = () => {
    onLogout?.();
    localStorage.removeItem("telegram_token"); localStorage.removeItem("token"); sessionStorage.clear();
    navigate("/login");
  };

  const handleAccept = async(req)=>{
    try{
      let copyText = req.inviteUrl;
      if(req.type==="private" && req.pin) copyText += `\nPIN: ${req.pin}`;
      await navigator.clipboard.writeText(copyText);
      // backend accept - marks as accepted & removes from pending
      try{
        const token=getToken(); const did=getDeviceId();
        await fetch(`${API}/received-links/${req.id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({action:"accept"})});
        await fetch(`${ALLMISS_API}/action`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({invitation_id:req.id,action:"accept"})}).catch(()=>{});
      }catch{}
      setRequests(p=>p.filter(x=>x.id!==req.id));
      onAcceptRequest?.(req.id, req);
      toastC(req.type==="private"? "Invite + PIN copied - paste in Join box" : "Invite URL copied - paste in Join box","success");
      if(requests.length<=1) setShow(false);
    }catch{ toastC("Copy failed","danger"); }
  };

  const handleReject = async(id)=>{
    try{
      const token=getToken(); const did=getDeviceId();
      await fetch(`${API}/received-links/${id}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({action:"reject"})});
      await fetch(`${ALLMISS_API}/action`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"x-device-id":did},body:JSON.stringify({invitation_id:id,action:"reject"})}).catch(()=>{});
    }catch{}
    setRequests(p=>p.filter(x=>x.id!==id));
    onRejectRequest?.(id);
    toastC("Request rejected & removed","success");
    if(requests.length<=1) setShow(false);
  };

  const doRefresh = ()=>{ fetchReceived(); onRefresh?.(); toastC("Dashboard refreshed","success"); };

  return (
    <>
      <div style={{height:'env(safe-area-inset-top, 0px)'}} className="bg-white"/>
      <Navbar bg="white" fixed="top" className="navpro" style={{top:'env(safe-area-inset-top, 0px)',zIndex:1030}}>
        <Container fluid className="px-3 px-md-4">
          <div className="d-flex justify-content-between align-items-center w-100">
            {/* Left - Title */}
            <div className="d-flex align-items-center gap-2">
              <span className="dotlogo"/><h5 className="mb-0 fw-bold" style={{fontSize:15,letterSpacing:-.3}}>Notes Dashboard</h5>
            </div>
            {/* Right */}
            <div className="d-flex align-items-center gap-2">
              <div className="position-relative">
                <button className="iconbtn" onClick={()=>setShow(true)} title="Link Requests">
                  <Link45deg size={15}/>
                  {requests.length>0 && <span className="badge-dot">{requests.length>9?'9+':requests.length}</span>}
                </button>
              </div>
              <button className="iconbtn" onClick={doRefresh} title="Refresh"><ArrowClockwise size={14}/></button>
              <button className="logoutbtn" onClick={handleLogout}><BoxArrowRight size={13}/> <span className="d-none d-sm-inline">Logout</span></button>
            </div>
          </div>
        </Container>
      </Navbar>
      <div style={{height:'calc(58px + env(safe-area-inset-top, 0px))'}}/>

      {/* Link Requests Modal - CENTER PROFESSIONAL */}
      <Modal show={show} onHide={()=>setShow(false)} centered dialogClassName="center-modal" contentClassName="pop-card nav-pop">
        <Modal.Header closeButton className="b0 py-2"><Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2"><Link45deg size={16}/> Channel Invitations <span className="cbadge">{requests.length}</span></Modal.Title></Modal.Header>
        <Modal.Body className="p-0">
          {loading? <div className="text-center py-4"><Spinner size="sm"/> Loading...</div> :
           requests.length===0? <div className="empty py-4 text-center"><div className="emptyico"><Link45deg size={18}/></div><div className="small text-muted">No pending invitations</div><div className="hint">Only you see invites sent to you - others don't see</div></div> :
           <div className="rlist">
             {requests.map(r=>(
               <div key={r.id} className="ritem">
                 <img src={r.logo} alt="" className="rlogo"/>
                 <div className="rinfo"><div className="rname">{r.channelName}</div><div className="rmeta"><span className={`rbadge ${r.type}`}>{r.type}</span>{r.type==="private" && <span className="pinchip"><ShieldLock size={9}/> PIN: {r.pin? "••••":"Included"}</span>}{r.sender_name && <span className="from">from {r.sender_name}</span>}</div>{r.type==="private" && r.pin && <div className="pinrow"><code className="pincode">{r.pin}</code><button className="copyxs" onClick={()=>{navigator.clipboard.writeText(r.pin); toastC("PIN copied");}}>Copy PIN</button></div>}</div>
                 <div className="ract"><button className="abtn" onClick={()=>handleAccept(r)}><CheckLg size={12}/> Accept</button><button className="rbtnx" onClick={()=>handleReject(r.id)}><XLg size={11}/> Reject</button></div>
               </div>
             ))}
           </div>
          }
        </Modal.Body>
        <Modal.Footer className="b0 py-2"><div className="small text-muted" style={{fontSize:11}}>Accept = copies URL (+PIN for private) - then paste in Join Channel box. No auto-join.</div></Modal.Footer>
      </Modal>

      {toast.show && <div className="jtc"><div className={`jtt ${toast.t}`}><span className="jti">{toast.t==='success'?'✓':'!'}</span>{toast.msg}</div></div>}

      <style>{`
     .navpro{backdrop-filter:blur(10px);background:#ffffffee!important;border-bottom:1px solid #e2e8f0!important;box-shadow:0 2px 12px rgba(15,23,42,.06)!important;height:56px}
     .dotlogo{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#06b6d4);box-shadow:0 0 0 4px #eff6ff;display:inline-block}
     .iconbtn{width:32px;height:32px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;color:#334155;position:relative;transition:.15s;box-shadow:0 1px 4px rgba(0,0,0,.04)}.iconbtn:hover{background:#f8fafc;border-color:#cbd5e1;transform:translateY(-1px)}.iconbtn:active{transform:scale(.94)}
     .badge-dot{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.18)}
     .logoutbtn{height:32px;padding:0 12px;border-radius:999px;border:1px solid #fecaca;background:linear-gradient(180deg,#fff,#fff1f2);color:#dc2626;font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;transition:.15s}.logoutbtn:hover{background:#fef2f2;border-color:#fca5a5;transform:translateY(-1px)}.logoutbtn:active{transform:scale(.96)}
     .center-modal{margin:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:calc(100vh - 20px)!important}.pop-card{border:none!important;border-radius:18px!important;box-shadow:0 24px 64px rgba(15,23,42,.24)!important;overflow:hidden!important;animation:pop.26s cubic-bezier(.16,1,.3,1)!important}.b0{border:0!important}
     .nav-pop.cbadge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:800}
     .empty.emptyico{width:36px;height:36px;border-radius:50%;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;color:#94a3b8}.hint{font-size:11px;color:#94a3b8;margin-top:4px}
     .rlist{max-height:360px;overflow:auto}.ritem{display:flex;gap:11px;align-items:center;padding:12px 14px;border-bottom:1px solid #f1f5f9;transition:.12s}.ritem:last-child{border-bottom:none}.ritem:hover{background:#f8fafc}
     .rlogo{width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0}.rinfo{flex:1;min-width:0}.rname{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rmeta{display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap}.rbadge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:999px;border:1px solid;text-transform:capitalize}.rbadge.public{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}.rbadge.private{background:#fee2e2;color:#b91c1c;border-color:#fecaca}.pinchip{font-size:10px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;padding:1px 6px;border-radius:999px;display:flex;align-items:center;gap:3px;font-weight:700}.from{font-size:10px;color:#94a3b8}
     .pinrow{display:flex;align-items:center;gap:6px;margin-top:6px}.pincode{background:#0f172a;color:#fff;padding:2px 8px;border-radius:7px;font-size:11px;letter-spacing:1px;font-weight:800}.copyxs{font-size:10px;font-weight:700;border:1px solid #e2e8f0;background:#fff;border-radius:6px;padding:2px 7px}
     .ract{display:flex;flex-direction:column;gap:6px;flex-shrink:0}.abtn{height:30px;padding:0 12px;border-radius:9px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;gap:4px;box-shadow:0 4px 10px rgba(22,163,74,.22)}.rbtnx{height:30px;padding:0 12px;border-radius:9px;border:1px solid #fecaca;background:#fff;color:#dc2626;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px}.abtn:active,.rbtnx:active{transform:scale(.95)}
     .jtc{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:100000!important;pointer-events:none!important}.jtt{display:flex!important;gap:8px!important;align-items:center!important;padding:12px 18px!important;border-radius:14px!important;color:#fff!important;font-weight:800!important;font-size:13px!important;box-shadow:0 16px 36px rgba(0,0,0,.28)!important;animation:pop.28s ease!important;pointer-events:auto!important}.jtt.success{background:linear-gradient(135deg,#16a34a,#15803d)!important}.jtt.danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important}.jti{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
      @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </>
  );
}