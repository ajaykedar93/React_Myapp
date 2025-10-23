import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import LoadingSpiner from "./LoadingSpiner";

/* ================= CONFIG ================= */
const BASE_URL   = "https://express-myapp.onrender.com/api/favorites";
const SEARCH_URL = `${BASE_URL}/search`;
const WATCH_URL  = `${BASE_URL}/watch-filter`;
const CAT_URL    = `${BASE_URL}/category-filter`;
const ADD_URL    = `${BASE_URL}/add-and-fetch-category`;
const BUCKET_URL = `${BASE_URL}/bucket`;
const SHARE_URL  = `${BASE_URL}/share-bucket-pdf`;
const REMOVE_URL = `${BASE_URL}/favorites/remove`; // this matches your backend

const FAVORITE_CATEGORIES = [
  "Korean Top Favorite Series","Hollywood Top Series","Bollywood Top Series",
  "Anime Top Series","Comedy Series","Drama Series","Action Series",
  "Thriller Series","Sci-Fi Series","Fantasy Series","Mystery Series",
  "Romantic Series","Documentary Series","Superhero Series","Crime Series",
  "Top Movies","Action Movies","Romantic Movies","Horror Movies","Comedy Movies",
  "Sci-Fi Movies","Thriller Movies","Drama Movies","Animated Movies","Fantasy Movies",
  "Superhero Movies","Adventure Movies","Documentary Movies","Crime Movies","Classic Movies",
  "Blockbuster Movies","Award-Winning Movies","Family Movies"
];

const DEMO_USER_ID = 6;
const debounce = (fn, ms=400)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

