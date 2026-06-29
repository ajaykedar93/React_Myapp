import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/*
  Public Telegram Login Route:
  <Route path="/telegram-login" element={<Telegram_Login />} />

  This page is PUBLIC and separate from your main protected /login page.
  After successful Telegram login, it redirects to:
  /telegram_loginnotes
*/

const API_BASE_URL = (
  import.meta.env.VITE_TELEGRAM_USERS_API_URL ||
  "https://express-backend-myapp.onrender.com/api/telegram-users"
).replace(/\/$/, "");

const API_ENDPOINTS = {
  sendCode: `${API_BASE_URL}/send-code`,
  verifyCode: `${API_BASE_URL}/verify-code`,
  register: `${API_BASE_URL}/register`,
  login: `${API_BASE_URL}/login`,
  forgotSendCode: `${API_BASE_URL}/forgot-password/send-code`,
  forgotReset: `${API_BASE_URL}/forgot-password/reset`,
};

const LOGIN_SUCCESS_REDIRECT_ROUTE = "/telegram_loginnotes";

export default function Telegram_Login() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const popupTimerRef = useRef(null);

  const [mode, setMode] = useState("login"); // login | register | forgot
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotCodeSending, setForgotCodeSending] = useState(false);
  const [forgotResetting, setForgotResetting] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    showPassword: false,
  });

  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    mobileNo: "",
    email: "",
    code: "",
    password: "",
    showPassword: false,
    profileImage: null,
    preview: "",
  });

  const [forgotForm, setForgotForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    showPassword: false,
  });

  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const cleanRegisterEmail = useMemo(
    () => String(registerForm.email || "").trim().toLowerCase(),
    [registerForm.email]
  );

  const cleanForgotEmail = useMemo(
    () => String(forgotForm.email || "").trim().toLowerCase(),
    [forgotForm.email]
  );

  const showPopup = (message, type = "success") => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }

    setPopup({
      show: true,
      type,
      message,
    });

    popupTimerRef.current = window.setTimeout(() => {
      setPopup({
        show: false,
        type: "success",
        message: "",
      });
    }, 1850);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || "").trim());
  };

  const isValidMobile = (mobile) => {
    return /^[6-9]\d{9}$/.test(String(mobile || "").trim());
  };

  const parseApiMessage = async (res, fallback) => {
    const data = await res.json().catch(() => ({}));
    return {
      data,
      message: data?.message || fallback,
    };
  };

  const resetRegisterState = () => {
    setEmailCodeSent(false);
    setEmailVerified(false);
    setCodeSending(false);
    setCodeVerifying(false);
    setRegisterForm({
      fullName: "",
      mobileNo: "",
      email: "",
      code: "",
      password: "",
      showPassword: false,
      profileImage: null,
      preview: "",
    });

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const switchToLogin = () => {
    setMode("login");
    setForgotStep(1);
  };

  const switchToRegister = () => {
    setMode("register");
    setForgotStep(1);
  };

  const switchToForgot = () => {
    setMode("forgot");
    setForgotStep(1);
    setForgotForm({
      email: loginForm.email || "",
      code: "",
      newPassword: "",
      showPassword: false,
    });
  };

  const handleRegisterImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showPopup("Select only image file", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showPopup("Image size must be below 5 MB", "error");
      return;
    }

    setRegisterForm((prev) => ({
      ...prev,
      profileImage: file,
      preview: URL.createObjectURL(file),
    }));
  };

  const removeProfileImage = () => {
    setRegisterForm((prev) => ({
      ...prev,
      profileImage: null,
      preview: "",
    }));

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const sendEmailCode = async () => {
    if (!isValidEmail(cleanRegisterEmail)) {
      showPopup("Enter valid email", "error");
      return;
    }

    try {
      setCodeSending(true);

      const res = await fetch(API_ENDPOINTS.sendCode, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanRegisterEmail,
        }),
      });

      const { message } = await parseApiMessage(res, "Code send failed");

      if (!res.ok) {
        showPopup(message, "error");
        return;
      }

      setEmailCodeSent(true);
      setEmailVerified(false);
      setRegisterForm((prev) => ({
        ...prev,
        code: "",
      }));

      showPopup("Code sent to email", "success");
    } catch (error) {
      console.error("Send code error:", error);
      showPopup("Server error", "error");
    } finally {
      setCodeSending(false);
    }
  };

  const verifyEmailCode = async () => {
    const code = String(registerForm.code || "").replace(/\D/g, "").slice(0, 6);

    if (!isValidEmail(cleanRegisterEmail)) {
      showPopup("Enter valid email", "error");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showPopup("Enter 6 digit code", "error");
      return;
    }

    try {
      setCodeVerifying(true);

      const res = await fetch(API_ENDPOINTS.verifyCode, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanRegisterEmail,
          code,
        }),
      });

      const { message } = await parseApiMessage(res, "Wrong code");

      if (!res.ok) {
        setEmailVerified(false);
        showPopup(message, "error");
        return;
      }

      setEmailVerified(true);
      showPopup("Email verified", "success");
    } catch (error) {
      console.error("Verify code error:", error);
      showPopup("Server error", "error");
    } finally {
      setCodeVerifying(false);
    }
  };

  const registerUser = async () => {
    const fullName = String(registerForm.fullName || "").trim();
    const mobileNo = String(registerForm.mobileNo || "").trim();
    const password = String(registerForm.password || "");

    if (fullName.length < 3) {
      showPopup("Enter full name", "error");
      return;
    }

    if (!isValidEmail(cleanRegisterEmail)) {
      showPopup("Enter valid email", "error");
      return;
    }

    if (!emailVerified) {
      showPopup("Verify email first", "error");
      return;
    }

    if (!isValidMobile(mobileNo)) {
      showPopup("Enter valid mobile no", "error");
      return;
    }

    if (password.length < 6) {
      showPopup("Password min 6 chars", "error");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("mobile_no", mobileNo);
      formData.append("email", cleanRegisterEmail);
      formData.append("password", password);

      if (registerForm.profileImage) {
        formData.append("profile_image", registerForm.profileImage);
      }

      const res = await fetch(API_ENDPOINTS.register, {
        method: "POST",
        body: formData,
      });

      const { data, message } = await parseApiMessage(res, "Register failed");

      if (!res.ok) {
        showPopup(message, "error");
        return;
      }

      if (data?.user?.telegram_user_id) {
        localStorage.setItem(
          "telegram_user_id",
          String(data.user.telegram_user_id)
        );
      }

      setLoginForm((prev) => ({
        ...prev,
        email: cleanRegisterEmail,
        password: "",
      }));

      showPopup("Register successful", "success");

      window.setTimeout(() => {
        resetRegisterState();
        switchToLogin();
      }, 750);
    } catch (error) {
      console.error("Register error:", error);
      showPopup("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async () => {
    const email = String(loginForm.email || "").trim().toLowerCase();
    const password = String(loginForm.password || "");

    if (!isValidEmail(email)) {
      showPopup("Enter valid email", "error");
      return;
    }

    if (!password) {
      showPopup("Enter password", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(API_ENDPOINTS.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const { data, message } = await parseApiMessage(res, "Login failed");

      if (!res.ok) {
        showPopup(message, "error");
        return;
      }

      if (data.token) {
        localStorage.setItem("telegram_auth_token", data.token);
      }

      if (data.user?.telegram_user_id || data.user?.user_id) {
        localStorage.setItem(
          "telegram_user_id",
          String(data.user.telegram_user_id || data.user.user_id)
        );
      }

      if (data.user?.full_name) {
        localStorage.setItem("telegram_user_name", data.user.full_name);
      }

      if (data.user?.email) {
        localStorage.setItem("telegram_user_email", data.user.email);
      }

      showPopup("Login successful", "success");

      window.setTimeout(() => {
        navigate(LOGIN_SUCCESS_REDIRECT_ROUTE, { replace: true });
      }, 650);
    } catch (error) {
      console.error("Login error:", error);
      showPopup("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendForgotCode = async () => {
    if (!isValidEmail(cleanForgotEmail)) {
      showPopup("Enter valid email", "error");
      return;
    }

    try {
      setForgotCodeSending(true);

      const res = await fetch(API_ENDPOINTS.forgotSendCode, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanForgotEmail,
        }),
      });

      const { message } = await parseApiMessage(res, "OTP send failed");

      if (!res.ok) {
        showPopup(message, "error");
        return;
      }

      setForgotStep(2);
      setForgotForm((prev) => ({
        ...prev,
        code: "",
        newPassword: "",
      }));

      showPopup("Reset OTP sent", "success");
    } catch (error) {
      console.error("Forgot send code error:", error);
      showPopup("Server error", "error");
    } finally {
      setForgotCodeSending(false);
    }
  };

  const resetForgotPassword = async () => {
    const code = String(forgotForm.code || "").replace(/\D/g, "").slice(0, 6);
    const newPassword = String(forgotForm.newPassword || "");

    if (!isValidEmail(cleanForgotEmail)) {
      showPopup("Enter valid email", "error");
      setForgotStep(1);
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showPopup("Enter 6 digit OTP", "error");
      return;
    }

    if (newPassword.length < 6) {
      showPopup("Password min 6 chars", "error");
      return;
    }

    try {
      setForgotResetting(true);

      const res = await fetch(API_ENDPOINTS.forgotReset, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanForgotEmail,
          code,
          new_password: newPassword,
        }),
      });

      const { message } = await parseApiMessage(res, "Password reset failed");

      if (!res.ok) {
        showPopup(message, "error");
        return;
      }

      showPopup("Password reset successful", "success");

      setLoginForm((prev) => ({
        ...prev,
        email: cleanForgotEmail,
        password: "",
      }));

      window.setTimeout(() => {
        switchToLogin();
      }, 750);
    } catch (error) {
      console.error("Forgot reset error:", error);
      showPopup("Server error", "error");
    } finally {
      setForgotResetting(false);
    }
  };

  const cardTitle =
    mode === "login"
      ? "Welcome Back"
      : mode === "register"
      ? "Create Account"
      : "Reset Password";

  const cardSubTitle =
    mode === "login"
      ? "Login to continue your notes channel"
      : mode === "register"
      ? "Create verified account with optional profile image"
      : forgotStep === 1
      ? "Enter your email to receive reset OTP"
      : "Enter OTP and create your new password";

  const badgeText =
    mode === "login"
      ? "LOGIN"
      : mode === "register"
      ? "REGISTER"
      : forgotStep === 1
      ? "FORGOT 1/2"
      : "FORGOT 2/2";

  return (
    <div className="tl-page">
      <div className="tl-bg-grid"></div>
      <div className="tl-bg-orb orb-one"></div>
      <div className="tl-bg-orb orb-two"></div>
      <div className="tl-bg-orb orb-three"></div>

      {popup.show && (
        <div className="tl-popup-layer" role="alert">
          <div className={`tl-popup ${popup.type}`}>
            <span>{popup.type === "success" ? "✓" : "!"}</span>
            <p>{popup.message}</p>
          </div>
        </div>
      )}

      <main
        className={`tl-shell ${
          mode === "register" ? "is-register" : mode === "forgot" ? "is-forgot" : ""
        }`}
      >
        <section className="tl-brand-card">
          <div className="tl-brand-shine"></div>

          <div className="tl-logo-mark">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="currentColor" opacity="0.14" />
              <path
                d="M48.8 18.4 39.6 47c-.7 2.2-2.5 2.7-5 1.7l-7.6-5.6-3.7 3.5c-.4.4-.7.7-1.5.7l.5-7.8 14.3-13c.6-.5-.1-.8-1-.3L18 37.4l-7.6-2.4c-2.1-.7-2.1-2.1.4-3.1l29.8-11.5c1.8-.7 3.4.4 2.8 2z"
                fill="currentColor"
              />
            </svg>
          </div>

          <h1>Telegram Login</h1>
          <p>
            Professional secure access for notes management with verified email,
            optional profile image and mobile-safe layout.
          </p>

          <div className="tl-feature-list">
            <span>Verified Email</span>
            <span>Safe Login</span>
            <span>Mobile Ready</span>
          </div>

          <div className="tl-api-chip">API Connected</div>
        </section>

        <section className="tl-auth-wrap">
          <div className="tl-card-head">
            <span className="tl-mini-badge">{badgeText}</span>
            <h2>{cardTitle}</h2>
            <p>{cardSubTitle}</p>
          </div>

          <div className={`tl-card-stage mode-${mode}`}>
            {mode === "login" && (
              <div className="tl-auth-card tl-login-card">
                <div className="tl-form">
                  <label>Email / Username</label>
                  <div className="tl-input-box">
                    <span>@</span>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <label>Password</label>
                  <div className="tl-input-box">
                    <span>●</span>
                    <input
                      type={loginForm.showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          loginUser();
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="tl-eye-btn"
                      onClick={() =>
                        setLoginForm((prev) => ({
                          ...prev,
                          showPassword: !prev.showPassword,
                        }))
                      }
                    >
                      {loginForm.showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="tl-main-btn"
                    onClick={loginUser}
                    disabled={loading}
                  >
                    {loading ? "Please wait..." : "Login"}
                  </button>

                  <div className="tl-card-links">
                    <button type="button" onClick={switchToRegister}>
                      Register here
                    </button>

                    <button type="button" onClick={switchToForgot}>
                      Forgot pass?
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === "register" && (
              <div className="tl-auth-card tl-register-card">
                <div className="tl-form">
                  <div className="tl-register-photo-wrap">
                    <button
                      type="button"
                      className="tl-round-photo"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Select profile image"
                    >
                      {registerForm.preview ? (
                        <img src={registerForm.preview} alt="profile preview" />
                      ) : (
                        <span>+</span>
                      )}
                    </button>

                    <div>
                      <strong>Profile Image</strong>
                      <small>Optional • tap circle to select</small>
                      {registerForm.preview && (
                        <button
                          type="button"
                          className="tl-remove-photo"
                          onClick={removeProfileImage}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleRegisterImage}
                    />
                  </div>

                  <label>Full Name</label>
                  <div className="tl-input-box">
                    <span>👤</span>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={registerForm.fullName}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <label>Email Verification</label>
                  <div className="tl-input-box has-action">
                    <span>@</span>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={registerForm.email}
                      disabled={emailVerified}
                      onChange={(e) => {
                        setEmailCodeSent(false);
                        setEmailVerified(false);
                        setRegisterForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                          code: "",
                        }));
                      }}
                    />

                    <button
                      type="button"
                      className="tl-small-btn"
                      onClick={sendEmailCode}
                      disabled={
                        codeSending ||
                        emailVerified ||
                        !isValidEmail(cleanRegisterEmail)
                      }
                    >
                      {emailVerified
                        ? "Verified"
                        : codeSending
                        ? "Sending"
                        : "Send Code"}
                    </button>
                  </div>

                  {emailCodeSent && !emailVerified && (
                    <div className="tl-code-row">
                      <div className="tl-input-box">
                        <span>#</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          placeholder="6 digit code"
                          value={registerForm.code}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({
                              ...prev,
                              code: e.target.value.replace(/\D/g, "").slice(0, 6),
                            }))
                          }
                        />
                      </div>

                      <button
                        type="button"
                        className="tl-verify-btn"
                        onClick={verifyEmailCode}
                        disabled={
                          codeVerifying || String(registerForm.code || "").length !== 6
                        }
                      >
                        {codeVerifying ? "..." : "Verify"}
                      </button>
                    </div>
                  )}

                  {emailVerified && (
                    <div className="tl-verified-line">✓ Email verified successfully</div>
                  )}

                  <label>Mobile No</label>
                  <div className="tl-input-box">
                    <span>☎</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength="10"
                      placeholder="Enter mobile no"
                      value={registerForm.mobileNo}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          mobileNo: e.target.value.replace(/\D/g, "").slice(0, 10),
                        }))
                      }
                    />
                  </div>

                  <label>Password</label>
                  <div className="tl-input-box">
                    <span>🔒</span>
                    <input
                      type={registerForm.showPassword ? "text" : "password"}
                      placeholder="Create password"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          registerUser();
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="tl-eye-btn"
                      onClick={() =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          showPassword: !prev.showPassword,
                        }))
                      }
                    >
                      {registerForm.showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="tl-main-btn"
                    onClick={registerUser}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Register"}
                  </button>

                  <div className="tl-card-links single">
                    <button type="button" onClick={switchToLogin}>
                      Login here
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === "forgot" && (
              <div className="tl-auth-card tl-forgot-card">
                <div className="tl-form">
                  {forgotStep === 1 && (
                    <>
                      <label>Registered Email</label>
                      <div className="tl-input-box">
                        <span>@</span>
                        <input
                          type="email"
                          placeholder="Enter registered email"
                          value={forgotForm.email}
                          onChange={(e) =>
                            setForgotForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              sendForgotCode();
                            }
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="tl-main-btn"
                        onClick={sendForgotCode}
                        disabled={forgotCodeSending}
                      >
                        {forgotCodeSending ? "Sending..." : "Send Reset OTP"}
                      </button>
                    </>
                  )}

                  {forgotStep === 2 && (
                    <>
                      <label>OTP Code</label>
                      <div className="tl-input-box">
                        <span>#</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          placeholder="Enter 6 digit OTP"
                          value={forgotForm.code}
                          onChange={(e) =>
                            setForgotForm((prev) => ({
                              ...prev,
                              code: e.target.value.replace(/\D/g, "").slice(0, 6),
                            }))
                          }
                        />
                      </div>

                      <label>New Password</label>
                      <div className="tl-input-box">
                        <span>🔒</span>
                        <input
                          type={forgotForm.showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={forgotForm.newPassword}
                          onChange={(e) =>
                            setForgotForm((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              resetForgotPassword();
                            }
                          }}
                        />

                        <button
                          type="button"
                          className="tl-eye-btn"
                          onClick={() =>
                            setForgotForm((prev) => ({
                              ...prev,
                              showPassword: !prev.showPassword,
                            }))
                          }
                        >
                          {forgotForm.showPassword ? "Hide" : "Show"}
                        </button>
                      </div>

                      <div className="tl-two-btns">
                        <button
                          type="button"
                          className="tl-back-btn"
                          onClick={() => setForgotStep(1)}
                        >
                          Back
                        </button>

                        <button
                          type="button"
                          className="tl-main-btn"
                          onClick={resetForgotPassword}
                          disabled={forgotResetting}
                        >
                          {forgotResetting ? "Saving..." : "Reset"}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="tl-card-links single">
                    <button type="button" onClick={switchToLogin}>
                      Login here
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html,
        body,
        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
        }

        body {
          background: #020617;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        .tl-page {
          position: fixed;
          inset: 0;
          width: 100dvw;
          height: 100dvh;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding:
            calc(env(safe-area-inset-top, 0px) + 18px)
            18px
            calc(env(safe-area-inset-bottom, 0px) + 24px);
          background:
            radial-gradient(circle at 12% 12%, rgba(59, 130, 246, 0.3), transparent 31%),
            radial-gradient(circle at 84% 80%, rgba(20, 184, 166, 0.25), transparent 34%),
            linear-gradient(135deg, #020617 0%, #0f172a 52%, #111827 100%);
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          color: #0f172a;
          overscroll-behavior: contain;
        }

        .tl-bg-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: radial-gradient(circle at center, black, transparent 74%);
          pointer-events: none;
        }

        .tl-bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(9px);
          opacity: 0.65;
          pointer-events: none;
          animation: tlFloat 6s ease-in-out infinite;
        }

        .orb-one {
          width: 220px;
          height: 220px;
          top: -78px;
          left: -48px;
          background: rgba(37, 99, 235, 0.42);
        }

        .orb-two {
          width: 250px;
          height: 250px;
          bottom: -100px;
          right: -72px;
          background: rgba(6, 182, 212, 0.36);
          animation-delay: 1.1s;
        }

        .orb-three {
          width: 150px;
          height: 150px;
          top: 15%;
          right: 18%;
          background: rgba(34, 197, 94, 0.18);
          animation-delay: 2s;
        }

        @keyframes tlFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(16px) scale(1.04);
          }
        }

        .tl-shell {
          width: min(890px, 100%);
          min-height: 530px;
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          border-radius: 30px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255,255,255,0.12);
          backdrop-filter: blur(20px);
          overflow: visible;
        }

        .tl-brand-card {
          position: relative;
          border-radius: 24px;
          padding: 30px 25px;
          min-height: 100%;
          color: white;
          background:
            radial-gradient(circle at 20% 15%, rgba(255,255,255,0.28), transparent 20%),
            linear-gradient(145deg, #1d4ed8, #0891b2 68%, #0f766e);
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
        }

        .tl-brand-card::after {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          right: -96px;
          bottom: -78px;
          background: rgba(255,255,255,0.13);
        }

        .tl-brand-shine {
          position: absolute;
          inset: -45%;
          background: linear-gradient(
            120deg,
            transparent 35%,
            rgba(255,255,255,0.15) 48%,
            transparent 62%
          );
          animation: shineMove 5s linear infinite;
        }

        @keyframes shineMove {
          from {
            transform: translateX(-30%) rotate(8deg);
          }

          to {
            transform: translateX(30%) rotate(8deg);
          }
        }

        .tl-logo-mark {
          width: 70px;
          height: 70px;
          border-radius: 24px;
          background: rgba(255,255,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 22px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
          position: relative;
          z-index: 1;
        }

        .tl-logo-mark svg {
          width: 46px;
          height: 46px;
        }

        .tl-brand-card h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.8px;
          position: relative;
          z-index: 1;
        }

        .tl-brand-card p {
          width: min(320px, 100%);
          margin: 14px 0 0;
          color: rgba(255,255,255,0.84);
          font-size: 14px;
          line-height: 1.55;
          font-weight: 650;
          position: relative;
          z-index: 1;
        }

        .tl-feature-list {
          margin-top: 28px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .tl-feature-list span,
        .tl-api-chip {
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 900;
          background: rgba(255,255,255,0.16);
          color: white;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16);
        }

        .tl-api-chip {
          width: fit-content;
          margin-top: 12px;
          background: rgba(34, 197, 94, 0.18);
        }

        .tl-auth-wrap {
          padding: 28px 25px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .tl-card-head {
          text-align: center;
          margin-bottom: 16px;
        }

        .tl-mini-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          background: #e0f2fe;
          color: #0369a1;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.6px;
        }

        .tl-card-head h2 {
          margin: 10px 0 4px;
          color: #ffffff;
          font-size: 25px;
          font-weight: 950;
          letter-spacing: -0.3px;
        }

        .tl-card-head p {
          margin: 0 auto;
          max-width: 345px;
          color: rgba(255,255,255,0.68);
          font-size: 12.5px;
          line-height: 1.4;
          font-weight: 650;
        }

        .tl-card-stage {
          width: 100%;
          position: relative;
          min-height: 318px;
          transition: min-height 0.25s ease;
        }

        .tl-card-stage.mode-register {
          min-height: 0;
        }

        .tl-card-stage.mode-forgot {
          min-height: 292px;
        }

        .tl-auth-card {
          width: 100%;
          min-height: 318px;
          border-radius: 24px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.97);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.18);
          animation: cardIn 0.24s ease;
        }

        .tl-register-card {
          min-height: 0;
        }

        .tl-forgot-card {
          min-height: 292px;
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(9px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .tl-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tl-form label {
          color: #0f172a;
          font-size: 11.5px;
          font-weight: 950;
          letter-spacing: 0.2px;
          margin-top: 3px;
        }

        .tl-input-box {
          min-height: 42px;
          width: 100%;
          border-radius: 15px;
          background: #f8fafc;
          border: 1px solid #dbe4f0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          transition: 0.2s ease;
        }

        .tl-input-box:focus-within {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .tl-input-box > span {
          width: 20px;
          text-align: center;
          color: #2563eb;
          font-size: 13px;
          font-weight: 950;
          flex-shrink: 0;
        }

        .tl-input-box input {
          min-width: 0;
          flex: 1;
          height: 40px;
          border: none;
          outline: none;
          background: transparent;
          color: #0f172a;
          font-size: 13.5px;
          font-weight: 750;
        }

        .tl-input-box input::placeholder {
          color: #94a3b8;
          font-weight: 650;
        }

        .tl-input-box input:disabled {
          color: #64748b;
          cursor: not-allowed;
        }

        .tl-eye-btn,
        .tl-small-btn,
        .tl-verify-btn {
          flex-shrink: 0;
          border: none;
          min-height: 28px;
          border-radius: 10px;
          padding: 0 10px;
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 950;
          transition: 0.16s ease;
        }

        .tl-small-btn {
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white;
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.18);
        }

        .tl-small-btn:disabled,
        .tl-verify-btn:disabled,
        .tl-main-btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .tl-code-row {
          display: grid;
          grid-template-columns: 1fr 78px;
          gap: 8px;
          align-items: center;
          animation: smallSlide 0.2s ease;
        }

        @keyframes smallSlide {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tl-verify-btn {
          height: 42px;
          background: #dcfce7;
          color: #15803d;
        }

        .tl-verified-line {
          min-height: 32px;
          border-radius: 13px;
          padding: 8px 11px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          font-size: 11.5px;
          font-weight: 950;
          animation: smallSlide 0.2s ease;
        }

        .tl-main-btn {
          width: 100%;
          min-height: 40px;
          margin-top: 8px;
          border: none;
          border-radius: 14px;
          padding: 0 14px;
          background: linear-gradient(135deg, #2563eb, #06b6d4 70%, #14b8a6);
          color: white;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.25px;
          box-shadow: 0 12px 26px rgba(37, 99, 235, 0.26);
          transition: 0.16s ease;
        }

        .tl-two-btns {
          display: grid;
          grid-template-columns: 92px 1fr;
          gap: 8px;
          align-items: center;
        }

        .tl-back-btn {
          min-height: 40px;
          margin-top: 8px;
          border: none;
          border-radius: 14px;
          background: #e2e8f0;
          color: #475569;
          font-size: 13px;
          font-weight: 950;
          transition: 0.16s ease;
        }

        .tl-main-btn:active,
        .tl-back-btn:active,
        .tl-eye-btn:active,
        .tl-small-btn:active,
        .tl-verify-btn:active,
        .tl-card-links button:active,
        .tl-round-photo:active,
        .tl-remove-photo:active {
          transform: scale(0.97);
        }

        .tl-card-links {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .tl-card-links.single {
          margin-top: 11px;
        }

        .tl-card-links button {
          border: none;
          background: transparent;
          color: #2563eb;
          font-size: 12px;
          font-weight: 950;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 5px;
          transition: 0.16s ease;
        }

        .tl-register-photo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 18px;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          border: 1px solid #dbeafe;
        }

        .tl-round-photo {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white;
          font-size: 26px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
          transition: 0.16s ease;
        }

        .tl-round-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tl-register-photo-wrap strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
        }

        .tl-register-photo-wrap small {
          display: block;
          margin-top: 2px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .tl-remove-photo {
          margin-top: 5px;
          width: fit-content;
          border: none;
          border-radius: 10px;
          background: #fee2e2;
          color: #dc2626;
          min-height: 24px;
          padding: 0 9px;
          font-size: 11px;
          font-weight: 950;
          transition: 0.16s ease;
        }

        .tl-popup-layer {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          padding:
            calc(env(safe-area-inset-top, 0px) + 18px)
            18px
            calc(env(safe-area-inset-bottom, 0px) + 18px);
        }

        .tl-popup {
          min-width: 145px;
          max-width: 270px;
          border-radius: 16px;
          padding: 11px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          box-shadow: 0 22px 50px rgba(15, 23, 42, 0.24);
          animation: popIn 0.2s ease;
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .tl-popup span {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 950;
          flex-shrink: 0;
        }

        .tl-popup.success span {
          background: #16a34a;
        }

        .tl-popup.error span {
          background: #dc2626;
        }

        .tl-popup p {
          margin: 0;
          color: #0f172a;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 950;
          text-align: center;
        }

        @media (max-width: 740px) {
          .tl-page {
            align-items: flex-start;
            justify-content: flex-start;
            padding:
              calc(env(safe-area-inset-top, 0px) + 12px)
              10px
              calc(env(safe-area-inset-bottom, 0px) + 28px);
          }

          .tl-shell {
            min-height: auto;
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 9px;
            border-radius: 24px;
            margin: 0 auto;
          }

          .tl-brand-card {
            min-height: auto;
            border-radius: 20px;
            padding: 18px 16px;
            align-items: center;
            text-align: center;
          }

          .tl-logo-mark {
            width: 52px;
            height: 52px;
            border-radius: 17px;
            margin-bottom: 10px;
          }

          .tl-logo-mark svg {
            width: 34px;
            height: 34px;
          }

          .tl-brand-card h1 {
            font-size: 24px;
          }

          .tl-brand-card p {
            margin-top: 8px;
            font-size: 12.3px;
            line-height: 1.4;
          }

          .tl-feature-list {
            margin-top: 12px;
            justify-content: center;
          }

          .tl-feature-list span,
          .tl-api-chip {
            padding: 6px 9px;
            font-size: 10.5px;
          }

          .tl-api-chip {
            margin: 9px auto 0;
          }

          .tl-auth-wrap {
            padding: 6px 4px 8px;
          }

          .tl-card-head {
            margin-bottom: 9px;
          }

          .tl-card-head h2 {
            font-size: 22px;
          }

          .tl-card-head p {
            font-size: 12px;
          }

          .tl-auth-card {
            border-radius: 20px;
            padding: 14px;
          }

          .tl-input-box {
            min-height: 40px;
            border-radius: 14px;
          }

          .tl-input-box input {
            height: 38px;
            font-size: 13px;
          }

          .tl-main-btn,
          .tl-back-btn {
            min-height: 38px;
            font-size: 12.5px;
          }

          .tl-code-row {
            grid-template-columns: 1fr 72px;
          }

          .tl-verify-btn {
            height: 40px;
          }
        }

        @media (max-width: 430px) {
          .tl-page {
            padding:
              calc(env(safe-area-inset-top, 0px) + 10px)
              8px
              calc(env(safe-area-inset-bottom, 0px) + 32px);
          }

          .tl-brand-card {
            padding: 15px 12px;
          }

          .tl-brand-card p {
            font-size: 11.8px;
          }

          .tl-feature-list {
            display: none;
          }

          .tl-auth-card {
            padding: 12px;
          }

          .tl-form {
            gap: 7px;
          }

          .tl-card-links {
            gap: 8px;
          }

          .tl-card-links button {
            font-size: 11.5px;
          }

          .tl-small-btn {
            padding: 0 7px;
            font-size: 10.5px;
          }

          .tl-two-btns {
            grid-template-columns: 82px 1fr;
          }

          .tl-register-photo-wrap {
            padding: 8px;
          }

          .tl-round-photo {
            width: 56px;
            height: 56px;
          }
        }

        @media (max-width: 360px) {
          .tl-page {
            padding:
              calc(env(safe-area-inset-top, 0px) + 8px)
              6px
              calc(env(safe-area-inset-bottom, 0px) + 34px);
          }

          .tl-brand-card {
            padding: 13px 10px;
          }

          .tl-logo-mark {
            width: 46px;
            height: 46px;
            margin-bottom: 8px;
          }

          .tl-logo-mark svg {
            width: 31px;
            height: 31px;
          }

          .tl-brand-card h1 {
            font-size: 21px;
          }

          .tl-brand-card p,
          .tl-api-chip {
            display: none;
          }

          .tl-auth-wrap {
            padding: 4px 2px 8px;
          }

          .tl-card-head h2 {
            font-size: 20px;
          }

          .tl-auth-card {
            padding: 11px;
          }
        }
      `}</style>
    </div>
  );
}
