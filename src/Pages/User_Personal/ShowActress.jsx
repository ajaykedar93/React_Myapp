import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ProgressBar,
} from "react-bootstrap";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

/* ===== API BASE ===== */
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
    /* mobile-friendly height: about 52vw capped */
    height: "min(260px, 52vw)",
    background: "#0b1221",
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
    flex: "0 0 150px",
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

const PLACEHOLDER =
  "https://via.placeholder.com/800x600/000000/FFFFFF?text=No+Image";

/* ===== Local image storage helpers ===== */
const LS_KEY = (id) => `act_images_${id}`;
const getLocalImages = (id) => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(id)) || "[]").filter(Boolean);
  } catch {
    return [];
  }
};
const setLocalImages = (id, arr) => {
  try {
    localStorage.setItem(LS_KEY(id), JSON.stringify(arr || []));
  } catch {}
};
const uniqueList = (arr) => {
  const seen = new Set(),
    out = [];
  for (const x of arr) {
    const s = (x || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
};
const fileToDataURL = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error("Failed"));
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
const buildImageItems = (act) => {
  const serverImgs = Array.isArray(act.images)
    ? act.images.filter(Boolean)
    : [];
  const localImgs = getLocalImages(act.id);
  const merged = uniqueList([...serverImgs, ...localImgs]);
  return merged.map((src) => ({
    src,
    from: serverImgs.includes(src) ? "server" : "local",
  }));
};

/* ===== Center progress overlay ===== */
function useProgress() {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    clearInterval(timerRef.current);
    setShow(true);
    setProgress(10);
    timerRef.current = setInterval(() => {
      setProgress((p) =>
        p < 90 ? p + Math.max(1, Math.round((100 - p) * 0.06)) : p
      );
    }, 120);
  }, []);

  const end = useCallback(() => {
    clearInterval(timerRef.current);
    setProgress(100);
    // Keep it visible a moment so users see 100%
    setTimeout(() => setShow(false), 350);
    setTimeout(() => setProgress(0), 700);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);
  return { progress, show, start, end };
}

function ProgressOverlay({ show, progress }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.45)",
        zIndex: 3000,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          width: "min(480px,90vw)",
          background: "#fff",
          borderRadius: 16,
          padding: "18px 18px 14px",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="mb-2" style={{ fontWeight: 700, color: "#0b1221" }}>
          Loading… {progress}%
        </div>
        <ProgressBar
          now={progress}
          animated
          style={{ height: 10, borderRadius: 999 }}
        />
      </div>
    </div>
  );
}

