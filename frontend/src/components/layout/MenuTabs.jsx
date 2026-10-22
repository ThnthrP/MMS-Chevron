import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppContent } from "../../context/AppContext";
import { findMenuEntry, visibleTabs } from "./sidebarMenu";

// ══════════════════════════════════════════════════════════
// แท็บด้านบนของหน้า — สลับระหว่างหน้าที่อยู่ใต้เมนูเดียวกัน
// เช่น Assign Names = [Assign Names | PE Approvals]
// แสดงเฉพาะเมนูที่ user เข้าได้ ≥ 2 แท็บ และเฉพาะหน้าหลักของแท็บ
// (หน้าลูก เช่น /workers/:id ไม่แสดง — มีปุ่ม Back ของหน้านั้นอยู่แล้ว)
// ══════════════════════════════════════════════════════════
export default function MenuTabs() {
  const { pathname } = useLocation();
  const { userData } = useContext(AppContent);

  const entry = findMenuEntry(pathname);
  if (!entry || entry.tab.path !== pathname) return null;

  const tabs = visibleTabs(entry.item, userData);
  if (tabs.length < 2) return null;

  return (
    <div className="mx-auto mb-3 w-full max-w-[1800px]">
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => {
          const active = t.path === pathname;
          return (
            <Link
              key={t.path}
              to={t.path}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2 text-[13px] no-underline transition ${
                active
                  ? "border-[#F16726] font-semibold text-[#c2410c]"
                  : "border-transparent font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
              }`}
            >
              {t.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
