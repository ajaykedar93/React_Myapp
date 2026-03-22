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

      const filteredRows = allRows
        .filter((item) => {
          const [year, month] = selectedMonth.split("-");
          const rowDate = new Date(item.dpr_date);
          if (isNaN(rowDate.getTime())) return false;

          const rowYear = rowDate.getFullYear();
          const rowMonth = rowDate.getMonth() + 1;

          return rowYear === Number(year) && rowMonth === Number(month);
        })
        .sort((a, b) => {
          const dateA = new Date(a.dpr_date);
          const dateB = new Date(b.dpr_date);
          if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
          return (a.sr_no || 0) - (b.sr_no || 0);
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
      const pdfUrl = `${API_BASE_URL}/monthdpr/export-pdf?month=${Number(month)}&year=${year}`;

      const response = await fetch(pdfUrl);

      if (!response.ok) {
        let errorMessage = "Failed to download PDF";
        try {
          const result = await response.json();
          errorMessage = result.message || errorMessage;
        } catch {}
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
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden;
          font-family: Arial, sans-serif;
          background: #edf3fb;
        }

        .fade-up {
          animation: fadeUp 0.4s ease;
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
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .dpr-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.03);
        }

        .dpr-btn:active {
          transform: scale(0.97);
        }

        .dpr-input {
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .dpr-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
          background: #ffffff !important;
        }

        .dpr-table-wrap::-webkit-scrollbar {
          height: 8px;
        }

        .dpr-table-wrap::-webkit-scrollbar-thumb {
          background: #bfd3f7;
          border-radius: 999px;
        }

        .dpr-table-wrap::-webkit-scrollbar-track {
          background: #edf4ff;
        }

        .dpr-table tbody tr td {
          transition: background 0.2s ease;
        }

        .dpr-table tbody tr:nth-child(even) td {
          background: #f8fbff;
        }

        .dpr-table tbody tr:hover td {
          background: #eef5ff;
        }

        @media (max-width: 991px) {
          .page-space {
            padding: 12px !important;
          }

          .main-title {
            font-size: 24px !important;
          }

          .card-pad {
            padding: 14px !important;
          }
        }

        @media (max-width: 767px) {
          .page-space {
            padding: 10px !important;
          }

          .main-title {
            font-size: 20px !important;
          }

          .filter-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .download-row {
            justify-content: stretch !important;
          }

          .download-mobile {
            width: 100% !important;
          }

          .card-pad {
            padding: 12px !important;
            border-radius: 18px !important;
          }

          .dpr-table {
            min-width: 760px !important;
          }

          .dpr-table th,
          .dpr-table td {
            padding: 10px 8px !important;
            font-size: 12px !important;
          }

          .small-btn {
            min-width: 58px !important;
            padding: 8px 10px !important;
            font-size: 11px !important;
          }

          .popup-mobile {
            width: calc(100% - 20px) !important;
            max-width: 360px !important;
            padding: 18px 14px !important;
          }
        }

        @media (max-width: 575px) {
          .page-space {
            padding: 8px !important;
          }

          .main-title {
            font-size: 18px !important;
          }

          .dpr-table {
            min-width: 680px !important;
          }
        }
      `}</style>

      <div style={styles.container} className="page-space">
        <div style={styles.pageHeader} className="fade-up">
          <h2 style={styles.pageHeaderTitle} className="main-title">
            Month DPR Details
          </h2>
        </div>

        <div style={styles.filterCard} className="fade-up card-pad">
          <div style={styles.filterHeader}>Select Month</div>

          <div style={styles.filterGrid} className="filter-grid">
            <div style={styles.monthInputBlock}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={styles.monthInput}
                className="dpr-input"
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

          <div style={styles.downloadRow} className="download-row">
            <button
              type="button"
              onClick={handleDownloadPdf}
              style={styles.downloadBtn}
              className="dpr-btn download-mobile"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div style={styles.tableCard} className="fade-up card-pad">
          <div style={styles.tableHeader}>
            <div>
              <h3 style={styles.tableTitle}>DPR Details List</h3>
              <p style={styles.tableSubtitle}>
                Professional monthly DPR list. 
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
                    <th style={{ ...styles.th, ...styles.thCenter, width: "80px" }}>Sr.No</th>
                    <th style={{ ...styles.th, width: "150px" }}>Date</th>
                    <th style={styles.th}>Work Details</th>
                    <th style={{ ...styles.th, width: "150px" }}>Time</th>
                    <th style={{ ...styles.th, ...styles.thCenter, width: "170px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {dprList.map((item) =>
                    editingId === item.sr_no ? (
                      <tr key={item.sr_no}>
                        <td style={{ ...styles.td, ...styles.tdCenter, ...styles.seqText }}>
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
                            className="dpr-input"
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
                            className="dpr-input"
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
                            className="dpr-input"
                            placeholder="Ex. 10 AM to 5 PM"
                          />
                        </td>

                        <td style={{ ...styles.td, ...styles.tdCenter }}>
                          <div style={styles.actionBtns}>
                            <button
                              type="button"
                              onClick={() => handleUpdate(item.sr_no)}
                              style={styles.saveBtn}
                              className="dpr-btn small-btn"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              style={styles.cancelBtn}
                              className="dpr-btn small-btn"
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
                          {item.show_date ? (
                            <span style={styles.dateText}>{item.display_date}</span>
                          ) : (
                            <span style={styles.emptyDate}></span>
                          )}
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
                              className="dpr-btn small-btn"
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeletePopup(item.sr_no, item.display_sequence)}
                              style={styles.deleteBtn}
                              className="dpr-btn small-btn"
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
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : "linear-gradient(135deg, #dc2626, #b91c1c)",
              }}
              className="dpr-btn"
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
            className="popup-mobile fade-up"
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
                className="dpr-btn"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                style={styles.deleteConfirmBtn}
                className="dpr-btn"
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
    width: "100%",
    background: "linear-gradient(180deg, #edf3fb 0%, #f8fbff 35%, #f1f5fb 100%)",
    margin: 0,
    paddingBottom: "env(safe-area-inset-bottom)",
  },

  container: {
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    padding: "12px",
  },

  pageHeader: {
    width: "100%",
    marginBottom: "12px",
    padding: "2px 2px 4px 2px",
  },

  pageHeaderTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "900",
    color: "#0b1f4d",
    lineHeight: "1.2",
    letterSpacing: "0.2px",
  },

  filterCard: {
    width: "100%",
    background: "linear-gradient(135deg, #ffffff, #fbfdff)",
    borderRadius: "20px",
    padding: "14px",
    marginBottom: "14px",
    border: "1px solid #dfe8f5",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },

  filterHeader: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#17335d",
    marginBottom: "12px",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    width: "100%",
    marginBottom: "14px",
  },

  monthInputBlock: {
    background: "#ffffff",
    border: "1px solid #d7e2f0",
    borderRadius: "14px",
    padding: "10px",
    minHeight: "72px",
    display: "flex",
    alignItems: "center",
  },

  monthInput: {
    width: "100%",
    height: "40px",
    borderRadius: "12px",
    border: "1px solid #cad7ea",
    padding: "0 12px",
    fontSize: "13px",
    color: "#0f172a",
    background: "#ffffff",
    outline: "none",
  },

  infoBox: {
    background: "linear-gradient(135deg, #f7faff 0%, #eef4ff 100%)",
    border: "1px solid #d7e2f0",
    borderRadius: "14px",
    padding: "10px 12px",
    minHeight: "72px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  infoBoxLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#607798",
    marginBottom: "4px",
    lineHeight: "1.2",
  },

  infoBoxValue: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#081f4a",
    lineHeight: "1.2",
    wordBreak: "break-word",
  },

  downloadRow: {
    display: "flex",
    justifyContent: "flex-end",
    width: "100%",
  },

  downloadBtn: {
    border: "none",
    background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
    color: "#fff",
    borderRadius: "14px",
    padding: "12px 20px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "42px",
    boxShadow: "0 12px 22px rgba(30, 58, 138, 0.22)",
  },

  tableCard: {
    width: "100%",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "14px",
    border: "1px solid #dfe8f5",
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
  },

  tableHeader: {
    marginBottom: "14px",
  },

  tableTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "900",
    color: "#0a2354",
  },

  tableSubtitle: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    color: "#6781a7",
    lineHeight: "1.6",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "18px",
    border: "1px solid #dbe5f2",
    background: "#ffffff",
  },

  table: {
    width: "100%",
    minWidth: "920px",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    background: "#ffffff",
  },

  th: {
    padding: "14px 12px",
    background: "linear-gradient(135deg, #0f2557, #173b77)",
    color: "#ffffff",
    fontSize: "23px",
    fontWeight: "800",
    textAlign: "left",
    borderBottom: "1px solid #264c8b",
    whiteSpace: "nowrap",
  },

  thCenter: {
    textAlign: "center",
  },

  td: {
    padding: "14px 12px",
    fontSize: "13px",
    color: "#20324d",
    borderBottom: "1px solid #e9eef6",
    verticalAlign: "top",
    wordBreak: "break-word",
  },

  tdCenter: {
    textAlign: "center",
    verticalAlign: "middle",
  },

  seqText: {
    fontWeight: "900",
    color: "#08224f",
  },

  dateText: {
    fontWeight: "800",
    color: "#173b77",
    whiteSpace: "nowrap",
    display: "inline-block",
  },

  emptyDate: {
    display: "inline-block",
    minHeight: "18px",
  },

  workDetailsCell: {
    color: "#334a68",
    lineHeight: "1.7",
    fontWeight: "500",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  timeText: {
    color: "#2f4a71",
    fontWeight: "700",
    whiteSpace: "nowrap",
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
    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
    color: "#fff",
    borderRadius: "12px",
    padding: "9px 12px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(37, 99, 235, 0.18)",
    minWidth: "72px",
  },

  deleteBtn: {
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff",
    borderRadius: "12px",
    padding: "9px 12px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(220, 38, 38, 0.18)",
    minWidth: "72px",
  },

  saveBtn: {
    border: "none",
    background: "linear-gradient(135deg, #16a34a, #22c55e)",
    color: "#fff",
    borderRadius: "12px",
    padding: "9px 12px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(34, 197, 94, 0.18)",
    minWidth: "72px",
  },

  cancelBtn: {
    border: "1px solid #d1dbe8",
    background: "linear-gradient(135deg, #ffffff, #f8fbff)",
    color: "#425b7b",
    borderRadius: "12px",
    padding: "9px 12px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
    minWidth: "72px",
  },

  tableInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #d1dded",
    background: "#ffffff",
    fontSize: "13px",
    outline: "none",
  },

  tableTextarea: {
    width: "100%",
    minHeight: "92px",
    resize: "vertical",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #d1dded",
    background: "#ffffff",
    fontSize: "13px",
    outline: "none",
  },

  emptyState: {
    background: "linear-gradient(135deg, #f7faff, #eef4ff)",
    border: "1px solid #dbe6f4",
    borderRadius: "18px",
    padding: "30px 16px",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "700",
    color: "#6480a5",
  },

  mobileBottomSpace: {
    width: "100%",
    height: "84px",
    flexShrink: 0,
  },

  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(8, 20, 48, 0.45)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    zIndex: 9999,
  },

  popupCard: {
    width: "100%",
    maxWidth: "380px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px 18px",
    textAlign: "center",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.22)",
    border: "1px solid #e6edf6",
  },

  popupIcon: {
    width: "58px",
    height: "58px",
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
    color: "#08224f",
    fontSize: "20px",
    fontWeight: "900",
  },

  popupMessage: {
    margin: "0 0 16px 0",
    color: "#5f7699",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  popupButton: {
    width: "100%",
    border: "none",
    color: "#fff",
    borderRadius: "14px",
    padding: "12px 14px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 12px 22px rgba(37, 99, 235, 0.2)",
  },

  confirmBtnRow: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  cancelConfirmBtn: {
    flex: 1,
    border: "1px solid #d1dbe8",
    background: "linear-gradient(135deg, #ffffff, #f8fbff)",
    color: "#425b7b",
    borderRadius: "12px",
    padding: "10px 12px",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
    minWidth: "110px",
  },

  deleteConfirmBtn: {
    flex: 1,
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff",
    borderRadius: "12px",
    padding: "10px 12px",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
    minWidth: "110px",
    boxShadow: "0 10px 18px rgba(220, 38, 38, 0.16)",
  },
};

export default GetMonthdpr;