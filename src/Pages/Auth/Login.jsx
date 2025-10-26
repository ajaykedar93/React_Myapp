import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Modal, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import LoadingSpiner from "../Entertainment/LoadingSpiner"; // ✅ correct name

// ✅ Bootstrap CSS for react-bootstrap components
import "bootstrap/dist/css/bootstrap.min.css";

export default function Login() {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // "success" | "error"
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const API_BASE_URL = "https://express-backend-myapp.onrender.com/api/admin";

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!loginId || !password) {
      setErrorMessage("Both fields are required.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    const loginData = {
      login_id: loginId,
      password_hash: password, // keep as-is for your API
    };

    setIsSubmitting(true);

    axios
      .post(`${API_BASE_URL}/login`, loginData)
      .then((response) => {
        setIsSubmitting(false);

        if (response?.data?.admin) {
          const admin = response.data.admin;

          login({
            user_id: admin.user_id,
            admin_name: admin.admin_name,
            role: admin.role,
            token: admin.token,
            email: admin.email,
          });

          setSuccessMessage("Login successful!");
          setModalType("success");
          setShowModal(true);

          setTimeout(() => {
            setShowModal(false);
            navigate("/dashboard");
          }, 800);
        } else {
          setErrorMessage("Unexpected response from server.");
          setModalType("error");
          setShowModal(true);
        }
      })
      .catch((error) => {
        setIsSubmitting(false);
        setErrorMessage(
          error?.response?.data?.error || "Login failed. Please try again."
        );
        setModalType("error");
        setShowModal(true);
      });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setErrorMessage("");
  };

  return (
    <div className="page">
      {/* Icons CSS (Font Awesome) */}
      <link
        rel="stylesheet"
        href="https://use.fontawesome.com/releases/v6.5.1/css/all.css"
      />

      {/* Dev badge */}
      <div className="dev-top" aria-label="Developer credit">
        <span className="dev-pill">
          <i className="fa-solid fa-code"></i>
          <strong> Developed by Ajay Kedar</strong>
        </span>
      </div>

      {isSubmitting && <LoadingSpiner />}

      <div className="box">
        <div className="login">
          <form className="loginBx" onSubmit={handleSubmit} noValidate>
            <h2>
              <i className="fa-solid fa-right-to-bracket" /> Admin Login
            </h2>

            <input
              type="text"
              id="loginId"
              placeholder="Email or Mobile"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              aria-label="Email or Mobile"
            />

            {/* Password + eye toggle */}
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-label="Password"
              />
              <button
                type="button"
                className="eye-btn"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>

            {errorMessage && (
              <div className="error-banner" role="alert">
                {errorMessage}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <Spinner animation="border" size="sm" /> : "Login"}
            </button>

            <div className="group">
              <Link to="/forgot-password">Forgot Password?</Link>
              <Link to="/register">Create Account</Link>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile-first CSS: no hover dependency */}
      <style>{`
:root { --bg1:#e0f2fe; --bg2:#faf5ff; --bg3:#fffbeb; --card:#fff; --border:#e2e8f0; --text:#0f172a; --accent:#ff2770; --cta:#45f3ff; }

* { box-sizing: border-box; font-family: "Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }

.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--bg1), var(--bg2) 50%, var(--bg3));
  padding: 16px;
}

/* Dev pill */
.dev-top { position: fixed; top: 10px; left:0; right:0; display:flex; justify-content:center; z-index:2000; pointer-events:none; }
.dev-pill {
  pointer-events:auto; display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:9999px;
  border:1px solid #e5e7eb; background:#ffffffee; box-shadow:0 6px 18px rgba(0,0,0,.08); color:#111827; font-size:.95rem;
}

/* ✅ Expanded by default (no :hover required) */
.box {
  width: min(92vw, 440px);
  height: min(82vh, 560px);
  border-radius: 20px;
  background: conic-gradient(from 0deg, #ff277022, transparent 40%, #ff277022 50%, transparent 90%);
  filter: drop-shadow(0 15px 40px rgba(0,0,0,.18));
  position: relative;
  display: grid;
  place-items: center;
}

.box::after {
  content: "";
  position: absolute; inset: 6px;
  background: var(--card);
  border-radius: 16px;
  border: 8px solid #f1f5f9;
}

.login {
  position: absolute;
  inset: 32px;                 /* ✅ visible by default */
  display: grid; place-items: center;
  z-index: 1;
  background: #ffffffcc;
  border-radius: 12px;
  box-shadow: inset 0 10px 20px rgba(0,0,0,.05);
  border-bottom: 2px solid rgba(15,23,42,.08);
}

.loginBx {
  width: 100%;
  max-width: 320px;
  display: grid; gap: 16px;
  transform: none;              /* ✅ no translate (was hiding) */
}

h2 {
  margin: 0 0 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: .15em;
  color: var(--text);
  display:flex; align-items:center; gap:10px;
}
h2 i { color: var(--accent); text-shadow: 0 0 6px #ff2770; }

/* Inputs */
input {
  width: 100%;
  height: 46px;
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-radius: 30px;
  background: #f8fafc;
  color: var(--text);
  outline: none;
  font-size: 1rem;
}
input::placeholder { color: #94a3b8; }
input:focus { border-color: #93c5fd; }

/* Password eye */
.password-wrap { position: relative; }
.password-wrap input { padding-right: 46px; }
.eye-btn {
  position: absolute; top: 50%; right: 10px; transform: translateY(-50%);
  height: 32px; width: 32px; border: none; background: transparent; display: grid; place-items: center; cursor: pointer;
  border-radius: 50%;
}
.eye-btn:focus-visible { box-shadow: 0 0 0 3px rgba(59,130,246,.45); }
.eye-btn i { color: #334155; }

/* Submit */
.submit-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 30px;
  background: var(--cta);
  color: #111;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow .25s ease;
}
.submit-btn:hover { box-shadow: 0 0 10px var(--cta), 0 0 40px var(--cta); }
.submit-btn:disabled { opacity: .7; cursor: not-allowed; }

/* Links */
.group { display:flex; justify-content:space-between; font-size: .95rem; }
.group a { color: var(--text); text-decoration: none; }
.group a:nth-child(2) { color: var(--accent); font-weight: 600; }

/* Error banner */
.error-banner {
  width: 100%;
  background: rgba(255, 39, 112, 0.08);
  border: 1px solid var(--accent);
  color: #9f1239;
  padding: 10px 14px;
  border-radius: 10px;
  text-align: center;
}

/* Small screens */
@media (max-width: 480px) {
  .box { height: min(84vh, 600px); }
  .login { inset: 24px; }
}
      `}</style>

      {/* Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Body className="text-center">
          <h5>{modalType === "success" ? "Success" : "Error"}</h5>
          <p>{modalType === "success" ? successMessage : errorMessage}</p>
          <Button
            variant={modalType === "success" ? "success" : "danger"}
            onClick={handleCloseModal}
            className="w-100"
          >
            OK
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
