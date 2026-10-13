import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { WorkerAppContent } from "../context/WorkerAppContext";

const WorkerProtectedRoute = ({ children }) => {
  const { isLoggedin, loading } = useContext(WorkerAppContent);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedin) {
    return <Navigate to="/worker/login" />;
  }

  return children;
};

export default WorkerProtectedRoute;
