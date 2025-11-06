import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Portal from "../../components/Portal";

/** Minimal detail view: ONLY profile image + 4 buttons */
const BASE = "https://express-backend-myapp.onrender.com";
const API = {
  list: (q, country, name, series) => {
    const u = new URL(`${BASE}/api/act_favorite`);
    if (q) u.searchParams.set("q", q);
    if (country) u.searchParams.set("country", country);
    if (name) u.searchParams.set("name", name);
    if (series) u.searchParams.set("series", series);
    return u.toString();
  },
  onePaged:   (id, limit) => `${BASE}/api/act_favorite/${id}?images=page&offset=0&limit=${limit}`,
  imagesPage: (id, o, l)  => `${BASE}/api/act_favorite/${id}/images?offset=${o}&limit=${l}`,
  append:     (id)        => `${BASE}/api/act_favorite/${id}/images/append`,
  delImages:  (id)        => `${BASE}/api/act_favorite/${id}/images/delete`,
  delActress: (id)        => `${BASE}/api/act_favorite/${id}`,
};

const PAGE_LIMIT_IMAGES = 30;
const PAGE_SIZE_LIST = 5;

/* ---------- utils ---------- */
async function safeFetchJSON(url, options) {
  let resp;
  try { resp = await fetch(url, options); }
  catch (e) { throw new Error("Network error: " + (e?.message || "failed to fetch")); }
  if (!resp.ok) {
    let msg = `${resp.status}`;
    try { const j = await resp.json(); msg = j?.error || msg; } catch {}
    throw new Error(msg);
  }
  if (resp.status === 204) return {};
  try { return await resp.json(); } catch { return {}; }
}
const isFiniteNum = (n) => Number.isFinite(Number(n));

const normalizeUrl = (u) => {
  try { const x = new URL(String(u)); return `${x.origin}${x.pathname}`.trim(); }
  catch { return String(u || "").split("#")[0].split("?")[0].trim(); }
};
const uniqueImages = (arr) => {
  const seen = new Set(); const out = [];
  for (const u of arr || []) { const key = normalizeUrl(u); if (key && !seen.has(key)) { seen.add(key); out.push(u); } }
  return out;
};

/* ---------- % Progress overlay (centered via Portal) ---------- */
function useProgress() {
  const [state, setState] = useState({ visible: false, percent: 0, label: "" });
  const timerRef = useRef(null);

  const start = (label = "Loading…", initial = 10) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState({ visible: true, percent: initial, label });
    timerRef.current = setInterval(() => {
      setState((s) => ({ ...s, percent: Math.min(90, s.percent + Math.ceil((100 - s.percent) * 0.08)) }));
    }, 180);
  };
  const bump = (n = 8) => setState((s) => ({ ...s, percent: Math.min(90, s.percent + n) }));
  const done = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({ ...s, percent: 100 }));
    setTimeout(() => setState({ visible: false, percent: 0, label: "" }), 350);
  };
  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), []);
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
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="bg-white rounded-3 shadow p-3" style={{ width: "min(440px, 90vw)" }}>
          <div className="fw-bold mb-2 text-center">{label}</div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
            <div className="progress-bar" style={{ width: `${Math.max(1, Math.min(100, Math.round(percent)))}%` }} />
          </div>
          <div className="mt-2 fw-bold text-center">{Math.round(percent)}%</div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Professional center popups (Portal) ---------- */
