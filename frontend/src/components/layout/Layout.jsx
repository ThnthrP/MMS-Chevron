import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useState } from "react";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-w-0 = ตัวแก้หลัก: ให้ flex item หดได้ ไม่โดนตารางดันให้กว้าง */}
      <div className="flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-3 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
