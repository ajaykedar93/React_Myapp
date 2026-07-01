import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = (
  import.meta.env.VITE_TELEGRAM_API_BASE_URL ||
  "https://express-backend-myapp.onrender.com"
).replace(/\/$/, "");

const API = {
  me: `${BASE_URL}/api/telegram-users/me`,
  users: `${BASE_URL}/api/telegram-users`,
  usersAlt: `${BASE_URL}/api/telegram-users/all`,
  sendCode: `${BASE_URL}/api/telegram-users/send-code`,
  verifyCode: `${BASE_URL}/api/telegram-users/verify-code`,
  updateUser: (id) => `${BASE_URL}/api/telegram-users/${id}`,

  myChannels: `${BASE_URL}/api/telegramlogin-channels/my-channels`,
  createChannel: `${BASE_URL}/api/telegramlogin-channels/create`,
  updateChannel: (id) => `${BASE_URL}/api/telegramlogin-channels/${id}`,
  deleteChannel: (id) => `${BASE_URL}/api/telegramlogin-channels/${id}`,
  joinChannel: (shareCode) =>
    `${BASE_URL}/api/telegramlogin-channels/join/${shareCode}`,
  verifyPrivatePin: (id) =>
    `${BASE_URL}/api/telegramlogin-channels/${id}/verify-pin`,
  openPrivateChannel: (id) =>
    `${BASE_URL}/api/telegramlogin-channels/${id}/open`,
  sendChannelLink: `${BASE_URL}/api/telegramlogin-channels/send-link`,
  sendChannelLinkAlt: `${BASE_URL}/api/telegramlogin-channels/share-link`,
  receivedLinks: `${BASE_URL}/api/telegramlogin-channels/received-links`,
  receivedLinksAlt: `${BASE_URL}/api/telegramlogin-channel-links/received`,
  respondReceivedLink: (id) =>
    `${BASE_URL}/api/telegramlogin-channels/received-links/${id}`,
  respondReceivedLinkAlt: (id) =>
    `${BASE_URL}/api/telegramlogin-channel-links/${id}/respond`,
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
  let id = localStorage.getItem("telegram_device_id");

  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem("telegram_device_id", id);
  }

  return id;
}

function getInitialLetter(value) {
  return String(value || "U").trim().charAt(0).toUpperCase() || "U";
}

function getUserId(user) {
  return user?.telegram_user_id || user?.user_id || user?.id || user?._id || "";
}

function getChannelId(channel) {
  return channel?.channel_id || channel?.id || channel?._id || "";
}

function getShareCode(channel) {
  return (
    channel?.share_code ||
    channel?.shareCode ||
    channel?.channel_share_code ||
    channel?.invite_code ||
    channel?.join_code ||
    ""
  );
}

function getChannelCreatedAt(channel) {
  return (
    channel?.created_at ||
    channel?.createdAt ||
    channel?.created_on ||
    channel?.createdDate ||
    channel?.created_date ||
    ""
  );
}

function getShareCodeFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const joinIndex = parts.indexOf("join");
  return joinIndex >= 0 && parts[joinIndex + 1] ? parts[joinIndex + 1] : "";
}

function mediaUrl(url) {
  if (!url) return "";
  if (/^(https?:\/\/|blob:|data:)/i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function withCacheBuster(url, version) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function extractShareCode(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  try {
    const parsed = new URL(text);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const joinIndex = parts.indexOf("join");

    if (joinIndex >= 0 && parts[joinIndex + 1]) {
      return parts[joinIndex + 1];
    }

    return parts[parts.length - 1] || text;
  } catch {
    const parts = text.split("/").filter(Boolean);
    return parts[parts.length - 1] || text;
  }
}

function formatDateTimeIST(value) {
  if (!value) {
    return { date: "Date not available", time: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "Date not available", time: "" };
  }

  return {
    date: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }),
    time: date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }),
  };
}

function getUserDisplayName(value) {
  return (
    value?.full_name ||
    value?.name ||
    value?.user_name ||
    value?.username ||
    value?.email ||
    value?.email_address ||
    "User"
  );
}

function getUserEmail(value) {
  return value?.email || value?.email_address || "";
}

function isChannelOwner(channel, user) {
  const currentUserId = String(getUserId(user));
  const ownerId = String(
    channel?.created_by ||
      channel?.createdBy ||
      channel?.owner_id ||
      channel?.ownerId ||
      channel?.telegram_user_id ||
      channel?.user_id ||
      channel?.userId ||
      channel?.created_by_user_id ||
      ""
  );

  const currentEmail = cleanEmail(user?.email || user?.email_address || "");
  const ownerEmail = cleanEmail(
    channel?.owner_email ||
      channel?.ownerEmail ||
      channel?.created_by_email ||
      channel?.createdByEmail ||
      channel?.email ||
      ""
  );

  if (currentUserId && ownerId && currentUserId === ownerId) return true;
  if (currentEmail && ownerEmail && currentEmail === ownerEmail) return true;
  if (channel?.is_owner === true || channel?.isOwner === true) return true;

  return false;
}

function buildShareLink(channel) {
  const shareCode = getShareCode(channel);
  return shareCode ? `${window.location.origin}/channel/join/${shareCode}` : "";
}

function getInvitationId(invitation) {
  return (
    invitation?.invitation_id ||
    invitation?.invite_id ||
    invitation?.link_id ||
    invitation?.id ||
    invitation?._id ||
    ""
  );
}

function getInvitationShareValue(invitation) {
  return (
    invitation?.share_link ||
    invitation?.join_link ||
    invitation?.link ||
    invitation?.share_code ||
    invitation?.shareCode ||
    invitation?.channel?.share_code ||
    invitation?.channel?.shareCode ||
    ""
  );
}

function getInvitationChannelName(invitation) {
  return (
    invitation?.channel_name ||
    invitation?.channelName ||
    invitation?.channel?.channel_name ||
    invitation?.channel?.name ||
    "Channel"
  );
}

function getInvitationSenderName(invitation) {
  return (
    invitation?.sender_name ||
    invitation?.senderName ||
    invitation?.from_name ||
    invitation?.fromName ||
    invitation?.sender?.full_name ||
    invitation?.sender?.name ||
    "A registered user"
  );
}

function canUserShareChannel(channel, isOwner) {
  return (
    isOwner ||
    channel?.can_share === true ||
    channel?.canShare === true ||
    channel?.permissions?.share === true
  );
}

