import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import telegramImage from "../../assets/telegram-icon.png.png";

const TelegramLoading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/teligram-channels", { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="tg-loading-page">
      {/* Background Image */}
      <div
        className="tg-bg-image"
        style={{ backgroundImage: `url(${telegramImage})` }}
      ></div>

      {/* Dark Gradient */}
      <div className="tg-overlay"></div>

      {/* Floating Glow Circles */}
      <div className="tg-circle tg-circle-1"></div>
      <div className="tg-circle tg-circle-2"></div>
      <div className="tg-circle tg-circle-3"></div>

      {/* Main Card */}
      <div className="tg-card">
        <div className="tg-image-box">
          <img src={telegramImage} alt="Teligram Premium" />
        </div>

        <h1 className="tg-title">
          Teligram <span>Premium</span>
        </h1>

        <p className="tg-subtitle">Secure premium channels loading</p>

        <div className="tg-loader-area">
          <div className="tg-ring"></div>
          <div className="tg-ring-dot"></div>
        </div>

        <p className="tg-loading-text">
          Loading Telegram Channels
          <span className="tg-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>

        <div className="tg-progress">
          <div className="tg-progress-fill"></div>
        </div>

        <div className="tg-bottom-text">Please wait, preparing your access</div>

        <div className="tg-credit">
          <span className="tg-code-icon">&lt;/&gt;</span>
          <span className="tg-credit-name">Ajay kedar</span>
        </div>
      </div>

      <style>{`
        .tg-loading-page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #020b14;
          font-family: Arial, sans-serif;
        }

        .tg-bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transform: scale(1.12);
          filter: blur(12px);
          opacity: 0.42;
          animation: bgZoom 5s ease-in-out infinite alternate;
        }

        .tg-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at center, rgba(0, 136, 255, 0.32), transparent 35%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.92));
        }

        .tg-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
          opacity: 0.7;
          animation: floatMove 5s ease-in-out infinite;
        }

        .tg-circle-1 {
          width: 120px;
          height: 120px;
          top: 12%;
          left: 8%;
          background: rgba(0, 198, 255, 0.22);
        }

        .tg-circle-2 {
          width: 160px;
          height: 160px;
          bottom: 10%;
          right: 7%;
          background: rgba(76, 255, 107, 0.16);
          animation-delay: 1s;
        }

        .tg-circle-3 {
          width: 80px;
          height: 80px;
          top: 20%;
          right: 15%;
          background: rgba(0, 136, 255, 0.25);
          animation-delay: 2s;
        }

        .tg-card {
          position: relative;
          z-index: 10;
          width: 90%;
          max-width: 385px;
          padding: 32px 22px 28px;
          border-radius: 30px;
          text-align: center;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(20px);
          box-shadow:
            0 25px 70px rgba(0, 0, 0, 0.65),
            0 0 40px rgba(0, 136, 255, 0.28),
            inset 0 0 25px rgba(255, 255, 255, 0.04);
          animation: cardEntry 0.9s ease;
        }

        .tg-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 30px;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(0, 198, 255, 0.8),
            rgba(76, 255, 107, 0.5),
            rgba(255, 255, 255, 0.08)
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .tg-image-box {
          width: 175px;
          height: 175px;
          margin: 0 auto 18px;
          border-radius: 30px;
          overflow: hidden;
          position: relative;
          box-shadow:
            0 0 28px rgba(0, 198, 255, 0.75),
            0 0 55px rgba(76, 255, 107, 0.25);
          animation: imagePulse 2.2s ease-in-out infinite;
        }

        .tg-image-box::after {
          content: "";
          position: absolute;
          top: 0;
          left: -90%;
          width: 70%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          animation: shine 2.6s infinite;
        }

        .tg-image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .tg-title {
          margin: 0;
          color: #00c6ff;
          font-size: 34px;
          font-weight: 900;
          letter-spacing: 0.6px;
          text-shadow: 0 0 18px rgba(0, 198, 255, 0.65);
        }

        .tg-title span {
          color: #4cff6b;
          text-shadow: 0 0 18px rgba(76, 255, 107, 0.65);
        }

        .tg-subtitle {
          margin: 8px 0 22px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px;
          letter-spacing: 0.4px;
        }

        .tg-loader-area {
          position: relative;
          width: 68px;
          height: 68px;
          margin: 0 auto 20px;
        }

        .tg-ring {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          border: 5px solid rgba(255, 255, 255, 0.15);
          border-top-color: #00c6ff;
          border-right-color: #4cff6b;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 24px rgba(0, 198, 255, 0.45);
        }

        .tg-ring-dot {
          position: absolute;
          top: 5px;
          left: 50%;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 15px #ffffff;
          transform: translateX(-50%);
        }

        .tg-loading-text {
          margin: 0 0 22px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.4px;
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

        .tg-progress {
          width: 100%;
          height: 9px;
          border-radius: 50px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.16);
          box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.35);
        }

        .tg-progress-fill {
          width: 0%;
          height: 100%;
          border-radius: 50px;
          background: linear-gradient(
            90deg,
            #0088ff,
            #00c6ff,
            #4cff6b
          );
          animation: progressFill 2.8s linear forwards;
          box-shadow: 0 0 18px rgba(0, 198, 255, 0.7);
        }

        .tg-bottom-text {
          margin-top: 15px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          letter-spacing: 0.3px;
        }

        .tg-credit {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.35px;
        }

        .tg-code-icon {
          color: #ff3333;
          font-size: 12px;
          font-weight: 900;
        }

        .tg-credit-name {
          color: #ffffff;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes progressFill {
          from {
            width: 0%;
          }

          to {
            width: 100%;
          }
        }

        @keyframes dotsBlink {
          0%, 100% {
            opacity: 0.25;
          }

          50% {
            opacity: 1;
          }
        }

        @keyframes cardEntry {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.96);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes imagePulse {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.045);
          }
        }

        @keyframes shine {
          0% {
            left: -90%;
          }

          45%, 100% {
            left: 120%;
          }
        }

        @keyframes floatMove {
          0%, 100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-22px) scale(1.08);
          }
        }

        @keyframes bgZoom {
          from {
            transform: scale(1.1);
          }

          to {
            transform: scale(1.17);
          }
        }

        @media (max-width: 480px) {
          .tg-card {
            max-width: 330px;
            padding: 28px 18px 25px;
            border-radius: 26px;
          }

          .tg-image-box {
            width: 145px;
            height: 145px;
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
        }
      `}</style>
    </div>
  );
};

export default TelegramLoading;