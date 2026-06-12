import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AppContent } from "../context/AppContext";

const AdminRoute = ({ children }) => {
  const { userData, loading } = useContext(AppContent);

  if (loading) return <div>Loading...</div>;

  // ยังไม่ได้ login
  if (!userData) {
    return <Navigate to="/" />;
  }

  // ไม่ใช่ admin
  if (userData.role?.name !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  // ✅ เป็น admin
  return children;
};

export default AdminRoute;
