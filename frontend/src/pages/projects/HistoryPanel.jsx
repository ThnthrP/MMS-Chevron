import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// ประวัติของ requirement — timeline แยกตามวัน (จาก Audit Log)
// ใช้ในหน้า Manpower Calendar › รายละเอียด
// ══════════════════════════════════════════════════════════

const CATS = [
  ["all", "ทั้งหมด"],
  ["team", "จัดทีม"],
  ["docs", "เอกสาร / แก้ไข"],
  ["status", "สถานะ / อนุมัติ"],
];
const CAT_STYLE = {
  team: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700", label: "จัดทีม" },
  docs: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700", label: "เอกสาร / แก้ไข" },
  status: { dot: "bg-[#F16726]", chip: "bg-orange-50 text-[#c2410c]", label: "สถานะ / อนุมัติ" },
};

const dayKey = (d) => new Date(d).toDateString();
const fmtDay = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function HistoryPanel({ projectId, onClose }) {
  const { backendUrl } = useContext(AppContent);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${backendUrl}/api/supervisor/projects-overview/${projectId}/history`, {
        withCredentials: true,
      })
      .then((res) => setItems(res.data))
      .catch((err) => {
        console.error(err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [backendUrl, projectId]);

  const count = (k) => (k === "all" ? items.length : items.filter((i) => i.category === k).length);
  const shown = useMemo(
    () => (cat === "all" ? items : items.filter((i) => i.category === cat)),
    [items, cat],
  );

  // จัดกลุ่มตามวัน (ใหม่ → เก่า)
  const groups = [];
  for (const it of shown) {
    const k = dayKey(it.at);
    if (!groups.length || groups[groups.length - 1].key !== k) groups.push({ key: k, at: it.at, items: [] });
    groups[groups.length - 1].items.push(it);
  }

  return (
    <div className="rounded-[10px] border border-gray-200 bg-white 2xl:sticky 2xl:top-16">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-[13px] font-bold">🕘 ประวัติ</span>
        <button
          type="button"
          onClick={onClose}
          title="ซ่อนประวัติ"
          className="cursor-pointer border-none bg-transparent text-base leading-none text-gray-400 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {CATS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setCat(k)}
            className={`cursor-pointer whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] ${
              cat === k
                ? "border-blue-600 bg-blue-600 font-bold text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label} {count(k)}
          </button>
        ))}
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-3">
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">ยังไม่มีประวัติ</div>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="mb-3">
              <div className="my-2 flex justify-center">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-[11px] text-gray-600">
                  {fmtDay(g.at)}
                </span>
              </div>
              <ol className="relative ml-[46px] border-l border-gray-200">
                {g.items.map((it) => {
                  const st = CAT_STYLE[it.category] || CAT_STYLE.docs;
                  return (
                    <li key={it.id} className="relative mb-2.5 pl-4">
                      <span className="absolute -left-[46px] top-1.5 w-9 text-right text-[10px] text-gray-500">
                        {fmtTime(it.at)}
                      </span>
                      <span className={`absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${st.dot}`} />
                      <div className="rounded-lg border border-gray-200 px-3 py-2 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <div className="break-words" title={it.raw ? `Audit Log: ${it.raw}` : undefined}>
                          {it.actor && <b>{it.actor} · </b>}
                          {it.summary}
                          {it.changes > 0 && (
                            <span className="text-gray-400"> ({it.changes} ช่อง)</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.chip}`}>
                            {st.label}
                          </span>
                          {it.role && <span className="text-[10px] text-gray-400">👤 {it.role}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
