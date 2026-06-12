import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AppContent } from "../context/AppContext";

const ProtectedRoute = ({ children, allowRoles }) => {
  const { isLoggedin, loading, userData } = useContext(AppContent);

  // รอ data
  if (loading || (isLoggedin && !userData)) {
    return <div>Loading...</div>;
  }

  // ยังไม่ login
  if (!isLoggedin) {
    return <Navigate to="/" />;
  }

  const userRole = userData?.role?.name;

  // เช็ค role
  if (allowRoles && !allowRoles.includes(userRole)) {
    return <Navigate to="/" />; // หรือ /unauthorized
  }

  return children;
};

export default ProtectedRoute;
