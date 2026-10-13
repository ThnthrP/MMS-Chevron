import React, { useContext, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppContent } from "../../context/AppContext";
import { APP_MENU } from "./sidebarMenu";

// ใช้ <Link> (แท็ก <a href>) แทน <button onClick={navigate}>
// → คลิกขวา "เปิดในแท็บใหม่", Ctrl/Cmd+คลิก, คลิกล้อกลาง ใช้ได้ตามปกติของเบราว์เซอร์
// → คลิกซ้ายธรรมดายังเป็น SPA navigation เหมือนเดิม (ไม่โหลดหน้าใหม่)

const Sidebar = ({ open = false, onClose = () => {} }) => {
  const location = useLocation();

  const { userData } = useContext(AppContent);

  const role = userData?.role?.name;

  // กด Esc ปิดเมนู (เฉพาะตอนเปิดอยู่)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  // ปิดเมนูหลังเลือก (มือถือ) — เฉพาะคลิกซ้ายธรรมดา
  // ถ้า Ctrl/Cmd/Shift+คลิก (เปิดแท็บ/หน้าต่างใหม่) ไม่ต้องปิดเมนูในแท็บนี้
  const handleNav = (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    onClose();
  };

  return (
    <>
      {/* ฉากหลังมืด — มือถือเท่านั้น กดแล้วปิดเมนู */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[45] md:hidden"
          onClick={onClose}
        />
      )}

      {/* ชั้นนอก: คุมตำแหน่ง + การเลื่อน — ห้ามมี overflow ไม่งั้นแถบ ‹ ถูกตัด */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-56 shrink-0 h-screen bg-slate-800 text-white
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:sticky md:top-0 md:bottom-auto md:translate-x-0 md:z-auto`}
      >
        {/* แถบเก็บเมนู — ยื่นออกทางขวา มือถือเท่านั้น (เป็น action ไม่ใช่ลิงก์ → คงเป็น button) */}
        {open && (
          <button
            type="button"
            onClick={onClose}
            aria-label="ซ่อนเมนู"
            title="ซ่อนเมนู"
            className="absolute -right-9 top-3 z-10 flex h-10 w-9 cursor-pointer items-center justify-center rounded-r-lg border-none bg-slate-800 text-xl leading-none text-white shadow-[3px_2px_6px_rgba(0,0,0,0.25)] transition-colors hover:bg-slate-700 md:hidden"
          >
            ‹
          </button>
        )}

        {/* ชั้นใน: หัวตรึงไว้ด้านบน + รายการเมนู scroll แยก (แบบ sidebar ของ Claude) */}
        <div className="flex h-full flex-col">
          {/* HEADER — ไม่ scroll ตาม กดแล้วกลับหน้าแรก
              (PE → PE Approvals, role อื่น → Dashboard ผ่าน HomeRoute) */}
          <Link
            to="/"
            onClick={handleNav}
            title="กลับหน้าแรก"
            className="block shrink-0 px-4 pb-3 pt-3 text-left text-white no-underline transition-opacity hover:opacity-80"
          >
            <h2 className="text-base font-bold">MMS Panel</h2>
            <div className="mt-0.5 text-xs font-semibold text-purple-400">
              🔧 Experteam
            </div>
          </Link>

          {/* MENU — scroll เฉพาะส่วนนี้ */}
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]">
            {APP_MENU.map((group, idx) => {
              const filteredItems = group.items.filter((item) =>
                allow(item.roles),
              );
              if (filteredItems.length === 0) return null;

              return (
                <div key={idx} className="mb-3">
                  <p className="mb-1 px-1 text-[11px] uppercase tracking-wide text-gray-400">
                    {group.section}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {filteredItems.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={handleNav}
                          aria-current={active ? "page" : undefined}
                          className={`block rounded px-3 py-1.5 text-left text-sm no-underline transition ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-transparent text-gray-200 hover:bg-slate-700 hover:text-white"
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
