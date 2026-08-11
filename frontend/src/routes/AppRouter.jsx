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
import ManageTrainings from "../pages/training/ManageTrainings";

import Mobilization from "../pages/projects/Mobilization";
import PostProjectReview from "../pages/projects/PostProjectReview";

import AnalyticsReports from "../pages/projects/AnalyticsReports";

import Certifications from "../pages/compliance/Certifications";

import TrainingRequestDetail from "../pages/compliance/TrainingRequestDetail";
import TrainingRequestHistory from "../pages/compliance/TrainingRequestHistory";

import SupervisorOverview from "../pages/projects/SupervisorOverview";

const AppRouter = () => {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          {/* Dashboard — ตรงกับ sidebarMenu.js section MAIN */}
          <Route
            path="/"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "pe",
                  "pe_head",
                  "hr",
                  "manpower",
                  "safety",
                  "nurse",
                  "ta",
                  "bd",
                  "expert",
                  "supervisor",
                  "executive",
                  "manager",
                ]}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Training Matrix */}
          <Route
            path="/training-matrix"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "pe",
                  "pe_head",
                  "expert",
                ]}
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
                  "pe_head",
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
                  "pe_head",
                  "expert",
                ]}
              >
                <ComplianceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certifications"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "safety",
                  "nurse",
                  "pe",
                  "pe_head",
                  "expert",
                ]}
              >
                <Certifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/training-requests-history"
            element={
              <ProtectedRoute allowRoles={["admin", "hr"]}>
                <TrainingRequestHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/training-requests/:id"
            element={
              <ProtectedRoute>
                <TrainingRequestDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "pe",
                  "pe_head",
                  "expert",
                ]}
              >
                <Project />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "manpower",
                  "pe",
                  "expert",
                  "supervisor",
                  "executive",
                  "manager",
                  "pe_head",
                ]}
              >
                <ProjectDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id/edit"
            element={
              <ProtectedRoute allowRoles={["admin", "pe"]}>
                <EditProject />
              </ProtectedRoute>
            }
          />

          <Route
            path="/allocation"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "manpower",
                  "hr",
                  "pe",
                  "pe_head",
                  "expert",
                ]}
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
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "manpower",
                  "hr",
                  "pe",
                  "pe_head",
                  "safety",
                  "nurse",
                  "ta",
                ]}
              >
                <Mobilization />
              </ProtectedRoute>
            }
          />

          <Route
            path="/review"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "hr",
                  "pe",
                  "pe_head",
                  "manpower",
                  "supervisor",
                  "executive",
                  "manager",
                  "bd",
                ]}
              >
                <PostProjectReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "pe_head",
                  "bd",
                  "manager",
                  "manpower",
                  "hr",
                  "pe",
                  "executive",
                  "supervisor",
                ]}
              >
                <AnalyticsReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/supervisor-overview"
            element={
              <ProtectedRoute
                allowRoles={[
                  "admin",
                  "supervisor",
                  "executive",
                  "manager",
                  "pe_head",
                  "manpower",
                  "hr",
                  "pe",
                  "bd",
                ]}
              >
                <SupervisorOverview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/divisions"
            element={
              <ProtectedRoute allowRoles={["admin", "hr", "manpower"]}>
                <ManageDivisions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainings"
            element={
              <ProtectedRoute allowRoles={["admin", "hr", "manpower"]}>
                <ManageTrainings />
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
