// ══════════════════════════════════════════════════════════
// การ์ดงานของ Worker App — ใช้ร่วมกันระหว่างหน้า "รอยืนยัน" และ "งานของฉัน"
// รูปแบบตามตัวอย่าง CES: หัวการ์ด = ON Number + badge, ด้านล่าง = ตาราง 2 คอลัมน์
// ══════════════════════════════════════════════════════════

// D-MOB = MOB + 28 วัน (ค่าเดียวกับหน้า Mobilization ฝั่ง admin)
export const DEMOB_DAYS = 28;

const addDays = (date, days) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
};

const daysBetween = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round((db - da) / 86400000);
};

// วิธีเดินทางขาไป — ค่าเดียวกับ enum TravelMode ใน schema.prisma
const TRAVEL_LABEL = {
  boat: "🚢 เรือ",
  helicopter: "🚁 เฮลิคอปเตอร์",
  vehicle: "🚐 รถ",
  other: "อื่นๆ",
};

// เหลือกี่วันก่อนถึงกำหนดตอบกลับ (นับถึงสิ้นวันของ deadline)
function deadlineInfo(deadline) {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  const days = Math.ceil((end - Date.now()) / 86400000) - 1;
  if (days < 0) return { text: "เลยกำหนดแล้ว", tone: "text-red-600" };
  if (days === 0) return { text: "ภายในวันนี้", tone: "text-red-600" };
  if (days <= 2) return { text: `อีก ${days} วัน`, tone: "text-amber-700" };
  return { text: `อีก ${days} วัน`, tone: "text-gray-800" };
}

// "14 ส.ค. 69" — แบบเดียวกับตัวอย่าง CES
export const fmtShortTH = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
};

/**
 * รวมข้อมูลที่การ์ดต้องใช้จาก project / position / assignment
 * - มี assignment (deploy แล้ว) → ใช้วัน MOB / D-MOB ที่ admin บันทึกไว้จริง
 * - ยังไม่มี → MOB = วันเริ่ม project, D-MOB = MOB + 28 วัน
 */
export function buildJobInfo({
  project,
  position,
  assignment,
  isOffshore,
  responseDeadline, // กำหนดตอบรับของงานนี้ (backend คำนวณจากวันที่ approve)
}) {
  const actual = !!(assignment?.mobDate || assignment?.demobDate);
  const mobDate = assignment?.mobDate || project?.startDate || null;
  const demobDate =
    assignment?.demobDate || (mobDate ? addDays(mobDate, DEMOB_DAYS) : null);
  const rotation =
    mobDate && demobDate ? daysBetween(mobDate, demobDate) : null;

  return {
    onNumber: project?.masterProjectRecord?.projectCode || null,
    projectName: project?.name || "",
    clientName: project?.contract?.client?.name || "",
    location: project?.location || "",
    // isOffshore อาจมาจาก job (หน้า detail) หรือจาก project
    isOffshore: isOffshore ?? project?.isOffshore,
    positionName: position?.name || "—",
    mobDate,
    demobDate,
    rotation,
    platform: assignment?.platform || "",
    travelMode: project?.travelMode || null,
    responseDeadline: responseDeadline || null,
    actualDates: actual,
  };
}

function Cell({ label, children, tone = "text-gray-800", sub }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className={`break-words text-sm font-semibold ${tone}`}>
        {children}
      </div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

/**
 * info     = ผลจาก buildJobInfo()
 * onClick  = มี → ทั้งการ์ดกดได้ + แสดงแถบ "แตะเพื่อดูรายละเอียด" ด้านล่าง
 * children = ส่วนเสริมใต้ตาราง (คำเตือน, ปุ่ม, สถานะ)
 */
// showDeadline = แสดงช่อง "ตอบกลับใน" (ใช้เฉพาะหน้ารอยืนยัน — งานที่ยืนยันแล้วไม่ต้องแสดง)
export default function JobCard({
  info,
  onClick,
  tapHint,
  showDeadline = false,
  children,
}) {
  const deadline = showDeadline ? deadlineInfo(info.responseDeadline) : null;

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`block w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm ${
        onClick ? "cursor-pointer transition-colors hover:border-blue-300" : ""
      }`}
    >
      <div className="p-4">
        {/* หัวการ์ด: ON Number + Offshore/Onshore บรรทัดเดียวกัน */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-all text-base font-bold text-gray-900">
            {info.onNumber || info.projectName || "—"}
          </span>
          {info.isOffshore !== undefined && info.isOffshore !== null && (
            <span
              className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                info.isOffshore
                  ? "border-blue-200 bg-blue-50 text-blue-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {info.isOffshore ? "⚓ Offshore" : "🏗 Onshore"}
            </span>
          )}
        </div>

        {/* ชื่อ project (ถ้าหัวการ์ดแสดง ON Number อยู่) */}
        {info.onNumber && info.projectName && (
          <div className="mt-0.5 break-words text-sm text-gray-700">
            {info.projectName}
          </div>
        )}
        {(info.clientName || info.location) && (
          <div className="mt-0.5 text-xs text-gray-500">
            {[info.clientName, info.location].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* ตารางรายละเอียด 2 คอลัมน์ */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3">
          <Cell label="ตำแหน่ง">{info.positionName}</Cell>
          <Cell label="รอบงาน">
            {info.rotation != null ? `${info.rotation} วัน` : "—"}
          </Cell>
          <Cell label="MOB">{fmtShortTH(info.mobDate)}</Cell>
          <Cell label="DEMOB">{fmtShortTH(info.demobDate)}</Cell>
          {/* แถวที่ 3 ตามแบบ CES: ขาไป / ตอบกลับใน — แสดงเมื่อมีข้อมูล */}
          {/* ขาไป แสดงเสมอ — ไม่ได้ระบุ = "—" (ช่องจะได้ไม่เลื่อนไปมาระหว่างการ์ด) */}
          <Cell
            label="ขาไป"
            tone={info.travelMode ? "text-gray-800" : "text-gray-400"}
          >
            {info.travelMode
              ? TRAVEL_LABEL[info.travelMode] || info.travelMode
              : "—"}
          </Cell>
          {deadline && (
            <Cell
              label="ตอบกลับใน"
              tone={deadline.tone}
              sub={`ภายใน ${fmtShortTH(info.responseDeadline)}`}
            >
              {deadline.text}
            </Cell>
          )}
          {info.platform && <Cell label="แท่น">{info.platform}</Cell>}
        </div>

        {children && <div className="mt-3">{children}</div>}
      </div>

      {onClick && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
          <span>{tapHint || "แตะเพื่อดูรายละเอียด"}</span>
          <span className="text-base leading-none text-gray-400">›</span>
        </div>
      )}
    </Wrapper>
  );
}
