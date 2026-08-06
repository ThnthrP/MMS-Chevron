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
    if (path === "/") {
      return location.pathname === "/";
    }

    // route อื่น ๆ
    return location.pathname === path;
  };

  const allow = (roles) => {
    if (!roles) return true;

    return roles.includes(role);
  };

  return (
    <div className="w-56 h-screen bg-slate-800 text-white px-3 py-3 sticky top-0 overflow-y-auto">
      {/* HEADER */}
      <div className="mb-4 px-1">
        <h2 className="text-base font-bold">MMS Panel</h2>

        <div className="text-xs mt-0.5 text-purple-400 font-semibold">
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
          <div key={idx} className="mb-3">
            <p className="text-[11px] text-gray-400 mb-1 px-1 uppercase tracking-wide">
              {group.section}
            </p>

            <div className="flex flex-col gap-0.5">
              {filteredItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`text-left px-3 py-1.5 rounded text-sm transition ${
                    isActive(item.path)
                      ? "bg-blue-600"
                      : "hover:bg-slate-700 text-gray-200"
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
