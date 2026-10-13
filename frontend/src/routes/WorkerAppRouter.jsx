import { useContext } from "react";
import { Routes, Route } from "react-router-dom";

import { WorkerAppContent } from "../context/WorkerAppContext";
import WorkerProtectedRoute from "../components/WorkerProtectedRoute";
import WorkerLayout from "../components/worker-layout/WorkerLayout";

import WorkerLogin from "../pages/worker/WorkerLogin";
import WorkerForceChangePin from "../pages/worker/WorkerForceChangePin";
import WorkerHome from "../pages/worker/WorkerHome";
import WorkerPendingConfirmation from "../pages/worker/WorkerPendingConfirmation";
import WorkerMyJobs from "../pages/worker/WorkerMyJobs";
import WorkerLeave from "../pages/worker/WorkerLeave";
import WorkerReadiness from "../pages/worker/WorkerReadiness";
import WorkerHistory from "../pages/worker/WorkerHistory";

// ยังใช้ PIN ที่ HR ตั้งให้ → แสดงหน้าตั้ง PIN ใหม่แทนทุกหน้าในแอป
// (ไม่ redirect ไป path อื่น — URL เดิมคงอยู่ ตั้ง PIN เสร็จแล้วเห็นหน้าที่ตั้งใจเปิดทันที)
function MustChangePinGate({ children }) {
  const { mustChangePin } = useContext(WorkerAppContent);
  if (mustChangePin) return <WorkerForceChangePin />;
  return children;
}

const WorkerAppRouter = () => {
  return (
    <Routes>
      {/* ตัด "/worker" ออก — App.jsx จับคู่ path="/worker/*" ให้แล้ว
          ตรงนี้รับแค่ path ที่เหลือ (เช่น "/login") */}
      <Route path="login" element={<WorkerLogin />} />

      <Route
        path="*"
        element={
          <WorkerProtectedRoute>
            <MustChangePinGate>
              <WorkerLayout>
                <Routes>
                  <Route path="/" element={<WorkerHome />} />
                  <Route
                    path="pending"
                    element={<WorkerPendingConfirmation />}
                  />
                  <Route path="jobs" element={<WorkerMyJobs />} />
                  <Route path="leave" element={<WorkerLeave />} />
                  <Route path="me" element={<WorkerReadiness />} />
                  <Route path="history" element={<WorkerHistory />} />
                </Routes>
              </WorkerLayout>
            </MustChangePinGate>
          </WorkerProtectedRoute>
        }
      />
    </Routes>
  );
};

export default WorkerAppRouter;
