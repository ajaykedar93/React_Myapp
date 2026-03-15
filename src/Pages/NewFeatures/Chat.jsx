import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

function Chat() {
  const [currentUserId, setCurrentUserId] = useState("user1");
  const [receiverId, setReceiverId] = useState("user2");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketError, setSocketError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit("join", currentUserId);
    socket.emit("get_online_users");

    const handleReceiveMessage = (data) => {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg.id &&
            data.id &&
            msg.id === data.id
        );
        if (exists) return prev;
        return [...prev, data];
      });
    };

    const handleMessageSent = (data) => {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg.id &&
            data.id &&
            msg.id === data.id
        );
        if (exists) return prev;
        return [...prev, data];
      });
    };

    const handleTyping = ({ senderId, receiverId: targetReceiverId }) => {
      if (senderId === receiverId && targetReceiverId === currentUserId) {
        setTypingUser(senderId);
      }
    };

    const handleStopTyping = ({ senderId, receiverId: targetReceiverId }) => {
      if (senderId === receiverId && targetReceiverId === currentUserId) {
        setTypingUser("");
      }
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    const handleSocketError = (err) => {
      setSocketError(err?.message || "Something went wrong");
      setTimeout(() => {
        setSocketError("");
      }, 2500);
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    socket.on("online_users", handleOnlineUsers);
    socket.on("socket_error", handleSocketError);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      socket.off("online_users", handleOnlineUsers);
      socket.off("socket_error", handleSocketError);
    };
  }, [currentUserId, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const visibleMessages = useMemo(() => {
    return messages.filter(
      (msg) =>
        (msg.senderId === currentUserId && msg.receiverId === receiverId) ||
        (msg.senderId === receiverId && msg.receiverId === currentUserId)
    );
  }, [messages, currentUserId, receiverId]);

  const handleSend = () => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    if (currentUserId === receiverId) return;

    const msgData = {
      senderId: currentUserId,
      receiverId: receiverId,
      text: cleanMessage,
      messageType: "text",
    };

    socket.emit("send_message", msgData);
    socket.emit("stop_typing", {
      senderId: currentUserId,
      receiverId: receiverId,
    });

    setMessage("");
  };

  const handleTypingChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (currentUserId === receiverId) return;

    if (value.trim()) {
      socket.emit("typing", {
        senderId: currentUserId,
        receiverId: receiverId,
      });
    } else {
      socket.emit("stop_typing", {
        senderId: currentUserId,
        receiverId: receiverId,
      });
    }
  };

  const changeCurrentUser = (newUser) => {
    setCurrentUserId(newUser);

    if (receiverId === newUser) {
      if (newUser === "user1") setReceiverId("user2");
      else setReceiverId("user1");
    }
  };

  const renderUserButton = (userId, label) => {
    const isActive = receiverId === userId;
    const isOnline = onlineUsers.includes(userId);
    const isSelf = currentUserId === userId;

    return (
      <div
        style={{
          ...styles.user,
          ...(isActive ? styles.userActive : {}),
          ...(isSelf ? styles.selfUser : {}),
        }}
        onClick={() => {
          if (userId !== currentUserId) {
            setReceiverId(userId);
          }
        }}
      >
        <div style={styles.userRow}>
          <span>{label}</span>
          <span
            style={{
              ...styles.statusDot,
              background: isOnline ? "#22c55e" : "#94a3b8",
            }}
            title={isOnline ? "Online" : "Offline"}
          />
        </div>
        <div style={styles.userSubText}>
          {isSelf ? "You" : isOnline ? "Online" : "Offline"}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Chats</h2>

        {renderUserButton("user1", "User 1")}
        {renderUserButton("user2", "User 2")}
        {renderUserButton("user3", "User 3")}

        <div style={styles.currentUserBox}>
          <p style={styles.label}>Your User ID</p>
          <select
            value={currentUserId}
            onChange={(e) => changeCurrentUser(e.target.value)}
            style={styles.select}
          >
            <option value="user1">user1</option>
            <option value="user2">user2</option>
            <option value="user3">user3</option>
          </select>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.headerTitle}>Real-Time Chat</h3>
            <p style={styles.headerSub}>
              Logged in as: <strong>{currentUserId}</strong>
            </p>
            <p style={styles.headerSub}>
              Talking to: <strong>{receiverId}</strong>
            </p>
          </div>
        </div>

        {socketError ? <div style={styles.errorBox}>{socketError}</div> : null}

        <div style={styles.messages}>
          {visibleMessages.length === 0 && (
            <div style={styles.emptyText}>
              No messages yet. Start chatting with {receiverId}.
            </div>
          )}

          {visibleMessages.map((msg, index) => (
            <div
              key={msg.id || index}
              style={
                msg.senderId === currentUserId
                  ? styles.userMessage
                  : styles.otherMessage
              }
            >
              <div style={styles.msgSender}>{msg.senderId}</div>
              <div>{msg.text}</div>
              <div style={styles.msgTime}>
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            </div>
          ))}

          {typingUser === receiverId && (
            <div style={styles.typingText}>{receiverId} is typing...</div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        <div style={styles.inputArea}>
          <input
            style={styles.input}
            type="text"
            placeholder={
              currentUserId === receiverId
                ? "Select another user to chat"
                : `Message ${receiverId}`
            }
            value={message}
            onChange={handleTypingChange}
            disabled={currentUserId === receiverId}
            onBlur={() =>
              socket.emit("stop_typing", {
                senderId: currentUserId,
                receiverId: receiverId,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          />
          <button
            style={{
              ...styles.button,
              ...(currentUserId === receiverId ? styles.disabledButton : {}),
            }}
            onClick={handleSend}
            disabled={currentUserId === receiverId}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "calc(100vh - 140px)",
    fontFamily: "Arial, sans-serif",
    background: "#f1f5f9",
  },

  sidebar: {
    width: "260px",
    background: "#1e293b",
    color: "white",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  sidebarTitle: {
    margin: 0,
    marginBottom: "10px",
  },

  user: {
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    background: "#334155",
    transition: "0.2s",
  },

  userActive: {
    background: "#475569",
    outline: "2px solid rgba(255,255,255,0.15)",
  },

  selfUser: {
    opacity: 0.9,
  },

  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
  },

  userSubText: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#cbd5e1",
  },

  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },

  currentUserBox: {
    marginTop: "20px",
    padding: "12px",
    background: "#0f172a",
    borderRadius: "10px",
  },

  label: {
    fontSize: "13px",
    marginBottom: "8px",
    color: "#cbd5e1",
  },

  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    outline: "none",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  header: {
    background: "white",
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
  },

  headerTitle: {
    margin: 0,
  },

  headerSub: {
    margin: "4px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "10px 16px",
    borderBottom: "1px solid #fecaca",
    fontSize: "14px",
    fontWeight: "bold",
  },

  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#e2e8f0",
  },

  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    marginTop: "20px",
  },

  userMessage: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "white",
    padding: "10px 14px",
    borderRadius: "14px 14px 4px 14px",
    maxWidth: "320px",
    wordBreak: "break-word",
  },

  otherMessage: {
    alignSelf: "flex-start",
    background: "white",
    color: "#0f172a",
    padding: "10px 14px",
    borderRadius: "14px 14px 14px 4px",
    maxWidth: "320px",
    wordBreak: "break-word",
  },

  msgSender: {
    fontSize: "11px",
    fontWeight: "bold",
    marginBottom: "4px",
    opacity: 0.8,
  },

  msgTime: {
    fontSize: "10px",
    marginTop: "6px",
    opacity: 0.75,
    textAlign: "right",
  },

  typingText: {
    fontSize: "13px",
    color: "#475569",
    fontStyle: "italic",
    marginTop: "4px",
  },

  inputArea: {
    display: "flex",
    gap: "10px",
    padding: "15px",
    background: "white",
    borderTop: "1px solid #e2e8f0",
  },

  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "14px",
  },

  button: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  disabledButton: {
    background: "#94a3b8",
    cursor: "not-allowed",
  },
};

export default Chat;