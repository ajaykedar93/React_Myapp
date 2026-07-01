import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/*
  Telegram Dashboard Route:
  <Route path="/telegram_loginnotes" element={<Telegram_Dashboard />} />

  Required backend mounts:
  app.use("/api/telegramlogin-users", telegramloginUsersRoutes);
  app.use("/api/telegramlogin-channels", telegramloginChannelsRoutes);
*/

const USER_ROUTE_PREFIX = "/api/telegramlogin-users";
const CHANNEL_ROUTE_PREFIX = "/api/telegramlogin-channels";

const cleanSlash = (value = "") => String(value || "").replace(/\/$/, "");

const makeApiBase = (envValue, routePrefix) => {
  const rawBase = envValue || "https://express-backend-myapp.onrender.com" || "http://localhost:5000";
  const cleanBase = cleanSlash(rawBase);

  if (cleanBase.endsWith(routePrefix)) return cleanBase;

  if (/\/api\/[^/]+$/i.test(cleanBase)) {
    return cleanBase.replace(/\/api\/[^/]+$/i, routePrefix);
  }

  return `${cleanBase}${routePrefix}`;
};

const USERS_API_BASE = makeApiBase(
  import.meta.env.VITE_TELEGRAM_USERS_API_URL || import.meta.env.VITE_API_BASE_URL,
  USER_ROUTE_PREFIX
);

const CHANNELS_API_BASE = makeApiBase(
  import.meta.env.VITE_TELEGRAM_CHANNELS_API_URL || import.meta.env.VITE_API_BASE_URL,
  CHANNEL_ROUTE_PREFIX
);

const API = {
  users: {
    me: `${USERS_API_BASE}/me`,
    list: `${USERS_API_BASE}/list`,
    allRegisterUsers: `${USERS_API_BASE}/all-register-users`,
    update: (id) => `${USERS_API_BASE}/${id}`,
    get: (id) => `${USERS_API_BASE}/${id}`,
    delete: (id) => `${USERS_API_BASE}/${id}`,
    profileImage: (id) => `${USERS_API_BASE}/profile-image/${id}`,
    sendOldEmailCode: `${USERS_API_BASE}/update-email/send-old-code`,
    verifyOldEmailCode: `${USERS_API_BASE}/update-email/verify-old-code`,
    sendNewEmailCode: `${USERS_API_BASE}/update-email/send-new-code`,
    verifyNewEmailCode: `${USERS_API_BASE}/update-email/verify-new-code`,
  },
  channels: {
    health: `${CHANNELS_API_BASE}/health`,
    myChannels: `${CHANNELS_API_BASE}/my-channels`,
    create: `${CHANNELS_API_BASE}/create`,
    get: (id) => `${CHANNELS_API_BASE}/${id}`,
    update: (id) => `${CHANNELS_API_BASE}/${id}`,
    delete: (id) => `${CHANNELS_API_BASE}/${id}`,
    remove: (id) => `${CHANNELS_API_BASE}/${id}/remove`,
    logo: (id) => `${CHANNELS_API_BASE}/logo/${id}`,
    join: (shareCode) => `${CHANNELS_API_BASE}/join/${encodeURIComponent(shareCode)}`,
    verifyPin: (id) => `${CHANNELS_API_BASE}/${id}/verify-pin`,
    open: (id) => `${CHANNELS_API_BASE}/${id}/open`,
    sendLink: `${CHANNELS_API_BASE}/send-link`,
    shareLink: `${CHANNELS_API_BASE}/share-link`,
    receivedLinks: `${CHANNELS_API_BASE}/received-links`,
    respondReceivedLink: (id) => `${CHANNELS_API_BASE}/received-links/${id}`,
    members: (id) => `${CHANNELS_API_BASE}/${id}/members`,
    notes: (id) => `${CHANNELS_API_BASE}/${id}/notes`,
    noteAttachment: (noteId) => `${CHANNELS_API_BASE}/notes/${noteId}/attachment`,
    deleteNote: (noteId) => `${CHANNELS_API_BASE}/notes/${noteId}`,
  },
};

const STORAGE_KEYS = [
  "telegram_token",
  "telegram_auth_token",
  "token",
  "authToken",
  "telegram_user_id",
  "telegram_user_name",
  "telegram_user_email",
  "telegram_user_mobile",
  "telegram_user_profile_image",
  "telegram_user_details",
  "telegram_pending_redirect",
  "telegram_pending_share_code",
  "telegram_trust_login_enabled",
  "telegram_trusted_device_token",
  "telegram_trusted_at",
];

const getToken = () =>
  localStorage.getItem("telegram_token") ||
  localStorage.getItem("telegram_auth_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  "";

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("telegram_trusted_device_id") || localStorage.getItem("telegram_device_id");

  if (!deviceId) {
    if (window.crypto?.randomUUID) {
      deviceId = window.crypto.randomUUID();
    } else {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }
  }

  localStorage.setItem("telegram_device_id", deviceId);
  localStorage.setItem("telegram_trusted_device_id", deviceId);
  return deviceId;
};

const toLowerText = (value) => String(value || "").trim().toLowerCase();
const toText = (value) => String(value || "").trim();

const getUserId = (user) => user?.telegram_user_id || user?.user_id || user?.id || user?._id || "";
const getChannelId = (channel) => channel?.channel_id || channel?.id || channel?._id || "";
const getInitial = (value) => String(value || "U").trim().charAt(0).toUpperCase() || "U";

const getUsername = (user) =>
  user?.username || user?.user_name || user?.full_name || user?.name || user?.email || "User";

const getDisplayName = (user) => user?.full_name || user?.name || user?.username || user?.email || "User";
const getEmail = (user) => user?.email || user?.email_address || "";
const getMobile = (user) => user?.mobile_no || user?.mobile || user?.phone || "";

const getShareCode = (channel) =>
  channel?.share_code || channel?.shareCode || channel?.channel_share_code || channel?.invite_code || "";

const getChannelName = (channel) => channel?.channel_name || channel?.name || "Channel";
const getChannelType = (channel) => String(channel?.channel_type || channel?.type || "public").toLowerCase();

const getLogoUrlFromChannel = (channel) => {
  const direct = channel?.channel_logo_url || channel?.logo_url || channel?.channel_logo || "";
  if (direct) return direct;
  const id = getChannelId(channel);
  return id ? API.channels.logo(id) : "";
};

