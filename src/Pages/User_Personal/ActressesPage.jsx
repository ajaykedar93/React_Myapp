import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * ActressesPage.jsx — Full page (List + Detail) with % progress overlay
 *
 * Endpoints used (FULL URLs):
 *   LIST  GET    http://localhost:5000/api/act_favorite
 *   ONE   GET    http://localhost:5000/api/act_favorite/:id?images=page&offset=0&limit=30
 *   IMGS  GET    http://localhost:5000/api/act_favorite/:id/images?offset=&limit=
 *   ADD   POST   http://localhost:5000/api/act_favorite/:id/images/append   (JSON: {images:[...]} )
 *   DELI  POST   http://localhost:5000/api/act_favorite/:id/images/delete   (JSON: {urls:[...]} or {indexes:[...]} )
 *   DELR  DELETE http://localhost:5000/api/act_favorite/:id
 */

const BASE = "http://localhost:5000";
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

/* ---------------- % Progress overlay helpers ---------------- */
function useProgress() {
  const [state, setState] = useState({ visible: false, percent: 0, label: "" });
  const timerRef = useRef(null);

  const start = (label = "Loading…", initial = 10) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState({ visible: true, percent: initial, label });
    timerRef.current = setInterval(() => {
      setState((s) => {
        const next = Math.min(90, s.percent + Math.ceil((100 - s.percent) * 0.08));
        return { ...s, percent: next };
      });
    }, 180);
  };

  const bump = (n = 8) =>
    setState((s) => ({ ...s, percent: Math.min(90, s.percent + n) }));

  const done = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({ ...s, percent: 100 }));
    setTimeout(() => setState({ visible: false, percent: 0, label: "" }), 350);
  };

  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), []);
  return { state, start, bump, done };
}

function LoadingOverlay({ visible, percent, label }) {
  if (!visible) return null;
  return (
    <div style={S.overlayBackdrop} aria-busy="true" aria-live="polite">
      <div style={S.overlayCard}>
        <div style={S.overlayLabel}>{label}</div>
        <div style={S.progressBarWrap}>
          <div style={{ ...S.progressBarFill, width: `${Math.max(1, Math.min(100, Math.round(percent)))}%` }} />
        </div>
        <div style={S.progressPct}>{Math.round(percent)}%</div>
      </div>
    </div>
  );
}

/* --------------- utils --------------- */
async function safeFetchJSON(url, options) {
  let resp;
  try { resp = await fetch(url, options); }
  catch (e) { throw new Error("Network error: " + (e?.message || "failed to fetch")); }
  if (!resp.ok) {
    let msg = `${resp.status}`;
    try { const j = await resp.json(); msg = j?.error || msg; } catch {}
    throw new Error(msg);
  }
  try { return await resp.json(); } catch { return {}; }
}
const isFiniteNum = (n) => Number.isFinite(Number(n));

/* ---------------- Centered popup ---------------- */
function CenterPopup({ open, type = "info", message = "", onClose }) {
  if (!open) return null;
  return (
    <div style={U.popupBackdrop} onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        style={{ ...U.popupCard, ...(type === "error" ? U.popError : type === "success" ? U.popSuccess : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={U.popupMsg}>{message}</div>
        <button style={U.popupBtn} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

/* ---------------- Lightbox ---------------- */
function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div style={S.lightbox} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img src={src} alt="full" style={S.lightboxImg} />
      <button style={S.lightboxCloseBelow} onClick={onClose}>Close</button>
    </div>
  );
}

/* ---------------- Modal shell (scrollable) ---------------- */
function Modal({ children, onClose }) {
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
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={S.modalBody} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalContent}>{children}</div>
      </div>
      <button style={S.modalCloseFloating} onClick={onClose}>×</button>
    </div>
  );
}

/* ---------------- Shimmer (optional) ---------------- */
function Shimmer() {
  return (
    <div style={S.shimmerBox}>
      <div style={S.shimmerAnim} />
    </div>
  );
}

/* ===========================================================
   Main Page: List (default) ➜ Detail when ?id= present
   =========================================================== */
export default function ActressesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = useMemo(() => {
    const idQ = searchParams.get("id");
    return isFiniteNum(idQ) ? Number(idQ) : null;
  }, [searchParams]);

  const progress = useProgress();

  return (
    <div style={S.page}>
      {!selectedId ? (
        <ListView
          onOpen={(id) => {
            const next = new URL(window.location.href);
            next.searchParams.set("id", String(id));
            window.history.pushState({}, "", next.toString());
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("id", String(id));
              return p;
            });
          }}
          progress={progress}
        />
      ) : (
        <DetailView
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
        />
      )}

      <LoadingOverlay visible={progress.state.visible} percent={progress.state.percent} label={progress.state.label} />
    </div>
  );
}

