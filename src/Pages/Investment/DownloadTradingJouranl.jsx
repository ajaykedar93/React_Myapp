// src/pages/DownloadTradingJouranl.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function DownloadTradingJouranl() {
  const popupTimerRef = useRef(null);
  const hiddenFrameRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [downloading, setDownloading] = useState("");

  const [platforms, setPlatforms] = useState([]);
  const [segments, setSegments] = useState([]);

  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");
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

  const token = useMemo(() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }, []);

  const headers = useMemo(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const currentMonthName = useMemo(() => {
    if (!month) return "";
    const [year, mon] = month.split("-");
    const d = new Date(Number(year), Number(mon) - 1, 1);
    if (Number.isNaN(d.getTime())) return month;
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [month]);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  const isSafari = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua);
  }, []);

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const openPopup = (type, title, message, autoCloseMs = 1400) => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }

    setPopup({
      open: true,
      type,
      title,
      message,
    });

    if (autoCloseMs > 0) {
      popupTimerRef.current = setTimeout(() => {
        setPopup({
          open: false,
          type: "",
          title: "",
          message: "",
        });
        popupTimerRef.current = null;
      }, autoCloseMs);
    }
  };

  const closePopup = () => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }

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
          method: "GET",
          headers,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load platforms");
      }

      setPlatforms(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      openPopup(
        "error",
        "Platform Error",
        error?.message || "Platform fetch failed",
        1600
      );
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
        `${BASE_URL}/api/investment/platform-segment/segment?platform_id=${encodeURIComponent(
          pid
        )}`,
        {
          method: "GET",
          headers,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load segments");
      }

      setSegments(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      openPopup(
        "error",
        "Segment Error",
        error?.message || "Segment fetch failed",
        1600
      );
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
      const oldOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = oldOverflow || "";
      };
    }
  }, [popup.open]);

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  const buildQueryString = () => {
    const params = new URLSearchParams();

    if (month) params.append("month", `${month}-01`);
    if (platformId) params.append("platform_id", platformId);
    if (segmentId) params.append("segment_id", segmentId);

    return params.toString();
  };

  const buildEndpoint = (type) => {
    const query = buildQueryString();
    const path =
      type === "pdf"
        ? "/api/investment/tradingjournal-view/export/pdf"
        : "/api/investment/tradingjournal-view/export/txt";

    return query ? `${BASE_URL}${path}?${query}` : `${BASE_URL}${path}`;
  };

  const getFallbackFileName = (type) => {
    return type === "pdf"
      ? `trading_journal_${month || "report"}.pdf`
      : `trading_journal_${month || "report"}.txt`;
  };

  const getFilenameFromDisposition = (contentDisposition, fallbackName) => {
    if (!contentDisposition) return fallbackName;

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        return utfMatch[1];
      }
    }

    const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (normalMatch?.[1]) return normalMatch[1];

    return fallbackName;
  };

  const getAuthErrorMessage = (status) => {
    if (status === 401) return "Login expired. Please login again.";
    if (status === 403) return "You do not have permission to download this file.";
    if (status === 404) return "No data found for selected filters.";
    return "";
  };

  const openBlobInNewTab = (blob) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 20000);
    return !!win;
  };

  const downloadWithAnchor = (blob, fileName) => {
    const blobUrl = window.URL.createObjectURL(blob);

    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 15000);

      return true;
    } catch {
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 15000);
      return false;
    }
  };

  const downloadWithMsSaveBlob = (blob, fileName) => {
    try {
      if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === "function") {
        window.navigator.msSaveOrOpenBlob(blob, fileName);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const openByHiddenIframe = (url) => {
    try {
      if (!hiddenFrameRef.current) {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.setAttribute("aria-hidden", "true");
        document.body.appendChild(iframe);
        hiddenFrameRef.current = iframe;
      }

      hiddenFrameRef.current.src = url;
      return true;
    } catch {
      return false;
    }
  };

  const saveBlobBestWay = async (blob, fileName, type) => {
    if (downloadWithMsSaveBlob(blob, fileName)) {
      return { ok: true, mode: "download" };
    }

    if (downloadWithAnchor(blob, fileName)) {
      return { ok: true, mode: "download" };
    }

    if (type === "pdf" && openBlobInNewTab(blob)) {
      return { ok: true, mode: "open" };
    }

    return { ok: false, mode: "" };
  };

  const downloadFile = async (type) => {
    try {
      if (!token) {
        openPopup("error", "Login Required", "Token not found. Please login first.", 1700);
        return;
      }

      setDownloading(type);

      const endpoint = buildEndpoint(type);
      const fallbackName = getFallbackFileName(type);

      const res = await fetch(endpoint, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        let msg = getAuthErrorMessage(res.status) || `Failed to download ${type.toUpperCase()}`;

        const contentType = (res.headers.get("content-type") || "").toLowerCase();
        try {
          if (contentType.includes("application/json")) {
            const err = await res.json();
            msg = err?.message || msg;
          } else {
            const txt = await res.text();
            if (txt) msg = txt;
          }
        } catch {
          // ignore parse error
        }

        throw new Error(msg);
      }

      const contentDisposition = res.headers.get("content-disposition") || "";
      const fileName = getFilenameFromDisposition(contentDisposition, fallbackName);
      const blob = await res.blob();

      if (!blob || blob.size === 0) {
        throw new Error("Downloaded file is empty.");
      }

      const result = await saveBlobBestWay(blob, fileName, type);

      if (result.ok) {
        openPopup(
          "success",
          "Download Started",
          result.mode === "open"
            ? `${type.toUpperCase()} opened successfully.`
            : `${type.toUpperCase()} download started successfully.`,
          1300
        );
        return;
      }

      // Final direct open fallback for mobile / Safari
      if ((isIOS || isSafari || isMobile) && type === "pdf") {
        const opened = openBlobInNewTab(blob);
        if (opened) {
          openPopup(
            "success",
            "Opened Successfully",
            "PDF opened in browser. You can save or share it from there.",
            1800
          );
          return;
        }
      }

      // Final fallback: direct endpoint open in new tab
      const finalUrl = endpoint;
      const openedWindow = window.open(finalUrl, "_blank", "noopener,noreferrer");
      if (openedWindow) {
        openPopup(
          "success",
          "Opened Successfully",
          "File opened in browser download window.",
          1500
        );
        return;
      }

      // Final hidden iframe fallback
      const iframeOk = openByHiddenIframe(finalUrl);
      if (iframeOk) {
        openPopup(
          "success",
          "Download Requested",
          "Download request sent to browser.",
          1500
        );
        return;
      }

      throw new Error("Browser blocked the download. Please allow popups/downloads and try again.");
    } catch (error) {
      openPopup(
        "error",
        "Download Failed",
        error?.message || "Unable to download file.",
        1800
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

        * { box-sizing: border-box; }

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
          width: 100%;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,.12), transparent 34%),
            radial-gradient(circle at top right, rgba(139,92,246,.12), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
          color: #0f172a;
          padding: 14px 10px 30px;
        }

        .dtj-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .dtj-hero {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          background: linear-gradient(135deg, #0f172a 0%, #111827 45%, #1e293b 100%);
          padding: 20px 16px 18px;
          box-shadow: 0 20px 45px rgba(15,23,42,.16);
          border: 1px solid rgba(255,255,255,.06);
        }

        .dtj-hero::before {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          border-radius: 999px;
          background: rgba(59,130,246,.18);
          top: -80px;
          right: -50px;
          filter: blur(10px);
        }

        .dtj-hero::after {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
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
          font-size: 22px;
          font-weight: 900;
          line-height: 1.18;
        }

        .dtj-subtitle {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.7;
          max-width: 800px;
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
          flex-wrap: wrap;
        }

        .dtj-panel {
          margin-top: 16px;
          background: rgba(255,255,255,.94);
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
          min-height: 46px;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          transition: .2s ease;
          box-shadow: inset 0 1px 2px rgba(15,23,42,.03);
          -webkit-appearance: none;
          appearance: none;
        }

        .dtj-input:focus,
        .dtj-select:focus {
          border-color: rgba(37,99,235,.35);
          box-shadow: 0 0 0 4px rgba(37,99,235,.08);
        }

        .dtj-select:disabled,
        .dtj-input:disabled {
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
          min-height: 46px;
          padding: 0 16px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: .2s ease;
          box-shadow: 0 10px 24px rgba(15,23,42,.08);
          white-space: nowrap;
          flex: 1 1 180px;
        }

        .dtj-btn:disabled {
          opacity: .72;
          cursor: not-allowed;
        }

        .dtj-btnPdf {
          background: linear-gradient(135deg, #111827, #1f2937);
          color: #ffffff;
        }

        .dtj-btnTxt {
          background: #ffffff;
          color: #111827;
          border: 1px solid rgba(15,23,42,.12);
        }

        .dtj-btnReset {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid rgba(37,99,235,.12);
        }

        .dtj-btn:hover {
          transform: translateY(-1px);
        }

        .dtj-loadingText {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          margin-left: 4px;
        }

        .dtj-noteBox {
          margin-top: 14px;
          border: 1px solid rgba(37,99,235,.10);
          background: #f8fbff;
          border-radius: 16px;
          padding: 12px 14px;
        }

        .dtj-noteTitle {
          margin: 0 0 5px;
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
        }

        .dtj-noteText {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          line-height: 1.6;
        }

        .dtj-footerLine {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          margin-top: 36px;
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
          flex-wrap: wrap;
          justify-content: center;
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
          background: rgba(15, 23, 42, 0.32);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
        }

        .dtj-popupCard {
          width: min(360px, 92vw);
          background: #ffffff;
          border-radius: 22px;
          border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 24px 60px rgba(15,23,42,.22);
          overflow: hidden;
          animation: dtjPopupIn .18s ease-out;
          padding: 20px 18px;
          text-align: center;
        }

        @keyframes dtjPopupIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dtj-popupIcon {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
          margin: 0 auto 12px;
          box-shadow: 0 10px 24px rgba(15,23,42,.12);
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
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }

        .dtj-popupMessage {
          margin: 8px 0 0;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          line-height: 1.5;
        }

        @media (min-width: 640px) {
          .dtj-root {
            padding: 22px 18px 32px;
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

          .dtj-btn {
            flex: 0 0 auto;
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
            margin-top: 55px;
          }

          .dtj-footerText {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="dtj-container">
        <div className="dtj-hero">
          <div className="dtj-heroInner">
            <div className="dtj-topTag">Trading Journal Export</div>
            <h1 className="dtj-title">Download Trading Journal</h1>
            <p className="dtj-subtitle">
              Export your journal in PDF or text format with direct browser-compatible
              download support for desktop and mobile devices.
            </p>
            <div className="dtj-monthBadge">
              Selected Month: {currentMonthName || "-"}
            </div>
          </div>
        </div>

        <div className="dtj-panel">
          <div className="dtj-panelHead">
            <div>
              <h2 className="dtj-panelTitle">Export Filters</h2>
              <p className="dtj-panelSub">
                Month is required. Platform and segment are optional.
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
                  disabled={downloading === "pdf" || downloading === "txt"}
                />
              </div>

              <div className="dtj-field">
                <label className="dtj-label">Platform</label>
                <select
                  className="dtj-select"
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  disabled={platformLoading || downloading === "pdf" || downloading === "txt"}
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
                  disabled={
                    !platformId ||
                    segmentLoading ||
                    downloading === "pdf" ||
                    downloading === "txt"
                  }
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
                disabled={downloading === "pdf" || !!loading}
              >
                {downloading === "pdf" ? "Downloading PDF..." : "Download PDF"}
              </button>

              <button
                type="button"
                className="dtj-btn dtj-btnTxt"
                onClick={() => downloadFile("txt")}
                disabled={downloading === "txt" || !!loading}
              >
                {downloading === "txt" ? "Downloading Text..." : "Download Text"}
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

            <div className="dtj-noteBox">
              <h3 className="dtj-noteTitle">Browser download support</h3>
              <p className="dtj-noteText">
                This page first tries direct file download. If a mobile browser blocks it,
                the file is opened in browser or requested through fallback mode so user can
                save it without error.
              </p>
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
            <div className={`dtj-popupIcon ${popup.type === "success" ? "success" : "error"}`}>
              {popup.type === "success" ? "✓" : "!"}
            </div>
            <h3 className="dtj-popupTitle">{popup.title}</h3>
            <p className="dtj-popupMessage">{popup.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}