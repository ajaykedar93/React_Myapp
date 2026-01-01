import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Portal from "../../components/Portal";

/** FULL detail view: profile + info + ALL images (responsive), plus smooth loading */

const BASE = "https://express-backend-myapp.onrender.com";

// ==== API ENDPOINTS THAT MATCH userActFavorite.js ====
// Backend mounts at: app.use("/api/act_favorite", require("./routes/userActFavorite"));
const API = {
  // GET /api/act_favorite/user-act-favorite?q=...
  list: (q, countryId) => {
    const u = new URL(`${BASE}/api/act_favorite/user-act-favorite`);
    if (q) u.searchParams.set("q", q);
    if (countryId) u.searchParams.set("country_id", countryId);
    return u.toString();
  },

  // GET /api/act_favorite/user-act-favorite/:id
  one: (id) => `${BASE}/api/act_favorite/user-act-favorite/${id}`,

  // PATCH /api/act_favorite/user-act-favorite/:id/images
  images: (id) => `${BASE}/api/act_favorite/user-act-favorite/${id}/images`,

  // DELETE /api/act_favorite/user-act-favorite/:id
  delActress: (id) => `${BASE}/api/act_favorite/user-act-favorite/${id}`,
};

const PAGE_SIZE_LIST = 8;

/* ---------- utils ---------- */
async function safeFetchJSON(url, options) {
  let resp;
  try {
    resp = await fetch(url, options);
  } catch (e) {
    throw new Error("Network error: " + (e?.message || "failed to fetch"));
  }
  if (!resp.ok) {
    let msg = `${resp.status}`;
    try {
      const j = await resp.json();
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (resp.status === 204) return {};

  let payload;
  try {
    payload = await resp.json();
  } catch {
    return {};
  }

  // unwrap your standard { success, data, meta } shape
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}

const isFiniteNum = (n) => Number.isFinite(Number(n));

const normalizeUrl = (u) => {
  try {
    const x = new URL(String(u));
    return `${x.origin}${x.pathname}`.trim();
  } catch {
    return String(u || "").split("#")[0].split("?")[0].trim();
  }
};
const uniqueImages = (arr) => {
  const seen = new Set();
  const out = [];
  for (const u of arr || []) {
    const key = normalizeUrl(u);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(u);
    }
  }
  return out;
};

/* ---------- % Progress overlay (centered via Portal) ---------- */
function useProgress() {
  const [state, setState] = useState({
    visible: false,
    percent: 0,
    label: "",
  });
  const timerRef = useRef(null);

  const start = (label = "Loading…", initial = 10) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState({ visible: true, percent: initial, label });
    timerRef.current = setInterval(() => {
      setState((s) => ({
        ...s,
        percent: Math.min(90, s.percent + Math.ceil((100 - s.percent) * 0.08)),
      }));
    }, 180);
  };
  const bump = (n = 8) =>
    setState((s) => ({ ...s, percent: Math.min(90, s.percent + n) }));
  const done = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({ ...s, percent: 100 }));
    setTimeout(
      () => setState({ visible: false, percent: 0, label: "" }),
      350
    );
  };
  useEffect(
    () => () => timerRef.current && clearInterval(timerRef.current),
    []
  );
  return { state, start, bump, done, set: setState };
}