/* ================= COMPONENT ================= */
const Favorite = () => {
  const { user } = useAuth();
  const AUTH_USER_ID = user?.user_id ?? DEMO_USER_ID;

  // Tabs
  const [activeTab, setActiveTab] = useState("discover");

  // Discover
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ movies: [], series: [], count: 0, raw: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  const [categoryInput, setCategoryInput] = useState("");
  const [categoryData, setCategoryData] = useState({ category: null, counts: null, movies: [], series: [] });
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [watchFilter, setWatchFilter] = useState("all");
  const [watchData, setWatchData] = useState({ counts: null, movies: [], series: [] });
  const [watchLoading, setWatchLoading] = useState(false);

  // Selection & add
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(FAVORITE_CATEGORIES[0]);
  const [adding, setAdding] = useState(false);
  const [addingProgress, setAddingProgress] = useState({ done: 0, total: 0 });

  // Favorites tab
  const [favBucket, setFavBucket] = useState("");
  const [favCache, setFavCache] = useState({});
  const [favLoading, setFavLoading] = useState(false);
  const PAGE_SIZE = 10;
  const [favPageMovies, setFavPageMovies] = useState(0);
  const [favPageSeries, setFavPageSeries] = useState(0);

  // Share (overlayless sheets)
  const [shareEmail, setShareEmail] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const [shareSuccessOpen, setShareSuccessOpen] = useState(false);

  // Toast (tiny center card)
  const [toast, setToast] = useState({ open:false, title:"", message:"", tone:"info" });

  /* =============== STYLES =============== */
  const styles = `
    :root{
      --bg:#f8fafc; --card:#fff; --text:#0f172a; --muted:#475569; --border:#e2e8f0; --border-strong:#d0d7e2;
      --accent:#2563eb; --accent2:#7c3aed; --green:#10b981; --amber:#f59e0b; --danger:#ef4444;
      --shadow:0 10px 24px rgba(15,23,42,.08); --shadow-hover:0 14px 32px rgba(15,23,42,.12);
      --pill-bg:#eef2ff; --pill-text:#4338ca; --chip-bg:#f0f9ff; --chip-text:#0369a1;
      --item-hover:#f8fafc; --sticky-bg:rgba(255,255,255,.9);
    }
    .fav-container{ padding:24px; background:var(--bg); min-height:100vh; color:var(--text); }

    /* Tabs */
    .tabs{ display:flex; gap:10px; border-bottom:2px solid var(--border); margin-bottom:16px; }
    .tab-btn{ border:0; background:transparent; color:var(--muted); padding:10px 16px; border-radius:10px 10px 0 0; font-weight:700; transition:.2s; }
    .tab-btn:hover{ background:#e0f2fe; color:var(--text); transform:translateY(-1px); }
    .tab-btn.active{ background:#bae6fd; color:var(--text); box-shadow: inset 0 -2px 0 var(--accent); }

    /* Card */
    .cardish{ background:var(--card); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); overflow:hidden; }
    .cardish:hover{ box-shadow:var(--shadow-hover); }
    .cardish .header{ padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; background:#fbfdff; }
    .cardish .body{ padding:16px 20px; }

    .tag{ background:var(--chip-bg); border:1px solid #c6e6ff; color:var(--chip-text); border-radius:9999px; padding:6px 10px; font-size:12px; font-weight:700; }
    .pill{ background:var(--pill-bg); color:var(--pill-text); border:1px solid #c7d2fe; border-radius:9999px; padding:4px 10px; font-size:12px; font-weight:700; }

    input[type="email"], input[type="text"], select{ background:#fff; border:1px solid var(--border-strong); color:var(--text); border-radius:10px; padding:10px 12px; outline:none; transition:.2s; }
    input[type="email"]:focus, input[type="text"]:focus, select:focus{ border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,.2); }
    input[type="checkbox"]{ width:18px; height:18px; }
    input[type="checkbox"]:checked{ accent-color:var(--danger); }

    .list-grid{ display:grid; grid-template-columns:repeat(1,1fr); gap:12px; }
    @media (min-width:768px){ .list-grid{ grid-template-columns:repeat(2,1fr); } }
    @media (min-width:1200px){ .list-grid{ grid-template-columns:repeat(3,1fr); } }

    .item{ display:flex; align-items:flex-start; gap:12px; background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; transition:.15s; }
    .item:hover{ transform:translateY(-2px); box-shadow:var(--shadow-hover); background:var(--item-hover); border-color:#cbd5e1; }
    .item h6{ margin:0; font-size:15px; font-weight:800; color:var(--text); }
    .item small{ color:var(--muted); display:block; }
    .item .right{ margin-left:auto; text-align:right; display:flex; gap:6px; }

    .btn{ border:0; border-radius:10px; padding:10px 14px; font-weight:800; transition:.2s; color:#fff; }
    .btn:disabled{ opacity:.6; cursor:not-allowed; }
    .btn:hover{ transform:translateY(-1px); filter:brightness(1.05); }
    .btn-blue{ background:linear-gradient(90deg,#2563eb,#3b82f6); box-shadow:0 6px 16px rgba(37,99,235,.25); }
    .btn-violet{ background:linear-gradient(90deg,#7c3aed,#8b5cf6); box-shadow:0 6px 16px rgba(124,58,237,.25); }
    .btn-green{ background:linear-gradient(90deg,#10b981,#22c55e); box-shadow:0 6px 16px rgba(16,185,129,.25); }
    .btn-amber{ background:linear-gradient(90deg,#f59e0b,#fbbf24); box-shadow:0 6px 16px rgba(245,158,11,.25); }
    .btn-gray{ background:#fff; color:var(--text); border:1px solid var(--border-strong); }
    .btn-gray:hover{ background:#f8fafc; }

    .btn-danger{ background:linear-gradient(90deg,#ef4444,#f87171); box-shadow:0 6px 16px rgba(239,68,68,.25); }

    .section-title{ font-size:16px; font-weight:900; margin-bottom:8px; color:var(--text); }
    .divider{ height:1px; background:var(--border); margin:12px 0; }
    .big-title{ font-weight:900; font-size:28px; color:#111827; background:#fff; padding:14px 16px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow); }

    .sticky-actions{ position:sticky; bottom:0; background:var(--sticky-bg); backdrop-filter:blur(6px); border-top:1px solid var(--border); padding:10px;
      border-bottom-left-radius:14px; border-bottom-right-radius:14px; display:flex; gap:10px; align-items:center; justify-content:space-between; }

    /* Centered sheet (NO overlay) */
    .sheet-wrap{ position:fixed; inset:0; z-index:60; pointer-events:none; }
    .sheet{ pointer-events:auto; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            width:100%; max-width:520px; background:#fff; border:1px solid var(--border);
            border-radius:14px; box-shadow:var(--shadow-hover); padding:18px; }
    .sheet-header{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
    .sheet-title{ font-weight:900; font-size:18px; color:var(--text); }
    .sheet-actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }

    /* Toast (NO overlay) */
    .toast-wrap{ position:fixed; inset:0; pointer-events:none; z-index:70; }
    .toast{ pointer-events:auto; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow-hover);
            padding:16px 18px; min-width:300px; max-width:520px; text-align:center; }
    .toast-title{ font-weight:900; margin-bottom:6px; }
    .toast-msg{ color:var(--muted); }
    .toast.ok .toast-title{ color:#065f46; }
    .toast.warn .toast-title{ color:#92400e; }
    .toast.err .toast-title{ color:#7f1d1d; }

    /* Sheet visual polish */
    .sheet--elevated { padding-top: 14px; padding-bottom: 14px; }
    .sheet-body { margin-top: 4px; }
    .sheet-subtitle { color: var(--muted); margin: 0 0 10px; }
    .sheet-title-row { display:flex; align-items:center; gap:10px; }
    .sheet-icon { display:inline-flex; align-items:center; justify-content:center; color: var(--accent); }
    .field { display:block; }
    .input-wrap { position:relative; }
    .input-lg { padding-right: 42px; } /* room for spinner on the right */
    .input-spinner{
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      display:inline-flex; align-items:center;
    }
    .hint { font-size: 12px; color: var(--muted); margin-top: 6px; }
    .hint.error { color: #b91c1c; }
    .input-wrap.has-error .form-control {
      border-color: #fca5a5 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, .18);
    }
    .sheet-actions--split { display:flex; justify-content: space-between; align-items:center; gap:8px; }

    /* ===== Modern red-card list ===== */
    .grid-modern{display:grid;gap:14px;grid-template-columns:repeat(1,1fr)}
    @media (min-width:768px){.grid-modern{grid-template-columns:repeat(2,1fr)}}
    @media (min-width:1200px){.grid-modern{grid-template-columns:repeat(3,1fr)}}
    .media-card{
      position:relative;background:#fff;border:2px solid #fecaca;
      border-radius:14px;padding:14px;box-shadow:0 6px 18px rgba(15,23,42,.06);
      transition:.2s
    }
    .media-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,23,42,.10);border-color:#ef4444}
    .media-title{font-weight:900;font-size:16px;color:#111827;margin:0 0 4px}
    .media-sub{color:#64748b;font-size:12px}
    .media-meta{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
    .badge{
      background:#fee2e2;color:#7f1d1d;border:1px solid #fecaca;
      padding:4px 10px;border-radius:9999px;font-weight:800;font-size:11px
    }
    .badge-gray{background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}
    .badge-type{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .card-actions{display:flex;gap:8px;align-items:center;margin-left:auto}

    /* ===== Discover: modern header & input adornments ===== */
    .search-header{
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 20px;
      background:linear-gradient(180deg,#ffffff 0%, #fbfdff 100%);
      border-bottom:1px solid var(--border);
    }
    .search-header .lhs{ display:flex; align-items:center; gap:10px; }
    .search-header .rhs{ display:flex; align-items:center; gap:10px; }
    .count-chip{
      background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe;
      padding:4px 10px; border-radius:9999px; font-weight:800; font-size:12px;
    }

    .input-adorned{ position:relative; }
    .input-icon-left{
      position:absolute; left:10px; top:50%; transform:translateY(-50%);
      display:inline-flex; align-items:center; pointer-events:none; color:#64748b;
    }
    .input-adorned .form-control{
      padding-left:38px; transition:border .15s ease, box-shadow .15s ease, transform .05s ease;
    }
    .input-adorned .form-control:focus{ transform:translateY(-1px); }
    .input-clear{
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      border:0; background:#f1f5f9; color:#334155; border:1px solid #e2e8f0;
      border-radius:9999px; padding:4px 8px; font-weight:800; font-size:11px;
    }
    .input-clear:hover{ background:#e2e8f0; }
  `;

  /* =============== Helpers =============== */
  const splitSearchResults = (raw)=>{
    const movies=[], series=[];
    raw.forEach(r => (r.type==="movie"?movies:series).push(r));
    return { movies, series, count: raw.length, raw };
  };

  const showToast = (title, message, tone="info")=>{
    setToast({ open:true, title, message, tone });
    setTimeout(()=> setToast(t => ({...t, open:false})), 1800);
  };

  const addOrRemoveSelected = (checked, item)=>{
    if (adding) return;
    setSelectedItems(prev=>{
      if (checked){
        if (prev.some(p=>p.type===item.type && p.id===item.id)) return prev;
        return [...prev, item];
      }
      return prev.filter(p=> !(p.type===item.type && p.id===item.id));
    });
  };

  /* =============== API • Discover =============== */
  const doSearch = useMemo(()=> debounce(async(q)=>{
    if (!q?.trim()){ setSearchResults({ movies:[], series:[], count:0, raw:[] }); return; }
    try{
      setSearchLoading(true);
      const { data } = await axios.get(SEARCH_URL, { params:{ q, limit:30, offset:0 }});
      setSearchResults(splitSearchResults(data.results || []));
    }finally{ setSearchLoading(false); }
  }, 450), []);
  useEffect(()=>{ doSearch(searchQuery); }, [searchQuery, doSearch]);

  const fetchCategory = async ()=>{
    if (!categoryInput?.trim()) return;
    try{
      setCategoryLoading(true);
      const { data } = await axios.get(CAT_URL, { params:{ category: categoryInput, limitMovies:12, limitSeries:12 }});
      setCategoryData(data || { category:null, counts:null, movies:[], series:[] });
    }catch(e){
      showToast("Category Error","Failed to load category.","err");
    }finally{ setCategoryLoading(false); }
  };

  const fetchWatch = useMemo(()=> debounce(async(watched)=>{
    try{
      setWatchLoading(true);
      const { data } = await axios.get(WATCH_URL, { params:{ watched, limit:18, offset:0 }});
      setWatchData(data || { counts:null, movies:[], series:[] });
    }catch(e){
      showToast("Filter Error","Failed to load watch filter.","err");
    }finally{ setWatchLoading(false); }
  }, 350), []);
  useEffect(()=>{ fetchWatch(watchFilter); }, [watchFilter, fetchWatch]);

  /* =============== API • Add to bucket =============== */
  const addSelectedToFavoriteCategory = async ()=>{
    if (!selectedItems.length){ showToast("Nothing selected","Select at least one item.","warn"); return; }
    try{
      setAdding(true);
      setAddingProgress({ done:0, total:selectedItems.length });

      let lastBucketPayload=null;
      for (let i=0;i<selectedItems.length;i++){
        const it = selectedItems[i];
        const payload = {
          user_id: AUTH_USER_ID,
          item_type: it.type,
          item_id: it.id,
          category_id: it.category_id,
          subcategory_id: it.subcategory_id ?? null,
          year: it.release_year || it.year || new Date().getFullYear(),
          name: it.title,
          poster_url: it.poster_url || null,
          is_watched: !!it.is_watched,
          favorite_category: selectedBucket,
        };
        const { data } = await axios.post(ADD_URL, payload);
        lastBucketPayload = data;
        setAddingProgress({ done:i+1, total:selectedItems.length });
      }

      if (lastBucketPayload?.favorite_category){
        setFavCache(p => ({...p, [lastBucketPayload.favorite_category]: lastBucketPayload}));
        setFavBucket(lastBucketPayload.favorite_category);
        setActiveTab("favorites");
        setFavPageMovies(0); setFavPageSeries(0);
      }
      setSelectedItems([]);
      showToast("Added!","Items were added to your favorites.","ok");
    }catch(e){
      showToast("Add Failed","Could not add to favorites.","err");
    }finally{
      setAdding(false);
      setAddingProgress({ done:0, total:0 });
    }
  };

  /* =============== API • Load bucket (Tab 2 select) =============== */
  const fetchBucket = async (bucketName)=>{
    if (!bucketName) return;
    if (favCache[bucketName]) return;
    try{
      setFavLoading(true);
      const { data } = await axios.get(BUCKET_URL, { params:{ user_id: AUTH_USER_ID, favorite_category: bucketName }});
      setFavCache(p => ({...p, [bucketName]: data || { movies:[], series:[], counts:{ movies:0, series:0, total:0 }}}));
    }catch(e){
      showToast("Load Failed","Could not load this bucket.","err");
    }finally{ setFavLoading(false); }
  };

  /* =============== API • Remove favorite (optimistic) =============== */
  const removeFavorite = async (favorite_id)=>{
    if (!favorite_id) return;
    setFavCache(cache=>{
      if (!favBucket || !cache[favBucket]) return cache;
      const curr = cache[favBucket];
      const movies = curr.movies.filter(x=>x.favorite_id !== favorite_id);
      const series = curr.series.filter(x=>x.favorite_id !== favorite_id);
      const counts = { movies: movies.length, series: series.length, total: movies.length + series.length };
      return { ...cache, [favBucket]: { ...curr, movies, series, counts } };
    });
    try{
      await axios.post(REMOVE_URL, { user_id: AUTH_USER_ID, favorite_id });
      showToast("Removed","Item deleted from bucket.","ok");
    }catch(e){
      showToast("Remove Failed","Could not delete item.","err");
      fetchBucket(favBucket);
    }
  };

  /* =============== Render helpers =============== */
  const GenreChips = ({ list }) => !list?.length ? null : (
    <div style={{ marginTop:6 }}>
      {list.map((g,i)=>(<span key={i} className="pill" style={{borderColor:"#a5f3fc", color:"#155e75"}}>{g}</span>))}
    </div>
  );

  const SubLine = ({ item, label })=>{
    const line1 = `${item.release_year ? `Year: ${item.release_year} • ` : ""}${item.category_name||""}${item.subcategory_name?` • ${item.subcategory_name}`:""}`;
    const extra = label==="movie" ? item.parts : item.seasons;
    return (
      <>
        <small className="muted">{line1}</small>
        {extra?.length ? <small className="muted"><br/>{label==="movie"?"Parts: ":"Seasons: "}{extra.join(", ")}</small> : null}
        {item.genres?.length ? <GenreChips list={item.genres}/> : null}
      </>
    );
  };

  const ResultList = ({ items, label })=>(
    <div className="list-grid">
      {items.map(r=>{
        const checked = selectedItems.some(p=>p.type===label && p.id===r.id);
        return (
          <div className="item" key={`${label}-${r.id}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled={adding}
              onChange={e=> addOrRemoveSelected(e.target.checked, {
                type:label, id:r.id, title:r.title, year:r.release_year,
                category_id:r.category_id, subcategory_id:r.subcategory_id,
                poster_url:r.poster_url, is_watched:r.is_watched
              })}
            />
            <div>
              <h6>{r.title}</h6>
              <SubLine item={r} label={label}/>
            </div>
            <div className="right"><span className="pill">{label==="movie"?"Movie":"Series"}</span></div>
          </div>
        );
      })}
    </div>
  );

  const bucketData = (favBucket && favCache[favBucket]) || { movies:[], series:[], counts:{ movies:0, series:0, total:0 } };
  const moviesPageSlice = bucketData.movies.slice(favPageMovies*PAGE_SIZE, favPageMovies*PAGE_SIZE+PAGE_SIZE);
  const seriesPageSlice = bucketData.series.slice(favPageSeries*PAGE_SIZE, favPageSeries*PAGE_SIZE+PAGE_SIZE);
  const selectionCount = selectedItems.length;

  /* =============== JSX =============== */
  return (
    <div className="container fav-container">
      <style>{styles}</style>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab==="discover"?"active":""}`} onClick={()=>setActiveTab("discover")}>Discover</button>
        <button className={`tab-btn ${activeTab==="favorites"?"active":""}`} onClick={()=>setActiveTab("favorites")}>Favorites</button>
      </div>

      {/* ========== TAB: DISCOVER (polished) ========== */}
      {activeTab==="discover" && (
        <div className="row g-4">
          {/* Search */}
          <div className="col-12">
            <div className="cardish">
              <div className="search-header">
                <div className="lhs">
                  <span className="title">Search</span>
                  <span className="tag">Live</span>
                </div>
                <div className="rhs">
                  <span className="count-chip">Results: {searchResults.count}</span>
                  {searchLoading && (
                    <span aria-live="polite" aria-label="Loading results"><LoadingSpiner/></span>
                  )}
                </div>
              </div>

              <div className="body">
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-8">
                    <div className="input-adorned">
                      <span className="input-icon-left" aria-hidden="true">
                        {/* magnifier */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/>
                          <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <input
                        className="form-control"
                        placeholder="Search any movie or series…"
                        value={searchQuery}
                        onChange={e=>setSearchQuery(e.target.value)}
                        onKeyDown={(e)=>{ if (e.key==='Escape') setSearchQuery(''); }}
                      />
                      {searchQuery && (
                        <button className="input-clear" onClick={()=>setSearchQuery('')} aria-label="Clear search">Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="col-12 col-md-4 text-md-end">
                    <span className="muted">Try: “Action 2019”, “Sci-Fi”, “Korean”</span>
                  </div>
                </div>

                <div className="divider"/>
                {!!searchResults.movies.length && (<><div className="section-title">Movies</div><ResultList items={searchResults.movies} label="movie"/></>)}
                {!!searchResults.series.length && (<><div className="section-title mt-3">Series</div><ResultList items={searchResults.series} label="series"/></>)}
                {!searchLoading && searchResults.count===0 && (<div className="muted">Start typing above to search…</div>)}
              </div>

              <div className="sticky-actions">
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <span className="muted">Add to bucket:</span>
                  <select className="form-select" value={selectedBucket} onChange={e=>setSelectedBucket(e.target.value)} style={{maxWidth:320}}>
                    {FAVORITE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  {selectionCount>0 && <span className="pill">{selectionCount} selected</span>}
                </div>
                <button className="btn btn-blue" disabled={adding || !selectionCount} onClick={addSelectedToFavoriteCategory}>
                  {adding ? (<><LoadingSpiner/>&nbsp;Adding {addingProgress.done}/{addingProgress.total}</>) : `Add Selected (${selectionCount})`}
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-12">
            <div className="cardish">
              <div className="header">
                <span className="title">Filter by Category</span>
                <span className="subtitle ms-auto">{categoryLoading ? <LoadingSpiner/> : ""}</span>
              </div>
              <div className="body">
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <input className="form-control" placeholder="Type Category Name or ID (e.g., Action Movies or 17)" value={categoryInput} onChange={e=>setCategoryInput(e.target.value)}/>
                  </div>
                  <div className="col-12 col-md-6">
                    <button className="btn btn-gray w-100 w-md-auto" onClick={fetchCategory} disabled={categoryLoading}>
                      {categoryLoading ? <LoadingSpiner/> : "Apply"}
                    </button>
                  </div>
                </div>

                {!!categoryData?.category && (
                  <>
                    <div className="divider"/>
                    <div className="d-flex flex-wrap align-items-center" style={{gap:8}}>
                      <span className="pill">Category: {categoryData.category.name}</span>
                      <span className="pill">Movies: {categoryData.counts?.movies ?? 0}</span>
                      <span className="pill">Series: {categoryData.counts?.series ?? 0}</span>
                      <span className="pill">Total: {categoryData.counts?.overall ?? 0}</span>
                    </div>
                    {!!categoryData.movies?.length && (<><div className="section-title mt-3">Movies</div><ResultList items={categoryData.movies} label="movie"/></>)}
                    {!!categoryData.series?.length && (<><div className="section-title mt-3">Series</div><ResultList items={categoryData.series} label="series"/></>)}
                    {!categoryLoading && !categoryData.movies?.length && !categoryData.series?.length && (<div className="muted mt-2">No items in this category.</div>)}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Watch Filter */}
          <div className="col-12">
            <div className="cardish">
              <div className="header">
                <span className="title">Watch Filter</span>
                <span className="subtitle ms-auto">{watchLoading ? <LoadingSpiner/> : ""}</span>
              </div>
              <div className="body">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <select className="form-select" value={watchFilter} onChange={e=>setWatchFilter(e.target.value)} style={{maxWidth:200}} disabled={watchLoading}>
                    <option value="all">All</option><option value="yes">Watched</option><option value="no">Not Watched</option>
                  </select>
                  {watchData?.counts && (
                    <div className="d-flex flex-wrap gap-2">
                      <span className="pill">Movies: {watchData.counts.movies.total} (✓ {watchData.counts.movies.watched} / ✗ {watchData.counts.movies.not_watched})</span>
                      <span className="pill">Series: {watchData.counts.series.total} (✓ {watchData.counts.series.watched} / ✗ {watchData.counts.series.not_watched})</span>
                    </div>
                  )}
                </div>

                <div className="divider"/>
                {!!watchData.movies?.length && (<><div className="section-title mt-2">Movies</div><ResultList items={watchData.movies} label="movie"/></>)}
                {!!watchData.series?.length && (<><div className="section-title mt-3">Series</div><ResultList items={watchData.series} label="series"/></>)}
                {!watchLoading && !watchData.movies?.length && !watchData.series?.length && (<div className="muted">No items for this filter.</div>)}
              </div>

              <div className="sticky-actions">
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <span className="muted">Add to bucket:</span>
                  <select className="form-select" value={selectedBucket} onChange={e=>setSelectedBucket(e.target.value)} style={{maxWidth:320}} disabled={adding}>
                    {FAVORITE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  {selectionCount>0 && <span className="pill">{selectionCount} selected</span>}
                </div>
                <button className="btn btn-violet" disabled={adding || !selectionCount} onClick={addSelectedToFavoriteCategory}>
                  {adding ? (<><LoadingSpiner/>&nbsp;Adding {addingProgress.done}/{addingProgress.total}</>) : `Add Selected (${selectionCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB: FAVORITES ========== */}
      {activeTab==="favorites" && (
        <div className="row g-4">
          <div className="col-12">
            <div className="cardish">
              <div className="header">
                <div className="w-100 d-flex flex-wrap gap-2 align-items-center">
                  <div className="big-title flex-grow-1 text-truncate">
                    {favBucket ? favBucket : "Pick a Favorite Bucket"}
                  </div>
                  <select
                    className="form-select"
                    value={favBucket}
                    onChange={async e=>{
                      const v=e.target.value;
                      setFavBucket(v);
                      setFavPageMovies(0);
                      setFavPageSeries(0);
                      await fetchBucket(v);
                    }}
                    style={{maxWidth:340}}
                  >
                    <option value="">Select bucket…</option>
                    {FAVORITE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn btn-amber ms-auto" onClick={()=> setShareOpen(true)} disabled={!favBucket}>
                    Share as PDF
                  </button>
                </div>
              </div>

              {!favBucket ? (
                <div className="body"><div className="muted">Choose a favorite category to see items.</div></div>
              ) : (
                <div className="body">
                  {favLoading ? (
                    <div className="d-flex align-items-center gap-2"><LoadingSpiner/> <span className="muted">Loading {favBucket}…</span></div>
                  ) : (
                    <>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        <span className="pill">Movies: {bucketData.counts?.movies ?? 0}</span>
                        <span className="pill">Series: {bucketData.counts?.series ?? 0}</span>
                        <span className="pill">Total: {bucketData.counts?.total ?? 0}</span>
                      </div>

                      {/* Movies */}
                      <div className="section-title">Movies</div>
                      {moviesPageSlice.length ? (
                        <>
                          <div className="grid-modern">
                            {moviesPageSlice.map(m=>(
                              <div className="media-card" key={`fav-m-${m.favorite_id}`}>
                                <div className="d-flex gap-2">
                                  <div className="flex-grow-1">
                                    <h6 className="media-title">{m.title}</h6>
                                    <div className="media-sub">
                                      {(m.release_year ? `Year: ${m.release_year} • ` : "")}
                                      {m.category_name || ""}{m.subcategory_name ? ` • ${m.subcategory_name}` : ""}
                                    </div>
                                    <div className="media-meta">
                                      {m.category_name ? <span className="badge">{m.category_name}</span> : null}
                                      {m.subcategory_name ? <span className="badge-gray">{m.subcategory_name}</span> : null}
                                      <span className="badge-type">Movie</span>
                                    </div>
                                  </div>
                                  <div className="card-actions">
                                    <button className="btn btn-danger" onClick={()=>removeFavorite(m.favorite_id)}>Delete</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(favPageMovies+1)*PAGE_SIZE < (bucketData.movies?.length||0) && (
                            <div className="text-center mt-3">
                              <button className="btn btn-gray" onClick={()=>setFavPageMovies(p=>p+1)}>Next</button>
                            </div>
                          )}
                        </>
                      ) : (<div className="muted">No movies in this bucket (yet).</div>)}

                      <div className="divider"/>

                      {/* Series */}
                      <div className="section-title">Series</div>
                      {seriesPageSlice.length ? (
                        <>
                          <div className="grid-modern">
                            {seriesPageSlice.map(s=>(
                              <div className="media-card" key={`fav-s-${s.favorite_id}`}>
                                <div className="d-flex gap-2">
                                  <div className="flex-grow-1">
                                    <h6 className="media-title">{s.title}</h6>
                                    <div className="media-sub">
                                      {(s.release_year ? `Year: ${s.release_year} • ` : "")}
                                      {s.category_name || ""}{s.subcategory_name ? ` • ${s.subcategory_name}` : ""}
                                    </div>
                                    <div className="media-meta">
                                      {s.category_name ? <span className="badge">{s.category_name}</span> : null}
                                      {s.subcategory_name ? <span className="badge-gray">{s.subcategory_name}</span> : null}
                                      <span className="badge-type">Series</span>
                                    </div>
                                  </div>
                                  <div className="card-actions">
                                    <button className="btn btn-danger" onClick={()=>removeFavorite(s.favorite_id)}>Delete</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(favPageSeries+1)*PAGE_SIZE < (bucketData.series?.length||0) && (
                            <div className="text-center mt-3">
                              <button className="btn btn-gray" onClick={()=>setFavPageSeries(p=>p+1)}>Next</button>
                            </div>
                          )}
                        </>
                      ) : (<div className="muted">No series in this bucket (yet).</div>)}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {!favBucket && (
            <div className="col-12">
              <div className="cardish" style={{padding:16}}>
                <div className="body">Choose a bucket above to view and share your favorites.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======= SHARE SHEET (NO OVERLAY) ======= */}
      {shareOpen && (
        <div className="sheet-wrap">
          <div
            className="sheet sheet--elevated"
            role="dialog"
            aria-modal="true"
            aria-label="Share favorites as PDF"
            aria-busy={shareSending ? "true" : "false"}
          >
            {/* Header */}
            <div className="sheet-header">
              <div className="sheet-title-row">
                <span className="sheet-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m22 8-9.2 5.75a2 2 0 0 1-2.1 0L1.5 8" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <div className="sheet-title">Share “{favBucket || "—"}” as PDF</div>
              </div>

              <button
                className="btn btn-gray"
                onClick={() => setShareOpen(false)}
                disabled={shareSending}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="sheet-body">
              <p className="sheet-subtitle">
                Send a nicely formatted PDF of your <strong>{favBucket || "—"}</strong> list to an email address.
              </p>

              <div className="field">
                <label htmlFor="share-email" className="form-label">Recipient email</label>
                <div className={`input-wrap ${shareEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail) ? "has-error" : ""}`}>
                  <input
                    id="share-email"
                    type="email"
                    className="form-control input-lg"
                    placeholder="name@example.com"
                    value={shareEmail}
                    autoFocus
                    onChange={(e) => setShareEmail(e.target.value)}
                    onKeyDown={async (e) => {
                      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail);
                      if (e.key === "Enter" && valid && favBucket && !shareSending) {
                        try {
                          setShareSending(true);
                          await axios.post(SHARE_URL, {
                            user_id: AUTH_USER_ID,
                            favorite_category: favBucket,
                            to_email: shareEmail.trim(),
                          });
                          setShareOpen(false);
                          setShareSuccessOpen(true);
                        } catch {
                          showToast("Share Failed", "Could not send PDF. Check email and try again.", "err");
                        } finally {
                          setShareSending(false);
                        }
                      }
                      if (e.key === "Escape" && !shareSending) setShareOpen(false);
                    }}
                    disabled={shareSending}
                    aria-invalid={shareEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail) ? "true" : "false"}
                  />
                  {shareSending && (
                    <span className="input-spinner" aria-hidden="true">
                      <LoadingSpiner />
                    </span>
                  )}
                </div>
                {shareEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail) && (
                  <div className="hint error">Please enter a valid email address.</div>
                )}
                <div className="hint">Press <kbd>Enter</kbd> to send, or <kbd>Esc</kbd> to close.</div>
              </div>
            </div>

            {/* Footer */}
            <div className="sheet-actions sheet-actions--split">
              <button
                className="btn btn-gray"
                onClick={() => setShareOpen(false)}
                disabled={shareSending}
              >
                Cancel
              </button>
              <button
                className="btn btn-green"
                disabled={
                  shareSending ||
                  !favBucket ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail)
                }
                onClick={async () => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail) || !favBucket) return;
                  try {
                    setShareSending(true);
                    await axios.post(SHARE_URL, {
                      user_id: AUTH_USER_ID,
                      favorite_category: favBucket,
                      to_email: shareEmail.trim(),
                    });
                    setShareOpen(false);
                    setShareSuccessOpen(true);
                  } catch {
                    showToast("Share Failed", "Could not send PDF. Check email and try again.", "err");
                  } finally {
                    setShareSending(false);
                  }
                }}
              >
                {shareSending ? <LoadingSpiner /> : "Send PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= SHARE SUCCESS SHEET (NO OVERLAY) ======= */}
      {shareSuccessOpen && (
        <div className="sheet-wrap">
          <div className="sheet" role="alertdialog" aria-label="PDF sent">
            <div className="sheet-header">
              <div className="sheet-title">Success!</div>
              <button className="btn btn-gray" onClick={()=> setShareSuccessOpen(false)}>Close</button>
            </div>
            <div className="muted">Your PDF for <strong>{favBucket}</strong> was sent to <strong>{shareEmail}</strong>.</div>
            <div className="sheet-actions">
              <button className="btn btn-blue" onClick={()=> setShareSuccessOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ======= CENTERED TOAST (NO OVERLAY) ======= */}
      {toast.open && (
        <div className="toast-wrap">
          <div className={`toast ${toast.tone==="ok"?"ok": toast.tone==="warn"?"warn": toast.tone==="err"?"err":""}`}>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-msg">{toast.message}</div>
            <div className="sheet-actions" style={{justifyContent:"center"}}>
              <button className="btn btn-amber" onClick={()=> setToast(t=>({...t, open:false}))}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorite;
