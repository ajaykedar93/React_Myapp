import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const AUTH_KEY = "auth"; // store user + token together (best practice)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // admin/user object
  const [token, setToken] = useState("");     // JWT token
  const [loading, setLoading] = useState(true);

  // ✅ Rehydrate from localStorage on app start (refresh / reopen tab)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setUser(saved?.user || null);
        setToken(saved?.token || "");
      } else {
        // if you already had old storage "user" + "token"
        const legacyUser = localStorage.getItem("user");
        const legacyToken = localStorage.getItem("token");
        if (legacyUser) setUser(JSON.parse(legacyUser));
        if (legacyToken) setToken(legacyToken);
      }
    } catch (e) {
      // if storage is corrupted, clear it
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setToken("");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Login: store user + token in state + localStorage
  const login = (data) => {
    const t = data?.token || "";
    const u = data?.user
      ? data.user
      : {
          user_id: data?.user_id,
          admin_name: data?.admin_name,
          role: data?.role,
          email: data?.email,
        };

    setUser(u);
    setToken(t);

    // store in one object
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, token: t }));

    // optional: keep legacy keys if other files use them
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("token", t);
  };

  // ✅ Logout: clear state + storage (ONLY then token should be removed)
  const logout = () => {
    setUser(null);
    setToken("");

    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isLoggedIn: !!token,
      login,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}