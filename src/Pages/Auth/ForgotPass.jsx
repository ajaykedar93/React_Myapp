import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Fully responsive, Bootstrap-only, JavaScript-based JSX (no TS)
// Flow: Email -> Send OTP -> Verify -> Reset Password -> Success
// Backend endpoints used (absolute):
//  POST https://express-myapp.onrender.com/api/admin/forgot/request-otp      { email }
//  POST https://express-myapp.onrender.com/api/admin/forgot/verify-otp       { email, otp }
//  POST https://express-myapp.onrender.com/api/admin/forgot/reset-password   { email, otp, new_password }

const API_BASE = "https://express-myapp.onrender.com/api/admin";

export default function ForgotPass() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "otp" | "reset" | "done"
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");

  const [cooldown, setCooldown] = useState(0); // seconds for resend
  const [popup, setPopup] = useState(null); // { type: 'success'|'danger'|'info', title, text }

  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const isOtpValid = useMemo(() => /^\d{6}$/.test(otp.trim()), [otp]);
  const pwdScore = useMemo(() => passwordScore(pwd1), [pwd1]);
  const canReset = useMemo(() => pwd1 && pwd1 === pwd2 && pwdScore >= 2, [pwd1, pwd2, pwdScore]);

  const cardRef = useRef(null);

  // entrance animation on step change
  useEffect(() => {
    if (!cardRef.current) return;
    cardRef.current.classList.remove("fade-slide-in");
    void cardRef.current.offsetWidth; // reflow
    cardRef.current.classList.add("fade-slide-in");
  }, [step]);

  // cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // ---- robust fetch wrapper (throws with details if not OK) ----
  async function fetchJson(url, options) {
    const res = await fetch(url, { ...options, mode: "cors" });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!res.ok) {
      const msg = data?.error || data?.message || text || `${res.status} ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status;
      err.url = url;
      err.payload = data;
      throw err;
    }
    return { res, data, raw: text };
  }

  // ---- API calls (JSON bodies) ----
  const requestOtp = async () => {
    if (!isEmailValid) return showPopup('danger', 'Invalid Email', 'Please enter a valid email address.');
    try {
      setBusy(true);
      const { res, data } = await fetchJson(`${API_BASE}/forgot/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      // if not OK, fetchJson would have thrown already
      setStep('otp');
      setCooldown(30);
      showPopup('success', 'OTP Sent', 'A 6-digit OTP has been sent to your email.');
    } catch (e) {
      showPopup('danger', 'Could not send OTP', e.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!isOtpValid) return showPopup('danger', 'Invalid OTP', 'OTP must be a 6-digit number.');
    try {
      setBusy(true);
      const { res, data } = await fetchJson(`${API_BASE}/forgot/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() })
      });
      setStep('reset');
      showPopup('success', 'OTP Verified', 'Please set a new password.');
    } catch (e) {
      showPopup('danger', 'Verification Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!canReset) return showPopup('danger', 'Check Passwords', 'Passwords must match and be reasonably strong.');
    try {
      setBusy(true);
      const { res, data } = await fetchJson(`${API_BASE}/forgot/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          new_password: pwd1
        })
      });
      setStep('done');
      showPopup('success', 'Password Updated', 'Your password has been changed successfully.');
    } catch (e) {
      showPopup('danger', 'Reset Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0) return;
    await requestOtp();
  };

  // popup helpers
  const showPopup = (type, title, text) => setPopup({ type, title, text });
  const closePopup = () => setPopup(null);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient position-relative overflow-hidden">
      {/* decorative bubbles */}
      <div className="bubble bubble-1" />
      <div className="bubble bubble-2" />
      <div className="bubble bubble-3" />

      <div className="container px-3 px-sm-4">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <div ref={cardRef} className="card shadow-lg border-0 rounded-4 glass-card">
              <div className="card-body p-4 p-sm-5">
                <div className="d-flex align-items-center mb-3">
                  <div className="brand-badge me-2">🔐</div>
                  <h1 className="h4 fw-bold m-0">Forgot Password</h1>
                </div>
                <p className="text-secondary mb-4">Reset your password securely in a few quick steps.</p>

                {/* Back Button in top-right corner */}
                <div className="back-button-container">
                  <button
                    className="btn btn-outline-secondary back-btn"
                    onClick={() => navigate('/login')}
                  >
                    Back to Login
                  </button>
                </div>

                {step === 'email' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Email address</label>
                      <input
                        type="email"
                        className={`form-control form-control-lg ${email && !isEmailValid ? 'is-invalid' : ''}`}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <div className="form-text">Primary or alternate email registered with your account.</div>
                      <div className="invalid-feedback">Please enter a valid email.</div>
                    </div>

                    <div className="d-grid gap-2 mt-4">
                      {/* Vibrant gradient button */}
                      <button
                        className="btn btn-otp btn-lg glow-btn"
                        disabled={!isEmailValid || busy}
                        onClick={requestOtp}
                      >
                        {busy ? 'Sending…' : 'Send OTP'}
                      </button>
                    </div>
                  </>
                )}

                {step === 'otp' && (
                  <>
                    <div className="alert alert-info d-flex align-items-center" role="alert">
                      <span className="me-2">📧</span> We sent a 6-digit OTP to <strong className="ms-1">{email}</strong>.
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Enter OTP</label>
                      <input
                        inputMode="numeric"
                        pattern="\\d*"
                        maxLength={6}
                        className={`form-control form-control-lg text-center tracking-wide ${otp && !isOtpValid ? 'is-invalid' : ''}`}
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      />
                      <div className="invalid-feedback">OTP must be 6 digits.</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <button className="btn btn-outline-secondary" onClick={() => setStep('email')} disabled={busy}>Back</button>
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-primary" onClick={resendOtp} disabled={busy || cooldown > 0}>
                          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                        </button>
                        <button className="btn btn-primary glow-btn" onClick={verifyOtp} disabled={!isOtpValid || busy}>
                          {busy ? 'Verifying…' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {step === 'reset' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">New Password</label>
                      <div className="input-group input-group-lg">
                        <input
                          type={showPwd1 ? 'text' : 'password'}
                          className="form-control"
                          placeholder="Enter new password"
                          value={pwd1}
                          onChange={(e) => setPwd1(e.target.value)}
                        />
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPwd1((v) => !v)}>
                          {showPwd1 ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <StrengthBar score={pwdScore} />
                      <div className="form-text">Use 8+ chars with mix of letters, numbers & symbols.</div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Confirm Password</label>
                      <div className="input-group input-group-lg">
                        <input
                          type={showPwd2 ? 'text' : 'password'}
                          className={`form-control ${pwd2 && pwd1 !== pwd2 ? 'is-invalid' : ''}`}
                          placeholder="Re-enter new password"
                          value={pwd2}
                          onChange={(e) => setPwd2(e.target.value)}
                        />
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPwd2((v) => !v)}>
                          {showPwd2 ? 'Hide' : 'Show'}
                        </button>
                        <div className="invalid-feedback">Passwords do not match.</div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <button className="btn btn-outline-secondary" onClick={() => setStep('otp')} disabled={busy}>Back</button>
                      <button className="btn btn-success btn-lg glow-btn" onClick={resetPassword} disabled={!canReset || busy}>
                        {busy ? 'Updating…' : 'Reset Password'}
                      </button>
                    </div>
                  </>
                )}

                {step === 'done' && (
                  <div className="text-center py-4">
                    <div className="display-6 mb-2">✅</div>
                    <h2 className="h5 fw-bold">Password Changed</h2>
                    <p className="text-secondary">You may now sign in with your new password.</p>
                    <Link to="/login" className="btn btn-primary glow-btn">Go to Login</Link>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Popup */}
      {popup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className={`popup-card shadow-lg border-0 rounded-4 popup-${popup.type}`} onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="d-flex align-items-center mb-2">
                <span className="me-2 fs-4">{iconFor(popup.type)}</span>
                <h5 className="m-0 fw-bold">{popup.title}</h5>
              </div>
              <p className="mb-3 text-secondary">{popup.text}</p>
              <div className="text-end">
                <button className="btn btn-primary" onClick={closePopup}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Styles */}
      <style>{styles}</style>
    </div>
  );
}

