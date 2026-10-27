import { Link } from "react-router-dom";
// ============================================================
// calendarShared.jsx — ของที่ใช้ร่วมกันระหว่าง
//   ProjectsOverview.jsx (Manpower Calendar — รายการ)
//   ProjectCalendarDetail.jsx (Manpower Calendar — รายละเอียด)
// ============================================================

// สีของแต่ละสถานะขั้นตอน
export const STAGE_STYLE = {
  done: {
    dot: "bg-emerald-500 text-white border-emerald-500",
    text: "text-emerald-700",
    line: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-800",
  },
  current: {
    dot: "bg-[#F16726] text-white border-[#F16726] ring-4 ring-orange-100",
    text: "text-[#c2410c] font-bold",
    line: "bg-gray-200",
    badge: "bg-orange-100 text-[#c2410c]",
  },
  fail: {
    dot: "bg-red-600 text-white border-red-600 ring-4 ring-red-100",
    text: "text-red-700 font-bold",
    line: "bg-gray-200",
    badge: "bg-red-100 text-red-700",
  },
  // ไม่มีรายการให้บันทึก (เช่น Travel Booking ที่ไม่ได้จองผ่านระบบ) — ข้ามไป ไม่นับเป็นขั้นปัจจุบัน
  skip: {
    dot: "bg-gray-50 text-gray-400 border-gray-300 border-dashed",
    text: "text-gray-400",
    line: "bg-emerald-400",
    badge: "bg-gray-100 text-gray-500",
  },
  todo: {
    dot: "bg-white text-gray-400 border-gray-300",
    text: "text-gray-400",
    line: "bg-gray-200",
    badge: "bg-gray-100 text-gray-500",
  },
};

// แต่ละขั้นทำที่หน้าไหน — กดชื่อขั้นใน timeline เพื่อไปหน้านั้น (Worker Confirm ทำใน Worker App → ไม่มีลิงก์)
export const stageLink = (key, projectId) => {
  if (!projectId) return null;
  switch (key) {
    case "requirement":
      return `/projects/${projectId}`;
    case "assign":
    case "approval":
      return `/allocation?projectId=${projectId}`;
    case "training":
      return "/requests-history";
    case "briefing":
    case "travel":
    case "hangar":
    case "onsite":
    case "demob":
      return `/mobilization?projectId=${projectId}`;
    case "evaluated":
      return "/review";
    default:
      return null;
  }
};

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtShort = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "—";

export const projectCode = (p) => p?.masterProjectRecord?.projectCode || null;

// ป้ายขั้นตอนปัจจุบัน (ใช้ในตาราง)
export function StageBadge({ stage }) {
  if (!stage)
    return (
      <span className={`${STAGE_STYLE.done.badge} whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold`}>
        ✓ Complete
      </span>
    );
  const st = STAGE_STYLE[stage.state] || STAGE_STYLE.current;
  return (
    <span className="inline-flex flex-col">
      <span className={`${st.badge} w-fit whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold`}>
        {stage.state === "fail" ? "✕ " : "● "}
        {stage.label}
      </span>
      {stage.note && (
        <span className="mt-0.5 text-[10px] text-gray-500">{stage.note}</span>
      )}
    </span>
  );
}

// จุดขั้นตอนแบบย่อ (ใช้ในตาราง) — ชี้แล้วเห็นชื่อขั้น
export function StageDots({ stages = [] }) {
  return (
    <div className="flex items-center gap-[3px]">
      {stages.map((s) => (
        <span
          key={s.key}
          title={`${s.label}${s.note ? ` — ${s.note}` : ""}`}
          className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
            STAGE_STYLE[s.state]?.dot.replace(/ring-\S+/g, "") || ""
          }`}
        />
      ))}
    </div>
  );
}

// Timeline ขั้นตอนแนวนอน (หน้ารายละเอียด)
export function StageStepper({ stages = [], projectId }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="mb-2 text-right text-[10px] text-gray-400">
        ชี้ที่ขั้นเพื่อดูว่าทำที่ไหน · กดชื่อขั้นเพื่อไปหน้านั้น
      </div>
      <ol className="flex min-w-[880px] items-start">
        {stages.map((s, i) => {
          const st = STAGE_STYLE[s.state] || STAGE_STYLE.todo;
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center px-1 text-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-[14px] h-0.5 w-full ${
                    // เส้นเขียว = ทุกขั้นก่อนหน้าผ่าน (หรือข้าม) แล้ว
                    stages.slice(0, i).every((x) => ["done", "skip"].includes(x.state))
                      ? STAGE_STYLE.done.line
                      : STAGE_STYLE.todo.line
                  }`}
                />
              )}
              <span
                title={s.hint || s.iso || ""}
                className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${st.dot}`}
              >
                {s.state === "done" ? "✓" : s.state === "fail" ? "✕" : s.state === "skip" ? "–" : i + 1}
              </span>
              {stageLink(s.key, projectId) ? (
                <Link
                  to={stageLink(s.key, projectId)}
                  title={s.hint || s.iso || ""}
                  className={`mt-1.5 text-[11px] leading-tight no-underline decoration-dotted underline-offset-2 hover:underline ${st.text}`}
                >
                  {i + 1}. {s.label}
                </Link>
              ) : (
                <span title={s.hint || s.iso || ""} className={`mt-1.5 cursor-help text-[11px] leading-tight ${st.text}`}>
                  {i + 1}. {s.label}
                </span>
              )}
              {s.note && (
                <span className="mt-0.5 text-[10px] leading-tight text-gray-500">
                  {s.note}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
