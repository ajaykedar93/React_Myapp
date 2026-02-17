// src/pages/Investment_platform_segment.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://express-backend-myapp.onrender.com";

export default function Investment_platform_segment() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // -------------------- Platform State --------------------
  const [platforms, setPlatforms] = useState([]);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [platformEditId, setPlatformEditId] = useState(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState(null);

  // -------------------- Segment State --------------------
  const [segments, setSegments] = useState([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [isOptions, setIsOptions] = useState(false);
  const [segmentEditId, setSegmentEditId] = useState(null);

  // -------------------- UI State --------------------
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState({
    open: false,
    type: "info", // success | error | confirm | info
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const openModal = (payload) =>
    setModal((m) => ({
      ...m,
      open: true,
      type: payload.type || "info",
      title: payload.title || "",
      message: payload.message || "",
      confirmText: payload.confirmText || "OK",
      cancelText: payload.cancelText || "Cancel",
      onConfirm: payload.onConfirm || null,
    }));

  const closeModal = () =>
    setModal((m) => ({ ...m, open: false, onConfirm: null, message: "", title: "" }));

  const toast = (msg) => openModal({ type: "success", title: "Success", message: msg });
  const fail = (msg) => openModal({ type: "error", title: "Error", message: msg });

  // -------------------- API --------------------
  const api = {
    async getPlatforms() {
      setPlatformLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Platform fetch failed");
        setPlatforms(Array.isArray(data?.data) ? data.data : []);
      } catch (e) {
        fail(e.message);
      } finally {
        setPlatformLoading(false);
      }
    },

    async createPlatform(name) {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform`, {
        method: "POST",
        headers,
        body: JSON.stringify({ platform_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Platform create failed");
      return data?.data;
    },

    async updatePlatform(id, name) {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ platform_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Platform update failed");
      return data?.data;
    },

    async deletePlatform(id) {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/platform/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Platform delete failed");
      return true;
    },

    async getSegments(platformId) {
      if (!platformId) {
        setSegments([]);
        return;
      }
      setSegmentLoading(true);
      try {
        const res = await fetch(
          `${BASE_URL}/api/investment/platform-segment/segment?platform_id=${platformId}`,
          { headers }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Segment fetch failed");
        setSegments(Array.isArray(data?.data) ? data.data : []);
      } catch (e) {
        fail(e.message);
      } finally {
        setSegmentLoading(false);
      }
    },

    async createSegment(platformId, name, is_options) {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/segment`, {
        method: "POST",
        headers,
        body: JSON.stringify({ platform_id: platformId, segment_name: name, is_options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Segment create failed");
      return data?.data;
    },

    async updateSegment(segmentId, name, is_options) {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/segment/${segmentId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ segment_name: name, is_options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Segment update failed");
      return data?.data;
    },

    async deleteSegment(segmentId) {
      const res = await fetch(`${BASE_URL}/api/investment/platform-segment/segment/${segmentId}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Segment delete failed");
      return true;
    },
  };

  // -------------------- Effects --------------------
  useEffect(() => {
    api.getPlatforms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.getSegments(selectedPlatformId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatformId]);

  // -------------------- Platform Actions --------------------
  const onPlatformSubmit = async (e) => {
    e.preventDefault();
    const name = platformName.trim();
    if (!name) return fail("Platform name required");

    try {
      setBusyId("platform-submit");

      if (platformEditId) {
        await api.updatePlatform(platformEditId, name);
        toast("Platform updated");
      } else {
        const created = await api.createPlatform(name);
        toast("Platform added");
        if (created?.platform_id) setSelectedPlatformId(created.platform_id);
      }

      setPlatformName("");
      setPlatformEditId(null);
      await api.getPlatforms();
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusyId(null);
    }
  };

  const onPlatformEdit = (p) => {
    setPlatformEditId(p.platform_id);
    setPlatformName(p.platform_name || "");
  };

  const onPlatformDelete = (p) => {
    openModal({
      type: "confirm",
      title: "Delete?",
      message: `Platform "${p.platform_name}" delete करायचा?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setBusyId(`platform-del-${p.platform_id}`);
          await api.deletePlatform(p.platform_id);
          toast("Platform deleted");
          if (selectedPlatformId === p.platform_id) {
            setSelectedPlatformId(null);
            setSegments([]);
          }
          await api.getPlatforms();
        } catch (e) {
          fail(e.message);
        } finally {
          setBusyId(null);
          closeModal();
        }
      },
    });
  };

  const onPlatformSelect = (p) => {
    setSelectedPlatformId(p.platform_id);
    setSegmentName("");
    setIsOptions(false);
    setSegmentEditId(null);
  };

  const cancelPlatformEdit = () => {
    setPlatformEditId(null);
    setPlatformName("");
  };

  // -------------------- Segment Actions --------------------
  const onSegmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlatformId) return fail("Select a platform first");
    const name = segmentName.trim();
    if (!name) return fail("Segment name required");

    try {
      setBusyId("segment-submit");

      if (segmentEditId) {
        await api.updateSegment(segmentEditId, name, !!isOptions);
        toast("Segment updated");
      } else {
        await api.createSegment(selectedPlatformId, name, !!isOptions);
        toast("Segment added");
      }

      setSegmentName("");
      setIsOptions(false);
      setSegmentEditId(null);
      await api.getSegments(selectedPlatformId);
    } catch (e2) {
      fail(e2.message);
    } finally {
      setBusyId(null);
    }
  };

  const onSegmentEdit = (s) => {
    setSegmentEditId(s.segment_id);
    setSegmentName(s.segment_name || "");
    setIsOptions(!!s.is_options);
  };

  const onSegmentDelete = (s) => {
    openModal({
      type: "confirm",
      title: "Delete?",
      message: `Segment "${s.segment_name}" delete करायचा?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setBusyId(`segment-del-${s.segment_id}`);
          await api.deleteSegment(s.segment_id);
          toast("Segment deleted");
          await api.getSegments(selectedPlatformId);
        } catch (e) {
          fail(e.message);
        } finally {
          setBusyId(null);
          closeModal();
        }
      },
    });
  };

  const cancelSegmentEdit = () => {
    setSegmentEditId(null);
    setSegmentName("");
    setIsOptions(false);
  };

  // -------------------- Derived --------------------
  const selectedPlatform = useMemo(
    () => platforms.find((p) => p.platform_id === selectedPlatformId) || null,
    [platforms, selectedPlatformId]
  );

  // -------------------- Styles (white bg, black text, Roman) --------------------
  const styles = {
    page: {
      width: "100vw",
      minHeight: "100vh",
      margin: 0,
      padding: 0,
      background: "#ffffff",
      color: "#111111",
      fontFamily: '"Times New Roman", Times, serif',
    },
    topBar: {
      width: "100%",
      borderBottom: "1px solid #e5e7eb",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "12px 12px",
      position: "sticky",
      top: 0,
      zIndex: 5,
    },
    title: { fontSize: 16, fontWeight: 700, margin: 0 },

    content: {
      width: "100%",
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 12,
      padding: "12px",
      boxSizing: "border-box",
    },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto" },
    grid2: (wide) => ({
      width: "100%",
      display: "grid",
      gridTemplateColumns: wide ? "1.1fr 0.9fr" : "1fr",
      gap: 12,
    }),
    card: {
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      borderRadius: 14,
      overflow: "hidden",
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid #e5e7eb",
      padding: "12px 12px",
      background: "#ffffff",
    },
    cardHeaderTitle: { fontSize: 14, fontWeight: 700, margin: 0 },

    form: { padding: "12px 12px" },
    formRow: { display: "grid", gridTemplateColumns: "1fr", gap: 10 },
    input: {
      width: "100%",
      height: 44,
      borderRadius: 12,
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#111111",
      padding: "0 12px",
      outline: "none",
      boxSizing: "border-box",
    },
    checkboxRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#111827" },
    btnRow: { display: "flex", gap: 8, flexWrap: "wrap" },

    btn: (variant) => ({
      height: 40,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid #d1d5db",
      background: variant === "primary" ? "#111827" : variant === "danger" ? "#b91c1c" : "#ffffff",
      color: variant === "primary" || variant === "danger" ? "#ffffff" : "#111111",
      cursor: "pointer",
      fontWeight: 700,
      transition: "transform 0.06s ease, box-shadow 0.12s ease",
      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      userSelect: "none",
    }),
    btnDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none", boxShadow: "none" },

    tableWrap: { width: "100%", overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 520 },
    th: {
      textAlign: "left",
      fontSize: 12,
      color: "#6b7280",
      borderBottom: "1px solid #e5e7eb",
      padding: "10px 12px",
      background: "#f9fafb",
      position: "sticky",
      top: 0,
      zIndex: 1,
      whiteSpace: "nowrap",
    },
    td: { borderBottom: "1px solid #f3f4f6", padding: "10px 12px", fontSize: 13, verticalAlign: "top" },
    rowSelected: { background: "#f3f4f6" },

    platformName: { fontWeight: 800, color: "#4c1d95" }, // dark violet
    segmentName: { fontWeight: 800, color: "#1e3a8a" }, // dark blue
    small: { fontSize: 12, color: "#6b7280" },

    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      zIndex: 50,
    },
    modal: {
      width: "min(92vw, 420px)",
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
      overflow: "hidden",
      fontFamily: '"Times New Roman", Times, serif',
    },
    modalHead: {
      padding: "12px 14px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    modalTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: "#111111" },
    modalBody: { padding: "12px 14px", fontSize: 13, color: "#111111" },
    modalFoot: {
      padding: "12px 14px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      flexWrap: "wrap",
    },
    xBtn: {
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      borderRadius: 10,
      height: 34,
      width: 34,
      cursor: "pointer",
      fontWeight: 700,
      lineHeight: "32px",
    },
  };

  // Responsive
  const [isWide, setIsWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 980 : false);
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 980);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Click effect
  const press = (e) => (e.currentTarget.style.transform = "scale(0.98)");
  const release = (e) => (e.currentTarget.style.transform = "scale(1)");

  const Btn = ({ variant, disabled, onClick, children, type = "button" }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={disabled ? undefined : press}
      onMouseUp={disabled ? undefined : release}
      onMouseLeave={disabled ? undefined : release}
      onTouchStart={disabled ? undefined : press}
      onTouchEnd={disabled ? undefined : release}
      style={{ ...styles.btn(variant), ...(disabled ? styles.btnDisabled : null) }}
    >
      {children}
    </button>
  );

  return (
    <div style={styles.page}>
      {/* Header (Only 1 Refresh button here) */}
      <div style={styles.topBar}>
        <div style={styles.title}>Platform & Segment</div>
        <Btn variant="primary" onClick={() => api.getPlatforms()} disabled={platformLoading}>
          {platformLoading ? "Refreshing..." : "Refresh"}
        </Btn>
      </div>

      <div style={styles.content}>
        <div style={styles.container}>
          <div style={styles.grid2(isWide)}>
            {/* PLATFORM */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardHeaderTitle}>Platforms</p>
              </div>

              <form onSubmit={onPlatformSubmit} style={styles.form} noValidate>
                <div style={styles.formRow}>
                  <input
                    style={styles.input}
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="Platform name"
                  />

                  <div style={styles.btnRow}>
                    <Btn type="submit" variant="primary" disabled={busyId === "platform-submit"}>
                      {platformEditId ? "Update" : "Add"}
                    </Btn>

                    {platformEditId ? <Btn onClick={cancelPlatformEdit}>Cancel</Btn> : null}
                  </div>
                </div>
              </form>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Select</th>
                      <th style={styles.th}>Platform</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platforms.map((p) => {
                      const selected = p.platform_id === selectedPlatformId;
                      return (
                        <tr key={p.platform_id} style={selected ? styles.rowSelected : undefined}>
                          <td style={styles.td}>
                            <Btn variant={selected ? "primary" : undefined} onClick={() => onPlatformSelect(p)}>
                              {selected ? "Selected" : "Select"}
                            </Btn>
                          </td>

                          <td style={styles.td}>
                            <div style={styles.platformName}>{p.platform_name}</div>
                            <div style={styles.small}>ID: {p.platform_id}</div>
                          </td>

                          <td style={styles.td}>
                            <div style={styles.btnRow}>
                              <Btn onClick={() => onPlatformEdit(p)}>Edit</Btn>
                              <Btn
                                variant="danger"
                                onClick={() => onPlatformDelete(p)}
                                disabled={busyId === `platform-del-${p.platform_id}`}
                              >
                                {busyId === `platform-del-${p.platform_id}` ? "Deleting..." : "Delete"}
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!platformLoading && platforms.length === 0 ? (
                      <tr>
                        <td style={styles.td} colSpan={3}>
                          No platforms.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SEGMENT */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardHeaderTitle}>Segments</p>
              </div>

              <form onSubmit={onSegmentSubmit} style={styles.form} noValidate>
                <div style={styles.formRow}>
                  <input
                    style={styles.input}
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    placeholder="Segment name"
                    disabled={!selectedPlatformId}
                  />

                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={isOptions}
                      onChange={(e) => setIsOptions(e.target.checked)}
                      disabled={!selectedPlatformId}
                    />
                    <span>Options?</span>
                  </label>

                  <div style={styles.btnRow}>
                    <Btn
                      type="submit"
                      variant="primary"
                      disabled={!selectedPlatformId || busyId === "segment-submit"}
                    >
                      {segmentEditId ? "Update" : "Add"}
                    </Btn>

                    {segmentEditId ? (
                      <Btn onClick={cancelSegmentEdit} disabled={!selectedPlatformId}>
                        Cancel
                      </Btn>
                    ) : null}
                  </div>
                </div>
              </form>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Segment</th>
                      <th style={styles.th}>Options</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((s) => (
                      <tr key={s.segment_id}>
                        <td style={styles.td}>
                          <div style={styles.segmentName}>{s.segment_name}</div>
                          <div style={styles.small}>ID: {s.segment_id}</div>
                        </td>
                        <td style={styles.td}>{s.is_options ? "Yes" : "No"}</td>
                        <td style={styles.td}>
                          <div style={styles.btnRow}>
                            <Btn onClick={() => onSegmentEdit(s)}>Edit</Btn>
                            <Btn
                              variant="danger"
                              onClick={() => onSegmentDelete(s)}
                              disabled={busyId === `segment-del-${s.segment_id}`}
                            >
                              {busyId === `segment-del-${s.segment_id}` ? "Deleting..." : "Delete"}
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {selectedPlatformId && !segmentLoading && segments.length === 0 ? (
                      <tr>
                        <td style={styles.td} colSpan={3}>
                          No segments.
                        </td>
                      </tr>
                    ) : null}

                    {!selectedPlatformId ? (
                      <tr>
                        <td style={styles.td} colSpan={3}>
                          Select a platform.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Center Modal */}
      {modal.open ? (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalHead}>
              <h3 style={styles.modalTitle}>{modal.title}</h3>
              <button style={styles.xBtn} onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <div style={styles.modalBody}>{modal.message}</div>
            <div style={styles.modalFoot}>
              {modal.type === "confirm" ? (
                <>
                  <Btn onClick={closeModal}>{modal.cancelText}</Btn>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (typeof modal.onConfirm === "function") modal.onConfirm();
                      else closeModal();
                    }}
                  >
                    {modal.confirmText}
                  </Btn>
                </>
              ) : (
                <Btn variant="primary" onClick={closeModal}>
                  {modal.confirmText}
                </Btn>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