// --- helpers ---
function iconFor(type) {
  if (type === 'success') return '✅';
  if (type === 'danger') return '⚠️';
  return 'ℹ️';
}

function passwordScore(p) {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  // return 0..5 compacted to 0..3 visually
  if (score >= 4) return 3;
  if (score >= 3) return 2;
  if (score >= 2) return 1;
  return 0;
}

// ----- Subcomponents -----
function StrengthBar({ score }) {
  const labels = ['Weak', 'Fair', 'Strong', 'Very Strong'];
  const widths = ['25%', '50%', '75%', '100%'];
  const classes = ['bg-danger', 'bg-warning', 'bg-primary', 'bg-success'];
  return (
    <div className="mt-2">
      <div className="progress" style={{ height: 8 }}>
        <div className={`progress-bar ${classes[score] || 'bg-danger'}`} style={{ width: widths[score] || '25%' }} />
      </div>
      <small className="text-secondary">Strength: {labels[score] || labels[0]}</small>
    </div>
  );
}

// ----- Styles (kept in-file for portability) -----
const styles = `
/* gradient background */
.bg-gradient {
  background: linear-gradient(120deg, #eef2ff, #f5f3ff, #ecfeff);
}

/* glassmorphism card */
.glass-card {
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(8px) saturate(120%);
  border: 1px solid rgba(255,255,255,.6) !important;
}

.brand-badge {
  width: 42px; height: 42px; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-weight: 800; box-shadow: 0 10px 24px rgba(99,102,241,.35);
}

/* subtle button glow */
.glow-btn { box-shadow: 0 10px 22px rgba(59,130,246,.28); }
.glow-btn:active { transform: translateY(1px); }

/* Vibrant gradient button for Send OTP */
.btn-otp {
  position: relative;
  border: none;
  color: #0f172a;
  font-weight: 700;
  background: linear-gradient(135deg, #ffedd5, #fde68a, #a7f3d0);
  background-size: 200% 200%;
  transition: transform .15s ease, box-shadow .2s ease, background-position .6s ease;
  outline: none;
}
.btn-otp:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(250, 204, 21, .35);
  background-position: 100% 0%;
}
.btn-otp:active { transform: translateY(0); }
.btn-otp:disabled { opacity: .7; }

/* content entrance */
.fade-slide-in { animation: fadeSlide .28s ease both; }
@keyframes fadeSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* OTP input look */
.tracking-wide { letter-spacing: .4em; }

/* center popup */
.popup-overlay {
  position: fixed; inset: 0; display: grid; place-items: center;
  background: rgba(0,0,0,.35); z-index: 1050; animation: overlayIn .15s ease both;
}
@keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
.popup-card { width: min(92vw, 460px); background: #fff; border-radius: 16px; animation: popIn .2s ease both; }
@keyframes popIn { from { transform: scale(.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.popup-success { border-top: 4px solid #16a34a; }
.popup-danger { border-top: 4px solid #ef4444; }
.popup-info { border-top: 4px solid #2563eb; }

/* Back Button Styling */
.back-button-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1050;
}

.back-btn {
  background: #3ed4c5ff;
  color: #fff;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.back-btn:hover {
  background-color: #2563eb;
  transform: scale(1.05);
}

.back-btn:active {
  background-color: #1e40af;
  transform: scale(0.98);
}

.back-btn:disabled {
  opacity: 0.6;
}

/* Decorative bubbles */
.bubble { position: absolute; border-radius: 50%; filter: blur(30px); opacity: .35; }
.bubble-1 { width: 180px; height: 180px; right: -40px; top: -40px; background: #a5b4fc; animation: float1 9s ease-in-out infinite; }
.bubble-2 { width: 220px; height: 220px; left: -60px; bottom: -60px; background: #93c5fd; animation: float2 11s ease-in-out infinite; }
.bubble-3 { width: 140px; height: 140px; left: 20%; top: 10%; background: #f0abfc; animation: float3 13s ease-in-out infinite; }
@keyframes float1 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(12px)} }
@keyframes float2 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-10px)} }
@keyframes float3 { 0%,100%{ transform: translateX(0)} 50%{ transform: translateX(10px)} }
`;
