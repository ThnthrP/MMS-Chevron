import React, { useContext, useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { roleLabel } from "../../utils/roles";

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { userData, backendUrl, setIsLoggedin, setUserData } =
    useContext(AppContent);

  const [openNotif, setOpenNotif] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const timeoutRef = useRef(null);
  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenUser(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenUser(false), 150);
  };

  // ── Notifications: fetch + polling ทุก 30 วินาที ──
  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/notifications`, {
        withCredentials: true,
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!userData) return; // ยังไม่ login ไม่ต้อง fetch
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s
    return () => clearInterval(interval);
  }, [userData, backendUrl]);

  // กดแจ้งเตือน → mark read (ไม่ต้องรอ) — การเปลี่ยนหน้าทำโดย <Link> เอง
  // จึงคลิกขวา / Ctrl+คลิก / คลิกล้อกลาง เปิดในแท็บใหม่ได้
  const markNotifRead = async (n) => {
    if (n.isRead) return;
    try {
      await axios.put(
        `${backendUrl}/api/notifications/${n.id}/read`,
        {},
        { withCredentials: true },
      );
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifClick = (e, n) => {
    markNotifRead(n);
    // คลิกปกติ → ปิด dropdown / Ctrl+คลิก (เปิดแท็บใหม่) → เปิดค้างไว้
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) setOpenNotif(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(
        `${backendUrl}/api/notifications/read-all`,
        {},
        {
          withCredentials: true,
        },
      );
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (dateStr) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} day ago`;
  };

  return (
    <div className="w-full flex justify-between items-center px-3 sm:px-6 py-3 bg-white shadow sticky top-0 z-40">
      {/* LEFT */}
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-1 hover:bg-gray-100 rounded-lg"
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>
        <Link
          to="/"
          className="font-bold text-lg text-inherit no-underline"
        >
          MMS
        </Link>
        <div className="text-sm bg-gray-100 px-3 py-1 rounded-full truncate">
          Experteam
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
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {openNotif && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white shadow-lg rounded-lg p-3 z-50 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications</p>
              ) : (
                notifications.map((n) => {
                  const cls = `block text-sm text-inherit no-underline p-2 hover:bg-gray-100 rounded cursor-pointer ${
                    !n.isRead ? "bg-blue-50" : ""
                  }`;
                  const body = (
                    <>
                      <p className="font-medium">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-gray-600">{n.message}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {timeAgo(n.createdAt)}
                      </p>
                    </>
                  );
                  // มีลิงก์ → <Link> (เปิดแท็บใหม่ได้) / ไม่มีลิงก์ → แค่ mark read
                  return n.link ? (
                    <Link
                      key={n.id}
                      to={n.link}
                      onClick={(e) => handleNotifClick(e, n)}
                      onAuxClick={() => markNotifRead(n)}
                      className={cls}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      key={n.id}
                      onClick={(e) => handleNotifClick(e, n)}
                      className={cls}
                    >
                      {body}
                    </div>
                  );
                })
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
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="relative w-9 h-9">
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white overflow-hidden">
                {userData?.employee?.photoUrl ? (
                  <img
                    src={`${backendUrl}${userData.employee.photoUrl}`}
                    alt={userData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userData?.name?.[0]?.toUpperCase()
                )}
              </div>

              {/* ลูกศรลง — บอกว่ามี dropdown แบบ Facebook */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm">
                <ChevronDown size={10} className="text-gray-600" />
              </div>
            </div>

            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-sm font-medium text-gray-800">
                {userData?.titlePrefix
                  ? `${userData.titlePrefix}${userData.name}`
                  : userData?.name}
              </span>
              <span className="text-xs text-gray-500">
                {roleLabel(userData)}
              </span>
            </div>
          </div>

          {openUser && (
            <div
              className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg p-2 w-44 z-50"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <p className="px-3 py-2 text-sm font-medium">
                {userData.titlePrefix
                  ? `${userData.titlePrefix}${userData.name}`
                  : userData.name}
              </p>
              <p className="px-3 py-1 text-xs text-gray-500">
                {roleLabel(userData)}
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