function LoadingOverlay({ visible, percent, label }) {
  if (!visible) return null;
  return (
    <Portal>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 30000,
          padding: 12,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          transition: "background 0.25s ease-out",
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className="bg-white rounded-3 shadow p-3"
          style={{ width: "min(440px, 90vw)", transform: "translateY(0)" }}
        >
          <div className="fw-bold mb-2 text-center">{label}</div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div
              className="progress-bar bg-success"
              style={{
                width: `${Math.max(1, Math.min(100, Math.round(percent)))}%`,
                transition: "width 0.25s ease-out",
              }}
            />
          </div>
          <div className="mt-2 fw-bold text-center">{Math.round(percent)}%</div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Professional center popups (Portal) ---------- */
function CenterPopup({
  open,
  title = "Info",
  message = "",
  tone = "secondary",
  onClose,
}) {
  if (!open) return null;
  const border =
    tone === "danger"
      ? "border-danger"
      : tone === "success"
      ? "border-success"
      : "border-secondary";
  const titleClass =
    tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "";
  return (
    <Portal>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 30000,
          padding: 12,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
        onClick={onClose}
      >
        <div
          className={`bg-white rounded-3 shadow p-3 ${border}`}
          style={{ width: "min(440px, 92vw)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`h5 mb-2 text-center ${titleClass}`}>{title}</div>
          <div className="fw-semibold text-center">{message}</div>
          <button className="btn btn-dark w-100 mt-3" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </Portal>
  );
}
function ConfirmCenter({
  open,
  title = "Confirm",
  message = "",
  tone = "danger",
  onOk,
  onCancel,
}) {
  if (!open) return null;
  const titleClass = tone === "danger" ? "text-danger" : "";
  return (
    <Portal>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.40)",
          zIndex: 30000,
          padding: 12,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
        onClick={onCancel}
      >
        <div
          className="bg-white rounded-3 shadow p-3 border border-danger"
          style={{ width: "min(440px, 92vw)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`h5 mb-2 text-center ${titleClass}`}>{title}</div>
          <div className="fw-semibold text-center">{message}</div>
          <div className="d-grid gap-2 mt-3">
            <button className="btn btn-danger" onClick={onOk}>
              OK
            </button>
            <button className="btn btn-light" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Lightbox (zoom fullscreen + drag/pan + next/prev) ---------- */
function Lightbox({ images, index, onChangeIndex, onClose }) {
  const [view, setView] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
    lastX: 0,
    lastY: 0,
  });

  const hasImages = Array.isArray(images) && images.length > 0;
  const validIndex =
    typeof index === "number" && hasImages && index >= 0 && index < images.length;

  useEffect(() => {
    if (!validIndex) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIndex, index, images?.length]);

  useEffect(() => {
    setView({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      isPanning: false,
      lastX: 0,
      lastY: 0,
    });
  }, [index]);

  if (!validIndex) return null;

  const currentSrc = images[index];

  const handleNext = () => {
    if (!hasImages) return;
    const next = (index + 1) % images.length;
    onChangeIndex(next);
  };
  const handlePrev = () => {
    if (!hasImages) return;
    const prev = (index - 1 + images.length) % images.length;
    onChangeIndex(prev);
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const x = e.clientX ?? (e.touches?.[0]?.clientX || 0);
    const y = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setView((prev) => ({
      ...prev,
      isPanning: true,
      lastX: x,
      lastY: y,
    }));
  };

  const onPointerMove = (e) => {
    setView((prev) => {
      if (!prev.isPanning) return prev;
      const x = e.clientX ?? (e.touches?.[0]?.clientX || 0);
      const y = e.clientY ?? (e.touches?.[0]?.clientY || 0);
      const dx = x - prev.lastX;
      const dy = y - prev.lastY;
      return {
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
        lastX: x,
        lastY: y,
      };
    });
  };

  const endPan = (e) => {
    e?.currentTarget?.releasePointerCapture?.(e.pointerId);
    setView((prev) => ({ ...prev, isPanning: false }));
  };

  const zoomOut = () => {
    setView((prev) => {
      const nextScale = Math.max(1, Number((prev.scale * 0.9).toFixed(3)));
      const factor = nextScale === 1 ? 0.5 : 1;
      return {
        ...prev,
        scale: nextScale,
        offsetX: prev.offsetX * factor,
        offsetY: prev.offsetY * factor,
      };
    });
  };

  const zoomIn = () => {
    setView((prev) => {
      const nextScale = Math.min(6, Number((prev.scale * 1.1).toFixed(3)));
      return { ...prev, scale: nextScale };
    });
  };

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.92)",
          zIndex: 30000,
          padding: 10,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="flex-grow-1 d-flex align-items-center justify-content-center w-100"
          style={{ overflow: "hidden", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `translate3d(${view.offsetX}px, ${view.offsetY}px, 0) scale(${view.scale})`,
              transformOrigin: "center center",
              transition: view.isPanning ? "none" : "transform 0.12s ease-out",
              cursor:
                view.scale > 1
                  ? view.isPanning
                    ? "grabbing"
                    : "grab"
                  : "default",
            }}
          >
            <img
              src={currentSrc}
              alt="preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                display: "block",
              }}
              draggable={false}
            />
          </div>
        </div>

        <div
          className="d-flex flex-wrap justify-content-center gap-1 w-100"
          style={{
            paddingTop: 6,
            paddingBottom: 8,
            marginBottom: "calc(env(safe-area-inset-bottom, 12px))",
            pointerEvents: "auto",
          }}
        >
          <button
            className="btn btn-light btn-sm px-2 py-1"
            style={{ minWidth: 70, fontSize: 12 }}
            onClick={handlePrev}
          >
            ◀ Prev
          </button>
          <button
            className="btn btn-light btn-sm px-2 py-1"
            style={{ minWidth: 70, fontSize: 12 }}
            onClick={zoomOut}
          >
            − Zoom
          </button>
          <span
            className="text-white small d-flex align-items-center justify-content-center px-2"
            style={{ fontSize: 12 }}
          >
            {Math.round(view.scale * 100)}%
          </span>
          <button
            className="btn btn-light btn-sm px-2 py-1"
            style={{ minWidth: 70, fontSize: 12 }}
            onClick={zoomIn}
          >
            + Zoom
          </button>
          <button
            className="btn btn-light btn-sm px-2 py-1"
            style={{ minWidth: 70, fontSize: 12 }}
            onClick={handleNext}
          >
            Next ▶
          </button>
          <button
            className="btn btn-danger btn-sm px-2 py-1"
            style={{ minWidth: 70, fontSize: 12 }}
            onClick={onClose}
          >
            Close ✕
          </button>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Modal shell (Portal) ---------- */
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 30000,
          padding: 12,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3 shadow p-3"
          style={{
            width: "min(560px, 96vw)",
            maxHeight: "calc(100dvh - 180px)",
            overflowY: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="h5 mb-0">{title}</div>
            <button className="btn btn-dark btn-sm" onClick={onClose}>
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

/* ==================== Main Page ==================== */
export default function ActressesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = useMemo(() => {
    const idQ = searchParams.get("id");
    return isFiniteNum(idQ) ? Number(idQ) : null;
  }, [searchParams]);

  const progress = useProgress();

  const listApiRef = useRef({
    updateItem: () => {},
    removeItem: () => {},
    reload: () => {},
  });

  return (
    <div className="ap-page">
      <div className="ap-shell">
        {/* LIST VIEW (always mounted, hidden when detail open) */}
        <ListView
          hidden={!!selectedId}
          registerListApi={(api) => (listApiRef.current = api)}
          onOpen={(id) => {
            const next = new URL(window.location.href);
            next.searchParams.set("id", String(id));
            window.history.pushState({}, "", next.toString());
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("id", String(id));
              return p;
            });
            progress.start("Opening details…", 12);
          }}
          progress={progress}
        />

        {/* Detail */}
        {selectedId && (
          <DetailView
            key={selectedId}
            id={selectedId}
            onClose={() => {
              const next = new URL(window.location.href);
              next.searchParams.delete("id");
              window.history.pushState({}, "", next.toString());
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.delete("id");
                return p;
              });
            }}
            progress={progress}
            onImagesDelta={(delta) =>
              listApiRef.current.updateItem?.(selectedId, (prev) => ({
                images_count: Math.max(0, (prev?.images_count ?? 0) + delta),
              }))
            }
            onDeleteActress={() => {
              listApiRef.current.removeItem?.(selectedId);
            }}
          />
        )}
      </div>

      <LoadingOverlay
        visible={progress.state.visible}
        percent={progress.state.percent}
        label={progress.state.label}
      />

      {/* Professional responsive layout CSS */}
      <style>{AP_CSS}</style>
    </div>
  );
}

