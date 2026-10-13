import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const CARD =
  "mb-6 overflow-hidden rounded-[10px] border border-gray-200 bg-white";
const CARD_HEADER =
  "border-b border-gray-200 px-4 py-4 text-[15px] font-bold sm:px-5";
const TH =
  "sticky top-0 z-[1] bg-gray-50 px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 sm:px-5";
const TD = "px-4 py-2.5 sm:px-5";
const HIDE_MOBILE = "hidden sm:table-cell";

// รายชื่อคนที่ถูกข้าม (ไม่มี MP Code / มี PIN แล้ว)
function SkippedList({ title, tone, items }) {
  if (!items?.length) return null;
  return (
    <div className={CARD}>
      <div className={`${CARD_HEADER} ${tone}`}>{title}</div>
      <div className="max-h-[260px] overflow-y-auto px-4 py-4 text-[13px] sm:px-5">
        {items.map((s, i) => (
          <div key={i} className="text-gray-500">
            {s.empCode} — {s.fullName}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BulkSetPin() {
  const { backendUrl } = useContext(AppContent);

  const [includeExisting, setIncludeExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { results, skippedNoEmpId, skippedHasPin }
  const [exported, setExported] = useState(false);

  // PIN แสดงได้ครั้งเดียว (backend เก็บแค่ hash) — ถ้าปิดหน้า/รีเฟรชก่อน export
  // PIN ชุดนี้จะหายถาวร ต้องรีเซ็ตใหม่ทั้งหมด → เตือนก่อนออกจากหน้า
  const hasUnsavedPins = !!result?.results?.length && !exported;

  useEffect(() => {
    if (!hasUnsavedPins) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedPins]);

  const handleGenerate = async () => {
    if (
      hasUnsavedPins &&
      !window.confirm(
        "⚠️ PIN ชุดปัจจุบันยังไม่ได้ Export — ถ้าเริ่มใหม่ รายการ PIN บนหน้าจอจะหายและดูย้อนหลังไม่ได้อีก ดำเนินการต่อ?",
      )
    )
      return;

    const confirmMsg = includeExisting
      ? "⚠️ จะรีเซ็ต PIN ของพนักงานทุกคน รวมถึงคนที่มี PIN อยู่แล้ว — PIN เดิมจะใช้ไม่ได้อีก ดำเนินการต่อ?"
      : "ตั้งค่า PIN ให้พนักงานที่ยังไม่มี PIN ทั้งหมด — ดำเนินการต่อ?";
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const res = await axios.post(
        `${backendUrl}/api/employees/bulk-set-pin`,
        { includeExisting },
        { withCredentials: true },
      );
      if (res.data.success) {
        setResult(res.data);
        setExported(false);
        setIncludeExisting(false); // กันติ๊กค้างแล้วกดซ้ำโดยไม่ตั้งใจ
      } else {
        alert(res.data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!result?.results?.length) return;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("PIN List");

    ws.columns = [
      { header: "Emp Code", key: "empCode", width: 14 },
      { header: "MP Code (Login ID)", key: "empId", width: 18 },
      { header: "ชื่อ-นามสกุล", key: "fullName", width: 30 },
      { header: "PIN", key: "pin", width: 12 },
    ];

    // คอลัมน์ MP Code / PIN เป็น Text — กัน Excel ตัดเลข 0 นำหน้า (เช่น PIN 012345 → 12345)
    ws.getColumn("empId").numFmt = "@";
    ws.getColumn("pin").numFmt = "@";

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F3F5" },
    };

    result.results.forEach((r) =>
      ws.addRow({
        empCode: r.empCode,
        empId: r.empId != null ? String(r.empId) : "",
        fullName: r.fullName,
        pin: r.pin != null ? String(r.pin) : "",
      }),
    );

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFDEE2E6" } },
          bottom: { style: "thin", color: { argb: "FFDEE2E6" } },
          left: { style: "thin", color: { argb: "FFDEE2E6" } },
          right: { style: "thin", color: { argb: "FFDEE2E6" } },
        };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Worker_App_PIN_List_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    setExported(true);
  };

  // ล้าง PIN ออกจากหน้าจอหลัง export — ไม่ให้ค้างให้คนอื่นเห็นถ้าเดินออกจากโต๊ะ
  const clearResult = () => {
    if (
      hasUnsavedPins &&
      !window.confirm(
        "PIN ชุดนี้ยังไม่ได้ Export — ล้างแล้วดูย้อนหลังไม่ได้อีก ยืนยัน?",
      )
    )
      return;
    setResult(null);
    setExported(false);
  };

  const pinCount = result?.results?.length ?? 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px]">
      {/* ════════ Header ════════ */}
      <div className={`${CARD} px-4 py-5 sm:px-6`}>
        <div className="text-xl font-extrabold">
          🔑 Bulk Set PIN — Worker App
        </div>
        <div className="mt-1 text-xs text-gray-500">
          ตั้งค่า PIN ให้พนักงานหลายคนพร้อมกันในครั้งเดียว สำหรับ rollout Worker
          App รอบแรก
        </div>
      </div>

      {/* ════════ คำเตือนความปลอดภัย ════════ */}
      <div className="mb-6 rounded-[10px] border border-[#ffe69c] bg-[#fff8e1] px-4 py-3.5 text-[13px] leading-relaxed text-[#664d03] sm:px-[18px]">
        ⚠️ ไฟล์ Excel ที่ export จะมี PIN แบบข้อความล้วนของพนักงานทุกคน —
        เก็บไฟล์นี้อย่างปลอดภัย ลบทิ้งทันทีหลังแจกจ่ายเสร็จ
        และห้ามส่งผ่านช่องทางที่ไม่ปลอดภัย (เช่น กลุ่มไลน์สาธารณะ)
      </div>

      {/* ════════ ตั้งค่า ════════ */}
      <div className={CARD}>
        <div className={CARD_HEADER}>ตั้งค่า</div>
        <div className="p-4 sm:p-5">
          <label
            className={`mb-4 flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-[13px] ${
              includeExisting ? "font-semibold text-[#842029]" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={includeExisting}
              onChange={(e) => setIncludeExisting(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
            />
            รวมพนักงานที่มี PIN อยู่แล้วด้วย (รีเซ็ต PIN เดิมทิ้ง — ระวัง!)
          </label>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full cursor-pointer rounded-lg border-none px-6 py-2.5 text-sm font-bold text-white disabled:cursor-default disabled:bg-gray-400 sm:w-auto ${
              includeExisting
                ? "bg-[#dc3545] hover:bg-[#bb2d3b]"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading
              ? "กำลังตั้งค่า..."
              : includeExisting
                ? "▶ รีเซ็ต PIN ทุกคน"
                : "▶ เริ่มตั้งค่า PIN"}
          </button>
        </div>
      </div>

      {/* ════════ ผลลัพธ์ ════════ */}
      {result && (
        <>
          <div className={CARD}>
            <div
              className={`${CARD_HEADER} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <span>✅ ตั้งค่าสำเร็จ {pinCount} คน</span>
              <div className="flex flex-wrap gap-2">
                {pinCount > 0 && (
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 cursor-pointer rounded-lg border-none bg-[#198754] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#157347] sm:flex-none"
                  >
                    📊 Export Excel{exported && " อีกครั้ง"}
                  </button>
                )}
                <button
                  onClick={clearResult}
                  className="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 sm:flex-none"
                >
                  🧹 ล้างรายการ
                </button>
              </div>
            </div>

            {pinCount > 0 && (
              <div
                className={`border-b px-4 py-2.5 text-xs sm:px-5 ${
                  exported
                    ? "border-[#badbcc] bg-[#d1e7dd] text-[#0f5132]"
                    : "border-[#f5c6cb] bg-[#f8d7da] text-[#842029]"
                }`}
              >
                {exported
                  ? "✓ Export แล้ว — กด “ล้างรายการ” เพื่อซ่อน PIN ออกจากหน้าจอ"
                  : "⚠ PIN แสดงได้ครั้งเดียว — กด Export Excel ก่อนออกจากหน้านี้ ไม่งั้น PIN ชุดนี้จะหายถาวร (ต้องรีเซ็ตใหม่)"}
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto">
              {pinCount === 0 ? (
                <div className="p-7 text-center text-[13px] text-gray-500">
                  ไม่มีพนักงานที่ต้องตั้งค่า PIN ใหม่
                </div>
              ) : (
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className={`${TH} ${HIDE_MOBILE}`}>EMP CODE</th>
                      <th className={TH}>MP CODE</th>
                      <th className={TH}>ชื่อ-นามสกุล</th>
                      <th className={TH}>PIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className={`${TD} ${HIDE_MOBILE} text-gray-500`}>
                          {r.empCode}
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>{r.empId}</td>
                        <td className={`${TD} font-semibold`}>{r.fullName}</td>
                        <td
                          className={`${TD} whitespace-nowrap font-mono font-bold tracking-[2px]`}
                        >
                          {r.pin}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <SkippedList
            title={`⚠ ข้าม ${result.skippedNoEmpId?.length ?? 0} คน — ไม่มี MP Code (empId)`}
            tone="text-[#842029]"
            items={result.skippedNoEmpId}
          />
          <SkippedList
            title={`⏭ ข้าม ${result.skippedHasPin?.length ?? 0} คน — มี PIN อยู่แล้ว`}
            tone="text-[#664d03]"
            items={result.skippedHasPin}
          />
        </>
      )}
    </div>
  );
}