/* ====================== MAIN ====================== */
export default function ShowActress() {
  const [actresses, setActresses] = useState([]);
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

  // add actress
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    country: "",
    favorite_actress_name: "",
    favorite_movie_series: "",
    profile_image: "",
    age: "",
    actress_dob: "",
    notes: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // add local images
  const [addImgOpen, setAddImgOpen] = useState(false);
  const [addImgId, setAddImgId] = useState(null);
  const [addImgName, setAddImgName] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);

  // progress overlay
  const { progress, show, start, end } = useProgress();

  /* ===== Load ===== */
  const fetchActresses = useCallback(
    async (signal) => {
      setLoadError("");
      try {
        start(); // show overlay BEFORE request
        const res = await axios.get(endpoint, { signal });
        setActresses(res.data || []);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error(err);
          setLoadError("Unable to load data right now.");
        }
      } finally {
        end();
      }
    },
    [start, end]
  );

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
      start();
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
    } finally {
      end();
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
    setCurrentIndex((prev) => (prev === 0 ? slideshowImages.length - 1 : prev - 1));

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
  const openGrid = (act, startSelect = false) => {
    const items = buildImageItems(act);
    if (!items.length) return;
    setGridItems(items);
    setGridActressName(act.favorite_actress_name || "");
    setGridActressId(act.id);
    setGridOpen(true);
    setSelectMode(startSelect);
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
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(gridItems.map((_, i) => i)));
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
      start();
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

      // refresh items
      const res = await axios.get(endpoint);
      const list = res.data || [];
      const actAfter = list.find((a) => a.id === gridActressId);
      const rebuilt = actAfter ? buildImageItems(actAfter) : [];
      setActresses(list);
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
    } finally {
      end();
    }
  };

  const deleteAllInGrid = async () => {
    if (!gridOpen || !gridActressId) return;
    const confirm = await Swal.fire({
      title: `Delete ALL images for ${gridActressName || "this actress"}?`,
      text: "This removes both server and local images.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: theme.danger,
      cancelButtonColor: theme.primary,
      confirmButtonText: "Delete All",
    });
    if (!confirm.isConfirmed) return;

    try {
      start();
      await axios.post(`${endpoint}/${gridActressId}/images/delete`, {
        all: true,
      });
      localStorage.removeItem(LS_KEY(gridActressId));

      const res = await axios.get(endpoint);
      setActresses(res.data || []);
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
    } finally {
      end();
    }
  };

  /* ===== Filter + pagination ===== */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actresses;
    return actresses.filter((a) => {
      const name = (a.favorite_actress_name || "").toLowerCase();
      const country = (a.country_name || a.country || "").toLowerCase();
      const fav = (a.favorite_movie_series || "").toLowerCase();
      return name.includes(q) || country.includes(q) || fav.includes(q);
    });
  }, [actresses, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const startIdx = (page - 1) * PAGE_SIZE;
    return filtered.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filtered, page]);

  /* ===== Edit ===== */
  const openEdit = (act) => {
    setEditId(act.id);
    setEditForm({
      country: act.country_name || act.country || "",
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
      age:
        editForm.age === "" || editForm.age === null
          ? null
          : Number(editForm.age),
      actress_dob: editForm.actress_dob ? editForm.actress_dob : null,
    };
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
    try {
      setSavingEdit(true);
      start();
      await axios.patch(`${endpoint}/${editId}`, body);
      const res = await axios.get(endpoint);
      setActresses(res.data || []);
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
      end();
    }
  };

  /* ===== Add Actress (POST) ===== */
  const openAdd = () => {
    setAddForm({
      country: "",
      favorite_actress_name: "",
      favorite_movie_series: "",
      profile_image: "",
      age: "",
      actress_dob: "",
      notes: "",
    });
    setAddOpen(true);
  };
  const closeAdd = () => setAddOpen(false);

  const saveAdd = async () => {
    const body = {
      country: (addForm.country || "").trim(),
      favorite_actress_name: (addForm.favorite_actress_name || "").trim(),
      favorite_movie_series: (addForm.favorite_movie_series || "").trim(),
      profile_image: (addForm.profile_image || "").trim(),
      notes: (addForm.notes || "").trim(),
      age:
        addForm.age === "" || addForm.age === null ? null : Number(addForm.age),
      actress_dob: addForm.actress_dob ? addForm.actress_dob : null,
    };
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
    try {
      setSavingAdd(true);
      start();
      await axios.post(endpoint, body);
      const res = await axios.get(endpoint);
      setActresses(res.data || []);
      setAddOpen(false);
      Swal.fire({
        icon: "success",
        title: "Added",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Add failed",
        text: e?.response?.data?.error || "Try again.",
      });
    } finally {
      setSavingAdd(false);
      end();
    }
  };

  /* ===== Add Local Images (images only) ===== */
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
    if (!files.length) {
      Swal.fire({
        icon: "info",
        title: "Images only",
        text: "Please drop image files (JPG/PNG/WebP/etc.)",
      });
      return;
    }
    const previews = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        size: f.size,
        preview: await fileToDataURL(f),
      }))
    );
    setPendingFiles((prev) => [...prev, ...previews]);
  };

  // allow paste to add image
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

  /* ===== Render ===== */
  return (
    <Container
      fluid
      className="p-0"
      style={{
        minHeight: "100dvh", // full mobile viewport height (safe)
        background: theme.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ProgressOverlay show={show} progress={progress} />

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
          <h2 className="m-0 me-md-3" style={{ fontWeight: 800, lineHeight: 1.1 }}>
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

          <div className="ms-md-auto w-100" style={{ maxWidth: 520 }}>
            <InputGroup>
              <InputGroup.Text className="bg-white">🔎</InputGroup.Text>
              <Form.Control
                placeholder="Search name, country, movie/series..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <Button variant="outline-secondary" onClick={() => setQuery("")}>
                  Clear
                </Button>
              )}
              <Button
                variant="success"
                onClick={openAdd}
                style={{ marginLeft: 8, fontWeight: 700 }}
              >
                ➕ Add Actress
              </Button>
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
          Add a new actress, then attach <b>images only</b> (drag & drop or paste) to view and manage.
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
        {filtered.length === 0 ? (
          <div
            className="text-center text-muted py-5"
            style={{ fontSize: "1.05rem" }}
          >
            {query ? "No matches found." : "No actress profiles yet. Click “Add Actress” to create one."}
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
                          {index + 1}. {act.favorite_actress_name || "Unknown"}
                        </div>

                        {/* buttons */}
                        <div className="px-3 pb-2 d-grid gap-2">
                          <Button
                            variant="outline-primary"
                            onClick={() => openAddImages(act)}
                          >
                            ➕ Add Images (Drag/Paste)
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
                              {act.country_name || act.country || "-"}
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
                                handleDelete(act.id, act.favorite_actress_name)
                              }
                            >
                              🗑 Delete Actress
                            </Button>
                          </div>

                          <div className="mt-auto">
                            {act.age && (
                              <div
                                style={{ fontSize: ".9rem", color: theme.muted }}
                              >
                                <strong>Age:</strong> {act.age}
                              </div>
                            )}
                            {act.actress_dob && (
                              <div
                                style={{ fontSize: ".9rem", color: theme.muted }}
                              >
                                <strong>DOB:</strong>{" "}
                                {new Date(act.actress_dob).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
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

      {/* ===== Slideshow Modal (center, scroll, full-size) ===== */}
      <Modal
        show={slideshowOpen}
        onHide={closeSlideshow}
        centered
        size="xl"
        backdrop="static"
        contentClassName="bg-transparent border-0"
        fullscreen="md-down"
        scrollable
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
            {gridActressName ? `${gridActressName} — All Images` : "All Images"}
            {selectMode && <Badge bg="warning" text="dark">Select mode</Badge>}
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
                  Delete Selected {selected.size ? `(${selected.size})` : ""}
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
            <div className="text-center text-muted py-4">No images.</div>
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
                        else openSlideshow(gridItems.map((g) => g.src), idx);
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

      {/* ===== Edit Actress Modal ===== */}
      <Modal
        show={editOpen}
        onHide={closeEdit}
        centered
        size="lg"
        backdrop="static"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Actress Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
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

      {/* ===== Add Actress Modal (POST) ===== */}
      <Modal
        show={addOpen}
        onHide={closeAdd}
        centered
        size="lg"
        backdrop="static"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>➕ Add Actress</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Country (id or exact name)</Form.Label>
                  <Form.Control
                    value={addForm.country}
                    onChange={(e) =>
                      setAddForm({ ...addForm, country: e.target.value })
                    }
                    placeholder="India or 101"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Favorite Actress Name *</Form.Label>
                  <Form.Control
                    value={addForm.favorite_actress_name}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
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
                    value={addForm.favorite_movie_series}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
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
                    value={addForm.profile_image}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
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
                    value={addForm.age}
                    onChange={(e) =>
                      setAddForm({ ...addForm, age: e.target.value })
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
                    value={addForm.actress_dob || ""}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
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
                    value={addForm.notes}
                    onChange={(e) =>
                      setAddForm({ ...addForm, notes: e.target.value })
                    }
                    placeholder="Any notes..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
          <div className="small text-muted mt-3">
            * Required fields. Creating will call <code>POST {endpoint}</code>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeAdd} disabled={savingAdd}>
            Cancel
          </Button>
          <Button variant="success" onClick={saveAdd} disabled={savingAdd}>
            {savingAdd ? "Saving..." : "Add Actress"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== Add Images (local only) ===== */}
      <Modal
        show={addImgOpen}
        onHide={closeAddImages}
        centered
        size="lg"
        backdrop="static"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>➕ Add Images — {addImgName}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
            Only image files are allowed.
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
