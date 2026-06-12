import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useContext } from "react";
import { AppContent } from "../../context/AppContext";

const Layout = ({ children }) => {
  const { userData } = useContext(AppContent);

  return (
    // 💡 เติม min-h-screen เพื่อให้ความสูงขั้นต่ำเต็มหน้าจอเสมอ
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar role={userData?.role?.name} />

      <div className="flex-1">
        <Navbar />

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Layout;