const withCache = (url, key) => {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${key}`;
};

const absoluteUrl = (url) => {
  if (!url) return "";
  if (/^(https?:\/\/|blob:|data:)/i.test(url)) return url;
  if (url.startsWith("/api/telegramlogin-users") || url.startsWith("/api/telegramlogin-channels")) {
    return `${window.location.origin}${url}`;
  }
  return url;
};

const buildShareLink = (channel) => {
  const code = getShareCode(channel);
  return code ? `${window.location.origin}/channel/join/${code}` : "";
};

const extractShareCode = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    const joinIndex = parts.indexOf("join");
    if (joinIndex >= 0 && parts[joinIndex + 1]) return parts[joinIndex + 1];
    return parts[parts.length - 1] || text;
  } catch {
    const parts = text.split("/").filter(Boolean);
    return parts[parts.length - 1] || text;
  }
};

const formatISTDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Date not available";

  const day = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const month = date.toLocaleDateString("en-IN", {
    month: "long",
    timeZone: "Asia/Kolkata",
  });

  const year = date.toLocaleDateString("en-IN", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const time = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return `${day} ${month} ${year}, ${time} IST`;
};

const isOwnerChannel = (channel, user) => {
  const currentUserId = String(getUserId(user));
  const ownerId = String(
    channel?.created_by_user_id ||
      channel?.created_by ||
      channel?.owner_id ||
      channel?.telegram_user_id ||
      channel?.user_id ||
      ""
  );

  const currentEmail = toLowerText(getEmail(user));
  const ownerEmail = toLowerText(channel?.owner_email || channel?.created_by_email || channel?.email || "");

  if (currentUserId && ownerId && currentUserId === ownerId) return true;
  if (currentEmail && ownerEmail && currentEmail === ownerEmail) return true;
  return channel?.is_owner === true || channel?.isOwner === true || channel?.member_role === "owner";
};

const getInvitationId = (item) => item?.invitation_id || item?.invite_id || item?.id || item?._id || "";
const getInvitationChannelName = (item) => item?.channel_name || item?.channel?.channel_name || item?.channel?.name || "Channel";
const getInvitationSenderName = (item) => item?.sender_name || item?.sender?.full_name || item?.sender?.name || "A user";
const getInvitationShareValue = (item) => item?.share_link || item?.join_link || item?.share_code || item?.channel?.share_code || "";

export default function Telegram_Dashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const toastTimer = useRef(null);

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [imageVersion, setImageVersion] = useState(Date.now());

  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [imageViewer, setImageViewer] = useState({ show: false, src: "", title: "" });

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    username: "",
    mobile_no: "",
    email: "",
    password: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [emailStep, setEmailStep] = useState({
    oldSent: false,
    oldVerified: false,
    oldCode: "",
    newSent: false,
    newVerified: false,
    newCode: "",
  });

  const [joinInput, setJoinInput] = useState("");
  const [joinPinBox, setJoinPinBox] = useState({ show: false, shareCode: "", channel: null, pin: "", trust: false });

  const [createOpen, setCreateOpen] = useState(false);
  const [createTypePicked, setCreateTypePicked] = useState("");
  const [createForm, setCreateForm] = useState({
    channel_type: "public",
    channel_name: "",
    channel_description: "",
    security_pin: "",
  });
  const [createLogo, setCreateLogo] = useState(null);
  const [createLogoPreview, setCreateLogoPreview] = useState("");

  const [activeMenuId, setActiveMenuId] = useState("");
  const [editChannel, setEditChannel] = useState(null);
  const [editForm, setEditForm] = useState({ channel_name: "", channel_description: "" });
  const [editLogo, setEditLogo] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState("");

  const [openPinBox, setOpenPinBox] = useState({ show: false, channel: null, pin: "", trust: false });
  const [deleteBox, setDeleteBox] = useState({ show: false, channel: null, pin: "", mode: "" });

  const [shareBox, setShareBox] = useState({ show: false, channel: null, loading: false, users: [], selected: [] });
  const [linkBoxOpen, setLinkBoxOpen] = useState(false);
  const [receivedLinks, setReceivedLinks] = useState([]);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [acceptedLink, setAcceptedLink] = useState("");

  const currentUserId = String(getUserId(user));
  const currentEmail = toLowerText(getEmail(user));
  const typedEmail = toLowerText(profileForm.email);
  const emailChanged = Boolean(currentEmail && typedEmail && currentEmail !== typedEmail);

  const profileImageSrc =
    profileImagePreview ||
    absoluteUrl(user?.profile_image_url) ||
    (getUserId(user) ? withCache(API.users.profileImage(getUserId(user)), imageVersion) : "");

  const publicChannels = channels.filter((channel) => getChannelType(channel) === "public");
  const privateChannels = channels.filter((channel) => getChannelType(channel) === "private");

  const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "x-device-id": deviceId,
    ...extra,
  });

  const showToast = (message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, type, message });
    toastTimer.current = window.setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1900);
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const message = typeof data === "string" ? data : data?.message;
      const error = new Error(message || "Something went wrong");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data || {};
  };

  const fillProfileForm = (nextUser) => {
    setProfileForm({
      full_name: nextUser?.full_name || "",
      username: nextUser?.username || nextUser?.user_name || "",
      mobile_no: getMobile(nextUser),
      email: getEmail(nextUser),
      password: "",
    });
    setEmailStep({ oldSent: false, oldVerified: false, oldCode: "", newSent: false, newVerified: false, newCode: "" });
  };

  const loadReceivedLinks = async (showError = false) => {
    if (!token) return;
    setReceivedLoading(true);
    try {
      const data = await requestJson(API.channels.receivedLinks, {
        headers: authHeaders(),
      });
      const list = data.links || data.invitations || data.received_links || data.data || [];
      setReceivedLinks(
        list.filter((item) => {
          const status = toLowerText(item?.invitation_status || item?.status || "pending");
          return !["accepted", "rejected", "declined", "expired", "deleted"].includes(status);
        })
      );
    } catch (error) {
      setReceivedLinks([]);
      if (showError) showToast(error.message || "Received links API failed", "error");
    } finally {
      setReceivedLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [meData, channelData] = await Promise.all([
        requestJson(API.users.me, { headers: authHeaders() }),
        requestJson(API.channels.myChannels, { headers: authHeaders() }),
      ]);

      const nextUser = meData.user || meData.data || null;
      setUser(nextUser);
      fillProfileForm(nextUser);
      setChannels(channelData.channels || channelData.data || []);
      await loadReceivedLinks(false);
    } catch (error) {
      showToast(error.message || "Dashboard load failed", "error");
      if (error.status === 401) logout(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = (showMessage = true) => {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (showMessage) showToast("Logged out", "success");
    navigate("/telegram-login", { replace: true });
  };

  const openImage = (src, title = "Preview") => {
    const finalSrc = absoluteUrl(src);
    if (!finalSrc) return;
    setImageViewer({ show: true, src: finalSrc, title });
  };

  const copyText = async (value, label = "Copied") => {
    if (!value) {
      showToast("Nothing to copy", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast(label);
    } catch {
      const input = document.createElement("input");
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      showToast(label);
    }
  };

  const openProfileEdit = () => {
    fillProfileForm(user);
    setProfileEditOpen((prev) => !prev);
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setProfileImageFile(file);
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    setProfileImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const sendOldEmailCode = async () => {
    try {
      setLoading(true);
      await requestJson(API.users.sendOldEmailCode, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ old_email: currentEmail, email: currentEmail }),
      });
      setEmailStep((prev) => ({ ...prev, oldSent: true, oldVerified: false }));
      showToast("OTP sent to old email");
    } catch (error) {
      showToast(error.message || "Old email OTP failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOldEmailCode = async () => {
    try {
      setLoading(true);
      await requestJson(API.users.verifyOldEmailCode, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ old_email: currentEmail, email: currentEmail, code: emailStep.oldCode }),
      });
      setEmailStep((prev) => ({ ...prev, oldVerified: true }));
      showToast("Old email verified");
    } catch (error) {
      showToast(error.message || "Old OTP verify failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendNewEmailCode = async () => {
    if (!emailStep.oldVerified) {
      showToast("Verify old email first", "error");
      return;
    }

    try {
      setLoading(true);
      await requestJson(API.users.sendNewEmailCode, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ new_email: typedEmail, email: typedEmail }),
      });
      setEmailStep((prev) => ({ ...prev, newSent: true, newVerified: false }));
      showToast("OTP sent to new email");
    } catch (error) {
      showToast(error.message || "New email OTP failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyNewEmailCode = async () => {
    try {
      setLoading(true);
      await requestJson(API.users.verifyNewEmailCode, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ new_email: typedEmail, email: typedEmail, code: emailStep.newCode }),
      });
      setEmailStep((prev) => ({ ...prev, newVerified: true }));
      showToast("New email verified");
    } catch (error) {
      showToast(error.message || "New OTP verify failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();

    const userId = getUserId(user);
    if (!userId) {
      showToast("User not found", "error");
      return;
    }

    if (emailChanged && !(emailStep.oldVerified && emailStep.newVerified)) {
      showToast("Verify old and new email first", "error");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("full_name", toText(profileForm.full_name));
      formData.append("username", toText(profileForm.username));
      formData.append("mobile_no", toText(profileForm.mobile_no));
      formData.append("email", typedEmail || currentEmail);
      if (profileForm.password) formData.append("password", profileForm.password);
      if (profileImageFile) formData.append("profile_image", profileImageFile);

      const data = await requestJson(API.users.update(userId), {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      const nextUser = data.user || data.data || { ...user, ...profileForm, email: typedEmail || currentEmail };
      setUser(nextUser);
      fillProfileForm(nextUser);
      setProfileImageFile(null);
      setProfileImagePreview("");
      setImageVersion(Date.now());
      setProfileEditOpen(false);
      showToast("Profile updated");
    } catch (error) {
      showToast(error.message || "Profile update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProfileImage = async () => {
    const userId = getUserId(user);
    if (!userId) return;

    try {
      setLoading(true);
      await requestJson(API.users.profileImage(userId), {
        method: "DELETE",
        headers: authHeaders(),
      });
      setUser((prev) => ({ ...prev, profile_image_url: "" }));
      setProfileImageFile(null);
      setProfileImagePreview("");
      setImageVersion(Date.now());
      showToast("Profile image removed");
    } catch (error) {
      showToast(error.message || "Remove image failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const joinChannel = async (shareValue = joinInput, options = {}) => {
    const shareCode = extractShareCode(shareValue);
    if (!shareCode) {
      showToast("Enter channel link or share code", "error");
      return;
    }

    try {
      setLoading(true);
      const data = await requestJson(API.channels.join(shareCode), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          device_id: deviceId,
          security_pin: options.pin || "",
          pin: options.pin || "",
          trust_device: options.trust || false,
        }),
      });

      setJoinInput("");
      setJoinPinBox({ show: false, shareCode: "", channel: null, pin: "", trust: false });
      const nextChannels = data.channels || null;
      if (nextChannels) setChannels(nextChannels);
      else await refreshChannels();
      showToast("Channel joined");
    } catch (error) {
      const needsPin = error.status === 401 || error.status === 403 || /pin/i.test(error.message || "");
      if (needsPin && !options.pin) {
        setJoinPinBox({
          show: true,
          shareCode,
          channel: error.data?.channel || null,
          pin: "",
          trust: false,
        });
      } else {
        showToast(error.message || "Join failed", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshChannels = async () => {
    const data = await requestJson(API.channels.myChannels, { headers: authHeaders() });
    const nextChannels = data.channels || data.data || [];
    setChannels(nextChannels);
    return nextChannels;
  };

  const resetCreateForm = () => {
    setCreateTypePicked("");
    setCreateForm({ channel_type: "public", channel_name: "", channel_description: "", security_pin: "" });
    setCreateLogo(null);
    if (createLogoPreview) URL.revokeObjectURL(createLogoPreview);
    setCreateLogoPreview("");
  };

  const chooseCreateType = (type) => {
    setCreateTypePicked(type);
    setCreateForm((prev) => ({ ...prev, channel_type: type, security_pin: type === "public" ? "" : prev.security_pin }));
  };

  const handleCreateLogoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setCreateLogo(file);
    if (createLogoPreview) URL.revokeObjectURL(createLogoPreview);
    setCreateLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const createChannel = async (event) => {
    event.preventDefault();

    if (!createTypePicked) {
      showToast("Select public or private", "error");
      return;
    }

    if (toText(createForm.channel_name).length < 3) {
      showToast("Enter channel name", "error");
      return;
    }

    if (createForm.channel_type === "private" && !/^\d{4,8}$/.test(createForm.security_pin)) {
      showToast("Private channel needs 4-8 digit PIN", "error");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("channel_type", createForm.channel_type);
      formData.append("channel_name", toText(createForm.channel_name));
      formData.append("channel_description", toText(createForm.channel_description));
      formData.append("device_id", deviceId);
      formData.append("created_device_id", deviceId);
      if (createForm.channel_type === "private") {
        formData.append("security_pin", createForm.security_pin);
        formData.append("pin", createForm.security_pin);
      }
      if (createLogo) formData.append("channel_logo", createLogo);

      await requestJson(API.channels.create, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      resetCreateForm();
      setCreateOpen(false);
      await refreshChannels();
      showToast("Channel created");
    } catch (error) {
      showToast(error.message || "Create channel failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const openChannel = (channel, pin = "") => {
    const channelId = getChannelId(channel);
    if (!channelId) {
      showToast("Channel not found", "error");
      return;
    }

    navigate(`/telegram-channel/${channelId}`, {
      state: {
        channel,
        channel_id: channelId,
        share_code: getShareCode(channel),
        private_pin: pin,
        access_mode: channel?.access_mode || channel?.accessMode || "full_access",
      },
    });
  };

  const requestOpenChannel = async (channel) => {
    setActiveMenuId("");

    if (getChannelType(channel) === "public") {
      openChannel(channel);
      return;
    }

    const channelId = getChannelId(channel);
    try {
      setLoading(true);
      const data = await requestJson(API.channels.open(channelId), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ device_id: deviceId }),
      });
      openChannel(data.channel || channel);
    } catch (error) {
      setOpenPinBox({ show: true, channel, pin: "", trust: false });
    } finally {
      setLoading(false);
    }
  };

  const verifyPrivatePinAndOpen = async () => {
    const { channel, pin, trust } = openPinBox;
    const channelId = getChannelId(channel);

    if (!/^\d{4,8}$/.test(pin)) {
      showToast("Enter valid 4-8 digit PIN", "error");
      return;
    }

    try {
      setLoading(true);
      const data = await requestJson(API.channels.verifyPin(channelId), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          security_pin: pin,
          pin,
          device_id: deviceId,
          trust_device: trust,
        }),
      });
      setOpenPinBox({ show: false, channel: null, pin: "", trust: false });
      showToast(trust ? "PIN verified. Device trusted" : "PIN verified");
      openChannel(data.channel || channel, pin);
    } catch (error) {
      showToast(error.message || "Incorrect PIN", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyChannelUrl = (channel) => {
    setActiveMenuId("");
    copyText(buildShareLink(channel), "Channel URL copied");
  };

  const loadRegisteredUsers = async (channel) => {
    setShareBox({ show: true, channel, loading: true, users: [], selected: [] });

    try {
      const data = await requestJson(API.users.allRegisterUsers, { headers: authHeaders() });
      const list = data.users || data.data || data.telegramUsers || [];
      const filtered = list.filter((item) => {
        const id = String(getUserId(item));
        const email = toLowerText(getEmail(item));
        if (currentUserId && id && currentUserId === id) return false;
        if (currentEmail && email && currentEmail === email) return false;
        return true;
      });
      setShareBox({ show: true, channel, loading: false, users: filtered, selected: [] });
    } catch (error) {
      setShareBox({ show: true, channel, loading: false, users: [], selected: [] });
      showToast(error.message || "Registered users failed", "error");
    }
  };

  const openShareBox = (channel) => {
    setActiveMenuId("");
    loadRegisteredUsers(channel);
  };

  const toggleShareUser = (value) => {
    setShareBox((prev) => ({
      ...prev,
      selected: prev.selected.includes(value)
        ? prev.selected.filter((item) => item !== value)
        : [...prev.selected, value],
    }));
  };

  const sendChannelInvitation = async () => {
    if (!shareBox.channel || shareBox.selected.length === 0) {
      showToast("Select at least one user", "error");
      return;
    }

    const selectedUsers = shareBox.users.filter((item) =>
      shareBox.selected.includes(String(getUserId(item) || getEmail(item)))
    );

    const body = {
      channel_id: getChannelId(shareBox.channel),
      channel_name: getChannelName(shareBox.channel),
      share_code: getShareCode(shareBox.channel),
      share_link: buildShareLink(shareBox.channel),
      receiver_ids: selectedUsers.map((item) => getUserId(item)).filter(Boolean),
      receiver_emails: selectedUsers.map((item) => getEmail(item)).filter(Boolean),
    };

    try {
      setLoading(true);
      try {
        await requestJson(API.channels.sendLink, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        });
      } catch {
        await requestJson(API.channels.shareLink, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        });
      }
      setShareBox({ show: false, channel: null, loading: false, users: [], selected: [] });
      showToast("Invitation sent");
    } catch (error) {
      showToast(error.message || "Send invitation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const respondInvitation = async (invitation, action) => {
    const id = getInvitationId(invitation);
    if (!id) {
      showToast("Invitation not found", "error");
      return;
    }

    try {
      setLoading(true);
      const data = await requestJson(API.channels.respondReceivedLink(id), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action,
          status: action === "accept" ? "accepted" : "rejected",
          invitation_id: id,
        }),
      });

      setReceivedLinks((prev) => prev.filter((item) => String(getInvitationId(item)) !== String(id)));

      if (action === "accept") {
        const link = data.share_link || data.join_link || getInvitationShareValue(invitation);
        setAcceptedLink(link);
        showToast("Invitation accepted. Copy URL and join.");
      } else {
        showToast("Invitation rejected");
      }
    } catch (error) {
      showToast(error.message || "Invitation action failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditChannel = (channel) => {
    setActiveMenuId("");
    setEditChannel(channel);
    setEditForm({
      channel_name: getChannelName(channel),
      channel_description: channel?.channel_description || channel?.description || "",
    });
    setEditLogo(null);
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    setEditLogoPreview("");
  };

  const handleEditLogoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setEditLogo(file);
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    setEditLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const updateChannel = async (event) => {
    event.preventDefault();
    const channelId = getChannelId(editChannel);

    if (toText(editForm.channel_name).length < 3) {
      showToast("Enter channel name", "error");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("channel_name", toText(editForm.channel_name));
      formData.append("channel_description", toText(editForm.channel_description));
      formData.append("device_id", deviceId);
      if (editLogo) formData.append("channel_logo", editLogo);

      const data = await requestJson(API.channels.update(channelId), {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      const updated = data.channel || data.data || null;
      setChannels((prev) =>
        prev.map((item) =>
          getChannelId(item) === channelId
            ? { ...item, ...(updated || {}), channel_name: editForm.channel_name, channel_description: editForm.channel_description }
            : item
        )
      );
      setEditChannel(null);
      setEditLogo(null);
      setEditLogoPreview("");
      setImageVersion(Date.now());
      showToast("Channel updated");
      refreshChannels().catch(() => null);
    } catch (error) {
      showToast(error.message || "Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const askDeleteOrRemove = (channel) => {
    setActiveMenuId("");
    const owner = isOwnerChannel(channel, user);
    const type = getChannelType(channel);
    setDeleteBox({
      show: true,
      channel,
      pin: "",
      mode: owner ? (type === "private" ? "owner_private" : "owner_public") : "remove_only",
    });
  };

  const confirmDeleteOrRemove = async () => {
    const channel = deleteBox.channel;
    const channelId = getChannelId(channel);

    if (!channelId) return;

    if (deleteBox.mode === "owner_private" && !/^\d{4,8}$/.test(deleteBox.pin)) {
      showToast("Enter private channel PIN", "error");
      return;
    }

    try {
      setLoading(true);

      if (deleteBox.mode === "remove_only") {
        await requestJson(API.channels.remove(channelId), {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ device_id: deviceId }),
        });
        showToast("Channel removed from your dashboard");
      } else {
        await requestJson(API.channels.delete(channelId), {
          method: "DELETE",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            device_id: deviceId,
            security_pin: deleteBox.pin,
            pin: deleteBox.pin,
          }),
        });
        showToast("Channel deleted");
      }

      setDeleteBox({ show: false, channel: null, pin: "", mode: "" });
      await refreshChannels();
    } catch (error) {
      showToast(error.message || "Action failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="td-page td-login-required">
        <style>{styles}</style>
        <div className="td-login-card">
          <div className="td-brand-dot">✈</div>
          <h2>Login Required</h2>
          <p>Please login to open your Notes Dashboard.</p>
          <button type="button" onClick={() => navigate("/telegram-login")}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="td-page" onClick={() => activeMenuId && setActiveMenuId("")}>
      <style>{styles}</style>

      <nav className="td-navbar">
        <div className="td-navbar-inner">
          <div>
            <span className="td-top-label">Telegram Notes</span>
            <h1>Notes Dashboard</h1>
          </div>

          <div className="td-nav-actions">
            <button
              type="button"
              className="td-link-btn"
              title="Link Requests"
              onClick={() => {
                setLinkBoxOpen(true);
                loadReceivedLinks(true);
              }}
            >
              🔗
              {receivedLinks.length > 0 && <span>{receivedLinks.length}</span>}
            </button>
            <button type="button" className="td-refresh-btn" onClick={loadDashboard} disabled={loading} title="Refresh">↻</button>
            <button type="button" className="td-logout-btn" onClick={() => logout(true)}>Logout</button>
          </div>
        </div>
      </nav>

      {loading && <div className="td-loading" />}

      <main className="td-main">
        <section className="td-profile-card">
          <button
            type="button"
            className="td-profile-img"
            onClick={() => openImage(profileImageSrc, "Profile Image")}
            title="Open profile image"
          >
            {profileImageSrc ? <img src={profileImageSrc} alt="Profile" /> : <span>{getInitial(getDisplayName(user))}</span>}
          </button>

          <div className="td-profile-text">
            <h2>{getDisplayName(user)}</h2>
            <p className="td-username">@{getUsername(user)}</p>
            <p>{getEmail(user) || "Email not available"}</p>
            <p>{getMobile(user) || "Mobile not available"}</p>
          </div>

          <button type="button" className="td-pencil" onClick={openProfileEdit} title="Edit profile">✎</button>
        </section>

        <section className="td-details-card">
          <div className="td-card-title-row">
            <h3>Registered Details</h3>
            <button type="button" className="td-small-outline" onClick={openProfileEdit}>✎ Update</button>
          </div>

          <div className="td-detail-grid">
            <div><small>User ID</small><strong>{getUserId(user) || "-"}</strong></div>
            <div><small>Name</small><strong>{getDisplayName(user)}</strong></div>
            <div><small>Username</small><strong>@{getUsername(user)}</strong></div>
            <div><small>Email</small><strong>{getEmail(user) || "-"}</strong></div>
            <div><small>Mobile</small><strong>{getMobile(user) || "-"}</strong></div>
            <div><small>Device</small><strong title={deviceId}>{deviceId}</strong></div>
          </div>
        </section>

        {profileEditOpen && (
          <section className="td-panel">
            <form className="td-form" onSubmit={updateProfile}>
              <div className="td-form-head">
                <h3>Edit Profile</h3>
                <button type="button" onClick={() => setProfileEditOpen(false)}>×</button>
              </div>

              <label>Profile Image</label>
              <div className="td-upload-row">
                <input type="file" accept="image/*" onChange={handleProfileImageChange} />
                {profileImagePreview && <button type="button" onClick={() => openImage(profileImagePreview, "New Profile Image")}>Preview</button>}
                <button type="button" className="danger-light" onClick={deleteProfileImage}>Remove Image</button>
              </div>

              <label>Name</label>
              <input value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Full name" />

              <label>Username</label>
              <input value={profileForm.username} onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value.replace(/\s/g, "") }))} placeholder="Username" />

              <label>Mobile No</label>
              <input value={profileForm.mobile_no} inputMode="numeric" maxLength="10" onChange={(e) => setProfileForm((p) => ({ ...p, mobile_no: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Mobile no" />

              <label>Email</label>
              <input
                value={profileForm.email}
                onChange={(e) => {
                  setProfileForm((p) => ({ ...p, email: e.target.value }));
                  setEmailStep({ oldSent: false, oldVerified: false, oldCode: "", newSent: false, newVerified: false, newCode: "" });
                }}
                placeholder="Email"
              />

              {emailChanged && (
                <div className="td-email-verify">
                  <p>Email update requires old email OTP and new email OTP.</p>
                  <div className="td-otp-row">
                    <button type="button" onClick={sendOldEmailCode}>{emailStep.oldSent ? "Resend Old OTP" : "Send Old OTP"}</button>
                    <input value={emailStep.oldCode} onChange={(e) => setEmailStep((p) => ({ ...p, oldCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="Old OTP" maxLength="6" />
                    <button type="button" onClick={verifyOldEmailCode} className={emailStep.oldVerified ? "ok" : ""}>{emailStep.oldVerified ? "Verified" : "Verify"}</button>
                  </div>
                  <div className="td-otp-row">
                    <button type="button" onClick={sendNewEmailCode}>{emailStep.newSent ? "Resend New OTP" : "Send New OTP"}</button>
                    <input value={emailStep.newCode} onChange={(e) => setEmailStep((p) => ({ ...p, newCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="New OTP" maxLength="6" />
                    <button type="button" onClick={verifyNewEmailCode} className={emailStep.newVerified ? "ok" : ""}>{emailStep.newVerified ? "Verified" : "Verify"}</button>
                  </div>
                </div>
              )}

              <label>New Password Optional</label>
              <input type="password" value={profileForm.password} onChange={(e) => setProfileForm((p) => ({ ...p, password: e.target.value }))} placeholder="New password" />

              <div className="td-action-row">
                <button type="submit" className="td-primary" disabled={loading}>Save Profile</button>
                <button type="button" className="td-muted" onClick={() => setProfileEditOpen(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        <section className="td-join-card">
          <div>
            <h3>Join Channel</h3>
            <p>Paste channel URL or share code.</p>
          </div>
          <div className="td-join-row">
            <input value={joinInput} onChange={(e) => setJoinInput(e.target.value)} placeholder="Paste channel link / share code" />
            <button type="button" className="td-primary" onClick={() => joinChannel()}>Join</button>
          </div>
        </section>

        <section className="td-create-section">
          <button type="button" className="td-create-toggle" onClick={() => setCreateOpen((value) => !value)}>
            {createOpen ? "Close Create Channel" : "+ Create Channel"}
          </button>

          {createOpen && (
            <form className="td-create-panel" onSubmit={createChannel}>
              <h3>Create Channel</h3>
              <p>First choose channel type.</p>

              <div className="td-type-tabs">
                <button type="button" className={createTypePicked === "public" ? "active" : ""} onClick={() => chooseCreateType("public")}>Public</button>
                <button type="button" className={createTypePicked === "private" ? "active" : ""} onClick={() => chooseCreateType("private")}>Private</button>
              </div>

              {createTypePicked && (
                <>
                  <label>Channel Logo Optional</label>
                  <input type="file" accept="image/*" onChange={handleCreateLogoChange} />
                  {createLogoPreview && <button type="button" className="td-preview-btn" onClick={() => openImage(createLogoPreview, "Channel Logo Preview")}>Preview Logo</button>}

                  <label>Channel Name</label>
                  <input value={createForm.channel_name} onChange={(e) => setCreateForm((p) => ({ ...p, channel_name: e.target.value }))} placeholder="Channel name" />

                  <label>Description Optional</label>
                  <textarea value={createForm.channel_description} onChange={(e) => setCreateForm((p) => ({ ...p, channel_description: e.target.value }))} placeholder="Channel description" />

                  {createForm.channel_type === "private" && (
                    <>
                      <label>Private Channel PIN</label>
                      <input value={createForm.security_pin} inputMode="numeric" maxLength="8" onChange={(e) => setCreateForm((p) => ({ ...p, security_pin: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="4-8 digit PIN" />
                    </>
                  )}

                  <div className="td-date-preview">Create time: {formatISTDateTime(new Date())}</div>

                  <div className="td-action-row">
                    <button type="submit" className="td-primary" disabled={loading}>Create</button>
                    <button type="button" className="td-muted" onClick={resetCreateForm}>Reset</button>
                  </div>
                </>
              )}
            </form>
          )}
        </section>

        <ChannelList
          title="Public Channels"
          empty="No public channels"
          channels={publicChannels}
          user={user}
          imageVersion={imageVersion}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onOpen={requestOpenChannel}
          onImage={openImage}
          onCopy={copyChannelUrl}
          onShare={openShareBox}
          onEdit={openEditChannel}
          onDelete={askDeleteOrRemove}
        />

        <ChannelList
          title="Private Channels"
          empty="No private channels"
          channels={privateChannels}
          user={user}
          imageVersion={imageVersion}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onOpen={requestOpenChannel}
          onImage={openImage}
          onCopy={copyChannelUrl}
          onShare={openShareBox}
          onEdit={openEditChannel}
          onDelete={askDeleteOrRemove}
        />
      </main>

      {joinPinBox.show && (
        <Modal title="Private Channel PIN" onClose={() => setJoinPinBox({ show: false, shareCode: "", channel: null, pin: "", trust: false })}>
          <p className="td-modal-text">This private channel needs PIN only during first join.</p>
          <input className="td-modal-input" value={joinPinBox.pin} type="password" inputMode="numeric" maxLength="8" onChange={(e) => setJoinPinBox((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="Enter private PIN" />
          <label className="td-check-row"><input type="checkbox" checked={joinPinBox.trust} onChange={(e) => setJoinPinBox((p) => ({ ...p, trust: e.target.checked }))} /> Trust this device</label>
          <button type="button" className="td-primary full" onClick={() => joinChannel(joinPinBox.shareCode, { pin: joinPinBox.pin, trust: joinPinBox.trust })}>Join Channel</button>
        </Modal>
      )}

      {openPinBox.show && (
        <Modal title="Open Private Channel" onClose={() => setOpenPinBox({ show: false, channel: null, pin: "", trust: false })}>
          <p className="td-modal-text">Enter PIN for {getChannelName(openPinBox.channel)}.</p>
          <input className="td-modal-input" value={openPinBox.pin} type="password" inputMode="numeric" maxLength="8" onChange={(e) => setOpenPinBox((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="Private PIN" />
          <label className="td-check-row"><input type="checkbox" checked={openPinBox.trust} onChange={(e) => setOpenPinBox((p) => ({ ...p, trust: e.target.checked }))} /> Trust this device</label>
          <button type="button" className="td-primary full" onClick={verifyPrivatePinAndOpen}>Verify & Open</button>
        </Modal>
      )}

      {shareBox.show && (
        <Modal title="Share Channel" onClose={() => setShareBox({ show: false, channel: null, loading: false, users: [], selected: [] })}>
          <div className="td-share-summary">
            <strong>{getChannelName(shareBox.channel)}</strong>
            <small>{buildShareLink(shareBox.channel) || "Share URL not available"}</small>
          </div>
          <div className="td-user-list">
            {shareBox.loading ? (
              <div className="td-empty">Loading users...</div>
            ) : shareBox.users.length === 0 ? (
              <div className="td-empty">No registered users found</div>
            ) : (
              shareBox.users.map((item) => {
                const value = String(getUserId(item) || getEmail(item));
                return (
                  <label className="td-user-item" key={value}>
                    <input type="checkbox" checked={shareBox.selected.includes(value)} onChange={() => toggleShareUser(value)} />
                    <span><strong>{getDisplayName(item)}</strong><small>{getEmail(item) || "No email"}</small></span>
                  </label>
                );
              })
            )}
          </div>
          <button type="button" className="td-primary full" onClick={sendChannelInvitation} disabled={shareBox.selected.length === 0 || loading}>Send Invitation</button>
        </Modal>
      )}

      {linkBoxOpen && (
        <Modal title="Link Requests" onClose={() => setLinkBoxOpen(false)}>
          {acceptedLink && (
            <div className="td-accepted-link">
              <strong>Accepted URL</strong>
              <small>{acceptedLink}</small>
              <div className="td-mini-actions">
                <button type="button" onClick={() => copyText(acceptedLink, "Accepted URL copied")}>Copy URL</button>
                <button type="button" onClick={() => { setJoinInput(acceptedLink); setLinkBoxOpen(false); }}>Fill Join Box</button>
              </div>
            </div>
          )}

          <div className="td-request-list">
            {receivedLoading ? (
              <div className="td-empty">Loading requests...</div>
            ) : receivedLinks.length === 0 ? (
              <div className="td-empty">No pending requests</div>
            ) : (
              receivedLinks.map((item) => {
                const id = String(getInvitationId(item));
                return (
                  <article className="td-request-card" key={id}>
                    <div><strong>{getInvitationChannelName(item)}</strong><small>Shared by {getInvitationSenderName(item)}</small></div>
                    <div className="td-request-actions">
                      <button type="button" className="accept" onClick={() => respondInvitation(item, "accept")}>Accept</button>
                      <button type="button" className="reject" onClick={() => respondInvitation(item, "reject")}>Reject</button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {editChannel && (
        <Modal title="Update Channel" onClose={() => setEditChannel(null)}>
          <form className="td-form" onSubmit={updateChannel}>
            <p className="td-modal-text">PIN change is disabled from channel update.</p>
            <label>Logo Optional</label>
            <input type="file" accept="image/*" onChange={handleEditLogoChange} />
            {editLogoPreview && <button type="button" className="td-preview-btn" onClick={() => openImage(editLogoPreview, "New Channel Logo")}>Preview Logo</button>}
            <label>Channel Name</label>
            <input value={editForm.channel_name} onChange={(e) => setEditForm((p) => ({ ...p, channel_name: e.target.value }))} />
            <label>Description</label>
            <textarea value={editForm.channel_description} onChange={(e) => setEditForm((p) => ({ ...p, channel_description: e.target.value }))} />
            <button type="submit" className="td-primary full">Update Channel</button>
          </form>
        </Modal>
      )}

      {deleteBox.show && (
        <Modal title={deleteBox.mode === "remove_only" ? "Remove Channel" : "Delete Channel"} onClose={() => setDeleteBox({ show: false, channel: null, pin: "", mode: "" })}>
          <p className="td-modal-text">
            {deleteBox.mode === "remove_only"
              ? "This removes the channel only from your dashboard. Original channel remains safe."
              : deleteBox.mode === "owner_public"
              ? "Public channel can be deleted only from the created device."
              : "Private channel delete requires the channel PIN."}
          </p>
          <strong className="td-delete-name">{getChannelName(deleteBox.channel)}</strong>
          {deleteBox.mode === "owner_private" && (
            <input className="td-modal-input" value={deleteBox.pin} type="password" inputMode="numeric" maxLength="8" onChange={(e) => setDeleteBox((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="Private channel PIN" />
          )}
          <button type="button" className="td-danger full" onClick={confirmDeleteOrRemove}>{deleteBox.mode === "remove_only" ? "Remove from Dashboard" : "Delete Channel"}</button>
        </Modal>
      )}

      {imageViewer.show && (
        <div className="td-image-layer" onClick={() => setImageViewer({ show: false, src: "", title: "" })}>
          <div className="td-image-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setImageViewer({ show: false, src: "", title: "" })}>×</button>
            <img src={imageViewer.src} alt={imageViewer.title} />
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`td-toast ${toast.type}`}>
          <b>{toast.type === "success" ? "✓" : "!"}</b>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function ChannelList({ title, empty, channels, user, imageVersion, activeMenuId, setActiveMenuId, onOpen, onImage, onCopy, onShare, onEdit, onDelete }) {
  return (
    <section className="td-channel-section">
      <div className="td-section-head">
        <h3>{title}</h3>
        <span>{channels.length}</span>
      </div>

      <div className="td-channel-list">
        {channels.length === 0 ? (
          <div className="td-empty">{empty}</div>
        ) : (
          channels.map((channel) => {
            const id = getChannelId(channel);
            const menuId = `${title}-${id}`;
            const isOwner = isOwnerChannel(channel, user);
            const logo = withCache(absoluteUrl(getLogoUrlFromChannel(channel)), imageVersion);
            const type = getChannelType(channel);
            const shareLink = buildShareLink(channel);
            const role = channel?.member_role || (isOwner ? "owner" : "member");
            const status = channel?.member_status || "active";
            const created = formatISTDateTime(channel?.created_at || channel?.createdAt);

            return (
              <article className="td-channel-card" key={id}>
                <button type="button" className="td-channel-logo" onClick={() => onImage(logo, `${getChannelName(channel)} Logo`)}>
                  {logo ? <img src={logo} alt="Channel Logo" /> : <span>{getInitial(getChannelName(channel))}</span>}
                </button>

                <div className="td-channel-body">
                  <div className="td-channel-top">
                    <div>
                      <h4 onClick={() => onOpen(channel)}>{getChannelName(channel)}</h4>
                      <div className="td-chip-row">
                        <span className={type === "private" ? "private" : "public"}>{type === "private" ? "🔒 Private" : "Public"}</span>
                        {isOwner && <span>Owner</span>}
                        {!isOwner && <span>{role}</span>}
                        {status !== "active" && <span>{status}</span>}
                      </div>
                    </div>

                    <div className="td-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setActiveMenuId(activeMenuId === menuId ? "" : menuId)}>⋮</button>
                      {activeMenuId === menuId && (
                        <div className="td-menu-panel">
                          <button type="button" onClick={() => onOpen(channel)}>Open Channel</button>
                          <button type="button" onClick={() => onCopy(channel)}>Copy URL</button>
                          <button type="button" onClick={() => onShare(channel)}>Share Channel</button>
                          {isOwner && <button type="button" onClick={() => onEdit(channel)}>Update</button>}
                          <button type="button" className="danger" onClick={() => onDelete(channel)}>{isOwner ? "Delete" : "Remove"}</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {channel?.channel_description && <p>{channel.channel_description}</p>}

                  <div className="td-channel-footer">
                    <small>{created}</small>
                    {shareLink && <button type="button" onClick={() => onCopy(channel)}>Copy</button>}
                  </div>

                  <button type="button" className="td-open-channel" onClick={() => onOpen(channel)}>
                    {type === "private" ? "Open with PIN" : "Open Channel"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="td-modal-layer" onClick={onClose}>
      <div className="td-modal" onClick={(e) => e.stopPropagation()}>
        <div className="td-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const styles = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body,#root{width:100%;min-height:100%;margin:0}body{background:#ecf3ff}button,input,textarea,select{font-family:inherit}button{cursor:pointer}button:disabled{opacity:.62;cursor:not-allowed}.td-page{width:100%;min-height:100dvh;padding:104px 10px 28px;background:radial-gradient(circle at 10% 0%,rgba(37,99,235,.17),transparent 28%),radial-gradient(circle at 100% 0%,rgba(20,184,166,.14),transparent 28%),linear-gradient(180deg,#f8fbff 0%,#eef4fb 100%);font-family:Inter,"Segoe UI",Arial,sans-serif;color:#0f172a}.td-navbar{position:fixed;top:0;left:0;right:0;z-index:80;padding:calc(14px + env(safe-area-inset-top,0px)) 12px 12px;background:linear-gradient(135deg,#0f172a,#1d4ed8 58%,#0891b2);box-shadow:0 18px 44px rgba(15,23,42,.26)}.td-navbar-inner{width:min(880px,100%);margin:0 auto;min-height:58px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px}.td-top-label{display:block;color:rgba(255,255,255,.7);font-size:10px;font-weight:900;letter-spacing:.8px;text-transform:uppercase}.td-navbar h1{margin:2px 0 0;color:white;font-size:20px;font-weight:950;letter-spacing:-.45px}.td-nav-actions{display:flex;gap:8px;align-items:center}.td-link-btn,.td-refresh-btn,.td-logout-btn{border:1px solid rgba(255,255,255,.2);border-radius:12px;color:white;font-weight:950;box-shadow:inset 0 1px 0 rgba(255,255,255,.16);transition:.16s}.td-link-btn,.td-refresh-btn{position:relative;width:39px;height:39px;background:rgba(255,255,255,.14);font-size:17px}.td-link-btn span{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:999px;padding:0 5px;display:grid;place-items:center;background:#ef4444;color:white;font-size:9px}.td-logout-btn{height:39px;padding:0 13px;background:#dc2626;font-size:11.5px}.td-loading{position:fixed;top:88px;left:0;z-index:90;width:100%;height:3px;background:linear-gradient(90deg,#60a5fa,#22d3ee,#86efac);animation:loadmove .8s linear infinite}@keyframes loadmove{from{transform:translateX(-100%)}to{transform:translateX(100%)}}.td-main{width:min(880px,100%);margin:0 auto;display:grid;gap:12px}.td-profile-card,.td-details-card,.td-panel,.td-join-card,.td-create-section,.td-channel-section{border:1px solid rgba(226,232,240,.95);background:rgba(255,255,255,.96);border-radius:24px;box-shadow:0 18px 48px rgba(15,23,42,.085)}.td-profile-card{position:relative;display:grid;grid-template-columns:92px minmax(0,1fr) 38px;align-items:center;gap:14px;padding:15px;background:linear-gradient(135deg,#fff,#f8fbff)}.td-profile-img{width:92px;height:92px;border:0;border-radius:28px;padding:5px;background:linear-gradient(135deg,#2563eb,#06b6d4 60%,#14b8a6);box-shadow:0 18px 34px rgba(37,99,235,.25)}.td-profile-img img,.td-profile-img span{width:100%;height:100%;border-radius:23px;border:4px solid white;display:grid;place-items:center;object-fit:cover;background:#0f172a;color:white;font-size:36px;font-weight:950}.td-profile-text{min-width:0}.td-profile-text h2{margin:0 0 4px;font-size:22px;font-weight:950;letter-spacing:-.55px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.td-profile-text p{margin:2px 0;color:#475569;font-size:13px;font-weight:800;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.td-profile-text .td-username{color:#2563eb}.td-pencil{width:36px;height:36px;border:0;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:17px;font-weight:950}.td-details-card,.td-panel,.td-join-card,.td-create-section,.td-channel-section{padding:13px}.td-card-title-row,.td-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.td-card-title-row h3,.td-join-card h3,.td-create-panel h3,.td-section-head h3,.td-form-head h3{margin:0;color:#0f172a;font-size:15px;font-weight:950}.td-small-outline{border:0;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:950;padding:8px 10px}.td-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.td-detail-grid div{min-width:0;padding:11px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0}.td-detail-grid small{display:block;color:#64748b;font-size:10.5px;font-weight:900;text-transform:uppercase}.td-detail-grid strong{display:block;margin-top:4px;color:#0f172a;font-size:12.5px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.td-form{display:flex;flex-direction:column;gap:9px}.td-form-head{display:flex;justify-content:space-between;align-items:center}.td-form-head button,.td-modal-head button{width:32px;height:32px;border:0;border-radius:11px;background:#fee2e2;color:#dc2626;font-size:20px;font-weight:950}.td-form label{font-size:11.5px;font-weight:950;color:#334155}.td-form input,.td-form textarea,.td-modal-input,.td-join-row input,.td-create-panel input,.td-create-panel textarea{width:100%;border:1px solid #dbe4f0;border-radius:15px;background:#f8fafc;outline:none;color:#0f172a;font-size:13px;font-weight:800;padding:11px 12px;transition:.18s}.td-form textarea,.td-create-panel textarea{min-height:78px;resize:vertical}.td-form input:focus,.td-form textarea:focus,.td-modal-input:focus,.td-join-row input:focus,.td-create-panel input:focus,.td-create-panel textarea:focus{border-color:#2563eb;background:white;box-shadow:0 0 0 4px rgba(37,99,235,.11)}.td-upload-row{display:grid;gap:8px}.td-upload-row button,.td-preview-btn{border:0;border-radius:12px;background:#e0f2fe;color:#0369a1;font-size:12px;font-weight:950;padding:9px}.danger-light{background:#fee2e2!important;color:#dc2626!important}.td-email-verify{padding:10px;border-radius:17px;background:#f8fafc;border:1px solid #dbeafe}.td-email-verify p{margin:0 0 8px;color:#475569;font-size:12px;font-weight:800}.td-otp-row{display:grid;grid-template-columns:112px 1fr 76px;gap:7px;margin-top:7px}.td-otp-row button{border:0;border-radius:12px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:950}.td-otp-row button.ok{background:#dcfce7;color:#15803d}.td-action-row{display:grid;grid-template-columns:1fr 110px;gap:8px}.td-primary,.td-muted,.td-danger{border:0;border-radius:14px;min-height:42px;padding:0 14px;font-size:13px;font-weight:950;transition:.16s}.td-primary{background:linear-gradient(135deg,#2563eb,#06b6d4 70%,#14b8a6);color:white;box-shadow:0 12px 28px rgba(37,99,235,.22)}.td-muted{background:#e2e8f0;color:#475569}.td-danger{background:#dc2626;color:white}.full{width:100%;margin-top:10px}.td-join-card{display:grid;gap:10px}.td-join-card p,.td-create-panel p{margin:2px 0 0;color:#64748b;font-size:12px;font-weight:800}.td-join-row{display:grid;grid-template-columns:1fr 82px;gap:8px}.td-create-toggle{width:100%;border:0;border-radius:18px;min-height:46px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:white;font-size:14px;font-weight:950;box-shadow:0 14px 30px rgba(15,23,42,.18)}.td-create-panel{margin-top:12px;padding:12px;border-radius:20px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:9px}.td-type-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.td-type-tabs button{min-height:43px;border:1px solid #dbeafe;border-radius:15px;background:white;color:#1d4ed8;font-weight:950}.td-type-tabs button.active{background:linear-gradient(135deg,#2563eb,#06b6d4);color:white;border-color:transparent}.td-date-preview{border-radius:14px;background:#eef6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:10px;font-size:12px;font-weight:950}.td-section-head span{min-width:26px;height:26px;border-radius:999px;background:#e0f2fe;color:#0369a1;display:grid;place-items:center;font-size:12px;font-weight:950}.td-channel-list{display:grid;gap:10px}.td-empty{padding:16px;border-radius:16px;background:#f8fafc;border:1px dashed #cbd5e1;color:#64748b;text-align:center;font-size:12.5px;font-weight:900}.td-channel-card{display:grid;grid-template-columns:62px minmax(0,1fr);gap:11px;padding:11px;border-radius:20px;background:#f8fafc;border:1px solid #e2e8f0}.td-channel-logo{width:62px;height:62px;border:0;border-radius:20px;background:linear-gradient(135deg,#2563eb,#14b8a6);padding:4px}.td-channel-logo img,.td-channel-logo span{width:100%;height:100%;border-radius:16px;object-fit:cover;background:#0f172a;color:white;display:grid;place-items:center;font-size:22px;font-weight:950}.td-channel-body{min-width:0}.td-channel-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.td-channel-top h4{margin:0;color:#0f172a;font-size:15px;font-weight:950;letter-spacing:-.25px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}.td-chip-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.td-chip-row span{border-radius:999px;background:#eef2ff;color:#4338ca;font-size:9.5px;font-weight:950;padding:4px 7px}.td-chip-row .public{background:#dcfce7;color:#15803d}.td-chip-row .private{background:#ffedd5;color:#c2410c}.td-menu{position:relative;flex-shrink:0}.td-menu>button{width:32px;height:32px;border:0;border-radius:12px;background:#e2e8f0;color:#334155;font-size:19px;font-weight:950}.td-menu-panel{position:absolute;right:0;top:36px;z-index:20;min-width:154px;padding:7px;border-radius:16px;background:white;border:1px solid #e2e8f0;box-shadow:0 18px 44px rgba(15,23,42,.16)}.td-menu-panel button{width:100%;border:0;border-radius:11px;background:white;color:#0f172a;text-align:left;font-size:12px;font-weight:900;padding:9px}.td-menu-panel button:hover{background:#f1f5f9}.td-menu-panel button.danger{color:#dc2626}.td-channel-body p{margin:8px 0 0;color:#64748b;font-size:12px;font-weight:750;line-height:1.35}.td-channel-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px}.td-channel-footer small{color:#64748b;font-size:10.5px;font-weight:850}.td-channel-footer button{border:0;border-radius:10px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:950;padding:6px 9px}.td-open-channel{width:100%;margin-top:9px;border:0;border-radius:13px;background:#0f172a;color:white;min-height:36px;font-size:12px;font-weight:950}.td-modal-layer,.td-image-layer{position:fixed;inset:0;z-index:120;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:16px}.td-modal{width:min(440px,100%);max-height:88dvh;overflow:auto;background:white;border-radius:24px;padding:14px;box-shadow:0 28px 80px rgba(0,0,0,.35)}.td-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.td-modal-head h3{margin:0;font-size:16px;font-weight:950}.td-modal-text{margin:0 0 10px;color:#64748b;font-size:12.5px;font-weight:800}.td-check-row{display:flex;gap:8px;align-items:center;margin-top:9px;color:#334155;font-size:12px;font-weight:950}.td-share-summary,.td-accepted-link{padding:10px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:10px}.td-share-summary strong,.td-accepted-link strong,.td-delete-name{display:block;color:#0f172a;font-size:13px;font-weight:950}.td-share-summary small,.td-accepted-link small{display:block;margin-top:4px;color:#64748b;font-size:11px;font-weight:750;word-break:break-all}.td-user-list,.td-request-list{display:grid;gap:8px;max-height:310px;overflow:auto}.td-user-item{display:flex;gap:9px;align-items:center;padding:10px;border-radius:15px;background:#f8fafc;border:1px solid #e2e8f0}.td-user-item span{min-width:0}.td-user-item strong,.td-user-item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.td-user-item strong{font-size:12.5px}.td-user-item small{font-size:11px;color:#64748b}.td-request-card{display:flex;justify-content:space-between;gap:9px;align-items:center;padding:11px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0}.td-request-card strong,.td-request-card small{display:block}.td-request-card strong{font-size:13px}.td-request-card small{font-size:11px;color:#64748b;margin-top:3px}.td-request-actions{display:flex;gap:6px}.td-request-actions button,.td-mini-actions button{border:0;border-radius:11px;padding:8px 9px;font-size:11px;font-weight:950}.td-request-actions .accept{background:#dcfce7;color:#15803d}.td-request-actions .reject{background:#fee2e2;color:#dc2626}.td-mini-actions{display:flex;gap:7px;margin-top:8px}.td-mini-actions button{background:#e0f2fe;color:#0369a1}.td-image-box{position:relative;width:min(540px,100%);max-height:88dvh;background:white;border-radius:22px;padding:12px;box-shadow:0 28px 80px rgba(0,0,0,.4)}.td-image-box button{position:absolute;top:-12px;right:-8px;width:36px;height:36px;border:0;border-radius:50%;background:#dc2626;color:white;font-size:22px;font-weight:950}.td-image-box img{display:block;width:100%;max-height:78dvh;object-fit:contain;border-radius:16px;background:#f8fafc}.td-toast{position:fixed;left:50%;top:50%;z-index:200;transform:translate(-50%,-50%);min-width:160px;max-width:290px;border-radius:17px;padding:11px 14px;display:flex;align-items:center;justify-content:center;gap:8px;color:white;box-shadow:0 22px 50px rgba(15,23,42,.28);animation:popin .18s ease}.td-toast.success{background:#16a34a}.td-toast.error{background:#dc2626}.td-toast b{width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.22);display:grid;place-items:center}.td-toast span{font-size:12.5px;font-weight:950;text-align:center}.td-login-required{display:grid;place-items:center;padding:20px}.td-login-card{width:min(360px,100%);border-radius:26px;padding:22px;background:white;box-shadow:0 24px 70px rgba(15,23,42,.18);text-align:center}.td-brand-dot{width:62px;height:62px;border-radius:20px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:white;margin:0 auto 12px;display:grid;place-items:center;font-size:28px}.td-login-card h2{margin:0 0 6px}.td-login-card p{margin:0 0 14px;color:#64748b}.td-login-card button{border:0;border-radius:15px;background:#2563eb;color:white;min-height:42px;padding:0 16px;font-weight:950}@keyframes popin{from{opacity:0;transform:translate(-50%,-50%) scale(.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}button:active:not(:disabled){transform:scale(.97)}@media(max-width:560px){.td-page{padding:96px 8px 22px}.td-navbar-inner{min-height:52px;align-items:center}.td-navbar h1{font-size:17px}.td-link-btn,.td-refresh-btn{width:36px;height:36px}.td-logout-btn{height:36px;padding:0 10px}.td-profile-card{grid-template-columns:78px minmax(0,1fr) 34px;border-radius:22px;padding:12px;gap:11px}.td-profile-img{width:78px;height:78px;border-radius:24px}.td-profile-img img,.td-profile-img span{border-radius:19px;font-size:31px}.td-profile-text h2{font-size:19px}.td-profile-text p{font-size:12px}.td-detail-grid{grid-template-columns:1fr}.td-join-row{grid-template-columns:1fr}.td-action-row{grid-template-columns:1fr}.td-channel-card{grid-template-columns:54px minmax(0,1fr);padding:10px}.td-channel-logo{width:54px;height:54px;border-radius:18px}.td-channel-top h4{font-size:14px}.td-channel-footer{align-items:flex-start;flex-direction:column}.td-otp-row{grid-template-columns:1fr}.td-request-card{align-items:flex-start;flex-direction:column}.td-request-actions{width:100%}.td-request-actions button{flex:1}.td-modal-layer,.td-image-layer{padding:10px}.td-modal{border-radius:22px;padding:12px}}
`;
