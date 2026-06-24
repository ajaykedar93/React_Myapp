import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Teligram() {
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [textColor, setTextColor] = useState("#111827");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [removeOldImage, setRemoveOldImage] = useState(false);
  const [loading, setLoading] = useState(false);

  // IMPORTANT:
  // Your login page should save admin user_id like this:
  // localStorage.setItem("user_id", admin.user_id);
  const userId = localStorage.getItem("user_id");

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [notes]);

  const fetchNotes = async () => {
    try {
      if (!userId) return;

      const res = await fetch(`${API_URL}/api/telegram-notes?user_id=${userId}`);
      const data = await res.json();

      if (res.ok) {
        setNotes(data.notes || data || []);
      }
    } catch (error) {
      console.error("Fetch notes error:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleColorChange = (color) => {
    setTextColor(color);
    formatCommand("foreColor", color);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select only image file");
      return;
    }

    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setRemoveOldImage(false);
  };

  const removeImagePreview = () => {
    setSelectedImage(null);
    setPreviewImage("");
    setRemoveOldImage(true);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTitle("");
    setTextColor("#111827");
    setSelectedImage(null);
    setPreviewImage("");
    setEditingNoteId(null);
    setRemoveOldImage(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const saveNote = async () => {
    try {
      if (!userId) {
        alert("User ID not found. Please login again.");
        return;
      }

      const contentHtml = editorRef.current?.innerHTML.trim() || "";

      if (!title.trim() && !contentHtml && !selectedImage && !previewImage) {
        alert("Please add title, text, or image");
        return;
      }

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("title", title.trim());
      formData.append("content_html", contentHtml);
      formData.append("text_color", textColor);
      formData.append("remove_image", removeOldImage ? "true" : "false");

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      setLoading(true);

      const url = editingNoteId
        ? `${API_URL}/api/telegram-notes/${editingNoteId}`
        : `${API_URL}/api/telegram-notes`;

      const method = editingNoteId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Something went wrong");
        return;
      }

      resetForm();
      fetchNotes();
    } catch (error) {
      console.error("Save note error:", error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  const editNote = (note) => {
    setEditingNoteId(note.note_id);
    setTitle(note.title || "");
    setTextColor(note.text_color || "#111827");
    setPreviewImage(note.image_url || "");
    setSelectedImage(null);
    setRemoveOldImage(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = note.content_html || "";
    }

    setTimeout(() => {
      editorRef.current?.focus();
    }, 100);
  };

  const deleteNote = async (noteId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this note?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/telegram-notes/${noteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Delete failed");
        return;
      }

      fetchNotes();
    } catch (error) {
      console.error("Delete note error:", error);
      alert("Server error");
    }
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "";

    return new Date(dateValue).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="tg-page">
      <div className="tg-app">
        <aside className="tg-sidebar">
          <div className="tg-sidebar-top">
            <div>
              <h2>Teligram Notes</h2>
              <p>Professional saved notes</p>
            </div>
          </div>

          <div className="tg-search-box">
            <input type="text" placeholder="Search notes..." disabled />
          </div>

          <div className="tg-chat-user active">
            <div className="tg-avatar">N</div>
            <div className="tg-chat-info">
              <h4>Saved Notes</h4>
              <p>Text, images, title, colors</p>
            </div>
            <span>{notes.length}</span>
          </div>
        </aside>

        <main className="tg-main">
          <header className="tg-header">
            <div className="tg-avatar small">N</div>
            <div>
              <h3>Saved Notes</h3>
              <p>{userId ? "Online notes storage" : "User ID not found"}</p>
            </div>
          </header>

          <section className="tg-messages">
            {!userId && (
              <div className="tg-empty">
                <h3>User ID not found</h3>
                <p>Please login first and save user_id in localStorage.</p>
              </div>
            )}

            {userId && notes.length === 0 && (
              <div className="tg-empty">
                <h3>No notes yet</h3>
                <p>Create your first Telegram-style professional note.</p>
              </div>
            )}

            {notes.map((note) => (
              <div className="tg-message-row" key={note.note_id}>
                <div className="tg-bubble">
                  {note.title && (
                    <h4 style={{ color: note.text_color || "#111827" }}>
                      {note.title}
                    </h4>
                  )}

                  {note.content_html && (
                    <div
                      className="tg-content"
                      style={{ color: note.text_color || "#111827" }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(note.content_html),
                      }}
                    />
                  )}

                  {note.image_url && (
                    <img
                      src={note.image_url}
                      alt="note"
                      className="tg-note-image"
                    />
                  )}

                  <div className="tg-message-footer">
                    <span>{formatTime(note.created_at)}</span>

                    <button onClick={() => editNote(note)} title="Edit">
                      ✏️
                    </button>

                    <button onClick={() => deleteNote(note.note_id)} title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div ref={bottomRef}></div>
          </section>

          {previewImage && (
            <div className="tg-preview">
              <img src={previewImage} alt="preview" />
              <div>
                <strong>Image selected</strong>
                <p>{selectedImage ? selectedImage.name : "Current uploaded image"}</p>
              </div>
              <button onClick={removeImagePreview}>✕</button>
            </div>
          )}

          {editingNoteId && (
            <div className="tg-editing-bar">
              <span>Editing note</span>
              <button onClick={resetForm}>Cancel</button>
            </div>
          )}

          <section className="tg-composer">
            <input
              className="tg-title-input"
              type="text"
              placeholder="Enter title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="tg-toolbar">
              <button onClick={() => formatCommand("bold")} title="Bold">
                <b>B</b>
              </button>

              <button onClick={() => formatCommand("italic")} title="Italic">
                <i>I</i>
              </button>

              <button onClick={() => formatCommand("underline")} title="Underline">
                <u>U</u>
              </button>

              <label className="tg-color">
                🎨
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                />
              </label>
            </div>

            <div
              ref={editorRef}
              className="tg-editor"
              contentEditable
              data-placeholder="Write your note..."
              style={{ color: textColor }}
            ></div>

            <div className="tg-send-row">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageSelect}
              />

              <button
                className="tg-attach-btn"
                onClick={() => fileRef.current.click()}
              >
                📎
              </button>

              <button
                className="tg-send-btn"
                onClick={saveNote}
                disabled={loading || !userId}
              >
                {loading ? "Saving..." : editingNoteId ? "Update" : "Send"}
              </button>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .tg-page {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #d9e6ef, #f5f8fb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          padding: 20px;
        }

        .tg-app {
          width: 1150px;
          height: 92vh;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.22);
          display: grid;
          grid-template-columns: 330px 1fr;
        }

        .tg-sidebar {
          background: #ffffff;
          border-right: 1px solid #dbe4ea;
          display: flex;
          flex-direction: column;
        }

        .tg-sidebar-top {
          background: #229ed9;
          color: white;
          padding: 24px;
        }

        .tg-sidebar-top h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }

        .tg-sidebar-top p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .tg-search-box {
          padding: 14px;
          border-bottom: 1px solid #edf2f5;
        }

        .tg-search-box input {
          width: 100%;
          height: 42px;
          border: none;
          outline: none;
          background: #eef3f7;
          border-radius: 22px;
          padding: 0 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .tg-chat-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
        }

        .tg-chat-user.active {
          background: #eaf6fd;
        }

        .tg-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #37aee2, #1e96c8);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .tg-avatar.small {
          width: 42px;
          height: 42px;
          font-size: 17px;
        }

        .tg-chat-info {
          flex: 1;
        }

        .tg-chat-info h4 {
          margin: 0;
          font-size: 16px;
          color: #17212b;
        }

        .tg-chat-info p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .tg-chat-user span {
          background: #229ed9;
          color: white;
          font-size: 12px;
          min-width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tg-main {
          display: flex;
          flex-direction: column;
          background: #e6ebee;
          min-width: 0;
        }

        .tg-header {
          height: 72px;
          background: #ffffff;
          border-bottom: 1px solid #dbe4ea;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 22px;
          flex-shrink: 0;
        }

        .tg-header h3 {
          margin: 0;
          font-size: 17px;
          color: #17212b;
        }

        .tg-header p {
          margin: 3px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .tg-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background:
            linear-gradient(rgba(230, 235, 238, 0.88), rgba(230, 235, 238, 0.88)),
            radial-gradient(circle at 15% 20%, #ffffff 0, transparent 28%),
            radial-gradient(circle at 90% 85%, #c9e7f6 0, transparent 30%);
        }

        .tg-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #64748b;
        }

        .tg-empty h3 {
          margin: 0 0 8px;
          color: #334155;
        }

        .tg-empty p {
          margin: 0;
          font-size: 14px;
        }

        .tg-message-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
        }

        .tg-bubble {
          max-width: 68%;
          background: #effdde;
          border-radius: 17px 17px 5px 17px;
          padding: 12px 12px 8px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
          animation: bubblePop 0.18s ease;
          word-break: break-word;
        }

        @keyframes bubblePop {
          from {
            transform: scale(0.96);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .tg-bubble h4 {
          margin: 0 0 7px;
          font-size: 16px;
          font-weight: 700;
        }

        .tg-content {
          font-size: 15px;
          line-height: 1.45;
        }

        .tg-content div,
        .tg-content p {
          margin: 0;
        }

        .tg-note-image {
          display: block;
          width: 100%;
          max-width: 380px;
          max-height: 420px;
          object-fit: cover;
          border-radius: 13px;
          margin-top: 10px;
        }

        .tg-message-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
          color: #64748b;
          font-size: 11px;
        }

        .tg-message-footer button {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          padding: 2px;
        }

        .tg-preview {
          background: #ffffff;
          border-top: 1px solid #dbe4ea;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .tg-preview img {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 12px;
        }

        .tg-preview div {
          flex: 1;
        }

        .tg-preview strong {
          font-size: 14px;
          color: #111827;
        }

        .tg-preview p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .tg-preview button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          cursor: pointer;
          font-size: 16px;
        }

        .tg-editing-bar {
          background: #fff7ed;
          border-top: 1px solid #fed7aa;
          color: #9a3412;
          padding: 8px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .tg-editing-bar button {
          border: none;
          background: #fb923c;
          color: white;
          padding: 6px 12px;
          border-radius: 16px;
          cursor: pointer;
        }

        .tg-composer {
          background: #ffffff;
          border-top: 1px solid #dbe4ea;
          padding: 12px 16px 14px;
          flex-shrink: 0;
        }

        .tg-title-input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .tg-title-input::placeholder {
          color: #94a3b8;
        }

        .tg-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .tg-toolbar button,
        .tg-color {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          background: #eef3f7;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
        }

        .tg-color input {
          display: none;
        }

        .tg-editor {
          min-height: 55px;
          max-height: 130px;
          overflow-y: auto;
          border: none;
          outline: none;
          font-size: 15px;
          line-height: 1.45;
          color: #111827;
          padding: 2px 0;
        }

        .tg-editor:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }

        .tg-send-row {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .tg-attach-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #eef3f7;
          cursor: pointer;
          font-size: 20px;
        }

        .tg-send-btn {
          min-width: 105px;
          height: 44px;
          border-radius: 24px;
          border: none;
          background: #229ed9;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 22px;
        }

        .tg-send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 850px) {
          .tg-page {
            padding: 0;
          }

          .tg-app {
            width: 100%;
            height: 100vh;
            border-radius: 0;
            grid-template-columns: 1fr;
          }

          .tg-sidebar {
            display: none;
          }

          .tg-bubble {
            max-width: 88%;
          }

          .tg-messages {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}