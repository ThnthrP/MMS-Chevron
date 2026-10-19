import { useEffect } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ══════════════════════════════════════════════════════════
// เอกสารที่พิมพ์ได้ (CV Summary / Roster / Skill Matrix)
// ใช้ร่วมกันระหว่าง WorkerDetail.jsx และ Allocation.jsx
// แก้หน้าตา Resume / Skill Matrix ที่ไฟล์นี้ไฟล์เดียว
// ══════════════════════════════════════════════════════════

export const GENDER_LABEL = { male: "Male", female: "Female", other: "Other" };

// ── helpers วันที่ ──
export const fmtShort = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtResumeDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  const month = dt.toLocaleDateString("en-GB", { month: "long" });
  return `${dt.getDate()}-${month}-${dt.getFullYear()}`;
};

export const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  return Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000));
};

export const skillCellLabel = (cell) => {
  if (!cell.completedDate && !cell.expiryDate && !cell.status) return "N/A";
  if (cell.status === "if_required") return "if required";
  if (cell.status === "overdue") return "Over Due";
  if (cell.expiryDate) return fmtShort(cell.expiryDate);
  if (cell.completedDate) return fmtShort(cell.completedDate);
  return "Pending";
};

// ══════════════════════════════════════════════════════════
// CSS สำหรับพิมพ์ (ต้องเป็น CSS ธรรมดา เพราะใช้ @page / !important / id)
// ══════════════════════════════════════════════════════════
const basePrintCss = (overlayClass, printId) => `
  #root { display: none !important; }
  .${overlayClass} {
    position: static !important;
    background: none !important;
    padding: 0 !important;
  }
  #${printId} {
    position: static !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  .cv-no-print { display: none !important; }`;

const PRINT_CSS = {
  cv: (id) => `@media print {${basePrintCss("cv-print-overlay", id)}
  .cv-resume-page { page-break-after: always; border: none !important; box-shadow: none !important; }
  .cv-resume-page:last-child { page-break-after: auto; }
}`,
  roster: (id) => `@media print {${basePrintCss("roster-print-overlay", id)}
  #${id} input { border: none !important; background: transparent !important; }
  #${id} table { min-width: 0 !important; }
  .roster-scroll { overflow: visible !important; }
}`,
  matrix: (id) => `@media print {
  @page { size: A4 landscape; margin: 6mm; }${basePrintCss("matrix-print-overlay", id)}
  #${id} table {
    transform-origin: top left;
    transform: scale(var(--matrix-scale, 1));
  }
}`,
};

export const PRINT_BTN =
  "cursor-pointer rounded-md border-none bg-white px-4 py-1.5 text-[13px] font-semibold text-[#1e3a5f] hover:bg-gray-100";
export const EXCEL_BTN =
  "cursor-pointer rounded-md border-none bg-[#198754] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#157347]";