/* ========================= LIST VIEW ========================= */
function ListView({ onOpen, progress }) {
  const [all, setAll] = useState([]);      // slim list
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const [popup, setPopup] = useState({ open: false, type: "info", message: "" });
  const show = (type, message) => setPopup({ open: true, type, message });

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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // prevent outside-page drag opening files
  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
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
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
        <input
          placeholder="Search name / series / country..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <button style={S.btnPrimary} onClick={load}>Search</button>
      </div>

      {loading && <div style={S.centerMsg}>Loading…</div>}
      {err && (
        <div style={{ ...S.centerMsg, color: "#b00020" }}>
          Error: {err}
          <div style={{ marginTop: 8 }}>
            <button style={S.btnNeutral} onClick={load}>Retry</button>
          </div>
        </div>
      )}

      {!loading && !err && total === 0 && (
        <div style={S.centerMsg}>No actresses found.</div>
      )}

      {!loading && !err && total > 0 && (
        <>
          <div style={S.cards}>
            {slice.map((r) => (
              <button
                key={r.id}
                style={S.cardBtn}
                onClick={async () => {
                  // immediate visual progress for detail transition
                  progress.start("Opening details…", 12);
                  onOpen(r.id);
                }}
              >
                <div style={S.cardGrid}>
                  <div style={S.cardImgWrap}>
                    {r.profile_image ? (
                      <img src={r.profile_image} alt={r.favorite_actress_name} style={S.cardImg} loading="lazy" />
                    ) : (
                      <div style={S.cardImgPlaceholder}>No Image</div>
                    )}
                  </div>
                  <div>
                    <div style={S.cardTitle}>{r.favorite_actress_name}</div>
                    <div style={S.cardMeta}><b>Series:</b> {r.favorite_movie_series || "—"}</div>
                    <div style={S.cardMeta}><b>Country:</b> {r.country_name || r.country_id || "—"}</div>
                    <div style={S.cardMeta}><b>Images:</b> {r.images_count ?? 0}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={S.pagerRow}>
            <button style={S.btnNeutral} disabled={!canPrev} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ◀ Prev
            </button>
            <div style={{ fontWeight: 800 }}>
              Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE_LIST))}
            </div>
            <button style={S.btnNeutral} disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next ▶
            </button>
          </div>
        </>
      )}

      <CenterPopup
        open={popup.open}
        type={popup.type}
        message={popup.message}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}

