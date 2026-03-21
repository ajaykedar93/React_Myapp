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
      openPopup("error", "Missing Date", "Please select a date.");
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
      openPopup("success", "DPR Added", "All DPR rows were added successfully.");
    } catch (error) {
      openPopup("error", "Add Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }

        .dpr-btn {
          transition: all 0.18s ease;
        }

        .dpr-btn:active {
          transform: scale(0.97);
        }

        .dpr-primary:hover {
          filter: brightness(1.04);
        }

        .dpr-secondary:hover {
          background: #eff6ff !important;
          border-color: #93c5fd !important;
        }

        .dpr-remove:hover {
          background: #fecaca !important;
        }

        @media (max-width: 600px) {
          .dpr-main-title {
            font-size: 20px !important;
          }

          .dpr-subtitle {
            font-size: 12px !important;
          }

          .dpr-small-btn {
            padding: 8px 10px !important;
            font-size: 12px !important;
            min-height: 36px !important;
          }

          .dpr-primary-btn {
            padding: 10px 12px !important;
            font-size: 13px !important;
            min-height: 40px !important;
          }

          .dpr-popup-card {
            width: calc(100% - 28px) !important;
            border-radius: 16px !important;
            padding: 18px 16px !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.headerCard}>
          <div style={styles.headerTop}>
            <div>
              <h2 className="dpr-main-title" style={styles.title}>
                Add Month DPR
              </h2>
              <p className="dpr-subtitle" style={styles.subtitle}>
                Add multiple work entries for the same date
              </p>
            </div>
            <div style={styles.badge}>DPR</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.formCard}>
          <div style={styles.dateSection}>
            <label style={styles.label}>Select Date</label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.input}
            />

            <div style={styles.datePreviewBox}>
              <span style={styles.datePreviewLabel}>Selected Date</span>
              <strong style={styles.datePreviewValue}>
                {formattedDate || "No date selected"}
              </strong>
            </div>
          </div>

          <div style={styles.sectionTitleWrap}>
            <h3 style={styles.sectionTitle}>Work Entries</h3>
            <span style={styles.entryCount}>{rows.length} Row{rows.length > 1 ? "s" : ""}</span>
          </div>

          <div style={styles.rowsWrapper}>
            {rows.map((row, index) => (
              <div key={index} style={styles.rowCard}>
                <div style={styles.rowHeader}>
                  <div style={styles.rowHeaderLeft}>
                    <div style={styles.entryCircle}>{index + 1}</div>
                    <div>
                      <h4 style={styles.rowTitle}>Entry {index + 1}</h4>
                      <p style={styles.rowSubTitle}>
                        Same selected date will be used for this row
                      </p>
                    </div>
                  </div>

                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      style={styles.removeBtn}
                      className="dpr-btn dpr-remove dpr-small-btn"
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
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={styles.actionGroup}>
            <button
              type="button"
              onClick={handleAddRow}
              style={styles.secondaryBtn}
              className="dpr-btn dpr-secondary dpr-small-btn"
            >
              + Add New Row
            </button>

            <button
              type="submit"
              disabled={loading || !selectedDate}
              style={{
                ...styles.primaryBtn,
                ...(loading || !selectedDate ? styles.primaryBtnDisabled : {}),
              }}
              className="dpr-btn dpr-primary dpr-primary-btn"
            >
              {loading ? "Saving..." : "Add DPR"}
            </button>
          </div>
        </form>
      </div>

      {popup.open && (
        <div style={styles.popupOverlay} onClick={closePopup}>
          <div
            style={styles.popupCard}
            className="dpr-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
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

            <button
              type="button"
              onClick={closePopup}
              style={{
                ...styles.popupButton,
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #111827, #1f2937)"
                    : "linear-gradient(135deg, #b91c1c, #dc2626)",
              }}
              className="dpr-btn dpr-primary-btn"
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
    background: "linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%)",
    padding: "14px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "920px",
    margin: "0 auto",
  },
  headerCard: {
    background: "linear-gradient(135deg, #ffffff, #f8fbff)",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
    marginBottom: "14px",
    border: "1px solid #e6edf6",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    color: "#0f172a",
    fontWeight: "800",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  badge: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.6px",
  },
  formCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e6edf6",
  },
  dateSection: {
    marginBottom: "18px",
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
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
  },
  entryCount: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
    color: "#0f172a",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#fff",
    color: "#0f172a",
    minHeight: "110px",
  },
  datePreviewBox: {
    marginTop: "10px",
    background: "linear-gradient(135deg, #f8fbff, #f1f5f9)",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px 14px",
  },
  datePreviewLabel: {
    display: "block",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "4px",
    fontWeight: "700",
  },
  datePreviewValue: {
    fontSize: "16px",
    color: "#0f172a",
  },
  rowsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  rowCard: {
    border: "1px solid #e6edf6",
    borderRadius: "16px",
    padding: "14px",
    background: "linear-gradient(180deg, #fcfdff 0%, #f8fbff 100%)",
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
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "14px",
    flexShrink: 0,
  },
  rowTitle: {
    margin: 0,
    fontSize: "16px",
    color: "#0f172a",
    fontWeight: "800",
  },
  rowSubTitle: {
    margin: "3px 0 0 0",
    fontSize: "12px",
    color: "#64748b",
  },
  removeBtn: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "10px",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
    minHeight: "38px",
  },
  fieldBlock: {
    marginBottom: "12px",
  },
  actionGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "18px",
  },
  secondaryBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#1e293b",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "44px",
  },
  primaryBtn: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #111827, #1f2937)",
    color: "#fff",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "46px",
    boxShadow: "0 8px 18px rgba(17, 24, 39, 0.18)",
  },
  primaryBtnDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
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
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px 18px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18)",
    border: "1px solid #e5e7eb",
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
    color: "#111827",
    fontSize: "20px",
    fontWeight: "800",
  },
  popupMessage: {
    margin: "0 0 16px 0",
    color: "#475569",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  popupButton: {
    width: "100%",
    border: "none",
    color: "#fff",
    borderRadius: "12px",
    padding: "11px 14px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "42px",
  },
};

export default AddMonthdpr;