import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Perform logout
    logout();

    // Redirect after short delay (optional)
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 500);

    return () => clearTimeout(timer);
  }, [logout, navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <h2 className="text-lg font-semibold text-gray-700">Logging out...</h2>
    </div>
  );
};

export default Logout;
