import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "https://express-backend-myapp.onrender.com/api";

const GetMonthdpr = () => {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [dprList, setDprList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    dpr_date: "",
    work_details: "",
    work_time: "",
  });

  const [popup, setPopup] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  const [deletePopup, setDeletePopup] = useState({
    open: false,
    sr_no: null,
    sequence_no: null,
  });

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [year, month] = selectedMonth.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }, [selectedMonth]);

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

  const openDeletePopup = (sr_no, sequence_no) => {
    setDeletePopup({
      open: true,
      sr_no,
      sequence_no,
    });
  };

  const closeDeletePopup = () => {
    setDeletePopup({
      open: false,
      sr_no: null,
      sequence_no: null,
    });
  };

  const formatToDisplayDate = (dateValue) => {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return dateValue;

    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const convertDisplayDateToInputDate = (dateValue) => {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const fetchDprData = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/monthdpr`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch DPR");
      }

      const allRows = result.data || [];

      const filteredRows = allRows.filter((item) => {
        const [year, month] = selectedMonth.split("-");
        const rowDate = new Date(item.dpr_date);
        if (isNaN(rowDate.getTime())) return false;

        const rowYear = rowDate.getFullYear();
        const rowMonth = rowDate.getMonth() + 1;

        return rowYear === Number(year) && rowMonth === Number(month);
      });

      const grouped = [];
      let lastDate = "";

      filteredRows.forEach((item, index) => {
        const currentDate = formatToDisplayDate(item.dpr_date);
        grouped.push({
          ...item,
          display_sequence: index + 1,
          display_date: currentDate,
          show_date: lastDate !== currentDate,
        });
        lastDate = currentDate;
      });

      setDprList(grouped);
    } catch (error) {
      setDprList([]);
      openPopup("error", "Load Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDprData();
  }, [selectedMonth]);

  const startEdit = (item) => {
    setEditingId(item.sr_no);
    setEditForm({
      dpr_date: convertDisplayDateToInputDate(item.dpr_date),
      work_details: item.work_details || "",
      work_time: item.work_time || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      dpr_date: "",
      work_details: "",
      work_time: "",
    });
  };

  const handleUpdate = async (sr_no) => {
    try {
      if (!editForm.dpr_date || !editForm.work_details.trim()) {
        openPopup("error", "Missing Fields", "Date and work details are required.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/monthdpr/${sr_no}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dpr_date: editForm.dpr_date,
          work_details: editForm.work_details.trim(),
          work_time: editForm.work_time.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update DPR");
      }

      cancelEdit();
      openPopup("success", "Updated Successfully", "DPR entry updated successfully.");
      fetchDprData();
    } catch (error) {
      openPopup("error", "Update Failed", error.message || "Something went wrong.");
    }
  };

  const confirmDelete = async () => {
    try {
      const sr_no = deletePopup.sr_no;
      if (!sr_no) return;

      const response = await fetch(`${API_BASE_URL}/monthdpr/${sr_no}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete DPR");
      }

      closeDeletePopup();
      openPopup("success", "Deleted Successfully", "DPR entry deleted successfully.");
      fetchDprData();
    } catch (error) {
      closeDeletePopup();
      openPopup("error", "Delete Failed", error.message || "Something went wrong.");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      if (!selectedMonth) {
        openPopup("error", "Missing Month", "Please select a month first.");
        return;
      }

      const [year, month] = selectedMonth.split("-");
      const pdfUrl = `${API_BASE_URL}/monthdpr/export-pdf?month=${Number(
        month
      )}&year=${year}`;

      const response = await fetch(pdfUrl);

      if (!response.ok) {
        let errorMessage = "Failed to download PDF";
        try {
          const result = await response.json();
          errorMessage = result.message || errorMessage;
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${monthLabel.replace(/\s+/g, "")}DPR.pdf`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      openPopup("success", "Download Started", `${fileName} downloaded successfully.`);
    } catch (error) {
      openPopup("error", "Download Failed", error.message || "Something went wrong.");
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }

        .dpr-btn {
          transition: all 0.18s ease;
        }

        .dpr-btn:hover {
          transform: translateY(-1px);
        }

        .dpr-btn:active {
          transform: scale(0.97);
        }

        .dpr-table-wrap::-webkit-scrollbar {
          height: 7px;
        }

        .dpr-table-wrap::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        @media (max-width: 640px) {
          .dpr-main-title {
            font-size: 20px !important;
          }

          .dpr-subtitle {
            font-size: 12px !important;
          }

          .dpr-small-btn {
            padding: 8px 10px !important;
            font-size: 12px !important;
            min-height: 34px !important;
          }

          .dpr-download-btn {
            padding: 10px 12px !important;
            font-size: 13px !important;
            min-height: 40px !important;
          }

          .dpr-popup-card {
            width: calc(100% - 28px) !important;
            max-width: 360px !important;
            padding: 18px 16px !important;
            border-radius: 16px !important;
          }

          .dpr-table th,
          .dpr-table td {
            font-size: 12px !important;
            padding: 10px 8px !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.headerCard}>
          <div style={styles.headerTop}>
            <div>
              <h2 className="dpr-main-title" style={styles.title}>
                Month DPR Details
              </h2>
              <p className="dpr-subtitle" style={styles.subtitle}>
                View, update, delete and download selected month DPR in a clean professional format
              </p>
            </div>
            <div style={styles.headerBadge}>DPR</div>
          </div>
        </div>

        <div style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.infoBox}>
              <span style={styles.infoBoxLabel}>Selected Month</span>
              <strong style={styles.infoBoxValue}>{monthLabel}</strong>
            </div>

            <div style={styles.infoBox}>
              <span style={styles.infoBoxLabel}>Total Entries</span>
              <strong style={styles.infoBoxValue}>{dprList.length}</strong>
            </div>
          </div>

          <div style={styles.downloadRow}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              style={styles.downloadBtn}
              className="dpr-btn dpr-download-btn"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div>
              <h3 style={styles.tableTitle}>DPR Entry Table</h3>
              <p style={styles.tableSubtitle}>
                Sequence-wise monthly details with date, work information, time and actions
              </p>
            </div>
          </div>

          {loading ? (
            <div style={styles.emptyState}>Loading DPR data...</div>
          ) : dprList.length === 0 ? (
            <div style={styles.emptyState}>No DPR records found for this month.</div>
          ) : (
            <div style={styles.tableWrap} className="dpr-table-wrap">
              <table style={styles.table} className="dpr-table">
                <thead>
                  <tr>
                    <th style={{ ...styles.th, ...styles.thCenter, width: "80px" }}>
                      Sr.No
                    </th>
                    <th style={{ ...styles.th, width: "140px" }}>Date</th>
                    <th style={{ ...styles.th }}>Work Details</th>
                    <th style={{ ...styles.th, width: "140px" }}>Time</th>
                    <th style={{ ...styles.th, ...styles.thCenter, width: "150px" }}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dprList.map((item) =>
                    editingId === item.sr_no ? (
                      <tr key={item.sr_no}>
                        <td style={{ ...styles.td, ...styles.tdCenter }}>
                          {item.display_sequence}
                        </td>

                        <td style={styles.td}>
                          <input
                            type="date"
                            value={editForm.dpr_date}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                dpr_date: e.target.value,
                              }))
                            }
                            style={styles.tableInput}
                          />
                        </td>

                        <td style={styles.td}>
                          <textarea
                            rows="3"
                            value={editForm.work_details}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                work_details: e.target.value,
                              }))
                            }
                            style={styles.tableTextarea}
                            placeholder="Enter work details"
                          />
                        </td>

                        <td style={styles.td}>
                          <input
                            type="text"
                            value={editForm.work_time}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                work_time: e.target.value,
                              }))
                            }
                            style={styles.tableInput}
                            placeholder="Ex. 10 AM to 5 PM"
                          />
                        </td>

                        <td style={{ ...styles.td, ...styles.tdCenter }}>
                          <div style={styles.actionBtns}>
                            <button
                              type="button"
                              onClick={() => handleUpdate(item.sr_no)}
                              style={styles.saveBtn}
                              className="dpr-btn dpr-small-btn"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              style={styles.cancelBtn}
                              className="dpr-btn dpr-small-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.sr_no}>
                        <td style={{ ...styles.td, ...styles.tdCenter, ...styles.seqText }}>
                          {item.display_sequence}
                        </td>

                        <td style={styles.td}>
                          <span style={styles.dateText}>{item.display_date}</span>
                        </td>

                        <td style={styles.td}>
                          <div style={styles.workDetailsCell}>
                            {item.work_details || "-"}
                          </div>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.timeText}>
                            {item.work_time && item.work_time.trim() !== ""
                              ? item.work_time
                              : "-"}
                          </span>
                        </td>

                        <td style={{ ...styles.td, ...styles.tdCenter }}>
                          <div style={styles.actionBtns}>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              style={styles.updateBtn}
                              className="dpr-btn dpr-small-btn"
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openDeletePopup(item.sr_no, item.display_sequence)
                              }
                              style={styles.deleteBtn}
                              className="dpr-btn dpr-small-btn"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              className="dpr-btn dpr-download-btn"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {deletePopup.open && (
        <div style={styles.popupOverlay} onClick={closeDeletePopup}>
          <div
            style={styles.popupCard}
            className="dpr-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ ...styles.popupIcon, background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
              !
            </div>

            <h3 style={styles.popupTitle}>Delete DPR Entry</h3>
            <p style={styles.popupMessage}>
              Are you sure you want to delete DPR entry
              {deletePopup.sequence_no ? ` #${deletePopup.sequence_no}` : ""}?
              This action cannot be undone.
            </p>

            <div style={styles.confirmBtnRow}>
              <button
                type="button"
                onClick={closeDeletePopup}
                style={styles.cancelConfirmBtn}
                className="dpr-btn dpr-small-btn"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                style={styles.deleteConfirmBtn}
                className="dpr-btn dpr-small-btn"
              >
                Delete
              </button>
            </div>
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
    maxWidth: "1180px",
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
  headerBadge: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.6px",
  },
  filterCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
    marginBottom: "14px",
    border: "1px solid #e6edf6",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
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
  infoBox: {
    background: "linear-gradient(135deg, #f8fbff, #f1f5f9)",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  infoBoxLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "4px",
    fontWeight: "700",
  },
  infoBoxValue: {
    fontSize: "16px",
    color: "#0f172a",
    fontWeight: "800",
  },
  downloadRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  downloadBtn: {
    border: "none",
    background: "linear-gradient(135deg, #111827, #1f2937)",
    color: "#fff",
    borderRadius: "12px",
    padding: "11px 14px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "42px",
    boxShadow: "0 8px 18px rgba(17, 24, 39, 0.18)",
  },
  tableCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e6edf6",
  },
  tableHeader: {
    marginBottom: "14px",
  },
  tableTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
  },
  tableSubtitle: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.5",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
  },
  table: {
    width: "100%",
    minWidth: "900px",
    borderCollapse: "collapse",
    background: "#ffffff",
  },
  th: {
    padding: "12px 10px",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "800",
    textAlign: "left",
    borderBottom: "1px solid #dbe3ef",
    whiteSpace: "nowrap",
  },
  thCenter: {
    textAlign: "center",
  },
  td: {
    padding: "12px 10px",
    fontSize: "13px",
    color: "#1e293b",
    borderBottom: "1px solid #eef2f6",
    verticalAlign: "top",
    background: "#fff",
  },
  tdCenter: {
    textAlign: "center",
    verticalAlign: "middle",
  },
  seqText: {
    fontWeight: "800",
    color: "#0f172a",
  },
  dateText: {
    fontWeight: "700",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },
  workDetailsCell: {
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    color: "#334155",
    fontWeight: "500",
  },
  timeText: {
    color: "#334155",
    whiteSpace: "nowrap",
    fontWeight: "600",
  },
  actionBtns: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  updateBtn: {
    border: "none",
    background: "#175cd3",
    color: "#fff",
    borderRadius: "10px",
    padding: "8px 10px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    minHeight: "34px",
    minWidth: "64px",
  },
  deleteBtn: {
    border: "none",
    background: "#d92d20",
    color: "#fff",
    borderRadius: "10px",
    padding: "8px 10px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    minHeight: "34px",
    minWidth: "64px",
  },
  saveBtn: {
    border: "none",
    background: "#027a48",
    color: "#fff",
    borderRadius: "10px",
    padding: "8px 10px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    minHeight: "34px",
    minWidth: "64px",
  },
  cancelBtn: {
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#344054",
    borderRadius: "10px",
    padding: "8px 10px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    minHeight: "34px",
    minWidth: "64px",
  },
  tableInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #dbe3ef",
    outline: "none",
    fontSize: "13px",
    boxSizing: "border-box",
    background: "#fff",
  },
  tableTextarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #dbe3ef",
    outline: "none",
    fontSize: "13px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#fff",
    minHeight: "92px",
  },
  emptyState: {
    background: "linear-gradient(135deg, #f8fbff, #f1f5f9)",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "28px 16px",
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
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
    maxWidth: "370px",
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
  confirmBtnRow: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  cancelConfirmBtn: {
    flex: 1,
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#344054",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
    minHeight: "40px",
    minWidth: "110px",
  },
  deleteConfirmBtn: {
    flex: 1,
    border: "none",
    background: "#d92d20",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
    minHeight: "40px",
    minWidth: "110px",
  },
};

export default GetMonthdpr;