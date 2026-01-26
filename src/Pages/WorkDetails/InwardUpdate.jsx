import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function InwardUpdate() {
  const { id } = useParams(); // inward_id
  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE = useMemo(() => "https://express-backend-myapp.onrender.com", []);
  const ONE_API = useMemo(() => `${API_BASE}/api/inward/${id}`, [API_BASE, id]);
  const UPDATE_API = useMemo(() => `${API_BASE}/api/inward/${id}`, [API_BASE, id]);

  // state passed from InwardGet
  const displaySeq = location?.state?.displaySeq ?? "";
  const from = location?.state?.from ?? "";
  const to = location?.state?.to ?? "";
  const returnTo = location?.state?.returnTo || "/work-details";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // header fields
  const [work_date, setWorkDate] = useState("");
  const [store, setStore] = useState("");

  // items
  const [items, setItems] = useState([]);

  // dialogs / overlay (simple)
  const [dlg, setDlg] = useState({ open: false, type: "info", title: "", message: "" });
  const openDlg = (type, title, message) => setDlg({ open: true, type, title, message });
  const closeDlg = () => setDlg((d) => ({ ...d, open: false }));

  const [overlay, setOverlay] = useState({ open: false, text: "Please wait..." });

  const formatDDMMYYYY = (iso) => {
    const s = String(iso || "").slice(0, 10);
    if (!s || s.length !== 10) return s || "";
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}/${m}/${y}`;
  };

  const fetchOne = async () => {
    setLoading(true);
    try {
      const r = await fetch(ONE_API);
      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data?.success || !data?.data) {
        openDlg("error", "Failed", data?.message || "Unable to load inward record.");
        setLoading(false);
        return;
      }

      const rec = data.data;

      setWorkDate(String(rec?.work_date || "").slice(0, 10));
      setStore(rec?.store || "");

      const serverItems = Array.isArray(rec?.items) ? rec.items : [];

      // normalize fields (keep id + order)
      setItems(
        serverItems
          .map((it) => ({
            id: it?.id,
            item_order: it?.item_order ?? 1,
            material: it?.material ?? "",
            quantity: it?.quantity ?? "",
            quantity_type: it?.quantity_type ?? "",
            material_use: it?.material_use ?? "",
            // file is optional; we are NOT re-uploading here
            file_url: it?.file_url ?? "",
            upload_id: it?.upload_id ?? null,
            mime_type: it?.mime_type ?? "",
          }))
          .sort((a, b) => (a.item_order || 0) - (b.item_order || 0))
      );

      setLoading(false);
    } catch (e) {
      setLoading(false);
      openDlg("error", "Network Error", "Server not reachable.");
    }
  };

  useEffect(() => {
    fetchOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: null,
        item_order: prev.length + 1,
        material: "",
        quantity: "",
        quantity_type: "",
        material_use: "",
        file_url: "",
        upload_id: null,
        mime_type: "",
      },
    ]);
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const validate = () => {
    if (!work_date) return "Work date is required.";
    if (!store.trim()) return "Store is required.";

    if (!items.length) return "At least one item is required.";

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!String(it.material || "").trim()) return `Row ${i + 1}: Material is required.`;
      if (it.quantity === "" || it.quantity === null || typeof it.quantity === "undefined") return `Row ${i + 1}: Quantity is required.`;
      if (!String(it.quantity_type || "").trim()) return `Row ${i + 1}: Quantity type is required.`;
      // material_use optional - keep optional if you want
    }

    return "";
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      openDlg("error", "Validation", err);
      return;
    }

    setSaving(true);
    setOverlay({ open: true, text: "Updating..." });

    try {
      // ✅ IMPORTANT:
      // Your backend must accept PUT/PATCH body in this structure.
      // If your backend expects different keys, tell me your API body format and I’ll adjust.
      const payload = {
        work_date,
        store,
        items: items.map((it, index) => ({
          id: it.id, // keep item id for update if exists
          item_order: index + 1,
          material: it.material,
          quantity: Number(it.quantity),
          quantity_type: it.quantity_type,
          material_use: it.material_use,
          // we are NOT changing bill file here
        })),
      };

      const r = await fetch(UPDATE_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));

      setOverlay({ open: false, text: "Please wait..." });
      setSaving(false);

      if (!r.ok || !data?.success) {
        openDlg("error", "Update Failed", data?.message || "Unable to update inward.");
        return;
      }

      // ✅ SUCCESS → GO BACK to Work Details page & open GET INWARD tab & refresh
      navigate("/work-details", {
        state: {
          tabKey: "getinward",
          refreshInward: true,
          from,
          to,
        },
        replace: true,
      });
    } catch (e) {
      setOverlay({ open: false, text: "Please wait..." });
      setSaving(false);
      openDlg("error", "Network Error", "Server not reachable.");
    }
  };

  const goBack = () => {
    // return to list page with filters restore (Worknewtab will handle)
    navigate("/work-details", {
      state: {
        tabKey: "getinward",
        refreshInward: false,
        from,
        to,
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.hLeft}>
          <div style={styles.title}>Update Inward</div>
          <div style={styles.subTitle}>
            {displaySeq ? `Sr.No ${displaySeq}` : "Record"} • {id}
          </div>
        </div>

        <div style={styles.hRight}>
          <button type="button" style={{ ...styles.btn, ...styles.btnGhost }} onClick={goBack} disabled={saving}>
            ← Back
          </button>
          <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Update"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.center}>
          <div style={styles.spinner} />
          <div style={styles.muted}>Loading...</div>
        </div>
      ) : (
        <div style={styles.body}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Header</div>

            <div style={styles.grid}>
              <div>
                <label style={styles.label}>Work Date</label>
                <input type="date" value={work_date} onChange={(e) => setWorkDate(e.target.value)} style={styles.input} />
              </div>

              <div>
                <label style={styles.label}>Store</label>
                <input value={store} onChange={(e) => setStore(e.target.value)} style={styles.input} placeholder="Enter store name" />
              </div>
            </div>

            <div style={{ marginTop: 8, color: "#6b7280", fontSize: 12, fontWeight: 700 }}>
              Current date: <span style={{ color: "#111827" }}>{formatDDMMYYYY(work_date)}</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.rowBetween}>
              <div style={styles.cardTitle}>Items</div>
              <button type="button" style={{ ...styles.btn, ...styles.btnOutline }} onClick={addItem} disabled={saving}>
                + Add Item
              </button>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Material</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Material Use</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id ?? `new-${idx}`}>
                      <td style={styles.td}>{idx + 1}</td>

                      <td style={styles.td}>
                        <input
                          style={styles.inpSmall}
                          value={it.material}
                          onChange={(e) => updateItem(idx, "material", e.target.value)}
                          placeholder="Material"
                        />
                      </td>

                      <td style={styles.td}>
                        <input
                          style={styles.inpSmall}
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          placeholder="Qty"
                        />
                      </td>

                      <td style={styles.td}>
                        <input
                          style={styles.inpSmall}
                          value={it.quantity_type}
                          onChange={(e) => updateItem(idx, "quantity_type", e.target.value)}
                          placeholder="kg / pcs / bag..."
                        />
                      </td>

                      <td style={styles.td}>
                        <input
                          style={styles.inpSmall}
                          value={it.material_use}
                          onChange={(e) => updateItem(idx, "material_use", e.target.value)}
                          placeholder="Where used"
                        />
                      </td>

                      <td style={styles.td}>
                        <button type="button" style={{ ...styles.btnMini, ...styles.btnDanger }} onClick={() => removeItem(idx)} disabled={saving}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.note}>
              * Bill file update इथे घेतलेलं नाही. (फक्त text fields update) — bill file update करायचं असेल तर वेगळा upload section add करू.
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {overlay.open && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <div style={styles.spinner} />
            <div style={{ fontWeight: 900 }}>{overlay.text}</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Please wait…</div>
          </div>
        </div>
      )}

      {/* Dialog */}
      {dlg.open && (
        <div style={styles.dlgOverlay} onClick={closeDlg}>
          <div style={styles.dlg} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...styles.dlgTop, ...(dlg.type === "error" ? styles.dlgError : dlg.type === "success" ? styles.dlgSuccess : styles.dlgInfo) }}>
              <div style={{ fontWeight: 900 }}>{dlg.title}</div>
            </div>
            <div style={styles.dlgBody}>
              <pre style={styles.pre}>{dlg.message}</pre>
            </div>
            <div style={styles.dlgActions}>
              <button style={{ ...styles.btn, ...styles.btnDark }} onClick={closeDlg}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f6f8fc", padding: 14, boxSizing: "border-box" },

  header: {
    background: "linear-gradient(135deg,#0b1220,#0f2147)",
    color: "#fff",
    borderRadius: 18,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    boxShadow: "0 14px 40px rgba(11,18,32,0.14)",
  },
  hLeft: { display: "flex", flexDirection: "column", gap: 6 },
  hRight: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  title: { fontSize: 18, fontWeight: 1000, letterSpacing: 0.2 },
  subTitle: { fontSize: 12, fontWeight: 800, opacity: 0.92 },

  body: { marginTop: 12, display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 30px rgba(11,18,32,0.06)",
  },
  cardTitle: { fontSize: 14, fontWeight: 1000, color: "#0b1220" },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },

  grid: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#111827", marginBottom: 6 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: "10px 10px",
    fontSize: 14,
    outline: "none",
  },

  tableWrap: { width: "100%", overflowX: "auto", marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  th: { textAlign: "left", padding: 10, background: "#f3f4f6", fontWeight: 900, borderBottom: "1px solid rgba(0,0,0,0.06)" },
  td: { padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", verticalAlign: "top" },
  inpSmall: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: "9px 10px",
    fontSize: 13,
    outline: "none",
  },

  btn: {
    border: 0,
    borderRadius: 12,
    padding: "9px 12px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
    transition: "transform .08s ease, filter .15s ease",
  },
  btnMini: { border: 0, borderRadius: 10, padding: "7px 10px", fontWeight: 900, cursor: "pointer", fontSize: 12 },
  btnPrimary: { background: "#fff", color: "#0b1220" },
  btnDark: { background: "#0b1220", color: "#fff" },
  btnOutline: { background: "#fff", color: "#0b1220", border: "1px solid rgba(11,18,32,0.18)" },
  btnGhost: { background: "rgba(255,255,255,0.14)", color: "#fff" },
  btnDanger: { background: "#fee2e2", color: "#b91c1c", border: "1px solid rgba(185,28,28,0.18)" },

  center: { padding: 28, textAlign: "center" },
  muted: { fontSize: 12, color: "#6b7280", fontWeight: 700 },
  spinner: { width: 36, height: 36, borderRadius: 999, border: "4px solid rgba(11,18,32,0.15)", borderTopColor: "#0b1220", animation: "spin 0.9s linear infinite", margin: "0 auto 10px" },

  note: { marginTop: 10, fontSize: 12, color: "#6b7280", fontWeight: 700, lineHeight: 1.4 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999999 },
  overlayCard: { width: "100%", maxWidth: 360, background: "#fff", borderRadius: 18, padding: 18, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },

  dlgOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 16, zIndex: 999999 },
  dlg: { width: "100%", maxWidth: 520, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
  dlgTop: { padding: "14px 16px" },
  dlgError: { background: "rgba(239,68,68,0.15)" },
  dlgSuccess: { background: "rgba(16,185,129,0.15)" },
  dlgInfo: { background: "rgba(59,130,246,0.15)" },
  dlgBody: { padding: "14px 16px" },
  pre: { margin: 0, whiteSpace: "pre-wrap", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", fontSize: 14, color: "#111827", lineHeight: 1.4 },
  dlgActions: { padding: "12px 16px 16px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid rgba(0,0,0,0.06)" },
};

// spinner keyframes
if (typeof document !== "undefined") {
  const id = "inward-update-spin-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `@keyframes spin{to{transform:rotate(360deg);}}`;
    document.head.appendChild(s);
  }
}
