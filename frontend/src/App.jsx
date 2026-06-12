import { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { AppContent } from "./context/AppContext";

import Login from "./pages/auth/Login";
import Profile from "./pages/auth/Profile";
import ResetPassword from "./pages/auth/ResetPassword";

import ProtectedRoute from "./components/ProtectedRoute";

import AppRouter from "./routes/AppRouter";

const App = () => {
  const { isLoggedin, loading, userData } = useContext(AppContent);

  useEffect(() => {
    console.log("userData:", userData);
    console.log("isLoggedin:", isLoggedin);
    console.log("role:", userData?.role);
    console.log("loading:", loading);
  }, [userData, isLoggedin, loading]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <ToastContainer />

      <Routes>
        {/* Root */}
        <Route
          path="/"
          element={
            isLoggedin ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Main App */}
        <Route path="/admin/*" element={<AppRouter />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
