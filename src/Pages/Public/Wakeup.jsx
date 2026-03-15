import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Wakeup = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Waking up server...");
  const [showButton, setShowButton] = useState(false);
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const wakeApi = async () => {
      try {
        const response = await fetch("https://express-backend-myapp.onrender.com/health");

        if (!response.ok) {
          throw new Error("Server responded with an error");
        }

        await response.json();

        setStatus("success");
        setMessage("OK Successfully API Wake Up");
        setShowButton(true);
      } catch (error) {
        console.error("Wakeup Error:", error);
        setStatus("error");
        setMessage("Unable to wake up API. Please try again.");
        setShowButton(true);
      }
    };

    wakeApi();
  }, []);

  const handleContinue = () => {
    setShowPasswordBox(true);
    setPasswordError("");
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handlePasswordSubmit = () => {
    if (password === "9370") {
      navigate("/dashboard");
    } else {
      setPasswordError("Incorrect password. Please enter valid password.");
    }
  };

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          html, body, #root {
            width: 100%;
            min-height: 100%;
          }

          body {
            overflow-x: hidden;
            font-family: "Segoe UI", Arial, sans-serif;
          }

          @keyframes wakeup-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes wakeup-fadeIn {
            0% {
              opacity: 0;
              transform: translateY(18px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes wakeup-float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
            100% { transform: translateY(0px); }
          }

          @keyframes wakeup-pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28);
            }
            70% {
              transform: scale(1.04);
              box-shadow: 0 0 0 22px rgba(59, 130, 246, 0);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
          }

          @keyframes wakeup-slideUp {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes wakeup-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }

          @keyframes wakeup-glow {
            0% {
              box-shadow: 0 0 0 rgba(37, 99, 235, 0.15);
            }
            50% {
              box-shadow: 0 0 30px rgba(37, 99, 235, 0.18);
            }
            100% {
              box-shadow: 0 0 0 rgba(37, 99, 235, 0.15);
            }
          }

          .wakeup-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.12);
            transform: translateY(-1px);
          }

          .wakeup-button:hover {
            transform: translateY(-2px) scale(1.01);
            box-shadow: 0 14px 26px rgba(37,99,235,0.30);
          }

          .wakeup-button:active {
            transform: scale(0.99);
          }

          .wakeup-card-animate {
            animation: wakeup-fadeIn 0.8s ease;
          }

          .wakeup-password-animate {
            animation: wakeup-slideUp 0.4s ease;
          }

          .wakeup-dot::after {
            content: "";
            animation: wakeup-blink 1.1s infinite;
          }

          @media (max-width: 480px) {
            .wakeup-mobile-frame {
              max-width: 100% !important;
              width: 100% !important;
              min-height: 100vh !important;
              border-radius: 0 !important;
              padding: 16px !important;
            }

            .wakeup-card-box {
              border-radius: 22px !important;
              padding: 28px 18px !important;
            }

            .wakeup-title {
              font-size: 25px !important;
            }
          }
        `}
      </style>

      <div style={styles.page}>
        <div style={styles.bgCircleOne}></div>
        <div style={styles.bgCircleTwo}></div>
        <div style={styles.bgCircleThree}></div>

        <div
          style={styles.mobileFrame}
          className="wakeup-card-animate wakeup-mobile-frame"
        >
          <div style={styles.topBar}></div>

          <div style={styles.card} className="wakeup-card-box">
            <div
              style={{
                ...styles.iconCircle,
                background:
                  status === "loading"
                    ? "linear-gradient(135deg, #fff7ed, #ffedd5)"
                    : status === "success"
                    ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                    : "linear-gradient(135deg, #fef2f2, #fee2e2)",
                color:
                  status === "loading"
                    ? "#f59e0b"
                    : status === "success"
                    ? "#16a34a"
                    : "#dc2626",
                animation:
                  status === "loading"
                    ? "wakeup-float 2s ease-in-out infinite"
                    : status === "success"
                    ? "wakeup-pulse 1.8s infinite"
                    : "wakeup-float 2s ease-in-out infinite",
              }}
            >
              {status === "loading" ? "⚡" : status === "success" ? "✔" : "✖"}
            </div>

            <div style={styles.badge}>
              {status === "loading"
                ? "Connecting"
                : status === "success"
                ? "Connected"
                : "Connection Error"}
            </div>

            <h2 style={styles.title} className="wakeup-title">
              {status === "loading"
                ? "Please Wait"
                : status === "success"
                ? "Server Ready - Ajay"
                : "Wakeup Failed"}
            </h2>

            <p style={styles.message}>{message}</p>

            {status === "loading" && (
              <>
                <div style={styles.loaderWrapper}>
                  <div style={styles.loader}></div>
                </div>
                <p style={styles.loadingText} className="wakeup-dot">
                  Starting backend service...
                </p>
              </>
            )}

            {showButton && status === "success" && !showPasswordBox && (
              <button
                style={styles.button}
                className="wakeup-button"
                onClick={handleContinue}
              >
                Continue
              </button>
            )}

            {showButton && status === "error" && (
              <button
                style={styles.button}
                className="wakeup-button"
                onClick={handleRetry}
              >
                Retry
              </button>
            )}

            {showPasswordBox && status === "success" && (
              <div style={styles.passwordSection} className="wakeup-password-animate">
                <label style={styles.passwordLabel}>Enter Password</label>

                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Enter 4 digit password"
                    value={password}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");
                      setPassword(onlyNumbers);
                      setPasswordError("");
                    }}
                    style={styles.input}
                    className="wakeup-input"
                  />
                </div>

                {passwordError && <p style={styles.errorText}>{passwordError}</p>}

                <button
                  style={styles.button}
                  className="wakeup-button"
                  onClick={handlePasswordSubmit}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(145deg, #dbeafe 0%, #eef2ff 35%, #f8fafc 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    padding: "0",
    fontFamily: "Segoe UI, Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgCircleOne: {
    position: "absolute",
    top: "-80px",
    left: "-80px",
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0) 70%)",
    animation: "wakeup-float 6s ease-in-out infinite",
  },
  bgCircleTwo: {
    position: "absolute",
    bottom: "-100px",
    right: "-60px",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 70%)",
    animation: "wakeup-float 7s ease-in-out infinite",
  },
  bgCircleThree: {
    position: "absolute",
    top: "22%",
    right: "8%",
    width: "130px",
    height: "130px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.13) 0%, rgba(16,185,129,0) 70%)",
    animation: "wakeup-float 5s ease-in-out infinite",
  },
  mobileFrame: {
    width: "100%",
    maxWidth: "430px",
    minHeight: "100vh",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderRadius: "0",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexDirection: "column",
    padding: "18px",
    border: "1px solid rgba(255,255,255,0.55)",
    position: "relative",
    zIndex: 2,
    animation: "wakeup-glow 3s ease-in-out infinite",
  },
  topBar: {
    width: "110px",
    height: "6px",
    borderRadius: "999px",
    background: "rgba(148, 163, 184, 0.45)",
    marginTop: "2px",
    marginBottom: "18px",
  },
  card: {
    width: "100%",
    textAlign: "center",
    padding: "34px 22px",
    borderRadius: "28px",
    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.85)",
    marginTop: "auto",
    marginBottom: "auto",
  },
  iconCircle: {
    width: "84px",
    height: "84px",
    borderRadius: "50%",
    margin: "0 auto 18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "34px",
    fontWeight: "bold",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  badge: {
    display: "inline-block",
    padding: "7px 14px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.3px",
    marginBottom: "14px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "12px",
    letterSpacing: "-0.4px",
  },
  message: {
    fontSize: "15px",
    color: "#64748b",
    lineHeight: "1.7",
    marginBottom: "24px",
    padding: "0 4px",
  },
  loaderWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "8px",
  },
  loader: {
    width: "48px",
    height: "48px",
    border: "4px solid #dbeafe",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "wakeup-spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "14px",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
  button: {
    marginTop: "14px",
    padding: "14px 24px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(37,99,235,0.25)",
    transition: "all 0.3s ease",
    width: "100%",
    letterSpacing: "0.2px",
  },
  passwordSection: {
    marginTop: "22px",
    textAlign: "left",
  },
  passwordLabel: {
    display: "block",
    marginBottom: "10px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  inputWrap: {
    position: "relative",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "16px",
    opacity: 0.7,
  },
  input: {
    width: "100%",
    height: "52px",
    borderRadius: "14px",
    border: "1px solid #d1d5db",
    padding: "0 14px 0 42px",
    fontSize: "15px",
    color: "#111827",
    background: "#ffffff",
    transition: "all 0.3s ease",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
  },
  errorText: {
    marginTop: "9px",
    fontSize: "13px",
    color: "#dc2626",
    fontWeight: "600",
  },
};

export default Wakeup;