/* ==================== List View ==================== */
function ListView({ onOpen, progress, registerListApi, hidden }) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      progress.start("Loading actresses…", 10);
      const url = API.list(q?.trim() || "");
      const data = await safeFetchJSON(url);
      progress.bump(20);
      setAll(Array.isArray(data) ? data : []);
      setPage(0);
      progress.done();
    } catch (e) {
      setErr(e.message || "Failed to load");
      progress.done();
      alert(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    registerListApi?.({
      updateItem: (id, patchOrFn) => {
        setAll((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const patch =
              typeof patchOrFn === "function" ? patchOrFn(r) : patchOrFn;
            return { ...r, ...patch };
          })
        );
      },
      removeItem: (id) => {
        setAll((prev) => prev.filter((r) => r.id !== id));
      },
      reload: () => load(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return all;
    return all.filter(
      (r) =>
        (r.favorite_actress_name || "").toLowerCase().includes(s) ||
        (r.favorite_movie_series || "").toLowerCase().includes(s) ||
        (r.country_name || "").toLowerCase().includes(s) ||
        String(r.country_id || "").includes(s)
    );
  }, [q, all]);

  const total = filtered.length;
  const start = page * PAGE_SIZE_LIST;
  const slice = filtered.slice(start, start + PAGE_SIZE_LIST);
  const canPrev = page > 0;
  const canNext = start + PAGE_SIZE_LIST < total;

  return (
    <div style={hidden ? { display: "none" } : undefined}>
      {/* Search bar (full width, no extra outside padding) */}
      <div className="ap-top">
        <div className="ap-search">
          <input
            className="form-control ap-input"
            placeholder="Search name / series / country..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary ap-btn" onClick={load}>
            Search
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center text-secondary my-3">Loading…</div>
      )}
      {err && (
        <div className="text-center text-danger my-3">
          Error: {err}
          <div className="mt-2">
            <button className="btn btn-light" onClick={load}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !err && total === 0 && (
        <div className="text-center text-secondary my-3">No actresses found.</div>
      )}

      {!loading && !err && total > 0 && (
        <>
          {/* Professional auto-fit grid */}
          <div className="ap-grid">
            {slice.map((r) => (
              <button
                key={r.id}
                className="ap-card"
                onClick={() => onOpen(r.id)}
                type="button"
              >
                <div className="ap-card-inner">
                  <div className="ap-thumb">
                    {r.profile_image ? (
                      <img
                        src={r.profile_image}
                        alt={r.favorite_actress_name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="ap-noimg">No Image</div>
                    )}
                  </div>

                  <div className="ap-info">
                    <div className="ap-name text-truncate">
                      {r.favorite_actress_name}
                    </div>
                    <div className="ap-line text-truncate">
                      <b>Series:</b> {r.favorite_movie_series || "—"}
                    </div>
                    <div className="ap-line text-truncate">
                      <b>Country:</b> {r.country_name || r.country_id || "—"}
                    </div>
                    <div className="ap-line">
                      <b>Images:</b> {r.images_count ?? 0}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="ap-pager">
            <button
              className="btn btn-light"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ◀ Prev
            </button>
            <div className="fw-bold">
              Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE_LIST))}
            </div>
            <button
              className="btn btn-light"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ==================== Detail View – FULL PAGE ==================== */
function DetailView({ id, onClose, progress, onImagesDelta, onDeleteActress }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actress, setActress] = useState(null);
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [confirmDeleteActress, setConfirmDeleteActress] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });

  useEffect(() => {
    setLightboxIndex(null);
  }, [id]);

  const openLightboxAt = (idx) => {
    if (!Array.isArray(images) || !images.length) return;
    if (idx < 0 || idx >= images.length) return;
    setLightboxIndex(idx);
  };

  const load = async () => {
    if (!isFiniteNum(id) || Number(id) <= 0) {
      setErr("Invalid record id");
      setLoading(false);
      progress.done();
      return;
    }
    try {
      setLoading(true);
      setErr("");
      progress.start("Fetching profile…", 14);
      const data = await safeFetchJSON(API.one(id));

      const mergedImages = uniqueImages(
        [data.profile_image, ...(Array.isArray(data.images) ? data.images : [])].filter(
          Boolean
        )
      );

      setActress(data);
      setImages(mergedImages);
      progress.done();
    } catch (e) {
      setErr(e.message || "Failed to load");
      progress.done();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  const reloadAllImages = async () => {
    try {
      progress.start("Refreshing images…", 12);
      const data = await safeFetchJSON(API.one(id));
      const merged = uniqueImages(
        [data.profile_image, ...(Array.isArray(data.images) ? data.images : [])].filter(
          Boolean
        )
      );
      setActress(data);
      setImages(merged);
      progress.done();
    } catch (e) {
      progress.done();
      setErrorPopup({
        open: true,
        message: e.message || "Failed to refresh images",
      });
    }
  };

  const doDeleteActress = async () => {
    try {
      progress.start("Deleting…", 10);
      await safeFetchJSON(API.delActress(id), { method: "DELETE" });
      progress.done();
      onDeleteActress?.();
      onClose && onClose();
    } catch (e) {
      progress.done();
      setErrorPopup({
        open: true,
        message: e.message || "Failed to delete actress",
      });
    }
  };

  if (loading) return <div className="text-center text-secondary my-3">Loading…</div>;
  if (err) {
    return (
      <div className="text-center my-3">
        <div className="text-danger">Error: {err}</div>
        <div className="mt-2 d-flex justify-content-center gap-2">
          <button className="btn btn-light" onClick={load}>
            Retry
          </button>
          <button className="btn btn-danger" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }
  if (!actress) return <div className="text-center text-secondary my-3">No data</div>;

  return (
    <div className="ap-detail">
      <div className="ap-detail-top">
        <button className="btn btn-light btn-sm" onClick={onClose}>
          ← Back
        </button>
        <div className="fw-bold small text-muted">
          ID: {actress.id} · Images: {images.length ?? 0}
        </div>
      </div>

      {/* HERO */}
      <div className="row g-2 g-md-3 align-items-stretch">
        <div className="col-12 col-md-5 col-lg-4">
          <div className="ap-hero-img">
            {!actress.profile_image ? (
              <div className="text-secondary">No profile image</div>
            ) : (
              <img
                src={actress.profile_image}
                alt={actress.favorite_actress_name}
                onClick={() => {
                  const idx = images.findIndex(
                    (u) => normalizeUrl(u) === normalizeUrl(actress.profile_image)
                  );
                  openLightboxAt(idx >= 0 ? idx : 0);
                }}
                loading="eager"
              />
            )}
          </div>
        </div>

        <div className="col-12 col-md-7 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body ap-cardbody-tight">
              <h4 className="fw-bold mb-1">
                {actress.favorite_actress_name || "Unknown"}
              </h4>
              <div className="text-muted mb-2">
                Favourite movie / series:{" "}
                <span className="fw-semibold">
                  {actress.favorite_movie_series || "—"}
                </span>
              </div>

              <div className="row g-2 small mb-2">
                <div className="col-6 col-md-3">
                  <div className="text-muted">Country</div>
                  <div className="fw-semibold">
                    {actress.country_name || actress.country_id || "—"}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted">Age</div>
                  <div className="fw-semibold">
                    {actress.age ?? actress.age === 0 ? actress.age : "—"}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted">DOB</div>
                  <div className="fw-semibold">
                    {actress.actress_dob
                      ? new Date(actress.actress_dob).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted">Images</div>
                  <div className="fw-semibold">{images.length ?? 0}</div>
                </div>
              </div>

              {actress.notes && (
                <div className="mt-2">
                  <div className="text-muted small mb-1">Notes</div>
                  <div className="border rounded-3 p-2 small ap-notesbox">
                    {actress.notes}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="d-grid d-md-flex flex-wrap gap-2">
                  <DeleteImagesButton
                    actressId={actress.id}
                    progress={progress}
                    onImagesDeleted={(n) => {
                      onImagesDelta?.(-n);
                      reloadAllImages();
                    }}
                  />
                  <AddImagesButton
                    actressId={actress.id}
                    progress={progress}
                    onImagesAdded={(updatedImages) => {
                      setImages((prev) => {
                        const prevLen = prev.length;
                        const newLen = updatedImages.length;
                        const addedCount = Math.max(0, newLen - prevLen);
                        if (addedCount > 0) onImagesDelta?.(addedCount);
                        return updatedImages;
                      });
                    }}
                  />
                  <button
                    className="btn btn-outline-danger ms-md-auto"
                    onClick={() => setConfirmDeleteActress(true)}
                  >
                    Delete Actress
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GALLERY */}
      <div className="card border-0 shadow-sm mt-2">
        <div className="card-body ap-cardbody-tight">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">All Images</h5>
            <small className="text-muted">
              Tap to open · {images.length} image{images.length === 1 ? "" : "s"}
            </small>
          </div>

          {images.length === 0 ? (
            <div className="text-center text-secondary py-3">
              No extra images yet.
            </div>
          ) : (
            <div className="ap-gallery">
              {images.map((url, i) => (
                <button
                  key={normalizeUrl(url) + "-" + i}
                  className="ap-gitem"
                  onClick={() => openLightboxAt(i)}
                  aria-label="Open image"
                  type="button"
                >
                  <img src={url} alt={`img-${i}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Lightbox
        images={images}
        index={lightboxIndex}
        onChangeIndex={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />

      <ConfirmCenter
        open={confirmDeleteActress}
        title="Delete Actress"
        message="This will permanently delete this actress and all images."
        onOk={doDeleteActress}
        onCancel={() => setConfirmDeleteActress(false)}
      />
      <CenterPopup
        open={errorPopup.open}
        title="Error"
        tone="danger"
        message={errorPopup.message}
        onClose={() => setErrorPopup({ open: false, message: "" })}
      />
    </div>
  );
}

/* ---------- Buttons (open modals / popups) ---------- */
function AddImagesButton({ actressId, progress, onImagesAdded }) {
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary w-100 w-md-auto" onClick={() => setOpen(true)}>
        Add Extra Image
      </button>
      {open && (
        <Modal title="Add Extra Image" onClose={() => setOpen(false)}>
          <AddImages
            actressId={actressId}
            onClose={() => setOpen(false)}
            onUploaded={(updatedImages) => {
              setOpen(false);
              setSuccessOpen(true);
              onImagesAdded?.(updatedImages);
            }}
            progress={progress}
          />
        </Modal>
      )}
      <CenterPopup
        open={successOpen}
        title="Success"
        tone="success"
        message="Images added successfully."
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
}

function DeleteImagesButton({ actressId, progress, onImagesDeleted }) {
  const [open, setOpen] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

  return (
    <>
      <button className="btn btn-warning w-100 w-md-auto" onClick={() => setOpen(true)}>
        Delete Images
      </button>
      {open && (
        <Modal title="Delete Images" onClose={() => setOpen(false)}>
          <DeleteImages
            actressId={actressId}
            onClose={() => setOpen(false)}
            progress={progress}
            onDeleted={(n) => {
              setDeletedCount(n);
              onImagesDeleted?.(n);
            }}
          />
        </Modal>
      )}
      {deletedCount > 0 && null}
    </>
  );
}

/* ==================== Add Images ==================== */
function AddImages({ actressId, onClose, onUploaded, progress }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });

  const uploadFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    try {
      setBusy(true);
      progress.start("Uploading…", 12);

      const formData = new FormData();
      Array.from(filesList).forEach((file) => {
        formData.append("files", file);
      });

      const updated = await safeFetchJSON(API.images(actressId), {
        method: "PATCH",
        body: formData,
      });

      const allImages = uniqueImages(
        [updated.profile_image, ...(Array.isArray(updated.images) ? updated.images : [])].filter(
          Boolean
        )
      );

      progress.done();
      onUploaded && onUploaded(allImages);
    } catch (e) {
      progress.done();
      setErrorPopup({ open: true, message: e.message || "Failed to upload" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="border rounded-3 p-3 text-center bg-light">
        <div className="fw-bold">Choose images to add</div>
        <div className="small text-secondary mb-2">JPG/PNG/WebP</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="form-control"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <div className="d-grid mt-3">
          <button
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Pick files
          </button>
        </div>
      </div>
      <div className="d-grid mt-3">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Done
        </button>
      </div>

      <CenterPopup
        open={errorPopup.open}
        title="Error"
        tone="danger"
        message={errorPopup.message}
        onClose={() => setErrorPopup({ open: false, message: "" })}
      />
    </>
  );
}

/* ==================== Delete Images ==================== */
function DeleteImages({ actressId, onClose, progress, onDeleted }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });

  const loadAll = async () => {
    progress.start("Loading images…", 10);
    try {
      const data = await safeFetchJSON(API.one(actressId));
      const imgs = uniqueImages(data.images || []);
      setList(imgs);
    } catch (e) {
      setErrorPopup({ open: true, message: e.message || "Failed to load images" });
    } finally {
      setLoading(false);
      progress.done();
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, [actressId]);

  const toggle = (url) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const doDelete = async () => {
    try {
      progress.start("Deleting images…", 12);
      const count = selected.size;
      if (count > 0) {
        await safeFetchJSON(API.images(actressId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove: Array.from(selected) }),
        });
        setList((prev) => prev.filter((u) => !selected.has(u)));
        setSelected(new Set());
      }
      progress.done();
      onDeleted?.(count);
      onClose?.();
    } catch (e) {
      progress.done();
      setErrorPopup({ open: true, message: e.message || "Failed to delete images" });
    }
  };

  return (
    <>
      {loading && <div className="text-center text-secondary my-2">Loading…</div>}

      {!loading && (
        <>
          <div className="ap-delgrid">
            {list.map((url, i) => (
              <div className="ap-delitem" key={normalizeUrl(url) + "-" + i}>
                <input
                  type="checkbox"
                  className="form-check-input ap-delcheck"
                  checked={selected.has(url)}
                  onChange={() => toggle(url)}
                />
                <img src={url} alt={`img-${i}`} loading="lazy" />
              </div>
            ))}
          </div>

          <div className="d-grid gap-2 mt-3">
            <button className="btn btn-warning" onClick={() => setConfirmOpen(true)}>
              Delete Selected ({selected.size})
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>

          <ConfirmCenter
            open={confirmOpen}
            title="Delete Images"
            message={
              selected.size > 0
                ? `Delete ${selected.size} image(s) now?`
                : "No images selected. OK to continue?"
            }
            onOk={doDelete}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      )}

      <CenterPopup
        open={errorPopup.open}
        title="Error"
        tone="danger"
        message={errorPopup.message}
        onClose={() => setErrorPopup({ open: false, message: "" })}
      />
    </>
  );
}

/* ---------- CSS (edge-to-edge + responsive grid) ---------- */
const AP_CSS = `
  html, body { width: 100%; overflow-x: hidden; }
  *, *::before, *::after { box-sizing: border-box; }

  .ap-page{
    width: 100%;
    min-height: 100dvh;
    margin: 0;
    padding: 0;
  }
  .ap-shell{
    width: 100%;
    margin: 0;
    padding: 0; /* ✅ outside padding removed */
  }

  /* Search bar full width */
  .ap-top{ width: 100%; padding: 8px; }
  .ap-search{
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .ap-input{ width: 100%; }
  .ap-btn{ white-space: nowrap; }

  /* ✅ Professional auto-fit grid cards */
  .ap-grid{
    width: 100%;
    padding: 8px; /* tiny, not emptyspace; just to avoid edge-touch */
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 8px;
  }
  @media (max-width: 576px){
    .ap-top{ padding: 6px; }
    .ap-grid{ padding: 6px; grid-template-columns: 1fr; gap: 6px; }
  }

  .ap-card{
    width: 100%;
    border: 1px solid rgba(2,6,23,.10);
    background: rgba(255,255,255,.95);
    border-radius: 14px;
    box-shadow: 0 10px 28px rgba(2,6,23,.06);
    padding: 10px; /* ✅ inside card tight */
    text-align: left;
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .ap-card:hover{ box-shadow: 0 14px 40px rgba(2,6,23,.10); }
  .ap-card:active{ transform: scale(0.995); }

  .ap-card-inner{
    display: grid;
    grid-template-columns: 84px 1fr;
    gap: 10px;
    align-items: center;
  }

  .ap-thumb{
    width: 84px;
    height: 84px;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ap-thumb img{
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
  .ap-noimg{
    color: rgba(255,255,255,.65);
    font-size: 12px;
  }

  .ap-info{ min-width: 0; }
  .ap-name{
    font-weight: 900;
    font-size: 15px;
    color: #0f172a;
  }
  .ap-line{
    font-size: 12px;
    color: rgba(15,23,42,.78);
    margin-top: 2px;
  }

  .ap-pager{
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 8px 14px 8px;
  }

  /* Detail area edge-to-edge */
  .ap-detail{ width: 100%; padding: 8px; }
  @media (max-width: 576px){ .ap-detail{ padding: 6px; } }

  .ap-detail-top{
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .ap-hero-img{
    border-radius: 14px;
    background: #000;
    box-shadow: 0 10px 28px rgba(2,6,23,.08);
    min-height: 260px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .ap-hero-img img{
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    cursor: zoom-in;
    display: block;
  }

  /* Tighten Bootstrap card body a bit */
  .ap-cardbody-tight{ padding: 12px; }
  .ap-notesbox{ max-height: 120px; overflow-y: auto; }

  /* Gallery grid */
  .ap-gallery{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 8px;
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 2px;
    -webkit-overflow-scrolling: touch;
  }
  .ap-gitem{
    border: 0;
    border-radius: 12px;
    background: #000;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .ap-gitem img{
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }

  /* Delete images grid */
  .ap-delgrid{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 8px;
  }
  .ap-delitem{
    position: relative;
    background: #000;
    border-radius: 12px;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ap-delitem img{
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
  .ap-delcheck{
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;
  }
`;

/* one-time keyframes placeholder */
if (typeof document !== "undefined" && !document.getElementById("actressespage-kf")) {
  const st = document.createElement("style");
  st.id = "actressespage-kf";
  st.innerHTML = `@keyframes shimmer { 100% { transform: translateX(100%); } }`;
  document.head.appendChild(st);
}
