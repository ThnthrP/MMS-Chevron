import React, { useState, useCallback } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

// ══════════════════════════════════════════════════════════
// โครงหน้า:
//   ┌──────────── Navbar (เต็มความกว้าง สูง 48px) ────────────┐
//   ├─ Sidebar ─┬──────────── เนื้อหา ─────────────────────────┤
//   └───────────┴──────────────────────────────────────────────┘
// มือถือ: Sidebar ซ่อน — กดปุ่ม ☰ บน Navbar เพื่อเปิด
// พื้นเนื้อหาเป็นสีขาว (ไม่ต้องห่อทุกอย่างเป็น card) · Sidebar สีเทาอ่อนให้ตัดกัน
// จอใหญ่: ปุ่ม Collapse ใน Sidebar ย่อเหลือแต่ icon (จำค่าไว้ในเบราว์เซอร์)
// ══════════════════════════════════════════════════════════

const COLLAPSE_KEY = "sidebar_collapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // มือถือ
  const [collapsed, setCollapsed] = useState(readCollapsed); // จอใหญ่

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className="flex">
        <Sidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <main className="min-w-0 flex-1 p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
