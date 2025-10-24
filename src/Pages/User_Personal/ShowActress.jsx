import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Button, Modal } from "react-bootstrap";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import LoadingSpinner from "../Entertainment/LoadingSpiner.jsx";

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

  // Profile image fully visible (no crop)
  imageWrap: {
    width: "100%",
    height: 260,
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

  // Rectangle banner for actress name
  nameBanner: {
    margin: "12px 12px 0",
    borderRadius: 14,
    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
    padding: "12px 16px",
    color: "#fff",
    fontWeight: 900,
    fontSize: "1.05rem",
    textAlign: "center",
    lineHeight: 1.2,
    boxShadow: "0 10px 24px rgba(0,0,0,.08)",
    // Allow wrapping for very long names
    wordBreak: "break-word",
    whiteSpace: "normal",
  },

  // Compact meta lines under banner (auto height + wrap)
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
    alignItems: "flex-start", // allow multi-line value
    padding: "4px 0",
    flexWrap: "wrap",         // wrap on small screens
  },
  metaLabel: {
    color: "#64748b",
    fontWeight: 600,
    // Use a flexible basis that shrinks on mobile but keeps alignment on desktop
    flex: "0 0 170px",
    maxWidth: "100%",
  },
  metaValue: {
    color: "#0b1221",
    fontWeight: 600,
    flex: "1 1 auto",
    // Ensure long text never overflows/clips
    wordBreak: "break-word",
    whiteSpace: "normal",
  },

  // Buttons
  btnPrimary: {
    background: `linear-gradient(90deg,${theme.secondary},${theme.primary})`,
    border: "none",
    color: "#05212a",
    fontWeight: 600,
    borderRadius: 10,
    padding: "6px 14px",
    boxShadow: "0 4px 12px -6px rgba(6,182,212,.4)",
  },
  btnSecondary: {
    background: "#0ea5e9",
    border: "none",
    color: "#05212a",
    fontWeight: 600,
    borderRadius: 10,
    padding: "6px 14px",
    boxShadow: "0 4px 12px -6px rgba(14,165,233,.4)",
  },
  btnDanger: {
    background: theme.danger,
    border: "none",
    color: "#fff",
    fontWeight: 600,
    borderRadius: 10,
    padding: "6px 14px",
    boxShadow: "0 4px 12px -6px rgba(239,68,68,.4)",
  },

  fullImage: {
    width: "100%",
    height: "auto",
    maxHeight: "80vh",
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
    objectFit: "contain",
    background: "#0b1221",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: 6,
    cursor: "pointer",
  },
};

/* ===== Animation ===== */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.35 },
};

