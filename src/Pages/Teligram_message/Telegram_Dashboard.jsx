import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = (
  import.meta.env.VITE_TELEGRAM_API_BASE_URL ||
  "https://express-backend-myapp.onrender.com"
).replace(/\/$/, "");

const API = {
  me: `${BASE_URL}/api/telegram-users/me`,
  sendCode: `${BASE_URL}/api/telegram-users/send-code`,
  verifyCode: `${BASE_URL}/api/telegram-users/verify-code`,
  updateUser: (id) => `${BASE_URL}/api/telegram-users/${id}`,

  myChannels: `${BASE_URL}/api/telegramlogin-channels/my-channels`,
  createChannel: `${BASE_URL}/api/telegramlogin-channels/create`,
  updateChannel: (id) => `${BASE_URL}/api/telegramlogin-channels/${id}`,
  deleteChannel: (id) => `${BASE_URL}/api/telegramlogin-channels/${id}`,
  joinChannel: (shareCode) =>
    `${BASE_URL}/api/telegramlogin-channels/join/${shareCode}`,
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

function getShareCodeFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const joinIndex = parts.indexOf("join");
  return joinIndex >= 0 && parts[joinIndex + 1] ? parts[joinIndex + 1] : "";
}

function mediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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

  const publicChannels = channels.filter(
    (channel) => channel.channel_type === "public"
  );
  const privateChannels = channels.filter(
    (channel) => channel.channel_type === "private"
  );

  const currentUserEmail = cleanEmail(user?.email || user?.email_address || "");
  const typedProfileEmail = cleanEmail(profileForm.email);
  const profileEmailChanged =
    Boolean(currentUserEmail) && Boolean(typedProfileEmail) && typedProfileEmail !== currentUserEmail;

  const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "x-device-id": deviceId,
    ...extra,
  });

  const showPopup = (message, type = "success") => {
    setToast({ show: true, type, message });

    window.setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1700);
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
      setUser(currentUser);
      fillProfileForm(currentUser);
      setChannels(channelData?.channels || []);

      const shareCode = getShareCodeFromPath();
      if (shareCode) {
        await joinSharedChannel(shareCode, false);
      }
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

  const logout = () => {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    navigate("/telegram-login", { replace: true });
  };

  const resetEmailVerifyState = () => {
    setProfileEmailCode("");
    setProfileEmailOtpSent(false);
    setProfileEmailVerified(false);
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
      setProfileImage(null);
      setProfileOpen(false);
      fillProfileForm(updatedUser);
      showPopup("Profile updated successfully");
      await loadDashboard();
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const joinSharedChannel = async (shareValue, showMessage = true) => {
    const shareCode = extractShareCode(shareValue);

    if (!shareCode) {
      showPopup("Enter share link or code", "error");
      return;
    }

    try {
      setLoading(true);

      await requestJson(API.joinChannel(shareCode), {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ device_id: deviceId }),
      });

      const data = await requestJson(API.myChannels, {
        headers: authHeaders(),
      });

      setChannels(data?.channels || []);
      setJoinInput("");
      if (showMessage) showPopup("Channel joined successfully");
    } catch (error) {
      if (showMessage) showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async (channel) => {
    const shareCode = getShareCode(channel);

    if (!shareCode) {
      showPopup("Share code not available", "error");
      return;
    }

    const link = `${window.location.origin}/channel/join/${shareCode}`;

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
      await loadDashboard();
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditChannel = (channel) => {
    setEditChannel(channel);
    setEditForm({
      channel_name: channel?.channel_name || "",
      channel_description: channel?.channel_description || "",
      channel_type: channel?.channel_type || "public",
      security_pin: "",
    });
    setEditLogo(null);
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

    if (pin && !/^\d{4,8}$/.test(pin)) {
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

      await requestJson(API.updateChannel(channelId), {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });

      setEditChannel(null);
      setEditLogo(null);
      showPopup("Channel updated successfully");
      await loadDashboard();
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
      await loadDashboard();
    } catch (error) {
      showPopup(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const askDeleteChannel = (channel) => {
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
      await loadDashboard();
    } catch (error) {
      showPopup(error.message, "error");
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
    <div className="td-page">
      <style>{styles}</style>

      <nav className="td-navbar">
        <div className="td-navbar-inner">
          <h1>Notes Dashboard</h1>

          <div className="td-navbar-actions">
            <button
              className="td-refresh-btn"
              type="button"
              title="Refresh"
              onClick={loadDashboard}
              disabled={loading}
            >
              ↻
            </button>

            <button className="td-logout-btn" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {loading && <div className="td-loading-line" />}

      <main className="td-main">
        <section className="td-profile-hero">
          <div className="td-big-avatar-ring">
            {user?.profile_image_url || user?.profile_image ? (
              <img
                className="td-big-avatar"
                src={mediaUrl(user?.profile_image_url || user?.profile_image)}
                alt="Profile"
              />
            ) : (
              <div className="td-big-avatar-placeholder">
                {getInitialLetter(user?.full_name)}
              </div>
            )}
          </div>

          <div className="td-profile-hero-text">
            <h2>{user?.full_name || "User"}</h2>
            <p>{user?.email || user?.email_address || "Email not available"}</p>
          </div>
        </section>

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
                      className={profileEmailVerified ? "td-verified-btn" : "td-primary-btn"}
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

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setProfileImage(event.target.files?.[0] || null)
                }
              />

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

        <ChannelList
          title="Public Channels"
          type="public"
          channels={publicChannels}
          onEdit={openEditChannel}
          onResetPin={setResetPinChannel}
          onDelete={askDeleteChannel}
          onShare={copyShareLink}
        />

        <ChannelList
          title="Private Channels"
          type="private"
          channels={privateChannels}
          onEdit={openEditChannel}
          onResetPin={setResetPinChannel}
          onDelete={askDeleteChannel}
          onShare={copyShareLink}
        />
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
              onChange={(event) => setEditLogo(event.target.files?.[0] || null)}
            />

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
              OK
            </button>
            <button className="td-light-btn" type="button" onClick={closeDeleteBox}>
              Cancel
            </button>
          </div>
        </Modal>
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
  onEdit,
  onResetPin,
  onDelete,
  onShare,
}) {
  return (
    <section className="td-section">
      <h3>{title}</h3>

      <div className="td-channel-list">
        {channels.length === 0 ? (
          <div className="td-empty">No {type} channels</div>
        ) : (
          channels.map((channel) => (
            <article className="td-channel-card" key={getChannelId(channel)}>
              <div className="td-channel-icon">
                {channel?.channel_logo_url || channel?.channel_logo ? (
                  <img
                    src={mediaUrl(channel?.channel_logo_url || channel?.channel_logo)}
                    alt="Channel"
                  />
                ) : (
                  <span>{getInitialLetter(channel.channel_name)}</span>
                )}
              </div>

              <div className="td-channel-content">
                <div className="td-channel-title-row">
                  <h4>{channel.channel_name}</h4>
                  <small className={channel.channel_type}>{channel.channel_type}</small>
                </div>

                {channel.channel_description && (
                  <p className="td-channel-desc">{channel.channel_description}</p>
                )}

                <div className="td-channel-actions">
                  {channel.channel_type === "public" && (
                    <button type="button" onClick={() => onShare(channel)}>
                      Share
                    </button>
                  )}

                  <button type="button" onClick={() => onEdit(channel)}>
                    Update
                  </button>

                  <button type="button" onClick={() => onResetPin(channel)}>
                    Reset PIN
                  </button>

                  <button
                    type="button"
                    className="delete"
                    onClick={() => onDelete(channel)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="td-modal-layer">
      <div className="td-modal">
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
  padding-top: calc(74px + env(safe-area-inset-top, 0px));
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
  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
  background: linear-gradient(135deg, #111b45 0%, #2142c7 55%, #0f92c7 100%);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.22);
}

.td-navbar-inner {
  width: min(820px, 100%);
  min-height: 54px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.td-navbar h1 {
  margin: 0;
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
.td-logout-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
  color: #ffffff;
  font-weight: 950;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.td-refresh-btn {
  width: 37px;
  height: 37px;
  background: rgba(255, 255, 255, 0.13);
  font-size: 18px;
  line-height: 1;
}

.td-logout-btn {
  min-height: 35px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 11.5px;
}

.td-loading-line {
  position: fixed;
  top: calc(74px + env(safe-area-inset-top, 0px));
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
  border: 1px solid rgba(226, 232, 240, 0.98);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.075);
}

.td-profile-hero {
  padding: 14px;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.td-big-avatar-ring {
  width: 92px;
  height: 92px;
  padding: 5px;
  border-radius: 28px;
  background: linear-gradient(135deg, #2563eb, #14b8a6);
  box-shadow: 0 16px 28px rgba(37, 99, 235, 0.22);
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
  object-fit: cover;
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
  min-height: 36px;
  padding: 0 12px;
  font-size: 12px;
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
}

.td-channel-card {
  width: 100%;
  padding: 9px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 9px;
}

.td-channel-icon,
.td-channel-icon img,
.td-channel-icon span {
  width: 46px;
  height: 46px;
  border-radius: 15px;
}

.td-channel-icon img {
  display: block;
  object-fit: cover;
}

.td-channel-icon span {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #ccfbf1);
  color: #1d4ed8;
  font-size: 19px;
  font-weight: 950;
}

.td-channel-content {
  min-width: 0;
}

.td-channel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.td-channel-title-row h4 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-channel-title-row small {
  flex-shrink: 0;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 8.5px;
  font-weight: 950;
  line-height: 1;
  text-transform: uppercase;
}

.td-channel-title-row small.public {
  background: #dbeafe;
  color: #1d4ed8;
}

.td-channel-title-row small.private {
  background: #fef3c7;
  color: #92400e;
}

.td-channel-desc {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}

.td-channel-actions {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.td-channel-actions button {
  min-height: 27px;
  flex: 1;
  border: 0;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 0 8px;
  font-size: 10.5px;
  font-weight: 950;
}

.td-channel-actions button.delete {
  background: #fee2e2;
  color: #b91c1c;
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
  width: min(390px, 100%);
  max-height: 88dvh;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 21px;
  background: #ffffff;
  padding: 13px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
  animation: tdModalPop 0.18s ease;
}

.td-modal-head {
  margin-bottom: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.td-modal-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.td-modal-head button {
  width: 29px;
  height: 29px;
  border: 0;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 18px;
  line-height: 1;
}

.td-confirm-text {
  margin: 0 0 11px;
  color: #334155;
  font-size: 12.5px;
  font-weight: 800;
}

.td-confirm-actions {
  margin-top: 9px;
}

.td-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 120;
  width: min(250px, calc(100% - 42px));
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

@media (max-width: 640px) {
  .td-page {
    padding-top: calc(72px + env(safe-area-inset-top, 0px));
  }

  .td-navbar {
    padding: calc(9px + env(safe-area-inset-top, 0px)) 10px 9px;
  }

  .td-navbar-inner {
    min-height: 52px;
  }

  .td-navbar h1 {
    font-size: 16px;
  }

  .td-refresh-btn {
    width: 35px;
    height: 35px;
  }

  .td-logout-btn {
    min-height: 34px;
    padding: 0 13px;
    font-size: 11px;
  }

  .td-loading-line {
    top: calc(72px + env(safe-area-inset-top, 0px));
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
    grid-template-columns: 44px minmax(0, 1fr);
    border-radius: 16px;
  }

  .td-channel-icon,
  .td-channel-icon img,
  .td-channel-icon span {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }

  .td-channel-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .td-channel-actions button {
    min-width: 0;
    padding: 0 5px;
    font-size: 9.5px;
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

  .td-channel-actions {
    grid-template-columns: 1fr;
  }
}
`;
