// src/pages/Favorite.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import LoadingSpiner from "./LoadingSpiner";

/* ================= CONFIG ================= */
const BASE_URL   = "https://express-backend-myapp.onrender.com/api/favorites";
const SEARCH_URL = `${BASE_URL}/search`;
const WATCH_URL  = `${BASE_URL}/watch-filter`;
const CAT_URL    = `${BASE_URL}/category-filter`;
const ADD_URL    = `${BASE_URL}/add-and-fetch-category`;
const BUCKET_URL = `${BASE_URL}/bucket`;
const SHARE_URL  = `${BASE_URL}/share-bucket-pdf`;
const REMOVE_URL = `${BASE_URL}/favorites/remove`;

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

const PAGE_SIZE = 10;

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
  const [discoverType, setDiscoverType] = useState("all"); // all | movie | series

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
  const [favType, setFavType] = useState("all"); // all | movie | series
  const [favPageMovies, setFavPageMovies] = useState(0);
  const [favPageSeries, setFavPageSeries] = useState(0);

  // Share (overlayless sheets)
  const [shareEmail, setShareEmail] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const [shareSuccessOpen, setShareSuccessOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState({ open:false, title:"", message:"", tone:"info" });

  /* =================== FLUID, MOBILE-FIRST STYLES =================== */
  const styles = `
    :root{
      /* Tighter, pro fluid scales */
      --fs-10: clamp(10px, 1.5vw, 12px);
      --fs-11: clamp(11px, 1.6vw, 13px);
      --fs-12: clamp(12px, 1.8vw, 14px);
      --fs-14: clamp(13px, 2.0vw, 16px);
      --fs-16: clamp(14px, 2.2vw, 18px);
      --fs-18: clamp(15px, 2.6vw, 20px);
      --fs-20: clamp(16px, 3.0vw, 22px);
      --fs-24: clamp(18px, 3.6vw, 26px);

      --pad-6: clamp(4px, 1vw, 6px);
      --pad-8: clamp(6px, 1.2vw, 8px);
      --pad-10: clamp(8px, 1.6vw, 10px);
      --pad-12: clamp(10px, 1.8vw, 12px);
      --pad-14: clamp(12px, 2.0vw, 14px);
      --pad-16: clamp(12px, 2.2vw, 16px);
      --gap-6: clamp(4px, 1vw, 6px);
      --gap-8: clamp(6px, 1.2vw, 8px);
      --gap-10: clamp(8px, 1.6vw, 10px);
      --gap-12: clamp(10px, 1.8vw, 12px);
      --gap-14: clamp(12px, 2.0vw, 14px);
      --gap-16: clamp(12px, 2.2vw, 16px);

      --tap: 44px;

      /* Palette */
      --bg:#f7fafc; --card:#fff; --text:#0f172a; --muted:#475569; --border:#e2e8f0; --border-strong:#d0d7e2;
      --accent:#2563eb; --accent2:#7c3aed; --green:#10b981; --amber:#f59e0b; --danger:#ef4444;
      --chip-bg:#eef2ff; --chip-text:#4338ca; --light:#fff; --soft:#f1f5f9;

      --shadow:0 8px 20px rgba(2,6,23,.07);
      --shadow-2:0 12px 28px rgba(2,6,23,.12);

      --container-w: 1200px;

      /* MEDIUM posters – not tiny, not full screen */
      --poster-w: clamp(80px, 24vw, 120px);
      --poster-h: clamp(112px, 32vw, 180px);

      --ring: 0 0 0 3px rgba(16,185,129,.18);
    }

    .fav-container{
      background:var(--bg);
      min-height:100vh; min-height:100dvh;
      color:var(--text);
      padding: var(--pad-14);
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--pad-16));
      font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      box-sizing: border-box;
    }
    .container{ max-width: var(--container-w); margin-inline: auto; width: 100%; }

    /* Tabs */
    .tabs{
      display:flex; gap:var(--gap-8); border-bottom:1px solid var(--border);
      margin: 0 auto var(--pad-12);
      width:100%;
      overflow-x:auto; -webkit-overflow-scrolling:touch;
      padding-bottom: var(--pad-6);
    }
    .tab-btn{
      border:0; background:transparent; color:var(--muted);
      padding: var(--pad-10) var(--pad-12);
      border-radius:10px 10px 0 0; font-weight:800; transition:.2s; white-space:nowrap;
      font-size: var(--fs-14);
      min-height: var(--tap);
    }
    .tab-btn:hover{ background:#e0f2fe; color:var(--text); transform:translateY(-1px); }
    .tab-btn.active{ background:#bae6fd; color:var(--text); box-shadow: inset 0 -2px 0 var(--accent); }

    /* Segmented toggle */
    .seg{
      display:inline-flex; background:#f1f5f9; border:1px solid var(--border); border-radius:9999px; padding:4px; gap:4px;
    }
    .seg button{
      border:0; background:transparent; padding:6px 10px; border-radius:9999px; font-weight:800; font-size:var(--fs-12); color:#334155; min-height:34px;
    }
    .seg button.active{ background:#fff; color:#111827; box-shadow:0 1px 0 rgba(0,0,0,.04); border:1px solid var(--border-strong); }

    /* Cards */
    .cardish{ background:var(--card); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); overflow:hidden; }
    .cardish:hover{ box-shadow:var(--shadow-2); }
    .cardish .header{
      padding: var(--pad-12) var(--pad-14);
      border-bottom:1px solid var(--border);
      display:flex; align-items:center; gap:var(--gap-10);
      background:linear-gradient(180deg,#ffffff 0%, #fbfdff 100%);
      flex-wrap:wrap;
    }
    .cardish .body{ padding: var(--pad-12) var(--pad-14); }

    .title{ font-weight:900; font-size: var(--fs-16); }
    .subtitle{ color:var(--muted); font-size: var(--fs-12); }

    .tag{ background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8; border-radius:9999px; padding: var(--pad-6) var(--pad-10); font-size:var(--fs-10); font-weight:800; }
    .pill{ background:var(--chip-bg); color:var(--chip-text); border:1px solid #c7d2fe; border-radius:9999px; padding: var(--pad-6) var(--pad-10); font-size:var(--fs-10); font-weight:800; }

    input[type="email"], input[type="text"], select{
      background:#fff; border:1px solid var(--border-strong); color:var(--text); border-radius:10px; padding: var(--pad-10) var(--pad-12); outline:none; transition:.2s; width:100%;
      font-size: var(--fs-14);
      min-height: var(--tap);
    }
    input[type="email"]:focus, input[type="text"]:focus, select:focus{ border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,.2); }

    /* Search input with icons */
    .input-adorned{ position:relative; }
    .input-icon-left{ position:absolute; left:10px; top:50%; transform:translateY(-50%); display:inline-flex; align-items:center; pointer-events:none; color:#64748b; }
    .input-adorned .form-control{ padding-left:38px; transition:border .15s ease, box-shadow .15s ease, transform .05s ease; }
    .input-adorned .form-control:focus{ transform:translateY(-1px); }
    .input-clear{ position:absolute; right:10px; top:50%; transform:translateY(-50%); border:0; background:var(--soft); color:#334155; border:1px solid var(--border); border-radius:9999px; padding:4px 8px; font-weight:800; font-size:var(--fs-10); min-height:32px; }
    .input-clear:hover{ background:#e2e8f0; }

    /* List grid (text + compact poster) */
    .list-grid{ display:grid; grid-template-columns:repeat(1,1fr); gap:var(--gap-10); }
    @media (min-width:700px){ .list-grid{ grid-template-columns:repeat(2,1fr); } }
    @media (min-width:1100px){ .list-grid{ grid-template-columns:repeat(3,1fr); } }

    /* Item card */
    .item{
      display:grid; grid-template-columns: var(--poster-w) 1fr auto; align-items:center;
      gap:var(--gap-10);
      background:#fff; border:1px solid var(--border); border-radius:12px; padding:var(--pad-10);
      transition:.18s ease; animation:fadeInUp .22s ease both;
    }
    .item:hover{ transform:translateY(-2px); box-shadow:var(--shadow-2); background:#fcfcfd; border-color:#cbd5e1; }
    .item.selected{ box-shadow: var(--ring); }

    @keyframes fadeInUp{
      from{ opacity:.0; transform: translateY(4px) scale(.997); }
      to{ opacity:1; transform: translateY(0) scale(1); }
    }

    .poster{
      width: var(--poster-w); height: var(--poster-h);
      border:1px solid var(--border); border-radius:10px; overflow:hidden; background:#fff;
      display:flex; align-items:center; justify-content:center;
    }
    .poster img{ width:100%; height:100%; object-fit:cover; object-position:center; display:block; }
    .poster .ph{ font-size: var(--fs-11); color:#94a3b8; font-weight:800; text-align:center; padding:4px; }

    /* Checkbox pro */
    .checkwrap{ display:inline-flex; align-items:center; gap:8px; }
    .checkwrap input[type="checkbox"]{
      appearance:none; width:18px; height:18px; border-radius:6px; border:1.5px solid #cbd5e1; display:grid; place-items:center; background:#fff; transition:.15s;
    }
    .checkwrap input[type="checkbox"]::after{
      content:""; width:12px; height:12px; transform:scale(0); transition:.12s;
      clip-path:polygon(14% 44%, 0 59%, 46% 100%, 100% 20%, 84% 7%, 43% 71%);
      background:transparent;
    }
    .checkwrap input[type="checkbox"]:checked{
      border-color:#22c55e; background:#dcfce7;
    }
    .checkwrap input[type="checkbox"]:checked::after{
      background:#16a34a; transform:scale(1);
    }
    .selected-chip{ background:#dcfce7; color:#166534; border:1px solid #86efac; padding:3px 8px; border-radius:9999px; font-weight:800; font-size:var(--fs-10); }

    .item h6{ margin:0; font-size: var(--fs-16); font-weight:900; color:var(--text); line-height:1.25; }
    .item .title-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .item small.muted{ color:var(--muted); display:block; font-size: var(--fs-12); line-height:1.25; }
    .chips-row{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
    .chip-soft{ background:#eef2f7; color:#1f2937; border:1px solid #e2e8f0; border-radius:999px; padding:3px 8px; font-weight:700; font-size:var(--fs-10); }
    .chip-watch{ background:#ecfdf5; color:#065f46; border:1px solid #86efac; }
    .chip-pending{ background:#fff7ed; color:#9a3412; border:1px solid #fed7aa; }

    .item .right{ margin-left:auto; display:flex; gap:var(--gap-8); align-items:center; }
    .type-pill{ background:#f1f5f9; border:1px solid #e2e8f0; color:#334155; border-radius:9999px; padding:4px 8px; font-size:var(--fs-10); font-weight:800; }

    /* Buttons */
    .btn{ border:0; border-radius:10px; padding: var(--pad-10) var(--pad-14); font-weight:900; transition:.2s; color:#fff; white-space:nowrap; font-size: var(--fs-14); min-height: var(--tap); }
    .btn:disabled{ opacity:.65; cursor:not-allowed; }
    .btn:hover{ transform:translateY(-1px); filter:brightness(1.05); }
    .btn-blue{ background:linear-gradient(90deg,#2563eb,#3b82f6); box-shadow:0 6px 16px rgba(37,99,235,.25); }
    .btn-violet{ background:linear-gradient(90deg,#7c3aed,#8b5cf6); box-shadow:0 6px 16px rgba(124,58,237,.25); }
    .btn-green{ background:linear-gradient(90deg,#10b981,#22c55e); box-shadow:0 6px 16px rgba(16,185,129,.25); }
    .btn-amber{ background:linear-gradient(90deg,#f59e0b,#fbbf24); box-shadow:0 6px 16px rgba(245,158,11,.25); }
    .btn-gray{ background:#fff; color:var(--text); border:1px solid var(--border); }
    .btn-gray:hover{ background:#f8fafc; }
    .btn-danger{ background:linear-gradient(90deg,#ef4444,#f87171); box-shadow:0 6px 16px rgba(239,68,68,.25); }

    .big-title{ font-weight:900; font-size: var(--fs-20); color:#111827; background:#fff; padding:var(--pad-10) var(--pad-12); border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow); min-width: 240px; max-width: 100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    .section-title{ font-size: var(--fs-16); font-weight:900; margin-bottom: var(--pad-8); color:var(--text); }
    .section-title-center{ text-align:center; }
    .divider{ height:1px; background:var(--border); margin: var(--pad-12) 0; }

    /* Sticky actions */
    .sticky-actions{
      position:sticky; bottom:0;
      background:rgba(255,255,255,.92); backdrop-filter:blur(6px);
      border-top:1px solid var(--border);
      padding: var(--pad-10);
      border-bottom-left-radius:14px; border-bottom-right-radius:14px;
      display:flex; gap:var(--gap-10); align-items:center; justify-content:space-between; flex-wrap:wrap;
    }

    /* Favorites grid cards */
    .grid-modern{display:grid;gap:var(--gap-12);grid-template-columns:repeat(1,1fr)}
    @media (min-width:700px){.grid-modern{grid-template-columns:repeat(2,1fr)}}
    @media (min-width:1100px){.grid-modern{grid-template-columns:repeat(3,1fr)}}
    .media-card{
      position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:var(--pad-12);
      box-shadow:0 8px 20px rgba(15,23,42,.06);transition:.18s; display:grid; grid-template-columns: var(--poster-w) 1fr auto; gap: var(--gap-10); align-items:center;
      animation: fadeInUp .22s ease both;
    }
    .media-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,23,42,.10);border-color:#cbd5e1}
    .media-poster{ grid-column: 1/2; }
    .media-title{font-weight:900;font-size: var(--fs-16);color:#111827;margin:0 0 4px; line-height:1.25;}
    .media-sub{color:#64748b;font-size: var(--fs-12)}
    .media-meta{display:flex;gap:var(--gap-8);align-items:center;margin-top:var(--pad-6);flex-wrap:wrap}
    .badge{ background:#eef2f7;color:#1f2937;border:1px solid #e2e8f0;padding:3px 8px;border-radius:9999px;font-weight:800;font-size: var(--fs-10) }
    .badge-gray{background:#f8fafc;color:#334155;border:1px solid #e2e8f0}
    .badge-type{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .card-actions{display:flex;gap:var(--gap-8);align-items:center;margin-left:auto}

    /* Pagination */
    .pager{ display:flex; gap:8px; align-items:center; justify-content:center; margin-top:var(--pad-12); flex-wrap:wrap; }
    .pager .count{ font-size:var(--fs-12); color:var(--muted); }

    /* Sheet (no overlay) */
    .sheet-wrap{ position:fixed; inset:0; z-index:60; pointer-events:none; padding: var(--pad-12); }
    .sheet{ pointer-events:auto; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            width:min(100%, 560px); background:#fff; border:1px solid var(--border);
            border-radius:14px; box-shadow:var(--shadow-2); padding: var(--pad-14); }
    .sheet-header{ display:flex; align-items:center; justify-content:space-between; gap:var(--gap-10); margin-bottom:var(--pad-10); flex-wrap: wrap; }
    .sheet-title{ font-weight:900; font-size: var(--fs-18); color:var(--text); }
    .sheet-actions{ display:flex; gap:var(--gap-10); justify-content:flex-end; margin-top:var(--pad-12); flex-wrap:wrap; }

    /* Toast */
    .toast-wrap{ position:fixed; inset:0; pointer-events:none; z-index:70; padding: var(--pad-12); }
    .toast{ pointer-events:auto; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow-2);
            padding: var(--pad-14); min-width:260px; max-width:520px; text-align:center; }
    .toast-title{ font-weight:900; margin-bottom:6px; font-size: var(--fs-16); }
    .toast-msg{ color:var(--muted); font-size: var(--fs-12); }
    .toast.ok .toast-title{ color:#065f46; }
    .toast.warn .toast-title{ color:#92400e; }
    .toast.err .toast-title{ color:#7f1d1d; }

    /* Utils */
    .w-100{ width:100%; }
    .text-center{ text-align:center; }
    .mt-2{ margin-top:var(--pad-8); } .mt-3{ margin-top:var(--pad-12); }
    .ms-auto{ margin-inline-start:auto; }
    .g-2{ gap:var(--gap-8); }
    .g-4{ gap:var(--gap-14); }
    .row{ display:flex; flex-direction:column; gap: var(--gap-14); }
    .col-12{ width:100%; }

    /* ===== MOBILE VIEW: keep posters medium, no full-width giant images ===== */
    *, *::before, *::after { overflow-wrap: anywhere; }

    @media (max-width: 480px){
      /* Titles never truncate oddly */
      h6, .media-title, .big-title { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }

      .list-grid { grid-template-columns: 1fr !important; }

      .item{
        grid-template-columns: var(--poster-w) 1fr;
        align-items: flex-start;
      }

      .item .right{
        margin-top: var(--pad-6);
        justify-content: flex-end;
      }

      .grid-modern{ grid-template-columns: 1fr !important; }

      .media-card{
        grid-template-columns: var(--poster-w) 1fr auto;
        align-items: flex-start;
      }

      /* Sticky actions full-width controls */
      .sticky-actions { gap: var(--gap-10); }
      .sticky-actions select, .sticky-actions .form-select { width: 100% !important; max-width: 100% !important; }
      .sticky-actions .btn { width: 100%; }
    }

    /* Input: keep space for clear button */
    .input-adorned .form-control { padding-right: 64px; }
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

  const clamp = (n,min,max)=> Math.max(min, Math.min(max, n));

  const normalizePages = (itemsLen, page, setPage)=>{
    const maxPage = Math.max(0, Math.ceil(itemsLen / PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  };

  /* =============== API • Discover =============== */
  const doSearch = useMemo(()=> debounce(async(q)=>{
    if (!q?.trim()){ setSearchResults({ movies:[], series:[], count:0, raw:[] }); return; }
    try{
      setSearchLoading(true);
      const { data } = await axios.get(SEARCH_URL, { params:{ q, limit:60, offset:0 }});
      setSearchResults(splitSearchResults(data.results || []));
    }finally{ setSearchLoading(false); }
  }, 450), []);
  useEffect(()=>{ doSearch(searchQuery); }, [searchQuery, doSearch]);

  const fetchCategory = async ()=>{
    if (!categoryInput?.trim()) return;
    try{
      setCategoryLoading(true);
      const { data } = await axios.get(CAT_URL, { params:{ category: categoryInput, limitMovies:30, limitSeries:30 }});
      setCategoryData(data || { category:null, counts:null, movies:[], series:[] });
    }catch(e){
      showToast("Category Error","Failed to load category.","err");
    }finally{ setCategoryLoading(false); }
  };

  const fetchWatch = useMemo(()=> debounce(async(watched)=>{
    try{
      setWatchLoading(true);
      const { data } = await axios.get(WATCH_URL, { params:{ watched, limit:36, offset:0 }});
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

  /* =============== API • Load bucket =============== */
  const fetchBucket = async (bucketName)=>{
    if (!bucketName) return;
    if (favCache[bucketName]) return;
    try{
      setFavLoading(true);
      const { data } = await axios.get(BUCKET_URL, { params:{ user_id: AUTH_USER_ID, favorite_category: bucketName }});
      setFavCache(p => ({...p, [bucketName]: data || { movies:[], series:[], counts:{ movies:0, series:0, total:0 }}}));
      const d = data || { movies:[], series:[] };
      normalizePages((d.movies||[]).length, favPageMovies, setFavPageMovies);
      normalizePages((d.series||[]).length, favPageSeries, setFavPageSeries);
    }catch(e){
      showToast("Load Failed","Could not load this bucket.","err");
    }finally{ setFavLoading(false); }
  };

  /* =============== API • Remove favorite =============== */
  const removeFavorite = async (favorite_id)=>{
    if (!favorite_id) return;
    let newMoviesLen = null;
    let newSeriesLen = null;

    setFavCache(cache=>{
      if (!favBucket || !cache[favBucket]) return cache;
      const curr = cache[favBucket];
      const movies = curr.movies.filter(x=>x.favorite_id !== favorite_id);
      const series = curr.series.filter(x=>x.favorite_id !== favorite_id);
      const counts = { movies: movies.length, series: series.length, total: movies.length + series.length };
      newMoviesLen = movies.length;
      newSeriesLen = series.length;
      return { ...cache, [favBucket]: { ...curr, movies, series, counts } };
    });

    setTimeout(()=>{
      const dataNow = favCache[favBucket] || { movies:[], series:[] };
      normalizePages(newMoviesLen ?? (dataNow.movies||[]).length, favPageMovies, setFavPageMovies);
      normalizePages(newSeriesLen ?? (dataNow.series||[]).length, favPageSeries, setFavPageSeries);
    }, 0);

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
    <div className="chips-row">
      {list.map((g,i)=>(<span key={i} className="chip-soft" style={{borderColor:"#a5f3fc", color:"#155e75"}}>{g}</span>))}
    </div>
  );

  const SubLine = ({ item, label })=>{
    const line1 = `${item.release_year ? `Year: ${item.release_year} • ` : ""}${item.category_name||""}${item.subcategory_name?` • ${item.subcategory_name}`:""}`;
    const extra = label==="movie" ? item.parts : item.seasons;
    const extraText = Array.isArray(extra) ? extra.join(", ") : extra;
    const watchedChip = item.is_watched
      ? <span className="chip-soft chip-watch">Watched</span>
      : <span className="chip-soft chip-pending">Not Watched</span>;

    return (
      <>
        <small className="muted">{line1}</small>
        {extraText?.length ? <small className="muted"><br/>{label==="movie"?"Parts: ":"Seasons: "}{extraText}</small> : null}
        {item.genres?.length ? <GenreChips list={item.genres}/> : null}
        <div className="chips-row" style={{marginTop:6}}>
          {watchedChip}
          {item.release_year ? <span className="chip-soft">({item.release_year})</span> : null}
        </div>
      </>
    );
  };

  const SelectBox = ({ checked, onChange })=>(
    <label className="checkwrap" aria-label={checked ? "Unselect" : "Select"}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} />
    </label>
  );

  const ResultList = ({ items, label })=>(
    <div className="list-grid">
      {items.map(r=>{
        const checked = selectedItems.some(p=>p.type===label && p.id===r.id);
        const hasPoster = !!r.poster_url;
        return (
          <div className={`item ${checked ? "selected" : ""}`} key={`${label}-${r.id}`}>
            {/* poster */}
            <div className="poster">
              {hasPoster ? (
                <img
                  src={r.poster_url}
                  alt={`${r.title} poster`}
                  onError={(e)=>{ e.currentTarget.style.display="none"; e.currentTarget.parentElement.innerHTML='<div class="ph">NO POSTER</div>'; }}
                />
              ) : <div className="ph">NO POSTER</div>}
            </div>

            {/* text */}
            <div style={{minWidth:0}}>
              <div className="title-row">
                <SelectBox
                  checked={checked}
                  onChange={(state)=> addOrRemoveSelected(state, {
                    type:label, id:r.id, title:r.title, year:r.release_year,
                    category_id:r.category_id, subcategory_id:r.subcategory_id,
                    poster_url:r.poster_url, is_watched:r.is_watched
                  })}
                />
                <h6 title={r.title} style={{overflow:"hidden", textOverflow:"ellipsis"}}>{r.title}</h6>
                {checked && <span className="selected-chip">✓ Selected</span>}
              </div>
              <SubLine item={r} label={label}/>
            </div>

            {/* actions */}
            <div className="right">
              <span className="type-pill">{label==="movie"?"Movie":"Series"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const bucketData = (favBucket && favCache[favBucket]) || { movies:[], series:[], counts:{ movies:0, series:0, total:0 } };

  const moviesPageSlice = bucketData.movies.slice(favPageMovies*PAGE_SIZE, favPageMovies*PAGE_SIZE+PAGE_SIZE);
  const seriesPageSlice = bucketData.series.slice(favPageSeries*PAGE_SIZE, favPageSeries*PAGE_SIZE+PAGE_SIZE);

  const selectionCount = selectedItems.length;

  const Pager = ({ total, page, setPage })=>{
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const canPrev = page > 0;
    const canNext = page+1 < totalPages;
    return (
      <div className="pager">
        <button className="btn btn-gray" disabled={!canPrev} onClick={()=> setPage(p=>clamp(p-1,0,totalPages-1))}>Prev</button>
        <span className="count">Page {page+1} / {totalPages}</span>
        <button className="btn btn-gray" disabled={!canNext} onClick={()=> setPage(p=>clamp(p+1,0,totalPages-1))}>Next</button>
      </div>
    );
  };

  /* =============== JSX =============== */
  return (
    <div className="container fav-container">
      <style>{styles}</style>

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Favorites Sections">
        <button className={`tab-btn ${activeTab==="discover"?"active":""}`} onClick={()=>setActiveTab("discover")} role="tab" aria-selected={activeTab==="discover"}>Discover</button>
        <button className={`tab-btn ${activeTab==="favorites"?"active":""}`} onClick={()=>setActiveTab("favorites")} role="tab" aria-selected={activeTab==="favorites"}>Favorites</button>
      </div>

      {/* ========== TAB: DISCOVER ========== */}
      {activeTab==="discover" && (
        <div className="row g-4">
          {/* Search */}
          <div className="col-12">
            <div className="cardish">
              <div className="search-header header" style={{gap:12}}>
                <div className="lhs" style={{display:"flex", alignItems:"center", gap:"8px"}}>
                  <span className="title">Search</span>
                  <span className="tag">Live</span>
                </div>

                {/* Type toggle */}
                <div className="seg" role="tablist" aria-label="Discover content type">
                  {["all","movie","series"].map(t=>(
                    <button key={t} className={discoverType===t?"active":""} onClick={()=>setDiscoverType(t)} role="tab" aria-selected={discoverType===t}>
                      {t==="all"?"All":t==="movie"?"Movies":"Series"}
                    </button>
                  ))}
                </div>

                <div className="rhs" style={{display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap", marginLeft:"auto"}}>
                  <span className="pill">Results: {searchResults.count}</span>
                  {searchLoading && (
                    <span aria-live="polite" aria-label="Loading results"><LoadingSpiner/></span>
                  )}
                </div>
              </div>

              <div className="body">
                <div className="g-2" style={{display:"grid", gridTemplateColumns:"1fr", alignItems:"center"}}>
                  <div>
                    <div className="input-adorned">
                      <span className="input-icon-left" aria-hidden="true">
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
                        inputMode="search"
                      />
                      {searchQuery && (
                        <button className="input-clear" onClick={()=>setSearchQuery('')} aria-label="Clear search">Clear</button>
                      )}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span className="subtitle">Try: “Action 2019”, “Sci-Fi”, “Korean”</span>
                  </div>
                </div>

                <div className="divider"/>
                {(discoverType==="all" || discoverType==="movie") && !!searchResults.movies.length && (
                  <>
                    <div className="section-title">Movies</div>
                    <ResultList items={searchResults.movies} label="movie"/>
                  </>
                )}
                {(discoverType==="all" || discoverType==="series") && !!searchResults.series.length && (
                  <>
                    <div className="section-title section-title-center mt-3">Series</div>
                    <ResultList items={searchResults.series} label="series"/>
                  </>
                )}
                {!searchLoading && searchResults.count===0 && (<div className="subtitle">Start typing above to search…</div>)}
              </div>

              <div className="sticky-actions">
                <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                  <span className="subtitle">Add to bucket:</span>
                  <div style={{minWidth:240, maxWidth: 360, width:"min(90vw, 360px)"}}>
                    <select className="form-select" value={selectedBucket} onChange={e=>setSelectedBucket(e.target.value)}>
                      {FAVORITE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
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
              <div className="header" style={{gap:12}}>
                <span className="title">Filter by Category</span>
                <div className="seg" role="tablist" aria-label="Category type">
                  {["all","movie","series"].map(t=>(
                    <button key={t} className={discoverType===t?"active":""} onClick={()=>setDiscoverType(t)} role="tab" aria-selected={discoverType===t}>
                      {t==="all"?"All":t==="movie"?"Movies":"Series"}
                    </button>
                  ))}
                </div>
                <span className="subtitle ms-auto">{categoryLoading ? <LoadingSpiner/> : ""}</span>
              </div>
              <div className="body">
                <div className="g-2" style={{display:"grid", gridTemplateColumns:"1fr", gap:"8px"}}>
                  <div>
                    <input className="form-control" placeholder="Type Category Name or ID (e.g., Action Movies or 17)" value={categoryInput} onChange={e=>setCategoryInput(e.target.value)}/>
                  </div>
                  <div>
                    <button className="btn btn-gray w-100" onClick={fetchCategory} disabled={categoryLoading}>
                      {categoryLoading ? <LoadingSpiner/> : "Apply"}
                    </button>
                  </div>
                </div>

                {!!categoryData?.category && (
                  <>
                    <div className="divider"/>
                    <div style={{display:"flex", flexWrap:"wrap", gap:"8px"}}>
                      <span className="pill">Category: {categoryData.category.name}</span>
                      <span className="pill">Movies: {categoryData.counts?.movies ?? 0}</span>
                      <span className="pill">Series: {categoryData.counts?.series ?? 0}</span>
                      <span className="pill">Total: {categoryData.counts?.overall ?? 0}</span>
                    </div>

                    {(discoverType==="all" || discoverType==="movie") && !!categoryData.movies?.length && (
                      <>
                        <div className="section-title mt-3">Movies</div>
                        <ResultList items={categoryData.movies} label="movie"/>
                      </>
                    )}

                    {(discoverType==="all" || discoverType==="series") && !!categoryData.series?.length && (
                      <>
                        <div className="section-title section-title-center mt-3">Series</div>
                        <ResultList items={categoryData.series} label="series"/>
                      </>
                    )}

                    {!categoryLoading && !categoryData.movies?.length && !categoryData.series?.length && (<div className="subtitle mt-2">No items in this category.</div>)}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Watch Filter */}
          <div className="col-12">
            <div className="cardish">
              <div className="header" style={{gap:12}}>
                <span className="title">Watch Filter</span>
                <div className="seg" role="tablist" aria-label="Watch type">
                  {["all","movie","series"].map(t=>(
                    <button key={t} className={discoverType===t?"active":""} onClick={()=>setDiscoverType(t)} role="tab" aria-selected={discoverType===t}>
                      {t==="all"?"All":t==="movie"?"Movies":"Series"}
                    </button>
                  ))}
                </div>
                <span className="subtitle ms-auto">{watchLoading ? <LoadingSpiner/> : ""}</span>
              </div>
              <div className="body">
                <div style={{display:"flex",flexWrap:"wrap",gap:"8px",alignItems:"center"}}>
                  <div style={{minWidth:160, maxWidth:220, width:"min(60vw, 220px)"}}>
                    <select className="form-select" value={watchFilter} onChange={e=>setWatchFilter(e.target.value)} disabled={watchLoading}>
                      <option value="all">All</option><option value="yes">Watched</option><option value="no">Not Watched</option>
                    </select>
                  </div>
                  {watchData?.counts && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                      <span className="pill">Movies: {watchData.counts.movies.total} (✓ {watchData.counts.movies.watched} / ✗ {watchData.counts.movies.not_watched})</span>
                      <span className="pill">Series: {watchData.counts.series.total} (✓ {watchData.counts.series.watched} / ✗ {watchData.counts.series.not_watched})</span>
                    </div>
                  )}
                </div>

                <div className="divider"/>
                {(discoverType==="all" || discoverType==="movie") && !!watchData.movies?.length && (
                  <>
                    <div className="section-title mt-2">Movies</div>
                    <ResultList items={watchData.movies} label="movie"/>
                  </>
                )}

                {(discoverType==="all" || discoverType==="series") && !!watchData.series?.length && (
                  <>
                    <div className="section-title section-title-center mt-3">Series</div>
                    <ResultList items={watchData.series} label="series"/>
                  </>
                )}

                {!watchLoading && !watchData.movies?.length && !watchData.series?.length && (<div className="subtitle">No items for this filter.</div>)}
              </div>

              <div className="sticky-actions">
                <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                  <span className="subtitle">Add to bucket:</span>
                  <div style={{minWidth:240, maxWidth: 360, width:"min(90vw, 360px)"}}>
                    <select className="form-select" value={selectedBucket} onChange={e=>setSelectedBucket(e.target.value)} disabled={adding}>
                      {FAVORITE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
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
              <div className="header" style={{flexWrap:"wrap", gap:"10px"}}>
                <div className="big-title" title={favBucket || "Pick a Favorite Bucket"}>
                  {favBucket ? favBucket : "Pick a Favorite Bucket"}
                </div>

                <div className="seg" role="tablist" aria-label="Favorites type">
                  {["all","movie","series"].map(t=>(
                    <button key={t} className={favType===t?"active":""} onClick={()=>{ setFavType(t); }} role="tab" aria-selected={favType===t}>
                      {t==="all"?"All":t==="movie"?"Movies":"Series"}
                    </button>
                  ))}
                </div>

                <div style={{display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap", marginLeft:"auto"}}>
                  <div style={{minWidth:240, width:"min(90vw, 340px)"}}>
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
                    >
                      <option value="">Select bucket…</option>
                      {FAVORITE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-amber" onClick={()=> setShareOpen(true)} disabled={!favBucket}>
                    Share as PDF
                  </button>
                </div>
              </div>

              {!favBucket ? (
                <div className="body"><div className="subtitle">Choose a favorite category to see items.</div></div>
              ) : (
                <div className="body">
                  {favLoading ? (
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}><LoadingSpiner/> <span className="subtitle">Loading {favBucket}…</span></div>
                  ) : (
                    <>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"8px", marginBottom:"8px"}}>
                        <span className="pill">Movies: {bucketData.counts?.movies ?? 0}</span>
                        <span className="pill">Series: {bucketData.counts?.series ?? 0}</span>
                        <span className="pill">Total: {bucketData.counts?.total ?? 0}</span>
                      </div>

                      {/* Movies */}
                      {(favType==="all" || favType==="movie") && (
                        <>
                          <div className="section-title">Movies</div>
                          {bucketData.movies.length ? (
                            <>
                              <div className="grid-modern">
                                {moviesPageSlice.map(m=>{
                                  const hasPoster = !!m.poster_url;
                                  return (
                                    <div className="media-card" key={`fav-m-${m.favorite_id}`}>
                                      <div className="media-poster poster">
                                        {hasPoster ? (
                                          <img
                                            src={m.poster_url}
                                            alt={`${m.title} poster`}
                                            onError={(e)=>{ e.currentTarget.style.display="none"; e.currentTarget.parentElement.innerHTML='<div class="ph">NO POSTER</div>'; }}
                                          />
                                        ) : <div className="ph">NO POSTER</div>}
                                      </div>
                                      <div style={{flexGrow:1, minWidth:0}}>
                                        <h6 className="media-title" title={m.title} style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{m.title}</h6>
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
                                  );
                                })}
                              </div>

                              <Pager
                                total={bucketData.movies.length}
                                page={favPageMovies}
                                setPage={setFavPageMovies}
                              />
                            </>
                          ) : (<div className="subtitle">No movies in this bucket (yet).</div>)}
                        </>
                      )}

                      {(favType==="all") && <div className="divider"/>}

                      {/* Series */}
                      {(favType==="all" || favType==="series") && (
                        <>
                          <div className="section-title section-title-center">Series</div>
                          {bucketData.series.length ? (
                            <>
                              <div className="grid-modern">
                                {seriesPageSlice.map(s=>{
                                  const hasPoster = !!s.poster_url;
                                  return (
                                    <div className="media-card" key={`fav-s-${s.favorite_id}`}>
                                      <div className="media-poster poster">
                                        {hasPoster ? (
                                          <img
                                            src={s.poster_url}
                                            alt={`${s.title} poster`}
                                            onError={(e)=>{ e.currentTarget.style.display="none"; e.currentTarget.parentElement.innerHTML='<div class="ph">NO POSTER</div>'; }}
                                          />
                                        ) : <div className="ph">NO POSTER</div>}
                                      </div>
                                      <div style={{flexGrow:1, minWidth:0}}>
                                        <h6 className="media-title" title={s.title} style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{s.title}</h6>
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
                                  );
                                })}
                              </div>

                              <Pager
                                total={bucketData.series.length}
                                page={favPageSeries}
                                setPage={setFavPageSeries}
                              />
                            </>
                          ) : (<div className="subtitle">No series in this bucket (yet).</div>)}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {!favBucket && (
            <div className="col-12">
              <div className="cardish" style={{padding:"16px"}}>
                <div className="body subtitle">Choose a bucket above to view and share your favorites.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======= SHARE SHEET (NO OVERLAY) ======= */}
      {shareOpen && (
        <div className="sheet-wrap">
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Share favorites as PDF"
            aria-busy={shareSending ? "true" : "false"}
          >
            {/* Header */}
            <div className="sheet-header">
              <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                <span aria-hidden="true">
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
            <div>
              <p className="subtitle" style={{margin:"0 0 10px"}}>Send a nicely formatted PDF of your <strong>{favBucket || "—"}</strong> list to an email address.</p>

              <div>
                <label htmlFor="share-email" className="form-label" style={{fontWeight:800, display:"block", marginBottom:"6px"}}>Recipient email</label>
                <div style={{position:"relative"}}>
                  <input
                    id="share-email"
                    type="email"
                    className="form-control"
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
                    aria-invalid={shareEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail) ? "true" : "false"}
                    style={{paddingRight: shareSending ? 44 : 12}}
                  />
                  {shareSending && (
                    <span style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)"}} aria-hidden="true">
                      <LoadingSpiner />
                    </span>
                  )}
                </div>
                {shareEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail) && (
                  <div style={{fontSize:"12px", color:"#b91c1c", marginTop:"6px"}}>Please enter a valid email address.</div>
                )}
                <div className="subtitle" style={{marginTop:"6px"}}>Press <kbd>Enter</kbd> to send, or <kbd>Esc</kbd> to close.</div>
              </div>
            </div>

            {/* Footer */}
            <div className="sheet-actions">
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

      {/* SHARE SUCCESS */}
      {shareSuccessOpen && (
        <div className="sheet-wrap">
          <div className="sheet" role="alertdialog" aria-label="PDF sent">
            <div className="sheet-header">
              <div className="sheet-title">Success!</div>
              <button className="btn btn-gray" onClick={()=> setShareSuccessOpen(false)}>Close</button>
            </div>
            <div className="subtitle">Your PDF for <strong>{favBucket}</strong> was sent to <strong>{shareEmail}</strong>.</div>
            <div className="sheet-actions" style={{justifyContent:"center"}}>
              <button className="btn btn-blue" onClick={()=> setShareSuccessOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
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
