import { useEffect, useMemo, useState } from "react";

export default function Addtog_transaction() {
  const API_BASE = "https://express-backend-myapp.onrender.com/api";

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    amount: 1,
    quantity: 1,
    type: "debit",
    category_id: "",
    subcategory_id: "",
    purpose: "",
    t_date: getTodayDate(),
  });

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [saving, setSaving] = useState(false);

  const [popup, setPopup] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCats(true);

        const res = await fetch(`${API_BASE}/tag_catsub/all`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load categories");
        }

        const cats = data.data || [];
        setCategories(cats);

        const subs = cats.flatMap((c) =>
          (c.subcategories || []).map((s) => ({
            ...s,
            category_id: Number(s.category_id ?? c.id),
          }))
        );

        setSubcategories(subs);
      } catch (error) {
        console.error("Failed to load data:", error);
        openPopup(
          "error",
          "Load Failed",
          error.message || "Failed to load categories/subcategories"
        );
      } finally {
        setLoadingCats(false);
      }
    };

    load();
  }, []);

  const selectedSub = useMemo(() => {
    if (!form.category_id) return [];
    return subcategories.filter(
      (s) => Number(s.category_id) === Number(form.category_id)
    );
  }, [form.category_id, subcategories]);

  const update = (k, v) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const handleCategoryClick = (id) => {
    setForm((prev) => ({
      ...prev,
      category_id: Number(id),
      subcategory_id: "",
    }));
  };

  const resetForm = () => {
    setForm({
      amount: 1,
      quantity: 1,
      type: "debit",
      category_id: "",
      subcategory_id: "",
      purpose: "",
      t_date: getTodayDate(),
    });
  };

  const openPopup = (type, title, message) => {
    setPopup({
      open: true,
      type,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopup({
      open: false,
      type: "",
      title: "",
      message: "",
    });
  };

  useEffect(() => {
    if (popup.open) {
      const timer = setTimeout(() => {
        closePopup();
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, [popup.open]);

  const handleSubmit = async () => {
    try {
      const payload = {
        amount: Number(form.amount),
        quantity:
          form.quantity === "" || form.quantity === null
            ? null
            : Number(form.quantity),
        type: String(form.type).trim().toLowerCase(),
        category_id:
          form.category_id === "" || form.category_id === null
            ? null
            : Number(form.category_id),
        subcategory_id:
          form.subcategory_id === "" || form.subcategory_id === null
            ? null
            : Number(form.subcategory_id),
        purpose: form.purpose.trim(),
        t_date: form.t_date,
      };

      if (isNaN(payload.amount) || payload.amount <= 0) {
        openPopup("error", "Invalid Amount", "Amount must be greater than 0");
        return;
      }

      if (
        payload.quantity !== null &&
        (isNaN(payload.quantity) || payload.quantity < 0)
      ) {
        openPopup("error", "Invalid Quantity", "Quantity must be 0 or more");
        return;
      }

      if (!["debit", "credit"].includes(payload.type)) {
        openPopup("error", "Invalid Type", "Type must be debit or credit");
        return;
      }

      if (!payload.t_date) {
        openPopup("error", "Missing Date", "Date is required");
        return;
      }

      setSaving(true);

      const res = await fetch(`${API_BASE}/tag_transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to add transaction");
      }

      openPopup(
        "success",
        "Success",
        data.message || "Transaction added successfully"
      );

      resetForm();
    } catch (error) {
      console.error("SAVE ERROR:", error);
      openPopup(
        "error",
        "Save Failed",
        error.message || "Failed to add transaction"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        *{
          box-sizing:border-box;
          margin:0;
          padding:0;
        }

        body{
          font-family: Inter, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at top left, rgba(99,102,241,.16), transparent 30%),
            radial-gradient(circle at top right, rgba(34,197,94,.13), transparent 28%),
            radial-gradient(circle at bottom left, rgba(236,72,153,.14), transparent 25%),
            linear-gradient(135deg, #eef4ff 0%, #f9fbff 40%, #edf6ff 100%);
          min-height:100vh;
          animation: pageFlow 10s ease-in-out infinite alternate;
        }

        @keyframes pageFlow{
          0%{ background-position: left top, right top, left bottom, center; }
          100%{ background-position: right top, left top, right bottom, center; }
        }

        .page{
          min-height:100vh;
          padding:14px;
          display:flex;
          justify-content:center;
        }

        .wrapper{
          width:100%;
          max-width:450px;
        }

        .hero{
          position:relative;
          overflow:hidden;
          margin-bottom:14px;
          padding:18px 16px;
          border-radius:24px;
          background:linear-gradient(135deg, #111827 0%, #1d4ed8 50%, #06b6d4 100%);
          box-shadow:0 18px 40px rgba(29,78,216,.22);
          color:#fff;
          animation: heroFloat 4s ease-in-out infinite;
        }

        @keyframes heroFloat{
          0%,100%{ transform:translateY(0px); }
          50%{ transform:translateY(-2px); }
        }

        .hero::before{
          content:"";
          position:absolute;
          width:180px;
          height:180px;
          right:-40px;
          top:-50px;
          border-radius:50%;
          background:rgba(255,255,255,.08);
        }

        .hero::after{
          content:"";
          position:absolute;
          width:120px;
          height:120px;
          left:-30px;
          bottom:-30px;
          border-radius:50%;
          background:rgba(255,255,255,.07);
        }

        .hero-title{
          position:relative;
          z-index:1;
          font-size:1.15rem;
          font-weight:900;
          margin-bottom:6px;
          letter-spacing:.3px;
        }

        .hero-sub{
          position:relative;
          z-index:1;
          font-size:.77rem;
          color:rgba(255,255,255,.82);
          line-height:1.5;
        }

        .card{
          background:rgba(255,255,255,.88);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,.7);
          border-radius:22px;
          padding:13px;
          margin-bottom:12px;
          box-shadow:
            0 12px 28px rgba(15,23,42,.06),
            inset 0 1px 0 rgba(255,255,255,.75);
          animation: cardFade .35s ease;
        }

        @keyframes cardFade{
          from{
            opacity:0;
            transform:translateY(8px);
          }
          to{
            opacity:1;
            transform:translateY(0);
          }
        }

        .title-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:10px;
        }

        .title{
          font-size:.8rem;
          font-weight:900;
          color:#0f172a;
          letter-spacing:.2px;
        }

        .badge{
          font-size:.66rem;
          font-weight:800;
          color:#64748b;
          background:linear-gradient(180deg,#ffffff,#f8fafc);
          border:1px solid #e2e8f0;
          padding:4px 8px;
          border-radius:999px;
        }

        .counter{
          display:grid;
          grid-template-columns:38px 1fr 38px;
          gap:8px;
          align-items:center;
        }

        .btn-square{
          width:38px;
          height:38px;
          border:none;
          outline:none;
          border-radius:10px;
          background:linear-gradient(180deg,#ffffff,#e8f0ff);
          border:1px solid #dbe4f0;
          color:#0f172a;
          font-size:1rem;
          font-weight:900;
          cursor:pointer;
          box-shadow:0 8px 18px rgba(37,99,235,.10);
          transition:all .18s ease;
        }

        .btn-square:hover{
          transform:translateY(-2px);
          box-shadow:0 12px 22px rgba(37,99,235,.14);
        }

        .btn-square:active{
          transform:scale(.93);
          box-shadow:0 4px 10px rgba(37,99,235,.12);
        }

        .fancy-input,
        .text-area,
        .date-input{
          width:100%;
          border:none;
          outline:none;
          background:linear-gradient(180deg,#ffffff,#f8fbff);
          border:1px solid #dbe4f0;
          color:#0f172a;
          transition:.2s ease;
          box-shadow:inset 0 1px 2px rgba(15,23,42,.04);
        }

        .fancy-input{
          height:38px;
          border-radius:12px;
          text-align:center;
          font-size:.9rem;
          font-weight:800;
        }

        .text-area{
          min-height:90px;
          border-radius:14px;
          padding:12px;
          resize:none;
          font-size:.82rem;
          line-height:1.5;
          font-family:inherit;
        }

        .date-input{
          height:40px;
          border-radius:14px;
          padding:0 12px;
          font-size:.82rem;
          font-weight:700;
        }

        .fancy-input:focus,
        .text-area:focus,
        .date-input:focus{
          border-color:#60a5fa;
          box-shadow:0 0 0 4px rgba(59,130,246,.12);
        }

        .toggle-wrap{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
        }

        .toggle{
          height:36px;
          border:none;
          outline:none;
          border-radius:12px;
          font-size:.78rem;
          font-weight:900;
          cursor:pointer;
          transition:all .18s ease;
          letter-spacing:.2px;
        }

        .toggle.debit{
          background:#fff1f2;
          color:#be123c;
          border:1px solid #fecdd3;
        }

        .toggle.credit{
          background:#ecfdf5;
          color:#15803d;
          border:1px solid #bbf7d0;
        }

        .toggle.debit.active{
          background:linear-gradient(135deg,#ef4444,#b91c1c);
          color:#fff;
          box-shadow:0 12px 20px rgba(239,68,68,.26);
        }

        .toggle.credit.active{
          background:linear-gradient(135deg,#22c55e,#15803d);
          color:#fff;
          box-shadow:0 12px 20px rgba(34,197,94,.26);
        }

        .toggle:hover{
          transform:translateY(-1px);
        }

        .toggle:active{
          transform:scale(.96);
        }

        .list{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:8px;
        }

        .item{
          position:relative;
          overflow:hidden;
          min-height:44px;
          padding:9px 11px;
          border-radius:14px;
          background:linear-gradient(180deg,#ffffff,#f8fafc);
          border:1px solid #e2e8f0;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          cursor:pointer;
          transition:all .2s ease;
        }

        .item::before{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(135deg, rgba(255,255,255,.18), transparent 70%);
          pointer-events:none;
        }

        .item:hover{
          transform:translateY(-2px);
          box-shadow:0 12px 22px rgba(15,23,42,.08);
        }

        .item:active{
          transform:scale(.97);
        }

        .item-left{
          display:flex;
          align-items:center;
          gap:9px;
          min-width:0;
        }

        .item-dot{
          width:9px;
          height:9px;
          border-radius:50%;
          flex-shrink:0;
        }

        .category-item .item-name{
          font-size:.74rem;
          font-weight:800;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .subcategory-item .item-name{
          font-size:.68rem;
          font-weight:800;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .item.active{
          color:#fff;
          border:none;
        }

        .category-item.active{
          background:linear-gradient(135deg,#7c3aed 0%, #2563eb 100%);
          box-shadow:0 14px 24px rgba(99,102,241,.28);
        }

        .subcategory-item.active{
          background:linear-gradient(135deg,#f97316 0%, #ec4899 100%);
          box-shadow:0 14px 24px rgba(236,72,153,.24);
        }

        .check{
          width:18px;
          height:18px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(255,255,255,.16);
          border:1px solid rgba(255,255,255,.34);
          font-size:.68rem;
          font-weight:900;
          flex-shrink:0;
        }

        .submit{
          width:100%;
          height:44px;
          border:none;
          outline:none;
          border-radius:15px;
          background:linear-gradient(135deg,#111827 0%, #1d4ed8 55%, #0ea5e9 100%);
          color:#fff;
          font-size:.84rem;
          font-weight:900;
          letter-spacing:.2px;
          cursor:pointer;
          box-shadow:0 16px 28px rgba(29,78,216,.24);
          transition:all .22s ease;
        }

        .submit:hover{
          transform:translateY(-2px);
          box-shadow:0 20px 30px rgba(29,78,216,.28);
        }

        .submit:active{
          transform:scale(.97);
        }

        .submit:disabled{
          opacity:.65;
          cursor:not-allowed;
          transform:none;
        }

        .empty-state{
          text-align:center;
          padding:11px;
          border-radius:14px;
          border:1px dashed #cbd5e1;
          background:#f8fafc;
          color:#64748b;
          font-size:.74rem;
          font-weight:700;
        }

        .popup-overlay{
          position:fixed;
          inset:0;
          background:rgba(15,23,42,.35);
          backdrop-filter:blur(4px);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:9999;
          padding:16px;
        }

        .popup-box{
          width:100%;
          max-width:320px;
          background:#ffffff;
          border-radius:22px;
          padding:20px 16px;
          text-align:center;
          box-shadow:0 24px 50px rgba(15,23,42,.22);
          border:1px solid #e5e7eb;
          animation: popupFade .25s ease;
        }

        @keyframes popupFade{
          from{
            opacity:0;
            transform:scale(.92) translateY(8px);
          }
          to{
            opacity:1;
            transform:scale(1) translateY(0);
          }
        }

        .popup-icon{
          width:54px;
          height:54px;
          margin:0 auto 12px auto;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#fff;
          font-size:24px;
          font-weight:900;
          box-shadow:0 10px 22px rgba(15,23,42,.14);
        }

        .popup-title{
          font-size:1rem;
          font-weight:900;
          color:#111827;
          margin-bottom:6px;
        }

        .popup-text{
          font-size:.8rem;
          line-height:1.55;
          color:#64748b;
        }

        @media (max-width:420px){
          .list{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <div className="wrapper">
          <div className="hero">
            <div className="hero-title">Add Transaction</div>
            <div className="hero-sub">
              Professional entry screen with stylish category and subcategory selection.
            </div>
          </div>

          {/* Amount */}
          <div className="card">
            <div className="title-row">
              <div className="title">Amount</div>
              <div className="badge">Required</div>
            </div>
            <div className="counter">
              <button
                type="button"
                className="btn-square"
                onClick={() =>
                  update("amount", Math.max(1, Number(form.amount || 0) - 1))
                }
              >
                −
              </button>
              <input
                className="fancy-input"
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
              />
              <button
                type="button"
                className="btn-square"
                onClick={() => update("amount", Number(form.amount || 0) + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="card">
            <div className="title-row">
              <div className="title">Quantity</div>
              <div className="badge">Optional</div>
            </div>
            <div className="counter">
              <button
                type="button"
                className="btn-square"
                onClick={() =>
                  update("quantity", Math.max(0, Number(form.quantity || 0) - 1))
                }
              >
                −
              </button>
              <input
                className="fancy-input"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
              />
              <button
                type="button"
                className="btn-square"
                onClick={() => update("quantity", Number(form.quantity || 0) + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Type */}
          <div className="card">
            <div className="title-row">
              <div className="title">Transaction Type</div>
              <div className="badge">Select</div>
            </div>
            <div className="toggle-wrap">
              <button
                type="button"
                className={`toggle debit ${form.type === "debit" ? "active" : ""}`}
                onClick={() => update("type", "debit")}
              >
                Debit
              </button>
              <button
                type="button"
                className={`toggle credit ${form.type === "credit" ? "active" : ""}`}
                onClick={() => update("type", "credit")}
              >
                Credit
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="card">
            <div className="title-row">
              <div className="title">Category</div>
              <div className="badge">
                {loadingCats ? "Loading..." : `${categories.length} Items`}
              </div>
            </div>

            {categories.length > 0 ? (
              <div className="list">
                {categories.map((c) => {
                  const isActive = Number(form.category_id) === Number(c.id);

                  return (
                    <div
                      key={c.id}
                      className={`item category-item ${isActive ? "active" : ""}`}
                      onClick={() => handleCategoryClick(c.id)}
                    >
                      <div className="item-left">
                        <span
                          className="item-dot"
                          style={{
                            background: isActive ? "#ffffff" : "#7c3aed",
                            boxShadow: isActive
                              ? "0 0 0 4px rgba(255,255,255,.16)"
                              : "0 0 0 4px rgba(124,58,237,.10)",
                          }}
                        ></span>
                        <span className="item-name">{c.name}</span>
                      </div>
                      {isActive && <span className="check">✓</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No category available.</div>
            )}
          </div>

          {/* Subcategory */}
          {form.category_id && (
            <div className="card">
              <div className="title-row">
                <div className="title">Subcategory</div>
                <div className="badge">{selectedSub.length} Items</div>
              </div>

              {selectedSub.length > 0 ? (
                <div className="list">
                  {selectedSub.map((s) => {
                    const isActive = Number(form.subcategory_id) === Number(s.id);

                    return (
                      <div
                        key={s.id}
                        className={`item subcategory-item ${isActive ? "active" : ""}`}
                        onClick={() => update("subcategory_id", Number(s.id))}
                      >
                        <div className="item-left">
                          <span
                            className="item-dot"
                            style={{
                              background: isActive ? "#ffffff" : "#f97316",
                              boxShadow: isActive
                                ? "0 0 0 4px rgba(255,255,255,.16)"
                                : "0 0 0 4px rgba(249,115,22,.10)",
                            }}
                          ></span>
                          <span className="item-name">{s.name}</span>
                        </div>
                        {isActive && <span className="check">✓</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">No subcategory available.</div>
              )}
            </div>
          )}

          {/* Purpose */}
          <div className="card">
            <div className="title-row">
              <div className="title">Purpose</div>
              <div className="badge">Optional</div>
            </div>
            <textarea
              className="text-area"
              placeholder="Write transaction note..."
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="card">
            <div className="title-row">
              <div className="title">Date</div>
              <div className="badge">Required</div>
            </div>
            <input
              className="date-input"
              type="date"
              value={form.t_date}
              onChange={(e) => update("t_date", e.target.value)}
            />
          </div>

          <button
            type="button"
            className="submit"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Add Transaction"}
          </button>
        </div>
      </div>

      {popup.open && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div
              className="popup-icon"
              style={{
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #22c55e, #15803d)"
                    : "linear-gradient(135deg, #ef4444, #b91c1c)",
              }}
            >
              {popup.type === "success" ? "✓" : "!"}
            </div>
            <div className="popup-title">{popup.title}</div>
            <div className="popup-text">{popup.message}</div>
          </div>
        </div>
      )}
    </>
  );
}