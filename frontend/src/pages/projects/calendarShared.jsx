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
  todo: {
    dot: "bg-white text-gray-400 border-gray-300",
    text: "text-gray-400",
    line: "bg-gray-200",
    badge: "bg-gray-100 text-gray-500",
  },
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
export function StageStepper({ stages = [] }) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[980px] items-start">
        {stages.map((s, i) => {
          const st = STAGE_STYLE[s.state] || STAGE_STYLE.todo;
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center px-1 text-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-[14px] h-0.5 w-full ${
                    STAGE_STYLE[stages[i - 1].state === "done" ? "done" : "todo"].line
                  }`}
                />
              )}
              <span
                className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${st.dot}`}
              >
                {s.state === "done" ? "✓" : s.state === "fail" ? "✕" : i + 1}
              </span>
              <span className={`mt-1.5 text-[11px] leading-tight ${st.text}`}>
                {i + 1}. {s.label}
              </span>
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