/* ========================= DETAIL VIEW ========================= */
function DetailView({ id, onClose, progress }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  the
  const [actress, setActress] = useState(null);

  const [firstPage, setFirstPage] = useState({
    total: 0, offset: 0, limit: PAGE_LIMIT_IMAGES, images: [],
  });

  const [lightboxSrc, setLightboxSrc] = useState("");
  const [popup, setPopup] = useState({ open: false, type: "info", message: "" });
  const show = (type, message) => setPopup({ open: true, type, message });

  const [addOpen, setAddOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const load = async () => {
    if (!isFiniteNum(id) || Number(id) <= 0) {
      setErr("Invalid record id");
      setLoading(false);
      progress.done();
      return;
    }
    try {
      setLoading(true); setErr("");
      progress.start("Fetching profile…", 14);
      const data = await safeFetchJSON(API.onePaged(id, PAGE_LIMIT_IMAGES));
      progress.bump(20);
      setActress({
        id: data.id,
        favorite_actress_name: data.favorite_actress_name,
        favorite_movie_series: data.favorite_movie_series,
        profile_image: data.profile_image,
        country_name: data.country_name ?? null,
        country_id: data.country_id,
        age: data.age,
        actress_dob: data.actress_dob,
        notes: data.notes,
      });
      const pg = data.images_page || { total: 0, offset: 0, limit: PAGE_LIMIT_IMAGES, images: [] };
      setFirstPage({
        total: Number(pg.total || 0),
        offset: Number(pg.offset || 0) + (Array.isArray(pg.images) ? pg.images.length : 0),
        limit: Number(pg.limit || PAGE_LIMIT_IMAGES),
        images: Array.isArray(pg.images) ? pg.images : [],
      });
      progress.done();
    } catch (e) {
      setErr(e.message || "Failed to load");
      progress.done();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const refreshFirstPage = async (label = "Refreshing…") => {
    try {
      progress.start(label, 10);
      const l = Math.max(PAGE_LIMIT_IMAGES, firstPage.images.length);
      const d = await safeFetchJSON(API.imagesPage(id, 0, l));
      const arr = Array.isArray(d.images) ? d.images : [];
      setFirstPage({
        total: Number(d.total || arr.length),
        offset: arr.length,
        limit: PAGE_LIMIT_IMAGES,
        images: arr,
      });
      progress.done();
    } catch {
      progress.done();
    }
  };

  const handleDeleteActress = async () => {
    if (!window.confirm("Delete actress and all details?")) return;
    try {
      progress.start("Deleting…", 10);
      await fetch(API.delActress(id), { method: "DELETE" }).then(async (r) => {
        if (r.status !== 204) {
          let msg = `Delete failed: ${r.status}`;
          try { const j = await r.json(); msg = j?.error || msg; } catch {}
          throw new Error(msg);
        }
      });
      progress.done();
      show("success", "Actress deleted.");
      onClose && onClose();
    } catch (e) {
      progress.done();
      show("error", e.message || "Failed to delete");
    }
  };

  if (loading) return <div style={S.centerMsg}>Loading…</div>;
  if (err) {
    return (
      <div style={{ ...S.centerMsg, color: "#b00020" }}>
        Error: {err}
        <div style={{ marginTop: 8 }}>
          <button style={S.btnNeutral} onClick={load}>Retry</button>
          <button style={{ ...S.btnDanger, marginLeft: 8 }} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }
  if (!actress) return <div style={S.centerMsg}>No data</div>;

  return (
    <div>
      <button style={{ ...S.btnNeutral, marginBottom: 10 }} onClick={onClose}>← Back to list</button>

      {/* Profile */}
      <div style={S.profileImgWrap}>
        {!actress.profile_image && <div style={S.centerMsg}>No profile image</div>}
        {!!actress.profile_image && (
          <img
            src={actress.profile_image}
            alt={actress.favorite_actress_name}
            style={S.profileImg}
            onClick={() => setLightboxSrc(actress.profile_image)}
            loading="eager"
          />
        )}
      </div>

      {/* Details */}
      <div style={S.details}>
        <div style={S.title}>{actress.favorite_actress_name}</div>
        <div style={S.meta}><b>Series:</b> {actress.favorite_movie_series}</div>
        <div style={S.meta}><b>Country:</b> {actress.country_name || actress.country_id}</div>
        <div style={S.meta}><b>Age:</b> {actress.age ?? "—"}</div>
        <div style={S.meta}><b>DOB:</b> {actress.actress_dob ?? "—"}</div>
        <div style={S.meta}><b>Notes:</b> {actress.notes || "—"}</div>
      </div>

      {/* Buttons */}
      <div style={S.btnGrid4}>
        <button style={S.btnPrimary} onClick={() => setAddOpen(true)}>Add Extra Image</button>
        <button style={S.btnWarn}    onClick={() => setDelOpen(true)}>Delete Images</button>
        <button style={S.btnNeutral} onClick={() => setViewOpen(true)}>View All Images</button>
        <button style={S.btnDanger}  onClick={handleDeleteActress}>Delete Actress</button>
      </div>

      {/* Lightbox */}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc("")} />

      {/* Modals */}
      {addOpen && (
        <Modal onClose={() => setAddOpen(false)}>
          <AddImages
            actressId={actress.id}
            onClose={() => setAddOpen(false)}
            onUploaded={async (added = 0) => {
              if (added > 0) await refreshFirstPage("Saving images…");
            }}
            show={show}
            progress={progress}
          />
        </Modal>
      )}

      {delOpen && (
        <Modal onClose={() => setDelOpen(false)}>
          <DeleteImages
            actressId={actress.id}
            onClose={() => setDelOpen(false)}
            onDeleted={async (cnt = 0) => {
              if (cnt > 0) await refreshFirstPage("Deleting images…");
            }}
            show={show}
            progress={progress}
          />
        </Modal>
      )}

      {viewOpen && (
        <Modal onClose={() => setViewOpen(false)}>
          <ViewAllImages
            actressId={actress.id}
            onClose={() => setViewOpen(false)}
            onOpenImage={(src) => setLightboxSrc(src)}
            progress={progress}
          />
        </Modal>
      )}

      <CenterPopup
        open={popup.open}
        type={popup.type}
        message={popup.message}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}

/* ========================= Add Images ========================= */
function AddImages({ actressId, onClose, onUploaded, show, progress }) {
  const dropRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDragEnter = (e) => { prevent(e); setDragOver(true); };
    const onDragOver  = (e) => { prevent(e); setDragOver(true); };
    const onDragLeave = (e) => { prevent(e); setDragOver(false); };
    const onDrop      = (e) => {
      prevent(e); setDragOver(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) uploadFiles(files);
    };
    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  async function uploadFiles(filesList) {
    try {
      setBusy(true);
      progress.start("Uploading…", 12);
      // NOTE: This demo sends temporary blob URLs (no local paths).
      // Replace with your uploader (S3/server) and send hosted URLs.
      const urls = Array.from(filesList).map((f) => URL.createObjectURL(f));
      await safeFetchJSON(API.append(actressId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: urls }),
      });
      progress.done();
      onUploaded && onUploaded(urls.length);
      onClose();
    } catch (e) {
      progress.done();
      show("error", e.message || "Failed to upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={S.modalTitle}>Add Extra Image</div>
      <div
        ref={dropRef}
        style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}) }}
        onClick={() => document.getElementById("filepick-hidden")?.click()}
      >
        <div style={S.dropIcon}>⇪</div>
        <div style={S.dropText}>Drag & drop images here</div>
        <div style={S.dropSub}>or click to choose</div>
        <input
          id="filepick-hidden"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>
      <button style={S.modalPrimary} onClick={onClose} disabled={busy}>Done</button>
    </div>
  );
}

