import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE = "https://express-backend-myapp.onrender.com";
const API = {
  list: `${BASE}/api/user-act-favorite`,
  byId: (id) => `${BASE}/api/user-act-favorite/${id}`,
  images: (id) => `${BASE}/api/user-act-favorite/${id}/images`,
};

const calcAge = (dobStr) => {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(+dob)) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
};

export default function GetFevAct() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);         // actions (delete etc.)
  const [loading, setLoading] = useState(true);    // initial & refresh list load
  const [centerPopup, setCenterPopup] = useState({ show: false, title: "", body: "", type: "info" });
  const [confirmBox, setConfirmBox] = useState({ show: false, title: "", body: "", onConfirm: null });

  // Image manager (only when user presses buttons)
  const [imgMgr, setImgMgr] = useState({ open: false, item: null, mode: "view", selected: new Set() });
  // Stand-alone lightbox (profile or gallery image)
  const [lightboxSrc, setLightboxSrc] = useState(null);

  /* --- Styles (once) --- */
  useEffect(() => {
    const id = "getfav-css";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      :root{--brand1:#2563eb;--brand2:#8b5cf6;--brand3:#22c55e}
      body{font-family:Inter,system-ui,sans-serif;background:#f8fafc}
      .card-glass{background:#fff;border:1px solid rgba(0,0,0,.06);box-shadow:0 10px 28px rgba(0,0,0,.06);border-radius:16px;transition:transform .2s ease}
      .card-glass:hover{transform:translateY(-2px)}
      .hero{width:100%;max-width:min(520px,90vw);height:auto;border-radius:14px;border:1px solid rgba(0,0,0,.08);object-fit:cover}
      .thumb{width:80px;height:80px;object-fit:cover;border-radius:10px;border:1px solid rgba(0,0,0,.08)}
      .thumb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px}
      .name-pro{font-weight:800;letter-spacing:.2px;color:#0e7490}
      .seq{background:#ecfeff;color:#0e7490;border:1px solid #99f6e4;padding:.2rem .5rem;border-radius:8px;font-weight:700}
      .center-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:2100;animation:fadeIn .2s ease}
      .center-card{width:92%;max-width:460px;background:#fff;border-radius:16px;box-shadow:0 22px 50px rgba(0,0,0,.25);animation:scaleUp .2s ease}
      .center-header{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,.08);font-weight:700}
      .center-body{padding:14px 16px}
      .center-footer{padding:12px 16px;border-top:1px solid rgba(0,0,0,.08);display:flex;gap:10px;justify-content:flex-end}
      .btn-view{background:linear-gradient(90deg,var(--brand1),var(--brand3));color:#fff;border:none}
      .btn-delete{background:linear-gradient(90deg,#ef4444,#f59e0b);color:#fff;border:none}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes scaleUp{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
      .fullpage-loader{position:fixed;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,#ffffff,#f1f5f9);z-index:2500}
      .brand-title{background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));-webkit-background-clip:text;background-clip:text;color:transparent}
      /* tighter mobile spacing under header */
      .page-top{padding-top:.5rem}
      @media(min-width:576px){.page-top{padding-top:1rem}}
    `;
    document.head.appendChild(s);
  }, []);

  /* --- Fetch list --- */
  const fetchList = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`${API.list}?${qs}`);
      const j = await res.json();
      setRows(j?.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  useEffect(() => { fetchList(); }, []);

  /* --- Popup helpers --- */
  const showPopup = (title, body, type = "info", timeout = 1400) => {
    setCenterPopup({ show: true, title, body, type });
    if (timeout) setTimeout(() => setCenterPopup({ show: false }), timeout);
  };
  const askConfirm = (title, body, onConfirm) => setConfirmBox({ show: true, title, body, onConfirm });

  /* --- Delete row (optimistic + instant UI) --- */
  const deleteRow = (id, name) => {
    askConfirm("Delete Entry?", `Delete “${name}”? This cannot be undone.`, async () => {
      setConfirmBox({ show: false });
      // optimistic remove
      const prev = rows;
      setRows((r) => r.filter((x) => x.id !== id));
      setBusy(true);
      try {
        const res = await fetch(API.byId(id), { method: "DELETE" });
        const j = await res.json();
        if (!j?.success) throw new Error(j?.message || "Failed");
        showPopup("Deleted", "Entry removed successfully", "success");
        fetchList(); // refresh server state
      } catch (e) {
        // rollback on failure
        setRows(prev);
        showPopup("Error", e.message || "Failed to delete", "danger");
      } finally {
        setBusy(false);
      }
    });
  };

  /* --- Remove selected images (optimistic) --- */
  const removeImages = async () => {
    const toRemove = [...imgMgr.selected];
    if (!toRemove.length) return;
    askConfirm("Remove Images?", `Remove ${toRemove.length} image(s)?`, async () => {
      setConfirmBox({ show: false });
      setBusy(true);
      // optimistic update
      const prevItem = imgMgr.item;
      const nextImages = (prevItem.images || []).filter((u) => !imgMgr.selected.has(u));
      setImgMgr((s) => ({ ...s, item: { ...s.item, images: nextImages }, selected: new Set() }));
      try {
        const res = await fetch(API.images(prevItem.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove: toRemove }),
        });
        const j = await res.json();
        if (!j?.success) throw new Error("Failed");
        showPopup("Removed", "Images deleted successfully", "success");
        setImgMgr({ open: false, item: null, mode: "view", selected: new Set() });
        fetchList();
      } catch (e) {
        // rollback if needed
        setImgMgr((s) => ({ ...s, item: prevItem }));
        showPopup("Error", e.message || "Failed to delete images", "danger");
      } finally {
        setBusy(false);
      }
    });
  };

  /* --- Filtered list --- */
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter(
      (r) =>
        (r.favorite_actress_name || "").toLowerCase().includes(qq) ||
        (r.favorite_movie_series || "").toLowerCase().includes(qq) ||
        (r.country_name || "").toLowerCase().includes(qq)
    );
  }, [rows, q]);

  /* --- UI --- */
  return (
    <>
      {/* Full-page centered loader BEFORE API loads */}
      {loading && (
        <div className="fullpage-loader">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} />
            <h5 className="brand-title fw-bold">Loading Favourites…</h5>
            <div className="text-muted small">Fetching data from server</div>
          </div>
        </div>
      )}

      <div className="container-xxl page-top pb-3" style={{ minHeight: "100vh", opacity: loading ? 0.2 : 1, pointerEvents: loading ? "none" : "auto" }}>
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap">
          <h4 className="m-0 brand-title">Favourite Actress List</h4>
          <span className="badge bg-light text-dark mt-2 mt-sm-0">Mobile + Desktop</span>
        </div>

        {/* Search */}
        <div className="d-flex align-items-center gap-2 mb-2">
          <input className="form-control" placeholder="Search actress / movie / country" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline-primary" onClick={fetchList}>Refresh</button>
        </div>

        {/* List */}
        {filtered.length === 0 && !loading ? (
          <div className="text-center text-muted py-4">No records found</div>
        ) : (
          <div className="row g-2 g-sm-3">
            {filtered.map((r, idx) => {
              const seq = idx + 1;
              const ageAuto = calcAge(r.actress_dob);
              return (
                <div className="col-12 col-md-6 col-lg-4" key={r.id}>
                  <div className="card card-glass h-100">
                    <div className="card-body text-center">
                      {/* Profile image: ONLY lightbox (no image manager) */}
                      <img
                        src={r.profile_image || "https://via.placeholder.com/400x300?text=No+Profile"}
                        alt="profile"
                        className="hero mx-auto"
                        style={{ cursor: r.profile_image ? "zoom-in" : "default" }}
                        onClick={() => r.profile_image && setLightboxSrc(r.profile_image)}
                      />
                      <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap">
                        <h5 className="name-pro mb-0">{r.favorite_actress_name}</h5>
                        <span className="seq">#{seq}</span>
                      </div>
                      <p className="text-muted small mb-1">{r.country_name || "Unknown Country"}</p>
                      <p className="mb-1"><strong>Movie/Series:</strong> {r.favorite_movie_series}</p>
                      {(r.actress_dob || r.age) && <p className="mb-1"><strong>Age:</strong> {ageAuto ?? r.age}</p>}
                      <p className="small text-secondary">{r.notes || "No notes"}</p>

                      <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                        <button
                          className="btn btn-view btn-sm"
                          onClick={() => setImgMgr({ open: true, item: r, mode: "view", selected: new Set() })}
                        >
                          View Images
                        </button>
                        <button
                          className="btn btn-delete btn-sm"
                          onClick={() => setImgMgr({ open: true, item: r, mode: "delete", selected: new Set() })}
                        >
                          Delete Images
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => deleteRow(r.id, r.favorite_actress_name)}
                        >
                          Delete Actress
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Manager Modal (opens ONLY via buttons) */}
      {imgMgr.open && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-scrollable modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">
                  {imgMgr.mode === "delete" ? "Select Images to Delete" : "View Images"} — {imgMgr.item?.favorite_actress_name}
                </h6>
                <button
                  className="btn-close"
                  onClick={() => setImgMgr({ open: false, item: null, mode: "view", selected: new Set() })}
                ></button>
              </div>
              <div className="modal-body">
                {(imgMgr.item?.images || []).length ? (
                  <div className="thumb-grid">
                    {imgMgr.item.images.map((src, i) => {
                      const checked = imgMgr.selected.has(src);
                      return (
                        <label key={i} className="position-relative" style={{ cursor: imgMgr.mode === "view" ? "zoom-in" : "pointer" }}>
                          {imgMgr.mode === "delete" && (
                            <input
                              type="checkbox"
                              className="form-check-input position-absolute"
                              style={{ top: 6, left: 6 }}
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(imgMgr.selected);
                                if (e.target.checked) next.add(src); else next.delete(src);
                                setImgMgr((s) => ({ ...s, selected: next }));
                              }}
                            />
                          )}
                          <img
                            src={src}
                            alt=""
                            className="thumb"
                            onClick={() => imgMgr.mode === "view" && setLightboxSrc(src)}
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted small">No extra images</div>
                )}
              </div>
              <div className="modal-footer">
                {imgMgr.mode === "delete" ? (
                  <button className="btn btn-danger" onClick={removeImages} disabled={!imgMgr.selected.size}>
                    Delete Selected
                  </button>
                ) : (
                  <button className="btn btn-light" onClick={() => setImgMgr({ ...imgMgr, mode: "delete", selected: new Set() })}>
                    Switch to Delete Mode
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => setImgMgr({ open: false, item: null, mode: "view", selected: new Set() })}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stand-alone Lightbox (profile or gallery); zoom with browser pinch/ctrl+wheel */}
      {lightboxSrc && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,.85)" }}
          onClick={() => setLightboxSrc(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ background: "rgba(0,0,0,.9)" }}>
              <div className="modal-body d-flex align-items-center justify-content-center p-2">
                <img
                  src={lightboxSrc}
                  alt=""
                  style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: "10px" }}
                />
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-light" onClick={() => setLightboxSrc(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Popup */}
      {centerPopup.show && (
        <div className="center-backdrop">
          <div className="center-card">
            <div className="center-header">{centerPopup.title}</div>
            <div className="center-body">{centerPopup.body}</div>
            <div className="center-footer">
              <button className="btn btn-primary" onClick={() => setCenterPopup({ show: false })}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm */}
      {confirmBox.show && (
        <div className="center-backdrop">
          <div className="center-card">
            <div className="center-header">{confirmBox.title}</div>
            <div className="center-body">{confirmBox.body}</div>
            <div className="center-footer">
              <button className="btn btn-light" onClick={() => setConfirmBox({ show: false })}>Cancel</button>
              <button className="btn btn-danger" onClick={() => confirmBox.onConfirm && confirmBox.onConfirm()}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Busy overlay (actions) */}
      {busy && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ background: "rgba(255,255,255,.6)", zIndex: 2200 }}>
          <div className="h-100 d-flex align-items-center justify-content-center">
            <div className="spinner-border text-primary me-2" role="status"></div>
            <div className="fw-semibold">Working…</div>
          </div>
        </div>
      )}
    </>
  );
}
