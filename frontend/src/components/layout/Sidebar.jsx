import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  X,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";

import { AppContent } from "../../context/AppContext";
import { APP_MENU, findMenuEntry, visibleTabs } from "./sidebarMenu";

// ══════════════════════════════════════════════════════════
// Sidebar — พื้นเทาอ่อน ตัดกับเนื้อหาพื้นขาว · อยู่ใต้ Navbar (โลโก้ + MMS System ย้ายไปอยู่ที่ Navbar แล้ว)
//   • ช่องค้นหาเมนู (ค้นทั้งชื่อเมนูและชื่อแท็บ เช่น "PE Approvals")
//   • กดชื่อ section เพื่อพับ/กาง · ปุ่ม Collapse all / Expand all
//   • ปุ่ม Collapse = ย่อเหลือแต่ icon (จำค่าไว้ในเบราว์เซอร์)
//   • มือถือ: เลื่อนออกมาทับหน้า (open / onClose จาก Layout)
//
// ใช้ <Link> (แท็ก <a href>) → คลิกขวา "เปิดในแท็บใหม่", Ctrl/Cmd+คลิก ใช้ได้ปกติ
// ══════════════════════════════════════════════════════════

const ITEM_BASE =
  "group flex items-center gap-2.5 rounded-md py-1.5 text-[13px] no-underline transition";
const ITEM_ACTIVE = "bg-white font-semibold text-[#c2410c] shadow-[inset_3px_0_0_#F16726]";
const ITEM_IDLE = "text-gray-700 hover:bg-gray-200/70 hover:text-gray-900";

const SECTIONS_KEY = "sidebar_collapsed_sections";

const readSet = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SECTIONS_KEY) || "[]"));
  } catch {
    return new Set();
  }
};
const writeSet = (s) => {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

const Sidebar = ({
  open = false,
  onClose = () => {},
  collapsed = false,
  onToggleCollapsed = () => {},
}) => {
  const location = useLocation();
  const { userData } = useContext(AppContent);
  const [q, setQ] = useState("");
  const [closedSections, setClosedSections] = useState(readSet);

  // มือถือแสดงเต็มเสมอ — ย่อเหลือ icon เฉพาะจอ md ขึ้นไป
  const rail = collapsed && !open;

  // กด Esc ปิดเมนู (มือถือ)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // เมนูที่หน้าปัจจุบันอยู่ใต้ (รวมหน้าลูก เช่น /workers/:id → Worker Pool)
  const currentItem = findMenuEntry(location.pathname)?.item;

  const handleNav = (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    setQ("");
    onClose();
  };

  // เมนูที่ role เข้าได้ + กรองตามคำค้น
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return APP_MENU.map((group) => {
      const items = group.items
        .map((item) => ({ item, tabs: visibleTabs(item, userData) }))
        .filter(({ tabs }) => tabs.length > 0)
        .map(({ item, tabs }) => {
          if (!term) return { item, tabs, hit: null };
          if (item.name.toLowerCase().includes(term)) return { item, tabs, hit: null };
          // ค้นเจอที่ชื่อแท็บ → ลิงก์ไปแท็บนั้นตรงๆ
          const tab = tabs.find((t) => t.name.toLowerCase().includes(term));
          return tab ? { item, tabs, hit: tab } : null;
        })
        .filter(Boolean);
      return { section: group.section, items };
    }).filter((g) => g.items.length > 0);
  }, [q, userData]);

  const searching = q.trim() !== "";
  const allClosed = groups.length > 0 && groups.every((g) => closedSections.has(g.section));

  const toggleSection = (name) => {
    const next = new Set(closedSections);
    next.has(name) ? next.delete(name) : next.add(name);
    setClosedSections(next);
    writeSet(next);
  };
  const toggleAll = () => {
    const next = allClosed ? new Set() : new Set(groups.map((g) => g.section));
    setClosedSections(next);
    writeSet(next);
  };

  return (
    <>
      {/* ฉากหลังมืด — มือถือเท่านั้น */}
      {open && (
        <div className="fixed inset-0 top-12 z-[45] bg-black/40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-12 z-50 flex shrink-0 flex-col border-r border-gray-200 bg-[#f6f7f9]
          transition-[transform,width] duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          ${rail ? "w-14" : "w-60"}
          md:sticky md:top-12 md:z-30 md:self-start md:h-[calc(100vh-3rem)] md:translate-x-0`}
      >
        {/* ── ค้นหาเมนู ── */}
        {rail ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="ค้นหาเมนู"
            className="mx-auto mt-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          >
            <Search size={15} />
          </button>
        ) : (
          <div className="shrink-0 px-3 pt-3">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 focus-within:border-[#F16726]">
              <Search size={14} className="shrink-0 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQ("")}
                placeholder="ค้นหาเมนู…"
                className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  title="ล้าง"
                  className="flex cursor-pointer border-none bg-transparent p-0 text-gray-400 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── รายการเมนู (scroll เฉพาะส่วนนี้) ── */}
        <nav
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pt-2 [scrollbar-width:thin] ${
            rail ? "px-2" : "px-3"
          }`}
        >
          {groups.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-gray-400">ไม่พบเมนู “{q}”</div>
          )}
          {groups.map((group, idx) => {
            const closed = !searching && !rail && closedSections.has(group.section);
            return (
              <div key={group.section || idx} className={idx > 0 ? "mt-2" : ""}>
                {rail ? (
                  idx > 0 && <div className="mx-1 mb-2 border-t border-gray-200" />
                ) : (
                  group.section && (
                    <button
                      type="button"
                      onClick={() => toggleSection(group.section)}
                      className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
                    >
                      {group.section}
                      <ChevronDown
                        size={13}
                        className={`transition-transform ${closed ? "-rotate-90" : ""}`}
                      />
                    </button>
                  )
                )}
                {!closed && (
                  <div className="flex flex-col gap-0.5">
                    {group.items.map(({ item, tabs, hit }) => {
                      const active = currentItem === item;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={(hit || tabs[0]).path}
                          onClick={handleNav}
                          title={rail ? item.name : undefined}
                          aria-current={active ? "page" : undefined}
                          className={`${ITEM_BASE} ${rail ? "justify-center px-0" : "px-2.5"} ${
                            active ? ITEM_ACTIVE : ITEM_IDLE
                          }`}
                        >
                          {Icon && (
                            <Icon
                              size={17}
                              strokeWidth={1.9}
                              className={`shrink-0 ${active ? "text-[#F16726]" : "text-gray-500 group-hover:text-gray-700"}`}
                            />
                          )}
                          {!rail && (
                            <span className="min-w-0 truncate">
                              {item.name}
                              {hit && (
                                <span className="ml-1 text-[11px] font-normal text-gray-400">› {hit.name}</span>
                              )}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── ปุ่มด้านล่าง ── */}
        <div
          className={`flex shrink-0 gap-1.5 border-t border-gray-200 p-2 ${rail ? "flex-col items-center" : ""}`}
        >
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={rail ? "ขยายเมนู" : "ย่อเมนูเหลือแต่ไอคอน"}
            className={`hidden cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white py-1.5 text-xs text-gray-600 hover:bg-gray-50 md:flex ${
              rail ? "w-9" : "flex-1"
            }`}
          >
            {rail ? <ChevronsRight size={15} /> : <><ChevronsLeft size={14} /> Collapse</>}
          </button>
          {!rail && (
            <button
              type="button"
              onClick={toggleAll}
              disabled={searching}
              title={allClosed ? "กางทุก section" : "พับทุก section"}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
            >
              {allClosed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
              {allClosed ? "Expand all" : "Collapse all"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