/* ========================= Delete Images ========================= */
function DeleteImages({ actressId, onClose, onDeleted, show, progress }) {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const loadPage = async (o, l, withProgress = false) => {
    if (withProgress) { progress.start("Loading images…", 10); }
    const d = await safeFetchJSON(API.imagesPage(actressId, o, l));
    if (withProgress) progress.done();
    return d;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const d = await loadPage(0, PAGE_LIMIT_IMAGES, true);
        if (!mounted) return;
        const arr = Array.isArray(d.images) ? d.images : [];
        setList(arr);
        setTotal(Number(d.total || arr.length));
        setOffset(arr.length);
      } catch (e) {
        if (!mounted) return;
        show("error", e.message || "Failed to load images");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [actressId]);

  const canLoadMore = offset < total;

  const loadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    try {
      setLoadingMore(true);
      progress.start("Loading more…", 10);
      const d = await loadPage(offset, PAGE_LIMIT_IMAGES);
      const arr = Array.isArray(d.images) ? d.images : [];
      setList((prev) => [...prev, ...arr]);
      setOffset((o) => o + arr.length);
      setTotal(Number(d.total || total));
      progress.done();
    } catch (e) {
      progress.done();
      show("error", e.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (url) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const doDelete = async () => {
    if (selected.size === 0) {
      show("info", "No images selected.");
      return;
    }
    if (!window.confirm(`Delete ${selected.size} image(s)?`)) return;
    try {
      progress.start("Deleting images…", 12);
      await safeFetchJSON(API.delImages(actressId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: Array.from(selected) }),
      });
      progress.done();
      onDeleted && onDeleted(selected.size);
      onClose();
    } catch (e) {
      progress.done();
      show("error", e.message || "Failed to delete images");
    }
  };

  return (
    <div>
      <div style={S.modalTitle}>Delete Images</div>

      {loading && <div style={S.centerMsg}>Loading…</div>}

      {!loading && (
        <>
          <div style={S.galleryManageGrid}>
            {list.map((url, i) => (
              <div key={url + i} style={S.manageItem}>
                <label style={S.checkboxWrap}>
                  <input
                    type="checkbox"
                    checked={selected.has(url)}
                    onChange={() => toggle(url)}
                    style={S.checkbox}
                  />
                </label>
                <img src={url} alt={`img-${i}`} style={S.galleryThumb} loading="lazy" />
              </div>
            ))}
          </div>

          {canLoadMore && (
            <button style={S.modalNeutral} disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : `Load more (${total - offset} left)`}
            </button>
          )}

          <div style={S.modalActionsRow}>
            <button style={S.modalDanger} onClick={doDelete}>Delete Selected ({selected.size})</button>
            <button style={S.modalPrimary} onClick={onClose}>Close</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================= View All Images ========================= */
function ViewAllImages({ actressId, onClose, onOpenImage, progress }) {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = async (o, l, withProgress = false) => {
    if (withProgress) progress.start("Loading images…", 10);
    const d = await safeFetchJSON(API.imagesPage(actressId, o, l));
    if (withProgress) progress.done();
    return d;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const d = await loadPage(0, PAGE_LIMIT_IMAGES, true);
        if (!mounted) return;
        const arr = Array.isArray(d.images) ? d.images : [];
        setList(arr);
        setTotal(Number(d.total || arr.length));
        setOffset(arr.length);
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [actressId]);

  const canLoadMore = offset < total;

  const loadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    try {
      setLoadingMore(true);
      progress.start("Loading more…", 10);
      const d = await loadPage(offset, PAGE_LIMIT_IMAGES);
      const arr = Array.isArray(d.images) ? d.images : [];
      setList((prev) => [...prev, ...arr]);
      setOffset((o) => o + arr.length);
      setTotal(Number(d.total || total));
      progress.done();
    } catch {
      progress.done();
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <div style={S.modalTitle}>All Images ({total})</div>

      {loading && <div style={S.centerMsg}>Loading…</div>}
      {!loading && (
        <>
          <div style={S.galleryViewGrid}>
            {list.map((url, i) => (
              <button
                key={url + i}
                style={S.thumbBtn}
                onClick={() => onOpenImage(url)}
              >
                <img src={url} alt={`img-${i}`} style={S.galleryThumb} loading="lazy" />
              </button>
            ))}
          </div>

          {canLoadMore && (
            <button style={S.modalNeutral} disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : `Load more (${total - offset} left)`}
            </button>
          )}

          <button style={S.modalPrimary} onClick={onClose}>Close</button>
        </>
      )}
    </div>
  );
}

/* ========================= Styles ========================= */
const S = {
  page: { minHeight: "100vh", background: "#f7f7fb", padding: 12, maxWidth: 620, margin: "0 auto" },
  centerMsg: { textAlign: "center", margin: "24px 0", color: "#555" },

  // Global overlay
  overlayBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1600, padding: 16 },
  overlayCard: { width: "min(440px,90vw)", background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 16px 36px rgba(0,0,0,0.25)", textAlign: "center" },
  overlayLabel: { fontWeight: 900, marginBottom: 10 },
  progressBarWrap: { height: 10, background: "#eee", borderRadius: 999, overflow: "hidden" },
  progressBarFill: { height: "100%", background: "#1976d2" },
  progressPct: { marginTop: 8, fontWeight: 800, color: "#333" },

  // Cards list
  cards: { display: "grid", gridTemplateColumns: "1fr", gap: 10 },
  cardBtn: { border: "none", background: "#fff", borderRadius: 14, padding: 10, textAlign: "left", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", cursor: "pointer" },
  cardGrid: { display: "grid", gridTemplateColumns: "84px 1fr", gap: 10, alignItems: "center" },
  cardImgWrap: { width: 84, height: 84, borderRadius: 12, overflow: "hidden", background: "#eee" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardImgPlaceholder: { width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#777", fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: 900, lineHeight: 1.15 },
  cardMeta: { fontSize: 13, color: "#444", marginTop: 3 },

  pagerRow: { marginTop: 12, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center" },

  // Profile
  profileImgWrap: { position: "relative", width: "100%", maxWidth: 360, aspectRatio: "1/1", borderRadius: 14, overflow: "hidden", background: "#eee", margin: "0 auto" },
  profileImg: { width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" },

  // Details
  details: { marginTop: 10 },
  title: { fontSize: 20, fontWeight: 900, lineHeight: 1.2 },
  meta: { fontSize: 14, color: "#444", marginTop: 4 },

  // 4 Buttons grid
  btnGrid4: { display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 12 },
  btnPrimary: { border: "none", background: "#1976d2", color: "#fff", padding: "12px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%" },
  btnWarn:    { border: "2px solid #f57c00", background: "#fff", color: "#f57c00", padding: "10px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%" },
  btnNeutral: { border: "none", background: "#efefef", color: "#222", padding: "12px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%" },
  btnDanger:  { border: "none", background: "#d32f2f", color: "#fff", padding: "12px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%" },

  // Modal shell (scrollable, centered, with safe top space)
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",                       // center vertically
    justifyContent: "center",
    padding: "calc(env(safe-area-inset-top, 0px) + 72px) 12px 24px", // headroom for navbar
    overflowY: "auto",
    zIndex: 1500
  },
  modalBody: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    padding: 10,
    position: "relative",
    maxHeight: "calc(100vh - 200px)",           // fits inside padded viewport
    overflowY: "auto"
  },
  modalContent: { width: "100%" },
  modalCloseFloating: { position: "fixed", top: 16, right: 16, background: "#222", color: "#fff", border: "none", borderRadius: 999, width: 44, height: 44, fontSize: 22, lineHeight: "44px", textAlign: "center", fontWeight: 900, cursor: "pointer", zIndex: 1550 },

  // Modal common
  modalTitle: { fontSize: 18, fontWeight: 900, marginBottom: 8, position: "sticky", top: 0, background: "#fff", paddingTop: 4, paddingBottom: 6, zIndex: 1 },
  modalPrimary: { border: "none", background: "#1976d2", color: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%", marginTop: 8 },
  modalDanger:  { border: "none", background: "#d32f2f", color: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%" },
  modalNeutral: { border: "none", background: "#efefef", color: "#222", padding: "10px 12px", borderRadius: 12, fontWeight: 900, cursor: "pointer", width: "100%", marginTop: 8 },
  modalActionsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, position: "sticky", bottom: 0, background: "#fff", paddingTop: 8 },

  // Dropzone (Add)
  dropZone: { marginBottom: 10, border: "2px dashed #ccc", borderRadius: 12, padding: 14, textAlign: "center", background: "#fafafa", transition: "border-color 150ms ease, background 150ms ease", cursor: "pointer" },
  dropZoneActive: { borderColor: "#1976d2", background: "#eef5ff" },
  dropIcon: { fontSize: 26, marginBottom: 6, fontWeight: 900 },
  dropText: { fontWeight: 900 },
  dropSub: { fontSize: 12, color: "#666", marginTop: 4 },

  // Delete/View grids
  galleryManageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 6 },
  manageItem: { position: "relative" },
  checkboxWrap: { position: "absolute", top: 6, left: 6, zIndex: 2, background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: "2px 4px" },
  checkbox: { width: 16, height: 16 },
  galleryThumb: { width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 10 },

  galleryViewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 },
  thumbBtn: { border: "none", padding: 0, background: "transparent", cursor: "pointer", width: "100%", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden" },

  // Lightbox
  lightbox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1600, padding: 12 },
  lightboxImg: { maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" },
  lightboxCloseBelow: { marginTop: 12, background: "#ffffff", border: "none", borderRadius: 24, padding: "10px 18px", fontWeight: 900, cursor: "pointer" },

  // Shimmer
  shimmerBox: { position: "absolute", inset: 0, background: "#eee", overflow: "hidden" },
  shimmerAnim: { position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(238,238,238,0) 0%, rgba(255,255,255,0.7) 50%, rgba(238,238,238,0) 100%)", transform: "translateX(-100%)", animation: "shimmer 1.2s infinite" },
};

/* ---------------- Popup styles (centered with safe-top + scroll) ---------------- */
const U = {
  popupBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",                                 // center vertically
    justifyContent: "center",
    padding: "calc(env(safe-area-inset-top, 0px) + 72px) 16px 24px", // headroom for navbar
    overflowY: "auto",
    zIndex: 1700
  },
  popupCard: {
    width: "100%",
    maxWidth: 360,
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
    textAlign: "center",
    maxHeight: "calc(100vh - 160px)",                    // fits inside padded viewport
    overflowY: "auto",
    margin: "0 auto"
  },
  popSuccess: { border: "2px solid #43a047" },
  popError: { border: "2px solid #d32f2f" },
  popupMsg: { fontWeight: 800, color: "#222", marginBottom: 12 },
  popupBtn: { background: "#222", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", width: "100%" },
};

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("actressespage-kf")) {
  const st = document.createElement("style");
  st.id = "actressespage-kf";
  st.innerHTML = `@keyframes shimmer { 100% { transform: translateX(100%); } }`;
  document.head.appendChild(st);
}
