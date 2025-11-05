import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ShowActress.jsx (Mobile-first, FAST via paginated API)
 *
 * Server:
 *  - Base URL: http://localhost:5000
 *  - Mount: app.use("/api/act_favorite", require("./routes/actFavorite"));
 *
 * Endpoints used:
 *  GET    http://localhost:5000/api/act_favorite/:id?images=page&offset=0&limit=24
 *  GET    http://localhost:5000/api/act_favorite/:id/images?offset=&limit=
 *  POST   http://localhost:5000/api/act_favorite/:id/images/append
 *  POST   http://localhost:5000/api/act_favorite/:id/images/delete
 *  DELETE http://localhost:5000/api/act_favorite/:id
 *
 * Props:
 *  - actressId (number|string)  -> required
 *  - onDeleted (function)       -> optional callback after actress deletion
 */
export default function ShowActress({ actressId, onDeleted }) {
  const BASE = "https://express-backend-myapp.onrender.com";

  const PAGE_LIMIT = 24; // thumbnails + gallery page size

  const [loading, setLoading] = useState(true);     // initial fetch
  const [saving, setSaving] = useState(false);      // mutate actions
  const [error, setError] = useState("");
  const [actress, setActress] = useState(null);

  // profile image skeleton
  const [profileLoaded, setProfileLoaded] = useState(false);

  // paginated images state (never store huge arrays)
  const [imagesPage, setImagesPage] = useState({
    total: 0,
    items: [], // current buffered items
    offset: 0,
    limit: PAGE_LIMIT,
  });
  const [pageLoading, setPageLoading] = useState(false);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());

  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [files, setFiles] = useState([]); // File[]
  const [filePreviews, setFilePreviews] = useState([]); // dataURL[] for demo upload

  const fileInputRef = useRef(null);

  const images = useMemo(() => imagesPage.items, [imagesPage.items]);
  const imagesTotal = useMemo(() => imagesPage.total, [imagesPage.total]);

  /* ---------------- Fetch actress (with first images page) ---------------- */
  useEffect(() => {
    if (actressId == null) return;

    const ac = new AbortController();
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        // Pull core fields + first page of images (fast)
        const resp = await fetch(
          `${BASE}/api/act_favorite/${actressId}?images=page&offset=0&limit=${PAGE_LIMIT}`,
          { signal: ac.signal }
        );
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        const data = await resp.json();
        if (!mounted) return;

        setActress({
          id: data.id,
          country_id: data.country_id,
          country_name: data.country_name,
          favorite_actress_name: data.favorite_actress_name,
          age: data.age,
          actress_dob: data.actress_dob,
          favorite_movie_series: data.favorite_movie_series,
          profile_image: data.profile_image,
          notes: data.notes,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });

        // normalize page block from API: { total, offset, limit, images }
        const pg = data.images_page || { total: 0, offset: 0, limit: PAGE_LIMIT, images: [] };
        setImagesPage({
          total: Number(pg.total || 0),
          offset: Number(pg.offset || 0) + (Array.isArray(pg.images) ? pg.images.length : 0),
          limit: Number(pg.limit || PAGE_LIMIT),
          items: Array.isArray(pg.images) ? pg.images : [],
        });

        setSelectedForDelete(new Set());
        setDeleteMode(false);
        setProfileLoaded(false);
      } catch (e) {
        if (!mounted) return;
        if (e.name !== "AbortError") setError(e.message || "Failed to load actress");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [actressId]);

  /* ---------------- Helpers ---------------- */
  const handleOpenLightbox = (src) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
  };
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    setLightboxSrc("");
  };

  const toggleSelect = (url) => {
    const s = new Set(selectedForDelete);
    if (s.has(url)) s.delete(url);
    else s.add(url);
    setSelectedForDelete(s);
  };

  const allSelected = useMemo(
    () => selectedForDelete.size > 0 && selectedForDelete.size === images.length,
    [selectedForDelete, images.length]
  );

  const toggleSelectAll = () => {
    if (allSelected) setSelectedForDelete(new Set());
    else setSelectedForDelete(new Set(images));
  };

  // Read local files as data URLs (demo)
  const readFilesAsDataUrls = async (list) => {
    const readers = Array.from(list).map(
      (file) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        })
    );
    return Promise.all(readers);
  };

  /* ---------------- Page loading ---------------- */
  const canLoadMore = imagesPage.offset < imagesPage.total;

  const loadNextPage = async () => {
    if (!canLoadMore || pageLoading) return;

    setPageLoading(true);
    try {
      const resp = await fetch(
        `${BASE}/api/act_favorite/${actressId}/images?offset=${imagesPage.offset}&limit=${imagesPage.limit}`
      );
      if (!resp.ok) throw new Error(`Images page failed: ${resp.status}`);
      const data = await resp.json(); // { total, offset, limit, images }
      const newItems = Array.isArray(data.images) ? data.images : [];
      setImagesPage((prev) => ({
        total: Number(data.total || prev.total),
        offset: prev.offset + newItems.length,
        limit: Number(data.limit || prev.limit),
        items: [...prev.items, ...newItems],
      }));
    } catch (e) {
      setError(e.message || "Failed to load more images");
    } finally {
      setPageLoading(false);
    }
  };

  /* ---------------- Actions (append/delete/delete actress) ---------------- */
  const appendImages = async (urls) => {
    setSaving(true);
    setError("");
    try {
      const resp = await fetch(`${BASE}/api/act_favorite/${actressId}/images/append`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: urls }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `Append failed: ${resp.status}`);

      // After append: reset pages (refetch first page for freshness)
      await refetchFirstPage();
      setUploaderOpen(false);
      setFiles([]);
      setFilePreviews([]);
    } catch (e) {
      setError(e.message || "Failed to append images");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedImages = async () => {
    if (selectedForDelete.size === 0) return;
    if (!window.confirm(`Delete ${selectedForDelete.size} image(s)?`)) return;

    setSaving(true);
    setError("");
    try {
      const urls = Array.from(selectedForDelete);
      const resp = await fetch(`${BASE}/api/act_favorite/${actressId}/images/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `Delete images failed: ${resp.status}`);

      setSelectedForDelete(new Set());
      setDeleteMode(false);

      // After delete: reset pages (so counts and items are correct)
      await refetchFirstPage();
    } catch (e) {
      setError(e.message || "Failed to delete images");
    } finally {
      setSaving(false);
    }
  };

  const deleteActress = async () => {
    if (!window.confirm("This will delete the actress and all images. Continue?")) return;
    setSaving(true);
    setError("");
    try {
      const resp = await fetch(`${BASE}/api/act_favorite/${actressId}`, { method: "DELETE" });
      if (resp.status !== 204) {
        let msg = `Delete failed: ${resp.status}`;
        try {
          const j = await resp.json();
          msg = j?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      if (onDeleted) onDeleted(actressId);
    } catch (e) {
      setError(e.message || "Failed to delete actress");
    } finally {
      setSaving(false);
    }
  };

  const refetchFirstPage = async () => {
    try {
      const resp = await fetch(
        `${BASE}/api/act_favorite/${actressId}?images=page&offset=0&limit=${PAGE_LIMIT}`
      );
      if (!resp.ok) throw new Error(`Refresh failed: ${resp.status}`);
      const data = await resp.json();

      setActress((prev) => ({
        ...(prev || {}),
        id: data.id,
        country_id: data.country_id,
        country_name: data.country_name,
        favorite_actress_name: data.favorite_actress_name,
        age: data.age,
        actress_dob: data.actress_dob,
        favorite_movie_series: data.favorite_movie_series,
        profile_image: data.profile_image,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }));

      const pg = data.images_page || { total: 0, offset: 0, limit: PAGE_LIMIT, images: [] };
      setImagesPage({
        total: Number(pg.total || 0),
        offset: Number(pg.offset || 0) + (Array.isArray(pg.images) ? pg.images.length : 0),
        limit: Number(pg.limit || PAGE_LIMIT),
        items: Array.isArray(pg.images) ? pg.images : [],
      });
    } catch (e) {
      setError(e.message || "Failed to refresh images");
    }
  };

  /* ---------------- Uploader ---------------- */
  const onFilesPicked = async (fileList) => {
    const chosen = Array.from(fileList || []);
    setFiles(chosen);
    const previews = await readFilesAsDataUrls(chosen);
    setFilePreviews(previews);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) {
      await onFilesPicked(e.dataTransfer.files);
    }
  };

  const handleAppendFromPreviews = async () => {
    if (filePreviews.length === 0) return;
    await appendImages(filePreviews);
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centerMsg}>
          <Spinner />
          <div style={{ marginTop: 8, fontSize: 14 }}>Loading…</div>
          <LinearProgress indeterminate />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.centerMsg, color: "#b00020" }}>Error: {error}</div>
      </div>
    );
  }
  if (!actress) {
    return (
      <div style={styles.page}>
        <div style={styles.centerMsg}>No data</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Card */}
        <div style={styles.card}>
          {/* Profile image with skeleton */}
          <div style={styles.profileWrap}>
            {!profileLoaded && <ShimmerBox />}
            <img
              src={actress.profile_image}
              alt={actress.favorite_actress_name}
              style={{ ...styles.profileImg, display: profileLoaded ? "block" : "none" }}
              onLoad={() => setProfileLoaded(true)}
              onError={() => setProfileLoaded(true)}
              onClick={() => handleOpenLightbox(actress.profile_image)}
              loading="eager"
            />
          </div>

          {/* Details */}
          <div style={styles.details}>
            <h1 style={styles.title}>{actress.favorite_actress_name}</h1>
            <div style={styles.metaGrid}>
              <MetaRow label="Country" value={actress.country_name || actress.country_id} />
              <MetaRow label="Series" value={actress.favorite_movie_series} />
              <MetaRow label="Age" value={actress.age ?? "—"} />
              <MetaRow label="DOB" value={actress.actress_dob ?? "—"} />
              <MetaRow label="Notes" value={actress.notes || "—"} />
              <MetaRow label="Images (total)" value={`${imagesTotal}`} />
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.btnPrimary} onClick={() => setGalleryOpen(true)}>
              View All Images
            </button>
            <button
              style={{ ...styles.btn, background: deleteMode ? "#ff7043" : "#eeeeee" }}
              onClick={() => setDeleteMode((v) => !v)}
            >
              {deleteMode ? "Cancel Delete" : "Delete Image"}
            </button>
            <button style={styles.btnDanger} onClick={deleteActress} disabled={saving}>
              DELETE Actress
            </button>
            <button style={styles.btn} onClick={() => setUploaderOpen(true)}>
              Add Extra Image
            </button>
          </div>

          {/* Thumbnail strip — only buffered page (fast) */}
          {images.length > 0 && (
            <div style={styles.thumbRow}>
              {images.map((url, idx) => (
                <div key={`${url}-${idx}`} style={styles.thumbCell}>
                  {deleteMode && (
                    <label style={styles.checkboxWrap}>
                      <input
                        type="checkbox"
                        checked={selectedForDelete.has(url)}
                        onChange={() => toggleSelect(url)}
                      />
                    </label>
                  )}
                  <ImgThumb
                    src={url}
                    alt={`img-${idx}`}
                    onClick={() => (deleteMode ? toggleSelect(url) : handleOpenLightbox(url))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Load more thumbnails inline (optional) */}
          {canLoadMore && (
            <div style={{ padding: "0 12px 12px" }}>
              <button style={{ ...styles.btn, width: "100%" }} onClick={loadNextPage} disabled={pageLoading}>
                {pageLoading ? "Loading…" : `Load more (${imagesPage.total - imagesPage.offset} left)`}
              </button>
            </div>
          )}

          {/* Delete toolbar */}
          {deleteMode && images.length > 0 && (
            <div style={styles.deleteBar}>
              <button style={styles.btnSm} onClick={toggleSelectAll}>
                {allSelected ? "Unselect All" : "Select Page"}
              </button>
              <button
                style={{ ...styles.btnSm, background: "#e53935", color: "#fff" }}
                onClick={deleteSelectedImages}
                disabled={selectedForDelete.size === 0 || saving}
              >
                Delete Selected ({selectedForDelete.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Modal (paged; super fast) */}
      {galleryOpen && (
        <Modal onClose={() => setGalleryOpen(false)}>
          {pageLoading && (
            <div style={styles.progressOverlay}>
              <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 14 }}>Loading images…</div>
              <LinearProgress indeterminate />
            </div>
          )}

          <div style={styles.galleryGrid}>
            {images.length === 0 && <div style={styles.centerMsg}>No images</div>}
            {images.map((url, idx) => (
              <div key={`g-${url}-${idx}`} style={styles.galleryItem}>
                <img
                  src={url}
                  alt={`g-${idx}`}
                  style={styles.galleryImg}
                  onClick={() => handleOpenLightbox(url)}
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {canLoadMore && (
            <div style={{ marginTop: 10 }}>
              <button style={{ ...styles.btnPrimary, width: "100%" }} onClick={loadNextPage} disabled={pageLoading}>
                {pageLoading ? "Loading…" : `Load more (${imagesPage.total - imagesPage.offset} left)`}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Lightbox (fullscreen) */}
      {lightboxOpen && (
        <div style={styles.lightbox} onClick={handleCloseLightbox}>
          <img src={lightboxSrc} alt="full" style={styles.lightboxImg} />
          <button style={styles.lightboxClose} onClick={handleCloseLightbox}>
            Close
          </button>
        </div>
      )}

      {/* Uploader Modal */}
      {uploaderOpen && (
        <Modal onClose={() => setUploaderOpen(false)}>
          <div
            style={styles.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onFilesPicked(e.target.files)}
            />
            <div style={{ fontSize: 16, textAlign: "center" }}>
              Drag & drop images here, or <span style={{ textDecoration: "underline" }}>click to choose</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
              Tip: Add a few at a time for faster uploads.
            </div>
          </div>

          {filePreviews.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={styles.galleryGrid}>
                {filePreviews.map((src, i) => (
                  <div key={i} style={styles.galleryItem}>
                    <img src={src} alt={`p-${i}`} style={styles.galleryImg} />
                  </div>
                ))}
              </div>
              <button
                style={{ ...styles.btnPrimary, width: "100%", marginTop: 12 }}
                disabled={saving}
                onClick={handleAppendFromPreviews}
              >
                {saving ? "Uploading…" : `Add ${filePreviews.length} Image(s)`}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Small building blocks ---------------- */

function MetaRow({ label, value }) {
  return (
    <div style={styles.metaRow}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{String(value)}</div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalBody}>
        <div style={styles.modalContent}>{children}</div>
        <button style={styles.modalCloseBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// Simple spinner
function Spinner() {
  return <div style={styles.spinner} aria-label="loading" />;
}

// Linear progress (determinate/indeterminate)
function LinearProgress({ value = 0, indeterminate = false }) {
  if (indeterminate) {
    return (
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressBar, animation: "indet 1.2s infinite" }} />
        <style>{`
          @keyframes indet {
            0%   { left: -40%; width: 40%; }
            50%  { left: 20%;  width: 60%; }
            100% { left: 100%; width: 40%; }
          }
        `}</style>
      </div>
    );
  }
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressBar, width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

// Thumb with skeleton & lazy loading
function ImgThumb({ src, alt, onClick }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!loaded && <ShimmerBox />}
      <img
        src={src}
        alt={alt}
        style={{ ...styles.thumb, display: loaded ? "block" : "none" }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        onClick={onClick}
        loading="lazy"
      />
    </div>
  );
}

// Shimmer placeholder
function ShimmerBox() {
  return (
    <div style={styles.shimmerBox}>
      <div style={styles.shimmerAnim} />
    </div>
  );
}

/* ---------------- Styles (mobile-first) ---------------- */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7f7fb",
    padding: "12px",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: 560,
  },
  centerMsg: {
    margin: "48px auto",
    textAlign: "center",
    fontSize: 16,
    color: "#555",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  profileWrap: {
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  profileImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    cursor: "pointer",
  },
  details: {
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: "2px 0 8px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    background: "#fafafa",
    borderRadius: 10,
    padding: "8px 10px",
  },
  metaLabel: { color: "#777" },
  metaValue: { fontWeight: 600 },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: 12,
  },
  btn: {
    appearance: "none",
    border: "none",
    background: "#f1f1f1",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnPrimary: {
    appearance: "none",
    border: "none",
    background: "#1976d2",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnDanger: {
    appearance: "none",
    border: "none",
    background: "#d32f2f",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSm: {
    appearance: "none",
    border: "none",
    background: "#f1f1f1",
    padding: "8px 10px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  thumbRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 6,
    padding: 12,
  },
  thumbCell: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
  },
  checkboxWrap: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 2,
    background: "rgba(255,255,255,0.9)",
    borderRadius: 6,
    padding: "2px 4px",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 8,
  },
  deleteBar: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #eee",
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    maxHeight: "70vh",
    overflowY: "auto",
  },
  galleryItem: {
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#f0f0f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  galleryImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    zIndex: 1000,
  },
  modalBody: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    padding: 12,
    position: "relative",
  },
  modalContent: {
    width: "100%",
  },
  modalCloseBtn: {
    width: "100%",
    marginTop: 12,
    background: "#222",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  lightbox: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.92)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1100,
    padding: 12,
  },
  lightboxImg: {
    maxWidth: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
  },
  lightboxClose: {
    marginTop: 12,
    background: "#ffffff",
    border: "none",
    borderRadius: 24,
    padding: "10px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dropZone: {
    width: "100%",
    border: "2px dashed #bbb",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    background: "#fafafa",
    cursor: "pointer",
  },

  // Progress
  progressTrack: {
    position: "relative",
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  progressBar: {
    position: "relative",
    height: "100%",
    width: "0%",
    background: "#1976d2",
    transition: "width 200ms linear",
  },
  progressOverlay: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.85))",
    padding: "8px 8px 10px",
    borderRadius: 12,
    marginBottom: 8,
  },

  // Spinner + Shimmer
  spinner: {
    width: 28,
    height: 28,
    border: "3px solid rgba(0,0,0,0.12)",
    borderTopColor: "#1976d2",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin1 0.9s linear infinite",
  },
  shimmerBox: {
    position: "absolute",
    inset: 0,
    background: "#eee",
    overflow: "hidden",
    borderRadius: 10,
  },
  shimmerAnim: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(238,238,238,0) 0%, rgba(255,255,255,0.7) 50%, rgba(238,238,238,0) 100%)",
    transform: "translateX(-100%)",
    animation: "shimmer 1.2s infinite",
  },
};

// global keyframes (injected once)
if (typeof document !== "undefined" && !document.getElementById("showactress-global-kf")) {
  const style = document.createElement("style");
  style.id = "showactress-global-kf";
  style.innerHTML = `
    @keyframes spin1 { to { transform: rotate(360deg); } }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    @keyframes indet { 0% { left: -40%; width: 40%; } 50% { left: 20%; width: 60%; } 100% { left: 100%; width: 40%; } }
  `;
  document.head.appendChild(style);
}
