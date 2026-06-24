import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";

const API_URL = import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com" || "http://localhost:5000";
const PUBLIC_USER_ID = 7;

export default function Teligram() {
  const editorRef = useRef(null);
  const imageRef = useRef(null);
  const colorRef = useRef(null);
  const bottomRef = useRef(null);
  const savedRangeRef = useRef(null);

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [notes, setNotes] = useState([]);

  const [textColor, setTextColor] = useState("#111111");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [removeOldImage, setRemoveOldImage] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
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
    loadSelectedChannel();
  }, []);

  useEffect(() => {
    if (selectedChannel?.channel_id) {
      fetchNotes(selectedChannel.channel_id);
    }
  }, [selectedChannel]);

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }, [notes]);

  const loadSelectedChannel = async () => {
    const channelId = localStorage.getItem("selected_channel_id");

    if (!channelId) {
      window.location.hash = "/teligram-channels";
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`);
      const data = await res.json();

      if (!res.ok) {
        showToast("Channel not found", "error");
        setTimeout(() => {
          window.location.hash = "/teligram-channels";
        }, 900);
        return;
      }

      setSelectedChannel(data.channel);
    } catch (error) {
      console.error("Channel load error:", error);
      showToast("Server error while opening channel", "error");
    }
  };

  const fetchNotes = async (channelId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/telegram-notes?user_id=${PUBLIC_USER_ID}&channel_id=${channelId}`
      );

      const data = await res.json();

      if (!res.ok) {
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
        }));

      setNotes(channelNotes);
    } catch (error) {
      console.error("Fetch notes error:", error);
      showToast("Unable to load messages", "error");
    }
  };

  const getFileUrl = (url) => {
    if (!url) return "";

    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    if (url.startsWith("/uploads")) {
      return `${API_URL}${url}`;
    }

    return url;
  };

  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  };

  const getEditorHtml = () => {
    const html = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.textContent?.trim() || "";

    if (!text && (html === "<br>" || html === "<div><br></div>")) {
      return "";
    }

    return html.trim();
  };

  const filteredNotes = useMemo(() => {
    if (!searchText.trim()) return notes;

    const q = searchText.toLowerCase();

    return notes.filter((note) => {
      const plainText = stripHtml(note.content_html || "");
      return plainText.toLowerCase().includes(q);
    });
  }, [notes, searchText]);

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
    }, 1700);
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

  const saveSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
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

  const applySelectedFormat = (type, value = null) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    const restored = restoreSelection();
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || !restored) {
      editorRef.current.focus();

      if (type === "bold") {
        document.execCommand("bold", false, null);
      }

      if (type === "underline") {
        document.execCommand("underline", false, null);
      }

      if (type === "color") {
        setTextColor(value);
        document.execCommand("foreColor", false, value);
      }

      saveSelection();
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    if (range.collapsed) {
      if (type === "bold") {
        document.execCommand("bold", false, null);
      }

      if (type === "underline") {
        document.execCommand("underline", false, null);
      }

      if (type === "color") {
        setTextColor(value);
        document.execCommand("foreColor", false, value);
      }

      saveSelection();
      return;
    }

    let wrapper;

    if (type === "bold") {
      wrapper = document.createElement("strong");
    }

    if (type === "underline") {
      wrapper = document.createElement("u");
    }

    if (type === "color") {
      wrapper = document.createElement("span");
      wrapper.style.color = value;
      setTextColor(value);
    }

    const selectedContent = range.extractContents();
    wrapper.appendChild(selectedContent);
    range.insertNode(wrapper);

    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    newRange.collapse(false);

    selection.removeAllRanges();
    selection.addRange(newRange);

    editorRef.current.normalize();
    saveSelection();
  };

  const applyBold = (e) => {
    e.preventDefault();
    applySelectedFormat("bold");
  };

  const applyUnderline = (e) => {
    e.preventDefault();
    applySelectedFormat("underline");
  };

  const openColorPicker = (e) => {
    e.preventDefault();
    saveSelection();
    colorRef.current?.click();
  };

  const changeColor = (color) => {
    applySelectedFormat("color", color);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select only image", "error");
      return;
    }

    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setRemoveOldImage(false);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewImage("");
    setRemoveOldImage(true);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTextColor("#111111");
    setSelectedImage(null);
    setPreviewImage("");
    setRemoveOldImage(false);
    setEditingNoteId(null);
    setActiveMenuId(null);
    savedRangeRef.current = null;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const saveNote = async () => {
    if (!selectedChannel?.channel_id) {
      showToast("Please open channel first", "error");
      return;
    }

    const contentHtml = getEditorHtml();
    const plainText = stripHtml(contentHtml).trim();

    if (!plainText && !selectedImage && !previewImage) {
      showToast("Please add text or image", "error");
      return;
    }

    const currentImageFile = selectedImage;
    const currentPreviewImage = previewImage;
    const currentRemoveImage = removeOldImage;
    const currentTextColor = textColor;
    const oldEditingId = editingNoteId;
    const oldNotes = notes;
    const now = new Date().toISOString();
    const tempId = oldEditingId || `temp-${Date.now()}`;

    const oldNote = oldEditingId
      ? notes.find((note) => note.note_id === oldEditingId)
      : null;

    const optimisticNote = {
      note_id: tempId,
      user_id: PUBLIC_USER_ID,
      channel_id: selectedChannel.channel_id,
      title: "",
      content_html: contentHtml,
      text_color: currentTextColor,
      image_url: currentRemoveImage ? null : currentPreviewImage || null,
      image_path: null,
      created_at: oldEditingId ? oldNote?.created_at || now : now,
      updated_at: now,
      is_temp: true,
    };

    if (oldEditingId) {
      setNotes((prev) =>
        prev.map((note) =>
          note.note_id === oldEditingId ? { ...note, ...optimisticNote } : note
        )
      );
    } else {
      setNotes((prev) => [...prev, optimisticNote]);
    }

    resetForm();

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("title", "");
      formData.append("content_html", contentHtml);
      formData.append("text_color", currentTextColor);
      formData.append("remove_image", currentRemoveImage ? "true" : "false");

      if (currentImageFile) {
        formData.append("image", currentImageFile);
      }

      const url = oldEditingId
        ? `${API_URL}/api/telegram-notes/${oldEditingId}`
        : `${API_URL}/api/telegram-notes`;

      const method = oldEditingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Action failed", "error");
        setNotes(oldNotes);
        return;
      }

      const backendNote = data.note || {};

      const savedNote = {
        ...optimisticNote,
        ...backendNote,
        channel_id: backendNote.channel_id || selectedChannel.channel_id,
        text_color: backendNote.text_color || currentTextColor,
        content_html: backendNote.content_html || contentHtml,
        image_url:
          backendNote.image_url ||
          backendNote.image_path ||
          optimisticNote.image_url ||
          null,
        created_at: backendNote.created_at || optimisticNote.created_at,
        updated_at: backendNote.updated_at || new Date().toISOString(),
        is_temp: false,
      };

      if (oldEditingId) {
        setNotes((prev) =>
          prev.map((note) => (note.note_id === oldEditingId ? savedNote : note))
        );
      } else {
        setNotes((prev) =>
          prev.map((note) => (note.note_id === tempId ? savedNote : note))
        );
      }

      fetch(
        `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/last-message`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            last_message: plainText.slice(0, 80) || "Image message",
          }),
        }
      );

      showToast(oldEditingId ? "Message updated" : "Message sent", "success");
    } catch (error) {
      console.error("Save note error:", error);
      showToast("Server error", "error");
      setNotes(oldNotes);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setTextColor(note.text_color || "#111111");
    setPreviewImage(getFileUrl(note.image_url || note.image_path || ""));
    setSelectedImage(null);
    setRemoveOldImage(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = note.content_html || "";
    }

    setTimeout(() => {
      editorRef.current?.focus();
      saveSelection();
    }, 100);
  };

  const deleteNote = async (noteId) => {
    const oldNotes = notes;

    setNotes((prev) => prev.filter((note) => note.note_id !== noteId));
    setActiveMenuId(null);

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/telegram-notes/${noteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Delete failed", "error");
        setNotes(oldNotes);
        return;
      }

      showToast("Message deleted", "success");
    } catch (error) {
      console.error("Delete note error:", error);
      showToast("Server error while deleting", "error");
      setNotes(oldNotes);
    } finally {
      setLoading(false);
    }
  };

  const backToChannels = () => {
    resetForm();
    window.location.hash = "/teligram-channels";
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    const dateText = date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const timeText = date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateText} • ${timeText}`;
  };

  const getInitial = (name) => {
    return name?.charAt(0)?.toUpperCase() || "N";
  };

  return (
    <div className="nm-screen">
      <div className="nm-phone">
        <header className="nm-header">
          <button className="back-btn" onClick={backToChannels}>
            ‹
          </button>

          <div className="header-logo">
            {selectedChannel?.logo_url ? (
              <img src={getFileUrl(selectedChannel.logo_url)} alt="logo" />
            ) : (
              <span>{getInitial(selectedChannel?.channel_name)}</span>
            )}
          </div>

          <div className="header-title">
            <h2>{selectedChannel?.channel_name || "Notes"}</h2>
          </div>

          <button
            className="search-btn"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setSearchText("");
            }}
          >
            🔍
          </button>
        </header>

        {searchOpen && (
          <div className="search-box">
            <input
              type="text"
              placeholder="Search..."
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

        <main className="chat-body" onClick={() => setActiveMenuId(null)}>
          {filteredNotes.length === 0 && (
            <div className="empty-card">
              <h3>{searchText ? "No match found" : "No messages yet"}</h3>
              <p>{searchText ? "Try another word" : "Start adding notes below"}</p>
            </div>
          )}

          {filteredNotes.map((note) => (
            <div className="msg-row" key={note.note_id}>
              <div className="msg-card" onClick={(e) => e.stopPropagation()}>
                <button
                  className="dot-btn"
                  onClick={() =>
                    setActiveMenuId(
                      activeMenuId === note.note_id ? null : note.note_id
                    )
                  }
                >
                  ⋮
                </button>

                {activeMenuId === note.note_id && !note.is_temp && (
                  <div className="action-menu">
                    <button className="update-action" onClick={() => startEdit(note)}>
                      Update
                    </button>

                    <button
                      className="delete-action"
                      onClick={() =>
                        openConfirm(
                          "Delete Message?",
                          "This message will be deleted permanently.",
                          () => deleteNote(note.note_id)
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                )}

                <div className="msg-date">{formatDateTime(note.created_at)}</div>

                {note.content_html && (
                  <div
                    className="msg-text"
                    style={{ color: note.text_color || "#111111" }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(note.content_html),
                    }}
                  />
                )}

                {(note.image_url || note.image_path) && (
                  <img
                    src={getFileUrl(note.image_url || note.image_path)}
                    alt="note"
                    className="msg-image"
                  />
                )}

                {note.is_temp && <div className="sending-text">sending...</div>}
              </div>
            </div>
          ))}

          <div ref={bottomRef}></div>
        </main>

        {previewImage && (
          <div className="preview-strip">
            <img src={getFileUrl(previewImage)} alt="preview" />
            <span>{selectedImage ? selectedImage.name : "Current image"}</span>
            <button onClick={removeImage}>×</button>
          </div>
        )}

        {editingNoteId && (
          <div className="edit-strip">
            <span>Updating message</span>
            <button onClick={resetForm}>Cancel</button>
          </div>
        )}

        <footer className="composer">
          <div className="input-card">
            <div
              ref={editorRef}
              className="text-input"
              contentEditable
              data-placeholder="Type message..."
              style={{ color: textColor }}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              onInput={saveSelection}
              onBlur={saveSelection}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
                saveSelection();
              }}
            ></div>

            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageSelect}
            />

            <button
              className="tool-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => imageRef.current.click()}
            >
              🖼️
            </button>

            <button className="tool-btn" onMouseDown={applyBold}>
              <b>B</b>
            </button>

            <button className="tool-btn" onMouseDown={applyUnderline}>
              <u>U</u>
            </button>

            <input
              ref={colorRef}
              type="color"
              value={textColor}
              hidden
              onChange={(e) => changeColor(e.target.value)}
            />

            <button className="tool-btn" onMouseDown={openColorPicker}>
              🎨
            </button>

            <button className="send-btn" onClick={saveNote} disabled={loading}>
              {loading ? "…" : editingNoteId ? "✓" : "➤"}
            </button>
          </div>
        </footer>
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

        .nm-screen {
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(145deg, #111827, #334155, #0f766e);
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: Arial, sans-serif;
        }

        .nm-phone {
          width: 100%;
          max-width: 430px;
          height: 100vh;
          background: linear-gradient(145deg, #d8f3e7, #eef7ff, #d9e7ff);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .nm-header {
          height: 64px;
          background: linear-gradient(135deg, #00695c, #009688);
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          flex-shrink: 0;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.18);
          z-index: 10;
        }

        .back-btn {
          border: none;
          background: transparent;
          color: white;
          font-size: 38px;
          line-height: 1;
          cursor: pointer;
          width: 32px;
          height: 42px;
        }

        .header-logo {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }

        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-title {
          flex: 1;
          min-width: 0;
        }

        .header-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-btn {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: rgba(255,255,255,0.16);
          color: white;
          cursor: pointer;
          font-size: 17px;
        }

        .search-box {
          background: white;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .search-box input {
          flex: 1;
          height: 36px;
          border: none;
          outline: none;
          background: #f1f5f9;
          border-radius: 18px;
          padding: 0 14px;
          font-size: 14px;
        }

        .search-box button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #e2e8f0;
          font-size: 20px;
          cursor: pointer;
          color: #475569;
        }

        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px 10px 16px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255,255,255,0.45), transparent 28%),
            radial-gradient(circle at 84% 82%, rgba(14,165,233,0.18), transparent 30%),
            linear-gradient(135deg, #d7f4df, #edf5ff 45%, #dce7ff);
        }

        .empty-card {
          width: fit-content;
          max-width: 82%;
          margin: 90px auto 0;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(8px);
          padding: 18px 20px;
          border-radius: 18px;
          text-align: center;
          box-shadow: 0 8px 28px rgba(15,23,42,0.12);
        }

        .empty-card h3 {
          margin: 0 0 6px;
          color: #1f2937;
          font-size: 16px;
        }

        .empty-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .msg-row {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 10px;
        }

        .msg-card {
          max-width: 88%;
          min-width: 120px;
          position: relative;
          background: rgba(255,255,255,0.97);
          border-radius: 6px 17px 17px 17px;
          padding: 9px 30px 7px 10px;
          box-shadow: 0 2px 10px rgba(15,23,42,0.13);
          word-break: break-word;
        }

        .dot-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 16px;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dot-btn:hover {
          background: #f1f5f9;
        }

        .action-menu {
          position: absolute;
          top: 26px;
          right: 5px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 12px 36px rgba(15,23,42,0.22);
          padding: 5px;
          z-index: 8;
          min-width: 82px;
          animation: menuIn 0.14s ease;
        }

        @keyframes menuIn {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(0.96);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .action-menu button {
          width: 100%;
          border: none;
          background: transparent;
          padding: 6px 8px;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          border-radius: 7px;
        }

        .update-action {
          color: #2563eb;
        }

        .delete-action {
          color: #dc2626;
        }

        .action-menu button:hover {
          background: #f8fafc;
        }

        .msg-date {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 6px;
          padding-right: 8px;
        }

        .msg-text {
          font-size: 16px;
          line-height: 1.42;
          color: #111111;
          padding-right: 2px;
        }

        .msg-text div,
        .msg-text p {
          margin: 0;
        }

        .msg-image {
          display: block;
          width: 100%;
          max-width: 285px;
          max-height: 330px;
          object-fit: cover;
          border-radius: 12px;
          margin-top: 7px;
        }

        .sending-text {
          margin-top: 5px;
          text-align: right;
          color: #94a3b8;
          font-size: 11px;
        }

        .preview-strip {
          background: rgba(255,255,255,0.96);
          border-top: 1px solid #e5e7eb;
          padding: 7px 9px;
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .preview-strip img {
          width: 44px;
          height: 44px;
          border-radius: 9px;
          object-fit: cover;
        }

        .preview-strip span {
          flex: 1;
          font-size: 12px;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-strip button {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #fee2e2;
          color: #dc2626;
          font-size: 18px;
          cursor: pointer;
        }

        .edit-strip {
          background: #eff6ff;
          color: #2563eb;
          border-top: 1px solid #bfdbfe;
          padding: 7px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .edit-strip button {
          border: none;
          background: #2563eb;
          color: white;
          border-radius: 13px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .composer {
          background: rgba(255,255,255,0.98);
          padding: 8px;
          flex-shrink: 0;
          box-shadow: 0 -4px 18px rgba(15,23,42,0.08);
        }

        .input-card {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 5px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 5px 5px 5px 12px;
        }

        .text-input {
          flex: 1;
          min-width: 0;
          max-height: 76px;
          overflow-y: auto;
          outline: none;
          font-size: 15px;
          line-height: 1.35;
          padding: 6px 0;
        }

        .text-input:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }

        .tool-btn {
          width: 29px;
          height: 29px;
          border: none;
          border-radius: 50%;
          background: #e2e8f0;
          color: #334155;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .send-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #00897b, #00a693);
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .send-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .popup-layer {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .toast {
          width: 245px;
          background: white;
          border-radius: 22px;
          padding: 20px 16px;
          text-align: center;
          box-shadow: 0 20px 70px rgba(15,23,42,0.28);
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
          background: rgba(15,23,42,0.48);
          z-index: 110;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .confirm-card {
          width: 100%;
          max-width: 330px;
          background: white;
          border-radius: 24px;
          padding: 23px 18px 18px;
          text-align: center;
          box-shadow: 0 28px 80px rgba(15,23,42,0.36);
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

        .confirm-actions {
          display: flex;
          gap: 10px;
        }

        .confirm-actions button {
          flex: 1;
          height: 41px;
          border: none;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .cancel-confirm {
          background: #f1f5f9;
          color: #475569;
        }

        .delete-confirm {
          background: #dc2626;
          color: white;
        }

        @media (min-width: 431px) {
          .nm-phone {
            height: 92vh;
            border-radius: 22px;
            box-shadow: 0 28px 90px rgba(0,0,0,0.38);
          }
        }

        @media (max-width: 360px) {
          .tool-btn {
            width: 27px;
            height: 27px;
            font-size: 12px;
          }

          .send-btn {
            width: 32px;
            height: 32px;
          }

          .msg-card {
            max-width: 90%;
          }

          .header-title h2 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}