import { useContext } from "react";
import { Routes, Route } from "react-router-dom";

import { AppContent } from "../context/AppContext";

import Layout from "../components/layout/Layout";
import ProtectedRoute from "../components/ProtectedRoute";

import AdminDashboard from "../pages/dashboard/AdminDashboard";

import AdminUsers from "../pages/admin/AdminUsers";

import TrainingMatrix from "../pages/training/TrainingMatrix";
import Workers from "../pages/workers/Workers";
import AddWorker from "../pages/workers/AddWorker";
import ComplianceDashboard from "../pages/compliance/ComplianceDashboard";
import Project from "../pages/projects/Project";
import Allocation from "../pages/projects/Allocation";

import WorkerDetail from "../pages/workers/WorkerDetail";
import EditWorker from "../pages/workers/EditWorker";

import ProjectDetail from "../pages/projects/ProjectDetail";
import EditProject from "../pages/projects/EditProject";

import ManagePositions from "../pages/positions/ManagePositions";
import MatrixEditor from "../pages/positions/MatrixEditor";
import ManageDivisions from "../pages/positions/ManageDivisions";

import Mobilization from "../pages/projects/Mobilization";
import PostProjectReview from "../pages/projects/PostProjectReview";

import AnalyticsReports from "../pages/projects/AnalyticsReports";

const AppRouter = () => {
  const { userData } = useContext(AppContent);

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<AdminDashboard />} />
          {/* Training Matrix */}
          <Route
            path="/training-matrix"
            element={
              <ProtectedRoute
                allowRoles={["admin", "hr", "manpower", "pe", "expert"]}
              >
                <TrainingMatrix />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "safety",
                  "pe",
                  "expert",
                ]}
              >
                <Workers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/add"
            element={
              <ProtectedRoute allowRoles={["admin", "hr", "manpower"]}>
                <AddWorker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/:id"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "safety",
                  "pe",
                  "expert",
                ]}
              >
                <WorkerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/:id/edit"
            element={
              <ProtectedRoute allowRoles={["admin", "hr", "manpower"]}>
                <EditWorker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "safety",
                  "nurse",
                  "pe",
                ]}
              >
                <ComplianceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute
                allowRoles={["admin", "hr", "manpower", "pe", "expert"]}
              >
                <Project />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute
                allowRoles={["admin", "hr", "manpower", "pe", "expert"]}
              >
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/edit"
            element={
              <ProtectedRoute
                allowRoles={["admin", "hr", "manpower", "pe", "expert"]}
              >
                <EditProject />
              </ProtectedRoute>
            }
          />

          <Route
            path="/allocation"
            element={
              <ProtectedRoute
                allowRoles={["admin", "hr", "manpower", "pe", "expert"]}
              >
                <Allocation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/positions"
            element={
              <ProtectedRoute allowRoles={["admin", "hr", "manpower"]}>
                <ManagePositions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/positions/matrix"
            element={
              <ProtectedRoute allowRoles={["admin", "hr", "manpower"]}>
                <MatrixEditor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mobilization"
            element={
              <ProtectedRoute allowRoles={["admin", "manpower"]}>
                <Mobilization />
              </ProtectedRoute>
            }
          />

          <Route
            path="/review"
            element={
              <ProtectedRoute allowRoles={["admin", "manpower"]}>
                <PostProjectReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowRoles={["admin", "manpower"]}>
                <AnalyticsReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/divisions"
            element={
              <ProtectedRoute allowRoles={["admin"]}>
                <ManageDivisions />
              </ProtectedRoute>
            }
          />

          {/* User Management */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowRoles={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
};

export default AppRouter;
