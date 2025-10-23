import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Modal, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../Entertainment/LoadingSpiner";

export default function Login() {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // "success" | "error"
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const API_BASE_URL = "https://express-myapp.onrender.com/api/admin";

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

          // ✅ Keep a flat object (user_id at root) to match your consumers
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
      {isSubmitting && <LoadingSpinner />}

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

            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="Password"
            />

            {errorMessage && (
              <div className="error-banner" role="alert">
                {errorMessage}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <Spinner animation="border" size="sm" /> : "Login"}
            </button>

            <div className="group">
              {/* ✅ Route to your ForgotPass page */}
              <Link to="/forgot-password">Forgot Password?</Link>
              <a href="/register">Create Account</a>
            </div>
          </form>
        </div>
      </div>

      {/* Brighter theme, same animations */}
      <style>{`
@import url("https://fonts.googleapis.com/css?family=Poppins:200,300,400,500,600,700,800,900&display=swap");
@import url("https://use.fontawesome.com/releases/v6.5.1/css/all.css");

/* Page wrapper (brighter background now) */
.page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  /* 🌟 Brighter gradient */
  background: linear-gradient(135deg, #e0f2fe 0%, #faf5ff 50%, #fffbeb 100%);
}

* { font-family: "Poppins", sans-serif; }

@property --a { syntax: "<angle>"; inherits: false; initial-value: 0deg; }

.box {
  position: relative;
  width: min(90vw, 400px);
  height: 200px;
  background: repeating-conic-gradient(
    from var(--a),
    #ff2770 0%,
    #ff2770 5%,
    transparent 5%,
    transparent 40%,
    #ff2770 50%
  );
  filter: drop-shadow(0 15px 50px rgba(0,0,0,.3));
  border-radius: 20px;
  animation: rotating 4s linear infinite;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.5s;
}

@keyframes rotating {
  0% { --a: 0deg; }
  100% { --a: 360deg; }
}

.box::before {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  background: repeating-conic-gradient(
    from var(--a),
    #0bc52dff 0%,
    #2cd805ff 5%,
    transparent 5%,
    transparent 40%,
    #18e722ff 50%
  );
  filter: drop-shadow(0 15px 50px rgba(0,0,0,.25));
  border-radius: 20px;
  animation: rotating 4s linear infinite;
  animation-delay: -1s;
}

.box::after {
  content: "";
  position: absolute;
  inset: 4px;
  /* Slightly lighter inner card on bright bg */
  background: #ffffffee;
  border-radius: 15px;
  border: 8px solid #f1f5f9;
}

.box:hover { width: min(95vw, 450px); height: min(80vh, 500px); }
.box:hover .login { inset: 40px; }
.box:hover .loginBx { transform: translateY(0px); }

.login {
  position: absolute;
  inset: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  border-radius: 10px;
  background: #ffffffcc; /* glass on bright bg */
  color: #0f172a;
  z-index: 1000;
  box-shadow: inset 0 10px 20px rgba(0,0,0,.05);
  border-bottom: 2px solid rgba(15,23,42,.08);
  transition: 0.5s;
  overflow: hidden;
}

.loginBx {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  width: 70%;
  transform: translateY(126px);
  transition: 0.5s;
}

h2 { 
  text-transform: uppercase; 
  font-weight: 600; 
  letter-spacing: 0.2em; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  color: #0f172a;
}
h2 i { color: #ff2770; text-shadow: 0 0 5px #ff2770, 0 0 20px #ff2770; }

/* Inputs */
input {
  width: 100%;
  padding: 10px 20px;
  outline: none;
  border: none;
  font-size: 1em;
  color: #0f172a;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 30px;
}
input::placeholder { color: #94a3b8; }

/* Submit button */
.submit-btn {
  width: 100%;
  padding: 10px 20px;
  border: none;
  font-size: 1em;
  font-weight: 600;
  color: #111;
  background: #45f3ff;
  border-radius: 30px;
  cursor: pointer;
  transition: 0.5s;
}
.submit-btn:hover { box-shadow: 0 0 10px #45f3ff, 0 0 60px #45f3ff; }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.group { width: 100%; display: flex; justify-content: space-between; }
.group a { color: #0f172a; text-decoration: none; }
.group a:nth-child(2) { color: #ff2770; font-weight: 600; }

/* Error banner */
.error-banner {
  width: 100%;
  background: rgba(255, 39, 112, 0.1);
  border: 1px solid #ff2770;
  color: #9f1239;
  padding: 10px 14px;
  border-radius: 10px;
  text-align: center;
}

/* Responsiveness tweaks */
@media (max-width: 480px) {
  .login { inset: 30px; }
  .loginBx { width: 85%; }
  .box:hover { height: min(75vh, 440px); }
}

@media (hover: none) {
  /* On touch devices, show expanded state by default */
  .box { height: min(70vh, 480px); }
  .login { inset: 40px; }
  .loginBx { transform: translateY(0); }
}
      `}</style>

      {/* Success/Error Modal (same UX) */}
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
