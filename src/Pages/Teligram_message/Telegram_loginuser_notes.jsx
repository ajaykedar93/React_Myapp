import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";

const DEFAULT_BACKEND_URL = "https://express-backend-myapp.onrender.com";

const BASE_URL = (
  import.meta.env.VITE_TELEGRAM_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  DEFAULT_BACKEND_URL
).replace(/\/$/, "");

const API = {
  me: `${BASE_URL}/api/telegram-users/me`,
  channelPrimary: (id) => `${BASE_URL}/api/telegramlogin-channels/${id}`,
  channelAlt: (id) => `${BASE_URL}/api/telegram-channels/${id}`,
  verifyPrivatePrimary: (id) => `${BASE_URL}/api/telegramlogin-channels/${id}/verify-pin`,
  verifyPrivateAlt: (id) => `${BASE_URL}/api/telegram-channels/${id}/verify-pin`,
  notesPrimary: (id) => `${BASE_URL}/api/telegramlogin-notes?channel_id=${encodeURIComponent(id)}`,
  notesAlt: (id) => `${BASE_URL}/api/telegram-notes?channel_id=${encodeURIComponent(id)}`,
  createNotePrimary: `${BASE_URL}/api/telegramlogin-notes`,
  createNoteAlt: `${BASE_URL}/api/telegram-notes`,
  updateNotePrimary: (id) => `${BASE_URL}/api/telegramlogin-notes/${id}`,
  updateNoteAlt: (id) => `${BASE_URL}/api/telegram-notes/${id}`,
  deleteNotePrimary: (id) => `${BASE_URL}/api/telegramlogin-notes/${id}`,
  deleteNoteAlt: (id) => `${BASE_URL}/api/telegram-notes/${id}`,
  noteImagePrimary: (id, version = "") =>
    `${BASE_URL}/api/telegramlogin-notes/image/${id}${version ? `?v=${version}` : ""}`,
  noteImageAlt: (id, version = "") =>
    `${BASE_URL}/api/telegram-notes/image/${id}${version ? `?v=${version}` : ""}`,
  noteFilePrimary: (id, version = "") =>
    `${BASE_URL}/api/telegramlogin-notes/file/${id}${version ? `?v=${version}` : ""}`,
  noteFileAlt: (id, version = "") =>
    `${BASE_URL}/api/telegram-notes/file/${id}${version ? `?v=${version}` : ""}`,
  noteFileDownloadPrimary: (id) => `${BASE_URL}/api/telegramlogin-notes/file/download/${id}`,
  noteFileDownloadAlt: (id) => `${BASE_URL}/api/telegram-notes/file/download/${id}`,
};

const DEVICE_ID_KEY = "telegram_device_id";
const PIN_STORE_PREFIX = "telegram_login_channel_pin_";
const PIN_VERIFIED_PREFIX = "telegram_login_channel_verified_";
const PIN_DEVICE_PREFIX = "telegram_login_channel_device_";
const PIN_SESSION_PREFIX = "telegram_login_channel_session_";
const PIN_TTL_MS = 1000 * 60 * 60 * 8;
const REFRESH_MS = 2500;

const ATTACH_ICON =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#334155" d="M16.5 6.5v9.25a4.75 4.75 0 0 1-9.5 0V6.25a3.25 3.25 0 0 1 6.5 0v8.9a1.75 1.75 0 0 1-3.5 0V7.5h1.8v7.65a.45.45 0 0 0 .9 0v-8.9a1.45 1.45 0 0 0-2.9 0v9.5a2.95 2.95 0 0 0 5.9 0V6.5h1.8Z"/></svg>`);

const FILE_ICON =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#334155" d="M6 2h8l4 4v16H6V2Zm7 1.8V7h3.2L13 3.8ZM8 11h8v1.7H8V11Zm0 4h8v1.7H8V15Z"/></svg>`);

const COLOR_ICON =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#f59e0b" d="M12 3a9 9 0 0 0 0 18h1.15a2.1 2.1 0 0 0 1.5-3.6l-.55-.55a1.22 1.22 0 0 1 .86-2.08H16a5 5 0 0 0 0-10h-.4A8.8 8.8 0 0 0 12 3Zm-4 9a1.4 1.4 0 1 1 0-2.8A1.4 1.4 0 0 1 8 12Zm3-3.9a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4 1.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z"/></svg>`);

const dateBadgeThemes = [
  ["#c2410c", "#f97316"],
  ["#be123c", "#f43f5e"],
  ["#7c3aed", "#a855f7"],
  ["#2563eb", "#38bdf8"],
  ["#0f766e", "#14b8a6"],
  ["#b45309", "#f59e0b"],
  ["#4338ca", "#818cf8"],
];

