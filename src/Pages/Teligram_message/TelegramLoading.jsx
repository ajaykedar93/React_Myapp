import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import telegramImage from "../../assets/teligram_icon_blue2.0.png";

const DEFAULT_BACKEND_URL = "https://express-backend-myapp.onrender.com";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000"
    : DEFAULT_BACKEND_URL)
).replace(/\/$/, "");

const PUBLIC_USER_ID = 7;

const TelegramLoading = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Loading Telegram Channels");
  const [error, setError] = useState("");
  const [particles, setParticles] = useState([]);

  // Generate floating particles
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    let active = true;
    let fakeProgressTimer;
    let loadingTextInterval;

    const loadingMessages = [
      "Loading Telegram Channels",
      "Connecting to Secure Servers",
      "Authenticating Premium Access",
      "Encrypting Your Connection",
      "Fetching Channel Data",
      "Almost Ready",
    ];

    let messageIndex = 0;

    const startFakeProgress = () => {
      fakeProgressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) return prev;
          return prev + Math.floor(Math.random() * 5) + 2;
        });
      }, 180);
    };

    const updateLoadingText = () => {
      loadingTextInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        if (active) {
          setLoadingText(loadingMessages[messageIndex]);
        }
      }, 1800);
    };

    const loadChannelsAndRedirect = async () => {
      try {
        setError("");
        setProgress(5);
        startFakeProgress();
        updateLoadingText();

        const res = await fetch(
          `${API_URL}/api/telegram-channels?user_id=${PUBLIC_USER_ID}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await res.json();

        if (!active) return;

        if (!res.ok) {
          throw new Error(data?.message || "Unable to load channels");
        }

        sessionStorage.setItem(
          "telegram_preloaded_channels",
          JSON.stringify(data?.channels || [])
        );

        clearInterval(fakeProgressTimer);
        clearInterval(loadingTextInterval);
        setLoadingText("Channels Loaded Successfully");
        setProgress(100);

        setTimeout(() => {
          if (active) {
            navigate("/teligram-channels", { replace: true });
          }
        }, 800);
      } catch (err) {
        if (!active) return;

        clearInterval(fakeProgressTimer);
        clearInterval(loadingTextInterval);
        setProgress(0);
        setError("Channel loading failed. Please try again.");
        setLoadingText("Unable to load channels");
      }
    };

    loadChannelsAndRedirect();

    return () => {
      active = false;
      clearInterval(fakeProgressTimer);
      clearInterval(loadingTextInterval);
    };
  }, [navigate]);

  const retryLoading = () => {
    window.location.reload();
  };

  const isSuccess = progress === 100 && !error;
  const isError = Boolean(error);

  return (
    <div className="tg-loading-page">
      {/* Background Particles */}
      <div className="tg-particle-container">
        {particles.map((p) => (
          <div
            key={p.id}
            className="tg-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.speed}s`,
              animationDelay: `${p.delay}s`,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Background Image */}
      <div
        className="tg-bg-image"
        style={{ backgroundImage: `url(${telegramImage})` }}
      ></div>

      {/* Gradient Overlay - Orange/Red Premium */}
      <div className="tg-overlay"></div>

      {/* Animated Circles - Orange/Red */}
      <div className="tg-circle tg-circle-1"></div>
      <div className="tg-circle tg-circle-2"></div>
      <div className="tg-circle tg-circle-3"></div>
      <div className="tg-circle tg-circle-4"></div>
      <div className="tg-circle tg-circle-5"></div>

      {/* Glow Effects - Orange/Red */}
      <div className="tg-glow tg-glow-1"></div>
      <div className="tg-glow tg-glow-2"></div>

      {/* Main Card */}
      <div className={`tg-card ${isSuccess ? "success" : ""} ${isError ? "error" : ""}`}>
        {/* Premium Badge */}
        <div className="tg-premium-badge">
          <span className="tg-premium-star">★</span>
          PREMIUM
          <span className="tg-premium-star">★</span>
        </div>

        {/* Success Checkmark */}
        {isSuccess && (
          <div className="tg-success-check">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" />
              <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
        )}

        {/* Error Icon */}
        {isError && (
          <div className="tg-error-icon">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" />
              <line x1="18" y1="18" x2="34" y2="34" />
              <line x1="34" y1="18" x2="18" y2="34" />
            </svg>
          </div>
        )}

        {/* Image Box */}
        <div className={`tg-image-box ${isSuccess ? "success-pulse" : ""}`}>
          <img src={telegramImage} alt="Teligram Premium" />
          {!isSuccess && !isError && (
            <div className="tg-image-overlay">
              <div className="tg-scan-line"></div>
            </div>
          )}
          {/* Premium Glow Ring */}
          <div className="tg-premium-ring"></div>
        </div>

        {/* Title with Orange/Red Gradient */}
        <h1 className="tg-title">
          <span className="tg-title-orange">Teligram</span>
          <span className="tg-title-red">Premium</span>
          <span className="tg-title-shine"></span>
        </h1>

        <p className="tg-subtitle">
          {isSuccess ? "✓ Ready to access" : isError ? "⚠ Connection Error" : "Secure premium channels loading"}
        </p>

        {/* Loader Area - Orange/Red */}
        {!isSuccess && !isError && (
          <div className="tg-loader-area">
            <div className="tg-ring"></div>
            <div className="tg-ring-dot"></div>
            <div className="tg-ring-pulse"></div>
          </div>
        )}

        {/* Loading Text */}
        <p className="tg-loading-text">
          {loadingText}
          {!isError && !isSuccess && (
            <span className="tg-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          )}
          {isSuccess && <span className="tg-success-text"> ✓</span>}
        </p>

        {/* Progress - Orange/Red Theme */}
        <div className="tg-progress-percent">
          {isSuccess ? "✓ Complete" : isError ? "✗ Failed" : `${progress}%`}
        </div>

        <div className={`tg-progress ${isSuccess ? "success" : ""} ${isError ? "error" : ""}`}>
          <div
            className={`tg-progress-fill ${isSuccess ? "success" : ""} ${isError ? "error" : ""}`}
            style={{ width: `${isSuccess ? 100 : isError ? 0 : progress}%` }}
          >
            <div className="tg-progress-glow"></div>
          </div>
        </div>

        {/* Status Messages */}
        {isSuccess ? (
          <div className="tg-bottom-text success">
            <span>🎉 Channels loaded successfully! Redirecting...</span>
          </div>
        ) : isError ? (
          <>
            <div className="tg-error-text">{error}</div>
            <button className="tg-retry-btn" onClick={retryLoading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Retry Connection
            </button>
          </>
        ) : (
          <div className="tg-bottom-text">
            <span className="tg-pulse-dot"></span>
            Please wait, preparing your premium access
          </div>
        )}

        {/* Credit - Orange/Red */}
        <div className="tg-credit">
          <span className="tg-code-icon">&lt;/&gt;</span>
          <span className="tg-credit-name">Ajay Kedar</span>
          <span className="tg-credit-dot">•</span>
          <span className="tg-credit-version">Premium v3.0</span>
        </div>
      </div>

      {/* Inline Styles - Orange/Red Theme */}
      <style>{`
        /* ============================================================
           BASE STYLES
           ============================================================ */
        .tg-loading-page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #0a0508;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ============================================================
           PARTICLES - Orange/Red
           ============================================================ */
        .tg-particle-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .tg-particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 107, 53, 0.8), transparent);
          animation: particleFloat linear infinite;
          will-change: transform;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-30px) translateX(10px) scale(1.2);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-60px) translateX(-10px) scale(0.8);
            opacity: 0.3;
          }
          75% {
            transform: translateY(-30px) translateX(15px) scale(1.1);
            opacity: 0.5;
          }
          100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.2;
          }
        }

        /* ============================================================
           BACKGROUND - Dark with Orange/Red glow
           ============================================================ */
        .tg-bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transform: scale(1.15);
          filter: blur(16px);
          opacity: 0.3;
          animation: bgZoom 8s ease-in-out infinite alternate;
        }

        @keyframes bgZoom {
          from {
            transform: scale(1.1);
          }
          to {
            transform: scale(1.2);
          }
        }

        .tg-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 107, 53, 0.2), transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(255, 50, 50, 0.15), transparent 40%),
            radial-gradient(circle at center, rgba(0, 0, 0, 0.2), rgba(10, 5, 8, 0.95) 80%);
        }

        /* ============================================================
           GLOW EFFECTS - Orange/Red
           ============================================================ */
        .tg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: glowPulse 4s ease-in-out infinite;
        }

        .tg-glow-1 {
          width: 350px;
          height: 350px;
          top: -100px;
          right: -100px;
          background: radial-gradient(circle, rgba(255, 107, 53, 0.25), transparent);
        }

        .tg-glow-2 {
          width: 280px;
          height: 280px;
          bottom: -80px;
          left: -80px;
          background: radial-gradient(circle, rgba(255, 50, 50, 0.2), transparent);
          animation-delay: 2s;
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        /* ============================================================
           CIRCLES - Orange/Red
           ============================================================ */
        .tg-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(3px);
          opacity: 0.25;
          animation: floatMove 6s ease-in-out infinite;
        }

        .tg-circle-1 {
          width: 140px;
          height: 140px;
          top: 8%;
          left: 5%;
          background: rgba(255, 107, 53, 0.2);
          animation-delay: 0s;
        }

        .tg-circle-2 {
          width: 180px;
          height: 180px;
          bottom: 8%;
          right: 5%;
          background: rgba(255, 50, 50, 0.15);
          animation-delay: 1.5s;
        }

        .tg-circle-3 {
          width: 100px;
          height: 100px;
          top: 25%;
          right: 10%;
          background: rgba(255, 107, 53, 0.2);
          animation-delay: 3s;
        }

        .tg-circle-4 {
          width: 80px;
          height: 80px;
          bottom: 30%;
          left: 8%;
          background: rgba(255, 50, 50, 0.15);
          animation-delay: 0.5s;
        }

        .tg-circle-5 {
          width: 60px;
          height: 60px;
          top: 55%;
          right: 20%;
          background: rgba(255, 107, 53, 0.2);
          animation-delay: 2s;
        }

        @keyframes floatMove {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.05);
          }
        }

        /* ============================================================
           CARD - Premium Dark
           ============================================================ */
        .tg-card {
          position: relative;
          z-index: 10;
          width: 90%;
          max-width: 400px;
          padding: 36px 24px 30px;
          border-radius: 32px;
          text-align: center;
          background: rgba(20, 10, 15, 0.85);
          border: 1px solid rgba(255, 107, 53, 0.2);
          backdrop-filter: blur(24px);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.8),
            0 0 60px rgba(255, 107, 53, 0.1),
            inset 0 1px 0 rgba(255, 107, 53, 0.1);
          animation: cardEntry 0.8s cubic-bezier(0.21, 1.02, 0.73, 1);
          transition: all 0.5s ease;
        }

        .tg-card.success {
          border-color: rgba(255, 107, 53, 0.5);
          box-shadow: 0 0 60px rgba(255, 107, 53, 0.2);
        }

        .tg-card.error {
          border-color: rgba(255, 50, 50, 0.5);
          box-shadow: 0 0 60px rgba(255, 50, 50, 0.2);
        }

        .tg-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 32px;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(255, 107, 53, 0.6),
            rgba(255, 50, 50, 0.4),
            rgba(255, 107, 53, 0.1)
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .tg-card.success::before {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.8), rgba(255, 200, 50, 0.4));
        }

        .tg-card.error::before {
          background: linear-gradient(135deg, rgba(255, 50, 50, 0.8), rgba(200, 0, 0, 0.4));
        }

        @keyframes cardEntry {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ============================================================
           PREMIUM BADGE - Orange/Red
           ============================================================ */
        .tg-premium-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          margin-bottom: 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.2px;
          color: #fff;
          background: linear-gradient(90deg, #ff6b35, #ff3333);
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.3);
          animation: badgePulse 2s ease-in-out infinite;
        }

        .tg-premium-star {
          color: #ffd700;
          font-size: 12px;
        }

        @keyframes badgePulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 107, 53, 0.6);
          }
        }

        /* ============================================================
           SUCCESS CHECKMARK - Orange
           ============================================================ */
        .tg-success-check {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 50px;
          height: 50px;
          animation: successPop 0.6s cubic-bezier(0.21, 1.02, 0.73, 1);
        }

        .tg-success-check svg {
          width: 100%;
          height: 100%;
        }

        .tg-success-check circle {
          stroke: #ff6b35;
          stroke-width: 3;
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: checkCircle 0.6s ease forwards 0.3s;
        }

        .tg-success-check path {
          stroke: #ff6b35;
          stroke-width: 3;
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: checkPath 0.4s ease forwards 0.6s;
        }

        @keyframes checkCircle {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes checkPath {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes successPop {
          0% {
            transform: scale(0);
          }
          60% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        /* ============================================================
           ERROR ICON - Red
           ============================================================ */
        .tg-error-icon {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 50px;
          height: 50px;
          animation: errorPop 0.5s cubic-bezier(0.21, 1.02, 0.73, 1);
        }

        .tg-error-icon svg {
          width: 100%;
          height: 100%;
        }

        .tg-error-icon circle {
          stroke: #ff3333;
          stroke-width: 3;
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: errorCircle 0.5s ease forwards 0.2s;
        }

        .tg-error-icon line {
          stroke: #ff3333;
          stroke-width: 3;
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: errorLine 0.3s ease forwards 0.5s;
        }

        @keyframes errorCircle {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes errorLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes errorPop {
          0% {
            transform: scale(0) rotate(-45deg);
          }
          60% {
            transform: scale(1.2) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0);
          }
        }

        /* ============================================================
           IMAGE BOX - Orange glow
           ============================================================ */
        .tg-image-box {
          width: 170px;
          height: 170px;
          margin: 0 auto 18px;
          border-radius: 28px;
          overflow: hidden;
          position: relative;
          box-shadow:
            0 0 30px rgba(255, 107, 53, 0.4),
            0 0 60px rgba(255, 50, 50, 0.15);
          animation: imagePulse 2.5s ease-in-out infinite;
        }

        .tg-image-box.success-pulse {
          animation: successPulse 1.5s ease-in-out infinite;
        }

        @keyframes successPulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
          }
          50% {
            box-shadow: 0 0 60px rgba(255, 107, 53, 0.8), 0 0 90px rgba(255, 107, 53, 0.3);
          }
        }

        .tg-image-box::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 70%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15),
            transparent
          );
          animation: shine 3s infinite;
        }

        @keyframes shine {
          0% {
            left: -100%;
          }
          60%, 100% {
            left: 120%;
          }
        }

        .tg-image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .tg-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.2), transparent 50%);
        }

        .tg-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ff6b35, #ff3333, transparent);
          animation: scanLine 2s linear infinite;
        }

        @keyframes scanLine {
          0% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        .tg-premium-ring {
          position: absolute;
          inset: -8px;
          border-radius: 32px;
          border: 2px solid transparent;
          background: linear-gradient(135deg, #ff6b35, #ff3333, #ff6b35) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: ringRotate 4s linear infinite;
        }

        @keyframes ringRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes imagePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }

        /* ============================================================
           TITLE - Orange and Red
           ============================================================ */
        .tg-title {
          margin: 0;
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 0.5px;
          position: relative;
        }

        .tg-title-orange {
          color: #ff6b35;
          text-shadow: 0 0 25px rgba(255, 107, 53, 0.5);
        }

        .tg-title-red {
          color: #ff3333;
          text-shadow: 0 0 25px rgba(255, 50, 50, 0.5);
        }

        .tg-title-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          animation: titleShine 4s infinite;
        }

        @keyframes titleShine {
          0% {
            transform: translateX(-100%);
          }
          50%, 100% {
            transform: translateX(100%);
          }
        }

        /* ============================================================
           SUBTITLE
           ============================================================ */
        .tg-subtitle {
          margin: 8px 0 20px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          letter-spacing: 0.5px;
          font-weight: 400;
        }

        /* ============================================================
           LOADER - Orange/Red
           ============================================================ */
        .tg-loader-area {
          position: relative;
          width: 72px;
          height: 72px;
          margin: 0 auto 18px;
        }

        .tg-ring {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.08);
          border-top-color: #ff6b35;
          border-right-color: #ff3333;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.25);
        }

        .tg-ring-dot {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffffff, #ff6b35);
          box-shadow: 0 0 20px #ff6b35;
          transform: translateX(-50%);
        }

        .tg-ring-pulse {
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          border: 2px solid rgba(255, 107, 53, 0.15);
          animation: ringPulse 1.5s ease-out infinite;
        }

        @keyframes ringPulse {
          0% {
            transform: scale(0.9);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        /* ============================================================
           LOADING TEXT
           ============================================================ */
        .tg-loading-text {
          margin: 0 0 10px;
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.4px;
        }

        .tg-success-text {
          color: #ff6b35;
        }

        .tg-dots span {
          animation: dotsBlink 1.4s infinite;
        }

        .tg-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .tg-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotsBlink {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
        }

        /* ============================================================
           PROGRESS - Orange/Red
           ============================================================ */
        .tg-progress-percent {
          margin-bottom: 8px;
          color: #ff6b35;
          font-size: 20px;
          font-weight: 900;
          text-shadow: 0 0 15px rgba(255, 107, 53, 0.5);
          transition: all 0.4s ease;
        }

        .tg-progress {
          width: 100%;
          height: 8px;
          border-radius: 50px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
          transition: all 0.5s ease;
        }

        .tg-progress.success {
          background: rgba(255, 107, 53, 0.12);
          box-shadow: 0 0 20px rgba(255, 107, 53, 0.08);
        }

        .tg-progress.error {
          background: rgba(255, 50, 50, 0.12);
          box-shadow: 0 0 20px rgba(255, 50, 50, 0.08);
        }

        .tg-progress-fill {
          height: 100%;
          border-radius: 50px;
          background: linear-gradient(90deg, #ff6b35, #ff3333, #ff6b35);
          background-size: 200% 100%;
          transition: width 0.3s ease;
          position: relative;
          box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
          animation: gradientMove 2s linear infinite;
        }

        @keyframes gradientMove {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 0%;
          }
        }

        .tg-progress-fill.success {
          background: linear-gradient(90deg, #ff6b35, #ffd700, #ff6b35);
          background-size: 200% 100%;
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
        }

        .tg-progress-fill.error {
          background: linear-gradient(90deg, #ff3333, #cc0000, #ff3333);
          background-size: 200% 100%;
          box-shadow: 0 0 30px rgba(255, 50, 50, 0.5);
        }

        .tg-progress-glow {
          position: absolute;
          top: -2px;
          right: 0;
          width: 40px;
          height: 12px;
          background: radial-gradient(ellipse, rgba(255,255,255,0.2), transparent);
          filter: blur(4px);
        }

        /* ============================================================
           BOTTOM TEXT
           ============================================================ */
        .tg-bottom-text {
          margin-top: 16px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .tg-bottom-text.success {
          color: #ff6b35;
        }

        .tg-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff6b35;
          animation: dotPulse 1s ease-in-out infinite;
          display: inline-block;
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.6);
          }
        }

        /* ============================================================
           ERROR
           ============================================================ */
        .tg-error-text {
          margin-top: 14px;
          color: #ff6b6b;
          font-size: 14px;
          font-weight: 600;
        }

        .tg-retry-btn {
          margin-top: 14px;
          border: none;
          outline: none;
          padding: 10px 24px;
          border-radius: 999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(90deg, #ff6b35, #ff3333);
          box-shadow: 0 0 25px rgba(255, 107, 53, 0.4);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .tg-retry-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 0 40px rgba(255, 107, 53, 0.6);
        }

        .tg-retry-btn:active {
          transform: scale(0.95);
        }

        .tg-retry-btn svg {
          stroke: #fff;
        }

        /* ============================================================
           CREDIT - Orange/Red
           ============================================================ */
        .tg-credit {
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: rgba(255, 255, 255, 0.25);
        }

        .tg-code-icon {
          color: #ff6b35;
          font-size: 13px;
          font-weight: 900;
        }

        .tg-credit-name {
          color: rgba(255, 255, 255, 0.4);
        }

        .tg-credit-dot {
          color: rgba(255, 255, 255, 0.12);
        }

        .tg-credit-version {
          background: linear-gradient(90deg, #ff6b35, #ff3333);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          font-size: 10px;
        }

        /* ============================================================
           KEYFRAMES
           ============================================================ */
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ============================================================
           RESPONSIVE
           ============================================================ */
        @media (max-width: 480px) {
          .tg-card {
            max-width: 340px;
            padding: 28px 18px 24px;
            border-radius: 28px;
          }

          .tg-image-box {
            width: 140px;
            height: 140px;
            border-radius: 24px;
          }

          .tg-title {
            font-size: 28px;
          }

          .tg-subtitle {
            font-size: 13px;
          }

          .tg-loading-text {
            font-size: 14px;
          }

          .tg-loader-area {
            width: 60px;
            height: 60px;
          }

          .tg-ring {
            width: 60px;
            height: 60px;
          }

          .tg-progress-percent {
            font-size: 17px;
          }

          .tg-circle-1 {
            width: 80px;
            height: 80px;
          }

          .tg-circle-2 {
            width: 100px;
            height: 100px;
          }

          .tg-circle-3 {
            width: 60px;
            height: 60px;
          }

          .tg-glow-1 {
            width: 150px;
            height: 150px;
            top: -40px;
            right: -40px;
          }

          .tg-glow-2 {
            width: 120px;
            height: 120px;
            bottom: -30px;
            left: -30px;
          }

          .tg-premium-badge {
            font-size: 8px;
            padding: 4px 12px;
          }
        }

        @media (max-width: 380px) {
          .tg-card {
            max-width: 290px;
            padding: 22px 14px 20px;
          }

          .tg-image-box {
            width: 110px;
            height: 110px;
          }

          .tg-title {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default TelegramLoading;