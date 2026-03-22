import React, { useMemo, useState } from "react";

const API_BASE_URL = "https://express-backend-myapp.onrender.com/api";

const AddMonthdpr = () => {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [rows, setRows] = useState([
    {
      work_details: "",
      work_time: "",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    const dateObj = new Date(selectedDate);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDate]);

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

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        work_details: "",
        work_time: "",
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (rows.length === 1) return;
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  const resetForm = () => {
    setRows([
      {
        work_details: "",
        work_time: "",
      },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validRows = rows.filter(
      (row) => row.work_details && row.work_details.trim() !== ""
    );

    if (!selectedDate) {
      openPopup("error", "Missing Date", "Please select a date first.");
      return;
    }

    if (validRows.length === 0) {
      openPopup("error", "Missing Work Details", "Please enter at least one work detail.");
      return;
    }

    try {
      setLoading(true);

      for (const row of validRows) {
        const payload = {
          dpr_date: selectedDate,
          work_details: row.work_details.trim(),
          work_time: row.work_time.trim() || null,
        };

        const response = await fetch(`${API_BASE_URL}/monthdpr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to add DPR");
        }
      }

      resetForm();
      openPopup("success", "DPR Added", "DPR entries added successfully.");
    } catch (error) {
      openPopup("error", "Add Failed", error.message || "Something went wrong.");
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
          font-family: Arial, sans-serif;
          overflow-x: hidden;
          background: #fff7f5;
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

        .dpr-btn {
          transition: all 0.2s ease;
        }

        .dpr-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.03);
        }

        .dpr-btn:active {
          transform: scale(0.97);
        }

        .dpr-input {
          transition: all 0.2s ease;
        }

        .dpr-input:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.14);
          background: #fffefc !important;
        }

        .glass-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .glass-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10);
        }

        @media (max-width: 768px) {
          .page-space {
            padding: 10px !important;
          }

          .main-title {
            font-size: 22px !important;
          }

          .sub-title {
            font-size: 12px !important;
          }

          .card-pad {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .row-head {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .action-grid {
            grid-template-columns: 1fr !important;
          }

          .primary-mobile,
          .secondary-mobile {
            width: 100% !important;
          }

          .popup-mobile {
            width: calc(100% - 24px) !important;
            max-width: 360px !important;
            padding: 18px 16px !important;
          }
        }

        @media (max-width: 520px) {
          .page-space {
            padding: 8px !important;
          }

          .main-title {
            font-size: 20px !important;
          }

          .card-pad {
            padding: 12px !important;
          }

          .small-btn {
            font-size: 12px !important;
            min-height: 36px !important;
            padding: 8px 10px !important;
          }
        }
      `}</style>

      <div style={styles.container} className="page-space">
        <div style={styles.pageHeader} className="fade-up">
          <h2 style={styles.pageHeaderTitle} className="main-title">
            Add Month DPR
          </h2>
          <p style={styles.pageHeaderSubTitle} className="sub-title">
            Add work details with optional time in a clean professional layout
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={styles.formCard}
          className="fade-up card-pad glass-hover"
        >
          <div style={styles.topSection}>
            <div style={styles.monthCard}>
              <label style={styles.label}>Select Month / Date</label>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.input}
                className="dpr-input"
              />

              <div style={styles.selectedMonthBox}>
                <span style={styles.selectedMonthLabel}>Selected Month</span>
                <strong style={styles.selectedMonthValue}>
                  {formattedDate || "No date selected"}
                </strong>
              </div>
            </div>
          </div>

          <div style={styles.sectionTitleWrap}>
            <h3 style={styles.sectionTitle}>Work Details</h3>
          </div>

          <div style={styles.rowsWrapper}>
            {rows.map((row, index) => (
              <div key={index} style={styles.rowCard} className="glass-hover">
                <div style={styles.rowHeader} className="row-head">
                  <div style={styles.rowHeaderLeft}>
                    <div style={styles.entryCircle}>{index + 1}</div>
                    <div>
                      <h4 style={styles.rowTitle}>Entry {index + 1}</h4>
                      <p style={styles.rowSubTitle}>
                        Add work details and optional time
                      </p>
                    </div>
                  </div>

                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      style={styles.removeBtn}
                      className="dpr-btn small-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={styles.fieldBlock}>
                  <label style={styles.label}>Work Details</label>
                  <textarea
                    placeholder="Enter work details"
                    value={row.work_details}
                    onChange={(e) =>
                      handleRowChange(index, "work_details", e.target.value)
                    }
                    rows="4"
                    style={styles.textarea}
                    className="dpr-input"
                  />
                </div>

                <div style={styles.fieldBlock}>
                  <label style={styles.label}>Time (Optional)</label>
                  <input
                    type="text"
                    placeholder="Ex. 10 AM to 5 PM"
                    value={row.work_time}
                    onChange={(e) =>
                      handleRowChange(index, "work_time", e.target.value)
                    }
                    style={styles.input}
                    className="dpr-input"
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={styles.actionGroup} className="action-grid">
            <button
              type="button"
              onClick={handleAddRow}
              style={styles.secondaryBtn}
              className="dpr-btn secondary-mobile"
            >
              + Add Row
            </button>

            <button
              type="submit"
              disabled={loading || !selectedDate}
              style={{
                ...styles.primaryBtn,
                ...(loading || !selectedDate ? styles.primaryBtnDisabled : {}),
              }}
              className="dpr-btn primary-mobile"
            >
              {loading ? "Saving..." : "Add DPR"}
            </button>
          </div>
        </form>

        <div style={styles.mobileBottomSpace}></div>
      </div>

      {popup.open && (
        <div style={styles.popupOverlay} onClick={closePopup}>
          <div
            style={styles.popupCard}
            className="popup-mobile fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                ...styles.popupIcon,
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #16a34a, #22c55e)"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
              }}
            >
              {popup.type === "success" ? "✓" : "!"}
            </div>

            <h3 style={styles.popupTitle}>{popup.title}</h3>
            <p style={styles.popupMessage}>{popup.message}</p>

            <button
              type="button"
              onClick={closePopup}
              style={{
                ...styles.popupButton,
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #16a34a, #15803d)"
                    : "linear-gradient(135deg, #f97316, #ea580c)",
              }}
              className="dpr-btn"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(180deg, #fff7ed 0%, #fff1f2 24%, #fefce8 56%, #f0fdf4 100%)",
    margin: 0,
    paddingBottom: "env(safe-area-inset-bottom)",
  },

  container: {
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    padding: "14px",
  },

  pageHeader: {
    width: "100%",
    marginBottom: "14px",
    padding: "2px 2px 6px 2px",
  },

  pageHeaderTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "900",
    color: "#7c2d12",
    lineHeight: "1.2",
    letterSpacing: "0.2px",
  },

  pageHeaderSubTitle: {
    margin: "6px 0 0 0",
    color: "#9a3412",
    fontSize: "14px",
    lineHeight: "1.6",
    fontWeight: "500",
  },

  formCard: {
    width: "100%",
    background: "rgba(255,255,255,0.90)",
    borderRadius: "22px",
    padding: "18px",
    border: "1px solid rgba(255,255,255,0.75)",
    boxShadow: "0 14px 36px rgba(15, 23, 42, 0.08)",
    backdropFilter: "blur(10px)",
  },

  topSection: {
    marginBottom: "18px",
  },

  monthCard: {
    background: "linear-gradient(135deg, #ffffff, #fff7ed)",
    border: "1px solid #fed7aa",
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 8px 20px rgba(249, 115, 22, 0.08)",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "800",
    color: "#7c2d12",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid #fdba74",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#431407",
  },

  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid #f9a8d4",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#ffffff",
    color: "#4a044e",
    minHeight: "110px",
  },

  selectedMonthBox: {
    marginTop: "10px",
    background: "linear-gradient(135deg, #fff7ed, #fff1f2)",
    border: "1px solid #fdba74",
    borderRadius: "14px",
    padding: "12px 14px",
  },

  selectedMonthLabel: {
    display: "block",
    fontSize: "12px",
    color: "#c2410c",
    marginBottom: "4px",
    fontWeight: "700",
  },

  selectedMonthValue: {
    fontSize: "16px",
    color: "#7c2d12",
    fontWeight: "800",
  },

  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
    color: "#7c2d12",
  },

  rowsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  rowCard: {
    border: "1px solid #fbcfe8",
    borderRadius: "18px",
    padding: "14px",
    background: "linear-gradient(180deg, #ffffff 0%, #fff7ed 42%, #fdf2f8 100%)",
    boxShadow: "0 8px 22px rgba(236, 72, 153, 0.08)",
  },

  rowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    gap: "10px",
    flexWrap: "wrap",
  },

  rowHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  entryCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #ec4899)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "14px",
    flexShrink: 0,
    boxShadow: "0 10px 18px rgba(249, 115, 22, 0.18)",
  },

  rowTitle: {
    margin: 0,
    fontSize: "17px",
    color: "#7c2d12",
    fontWeight: "900",
  },

  rowSubTitle: {
    margin: "3px 0 0 0",
    fontSize: "12px",
    color: "#9f1239",
    fontWeight: "500",
  },

  removeBtn: {
    border: "none",
    background: "linear-gradient(135deg, #fee2e2, #fecdd3)",
    color: "#be123c",
    borderRadius: "12px",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "13px",
    minHeight: "38px",
    boxShadow: "0 8px 16px rgba(244, 63, 94, 0.10)",
  },

  fieldBlock: {
    marginBottom: "12px",
  },

  actionGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "18px",
  },

  secondaryBtn: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid #f9a8d4",
    background: "linear-gradient(135deg, #fff1f2, #fdf2f8)",
    color: "#be185d",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "46px",
    boxShadow: "0 10px 18px rgba(236, 72, 153, 0.10)",
  },

  primaryBtn: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #16a34a, #22c55e)",
    color: "#fff",
    fontWeight: "900",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "46px",
    boxShadow: "0 10px 22px rgba(34, 197, 94, 0.18)",
  },

  primaryBtnDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  mobileBottomSpace: {
    width: "100%",
    height: "82px",
    flexShrink: 0,
  },

  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    zIndex: 9999,
  },

  popupCard: {
    width: "100%",
    maxWidth: "360px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px 18px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18)",
    border: "1px solid #fed7aa",
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
    fontSize: "26px",
    fontWeight: "900",
  },

  popupTitle: {
    margin: "0 0 8px 0",
    color: "#7c2d12",
    fontSize: "20px",
    fontWeight: "900",
  },

  popupMessage: {
    margin: "0 0 16px 0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  popupButton: {
    width: "100%",
    border: "none",
    color: "#fff",
    borderRadius: "14px",
    padding: "11px 14px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "42px",
  },
};

export default AddMonthdpr;