function getToken() {
  return (
    localStorage.getItem("telegram_token") ||
    localStorage.getItem("telegram_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);

  if (!id) {
    id =
      window.crypto?.randomUUID?.() ||
      `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
}

function cleanId(value) {
  return String(value || "").trim();
}

function getUserId(user) {
  return cleanId(user?.telegram_user_id || user?.user_id || user?.id || user?._id);
}

function getChannelId(channel) {
  return cleanId(channel?.channel_id || channel?.id || channel?._id);
}

function getNoteId(note) {
  return cleanId(note?.note_id || note?.id || note?._id);
}

function getInitial(value) {
  return String(value || "N").trim().charAt(0).toUpperCase() || "N";
}

function mediaUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|blob:|data:)/i.test(raw)) return raw;
  return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function withVersion(url, version) {
  if (!url) return "";
  if (/^(blob:|data:)/i.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version || Date.now())}`;
}

function isPrivateChannel(channel) {
  return (
    channel?.channel_type === "private" ||
    channel?.type === "private" ||
    channel?.is_private === true ||
    channel?.is_private === 1 ||
    channel?.is_private === "true" ||
    channel?.private === true
  );
}

function getChannelName(channel) {
  return channel?.channel_name || channel?.name || channel?.title || "Notes";
}

function getChannelDescription(channel) {
  return (
    channel?.channel_description ||
    channel?.description ||
    channel?.channel_tagline ||
    channel?.tagline ||
    "Expenses Management"
  );
}

function getChannelLogo(channel) {
  const direct =
    channel?.channel_logo_preview ||
    channel?.channel_logo_url ||
    channel?.logo_url ||
    channel?.channel_logo ||
    channel?.logo ||
    channel?.image_url;

  if (direct) return mediaUrl(direct);

  const id = getChannelId(channel);
  if (id && (channel?.has_logo || channel?.logo_path || channel?.channel_logo_path)) {
    const version = channel?.updated_at || channel?.updatedAt || Date.now();
    return withVersion(`${BASE_URL}/api/telegramlogin-channels/logo/${id}`, version);
  }

  return "";
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  let text = String(value).trim();
  if (!text) return null;
  text = text.replace(" ", "T");

  const hasZone = text.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(text);
  if (!hasZone && /^\d{4}-\d{2}-\d{2}T/.test(text)) text = `${text}Z`;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function indiaDateKey(value) {
  const date = parseDate(value);
  if (!date) return "unknown";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatIndiaDate(value) {
  const date = parseDate(value);
  if (!date) return "Today";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatIndiaTime(value) {
  const date = parseDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace("am", "AM")
    .replace("pm", "PM");
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function sanitizeHtml(html) {
  return DOMPurify.sanitize(html || "", {
    ADD_TAGS: ["font"],
    ADD_ATTR: ["style", "color"],
  });
}

function normalizeColor(color) {
  const value = String(color || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111111";
}

function getNoteTextColor(note) {
  return normalizeColor(note?.text_color || note?.textColor || "#111111");
}

function getNoteDate(note) {
  return note?.created_at || note?.createdAt || note?.updated_at || note?.updatedAt || new Date().toISOString();
}

function getSenderName(note) {
  return (
    note?.sender_name ||
    note?.sender_full_name ||
    note?.full_name ||
    note?.user_name ||
    note?.created_by_name ||
    note?.creator_name ||
    ""
  );
}

function getSenderUserId(note) {
  return cleanId(
    note?.sender_user_id ||
      note?.telegram_user_id ||
      note?.user_id ||
      note?.created_by ||
      note?.created_by_user_id ||
      note?.owner_id
  );
}

function getSenderDeviceId(note) {
  return cleanId(note?.sender_device_id || note?.device_id || note?.created_device_id);
}

function isTitleNote(note) {
  if (note?.is_title === false || note?.is_title === "false" || note?.is_title === 0 || note?.is_title === "0") {
    return false;
  }

  return note?.title === "title" || note?.note_type === "title" || note?.is_title === true || note?.is_title === 1 || note?.is_title === "true";
}

function hasNoteImage(note) {
  return Boolean(note?.image_url || note?.image || note?.has_image);
}

function hasNoteFile(note) {
  return Boolean(note?.has_attachment || note?.has_file || note?.file_url || note?.attachment_url || note?.file_name || note?.attachment_name);
}

function getFileName(noteOrFile) {
  const raw =
    noteOrFile?.file_name ||
    noteOrFile?.attachment_name ||
    noteOrFile?.name ||
    noteOrFile?.download_name ||
    "Attachment";
  return String(raw || "Attachment");
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size || Number.isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(noteOrFile) {
  const name = String(getFileName(noteOrFile)).toLowerCase();
  const mime = String(noteOrFile?.file_mime || noteOrFile?.attachment_mime || noteOrFile?.type || "").toLowerCase();

  if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (mime.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "DOC";
  if (mime.includes("excel") || mime.includes("spreadsheet") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "XLS";
  if (mime.startsWith("image/") || name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)) return "IMG";
  if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z")) return "ZIP";
  if (mime.startsWith("text/") || name.endsWith(".txt")) return "TXT";
  return "FILE";
}

function isPreviewableFile(note) {
  const mime = String(note?.file_mime || note?.attachment_mime || "").toLowerCase();
  const name = getFileName(note).toLowerCase();
  return (
    mime.startsWith("image/") ||
    mime.startsWith("text/") ||
    mime === "application/pdf" ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".json")
  );
}

export default function Telegram_loginuser_notes() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const bottomRef = useRef(null);
  const selectedRangeRef = useRef(null);
  const refreshRef = useRef(null);
  const savingRef = useRef(false);
  const requestIdRef = useRef(0);
  const noteRefs = useRef({});

  const token = getToken();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  const routeChannelId = params.channelId || params.id || params.channel_id || location.state?.channel_id || location.state?.channelId || getChannelId(location.state?.channel);

  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(location.state?.channel || null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channelLoading, setChannelLoading] = useState(true);

  const [privatePin, setPrivatePin] = useState(String(location.state?.private_pin || location.state?.pin || ""));
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeMenuId, setActiveMenuId] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [composerMode, setComposerMode] = useState("message");
  const [textColor, setTextColor] = useState("#111111");
  const [activeFormats, setActiveFormats] = useState({ bold: false, underline: false });

  const [fullImage, setFullImage] = useState("");
  const [brandPop, setBrandPop] = useState(false);
  const [pinnedId, setPinnedId] = useState("");

  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [confirmBox, setConfirmBox] = useState({ show: false, title: "", message: "", action: null });

  const accessMode = location.state?.access_mode || location.state?.accessMode || "full_access";
  const viewOnly = Boolean(location.state?.viewOnly || location.state?.readOnly || accessMode === "view_only");
  const channelId = getChannelId(channel) || cleanId(routeChannelId);
  const privateChannel = isPrivateChannel(channel);
  const currentUserId = getUserId(user);
  const ownerId = cleanId(channel?.owner_id || channel?.created_by || channel?.created_by_user_id || channel?.user_id || channel?.telegram_user_id);
  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId) || channel?.is_owner === true || channel?.owner === true;
  const canSend = Boolean(!viewOnly && unlocked && channelId);
  const pinnedKey = channelId ? `telegram_login_pinned_note_${channelId}` : "";

  const authHeaders = (extra = {}) => {
    const headers = {
      "x-device-id": deviceId,
      ...extra,
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    if (privateChannel && privatePin) headers["x-channel-pin"] = privatePin;

    return headers;
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });
    window.setTimeout(() => setToast({ show: false, type: "success", message: "" }), 1700);
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Something went wrong");
    }

    return data;
  };

  const requestFirst = async (urls, options = {}) => {
    let lastError = null;

    for (const url of urls) {
      try {
        return await requestJson(url, options);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Something went wrong");
  };

  const hasSavedPinAccess = (id) => {
    if (!id) return false;
    const savedDevice = localStorage.getItem(`${PIN_DEVICE_PREFIX}${id}`);
    const verifiedAt = Number(localStorage.getItem(`${PIN_VERIFIED_PREFIX}${id}`) || 0);
    const sessionVerified = sessionStorage.getItem(`${PIN_SESSION_PREFIX}${id}`) === "true";
    const savedPin = localStorage.getItem(`${PIN_STORE_PREFIX}${id}`) || "";

    if (savedDevice !== deviceId) return false;
    if (!savedPin) return false;
    if (!sessionVerified && Date.now() - verifiedAt > PIN_TTL_MS) return false;

    setPrivatePin(savedPin);
    return true;
  };

  const markPinAccess = (id, pin) => {
    if (!id || !pin) return;
    localStorage.setItem(`${PIN_STORE_PREFIX}${id}`, pin);
    localStorage.setItem(`${PIN_DEVICE_PREFIX}${id}`, deviceId);
    localStorage.setItem(`${PIN_VERIFIED_PREFIX}${id}`, String(Date.now()));
    sessionStorage.setItem(`${PIN_SESSION_PREFIX}${id}`, "true");
  };

  const loadMe = async () => {
    if (!token) return null;

    try {
      const data = await requestJson(API.me, { headers: authHeaders() });
      const me = data?.user || data?.data || data || null;
      setUser(me);
      return me;
    } catch {
      return null;
    }
  };

  const loadChannel = async () => {
    const id = cleanId(routeChannelId) || getChannelId(location.state?.channel);

    if (!id) {
      showToast("Channel not found", "error");
      setChannelLoading(false);
      return;
    }

    try {
      setChannelLoading(true);
      await loadMe();

      let loaded = location.state?.channel || null;

      try {
        const data = await requestFirst([API.channelPrimary(id), API.channelAlt(id)], {
          headers: authHeaders(),
        });
        loaded = data?.channel || data?.data || loaded || data;
      } catch {
        // location.state channel is enough when user opened from dashboard.
      }

      if (!loaded) {
        showToast("Channel not found", "error");
        return;
      }

      setChannel(loaded);

      const loadedId = getChannelId(loaded) || id;
      const savedPinned = localStorage.getItem(`telegram_login_pinned_note_${loadedId}`) || "";
      setPinnedId(savedPinned);

      const statePin = String(location.state?.private_pin || location.state?.pin || "").trim();

      if (isPrivateChannel(loaded)) {
        if (statePin) {
          setPrivatePin(statePin);
          markPinAccess(loadedId, statePin);
          setUnlocked(true);
          return;
        }

        if (hasSavedPinAccess(loadedId)) {
          setUnlocked(true);
          return;
        }

        setUnlocked(false);
        setNotes([]);
        return;
      }

      setUnlocked(true);
    } catch (error) {
      showToast(error.message || "Unable to open channel", "error");
    } finally {
      setChannelLoading(false);
    }
  };

  const verifyPrivatePin = async () => {
    const id = channelId;
    const pin = String(pinInput || "").replace(/\D/g, "").slice(0, 8);

    if (!id) {
      showToast("Channel not found", "error");
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setPinError("Enter correct 4-8 digit PIN");
      return;
    }

    try {
      setPinChecking(true);
      setPinError("");

      if (channel?.security_pin || channel?.pin) {
        const savedPin = String(channel?.security_pin || channel?.pin || "");
        if (savedPin !== pin) throw new Error("Incorrect PIN");
      } else {
        await requestFirst([API.verifyPrivatePrimary(id), API.verifyPrivateAlt(id)], {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ pin, security_pin: pin, device_id: deviceId }),
        });
      }

      setPrivatePin(pin);
      markPinAccess(id, pin);
      setUnlocked(true);
      setPinInput("");
      showToast("Channel opened");
    } catch (error) {
      setPrivatePin("");
      setUnlocked(false);
      setPinError(error.message || "Incorrect PIN");
    } finally {
      setPinChecking(false);
    }
  };

  const getNoteImageUrl = (note) => {
    const direct = note?.image_url || note?.image || note?.imageUrl;
    if (direct) return mediaUrl(direct);

    const id = getNoteId(note);
    if (!id || !hasNoteImage(note)) return "";
    const version = parseDate(note?.updated_at || note?.created_at)?.getTime() || Date.now();
    return API.noteImagePrimary(id, version);
  };

  const getNoteFileUrl = (note) => {
    const direct = note?.file_url || note?.attachment_url || note?.fileUrl;
    if (direct) return mediaUrl(direct);

    const id = getNoteId(note);
    if (!id || !hasNoteFile(note)) return "";
    const version = parseDate(note?.updated_at || note?.created_at)?.getTime() || Date.now();
    return API.noteFilePrimary(id, version);
  };

  const getNoteFileDownloadUrl = (note) => {
    const direct = note?.file_download_url || note?.attachment_download_url || note?.download_url;
    if (direct) return mediaUrl(direct);

    const id = getNoteId(note);
    if (!id || !hasNoteFile(note)) return "";
    return API.noteFileDownloadPrimary(id);
  };

  const loadNotes = async (silent = false) => {
    if (!channelId || !unlocked) return;
    if (savingRef.current && silent) return;

    const requestId = ++requestIdRef.current;

    try {
      if (!silent) setLoading(true);

      const data = await requestFirst([API.notesPrimary(channelId), API.notesAlt(channelId)], {
        headers: authHeaders(),
      });

      if (requestId !== requestIdRef.current) return;

      const list = data?.notes || data?.messages || data?.data || [];
      const filtered = Array.isArray(list)
        ? list.filter((note) => {
            if (!note?.channel_id && !note?.channelId) return true;
            return String(note.channel_id || note.channelId) === String(channelId);
          })
        : [];

      setNotes((prev) => {
        const oldSignature = prev.map((item) => `${getNoteId(item)}:${item.updated_at || item.created_at || ""}`).join("|");
        const newSignature = filtered.map((item) => `${getNoteId(item)}:${item.updated_at || item.created_at || ""}`).join("|");
        if (silent && oldSignature === newSignature) return prev;
        return filtered;
      });
    } catch (error) {
      if (!silent) showToast(error.message || "Unable to load notes", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadChannel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeChannelId]);

  useEffect(() => {
    if (!channelId || !unlocked) return;
    loadNotes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, unlocked]);

  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (!channelId || !unlocked) return undefined;

    refreshRef.current = setInterval(() => {
      if (!document.hidden) loadNotes(true);
    }, REFRESH_MS);

    const onFocus = () => loadNotes(true);
    window.addEventListener("focus", onFocus);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, unlocked, privatePin]);

  useEffect(() => {
    if (!chatBodyRef.current) return;
    const timer = window.setTimeout(() => {
      chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [notes.length, unlocked]);

  const filteredNotes = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const dateText = `${indiaDateKey(getNoteDate(note))} ${formatIndiaDate(getNoteDate(note))} ${formatIndiaTime(getNoteDate(note))}`;
      const text = stripHtml(note?.content_html || note?.message || note?.text || "");
      const fileText = hasNoteFile(note) ? getFileName(note) : "";
      return `${text} ${dateText} ${fileText}`.toLowerCase().includes(query);
    });
  }, [notes, searchText]);

  const groupedNotes = useMemo(() => {
    const sorted = [...filteredNotes].sort((a, b) => {
      const at = parseDate(getNoteDate(a))?.getTime() || 0;
      const bt = parseDate(getNoteDate(b))?.getTime() || 0;
      return at - bt;
    });

    let lastKey = "";
    let badgeIndex = -1;

    return sorted.map((note) => {
      const dateValue = getNoteDate(note);
      const key = indiaDateKey(dateValue);
      const showDate = key !== lastKey;

      if (showDate) {
        badgeIndex += 1;
        lastKey = key;
      }

      const [badge1, badge2] = dateBadgeThemes[badgeIndex % dateBadgeThemes.length];

      return {
        note,
        dateValue,
        showDate,
        dateLabel: formatIndiaDate(dateValue),
        badge1,
        badge2,
      };
    });
  }, [filteredNotes]);

  const pinnedNote = useMemo(() => {
    if (!pinnedId) return null;
    return notes.find((note) => String(getNoteId(note)) === String(pinnedId)) || null;
  }, [notes, pinnedId]);

  const getPinnedPreview = (note) => {
    if (!note) return "Pinned message";
    const text = stripHtml(note?.content_html || "").trim();
    if (text) return text.length > 60 ? `${text.slice(0, 60)}...` : text;
    if (hasNoteImage(note)) return "Pinned image";
    if (hasNoteFile(note)) return `Pinned file: ${getFileName(note)}`;
    return "Pinned message";
  };

  const goToPinned = () => {
    const target = noteRefs.current[String(pinnedId || "")];
    if (!target) {
      showToast("Pinned message not found", "error");
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveMenuId(pinnedId);
    window.setTimeout(() => setActiveMenuId((current) => (String(current) === String(pinnedId) ? "" : current)), 1500);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      selectedRangeRef.current = range.cloneRange();
      updateActiveFormats();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectedRangeRef.current) return false;
    selection.removeAllRanges();
    selection.addRange(selectedRangeRef.current);
    return true;
  };

  const updateActiveFormats = () => {
    try {
      setActiveFormats({
        bold: Boolean(document.queryCommandState("bold")),
        underline: Boolean(document.queryCommandState("underline")),
      });
    } catch {
      setActiveFormats({ bold: false, underline: false });
    }
  };

  const execFormat = (command, value = null) => {
    editorRef.current?.focus();
    restoreSelection();

    try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(command, false, value);
    } catch {
      // ignored by browsers that block execCommand in some states
    }

    saveSelection();
    window.setTimeout(updateActiveFormats, 0);
  };

  const changeTextColor = (color) => {
    const finalColor = normalizeColor(color);
    setTextColor(finalColor);

    if (editorRef.current) {
      editorRef.current.style.setProperty("--composerColor", finalColor);
      editorRef.current.style.color = finalColor;
      editorRef.current.style.caretColor = finalColor;
    }

    execFormat("foreColor", finalColor);
  };

  const getEditorHtml = () => {
    const html = editorRef.current?.innerHTML || "";
    const plain = editorRef.current?.textContent?.trim() || "";
    if (!plain && ["<br>", "<div><br></div>"].includes(html)) return "";
    return html.trim();
  };

  const resetComposer = () => {
    if (previewImage && previewImage.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    setSelectedImage(null);
    setPreviewImage("");
    setSelectedFile(null);
    setPreviewFile(null);
    setEditingNote(null);
    setComposerMode("message");
    setTextColor("#111111");
    setActiveFormats({ bold: false, underline: false });
    setToolsOpen(false);
    setActiveMenuId("");
    selectedRangeRef.current = null;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.style.setProperty("--composerColor", "#111111");
      editorRef.current.style.color = "#111111";
    }

    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select image only", "error");
      return;
    }

    if (previewImage && previewImage.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setSelectedFile(null);
    setPreviewFile(null);
    setComposerMode(editingNote ? "image-update" : "image-caption");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewImage && previewImage.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    setSelectedFile(file);
    setPreviewFile({ name: file.name, size: file.size, type: file.type, isNew: true });
    setSelectedImage(null);
    setPreviewImage("");
    setComposerMode(editingNote ? "file-update" : "file-caption");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const canModifyNote = (note) => {
    if (viewOnly || !unlocked) return false;
    if (isOwner) return true;

    const noteUserId = getSenderUserId(note);
    const noteDeviceId = getSenderDeviceId(note);
    return Boolean(
      (currentUserId && noteUserId && currentUserId === noteUserId) ||
        (deviceId && noteDeviceId && deviceId === noteDeviceId)
    );
  };

  const startEdit = (note) => {
    if (!canModifyNote(note)) return;
    setEditingNote(note);
    setComposerMode(isTitleNote(note) ? "title" : "message");
    setTextColor(getNoteTextColor(note));
    setSelectedImage(null);
    setSelectedFile(null);
    setPreviewFile(hasNoteFile(note) ? { name: getFileName(note), size: note?.file_size || note?.attachment_size || 0, type: note?.file_mime || note?.attachment_mime || "" } : null);
    setPreviewImage(hasNoteImage(note) ? getNoteImageUrl(note) : "");
    setActiveMenuId("");

    window.setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = note?.content_html || "";
        editorRef.current.focus();
        document.execCommand("selectAll", false, null);
        document.getSelection()?.collapseToEnd?.();
      }
    }, 40);
  };

  const saveNote = async () => {
    if (!canSend) {
      showToast(viewOnly ? "View-only access" : "Channel is locked", "error");
      return;
    }

    const html = getEditorHtml();
    const plain = stripHtml(html).trim();

    if (!plain && !selectedImage && !selectedFile && !previewImage && !previewFile) {
      showToast("Type message or attach file", "error");
      return;
    }

    const noteId = editingNote ? getNoteId(editingNote) : "";
    const tempId = noteId || `temp_${Date.now()}`;
    const oldNotes = notes;
    const now = new Date().toISOString();
    const formData = new FormData();

    formData.append("channel_id", channelId);
    formData.append("content_html", html);
    formData.append("text_color", textColor || "#111111");
    formData.append("title", composerMode === "title" || (editingNote && isTitleNote(editingNote)) ? "title" : "");
    formData.append("is_title", composerMode === "title" || (editingNote && isTitleNote(editingNote)) ? "true" : "false");
    formData.append("device_id", deviceId);
    formData.append("sender_device_id", deviceId);

    if (currentUserId) {
      formData.append("user_id", currentUserId);
      formData.append("sender_user_id", currentUserId);
    }

    if (user?.full_name) formData.append("sender_name", user.full_name);
    if (selectedImage) formData.append("image", selectedImage);
    if (selectedFile) formData.append("file", selectedFile);

    const optimistic = {
      ...(editingNote || {}),
      note_id: tempId,
      channel_id: channelId,
      content_html: html,
      text_color: textColor,
      title: composerMode === "title" || (editingNote && isTitleNote(editingNote)) ? "title" : "",
      is_title: composerMode === "title" || (editingNote && isTitleNote(editingNote)),
      sender_user_id: currentUserId,
      sender_device_id: deviceId,
      sender_name: user?.full_name || user?.name || "You",
      image_url: selectedImage ? previewImage : previewImage || editingNote?.image_url || null,
      has_image: Boolean(selectedImage || previewImage || editingNote?.has_image),
      file_name: selectedFile?.name || previewFile?.name || editingNote?.file_name || null,
      file_mime: selectedFile?.type || previewFile?.type || editingNote?.file_mime || null,
      file_size: selectedFile?.size || previewFile?.size || editingNote?.file_size || null,
      has_attachment: Boolean(selectedFile || previewFile || editingNote?.has_attachment),
      created_at: editingNote?.created_at || now,
      updated_at: now,
      is_temp: true,
    };

    if (editingNote) {
      setNotes((prev) => prev.map((item) => (String(getNoteId(item)) === String(noteId) ? optimistic : item)));
    } else {
      setNotes((prev) => [...prev, optimistic]);
    }

    resetComposer();

    try {
      savingRef.current = true;
      setLoading(true);

      const urls = editingNote
        ? [API.updateNotePrimary(noteId), API.updateNoteAlt(noteId)]
        : [API.createNotePrimary, API.createNoteAlt];

      const data = await requestFirst(urls, {
        method: editingNote ? "PUT" : "POST",
        headers: authHeaders(),
        body: formData,
      });

      const saved = data?.note || data?.message || data?.data || optimistic;
      const finalNote = {
        ...optimistic,
        ...saved,
        note_id: getNoteId(saved) || tempId,
        channel_id: saved?.channel_id || channelId,
        content_html: saved?.content_html || html,
        sender_device_id: saved?.sender_device_id || saved?.device_id || deviceId,
        sender_user_id: saved?.sender_user_id || saved?.user_id || currentUserId,
        sender_name: saved?.sender_name || saved?.full_name || user?.full_name || "You",
        is_temp: false,
      };

      setNotes((prev) =>
        prev.map((item) => (String(getNoteId(item)) === String(tempId) || String(getNoteId(item)) === String(noteId) ? finalNote : item))
      );

      showToast(editingNote ? "Message updated" : "Message sent");
      window.setTimeout(() => loadNotes(true), 600);
    } catch (error) {
      setNotes(oldNotes);
      showToast(error.message || "Message failed", "error");
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  const toggleTitle = async (note) => {
    if (!canModifyNote(note)) return;
    const id = getNoteId(note);
    const nextTitle = isTitleNote(note) ? "" : "title";
    const oldNotes = notes;

    setActiveMenuId("");
    setNotes((prev) =>
      prev.map((item) =>
        String(getNoteId(item)) === String(id)
          ? { ...item, title: nextTitle, is_title: nextTitle === "title", updated_at: new Date().toISOString() }
          : item
      )
    );

    try {
      const formData = new FormData();
      formData.append("channel_id", channelId);
      formData.append("content_html", note?.content_html || "");
      formData.append("text_color", getNoteTextColor(note));
      formData.append("title", nextTitle);
      formData.append("is_title", nextTitle === "title" ? "true" : "false");
      formData.append("device_id", getSenderDeviceId(note) || deviceId);
      formData.append("sender_device_id", getSenderDeviceId(note) || deviceId);

      await requestFirst([API.updateNotePrimary(id), API.updateNoteAlt(id)], {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      showToast(nextTitle ? "Title added" : "Normal text");
    } catch (error) {
      setNotes(oldNotes);
      showToast(error.message || "Update failed", "error");
    }
  };

  const togglePin = (note) => {
    if (!channelId) return;
    const id = getNoteId(note);
    const nextId = String(pinnedId) === String(id) ? "" : id;
    setPinnedId(nextId);
    if (nextId) localStorage.setItem(pinnedKey, nextId);
    else localStorage.removeItem(pinnedKey);
    setActiveMenuId("");
    showToast(nextId ? "Message pinned" : "Pin removed");
  };

  const confirmDelete = (note) => {
    if (!canModifyNote(note)) return;
    setActiveMenuId("");
    setConfirmBox({
      show: true,
      title: "Delete?",
      message: "Delete this message?",
      action: () => deleteNote(note),
    });
  };

  const closeConfirm = () => setConfirmBox({ show: false, title: "", message: "", action: null });

  const deleteNote = async (note) => {
    const id = getNoteId(note);
    const oldNotes = notes;

    setNotes((prev) => prev.filter((item) => String(getNoteId(item)) !== String(id)));
    if (String(pinnedId) === String(id)) {
      setPinnedId("");
      if (pinnedKey) localStorage.removeItem(pinnedKey);
    }

    try {
      setLoading(true);
      await requestFirst([API.deleteNotePrimary(id), API.deleteNoteAlt(id)], {
        method: "DELETE",
        headers: authHeaders(),
      });
      showToast("Message deleted");
    } catch (error) {
      setNotes(oldNotes);
      showToast(error.message || "Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadUrl = (url, fileName) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "download";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openFile = (event, note) => {
    event.preventDefault();
    event.stopPropagation();
    const url = isPreviewableFile(note) ? getNoteFileUrl(note) : getNoteFileDownloadUrl(note);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const backToDashboard = () => {
    resetComposer();
    if (window.history.length > 1) navigate(-1);
    else navigate("/telegram-dashboard", { replace: true });
  };

  const openLogoPreview = () => {
    const url = getChannelLogo(channel);
    if (url) setFullImage(url);
  };

  const handleImageError = (event) => {
    event.currentTarget.style.display = "none";
  };

  const renderLogo = (className = "") => {
    const logo = getChannelLogo(channel);

    return (
      <div className={`tn-logo ${className}`} onClick={openLogoPreview} role="button" tabIndex={0}>
        {logo && <img src={logo} alt="Channel logo" onError={handleImageError} />}
        <span>{getInitial(getChannelName(channel))}</span>
      </div>
    );
  };

  const renderPinScreen = () => (
    <main className="tn-unlock-screen">
      <section className="tn-unlock-card">
        {renderLogo("tn-unlock-logo")}
        <div className="tn-unlock-lock">🔐</div>
        <h2>Private Channel</h2>
        <p>Enter PIN to open <b>{getChannelName(channel)}</b></p>
        <input
          value={pinInput}
          inputMode="numeric"
          maxLength="8"
          autoFocus
          placeholder="0000"
          onChange={(event) => {
            setPinInput(event.target.value.replace(/\D/g, "").slice(0, 8));
            setPinError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") verifyPrivatePin();
          }}
        />
        {pinError && <div className="tn-pin-error">{pinError}</div>}
        <button type="button" className="tn-open-private" disabled={pinChecking} onClick={verifyPrivatePin}>
          {pinChecking ? "Checking..." : "Open Channel"}
        </button>
        <button type="button" className="tn-back-light" onClick={backToDashboard}>Back</button>
      </section>
    </main>
  );

  return (
    <div className="tn-screen" onClick={() => setActiveMenuId("")}> 
      <div className="tn-phone">
        <header className="tn-header">
          <button type="button" className="tn-back-btn" onClick={backToDashboard} aria-label="Back">
            ‹
          </button>

          <div
            className={`tn-brand ${brandPop ? "brand-pop" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              setBrandPop(true);
              setTimeout(() => setBrandPop(false), 420);
            }}
          >
            {renderLogo()}
            <div className="tn-brand-text">
              <h1>{channelLoading ? "Opening..." : getChannelName(channel)}</h1>
              <p>{getChannelDescription(channel)}</p>
            </div>
          </div>

          {unlocked && (
            <button
              type="button"
              className={`tn-search-btn ${searchOpen ? "active" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                setSearchOpen((prev) => !prev);
                setSearchText("");
              }}
              aria-label="Search"
            >
              🔍
            </button>
          )}
        </header>

        {channelLoading ? (
          <main className="tn-loading-view">
            <div className="tn-loader" />
            <p>Opening channel...</p>
          </main>
        ) : privateChannel && !unlocked ? (
          renderPinScreen()
        ) : (
          <>
            {searchOpen && (
              <div className="tn-search-box" onClick={(event) => event.stopPropagation()}>
                <span>🔍</span>
                <input
                  value={searchText}
                  placeholder="Search text, file, or date..."
                  autoFocus
                  onChange={(event) => setSearchText(event.target.value)}
                />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchText(""); }}>×</button>
              </div>
            )}

            {searchOpen && searchText.trim() && (
              <div className="tn-search-result">
                Showing {filteredNotes.length} result{filteredNotes.length === 1 ? "" : "s"} for “{searchText.trim()}”
              </div>
            )}

            {pinnedNote && (
              <button type="button" className="tn-pinned" onClick={goToPinned}>
                <span>📌</span>
                <b>Pinned</b>
                <strong>{getPinnedPreview(pinnedNote)}</strong>
              </button>
            )}

            <main ref={chatBodyRef} className="tn-chat-body" onClick={() => { setActiveMenuId(""); }}>
              {groupedNotes.length === 0 && (
                <div className="tn-empty">
                  <div>✦</div>
                  <h3>{searchText ? "No match found" : "No notes yet"}</h3>
                  <p>{viewOnly ? "You have view-only access" : "Start typing below"}</p>
                </div>
              )}

              {groupedNotes.map(({ note, dateValue, showDate, dateLabel, badge1, badge2 }) => {
                const noteId = getNoteId(note);
                const hasImage = hasNoteImage(note);
                const hasFile = hasNoteFile(note) && !hasImage;
                const hasText = Boolean(stripHtml(note?.content_html || "").trim());
                const myNote = Boolean(
                  (currentUserId && getSenderUserId(note) && currentUserId === getSenderUserId(note)) ||
                    (deviceId && getSenderDeviceId(note) && deviceId === getSenderDeviceId(note))
                );
                const showSender = !privateChannel && !myNote && getSenderName(note);
                const canModify = canModifyNote(note);
                const menuOpen = String(activeMenuId) === String(noteId);
                const pinned = String(pinnedId) === String(noteId);

                return (
                  <div
                    className="tn-note-block"
                    key={noteId || `${dateValue}_${Math.random()}`}
                    ref={(element) => {
                      if (element && noteId) noteRefs.current[String(noteId)] = element;
                      else if (noteId) delete noteRefs.current[String(noteId)];
                    }}
                  >
                    {showDate && (
                      <div className="tn-date-separator">
                        <span style={{ "--badge1": badge1, "--badge2": badge2 }}>{dateLabel}</span>
                      </div>
                    )}

                    <div className={`tn-message-line ${menuOpen ? "active" : ""}`}>
                      <article
                        className={`tn-message-card ${hasImage ? "image-card" : ""} ${hasFile ? "file-card-wrap" : ""} ${isTitleNote(note) ? "title-card" : ""} ${pinned ? "pinned-card" : ""}`}
                        style={{ "--noteColor": getNoteTextColor(note) }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {showSender && <div className="tn-sender-name"># {getSenderName(note)} -</div>}
                        {pinned && <span className="tn-pin-chip">📌</span>}

                        {!viewOnly && (
                          <button
                            type="button"
                            className="tn-message-menu-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveMenuId(menuOpen ? "" : noteId);
                            }}
                            aria-label="Message options"
                          >
                            ⋮
                          </button>
                        )}

                        {hasImage && (
                          <div className="tn-image-wrap">
                            <img
                              src={getNoteImageUrl(note)}
                              alt="note"
                              className="tn-message-image"
                              loading="lazy"
                              onClick={() => setFullImage(getNoteImageUrl(note))}
                              onError={(event) => {
                                const alt = API.noteImageAlt(noteId, Date.now());
                                if (event.currentTarget.src !== alt) event.currentTarget.src = alt;
                              }}
                            />
                            {hasText && (
                              <div
                                className="tn-message-text tn-image-caption"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content_html) }}
                              />
                            )}
                          </div>
                        )}

                        {hasFile && (
                          <div className="tn-file-wrap">
                            <button type="button" className="tn-file-card" onClick={(event) => openFile(event, note)}>
                              <span className="tn-file-badge">{getFileTypeLabel(note)}</span>
                              <span className="tn-file-info">
                                <b>{getFileName(note)}</b>
                                <small>{formatFileSize(note.file_size || note.attachment_size)}{formatFileSize(note.file_size || note.attachment_size) ? " • " : ""}{isPreviewableFile(note) ? "Open / View" : "Download"}</small>
                              </span>
                              <span className="tn-file-download">↧</span>
                            </button>
                            {hasText && (
                              <div
                                className="tn-message-text tn-file-caption"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content_html) }}
                              />
                            )}
                          </div>
                        )}

                        {hasText && !hasImage && !hasFile && (
                          <div
                            className={`tn-message-text ${isTitleNote(note) ? "tn-title-text" : ""}`}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content_html) }}
                          />
                        )}

                        <time className="tn-message-time">{formatIndiaTime(dateValue)}</time>
                      </article>

                      {menuOpen && (
                        <div className="tn-action-row" onClick={(event) => event.stopPropagation()}>
                          {canModify && (
                            <>
                              <button type="button" className="update" onClick={() => startEdit(note)}>
                                Update
                              </button>
                              {!hasImage && !hasFile && (
                                <button type="button" className="title" onClick={() => toggleTitle(note)}>
                                  {isTitleNote(note) ? "Normal" : "Title"}
                                </button>
                              )}
                            </>
                          )}

                          {hasImage && (
                            <button type="button" className="download" onClick={() => downloadUrl(getNoteImageUrl(note), `image-${noteId}.jpg`)}>
                              Download
                            </button>
                          )}

                          {hasFile && (
                            <button type="button" className="download" onClick={() => downloadUrl(getNoteFileDownloadUrl(note), getFileName(note))}>
                              Download
                            </button>
                          )}

                          {!viewOnly && (
                            <button type="button" className={`pin ${pinned ? "active" : ""}`} onClick={() => togglePin(note)}>
                              {pinned ? "Unpin" : "Pin"}
                            </button>
                          )}

                          {canModify && (
                            <button type="button" className="delete" onClick={() => confirmDelete(note)}>
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </main>

            {previewImage && (
              <div className="tn-preview-strip">
                <img src={previewImage} alt="preview" />
                <span>{selectedImage?.name || "Current image"}</span>
                <button type="button" onClick={() => { setSelectedImage(null); setPreviewImage(""); }}>×</button>
              </div>
            )}

            {previewFile && (
              <div className="tn-preview-strip file-preview">
                <div>{getFileTypeLabel(previewFile)}</div>
                <span>{previewFile.name || "Selected file"}{previewFile.size ? ` • ${formatFileSize(previewFile.size)}` : ""}</span>
                <button type="button" onClick={() => { setSelectedFile(null); setPreviewFile(null); }}>×</button>
              </div>
            )}

            {editingNote && (
              <div className="tn-edit-strip">
                <span>{composerMode === "title" ? "Editing title" : "Updating message"}</span>
                <button type="button" onClick={resetComposer}>Cancel</button>
              </div>
            )}

            {!viewOnly && (
              <footer className="tn-composer" onClick={(event) => event.stopPropagation()}>
                <div className="tn-tools-row">
                  <button
                    type="button"
                    className={`tn-tools-ball ${toolsOpen ? "active" : ""}`}
                    onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
                    onClick={() => setToolsOpen((prev) => !prev)}
                    aria-label="Tools"
                  >
                    <span />
                  </button>

                  {toolsOpen && (
                    <div className="tn-tools-popover" onMouseDown={(event) => event.preventDefault()}>
                      <button type="button" className={activeFormats.bold ? "active" : ""} onMouseDown={(event) => { event.preventDefault(); execFormat("bold"); }}>
                        <b>B</b>
                      </button>
                      <button type="button" className={activeFormats.underline ? "active" : ""} onMouseDown={(event) => { event.preventDefault(); execFormat("underline"); }}>
                        <u>U</u>
                      </button>
                      <input ref={colorInputRef} type="color" hidden value={textColor} onChange={(event) => changeTextColor(event.target.value)} />
                      <button type="button" className={textColor !== "#111111" ? "active color" : "color"} onMouseDown={(event) => { event.preventDefault(); saveSelection(); colorInputRef.current?.click(); }} style={{ "--pickedColor": textColor }}>
                        <img src={COLOR_ICON} alt="color" />
                      </button>
                      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={selectImage} />
                      <button type="button" className={previewImage ? "active" : ""} onClick={() => imageInputRef.current?.click()}>
                        <img src={ATTACH_ICON} alt="image" />
                      </button>
                      <input ref={fileInputRef} type="file" hidden onChange={selectFile} />
                      <button type="button" className={previewFile ? "active" : ""} onClick={() => fileInputRef.current?.click()}>
                        <img src={FILE_ICON} alt="file" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="tn-input-row">
                  <div
                    ref={editorRef}
                    className="tn-text-input"
                    contentEditable
                    data-placeholder={
                      composerMode === "image-caption"
                        ? "Add image description..."
                        : composerMode === "file-caption"
                          ? "Add file description..."
                          : composerMode === "title"
                            ? "Type title..."
                            : "Type message..."
                    }
                    style={{ "--composerColor": textColor }}
                    onFocus={saveSelection}
                    onMouseUp={saveSelection}
                    onKeyUp={saveSelection}
                    onInput={saveSelection}
                    onBlur={saveSelection}
                    onPaste={(event) => {
                      event.preventDefault();
                      const text = event.clipboardData.getData("text/plain");
                      document.execCommand("insertText", false, text);
                      saveSelection();
                    }}
                  />
                  <button type="button" className="tn-send-btn" disabled={loading} onClick={saveNote} aria-label="Send">
                    {loading ? "…" : editingNote ? "✓" : "➤"}
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
      </div>

      {fullImage && (
        <div className="tn-image-overlay" onClick={() => setFullImage("")} role="dialog" aria-modal="true">
          <div className="tn-image-viewer" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="tn-image-close" onClick={() => setFullImage("")}>×</button>
            <img src={fullImage} alt="Full preview" />
          </div>
        </div>
      )}

      {toast.show && (
        <div className="tn-toast-layer">
          <div className={`tn-toast ${toast.type}`}>
            <b>{toast.type === "success" ? "✓" : "!"}</b>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {confirmBox.show && (
        <div className="tn-confirm-layer" onClick={closeConfirm}>
          <div className="tn-confirm" onClick={(event) => event.stopPropagation()}>
            <h3>{confirmBox.title}</h3>
            <p>{confirmBox.message}</p>
            <div>
              <button type="button" className="cancel" onClick={closeConfirm}>Cancel</button>
              <button type="button" className="yes" onClick={() => { const action = confirmBox.action; closeConfirm(); action?.(); }}>Yes</button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
@import url("https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Poppins:wght@400;500;600;700;800;900&display=swap");

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

button,
input {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.tn-screen {
  width: 100vw;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: stretch;
  overflow: hidden;
  background:
    radial-gradient(circle at 9% 2%, rgba(59, 130, 246, 0.14), transparent 32%),
    radial-gradient(circle at 94% 12%, rgba(244, 114, 182, 0.10), transparent 32%),
    linear-gradient(135deg, #f8fbff 0%, #eef3fb 100%);
  color: #111827;
  font-family: "Poppins", "Segoe UI", Arial, sans-serif;
}

.tn-phone {
  width: min(460px, 100vw);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  position: relative;
  box-shadow: 0 28px 90px rgba(15, 23, 42, 0.18);
}

.tn-header {
  flex: 0 0 auto;
  min-height: 118px;
  padding: calc(18px + env(safe-area-inset-top, 0px)) 12px 14px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 10px;
  background:
    radial-gradient(circle at 10% 0%, rgba(219, 234, 254, 0.92), transparent 42%),
    linear-gradient(135deg, #f8fbff 0%, #fff7ed 48%, #f5f3ff 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  z-index: 40;
}

.tn-back-btn,
.tn-search-btn {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.09);
}

.tn-back-btn {
  font-size: 38px;
  line-height: 1;
  font-weight: 900;
  padding-bottom: 5px;
}

.tn-search-btn {
  font-size: 19px;
}

.tn-search-btn.active {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.tn-brand {
  min-width: 0;
  min-height: 74px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px 13px 8px 9px;
  border-radius: 26px;
  border: 1.8px solid rgba(244, 63, 94, 0.88);
  outline: 1px solid rgba(248, 113, 113, 0.18);
  outline-offset: 2px;
  background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,247,237,0.96));
  box-shadow: 0 13px 28px rgba(190, 18, 60, 0.12), inset 0 1px 0 rgba(255,255,255,0.95);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.tn-brand:active {
  transform: scale(0.985);
}

.tn-brand.brand-pop {
  animation: tnBrandPop 0.42s cubic-bezier(.2,.9,.3,1) both;
}

@keyframes tnBrandPop {
  0% { transform: scale(1); }
  35% { transform: scale(1.035) translateY(-1px); }
  72% { transform: scale(0.992); }
  100% { transform: scale(1); }
}

.tn-logo {
  width: 58px;
  height: 58px;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  padding: 4px;
  background: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 23px rgba(15, 23, 42, 0.13);
  color: #2563eb;
  flex-shrink: 0;
}

.tn-logo img {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
  background: #ffffff;
  display: block;
}

.tn-logo span {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #ccfbf1);
  color: #1d4ed8;
  font-size: 22px;
  font-weight: 950;
}

.tn-brand-text {
  min-width: 0;
  display: grid;
  gap: 5px;
  align-content: center;
}

.tn-brand-text h1 {
  margin: 0;
  color: #172554;
  font-size: clamp(15px, 4.2vw, 20px);
  line-height: 1.14;
  font-weight: 950;
  letter-spacing: 0.15px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.tn-brand-text p {
  margin: 0;
  color: #334155;
  font-size: clamp(10.5px, 3vw, 13px);
  line-height: 1.18;
  font-weight: 700;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.tn-loading-view,
.tn-unlock-screen {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 22px;
  background: linear-gradient(135deg, #f8fbff, #eef6ff);
}

.tn-loader {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 4px solid #dbeafe;
  border-top-color: #2563eb;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.tn-loading-view p {
  color: #475569;
  font-size: 13px;
  font-weight: 800;
}

.tn-unlock-card {
  width: min(330px, 100%);
  padding: 22px 18px 17px;
  border-radius: 28px;
  background: rgba(255,255,255,0.96);
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.17);
  text-align: center;
}

.tn-unlock-logo {
  margin: 0 auto 10px;
  width: 78px;
  height: 78px;
}

.tn-unlock-lock {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  margin: -4px auto 9px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 20px;
}

.tn-unlock-card h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 950;
}

.tn-unlock-card p {
  margin: 8px 0 13px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 700;
}

.tn-unlock-card p b {
  color: #1d4ed8;
}

.tn-unlock-card input {
  width: 160px;
  height: 50px;
  border: 1px solid #cbd5e1;
  border-radius: 17px;
  background: white;
  outline: none;
  text-align: center;
  color: #0f172a;
  font-size: 23px;
  font-weight: 950;
  letter-spacing: 6px;
}

.tn-unlock-card input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.13);
}

.tn-pin-error {
  margin-top: 8px;
  color: #dc2626;
  font-size: 12px;
  font-weight: 900;
}

.tn-open-private,
.tn-back-light {
  width: 100%;
  height: 42px;
  margin-top: 10px;
  border: 0;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 950;
}

.tn-open-private {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: white;
  box-shadow: 0 14px 28px rgba(37,99,235,0.20);
}

.tn-back-light {
  margin-top: 8px;
  background: #f1f5f9;
  color: #475569;
}

.tn-search-box {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  background: rgba(255,255,255,0.98);
  border-bottom: 1px solid #e2e8f0;
  z-index: 30;
}

.tn-search-box span,
.tn-search-box button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 13px;
  background: #eff6ff;
  display: grid;
  place-items: center;
  color: #2563eb;
  font-weight: 900;
}

.tn-search-box input {
  min-width: 0;
  height: 39px;
  border: 1px solid #dbe4f0;
  border-radius: 16px;
  outline: none;
  background: #f8fafc;
  color: #0f172a;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 750;
}

.tn-search-box input:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
}

.tn-search-result {
  flex: 0 0 auto;
  padding: 6px 13px 8px;
  background: #ecfeff;
  color: #0f766e;
  font-size: 11.5px;
  font-weight: 850;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tn-pinned {
  flex: 0 0 auto;
  width: calc(100% - 20px);
  margin: 8px auto 0;
  min-height: 37px;
  border: 1px solid rgba(20, 184, 166, 0.22);
  border-radius: 16px;
  background: rgba(255,255,255,0.98);
  display: grid;
  grid-template-columns: 24px auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  box-shadow: 0 9px 24px rgba(15,23,42,0.08);
}

.tn-pinned span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ccfbf1;
}

.tn-pinned b {
  color: #0f766e;
  font-size: 10.5px;
  font-weight: 950;
  text-transform: uppercase;
}

.tn-pinned strong {
  min-width: 0;
  color: #334155;
  font-size: 11.5px;
  font-weight: 850;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tn-chat-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 8px 14px;
  background: #ffffff;
  scroll-behavior: smooth;
}

.tn-chat-body::-webkit-scrollbar {
  width: 4px;
}

.tn-chat-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.28);
}

.tn-empty {
  width: fit-content;
  max-width: 82%;
  margin: 80px auto 0;
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 19px 21px;
}

.tn-empty div {
  width: 44px;
  height: 44px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: white;
  font-size: 20px;
}

.tn-empty h3 {
  margin: 0 0 5px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.tn-empty p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.tn-note-block {
  width: 100%;
}

.tn-date-separator {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 7px 0 13px;
  pointer-events: none;
}

.tn-date-separator span {
  min-height: 29px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 17px;
  border-radius: 10px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--badge1), var(--badge2));
  box-shadow: 0 8px 20px rgba(15,23,42,0.14);
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: 0.2px;
}

.tn-message-line {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 0 18px;
  animation: tnMessageIn 0.18s ease both;
}

@keyframes tnMessageIn {
  from { opacity: 0.72; transform: translateY(5px) scale(0.992); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.tn-message-card {
  position: relative;
  width: fit-content;
  max-width: min(88vw, 395px);
  min-width: min(255px, calc(100vw - 56px));
  padding: 13px 43px 24px 17px;
  border-radius: 0 22px 22px 22px;
  background: #f3f3f3;
  color: var(--noteColor, #111111);
  box-shadow: none;
  overflow: visible;
  text-align: left;
}

.tn-message-card.image-card,
.tn-message-card.file-card-wrap {
  min-width: 110px;
  max-width: min(88vw, 370px);
  padding: 8px 8px 23px;
  border-radius: 22px;
}

.tn-message-card.title-card {
  border-left: 4px solid #f97316;
  background: #fff7ed;
}

.tn-message-card.pinned-card {
  outline: 2px solid rgba(20, 184, 166, 0.24);
  outline-offset: 2px;
}

.tn-pin-chip {
  position: absolute;
  top: -11px;
  left: 12px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(15,23,42,0.10);
  z-index: 12;
}

.tn-sender-name {
  margin: 0 24px 7px 0;
  color: #475569;
  font-size: 9.5px;
  line-height: 1.1;
  font-weight: 850;
  letter-spacing: 0.25px;
}

.tn-message-menu-btn {
  position: absolute;
  top: 6px;
  right: 7px;
  z-index: 10;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #6b7280;
  display: grid;
  place-items: center;
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
}

.tn-message-menu-btn:hover,
.tn-message-menu-btn:focus {
  background: rgba(255,255,255,0.56);
  outline: none;
}

.tn-message-text,
.tn-message-text *,
.tn-text-input,
.tn-text-input * {
  font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
  font-size: clamp(18px, 4.75vw, 23px) !important;
  line-height: 1.54 !important;
  font-weight: 500 !important;
  letter-spacing: 1.35px !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
  margin: 0 !important;
  padding: 0 !important;
  color: inherit !important;
}

.tn-message-text b,
.tn-message-text strong,
.tn-message-text span[style*="font-weight"] {
  font-weight: 900 !important;
}

.tn-message-text u,
.tn-message-text span[style*="underline"] {
  text-decoration: underline !important;
  text-decoration-thickness: 1.5px !important;
  text-underline-offset: 4px !important;
}

.tn-title-text,
.tn-title-text * {
  font-weight: 850 !important;
  color: #c2410c !important;
}

.tn-image-wrap,
.tn-file-wrap {
  width: fit-content;
  max-width: min(82vw, 346px);
  border-radius: 18px;
}

.tn-message-image {
  width: auto;
  max-width: min(82vw, 346px);
  max-height: 52dvh;
  object-fit: contain;
  border-radius: 18px;
  background: transparent;
  display: block;
  cursor: zoom-in;
}

.tn-image-caption,
.tn-file-caption {
  max-width: min(82vw, 346px);
  margin-top: 8px !important;
  padding: 0 2px !important;
}

.tn-file-card {
  width: min(82vw, 330px);
  min-height: 60px;
  border: 1px solid rgba(226,232,240,0.92);
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 9px;
  padding: 8px;
  text-align: left;
}

.tn-file-badge {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: white;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 950;
}

.tn-file-info {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.tn-file-info b {
  color: #0f172a;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 950;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tn-file-info small {
  color: #64748b;
  font-size: 10.5px;
  font-weight: 750;
}

.tn-file-download {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 950;
}

.tn-message-time {
  position: absolute;
  right: 12px;
  bottom: 7px;
  z-index: 8;
  color: #8a8a8a;
  font-family: "Poppins", Arial, sans-serif;
  font-size: 9px;
  line-height: 1;
  font-weight: 800;
  white-space: nowrap;
}

.tn-action-row {
  width: fit-content;
  max-width: min(92vw, 350px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 6px;
  padding: 5px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: rgba(255,255,255,0.98);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
  animation: tnActionsIn 0.15s ease both;
}

@keyframes tnActionsIn {
  from { opacity: 0; transform: translateY(-3px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.tn-action-row button {
  height: 28px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 10.5px;
  line-height: 1;
  font-weight: 900;
}

.tn-action-row .update { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.tn-action-row .title { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }
.tn-action-row .download { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
.tn-action-row .pin { background: #ccfbf1; color: #0f766e; border-color: #99f6e4; }
.tn-action-row .pin.active { background: #0f766e; color: #ffffff; }
.tn-action-row .delete { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

.tn-preview-strip,
.tn-edit-strip {
  flex: 0 0 auto;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: rgba(255,255,255,0.98);
  border-top: 1px solid #e2e8f0;
}

.tn-preview-strip img,
.tn-preview-strip > div {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex-shrink: 0;
  object-fit: cover;
}

.tn-preview-strip > div {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f97316, #f59e0b);
  color: white;
  font-size: 10px;
  font-weight: 950;
}

.tn-preview-strip span,
.tn-edit-strip span {
  flex: 1;
  min-width: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tn-preview-strip button,
.tn-edit-strip button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 11px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 18px;
  line-height: 1;
  font-weight: 900;
}

.tn-edit-strip {
  background: #eff6ff;
}

.tn-edit-strip span {
  color: #2563eb;
}

.tn-edit-strip button {
  width: auto;
  padding: 0 12px;
  font-size: 11.5px;
  background: #2563eb;
  color: white;
}

.tn-composer {
  flex: 0 0 auto;
  z-index: 30;
  padding: 7px 8px calc(8px + env(safe-area-inset-bottom, 0px));
  background: rgba(240, 242, 245, 0.98);
  border-top: 1px solid rgba(203, 213, 225, 0.76);
  backdrop-filter: blur(14px);
}

.tn-tools-row {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px 5px;
}

.tn-tools-ball {
  width: 30px;
  height: 30px;
  min-width: 30px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316, #fb923c);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 19px rgba(249, 115, 22, 0.24);
}

.tn-tools-ball span,
.tn-tools-ball span::before,
.tn-tools-ball span::after {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: white;
  display: block;
  content: "";
  position: relative;
}

.tn-tools-ball span::before { position: absolute; left: -8px; top: 0; }
.tn-tools-ball span::after { position: absolute; left: 8px; top: 0; }

.tn-tools-ball.active {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  transform: scale(1.04);
}

.tn-tools-popover {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100vw - 58px);
  overflow-x: auto;
  scrollbar-width: none;
  padding: 5px 7px;
  border-radius: 15px;
  background: rgba(255,255,255,0.98);
  border: 1px solid #dbe4f0;
  box-shadow: 0 11px 28px rgba(15,23,42,0.12);
  animation: tnToolsIn 0.16s ease both;
}

.tn-tools-popover::-webkit-scrollbar { display: none; }

@keyframes tnToolsIn {
  from { opacity: 0; transform: translateX(-5px) scale(0.96); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

.tn-tools-popover button {
  position: relative;
  width: 34px;
  height: 34px;
  min-width: 34px;
  border: 1px solid #dbe4f0;
  border-radius: 11px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: #334155;
  display: grid;
  place-items: center;
  box-shadow: 0 5px 13px rgba(15,23,42,0.07);
}

.tn-tools-popover button.active {
  border-color: #38bdf8;
  background: linear-gradient(145deg, #ecfeff, #eff6ff);
  outline: 2px solid rgba(14,165,233,0.11);
}

.tn-tools-popover button.active::before {
  content: "";
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0ea5e9;
}

.tn-tools-popover img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}

.tn-tools-popover .color::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 4px;
  height: 3px;
  border-radius: 999px;
  background: var(--pickedColor, #111111);
}

.tn-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tn-text-input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  max-height: 126px;
  overflow-y: auto;
  outline: none;
  border: 1.6px solid rgba(37, 99, 235, 0.56);
  border-radius: 22px;
  background: #ffffff;
  color: var(--composerColor, #111111) !important;
  caret-color: var(--composerColor, #111111);
  padding: 10px 14px;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.07), 0 5px 14px rgba(15,23,42,0.06);
}

.tn-text-input:focus {
  border-color: rgba(37, 99, 235, 0.9);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.13), 0 7px 18px rgba(37,99,235,0.10);
}

.tn-text-input:empty::before {
  content: attr(data-placeholder);
  color: #94a3b8;
  font-weight: 500;
}

.tn-text-input b,
.tn-text-input strong,
.tn-text-input span[style*="font-weight"] {
  font-weight: 900 !important;
}

.tn-text-input u,
.tn-text-input span[style*="underline"] {
  text-decoration: underline !important;
  text-decoration-thickness: 1.5px !important;
  text-underline-offset: 4px !important;
}

.tn-send-btn {
  width: 45px;
  height: 45px;
  min-width: 45px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 19px;
  font-weight: 950;
  box-shadow: 0 9px 21px rgba(14,165,233,0.25);
}

.tn-send-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.tn-image-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 54px 18px 28px;
  background: rgba(0, 0, 0, 0.84);
}

.tn-image-viewer {
  position: relative;
  max-width: min(92vw, 560px);
  max-height: 80dvh;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: tnImagePop 0.2s ease both;
}

@keyframes tnImagePop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.tn-image-viewer img {
  max-width: min(92vw, 560px);
  max-height: 76dvh;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  border-radius: 16px;
  background: transparent;
  display: block;
  box-shadow: 0 20px 60px rgba(0,0,0,0.34);
}

.tn-image-close {
  position: absolute;
  top: -39px;
  right: 0;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.97);
  color: #111827;
  display: grid;
  place-items: center;
  font-size: 25px;
  line-height: 1;
  font-weight: 800;
  box-shadow: 0 10px 25px rgba(0,0,0,0.22);
}

.tn-toast-layer,
.tn-confirm-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.tn-toast {
  width: auto;
  min-width: 132px;
  max-width: min(240px, calc(100vw - 46px));
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 13px;
  border-radius: 999px;
  background: rgba(255,255,255,0.98);
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 34px rgba(15,23,42,0.16);
  animation: tnToastIn 0.18s ease both;
}

@keyframes tnToastIn {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.tn-toast b {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 12px;
}

.tn-toast.success b {
  background: #dcfce7;
  color: #16a34a;
}

.tn-toast.error b {
  background: #fee2e2;
  color: #dc2626;
}

.tn-toast span {
  color: #0f172a;
  font-size: 12px;
  line-height: 1.15;
  font-weight: 900;
  white-space: nowrap;
}

.tn-confirm-layer {
  z-index: 2090;
  padding: 18px;
  pointer-events: auto;
  background: rgba(15, 23, 42, 0.14);
}

.tn-confirm {
  width: auto;
  min-width: 188px;
  max-width: 236px;
  padding: 11px 12px;
  border-radius: 17px;
  background: rgba(255,255,255,0.98);
  border: 1px solid #e2e8f0;
  box-shadow: 0 16px 42px rgba(15,23,42,0.18);
  text-align: center;
}

.tn-confirm h3 {
  margin: 0 0 4px;
  color: #111827;
  font-size: 13px;
  line-height: 1.15;
  font-weight: 950;
}

.tn-confirm p {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.25;
  font-weight: 750;
}

.tn-confirm div {
  display: flex;
  gap: 7px;
}

.tn-confirm button {
  flex: 1;
  height: 29px;
  border: 0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 950;
}

.tn-confirm .cancel {
  background: #f1f5f9;
  color: #475569;
}

.tn-confirm .yes {
  background: #dc2626;
  color: #ffffff;
}

@media (max-width: 480px) {
  .tn-phone {
    width: 100vw;
    box-shadow: none;
  }

  .tn-header {
    min-height: 116px;
    grid-template-columns: 40px minmax(0, 1fr) 40px;
    gap: 8px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .tn-back-btn,
  .tn-search-btn {
    width: 40px;
    height: 40px;
    border-radius: 15px;
  }

  .tn-brand {
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 10px;
    min-height: 72px;
    border-radius: 24px;
    padding: 8px 11px 8px 8px;
  }

  .tn-logo {
    width: 54px;
    height: 54px;
  }

  .tn-chat-body {
    padding-left: 7px;
    padding-right: 7px;
  }

  .tn-message-line {
    margin-bottom: 18px;
  }

  .tn-message-card,
  .tn-message-card.image-card,
  .tn-message-card.file-card-wrap {
    max-width: calc(100vw - 34px);
  }

  .tn-message-card {
    min-width: min(270px, calc(100vw - 42px));
    padding: 12px 39px 24px 16px;
  }

  .tn-image-wrap,
  .tn-file-wrap,
  .tn-message-image,
  .tn-image-caption,
  .tn-file-caption,
  .tn-file-card {
    max-width: calc(100vw - 52px);
  }

  .tn-message-text,
  .tn-message-text *,
  .tn-text-input,
  .tn-text-input * {
    font-size: clamp(17px, 5.15vw, 22px) !important;
    line-height: 1.54 !important;
  }

  .tn-image-viewer,
  .tn-image-viewer img {
    max-width: 92vw;
    max-height: 74dvh;
  }
}

@media (max-width: 360px) {
  .tn-header {
    min-height: 110px;
    gap: 7px;
  }

  .tn-brand {
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 8px;
    min-height: 68px;
  }

  .tn-logo {
    width: 48px;
    height: 48px;
  }

  .tn-brand-text h1 {
    font-size: 14px;
  }

  .tn-brand-text p {
    font-size: 10px;
  }

  .tn-message-card {
    min-width: min(252px, calc(100vw - 38px));
  }

  .tn-tools-popover {
    gap: 5px;
    padding: 4px 6px;
  }

  .tn-tools-popover button {
    width: 31px;
    height: 31px;
    min-width: 31px;
  }
}

@media (min-width: 768px) {
  .tn-screen {
    padding: 0;
  }

  .tn-phone {
    width: 460px;
    max-width: 460px;
  }

  .tn-message-text,
  .tn-message-text *,
  .tn-text-input,
  .tn-text-input * {
    font-size: 22px !important;
  }
}
`;
