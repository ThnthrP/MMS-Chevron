import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { WorkerAppContent } from "../../context/WorkerAppContext";

const NAV_ITEMS = [
  { path: "/worker", label: "หน้าหลัก", icon: "🏠", end: true },
  { path: "/worker/pending", label: "รอยืนยัน", icon: "⏳" },
  { path: "/worker/jobs", label: "งานของฉัน", icon: "💼" },
  { path: "/worker/leave", label: "ใบลา", icon: "📝" },
  { path: "/worker/me", label: "ของฉัน", icon: "👤" },
  { path: "/worker/history", label: "ประวัติ", icon: "📋" },
];

export default function WorkerLayout({ children }) {
  const { employee, logout, pendingCount } = useContext(WorkerAppContent); // ← เพิ่ม pendingCount
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!window.confirm("ยืนยันออกจากระบบ?")) return;
    await logout();
    navigate("/worker/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f8f9fa",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 900,
          background: "#fff",
          borderBottom: "1px solid #e9ecef",
          padding: "10px 16px",
          paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#212529" }}>
          {employee?.fullName || "Experteam Worker"}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            color: "#dc3545",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ออกจากระบบ
        </button>
      </div>

      <div style={{ flex: 1, paddingBottom: "64px" }}>{children}</div>

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #e9ecef",
          display: "flex",
          justifyContent: "space-around",
          padding: "6px 0",
          paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
          zIndex: 1000,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            style={({ isActive }) => ({
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              textDecoration: "none",
              color: isActive ? "#0d6efd" : "#6c757d",
              fontSize: "10px",
              fontWeight: isActive ? 700 : 500,
              padding: "4px 8px",
              flex: 1,
              position: "relative", // ← เพิ่ม เพื่อ position dot ได้
            })}
          >
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              {/* ← เพิ่ม dot ตรงนี้ เฉพาะแท็บ "รอยืนยัน" ที่มี pendingCount > 0 */}
              {item.path === "/worker/pending" && pendingCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#dc3545",
                    border: "1.5px solid #fff",
                  }}
                />
              )}
            </div>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
