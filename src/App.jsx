import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// ==== Pages ====

// Auth
import Login from "./Pages/Auth/Login";
import Register from "./Pages/Auth/Register";
import Logout from "./Pages/Auth/Logout";
import ForgotPass from "./Pages/Auth/ForgotPass.jsx";

// Dashboard
import Dashboard from "./Pages/Dashboard";

// User Personal
import UserTabs from "./Pages/User_Personal/User_Tabs.jsx";

// Entertainment
import AddMovies from "./Pages/Entertainment/AddMovies";
import AddSeries from "./Pages/Entertainment/AddSeries";
import Allcategories from "./Pages/Entertainment/Allcategories";
import Download from "./Pages/Entertainment/Download";
import Fevarate from "./Pages/Entertainment/Fevarate";
import LoadingSpiner from "./Pages/Entertainment/LoadingSpiner";
import Manage from "./Pages/Entertainment/Manage";
import MoviesManager from "./Pages/Entertainment/MoviesManager";
import Movies_SeriesTab from "./Pages/Entertainment/Movies_SeriesTab";
import SeriesManager from "./Pages/Entertainment/SeriesManager";
import AllList from "./Pages/Entertainment/AllList";

// Transaction
import TransactionDashboard from "./Pages/Transaction/TransactionDashboard";

// Documents
import DocumentTab from "./Pages/Document/DocumentTab.jsx";

// Work Details
import WorkDetails from "./Pages/WorkDetails/WorkDetails.jsx";

// Investment
import InvestmentTabs from "./Pages/Investment/InvestmentTabs.jsx";


// ✅ Private Route Wrapper
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
}


// ✅ App Routes
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <Routes>
      {/* Default Redirect */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPass />} />

      {/* Dashboard (protected) */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* User Tabs */}
      <Route path="/user-tabs" element={<PrivateRoute><UserTabs /></PrivateRoute>} />

      {/* Entertainment (protected) */}
      <Route path="/movies-series" element={<PrivateRoute><Movies_SeriesTab /></PrivateRoute>} />
      <Route path="/add-movies" element={<PrivateRoute><AddMovies /></PrivateRoute>} />
      <Route path="/add-series" element={<PrivateRoute><AddSeries /></PrivateRoute>} />
      <Route path="/allcategories" element={<PrivateRoute><Allcategories /></PrivateRoute>} />
      <Route path="/download" element={<PrivateRoute><Download /></PrivateRoute>} />
      <Route path="/fevarate" element={<PrivateRoute><Fevarate /></PrivateRoute>} />
      <Route path="/loading-spinner" element={<PrivateRoute><LoadingSpiner /></PrivateRoute>} />
      <Route path="/manage" element={<PrivateRoute><Manage /></PrivateRoute>} />
      <Route path="/movies-manager" element={<PrivateRoute><MoviesManager /></PrivateRoute>} />
      <Route path="/series-manager" element={<PrivateRoute><SeriesManager /></PrivateRoute>} />
      <Route path="/all-list" element={<PrivateRoute><AllList /></PrivateRoute>} />

      {/* Transaction */}
      <Route path="/transaction" element={<PrivateRoute><TransactionDashboard /></PrivateRoute>} />

      {/* Documents */}
      <Route path="/document" element={<PrivateRoute><DocumentTab /></PrivateRoute>} />

      {/* Work Details */}
      <Route path="/work-details" element={<PrivateRoute><WorkDetails /></PrivateRoute>} />

      {/* Investment */}
      <Route path="/investment" element={<PrivateRoute><InvestmentTabs /></PrivateRoute>} />

      {/* Logout */}
      <Route path="/logout" element={<Logout />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="text-center mt-5">
            <h2>404 - Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
          </div>
        }
      />
    </Routes>
  );
}


// ✅ App Wrapper
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
