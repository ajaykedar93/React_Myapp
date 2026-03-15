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

          @keyframes wakeup-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes wakeup-fadeIn {
            0% {
              opacity: 0;
              transform: translateY(12px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .wakeup-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
          }

          .wakeup-button:hover {
            transform: translateY(-1px);
          }
        `}
      </style>

      <div style={styles.page}>
        <div style={styles.mobileFrame}>
          <div style={styles.card}>
            <div
              style={{
                ...styles.iconCircle,
                backgroundColor:
                  status === "loading"
                    ? "#fff4e5"
                    : status === "success"
                    ? "#e8fff1"
                    : "#ffeaea",
                color:
                  status === "loading"
                    ? "#f59e0b"
                    : status === "success"
                    ? "#16a34a"
                    : "#dc2626",
              }}
            >
              {status === "loading" ? "⏳" : status === "success" ? "✔" : "✖"}
            </div>

            <h2 style={styles.title}>
              {status === "loading"
                ? "Please Wait"
                : status === "success"
                ? "Server Ready"
                : "Wakeup Failed"}
            </h2>

            <p style={styles.message}>{message}</p>

            {status === "loading" && (
              <div style={styles.loaderWrapper}>
                <div style={styles.loader}></div>
              </div>
            )}

            {showButton && status === "success" && !showPasswordBox && (
              <button style={styles.button} className="wakeup-button" onClick={handleContinue}>
                Continue
              </button>
            )}

            {showButton && status === "error" && (
              <button style={styles.button} className="wakeup-button" onClick={handleRetry}>
                Retry
              </button>
            )}

            {showPasswordBox && status === "success" && (
              <div style={styles.passwordSection}>
                <label style={styles.passwordLabel}>Enter Password</label>

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
    background: "linear-gradient(135deg, #e0e7ff 0%, #f8fafc 50%, #dbeafe 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  mobileFrame: {
    width: "100%",
    maxWidth: "390px",
    minHeight: "700px",
    background: "#ffffff",
    borderRadius: "32px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    border: "1px solid #e5e7eb",
    animation: "wakeup-fadeIn 0.6s ease",
  },
  card: {
    width: "100%",
    textAlign: "center",
    padding: "32px 24px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
    boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
    animation: "wakeup-fadeIn 0.8s ease",
  },
  iconCircle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "32px",
    fontWeight: "bold",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: "12px",
  },
  message: {
    fontSize: "15px",
    color: "#6b7280",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  loaderWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "10px",
  },
  loader: {
    width: "42px",
    height: "42px",
    border: "4px solid #dbeafe",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "wakeup-spin 1s linear infinite",
  },
  button: {
    marginTop: "12px",
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(37,99,235,0.25)",
    transition: "all 0.3s ease",
    width: "100%",
  },
  passwordSection: {
    marginTop: "20px",
    textAlign: "left",
  },
  passwordLabel: {
    display: "block",
    marginBottom: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
  },
  input: {
    width: "100%",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    padding: "0 14px",
    fontSize: "15px",
    color: "#111827",
    background: "#ffffff",
    transition: "all 0.3s ease",
  },
  errorText: {
    marginTop: "8px",
    fontSize: "13px",
    color: "#dc2626",
    fontWeight: "500",
  },
};

export default Wakeup;