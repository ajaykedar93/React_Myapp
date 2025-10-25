// AdminImp_document.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
  Container, Row, Col, Card, Button, Modal, Form, InputGroup, Badge, Offcanvas
} from "react-bootstrap";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

/* ===== API BASE ===== */
const endpoint = "https://express-backend-myapp.onrender.com/api/admin_impdocument";

/* ===== Theme ===== */
const theme = {
  primary: "#06b6d4",
  secondary: "#a78bfa",
  accent: "#22c55e",
  bg: "linear-gradient(180deg,#ffffff 0%, #f9fbff 40%, #f6fffb 100%)",
  border: "rgba(15,23,42,0.12)",
  shadow: "0 10px 26px rgba(2,6,23,.08)",
  danger: "#ef4444",
  muted: "#64748b",
  deep: "#0b1221",
};

/* ===== Helpers ===== */
const formatBytes = (n) => {
  if (!n && n !== 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1);
  return `${(n / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

/* ===== File type helpers (format check + icons + color) ===== */
const getExt = (mime, name = "") => {
  const n = String(name || "").toLowerCase();
  const m = String(mime || "").toLowerCase();
  const dot = n.lastIndexOf(".");
  const ext = dot > -1 ? n.slice(dot + 1) : "";
  if (ext) return ext;
  if (m.includes("pdf")) return "pdf";
  if (m.includes("msword") || m.includes("word")) return "docx";
  if (m.includes("spreadsheet") || m.includes("excel")) return "xlsx";
  if (m.includes("presentation") || m.includes("powerpoint")) return "pptx";
  if (m.includes("csv")) return "csv";
  if (m.startsWith("image/")) return m.split("/")[1];
  if (m.startsWith("video/")) return m.split("/")[1];
  if (m.startsWith("audio/")) return m.split("/")[1];
  if (m.includes("json")) return "json";
  if (m.includes("zip") || m.includes("compressed")) return "zip";
  if (m.includes("text")) return "txt";
  return "";
};

const iconForExt = (ext) => {
  switch ((ext || "").toLowerCase()) {
    case "pdf": return "📕";
    case "doc": case "docx": return "📝";
    case "xls": case "xlsx": return "📊";
    case "ppt": case "pptx": return "📈";
    case "csv": return "🧾";
    case "json": return "🧩";
    case "zip": case "rar": case "7z": return "🗜️";
    case "txt": return "📄";
    case "png": case "jpg": case "jpeg": case "gif": case "webp": case "svg": return "🖼️";
    case "mp4": case "mov": case "mkv": case "avi": case "webm": return "🎬";
    case "mp3": case "wav": case "m4a": case "flac": return "🎧";
    default: return "📎";
  }
};

const colorForExt = (ext) => {
  const e = (ext || "").toLowerCase();
  if (e === "pdf") return "#ef4444";
  if (["doc", "docx"].includes(e)) return "#3b82f6";
  if (["xls", "xlsx", "csv"].includes(e)) return "#22c55e";
  if (["ppt", "pptx"].includes(e)) return "#f97316";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e)) return "#06b6d4";
  if (["zip", "rar", "7z"].includes(e)) return "#8b5cf6";
  if (["json", "txt"].includes(e)) return "#64748b";
  if (["mp4", "mov", "mkv", "avi", "webm"].includes(e)) return "#9333ea";
  if (["mp3", "wav", "m4a", "flac"].includes(e)) return "#10b981";
  return "#0ea5e9";
};

/* ===== Styles ===== */
const styles = {
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 1020,
    backdropFilter: "saturate(1.2) blur(6px)",
    background: "rgba(255,255,255,0.85)",
    borderBottom: `1px solid ${theme.border}`,
  },
  card: {
    borderRadius: 18,
    boxShadow: theme.shadow,
    border: `1px solid ${theme.border}`,
    background: "#fff",
    overflow: "hidden",
  },
  dropzone: {
    border: `2px dashed ${theme.primary}`,
    borderRadius: 14,
    padding: 18,
    textAlign: "center",
    background: "#f1fcff",
  },
  gradientTitle: {
    background: `linear-gradient(90deg,${theme.primary},${theme.secondary})`,
    WebkitBackgroundClip: "text",
    color: "transparent",
    fontWeight: 800,
  },
  chip: {
    background: "rgba(6,182,212,.12)",
    color: "#0b5d66",
    border: "1px solid rgba(6,182,212,.25)",
  },
  roundExt: (bg) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: bg,
    color: "white",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    border: "2px solid rgba(255,255,255,0.8)",
    boxShadow: "0 4px 12px rgba(2,6,23,.18)",
  }),
  tagRail: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 6,
  },
};

export default function AdminImpDocument() {
  /* ===== Data / State ===== */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // fixed page size: 10
  const limit = 10;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filters
  const [q, setQ] = useState("");                // debounced, sent to API
  const [searchInput, setSearchInput] = useState(""); // immediate input
  const [mime, setMime] = useState("");
  const [tagsFilter, setTagsFilter] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [fileObj, setFileObj] = useState(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [tagsField, setTagsField] = useState("");

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    document_id: null,
    label: "",
    description: "",
    tags: "",
    file: null,
  });

  // Multi-select delete
  const [selectedIds, setSelectedIds] = useState([]);

  // Debounce search input → q
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ===== Fetch list ===== */
  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { page, limit };
      if (q) params.q = q;
      if (mime.trim()) params.mime = mime.trim();
      tagsFilter.forEach((t) => (params.tag = params.tag ? [].concat(params.tag, t) : [t]));
      const res = await axios.get(endpoint, { params });
      setRows(res.data?.rows || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      console.error(e);
      setLoadError("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, mime, tagsFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { setPage(1); }, [q, mime, tagsFilter.join(",")]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ===== Upload Handlers ===== */
  const onDrop = async (files) => {
    if (!files?.length) return;
    setFileObj(files[0]);
  };
  const handleFileInput = (e) => onDrop(Array.from(e.target.files || []));

  const submitUpload = async () => {
    if (!label.trim()) {
      return Swal.fire({ icon: "warning", title: "Label required", position: "center" });
    }
    if (!fileObj) {
      return Swal.fire({ icon: "warning", title: "Pick a file to upload", position: "center" });
    }
    const form = new FormData();
    form.append("label", label.trim());
    if (description) form.append("description", description);
    if (tagsField.trim()) form.append("tags", tagsField);
    form.append("file", fileObj);

    setUploading(true);
    try {
      await axios.post(endpoint, form, { headers: { "Content-Type": "multipart/form-data" } });
      setFileObj(null);
      setLabel("");
      setDescription("");
      setTagsField("");
      await Swal.fire({ icon: "success", title: "Uploaded", timer: 1100, showConfirmButton: false, position: "center" });
      fetchList();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Upload failed", text: e?.response?.data?.error || "Try again.", position: "center" });
    } finally {
      setUploading(false);
    }
  };

  /* ===== Edit Handlers ===== */
  const openEdit = (r) => {
    setEditForm({
      document_id: r.document_id,
      label: r.label || "",
      description: r.description || "",
      tags: (r.tags || []).join(", "),
      file: null,
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    const { document_id, label: elabel, description: edesc, tags: etags, file } = editForm;
    if (!document_id) return;
    if (!elabel.trim()) return Swal.fire({ icon: "warning", title: "Label required", position: "center" });

    const form = new FormData();
    form.append("label", elabel.trim());
    form.append("description", edesc);
    form.append("tags", etags);
    if (file) form.append("file", file);

    try {
      await axios.patch(`${endpoint}/${document_id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setEditOpen(false);
      await Swal.fire({ icon: "success", title: "Updated", timer: 1000, showConfirmButton: false, position: "center" });
      fetchList();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Update failed", text: e?.response?.data?.error || "Try again.", position: "center" });
    }
  };

  /* ===== Delete ===== */
  const confirmDelete = async (id) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "Delete this document?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: theme.danger,
      position: "center",
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.delete(`${endpoint}/${id}`);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 900, showConfirmButton: false, position: "center" });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchList();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Delete failed", text: e?.response?.data?.error || "Try again.", position: "center" });
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    const ok = await Swal.fire({
      icon: "warning",
      title: `Delete ${selectedIds.length} selected?`,
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: theme.danger,
      position: "center",
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.post(`${endpoint}/bulk-delete`, { ids: selectedIds });
      await Swal.fire({ icon: "success", title: "Deleted", timer: 900, showConfirmButton: false, position: "center" });
      setSelectedIds([]);
      fetchList();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Bulk delete failed", text: e?.response?.data?.error || "Try again.", position: "center" });
    }
  };

  /* ===== Select helpers ===== */
  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const allSelectedOnPage = useMemo(() => {
    const idsOnPage = rows.map((r) => r.document_id);
    return idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.includes(id));
  }, [rows, selectedIds]);
  const toggleAllOnPage = () => {
    const idsOnPage = rows.map((r) => r.document_id);
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !idsOnPage.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
    }
  };

  /* ===== Preview ===== */
  const openPreview = (r) => {
    setPreviewDoc(r);
    setPreviewOpen(true);
  };

  /* ===== Tag filters ===== */
  const addFilterTag = (t) => {
    const v = String(t || "").trim();
    if (!v) return;
    setTagsFilter((prev) => Array.from(new Set([...prev, v])));
  };
  const removeFilterTag = (t) => {
    setTagsFilter((prev) => prev.filter((x) => x !== t));
  };
  const toggleTagFilter = (t) => {
    setTagsFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  // Tag rail from current page rows
  const availableTags = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => (r.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [rows]);

  /* ===== UI ===== */
  return (
    <Container fluid className="py-3" style={{ minHeight: "100vh", background: theme.bg }}>
      {/* Top Bar */}
      <motion.div style={styles.topbar} className="px-3 py-3 mb-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-center w-100">
            <h2 className="m-0" style={{ lineHeight: 1.1 }}>
              <span style={styles.gradientTitle}>📄 Admin Important Documents</span>
            </h2>

            {/* Search + Filters */}
            <div className="ms-md-auto w-100" style={{ maxWidth: 560 }}>
              <InputGroup>
                <InputGroup.Text className="bg-white">🔎</InputGroup.Text>
                <Form.Control
                  placeholder="Search label/description…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {!!searchInput && (
                  <Button variant="outline-secondary" onClick={() => setSearchInput("")}>
                    Clear
                  </Button>
                )}
                <Button variant="outline-info" onClick={() => setFilterOpen(true)}>Filters</Button>
              </InputGroup>
            </div>
          </div>

          {/* Tag rail */}
          <div style={styles.tagRail} className="pt-1">
            {availableTags.length === 0 ? (
              <span className="text-muted small">— no tags on this page —</span>
            ) : (
              availableTags.map((t) => {
                const active = tagsFilter.includes(t);
                return (
                  <Badge
                    key={t}
                    pill
                    bg={active ? "info" : "light"}
                    text={active ? "dark" : "dark"}
                    className="border"
                    style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                    onClick={() => toggleTagFilter(t)}
                  >
                    #{t}
                  </Badge>
                );
              })
            )}
          </div>
        </div>
      </motion.div>

      {/* Upload Card */}
      <Row className="px-3">
        <Col xs={12} className="mb-3">
          <motion.div {...fadeUp}>
            <Card style={styles.card}>
              <Card.Body>
                <Row className="g-3">
                  <Col xs={12} md={4}>
                    <div
                      style={styles.dropzone}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                      onDrop={(e) => { e.preventDefault(); onDrop(Array.from(e.dataTransfer.files || [])); }}
                    >
                      <div className="mb-2"><b>Drag & drop</b> a file here, or</div>
                      <Form.Label className="btn btn-outline-primary m-0">
                        Choose File
                        <Form.Control type="file" hidden onChange={handleFileInput} />
                      </Form.Label>
                      {fileObj && (
                        <div className="mt-2 small text-muted">
                          Selected: <b>{fileObj.name}</b>
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col xs={12} md={8}>
                    <Row className="g-2">
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Label *</Form.Label>
                          <Form.Control value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Title for the document" />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Description</Form.Label>
                          <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Tags (CSV or JSON array)</Form.Label>
                          <Form.Control value={tagsField} onChange={(e) => setTagsField(e.target.value)} placeholder='e.g. finance, 2025 or ["finance","2025"]' />
                        </Form.Group>
                      </Col>

                      <Col xs={12} className="d-grid d-sm-flex gap-2">
                        <Button
                          variant="success"
                          onClick={submitUpload}
                          disabled={uploading}
                        >
                          {uploading ? "Uploading…" : "⬆ Upload"}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => { setFileObj(null); setLabel(""); setDescription(""); setTagsField(""); }}
                        >
                          Reset
                        </Button>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* List Card */}
      <Row className="px-3">
        <Col xs={12}>
          <motion.div {...fadeUp}>
            <Card style={styles.card}>
              <Card.Header className="d-flex flex-column flex-md-row gap-2 align-items-start align-items-md-center">
                <div className="fw-bold">Documents</div>
                <div className="text-muted small ms-md-2">{total} total</div>
                <div className="ms-md-auto d-flex gap-2 align-items-center">
                  {/* Fixed page size: show indicator only */}
                  <span className="small text-muted">10 / page</span>
                  <div className="btn-group">
                    <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</Button>
                    <Button size="sm" variant="light" disabled>{page} / {totalPages}</Button>
                    <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ›</Button>
                  </div>
                  <Button size="sm" variant="outline-danger" disabled={!selectedIds.length} onClick={bulkDelete}>
                    🗑 Delete Selected ({selectedIds.length})
                  </Button>
                </div>
              </Card.Header>

              <Card.Body>
                {loadError ? (
                  <div className="text-danger">{loadError}</div>
                ) : loading ? (
                  <div className="text-muted">Loading…</div>
                ) : rows.length === 0 ? (
                  <div className="text-muted text-center py-5" style={{ fontWeight: 700 }}>
                    No Doc Message
                  </div>
                ) : (
                  <Row className="g-3">
                    {/* Select All on page */}
                    <Col xs={12}>
                      <Form.Check
                        type="checkbox"
                        id="select-all-page"
                        label="Select all on this page"
                        checked={allSelectedOnPage}
                        onChange={toggleAllOnPage}
                      />
                    </Col>

                    {rows.map((r) => {
                      const ext = getExt(r.mime_type, r.original_name) || "";
                      const extText = (ext || "").slice(0, 4).toUpperCase();
                      const circleBg = colorForExt(ext);
                      const icon = iconForExt(ext);
                      return (
                        <Col key={r.document_id} xs={12} sm={6} lg={4} xl={3}>
                          <motion.div {...fadeUp}>
                            <Card className="h-100" style={{ ...styles.card, boxShadow: "none" }}>
                              <Card.Body className="d-flex flex-column">
                                <div className="d-flex align-items-start justify-content-between mb-2">
                                  <Form.Check
                                    type="checkbox"
                                    checked={selectedIds.includes(r.document_id)}
                                    onChange={() => toggleSelected(r.document_id)}
                                  />
                                  <div className="d-flex align-items-center gap-2">
                                    <div style={styles.roundExt(circleBg)} title={extText}>
                                      {extText || "FILE"}
                                    </div>
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  <span style={{ fontSize: 18 }}>{icon}</span>
                                  <div className="fw-bold flex-grow-1" style={{ color: theme.deep, wordBreak: "break-word" }}>
                                    {r.label}
                                  </div>
                                </div>

                                {r.description && (
                                  <div className="text-muted small mt-1" title={r.description} style={{ minHeight: 36 }}>
                                    {r.description.length > 60 ? r.description.slice(0, 60) + "…" : r.description}
                                  </div>
                                )}

                                <div className="mt-2 small">
                                  <div><span className="text-muted">Name:</span> {r.original_name}</div>
                                  <div><span className="text-muted">Type:</span> {r.mime_type}</div>
                                  <div><span className="text-muted">Size:</span> {formatBytes(r.file_size)}</div>
                                  <div className="mt-1 d-flex flex-wrap gap-1">
                                    {(r.tags || []).map((t, i) => (
                                      <Badge
                                        key={i}
                                        pill
                                        style={styles.chip}
                                        onClick={() => toggleTagFilter(t)}
                                      >
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="d-grid gap-2 mt-3">
                                  <Button variant="outline-primary" onClick={() => openPreview(r)}>👁 Preview</Button>
                                  <Button variant="outline-success" onClick={() => window.open(`${endpoint}/${r.document_id}/download`, "_blank")}>⬇ Download</Button>
                                  <Button variant="outline-dark" onClick={() => openEdit(r)}>✏️ Edit</Button>
                                  <Button variant="outline-danger" onClick={() => confirmDelete(r.document_id)}>🗑 Delete</Button>
                                </div>
                              </Card.Body>
                              <Card.Footer className="text-muted small">
                                {new Date(r.created_at).toLocaleString()}
                              </Card.Footer>
                            </Card>
                          </motion.div>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Filters Offcanvas */}
      <Offcanvas show={filterOpen} onHide={() => setFilterOpen(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Form.Group className="mb-3">
            <Form.Label>Mime type (exact or prefix like image/)</Form.Label>
            <Form.Control value={mime} onChange={(e) => setMime(e.target.value)} placeholder="application/pdf or image/" />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Add Tag Filter</Form.Label>
            <InputGroup>
              <Form.Control id="tagFilterInput" placeholder="e.g. finance" />
              <Button onClick={() => {
                const el = document.getElementById("tagFilterInput");
                if (el) { addFilterTag(el.value); el.value = ""; }
              }}>Add</Button>
            </InputGroup>
          </Form.Group>
          <div className="mb-3 d-flex flex-wrap gap-2">
            {tagsFilter.map((t) => (
              <Badge key={t} pill bg="secondary">
                {t} <span role="button" className="ms-1" onClick={() => removeFilterTag(t)}>✕</span>
              </Badge>
            ))}
          </div>

          <div className="d-grid gap-2">
            <Button variant="primary" onClick={() => { fetchList(); setFilterOpen(false); }}>Apply</Button>
            <Button variant="outline-secondary" onClick={() => { setMime(""); setTagsFilter([]); }}>Reset</Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Preview Modal */}
      <Modal show={previewOpen} onHide={() => setPreviewOpen(false)} centered size="xl" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Preview — {previewDoc?.original_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0, height: "80vh" }}>
          {previewDoc ? (
            <iframe
              title="preview"
              src={`${endpoint}/${previewDoc.document_id}/view`}
              style={{ border: "none", width: "100%", height: "100%" }}
            />
          ) : (
            <div className="p-4 text-muted">No preview.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {previewDoc && (
            <Button variant="success" onClick={() => window.open(`${endpoint}/${previewDoc.document_id}/download`, "_blank")}>
              Download
            </Button>
          )}
          <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={editOpen} onHide={() => setEditOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Label *</Form.Label>
                <Form.Control
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Replace File (optional)</Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setEditForm({ ...editForm, file: e.target.files?.[0] || null })}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Tags (CSV or JSON array)</Form.Label>
                <Form.Control
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="small text-muted mt-3">PATCH {endpoint}/:id</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={submitEdit}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