function CenterPopup({ open, title = "Info", message = "", tone = "secondary", onClose }) {
  if (!open) return null;
  const border = tone === "danger" ? "border-danger" : tone === "success" ? "border-success" : "border-secondary";
  const titleClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "";
  return (
    <Portal>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 30000,
          padding: 12,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"
        }}
        onClick={onClose}
      >
        <div className={`bg-white rounded-3 shadow p-3 ${border}`} style={{ width: "min(440px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
          <div className={`h5 mb-2 text-center ${titleClass}`}>{title}</div>
          <div className="fw-semibold text-center">{message}</div>
          <button className="btn btn-dark w-100 mt-3" onClick={onClose}>OK</button>
        </div>
      </div>
    </Portal>
  );
}
function ConfirmCenter({ open, title = "Confirm", message = "", tone = "danger", onOk, onCancel }) {
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
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"
        }}
        onClick={onCancel}
      >
        <div className="bg-white rounded-3 shadow p-3 border border-danger" style={{ width: "min(440px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
          <div className={`h5 mb-2 text-center ${titleClass}`}>{title}</div>
          <div className="fw-semibold text-center">{message}</div>
          <div className="d-grid gap-2 mt-3">
            <button className="btn btn-danger" onClick={onOk}>OK</button>
            <button className="btn btn-light" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Lightbox (buttons-only zoom; Portal, mobile-safe) ---------- */
function Lightbox({ src, onClose }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  const blockTouch = (e) => { e.preventDefault(); e.stopPropagation(); };

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
          padding: 12,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Image viewport */}
        <div
          className="flex-grow-1 d-flex align-items-center justify-content-center w-100"
          style={{ overflow: "hidden" }}
          onWheel={blockTouch}
          onTouchStart={blockTouch}
          onTouchMove={blockTouch}
          onTouchEnd={blockTouch}
        >
          <img
            src={src}
            alt="preview"
            style={{
              maxWidth: "96vw",
              maxHeight: "70vh",
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              userSelect: "none",
              pointerEvents: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
            draggable={false}
          />
        </div>

        {/* Controls */}
        <div
          className="d-flex align-items-center justify-content-center gap-2"
          style={{ position: "sticky", bottom: 0, padding: "10px 0", pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button className="btn btn-light btn-lg" onClick={() => setScale((s) => Math.max(1, Number((s * 0.9).toFixed(3))))}>−</button>
          <button className="btn btn-light btn-lg" onClick={() => setScale((s) => Math.min(6, Number((s * 1.1).toFixed(3))))}>+</button>
          <button className="btn btn-danger btn-lg" onClick={onClose}>Close</button>
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
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
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
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"
        }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3 shadow p-3"
          style={{ width: "min(560px, 96vw)", maxHeight: "calc(100dvh - 180px)", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="h5 mb-0">{title}</div>
            <button className="btn btn-dark btn-sm" onClick={onClose}>×</button>
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

  // 🔁 Shared list control so child components can update the list without full reload
  const listApiRef = useRef({ updateItem: () => {}, removeItem: () => {}, reload: () => {} });

  return (
    <div className="container" style={{ paddingTop: 12, paddingBottom: 24 }}>
      {!selectedId ? (
        <ListView
          registerListApi={(api) => (listApiRef.current = api)}
          onOpen={(id) => {
            const next = new URL(window.location.href);
            next.searchParams.set("id", String(id));
            window.history.pushState({}, "", next.toString());
            setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("id", String(id)); return p; });
            progress.start("Opening details…", 12);
          }}
          progress={progress}
        />
      ) : (
        <DetailView
          key={selectedId}
          id={selectedId}
          onClose={() => {
            const next = new URL(window.location.href);
            next.searchParams.delete("id");
            window.history.pushState({}, "", next.toString());
            setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete("id"); return p; });
          }}
          progress={progress}
          // Callbacks to keep list in sync without page change
          onImagesDelta={(delta) => listApiRef.current.updateItem?.(selectedId, (prev) => ({
            images_count: Math.max(0, (prev?.images_count ?? 0) + delta)
          }))}
          onDeleteActress={() => {
            listApiRef.current.removeItem?.(selectedId);
          }}
        />
      )}
      <LoadingOverlay visible={progress.state.visible} percent={progress.state.percent} label={progress.state.label} />
    </div>
  );
}

/* ==================== List View ==================== */
function ListView({ onOpen, progress, registerListApi }) {
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
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // expose simple list API to parent (update one, remove one, reload)
  useEffect(() => {
    registerListApi?.({
      updateItem: (id, patchOrFn) => {
        setAll((prev) => prev.map((r) => {
          if (r.id !== id) return r;
          const patch = typeof patchOrFn === 'function' ? patchOrFn(r) : patchOrFn;
          return { ...r, ...patch };
        }));
      },
      removeItem: (id) => {
        setAll((prev) => prev.filter((r) => r.id !== id));
      },
      reload: () => load(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => { window.removeEventListener("dragover", prevent); window.removeEventListener("drop", prevent); };
  }, []);

  const filtered = React.useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return all;
    return all.filter((r) =>
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
    <>
      <div className="row g-2 align-items-center mb-2">
        <div className="col">
          <input className="form-control" placeholder="Search name / series / country..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="col-auto">
          <button className="btn btn-primary" onClick={load}>Search</button>
        </div>
      </div>

      {loading && <div className="text-center text-secondary my-3">Loading…</div>}
      {err && (
        <div className="text-center text-danger my-3">
          Error: {err}
          <div className="mt-2"><button className="btn btn-light" onClick={load}>Retry</button></div>
        </div>
      )}

      {!loading && !err && total === 0 && <div className="text-center text-secondary my-3">No actresses found.</div>}

      {!loading && !err && total > 0 && (
        <>
          <div className="row g-2">
            {slice.map((r) => (
              <div className="col-12" key={r.id}>
                <button className="w-100 btn btn-light text-start p-2 border rounded-3 shadow-sm" onClick={() => onOpen(r.id)}>
                  <div className="d-grid" style={{ gridTemplateColumns: "84px 1fr", gap: 10, alignItems: "center" }}>
                    <div className="rounded-3 bg-light overflow-hidden" style={{ width: 84, height: 84 }}>
                      {r.profile_image ? (
                        <img src={r.profile_image} alt={r.favorite_actress_name} className="w-100 h-100" style={{ objectFit: "cover" }} loading="lazy" />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center text-muted" style={{ width: "100%", height: "100%", fontSize: 12 }}>No Image</div>
                      )}
                    </div>
                    <div>
                      <div className="fw-bold">{r.favorite_actress_name}</div>
                      <div className="small"><b>Series:</b> {r.favorite_movie_series || "—"}</div>
                      <div className="small"><b>Country:</b> {r.country_name || r.country_id || "—"}</div>
                      <div className="small"><b>Images:</b> {r.images_count ?? 0}</div>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-center gap-2 mt-2">
            <button className="btn btn-light" disabled={!canPrev} onClick={() => setPage((p) => Math.max(0, p - 1))}>◀ Prev</button>
            <div className="fw-bold">Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE_LIST))}</div>
            <button className="btn btn-light" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>Next ▶</button>
          </div>
        </>
      )}
    </>
  );
}

/* ==================== Detail View (minimal) ==================== */
function DetailView({ id, onClose, progress, onImagesDelta, onDeleteActress }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actress, setActress] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [confirmDeleteActress, setConfirmDeleteActress] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });

  useEffect(() => { setLightboxSrc(""); }, [id]);

  const load = async () => {
    if (!isFiniteNum(id) || Number(id) <= 0) {
      setErr("Invalid record id"); setLoading(false); progress.done(); return;
    }
    try {
      setLoading(true); setErr("");
      progress.start("Fetching profile…", 14);
      const data = await safeFetchJSON(API.onePaged(id, PAGE_LIMIT_IMAGES));
      setActress({ id: data.id, favorite_actress_name: data.favorite_actress_name, profile_image: data.profile_image });
      progress.done();
    } catch (e) {
      setErr(e.message || "Failed to load");
      progress.done();
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const doDeleteActress = async () => {
    try {
      progress.start("Deleting…", 10);
      const r = await fetch(API.delActress(id), { method: "DELETE" });
      if (r.status !== 204) {
        let msg = `Delete failed: ${r.status}`;
        try { const j = await r.json(); msg = j?.error || msg; } catch {}
        throw new Error(msg);
      }
      progress.done();
      onDeleteActress?.();
      onClose && onClose();
      // ❌ removed window.location.reload(); keep page state intact
    } catch (e) {
      progress.done();
      setErrorPopup({ open: true, message: e.message || "Failed to delete actress" });
    }
  };

  if (loading) return <div className="text-center text-secondary my-3">Loading…</div>;
  if (err) {
    return (
      <div className="text-center my-3">
        <div className="text-danger">Error: {err}</div>
        <div className="mt-2 d-flex justify-content-center gap-2">
          <button className="btn btn-light" onClick={load}>Retry</button>
          <button className="btn btn-danger" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }
  if (!actress) return <div className="text-center text-secondary my-3">No data</div>;

  return (
    <>
      <button className="btn btn-light mb-2" onClick={onClose}>← Back to list</button>

      {/* ONLY the profile image */}
      <div className="mx-auto rounded-3 bg-light overflow-hidden" style={{ width: "min(520px, 100%)", aspectRatio: "1/1" }}>
        {!actress.profile_image ? (
          <div className="d-flex align-items-center justify-content-center text-secondary w-100 h-100">No profile image</div>
        ) : (
          <img
            src={actress.profile_image}
            alt={actress.favorite_actress_name}
            className="w-100 h-100"
            style={{ objectFit: "cover", cursor: "zoom-in" }}
            onClick={() => setLightboxSrc(actress.profile_image)}
            loading="eager"
          />
        )}
      </div>

      {/* EXACT four buttons */}
      <div className="d-grid gap-2 mt-3">
        <ViewAllImagesButton actressId={actress.id} onOpenImage={(src) => setLightboxSrc(src)} progress={progress} />
        <DeleteImagesButton  actressId={actress.id} progress={progress} onImagesDeleted={(n) => onImagesDelta?.(-n)} />
        <AddImagesButton     actressId={actress.id} progress={progress} onImagesAdded={(n) => onImagesDelta?.(n)} />
        <button className="btn btn-danger" onClick={() => setConfirmDeleteActress(true)}>Delete Actress</button>
      </div>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc("")} />

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
    </>
  );
}

/* ---------- Buttons (open modals / popups) ---------- */
function AddImagesButton({ actressId, progress, onImagesAdded }) {
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>Add Extra Image</button>
      {open && (
        <Modal title="Add Extra Image" onClose={() => setOpen(false)}>
          <AddImages
            actressId={actressId}
            onClose={() => setOpen(false)}
            onUploaded={(n) => { setOpen(false); setAddedCount(n); setSuccessOpen(true); onImagesAdded?.(n); }}
            progress={progress}
          />
        </Modal>
      )}
      <CenterPopup
        open={successOpen}
        title="Success"
        tone="success"
        message={`Images added successfully${addedCount ? ` ( +${addedCount} )` : ''}.`}
        onClose={() => { setSuccessOpen(false); }}
      />
    </>
  );
}
function DeleteImagesButton({ actressId, progress, onImagesDeleted }) {
  const [open, setOpen] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  return (
    <>
      <button className="btn btn-warning" onClick={() => setOpen(true)}>Delete Images</button>
      {open && (
        <Modal title="Delete Images" onClose={() => setOpen(false)}>
          <DeleteImages actressId={actressId} onClose={() => setOpen(false)} progress={progress} onDeleted={(n) => { setDeletedCount(n); onImagesDeleted?.(n); }} />
        </Modal>
      )}
      {deletedCount > 0 && (
        <div className="small text-success text-center">Deleted {deletedCount} image(s).</div>
      )}
    </>
  );
}
function ViewAllImagesButton({ actressId, onOpenImage, progress }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-light" onClick={() => setOpen(true)}>View All Images</button>
      {open && (
        <Modal title="All Images" onClose={() => setOpen(false)}>
          <ViewAllImages actressId={actressId} onClose={() => setOpen(false)} onOpenImage={onOpenImage} progress={progress} />
        </Modal>
      )}
    </>
  );
}

/* ==================== Add Images ==================== */
function AddImages({ actressId, onClose, onUploaded, progress }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });

  const uploadFiles = async (filesList) => {
    try {
      setBusy(true);
      progress.start("Uploading…", 12);
      const urls = uniqueImages(Array.from(filesList).map((f) => URL.createObjectURL(f))); // demo
      await safeFetchJSON(API.append(actressId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: urls }),
      });
      progress.done();
      onUploaded && onUploaded(urls.length);
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
        <input ref={inputRef} type="file" accept="image/*" multiple className="form-control"
               onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        <div className="d-grid mt-3">
          <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>Pick files</button>
        </div>
      </div>
      <div className="d-grid mt-3">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Done</button>
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

  // Load ALL images (no "load more")
  const loadAll = async () => {
    progress.start("Loading images…", 10);
    try {
      let all = [];
      let offset = 0;
      while (true) {
        const d = await safeFetchJSON(API.imagesPage(actressId, offset, PAGE_LIMIT_IMAGES));
        const imgs = uniqueImages(d.images || []);
        all = uniqueImages([...all, ...imgs]);
        offset += imgs.length;
        const total = Number(d.total || all.length);
        if (offset >= total || imgs.length === 0) break;
      }
      setList(all);
    } catch (e) {
      setErrorPopup({ open: true, message: e.message || "Failed to load images" });
    } finally {
      setLoading(false);
      progress.done();
    }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [actressId]);

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
        await safeFetchJSON(API.delImages(actressId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: Array.from(selected) }),
        });
        setList((prev) => prev.filter((u) => !selected.has(u)));
        setSelected(new Set());
      }
      progress.done();
      onDeleted?.(count);
      onClose?.(); // close modal; page does NOT reload
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
          <div className="row g-2">
            {list.map((url, i) => (
              <div className="col-3 col-sm-2 col-md-2" key={normalizeUrl(url) + "-" + i}>
                <div className="position-relative">
                  <input
                    type="checkbox"
                    className="form-check-input position-absolute"
                    style={{ top: 6, left: 6, zIndex: 2 }}
                    checked={selected.has(url)}
                    onChange={() => toggle(url)}
                  />
                  <img src={url} alt={`img-${i}`} className="w-100 rounded-2" style={{ aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                </div>
              </div>
            ))}
          </div>

          <div className="d-grid gap-2 mt-3">
            <button className="btn btn-warning" onClick={() => setConfirmOpen(true)}>Delete Selected ({selected.size})</button>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>

          <ConfirmCenter
            open={confirmOpen}
            title="Delete Images"
            message={selected.size > 0 ? `Delete ${selected.size} image(s) now?` : "No images selected. OK to continue?"}
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

/* ==================== View All Images ==================== */
function ViewAllImages({ actressId, onClose, onOpenImage, progress }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });

  const loadAll = async () => {
    progress.start("Loading images…", 10);
    try {
      let all = [];
      let offset = 0;
      while (true) {
        const d = await safeFetchJSON(API.imagesPage(actressId, offset, PAGE_LIMIT_IMAGES));
        const imgs = uniqueImages(d.images || []);
        all = uniqueImages([...all, ...imgs]);
        offset += imgs.length;
        const total = Number(d.total || all.length);
        if (offset >= total || imgs.length === 0) break;
      }
      setList(all);
    } catch (e) {
      setErrorPopup({ open: true, message: e.message || "Failed to load images" });
    } finally {
      setLoading(false);
      progress.done();
    }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [actressId]);

  return (
    <>
      {loading && <div className="text-center text-secondary my-2">Loading…</div>}
      {!loading && (
        <>
          <div className="row g-2">
            {list.map((url, i) => (
              <div className="col-3 col-sm-2 col-md-2" key={normalizeUrl(url) + "-" + i}>
                <button className="btn p-0 w-100 border-0" onClick={() => onOpenImage(url)} aria-label="Open image">
                  <img src={url} alt={`img-${i}`} className="w-100 rounded-2" style={{ aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                </button>
              </div>
            ))}
          </div>

          <div className="d-grid mt-3">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
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

/* one-time keyframes placeholder */
if (typeof document !== "undefined" && !document.getElementById("actressespage-kf")) {
  const st = document.createElement("style");
  st.id = "actressespage-kf";
  st.innerHTML = `@keyframes shimmer { 100% { transform: translateX(100%); } }`;
  document.head.appendChild(st);
}
