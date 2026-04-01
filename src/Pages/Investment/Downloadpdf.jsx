// src/pages/Downloadpdf.jsx
import React, { useMemo, useState } from "react";

const BASE_URL = "http://localhost:5000";

export default function Downloadpdf() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const [month, setMonth] = useState(defaultMonth);
  const [platformId, setPlatformId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  const openPopup = (type, title, message) => {
    setPopup({
      open: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setPopup({
        open: false,
        type: "",
        title: "",
        message: "",
      });
    }, 2200);
  };

  const handleDownloadPdf = async () => {
    try {
      if (!token) {
        openPopup("error", "Login Required", "Please login first.");
        return;
      }

      setLoading(true);

      const qs = new URLSearchParams();

      if (month) qs.set("month", month);
      if (platformId.trim()) qs.set("platform_id", platformId.trim());
      if (segmentId.trim()) qs.set("segment_id", segmentId.trim());

      const url = `${BASE_URL}/api/investment/tradingjournal-pdf/export/pdf?${qs.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to download PDF";
        try {
          const result = await response.json();
          errorMessage = result.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = fileUrl;

      const safeMonth = month ? month.slice(0, 7) : "journal";
      link.download = `Trading_Journal_${safeMonth}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileUrl);

      openPopup("success", "Download Started", "PDF downloaded successfully.");
    } catch (error) {
      openPopup("error", "Download Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden;
          font-family: Inter, Arial, sans-serif;
          background: #f8fbff;
        }

        .fade-up {
          animation: fadeUp 0.35s ease;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pdf-btn {
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }

        .pdf-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
        }

        .pdf-btn:active {
          transform: scale(.98);
        }

        .pdf-input {
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .pdf-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37,99,235,.10);
          background: #fff !important;
        }

        @media (max-width: 767px) {
          .page-pad {
            padding: 10px !important;
          }

          .card-pad {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .title-main {
            font-size: 22px !important;
          }

          .grid-3 {
            grid-template-columns: 1fr !important;
          }

          .full-btn {
            width: 100% !important;
          }

          .popup-mobile {
            width: calc(100% - 20px) !important;
            max-width: 360px !important;
          }
        }
      `}</style>

      <div style={styles.container} className="page-pad">
        <div style={styles.header} className="fade-up">
          <h2 style={styles.title} className="title-main">
            Download Trading Journal PDF
          </h2>
          <p style={styles.subTitle}>
            Select filters and download professional journal PDF directly
          </p>
        </div>

        <div style={styles.card} className="card-pad fade-up">
          <div style={styles.cardTitle}>PDF Filters</div>

          <div style={styles.grid} className="grid-3">
            <div style={styles.field}>
              <label style={styles.label}>Month</label>
              <input
                type="date"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={styles.input}
                className="pdf-input"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Platform ID (Optional)</label>
              <input
                type="text"
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Enter platform id"
                style={styles.input}
                className="pdf-input"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Segment ID (Optional)</label>
              <input
                type="text"
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Enter segment id"
                style={styles.input}
                className="pdf-input"
              />
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading}
              style={{
                ...styles.downloadBtn,
                ...(loading ? styles.disabledBtn : {}),
              }}
              className="pdf-btn full-btn"
            >
              {loading ? "Downloading..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {popup.open && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupCard} className="popup-mobile fade-up">
            <div
              style={{
                ...styles.popupIcon,
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #16a34a, #22c55e)"
                    : "linear-gradient(135deg, #dc2626, #ef4444)",
              }}
            >
              {popup.type === "success" ? "✓" : "!"}
            </div>

            <h3 style={styles.popupTitle}>{popup.title}</h3>
            <p style={styles.popupMessage}>{popup.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(900px 520px at 10% 10%, rgba(124,58,237,.10), transparent 60%), radial-gradient(900px 520px at 92% 12%, rgba(37,99,235,.08), transparent 60%), linear-gradient(180deg, #f8fbff 0%, #f3f7ff 100%)",
  },

  container: {
    width: "100%",
    maxWidth: "980px",
    margin: "0 auto",
    padding: "18px",
  },

  header: {
    marginBottom: "16px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "900",
    color: "#0f172a",
    lineHeight: 1.2,
  },

  subTitle: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
    lineHeight: 1.6,
    fontWeight: "500",
  },

  card: {
    width: "100%",
    background: "rgba(255,255,255,.94)",
    border: "1px solid #dbe7f5",
    borderRadius: "22px",
    padding: "18px",
    boxShadow: "0 16px 36px rgba(15,23,42,.08)",
  },

  cardTitle: {
    fontSize: "16px",
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: "14px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },

  field: {
    display: "grid",
    gap: "6px",
  },

  label: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#475569",
  },

  input: {
    width: "100%",
    height: "46px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "700",
  },

  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "18px",
  },

  downloadBtn: {
    border: "none",
    background: "linear-gradient(135deg, #111827, #312e81)",
    color: "#fff",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: "900",
    fontSize: "14px",
    cursor: "pointer",
    minWidth: "180px",
    boxShadow: "0 12px 24px rgba(17,24,39,.16)",
  },

  disabledBtn: {
    opacity: 0.7,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.30)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    zIndex: 9999,
  },

  popupCard: {
    width: "100%",
    maxWidth: "360px",
    background: "#fff",
    borderRadius: "20px",
    padding: "20px 16px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(15,23,42,.20)",
    border: "1px solid #e2e8f0",
  },

  popupIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    margin: "0 auto 14px auto",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "900",
  },

  popupTitle: {
    margin: "0 0 8px 0",
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: "900",
  },

  popupMessage: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.6",
    fontWeight: "600",
  },
};