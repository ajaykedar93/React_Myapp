import React, { useEffect, useRef, useState } from "react";

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
  const fileRef = useRef(null);
  const pinRequestRef = useRef(0);
  const pinAbortRef = useRef(null);
  const pinCheckingRef = useRef(false);
  const pinSuccessRef = useRef(false);
  const openingChannelRef = useRef(false);
  const ownerAlertTimerRef = useRef(null);

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
  const [pinChecking, setPinChecking] = useState(false);

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

  useEffect(() => {
    fetchChannels();

    return () => {
      if (ownerAlertTimerRef.current) {
        clearTimeout(ownerAlertTimerRef.current);
      }
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

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });

    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1800);
  };

  const showOwnerDeleteAlert = (
    message = "Only owner can delete this channel."
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
      "Delete Channel?",
      `Do you want to delete "${channel.channel_name}"?`,
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

  const fetchChannels = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/telegram-channels?user_id=${PUBLIC_USER_ID}`
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to load channels", "error");
        return;
      }

      setChannels(data.channels || []);
    } catch (error) {
      console.error("Fetch channels error:", error);
      showToast("Server error while loading channels", "error");
    } finally {
      setLoading(false);
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
    const oldChannels = channels;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_name", channelName.trim());
      formData.append("channel_tagline", channelTagline.trim());
      formData.append("remove_logo", removeLogo ? "true" : "false");

      const currentDeviceId = getCurrentDeviceId();
      formData.append("device_id", currentDeviceId);

      if (!currentEditingId) {
        formData.append("created_device_id", currentDeviceId);
        formData.append("is_private", isPrivate ? "true" : "false");
        formData.append("private_pin", isPrivate ? privatePin : "");
      }

      if (channelLogo) {
        formData.append("logo", channelLogo);
      }

      const url = currentEditingId
        ? `${API_URL}/api/telegram-channels/${currentEditingId}`
        : `${API_URL}/api/telegram-channels`;

      const method = currentEditingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
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
      } else {
        setChannels((prev) => [savedChannel, ...prev]);
        showToast("Channel created successfully", "success");
      }

      resetForm();

      setTimeout(() => {
        fetchChannels();
      }, 500);
    } catch (error) {
      console.error("Create/update channel error:", error);
      setChannels(oldChannels);
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (channel) => {
    setShowCreateForm(true);
    setEditingId(channel.channel_id);
    setChannelName(channel.channel_name || "");
    setChannelTagline(channel.channel_tagline || "");
    setLogoPreview(getChannelLogoSource(channel));
    setChannelLogo(null);
    setRemoveLogo(false);
    setActiveMenuId(null);

    // Header and create form stay fixed; only channel list scrolls.
  };

  const deleteChannel = async (channelId, pin = "") => {
    const oldEditingId = editingId;
    const cleanDeletePin = String(pin || "").replace(/\D/g, "").slice(0, 4);

    setActiveMenuId(null);

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": getCurrentDeviceId(),
        },
        body: JSON.stringify({
          device_id: getCurrentDeviceId(),
          pin: cleanDeletePin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const apiMessage = String(data?.message || "");
      const ownerBlocked =
        res.status === 403 ||
        /only.*device|created.*device|owner|blocked/i.test(apiMessage);

      if (!res.ok) {
        if (ownerBlocked) {
          closeConfirm();
          closeDeletePinBox();
          showOwnerDeleteAlert("Only owner can delete this channel.");
          return;
        }

        if (deletePinBox.show) {
          setDeletePinBox((prev) => ({
            ...prev,
            error: data.message || "PIN mismatch",
          }));
        } else {
          showToast(data.message || "Delete failed", "error");
        }

        return;
      }

      removeTrustedPin(channelId);
      closeDeletePinBox();

      setChannels((prev) =>
        prev.filter((channel) => Number(channel.channel_id) !== Number(channelId))
      );

      if (Number(oldEditingId) === Number(channelId)) {
        resetForm();
      }

      showToast("Channel deleted successfully", "success");
    } catch (error) {
      console.error("Delete channel error:", error);

      if (deletePinBox.show) {
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

  const saveSelectedChannel = (channel, pin = "") => {
    localStorage.setItem("selected_channel_id", channel.channel_id);
    localStorage.setItem("selected_channel_name", channel.channel_name);
    localStorage.setItem(
      "selected_channel_tagline",
      channel.channel_tagline || ""
    );
    localStorage.setItem(
      "selected_channel_is_private",
      isTrue(channel.is_private) ? "true" : "false"
    );

    if (isTrue(channel.is_private) && pin) {
      localStorage.setItem("selected_channel_pin", pin);
    } else {
      localStorage.removeItem("selected_channel_pin");
    }
  };

  const goToChannel = (channel, pin = "") => {
    openingChannelRef.current = true;
    pinSuccessRef.current = true;
    pinRequestRef.current += 1;
    pinCheckingRef.current = false;

    if (pinAbortRef.current) {
      pinAbortRef.current.abort();
      pinAbortRef.current = null;
    }

    saveSelectedChannel(channel, pin);

    setPinChecking(false);
    setPinBox({
      show: false,
      channel: null,
      pin: "",
      error: "",
      trustDevice: false,
    });

    requestAnimationFrame(() => {
      window.location.hash = "/teligram-notes";
    });
  };

  const openChannel = (channel) => {
    if (openingChannelRef.current) return;

    pinSuccessRef.current = false;
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
        pinRequestRef.current += 1;
        pinCheckingRef.current = false;

        if (pinAbortRef.current) {
          pinAbortRef.current.abort();
          pinAbortRef.current = null;
        }

        setPinChecking(false);
        setPinBox({
          show: false,
          channel: null,
          pin: "",
          error: "",
          trustDevice: false,
        });

        goToChannel(channel, trustedPin);
        return;
      }

      pinRequestRef.current += 1;
      pinCheckingRef.current = false;

      if (pinAbortRef.current) {
        pinAbortRef.current.abort();
        pinAbortRef.current = null;
      }

      localStorage.setItem("selected_channel_id", channel.channel_id);
      localStorage.setItem("selected_channel_name", channel.channel_name || "");
      localStorage.setItem(
        "selected_channel_tagline",
        channel.channel_tagline || ""
      );
      localStorage.setItem("selected_channel_is_private", "true");
      localStorage.removeItem("selected_channel_pin");

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

    if (!selectedChannel || pinCheckingRef.current) return;

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

      if (!isLatestRequest) return;

      const messageText = String(data?.message || "").toLowerCase();

      const unlocked =
        res.ok &&
        (isTrue(data?.unlocked) ||
          isTrue(data?.success) ||
          isTrue(data?.verified) ||
          isTrue(data?.valid) ||
          messageText.includes("verified") ||
          messageText.includes("success"));

      if (!unlocked) {
        if (pinSuccessRef.current) return;

        pinCheckingRef.current = false;
        setPinChecking(false);

        setPinBox((prev) => {
          const sameChannel =
            Number(prev.channel?.channel_id) ===
            Number(selectedChannel.channel_id);

          /*
            If the user has already changed the PIN or closed the popup,
            do not show old mismatch/error from an older request.
          */
          if (!prev.show || !sameChannel || prev.pin !== typedPin) {
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
        Close popup first, lock re-open, then navigate.
        This prevents the old PIN popup from flashing again for 1-2 seconds.
      */
      if (trustThisDevice) {
        saveTrustedPin(selectedChannel.channel_id, typedPin);
      } else {
        removeTrustedPin(selectedChannel.channel_id);
      }

      goToChannel(selectedChannel, typedPin);
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error("Verify PIN error:", error);

      if (pinSuccessRef.current || pinRequestRef.current !== requestId) return;

      pinCheckingRef.current = false;
      setPinChecking(false);

      setPinBox((prev) => ({
        ...prev,
        error: "Server error",
      }));
    } finally {
      if (!pinSuccessRef.current && pinRequestRef.current === requestId) {
        pinAbortRef.current = null;
        pinCheckingRef.current = false;
        setPinChecking(false);
      }
    }
  };

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
                  <span>Update mode</span>
                  <p>Private setting cannot be changed after create.</p>
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
          {loading && channels.length === 0 && (
            <div className="empty-box">
              <div className="loader"></div>
            </div>
          )}

          {!loading && channels.length === 0 && (
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
                  <div className="channel-logo">
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

      {pinBox.show && !openingChannelRef.current && (
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
              onChange={(e) =>
                setPinBox((prev) => ({
                  ...prev,
                  pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  error: "",
                }))
              }
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
                disabled={pinChecking || String(pinBox.pin || "").length !== 4}
              >
                {pinChecking ? "Checking..." : "Open"}
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
              Enter same PIN to delete <b>{deletePinBox.channel?.channel_name}</b>
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
          flex-shrink: 0;
          padding: 10px 10px 8px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .open-create-btn {
          width: min(265px, calc(100vw - 40px));
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

          .center-pin-input {
            width: min(175px, calc(100vw - 88px));
            font-size: 26px;
          }
        }

        @media (max-width: 340px) {
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

          .center-pin-input {
            width: 160px;
            font-size: 24px;
            letter-spacing: 8px;
          }
        }
      `}</style>
    </div>
  );
}
