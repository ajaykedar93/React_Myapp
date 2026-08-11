import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";

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
const PIN_OPEN_DELAY_MS = 30;

const themes = [
  ["#2563eb", "#06b6d4"],
  ["#7c3aed", "#c084fc"],
  ["#059669", "#34d399"],
  ["#dc2626", "#fb7185"],
  ["#ea580c", "#fbbf24"],
  ["#0891b2", "#22d3ee"],
  ["#4f46e5", "#818cf8"],
  ["#0f172a", "#64748b"],
  ["#be123c", "#fb7185"],
  ["#047857", "#14b8a6"],
];

export default function ChannelList() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const pinRequestRef = useRef(0);
  const pinAbortRef = useRef(null);
  const pinCheckingRef = useRef(false);
  const pinSuccessRef = useRef(false);
  const openingChannelRef = useRef(false);
  const ownerAlertTimerRef = useRef(null);
  const navigationTimerRef = useRef(null);
  const channelRefreshTimerRef = useRef(null);
  const channelRefreshAbortRef = useRef(null);
  const actionRefreshTimerRef = useRef(null);
  const actionBusyRef = useRef(false);
  const isMountedRef = useRef(true);
  const initialListLoadedRef = useRef(false);
  const initialProgressTimerRef = useRef(null);

  const [channels, setChannels] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [channelTagline, setChannelTagline] = useState("");
  const [channelLogo, setChannelLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [isPrivate, setIsPrivate] = useState(false);
  const [privatePin, setPrivatePin] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialListLoading, setInitialListLoading] = useState(true);
  const [initialLoadProgress, setInitialLoadProgress] = useState(7);
  const [pinChecking, setPinChecking] = useState(false);
  const [isOpeningChannel, setIsOpeningChannel] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [ownerDeleteAlert, setOwnerDeleteAlert] = useState({
    show: false,
    message: "",
  });

  const [confirmBox, setConfirmBox] = useState({
    show: false,
    title: "",
    message: "",
    action: null,
  });

  const [pinBox, setPinBox] = useState({
    show: false,
    channel: null,
    pin: "",
    error: "",
    trustDevice: false,
  });

  const [deletePinChecking, setDeletePinChecking] = useState(false);

  const [deletePinBox, setDeletePinBox] = useState({
    show: false,
    channel: null,
    pin: "",
    error: "",
  });

  // Private-channel update requires the same 4-digit channel PIN.
  // Public-channel update uses the device that created the channel.
  const [updatePinChecking, setUpdatePinChecking] = useState(false);
  const [updatePinBox, setUpdatePinBox] = useState({
    show: false,
    channel: null,
    pin: "",
    error: "",
  });
  const [editingChannelPin, setEditingChannelPin] = useState("");
  const [editingChannelPrivate, setEditingChannelPrivate] = useState(false);

  const [fullLogoViewer, setFullLogoViewer] = useState({
    show: false,
    src: "",
    title: "",
  });

  useEffect(() => {
    isMountedRef.current = true;
    fetchChannels({ silent: false });

    return () => {
      isMountedRef.current = false;

      if (initialProgressTimerRef.current) {
        clearInterval(initialProgressTimerRef.current);
        initialProgressTimerRef.current = null;
      }

      if (ownerAlertTimerRef.current) {
        clearTimeout(ownerAlertTimerRef.current);
      }

      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }

      if (channelRefreshTimerRef.current) {
        clearInterval(channelRefreshTimerRef.current);
        channelRefreshTimerRef.current = null;
      }

      if (channelRefreshAbortRef.current) {
        channelRefreshAbortRef.current.abort();
        channelRefreshAbortRef.current = null;
      }

      if (actionRefreshTimerRef.current) {
        clearTimeout(actionRefreshTimerRef.current);
        actionRefreshTimerRef.current = null;
      }

      if (pinAbortRef.current) {
        pinAbortRef.current.abort();
        pinAbortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!initialListLoading) return undefined;

    if (initialProgressTimerRef.current) {
      clearInterval(initialProgressTimerRef.current);
      initialProgressTimerRef.current = null;
    }

    initialProgressTimerRef.current = window.setInterval(() => {
      setInitialLoadProgress((prev) => {
        if (prev >= 92) return prev;
        const step = prev < 45 ? 7 : prev < 74 ? 5 : 3;
        return Math.min(92, prev + step);
      });
    }, 170);

    return () => {
      if (initialProgressTimerRef.current) {
        clearInterval(initialProgressTimerRef.current);
        initialProgressTimerRef.current = null;
      }
    };
  }, [initialListLoading]);

  useEffect(() => {
    const refreshChannelsSilently = () => {
      if (typeof window === "undefined") return;

      const currentHash = String(window.location.hash || "");

      if (currentHash.includes("/teligram-notes")) return;
      if (openingChannelRef.current || pinCheckingRef.current || actionBusyRef.current) return;

      fetchChannels({ silent: true });
    };

    channelRefreshTimerRef.current = window.setInterval(() => {
      refreshChannelsSilently();
    }, 2500);

    const handleFocusRefresh = () => {
      refreshChannelsSilently();
    };

    const handleVisibilityRefresh = () => {
      if (!document.hidden) {
        refreshChannelsSilently();
      }
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      if (channelRefreshTimerRef.current) {
        clearInterval(channelRefreshTimerRef.current);
        channelRefreshTimerRef.current = null;
      }

      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

  useEffect(() => {
    const resetOpeningLockWhenBack = () => {
      if (typeof window === "undefined") return;

      const currentHash = String(window.location.hash || "");

      /*
        When user comes back from notes page to channel list, allow opening
        channels again. Do not reset while navigating to notes, otherwise the
        PIN popup can briefly re-render during hash route transition.
      */
      if (!currentHash.includes("/teligram-notes")) {
        openingChannelRef.current = false;
        pinSuccessRef.current = false;
        pinCheckingRef.current = false;
        setIsOpeningChannel(false);
        setPinChecking(false);
        fetchChannels({ silent: true });
      }
    };

    window.addEventListener("hashchange", resetOpeningLockWhenBack);
    resetOpeningLockWhenBack();

    return () => {
      window.removeEventListener("hashchange", resetOpeningLockWhenBack);
    };
  }, []);

  const parseIndiaDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const rawValue = String(value).trim();

    if (!rawValue) return null;

    /*
      Backend sometimes sends MySQL DATETIME like "2026-06-25 11:15:00"
      without timezone. That value should be treated as Indian time, not
      browser/default UTC time. If timezone is already present, keep it.
    */
    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(rawValue);
    const looksLikeSqlDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(rawValue);

    let safeValue = rawValue;

    if (looksLikeSqlDateTime) {
      safeValue = rawValue.replace(" ", "T");
    }

    if (looksLikeSqlDateTime && !hasTimezone) {
      safeValue = `${safeValue}+05:30`;
    }

    const date = new Date(safeValue);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatIndiaDateTime = (value) => {
    const date = parseIndiaDate(value);

    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(date)
      .replace(",", " •");
  };

  const getChannelCreateTime = (channel) => {
    return (
      channel?.created_at ||
      channel?.createdAt ||
      channel?.created_on ||
      channel?.created_time ||
      channel?.added_at ||
      channel?.updated_at ||
      ""
    );
  };

  const refreshPageAfterChannelAction = (delay = 450) => {
    actionBusyRef.current = true;

    if (actionRefreshTimerRef.current) {
      clearTimeout(actionRefreshTimerRef.current);
      actionRefreshTimerRef.current = null;
    }

    actionRefreshTimerRef.current = window.setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, delay);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });

    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1800);
  };

  const showOwnerDeleteAlert = (
    message = "Only the device that created this public channel can delete it."
  ) => {
    if (ownerAlertTimerRef.current) {
      clearTimeout(ownerAlertTimerRef.current);
    }

    setOwnerDeleteAlert({
      show: true,
      message,
    });

    ownerAlertTimerRef.current = setTimeout(() => {
      setOwnerDeleteAlert({
        show: false,
        message: "",
      });
    }, 2800);
  };

  const clearOwnerDeleteAlert = () => {
    if (ownerAlertTimerRef.current) {
      clearTimeout(ownerAlertTimerRef.current);
      ownerAlertTimerRef.current = null;
    }

    setOwnerDeleteAlert({
      show: false,
      message: "",
    });
  };

  const openConfirm = (title, message, action) => {
    setConfirmBox({ show: true, title, message, action });
  };

  const closeConfirm = () => {
    setConfirmBox({
      show: false,
      title: "",
      message: "",
      action: null,
    });
  };

  const closePinBox = () => {
    if (openingChannelRef.current) return;

    pinSuccessRef.current = false;
    pinRequestRef.current += 1;
    pinCheckingRef.current = false;

    if (pinAbortRef.current) {
      pinAbortRef.current.abort();
      pinAbortRef.current = null;
    }

    setPinBox({
      show: false,
      channel: null,
      pin: "",
      error: "",
      trustDevice: false,
    });
    setPinChecking(false);
  };

  const isTrue = (value) => {
    return value === true || value === "true" || value === 1 || value === "1";
  };

  const getCurrentDeviceId = () => {
    if (typeof window === "undefined") return "";

    const oldDeviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (oldDeviceId) return oldDeviceId;

    const newDeviceId =
      window.crypto?.randomUUID?.() ||
      `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);

    return newDeviceId;
  };

  const closeDeletePinBox = () => {
    setDeletePinBox({
      show: false,
      channel: null,
      pin: "",
      error: "",
    });

    setDeletePinChecking(false);
  };

  const requestDeleteChannel = (channel) => {
    setActiveMenuId(null);
    clearOwnerDeleteAlert();

    if (isTrue(channel.is_private)) {
      setDeletePinBox({
        show: true,
        channel,
        pin: "",
        error: "",
      });
      return;
    }

    openConfirm(
      "Delete Public Channel?",
      `Only the device that created "${channel.channel_name}" can delete it. Do you want to delete this channel?`,
      () => deleteChannel(channel.channel_id)
    );
  };

  const confirmPrivateDelete = async () => {
    const selectedChannel = deletePinBox.channel;
    const typedPin = String(deletePinBox.pin || "").replace(/\D/g, "").slice(0, 4);

    if (!selectedChannel || deletePinChecking) return;

    if (!/^[0-9]{4}$/.test(typedPin)) {
      setDeletePinBox((prev) => ({
        ...prev,
        pin: typedPin,
        error: "Enter valid 4 digit PIN",
      }));
      return;
    }

    try {
      setDeletePinChecking(true);
      setDeletePinBox((prev) => ({ ...prev, error: "" }));

      await deleteChannel(selectedChannel.channel_id, typedPin);
    } finally {
      setDeletePinChecking(false);
    }
  };

  const getTrustedPinKey = (channelId) => {
    return `trusted_private_channel_pin_${PUBLIC_USER_ID}_${channelId}`;
  };

  const getTrustedPin = (channelId) => {
    if (!channelId) return "";
    return localStorage.getItem(getTrustedPinKey(channelId)) || "";
  };

  const saveTrustedPin = (channelId, pin) => {
    const cleanPin = String(pin || "").replace(/\D/g, "").slice(0, 4);
    if (!channelId || !/^[0-9]{4}$/.test(cleanPin)) return;
    localStorage.setItem(getTrustedPinKey(channelId), cleanPin);
  };

  const removeTrustedPin = (channelId) => {
    if (!channelId) return;
    localStorage.removeItem(getTrustedPinKey(channelId));
  };

  const getSessionVerifiedKey = (channelId) => {
    return `verified_private_channel_session_${PUBLIC_USER_ID}_${channelId}`;
  };

  const markSelectedChannelVerified = (channelId, trustThisDevice = false) => {
    if (!channelId) return;

    const currentDeviceId = getCurrentDeviceId();

    sessionStorage.setItem(getSessionVerifiedKey(channelId), "true");
    localStorage.setItem(SELECTED_CHANNEL_DEVICE_KEY, currentDeviceId);
    localStorage.setItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY, "true");
    localStorage.setItem(SELECTED_CHANNEL_VERIFIED_AT_KEY, String(Date.now()));

    if (trustThisDevice) {
      localStorage.setItem(SELECTED_CHANNEL_TRUST_KEY, "true");
    } else {
      localStorage.removeItem(SELECTED_CHANNEL_TRUST_KEY);
    }
  };

  const clearSelectedChannelVerified = (channelId = "") => {
    if (channelId) {
      sessionStorage.removeItem(getSessionVerifiedKey(channelId));
    }

    localStorage.removeItem(SELECTED_CHANNEL_TRUST_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_VERIFIED_AT_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_DEVICE_KEY);
  };

  const getTheme = (index) => {
    return themes[index % themes.length];
  };

  const getInitial = (name) => {
    return name?.trim()?.charAt(0)?.toUpperCase() || "N";
  };

  const joinApiUrl = (pathValue) => {
    const cleanPath = String(pathValue || "").trim();

    if (!cleanPath) return "";
    if (/^https?:\/\//i.test(cleanPath)) return cleanPath;

    return `${API_URL}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
  };

  const normalizeApiUrl = (url) => {
    const rawUrl = String(url || "").trim();

    if (!rawUrl) return "";
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return rawUrl;

    if (/^https?:\/\//i.test(rawUrl)) {
      try {
        const parsed = new URL(rawUrl);

        if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
          return joinApiUrl(`${parsed.pathname}${parsed.search || ""}`);
        }

        return rawUrl;
      } catch {
        return rawUrl;
      }
    }

    if (rawUrl.startsWith("/api/") || rawUrl.startsWith("api/")) {
      return joinApiUrl(rawUrl);
    }

    return rawUrl;
  };

  const getChannelLogoSource = (channel) => {
    if (!channel) return "";

    if (channel.logo_url) {
      return normalizeApiUrl(channel.logo_url);
    }

    if (isTrue(channel.has_logo) && channel.channel_id) {
      const version = channel.updated_at
        ? new Date(channel.updated_at).getTime()
        : Date.now();

      return `${API_URL}/api/telegram-channels/logo/${channel.channel_id}?v=${version}`;
    }

    return "";
  };

  const handleLogoError = (event, channelOrName, index = 0) => {
    const img = event.currentTarget;

    const name =
      typeof channelOrName === "object"
        ? channelOrName?.channel_name || "N"
        : String(channelOrName || "N");

    img.onerror = null;
    img.dataset.fallbackStep = "done";
    img.src = getDefaultLogo(name, index);
  };

  const getDefaultLogo = (name, index) => {
    const [color1, color2] = getTheme(index);
    const initial = getInitial(name);

    const svg = `
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="${color1}" offset="0%"/>
            <stop stop-color="${color2}" offset="100%"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="36" fill="url(#g)"/>
        <circle cx="89" cy="31" r="18" fill="rgba(255,255,255,0.18)"/>
        <circle cx="32" cy="90" r="26" fill="rgba(255,255,255,0.14)"/>
        <text x="60" y="74" text-anchor="middle" font-size="48" font-family="Arial, sans-serif" font-weight="800" fill="white">${initial}</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const fetchChannels = async ({ silent = false } = {}) => {
    if (silent && actionBusyRef.current) return;

    if (channelRefreshAbortRef.current) {
      channelRefreshAbortRef.current.abort();
      channelRefreshAbortRef.current = null;
    }

    const controller = new AbortController();
    channelRefreshAbortRef.current = controller;
    const firstListApiLoad = !silent && !initialListLoadedRef.current;

    try {
      if (!silent) {
        setLoading(true);
      }

      if (firstListApiLoad) {
        setInitialListLoading(true);
        setInitialLoadProgress(7);
      }

      const res = await fetch(
        `${API_URL}/api/telegram-channels?user_id=${PUBLIC_USER_ID}&_=${Date.now()}`,
        {
          signal: controller.signal,
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!isMountedRef.current || controller.signal.aborted) return;

      if (!res.ok) {
        if (!silent) {
          showToast(data.message || "Failed to load channels", "error");
        }
        return;
      }

      setChannels(data.channels || []);
    } catch (error) {
      if (error?.name === "AbortError") return;

      console.error("Fetch channels error:", error);

      if (!silent) {
        showToast("Server error while loading channels", "error");
      }
    } finally {
      if (channelRefreshAbortRef.current === controller) {
        channelRefreshAbortRef.current = null;
      }

      if (firstListApiLoad && isMountedRef.current) {
        initialListLoadedRef.current = true;
        setInitialLoadProgress(100);

        window.setTimeout(() => {
          if (isMountedRef.current) {
            setInitialListLoading(false);
          }
        }, 260);
      }

      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select only image file", "error");
      return;
    }

    setChannelLogo(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const resetForm = () => {
    setChannelName("");
    setChannelTagline("");
    setChannelLogo(null);
    setLogoPreview("");
    setIsPrivate(false);
    setPrivatePin("");
    setEditingId(null);
    setRemoveLogo(false);
    setActiveMenuId(null);
    setEditingChannelPin("");
    setEditingChannelPrivate(false);
    setUpdatePinBox({
      show: false,
      channel: null,
      pin: "",
      error: "",
    });
    setUpdatePinChecking(false);
    setShowCreateForm(false);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const removeSelectedLogo = () => {
    setChannelLogo(null);
    setLogoPreview("");
    setRemoveLogo(true);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const goToTelegramLogin = (e) => {
    e?.stopPropagation?.();

    setActiveMenuId(null);

    // Public Telegram login page route.
    // App.jsx route must be:
    // <Route path="/telegram-login" element={<Telegram_Login />} />
    navigate("/telegram-login");
  };

  const goToReactLearningLogin = (e) => {
    e?.stopPropagation?.();
    setActiveMenuId(null);

    window.location.href = "https://react-learning-project-lime.vercel.app/";
  };

  const openFullLogoViewer = (e, channel, index = 0) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const logoSource =
      getChannelLogoSource(channel) ||
      getDefaultLogo(channel?.channel_name || "N", index);

    setActiveMenuId(null);
    setFullLogoViewer({
      show: true,
      src: logoSource,
      title: channel?.channel_name || "Channel Logo",
    });
  };

  const closeFullLogoViewer = () => {
    setFullLogoViewer({
      show: false,
      src: "",
      title: "",
    });
  };

  const createOrUpdateChannel = async () => {
    if (!channelName.trim()) {
      showToast("Please enter channel name", "error");
      return;
    }

    if (!editingId && isPrivate && !/^[0-9]{4}$/.test(privatePin)) {
      showToast("Private PIN must be exactly 4 digits", "error");
      return;
    }

    const currentEditingId = editingId;
    const updatingChannel = Boolean(currentEditingId);
    const oldChannels = channels;

    // Permission rule:
    // Public update -> only the creating device is allowed by the API.
    // Private update -> the same 4-digit channel PIN is required.
    if (updatingChannel && editingChannelPrivate && !/^[0-9]{4}$/.test(editingChannelPin)) {
      showToast("Enter the same 4 digit PIN to update this private channel", "error");
      return;
    }

    if (updatingChannel) {
      actionBusyRef.current = true;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_name", channelName.trim());
      formData.append("channel_tagline", channelTagline.trim());
      formData.append("remove_logo", removeLogo ? "true" : "false");

      const currentDeviceId = getCurrentDeviceId();

      if (!currentEditingId) {
        formData.append("created_device_id", currentDeviceId);
        formData.append("is_private", isPrivate ? "true" : "false");
        formData.append("private_pin", isPrivate ? privatePin : "");
        formData.append("device_id", currentDeviceId);
      } else if (editingChannelPrivate) {
        // Private update is authorized by the channel PIN, not by another
        // user's device identity.
        formData.append("pin", editingChannelPin);
      } else {
        // Public update is authorized by the device that created it.
        formData.append("device_id", currentDeviceId);
      }

      if (channelLogo) {
        formData.append("logo", channelLogo);
      }

      const url = currentEditingId
        ? `${API_URL}/api/telegram-channels/${currentEditingId}`
        : `${API_URL}/api/telegram-channels`;

      const method = currentEditingId ? "PUT" : "POST";
      const requestHeaders = {};

      if (currentEditingId && editingChannelPrivate) {
        requestHeaders["x-channel-pin"] = editingChannelPin;
      } else if (currentEditingId) {
        requestHeaders["x-device-id"] = currentDeviceId;
      }

      const res = await fetch(url, {
        method,
        headers: requestHeaders,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        actionBusyRef.current = false;
        showToast(data.message || "Action failed", "error");
        return;
      }

      const savedChannel = {
        ...(data.channel || {}),
        created_at: data.channel?.created_at || new Date().toISOString(),
      };

      if (currentEditingId) {
        setChannels((prev) =>
          prev.map((channel) =>
            Number(channel.channel_id) === Number(currentEditingId)
              ? { ...channel, ...savedChannel }
              : channel
          )
        );

        showToast("Channel updated successfully", "success");
        resetForm();
        refreshPageAfterChannelAction();
        return;
      }

      if (savedChannel?.channel_id) {
        setChannels((prev) => [savedChannel, ...prev]);
      }

      showToast("Channel created successfully", "success");
      resetForm();

      // Create appears immediately; silently sync backend-generated fields.
      setTimeout(() => {
        fetchChannels({ silent: true });
      }, 250);
    } catch (error) {
      console.error("Create/update channel error:", error);
      setChannels(oldChannels);
      actionBusyRef.current = false;
      showToast("Server error", "error");
    } finally {
      setLoading(false);

      if (!updatingChannel) {
        actionBusyRef.current = false;
      }
    }
  };

  const beginEditForm = (channel, pin = "") => {
    const privateChannel = isTrue(channel?.is_private);

    setShowCreateForm(true);
    setEditingId(channel.channel_id);
    setChannelName(channel.channel_name || "");
    setChannelTagline(channel.channel_tagline || "");
    setLogoPreview(getChannelLogoSource(channel));
    setChannelLogo(null);
    setRemoveLogo(false);
    setEditingChannelPrivate(privateChannel);
    setEditingChannelPin(privateChannel ? pin : "");
    setActiveMenuId(null);
  };

  const closeUpdatePinBox = () => {
    if (updatePinChecking) return;

    setUpdatePinBox({
      show: false,
      channel: null,
      pin: "",
      error: "",
    });
    setUpdatePinChecking(false);
  };

  const startEdit = (channel) => {
    setActiveMenuId(null);

    // Private channel: another device/user may update only after supplying
    // the same channel PIN. Public channel: update proceeds with device ID.
    if (isTrue(channel?.is_private)) {
      setUpdatePinBox({
        show: true,
        channel,
        pin: "",
        error: "",
      });
      return;
    }

    beginEditForm(channel);
  };

  const verifyUpdatePin = async () => {
    const selectedChannel = updatePinBox.channel;
    const typedPin = String(updatePinBox.pin || "").replace(/\D/g, "").slice(0, 4);

    if (!selectedChannel || updatePinChecking) return;

    if (!/^[0-9]{4}$/.test(typedPin)) {
      setUpdatePinBox((prev) => ({
        ...prev,
        pin: typedPin,
        error: "Enter valid 4 digit PIN",
      }));
      return;
    }

    try {
      setUpdatePinChecking(true);
      setUpdatePinBox((prev) => ({ ...prev, pin: typedPin, error: "" }));

      const res = await fetch(
        `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/verify-pin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pin: typedPin }),
        }
      );

      const data = await res.json().catch(() => ({}));
      const messageText = String(data?.message || "").toLowerCase();

      const explicitFailure =
        data?.success === false ||
        data?.verified === false ||
        data?.valid === false ||
        data?.unlocked === false ||
        isTrue(data?.mismatch) ||
        isTrue(data?.invalid) ||
        messageText.includes("mismatch") ||
        messageText.includes("wrong") ||
        messageText.includes("invalid") ||
        messageText.includes("incorrect");

      const explicitSuccess =
        isTrue(data?.unlocked) ||
        isTrue(data?.success) ||
        isTrue(data?.verified) ||
        isTrue(data?.valid) ||
        isTrue(data?.matched) ||
        messageText.includes("verified") ||
        messageText.includes("success") ||
        messageText.includes("matched") ||
        messageText.includes("correct");

      if (!res.ok || explicitFailure || (!explicitSuccess && !res.ok)) {
        setUpdatePinBox((prev) => ({
          ...prev,
          error: data?.message || "PIN mismatch",
        }));
        return;
      }

      setUpdatePinBox({
        show: false,
        channel: null,
        pin: "",
        error: "",
      });

      beginEditForm(selectedChannel, typedPin);
    } catch (error) {
      console.error("Verify update PIN error:", error);
      setUpdatePinBox((prev) => ({
        ...prev,
        error: "Server error",
      }));
    } finally {
      setUpdatePinChecking(false);
    }
  };

  const deleteChannel = async (channelId, pin = "") => {
    const oldEditingId = editingId;
    const cleanDeletePin = String(pin || "").replace(/\D/g, "").slice(0, 4);

    const activeDeleteChannel =
      Number(deletePinBox.channel?.channel_id) === Number(channelId)
        ? deletePinBox.channel
        : null;

    const channelForDelete =
      activeDeleteChannel ||
      channels.find((channel) => Number(channel.channel_id) === Number(channelId)) ||
      null;

    /*
      Final delete logic:
      - Public channel: send only current device id.
      - Private channel: send only PIN. No device id verification needed.
    */
    const privateDelete = isTrue(channelForDelete?.is_private);
    const currentDeviceId = getCurrentDeviceId();

    setActiveMenuId(null);

    if (privateDelete && !/^[0-9]{4}$/.test(cleanDeletePin)) {
      setDeletePinBox((prev) => ({
        ...prev,
        error: "Enter valid 4 digit PIN",
      }));
      return;
    }

    try {
      actionBusyRef.current = true;
      setLoading(true);

      const deleteHeaders = {
        "Content-Type": "application/json",
      };

      let deleteBody = {};

      if (privateDelete) {
        deleteHeaders["x-channel-pin"] = cleanDeletePin;
        deleteBody = {
          pin: cleanDeletePin,
        };
      } else {
        deleteHeaders["x-device-id"] = currentDeviceId;
        deleteBody = {
          device_id: currentDeviceId,
        };
      }

      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`, {
        method: "DELETE",
        headers: deleteHeaders,
        body: JSON.stringify(deleteBody),
      });

      const data = await res.json().catch(() => ({}));
      const apiMessage = String(data?.message || "");

      const ownerBlocked =
        !privateDelete &&
        (res.status === 403 ||
          /only.*device|created.*device|owner|blocked/i.test(apiMessage));

      if (!res.ok) {
        actionBusyRef.current = false;

        if (ownerBlocked) {
          closeConfirm();
          closeDeletePinBox();
          showOwnerDeleteAlert(
            "Only the device that created this public channel can delete it."
          );
          return;
        }

        if (privateDelete || deletePinBox.show) {
          const wrongPinMessage =
            /pin|wrong|mismatch|incorrect|invalid|required/i.test(apiMessage)
              ? apiMessage
              : "Wrong PIN";

          setDeletePinBox((prev) => ({
            ...prev,
            error: wrongPinMessage,
          }));
        } else {
          showToast(data.message || "Delete failed", "error");
        }

        return;
      }

      removeTrustedPin(channelId);
      clearSelectedChannelVerified(channelId);
      closeDeletePinBox();

      setChannels((prev) =>
        prev.filter((channel) => Number(channel.channel_id) !== Number(channelId))
      );

      if (Number(oldEditingId) === Number(channelId)) {
        resetForm();
      }

      showToast("Channel deleted successfully", "success");
      refreshPageAfterChannelAction();
    } catch (error) {
      console.error("Delete channel error:", error);
      actionBusyRef.current = false;

      if (privateDelete || deletePinBox.show) {
        setDeletePinBox((prev) => ({
          ...prev,
          error: "Server error while deleting",
        }));
      } else {
        showToast("Server error while deleting", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const getClosedPinBox = () => ({
    show: false,
    channel: null,
    pin: "",
    error: "",
    trustDevice: false,
  });

  const isNotesRoute = () => {
    if (typeof window === "undefined") return false;
    return String(window.location.hash || "").includes("/teligram-notes");
  };

  const clearActivePinRequest = () => {
    pinRequestRef.current += 1;
    pinCheckingRef.current = false;

    if (pinAbortRef.current) {
      pinAbortRef.current.abort();
      pinAbortRef.current = null;
    }

    setPinChecking(false);
  };

  const hidePinPopupNow = () => {
    setPinBox(getClosedPinBox());
  };

  const beginChannelOpening = () => {
    /*
      Lock navigation first, then synchronously remove the PIN UI before
      changing route. This prevents stale API/state updates from showing any
      wrong PIN popup after a correct PIN.
    */
    openingChannelRef.current = true;
    pinSuccessRef.current = true;
    pinRequestRef.current += 1;
    pinCheckingRef.current = false;

    if (pinAbortRef.current) {
      pinAbortRef.current.abort();
      pinAbortRef.current = null;
    }

    flushSync(() => {
      setIsOpeningChannel(true);
      setPinChecking(false);
      setPinBox(getClosedPinBox());
      setToast((prev) => {
        const pinError = /pin|wrong|mismatch|incorrect/i.test(String(prev?.message || ""));
        if (prev?.show && prev?.type === "error" && pinError) {
          return { show: false, type: "success", message: "" };
        }
        return prev;
      });
    });
  };

  const saveSelectedChannel = (channel, pin = "", trustThisDevice = false) => {
    const privateChannel = isTrue(channel.is_private);

    localStorage.setItem("selected_channel_id", channel.channel_id);
    localStorage.setItem("selected_channel_name", channel.channel_name || "");
    localStorage.setItem(
      "selected_channel_tagline",
      channel.channel_tagline || ""
    );
    localStorage.setItem(
      "selected_channel_is_private",
      privateChannel ? "true" : "false"
    );

    if (privateChannel && pin) {
      localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, pin);
      markSelectedChannelVerified(channel.channel_id, trustThisDevice);
    } else {
      localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
      clearSelectedChannelVerified(channel.channel_id);
    }
  };

  const goToChannel = (channel, pin = "", trustThisDevice = false) => {
    beginChannelOpening();
    saveSelectedChannel(channel, pin, trustThisDevice);

    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }

    navigationTimerRef.current = window.setTimeout(() => {
      if (!openingChannelRef.current) return;

      if (!isNotesRoute()) {
        window.location.hash = "/teligram-notes";
      }
    }, PIN_OPEN_DELAY_MS);
  };

  const openChannel = (channel) => {
    if (openingChannelRef.current || isOpeningChannel) return;

    pinSuccessRef.current = false;
    openingChannelRef.current = false;
    setIsOpeningChannel(false);
    setActiveMenuId(null);
    clearOwnerDeleteAlert();

    if (isTrue(channel.is_private)) {
      const trustedPin = getTrustedPin(channel.channel_id);

      /*
        Trusted device rule:
        If this browser/device was trusted after a successful PIN, open
        directly. Another device, cleared browser data, or no trust tick
        will ask the PIN again.
      */
      if (/^[0-9]{4}$/.test(trustedPin)) {
        goToChannel(channel, trustedPin, true);
        return;
      }

      clearActivePinRequest();
      pinSuccessRef.current = false;
      openingChannelRef.current = false;
      setIsOpeningChannel(false);

      localStorage.setItem("selected_channel_id", channel.channel_id);
      localStorage.setItem("selected_channel_name", channel.channel_name || "");
      localStorage.setItem(
        "selected_channel_tagline",
        channel.channel_tagline || ""
      );
      localStorage.setItem("selected_channel_is_private", "true");
      localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
      clearSelectedChannelVerified(channel.channel_id);

      setPinChecking(false);
      setPinBox({
        show: true,
        channel,
        pin: "",
        error: "",
        trustDevice: false,
      });
      return;
    }

    goToChannel(channel);
  };

  const verifyChannelPin = async () => {
    const selectedChannel = pinBox.channel;
    const typedPin = String(pinBox.pin || "").replace(/\D/g, "").slice(0, 4);
    const trustThisDevice = Boolean(pinBox.trustDevice);

    if (!selectedChannel || pinCheckingRef.current || openingChannelRef.current) {
      return;
    }

    pinSuccessRef.current = false;

    if (!/^[0-9]{4}$/.test(typedPin)) {
      setPinBox((prev) => ({
        ...prev,
        pin: typedPin,
        error: "Enter valid 4 digit PIN",
      }));
      return;
    }

    if (pinAbortRef.current) {
      pinAbortRef.current.abort();
      pinAbortRef.current = null;
    }

    const controller = new AbortController();
    const requestId = pinRequestRef.current + 1;

    pinRequestRef.current = requestId;
    pinAbortRef.current = controller;
    pinCheckingRef.current = true;

    try {
      setPinChecking(true);
      setPinBox((prev) => ({
        ...prev,
        pin: typedPin,
        error: "",
      }));

      const res = await fetch(
        `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/verify-pin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            pin: typedPin,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      const isLatestRequest =
        pinRequestRef.current === requestId && !controller.signal.aborted;

      if (!isLatestRequest || openingChannelRef.current) return;

      const messageText = String(data?.message || "").toLowerCase();

      /*
        Important:
        Some backends return 200 OK with a message like "PIN matched" instead
        of { success: true }. Treat any OK response as success unless the
        response clearly says invalid/mismatch. This removes the 1-3 second
        wrong PIN flash after a correct PIN.
      */
      const explicitSuccess =
        isTrue(data?.unlocked) ||
        isTrue(data?.success) ||
        isTrue(data?.verified) ||
        isTrue(data?.valid) ||
        isTrue(data?.matched) ||
        messageText.includes("verified") ||
        messageText.includes("success") ||
        messageText.includes("matched") ||
        messageText.includes("correct");

      const explicitFailure =
        data?.success === false ||
        data?.verified === false ||
        data?.valid === false ||
        data?.unlocked === false ||
        isTrue(data?.mismatch) ||
        isTrue(data?.invalid) ||
        messageText.includes("mismatch") ||
        messageText.includes("wrong") ||
        messageText.includes("invalid") ||
        messageText.includes("incorrect");

      const unlocked = res.ok && (explicitSuccess || !explicitFailure);

      if (!unlocked) {
        if (
          pinSuccessRef.current ||
          openingChannelRef.current ||
          pinRequestRef.current !== requestId
        ) {
          return;
        }

        pinCheckingRef.current = false;
        setPinChecking(false);

        setPinBox((prev) => {
          const sameChannel =
            Number(prev.channel?.channel_id) ===
            Number(selectedChannel.channel_id);

          /*
            Do not show a wrong PIN error from an old/stale request after the user has
            already changed the PIN, closed the popup, or started navigation.
          */
          if (
            !prev.show ||
            !sameChannel ||
            prev.pin !== typedPin ||
            pinSuccessRef.current ||
            openingChannelRef.current ||
            pinRequestRef.current !== requestId
          ) {
            return prev;
          }

          return {
            ...prev,
            error: data?.message || "PIN mismatch",
          };
        });
        return;
      }

      /*
        Correct PIN:
        Save trusted PIN preference first, then call the single navigation
        function. That function immediately hides the popup and locks old
        requests, so stale mismatch responses cannot re-open it.
      */
      if (trustThisDevice) {
        saveTrustedPin(selectedChannel.channel_id, typedPin);
      } else {
        removeTrustedPin(selectedChannel.channel_id);
      }

      goToChannel(selectedChannel, typedPin, trustThisDevice);

    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error("Verify PIN error:", error);

      if (
        pinSuccessRef.current ||
        openingChannelRef.current ||
        pinRequestRef.current !== requestId
      ) {
        return;
      }

      pinCheckingRef.current = false;
      setPinChecking(false);

      setPinBox((prev) => {
        if (!prev.show || pinSuccessRef.current || openingChannelRef.current) {
          return prev;
        }

        return {
          ...prev,
          error: "Server error",
        };
      });
    } finally {
      if (
        !pinSuccessRef.current &&
        !openingChannelRef.current &&
        pinRequestRef.current === requestId
      ) {
        pinAbortRef.current = null;
        pinCheckingRef.current = false;
        setPinChecking(false);
      }
    }
  };

  const shouldShowPinPopup =
    pinBox.show &&
    !pinSuccessRef.current &&
    !openingChannelRef.current &&
    !isOpeningChannel &&
    !isNotesRoute();

  return (
    <div className="nm-page" onClick={() => setActiveMenuId(null)}>
      <div className="nm-mobile">
        <header className="nm-header">
          <h1>Notes Management</h1>
        </header>

        {!showCreateForm && (
          <div className="create-button-wrap">
            <button
              className="open-create-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateForm(true);
              }}
            >
              <span className="plus-icon">+</span>
              <span>Create Channel</span>
            </button>

            <button
              type="button"
              className="telegram-login-icon-btn"
              onClick={goToTelegramLogin}
              aria-label="Open Telegram login page"
              title="Login"
            >
              <svg
                className="telegram-login-svg"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle className="telegram-login-line" cx="50" cy="50" r="43" />
                <circle className="telegram-login-fill" cx="50" cy="36" r="16" />
                <path
                  className="telegram-login-fill"
                  d="M22 78c4.8-15.7 18.3-24.1 28-24.1S73.2 62.3 78 78c-6.9 7.4-49.1 7.4-56 0Z"
                />
              </svg>
            </button>
            
            <button
              type="button"
              className="external-login-icon-btn"
              onClick={goToReactLearningLogin}
              aria-label="Open React Learning login page"
              title="New Login"
            >
              <img
                className="external-login-image"
                src="data:image/png;base64,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"
                alt="Login"
                draggable="false"
              />
            </button>
          </div>
        )}

        {showCreateForm && (
          <section className="create-card" onClick={(e) => e.stopPropagation()}>
            <div className="logo-area">
              <button
                type="button"
                className="logo-picker"
                onClick={() => fileRef.current?.click()}
                aria-label="Choose channel logo"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="channel logo"
                    onError={(e) =>
                      handleLogoError(e, channelName || "Channel", 0)
                    }
                  />
                ) : (
                  <img
                    src={getDefaultLogo(channelName || "N", 0)}
                    alt="default logo"
                  />
                )}
              </button>

              {logoPreview && (
                <button
                  type="button"
                  className="remove-logo"
                  onClick={removeSelectedLogo}
                  aria-label="Remove logo"
                >
                  ×
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleLogoSelect}
            />

            <div className="form-area">
              <label>{editingId ? "Update Channel" : "Create Channel"}</label>

              <input
                type="text"
                placeholder="Enter channel name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />

              <input
                className="tagline-input"
                type="text"
                placeholder="Enter short tagline optional"
                value={channelTagline}
                onChange={(e) => setChannelTagline(e.target.value)}
              />

              {!editingId && (
                <>
                  <div className="private-toggle-row">
                    <div className="private-toggle-text">
                      <strong>Private</strong>
                      <span>Protect channel with PIN</span>
                    </div>

                    <label className="mini-switch">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => {
                          setIsPrivate(e.target.checked);

                          if (!e.target.checked) {
                            setPrivatePin("");
                          }
                        }}
                      />
                      <span></span>
                    </label>
                  </div>

                  {isPrivate && (
                    <input
                      className="pin-input-small"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="4"
                      autoComplete="off"
                      placeholder="Enter 4 digit PIN"
                      value={privatePin}
                      onChange={(e) =>
                        setPrivatePin(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                    />
                  )}
                </>
              )}

              {editingId && (
                <div className="update-note-box">
                  <span>{editingChannelPrivate ? "Private update mode" : "Public update mode"}</span>
                  <p>
                    {editingChannelPrivate
                      ? "This update is authorized by the same channel PIN. Private type and PIN stay unchanged."
                      : "Only the device that created this public channel can update or delete it."}
                  </p>
                </div>
              )}

              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  Cancel
                </button>

                <button
                  type="button"
                  className="save-btn"
                  onClick={createOrUpdateChannel}
                  disabled={loading}
                >
                  {loading ? "Please wait..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </section>
        )}

        {ownerDeleteAlert.show && (
          <div className="owner-delete-alert" role="alert">
            {ownerDeleteAlert.message}
          </div>
        )}

        <main className="channel-list">
          {initialListLoading && channels.length === 0 && (
            <div className="empty-box">
              <div className="loader"></div>
            </div>
          )}

          {!initialListLoading && channels.length === 0 && (
            <div className="empty-box empty-minimal">
              <img src={getDefaultLogo("N", 2)} alt="empty" />
            </div>
          )}

          {channels.map((channel, index) => {
            const [color1, color2] = getTheme(index);
            const privateChannel = isTrue(channel.is_private);
            const channelLogoSource = getChannelLogoSource(channel);
            const createdTime = getChannelCreateTime(channel);
            const formattedCreatedTime = formatIndiaDateTime(createdTime);

            return (
              <div
                className="channel-row"
                key={channel.channel_id}
                style={{
                  "--c1": color1,
                  "--c2": color2,
                }}
              >
                <div
                  className="channel-click"
                  onClick={() => openChannel(channel)}
                >
                  <div
                    className="channel-logo channel-logo-clickable"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${channel.channel_name} logo`}
                    onClick={(e) => openFullLogoViewer(e, channel, index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        openFullLogoViewer(e, channel, index);
                      }
                    }}
                  >
                    <img
                      src={
                        channelLogoSource
                          ? channelLogoSource
                          : getDefaultLogo(channel.channel_name, index)
                      }
                      alt={channel.channel_name}
                      loading="lazy"
                      onError={(e) => handleLogoError(e, channel, index)}
                    />
                  </div>

                  <div className="channel-name">
                    <div className="channel-title-line">
                      <h3>{channel.channel_name}</h3>

                      {privateChannel && (
                        <span className="private-lock" title="Private channel">
                          🔒
                        </span>
                      )}
                    </div>

                    {channel.channel_tagline && (
                      <p className="channel-tagline">
                        {channel.channel_tagline}
                      </p>
                    )}

                    {formattedCreatedTime && (
                      <div className="channel-created-time">
                        <span>Created</span>
                        <time>{formattedCreatedTime}</time>
                      </div>
                    )}
                  </div>
                </div>

                <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="dot-btn"
                    onClick={() =>
                      setActiveMenuId(
                        activeMenuId === channel.channel_id
                          ? null
                          : channel.channel_id
                      )
                    }
                    aria-label="Channel menu"
                  >
                    ⋮
                  </button>

                  {activeMenuId === channel.channel_id && (
                    <div className="channel-menu">
                      <button
                        type="button"
                        className="menu-action-btn update-menu-btn"
                        onClick={() => startEdit(channel)}
                      >
                        <span>✎</span>
                        Update
                      </button>

                      <button
                        type="button"
                        className="menu-action-btn delete-menu-btn"
                        onClick={() => requestDeleteChannel(channel)}
                      >
                        <span>🗑</span>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </main>

        <footer className="developer-footer" aria-label="Developer credit">
          <span className="developer-code-icon">&lt;/&gt;</span>
          <span className="developer-text">Developed By</span>
          <span className="developer-name">Ajay Kedar</span>
        </footer>
      </div>

      {initialListLoading && (
        <div className="initial-list-loader-layer" role="status" aria-live="polite">
          <div className="initial-list-loader-card">
            <div
              className="initial-progress-circle"
              style={{ "--progress": initialLoadProgress }}
            >
              <div className="initial-progress-inner">
                <strong>{initialLoadProgress}%</strong>
                <span>Loading</span>
              </div>
            </div>

            <h3>Loading Channels</h3>
            <p>Please wait while your channel list is loading.</p>
          </div>
        </div>
      )}

      {fullLogoViewer.show && (
        <div className="logo-viewer-overlay" onClick={closeFullLogoViewer}>
          <div
            className="logo-viewer-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logo-viewer-image-wrap">
              <button
                type="button"
                className="logo-viewer-close"
                onClick={closeFullLogoViewer}
                aria-label="Close logo image"
              >
                ×
              </button>

              <img
                className="logo-viewer-image"
                src={fullLogoViewer.src}
                alt={fullLogoViewer.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getDefaultLogo(fullLogoViewer.title || "N", 0);
                }}
              />
            </div>

            <p>{fullLogoViewer.title}</p>
          </div>
        </div>
      )}

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

            <div className="confirm-buttons">
              <button type="button" className="no-btn" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                type="button"
                className="yes-btn"
                onClick={() => {
                  closeConfirm();
                  confirmBox.action && confirmBox.action();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldShowPinPopup && (
        <div className="pin-overlay" onClick={closePinBox}>
          <div
            className="professional-pin-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pin-top-glow"></div>

            <div className="pin-logo-circle">
              {getChannelLogoSource(pinBox.channel) ? (
                <img
                  src={getChannelLogoSource(pinBox.channel)}
                  alt="channel"
                  onError={(e) => handleLogoError(e, pinBox.channel, 0)}
                />
              ) : (
                <span>{getInitial(pinBox.channel?.channel_name)}</span>
              )}
            </div>

            <div className="pin-lock-icon">🔐</div>

            <h3>Private Channel</h3>

            <p>
              Enter PIN to open <b>{pinBox.channel?.channel_name}</b>
            </p>

            {pinBox.channel?.channel_tagline && (
              <div className="pin-tagline">
                {pinBox.channel.channel_tagline}
              </div>
            )}

            <input
              className="center-pin-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="4"
              placeholder="0000"
              value={pinBox.pin}
              autoFocus
              autoComplete="off"
              disabled={pinChecking}
              onChange={(e) => {
                if (openingChannelRef.current || isOpeningChannel) return;
                setPinBox((prev) => ({
                  ...prev,
                  pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  error: "",
                }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  verifyChannelPin();
                }
              }}
            />

            <label className={`trust-device-row ${pinChecking ? "is-disabled" : ""}`}>
              <input
                type="checkbox"
                disabled={pinChecking}
                checked={Boolean(pinBox.trustDevice)}
                onChange={(e) =>
                  setPinBox((prev) => ({
                    ...prev,
                    trustDevice: e.target.checked,
                  }))
                }
              />
              <span className="trust-check-mark">✓</span>
              <span className="trust-device-text">
                <strong>Trust this device</strong>
                <small>Open directly next time on this phone</small>
              </span>
            </label>

            {pinBox.error && (
              <div className="wrong-pin-text">{pinBox.error}</div>
            )}

            <div className="pin-buttons">
              <button
                type="button"
                className="pin-cancel-btn"
                onClick={closePinBox}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pin-open-btn"
                onClick={verifyChannelPin}
                disabled={pinChecking || isOpeningChannel || String(pinBox.pin || "").length !== 4}
              >
                {pinChecking ? "Checking..." : "Open"}
              </button>
            </div>
          </div>
        </div>
      )}

      {updatePinBox.show && (
        <div className="pin-overlay" onClick={closeUpdatePinBox}>
          <div
            className="professional-pin-card update-pin-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pin-top-glow"></div>

            <div className="pin-logo-circle">
              {getChannelLogoSource(updatePinBox.channel) ? (
                <img
                  src={getChannelLogoSource(updatePinBox.channel)}
                  alt="channel"
                  onError={(e) => handleLogoError(e, updatePinBox.channel, 0)}
                />
              ) : (
                <span>{getInitial(updatePinBox.channel?.channel_name)}</span>
              )}
            </div>

            <div className="pin-lock-icon update-lock-icon">✎</div>

            <h3>Update Private Channel</h3>

            <p>
              Enter the same PIN to update <b>{updatePinBox.channel?.channel_name}</b>.
              The private channel type and PIN cannot be changed here.
            </p>

            <input
              className="center-pin-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="4"
              placeholder="0000"
              value={updatePinBox.pin}
              autoFocus
              autoComplete="off"
              disabled={updatePinChecking}
              onChange={(e) =>
                setUpdatePinBox((prev) => ({
                  ...prev,
                  pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  error: "",
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  verifyUpdatePin();
                }
              }}
            />

            {updatePinBox.error && (
              <div className="wrong-pin-text">{updatePinBox.error}</div>
            )}

            <div className="pin-buttons">
              <button
                type="button"
                className="pin-cancel-btn"
                onClick={closeUpdatePinBox}
                disabled={updatePinChecking}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pin-open-btn update-pin-open-btn"
                onClick={verifyUpdatePin}
                disabled={
                  updatePinChecking || String(updatePinBox.pin || "").length !== 4
                }
              >
                {updatePinChecking ? "Checking..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePinBox.show && (
        <div className="pin-overlay" onClick={closeDeletePinBox}>
          <div
            className="professional-pin-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pin-top-glow"></div>

            <div className="pin-logo-circle">
              {getChannelLogoSource(deletePinBox.channel) ? (
                <img
                  src={getChannelLogoSource(deletePinBox.channel)}
                  alt="channel"
                  onError={(e) => handleLogoError(e, deletePinBox.channel, 0)}
                />
              ) : (
                <span>{getInitial(deletePinBox.channel?.channel_name)}</span>
              )}
            </div>

            <div className="pin-lock-icon delete-lock-icon">🗑</div>

            <h3>Delete Private Channel</h3>

            <p>
              Enter correct PIN to delete <b>{deletePinBox.channel?.channel_name}</b>.
              Any device can delete a private channel with the correct PIN.
            </p>

            <input
              className="center-pin-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="4"
              placeholder="0000"
              value={deletePinBox.pin}
              autoFocus
              autoComplete="off"
              disabled={deletePinChecking}
              onChange={(e) =>
                setDeletePinBox((prev) => ({
                  ...prev,
                  pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  error: "",
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmPrivateDelete();
                }
              }}
            />

            {deletePinBox.error && (
              <div className="wrong-pin-text">{deletePinBox.error}</div>
            )}

            <div className="pin-buttons">
              <button
                type="button"
                className="pin-cancel-btn"
                onClick={closeDeletePinBox}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pin-open-btn delete-pin-open-btn"
                onClick={confirmPrivateDelete}
                disabled={
                  deletePinChecking || String(deletePinBox.pin || "").length !== 4
                }
              >
                {deletePinChecking ? "Checking..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html,
        body,
        #root {
          width: 100%;
          height: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        body {
          background: #020617;
        }

        button,
        input {
          font-family: inherit;
        }

        .nm-page {
          position: fixed;
          inset: 0;
          width: 100dvw;
          height: 100dvh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 32%),
            radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.18), transparent 34%),
            linear-gradient(145deg, #020617, #0f172a 45%, #111827);
          display: flex;
          justify-content: center;
          align-items: stretch;
          font-family: Inter, Arial, sans-serif;
          overflow: hidden;
        }

        .nm-mobile {
          width: 100%;
          max-width: none;
          height: 100dvh;
          min-height: 0;
          background:
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #ecfeff 100%);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          padding-bottom: max(8px, env(safe-area-inset-bottom));
          scrollbar-width: none;
        }

        .nm-mobile::-webkit-scrollbar {
          display: none;
        }

        .nm-header {
          min-height: 96px;
          background:
            radial-gradient(circle at 84% 12%, rgba(255,255,255,0.22), transparent 28%),
            radial-gradient(circle at 12% 88%, rgba(249,115,22,0.24), transparent 28%),
            linear-gradient(135deg, #0f172a 0%, #1d4ed8 47%, #0891b2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: calc(env(safe-area-inset-top, 0px) + 24px) 14px 18px;
          position: relative;
          flex-shrink: 0;
          z-index: 10;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.28);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }

        .nm-header::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 11px;
          width: 74px;
          height: 3px;
          border-radius: 999px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, #f97316, #facc15, #22d3ee);
          box-shadow: 0 6px 14px rgba(14, 165, 233, 0.22);
        }

        .nm-header h1 {
          width: 100%;
          margin: 0;
          color: #ffffff;
          font-family: "Poppins", "Montserrat", "Trebuchet MS", "Segoe UI", Arial, sans-serif;
          font-size: clamp(22px, 5.6vw, 32px);
          font-weight: 950;
          line-height: 1.12;
          letter-spacing: 0.8px;
          text-align: center;
          text-transform: uppercase;
          white-space: normal;
          overflow: visible;
          overflow-wrap: anywhere;
          text-shadow:
            0 2px 8px rgba(15, 23, 42, 0.35),
            0 0 18px rgba(34, 211, 238, 0.18);
        }

        .create-button-wrap {
          width: 100%;
          max-width: 760px;
          flex-shrink: 0;
          padding: 10px 10px 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          overflow: hidden;
        }

        .open-create-btn {
          flex: 1 1 auto;
          width: auto;
          min-width: 0;
          max-width: 255px;
          transform: none;
          border: none;
          border-radius: 999px;
          min-height: 45px;
          padding: 10px 18px;
          background:
            linear-gradient(135deg, #2563eb, #06b6d4 55%, #10b981);
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 14px 30px rgba(37, 99, 235, 0.28),
            0 6px 16px rgba(6, 182, 212, 0.18);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.2px;
          flex-shrink: 0;
        }

        .telegram-login-icon-btn {
          position: static;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.98);
          color: #2563eb;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 6px;
          flex-shrink: 0;
          box-shadow:
            0 12px 28px rgba(37, 99, 235, 0.18),
            inset 0 0 0 1px rgba(37, 99, 235, 0.14);
          transition: all 0.2s ease;
        }

        .telegram-login-icon-btn:active {
          transform: scale(0.96);
        }

        .update-lock-icon {
          background: #eff6ff !important;
          color: #2563eb !important;
        }

        .update-pin-open-btn {
          background: linear-gradient(135deg, #2563eb, #06b6d4) !important;
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.24) !important;
        }

        .external-login-icon-btn {
          position: static;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: #fff;
          color: #dc2626;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 6px;
          flex-shrink: 0;
          box-shadow:
            0 12px 28px rgba(220, 38, 38, 0.20),
            inset 0 0 0 1px rgba(220, 38, 38, 0.16);
          transition: all 0.2s ease;
        }

        .external-login-icon-btn:active {
          transform: scale(0.96);
        }

        .external-login-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          border-radius: 50%;
        }

        .telegram-login-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .telegram-login-line {
          fill: none;
          stroke: #2563eb;
          stroke-width: 6.5;
        }

        .telegram-login-fill {
          fill: #2563eb;
        }

        .plus-icon {
          width: 23px;
          height: 23px;
          border-radius: 50%;
          background: rgba(255,255,255,0.22);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }

        .open-create-btn:active,
        .save-btn:active,
        .cancel-btn:active,
        .pin-open-btn:active,
        .pin-cancel-btn:active,
        .dot-btn:active,
        .menu-action-btn:active {
          transform: scale(0.98);
        }

        .open-create-btn:active {
          transform: scale(0.98);
        }

        .create-card {
          margin: 8px 10px 10px;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          padding: 13px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(12px);
          animation: formSlide 0.22s ease;
        }

        @keyframes formSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-area {
          position: relative;
          flex-shrink: 0;
        }

        .logo-picker {
          width: 68px;
          height: 68px;
          border-radius: 21px;
          background: #f1f5f9;
          border: 1px solid #dbe4f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
          box-shadow: inset 0 0 0 4px rgba(255,255,255,0.55);
          padding: 0;
        }

        .logo-picker img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-logo {
          position: absolute;
          top: -7px;
          right: -7px;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          border: 2px solid white;
          background: #ef4444;
          color: white;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .form-area {
          flex: 1;
          min-width: 0;
        }

        .form-area label {
          display: block;
          margin-bottom: 7px;
          font-size: 12px;
          font-weight: 900;
          color: #2563eb;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .form-area input {
          width: 100%;
          min-height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 15px;
          padding: 0 13px;
          font-size: 14px;
          outline: none;
          color: #111827;
          background: #ffffff;
          font-weight: 700;
        }

        .form-area input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.13);
        }

        .tagline-input {
          margin-top: 8px;
        }

        .update-note-box {
          margin-top: 9px;
          padding: 10px 12px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .update-note-box span {
          display: block;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 2px;
        }

        .update-note-box p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .private-toggle-row {
          margin-top: 9px;
          padding: 10px 11px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .private-toggle-text strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
        }

        .private-toggle-text span {
          display: block;
          margin-top: 2px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .mini-switch {
          position: relative;
          width: 48px;
          height: 28px;
          flex-shrink: 0;
        }

        .mini-switch input {
          display: none;
        }

        .mini-switch span {
          position: absolute;
          inset: 0;
          border-radius: 50px;
          background: #cbd5e1;
          cursor: pointer;
          transition: 0.25s;
        }

        .mini-switch span::before {
          content: "";
          position: absolute;
          width: 22px;
          height: 22px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: white;
          transition: 0.25s;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
        }

        .mini-switch input:checked + span {
          background: linear-gradient(135deg, #2563eb, #06b6d4);
        }

        .mini-switch input:checked + span::before {
          transform: translateX(20px);
        }

        .pin-input-small {
          margin-top: 8px;
          text-align: center;
          letter-spacing: 5px;
          font-size: 18px !important;
        }

        .form-buttons {
          margin-top: 9px;
          display: flex;
          gap: 8px;
        }

        .save-btn,
        .cancel-btn {
          min-height: 38px;
          border: none;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          padding: 0 14px;
        }

        .save-btn {
          flex: 1;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
        }

        .save-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #e2e8f0;
          color: #475569;
        }


        .owner-delete-alert {
          margin: 7px 10px 8px;
          padding: 10px 13px;
          border-radius: 15px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 12.5px;
          font-weight: 950;
          text-align: center;
          box-shadow: 0 10px 24px rgba(220, 38, 38, 0.1);
          animation: alertSlide 0.18s ease;
          flex-shrink: 0;
        }

        @keyframes alertSlide {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .channel-list {
          width: 100%;
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 2px 0 18px;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }

        .channel-list::-webkit-scrollbar {
          width: 4px;
        }

        .channel-list::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.25);
          border-radius: 99px;
        }

        .developer-footer {
          width: 100%;
          flex-shrink: 0;
          min-height: 34px;
          padding: 6px 10px max(7px, env(safe-area-inset-bottom));
          background: rgba(255, 255, 255, 0.98);
          border-top: 1px solid rgba(29, 78, 216, 0.16);
          box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-family: "Poppins", "Montserrat", "Trebuchet MS", "Segoe UI", Arial, sans-serif;
          font-size: 11.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.15px;
          color: #111827;
          z-index: 25;
        }

        .developer-code-icon {
          color: #dc2626;
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
        }

        .developer-text {
          color: #111827;
        }

        .developer-name {
          color: #ea580c;
          font-weight: 950;
        }

        .channel-row {
          position: relative;
          min-height: 88px;
          display: flex;
          align-items: stretch;
          margin: 0 10px 10px;
          border-radius: 22px;
          overflow: visible;
          background:
            linear-gradient(white, white) padding-box,
            linear-gradient(135deg, var(--c1), var(--c2)) border-box;
          border: 1px solid transparent;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        .channel-row::before {
          content: "";
          position: absolute;
          left: 0;
          top: 14px;
          bottom: 14px;
          width: 4px;
          border-radius: 10px;
          background: linear-gradient(180deg, var(--c1), var(--c2));
        }

        .channel-click {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 5px 12px 14px;
          cursor: pointer;
        }

        .channel-logo {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--c1), var(--c2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 900;
          overflow: hidden;
          flex-shrink: 0;
        }

        .channel-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .channel-logo-clickable {
          cursor: zoom-in;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .channel-logo-clickable:active {
          transform: scale(0.96);
        }

        .channel-logo-clickable:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.34);
          outline-offset: 3px;
        }

        .channel-name {
          flex: 1;
          min-width: 0;
          padding-right: 2px;
        }

        .channel-title-line {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          min-width: 0;
        }

        .channel-name h3 {
          margin: 0;
          font-size: 16.5px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.25;
          white-space: normal;
          overflow: visible;
          overflow-wrap: anywhere;
          letter-spacing: 0.1px;
        }

        .channel-tagline {
          margin: 3px 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
          line-height: 1.25;
          white-space: normal;
          overflow: visible;
          overflow-wrap: anywhere;
        }

        .channel-created-time {
          margin-top: 6px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          min-width: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.3;
        }

        .channel-created-time span {
          color: #2563eb;
          font-weight: 950;
        }

        .channel-created-time time {
          color: #475569;
          white-space: normal;
          overflow: visible;
          overflow-wrap: anywhere;
        }

        .private-lock {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #eef2ff;
          color: #2563eb;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(37,99,235,0.12);
        }

        .menu-wrap {
          width: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }

        .dot-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 50%;
          background: #f1f5f9;
          color: #475569;
          font-size: 21px;
          cursor: pointer;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .dot-btn:hover {
          background: #e2e8f0;
        }

        .channel-menu {
          position: absolute;
          top: 58px;
          right: 7px;
          width: 126px;
          background: rgba(255,255,255,0.98);
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.24);
          padding: 7px;
          z-index: 50;
          display: grid;
          gap: 7px;
          animation: menuPop 0.16s ease;
        }

        @keyframes menuPop {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.95);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .menu-action-btn {
          width: 100%;
          min-height: 38px;
          border: none;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        .menu-action-btn span {
          width: 20px;
          height: 20px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .update-menu-btn {
          color: #2563eb;
          background: #eff6ff;
        }

        .update-menu-btn span {
          background: #dbeafe;
        }

        .delete-menu-btn {
          color: #dc2626;
          background: #fef2f2;
        }

        .delete-menu-btn span {
          background: #fee2e2;
        }

        .empty-box {
          margin: 54px 18px;
          padding: 28px 16px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        }

        .empty-minimal {
          padding: 22px 16px;
        }

        .empty-box img {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          display: block;
          margin: 0 auto;
        }

        .loader {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid #d1d5db;
          border-top-color: #2563eb;
          margin: 0 auto;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .logo-viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 260;
          background:
            radial-gradient(circle at center, rgba(37, 99, 235, 0.16), transparent 40%),
            rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .logo-viewer-card {
          width: min(292px, calc(100vw - 44px));
          background: rgba(255, 255, 255, 0.98);
          border-radius: 28px;
          padding: 18px 16px 14px;
          text-align: center;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 30px 85px rgba(15, 23, 42, 0.36);
          animation: popupScale 0.18s ease;
        }

        .logo-viewer-image-wrap {
          width: min(232px, calc(100vw - 86px));
          height: min(232px, calc(100vw - 86px));
          max-height: 34dvh;
          margin: 0 auto;
          position: relative;
          border-radius: 26px;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(203, 213, 225, 0.9);
          box-shadow:
            0 18px 42px rgba(15, 23, 42, 0.14),
            inset 0 0 0 6px rgba(248, 250, 252, 0.78);
        }

        .logo-viewer-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          padding: 8px;
        }

        .logo-viewer-close {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          width: 30px;
          height: 30px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #ef4444;
          color: #ffffff;
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0 2px;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(239, 68, 68, 0.36);
        }

        .logo-viewer-card p {
          margin: 12px 0 0;
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .popup-layer {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          pointer-events: none;
          background: rgba(15,23,42,0.06);
          padding: 18px;
        }

        .toast {
          width: min(255px, calc(100vw - 38px));
          background: rgba(255,255,255,0.98);
          border-radius: 26px;
          padding: 22px 17px 20px;
          text-align: center;
          box-shadow: 0 28px 85px rgba(15, 23, 42, 0.3);
          animation: popupScale 0.18s ease;
          border: 1px solid rgba(226,232,240,0.9);
        }

        .toast-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          margin: 0 auto 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 900;
        }

        .toast.success .toast-icon {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #16a34a;
          box-shadow: 0 12px 24px rgba(22,163,74,0.16);
        }

        .toast.error .toast-icon {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #dc2626;
          box-shadow: 0 12px 24px rgba(220,38,38,0.14);
        }

        .toast p {
          margin: 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 900;
          line-height: 1.35;
        }

        .confirm-layer {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 120;
          padding: 18px;
          backdrop-filter: blur(7px);
        }

        .confirm-card {
          width: min(330px, calc(100vw - 36px));
          background: white;
          border-radius: 26px;
          padding: 23px 18px 18px;
          text-align: center;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.36);
          animation: popupScale 0.16s ease;
        }

        @keyframes popupScale {
          from {
            transform: scale(0.92);
            opacity: 0;
          }

          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .confirm-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 26px;
          font-weight: 900;
        }

        .confirm-card h3 {
          margin: 0;
          color: #111827;
          font-size: 17px;
        }

        .confirm-card p {
          margin: 9px 0 18px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.4;
        }

        .confirm-buttons {
          display: flex;
          gap: 10px;
        }

        .confirm-buttons button {
          flex: 1;
          min-height: 39px;
          border: none;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .no-btn {
          background: #f1f5f9;
          color: #475569;
        }

        .yes-btn {
          background: #dc2626;
          color: white;
        }

        .pin-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background:
            radial-gradient(circle at center, rgba(37,99,235,0.18), transparent 38%),
            rgba(15, 23, 42, 0.58);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .professional-pin-card {
          width: min(292px, calc(100vw - 28px));
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,0.97);
          border-radius: 22px;
          padding: 18px 14px 14px;
          text-align: center;
          box-shadow:
            0 26px 70px rgba(15,23,42,0.36),
            inset 0 0 0 1px rgba(255,255,255,0.72);
          animation: pinPop 0.18s ease;
        }

        @keyframes pinPop {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.95);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pin-top-glow {
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 140px;
          background: radial-gradient(circle, rgba(37,99,235,0.28), transparent 68%);
        }

        .pin-logo-circle {
          width: 58px;
          height: 58px;
          margin: 0 auto 8px;
          border-radius: 18px;
          overflow: hidden;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
          box-shadow: 0 16px 34px rgba(37,99,235,0.26);
          position: relative;
          z-index: 2;
        }

        .pin-logo-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pin-lock-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          margin: 0 auto 8px;
          background: #eef2ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 10px 20px rgba(37,99,235,0.12);
        }

        .delete-lock-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .professional-pin-card h3 {
          margin: 0;
          font-size: 17px;
          color: #0f172a;
          font-weight: 900;
        }

        .professional-pin-card p {
          margin: 6px 0 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
        }

        .professional-pin-card p b {
          color: #2563eb;
          overflow-wrap: anywhere;
        }

        .pin-tagline {
          max-width: 230px;
          margin: 0 auto 9px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #ecfeff;
          color: #0891b2;
          font-size: 12px;
          font-weight: 900;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .center-pin-input {
          width: min(168px, calc(100vw - 92px));
          min-height: 48px;
          margin: 2px auto 8px;
          display: block;
          border: 1px solid #cbd5e1;
          border-radius: 18px;
          background: white;
          outline: none;
          text-align: center;
          font-size: 23px;
          font-weight: 950;
          letter-spacing: 8px;
          color: #0f172a;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
          padding: 0 10px 0 20px;
        }

        .center-pin-input::placeholder {
          color: #cbd5e1;
          letter-spacing: 8px;
        }

        .center-pin-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.14);
        }

        .center-pin-input:disabled {
          opacity: 0.76;
          cursor: wait;
        }

        .trust-device-row {
          width: min(232px, 100%);
          margin: 2px auto 7px;
          padding: 7px 9px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          cursor: pointer;
          user-select: none;
        }

        .trust-device-row input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .trust-device-row.is-disabled {
          opacity: 0.68;
          pointer-events: none;
        }

        .trust-check-mark {
          width: 19px;
          height: 19px;
          border-radius: 7px;
          border: 1px solid #93c5fd;
          background: white;
          color: transparent;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 950;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .trust-device-row input:checked + .trust-check-mark {
          color: white;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          border-color: transparent;
        }

        .trust-device-text {
          display: grid;
          gap: 1px;
          min-width: 0;
        }

        .trust-device-text strong {
          color: #0f172a;
          font-size: 11.5px;
          line-height: 1.1;
          font-weight: 950;
        }

        .trust-device-text small {
          color: #64748b;
          font-size: 9.7px;
          line-height: 1.15;
          font-weight: 800;
        }

        .wrong-pin-text {
          color: #dc2626;
          font-size: 12px;
          font-weight: 900;
          margin: 2px 0 10px;
          text-align: center;
        }

        .pin-buttons {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .pin-open-btn,
        .pin-cancel-btn {
          flex: 1;
          min-height: 34px;
          border: none;
          border-radius: 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .pin-open-btn {
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white;
          box-shadow: 0 14px 28px rgba(37,99,235,0.24);
        }

        .pin-open-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .delete-pin-open-btn {
          background: linear-gradient(135deg, #dc2626, #fb7185) !important;
          box-shadow: 0 14px 28px rgba(220, 38, 38, 0.24) !important;
        }

        .pin-cancel-btn {
          background: #f1f5f9;
          color: #475569;
        }

        @media (min-width: 431px) {
          .nm-page {
            align-items: stretch;
            padding: 0;
          }

          .nm-mobile {
            width: 100%;
            height: 100dvh;
            min-height: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .channel-row,
          .create-card,
          .owner-delete-alert {
            max-width: 760px;
            margin-left: auto;
            margin-right: auto;
          }

          .create-button-wrap {
            max-width: 760px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 430px) {
          .nm-mobile {
            max-width: none;
            border-radius: 0;
          }
        }

        @media (max-width: 380px) {
          .nm-header {
            min-height: 92px;
            padding: calc(env(safe-area-inset-top, 0px) + 22px) 12px 16px;
          }

          .nm-header h1 {
            font-size: clamp(20px, 5.7vw, 27px);
            letter-spacing: 0.55px;
          }

          .create-card {
            margin-left: 10px;
            margin-right: 10px;
            gap: 10px;
          }

          .logo-picker {
            width: 62px;
            height: 62px;
            border-radius: 20px;
          }

          .channel-row {
            margin-left: 8px;
            margin-right: 8px;
          }

          .channel-click {
            gap: 10px;
            padding-left: 12px;
          }

          .channel-logo {
            width: 52px;
            height: 52px;
            border-radius: 17px;
          }

          .channel-name h3 {
            font-size: 15.5px;
          }

          .channel-created-time {
            font-size: 10.5px;
          }

          .professional-pin-card {
            width: min(282px, calc(100vw - 24px));
            padding: 16px 12px 12px;
          }

          .create-button-wrap {
            gap: 6px;
            padding: 9px 8px 7px;
          }

          .open-create-btn {
            width: auto;
            max-width: 255px;
            flex: 1 1 auto;
            min-width: 0;
          }

          .open-create-btn:active {
            transform: scale(0.98);
          }

          .telegram-login-icon-btn,
          .external-login-icon-btn {
            width: 42px;
            height: 42px;
          }

          .center-pin-input {
            width: min(175px, calc(100vw - 88px));
            font-size: 26px;
          }
        }

        @media (max-width: 340px) {
          .create-button-wrap {
            padding-left: 7px;
            padding-right: 7px;
            gap: 5px;
          }

          .open-create-btn {
            min-width: 0;
            max-width: none;
            font-size: 12px;
            padding-left: 10px;
            padding-right: 10px;
            white-space: nowrap;
          }

          .telegram-login-icon-btn,
          .external-login-icon-btn {
            width: 40px;
            height: 40px;
          }

          .create-card {
            flex-direction: column;
          }

          .logo-area {
            align-self: center;
          }

          .channel-click {
            gap: 9px;
            padding-left: 11px;
          }

          .menu-wrap {
            width: 38px;
          }

          .dot-btn {
            width: 30px;
            height: 30px;
          }

          .pin-buttons {
            flex-direction: column-reverse;
          }

          .create-button-wrap {
            gap: 5px;
            padding: 8px 7px 7px;
          }

          .open-create-btn {
            width: auto;
            max-width: 255px;
            flex: 1 1 auto;
            min-width: 0;
            font-size: 13px;
          }

          .open-create-btn:active {
            transform: scale(0.98);
          }

          .telegram-login-icon-btn,
          .external-login-icon-btn {
            width: 40px;
            height: 40px;
          }

          .center-pin-input {
            width: 160px;
            font-size: 24px;
            letter-spacing: 8px;
          }
        }

        /* Initial list API loading spinner only.
           It appears only before the first channel-list API response,
           then never shows again during silent refresh/create/update/delete. */
        .initial-list-loader-layer {
          position: fixed;
          inset: 0;
          z-index: 220;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background:
            radial-gradient(circle at 20% 10%, rgba(59, 130, 246, 0.28), transparent 34%),
            radial-gradient(circle at 82% 88%, rgba(20, 184, 166, 0.26), transparent 34%),
            rgba(2, 6, 23, 0.58);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: initialLoaderFade 0.18s ease both;
        }

        .initial-list-loader-card {
          width: min(270px, calc(100vw - 46px));
          padding: 24px 18px 20px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow:
            0 30px 90px rgba(15, 23, 42, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.88);
          text-align: center;
          font-family: "Poppins", "Montserrat", "Trebuchet MS", "Segoe UI", Arial, sans-serif;
          animation: initialLoaderPop 0.22s cubic-bezier(.2,.9,.3,1) both;
        }

        .initial-progress-circle {
          width: 124px;
          height: 124px;
          margin: 0 auto 15px;
          border-radius: 50%;
          padding: 9px;
          background:
            conic-gradient(
              from -90deg,
              #2563eb 0 calc(var(--progress) * 1%),
              rgba(226, 232, 240, 0.95) calc(var(--progress) * 1%) 100%
            );
          box-shadow:
            0 18px 36px rgba(37, 99, 235, 0.22),
            0 0 0 8px rgba(37, 99, 235, 0.06);
          position: relative;
        }

        .initial-progress-circle::after {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.6);
          pointer-events: none;
        }

        .initial-progress-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 20%, rgba(255,255,255,1), rgba(248,250,252,0.96));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 8px rgba(15, 23, 42, 0.08);
        }

        .initial-progress-inner strong {
          color: #0f172a;
          font-size: 27px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.4px;
        }

        .initial-progress-inner span {
          margin-top: 5px;
          color: #2563eb;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .initial-list-loader-card h3 {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
          line-height: 1.18;
          font-weight: 950;
        }

        .initial-list-loader-card p {
          margin: 7px auto 0;
          max-width: 210px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.36;
          font-weight: 700;
        }

        @keyframes initialLoaderFade {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes initialLoaderPop {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }


      `}</style>
    </div>
  );
}
