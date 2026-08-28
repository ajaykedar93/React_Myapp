import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import "./Teligram.css";

const DEFAULT_BACKEND_URL = "https://express-backend-myapp.onrender.com";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000"
    : DEFAULT_BACKEND_URL)
).replace(/\/$/, "");

const PUBLIC_USER_ID = 7;

const DEVICE_ID_KEY = `notes_management_device_id_${PUBLIC_USER_ID}`;
const SELECTED_CHANNEL_PIN_KEY = "selected_channel_pin";
const SELECTED_CHANNEL_TRUST_KEY = "selected_channel_trusted_device";
const SELECTED_CHANNEL_SKIP_VERIFY_KEY = "selected_channel_skip_pin_verify";
const SELECTED_CHANNEL_DEVICE_KEY = "selected_channel_device_id";
const SELECTED_CHANNEL_VERIFIED_AT_KEY = "selected_channel_verified_at";
const TRUSTED_PIN_PREFIX = `trusted_private_channel_pin_${PUBLIC_USER_ID}_`;
const SESSION_VERIFIED_PREFIX = `verified_private_channel_session_${PUBLIC_USER_ID}_`;
const REALTIME_REFRESH_MS = 2500;

const deviceCardThemes = [
  ["#ecfeff", "#dbeafe", "#2563eb"],
  ["#f5f3ff", "#ede9fe", "#7c3aed"],
  ["#f0fdf4", "#dcfce7", "#16a34a"],
  ["#fff7ed", "#ffedd5", "#ea580c"],
  ["#fdf2f8", "#fce7f3", "#be123c"],
  ["#f0fdfa", "#ccfbf1", "#0f766e"],
  ["#eef2ff", "#e0e7ff", "#4f46e5"],
  ["#fefce8", "#fef3c7", "#b45309"],
];

const dateBadgeThemes = [
  ["#0f766e", "#14b8a6"],
  ["#2563eb", "#38bdf8"],
  ["#7c3aed", "#c084fc"],
  ["#be123c", "#fb7185"],
  ["#b45309", "#f59e0b"],
  ["#047857", "#34d399"],
  ["#4338ca", "#818cf8"],
  ["#c2410c", "#fb923c"],
];

const ATTACH_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAZCAYAAAA14t7uAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFBSURBVEhL7ZXRjcMgDIb/3jsreAFYIQuwQhcoI3QBughdJOki9iL/PVyDUkKb9HT31k+KItnwScHYOZAkdpJSgpkBAEQE5/MZItIuAwB8tYEeZoYQAq7XaxVN04QQAqZpapf/wB3EGOm95ziO3biqPsRJclOsqnTOsZTSpl7mNo9i/tRhGNoURAQigtvt1qb6Z2xmtUg9XuVmVuK5UM+KcrlckFJqwytW4i3MDKrahle8Ld7LR1xZidveX7bw8j1jZqs96Ilxl82XfhgGiAhSSgghwMxwPB6BxX3uibstnXOmc67OAFVlzpmn0+lhXrTrlnTFJOm9fzpgSLKUQuccc85tinwlzjnTe1+HzDiOVFWWUhhjpHOOMcZ2W+WpmPcjmCXt05toSw7c8QeZ29jMajG32CX+Dd3r9hd8xJV/E38DUIkWAOcCAi0AAAAASUVORK5CYII=";
const COLOR_ICON = "data:image/png;base64,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";

const FILE_ICON = "data:image/png;base64,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";
const FILE_SELECT_ICON = "data:image/png;base64,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";
const IMAGE_SELECT_ICON = "data:image/png;base64,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";
const BOLD_SELECT_ICON = "data:image/png;base64,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";
const UNDERLINE_SELECT_ICON = "data:image/png;base64,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";
const COLOR_SELECT_ICON = "data:image/png;base64,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";

