// src/pages/DownloadTradingJouranl.jsx
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function DownloadTradingJouranl() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const headers = useMemo(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const [loading, setLoading] = useState(false);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [segmentLoading, setSegmentLoading] = useState(false);

  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);

  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [downloading, setDownloading] = useState("");

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  const [popup, setPopup] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  const currentMonthName = useMemo(() => {
    const [year, mon] = month.split("-");
    const d = new Date(Number(year), Number(mon) - 1, 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [month]);

  const openPopup = (type, title, message) => {
    setPopup({
      open: true,
      type,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopup({
      open: false,
      type: "",
      title: "",
      message: "",
    });
  };

  const getPlatforms = async () => {
    try {
      setPlatformLoading(true);

      const res = await fetch(
        `${BASE_URL}/api/investment/platform-segment/platform`,
        {
          headers,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load platforms");
      }

      setPlatforms(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      openPopup("error", "Platform Error", error.message || "Platform fetch failed");
    } finally {
      setPlatformLoading(false);
    }
  };

  const getSegments = async (pid) => {
    try {
      if (!pid) {
        setSegments([]);
        setSegmentId("");
        return;
      }

      setSegmentLoading(true);

      const res = await fetch(
        `${BASE_URL}/api/investment/platform-segment/segment?platform_id=${pid}`,
        {
          headers,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load segments");
      }

      setSegments(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      openPopup("error", "Segment Error", error.message || "Segment fetch failed");
    } finally {
      setSegmentLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    getPlatforms().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getSegments(platformId);
  }, [platformId]);

  useEffect(() => {
    if (popup.open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
  }, [popup.open]);

  const buildQueryString = () => {
    const params = new URLSearchParams();

    if (month) params.append("month", `${month}-01`);
    if (platformId) params.append("platform_id", platformId);
    if (segmentId) params.append("segment_id", segmentId);

    return params.toString();
  };

  const downloadFile = async (type) => {
    try {
      setDownloading(type);

      const query = buildQueryString();
      const endpoint =
        type === "pdf"
          ? `${BASE_URL}/api/investment/tradingjournal-view/export/pdf?${query}`
          : `${BASE_URL}/api/investment/tradingjournal-view/export/txt?${query}`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        let msg = `Failed to download ${type.toUpperCase()}`;
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {
          // ignore json parse issue
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const fileUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = fileUrl;
      a.download =
        type === "pdf"
          ? `trading_journal_${month}.pdf`
          : `trading_journal_${month}.txt`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(fileUrl);

      openPopup(
        "success",
        "Download Complete",
        type === "pdf"
          ? "Professional PDF file downloaded successfully."
          : "Text file downloaded successfully."
      );
    } catch (error) {
      openPopup(
        "error",
        "Download Failed",
        error.message || "Unable to download file."
      );
    } finally {
      setDownloading("");
    }
  };

  const resetFilters = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");

    setMonth(`${yyyy}-${mm}`);
    setPlatformId("");
    setSegmentId("");
    setSegments([]);
  };

  return (
    <div className="dtj-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
        }

        body {
          font-family: "Plus Jakarta Sans", sans-serif;
          background: #f8fafc;
        }

        .dtj-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,.12), transparent 34%),
            radial-gradient(circle at top right, rgba(139,92,246,.12), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
          color: #0f172a;
          padding: 18px 12px 28px;
        }

        .dtj-container {
          width: 100%;
          max-width: 1150px;
          margin: 0 auto;
        }

        .dtj-hero {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(135deg, #0f172a 0%, #111827 45%, #1e293b 100%);
          padding: 20px 16px 18px;
          box-shadow: 0 20px 45px rgba(15,23,42,.16);
          border: 1px solid rgba(255,255,255,.06);
        }

        .dtj-hero::before {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: rgba(59,130,246,.18);
          top: -80px;
          right: -50px;
          filter: blur(10px);
        }

        .dtj-hero::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          background: rgba(168,85,247,.18);
          bottom: -70px;
          left: -40px;
          filter: blur(10px);
        }

        .dtj-heroInner {
          position: relative;
          z-index: 2;
        }

        .dtj-topTag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.12);
          color: #e2e8f0;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .6px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .dtj-title {
          margin: 0;
          color: #ffffff;
          font-size: 23px;
          font-weight: 900;
          line-height: 1.18;
        }

        .dtj-subtitle {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.7;
          max-width: 760px;
        }

        .dtj-monthBadge {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,.12);
          font-size: 11px;
          font-weight: 800;
        }

        .dtj-panel {
          margin-top: 16px;
          background: rgba(255,255,255,.92);
          border: 1px solid rgba(15,23,42,.08);
          border-radius: 24px;
          box-shadow: 0 16px 40px rgba(15,23,42,.07);
          overflow: hidden;
        }

        .dtj-panelHead {
          padding: 16px 16px 10px;
          border-bottom: 1px solid rgba(15,23,42,.06);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .dtj-panelTitle {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }

        .dtj-panelSub {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .dtj-panelBody {
          padding: 14px;
        }

        .dtj-filters {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .dtj-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .dtj-label {
          font-size: 10px;
          font-weight: 900;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .5px;
          margin-left: 2px;
        }

        .dtj-input,
        .dtj-select {
          width: 100%;
          border: 1px solid rgba(15,23,42,.12);
          background: #ffffff;
          min-height: 42px;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          transition: .2s ease;
          box-shadow: inset 0 1px 2px rgba(15,23,42,.03);
        }

        .dtj-input:focus,
        .dtj-select:focus {
          border-color: rgba(37,99,235,.35);
          box-shadow: 0 0 0 4px rgba(37,99,235,.08);
        }

        .dtj-select:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .dtj-actionBar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .dtj-btn {
          border: 0;
          outline: none;
          min-height: 40px;
          padding: 0 15px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: .2s ease;
          box-shadow: 0 10px 24px rgba(15,23,42,.08);
          white-space: nowrap;
        }

        .dtj-btn:disabled {
          opacity: .7;
          cursor: not-allowed;
        }

        .dtj-btnPdf {
          background: linear-gradient(135deg, #111827, #1f2937);
          color: #ffffff;
        }

        .dtj-btnPdf:hover {
          transform: translateY(-1px);
        }

        .dtj-btnTxt {
          background: #ffffff;
          color: #111827;
          border: 1px solid rgba(15,23,42,.12);
        }

        .dtj-btnTxt:hover {
          transform: translateY(-1px);
          background: #f8fafc;
        }

        .dtj-btnReset {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid rgba(37,99,235,.12);
        }

        .dtj-btnReset:hover {
          transform: translateY(-1px);
        }

        .dtj-loadingText {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          margin-left: 4px;
        }

        .dtj-footerLine {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          margin-top: 40px;
          padding: 18px 12px;
        }

        .dtj-footerText {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: .2px;
        }

        .dtj-codeIcon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #111827, #334155);
          color: #ffffff;
          font-size: 16px;
          box-shadow: 0 12px 24px rgba(15,23,42,.14);
          flex-shrink: 0;
        }

        .dtj-popupOverlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(15, 23, 42, 0.42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }

        .dtj-popupCard {
          width: min(420px, 94vw);
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 28px 70px rgba(15,23,42,.28);
          overflow: hidden;
          animation: dtjPopIn .18s ease-out;
        }

        @keyframes dtjPopIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dtj-popupTop {
          padding: 22px 20px 12px;
          text-align: center;
        }

        .dtj-popupIcon {
          width: 64px;
          height: 64px;
          margin: 0 auto 14px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(15,23,42,.10);
        }

        .dtj-popupIcon.success {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #15803d;
        }

        .dtj-popupIcon.error {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #dc2626;
        }

        .dtj-popupTitle {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
        }

        .dtj-popupMessage {
          margin: 10px 0 0;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          line-height: 1.7;
        }

        .dtj-popupFooter {
          padding: 16px 20px 20px;
          display: flex;
          justify-content: center;
        }

        .dtj-popupBtn {
          min-width: 110px;
          min-height: 42px;
          border: 0;
          border-radius: 12px;
          padding: 0 18px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          color: #ffffff;
          background: linear-gradient(135deg, #111827, #1f2937);
          box-shadow: 0 12px 24px rgba(15,23,42,.14);
        }

        .dtj-popupBtn:hover {
          transform: translateY(-1px);
        }

        @media (min-width: 640px) {
          .dtj-root {
            padding: 24px 18px 32px;
          }

          .dtj-hero {
            padding: 24px 22px 22px;
          }

          .dtj-title {
            font-size: 28px;
          }

          .dtj-subtitle {
            font-size: 13px;
          }

          .dtj-filters {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (min-width: 992px) {
          .dtj-title {
            font-size: 34px;
          }

          .dtj-panelHead {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .dtj-panelBody {
            padding: 16px;
          }

          .dtj-footerLine {
            margin-top: 60px;
          }

          .dtj-footerText {
            font-size: 16px;
          }

          .dtj-popupCard {
            width: min(460px, 92vw);
          }
        }
      `}</style>

      <div className="dtj-container">
        <div className="dtj-hero">
          <div className="dtj-heroInner">
            <div className="dtj-topTag">Trading Journal Export</div>
            <h1 className="dtj-title">Download Trading Journal</h1>
            <p className="dtj-subtitle">
              Export your journal in a clean professional format. Select month, platform,
              and segment if needed, then download PDF or text instantly.
            </p>
            <div className="dtj-monthBadge">Selected Month: {currentMonthName}</div>
          </div>
        </div>

        <div className="dtj-panel">
          <div className="dtj-panelHead">
            <div>
              <h2 className="dtj-panelTitle">Export Filters</h2>
              <p className="dtj-panelSub">
                Month is required by default. Platform and segment are optional.
              </p>
            </div>
          </div>

          <div className="dtj-panelBody">
            <div className="dtj-filters">
              <div className="dtj-field">
                <label className="dtj-label">Month</label>
                <input
                  type="month"
                  className="dtj-input"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>

              <div className="dtj-field">
                <label className="dtj-label">Platform</label>
                <select
                  className="dtj-select"
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  disabled={platformLoading}
                >
                  <option value="">All Platforms</option>
                  {platforms.map((item) => (
                    <option key={item.platform_id} value={item.platform_id}>
                      {item.platform_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dtj-field">
                <label className="dtj-label">Segment</label>
                <select
                  className="dtj-select"
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  disabled={!platformId || segmentLoading}
                >
                  <option value="">All Segments</option>
                  {segments.map((item) => (
                    <option key={item.segment_id} value={item.segment_id}>
                      {item.segment_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dtj-actionBar">
              <button
                type="button"
                className="dtj-btn dtj-btnPdf"
                onClick={() => downloadFile("pdf")}
                disabled={downloading === "pdf" || loading}
              >
                {downloading === "pdf" ? "Downloading..." : "Download PDF"}
              </button>

              <button
                type="button"
                className="dtj-btn dtj-btnTxt"
                onClick={() => downloadFile("txt")}
                disabled={downloading === "txt" || loading}
              >
                {downloading === "txt" ? "Downloading..." : "Download Text"}
              </button>

              <button
                type="button"
                className="dtj-btn dtj-btnReset"
                onClick={resetFilters}
                disabled={downloading === "pdf" || downloading === "txt"}
              >
                Reset
              </button>

              {(platformLoading || segmentLoading) && (
                <span className="dtj-loadingText">
                  {platformLoading
                    ? "Loading platforms..."
                    : segmentLoading
                    ? "Loading segments..."
                    : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="dtj-footerLine">
          <div className="dtj-footerText">
            <span className="dtj-codeIcon">&lt;/&gt;</span>
            <span>Developer by Ajay Kedar</span>
          </div>
        </div>
      </div>

      {popup.open && (
        <div className="dtj-popupOverlay" onClick={closePopup}>
          <div className="dtj-popupCard" onClick={(e) => e.stopPropagation()}>
            <div className="dtj-popupTop">
              <div className={`dtj-popupIcon ${popup.type === "success" ? "success" : "error"}`}>
                {popup.type === "success" ? "✓" : "!"}
              </div>
              <h3 className="dtj-popupTitle">{popup.title}</h3>
              <p className="dtj-popupMessage">{popup.message}</p>
            </div>

            <div className="dtj-popupFooter">
              <button type="button" className="dtj-popupBtn" onClick={closePopup}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}