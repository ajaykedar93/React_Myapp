import React, { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PUBLIC_USER_ID = 7;

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
    setToast({
      show: true,
      type,
      message,
    });

    setTimeout(() => {
      setToast({
        show: false,
        type: "success",
        message: "",
      });
    }, 2200);
  };

  const openConfirm = (title, message, action) => {
    setConfirmBox({
      show: true,
      title,
      message,
      action,
    });
  };

  const closeConfirm = () => {
    setConfirmBox({
      show: false,
      title: "",
      message: "",
      action: null,
    });
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

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_name", channelName.trim());
      formData.append("remove_logo", removeLogo ? "true" : "false");

      if (channelLogo) {
        formData.append("logo", channelLogo);
      }

      const url = editingId
        ? `${API_URL}/api/telegram-channels/${editingId}`
        : `${API_URL}/api/telegram-channels`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Action failed", "error");
        return;
      }

      showToast(
        editingId ? "Channel updated successfully" : "Channel created successfully",
        "success"
      );

      resetForm();
      fetchChannels();
    } catch (error) {
      console.error("Create/update channel error:", error);
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (channel) => {
    setEditingId(channel.channel_id);
    setChannelName(channel.channel_name || "");
    setLogoPreview(channel.logo_url || "");
    setChannelLogo(null);
    setRemoveLogo(false);
    setActiveMenuId(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteChannel = async (channelId) => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Delete failed", "error");
        return;
      }

      showToast("Channel deleted successfully", "success");

      if (editingId === channelId) {
        resetForm();
      }

      fetchChannels();
    } catch (error) {
      console.error("Delete channel error:", error);
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

  const getInitial = (name) => {
    return name?.charAt(0)?.toUpperCase() || "N";
  };

  return (
    <div className="nm-page" onClick={() => setActiveMenuId(null)}>
      <div className="nm-mobile">
        <header className="nm-header">
          <h1>Notes Management</h1>
        </header>

        <section className="create-card" onClick={(e) => e.stopPropagation()}>
          <div className="logo-area">
            <div className="logo-picker" onClick={() => fileRef.current.click()}>
              {logoPreview ? (
                <img src={logoPreview} alt="channel logo" />
              ) : (
                <span>+</span>
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
            <input
              type="text"
              placeholder="Channel name"
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
                {loading ? "Wait..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </section>

        <main className="channel-list">
          {loading && channels.length === 0 && (
            <div className="empty-box">
              <div className="loader"></div>
              <p>Loading...</p>
            </div>
          )}

          {!loading && channels.length === 0 && (
            <div className="empty-box">
              <h3>No channels</h3>
              <p>Create your first channel</p>
            </div>
          )}

          {channels.map((channel) => (
            <div className="channel-row" key={channel.channel_id}>
              <div className="channel-click" onClick={() => openChannel(channel)}>
                <div className="channel-logo">
                  {channel.logo_url ? (
                    <img src={channel.logo_url} alt={channel.channel_name} />
                  ) : (
                    <span>{getInitial(channel.channel_name)}</span>
                  )}
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
          ))}
        </main>
      </div>

      {toast.show && (
        <div className="popup-layer">
          <div className={`toast ${toast.type}`}>
            <div className="toast-icon">{toast.type === "success" ? "✓" : "!"}</div>
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
          background: linear-gradient(145deg, #111827, #334155, #0f766e);
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: Arial, sans-serif;
        }

        .nm-mobile {
          width: 100%;
          max-width: 430px;
          height: 100vh;
          background: linear-gradient(145deg, #f8fafc, #eef7ff, #e0f2f1);
          overflow-y: auto;
          position: relative;
        }

        .nm-header {
          height: 66px;
          background: linear-gradient(135deg, #00695c, #009688);
          color: white;
          display: flex;
          align-items: center;
          padding: 0 18px;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.18);
        }

        .nm-header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .create-card {
          margin: 14px 12px;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 22px;
          padding: 14px;
          display: flex;
          gap: 13px;
          align-items: center;
          box-shadow: 0 10px 34px rgba(15, 23, 42, 0.1);
        }

        .logo-area {
          position: relative;
          flex-shrink: 0;
        }

        .logo-picker {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px dashed #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
        }

        .logo-picker img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .logo-picker span {
          font-size: 32px;
          color: #64748b;
          font-weight: 800;
        }

        .remove-logo {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: #ef4444;
          color: white;
          font-size: 17px;
          cursor: pointer;
        }

        .form-area {
          flex: 1;
          min-width: 0;
        }

        .form-area input {
          width: 100%;
          height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 0 13px;
          font-size: 14px;
          outline: none;
          color: #111827;
          background: #ffffff;
        }

        .form-area input:focus {
          border-color: #00897b;
          box-shadow: 0 0 0 3px rgba(0, 137, 123, 0.12);
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
          border-radius: 13px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          padding: 0 14px;
        }

        .save-btn {
          flex: 1;
          background: #00897b;
          color: white;
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
          padding: 4px 0 18px;
        }

        .channel-row {
          position: relative;
          background: rgba(255, 255, 255, 0.94);
          min-height: 76px;
          display: flex;
          align-items: center;
          margin: 0 10px 8px;
          border-radius: 18px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.07);
          overflow: visible;
        }

        .channel-click {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 10px 6px 10px 12px;
          cursor: pointer;
        }

        .channel-logo {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
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
        }

        .channel-name h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 850;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 50%;
          background: transparent;
          color: #64748b;
          font-size: 23px;
          cursor: pointer;
          line-height: 1;
        }

        .dot-btn:hover {
          background: #eef2f7;
        }

        .channel-menu {
          position: absolute;
          top: 54px;
          right: 8px;
          width: 108px;
          background: white;
          border-radius: 14px;
          box-shadow: 0 15px 45px rgba(15, 23, 42, 0.22);
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
          padding: 8px 10px;
          border-radius: 10px;
          text-align: left;
          font-size: 13px;
          font-weight: 850;
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
          margin: 60px 22px;
          padding: 28px 16px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 10px 34px rgba(15, 23, 42, 0.08);
        }

        .empty-box h3 {
          margin: 0 0 6px;
          color: #1f2937;
          font-size: 17px;
        }

        .empty-box p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .loader {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid #d1d5db;
          border-top-color: #00897b;
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
          font-weight: 800;
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
          font-weight: 800;
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
            border-radius: 22px;
            box-shadow: 0 28px 90px rgba(0, 0, 0, 0.38);
          }
        }

        @media (max-width: 360px) {
          .create-card {
            gap: 10px;
          }

          .logo-picker {
            width: 60px;
            height: 60px;
          }

          .channel-logo {
            width: 52px;
            height: 52px;
          }

          .channel-name h3 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}