// ── กรอบ modal ของเอกสารที่พิมพ์ได้ — kind: "cv" | "roster" | "matrix" ──
export function PrintModal({
  kind,
  printId,
  maxW,
  title,
  actions,
  onClose,
  children,
}) {
  // Esc ปิด modal
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={`${kind}-print-overlay fixed inset-0 z-[999999] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6`}
      onClick={onClose}
    >
      <style>{PRINT_CSS[kind](printId)}</style>
      <div
        id={printId}
        className={`w-full ${maxW} overflow-hidden rounded-[10px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.2)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cv-no-print flex flex-wrap items-center justify-between gap-2 bg-[#1e3a5f] px-4 py-3.5 text-white sm:px-6">
          <span className="min-w-0 text-base font-semibold">{title}</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {actions}
            <button
              type="button"
              onClick={() => window.print()}
              className={PRINT_BTN}
            >
              🖨 Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              title="ปิด (Esc)"
              className="cursor-pointer border-none bg-transparent text-xl leading-none text-white"
            >
              ✕
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ══════════════════════════════════════════════════════════
// Resume (CV Summary) — 1 หน้า / คน
// top / bottom = ส่วนเสริมที่ไม่พิมพ์ (ใส่ class cv-no-print เอง)
// ══════════════════════════════════════════════════════════
const RESUME_SECTION =
  "border border-t-0 border-[#1e3a5f] bg-[#e6fbfb] px-3 py-1.5 text-[13px] font-bold text-[#1e3a5f]";
const RESUME_TD1 =
  "whitespace-nowrap px-2 py-1 align-top text-xs font-bold text-[#1e3a5f]";
const RESUME_TD2 = "px-2 py-1 align-top text-xs text-gray-900";
const RESUME_KEY = "whitespace-nowrap pr-2 align-top font-bold";
// คอลัมน์ ":" แยกจากหัวข้อ → ":" ตรงแนวเดียวกันทุกบรรทัด และค่าเริ่มต่อจาก ":" ทันที
const RESUME_COLON = "pr-2 align-top";

// แถว "หัวข้อ : ค่า" ของ Professional Experience
function KeyRow({ label, children, keyClass = "" }) {
  return (
    <tr>
      <td className={`${RESUME_KEY} ${keyClass}`}>{label}</td>
      <td className={RESUME_COLON}>:</td>
      <td className="align-top">{children}</td>
    </tr>
  );
}

export function ResumePage({
  cvData,
  backendUrl,
  className = "",
  top,
  bottom,
}) {
  const p = cvData.personal || {};
  const pro = cvData.professional || {};
  const trainedCourses = cvData.trainedCourses || [];
  const projectReferences = pro.projectReferences || [];
  const age = calcAge(cvData.birthDate);

  return (
    <div
      className={`cv-resume-page min-w-[680px] rounded-md border border-gray-200 bg-white px-7 py-6 [font-family:Arial,sans-serif] ${className}`}
    >
      {top}

      {/* Header กับโลโก้บริษัท */}
      <div className="flex border border-black">
        <div className="flex w-[100px] shrink-0 items-center justify-center border-r border-black p-2">
          <img
            src={`${backendUrl}/uploads/branding/experteam-logo.png`}
            alt="EXPERTEAM Logo"
            className="max-h-[70px] max-w-full object-contain"
          />
        </div>
        <div className="flex-1 px-3 py-2.5 text-center text-[#1e3a5f]">
          <div className="text-[13px] font-bold">
            บริษัท เอ็กซ์เพิททีม จำกัด
          </div>
          <div className="mb-1 text-[10px]">
            110, 112, 114 ถนนพระราม 2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพฯ 10150
          </div>
          <div className="mb-1.5 text-[10px]">
            โทร (662) 898-6001 แฟ็กซ์ (662) 898-6451
          </div>
          <div className="text-[13px] font-bold">EXPERTEAM CO., LTD.</div>
          <div className="text-[10px]">
            110, 112, 114 Rama II Road, Sa-maedum, Bangkuntean, Bangkok 10150
          </div>
          <div className="text-[10px]">
            TEL: (662) 898-6001 FAX: (662) 898-6451
          </div>
        </div>
        <div className="flex w-[160px] shrink-0 items-center justify-center border-l border-black p-2">
          <img
            src={`${backendUrl}/uploads/branding/iso-badges.png`}
            alt="ISO 9001 / 14001 / 45001 Certified"
            className="max-h-[70px] max-w-full object-contain"
          />
        </div>
      </div>
      <div className="mb-4 border border-t-0 border-black p-1.5 text-center text-base font-bold">
        Resume
      </div>

      {/* Personal Details */}
      <div className={RESUME_SECTION}>Personal Details</div>
      <div className="mb-4 flex gap-4 border border-t-0 border-[#1e3a5f]">
        <table className="flex-1 border-collapse">
          <tbody>
            <tr>
              <td className={RESUME_TD1}>Name :</td>
              <td className={RESUME_TD2} colSpan={3}>
                {cvData.fullName}
              </td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Address :</td>
              <td className={RESUME_TD2} colSpan={3}>
                {p.address || "—"}
              </td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Telephone :</td>
              <td className={RESUME_TD2}>{p.phone || "—"}</td>
              <td className={RESUME_TD1}>Email :</td>
              <td className={RESUME_TD2}>{p.email || "—"}</td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Date of Birth :</td>
              <td className={RESUME_TD2}>{fmtResumeDate(cvData.birthDate)}</td>
              <td className={RESUME_TD1}>Age :</td>
              <td className={RESUME_TD2}>
                {age !== null ? `${age} years` : "—"}
              </td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Sex :</td>
              <td className={RESUME_TD2}>{GENDER_LABEL[p.gender] || "—"}</td>
              <td className={RESUME_TD1}>Nationality :</td>
              <td className={RESUME_TD2}>
                {p.nationality || cvData.nationality || "—"}
              </td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Height :</td>
              <td className={RESUME_TD2}>
                {p.height != null ? `${p.height} cm.` : "—"}
              </td>
              <td className={RESUME_TD1}>Weight :</td>
              <td className={RESUME_TD2}>
                {p.weight != null ? `${p.weight} kg.` : "—"}
              </td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Religion :</td>
              <td className={RESUME_TD2}>{p.religion || "—"}</td>
              <td className={RESUME_TD1}>Language :</td>
              <td className={RESUME_TD2}>{p.language || "—"}</td>
            </tr>
            <tr>
              <td className={RESUME_TD1}>Education :</td>
              <td className={RESUME_TD2} colSpan={3}>
                {p.education || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex w-[110px] shrink-0 items-start justify-center p-2.5">
          {p.photoUrl ? (
            <img
              src={`${backendUrl}${p.photoUrl}`}
              alt={cvData.fullName}
              className="h-[120px] w-[100px] rounded border border-[#1e3a5f] object-cover"
            />
          ) : (
            <div className="cv-no-print flex h-[120px] w-[100px] items-center justify-center rounded border border-dashed border-gray-400 p-1 text-center text-[10px] text-gray-400">
              No Photo
            </div>
          )}
        </div>
      </div>

      {/* Trained Courses */}
      <div className={RESUME_SECTION}>Trained Courses</div>
      <div className="mb-4 border border-t-0 border-[#1e3a5f] px-3.5 py-2.5">
        {trainedCourses.length === 0 ? (
          <div className="text-xs text-gray-500">— ไม่มีข้อมูล</div>
        ) : (
          trainedCourses.map((t, ti) => (
            <div key={ti} className="mb-1.5 flex gap-2 text-xs">
              <span className="min-w-[110px] font-bold text-[#1e3a5f]">
                {fmtResumeDate(t.completedDate)}
              </span>
              <span>:</span>
              <div>
                <div>{t.name}</div>
                {t.institute && (
                  <div className="text-[11px] text-gray-500">
                    By {t.institute}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Professional Experience */}
      <div className={RESUME_SECTION}>Professional Experience</div>
      <div className="border border-t-0 border-[#1e3a5f] px-3.5 py-2.5">
        <div className="mb-2 text-xs font-bold underline">Present</div>
        <table className="mb-4 text-xs">
          <tbody>
            <KeyRow label="Company">{pro.company || "—"}</KeyRow>
            <KeyRow label="Position">{pro.currentPosition || "—"}</KeyRow>
            {pro.responsibilities?.length > 0 && (
              <KeyRow label="Responsibility">
                {/* ข้อ 1. อยู่บรรทัดเดียวกับ ":" — ข้อถัดไปเรียงลงมาตรงแนวเดียวกัน */}
                {pro.responsibilities.map((r, ri) => (
                  <div key={ri} className="flex gap-1">
                    <span className="shrink-0">{ri + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))}
              </KeyRow>
            )}
          </tbody>
        </table>

        <div className="mb-2 text-xs font-bold underline">
          Project References
        </div>
        {projectReferences.length === 0 ? (
          <div className="text-xs text-gray-500">— ไม่มีประวัติ deploy</div>
        ) : (
          projectReferences.map((pr, pi) => (
            <table key={pi} className="mb-2.5 text-xs">
              <tbody>
                <KeyRow label="Project" keyClass="w-[70px]">
                  {pr.projectLabel}
                </KeyRow>
                <KeyRow label="Position">{pr.position || "—"}</KeyRow>
                <KeyRow label="Period">
                  {fmtResumeDate(pr.mobDate)}
                  {pr.demobDate ? ` to ${fmtResumeDate(pr.demobDate)}` : ""}
                </KeyRow>
              </tbody>
            </table>
          ))
        )}
      </div>

      {bottom}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Skill Matrix — ตาราง + Export Excel
// ══════════════════════════════════════════════════════════
export function SkillMatrixTable({ trainings, rows }) {
  return (
    <table className="border-collapse whitespace-nowrap text-[11px]">
      <thead>
        <tr className="bg-[#f1f3f5]">
          <th className="sticky left-0 border border-gray-200 bg-[#f1f3f5] p-1.5">
            Name
          </th>
          <th className="border border-gray-200 p-1.5">Position</th>
          {trainings.map((tr) => (
            <th
              key={tr.id}
              className="h-[150px] w-[55px] min-w-[55px] max-w-[55px] overflow-visible border border-gray-200 p-0 align-bottom"
            >
              <div className="mb-1.5 ml-5 w-0 origin-bottom-left -rotate-45 whitespace-nowrap text-[10px] font-bold">
                {tr.name}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.employeeId}>
            <td className="sticky left-0 border border-gray-200 bg-white p-1.5 font-semibold">
              {r.fullName}
            </td>
            <td className="border border-gray-200 p-1.5">{r.position}</td>
            {r.cells.map((cell) => (
              <td
                key={cell.trainingId}
                className={`w-[55px] min-w-[55px] max-w-[55px] whitespace-nowrap border border-gray-200 px-0.5 py-1 text-center text-[10px] ${
                  cell.status === "overdue" ? "text-[#dc3545]" : "text-gray-900"
                }`}
              >
                {skillCellLabel(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function exportSkillMatrixExcel({
  title,
  trainings,
  rows,
  fileName,
}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Skill Matrix");
  const lastCol = 2 + trainings.length;

  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF198754" } };

  const headerRowIndex = 3;
  ws.getCell(headerRowIndex, 1).value = "Name";
  ws.getCell(headerRowIndex, 2).value = "Position";
  trainings.forEach((tr, i) => {
    const cell = ws.getCell(headerRowIndex, 3 + i);
    cell.value = tr.name;
    cell.alignment = {
      textRotation: 45,
      vertical: "bottom",
      horizontal: "left",
    };
    cell.font = { bold: true, size: 9 };
  });

  ws.getRow(headerRowIndex).height = 110;
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 26;
  for (let i = 0; i < trainings.length; i++) ws.getColumn(3 + i).width = 5;

  const thin = { style: "thin" };
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(headerRowIndex, c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F3F5" },
    };
    cell.border = { top: thin, bottom: thin, left: thin, right: thin };
  }

  const lightBorder = { style: "thin", color: { argb: "FFDEE2E6" } };
  rows.forEach((r, ri) => {
    const rowIndex = headerRowIndex + 1 + ri;
    ws.getCell(rowIndex, 1).value = r.fullName;
    ws.getCell(rowIndex, 1).font = { bold: true };
    ws.getCell(rowIndex, 2).value = r.position;

    r.cells.forEach((cell, ci) => {
      const excelCell = ws.getCell(rowIndex, 3 + ci);
      excelCell.value = skillCellLabel(cell);
      excelCell.alignment = { horizontal: "center" };
      excelCell.font = {
        size: 9,
        color: { argb: cell.status === "overdue" ? "FFDC3545" : "FF212529" },
      };
    });

    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(rowIndex, c).border = {
        top: lightBorder,
        bottom: lightBorder,
        left: lightBorder,
        right: lightBorder,
      };
    }
  });

  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRowIndex }];

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
}
