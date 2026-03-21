import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = "http://localhost:5000";
const socket = io(API);

export default function Chat() {

  const user = JSON.parse(localStorage.getItem("chatUser"));

  const [users, setUsers] = useState([]);
  const [receiver, setReceiver] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const bottomRef = useRef(null);

  /* ---------------- GET USERS ---------------- */

  useEffect(() => {

    axios.get(`${API}/api/chat-auth/users`)
      .then(res => {

        const filtered = res.data.users.filter(u => u._id !== user.id);
        setUsers(filtered);

      });

  }, []);

  /* ---------------- SOCKET JOIN ---------------- */

  useEffect(() => {

    socket.emit("join", user.id);

    socket.on("receive_message", data => {
      setMessages(prev => [...prev, data]);
    });

    socket.on("online_users", users => {
      setOnlineUsers(users);
    });

  }, []);

  /* ---------------- SEND MESSAGE ---------------- */

  const sendMessage = () => {

    if (!message.trim() || !receiver) return;

    const msg = {
      senderId: user.id,
      receiverId: receiver._id,
      text: message,
      messageType: "text"
    };

    socket.emit("send_message", msg);

    setMessages(prev => [...prev, msg]);

    setMessage("");

  };

  /* ---------------- AUTO SCROLL ---------------- */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- UI ---------------- */

  return (

    <div style={styles.page}>

      {/* SIDEBAR */}

      <div style={styles.sidebar}>

        <div style={styles.sidebarHeader}>
          Chats
        </div>

        {users.map(u => (

          <div
            key={u._id}
            style={{
              ...styles.userItem,
              background: receiver?._id === u._id ? "#eef2ff" : ""
            }}
            onClick={() => {
              setReceiver(u);
              setMessages([]);
            }}
          >

            <div style={styles.avatar}>
              {u.name[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>

              <div style={styles.userName}>
                {u.name}
              </div>

              <div style={styles.userEmail}>
                {u.email}
              </div>

            </div>

            {onlineUsers.includes(u._id) && (
              <div style={styles.onlineDot}></div>
            )}

          </div>

        ))}

      </div>

      {/* CHAT AREA */}

      <div style={styles.chatArea}>

        {receiver ? (

          <>
          
          {/* CHAT HEADER */}

          <div style={styles.chatHeader}>
            <div style={styles.avatar}>
              {receiver.name[0]}
            </div>

            <div>

              <div style={styles.chatName}>
                {receiver.name}
              </div>

              <div style={styles.chatStatus}>
                {onlineUsers.includes(receiver._id) ? "Online" : "Offline"}
              </div>

            </div>

          </div>

          {/* MESSAGES */}

          <div style={styles.messages}>

            {messages.map((msg, i) => {

              const mine = msg.senderId === user.id;

              return (

                <div
                  key={i}
                  style={{
                    ...styles.message,
                    alignSelf: mine ? "flex-end" : "flex-start",
                    background: mine ? "#2563eb" : "#e2e8f0",
                    color: mine ? "#fff" : "#000"
                  }}
                >
                  {msg.text}
                </div>

              );

            })}

            <div ref={bottomRef}></div>

          </div>

          {/* INPUT */}

          <div style={styles.inputBox}>

            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type message..."
              style={styles.input}
            />

            <button
              style={styles.sendBtn}
              onClick={sendMessage}
            >
              Send
            </button>

          </div>

          </>

        ) : (

          <div style={styles.empty}>
            Select a user to start chatting
          </div>

        )}

      </div>

    </div>

  );

}

const styles = {

  page: {
    height: "100vh",
    display: "flex",
    fontFamily: "Arial"
  },

  sidebar: {
    width: "320px",
    borderRight: "1px solid #e2e8f0",
    overflowY: "auto",
    background: "#f8fafc"
  },

  sidebarHeader: {
    padding: "16px",
    fontWeight: "700",
    borderBottom: "1px solid #e2e8f0"
  },

  userItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9"
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700"
  },

  userName: {
    fontWeight: "600"
  },

  userEmail: {
    fontSize: "12px",
    color: "#64748b"
  },

  onlineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#22c55e"
  },

  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },

  chatHeader: {
    padding: "14px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0"
  },

  chatName: {
    fontWeight: "600"
  },

  chatStatus: {
    fontSize: "12px",
    color: "#64748b"
  },

  messages: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    gap: "10px",
    overflowY: "auto",
    background: "#f1f5f9"
  },

  message: {
    maxWidth: "60%",
    padding: "10px 14px",
    borderRadius: "10px"
  },

  inputBox: {
    display: "flex",
    padding: "12px",
    gap: "10px",
    borderTop: "1px solid #e2e8f0"
  },

  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1"
  },

  sendBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer"
  },

  empty: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#64748b"
  }

};