export default function ShowActress() {
  const [actresses, setActresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Slideshow modal
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // "View All" grid modal (per actress)
  const [gridOpen, setGridOpen] = useState(false);
  const [gridImages, setGridImages] = useState([]);
  const [gridActressName, setGridActressName] = useState("");

  /* ===== Load Actress List ===== */
  const fetchActresses = async () => {
    try {
      const res = await axios.get("https://express-backend-myapp.onrender.com/api/act_favorite");
      setActresses(res.data || []);
    } catch (err) {
      console.error("Error loading actresses:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchActresses(); }, []);

  // Reset to page 1 when list changes
  useEffect(() => { setPage(1); }, [actresses.length]);

  /* ===== Delete Actress with SweetAlert ===== */
  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      html: `<strong style="font-size:1.05rem;">Delete <span style="color:#ef4444;">${name}</span> from your favorites?</strong>`,
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

    if (result.isConfirmed) {
      try {
        await axios.delete(`https://express-backend-myapp.onrender.com/api/act_favorite/${id}`);
        setActresses(prev => prev.filter(a => a.id !== id));
        await Swal.fire({
          icon: "success",
          title: "Deleted",
          text: `${name} has been removed successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Something went wrong while deleting.",
          confirmButtonColor: theme.danger,
        });
      }
    }
  };

  /* ===== Slideshow Logic (view one-by-one) ===== */
  const openSlideshow = (images, startIndex = 0) => {
    const list = (images || []).filter(Boolean);
    if (list.length === 0) return;
    setSlideshowImages(list);
    setCurrentIndex(Math.min(Math.max(0, startIndex), list.length - 1));
    setSlideshowOpen(true);
  };
  const closeSlideshow = () => setSlideshowOpen(false);
  const nextImage = () => setCurrentIndex(prev => (prev + 1) % slideshowImages.length);
  const prevImage = () => setCurrentIndex(prev => (prev === 0 ? slideshowImages.length - 1 : prev - 1));

  /* ===== Grid Logic (view all images of same actress) ===== */
  const openGrid = (images, actressName = "") => {
    const list = (images || []).filter(Boolean);
    if (list.length === 0) return;
    setGridImages(list);
    setGridActressName(actressName);
    setGridOpen(true);
  };
  const closeGrid = () => setGridOpen(false);

  // Derived pagination
  const total = actresses.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return actresses.slice(start, start + PAGE_SIZE);
  }, [actresses, page]);

  if (loading) return <LoadingSpinner />;

  return (
    <Container fluid className="py-4" style={{ minHeight: "100vh", background: theme.bg }}>
      {/* Header */}
      <motion.div
        className="px-3 py-4 mb-4 text-center"
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          boxShadow: theme.shadow,
          background: "#fff",
          maxWidth: 1300,
          margin: "0 auto",
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2
          style={{
            fontWeight: 800,
            background: `linear-gradient(90deg,${theme.primary},${theme.secondary})`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          🎭 Favorite Actress Profiles
        </h2>
        <p className="text-muted mb-0">Browse, view images (slideshow or all), or delete.</p>
      </motion.div>

      {/* Actress Cards */}
      {total === 0 ? (
        <div className="text-center text-muted py-5">No actress profiles added yet.</div>
      ) : (
        <>
          <Row className="g-4" style={{ maxWidth: 1300, margin: "0 auto" }}>
            {pageItems.map((act, indexOnPage) => {
              const index = (page - 1) * PAGE_SIZE + indexOnPage;
              const images = Array.isArray(act.images) ? act.images.filter(Boolean) : [];
              const canView = images.length > 0;

              return (
                <Col xs={12} sm={6} lg={4} xl={3} key={act.id}>
                  <motion.div {...fadeUp}>
                    <Card style={styles.card}>
                      {/* Profile image — fully visible (no crop), click to open full */}
                      <div
                        style={styles.imageWrap}
                        onClick={() => openSlideshow([act.profile_image].filter(Boolean), 0)}
                        role="button"
                        title="Open full image"
                      >
                        <img
                          src={act.profile_image || "https://via.placeholder.com/400x300?text=No+Image"}
                          alt={act.favorite_actress_name}
                          style={styles.image}
                        />
                      </div>

                      {/* Name banner (wraps if long) */}
                      <div style={styles.nameBanner}>
                        {index + 1}. {act.favorite_actress_name}
                      </div>

                      {/* Country + Favorite Movie/Series — wraps to multiple lines if needed */}
                      <div style={styles.metaWrap}>
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Country:</span>
                          <span style={styles.metaValue}>{act.country_name || "-"}</span>
                        </div>
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Favorite Movie / Series:</span>
                          <span style={styles.metaValue}>{act.favorite_movie_series || "-"}</span>
                        </div>
                      </div>

                      <Card.Body>
                        {/* Actions */}
                        <div className="d-flex gap-2 flex-wrap justify-content-center mb-3">
                          <Button
                            style={styles.btnPrimary}
                            disabled={!canView}
                            onClick={() => openSlideshow(images, 0)}
                            title={canView ? "View one-by-one" : "No images"}
                          >
                            ▶️ View Slideshow
                          </Button>

                          <Button
                            style={styles.btnSecondary}
                            disabled={!canView}
                            onClick={() => openGrid(images, act.favorite_actress_name || "")}
                            title={canView ? "View all images" : "No images"}
                          >
                            🖼 View All
                          </Button>

                          <Button
                            style={styles.btnDanger}
                            onClick={() => handleDelete(act.id, act.favorite_actress_name)}
                          >
                            🗑 Delete
                          </Button>
                        </div>

                        {/* Optional extras (auto-wrap as well) */}
                        {act.age && (
                          <div style={{ fontSize: ".9rem", color: theme.muted }}>
                            <strong>Age:</strong> {act.age}
                          </div>
                        )}
                        {act.actress_dob && (
                          <div style={{ fontSize: ".9rem", color: theme.muted }}>
                            <strong>DOB:</strong> {new Date(act.actress_dob).toLocaleDateString()}
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
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>

          {/* Pagination controls */}
          <div
            className="d-flex align-items-center justify-content-between mt-4"
            style={{ maxWidth: 1300, margin: "0 auto" }}
          >
            <div className="text-muted small">
              Showing <b>{(page - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(page * PAGE_SIZE, total)}</b> of{" "}
              <b>{total}</b>
            </div>
            <div className="btn-group">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
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
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next ›
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ===== Slideshow Modal (one-by-one) ===== */}
      <Modal
        show={slideshowOpen}
        onHide={closeSlideshow}
        centered
        size="xl"
        backdrop="static"
        contentClassName="bg-transparent border-0"
      >
        <Modal.Body
          style={{
            position: "relative",
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
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
            }}
            onClick={closeSlideshow}
            aria-label="Close"
          >
            ×
          </Button>

          {slideshowImages.length > 0 && (
            <>
              <img src={slideshowImages[currentIndex]} alt="actress" style={styles.fullImage} />
              {slideshowImages.length > 1 && (
                <>
                  <button onClick={prevImage} style={{ ...styles.navArrow, left: 16 }} aria-label="Previous">
                    ‹
                  </button>
                  <button onClick={nextImage} style={{ ...styles.navArrow, right: 16 }} aria-label="Next">
                    ›
                  </button>
                </>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* ===== View All (Grid) Modal ===== */}
      <Modal
        show={gridOpen}
        onHide={closeGrid}
        centered
        size="xl"
        scrollable
        backdrop="static"
        contentClassName="bg-white"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {gridActressName ? `${gridActressName} — All Images` : "All Images"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {gridImages.length === 0 ? (
            <div className="text-center text-muted py-4">No images.</div>
          ) : (
            <Row className="g-3">
              {gridImages.map((img, idx) => (
                <Col key={idx} xs={6} sm={4} md={3} lg={3}>
                  <img
                    src={img}
                    alt={`thumb-${idx}`}
                    style={styles.thumb}
                    onClick={() => openSlideshow(gridImages, idx)}
                    title="Open full size"
                  />
                </Col>
              ))}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeGrid}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
