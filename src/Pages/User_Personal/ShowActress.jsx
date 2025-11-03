import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  InputGroup,
  Badge,
} from "react-bootstrap";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import LoadingSpinner from "../Entertainment/LoadingSpiner.jsx";

/* ===== API BASE (read/edit/delete only) ===== */
const endpoint = "https://express-backend-myapp.onrender.com/api/act_favorite";

/* ===== Theme ===== */
const theme = {
  primary: "#06b6d4",
  secondary: "#22c55e",
  deep: "#0b1221",
  border: "rgba(15,23,42,0.12)",
  bg: "linear-gradient(180deg,#ffffff 0%, #fcfffb 40%, #f6fbff 100%)",
  shadow: "0 8px 20px rgba(0,0,0,.08)",
  danger: "#ef4444",
  muted: "#64748b",
};

/* ===== Styles ===== */
const styles = {
  card: {
    borderRadius: "18px",
    boxShadow: theme.shadow,
    border: `1px solid ${theme.border}`,
    background: "#fff",
    overflow: "hidden",
  },
  imageWrap: {
    width: "100%",
    height: 240,
    background: "#f8fafc",
    borderBottom: `1px solid ${theme.border}`,
    display: "grid",
    placeItems: "center",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
  },
  nameBanner: {
    margin: "12px 12px 8px",
    borderRadius: 14,
    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
    padding: "12px 16px",
    color: "#fff",
    fontWeight: 900,
    fontSize: "1.05rem",
    textAlign: "center",
    lineHeight: 1.2,
    boxShadow: "0 10px 24px rgba(0,0,0,.08)",
    wordBreak: "break-word",
    whiteSpace: "normal",
  },
  metaWrap: {
    margin: "10px 16px 0",
    border: `1px dashed ${theme.border}`,
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fbfdff",
  },
  metaItem: {
    fontSize: ".95rem",
    color: "#334155",
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    padding: "4px 0",
    flexWrap: "wrap",
  },
  metaLabel: {
    color: "#64748b",
    fontWeight: 600,
    flex: "0 0 170px",
    maxWidth: "100%",
  },
  metaValue: {
    color: "#0b1221",
    fontWeight: 600,
    flex: "1 1 auto",
    wordBreak: "break-word",
    whiteSpace: "normal",
  },
  btnPrimary: {
    background: `linear-gradient(90deg,${theme.secondary},${theme.primary})`,
    border: "none",
    color: "#05212a",
    fontWeight: 600,
    borderRadius: 10,
    padding: "8px 14px",
    boxShadow: "0 4px 12px -6px rgba(6,182,212,.4)",
  },
  btnDanger: {
    background: theme.danger,
    border: "none",
    color: "#fff",
    fontWeight: 600,
    borderRadius: 10,
    padding: "8px 14px",
    boxShadow: "0 4px 12px -6px rgba(239,68,68,.4)",
  },
  fullImage: {
    width: "100%",
    height: "auto",
    objectFit: "contain",
    borderRadius: 12,
    background: "#000",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    border: "none",
    fontSize: "1.8rem",
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  thumb: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    background: "#0b1221",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    cursor: "pointer",
  },
  thumbWrap: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${theme.border}`,
    background: "#000",
  },
  checkbox: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 4,
    border: "2px solid #fff",
    background: "rgba(0,0,0,.25)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    userSelect: "none",
  },
  dropzone: {
    border: `2px dashed ${theme.primary}`,
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    background: "#f8feff",
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.35 },
};

const PLACEHOLDER = "https://via.placeholder.com/400x300?text=No+Image";

/* ===== Local image storage helpers (base64 in localStorage) ===== */
const LS_KEY = (id) => `act_images_${id}`;

function getLocalImages(id) {
  try {
    const raw = localStorage.getItem(LS_KEY(id));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}
function setLocalImages(id, arr) {
  try {
    localStorage.setItem(LS_KEY(id), JSON.stringify(arr || []));
  } catch {
    // ignore
  }
}
function uniqueList(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const s = (x || "").trim();
    if (!s) continue;
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
function buildImageItems(act) {
  const serverImgs = Array.isArray(act.images)
    ? act.images.filter(Boolean)
    : [];
  const localImgs = getLocalImages(act.id);
  const merged = uniqueList([...serverImgs, ...localImgs]);
  return merged.map((src) => ({
    src,
    from: serverImgs.includes(src) ? "server" : "local",
  }));
}

export default function ShowActress() {
  const [actresses, setActresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // slideshow
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // grid modal
  const [gridOpen, setGridOpen] = useState(false);
  const [gridItems, setGridItems] = useState([]);
  const [gridActressName, setGridActressName] = useState("");
  const [gridActressId, setGridActressId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    country: "",
    favorite_actress_name: "",
    favorite_movie_series: "",
    profile_image: "",
    age: "",
    actress_dob: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // add local images
  const [addImgOpen, setAddImgOpen] = useState(false);
  const [addImgId, setAddImgId] = useState(null);
  const [addImgName, setAddImgName] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);

  /* ===== Load ===== */
  const fetchActresses = useCallback(async (signal) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(endpoint, { signal });
      setActresses(res.data || []);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error(err);
        setLoadError("Unable to load data right now.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchActresses(controller.signal);
    return () => controller.abort();
  }, [fetchActresses]);

  useEffect(() => {
    setPage(1);
  }, [actresses.length, query]);

  /* ===== Delete actress ===== */
  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      html: `<strong style="font-size:1.05rem;">Delete <span style="color:#ef4444;">${
        name ?? "this profile"
      }</span> from your favorites?</strong>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: theme.primary,
      cancelButtonColor: theme.danger,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#fff",
      color: "#111827",
      allowOutsideClick: false,
    });
    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${endpoint}/${id}`);
      localStorage.removeItem(LS_KEY(id));
      setActresses((prev) => prev.filter((a) => a.id !== id));
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while deleting.",
      });
    }
  };

  /* ===== Slideshow ===== */
  const openSlideshow = (images, startIndex = 0) => {
    const list = uniqueList(images || []);
    if (!list.length) return;
    setSlideshowImages(list);
    setCurrentIndex(Math.min(Math.max(0, startIndex), list.length - 1));
    setSlideshowOpen(true);
  };
  const closeSlideshow = () => setSlideshowOpen(false);
  const nextImage = () =>
    setCurrentIndex((prev) => (prev + 1) % slideshowImages.length);
  const prevImage = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? slideshowImages.length - 1 : prev - 1
    );

  // keyboard for slideshow
  useEffect(() => {
    if (!slideshowOpen) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") closeSlideshow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slideshowOpen, slideshowImages.length]);

  /* ===== Grid ===== */
  const openGrid = (act, startSelectMode = false) => {
    const items = buildImageItems(act);
    if (!items.length) return;
    setGridItems(items);
    setGridActressName(act.favorite_actress_name || "");
    setGridActressId(act.id);
    setGridOpen(true);
    setSelectMode(startSelectMode);
    setSelected(new Set());
  };
  const closeGrid = () => {
    setGridOpen(false);
    setSelected(new Set());
    setSelectMode(false);
    setGridItems([]);
    setGridActressId(null);
    setGridActressName("");
  };

  const toggleSelect = (idx) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };
  const selectAll = () => {
    setSelected(new Set(gridItems.map((_, i) => i)));
  };
  const clearSelection = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (!gridOpen || selected.size === 0 || !gridActressId) {
      return Swal.fire({
        icon: "info",
        title: "Nothing selected",
        timer: 1000,
        showConfirmButton: false,
      });
    }

    const confirm = await Swal.fire({
      title: "Delete selected images?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: theme.danger,
      cancelButtonColor: theme.primary,
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    const selectedItems = Array.from(selected).map((i) => gridItems[i]);
    const serverUrls = selectedItems
      .filter((it) => it.from === "server")
      .map((it) => it.src);
    const allSelectedUrls = selectedItems.map((it) => it.src);

    try {
      if (serverUrls.length) {
        await axios.post(`${endpoint}/${gridActressId}/images/delete`, {
          urls: serverUrls,
        });
      }

      const currentLocal = getLocalImages(gridActressId);
      const keptLocal = currentLocal.filter(
        (url) => !allSelectedUrls.includes(url)
      );
      setLocalImages(gridActressId, keptLocal);

      await fetchActresses();
      const actAfter = actresses.find((a) => a.id === gridActressId);
      const rebuilt = actAfter ? buildImageItems(actAfter) : [];
      setGridItems(rebuilt);
      setSelected(new Set());
      setSelectMode(false);

      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 900,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: e?.response?.data?.error || "Try again.",
      });
    }
  };

  const deleteAllInGrid = async () => {
    if (!gridOpen || !gridActressId) return;
    const confirm = await Swal.fire({
      title: `Delete ALL images for ${
        gridActressName || "this actress"
      }?`,
      text: "This removes both server and local images.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: theme.danger,
      cancelButtonColor: theme.primary,
      confirmButtonText: "Delete All",
    });
    if (!confirm.isConfirmed) return;

    try {
      await axios.post(`${endpoint}/${gridActressId}/images/delete`, {
        all: true,
      });
      localStorage.removeItem(LS_KEY(gridActressId));

      await fetchActresses();
      closeGrid();
      Swal.fire({
        icon: "success",
        title: "All images deleted",
        timer: 900,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: e?.response?.data?.error || "Try again.",
      });
    }
  };

  /* ===== Filter + pagination ===== */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actresses;
    return actresses.filter((a) => {
      const name = (a.favorite_actress_name || "").toLowerCase();
      const country = (a.country_name || "").toLowerCase();
      const fav = (a.favorite_movie_series || "").toLowerCase();
      return name.includes(q) || country.includes(q) || fav.includes(q);
    });
  }, [actresses, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  /* ===== Edit ===== */
  const openEdit = (act) => {
    setEditId(act.id);
    setEditForm({
      country: act.country_name || act.country_id || "",
      favorite_actress_name: act.favorite_actress_name || "",
      favorite_movie_series: act.favorite_movie_series || "",
      profile_image: act.profile_image || "",
      age: act.age ?? "",
      actress_dob: act.actress_dob ? String(act.actress_dob).slice(0, 10) : "",
      notes: act.notes || "",
    });
    setEditOpen(true);
  };
  const closeEdit = () => setEditOpen(false);

  const saveEdit = async () => {
    const body = {
      country: editForm.country,
      favorite_actress_name: (editForm.favorite_actress_name || "").trim(),
      favorite_movie_series: (editForm.favorite_movie_series || "").trim(),
      profile_image: (editForm.profile_image || "").trim(),
      notes: (editForm.notes || "").trim(),
    };
    if (editForm.age === "" || editForm.age === null) body.age = null;
    else body.age = Number(editForm.age);
    body.actress_dob = editForm.actress_dob ? editForm.actress_dob : null;

    if (
      !body.favorite_actress_name ||
      !body.favorite_movie_series ||
      !body.profile_image
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Name, Series, and Profile Image are required.",
      });
    }

    setSavingEdit(true);
    try {
      await axios.patch(`${endpoint}/${editId}`, body);
      await fetchActresses();
      setEditOpen(false);
      Swal.fire({
        icon: "success",
        title: "Updated",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: e?.response?.data?.error || "Try again.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  /* ===== Add Local Images ===== */
  const openAddImages = (act) => {
    setAddImgId(act.id);
    setAddImgName(act.favorite_actress_name || "Selected Actress");
    setPendingFiles([]);
    setAddImgOpen(true);
  };
  const closeAddImages = () => setAddImgOpen(false);

  const onDropFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;
    const previews = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        size: f.size,
        preview: await fileToDataURL(f),
      }))
    );
    setPendingFiles((prev) => [...prev, ...previews]);
  };

  // paste to add image
  useEffect(() => {
    if (!addImgOpen) return;
    const onPaste = async (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgs = items.filter(
        (it) => it.type && it.type.startsWith("image/")
      );
      if (!imgs.length) return;
      const files = await Promise.all(imgs.map(async (it) => it.getAsFile()));
      await onDropFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImgOpen]);

  const saveLocalImages = async () => {
    if (!addImgId) return;
    if (!pendingFiles.length) {
      return Swal.fire({
        icon: "warning",
        title: "No images",
        text: "Drag & drop or choose images first.",
      });
    }
    const existing = getLocalImages(addImgId);
    const incoming = pendingFiles.map((p) => p.preview);
    const merged = uniqueList([...existing, ...incoming]);
    setLocalImages(addImgId, merged);
    setAddImgOpen(false);

    if (gridOpen && gridActressId === addImgId) {
      const act = actresses.find((a) => a.id === addImgId);
      if (act) setGridItems(buildImageItems(act));
    }

    Swal.fire({
      icon: "success",
      title: "Images added locally",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  /* ===== BODY SCROLL LOCK when any modal open ===== */
  const anyModalOpen =
    slideshowOpen || gridOpen || editOpen || addImgOpen;

  useEffect(() => {
    const original = document.body.style.overflow;
    if (anyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original || "";
    }
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [anyModalOpen]);

  /* ===== Render ===== */
  if (loading) return <LoadingSpinner />;

  return (
    <Container
      fluid
      className="py-3"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* sticky bar */}
      <motion.div
        className="px-3 py-3 mb-3"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1020,
          backdropFilter: "saturate(1.2) blur(6px)",
          background: "rgba(255,255,255,0.75)",
          borderBottom: `1px solid ${theme.border}`,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2">
          <h2
            className="m-0 me-md-3"
            style={{ fontWeight: 800, lineHeight: 1.1 }}
          >
            <span
              style={{
                background: `linear-gradient(90deg,${theme.primary},${theme.secondary})`,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              🎭 Favorite Actress Profiles
            </span>
          </h2>

          <div className="ms-md-auto w-100" style={{ maxWidth: 480 }}>
            <InputGroup>
              <InputGroup.Text className="bg-white">🔎</InputGroup.Text>
              <Form.Control
                placeholder="Search name, country, movie/series..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setQuery("")}
                >
                  Clear
                </Button>
              )}
            </InputGroup>
          </div>
        </div>
      </motion.div>

      {/* helper card */}
      <div
        className="px-3 py-3 mb-3 text-center"
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          boxShadow: theme.shadow,
          background: "#fff",
          maxWidth: 1300,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <p className="text-muted mb-0">
          Search above. Each card lets you <b>add images</b>, <b>view</b>, and{" "}
          <b>manage & delete</b> images.
        </p>
      </div>

      {/* error */}
      {loadError && (
        <div
          className="px-3"
          style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}
        >
          <Card className="mb-3">
            <Card.Body className="d-flex flex-column flex-sm-row align-items-sm-center gap-2">
              <span className="text-danger fw-bold">⚠ {loadError}</span>
              <div className="ms-sm-auto">
                <Button size="sm" onClick={() => fetchActresses()}>
                  Retry
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* list */}
      <div style={{ width: "100%" }}>
        {total === 0 ? (
          <div
            className="text-center text-muted py-5"
            style={{ fontSize: "1.05rem" }}
          >
            {query ? "No matches found." : "No actress profiles added yet."}
          </div>
        ) : (
          <>
            <Row
              className="g-3 g-md-4 px-3 justify-content-start"
              style={{ maxWidth: 1300, margin: "0 auto" }}
            >
              {pageItems.map((act, indexOnPage) => {
                const index = (page - 1) * PAGE_SIZE + indexOnPage;
                const profileSrc = act.profile_image || PLACEHOLDER;
                const mergedItems = buildImageItems(act);
                const hasImages = mergedItems.length > 0;

                return (
                  <Col xs={12} sm={6} md={4} lg={3} key={act.id}>
                    <motion.div {...fadeUp} className="h-100">
                      <Card style={styles.card} className="h-100 d-flex">
                        {/* image */}
                        <div
                          style={styles.imageWrap}
                          onClick={() => openSlideshow([profileSrc], 0)}
                          role="button"
                          title="Open full image"
                        >
                          <img
                            src={profileSrc}
                            alt={act.favorite_actress_name || "actress"}
                            style={styles.image}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER;
                            }}
                          />
                        </div>

                        {/* name */}
                        <div style={styles.nameBanner}>
                          {index + 1}.{" "}
                          {act.favorite_actress_name || "Unknown"}
                        </div>

                        {/* buttons */}
                        <div className="px-3 pb-2 d-grid gap-2">
                          <Button
                            variant="outline-primary"
                            onClick={() => openAddImages(act)}
                          >
                            ➕ Add Images (Drag & Drop)
                          </Button>
                          <Button
                            variant="outline-secondary"
                            disabled={!hasImages}
                            onClick={() => openGrid(act, false)}
                          >
                            🖼 View All
                          </Button>
                          <Button
                            variant="outline-dark"
                            disabled={!hasImages}
                            onClick={() => openGrid(act, true)}
                          >
                            ✅ Manage / Delete Images
                          </Button>
                        </div>

                        {/* meta */}
                        <div style={styles.metaWrap} className="mt-1">
                          <div style={styles.metaItem}>
                            <span style={styles.metaLabel}>Country:</span>
                            <span style={styles.metaValue}>
                              {act.country_name || "-"}
                            </span>
                          </div>
                          <div style={styles.metaItem}>
                            <span style={styles.metaLabel}>
                              Favorite Movie / Series:
                            </span>
                            <span style={styles.metaValue}>
                              {act.favorite_movie_series || "-"}
                            </span>
                          </div>
                        </div>

                        <Card.Body className="d-flex flex-column">
                          <div className="d-grid gap-2 mb-3">
                            <Button
                              style={styles.btnPrimary}
                              className="w-100"
                              disabled={!hasImages}
                              onClick={() =>
                                openSlideshow(
                                  mergedItems.map((i) => i.src),
                                  0
                                )
                              }
                            >
                              ▶️ View Slideshow
                            </Button>

                            <Button
                              variant="outline-dark"
                              className="w-100"
                              onClick={() => openEdit(act)}
                            >
                              ✏️ Edit Details
                            </Button>

                            <Button
                              style={styles.btnDanger}
                              className="w-100"
                              onClick={() =>
                                handleDelete(
                                  act.id,
                                  act.favorite_actress_name
                                )
                              }
                            >
                              🗑 Delete Actress
                            </Button>
                          </div>

                          <div className="mt-auto">
                            {act.age && (
                              <div
                                style={{
                                  fontSize: ".9rem",
                                  color: theme.muted,
                                }}
                              >
                                <strong>Age:</strong> {act.age}
                              </div>
                            )}
                            {act.actress_dob && (
                              <div
                                style={{
                                  fontSize: ".9rem",
                                  color: theme.muted,
                                }}
                              >
                                <strong>DOB:</strong>{" "}
                                {new Date(
                                  act.actress_dob
                                ).toLocaleDateString(undefined, {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            )}
                            {act.notes && (
                              <div
                                style={{
                                  fontSize: ".9rem",
                                  color: "#374151",
                                  fontStyle: "italic",
                                  marginTop: 6,
                                  wordBreak: "break-word",
                                }}
                              >
                                “{act.notes}”
                              </div>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>
                );
              })}
            </Row>

            {/* pagination */}
            <div
              className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 mt-4 px-3"
              style={{ maxWidth: 1300, margin: "0 auto" }}
            >
              <div className="text-muted small">
                Showing <b>{(page - 1) * PAGE_SIZE + 1}</b>–
                <b>{Math.min(page * PAGE_SIZE, total)}</b> of <b>{total}</b>
              </div>
              <div className="btn-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </Button>
                <Button variant="light" size="sm" disabled>
                  {page} / {totalPages}
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== Slideshow Modal ===== */}
      <Modal
        show={slideshowOpen}
        onHide={closeSlideshow}
        centered
        size="xl"
        backdrop="static"
        contentClassName="bg-transparent border-0"
        fullscreen="md-down"
      >
        <Modal.Body
          style={{
            position: "relative",
            background: "rgba(0,0,0,0.92)",
            padding: 16,
            display: "block",
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          {/* close */}
          <Button
            variant="light"
            style={{
              position: "absolute",
              top: 12,
              right: 16,
              borderRadius: "50%",
              fontSize: "1.2rem",
              fontWeight: "bold",
              zIndex: 5,
            }}
            onClick={closeSlideshow}
            aria-label="Close"
          >
            ×
          </Button>

          {/* SCROLL WRAP for mobile */}
          <div
            style={{
              minHeight: "60vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {slideshowImages.length > 0 && (
              <img
                src={slideshowImages[currentIndex]}
                alt={`image ${currentIndex + 1}`}
                style={styles.fullImage}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            )}
          </div>

          {/* arrows */}
          {slideshowImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                style={{ ...styles.navArrow, left: 16 }}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                style={{ ...styles.navArrow, right: 16 }}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* ===== Grid / Manage Modal ===== */}
      <Modal
        show={gridOpen}
        onHide={closeGrid}
        centered
        size="xl"
        scrollable
        backdrop="static"
        contentClassName="bg-white"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            {gridActressName
              ? `${gridActressName} — All Images`
              : "All Images"}
            {selectMode && (
              <Badge bg="warning" text="dark">
                Select mode
              </Badge>
            )}
          </Modal.Title>
          <div className="ms-auto d-flex gap-2">
            {!selectMode ? (
              <Button
                variant="outline-dark"
                size="sm"
                onClick={() => setSelectMode(true)}
              >
                Select
              </Button>
            ) : (
              <>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={deleteSelected}
                  disabled={selected.size === 0}
                >
                  Delete Selected{" "}
                  {selected.size ? `(${selected.size})` : ""}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={deleteAllInGrid}
                >
                  Delete All
                </Button>
                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={() => {
                    setSelectMode(false);
                    setSelected(new Set());
                  }}
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </Modal.Header>
        <Modal.Body
          style={{
            maxHeight: "calc(100vh - 140px)",
            overflowY: "auto",
          }}
        >
          {gridItems.length === 0 ? (
            <div className="text-center text-muted py-4">
              No images.
            </div>
          ) : (
            <Row className="g-3">
              {gridItems.map((it, idx) => {
                const isSel = selected.has(idx);
                return (
                  <Col key={idx} xs={6} sm={4} md={3} lg={3}>
                    <div
                      style={styles.thumbWrap}
                      onClick={() => {
                        if (selectMode) toggleSelect(idx);
                        else
                          openSlideshow(
                            gridItems.map((g) => g.src),
                            idx
                          );
                      }}
                      role="button"
                    >
                      <img
                        src={it.src}
                        alt={`thumb-${idx}`}
                        style={{
                          ...styles.thumb,
                          opacity: selectMode && isSel ? 0.6 : 1,
                        }}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER;
                        }}
                        title={
                          selectMode
                            ? isSel
                              ? "Selected"
                              : "Select"
                            : "Open full size"
                        }
                      />
                      {selectMode && (
                        <div
                          style={{
                            ...styles.checkbox,
                            background: isSel
                              ? theme.primary
                              : "rgba(0,0,0,.35)",
                          }}
                        >
                          {isSel ? "✓" : ""}
                        </div>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          left: 8,
                          bottom: 8,
                          background: "rgba(0,0,0,.55)",
                          color: "#fff",
                          padding: "2px 6px",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        {it.from === "server" ? "server" : "local"}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!selectMode ? (
            <Button variant="secondary" onClick={closeGrid}>
              Close
            </Button>
          ) : (
            <div className="d-flex w-100 justify-content-between">
              <div className="text-muted small">
                Selected: <b>{selected.size}</b> / {gridItems.length}
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="danger"
                  onClick={deleteSelected}
                  disabled={selected.size === 0}
                >
                  Delete Selected
                </Button>
                <Button variant="outline-danger" onClick={deleteAllInGrid}>
                  Delete All
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectMode(false);
                    setSelected(new Set());
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal.Footer>
      </Modal>

      {/* ===== Edit Modal ===== */}
      <Modal
        show={editOpen}
        onHide={closeEdit}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Actress Details</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Country (id or exact name)</Form.Label>
                  <Form.Control
                    value={editForm.country}
                    onChange={(e) =>
                      setEditForm({ ...editForm, country: e.target.value })
                    }
                    placeholder="India or 101"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Favorite Actress Name *</Form.Label>
                  <Form.Control
                    value={editForm.favorite_actress_name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        favorite_actress_name: e.target.value,
                      })
                    }
                    placeholder="Name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Favorite Movie / Series *</Form.Label>
                  <Form.Control
                    value={editForm.favorite_movie_series}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        favorite_movie_series: e.target.value,
                      })
                    }
                    placeholder="Movie or Series"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Profile Image URL *</Form.Label>
                  <Form.Control
                    value={editForm.profile_image}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        profile_image: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Age</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={editForm.age}
                    onChange={(e) =>
                      setEditForm({ ...editForm, age: e.target.value })
                    }
                    placeholder="e.g. 27"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>DOB</Form.Label>
                  <Form.Control
                    type="date"
                    value={editForm.actress_dob || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        actress_dob: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    placeholder="Any notes..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
          <div className="small text-muted mt-3">
            * Required fields. Editing will call <code>PATCH {endpoint}/:id</code>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEdit} disabled={savingEdit}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveEdit} disabled={savingEdit}>
            {savingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== Add Images (local) ===== */}
      <Modal
        show={addImgOpen}
        onHide={closeAddImages}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>➕ Add Images — {addImgName}</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <div
            style={styles.dropzone}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={async (e) => {
              e.preventDefault();
              await onDropFiles(e.dataTransfer.files);
            }}
          >
            <p className="mb-1">
              <b>Drag & drop</b> images here, or
            </p>
            <Form.Label className="btn btn-outline-primary mt-2">
              Choose Files
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  await onDropFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </Form.Label>
            <div className="text-muted mt-2 small">
              Tip: you can also paste an image (Ctrl/⌘+V) while this modal is
              open.
            </div>
          </div>

          {pendingFiles.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 fw-bold">
                To be added ({pendingFiles.length}):
              </div>
              <Row className="g-2">
                {pendingFiles.map((pf, i) => (
                  <Col xs={6} sm={4} md={3} key={i}>
                    <img
                      src={pf.preview}
                      alt={pf.name}
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: `1px solid ${theme.border}`,
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </div>
          )}

          <div className="small text-muted mt-3">
            These images are stored <b>locally in your browser</b> (no upload).
            They will appear together with server images, de-duplicated.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeAddImages}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={saveLocalImages}
            disabled={!pendingFiles.length}
          >
            Add {pendingFiles.length ? `(${pendingFiles.length})` : ""} Images
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
