import React from "react";
// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import pages
import Dashboard from "./Pages/Dashboard";
import Login from "./Pages/Auth/Login";
import Register from "./Pages/Auth/Register";
import Logout from "./Pages/Auth/Logout";
import ForgotPass from "./Pages/Auth/ForgotPass.jsx";

// Entertainment pages
import AddMovies from "./Pages/Entertainment/AddMovies";
import AddSeries from "./Pages/Entertainment/AddSeries";
import Allcategories from "./Pages/Entertainment/Allcategories";
import Download from "./Pages/Entertainment/Download";
import Fevarate from "./Pages/Entertainment/Fevarate";
import LoadingSpiner from "./Pages/Entertainment/LoadingSpiner";
import Manage from "./Pages/Entertainment/Manage";
import Movies_SeriesTab from "./Pages/Entertainment/Movies_SeriesTab";
import AllList from "./Pages/Entertainment/AllList";

// Transaction pages
import TransactionDashboard from "./Pages/Transaction/TransactionDashboard";

// Document pages
import DocumentTab from "./Pages/Document/DocumentTab.jsx";

// Work Details pages
import WorkDetails from "./Pages/WorkDetails/WorkDetails.jsx";

// Investment pages
import InvestmentTabs from "./Pages/Investment/InvestmentTabs.jsx";

import UserTabs from "./Pages/User_Personal/User_Tabs.jsx";


// ✅ Private Route Wrapper
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>; // show loader until context is ready
  }

  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <Routes>
      {/* Default route → always go to login if not logged in */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

      {/* Auth Routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* 🔐 Forgot Password (PUBLIC) */}
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/dashboard" replace /> : <ForgotPass />}
      />

      {/* Dashboard (protected) */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      
     <Route
          path="/user-tabs"
          element={
            <PrivateRoute>
              <UserTabs />
            </PrivateRoute>
          }
        />

      {/* Entertainment Routes (protected) */}
      <Route
        path="/movies-series"
        element={
          <PrivateRoute>
            <Movies_SeriesTab />
          </PrivateRoute>
        }
      />
      <Route
        path="/add-movies"
        element={
          <PrivateRoute>
            <AddMovies />
          </PrivateRoute>
        }
      />
      <Route
        path="/add-series"
        element={
          <PrivateRoute>
            <AddSeries />
          </PrivateRoute>
        }
      />
      <Route
        path="/allcategories"
        element={
          <PrivateRoute>
            <Allcategories />
          </PrivateRoute>
        }
      />
      <Route
        path="/download"
        element={
          <PrivateRoute>
            <Download />
          </PrivateRoute>
        }
      />
      <Route
        path="/fevarate"
        element={
          <PrivateRoute>
            <Fevarate />
          </PrivateRoute>
        }
      />
      <Route
        path="/loading-spinner"
        element={
          <PrivateRoute>
            <LoadingSpiner />
          </PrivateRoute>
        }
      />
      <Route
        path="/manage"
        element={
          <PrivateRoute>
            <Manage />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/all-list"
        element={
          <PrivateRoute>
            <AllList />
          </PrivateRoute>
        }
      />

      {/* Transaction (protected) */}
      <Route
        path="/transaction"
        element={
          <PrivateRoute>
            <TransactionDashboard />
          </PrivateRoute>
        }
      />

      {/* Document (protected) */}
      <Route
        path="/document"
        element={
          <PrivateRoute>
            <DocumentTab />
          </PrivateRoute>
        }
      />

      {/* Work Details (protected) */}
      <Route
        path="/work-details"
        element={
          <PrivateRoute>
            <WorkDetails />
          </PrivateRoute>
        }
      />

      {/* Investment (protected) */}
      <Route
        path="/investment"
        element={
          <PrivateRoute>
            <InvestmentTabs />
          </PrivateRoute>
        }
      />

      {/* Logout */}
      <Route path="/logout" element={<Logout />} />

      {/* Fallback 404 */}
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