export default function Telegram_Dashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    mobile_no: "",
    email: "",
    password: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileImageInstantSrc, setProfileImageInstantSrc] = useState("");
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [profileEmailCode, setProfileEmailCode] = useState("");
  const [profileEmailOtpSent, setProfileEmailOtpSent] = useState(false);
  const [profileEmailVerified, setProfileEmailVerified] = useState(false);

  const [joinInput, setJoinInput] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [channelLogo, setChannelLogo] = useState(null);
  const [channelForm, setChannelForm] = useState({
    channel_name: "",
    channel_description: "",
    channel_type: "public",
    security_pin: "",
  });

  const [editChannel, setEditChannel] = useState(null);
  const [editLogo, setEditLogo] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState("");
  const [channelLogoInstantMap, setChannelLogoInstantMap] = useState({});
  const [editForm, setEditForm] = useState({
    channel_name: "",
    channel_description: "",
    channel_type: "public",
    security_pin: "",
  });

  const [resetPinChannel, setResetPinChannel] = useState(null);
  const [resetPinValue, setResetPinValue] = useState("");

  const [confirmBox, setConfirmBox] = useState({
    show: false,
    channel: null,
    privatePin: "",
  });

  const [imageViewer, setImageViewer] = useState({
    show: false,
    src: "",
    title: "",
  });

  const [activeMenuId, setActiveMenuId] = useState("");
  const [privateOpenBox, setPrivateOpenBox] = useState({
    show: false,
    channel: null,
    pin: "",
  });

  const [sharedLinkAccess, setSharedLinkAccess] = useState({
    enabled: false,
    shareCode: "",
    channelId: "",
  });

  const [sendLinkBox, setSendLinkBox] = useState({
    show: false,
    channel: null,
    loadingUsers: false,
    users: [],
    selectedIds: [],
  });

  const [receivedLinksOpen, setReceivedLinksOpen] = useState(false);
  const [receivedLinksLoading, setReceivedLinksLoading] = useState(false);
  const [receivedLinks, setReceivedLinks] = useState([]);

  const currentUserEmail = cleanEmail(user?.email || user?.email_address || "");
  const typedProfileEmail = cleanEmail(profileForm.email);
  const profileEmailChanged =
    Boolean(currentUserEmail) &&
    Boolean(typedProfileEmail) &&
    typedProfileEmail !== currentUserEmail;

  const profileImageSrc =
    profileImagePreview ||
    profileImageInstantSrc ||
    withCacheBuster(
      mediaUrl(user?.profile_image_url || user?.profile_image),
      imageVersion
    );

  const visibleChannels = sharedLinkAccess.enabled
    ? channels.filter((channel) => {
        const id = getChannelId(channel);
        const code = getShareCode(channel);

        return (
          (sharedLinkAccess.channelId && id === sharedLinkAccess.channelId) ||
          (sharedLinkAccess.shareCode && code === sharedLinkAccess.shareCode)
        );
      })
    : channels;

  const publicChannels = visibleChannels.filter(
    (channel) => channel.channel_type === "public"
  );
  const privateChannels = sharedLinkAccess.enabled
    ? []
    : visibleChannels.filter((channel) => channel.channel_type === "private");

  const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "x-device-id": deviceId,
    ...extra,
  });

  const showPopup = (message, type = "success") => {
    setToast({ show: true, type, message });

    window.setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1900);
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || "Something went wrong");
    }

    return data;
  };

  const fillProfileForm = (currentUser) => {
    setProfileForm({
      full_name: currentUser?.full_name || "",
      mobile_no: currentUser?.mobile_no || "",
      email: currentUser?.email || currentUser?.email_address || "",
      password: "",
    });
    setProfileEmailCode("");
    setProfileEmailOtpSent(false);
    setProfileEmailVerified(false);
  };

  const refreshChannels = async () => {
    const data = await requestJson(API.myChannels, {
      headers: authHeaders(),
    });

    const nextChannels = data?.channels || [];
    setChannels(nextChannels);
    return nextChannels;
  };

  const joinChannelByShareCode = async (shareValue, showMessage = true) => {
    const shareCode = extractShareCode(shareValue);

    if (!shareCode) {
      showPopup("Enter share link or code", "error");
      return [];
    }

    await requestJson(API.joinChannel(shareCode), {
      method: "POST",
      headers: authHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ device_id: deviceId, access_mode: "view_only" }),
    });

    const nextChannels = await refreshChannels();

    if (showMessage) {
      showPopup("Channel joined successfully");
    }

    return nextChannels;
  };

  const loadDashboard = async () => {
    if (!token) {
      showPopup("Please login first", "error");
      return;
    }

    try {
      setLoading(true);

      const [meData, channelData] = await Promise.all([
        requestJson(API.me, {
          headers: authHeaders(),
        }),
        requestJson(API.myChannels, {
          headers: authHeaders(),
        }),
      ]);

      const currentUser = meData?.user || null;
      let nextChannels = channelData?.channels || [];
      const pathShareCode = getShareCodeFromPath();

      setUser(currentUser);
      fillProfileForm(currentUser);

      if (pathShareCode) {
        try {
          await requestJson(API.joinChannel(pathShareCode), {
            method: "POST",
            headers: authHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({
              device_id: deviceId,
              access_mode: "view_only",
              joined_from: "shared_link",
            }),
          });

          const refreshedData = await requestJson(API.myChannels, {
            headers: authHeaders(),
          });

          nextChannels = refreshedData?.channels || nextChannels;
        } catch (error) {
          showPopup(error.message, "error");
        }

        const joinedChannel =
          nextChannels.find((channel) => getShareCode(channel) === pathShareCode) ||
          nextChannels.find((channel) => channel.channel_type === "public") ||
          null;

        setSharedLinkAccess({
          enabled: true,
          shareCode: pathShareCode,
          channelId: joinedChannel ? getChannelId(joinedChannel) : "",
        });
      } else {
        setSharedLinkAccess({
          enabled: false,
          shareCode: "",
          channelId: "",
        });
        loadReceivedLinks(false);
      }

      setChannels(nextChannels);
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  useEffect(() => {
    return () => {
      if (editLogoPreview) {
        URL.revokeObjectURL(editLogoPreview);
      }
    };
  }, [editLogoPreview]);

  const logout = () => {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    navigate("/telegram-login", { replace: true });
  };

  const resetEmailVerifyState = () => {
    setProfileEmailCode("");
    setProfileEmailOtpSent(false);
    setProfileEmailVerified(false);
  };

  const openImageViewer = (src, title = "Image") => {
    if (!src) return;
    setImageViewer({ show: true, src, title });
  };

  const closeImageViewer = () => {
    setImageViewer({ show: false, src: "", title: "" });
  };

  const sendUpdateEmailOtp = async () => {
    const email = cleanEmail(profileForm.email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
      showPopup("Enter valid email", "error");
      return;
    }

    if (!profileEmailChanged) {
      showPopup("Email is already same");
      return;
    }

    try {
      setLoading(true);

      await requestJson(API.sendCode, {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ email }),
      });

      setProfileEmailOtpSent(true);
      setProfileEmailVerified(false);
      showPopup("OTP sent to new email");
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyUpdateEmailOtp = async () => {
    const email = cleanEmail(profileForm.email);
    const code = String(profileEmailCode || "").replace(/\D/g, "").slice(0, 6);

    if (!/^\d{6}$/.test(code)) {
      showPopup("Enter valid 6 digit OTP", "error");
      return;
    }

    try {
      setLoading(true);

      await requestJson(API.verifyCode, {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ email, code }),
      });

      setProfileEmailVerified(true);
      showPopup("Email verified successfully");
    } catch (error) {
      setProfileEmailVerified(false);
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();

    const userId = getUserId(user);
    const fullName = String(profileForm.full_name || "").trim();
    const mobileNo = String(profileForm.mobile_no || "").trim();
    const email = cleanEmail(profileForm.email);
    const password = String(profileForm.password || "");

    if (!userId) {
      showPopup("User not found", "error");
      return;
    }

    if (fullName.length < 3) {
      showPopup("Enter valid name", "error");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobileNo)) {
      showPopup("Enter valid mobile number", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
      showPopup("Enter valid email", "error");
      return;
    }

    if (password && password.length < 6) {
      showPopup("Password must be 6 characters", "error");
      return;
    }

    if (profileEmailChanged && !profileEmailVerified) {
      showPopup("Verify new email first", "error");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("mobile_no", mobileNo);
      formData.append("email", email);

      if (password) {
        formData.append("password", password);
      }

      if (profileImage) {
        formData.append("profile_image", profileImage);
      }

      const data = await requestJson(API.updateUser(userId), {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      const updatedUser =
        data?.user || { ...user, full_name: fullName, mobile_no: mobileNo, email };

      setUser(updatedUser);
      setImageVersion(Date.now());
      if (profileImage) {
        setProfileImageInstantSrc(URL.createObjectURL(profileImage));
      }
      setProfileImage(null);
      setProfileImagePreview("");
      setProfileOpen(false);
      fillProfileForm(updatedUser);
      showPopup("Profile updated successfully");
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setProfileImage(file);
    setProfileImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const joinSharedChannel = async (shareValue, showMessage = true) => {
    const shareCode = extractShareCode(shareValue);

    if (!shareCode) {
      showPopup("Enter share link or code", "error");
      return;
    }

    try {
      setLoading(true);
      await joinChannelByShareCode(shareCode, showMessage);
      setJoinInput("");
    } catch (error) {
      if (showMessage) showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async (channel) => {
    const link = buildShareLink(channel);

    if (!link) {
      showPopup("Share code not available", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      showPopup("Share link copied");
    } catch {
      showPopup("Copy failed", "error");
    }
  };

  const createChannel = async (event) => {
    event.preventDefault();

    const name = String(channelForm.channel_name || "").trim();
    const description = String(channelForm.channel_description || "").trim();
    const pin = String(channelForm.security_pin || "").trim();

    if (name.length < 3) {
      showPopup("Enter channel name", "error");
      return;
    }

    if (channelForm.channel_type === "private" && !/^\d{4,8}$/.test(pin)) {
      showPopup("Private channel needs 4-8 digit PIN", "error");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("channel_name", name);
      formData.append("channel_description", description);
      formData.append("channel_type", channelForm.channel_type);
      formData.append("device_id", deviceId);

      if (pin) {
        formData.append("security_pin", pin);
      }

      if (channelLogo) {
        formData.append("channel_logo", channelLogo);
      }

      await requestJson(API.createChannel, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      setChannelForm({
        channel_name: "",
        channel_description: "",
        channel_type: "public",
        security_pin: "",
      });
      setChannelLogo(null);
      setCreateOpen(false);
      showPopup("Channel created successfully");
      await refreshChannels();
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditChannel = (channel) => {
    setActiveMenuId("");
    setEditChannel(channel);
    setEditForm({
      channel_name: channel?.channel_name || "",
      channel_description: channel?.channel_description || "",
      channel_type: channel?.channel_type || "public",
      security_pin: "",
    });
    setEditLogo(null);
    if (editLogoPreview) {
      URL.revokeObjectURL(editLogoPreview);
    }
    setEditLogoPreview("");
  };

  const updateChannel = async (event) => {
    event.preventDefault();

    const channelId = getChannelId(editChannel);
    const name = String(editForm.channel_name || "").trim();
    const description = String(editForm.channel_description || "").trim();
    const pin = String(editForm.security_pin || "").trim();

    if (!channelId) {
      showPopup("Channel not found", "error");
      return;
    }

    if (name.length < 3) {
      showPopup("Enter channel name", "error");
      return;
    }

    if (editForm.channel_type === "private" && pin && !/^\d{4,8}$/.test(pin)) {
      showPopup("PIN must be 4-8 digits", "error");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("channel_name", name);
      formData.append("channel_description", description);
      formData.append("channel_type", editForm.channel_type);

      if (pin) {
        formData.append("security_pin", pin);
      }

      if (editLogo) {
        formData.append("channel_logo", editLogo);
      }

      const data = await requestJson(API.updateChannel(channelId), {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      const updatedChannel = data?.channel || data?.data || null;
      const instantLogo = editLogo ? URL.createObjectURL(editLogo) : "";

      setChannels((prev) =>
        prev.map((channel) => {
          if (getChannelId(channel) !== channelId) return channel;

          return {
            ...channel,
            ...(updatedChannel || {}),
            channel_name: updatedChannel?.channel_name || name,
            channel_description:
              updatedChannel?.channel_description || description,
            channel_type: updatedChannel?.channel_type || editForm.channel_type,
            ...(instantLogo
              ? { channel_logo_url: instantLogo, channel_logo: instantLogo }
              : {}),
          };
        })
      );

      if (instantLogo) {
        setChannelLogoInstantMap((prev) => ({
          ...prev,
          [channelId]: instantLogo,
        }));
      }

      setEditChannel(null);
      setEditLogo(null);
      setEditLogoPreview("");
      setImageVersion(Date.now());
      showPopup("Channel updated successfully");
      refreshChannels().catch(() => null);
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetPin = async (event) => {
    event.preventDefault();

    const channelId = getChannelId(resetPinChannel);

    if (!channelId) {
      showPopup("Channel not found", "error");
      return;
    }

    if (!/^\d{4,8}$/.test(resetPinValue)) {
      showPopup("PIN must be 4-8 digits", "error");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("security_pin", resetPinValue);

      await requestJson(API.updateChannel(channelId), {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      setResetPinChannel(null);
      setResetPinValue("");
      showPopup("PIN reset successfully");
      await refreshChannels();
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const askDeleteChannel = (channel) => {
    setActiveMenuId("");
    setConfirmBox({ show: true, channel, privatePin: "" });
  };

  const closeDeleteBox = () => {
    setConfirmBox({ show: false, channel: null, privatePin: "" });
  };

  const confirmDeleteChannel = async () => {
    const channel = confirmBox.channel;
    const channelId = getChannelId(channel);

    if (!channelId) {
      showPopup("Channel not found", "error");
      return;
    }

    const body = { device_id: deviceId };

    if (channel?.channel_type === "private") {
      if (!confirmBox.privatePin) {
        showPopup("Enter private channel PIN", "error");
        return;
      }

      body.security_pin = confirmBox.privatePin;
    }

    try {
      setLoading(true);

      await requestJson(API.deleteChannel(channelId), {
        method: "DELETE",
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });

      closeDeleteBox();
      showPopup("Channel deleted successfully");
      await refreshChannels();
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const requestOpenChannel = (channel) => {
    setActiveMenuId("");

    if (channel?.channel_type === "private") {
      setPrivateOpenBox({ show: true, channel, pin: "" });
      return;
    }

    openChannelScreen(channel, "");
  };

  const openChannelScreen = (channel, pinValue = "") => {
    const channelId = getChannelId(channel);

    if (!channelId) {
      showPopup("Channel not found", "error");
      return;
    }

    const isViewOnly =
      sharedLinkAccess.enabled ||
      channel?.access_mode === "view_only" ||
      channel?.accessMode === "view_only" ||
      channel?.joined_via_link === true ||
      channel?.joinedViaLink === true;

    navigate(`/telegram-channel/${channelId}`, {
      state: {
        channel,
        channel_id: channelId,
        channelId,
        share_code: getShareCode(channel),
        private_pin: pinValue,
        access_mode: isViewOnly ? "view_only" : "full_access",
        viewOnly: isViewOnly,
        readOnly: isViewOnly,
        opened_from: sharedLinkAccess.enabled ? "shared_link" : "dashboard",
      },
    });
  };

  const confirmOpenPrivateChannel = async () => {
    const pin = String(privateOpenBox.pin || "").trim();
    const channel = privateOpenBox.channel;
    const channelId = getChannelId(channel);

    if (!/^\d{4,8}$/.test(pin)) {
      showPopup("Enter correct 4-8 digit PIN", "error");
      return;
    }

    if (!channelId) {
      showPopup("Channel not found", "error");
      return;
    }

    try {
      setLoading(true);

      if (channel?.security_pin || channel?.pin) {
        const savedPin = String(channel?.security_pin || channel?.pin || "");
        if (savedPin !== pin) {
          throw new Error("Incorrect PIN");
        }
      } else {
        try {
          await requestJson(API.verifyPrivatePin(channelId), {
            method: "POST",
            headers: authHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({
              security_pin: pin,
              pin,
              device_id: deviceId,
            }),
          });
        } catch {
          await requestJson(API.openPrivateChannel(channelId), {
            method: "POST",
            headers: authHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({
              security_pin: pin,
              pin,
              device_id: deviceId,
            }),
          });
        }
      }

      setPrivateOpenBox({ show: false, channel: null, pin: "" });
      openChannelScreen(channel, pin);
    } catch (error) {
      showPopup(error.message || "Incorrect PIN", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadRegisteredUsers = async () => {
    setSendLinkBox((prev) => ({ ...prev, loadingUsers: true }));

    try {
      let data = null;

      try {
        data = await requestJson(API.users, {
          headers: authHeaders(),
        });
      } catch {
        data = await requestJson(API.usersAlt, {
          headers: authHeaders(),
        });
      }

      const list =
        data?.users ||
        data?.data ||
        data?.telegramUsers ||
        data?.registered_users ||
        [];

      const currentId = String(getUserId(user));
      const currentEmail = cleanEmail(user?.email || user?.email_address || "");

      const filteredUsers = list.filter((item) => {
        const id = String(getUserId(item));
        const email = cleanEmail(getUserEmail(item));

        if (currentId && id && currentId === id) return false;
        if (currentEmail && email && currentEmail === email) return false;
        return true;
      });

      setSendLinkBox((prev) => ({
        ...prev,
        loadingUsers: false,
        users: filteredUsers,
      }));
    } catch (error) {
      setSendLinkBox((prev) => ({ ...prev, loadingUsers: false, users: [] }));
      showPopup("Registered users list API not available", "error");
    }
  };

  const openSendLinkModal = async (channel) => {
    setActiveMenuId("");
    setSendLinkBox({
      show: true,
      channel,
      loadingUsers: true,
      users: [],
      selectedIds: [],
    });

    await loadRegisteredUsers();
  };

  const closeSendLinkModal = () => {
    setSendLinkBox({
      show: false,
      channel: null,
      loadingUsers: false,
      users: [],
      selectedIds: [],
    });
  };

  const toggleSendUser = (value) => {
    setSendLinkBox((prev) => {
      const exists = prev.selectedIds.includes(value);
      return {
        ...prev,
        selectedIds: exists
          ? prev.selectedIds.filter((item) => item !== value)
          : [...prev.selectedIds, value],
      };
    });
  };

  const loadReceivedLinks = async (showErrors = true) => {
    if (sharedLinkAccess.enabled) return;

    setReceivedLinksLoading(true);

    try {
      let data = null;

      try {
        data = await requestJson(API.receivedLinks, {
          headers: authHeaders(),
        });
      } catch {
        data = await requestJson(API.receivedLinksAlt, {
          headers: authHeaders(),
        });
      }

      const list =
        data?.links ||
        data?.invitations ||
        data?.received_links ||
        data?.receivedLinks ||
        data?.data ||
        [];

      setReceivedLinks(
        list.filter((item) => {
          const status = String(item?.status || item?.invite_status || "pending")
            .toLowerCase()
            .trim();
          return !["accepted", "rejected", "declined", "deleted"].includes(status);
        })
      );
    } catch (error) {
      setReceivedLinks([]);
      if (showErrors) {
        showPopup("Received Links API not available", "error");
      }
    } finally {
      setReceivedLinksLoading(false);
    }
  };

  const removeReceivedInvite = (invitation) => {
    const id = String(getInvitationId(invitation));
    setReceivedLinks((prev) =>
      prev.filter((item) => String(getInvitationId(item)) !== id)
    );
  };

  const respondToReceivedLink = async (invitation, action) => {
    const invitationId = getInvitationId(invitation);
    const shareValue = getInvitationShareValue(invitation);

    try {
      setLoading(true);

      if (invitationId) {
        const body = {
          action,
          status: action === "accept" ? "accepted" : "rejected",
          invitation_id: invitationId,
        };

        try {
          await requestJson(API.respondReceivedLink(invitationId), {
            method: "POST",
            headers: authHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(body),
          });
        } catch {
          await requestJson(API.respondReceivedLinkAlt(invitationId), {
            method: "POST",
            headers: authHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(body),
          });
        }
      }

      if (action === "accept") {
        if (!shareValue) {
          throw new Error("Invitation link not available");
        }

        await joinChannelByShareCode(shareValue, false);
        showPopup("Invitation accepted");
      } else {
        showPopup("Invitation rejected");
      }

      removeReceivedInvite(invitation);
    } catch (error) {
      if (action === "reject") {
        removeReceivedInvite(invitation);
        showPopup("Invitation removed locally");
      } else {
        showPopup(error.message || "Action failed", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditLogoChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (editLogoPreview) {
      URL.revokeObjectURL(editLogoPreview);
    }

    setEditLogo(file);
    setEditLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const sendChannelLinkToUsers = async () => {
    const channel = sendLinkBox.channel;
    const link = buildShareLink(channel);

    if (!channel || !link) {
      showPopup("Share link not available", "error");
      return;
    }

    if (sendLinkBox.selectedIds.length === 0) {
      showPopup("Select at least one user", "error");
      return;
    }

    const selectedUsers = sendLinkBox.users.filter((item) =>
      sendLinkBox.selectedIds.includes(String(getUserId(item) || getUserEmail(item)))
    );

    const body = {
      channel_id: getChannelId(channel),
      channel_name: channel?.channel_name,
      share_code: getShareCode(channel),
      share_link: link,
      receiver_ids: selectedUsers.map((item) => getUserId(item)).filter(Boolean),
      receiver_emails: selectedUsers.map((item) => getUserEmail(item)).filter(Boolean),
    };

    try {
      setLoading(true);

      try {
        await requestJson(API.sendChannelLink, {
          method: "POST",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(body),
        });
      } catch {
        await requestJson(API.sendChannelLinkAlt, {
          method: "POST",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(body),
        });
      }

      closeSendLinkModal();
      showPopup("Channel link sent successfully");
    } catch (error) {
      showPopup(
        error.message || "Send Link API required for registered-user invitations",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="td-page td-login-page">
        <style>{styles}</style>

        <nav className="td-navbar">
          <div className="td-navbar-inner">
            <h1>Notes Dashboard</h1>
            <button className="td-logout-btn" onClick={() => navigate("/telegram-login")}>
              Login
            </button>
          </div>
        </nav>

        <main className="td-main">
          <div className="td-login-card">
            <h2>Login Required</h2>
            <button onClick={() => navigate("/telegram-login")}>Go Login</button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="td-page" onClick={() => activeMenuId && setActiveMenuId("")}>
      <style>{styles}</style>

      <nav className="td-navbar">
        <div className="td-navbar-inner">
          <h1>{sharedLinkAccess.enabled ? "Shared Channel" : "Notes Dashboard"}</h1>

          <div className="td-navbar-actions">
            {!sharedLinkAccess.enabled && (
              <>
                <button
                  className="td-received-btn"
                  type="button"
                  title="Received Links"
                  onClick={() => {
                    setReceivedLinksOpen(true);
                    loadReceivedLinks(true);
                  }}
                >
                  🔗
                  {receivedLinks.length > 0 && (
                    <span>{receivedLinks.length}</span>
                  )}
                </button>

                <button
                  className="td-refresh-btn"
                  type="button"
                  title="Refresh"
                  onClick={loadDashboard}
                  disabled={loading}
                >
                  ↻
                </button>
              </>
            )}

            <button className="td-logout-btn" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {loading && <div className="td-loading-line" />}

      <main className="td-main">
        <section className="td-profile-hero">
          <button
            type="button"
            className="td-big-avatar-ring td-image-click"
            onClick={() =>
              openImageViewer(
                profileImageSrc,
                `${user?.full_name || "User"} Profile Image`
              )
            }
            title="Open profile image"
          >
            {profileImageSrc ? (
              <img className="td-big-avatar" src={profileImageSrc} alt="Profile" />
            ) : (
              <div className="td-big-avatar-placeholder">
                {getInitialLetter(user?.full_name)}
              </div>
            )}
          </button>

          <div className="td-profile-hero-text">
            <h2>{user?.full_name || "User"}</h2>
            <p>{user?.email || user?.email_address || "Email not available"}</p>
            {sharedLinkAccess.enabled && (
              <span className="td-view-only-badge">View-only shared link access</span>
            )}
          </div>
        </section>

        {!sharedLinkAccess.enabled && (
          <>
            <section className="td-details-card">
              <div className="td-details-head">
                <h3>Profile Details</h3>
                <button
                  type="button"
                  className="td-icon-update-btn"
                  onClick={() => {
                    fillProfileForm(user);
                    setProfileOpen((value) => !value);
                  }}
                >
                  ✎ Update
                </button>
              </div>

              <div className="td-details-grid">
                <div>
                  <small>Name</small>
                  <strong>{user?.full_name || "User"}</strong>
                </div>

                <div>
                  <small>Mobile</small>
                  <strong>{user?.mobile_no || "Not available"}</strong>
                </div>

                <div>
                  <small>Email</small>
                  <strong>{user?.email || user?.email_address || "Not available"}</strong>
                </div>

                <div>
                  <small>Device ID</small>
                  <strong title={deviceId}>{deviceId}</strong>
                </div>
              </div>
            </section>

            {profileOpen && (
              <section className="td-mini-panel">
                <form className="td-form" onSubmit={updateProfile}>
                  <input
                    value={profileForm.full_name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        full_name: event.target.value,
                      }))
                    }
                    placeholder="Full name"
                  />

                  <input
                    value={profileForm.mobile_no}
                    maxLength="10"
                    inputMode="numeric"
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        mobile_no: event.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    placeholder="Mobile number"
                  />

                  <input
                    value={profileForm.email}
                    inputMode="email"
                    onChange={(event) => {
                      setProfileForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }));
                      resetEmailVerifyState();
                    }}
                    placeholder="Email address"
                  />

                  {profileEmailChanged && (
                    <div className="td-email-verify-box">
                      <div className="td-email-verify-row">
                        <button
                          type="button"
                          className="td-light-btn"
                          onClick={sendUpdateEmailOtp}
                          disabled={loading}
                        >
                          {profileEmailOtpSent ? "Resend OTP" : "Send OTP"}
                        </button>

                        <input
                          value={profileEmailCode}
                          maxLength="6"
                          inputMode="numeric"
                          onChange={(event) =>
                            setProfileEmailCode(
                              event.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          placeholder="6 digit OTP"
                        />

                        <button
                          type="button"
                          className={
                            profileEmailVerified ? "td-verified-btn" : "td-primary-btn"
                          }
                          onClick={verifyUpdateEmailOtp}
                          disabled={loading || profileEmailVerified}
                        >
                          {profileEmailVerified ? "Verified" : "Verify"}
                        </button>
                      </div>

                      <p>New email update needs OTP verification.</p>
                    </div>
                  )}

                  <input
                    value={profileForm.password}
                    type="password"
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    placeholder="New password optional"
                  />

                  <input type="file" accept="image/*" onChange={handleProfileImageChange} />

                  {profileImagePreview && (
                    <button
                      type="button"
                      className="td-preview-row"
                      onClick={() => openImageViewer(profileImagePreview, "New profile image")}
                    >
                      <img src={profileImagePreview} alt="Profile preview" />
                      <span>Preview selected profile image</span>
                    </button>
                  )}

                  <div className="td-btn-row">
                    <button className="td-primary-btn" type="submit" disabled={loading}>
                      Save Profile
                    </button>
                    <button
                      className="td-light-btn"
                      type="button"
                      onClick={() => setProfileOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="td-join-card">
              <h3>Join Channel</h3>
              <div className="td-join-row">
                <input
                  value={joinInput}
                  onChange={(event) => setJoinInput(event.target.value)}
                  placeholder="Paste public channel link or share code"
                />
                <button
                  type="button"
                  className="td-primary-btn"
                  onClick={() => joinSharedChannel(joinInput)}
                  disabled={loading}
                >
                  Join
                </button>
              </div>
            </section>

            <div className="td-create-wrap">
              <button
                className="td-create-btn"
                type="button"
                onClick={() => setCreateOpen((value) => !value)}
              >
                {createOpen ? "Close Create Channel" : "+ Create Channel"}
              </button>
            </div>

            {createOpen && (
              <section className="td-mini-panel">
                <form className="td-form" onSubmit={createChannel}>
                  <input
                    value={channelForm.channel_name}
                    onChange={(event) =>
                      setChannelForm((prev) => ({
                        ...prev,
                        channel_name: event.target.value,
                      }))
                    }
                    placeholder="Channel name"
                  />

                  <input
                    value={channelForm.channel_description}
                    onChange={(event) =>
                      setChannelForm((prev) => ({
                        ...prev,
                        channel_description: event.target.value,
                      }))
                    }
                    placeholder="Description optional"
                  />

                  <select
                    value={channelForm.channel_type}
                    onChange={(event) =>
                      setChannelForm((prev) => ({
                        ...prev,
                        channel_type: event.target.value,
                      }))
                    }
                  >
                    <option value="public">Public Channel</option>
                    <option value="private">Private Channel</option>
                  </select>

                  <input
                    value={channelForm.security_pin}
                    maxLength="8"
                    inputMode="numeric"
                    onChange={(event) =>
                      setChannelForm((prev) => ({
                        ...prev,
                        security_pin: event.target.value.replace(/\D/g, "").slice(0, 8),
                      }))
                    }
                    placeholder={
                      channelForm.channel_type === "private"
                        ? "Security PIN required"
                        : "Security PIN optional"
                    }
                  />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setChannelLogo(event.target.files?.[0] || null)}
                  />

                  <div className="td-btn-row">
                    <button className="td-primary-btn" type="submit" disabled={loading}>
                      Create
                    </button>
                    <button
                      className="td-light-btn"
                      type="button"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}

        <ChannelList
          title="Public Channels"
          type="public"
          channels={publicChannels}
          currentUser={user}
          readOnly={sharedLinkAccess.enabled}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          imageVersion={imageVersion}
          channelLogoInstantMap={channelLogoInstantMap}
          onOpen={requestOpenChannel}
          onEdit={openEditChannel}
          onResetPin={setResetPinChannel}
          onDelete={askDeleteChannel}
          onShare={copyShareLink}
          onSendLink={openSendLinkModal}
          onImageOpen={openImageViewer}
        />

        {!sharedLinkAccess.enabled && (
          <ChannelList
            title="Private Channels"
            type="private"
            channels={privateChannels}
            currentUser={user}
            readOnly={false}
            activeMenuId={activeMenuId}
            setActiveMenuId={setActiveMenuId}
            imageVersion={imageVersion}
            channelLogoInstantMap={channelLogoInstantMap}
            onOpen={requestOpenChannel}
            onEdit={openEditChannel}
            onResetPin={setResetPinChannel}
            onDelete={askDeleteChannel}
            onShare={copyShareLink}
            onSendLink={openSendLinkModal}
            onImageOpen={openImageViewer}
          />
        )}
      </main>

      {editChannel && (
        <Modal title="Update Channel" onClose={() => setEditChannel(null)}>
          <form className="td-form" onSubmit={updateChannel}>
            <input
              value={editForm.channel_name}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  channel_name: event.target.value,
                }))
              }
              placeholder="Channel name"
            />

            <input
              value={editForm.channel_description}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  channel_description: event.target.value,
                }))
              }
              placeholder="Description optional"
            />

            <select
              value={editForm.channel_type}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  channel_type: event.target.value,
                }))
              }
            >
              <option value="public">Public Channel</option>
              <option value="private">Private Channel</option>
            </select>

            <input
              value={editForm.security_pin}
              maxLength="8"
              inputMode="numeric"
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  security_pin: event.target.value.replace(/\D/g, "").slice(0, 8),
                }))
              }
              placeholder="New PIN optional"
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleEditLogoChange}
            />

            {editLogoPreview && (
              <button
                type="button"
                className="td-preview-row"
                onClick={() =>
                  openImageViewer(editLogoPreview, "New channel logo")
                }
              >
                <img src={editLogoPreview} alt="Channel logo preview" />
                <span>Preview selected channel logo</span>
              </button>
            )}

            <div className="td-btn-row">
              <button className="td-primary-btn" type="submit" disabled={loading}>
                Update
              </button>
              <button
                className="td-light-btn"
                type="button"
                onClick={() => setEditChannel(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetPinChannel && (
        <Modal title="Reset PIN" onClose={() => setResetPinChannel(null)}>
          <form className="td-form" onSubmit={resetPin}>
            <input
              value={resetPinValue}
              maxLength="8"
              inputMode="numeric"
              onChange={(event) =>
                setResetPinValue(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="New 4-8 digit PIN"
            />

            <div className="td-btn-row">
              <button className="td-primary-btn" type="submit" disabled={loading}>
                Reset
              </button>
              <button
                className="td-light-btn"
                type="button"
                onClick={() => setResetPinChannel(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {privateOpenBox.show && (
        <Modal
          title="Enter Private Channel PIN"
          onClose={() => setPrivateOpenBox({ show: false, channel: null, pin: "" })}
        >
          <p className="td-confirm-text">
            Enter the correct PIN to open "{privateOpenBox.channel?.channel_name}".
          </p>

          <input
            className="td-confirm-input"
            value={privateOpenBox.pin}
            maxLength="8"
            inputMode="numeric"
            type="password"
            onChange={(event) =>
              setPrivateOpenBox((prev) => ({
                ...prev,
                pin: event.target.value.replace(/\D/g, "").slice(0, 8),
              }))
            }
            placeholder="Private channel PIN"
          />

          <div className="td-btn-row td-confirm-actions">
            <button
              className="td-primary-btn"
              type="button"
              onClick={confirmOpenPrivateChannel}
              disabled={loading}
            >
              Open Channel
            </button>
            <button
              className="td-light-btn"
              type="button"
              onClick={() => setPrivateOpenBox({ show: false, channel: null, pin: "" })}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {confirmBox.show && (
        <Modal title="Delete Channel" onClose={closeDeleteBox}>
          <p className="td-confirm-text">
            Delete "{confirmBox.channel?.channel_name}"?
          </p>

          {confirmBox.channel?.channel_type === "private" && (
            <input
              className="td-confirm-input"
              value={confirmBox.privatePin}
              maxLength="8"
              inputMode="numeric"
              onChange={(event) =>
                setConfirmBox((prev) => ({
                  ...prev,
                  privatePin: event.target.value.replace(/\D/g, "").slice(0, 8),
                }))
              }
              placeholder="Private channel PIN"
            />
          )}

          <div className="td-btn-row td-confirm-actions">
            <button
              className="td-delete-btn"
              type="button"
              onClick={confirmDeleteChannel}
              disabled={loading}
            >
              Delete
            </button>
            <button className="td-light-btn" type="button" onClick={closeDeleteBox}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {sendLinkBox.show && (
        <Modal title="Send Channel Link" onClose={closeSendLinkModal}>
          <div className="td-send-link-summary">
            <strong>{sendLinkBox.channel?.channel_name}</strong>
            <span>{buildShareLink(sendLinkBox.channel) || "Share link unavailable"}</span>
          </div>

          <div className="td-user-select-list">
            {sendLinkBox.loadingUsers ? (
              <div className="td-empty">Loading registered users...</div>
            ) : sendLinkBox.users.length === 0 ? (
              <div className="td-empty">No registered users found</div>
            ) : (
              sendLinkBox.users.map((item) => {
                const value = String(getUserId(item) || getUserEmail(item));
                return (
                  <label className="td-user-select-item" key={value}>
                    <input
                      type="checkbox"
                      checked={sendLinkBox.selectedIds.includes(value)}
                      onChange={() => toggleSendUser(value)}
                    />
                    <span>
                      <strong>{getUserDisplayName(item)}</strong>
                      <small>{getUserEmail(item) || "No email"}</small>
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="td-btn-row td-confirm-actions">
            <button
              className="td-primary-btn"
              type="button"
              onClick={sendChannelLinkToUsers}
              disabled={loading || sendLinkBox.selectedIds.length === 0}
            >
              Send Link
            </button>
            <button className="td-light-btn" type="button" onClick={closeSendLinkModal}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {receivedLinksOpen && (
        <Modal title="Received Links" onClose={() => setReceivedLinksOpen(false)}>
          <div className="td-received-list">
            {receivedLinksLoading ? (
              <div className="td-empty">Loading received links...</div>
            ) : receivedLinks.length === 0 ? (
              <div className="td-empty">No pending received links</div>
            ) : (
              receivedLinks.map((item) => {
                const id = String(getInvitationId(item) || getInvitationShareValue(item));
                return (
                  <article className="td-received-card" key={id}>
                    <div>
                      <strong>{getInvitationChannelName(item)}</strong>
                      <small>Shared by {getInvitationSenderName(item)}</small>
                    </div>

                    <div className="td-received-actions">
                      <button
                        type="button"
                        className="accept"
                        onClick={() => respondToReceivedLink(item, "accept")}
                        disabled={loading}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="reject"
                        onClick={() => respondToReceivedLink(item, "reject")}
                        disabled={loading}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {imageViewer.show && (
        <ImageViewer
          src={imageViewer.src}
          title={imageViewer.title}
          onClose={closeImageViewer}
        />
      )}

      {toast.show && (
        <div className={`td-toast ${toast.type}`}>
          <strong>{toast.type === "success" ? "✓" : "!"}</strong>
          <span>{toast.message}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}

function ChannelList({
  title,
  type,
  channels,
  currentUser,
  readOnly,
  activeMenuId,
  setActiveMenuId,
  imageVersion,
  channelLogoInstantMap,
  onOpen,
  onEdit,
  onResetPin,
  onDelete,
  onShare,
  onSendLink,
  onImageOpen,
}) {
  return (
    <section className="td-section">
      <h3>{title}</h3>

      <div className="td-channel-list">
        {channels.length === 0 ? (
          <div className="td-empty">No {type} channels</div>
        ) : (
          channels.map((channel) => {
            const channelId = getChannelId(channel);
            const menuId = `${type}-${channelId}`;
            const isOwner = isChannelOwner(channel, currentUser);
            const isViewOnly =
              readOnly ||
              channel?.access_mode === "view_only" ||
              channel?.accessMode === "view_only" ||
              channel?.joined_via_link === true ||
              channel?.joinedViaLink === true;
            const canShare = canUserShareChannel(channel, isOwner);
            const logoSrc =
              channelLogoInstantMap?.[channelId] ||
              withCacheBuster(
                mediaUrl(channel?.channel_logo_url || channel?.channel_logo),
                imageVersion
              );
            const created = formatDateTimeIST(getChannelCreatedAt(channel));

            return (
              <article className="td-channel-card" key={channelId}>
                <button
                  type="button"
                  className="td-channel-icon"
                  onClick={() =>
                    onImageOpen(
                      logoSrc,
                      `${channel.channel_name || "Channel"} Logo`
                    )
                  }
                  title="Open channel logo"
                >
                  {logoSrc ? (
                    <img src={logoSrc} alt="Channel" />
                  ) : (
                    <span>{getInitialLetter(channel.channel_name)}</span>
                  )}
                </button>

                <div className="td-channel-content">
                  <div className="td-channel-top-row">
                    <div className="td-channel-title-block">
                      <h4>{channel.channel_name}</h4>
                      <div className="td-channel-meta">
                        {channel.channel_type === "private" ? (
                          <span className="td-type-chip private">🔒 Private</span>
                        ) : (
                          <span className="td-type-chip public">Public</span>
                        )}

                        {isOwner && <span className="td-owner-chip">Owner</span>}
                        {isViewOnly && <span className="td-view-chip">View only</span>}
                      </div>
                    </div>

                    <div className="td-menu-wrap" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="td-menu-btn"
                        onClick={() =>
                          setActiveMenuId(activeMenuId === menuId ? "" : menuId)
                        }
                        title="Channel options"
                      >
                        ⋮
                      </button>

                      {activeMenuId === menuId && (
                        <div className="td-menu-panel">
                          <button type="button" onClick={() => onOpen(channel)}>
                            Open Channel
                          </button>

                          {!isViewOnly && canShare && (
                            <button type="button" onClick={() => onShare(channel)}>
                              Copy Link
                            </button>
                          )}

                          {!isViewOnly && isOwner && (
                            <button type="button" onClick={() => onSendLink(channel)}>
                              Send Link
                            </button>
                          )}

                          {!isViewOnly && isOwner && (
                            <>
                              <button type="button" onClick={() => onEdit(channel)}>
                                Update
                              </button>
                              {channel.channel_type === "private" && (
                                <button type="button" onClick={() => onResetPin(channel)}>
                                  Reset PIN
                                </button>
                              )}
                              <button
                                type="button"
                                className="danger"
                                onClick={() => onDelete(channel)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {channel.channel_description && (
                    <p className="td-channel-desc">{channel.channel_description}</p>
                  )}

                  <div className="td-channel-date-row">
                    <span>Created</span>
                    <strong>
                      {created.date}
                      {created.time ? ` • ${created.time} IST` : ""}
                    </strong>
                  </div>

                  <div className="td-channel-main-action">
                    <button type="button" onClick={() => onOpen(channel)}>
                      {isViewOnly ? "Open View-only Channel" : "Open Channel"}
                    </button>
                  </div>
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
      <div className="td-modal" onClick={(event) => event.stopPropagation()}>
        <div className="td-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ImageViewer({ src, title, onClose }) {
  return (
    <div className="td-image-viewer-layer" onClick={onClose}>
      <div
        className="td-image-viewer-stage"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="td-image-viewer-close" type="button" onClick={onClose}>
          ×
        </button>
        <div className="td-image-viewer-box">
          <img src={src} alt={title} />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="td-footer">
      <span className="td-footer-icon">&lt;/&gt;</span>
      <span>Developed by Ajay Kedar</span>
    </footer>
  );
}

const styles = `
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  background: #123b9f;
}

body {
  overflow-x: hidden;
}

button,
input,
select {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

button:active:not(:disabled) {
  transform: scale(0.97);
}

.td-page {
  width: 100%;
  min-height: 100dvh;
  overflow-x: hidden;
  padding-top: calc(88px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(34px + env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.16), transparent 30%),
    radial-gradient(circle at 100% 0%, rgba(20, 184, 166, 0.13), transparent 30%),
    linear-gradient(180deg, #f8fbff 0%, #eef3fa 100%);
  color: #0f172a;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

.td-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  width: 100%;
  padding: calc(16px + env(safe-area-inset-top, 0px)) 12px 12px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 64, 175, 0.98) 54%, rgba(8, 145, 178, 0.98) 100%);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.24);
}

.td-navbar-inner {
  width: min(820px, 100%);
  min-height: 60px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.td-navbar h1 {
  margin: 0 0 4px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: -0.35px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
}

.td-navbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.td-refresh-btn,
.td-received-btn,
.td-logout-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
  color: #ffffff;
  font-weight: 950;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.td-refresh-btn,
.td-received-btn {
  position: relative;
  width: 39px;
  height: 39px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 18px;
  line-height: 1;
}

.td-received-btn span {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #ef4444;
  color: #ffffff;
  font-size: 9px;
  font-weight: 950;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.34);
}

.td-logout-btn {
  min-height: 35px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 11.5px;
}

.td-loading-line {
  position: fixed;
  top: calc(88px + env(safe-area-inset-top, 0px));
  left: 0;
  z-index: 80;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #ffffff, #67e8f9, #bbf7d0);
  animation: tdLoading 0.9s linear infinite;
}

@keyframes tdLoading {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

.td-main {
  width: min(820px, 100%);
  min-height: calc(100dvh - 110px);
  margin: 0 auto;
  padding: 12px;
  display: grid;
  align-content: start;
  gap: 11px;
}

.td-profile-hero,
.td-details-card,
.td-mini-panel,
.td-join-card,
.td-section {
  width: 100%;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.085);
}

.td-profile-hero {
  position: relative;
  overflow: hidden;
  padding: 16px;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 15px;
  background:
    radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.12), transparent 36%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
}

.td-big-avatar-ring {
  width: 96px;
  height: 96px;
  padding: 5px;
  border: 0;
  border-radius: 30px;
  background: linear-gradient(135deg, #2563eb, #06b6d4 58%, #14b8a6);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.26);
}

.td-image-click {
  cursor: zoom-in;
}

.td-big-avatar,
.td-big-avatar-placeholder {
  width: 100%;
  height: 100%;
  border: 4px solid #ffffff;
  border-radius: 24px;
}

.td-big-avatar {
  display: block;
  object-fit: contain;
  background: #ffffff;
}

.td-big-avatar-placeholder {
  display: grid;
  place-items: center;
  background: #0f172a;
  color: #ffffff;
  font-size: 38px;
  font-weight: 950;
}

.td-profile-hero-text {
  min-width: 0;
}

.td-profile-hero-text h2 {
  margin: 0 0 7px;
  overflow: hidden;
  color: #0f172a;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.55px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-profile-hero-text p {
  margin: 0;
  overflow: hidden;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-view-only-badge {
  display: inline-flex;
  margin-top: 9px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 10px;
  font-weight: 950;
}

.td-details-card,
.td-mini-panel,
.td-join-card,
.td-section {
  padding: 12px;
}

.td-details-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.td-details-head h3,
.td-join-card h3,
.td-section h3 {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: -0.2px;
}

.td-icon-update-btn {
  min-height: 29px;
  border: 0;
  border-radius: 999px;
  padding: 0 11px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 10.5px;
  font-weight: 950;
}

.td-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.td-details-grid div {
  min-width: 0;
  padding: 9px;
  border-radius: 15px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.td-details-grid small {
  display: block;
  margin-bottom: 4px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.td-details-grid strong {
  display: block;
  overflow: hidden;
  color: #334155;
  font-size: 11.5px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-form {
  display: grid;
  gap: 9px;
}

.td-form input,
.td-form select,
.td-join-row input,
.td-confirm-input {
  width: 100%;
  min-height: 40px;
  border: 1px solid #dbe4f0;
  border-radius: 14px;
  outline: 0;
  background: #f8fafc;
  color: #0f172a;
  padding: 9px 11px;
  font-size: 12.5px;
  font-weight: 750;
}

.td-form input:focus,
.td-form select:focus,
.td-join-row input:focus,
.td-confirm-input:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.td-preview-row {
  min-height: 52px;
  border: 1px dashed #bfdbfe;
  border-radius: 16px;
  background: #f8fafc;
  padding: 7px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
  text-align: left;
}

.td-preview-row img {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  object-fit: cover;
}

.td-email-verify-box {
  display: grid;
  gap: 7px;
  padding: 8px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px dashed #bfdbfe;
}

.td-email-verify-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 78px;
  gap: 7px;
}

.td-email-verify-box p {
  margin: 0;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 750;
}

.td-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.td-primary-btn,
.td-light-btn,
.td-delete-btn,
.td-verified-btn,
.td-create-btn {
  border: 0;
  border-radius: 14px;
  font-weight: 950;
  transition: 0.15s ease;
}

.td-primary-btn,
.td-light-btn,
.td-delete-btn,
.td-verified-btn {
  min-height: 35px;
  padding: 0 12px;
  font-size: 11.5px;
}

.td-primary-btn {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #ffffff;
}

.td-light-btn {
  background: #e2e8f0;
  color: #475569;
}

.td-delete-btn {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: #ffffff;
}

.td-verified-btn {
  background: #dcfce7;
  color: #166534;
}

.td-join-card {
  display: grid;
  gap: 9px;
}

.td-join-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  gap: 8px;
}

.td-create-wrap {
  display: flex;
  justify-content: flex-end;
}

.td-create-btn {
  min-height: 38px;
  padding: 0 15px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #ffffff;
  font-size: 12.5px;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.22);
}

.td-channel-list {
  display: grid;
  gap: 9px;
  margin-top: 9px;
}

.td-empty {
  min-height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
  text-align: center;
}

.td-channel-card {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr);
  gap: 10px;
  transition: 0.15s ease;
}

.td-channel-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.td-channel-icon {
  width: 50px;
  height: 50px;
  border: 0;
  border-radius: 16px;
  padding: 0;
  background: transparent;
  overflow: hidden;
  cursor: zoom-in;
}

.td-channel-icon img,
.td-channel-icon span {
  width: 50px;
  height: 50px;
  border-radius: 16px;
}

.td-channel-icon img {
  display: block;
  object-fit: contain;
  background: #ffffff;
  border: 1px solid #eef2f7;
}

.td-channel-icon span {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #ccfbf1);
  color: #1d4ed8;
  font-size: 20px;
  font-weight: 950;
}

.td-channel-content {
  min-width: 0;
}

.td-channel-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 9px;
}

.td-channel-title-block {
  min-width: 0;
}

.td-channel-title-block h4 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-channel-meta {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.td-type-chip,
.td-owner-chip,
.td-view-chip {
  display: inline-flex;
  align-items: center;
  min-height: 19px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 8.5px;
  font-weight: 950;
  line-height: 1;
}

.td-type-chip.public {
  background: #dbeafe;
  color: #1d4ed8;
}

.td-type-chip.private {
  background: #fef3c7;
  color: #92400e;
}

.td-owner-chip {
  background: #dcfce7;
  color: #166534;
}

.td-view-chip {
  background: #ffedd5;
  color: #c2410c;
}

.td-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.td-menu-btn {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f1f5f9;
  color: #475569;
  font-size: 18px;
  font-weight: 950;
  line-height: 1;
}

.td-menu-panel {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 20;
  width: 154px;
  padding: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.2);
  display: grid;
  gap: 3px;
  animation: tdMenuPop 0.14s ease;
}

.td-menu-panel button {
  min-height: 31px;
  width: 100%;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #334155;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 900;
  text-align: left;
}

.td-menu-panel button:hover {
  background: #f8fafc;
}

.td-menu-panel button.danger {
  color: #dc2626;
}

.td-channel-desc {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}

.td-channel-date-row {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 850;
}

.td-channel-date-row strong {
  color: #475569;
  font-weight: 950;
}

.td-channel-main-action {
  margin-top: 9px;
}

.td-channel-main-action button {
  min-height: 31px;
  width: 100%;
  border: 0;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 950;
}

.td-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 16px;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(8px);
}

.td-modal {
  width: min(365px, calc(100% - 26px));
  max-height: 88dvh;
  overflow-y: auto;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 20px;
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.26);
  animation: tdModalPop 0.18s ease;
}

.td-modal-head {
  margin-bottom: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.td-modal-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
}

.td-modal-head button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 18px;
  line-height: 1;
}

.td-confirm-text {
  margin: 0 0 10px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}

.td-confirm-actions {
  margin-top: 9px;
}

.td-send-link-summary {
  display: grid;
  gap: 5px;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.td-send-link-summary strong {
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 950;
}

.td-send-link-summary span {
  overflow-wrap: anywhere;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 800;
}

.td-user-select-list {
  max-height: 280px;
  overflow-y: auto;
  display: grid;
  gap: 7px;
}

.td-user-select-item {
  min-height: 48px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 15px;
  background: #ffffff;
}

.td-user-select-item input {
  width: 16px;
  height: 16px;
}

.td-user-select-item span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.td-user-select-item strong,
.td-user-select-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-user-select-item strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.td-user-select-item small {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
}

.td-received-list {
  display: grid;
  gap: 8px;
  max-height: 310px;
  overflow-y: auto;
}

.td-received-card {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  display: grid;
  gap: 9px;
}

.td-received-card strong {
  display: block;
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 950;
}

.td-received-card small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 800;
}

.td-received-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.td-received-actions button {
  min-height: 31px;
  border: 0;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 950;
}

.td-received-actions button.accept {
  background: #dcfce7;
  color: #166534;
}

.td-received-actions button.reject {
  background: #fee2e2;
  color: #991b1b;
}

.td-image-viewer-layer {
  position: fixed;
  inset: 0;
  z-index: 140;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.76);
  backdrop-filter: blur(10px);
}

.td-image-viewer-stage {
  width: min(430px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  display: grid;
  justify-items: end;
  gap: 6px;
}

.td-image-viewer-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #ffffff;
  color: #0f172a;
  font-size: 23px;
  line-height: 1;
  font-weight: 850;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
}

.td-image-viewer-box {
  width: 100%;
  display: grid;
  place-items: center;
}

.td-image-viewer-box img {
  width: auto;
  max-width: 100%;
  max-height: min(430px, 62dvh);
  border-radius: 22px;
  object-fit: contain;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
}

.td-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 150;
  width: min(270px, calc(100% - 42px));
  min-height: 50px;
  padding: 11px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
  transform: translate(-50%, -50%);
  text-align: center;
  animation: tdPop 0.18s ease;
}

.td-toast strong {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.td-toast span {
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
}

.td-toast.success strong {
  background: #dcfce7;
  color: #166534;
}

.td-toast.error strong {
  background: #fee2e2;
  color: #b91c1c;
}

.td-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 55;
  min-height: 26px;
  padding: 4px 10px calc(4px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-top: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  color: #64748b;
  font-size: 9.5px;
  font-weight: 900;
}

.td-footer-icon {
  color: #dc2626;
  font-size: 10px;
  font-weight: 950;
}

.td-login-card {
  width: min(350px, calc(100% - 28px));
  margin: 60px auto 0;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
}

.td-login-card h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.td-login-card button {
  min-height: 37px;
  border: 0;
  border-radius: 14px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 16px;
  font-weight: 900;
}

@keyframes tdPop {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes tdModalPop {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes tdMenuPop {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .td-page {
    padding-top: calc(84px + env(safe-area-inset-top, 0px));
  }

  .td-navbar {
    padding: calc(14px + env(safe-area-inset-top, 0px)) 10px 11px;
  }

  .td-navbar-inner {
    min-height: 56px;
  }

  .td-navbar h1 {
    font-size: 16px;
  }

  .td-refresh-btn,
  .td-received-btn {
    width: 36px;
    height: 36px;
  }

  .td-logout-btn {
    min-height: 34px;
    padding: 0 13px;
    font-size: 11px;
  }

  .td-loading-line {
    top: calc(84px + env(safe-area-inset-top, 0px));
  }

  .td-main {
    width: 100%;
    padding: 10px;
    gap: 10px;
  }

  .td-profile-hero {
    grid-template-columns: 84px minmax(0, 1fr);
    padding: 12px;
    gap: 12px;
    border-radius: 21px;
  }

  .td-big-avatar-ring {
    width: 84px;
    height: 84px;
    border-radius: 25px;
  }

  .td-big-avatar,
  .td-big-avatar-placeholder {
    border-radius: 21px;
  }

  .td-big-avatar-placeholder {
    font-size: 34px;
  }

  .td-profile-hero-text h2 {
    font-size: 19px;
  }

  .td-profile-hero-text p {
    font-size: 12px;
  }

  .td-details-card,
  .td-mini-panel,
  .td-join-card,
  .td-section {
    padding: 11px;
    border-radius: 20px;
  }

  .td-details-grid {
    grid-template-columns: 1fr 1fr;
  }

  .td-email-verify-row {
    grid-template-columns: 1fr;
  }

  .td-join-row {
    grid-template-columns: minmax(0, 1fr) 76px;
  }

  .td-create-wrap {
    justify-content: stretch;
  }

  .td-create-btn {
    width: 100%;
  }

  .td-channel-card {
    grid-template-columns: 46px minmax(0, 1fr);
    border-radius: 16px;
  }

  .td-channel-icon,
  .td-channel-icon img,
  .td-channel-icon span {
    width: 46px;
    height: 46px;
    border-radius: 15px;
  }

  .td-channel-top-row {
    gap: 7px;
  }

  .td-menu-panel {
    width: 146px;
  }

  .td-image-viewer-stage {
    width: min(360px, calc(100vw - 24px));
  }

  .td-image-viewer-box img {
    max-height: 58dvh;
    border-radius: 18px;
  }
}

@media (max-width: 380px) {
  .td-navbar h1 {
    font-size: 15px;
  }

  .td-refresh-btn {
    width: 33px;
    height: 33px;
  }

  .td-logout-btn {
    min-height: 33px;
    padding: 0 11px;
    font-size: 10.5px;
  }

  .td-profile-hero {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .td-big-avatar-ring {
    width: 76px;
    height: 76px;
  }

  .td-profile-hero-text h2 {
    font-size: 17px;
  }

  .td-details-grid {
    grid-template-columns: 1fr;
  }

  .td-join-row {
    grid-template-columns: 1fr;
  }

  .td-channel-card {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 8px;
  }

  .td-channel-icon,
  .td-channel-icon img,
  .td-channel-icon span {
    width: 42px;
    height: 42px;
    border-radius: 14px;
  }

  .td-btn-row {
    grid-template-columns: 1fr;
  }
}
`;
