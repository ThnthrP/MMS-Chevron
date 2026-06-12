import React, { useContext, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { Bell, Search } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const { userData, backendUrl, setIsLoggedin, setUserData } =
    useContext(AppContent);

  const [openNotif, setOpenNotif] = useState(false);
  const [openUser, setOpenUser] = useState(false);

  const company = localStorage.getItem("company");

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      await axios.post(`${backendUrl}/api/auth/logout`);

      setIsLoggedin(false);
      setUserData(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.log(error);
    }
  };

  //   let timeoutId = null;
  const timeoutRef = useRef(null);

  const handleEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpenUser(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenUser(false);
    }, 150);
  };

  // 🔥 mock notification (เดี๋ยวค่อยต่อ backend)
  const notifications = [
    { id: 1, text: "Worker training completed", time: "5 min ago" },
    { id: 2, text: "New manpower request", time: "10 min ago" },
  ];

  return (
    // <div className="w-full flex justify-between items-center px-6 py-3 bg-white shadow sticky top-0 z-50">
    <div className="w-full flex justify-between items-center px-6 py-3 bg-white shadow sticky top-0 z-40">
      {/* LEFT */}
      <div className="flex items-center gap-6">
        {/* LOGO / TITLE */}
        <div
          className="font-bold text-lg cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          MMS
        </div>

        {/* COMPANY */}
        <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
          {company || "No Company"}
        </div>

        {/* SEARCH */}
        <div className="hidden md:flex items-center bg-gray-100 px-3 py-1 rounded-lg">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none px-2 text-sm"
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* 🔔 NOTIFICATION */}
        <div className="relative">
          <button
            onClick={() => setOpenNotif(!openNotif)}
            className="relative p-2 hover:bg-gray-100 rounded-full"
          >
            <Bell size={20} />

            {/* badge */}
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
              {notifications.length}
            </span>
          </button>

          {/* dropdown */}
          {openNotif && (
            <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg p-3 z-50">
              <p className="font-semibold mb-2">Notifications</p>

              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="text-sm p-2 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <p>{n.text}</p>
                    <p className="text-xs text-gray-400">{n.time}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 👤 USER */}
        <div
          className="relative"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {/* avatar */}
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white cursor-pointer">
            {userData?.name?.[0]?.toUpperCase()}
          </div>

          {/* dropdown */}
          {openUser && (
            <div
              className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg p-2 w-44 z-50"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <p className="px-3 py-2 text-sm font-medium">{userData.name}</p>

              <p className="px-3 py-1 text-xs text-gray-500">
                {userData.role?.name}
              </p>

              <hr className="my-2" />

              <button
                onClick={() => navigate("/profile")}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Profile
              </button>

              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-500 rounded"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