export default function Teligram() {
  const editorRef = useRef(null);
  const imageRef = useRef(null);
  const fileRef = useRef(null);
  const colorRef = useRef(null);
  const selectedTextColorRef = useRef("#111111");
  const bottomRef = useRef(null);
  const chatBodyRef = useRef(null);
  const savedRangeRef = useRef(null);
  const typingFormatsRef = useRef({ bold: false, underline: false });
  const verifiedPinRef = useRef("");
  const unlockCheckingRef = useRef(false);
  const unlockRequestIdRef = useRef(0);
  const channelLoadIdRef = useRef(0);
  const notesRequestIdRef = useRef(0);
  const channelAccessGrantedRef = useRef(false);
  const currentDeviceIdRef = useRef("");
  const realtimeTimerRef = useRef(null);
  const isFetchingNotesRef = useRef(false);
  const isSavingNoteRef = useRef(false);
  const skipNextAutoScrollRef = useRef(false);
  const scrollSnapshotRef = useRef(null);
  const noteRefs = useRef({});
  const pinnedScrollTimerRef = useRef(null);
  const imageViewerTouchRef = useRef({
    mode: "",
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [notes, setNotes] = useState([]);
  const [pinnedNoteIds, setPinnedNoteIds] = useState([]);
  const [linkedNoteIds, setLinkedNoteIds] = useState([]);
  const [unlinkedNoteIds, setUnlinkedNoteIds] = useState([]);

  const [channelUnlocked, setChannelUnlocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockChecking, setUnlockChecking] = useState(false);
  const [unlockTrustDevice, setUnlockTrustDevice] = useState(false);

  const [textColor, setTextColor] = useState("#111111");
  const [colorModeActive, setColorModeActive] = useState(false);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewImages, setPreviewImages] = useState([]);
  const [fullImagePreview, setFullImagePreview] = useState("");
  const [imageViewerLoading, setImageViewerLoading] = useState(false);
  const [imageViewerError, setImageViewerError] = useState(false);
  const [inlineImageStates, setInlineImageStates] = useState({});
  const [imageViewerTransform, setImageViewerTransform] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [brandPop, setBrandPop] = useState(false);
  const [removeOldImage, setRemoveOldImage] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [removeOldFile, setRemoveOldFile] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [composerMode, setComposerMode] = useState("message");
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    underline: false,
  });

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [mobileViewportHeight, setMobileViewportHeight] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [confirmBox, setConfirmBox] = useState({
    show: false,
    title: "",
    message: "",
    action: null,
  });

  useEffect(() => {
    currentDeviceIdRef.current = getCurrentDeviceId();
    loadSelectedChannel();
  }, []);

  // Mobile browsers do not always shrink 100vh when the system keyboard
  // opens. Use the visual viewport so the composer remains above it.
  useEffect(() => {
    const viewport = window.visualViewport;
    const updateMobileViewport = () => {
      if (window.innerWidth > 767) {
        setMobileViewportHeight(null);
        return;
      }
      setMobileViewportHeight(Math.round(viewport?.height || window.innerHeight));
    };

    updateMobileViewport();
    window.addEventListener("resize", updateMobileViewport);
    viewport?.addEventListener("resize", updateMobileViewport);
    viewport?.addEventListener("scroll", updateMobileViewport);

    return () => {
      window.removeEventListener("resize", updateMobileViewport);
      viewport?.removeEventListener("resize", updateMobileViewport);
      viewport?.removeEventListener("scroll", updateMobileViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pinnedScrollTimerRef.current) {
        clearTimeout(pinnedScrollTimerRef.current);
        pinnedScrollTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      selectedChannel?.channel_id &&
      (!isTrue(selectedChannel.is_private) || channelUnlocked)
    ) {
      fetchNotes(selectedChannel.channel_id, verifiedPinRef.current || getSavedChannelPin());
    }
  }, [selectedChannel, channelUnlocked]);

  useEffect(() => {
    if (!selectedChannel?.channel_id || typeof window === "undefined") {
      setPinnedNoteIds([]);
      setLinkedNoteIds([]);
      setUnlinkedNoteIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(getPinnedNoteKey(selectedChannel.channel_id));
      const parsed = raw ? JSON.parse(raw) : [];
      setPinnedNoteIds(Array.isArray(parsed) ? parsed.map(String).slice(0, 5) : raw ? [String(raw)] : []);
    } catch {
      const legacy = localStorage.getItem(getPinnedNoteKey(selectedChannel.channel_id));
      setPinnedNoteIds(legacy ? [String(legacy)] : []);
    }
    const linkState = readLinkState(selectedChannel.channel_id);
    setLinkedNoteIds(linkState.linked);
    setUnlinkedNoteIds(linkState.unlinked);
  }, [selectedChannel?.channel_id]);

  useEffect(() => {
    if (realtimeTimerRef.current) {
      clearInterval(realtimeTimerRef.current);
      realtimeTimerRef.current = null;
    }

    if (
      !selectedChannel?.channel_id ||
      (isTrue(selectedChannel.is_private) && !channelUnlocked)
    ) {
      return;
    }

    const refreshMessages = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isSavingNoteRef.current) return;

      fetchNotes(
        selectedChannel.channel_id,
        verifiedPinRef.current || getSavedChannelPin(),
        true
      );
    };

    realtimeTimerRef.current = setInterval(refreshMessages, REALTIME_REFRESH_MS);
    window.addEventListener("focus", refreshMessages);

    const onVisibilityChange = () => {
      if (!document.hidden) refreshMessages();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (realtimeTimerRef.current) {
        clearInterval(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }

      window.removeEventListener("focus", refreshMessages);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [selectedChannel?.channel_id, selectedChannel?.is_private, channelUnlocked]);

  useEffect(() => {
    if (!isTrue(selectedChannel?.is_private) || channelUnlocked) {
      if (skipNextAutoScrollRef.current) {
        restoreChatView();
        return;
      }

      setTimeout(() => {
        const chatBody = chatBodyRef.current;
        if (chatBody && !skipNextAutoScrollRef.current) {
          chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        }
      }, 60);
    }
  }, [notes, selectedChannel, channelUnlocked]);

  const isTrue = (value) => {
    return value === true || value === "true" || value === 1 || value === "1";
  };

  const cleanDeviceId = (value) => {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9._:-]/g, "")
      .slice(0, 120);
  };

  const getCurrentDeviceId = () => {
    if (typeof window === "undefined") return "";

    if (currentDeviceIdRef.current) {
      return currentDeviceIdRef.current;
    }

    const oldDeviceId = cleanDeviceId(localStorage.getItem(DEVICE_ID_KEY));

    if (oldDeviceId) {
      currentDeviceIdRef.current = oldDeviceId;
      return oldDeviceId;
    }

    const newDeviceId = cleanDeviceId(
      window.crypto?.randomUUID?.() ||
        `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );

    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    currentDeviceIdRef.current = newDeviceId;

    return newDeviceId;
  };

  const getTrustedPinKey = (channelId) => {
    return `${TRUSTED_PIN_PREFIX}${channelId}`;
  };

  const getTrustedPin = (channelId) => {
    if (!channelId || typeof window === "undefined") return "";
    return localStorage.getItem(getTrustedPinKey(channelId)) || "";
  };

  const saveTrustedPin = (channelId, pin) => {
    const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);

    if (!channelId || !/^[0-9]{4}$/.test(cleanPinValue)) return;

    localStorage.setItem(getTrustedPinKey(channelId), cleanPinValue);
  };

  const removeTrustedPin = (channelId) => {
    if (!channelId || typeof window === "undefined") return;
    localStorage.removeItem(getTrustedPinKey(channelId));
  };

  const getSessionVerifiedKey = (channelId) => {
    return `${SESSION_VERIFIED_PREFIX}${channelId}`;
  };

  const getPinnedNoteKey = (channelId) => {
    return `pinned_note_${PUBLIC_USER_ID}_${channelId}`;
  };

  const savePinnedNoteIds = (channelId, ids) => {
    if (!channelId || typeof window === "undefined") return;
    const cleanIds = Array.from(new Set((ids || []).map(String))).slice(0, 5);
    if (cleanIds.length) localStorage.setItem(getPinnedNoteKey(channelId), JSON.stringify(cleanIds));
    else localStorage.removeItem(getPinnedNoteKey(channelId));
  };

  const getLinkStateKey = (channelId) => `note_link_state_${PUBLIC_USER_ID}_${channelId}`;

  const readLinkState = (channelId) => {
    if (!channelId || typeof window === "undefined") return { linked: [], unlinked: [] };
    try {
      const raw = localStorage.getItem(getLinkStateKey(channelId));
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        linked: Array.isArray(parsed?.linked) ? parsed.linked.map(String) : [],
        unlinked: Array.isArray(parsed?.unlinked) ? parsed.unlinked.map(String) : [],
      };
    } catch { return { linked: [], unlinked: [] }; }
  };

  const saveLinkState = (channelId, linked, unlinked) => {
    if (!channelId || typeof window === "undefined") return;
    localStorage.setItem(getLinkStateKey(channelId), JSON.stringify({
      linked: Array.from(new Set((linked || []).map(String))),
      unlinked: Array.from(new Set((unlinked || []).map(String))),
    }));
  };

  const hasFrontendVerifiedAccess = (channelId, pin = "") => {
    if (!channelId || typeof window === "undefined") return false;

    const currentDeviceId = getCurrentDeviceId();
    const savedDeviceId = cleanDeviceId(
      localStorage.getItem(SELECTED_CHANNEL_DEVICE_KEY)
    );

    if (!currentDeviceId || !savedDeviceId || currentDeviceId !== savedDeviceId) {
      return false;
    }

    const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);
    const savedPin = getSavedChannelPin();
    const trustedPin = getTrustedPin(channelId);

    const pinMatches =
      !cleanPinValue ||
      cleanPinValue === savedPin ||
      cleanPinValue === trustedPin;

    if (!pinMatches) return false;

    const skipVerify =
      localStorage.getItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY) === "true";

    const sessionVerified =
      sessionStorage.getItem(getSessionVerifiedKey(channelId)) === "true";

    const trustedSelected =
      localStorage.getItem(SELECTED_CHANNEL_TRUST_KEY) === "true" &&
      /^[0-9]{4}$/.test(trustedPin);

    return Boolean((skipVerify && sessionVerified) || trustedSelected);
  };

  const markFrontendVerifiedAccess = (
    channelId,
    pin = "",
    trustThisDevice = false
  ) => {
    if (!channelId || typeof window === "undefined") return;

    const currentDeviceId = getCurrentDeviceId();
    const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);

    sessionStorage.setItem(getSessionVerifiedKey(channelId), "true");
    localStorage.setItem(SELECTED_CHANNEL_DEVICE_KEY, currentDeviceId);
    localStorage.setItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY, "true");
    localStorage.setItem(SELECTED_CHANNEL_VERIFIED_AT_KEY, String(Date.now()));

    if (/^[0-9]{4}$/.test(cleanPinValue)) {
      localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, cleanPinValue);
    }

    if (trustThisDevice && /^[0-9]{4}$/.test(cleanPinValue)) {
      saveTrustedPin(channelId, cleanPinValue);
      localStorage.setItem(SELECTED_CHANNEL_TRUST_KEY, "true");
    }
  };

  const clearFrontendVerifiedAccess = (channelId = "") => {
    if (typeof window === "undefined") return;

    if (channelId) {
      sessionStorage.removeItem(getSessionVerifiedKey(channelId));
    }

    localStorage.removeItem(SELECTED_CHANNEL_TRUST_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_DEVICE_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_VERIFIED_AT_KEY);
  };

  const getNoteSenderDeviceId = (note) => {
    return cleanDeviceId(
      note?.sender_device_id ||
        note?.device_id ||
        note?.created_device_id ||
        note?.senderDeviceId ||
        note?.deviceId ||
        ""
    );
  };

  const isMyDeviceNote = (note) => {
    const noteDeviceId = getNoteSenderDeviceId(note);
    const currentDeviceId = getCurrentDeviceId();

    return Boolean(noteDeviceId && currentDeviceId && noteDeviceId === currentDeviceId);
  };

  const getDeviceTheme = (note) => {
    const currentDeviceId = getCurrentDeviceId();
    const noteDeviceId = getNoteSenderDeviceId(note) || `unknown-${note?.note_id || ""}`;

    if (noteDeviceId && currentDeviceId && noteDeviceId === currentDeviceId) {
      return {
        card1: "#dcfce7",
        card2: "#bbf7d0",
        accent: "#16a34a",
        label: "This device",
      };
    }

    let hash = 0;
    for (let i = 0; i < noteDeviceId.length; i += 1) {
      hash = (hash * 31 + noteDeviceId.charCodeAt(i)) >>> 0;
    }

    const [card1, card2, accent] = deviceCardThemes[hash % deviceCardThemes.length];

    return {
      card1,
      card2,
      accent,
      label: "New device",
    };
  };

  const getNotesSignature = (items = []) => {
    return items
      .map((note) => `${note.note_id || ""}:${note.updated_at || note.created_at || ""}:${getNoteSenderDeviceId(note)}`)
      .join("|");
  };

  const parseDateValue = (dateValue) => {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }

    let value = String(dateValue).trim();
    if (!value) return null;

    value = value.replace(" ", "T");

    const hasTimeZone =
      value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);

    if (!hasTimeZone && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      value = `${value}Z`;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getIndiaDateKey = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "unknown";

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const formatIndiaDateOnly = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatIndiaTimeOnly = (dateValue) => {
    const date = parseDateValue(dateValue);
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
  };

  const normalizeSearchValue = (value) => {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,/\\|_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getSearchDateKey = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const monthMap = {
      jan: "01", january: "01",
      feb: "02", february: "02",
      mar: "03", march: "03",
      apr: "04", april: "04",
      may: "05",
      jun: "06", june: "06",
      jul: "07", july: "07",
      aug: "08", august: "08",
      sep: "09", sept: "09", september: "09",
      oct: "10", october: "10",
      nov: "11", november: "11",
      dec: "12", december: "12",
    };

    const normalizeYear = (yearValue) => {
      const year = String(yearValue || "").trim();
      if (/^\d{2}$/.test(year)) return `20${year}`;
      return year;
    };

    const makeKey = (year, month, day) => {
      const yy = normalizeYear(year);
      const mm = String(month || "").padStart(2, "0");
      const dd = String(day || "").padStart(2, "0");

      if (!/^\d{4}$/.test(yy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) {
        return "";
      }

      const date = new Date(Number(yy), Number(mm) - 1, Number(dd));

      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== Number(yy) ||
        date.getMonth() + 1 !== Number(mm) ||
        date.getDate() !== Number(dd)
      ) {
        return "";
      }

      return `${yy}-${mm}-${dd}`;
    };

    let match = raw.match(/^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*$/);
    if (match) return makeKey(match[3], match[2], match[1]);

    match = raw.match(/^\s*(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\s*$/);
    if (match) return makeKey(match[1], match[2], match[3]);

    match = raw.toLowerCase().match(/^\s*(\d{1,2})\s+([a-z]+)\s+(\d{2,4})\s*$/);
    if (match && monthMap[match[2]]) return makeKey(match[3], monthMap[match[2]], match[1]);

    match = raw.toLowerCase().match(/^\s*([a-z]+)\s+(\d{1,2}),?\s+(\d{2,4})\s*$/);
    if (match && monthMap[match[1]]) return makeKey(match[3], monthMap[match[1]], match[2]);

    return "";
  };

  const getNoteDateSearchText = (note) => {
    const messageDate = note?.created_at || note?.updated_at;
    const dateKey = getIndiaDateKey(messageDate);

    if (!messageDate || dateKey === "unknown") return "";

    const reverseParts = dateKey.split("-").reverse();
    const reverseDate = reverseParts.join(" ");
    const slashDate = dateKey.replace(/-/g, "/");
    const indianSlashDate = reverseParts.join("/");
    const indianDashDate = reverseParts.join("-");

    return [
      dateKey,
      slashDate,
      reverseDate,
      indianSlashDate,
      indianDashDate,
      formatIndiaDateOnly(messageDate),
      formatIndiaTimeOnly(messageDate),
    ].join(" ");
  };

  const closeChatKeyboard = () => {
    setActiveMenuId(null);

    if (typeof document !== "undefined" && document.activeElement === editorRef.current) {
      editorRef.current?.blur();
      savedRangeRef.current = null;
    }
  };

  const getSavedChannelPin = () => {
    return localStorage.getItem(SELECTED_CHANNEL_PIN_KEY) || "";
  };

  const getAccessHeaders = (channelOverride = selectedChannel, pinOverride = "") => {
    const headers = {
      "x-device-id": getCurrentDeviceId(),
    };

    const savedPin = pinOverride || verifiedPinRef.current || getSavedChannelPin();

    if (isTrue(channelOverride?.is_private) && savedPin) {
      headers["x-channel-pin"] = savedPin;
    }

    return headers;
  };

  const getJsonHeaders = (channelOverride = selectedChannel, pinOverride = "") => {
    return {
      "Content-Type": "application/json",
      ...getAccessHeaders(channelOverride, pinOverride),
    };
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });

    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1800);
  };

  const openConfirm = (title, message, action) => {
    setConfirmBox({ show: true, title, message, action });
  };

  const closeConfirm = () => {
    setConfirmBox({ show: false, title: "", message: "", action: null });
  };

  const getInitial = (name) => {
    return name?.trim()?.charAt(0)?.toUpperCase() || "N";
  };

  const normalizeTextColor = (color) => {
    const value = String(color || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#111111";
  };

  const getNoteTextColor = (note) => {
    return normalizeTextColor(note?.text_color || note?.textColor || "#111111");
  };

  const setComposerTextColor = (color) => {
    const finalColor = normalizeTextColor(color);
    selectedTextColorRef.current = finalColor;
    setTextColor(finalColor);

    // IMPORTANT: never color the whole contentEditable.
    // Existing characters must keep their own inline color.
    // Only the caret / next-typing marker uses the selected color.
    if (editorRef.current) {
      editorRef.current.style.setProperty("--composerColor", "#111111");
      editorRef.current.style.caretColor = finalColor;
    }

    return finalColor;
  };


  // AUTO-RESIZE COMPOSER
  // Grows with wrapped text/new lines until it reaches 65% of the
  // viewport height. Very long text then scrolls inside the composer.
  const autoResizeEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    // Changing height can reset a contentEditable's internal scroll position.
    // Preserve it so a user editing line 3 (or any chosen word) is not moved.
    const previousScrollTop = editor.scrollTop;

    // Reset first so deleting text also shrinks the composer.
    editor.style.height = "auto";
    editor.style.overflowY = "hidden";

    const computed = window.getComputedStyle(editor);
    const minHeight = parseFloat(computed.minHeight) || 45;

    // Keep enough of the screen available for the chat itself.
    const visibleViewportHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardOpen = visibleViewportHeight < window.innerHeight * 0.82;
    const maxHeight = Math.max(
      minHeight,
      Math.floor(visibleViewportHeight * (keyboardOpen ? 0.42 : 0.65))
    );

    const contentHeight = editor.scrollHeight;
    const nextHeight = Math.max(
      minHeight,
      Math.min(contentHeight, maxHeight)
    );

    editor.style.height = `${nextHeight}px`;

    // Only very long content gets an internal scrollbar.
    if (contentHeight > maxHeight) {
      editor.style.overflowY = "auto";
    }

    editor.scrollTop = previousScrollTop;
  };

  // Keep the caret (not the start/end of the document) in view while typing.
  // This is important when editing a word in the middle of a long message.
  const keepComposerCaretVisible = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const caret = range.cloneRange();
    caret.collapse(false);
    // Some browsers return a zero-sized bounding box for a collapsed range;
    // client rects still contain the real line position in that case.
    const caretBox = caret.getClientRects()[0] || caret.getBoundingClientRect();
    const editorBox = editor.getBoundingClientRect();
    const lineHeight = parseFloat(window.getComputedStyle(editor).lineHeight) || 20;
    const caretTop = caretBox.top;
    const caretBottom = caretBox.height ? caretBox.bottom : caretTop + lineHeight;
    if (!Number.isFinite(caretTop) || !Number.isFinite(caretBottom)) return;

    if (caretBottom > editorBox.bottom - 8) {
      editor.scrollTop += caretBottom - editorBox.bottom + 12;
    } else if (caretTop < editorBox.top + 8) {
      editor.scrollTop -= editorBox.top + 8 - caretTop;
    }
  };

  const scheduleEditorResize = () => {
    requestAnimationFrame(() => {
      autoResizeEditor();
      keepComposerCaretVisible();
    });
  };

  // Recalculate the maximum composer height when the browser/window size changes.
  useEffect(() => {
    const handleEditorViewportResize = () => scheduleEditorResize();

    window.addEventListener("resize", handleEditorViewportResize);

    return () => {
      window.removeEventListener("resize", handleEditorViewportResize);
    };
  }, []);

  const getFileNameFromUrl = (url) => {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return "";

    const cleaned = rawUrl
      .replace(/\\/g, "/")
      .split("?")[0]
      .split("#")[0];

    return cleaned.split("/").pop() || "";
  };

  const joinApiUrl = (pathValue) => {
    const cleanPath = String(pathValue || "").trim();
    if (!cleanPath) return "";
    if (/^https?:\/\//i.test(cleanPath)) return cleanPath;

    return `${API_URL}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
  };

  const normalizeApiImageUrl = (url) => {
    const rawUrl = String(url || "").trim();

    if (!rawUrl) return "";
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return rawUrl;
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    const cleanUrl = rawUrl.replace(/\\/g, "/");

    if (cleanUrl.startsWith("/api/") || cleanUrl.startsWith("api/")) {
      return encodeURI(joinApiUrl(cleanUrl));
    }

    // Old /uploads fallback removed intentionally.
    // Backend must return /api/telegram-notes/image/:note_id
    // and /api/telegram-channels/logo/:channel_id.
    return "";
  };

  const getNoteImageUrls = (note) => {
    const list = Array.isArray(note?.image_urls) ? note.image_urls : [];
    const normalized = list.map(normalizeApiImageUrl).filter(Boolean);
    if (normalized.length) return normalized;
    const single = getNoteImageUrl(note);
    return single ? [single] : [];
  };

  const getNoteImageUrl = (note) => {
    const backendUrl = normalizeApiImageUrl(note?.image_url);

    if (backendUrl) return backendUrl;

    if (note?.has_image && note?.note_id) {
      const version = note?.updated_at
        ? new Date(note.updated_at).getTime()
        : Date.now();

      return joinApiUrl(`/api/telegram-notes/image/${note.note_id}?v=${version}`);
    }

    return "";
  };

  const getChannelLogoUrl = (channelOrUrl) => {
    if (!channelOrUrl) return "";

    if (typeof channelOrUrl === "string") {
      return normalizeApiImageUrl(channelOrUrl);
    }

    const backendUrl = normalizeApiImageUrl(channelOrUrl.logo_url);

    if (backendUrl) return backendUrl;

    if (channelOrUrl.has_logo && channelOrUrl.channel_id) {
      const version = channelOrUrl.updated_at
        ? new Date(channelOrUrl.updated_at).getTime()
        : Date.now();

      return joinApiUrl(`/api/telegram-channels/logo/${channelOrUrl.channel_id}?v=${version}`);
    }

    return "";
  };

  const getImagePlaceholder = (folder = "telegram-notes") => {
    const label = folder === "telegram-channels" ? "Logo" : "Image";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
        <rect width="640" height="420" rx="24" fill="#e5e7eb"/>
        <rect x="28" y="28" width="584" height="364" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
        <circle cx="228" cy="168" r="42" fill="#cbd5e1"/>
        <path d="M98 336 L244 218 L336 288 L406 230 L542 336 Z" fill="#cbd5e1"/>
        <text x="320" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#64748b">${label} not found</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  // IMAGE DOWNLOAD: always use the backend download endpoint with ONLY note_id.
  // Do not use note.download_url/image_url and do not fetch the blob from React.
  // This avoids browser CORS/credentials problems when the endpoint itself works.
  const getNoteDownloadUrl = (note) => {
    const noteId = String(note?.note_id || "").trim();
    if (!noteId) return "";
    return `${API_URL}/api/telegram-notes/image/download/${encodeURIComponent(noteId)}`;
  };

  const downloadNoteImage = (event, note) => {
    event.preventDefault();
    event.stopPropagation();

    const noteId = String(note?.note_id || "").trim();
    if (!noteId) {
      showToast("Image download unavailable", "error");
      return;
    }

    const downloadUrl =
      `${API_URL}/api/telegram-notes/image/download/${encodeURIComponent(noteId)}`;

    // Direct browser navigation to the working backend endpoint.
    // No fetch(), no blob(), no Authorization/CORS dependency.
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast("Download started", "success");
  };

  const downloadNoteFile = async (event, note) => {
    event.preventDefault();
    event.stopPropagation();

    const downloadUrl = getNoteFileDownloadUrl(note);
    if (!downloadUrl) {
      showToast("File download unavailable", "error");
      return;
    }

    try {
      await downloadBlobFromUrl(downloadUrl, getNoteFileName(note), note);
      showToast("Download started", "success");
    } catch (error) {
      console.error("File download error:", error);
      showToast("Download failed", "error");
    }
  };

  const openNoteFile = (event, note) => {
    event.preventDefault();
    event.stopPropagation();

    const openUrl = isNoteFilePreviewable(note)
      ? getNoteFileUrl(note)
      : getNoteFileDownloadUrl(note);

    if (!openUrl) return;

    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  const handleImageError = (event, originalUrl = "", folder = "telegram-notes") => {
    const img = event.currentTarget;
    img.onerror = null;

    const logoBox = img.closest(".header-logo, .unlock-logo");

    if (logoBox) {
      logoBox.classList.add("logo-load-failed");
      img.style.display = "none";
      return;
    }

    img.classList.add("image-load-failed");
    img.src = getImagePlaceholder(folder);
  };


  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  };

  const hasInlineTextFormatting = (html) => {
    return /<(?:strong|b|u)\b|font-weight\s*:|text-decoration(?:-line)?\s*:/i.test(
      String(html || "")
    );
  };


  const isTitleNote = (note) => {
    if (
      note?.is_title === false ||
      note?.is_title === "false" ||
      note?.is_title === 0 ||
      note?.is_title === "0"
    ) {
      return false;
    }

    return (
      String(note?.title || "").trim().toLowerCase() === "title" ||
      isTrue(note?.is_title)
    );
  };

  const hasNoteImage = (note) => {
    return Boolean(note?.image_url || note?.has_image);
  };

  const hasNoteAttachment = (note) => {
    return Boolean(
      note?.has_attachment ||
        note?.attachment_url ||
        (note?.has_file && !hasNoteImage(note) && note?.file_name)
    );
  };

  const hasAnyNoteFile = (note) => {
    return hasNoteImage(note) || hasNoteAttachment(note);
  };

  const getNoteFileName = (note) => {
    return (
      note?.file_name ||
      note?.attachment_name ||
      getFileNameFromUrl(note?.file_download_url) ||
      getFileNameFromUrl(note?.attachment_url) ||
      `attachment-${note?.note_id || Date.now()}`
    );
  };

  const getNoteFileMime = (note) => {
    return String(note?.file_mime || note?.attachment_mime || "").toLowerCase();
  };

  const getNoteFileUrl = (note) => {
    const backendUrl = normalizeApiImageUrl(note?.file_url || note?.attachment_url);

    if (backendUrl) return backendUrl;

    if (hasNoteAttachment(note) && note?.note_id) {
      const version = note?.updated_at
        ? new Date(note.updated_at).getTime()
        : Date.now();

      return joinApiUrl(`/api/telegram-notes/file/${note.note_id}?v=${version}`);
    }

    return "";
  };

  const getNoteFileDownloadUrl = (note) => {
    const backendUrl = normalizeApiImageUrl(
      note?.file_download_url || note?.attachment_download_url
    );

    if (backendUrl) return backendUrl;

    if (hasNoteAttachment(note) && note?.note_id) {
      return joinApiUrl(`/api/telegram-notes/file/download/${note.note_id}`);
    }

    return "";
  };

  const isNoteFilePreviewable = (note) => {
    if (note?.file_previewable === true || note?.file_previewable === "true") {
      return true;
    }

    const mime = getNoteFileMime(note);
    const name = getNoteFileName(note).toLowerCase();

    return (
      mime.startsWith("image/") ||
      mime.startsWith("text/") ||
      mime === "application/pdf" ||
      mime === "application/json" ||
      mime === "application/xml" ||
      name.endsWith(".txt") ||
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      name.endsWith(".pdf")
    );
  };

  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);

    if (!size || Number.isNaN(size)) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (fileOrNote) => {
    const name = String(
      fileOrNote?.name ||
        fileOrNote?.file_name ||
        fileOrNote?.attachment_name ||
        "file"
    ).toLowerCase();
    const mime = String(
      fileOrNote?.type ||
        fileOrNote?.file_mime ||
        fileOrNote?.attachment_mime ||
        ""
    ).toLowerCase();

    if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
    if (
      mime.includes("spreadsheet") ||
      mime.includes("excel") ||
      name.endsWith(".xls") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".csv")
    ) {
      return "XLS";
    }
    if (
      mime.includes("word") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    ) {
      return "DOC";
    }
    if (mime.startsWith("text/") || name.endsWith(".txt")) return "TXT";
    if (mime.startsWith("image/")) return "IMG";
    if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z")) {
      return "ZIP";
    }

    return "FILE";
  };

  const getFilePreviewName = () => {
    return previewFile?.name || selectedFile?.name || "Selected file";
  };

  const hasNoteText = (note) => {
    return Boolean(stripHtml(note?.content_html || "").trim());
  };

  const getComposerTitleValue = (oldNote) => {
    // Title is a real toggle. When the user turns it OFF, the edited/sent
    // message must become a normal message instead of retaining a hidden title.
    if (composerMode === "title") return "title";
    return "";
  };

  const normalizeEditorHtml = (html) => {
    if (typeof document === "undefined") return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    wrapper.querySelectorAll("font[color]").forEach((fontNode) => {
      const color = normalizeTextColor(fontNode.getAttribute("color"));
      const span = document.createElement("span");
      span.innerHTML = fontNode.innerHTML;
      span.style.setProperty("color", color, "important");
      span.style.setProperty("-webkit-text-fill-color", color, "important");
      fontNode.replaceWith(span);
    });

    wrapper.querySelectorAll("[style]").forEach((element) => {
      const colorValue = element.style.color;
      const fontWeight = String(element.style.fontWeight || "").toLowerCase();
      const textDecoration = String(element.style.textDecoration || element.style.textDecorationLine || "").toLowerCase();

      if (colorValue) {
        element.style.setProperty("color", colorValue, "important");
        element.style.setProperty("-webkit-text-fill-color", colorValue, "important");
      }

      const isBold = fontWeight === "bold" || Number.parseInt(fontWeight, 10) >= 600;
      const isUnderlined = textDecoration.includes("underline");

      if (isBold || isUnderlined) {
        element.style.removeProperty("font-weight");
        element.style.removeProperty("text-decoration");
        element.style.removeProperty("text-decoration-line");

        let formattedContent = document.createDocumentFragment();
        while (element.firstChild) formattedContent.appendChild(element.firstChild);

        if (isUnderlined) {
          const underline = document.createElement("u");
          underline.appendChild(formattedContent);
          formattedContent = document.createDocumentFragment();
          formattedContent.appendChild(underline);
        }

        if (isBold) {
          const strong = document.createElement("strong");
          strong.appendChild(formattedContent);
          formattedContent = document.createDocumentFragment();
          formattedContent.appendChild(strong);
        }

        element.appendChild(formattedContent);
      }
    });

    return wrapper.innerHTML.replace(/\u200B/g, "");
  };

  const getEditorHtml = () => {
    const html = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.textContent?.trim() || "";

    if (!text && (html === "<br>" || html === "<div><br></div>")) {
      return "";
    }

    return normalizeEditorHtml(html.trim());
  };

  // Title mode affects only the first user-entered line.
  // The remaining lines keep their normal formatting unless the user
  // explicitly applies Bold/Underline to them.
  // TITLE: mark ONLY the first user-entered line.
  // This intentionally starts from the first visible text node in the whole
  // HTML tree. It does NOT choose a "first block", because contentEditable
  // can sometimes leave the first lines as root text and later lines inside
  // <div>/<p>. Choosing the first block can therefore highlight line 2, 4, etc.
  const applyFirstLineHeadingHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    // Remove any old generated title wrapper first.
    wrapper.querySelectorAll(".note-heading-line").forEach((heading) => {
      const parent = heading.parentNode;
      if (!parent) return;

      while (heading.firstChild) {
        parent.insertBefore(heading.firstChild, heading);
      }

      heading.remove();
    });

    const blockTags = new Set([
      "DIV",
      "P",
      "LI",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "PRE",
      "SECTION",
      "ARTICLE",
    ]);

    // Find the FIRST visible text node in DOM order.
    const textWalker = document.createTreeWalker(
      wrapper,
      NodeFilter.SHOW_TEXT
    );

    let firstTextNode = null;
    let firstTextOffset = 0;
    let node = textWalker.nextNode();

    while (node) {
      const value = String(node.nodeValue || "");
      const match = value.match(/\S/);

      if (match) {
        firstTextNode = node;
        firstTextOffset = match.index || 0;
        break;
      }

      node = textWalker.nextNode();
    }

    if (!firstTextNode) return normalizeEditorHtml(wrapper.innerHTML);

    const heading = document.createElement("strong");
    heading.className = "note-heading-line";

    const range = document.createRange();
    range.setStart(firstTextNode, firstTextOffset);

    // Walk forward from the FIRST visible text node until the FIRST
    // explicit line boundary: <br>, newline, or next block element.
    const walker = document.createTreeWalker(
      wrapper,
      NodeFilter.SHOW_ALL
    );

    let current = walker.nextNode();
    let foundStart = false;
    let stopped = false;

    while (current) {
      if (current === firstTextNode) {
        foundStart = true;
        current = walker.nextNode();
        continue;
      }

      if (!foundStart) {
        current = walker.nextNode();
        continue;
      }

      if (current.nodeType === Node.TEXT_NODE) {
        const value = String(current.nodeValue || "");
        const newline = value.search(/\r?\n/);

        if (newline >= 0) {
          range.setEnd(current, newline);
          stopped = true;
          break;
        }
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        const tag = current.tagName;

        if (tag === "BR") {
          range.setEndBefore(current);
          stopped = true;
          break;
        }

        // A new block after the first visible text is a new user-entered line.
        if (blockTags.has(tag) && current !== firstTextNode.parentElement) {
          range.setEndBefore(current);
          stopped = true;
          break;
        }
      }

      current = walker.nextNode();
    }

    if (!stopped) {
      range.setEnd(wrapper, wrapper.childNodes.length);
    }

    const firstLine = range.extractContents();

    if (String(firstLine.textContent || "").trim()) {
      heading.appendChild(firstLine);

      // Put the generated first-line wrapper exactly where the first
      // visible character originally started.
      range.insertNode(heading);
    }

    return normalizeEditorHtml(wrapper.innerHTML);
  };
  const removeFirstLineHeadingHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll(".note-heading-line").forEach((heading) => {
      const parent = heading.parentNode;
      if (!parent) return;

      while (heading.firstChild) {
        parent.insertBefore(heading.firstChild, heading);
      }
      heading.remove();
    });

    return normalizeEditorHtml(wrapper.innerHTML);
  };

  const hasLinkAnchor = (html) => /<a\b[^>]*class=["\']message-link["\'][^>]*>/i.test(String(html || ""));

  const isLinkedNote = (note) => {
    if (!note) return false;
    const id = String(note.note_id);
    const html = String(note.content_html || "");
    if (unlinkedNoteIds.includes(id)) return false;
    return linkedNoteIds.includes(id) || hasLinkAnchor(html);
  };

  const unlinkNoteHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.querySelectorAll("a.message-link").forEach((anchor) => {
      const parent = anchor.parentNode;
      if (!parent) return;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      anchor.remove();
    });
    return normalizeEditorHtml(wrapper.innerHTML);
  };

  const getRenderedNoteHtml = (note) => {
    let html = String(note?.content_html || "");
    if (isLinkedNote(note)) {
      if (!hasLinkAnchor(html)) html = linkifyNoteHtml(html);
    } else if (hasLinkAnchor(html)) {
      html = unlinkNoteHtml(html);
    }
    return isTitleNote(note) ? applyFirstLineHeadingHtml(html) : html;
  };

  const getComposerContentHtml = () => {
    const html = getEditorHtml();
    // If title mode is currently ON, ensure only the first line is marked.
    // When Title is OFF, never retain the title wrapper.
    return composerMode === "title" ? applyFirstLineHeadingHtml(html) : removeFirstLineHeadingHtml(html);
  };

  const placeCaretAtEnd = (element = editorRef.current) => {
    if (!element || typeof window === "undefined") return;

    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();

    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();

    setTimeout(updateActiveFormats, 0);
  };

  const sanitizeNoteHtml = (html) => {
    return DOMPurify.sanitize(normalizeEditorHtml(html || ""), {
      ADD_TAGS: ["font", "a"],
      ADD_ATTR: ["style", "color", "href", "target", "rel"],
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
  };

  // Convert the complete URL text into one real anchor so the URL remains
  // fully clickable even when the browser visually wraps it across lines.
  const linkifyNoteHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

    const textNodes = [];
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.parentElement && !node.parentElement.closest("a")) {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const value = textNode.nodeValue || "";
      urlPattern.lastIndex = 0;
      if (!urlPattern.test(value)) return;
      urlPattern.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let cursor = 0;
      let match;

      while ((match = urlPattern.exec(value))) {
        let rawUrl = match[0];
        let trailing = "";

        // Keep sentence punctuation outside the actual URL.
        while (/[.,!?;:)]$/.test(rawUrl) && !/[)]\]/.test(rawUrl)) {
          trailing = rawUrl.slice(-1) + trailing;
          rawUrl = rawUrl.slice(0, -1);
        }

        if (match.index > cursor) {
          fragment.appendChild(document.createTextNode(value.slice(cursor, match.index)));
        }

        const anchor = document.createElement("a");
        anchor.className = "message-link";
        anchor.href = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = rawUrl;
        fragment.appendChild(anchor);

        if (trailing) fragment.appendChild(document.createTextNode(trailing));
        cursor = match.index + match[0].length;
      }

      if (cursor < value.length) {
        fragment.appendChild(document.createTextNode(value.slice(cursor)));
      }

      textNode.replaceWith(fragment);
    });

    return normalizeEditorHtml(wrapper.innerHTML);
  };

  const preserveChatView = (noteId = "") => {
    const chatBody = chatBodyRef.current;

    if (!chatBody) return;

    const targetNoteId = noteId ? String(noteId) : "";
    const noteElement = targetNoteId ? noteRefs.current[targetNoteId] : null;
    const chatRect = chatBody.getBoundingClientRect();
    const noteRect = noteElement?.getBoundingClientRect?.();

    scrollSnapshotRef.current = {
      top: chatBody.scrollTop,
      height: chatBody.scrollHeight,
      noteId: targetNoteId,
      noteOffset: noteRect ? noteRect.top - chatRect.top : null,
    };

    skipNextAutoScrollRef.current = true;
  };

  const restoreChatView = () => {
    const snapshot = scrollSnapshotRef.current;

    if (!snapshot) {
      skipNextAutoScrollRef.current = false;
      return;
    }

    // Restore the user's visual position after React updates the note.
    // The edited/deleted note is used as an anchor, so changes in message
    // height do not move the user above or below their current place.
    const restore = () => {
      const chatBody = chatBodyRef.current;

      if (!chatBody || !scrollSnapshotRef.current) {
        skipNextAutoScrollRef.current = false;
        scrollSnapshotRef.current = null;
        return;
      }

      const currentSnapshot = scrollSnapshotRef.current;
      const noteElement = currentSnapshot.noteId
        ? noteRefs.current[String(currentSnapshot.noteId)]
        : null;

      if (noteElement && currentSnapshot.noteOffset !== null) {
        const chatRect = chatBody.getBoundingClientRect();
        const noteRect = noteElement.getBoundingClientRect();

        chatBody.scrollTop +=
          noteRect.top - chatRect.top - currentSnapshot.noteOffset;
      } else {
        // If the edited/deleted anchor no longer exists, keep the old
        // scrollTop, clamped to the new scrollable range.
        chatBody.scrollTop = Math.max(
          0,
          Math.min(
            currentSnapshot.top,
            Math.max(0, chatBody.scrollHeight - chatBody.clientHeight)
          )
        );
      }
    };

    // Multiple frames handle React's DOM commit and image/content reflow.
    window.requestAnimationFrame(() => {
      restore();

      window.requestAnimationFrame(() => {
        restore();

        window.requestAnimationFrame(() => {
          restore();
          skipNextAutoScrollRef.current = false;
          scrollSnapshotRef.current = null;
        });
      });
    });
  };

  const clampImageViewerValue = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.hypot(dx, dy);
  };

  const openFullImagePreview = (url) => {
    if (!url) return;

    setImageViewerTransform({ scale: 1, x: 0, y: 0 });
    imageViewerTouchRef.current = {
      mode: "",
      startDistance: 0,
      startScale: 1,
      startX: 0,
      startY: 0,
      baseX: 0,
      baseY: 0,
    };
    setImageViewerError(false);
    setImageViewerLoading(true);
    setFullImagePreview(url);
  };

  const closeFullImagePreview = () => {
    setFullImagePreview("");
    setImageViewerLoading(false);
    setImageViewerError(false);
    setImageViewerTransform({ scale: 1, x: 0, y: 0 });
  };

  const handleImageViewerTouchStart = (event) => {
    const touches = event.touches;

    if (touches.length === 2) {
      event.preventDefault();
      imageViewerTouchRef.current = {
        mode: "pinch",
        startDistance: getTouchDistance(touches),
        startScale: imageViewerTransform.scale,
        startX: 0,
        startY: 0,
        baseX: imageViewerTransform.x,
        baseY: imageViewerTransform.y,
      };
      return;
    }

    if (touches.length === 1 && imageViewerTransform.scale > 1) {
      event.preventDefault();
      imageViewerTouchRef.current = {
        ...imageViewerTouchRef.current,
        mode: "drag",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        baseX: imageViewerTransform.x,
        baseY: imageViewerTransform.y,
      };
    }
  };

  const handleImageViewerTouchMove = (event) => {
    const touches = event.touches;
    const touchData = imageViewerTouchRef.current;

    if (touchData.mode === "pinch" && touches.length === 2) {
      event.preventDefault();

      const nextScale = clampImageViewerValue(
        touchData.startScale * (getTouchDistance(touches) / Math.max(touchData.startDistance, 1)),
        1,
        5
      );

      setImageViewerTransform((prev) => ({
        ...prev,
        scale: nextScale,
        x: nextScale === 1 ? 0 : prev.x,
        y: nextScale === 1 ? 0 : prev.y,
      }));
      return;
    }

    if (touchData.mode === "drag" && touches.length === 1 && imageViewerTransform.scale > 1) {
      event.preventDefault();

      const limit = 160 * imageViewerTransform.scale;

      setImageViewerTransform((prev) => ({
        ...prev,
        x: clampImageViewerValue(touchData.baseX + touches[0].clientX - touchData.startX, -limit, limit),
        y: clampImageViewerValue(touchData.baseY + touches[0].clientY - touchData.startY, -limit, limit),
      }));
    }
  };

  const handleImageViewerTouchEnd = () => {
    imageViewerTouchRef.current.mode = "";

    setImageViewerTransform((prev) => {
      if (prev.scale <= 1.03) {
        return { scale: 1, x: 0, y: 0 };
      }

      return prev;
    });
  };

  const toggleImageViewerZoom = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setImageViewerTransform((prev) =>
      prev.scale > 1
        ? { scale: 1, x: 0, y: 0 }
        : { scale: 2.2, x: 0, y: 0 }
    );
  };

  const loadSelectedChannel = async () => {
    const loadId = ++channelLoadIdRef.current;
    const channelId = localStorage.getItem("selected_channel_id");

    if (!channelId) {
      window.location.hash = "/teligram-channels";
      return;
    }

    try {
      getCurrentDeviceId();

      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`, {
        headers: {
          "x-device-id": getCurrentDeviceId(),
        },
      });
      const data = await res.json();

      if (loadId !== channelLoadIdRef.current) return;

      if (!res.ok) {
        showToast("Channel not found", "error");

        setTimeout(() => {
          window.location.hash = "/teligram-channels";
        }, 900);

        return;
      }

      const channel = data.channel;
      setSelectedChannel(channel);
      channelAccessGrantedRef.current = false;

      if (isTrue(channel.is_private)) {
        const savedPin = getSavedChannelPin();
        const trustedPin = getTrustedPin(channel.channel_id);
        const trustedDevice =
          localStorage.getItem(SELECTED_CHANNEL_TRUST_KEY) === "true" &&
          /^[0-9]{4}$/.test(trustedPin);

        // Trusted device access is frontend-only on this page. Do NOT call the
        // PIN verification API while opening the channel; this prevents the
        // temporary mismatch popup seen on trusted devices.
        if (trustedDevice) {
          verifiedPinRef.current = trustedPin;
          channelAccessGrantedRef.current = true;
          localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, trustedPin);
          localStorage.setItem("selected_channel_is_private", "true");
          markFrontendVerifiedAccess(channel.channel_id, trustedPin, true);
          setChannelUnlocked(true);
          setUnlockPin("");
          setUnlockError("");
          setUnlockTrustDevice(false);
          return;
        } else if (/^[0-9]{4}$/.test(savedPin)) {
          // The channel list already verified this PIN in the current flow.
          // Reuse it without another verification call.
          verifiedPinRef.current = savedPin;
          channelAccessGrantedRef.current = true;
          markFrontendVerifiedAccess(channel.channel_id, savedPin, false);
          setChannelUnlocked(true);
          setUnlockPin("");
          setUnlockError("");
          setUnlockTrustDevice(false);
          return;
        }

        verifiedPinRef.current = "";
        channelAccessGrantedRef.current = false;
        localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        clearFrontendVerifiedAccess(channel.channel_id);
        setChannelUnlocked(false);
        setUnlockPin("");
        setUnlockError("");
        setUnlockTrustDevice(false);
        setNotes([]);
        return;
      }

      verifiedPinRef.current = "";
      channelAccessGrantedRef.current = true;
      localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
      clearFrontendVerifiedAccess(channel.channel_id);
      setChannelUnlocked(true);
      setUnlockPin("");
      setUnlockError("");
      setUnlockTrustDevice(false);
    } catch (error) {
      if (loadId !== channelLoadIdRef.current) return;
      console.error("Channel load error:", error);
      showToast("Server error while opening channel", "error");
    }
  };

  // This chat page must not re-verify a private-channel PIN through the API.
  // Channel access/PIN verification is handled before entering this page.
  // This helper only checks that a 4-digit PIN is present locally.
  const verifyPinFromApi = async (_channelId, pin) => {
    return /^[0-9]{4}$/.test(String(pin || '').replace(/\D/g, '').slice(0, 4));
  };

  const verifyPrivateChannelPin = async () => {
    if (!selectedChannel || unlockCheckingRef.current) return;

    const pin = unlockPin.replace(/\D/g, "").slice(0, 4);

    if (!/^[0-9]{4}$/.test(pin)) {
      setUnlockError("Enter valid 4 digit PIN");
      return;
    }

    const requestId = ++unlockRequestIdRef.current;
    unlockCheckingRef.current = true;

    try {
      setUnlockChecking(true);
      setUnlockError("");

      // No backend PIN verification is performed on this page.
      const verified = /^[0-9]{4}$/.test(pin);

      if (requestId !== unlockRequestIdRef.current) return;

      if (!verified) {
        verifiedPinRef.current = "";
        channelAccessGrantedRef.current = false;
        localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        clearFrontendVerifiedAccess(selectedChannel.channel_id);
        setUnlockError("Wrong PIN");
        return;
      }

      verifiedPinRef.current = pin;
      channelAccessGrantedRef.current = true;
      localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, pin);
      localStorage.setItem("selected_channel_is_private", "true");
      markFrontendVerifiedAccess(
        selectedChannel.channel_id,
        pin,
        unlockTrustDevice
      );

      if (unlockTrustDevice) {
        saveTrustedPin(selectedChannel.channel_id, pin);
        localStorage.setItem(SELECTED_CHANNEL_TRUST_KEY, "true");
      } else {
        removeTrustedPin(selectedChannel.channel_id);
        localStorage.removeItem(SELECTED_CHANNEL_TRUST_KEY);
      }

      setUnlockError("");
      setUnlockPin("");
      setUnlockTrustDevice(false);
      setChannelUnlocked(true);

      // Notes load once through the channelUnlocked effect.
      // After this, fetchNotes will not call verify-pin again.
    } catch (error) {
      if (requestId !== unlockRequestIdRef.current) return;
      console.error("Unlock error:", error);
      setUnlockError("Unable to unlock channel");
    } finally {
      if (requestId === unlockRequestIdRef.current) {
        unlockCheckingRef.current = false;
        setUnlockChecking(false);
      }
    }
  };

  const fetchNotes = async (channelId, pinOverride = "", silent = false, force = false) => {
    if (isFetchingNotesRef.current && silent && !force) return;

    isFetchingNotesRef.current = true;

    const requestId = ++notesRequestIdRef.current;
    const pinForRequest = pinOverride || verifiedPinRef.current || getSavedChannelPin();
    const channelForHeaders = selectedChannel || {
      channel_id: channelId,
      is_private: localStorage.getItem("selected_channel_is_private") === "true",
    };

    try {
      const res = await fetch(
        `${API_URL}/api/telegram-notes?user_id=${PUBLIC_USER_ID}&channel_id=${channelId}`,
        { headers: getAccessHeaders(channelForHeaders, pinForRequest) }
      );

      const data = await res.json();

      if (requestId !== notesRequestIdRef.current) return;

      if (!res.ok) {
        if (res.status === 403 && isTrue(channelForHeaders?.is_private)) {
          /*
            Do not call verify-pin API here.
            If ChannelList already verified the PIN/trusted this device, this
            page simply uses the saved PIN header. A 403 means notes API access
            failed, so show the lock screen without a mismatch popup.
          */
          verifiedPinRef.current = "";
          channelAccessGrantedRef.current = false;
          localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
          clearFrontendVerifiedAccess(channelId);
          setChannelUnlocked(false);
          setNotes([]);
          setUnlockError("");
          return;
        }

        showToast(data.message || "Unable to load messages", "error");
        return;
      }

      const allNotes = data.notes || [];

      const channelNotes = allNotes
        .filter((note) => {
          if (note.channel_id === null || note.channel_id === undefined) {
            return true;
          }

          return Number(note.channel_id) === Number(channelId);
        })
        .map((note) => ({
          ...note,
          channel_id: note.channel_id || channelId,
          sender_device_id:
            note.sender_device_id ||
            note.device_id ||
            note.created_device_id ||
            "",
        }));

      setNotes((prev) => {
        const previousById = new Map(prev.map((note) => [String(note.note_id), note]));
        const mergedNotes = channelNotes.map((note) => {
          const previous = previousById.get(String(note.note_id));
          const serverHtml = String(note.content_html || "");

          if (
            previous &&
            hasInlineTextFormatting(previous.content_html) &&
            !hasInlineTextFormatting(serverHtml) &&
            stripHtml(previous.content_html).trim() === stripHtml(serverHtml).trim()
          ) {
            return { ...note, content_html: previous.content_html };
          }

          return note;
        });

        if (silent && getNotesSignature(prev) === getNotesSignature(mergedNotes)) {
          return prev;
        }

        if (silent) {
          preserveChatView();
        }

        return mergedNotes;
      });
    } catch (error) {
      if (requestId !== notesRequestIdRef.current) return;
      console.error("Fetch notes error:", error);
      if (!silent) {
        showToast("Unable to load messages", "error");
      }
    } finally {
      isFetchingNotesRef.current = false;
    }
  };

  const filteredNotes = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchText);
    if (!normalizedQuery) return notes;

    const exactDateKey = getSearchDateKey(searchText);

    if (exactDateKey) {
      return notes.filter((note) =>
        getIndiaDateKey(note.created_at || note.updated_at) === exactDateKey
      );
    }

    const words = normalizedQuery.split(/\s+/).filter(Boolean);

    return notes.filter((note) => {
      const plainText = stripHtml(note.content_html || "");
      const imageText = hasNoteImage(note) ? "image photo picture" : "";
      const fileText = hasNoteAttachment(note)
        ? `file attachment document ${getNoteFileName(note)} ${getFileTypeLabel(note)}`
        : "";
      const dateText = getNoteDateSearchText(note);

      const searchable = normalizeSearchValue(
        `${plainText} ${imageText} ${fileText} ${dateText}`
      );

      return words.every((word) => searchable.includes(word));
    });
  }, [notes, searchText]);

  const groupedNotes = useMemo(() => {
    const sorted = [...filteredNotes].sort((a, b) => {
      const aTime = parseDateValue(a.created_at || a.updated_at)?.getTime() || 0;
      const bTime = parseDateValue(b.created_at || b.updated_at)?.getTime() || 0;
      return aTime - bTime;
    });

    let lastDateKey = "";
    let badgeIndex = -1;

    return sorted.map((note) => {
      const messageDate = note.created_at || note.updated_at;
      const dateKey = getIndiaDateKey(messageDate);
      const showDateBadge = dateKey !== lastDateKey;

      if (showDateBadge) {
        badgeIndex += 1;
        lastDateKey = dateKey;
      }

      const [badgeColor1, badgeColor2] =
        dateBadgeThemes[badgeIndex % dateBadgeThemes.length];

      return {
        note,
        messageDate,
        showDateBadge,
        dateLabel: formatIndiaDateOnly(messageDate),
        badgeColor1,
        badgeColor2,
      };
    });
  }, [filteredNotes]);

  const publicDeviceChipNoteIds = useMemo(() => {
    const firstNoteIds = new Set();
    const seenDeviceIds = new Set();

    if (isTrue(selectedChannel?.is_private)) {
      return firstNoteIds;
    }

    groupedNotes.forEach(({ note }) => {
      const deviceId = getNoteSenderDeviceId(note);

      if (!deviceId || isMyDeviceNote(note) || seenDeviceIds.has(deviceId)) {
        return;
      }

      seenDeviceIds.add(deviceId);
      firstNoteIds.add(String(note.note_id));
    });

    return firstNoteIds;
  }, [groupedNotes, selectedChannel?.is_private]);

  const pinnedNotes = useMemo(() => {
    const byId = new Map(notes.map((note) => [String(note.note_id), note]));
    return pinnedNoteIds.map((id) => byId.get(String(id))).filter(Boolean);
  }, [notes, pinnedNoteIds]);

  const syncTypingMarker = (formats) => {
    if (!editorRef.current) return false;
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0
      ? selection.getRangeAt(0)
      : savedRangeRef.current;
    if (!range || !range.collapsed) return false;

    const typingColor = normalizeTextColor(
      formats.color || selectedTextColorRef.current || "#111111"
    );

    const marker = document.createElement("span");
    marker.dataset.typingMarker = "true";
    marker.style.fontWeight = formats.bold ? "900" : "400";
    marker.style.textDecoration = formats.underline ? "underline" : "none";
    marker.style.setProperty("color", typingColor, "important");
    marker.style.setProperty("-webkit-text-fill-color", typingColor, "important");
    marker.textContent = "\u200B";
    range.insertNode(marker);

    const nextRange = document.createRange();
    nextRange.setStart(marker.firstChild, 1);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    return true;
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };

  const updateActiveFormats = () => {
    // Formatting buttons reflect explicit toolbar clicks only. Moving the
    // caret or selecting existing formatted text must not activate a button.
    setActiveFormats({ ...typingFormatsRef.current });
  };

  // Apply color only to the current selection. The saved Range is restored before
  // the browser color input changes focus, so mobile/desktop selection is preserved.
  const applyInlineColorToRange = (range, color) => {
    if (!editorRef.current || !range || range.collapsed) return false;
    const selection = window.getSelection();
    const finalColor = normalizeTextColor(color);

    try {
      editorRef.current.focus({ preventScroll: true });
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand("styleWithCSS", false, true);
      const applied = document.execCommand("foreColor", false, finalColor);
      if (!applied) {
        // Fallback for browsers that do not implement foreColor reliably.
        const span = document.createElement("span");
        span.style.color = finalColor;
        try {
          range.surroundContents(span);
        } catch {
          return false;
        }
      }
      const current = window.getSelection();
      if (current && current.rangeCount) {
        savedRangeRef.current = current.getRangeAt(0).cloneRange();
      } else {
        savedRangeRef.current = range.cloneRange();
      }
      return true;
    } catch (error) {
      console.error("Apply selection color error:", error);
      return false;
    }
  };

  const applySelectedFormat = (type, value = null) => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    restoreSelection();

    try {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount
        ? selection.getRangeAt(0)
        : null;
      const hasSelection = Boolean(range && !range.collapsed);
      const currentTypingColor = normalizeTextColor(
        selectedTextColorRef.current || "#111111"
      );

      if (type === "bold" || type === "underline") {
        const next = {
          ...typingFormatsRef.current,
          [type]: hasSelection
            ? !Boolean(document.queryCommandState(type))
            : !typingFormatsRef.current[type],
          color: currentTypingColor,
        };

        document.execCommand("styleWithCSS", false, true);

        const commandIsActive = Boolean(document.queryCommandState(type));
        let nativeCommandApplied = true;

        if (commandIsActive !== next[type]) {
          nativeCommandApplied = document.execCommand(type, false, null);
        }

        typingFormatsRef.current = next;
        setActiveFormats({
          bold: Boolean(next.bold),
          underline: Boolean(next.underline),
        });

        if (!hasSelection) {
          // Preserve the user's current typing color after Bold/Underline changes.
          const colorApplied = document.execCommand(
            "foreColor",
            false,
            currentTypingColor
          );

          setComposerTextColor(currentTypingColor);

          if (!nativeCommandApplied || !colorApplied) {
            syncTypingMarker(next);
          }
        } else {
          // Do not recolor the selected range. Existing inline color must stay.
          saveSelection();
        }

        return;
      }

      if (type === "color") {
        const finalColor = normalizeTextColor(value);
        const currentSelection = window.getSelection();
        const currentRange = currentSelection && currentSelection.rangeCount > 0
          ? currentSelection.getRangeAt(0)
          : savedRangeRef.current;

        if (currentRange && !currentRange.collapsed) {
          // Only the selected characters change color.
          applyInlineColorToRange(currentRange.cloneRange(), finalColor);

          selectedTextColorRef.current = finalColor;
          setTextColor(finalColor);
          setColorModeActive(true);

          const appliedSelection = window.getSelection();
          const appliedRange = appliedSelection?.rangeCount
            ? appliedSelection.getRangeAt(0)
            : null;

          if (appliedRange) {
            // Keep the caret after the selected text so future typing uses
            // the newly selected color.
            appliedRange.collapse(false);
            appliedSelection.removeAllRanges();
            appliedSelection.addRange(appliedRange);
            savedRangeRef.current = appliedRange.cloneRange();
          }

          typingFormatsRef.current = {
            ...typingFormatsRef.current,
            color: finalColor,
          };

          setComposerTextColor(finalColor);
          document.execCommand("styleWithCSS", false, true);
          document.execCommand("foreColor", false, finalColor);
        } else {
          // No selection: only future typing changes color.
          selectedTextColorRef.current = finalColor;
          setTextColor(finalColor);
          setColorModeActive(true);

          typingFormatsRef.current = {
            ...typingFormatsRef.current,
            color: finalColor,
          };

          setComposerTextColor(finalColor);
          document.execCommand("styleWithCSS", false, true);

          const nativeTypingColorApplied = document.execCommand(
            "foreColor",
            false,
            finalColor
          );

          if (!nativeTypingColorApplied) {
            setTypingColorAtCaret(finalColor, savedRangeRef.current);
          }
        }

        saveSelection();
      }
    } catch (error) {
      console.error("Format apply error:", error);
    }
  };
  const applyBold = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applySelectedFormat("bold");
  };

  const applyUnderline = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applySelectedFormat("underline");
  };

  const openColorPicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveSelection();
    colorRef.current?.click();
  };

  const changeColor = (color) => {
    const finalColor = normalizeTextColor(color);
    if (!editorRef.current) return;

    // The native color input takes focus. Keep a clone of the editor range
    // before focusing back, otherwise some browsers reset the caret to start.
    const savedRange = savedRangeRef.current?.cloneRange();
    if (!savedRange || !editorRef.current.contains(savedRange.commonAncestorContainer)) {
      return;
    }

    editorRef.current.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange);
    savedRangeRef.current = savedRange.cloneRange();

    try {
      if (!savedRange.collapsed) {
        // A deliberate text selection changes only that selected text, then
        // keeps its color active for the next word typed after the selection.
        applyInlineColorToRange(savedRange, finalColor);
        selectedTextColorRef.current = finalColor;
        setTextColor(finalColor);
        setColorModeActive(true);

        const appliedSelection = window.getSelection();
        const appliedRange = appliedSelection?.rangeCount
          ? appliedSelection.getRangeAt(0)
          : null;

        if (appliedRange) {
          appliedRange.collapse(false);
          appliedSelection.removeAllRanges();
          appliedSelection.addRange(appliedRange);
          savedRangeRef.current = appliedRange.cloneRange();
        }

        setComposerTextColor(finalColor);
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("foreColor", false, finalColor);
      } else {
        // With no selection, the color becomes the typing color from the
        // current caret onward; already typed text is left untouched.
        setColorModeActive(true);
        setComposerTextColor(finalColor);
        document.execCommand("styleWithCSS", false, true);
        const nativeTypingColorApplied = document.execCommand(
          "foreColor",
          false,
          finalColor
        );

        // Chromium keeps foreColor at a collapsed contentEditable caret. The
        // marker remains only for browsers that do not support that behavior.
        if (!nativeTypingColorApplied) {
          setTypingColorAtCaret(finalColor, savedRange);
        }
      }
    } catch (error) {
      console.error("Color apply error:", error);
    }
    saveSelection();
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      showToast("Please select only images", "error");
      return;
    }
    if (files.length > 3) {
      showToast("Maximum 3 images allowed", "error");
      if (imageRef.current) imageRef.current.value = "";
      return;
    }

    // Every selected item is uploaded separately by saveNote().
    // Never send multiple "image" parts in one backend request.

    previewImages.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    const urls = files.map((file) => URL.createObjectURL(file));
    setSelectedImages(files);
    setSelectedImage(files[0] || null);
    setPreviewImages(urls);
    setPreviewImage(urls[0] || "");
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // One upload per note: choosing attachment removes image preview.
    if (previewImage && previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedFile(file);
    setPreviewFile({
      name: file.name || "Selected file",
      size: file.size || 0,
      type: file.type || "application/octet-stream",
      isNew: true,
    });
    setRemoveOldFile(false);
    setSelectedImage(null);
    setSelectedImages([]);
    setPreviewImage("");
    setPreviewImages([]);
    setRemoveOldImage(true);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const removeImage = () => {
    if (previewImage && previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedImage(null);
    setSelectedImages([]);
    setPreviewImage("");
    setPreviewImages([]);
    setRemoveOldImage(true);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const resetForm = ({ keepPreviewImage = false } = {}) => {
    selectedTextColorRef.current = "#111111";
    typingFormatsRef.current = { bold: false, underline: false, color: "#111111" };
    setComposerTextColor("#111111");
    setColorModeActive(false);
    if (!keepPreviewImage) {
      previewImages.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      if (previewImage && previewImage.startsWith("blob:") && !previewImages.includes(previewImage)) {
        URL.revokeObjectURL(previewImage);
      }
    }

    setSelectedImage(null);
    setSelectedImages([]);
    setPreviewImage("");
    setPreviewImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(false);
    setEditingNoteId(null);
    setComposerMode("message");
    typingFormatsRef.current = { bold: false, underline: false, color: "#111111" };
    setActiveFormats({ bold: false, underline: false });
    setActiveMenuId(null);
    savedRangeRef.current = null;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      scheduleEditorResize();
    }

    try {
      if (document.queryCommandState("bold")) {
        document.execCommand("bold", false, null);
      }

      if (document.queryCommandState("underline")) {
        document.execCommand("underline", false, null);
      }

      document.execCommand("foreColor", false, "#111111");
    } catch (error) {
      // Browser can ignore command state reset when the editor is not focused.
    }

    if (imageRef.current) {
      imageRef.current.value = "";
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const markDeliveryFailed = (tempId, message, previousNote = null) => {
    setNotes((prev) =>
      prev.map((note) =>
        String(note.note_id) === String(tempId)
          ? {
              ...note,
              delivery_status: "failed",
              delivery_error: message || "Unable to send. Try again.",
              previous_note: previousNote,
              is_temp: true,
            }
          : note
      )
    );
  };

  const restoreFailedNote = (note) => {
    if (note?.previous_note) {
      setNotes((prev) => prev.map((item) =>
        String(item.note_id) === String(note.note_id) ? note.previous_note : item
      ));
    } else {
      setNotes((prev) => prev.filter((item) => String(item.note_id) !== String(note?.note_id)));
    }
  };

  const revealLatestMessage = () => {
    // This scrolls only the chat list, never the page/composer.  The local
    // optimistic card is therefore visible before the network request ends.
    requestAnimationFrame(() => {
      const chatBody = chatBodyRef.current;
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    });
  };

  const saveNote = async () => {
    if (!selectedChannel?.channel_id) {
      showToast("Please open channel first", "error");
      return;
    }

    const contentHtml = getComposerContentHtml();
    const plainText = stripHtml(contentHtml).trim();

    if (!plainText && !selectedImage && !previewImage && !selectedFile && !previewFile) {
      showToast("Please add text, image, or file", "error");
      return;
    }

    const currentImageFiles = selectedImages.length ? selectedImages : (selectedImage ? [selectedImage] : []);
    const currentImageFile = currentImageFiles[0] || null;
    const currentPreviewImages = previewImages.length ? previewImages : (previewImage ? [previewImage] : []);
    const currentPreviewImage = currentPreviewImages[0] || "";
    const currentRemoveImage = removeOldImage;
    const currentFile = selectedFile;
    const currentPreviewFile = previewFile;
    const currentRemoveFile = removeOldFile;
    // Individual text fragments carry their own inline color. The note's base
    // color remains black so a later color choice cannot recolor earlier text.
    const currentTextColor = "#111111";
    const currentDeviceId = getCurrentDeviceId();
    const oldEditingId = editingNoteId;
    const now = new Date().toISOString();
    const tempId = oldEditingId || `temp-${Date.now()}`;

    const oldNote = oldEditingId
      ? notes.find((note) => String(note.note_id) === String(oldEditingId))
      : null;

    const noteTitle = getComposerTitleValue(oldNote);
    const originalDeviceId = getNoteSenderDeviceId(oldNote) || currentDeviceId;

    // Lock realtime replacement while this add/update request is in flight.
    // The optimistic UI is shown immediately; API continues in the background.
    isSavingNoteRef.current = true;

    const optimisticNote = {
      note_id: tempId,
      user_id: PUBLIC_USER_ID,
      channel_id: selectedChannel.channel_id,
      sender_device_id: originalDeviceId,
      device_id: originalDeviceId,
      created_device_id: originalDeviceId,
      title: noteTitle,
      content_html: contentHtml,
      text_color: currentTextColor,
      image_url: currentRemoveImage ? null : currentPreviewImage || null,
      image_urls: currentRemoveImage ? [] : currentPreviewImages,
      image_path: null,
      has_image: currentRemoveImage ? false : Boolean(currentPreviewImage),
      has_attachment: currentRemoveFile ? false : Boolean(currentPreviewFile),
      has_file: currentRemoveImage && currentRemoveFile
        ? false
        : Boolean(currentPreviewImage || currentPreviewFile),
      file_name: currentRemoveFile ? null : currentPreviewFile?.name || null,
      file_mime: currentRemoveFile ? null : currentPreviewFile?.type || null,
      file_size: currentRemoveFile ? null : currentPreviewFile?.size || null,
      file_url: null,
      file_download_url: null,
      attachment_url: null,
      attachment_path: null,
      created_at: oldEditingId ? oldNote?.created_at || now : now,
      updated_at: now,
      is_temp: true,
      delivery_status: "uploading",
      delivery_error: "",
    };

    if (oldEditingId) {
      preserveChatView(oldEditingId);
      setNotes((prev) =>
        prev.map((note) =>
          String(note.note_id) === String(oldEditingId)
            ? { ...note, ...optimisticNote }
            : note
        )
      );
    } else {
      setNotes((prev) => [...prev, optimisticNote]);
      revealLatestMessage();
    }

    // Keep the local image URL alive so its optimistic View button works while
    // the upload continues in the background.
    resetForm({ keepPreviewImage: Boolean(currentPreviewImage) });

    try {
      setLoading(true);

      // IMPORTANT:
      // Backend accepts maxCount: 1 for the "image" field.
      // Therefore, when 2-3 images are selected, upload them ONE BY ONE.
      // Each image gets its own telegram_notes row / note_id.
      if (!oldEditingId && currentImageFiles.length > 1) {
        const uploadedNotes = [];

        try {
          for (let imageIndex = 0; imageIndex < currentImageFiles.length; imageIndex += 1) {
            const imageFile = currentImageFiles[imageIndex];
            const imageFormData = new FormData();

            imageFormData.append("user_id", PUBLIC_USER_ID);
            imageFormData.append("channel_id", selectedChannel.channel_id);
            imageFormData.append("device_id", originalDeviceId);
            imageFormData.append("sender_device_id", originalDeviceId);
            imageFormData.append("created_device_id", originalDeviceId);

            // Keep the text/description on the first image only.
            imageFormData.append("title", imageIndex === 0 ? noteTitle : "");
            imageFormData.append("content_html", imageIndex === 0 ? contentHtml : "");
            imageFormData.append("text_color", currentTextColor);
            imageFormData.append("remove_image", "false");
            imageFormData.append("remove_attachment", "false");
            imageFormData.append("image", imageFile);

            const imageResponse = await fetch(
              `${API_URL}/api/telegram-notes`,
              {
                method: "POST",
                headers: getAccessHeaders(),
                body: imageFormData,
              }
            );

            const imageData = await imageResponse.json().catch(() => ({}));

            if (!imageResponse.ok) {
              throw new Error(
                imageData.message ||
                `Image ${imageIndex + 1} upload failed (${imageResponse.status})`
              );
            }

            if (imageData.note) {
              const backendNote = imageData.note;
              uploadedNotes.push({
                ...backendNote,
                channel_id: backendNote.channel_id || selectedChannel.channel_id,
                sender_device_id:
                  backendNote.sender_device_id ||
                  backendNote.device_id ||
                  backendNote.created_device_id ||
                  originalDeviceId,
                device_id:
                  backendNote.device_id ||
                  backendNote.sender_device_id ||
                  backendNote.created_device_id ||
                  originalDeviceId,
                created_device_id:
                  backendNote.created_device_id ||
                  backendNote.sender_device_id ||
                  backendNote.device_id ||
                  originalDeviceId,
                image_path: null,
                is_temp: false,
              });
            }
          }

          // Replace the single optimistic preview with the real individual DB notes.
          setNotes((prev) => [
            ...prev.filter((note) => String(note.note_id) !== String(tempId)),
            ...uploadedNotes,
          ]);

          // Keep channel last-message behavior unchanged.
          fetch(
            `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/last-message`,
            {
              method: "PATCH",
              headers: getJsonHeaders(),
              body: JSON.stringify({
                last_message:
                  noteTitle === "title"
                    ? `Title: ${plainText.slice(0, 70)}`
                    : plainText.slice(0, 80) || "Image message",
              }),
            }
          ).catch((error) => {
            console.error("Last message update error:", error);
          });

          previewImages.forEach((url) => {
            if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
          });

          showToast(
            `${uploadedNotes.length} image${uploadedNotes.length > 1 ? "s" : ""} sent successfully`,
            "success"
          );

          return;
        } catch (error) {
          console.error("Multiple image upload error:", error);

          // Keep the same optimistic card available for recovery instead of
          // silently dropping the images/text that did not upload.
          setNotes((prev) => [
            ...prev.filter((note) => String(note.note_id) !== String(tempId)),
            ...uploadedNotes,
            {
              ...optimisticNote,
              delivery_status: "failed",
              delivery_error: error.message || "Image upload failed",
              previous_note: null,
            },
          ]);

          showToast(error.message || "Image upload failed", "error");
          return;
        }
      }

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("device_id", originalDeviceId);
      formData.append("sender_device_id", originalDeviceId);
      formData.append("created_device_id", originalDeviceId);
      formData.append("title", noteTitle);
      formData.append("content_html", contentHtml);
      formData.append("text_color", currentTextColor);
      formData.append("remove_image", currentRemoveImage ? "true" : "false");
      formData.append("remove_attachment", currentRemoveFile ? "true" : "false");

      if (currentImageFile) {
        formData.append("image", currentImageFile);
      }

      if (currentFile) {
        formData.append("file", currentFile);
      }

      const url = oldEditingId
        ? `${API_URL}/api/telegram-notes/${oldEditingId}`
        : `${API_URL}/api/telegram-notes`;

      const method = oldEditingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAccessHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || "Action failed";
        showToast(errorMessage, "error");
        markDeliveryFailed(tempId, errorMessage, oldNote);

        if (res.status === 403 && !channelAccessGrantedRef.current) {
          setChannelUnlocked(false);
          localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        }

        return;
      }

      const backendNote = data.note || {};
      const backendContentHtml = String(backendNote.content_html || "");
      const keepLocalFormatting =
        hasInlineTextFormatting(contentHtml) &&
        !hasInlineTextFormatting(backendContentHtml) &&
        stripHtml(contentHtml).trim() === stripHtml(backendContentHtml).trim();

      const savedNote = {
        ...optimisticNote,
        ...backendNote,
        channel_id: backendNote.channel_id || selectedChannel.channel_id,
        sender_device_id:
          backendNote.sender_device_id ||
          backendNote.device_id ||
          backendNote.created_device_id ||
          originalDeviceId,
        device_id:
          backendNote.device_id ||
          backendNote.sender_device_id ||
          backendNote.created_device_id ||
          originalDeviceId,
        created_device_id:
          backendNote.created_device_id ||
          backendNote.sender_device_id ||
          backendNote.device_id ||
          originalDeviceId,
        title: backendNote.title !== undefined ? backendNote.title : noteTitle,
        text_color: backendNote.text_color || currentTextColor,
        content_html: keepLocalFormatting
          ? contentHtml
          : backendContentHtml || contentHtml,
        image_url: currentRemoveImage
          ? null
          : backendNote.image_url || optimisticNote.image_url || null,
        image_urls: currentRemoveImage
          ? []
          : Array.isArray(backendNote.image_urls) && backendNote.image_urls.length
            ? backendNote.image_urls
            : optimisticNote.image_urls || [],
        image_path: null,
        has_image: currentRemoveImage
          ? false
          : Boolean(backendNote.has_image || backendNote.image_url || optimisticNote.image_url),
        has_attachment: currentRemoveFile
          ? false
          : Boolean(
              backendNote.has_attachment ||
                backendNote.attachment_url ||
                backendNote.file_name ||
                optimisticNote.file_name
            ),
        has_file: Boolean(
          backendNote.has_file ||
            backendNote.has_image ||
            backendNote.has_attachment ||
            backendNote.file_url ||
            backendNote.image_url ||
            optimisticNote.has_file
        ),
        file_name: backendNote.file_name || backendNote.attachment_name || optimisticNote.file_name || null,
        file_mime: backendNote.file_mime || backendNote.attachment_mime || optimisticNote.file_mime || null,
        file_size: backendNote.file_size || backendNote.attachment_size || optimisticNote.file_size || null,
        file_url: backendNote.file_url || backendNote.attachment_url || optimisticNote.file_url || null,
        file_download_url: backendNote.file_download_url || optimisticNote.file_download_url || null,
        attachment_url: backendNote.attachment_url || optimisticNote.attachment_url || null,
        attachment_path: null,
        file_previewable: backendNote.file_previewable,
        created_at: backendNote.created_at || optimisticNote.created_at,
        updated_at: backendNote.updated_at || new Date().toISOString(),
        is_temp: false,
        delivery_status: "sent",
        delivery_error: "",
      };

      if (oldEditingId) {
        preserveChatView(oldEditingId);
        setNotes((prev) =>
          prev.map((note) =>
            String(note.note_id) === String(oldEditingId) ? savedNote : note
          )
        );
      } else {
        setNotes((prev) =>
          prev.map((note) =>
            String(note.note_id) === String(tempId) ? savedNote : note
          )
        );
      }

      if (currentPreviewImage?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreviewImage);
      }

      fetch(
        `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/last-message`,
        {
          method: "PATCH",
          headers: getJsonHeaders(),
          body: JSON.stringify({
            last_message: noteTitle === "title"
              ? `Title: ${plainText.slice(0, 70)}`
              : plainText.slice(0, 80) ||
                (currentPreviewFile?.name
                  ? `File: ${currentPreviewFile.name}`
                  : "Image message"),
          }),
        }
      );

      showToast(oldEditingId ? "Message updated" : "Message sent", "success");
    } catch (error) {
      console.error("Save note error:", error);
      const errorMessage = error.message || "Server error";
      showToast(errorMessage, "error");
      markDeliveryFailed(tempId, errorMessage, oldNote);
      // Keep the local preview alive so the failed card is not blank.
    } finally {
      isSavingNoteRef.current = false;
      setLoading(false);
    }
  };

  const setTypingColorAtCaret = (color, rangeOverride = null) => {
    if (!editorRef.current) return false;

    const selection = window.getSelection();
    const range = rangeOverride?.cloneRange() || savedRangeRef.current?.cloneRange();

    if (
      !range ||
      !range.collapsed ||
      !editorRef.current.contains(range.commonAncestorContainer)
    ) {
      return false;
    }

    selection?.removeAllRanges();
    selection?.addRange(range);

    const finalColor = normalizeTextColor(color);
    let existingMarker = null;
    let node = range.startContainer;

    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (node instanceof HTMLElement) {
      existingMarker = node.closest('span[data-typing-color-marker="true"]');
    }

    // Reuse the existing zero-width typing marker instead of inserting a new
    // marker at a stale range. This prevents the caret from jumping to the
    // beginning and prevents the previous color from leaking into new text.
    if (
      existingMarker &&
      existingMarker.parentNode &&
      editorRef.current.contains(existingMarker)
    ) {
      existingMarker.style.setProperty("color", finalColor, "important");
      existingMarker.style.setProperty("-webkit-text-fill-color", finalColor, "important");

      const markerText = existingMarker.firstChild;
      const nextRange = document.createRange();
      if (markerText) {
        nextRange.setStart(markerText, markerText.nodeValue.length);
      } else {
        nextRange.setStartAfter(existingMarker);
      }
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedRangeRef.current = nextRange.cloneRange();
      return true;
    }

    const marker = document.createElement("span");
    marker.dataset.typingColorMarker = "true";
    marker.style.setProperty("color", finalColor, "important");
    marker.style.setProperty("-webkit-text-fill-color", finalColor, "important");
    marker.textContent = "\u200B";

    range.insertNode(marker);

    const nextRange = document.createRange();
    nextRange.setStart(marker.firstChild, 1);
    nextRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();

    return true;
  };

  const startEdit = (note) => {
    if (note.is_temp) return;

    const noteHasImage = hasNoteImage(note);
    const noteHasAttachment = hasNoteAttachment(note);

    setEditingNoteId(note.note_id);
    setComposerMode(
      isTitleNote(note)
        ? "title"
        : noteHasImage
          ? "image-caption"
          : noteHasAttachment
            ? "file-caption"
            : "message"
    );
    setComposerTextColor(getNoteTextColor(note));
    const noteImageUrls = noteHasImage ? getNoteImageUrls(note) : [];
    setPreviewImage(noteImageUrls[0] || "");
    setPreviewImages(noteImageUrls);
    setSelectedImage(null);
    setSelectedImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(
      noteHasAttachment
        ? {
            name: getNoteFileName(note),
            size: note.file_size || note.attachment_size || 0,
            type: getNoteFileMime(note) || "application/octet-stream",
            isNew: false,
          }
        : null
    );
    setRemoveOldFile(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      scheduleEditorResize();
    }

    requestAnimationFrame(() => {
      placeCaretAtEnd();
      editorRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  };

  const startImageUpdate = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("image-update");
    setComposerTextColor(getNoteTextColor(note));
    const noteImageUrls = getNoteImageUrls(note);
    setPreviewImage(noteImageUrls[0] || "");
    setPreviewImages(noteImageUrls);
    setSelectedImage(null);
    setSelectedImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      scheduleEditorResize();
      placeCaretAtEnd();
    }

    setTimeout(() => {
      imageRef.current?.click();
    }, 80);
  };

  const startImageCaption = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("image-caption");
    setComposerTextColor(getNoteTextColor(note));
    const noteImageUrls = getNoteImageUrls(note);
    setPreviewImage(noteImageUrls[0] || "");
    setPreviewImages(noteImageUrls);
    setSelectedImage(null);
    setSelectedImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      scheduleEditorResize();
    }

    setTimeout(() => {
      placeCaretAtEnd();
    }, 100);
  };

  const startFileUpdate = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("file-update");
    setComposerTextColor(getNoteTextColor(note));
    setPreviewImage("");
    setSelectedImage(null);
    setRemoveOldImage(true);
    setSelectedFile(null);
    setPreviewFile({
      name: getNoteFileName(note),
      size: note.file_size || note.attachment_size || 0,
      type: getNoteFileMime(note) || "application/octet-stream",
      isNew: false,
    });
    setRemoveOldFile(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      scheduleEditorResize();
      placeCaretAtEnd();
    }

    setTimeout(() => {
      fileRef.current?.click();
    }, 80);
  };

  const startFileCaption = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("file-caption");
    setComposerTextColor(getNoteTextColor(note));
    setPreviewImage("");
    setSelectedImage(null);
    setRemoveOldImage(true);
    setSelectedFile(null);
    setPreviewFile({
      name: getNoteFileName(note),
      size: note.file_size || note.attachment_size || 0,
      type: getNoteFileMime(note) || "application/octet-stream",
      isNew: false,
    });
    setRemoveOldFile(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      scheduleEditorResize();
    }

    setTimeout(() => {
      placeCaretAtEnd();
    }, 100);
  };

  const markNoteAsTitle = async (note) => {
    if (note.is_temp || hasAnyNoteFile(note)) return;

    const oldNotes = notes;
    const noteWasTitle = isTitleNote(note);
    const nextTitle = noteWasTitle ? "" : "title";
    const nextContentHtml = nextTitle === "title"
      ? applyFirstLineHeadingHtml(note.content_html || "")
      : removeFirstLineHeadingHtml(note.content_html || "");
    const successMessage = noteWasTitle ? "Title style removed" : "Title style added";

    // Keep the optimistic title change visible until the API finishes.
    isSavingNoteRef.current = true;

    setActiveMenuId(null);
    preserveChatView(note.note_id);

    setNotes((prev) =>
      prev.map((item) =>
        String(item.note_id) === String(note.note_id)
          ? { ...item, title: nextTitle, content_html: nextContentHtml, updated_at: new Date().toISOString() }
          : item
      )
    );

    try {
      setLoading(true);

      const formData = new FormData();
      const noteDeviceId = getNoteSenderDeviceId(note) || getCurrentDeviceId();

      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("device_id", noteDeviceId);
      formData.append("sender_device_id", noteDeviceId);
      formData.append("created_device_id", noteDeviceId);
      formData.append("title", nextTitle);
      formData.append("is_title", nextTitle === "title" ? "true" : "false");
      formData.append("title_mode", nextTitle === "title" ? "title" : "normal");
      formData.append("note_type", nextTitle === "title" ? "title" : "normal");
      formData.append("content_html", nextContentHtml);
      formData.append("text_color", note.text_color || "#111111");
      formData.append("remove_image", "false");
      formData.append("remove_attachment", "false");

      const res = await fetch(`${API_URL}/api/telegram-notes/${note.note_id}`, {
        method: "PUT",
        headers: getAccessHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        preserveChatView(note.note_id);
        setNotes(oldNotes);
        showToast(data.message || "Title update failed", "error");
        return;
      }

      const backendNote = data.note || {};

      preserveChatView(note.note_id);

      setNotes((prev) =>
        prev.map((item) =>
          String(item.note_id) === String(note.note_id)
            ? { ...item, ...backendNote, title: nextTitle, content_html: nextContentHtml }
            : item
        )
      );

      showToast(successMessage, "success");
    } catch (error) {
      console.error("Title update error:", error);
      preserveChatView(note.note_id);
      setNotes(oldNotes);
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleNoteLink = async (note) => {
    if (note?.is_temp || !selectedChannel?.channel_id) return;
    const noteId = String(note.note_id);
    const currentlyLinked = isLinkedNote(note);
    const currentHtml = String(note.content_html || "");
    const nextContentHtml = currentlyLinked ? unlinkNoteHtml(currentHtml) : linkifyNoteHtml(currentHtml);
    if (!nextContentHtml || nextContentHtml === currentHtml) {
      setActiveMenuId(null);
      showToast(currentlyLinked ? "Link already normal" : "No link found in this message", "error");
      return;
    }
    const oldNotes = notes;
    const oldLinked = linkedNoteIds;
    const oldUnlinked = unlinkedNoteIds;
    const nextLinked = currentlyLinked ? linkedNoteIds.filter((id) => String(id) !== noteId) : Array.from(new Set([...linkedNoteIds, noteId]));
    const nextUnlinked = currentlyLinked ? Array.from(new Set([...unlinkedNoteIds, noteId])) : unlinkedNoteIds.filter((id) => String(id) !== noteId);
    isSavingNoteRef.current = true;
    setActiveMenuId(null);
    preserveChatView(note.note_id);
    setLinkedNoteIds(nextLinked);
    setUnlinkedNoteIds(nextUnlinked);
    saveLinkState(selectedChannel.channel_id, nextLinked, nextUnlinked);
    setNotes((prev) => prev.map((item) => String(item.note_id) === noteId ? { ...item, content_html: nextContentHtml, updated_at: new Date().toISOString() } : item));
    try {
      const formData = new FormData();
      const noteDeviceId = getNoteSenderDeviceId(note) || getCurrentDeviceId();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("device_id", noteDeviceId);
      formData.append("sender_device_id", noteDeviceId);
      formData.append("created_device_id", noteDeviceId);
      formData.append("title", note.title || "");
      formData.append("is_title", isTitleNote(note) ? "true" : "false");
      formData.append("title_mode", isTitleNote(note) ? "title" : "normal");
      formData.append("note_type", isTitleNote(note) ? "title" : "normal");
      formData.append("content_html", nextContentHtml);
      formData.append("text_color", note.text_color || "#111111");
      formData.append("remove_image", "false");
      formData.append("remove_attachment", "false");
      const res = await fetch(`${API_URL}/api/telegram-notes/${note.note_id}`, { method: "PUT", headers: getAccessHeaders(), body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Link update failed");
      const backendNote = data.note || {};
      preserveChatView(note.note_id);
      setNotes((prev) => prev.map((item) => String(item.note_id) === noteId ? { ...item, ...backendNote, content_html: nextContentHtml } : item));
      showToast(currentlyLinked ? "Link removed" : "Link enabled", "success");
    } catch (error) {
      console.error("Link toggle error:", error);
      preserveChatView(note.note_id);
      setNotes(oldNotes);
      setLinkedNoteIds(oldLinked);
      setUnlinkedNoteIds(oldUnlinked);
      saveLinkState(selectedChannel.channel_id, oldLinked, oldUnlinked);
      showToast(error?.message || "Server error", "error");
    } finally {
      isSavingNoteRef.current = false;
    }
  };

  const togglePinnedNote = (note) => {
    if (!selectedChannel?.channel_id || !note?.note_id) return;
    const noteId = String(note.note_id);
    const alreadyPinned = pinnedNoteIds.some((id) => String(id) === noteId);
    let nextPins;
    if (alreadyPinned) {
      nextPins = pinnedNoteIds.filter((id) => String(id) !== noteId);
    } else {
      if (pinnedNoteIds.length >= 5) {
        showToast("Maximum 5 pinned messages", "error");
        return;
      }
      nextPins = [...pinnedNoteIds, noteId];
    }
    setActiveMenuId(null);
    setPinnedNoteIds(nextPins);
    savePinnedNoteIds(selectedChannel.channel_id, nextPins);
    showToast(alreadyPinned ? "Pin removed" : "Message pinned", "success");
  };
  const getPinnedNotePreview = (note) => {
    if (!note) return "Pinned message";

    const text = stripHtml(note.content_html || "").trim();

    if (text) {
      return text.length > 58 ? `${text.slice(0, 58)}...` : text;
    }

    if (hasNoteImage(note)) return "Pinned image";
    if (hasNoteAttachment(note)) return `Pinned file: ${getNoteFileName(note)}`;

    return "Pinned message";
  };

  const refreshCurrentPage = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (
      manualRefreshing ||
      isSavingNoteRef.current ||
      !selectedChannel?.channel_id ||
      (isTrue(selectedChannel.is_private) && !channelUnlocked)
    ) {
      return;
    }

    preserveChatView();
    setManualRefreshing(true);

    try {
      await fetchNotes(
        selectedChannel.channel_id,
        verifiedPinRef.current || getSavedChannelPin(),
        true,
        true
      );
    } finally {
      setManualRefreshing(false);
    }
  };

  const htmlToClipboardText = (html) => {
    if (typeof document === "undefined") return "";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    const render = (node, listState = null) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      let out = "";
      if (tag === "br") return "\n";
      if (tag === "li") {
        const index = listState?.ordered ? listState.index++ : null;
        const prefix = listState?.ordered ? `${index}. ` : "- ";
        out += prefix;
      }
      const childListState = tag === "ol" ? { ordered: true, index: 1 } : tag === "ul" ? { ordered: false } : listState;
      for (const child of node.childNodes) out += render(child, childListState);
      if (["div","p","li","section","article","h1","h2","h3","h4","h5","h6","pre"].includes(tag)) out += "\n";
      return out;
    };

    return render(wrapper)
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+|\n+$/g, "")
      .replace(/[ \t]+\n/g, "\n");
  };

  const copyNoteText = async (event, note) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const htmlValue = sanitizeNoteHtml(note?.content_html || "");
    const text = htmlToClipboardText(htmlValue).trim();
    const copyValue =
      text ||
      (hasNoteAttachment(note)
        ? getNoteFileName(note)
        : hasNoteImage(note)
          ? "Image"
          : "");

    if (!copyValue) {
      showToast("No text to copy", "error");
      return;
    }

    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined" && htmlValue) {
        const item = new ClipboardItem({
          "text/html": new Blob([htmlValue], { type: "text/html" }),
          "text/plain": new Blob([copyValue], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        const helper = document.createElement("textarea");
        helper.value = copyValue;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }

      setActiveMenuId(null);
      showToast("Copied", "success");
    } catch (error) {
      console.error("Copy note text error:", error);
      showToast("Copy failed", "error");
    }
  };

  const goToPinnedNote = (noteId) => {
    const targetId = String(noteId || "");
    setShowPinnedList(false);
    setActiveMenuId(null);
    if (!targetId) return;
    const target = noteRefs.current[targetId];
    if (!target) {
      showToast("Pinned message not found", "error");
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (pinnedScrollTimerRef.current) clearTimeout(pinnedScrollTimerRef.current);
    // Pin navigation must only scroll to the message. Never open its three-dot menu.
    setActiveMenuId(null);
    if (pinnedScrollTimerRef.current) {
      clearTimeout(pinnedScrollTimerRef.current);
      pinnedScrollTimerRef.current = null;
    }
  };
  const deleteNote = async (noteId) => {
    const oldNotes = notes;

    // Lock realtime replacement first. The deleted card disappears immediately
    // while the DELETE request runs in the background.
    isSavingNoteRef.current = true;

    preserveChatView(noteId);

    setNotes((prev) =>
      prev.filter((note) => String(note.note_id) !== String(noteId))
    );

    setActiveMenuId(null);

    if (pinnedNoteIds.some((id) => String(id) === String(noteId))) {
      const nextPins = pinnedNoteIds.filter((id) => String(id) !== String(noteId));
      setPinnedNoteIds(nextPins);
      savePinnedNoteIds(selectedChannel?.channel_id, nextPins);
    }

    try {
      const res = await fetch(`${API_URL}/api/telegram-notes/${noteId}`, {
        method: "DELETE",
        headers: getAccessHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Delete failed", "error");
        // API failed: restore the previous UI exactly.
        preserveChatView();
        setNotes(oldNotes);

        if (res.status === 403 && !channelAccessGrantedRef.current) {
          setChannelUnlocked(false);
          localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        }

        return;
      }

      showToast("Deleted", "deleted");
    } catch (error) {
      console.error("Delete note error:", error);
      showToast("Server error while deleting", "error");
      preserveChatView();
      setNotes(oldNotes);
    } finally {
      isSavingNoteRef.current = false;
      setLoading(false);
    }
  };

  const backToChannels = () => {
    resetForm();
    window.location.hash = "/teligram-channels";
  };

  const privateChannelLocked =
    selectedChannel &&
    isTrue(selectedChannel.is_private) &&
    !channelUnlocked &&
    !channelAccessGrantedRef.current;

  return (
    <div className="nm-screen" onClick={() => setActiveMenuId(null)}>
      <div className="nm-phone">
        <header className="nm-header">
          <button className="header-icon-btn back-btn" onClick={backToChannels}>
            ‹
          </button>

          <div
            className={`header-brand-row ${brandPop ? "brand-pop" : ""}`}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setBrandPop(true);
              window.setTimeout(() => setBrandPop(false), 420);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setBrandPop(true);
                window.setTimeout(() => setBrandPop(false), 420);
              }
            }}
            aria-label="Channel info"
          >
            <div className="header-logo">
              {(selectedChannel?.logo_url || selectedChannel?.has_logo) && (
                <img
                  src={getChannelLogoUrl(selectedChannel)}
                  alt="logo"
                  onError={(e) => handleImageError(e, "", "telegram-channels")}
                />
              )}
              <span className="logo-fallback-letter">
                {getInitial(selectedChannel?.channel_name)}
              </span>
            </div>

            <div className="header-title">
              <h2>{selectedChannel?.channel_name || "Notes"}</h2>
              {selectedChannel?.channel_tagline && (
                <p>{selectedChannel.channel_tagline}</p>
              )}
            </div>
          </div>

          {!privateChannelLocked && (
            <button
              type="button"
              className={`header-icon-btn search-btn ${searchOpen ? "active" : ""}`}
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearchText("");
              }}
              title="Search"
              aria-label="Search"
            >
              🔍
            </button>
          )}
        </header>

        {privateChannelLocked ? (
          <main className="unlock-screen">
            <div className="unlock-card">
              <div className="unlock-logo">
                {(selectedChannel?.logo_url || selectedChannel?.has_logo) && (
                  <img
                    src={getChannelLogoUrl(selectedChannel)}
                    alt="logo"
                    onError={(e) => handleImageError(e, "", "telegram-channels")}
                  />
                )}
                <span className="logo-fallback-letter">
                  {getInitial(selectedChannel?.channel_name)}
                </span>
              </div>

              <div className="unlock-lock">🔐</div>

              <h3>Private Channel</h3>

              <p>
                Enter 4 digit PIN to open <b>{selectedChannel?.channel_name}</b>
              </p>

              {selectedChannel?.channel_tagline && (
                <div className="unlock-tagline">
                  {selectedChannel.channel_tagline}
                </div>
              )}

              <input
                className="center-pin-input"
                type="text"
                inputMode="numeric"
                maxLength="4"
                placeholder="0000"
                value={unlockPin}
                autoFocus
                onChange={(e) => {
                  setUnlockPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setUnlockError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyPrivateChannelPin();
                  }
                }}
              />

              <label className="trust-device-row">
                <input
                  type="checkbox"
                  checked={unlockTrustDevice}
                  onChange={(e) => setUnlockTrustDevice(e.target.checked)}
                  disabled={unlockChecking}
                />
                <span className="trust-device-checkmark">✓</span>
                <span className="trust-device-label">Trust this device</span>
              </label>

              <p className="trust-device-hint">
                Next time this device can open the channel without asking for the PIN.
              </p>

              {unlockError && <div className="unlock-error">{unlockError}</div>}

              <button
                className="unlock-open-btn"
                onClick={verifyPrivateChannelPin}
                disabled={unlockChecking}
              >
                {unlockChecking ? "Checking..." : "Open Channel"}
              </button>

              <button className="unlock-back-btn" onClick={backToChannels}>
                Back
              </button>
            </div>
          </main>
        ) : (
          <>
            {searchOpen && (
              <div className="search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search text, file, or date..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchText("");
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {searchOpen && searchText.trim() && (
              <div className="search-result-bar">
                Showing {filteredNotes.length} result{filteredNotes.length === 1 ? "" : "s"} for "{searchText.trim()}"
              </div>
            )}

            {pinnedNotes.length > 0 && (
              <div className="pin-section">
                <button
                  type="button"
                  className={`pin-section-trigger ${showPinnedList ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPinnedList((value) => !value);
                  }}
                  title={showPinnedList ? "Hide pinned messages" : "Show pinned messages"}
                  aria-expanded={showPinnedList}
                >
                  <span className="pin-section-round-icon">📌</span>
                  <span className="pin-section-count">{pinnedNotes.length}</span>
                </button>

                {showPinnedList && (
                  <div className="pinned-note-jump-list" onClick={(e) => e.stopPropagation()}>
                    {pinnedNotes.map((pin, index) => (
                      <button
                        type="button"
                        className="pinned-note-jump"
                        key={pin.note_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPinnedNote(pin.note_id);
                        }}
                        title={`Go to pinned message ${index + 1}`}
                      >
                        <span className="pinned-note-icon">📌</span>
                        <span className="pinned-note-label">Pin {index + 1}</span>
                        <strong>{getPinnedNotePreview(pin)}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <main ref={chatBodyRef} className="chat-body" onClick={closeChatKeyboard}>
              {groupedNotes.length === 0 && (
                <div className="empty-card">
                  <div className="empty-icon">✦</div>
                  <h3>{searchText ? "No match found" : "No messages yet"}</h3>
                  <p>
                    {searchText
                      ? "Try another search word"
                      : "Start typing below"}
                  </p>
                </div>
              )}

              {groupedNotes.map(
                ({
                  note,
                  messageDate,
                  showDateBadge,
                  dateLabel,
                  badgeColor1,
                  badgeColor2,
                }) => {
                  const hasText = hasNoteText(note);
                  const hasImage = hasNoteImage(note);
                  const hasAttachment = hasNoteAttachment(note);
                  const titleMessage = isTitleNote(note);
                  const linkMessage = isLinkedNote(note);
                  const messageFromThisDevice = isMyDeviceNote(note);
                  const deviceTheme = getDeviceTheme(note);
                  const showDeviceChip =
                    !messageFromThisDevice &&
                    !isTrue(selectedChannel?.is_private) &&
                    publicDeviceChipNoteIds.has(String(note.note_id));

                  const pinnedMessage = pinnedNoteIds.some((id) => String(id) === String(note.note_id));

                  return (
                    <div
                      className={`note-block ${pinnedMessage ? "pinned-note-block" : ""}`}
                      key={note.note_id}
                      ref={(element) => {
                        if (element) {
                          noteRefs.current[String(note.note_id)] = element;
                        } else {
                          delete noteRefs.current[String(note.note_id)];
                        }
                      }}
                    >
                      {showDateBadge && (
                        <div className="date-separator">
                          <span
                            style={{
                              "--badge1": badgeColor1,
                              "--badge2": badgeColor2,
                              background: `linear-gradient(135deg, ${badgeColor1}, ${badgeColor2})`,
                            }}
                          >
                            {dateLabel}
                          </span>
                        </div>
                      )}

                      <div
                        className={`message-line ${
                          messageFromThisDevice
                            ? "my-message-line"
                            : "other-message-line"
                        } ${
                          String(activeMenuId) === String(note.note_id) ? "message-active" : ""
                        }`}
                        onClick={() => setActiveMenuId(null)}
                      >
                        <div
                          className={`message-bubble ${
                            messageFromThisDevice
                              ? "my-message-bubble"
                              : "other-message-bubble"
                          } ${
                            hasImage && !hasText ? "image-only" : ""
                          } ${hasAttachment && !hasText ? "file-only" : ""} ${
                            titleMessage ? "title-bubble" : ""
                          } ${showDeviceChip ? "new-device-message" : ""} ${pinnedMessage ? "pinned-message-bubble" : ""}`}
                          style={{
                            "--device-card-1": deviceTheme.card1,
                            "--device-card-2": deviceTheme.card2,
                            "--device-accent": deviceTheme.accent,
                          }}
                          onDoubleClick={(e) => {
                            if (!note.is_temp && hasText && !hasImage && !hasAttachment) {
                              e.stopPropagation();
                              if (linkMessage) toggleNoteLink(note);
                              else markNoteAsTitle(note);
                            }
                          }}
                        >
                          {showDeviceChip && (
                            <div className="device-source-chip">ND</div>
                          )}

                          {titleMessage && (
                            <span className="message-title-badge" aria-label="Title">
                              TITLE
                            </span>
                          )}

                          {linkMessage && (
                            <span className="message-link-badge" aria-label="Link">
                              LINK
                            </span>
                          )}

                          {pinnedMessage && (
                            <button
                              type="button"
                              className="pinned-message-chip"
                              title="Open pinned message"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToPinnedNote(note.note_id);
                              }}
                            >
                              📌
                            </button>
                          )}

                          <button
                            className="message-dot-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(
                                String(activeMenuId) === String(note.note_id)
                                  ? null
                                  : note.note_id
                              );
                            }}
                            title="Options"
                          >
                            ⋮
                          </button>

                          {hasImage && (
                            <div className={`image-message-wrap ${hasText ? "with-description" : ""}`}>
                              {note.delivery_status === "uploading" ? (
                                <div className="upload-image-preview">
                                  <img src={getNoteImageUrl(note)} alt="Uploading preview" className="message-image" />
                                  <span className="image-spinner" aria-label="Uploading image" />
                                </div>
                              ) : inlineImageStates[String(note.note_id)] === "loaded" ? (
                                <div className="whatsapp-image-frame">
                                  <div className="message-image-grid">
                                    {getNoteImageUrls(note).map((imageUrl, imageIndex) => (
                                      <img
                                        key={`${note.note_id}-${imageIndex}`}
                                        src={imageUrl}
                                        alt={`note ${imageIndex + 1}`}
                                        className="message-image"
                                        onError={() =>
                                          setInlineImageStates((states) => ({
                                            ...states,
                                            [String(note.note_id)]: "error",
                                          }))
                                        }
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="image-view-card"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineImageStates((states) => ({
                                      ...states,
                                      [String(note.note_id)]: "loading",
                                    }));
                                  }}
                                  aria-label="View image"
                                >
                                  {inlineImageStates[String(note.note_id)] === "loading" ? (
                                    <>
                                      <span className="image-spinner image-card-spinner" />
                                      <img
                                        src={getNoteImageUrl(note)}
                                        alt=""
                                        className="inline-image-preloader"
                                        onLoad={() =>
                                          setInlineImageStates((states) => ({
                                            ...states,
                                            [String(note.note_id)]: "loaded",
                                          }))
                                        }
                                        onError={() =>
                                          setInlineImageStates((states) => ({
                                            ...states,
                                            [String(note.note_id)]: "error",
                                          }))
                                        }
                                      />
                                    </>
                                  ) : (
                                    <span>{inlineImageStates[String(note.note_id)] === "error" ? "Image unavailable" : "View image"}</span>
                                  )}
                                </button>
                              )}

                              {hasText && (
                                <div
                                  className="image-description-text"
                                  style={{ "--noteColor": getNoteTextColor(note), color: getNoteTextColor(note) }}
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeNoteHtml(getRenderedNoteHtml(note)),
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {hasAttachment && (
                            <div className={`file-message-wrap ${hasText ? "with-description" : ""}`}>
                              <button
                                type="button"
                                className="file-card"
                                onClick={(e) => openNoteFile(e, note)}
                                title={isNoteFilePreviewable(note) ? "Open file" : "Download file"}
                              >
                                <span className="file-type-badge">
                                  {getFileTypeLabel(note)}
                                </span>
                                <span className="file-info">
                                  <strong>{getNoteFileName(note)}</strong>
                                  <small>
                                    {formatFileSize(note.file_size || note.attachment_size)}
                                    {formatFileSize(note.file_size || note.attachment_size) ? " • " : ""}
                                    {isNoteFilePreviewable(note) ? "Open / View" : "Download"}
                                  </small>
                                </span>
                                <span className="file-download-mini">↧</span>
                              </button>

                              {hasText && (
                                <div
                                  className="image-description-text file-description-text"
                                  style={{ "--noteColor": getNoteTextColor(note), color: getNoteTextColor(note) }}
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeNoteHtml(getRenderedNoteHtml(note)),
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {hasText && !hasImage && !hasAttachment && (
                            <div
                              className={`message-text ${
                                titleMessage ? "message-title-text" : ""
                              }`}
                              style={{ "--noteColor": getNoteTextColor(note), color: getNoteTextColor(note) }}
                              dangerouslySetInnerHTML={{
                                __html: sanitizeNoteHtml(getRenderedNoteHtml(note)),
                              }}
                            />
                          )}

                          <div className={`message-time ${note.is_temp ? "message-time-temp" : ""}`}>
                            {formatIndiaTimeOnly(messageDate)}
                          </div>

                          {note.delivery_status === "uploading" && (
                            <div className="delivery-state delivery-uploading" role="status">
                              <span className="delivery-spinner" /> Uploading…
                            </div>
                          )}

                          {note.delivery_status === "failed" && (
                            <div className="delivery-state delivery-failed" role="alert">
                              <span>{note.delivery_error || "Message was not sent"}</span>
                              <button type="button" onClick={() => restoreFailedNote(note)}>
                                {note.previous_note ? "Restore" : "Remove"}
                              </button>
                            </div>
                          )}
                        </div>

                        {String(activeMenuId) === String(note.note_id) && !note.is_temp && (
                          <div className="message-action-row" onClick={(e) => e.stopPropagation()}>
                            {hasImage ? (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startImageUpdate(note)}
                                >
                                  Image update
                                </button>

                                <button
                                  className="square-action text-square"
                                  onClick={() => startImageCaption(note)}
                                >
                                  Add Text
                                </button>

                                <button
                                  className="square-action download-square"
                                  onClick={(e) => downloadNoteImage(e, note)}
                                >
                                  Download
                                </button>

                                <button
                                  className="square-action view-full-square"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openFullImagePreview(getNoteImageUrl(note));
                                  }}
                                >
                                  View Full Image
                                </button>
                              </>
                            ) : hasAttachment ? (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startFileUpdate(note)}
                                >
                                  File
                                </button>

                                <button
                                  className="square-action text-square"
                                  onClick={() => startFileCaption(note)}
                                >
                                  {hasText ? "Text" : "Add Text"}
                                </button>

                                <button
                                  className="square-action download-square"
                                  onClick={(e) => downloadNoteFile(e, note)}
                                >
                                  Download
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startEdit(note)}
                                >
                                  Update
                                </button>

                                <button
                                  className="square-action title-square"
                                  onClick={() => markNoteAsTitle(note)}
                                >
                                  {titleMessage ? "Normal" : "Title"}
                                </button>
                              </>
                            )}

                            <button
                              className="square-action copy-square"
                              onClick={(e) => copyNoteText(e, note)}
                            >
                              Copy
                            </button>

                            {hasText && (
                              <button
                                type="button"
                                className="square-action link-square"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNoteLink(note);
                                }}
                                title={linkMessage ? "Remove link" : "Make full URL clickable"}
                                aria-label={linkMessage ? "Remove link" : "Make full URL clickable"}
                              >
                                🔗 {linkMessage ? "Unlink" : "Link"}
                              </button>
                            )}

                            <button
                              className={`square-action pin-square ${pinnedMessage ? "active-pin" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinnedNote(note);
                              }}
                            >
                              {pinnedMessage ? "Unpin" : "Pin"}
                            </button>

                            <button
                              className="square-action delete-square"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                preserveChatView(note.note_id);
                                openConfirm(
                                  "Delete?",
                                  "Delete this message?",
                                  () => deleteNote(note.note_id)
                                );
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              <div ref={bottomRef}></div>
            </main>

            {fullImagePreview && (
              <div
                className="image-viewer-overlay"
                onClick={closeFullImagePreview}
                role="dialog"
                aria-modal="true"
              >
                <div
                  className="image-viewer-box"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={handleImageViewerTouchStart}
                  onTouchMove={handleImageViewerTouchMove}
                  onTouchEnd={handleImageViewerTouchEnd}
                >
                  <button
                    type="button"
                    className="image-viewer-close"
                    onClick={closeFullImagePreview}
                    aria-label="Close image"
                  >
                    ×
                  </button>
                  <img
                    src={fullImagePreview}
                    alt="Full preview"
                    className="image-viewer-img"
                    onLoad={() => setImageViewerLoading(false)}
                    onError={() => {
                      setImageViewerLoading(false);
                      setImageViewerError(true);
                    }}
                    onDoubleClick={toggleImageViewerZoom}
                    style={{
                      transform: `translate3d(${imageViewerTransform.x}px, ${imageViewerTransform.y}px, 0) scale(${imageViewerTransform.scale})`,
                    }}
                  />
                  {imageViewerLoading && (
                    <div className="image-viewer-loading" role="status" aria-label="Loading image">
                      <span className="image-spinner" />
                    </div>
                  )}
                  {imageViewerError && <div className="image-viewer-error">Image could not be loaded</div>}
                </div>
              </div>
            )}

            {previewImages.length > 0 ? (
              <div className="preview-strip multi-image-preview-strip">
                <div className="multi-image-preview-grid">
                  {previewImages.map((url, index) => (
                    <img key={`${url}-${index}`} src={normalizeApiImageUrl(url) || url} alt={`preview ${index + 1}`} />
                  ))}
                </div>
                <span>{previewImages.length} image{previewImages.length > 1 ? "s" : ""} selected</span>
                <button onClick={removeImage}>×</button>
              </div>
            ) : previewImage && (
              <div className="preview-strip">
                <img src={normalizeApiImageUrl(previewImage) || previewImage} alt="preview" />
                <span>{selectedImage ? selectedImage.name : composerMode === "image-update" ? "Current image - select new image" : "Current image"}</span>
                <button onClick={removeImage}>×</button>
              </div>
            )}

            {previewFile && (
              <div className="preview-strip file-preview-strip">
                <div className="preview-file-icon">
                  {getFileTypeLabel(previewFile)}
                </div>
                <span>
                  {selectedFile
                    ? getFilePreviewName()
                    : composerMode === "file-update"
                      ? "Current file - select new file"
                      : getFilePreviewName()}
                  {previewFile?.size ? ` • ${formatFileSize(previewFile.size)}` : ""}
                </span>
                <button onClick={removeFile}>×</button>
              </div>
            )}

            {editingNoteId && (
              <div className="edit-strip">
                <span>{composerMode === "title" ? "Adding title style" : composerMode === "image-update" ? "Updating image" : composerMode === "image-caption" ? "Adding image text" : composerMode === "file-update" ? "Updating file" : composerMode === "file-caption" ? "Adding file text" : "Updating message"}</span>
                <button onClick={resetForm}>Cancel</button>
              </div>
            )}

            <footer className="composer" onClick={(e) => e.stopPropagation()}>
              <div className="composer-card">
                <div className="composer-tools-top">
                  <div
                    className="composer-tools-popover composer-tools-always-visible"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                  >
                      <button
                        type="button"
                        className={`tool-btn format-btn ${activeFormats.bold ? "active" : ""}`}
                        onMouseDown={applyBold}
                        title="Bold"
                      >
                        <img src={BOLD_SELECT_ICON} alt="Bold" className="tool-icon format-icon bold-select-icon" />
                      </button>

                      <button
                        type="button"
                        className={`tool-btn format-btn ${activeFormats.underline ? "active" : ""}`}
                        onMouseDown={applyUnderline}
                        title="Underline"
                      >
                        <img src={UNDERLINE_SELECT_ICON} alt="Underline" className="tool-icon format-icon underline-select-icon" />
                      </button>

                      <input
                        ref={colorRef}
                        type="color"
                        value={textColor}
                        hidden
                        onChange={(e) => changeColor(e.target.value)}
                      />

                      <button
                        type="button"
                        className={`tool-btn color-tool ${colorModeActive ? "active" : ""}`}
                        onPointerDown={(e) => {
                          if (e.pointerType !== "mouse") {
                            saveSelection();
                          }
                        }}
                        onMouseDown={openColorPicker}
                        title="Text color"
                        style={{ "--pickedColor": textColor }}
                      >
                        <img src={COLOR_SELECT_ICON} alt="Text color" className="tool-icon color-icon color-select-icon" />
                      </button>

                      <input
                        ref={imageRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleImageSelect}
                      />

                      <button
                        type="button"
                        className={`tool-btn image-tool ${previewImage ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => imageRef.current?.click()}
                        title="Add image"
                      >
                        <img src={IMAGE_SELECT_ICON} alt="Add image" className="tool-icon attach-icon image-select-icon" />
                      </button>

                      <input
                        ref={fileRef}
                        type="file"
                        hidden
                        onChange={handleFileSelect}
                      />

                      <button
                        type="button"
                        className={`tool-btn file-tool ${previewFile ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => fileRef.current?.click()}
                        title="Add file"
                      >
                        <img src={FILE_SELECT_ICON} alt="Add file" className="tool-icon file-icon-img file-select-icon" />
                      </button>

                      {!privateChannelLocked && (
                        <button
                          type="button"
                          className={`tool-btn composer-refresh-tool ${manualRefreshing ? "is-refreshing" : ""}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={refreshCurrentPage}
                          title="Refresh messages"
                        aria-label="Refresh messages"
                        disabled={manualRefreshing}
                      >
                          <span className="refresh-icon">↻</span>
                        </button>
                      )}
                  </div>
                </div>

                <div className="composer-input-row">
                  <div
                    ref={editorRef}
                    className="text-input"
                    contentEditable
                    data-placeholder={composerMode === "title" ? "Type title..." : composerMode === "image-update" ? "Select new image, then tap send" : composerMode === "image-caption" ? "Add image description..." : composerMode === "file-update" ? "Select new file, then tap send" : composerMode === "file-caption" ? "Add file description..." : "Enter text here"}
                    style={{ "--composerColor": "#111111", "--composerCaretColor": textColor, caretColor: textColor }}
                    onFocus={saveSelection}
                    onMouseUp={saveSelection}
                    onTouchEnd={saveSelection}
                    onKeyUp={saveSelection}
                    onKeyDown={() => {
                      // Keep the explicit toolbar typing mode. Do not query the
                      // browser selection state here, because mobile toolbar
                      // taps can make queryCommandState() temporarily false.
                      saveSelection();
                     }}
                     onInput={() => {
                       saveSelection();
                       autoResizeEditor();
                       // Do not move the caret to the end: only scroll the
                       // composer enough to reveal the line being edited.
                       keepComposerCaretVisible();
                     }}
                     onBlur={saveSelection}
                     onPaste={(e) => {
                       e.preventDefault();
                       const text = e.clipboardData.getData("text/plain");
                       document.execCommand("insertText", false, text);
                       saveSelection();
                       autoResizeEditor();
                     }}
                   ></div>

                  <button
                    className="send-btn"
                    onClick={saveNote}
                    disabled={loading}
                    title="Send"
                  >
                    {loading ? <span className="send-spinner" aria-label="Sending" /> : editingNoteId ? "✓" : "➤"}
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>

      {toast.show && (
        <div className="popup-layer">
          <div className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? "✓" : "!"}
            </div>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      {confirmBox.show && (
        <div className="confirm-layer">
          <div className="confirm-card">
            <div className="confirm-icon">?</div>
            <h3>{confirmBox.title}</h3>
            <p>{confirmBox.message}</p>

            <div className="confirm-actions">
              <button className="cancel-confirm" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                className="delete-confirm"
                onClick={() => {
                  closeConfirm();
                  confirmBox.action && confirmBox.action();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
