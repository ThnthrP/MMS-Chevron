import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { AppContent } from "../../context/AppContext";
import { APP_MENU } from "./sidebarMenu";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { userData } = useContext(AppContent);

  const role = userData?.role?.name;

  const isActive = (path) => {
    // Dashboard
    if (path === "/admin") {
      return location.pathname === "/admin";
    }

    // route อื่น ๆ
    return location.pathname === path;
  };

  const allow = (roles) => {
    if (!roles) return true;

    return roles.includes(role);
  };

  return (
    // <div className="w-64 h-screen bg-slate-900 text-white p-4 overflow-y-auto">
    // <div className="w-64 bg-slate-900 text-white p-4">

    <div className="w-64 h-screen bg-slate-900 text-white p-4 sticky top-0 overflow-y-auto">
      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-lg font-bold">MMS Panel</h2>

        <div className="text-xs mt-1 text-purple-400 font-semibold">
          🔧 Experteam
        </div>
      </div>

      {/* MENU */}
      {APP_MENU.map((group, idx) => {
        const filteredItems = group.items.filter((item) => allow(item.roles));

        if (filteredItems.length === 0) {
          return null;
        }

        return (
          <div key={idx} className="mb-6">
            <p className="text-xs text-gray-400 mb-2">{group.section}</p>

            <div className="flex flex-col gap-1">
              {filteredItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`text-left px-3 py-2 rounded transition ${
                    isActive(item.path) ? "bg-blue-600" : "hover:bg-slate-700"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Sidebar;
