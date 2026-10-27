import { useState, useEffect } from "react";

// ══════════════════════════════════════════════════════════
// การ์ด "HR confirmation" — ใช้ทั้งหน้ารายการ (RequestsHistory) และหน้ารายละเอียด (BookingDetail)
//   ยืนยัน → วันที่ที่ศูนย์อบรม / โรงพยาบาลให้จริง + สถานที่ + หมายเหตุ
//   ปฏิเสธ → เหตุผล
// rows: แถวรายคน (มี fullName, position, trainingName | checkType และอาจมี requestedStart / requestedEnd / provider ของคำขอ)
// batch: ข้อมูลคำขอ (ส่งมาจากหน้ารายละเอียด) — ถ้าไม่ส่ง ใช้ค่าจากแถวแรก
// onSave({ decision, confirmedStart, confirmedEnd, provider, note })
//   provider ว่าง = ใช้สถานที่ที่ผู้ขอระบุไว้ในแต่ละคำขอ (ผู้เรียกจัดการเอง)
// ══════════════════════════════════════════════════════════

const INPUT =
  "box-border h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[13px] outline-none focus:border-[#2B2F78]";
const LABEL = "mb-1 block text-[11px] font-semibold text-gray-600";

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtRange = (a, b) =>
  a ? `${fmtDay(a)}${b && fmtDay(b) !== fmtDay(a) ? ` – ${fmtDay(b)}` : ""}` : "";
export const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

export default function BookingDecisionModal({
  isTraining,
  rows,
  batch,
  initialDecision,
  onClose,
  onSave,
  saving,
}) {
  const first = rows[0] || {};
  const src = batch || first; // วันที่ / สถานที่ที่ผู้ขอระบุ
  const multiBatch = !batch && new Set(rows.map((r) => r.batchId)).size > 1;

  const [decision, setDecision] = useState(initialDecision || "confirmed");
  const [start, setStart] = useState(toYMD(first.confirmedStart || src.requestedStart));
  const [end, setEnd] = useState(toYMD(first.confirmedEnd || src.requestedEnd || src.requestedStart));
  const [provider, setProvider] = useState(
    first.confirmedProvider || (multiBatch ? "" : src.provider || ""),
  );
  const [note, setNote] = useState(rows.length === 1 ? first.hrNote || "" : "");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const dateError = start && end && end < start ? "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม" : "";
  const ready = !saving && (decision === "rejected" || !dateError);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-6"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        className="w-full max-w-[460px] overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <span className="text-[15px] font-bold">HR confirmation — {rows.length} คน</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-lg leading-none text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 max-h-[140px] overflow-y-auto rounded-md border border-gray-200">
            {rows.map((r) => {
              const rs = batch || r;
              const when = fmtRange(rs.requestedStart, rs.requestedEnd);
              return (
                <div key={r.itemId} className="border-b border-gray-100 px-3 py-1.5 text-xs last:border-b-0">
                  <b className="text-[13px]">{r.fullName}</b>{" "}
                  <span className="text-gray-500">{r.position || ""}</span>
                  <div className="text-gray-500">
                    {isTraining ? r.trainingName : r.checkType}
                    {when && ` · ขอ ${when}`}
                    {rs.provider && ` · ${rs.provider}`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
            {[
              ["confirmed", isTraining ? "✓ Confirm — ศูนย์อบรมรับแล้ว" : "✓ Confirm — ได้วันนัดแล้ว"],
              ["rejected", "✕ Reject"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setDecision(k)}
                className={`cursor-pointer rounded-md border-none px-2 py-2 text-xs font-semibold ${
                  decision === k
                    ? k === "confirmed"
                      ? "bg-white text-[#198754] shadow"
                      : "bg-white text-[#dc3545] shadow"
                    : "bg-transparent text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {decision === "confirmed" && (
            <>
              <div className="mb-1 text-[11px] text-gray-500">
                วันที่ยืนยัน — แก้ได้ถ้า{isTraining ? "ศูนย์อบรม" : "โรงพยาบาล"}ให้วันอื่น
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>{isTraining ? "วันเริ่มอบรม" : "วันนัดตรวจ"}</label>
                  <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>ถึง</label>
                  <input
                    type="date"
                    value={end}
                    min={start || undefined}
                    onChange={(e) => setEnd(e.target.value)}
                    className={`${INPUT} ${dateError ? "border-red-400" : ""}`}
                  />
                </div>
              </div>
              {dateError && <div className="-mt-2 mb-2 text-[11px] text-red-600">{dateError}</div>}
              <label className={LABEL}>
                {isTraining ? "ศูนย์อบรม / สถานที่" : "โรงพยาบาล / คลินิก"}
                {multiBatch && (
                  <span className="font-normal text-gray-400"> (เว้นว่าง = ใช้ที่ผู้ขอระบุในแต่ละคำขอ)</span>
                )}
              </label>
              <input value={provider} onChange={(e) => setProvider(e.target.value)} className={`${INPUT} mb-3`} />
            </>
          )}

          <label className={LABEL}>{decision === "rejected" ? "เหตุผล (แจ้งผู้ขอ)" : "หมายเหตุถึงผู้ขอ"}</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decision === "rejected" ? "เช่น รอบนี้เต็ม รอรอบเดือนหน้า" : "เช่น ได้ที่นั่งแล้ว รายงานตัว 07:30"}
            className={INPUT}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-md border border-gray-200 bg-white px-4 py-2 text-[13px] hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              onSave({
                decision,
                confirmedStart: start || null,
                confirmedEnd: end || start || null,
                provider,
                note,
              })
            }
            className={`cursor-pointer rounded-md border-none px-5 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${
              decision === "rejected" ? "bg-[#dc3545] hover:bg-[#bb2d3b]" : "bg-[#198754] hover:bg-[#157347]"
            }`}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
