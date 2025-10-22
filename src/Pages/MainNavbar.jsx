// src/components/MainNavbar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Nav, Container, Button, Image } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const MainNavbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [isCompact, setIsCompact] = useState(false); // shrink on scroll

  // Fetch admin data (name + profile)
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/admin/get-names-and-profiles",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.admins && res.data.admins.length > 0) {
          setAdmin(res.data.admins[0]);
        }
      } catch (err) {
        console.error("Error fetching admin info:", err);
      }
    };
    fetchAdmin();
  }, []);

  // Scroll-aware compact navbar
  useEffect(() => {
    const onScroll = () => setIsCompact(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleUserPersonalTab = () => {
    navigate("/user-tabs", { replace: true });  // Navigating to User_Tabs.jsx
  };

  return (
    <div>
      {/* ✨ Animated Top Strip */}
      <div className="top-strip" />

      {/* Navbar */}
      <Navbar
        expand="lg"
        fixed="top"
        className={`custom-navbar ${isCompact ? "is-compact" : ""}`}
        variant="dark"
      >
        <Container fluid>
          {/* Brand */}
          <Navbar.Brand
            href="#"
            className="d-flex align-items-center gap-3 brand-link"
          >
            {admin?.profile_photo ? (
              <div className="avatar-wrap" aria-hidden="true">
                <Image
                  src={`data:image/jpeg;base64,${admin.profile_photo}`}
                  roundedCircle
                  width={90}
                  height={90}
                  alt="Profile"
                  className="avatar"
                />
                <span className="avatar-ring" />
              </div>
            ) : (
              <div className="avatar-placeholder" aria-hidden="true">
                <div className="avatar-initial">
                  {(admin?.admin_name?.[0] || "A").toUpperCase()}
                </div>
                <span className="avatar-ring" />
              </div>
            )}

            <div className="brand-text">
              <h2 className="navbar-heading" aria-label="App name">
                <span className="grad">MY_APP</span>
                <span className="shimmer" aria-hidden="true" />
              </h2>
              {admin?.admin_name && (
                <p className="admin-name" title={admin.admin_name}>
                  {admin.admin_name}
                </p>
              )}
            </div>
          </Navbar.Brand>

          {/* Mobile toggle */}
          <Navbar.Toggle aria-controls="mainnav-collapse" className="toggle" />

          <Navbar.Collapse id="mainnav-collapse">
            <Nav className="ms-auto d-flex align-items-center gap-3 nav-right">
              {/* Professional tagline */}
              <Navbar.Text className="tagline-text">
                <span className="grad-text">"Your Information • Your Power • Seamlessly Organized"</span>
              </Navbar.Text>

              {/* User Personal Tab Button */}
              <Button
                variant="info"
                className="personal-tab-button"
                onClick={handleUserPersonalTab}
              >
                User Personal Tab
              </Button>

              {/* Logout button */}
              <Button
                variant="danger"
                className="logout-button-pro"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Nav>
          </Navbar.Collapse>

          {/* Styles */}
          <style>{`
            /* Tagline */
            .tagline-text {
              font-size: 1.1rem;
              font-weight: 600;
              white-space: nowrap;
            }
            .grad-text {
              background: linear-gradient(90deg, #ff6b6b, #ffb347, #ff6b6b);
              background-size: 200% 200%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: gradFlow 6s linear infinite;
            }
            @keyframes gradFlow {
              0% { background-position: 0% 50%; }
              100% { background-position: 200% 50%; }
            }

            /* Premium Logout Button */
            .logout-button-pro {
              font-weight: 700;
              border-radius: 30px;
              padding: 10px 26px;
              border: none;
              background: linear-gradient(135deg, #ff4d4d, #d62828);
              color: #fff;
              box-shadow: 0 6px 18px rgba(214, 40, 40, 0.4);
              transition: all 0.3s ease;
            }
            .logout-button-pro:hover {
              background: linear-gradient(135deg, #ff2e2e, #b22222);
              transform: translateY(-2px);
              box-shadow: 0 8px 22px rgba(214, 40, 40, 0.55);
            }
            .logout-button-pro:active {
              transform: translateY(0);
              box-shadow: 0 4px 12px rgba(214, 40, 40, 0.4);
            }

            /* User Personal Tab Button */
            .personal-tab-button {
              font-weight: 700;
              border-radius: 30px;
              padding: 10px 26px;
              border: none;
              background: linear-gradient(135deg, #3498db, #2ecc71);
              color: #fff;
              box-shadow: 0 6px 18px rgba(52, 152, 219, 0.4);
              transition: all 0.3s ease;
            }
            .personal-tab-button:hover {
              background: linear-gradient(135deg, #2980b9, #27ae60);
              transform: translateY(-2px);
              box-shadow: 0 8px 22px rgba(52, 152, 219, 0.55);
            }
            .personal-tab-button:active {
              transform: translateY(0);
              box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
            }
          `}</style>
        </Container>
      </Navbar>

      {/* Styles */}
      <style>{`
        :root {
          --nav-bg-1: #151528;
          --nav-bg-2: #1a1a2e;
          --nav-bg-3: #22223b;
          --yellow: #f1c40f;
          --accent: #9b59b6;
          --cyan: #34d0ff;
          --emerald: #2ecc71;
          --danger: #e74c3c;
        }

        /* ✨ Top Animated Strip */
        .top-strip {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 6px;
          z-index: 1200;
          background: linear-gradient(90deg, #f1c40f, #e67e22, #e74c3c, #9b59b6, #3498db, #2ecc71);
          background-size: 300% 100%;
          animation: moveGradient 6s linear infinite;
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, .35));
        }
        @keyframes moveGradient { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }

        /* Navbar Container */
        .custom-navbar {
          margin-top: 6px;
          background: linear-gradient(135deg, var(--nav-bg-1) 0%, var(--nav-bg-2) 60%, var(--nav-bg-3) 100%);
          padding: 14px 20px;
          transition: padding 0.25s ease, box-shadow 0.25s ease, backdrop-filter 0.25s ease, background 0.35s ease;
          box-shadow: 0 10px 26px rgba(0, 0, 0, .35);
          border-bottom: 1px solid rgba(255, 255, 255, .06);
          backdrop-filter: blur(6px);
          position: sticky;
        }
        .custom-navbar.is-compact {
          padding: 8px 20px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, .45);
          backdrop-filter: blur(10px);
          background: linear-gradient(135deg, rgba(21, 21, 40, .96), rgba(26, 26, 46, .96), rgba(34, 34, 59, .96));
        }

        /* Brand link (no underline) */
        .custom-navbar a,
        .brand-link,
        .brand-link * {
          text-decoration: none !important;
          color: inherit;
        }

        /* Brand Heading */
        .navbar-heading {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: .6px;
          margin: 0;
          line-height: 1.1;
          position: relative;
          display: inline-flex;
          align-items: center;
          text-shadow: 0 1px 0 rgba(0, 0, 0, .25);
        }
        .navbar-heading .grad {
          background: linear-gradient(90deg, var(--yellow), var(--cyan), var(--emerald));
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradShift 6.5s ease-in-out infinite;
        }
        @keyframes gradShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

        /* Subtle shimmer line */
        .navbar-heading .shimmer {
          position: absolute;
          left: -10%;
          top: 0;
          height: 100%;
          width: 38%;
          background: linear-gradient(100deg, transparent 0%, rgba(255, 255, 255, .18) 50%, transparent 100%);
          transform: skewX(-12deg);
          animation: shimmerMove 3.2s ease-in-out infinite;
          border-radius: 6px;
        }
        @keyframes shimmerMove { 0% { left: -20%; } 100% { left: 120%; } }

        .admin-name {
          font-size: .92rem;
          color: var(--yellow);
          margin: 2px 0 0 0;
          opacity: .95;
        }
        .developer-name {
          font-size: 1.05rem;
          color: #ffffff;
          font-weight: 700;
          opacity: .95;
        }

        /* Avatar styles */
        .avatar-wrap,
        .avatar-placeholder {
          position: relative;
          width: 90px;
          height: 90px;
        }
        .avatar {
          width: 90px;
          height: 90px;
          object-fit: cover;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, .15);
          box-shadow: 0 8px 18px rgba(0, 0, 0, .35);
        }
        .avatar-placeholder {
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: radial-gradient(120px at 30% 30%, rgba(255, 255, 255, .12), rgba(255, 255, 255, .04));
          border: 2px dashed rgba(255, 255, 255, .18);
          color: #fff;
        }
        .avatar-initial {
          font-size: 1.6rem;
          font-weight: 900;
          color: #fff;
          opacity: .9;
        }
        /* Animated ring around avatar */
        .avatar-ring {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          background: conic-gradient(from 0deg, var(--cyan), var(--emerald), var(--yellow), var(--cyan));
          mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
          animation: spin 6s linear infinite;
          filter: blur(.35px) drop-shadow(0 0 8px rgba(52, 208, 255, .18));
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Right side */
        .nav-right {
          gap: 16px;
        }
        .toggle {
          border: 1px solid rgba(255, 255, 255, .2);
          padding: 6px 10px;
          border-radius: 10px;
          transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .toggle:focus {
          box-shadow: none;
        }
        .toggle:focus-visible {
          outline: 2px solid rgba(255, 255, 255, .35);
          outline-offset: 2px;
        }
        .toggle:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, .05);
        }

        /* Logout Button */
        .logout-button {
          font-weight: 700;
          border-radius: 28px;
          padding: 9px 22px;
          border-width: 2px;
          background-color: var(--danger);
          color: #fff;
          border-color: rgba(255, 255, 255, .15);
          transition: transform .22s ease, box-shadow .22s ease, background-color .22s ease;
          box-shadow: 0 10px 22px rgba(231, 76, 60, .25);
        }
        .logout-button:hover {
          background-color: #c0392b;
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(231, 76, 60, .32);
        }
        .logout-button:active {
          transform: translateY(0);
        }

        /* Responsive */
        @media (max-width: 992px) {
          .navbar-heading {
            font-size: 1.75rem;
          }
          .avatar,
          .avatar-wrap,
          .avatar-placeholder {
            width: 72px;
            height: 72px;
          }
          .avatar-ring {
            inset: -5px;
          }
        }
        @media (max-width: 768px) {
          .navbar-heading {
            font-size: 1.6rem;
          }
          .admin-name {
            font-size: .85rem;
          }
          .developer-name {
            font-size: .95rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MainNavbar;
