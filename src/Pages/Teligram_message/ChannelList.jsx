import React, { useEffect, useRef, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com";

const PUBLIC_USER_ID = 7;

const themes = [
  ["#0f766e", "#14b8a6"],
  ["#1d4ed8", "#38bdf8"],
  ["#7c3aed", "#c084fc"],
  ["#be123c", "#fb7185"],
  ["#b45309", "#fbbf24"],
  ["#047857", "#34d399"],
  ["#4338ca", "#818cf8"],
  ["#0f172a", "#64748b"],
  ["#c2410c", "#fb923c"],
  ["#0e7490", "#22d3ee"],
];

export default function ChannelList() {
  const fileRef = useRef(null);

  const [channels, setChannels] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [channelLogo, setChannelLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [loading, setLoading] = useState(false);

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
    fetchChannels();
  }, []);

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
    setConfirmBox({
      show: false,
      title: "",
      message: "",
      action: null,
    });
  };

  const getTheme = (index) => {
    return themes[index % themes.length];
  };

  const getInitial = (name) => {
    return name?.trim()?.charAt(0)?.toUpperCase() || "N";
  };

  const getLogoUrl = (url) => {
    if (!url) return "";

    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/uploads")) return `${API_URL}${url}`;

    return url;
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
        <rect width="120" height="120" rx="60" fill="url(#g)"/>
        <circle cx="86" cy="32" r="18" fill="rgba(255,255,255,0.18)"/>
        <circle cx="34" cy="88" r="24" fill="rgba(255,255,255,0.12)"/>
        <text x="60" y="72" text-anchor="middle" font-size="48" font-family="Arial, sans-serif" font-weight="800" fill="white">${initial}</text>
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
    setChannelLogo(null);
    setLogoPreview("");
    setEditingId(null);
    setRemoveLogo(false);
    setActiveMenuId(null);

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

    const currentEditingId = editingId;
    const oldChannels = channels;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_name", channelName.trim());
      formData.append("remove_logo", removeLogo ? "true" : "false");

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

      const savedChannel = data.channel;

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
    setEditingId(channel.channel_id);
    setChannelName(channel.channel_name || "");
    setLogoPreview(getLogoUrl(channel.logo_url || ""));
    setChannelLogo(null);
    setRemoveLogo(false);
    setActiveMenuId(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteChannel = async (channelId) => {
    const oldChannels = channels;

    setChannels((prev) =>
      prev.filter((channel) => Number(channel.channel_id) !== Number(channelId))
    );

    setActiveMenuId(null);

    if (Number(editingId) === Number(channelId)) {
      resetForm();
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setChannels(oldChannels);
        showToast(data.message || "Delete failed", "error");
        return;
      }

      showToast("Channel deleted successfully", "success");
    } catch (error) {
      console.error("Delete channel error:", error);
      setChannels(oldChannels);
      showToast("Server error while deleting", "error");
    } finally {
      setLoading(false);
    }
  };

  const openChannel = (channel) => {
    localStorage.setItem("selected_channel_id", channel.channel_id);
    localStorage.setItem("selected_channel_name", channel.channel_name);
    window.location.hash = "/teligram-notes";
  };

  return (
    <div className="nm-page" onClick={() => setActiveMenuId(null)}>
      <div className="nm-mobile">
        <header className="nm-header">
          <div>
            <h1>Notes Management</h1>
            <p>Organize your channels professionally</p>
          </div>
        </header>

        <section className="create-card" onClick={(e) => e.stopPropagation()}>
          <div className="logo-area">
            <div className="logo-picker" onClick={() => fileRef.current.click()}>
              {logoPreview ? (
                <img src={logoPreview} alt="channel logo" />
              ) : (
                <img src={getDefaultLogo(channelName || "N", 0)} alt="default logo" />
              )}
            </div>

            {logoPreview && (
              <button className="remove-logo" onClick={removeSelectedLogo}>
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

            <div className="form-buttons">
              {editingId && (
                <button className="cancel-btn" onClick={resetForm}>
                  Cancel
                </button>
              )}

              <button
                className="save-btn"
                onClick={createOrUpdateChannel}
                disabled={loading}
              >
                {loading ? "Please wait..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </section>

        <main className="channel-list">
          {loading && channels.length === 0 && (
            <div className="empty-box">
              <div className="loader"></div>
              <p>Loading channels...</p>
            </div>
          )}

          {!loading && channels.length === 0 && (
            <div className="empty-box">
              <img src={getDefaultLogo("N", 2)} alt="empty" />
              <h3>No channels yet</h3>
              <p>Create your first professional notes channel</p>
            </div>
          )}

          {channels.map((channel, index) => {
            const [color1, color2] = getTheme(index);

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
                        channel.logo_url
                          ? getLogoUrl(channel.logo_url)
                          : getDefaultLogo(channel.channel_name, index)
                      }
                      alt={channel.channel_name}
                    />
                  </div>

                  <div className="channel-name">
                    <h3>{channel.channel_name}</h3>
                  </div>
                </div>

                <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="dot-btn"
                    onClick={() =>
                      setActiveMenuId(
                        activeMenuId === channel.channel_id
                          ? null
                          : channel.channel_id
                      )
                    }
                  >
                    ⋮
                  </button>

                  {activeMenuId === channel.channel_id && (
                    <div className="channel-menu">
                      <button
                        className="update-text"
                        onClick={() => startEdit(channel)}
                      >
                        Update
                      </button>

                      <button
                        className="delete-text"
                        onClick={() =>
                          openConfirm(
                            "Delete Channel?",
                            `Do you want to delete "${channel.channel_name}"?`,
                            () => deleteChannel(channel.channel_id)
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </main>
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
              <button className="no-btn" onClick={closeConfirm}>
                Cancel
              </button>

              <button
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

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .nm-page {
          width: 100%;
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20, 184, 166, 0.28), transparent 35%),
            radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.22), transparent 32%),
            linear-gradient(145deg, #020617, #0f172a 42%, #134e4a);
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: Inter, Arial, sans-serif;
        }

        .nm-mobile {
          width: 100%;
          max-width: 430px;
          height: 100vh;
          background:
            linear-gradient(180deg, #ecfeff 0%, #f8fafc 40%, #eef2ff 100%);
          overflow-y: auto;
          position: relative;
        }

        .nm-header {
          min-height: 92px;
          background:
            radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22), transparent 28%),
            linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          padding: 20px 18px 17px;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.22);
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
        }

        .nm-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .nm-header p {
          margin: 4px 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.82);
          font-weight: 600;
        }

        .create-card {
          margin: 16px 13px 14px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 26px;
          padding: 15px;
          display: flex;
          gap: 14px;
          align-items: center;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(12px);
        }

        .logo-area {
          position: relative;
          flex-shrink: 0;
        }

        .logo-picker {
          width: 72px;
          height: 72px;
          border-radius: 22px;
          background: #f1f5f9;
          border: 1px solid #dbe4f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
          box-shadow: inset 0 0 0 4px rgba(255,255,255,0.55);
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
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.35);
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
          color: #0f766e;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .form-area input {
          width: 100%;
          height: 42px;
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
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.13);
        }

        .form-buttons {
          margin-top: 9px;
          display: flex;
          gap: 8px;
        }

        .save-btn,
        .cancel-btn {
          height: 38px;
          border: none;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          padding: 0 14px;
        }

        .save-btn {
          flex: 1;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          box-shadow: 0 10px 24px rgba(14, 165, 233, 0.22);
        }

        .save-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #e2e8f0;
          color: #475569;
        }

        .channel-list {
          padding: 3px 0 22px;
        }

        .channel-row {
          position: relative;
          min-height: 78px;
          display: flex;
          align-items: center;
          margin: 0 12px 10px;
          border-radius: 23px;
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
          gap: 13px;
          padding: 11px 6px 11px 14px;
          cursor: pointer;
        }

        .channel-logo {
          width: 58px;
          height: 58px;
          border-radius: 19px;
          background: linear-gradient(135deg, var(--c1), var(--c2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 900;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 12px 24px color-mix(in srgb, var(--c1) 34%, transparent);
        }

        .channel-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .channel-name {
          flex: 1;
          min-width: 0;
        }

        .channel-name h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.1px;
        }

        .menu-wrap {
          width: 44px;
          height: 76px;
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
        }

        .dot-btn:hover {
          background: #e2e8f0;
        }

        .channel-menu {
          position: absolute;
          top: 54px;
          right: 8px;
          width: 104px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
          padding: 6px;
          z-index: 30;
          animation: menuPop 0.15s ease;
        }

        @keyframes menuPop {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(0.96);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .channel-menu button {
          width: 100%;
          border: none;
          background: transparent;
          padding: 8px 9px;
          border-radius: 10px;
          text-align: left;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .channel-menu button:hover {
          background: #f8fafc;
        }

        .update-text {
          color: #2563eb;
        }

        .delete-text {
          color: #dc2626;
        }

        .empty-box {
          margin: 58px 24px;
          padding: 28px 16px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        }

        .empty-box img {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          margin-bottom: 12px;
        }

        .empty-box h3 {
          margin: 0 0 6px;
          color: #1f2937;
          font-size: 18px;
          font-weight: 900;
        }

        .empty-box p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
        }

        .loader {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid #d1d5db;
          border-top-color: #0ea5e9;
          margin: 0 auto 12px;
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
          z-index: 100;
          pointer-events: none;
        }

        .toast {
          width: 245px;
          background: white;
          border-radius: 22px;
          padding: 20px 16px;
          text-align: center;
          box-shadow: 0 20px 70px rgba(15, 23, 42, 0.28);
          animation: popupScale 0.16s ease;
        }

        .toast-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          font-weight: 900;
        }

        .toast.success .toast-icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .toast.error .toast-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .toast p {
          margin: 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 900;
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
        }

        .confirm-card {
          width: 100%;
          max-width: 330px;
          background: white;
          border-radius: 24px;
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
          font-size: 20px;
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
          height: 41px;
          border: none;
          border-radius: 14px;
          font-size: 14px;
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

        @media (min-width: 431px) {
          .nm-mobile {
            height: 92vh;
            border-radius: 26px;
            box-shadow: 0 32px 95px rgba(0, 0, 0, 0.42);
          }
        }

        @media (max-width: 360px) {
          .create-card {
            gap: 10px;
          }

          .logo-picker {
            width: 62px;
            height: 62px;
            border-radius: 20px;
          }

          .channel-logo {
            width: 52px;
            height: 52px;
            border-radius: 17px;
          }

          .channel-name h3 {
            font-size: 16px;
          }

          .nm-header h1 {
            font-size: 21px;
          }
        }
      `}</style>
    </div>
  );
}