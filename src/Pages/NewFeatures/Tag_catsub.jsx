import { useEffect, useMemo, useState } from "react";

export default function Tag_catsub() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [popup, setPopup] = useState("");

  const [categoryForm, setCategoryForm] = useState({
    id: null,
    name: "",
    mode: "add",
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    id: null,
    name: "",
    mode: "add",
  });

  const API_CATEGORY = "https://express-backend-myapp.onrender.com/api/tag_category";
  const API_SUBCATEGORY = "https://express-backend-myapp.onrender.com/api/tag_subcategory";

  const showPopup = (text) => {
    setPopup(text);
    setTimeout(() => setPopup(""), 1600);
  };

  const setInfo = (type, text) => {
    setMessage({ type, text });
  };

  const clearInfo = () => {
    setMessage({ type: "", text: "" });
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      clearInfo();

      const [catRes, subRes] = await Promise.all([
        fetch(API_CATEGORY),
        fetch(API_SUBCATEGORY),
      ]);

      const catData = await catRes.json();
      const subData = await subRes.json();

      if (!catRes.ok) {
        throw new Error(catData?.error || "Failed to load categories");
      }

      if (!subRes.ok) {
        throw new Error(subData?.error || "Failed to load subcategories");
      }

      const categoryRows = Array.isArray(catData?.data) ? catData.data : [];
      const subcategoryRows = Array.isArray(subData?.data) ? subData.data : [];

      setCategories(categoryRows);
      setSubcategories(subcategoryRows);

      if (categoryRows.length > 0) {
        setActiveCategoryId((prev) => {
          const exists = categoryRows.some((item) => Number(item.id) === Number(prev));
          return exists ? prev : categoryRows[0].id;
        });
      } else {
        setActiveCategoryId("");
      }
    } catch (error) {
      console.error(error);
      setInfo("error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const selectedCategory = useMemo(() => {
    return categories.find((item) => Number(item.id) === Number(activeCategoryId)) || null;
  }, [categories, activeCategoryId]);

  const filteredSubcategories = useMemo(() => {
    return subcategories.filter(
      (item) => Number(item.category_id) === Number(activeCategoryId)
    );
  }, [subcategories, activeCategoryId]);

  const resetCategoryForm = () => {
    setCategoryForm({
      id: null,
      name: "",
      mode: "add",
    });
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      id: null,
      name: "",
      mode: "add",
    });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    clearInfo();

    if (!categoryForm.name.trim()) {
      setInfo("error", "Category name required");
      return;
    }

    try {
      setSavingCategory(true);

      const isEdit = categoryForm.mode === "edit" && categoryForm.id;
      const url = isEdit ? `${API_CATEGORY}/${categoryForm.id}` : API_CATEGORY;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryForm.name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save category");
      }

      await loadAllData();
      resetCategoryForm();

      if (!isEdit && data?.data?.id) {
        setActiveCategoryId(data.data.id);
      }

      showPopup(isEdit ? "Category updated" : "Category added");
    } catch (error) {
      console.error(error);
      setInfo("error", error.message || "Failed to save category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      mode: "edit",
    });
    clearInfo();
  };

  const handleDeleteCategory = async (id) => {
    const ok = window.confirm("Delete category?");
    if (!ok) return;

    clearInfo();

    try {
      setSavingCategory(true);

      const res = await fetch(`${API_CATEGORY}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete category");
      }

      await loadAllData();
      resetCategoryForm();
      resetSubcategoryForm();
      showPopup("Category deleted");
    } catch (error) {
      console.error(error);
      setInfo("error", error.message || "Failed to delete category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    clearInfo();

    if (!activeCategoryId) {
      setInfo("error", "Select category first");
      return;
    }

    if (!subcategoryForm.name.trim()) {
      setInfo("error", "Subcategory name required");
      return;
    }

    try {
      setSavingSubcategory(true);

      const isEdit = subcategoryForm.mode === "edit" && subcategoryForm.id;
      const url = isEdit
        ? `${API_SUBCATEGORY}/${subcategoryForm.id}`
        : API_SUBCATEGORY;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        category_id: Number(activeCategoryId),
        name: subcategoryForm.name.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save subcategory");
      }

      await loadAllData();
      resetSubcategoryForm();
      showPopup(isEdit ? "Subcategory updated" : "Subcategory added");
    } catch (error) {
      console.error(error);
      setInfo("error", error.message || "Failed to save subcategory");
    } finally {
      setSavingSubcategory(false);
    }
  };

  const handleEditSubcategory = (subcategory) => {
    setSubcategoryForm({
      id: subcategory.id,
      name: subcategory.name,
      mode: "edit",
    });
    clearInfo();
  };

  const handleDeleteSubcategory = async (id) => {
    const ok = window.confirm("Delete subcategory?");
    if (!ok) return;

    clearInfo();

    try {
      setSavingSubcategory(true);

      const res = await fetch(`${API_SUBCATEGORY}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete subcategory");
      }

      await loadAllData();
      resetSubcategoryForm();
      showPopup("Subcategory deleted");
    } catch (error) {
      console.error(error);
      setInfo("error", error.message || "Failed to delete subcategory");
    } finally {
      setSavingSubcategory(false);
    }
  };

  return (
    <>
      <style>{`
        *{
          box-sizing:border-box;
        }

        html,body,#root{
          margin:0;
          padding:0;
          width:100%;
          min-height:100%;
          font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:#f5f7fb;
        }

        .tcs-page{
          min-height:100vh;
          width:100%;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.08), transparent 22%),
            radial-gradient(circle at top right, rgba(16,185,129,.08), transparent 20%),
            linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%);
          color:#111827;
        }

        .tcs-header{
          position:sticky;
          top:0;
          z-index:30;
          width:100%;
          padding:14px 12px;
          background:rgba(255,255,255,.86);
          backdrop-filter:blur(14px);
          border-bottom:1px solid rgba(17,24,39,.05);
          box-shadow:0 8px 24px rgba(17,24,39,.04);
        }

        .tcs-title{
          margin:0;
          text-align:center;
          font-size:1rem;
          font-weight:900;
          color:#0f172a;
          letter-spacing:.2px;
        }

        .tcs-shell{
          width:100%;
          padding:0;
        }

        .tcs-container{
          width:100%;
          display:grid;
          gap:10px;
          padding:10px;
        }

        .tcs-card{
          width:100%;
          background:rgba(255,255,255,.96);
          border:1px solid rgba(17,24,39,.05);
          border-radius:18px;
          padding:12px;
          box-shadow:0 10px 24px rgba(15,23,42,.05);
        }

        .tcs-card.full{
          grid-column:1 / -1;
        }

        .tcs-topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          margin-bottom:10px;
          flex-wrap:wrap;
        }

        .tcs-card-title{
          margin:0;
          font-size:.95rem;
          font-weight:900;
          color:#0f172a;
        }

        .tcs-mini{
          font-size:.72rem;
          color:#64748b;
          font-weight:800;
        }

        .tcs-alert{
          padding:10px 12px;
          border-radius:14px;
          font-size:.82rem;
          font-weight:800;
        }

        .tcs-alert.error{
          background:#fef2f2;
          border:1px solid #fecaca;
          color:#b91c1c;
        }

        .tcs-alert.info{
          background:#eff6ff;
          border:1px solid #bfdbfe;
          color:#1d4ed8;
        }

        .tcs-form{
          display:grid;
          gap:8px;
        }

        .tcs-input{
          width:100%;
          min-height:44px;
          border-radius:14px;
          border:1px solid #dbe3ee;
          background:#fff;
          outline:none;
          padding:0 12px;
          font-size:.9rem;
          font-weight:700;
          color:#0f172a;
          transition:border-color .16s ease, box-shadow .16s ease;
        }

        .tcs-input:focus{
          border-color:#93c5fd;
          box-shadow:0 0 0 4px rgba(37,99,235,.07);
        }

        .tcs-btn-row{
          display:flex;
          gap:8px;
        }

        .tcs-btn{
          min-height:36px;
          padding:0 12px;
          border:none;
          border-radius:12px;
          font-size:.8rem;
          font-weight:900;
          cursor:pointer;
          transition:transform .14s ease, box-shadow .14s ease, opacity .14s ease;
        }

        .tcs-btn:active{
          transform:scale(.97);
        }

        .tcs-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
        }

        .tcs-btn.primary{
          color:#fff;
          background:linear-gradient(135deg,#111827,#2563eb);
          box-shadow:0 10px 18px rgba(37,99,235,.16);
        }

        .tcs-btn.secondary{
          color:#0f172a;
          background:#eef2f7;
          border:1px solid #dbe3ee;
        }

        .tcs-toggle-wrap{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }

        .tcs-toggle{
          min-height:34px;
          padding:6px 12px;
          border:none;
          border-radius:999px;
          background:#fff;
          border:1px solid #dbe3ee;
          color:#334155;
          font-size:.78rem;
          font-weight:900;
          cursor:pointer;
          box-shadow:0 4px 10px rgba(15,23,42,.04);
          transition:all .16s ease;
        }

        .tcs-toggle:hover{
          transform:translateY(-1px);
        }

        .tcs-toggle:active{
          transform:scale(.97);
        }

        .tcs-toggle.active{
          background:linear-gradient(135deg,#111827,#1d4ed8);
          color:#fff;
          border-color:#1d4ed8;
          box-shadow:0 10px 18px rgba(29,78,216,.18);
        }

        .tcs-list{
          display:grid;
          gap:8px;
          margin-top:10px;
        }

        .tcs-item{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:10px 12px;
          border-radius:16px;
          background:
            linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,1));
          border:1px solid #e7edf4;
          box-shadow:0 6px 16px rgba(15,23,42,.04);
          transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }

        .tcs-item:hover{
          transform:translateY(-1px);
          box-shadow:0 10px 18px rgba(15,23,42,.06);
        }

        .tcs-item.selected{
          border-color:#93c5fd;
          box-shadow:
            0 10px 22px rgba(37,99,235,.10),
            inset 0 0 0 1px rgba(37,99,235,.18);
          background:
            linear-gradient(180deg, rgba(239,246,255,1), rgba(248,250,252,1));
        }

        .tcs-item-left{
          min-width:0;
          display:flex;
          align-items:center;
          gap:10px;
          flex:1;
        }

        .tcs-dot{
          width:10px;
          height:10px;
          border-radius:999px;
          background:linear-gradient(135deg,#2563eb,#14b8a6);
          flex-shrink:0;
          box-shadow:0 0 0 4px rgba(37,99,235,.10);
        }

        .tcs-item-text{
          min-width:0;
          display:flex;
          flex-direction:column;
          gap:2px;
        }

        .tcs-item-title{
          font-size:.88rem;
          font-weight:900;
          color:#111827;
          word-break:break-word;
          line-height:1.2;
        }

        .tcs-item-sub{
          font-size:.72rem;
          font-weight:800;
          color:#64748b;
          word-break:break-word;
        }

        .tcs-item-actions{
          display:flex;
          gap:6px;
          flex-shrink:0;
        }

        .tcs-action{
          min-width:58px;
          min-height:30px;
          padding:0 10px;
          border:none;
          border-radius:10px;
          font-size:.74rem;
          font-weight:900;
          cursor:pointer;
          transition:transform .14s ease, opacity .14s ease;
        }

        .tcs-action:active{
          transform:scale(.96);
        }

        .tcs-action.edit{
          background:#eff6ff;
          color:#1d4ed8;
          border:1px solid #bfdbfe;
        }

        .tcs-action.delete{
          background:#fef2f2;
          color:#dc2626;
          border:1px solid #fecaca;
        }

        .tcs-empty{
          text-align:center;
          padding:14px 10px;
          border-radius:14px;
          background:#f8fafc;
          border:1px dashed #d7dee8;
          color:#64748b;
          font-size:.82rem;
          font-weight:800;
        }

        .tcs-selected-bar{
          width:100%;
          margin-top:8px;
          padding:10px 12px;
          border-radius:14px;
          background:linear-gradient(135deg,#111827,#1e293b);
          color:#fff;
          box-shadow:0 12px 22px rgba(17,24,39,.16);
        }

        .tcs-selected-name{
          font-size:.88rem;
          font-weight:900;
          line-height:1.2;
        }

        .tcs-selected-sub{
          font-size:.72rem;
          font-weight:700;
          opacity:.82;
          margin-top:2px;
        }

        .tcs-popup{
          position:fixed;
          inset:0;
          z-index:100;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          background:rgba(15,23,42,.16);
          backdrop-filter:blur(5px);
        }

        .tcs-popup-box{
          min-width:220px;
          max-width:90vw;
          background:#fff;
          border-radius:20px;
          padding:18px 16px;
          text-align:center;
          box-shadow:0 24px 60px rgba(15,23,42,.20);
          border:1px solid rgba(17,24,39,.06);
          animation:tcsPop .22s ease;
        }

        .tcs-popup-icon{
          width:46px;
          height:46px;
          border-radius:999px;
          margin:0 auto 10px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:linear-gradient(135deg,#14b8a6,#0f766e);
          color:#fff;
          font-size:1.1rem;
          font-weight:900;
        }

        .tcs-popup-title{
          margin:0;
          font-size:.92rem;
          font-weight:900;
          color:#111827;
        }

        @keyframes tcsPop{
          from{
            opacity:0;
            transform:scale(.9) translateY(8px);
          }
          to{
            opacity:1;
            transform:scale(1) translateY(0);
          }
        }

        @media (min-width: 768px){
          .tcs-container{
            grid-template-columns:1fr 1fr;
            gap:12px;
            padding:12px;
          }

          .tcs-card.full{
            grid-column:1 / -1;
          }

          .tcs-title{
            font-size:1.1rem;
          }
        }

        @media (min-width: 1200px){
          .tcs-container{
            max-width:1500px;
            margin:0 auto;
            grid-template-columns:1fr 1fr;
            padding:14px;
          }
        }
      `}</style>

      <div className="tcs-page">
        <header className="tcs-header">
          <h1 className="tcs-title">Tag CatSub Manage</h1>
        </header>

        <main className="tcs-shell">
          <div className="tcs-container">
            {message.text && (
              <section className="tcs-card full">
                <div className={`tcs-alert ${message.type === "error" ? "error" : "info"}`}>
                  {message.text}
                </div>
              </section>
            )}

            {loading && (
              <section className="tcs-card full">
                <div className="tcs-alert info">Loading...</div>
              </section>
            )}

            <section className="tcs-card">
              <div className="tcs-topbar">
                <h2 className="tcs-card-title">Category</h2>
                <span className="tcs-mini">
                  {categoryForm.mode === "edit" ? "Edit" : "Add"}
                </span>
              </div>

              <form className="tcs-form" onSubmit={handleCategorySubmit}>
                <input
                  className="tcs-input"
                  type="text"
                  placeholder="Category name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />

                <div className="tcs-btn-row">
                  <button
                    className="tcs-btn primary"
                    type="submit"
                    disabled={savingCategory}
                  >
                    {savingCategory
                      ? "Saving..."
                      : categoryForm.mode === "edit"
                      ? "Update"
                      : "Add"}
                  </button>

                  <button
                    className="tcs-btn secondary"
                    type="button"
                    onClick={resetCategoryForm}
                    disabled={savingCategory}
                  >
                    Reset
                  </button>
                </div>
              </form>

              <div className="tcs-list">
                {categories.length === 0 ? (
                  <div className="tcs-empty">No category</div>
                ) : (
                  categories.map((category) => (
                    <div
                      className={`tcs-item ${
                        Number(activeCategoryId) === Number(category.id) ? "selected" : ""
                      }`}
                      key={category.id}
                    >
                      <div
                        className="tcs-item-left"
                        onClick={() => {
                          setActiveCategoryId(category.id);
                          resetSubcategoryForm();
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="tcs-dot" />
                        <div className="tcs-item-text">
                          <div className="tcs-item-title">{category.name}</div>
                          <div className="tcs-item-sub">ID {category.id}</div>
                        </div>
                      </div>

                      <div className="tcs-item-actions">
                        <button
                          className="tcs-action edit"
                          type="button"
                          onClick={() => {
                            setActiveCategoryId(category.id);
                            handleEditCategory(category);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="tcs-action delete"
                          type="button"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="tcs-card">
              <div className="tcs-topbar">
                <h2 className="tcs-card-title">Select</h2>
                <span className="tcs-mini">Category</span>
              </div>

              <div className="tcs-toggle-wrap">
                {categories.length === 0 ? (
                  <div className="tcs-empty" style={{ width: "100%" }}>
                    Add category first
                  </div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`tcs-toggle ${
                        Number(activeCategoryId) === Number(category.id) ? "active" : ""
                      }`}
                      onClick={() => {
                        setActiveCategoryId(category.id);
                        resetSubcategoryForm();
                      }}
                    >
                      {category.name}
                    </button>
                  ))
                )}
              </div>

              <div className="tcs-selected-bar">
                <div className="tcs-selected-name">
                  {selectedCategory ? selectedCategory.name : "No category selected"}
                </div>
                <div className="tcs-selected-sub">
                  {selectedCategory ? `Selected ID ${selectedCategory.id}` : "Select one category"}
                </div>
              </div>
            </section>

            <section className="tcs-card full">
              <div className="tcs-topbar">
                <h2 className="tcs-card-title">Subcategory</h2>
                <span className="tcs-mini">
                  {subcategoryForm.mode === "edit" ? "Edit" : "Add"}
                </span>
              </div>

              <form className="tcs-form" onSubmit={handleSubcategorySubmit}>
                <input
                  className="tcs-input"
                  type="text"
                  placeholder={activeCategoryId ? "Subcategory name" : "Select category first"}
                  value={subcategoryForm.name}
                  onChange={(e) =>
                    setSubcategoryForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  disabled={!activeCategoryId}
                />

                <div className="tcs-btn-row">
                  <button
                    className="tcs-btn primary"
                    type="submit"
                    disabled={savingSubcategory || !activeCategoryId}
                  >
                    {savingSubcategory
                      ? "Saving..."
                      : subcategoryForm.mode === "edit"
                      ? "Update"
                      : "Add"}
                  </button>

                  <button
                    className="tcs-btn secondary"
                    type="button"
                    onClick={resetSubcategoryForm}
                    disabled={savingSubcategory}
                  >
                    Reset
                  </button>
                </div>
              </form>

              <div className="tcs-list">
                {!activeCategoryId ? (
                  <div className="tcs-empty">Select category</div>
                ) : filteredSubcategories.length === 0 ? (
                  <div className="tcs-empty">No subcategory</div>
                ) : (
                  filteredSubcategories.map((subcategory) => (
                    <div className="tcs-item selected" key={subcategory.id}>
                      <div className="tcs-item-left">
                        <div className="tcs-dot" />
                        <div className="tcs-item-text">
                          <div className="tcs-item-title">{subcategory.name}</div>
                          <div className="tcs-item-sub">ID {subcategory.id}</div>
                        </div>
                      </div>

                      <div className="tcs-item-actions">
                        <button
                          className="tcs-action edit"
                          type="button"
                          onClick={() => handleEditSubcategory(subcategory)}
                        >
                          Edit
                        </button>
                        <button
                          className="tcs-action delete"
                          type="button"
                          onClick={() => handleDeleteSubcategory(subcategory.id)}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>

        {popup && (
          <div className="tcs-popup">
            <div className="tcs-popup-box">
              <div className="tcs-popup-icon">✓</div>
              <h3 className="tcs-popup-title">{popup}</h3>
            </div>
          </div>
        )}
      </div>
    </>
  );
}