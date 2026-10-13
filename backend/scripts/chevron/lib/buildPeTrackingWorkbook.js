// ============================================================
// scripts/chevron/lib/buildPeTrackingWorkbook.js
//
// Reverse of importMedicalExamRecords.js: reads EVERY Employee (not
// just ones with an exam on file) and left-joins their latest
// MedicalExamRecord if one exists, building an ExcelJS workbook that
// reproduces the original "PE tracking" file layout — 41 columns
// (A..AO), 3-line wrapped headers (TH/EN/ZH), autofilter, frozen
// header row.
//
// One row per Employee, period. If an employee has no exam record on
// file, every exam-related column (J, K, L..AG, AH..AO) is simply
// left BLANK rather than the employee being excluded — the point is
// so whoever opens this file can immediately see which people are
// missing data and go get it, instead of those people silently
// vanishing from the export.
//
// Similarly, missing birthDate, position, division, or workplace just
// produce a blank cell for that one field — nothing here requires a
// "complete" employee record to appear in the output.
//
// See lib/peTrackingColumns.js for the full column list and any
// remaining documented gaps.
// ============================================================

import ExcelJS from "exceljs";
import {
  PE_TRACKING_COLUMNS,
  COMPANY_NAME,
  DATE_FMT,
} from "./peTrackingColumns.js";
import {
  getMedicalExpiryBucket,
  getFollowUpStatus,
  getDaysLeft,
  EXPIRY_LABEL_TH,
} from "../../../utils/expiryStatus.js";

// Real Excel formula for col AL/AM uses a 90-day follow-up interval
// (`=IF((AK2+90)<TODAY(), ...)`), NOT the 180-day value that
// utils/expiryStatus.js's getFollowUpStatus() defaults to / documents.
// Passed explicitly here so the export matches the live spreadsheet;
// worth reconciling the util's default separately.
const FOLLOWUP_INTERVAL_DAYS = 90;
const FOLLOWUP_WARNING_DAYS = 30;

function splitEnglishName(fullNameEN) {
  if (!fullNameEN) return { first: null, last: null };
  const parts = fullNameEN.trim().split(/\s+/);
  return {
    first: parts[0] || null,
    last: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function calcAge(birthDate, asOf) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const a = asOf ? new Date(asOf) : new Date();
  let age = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) age--;
  return age;
}

// ── cols AN / AO — driven by col K (examDate) via MedicalCheck.expiryDate ──
// Returns all-null (blank cells) if there's no medicalCheck at all —
// i.e. this employee has never had an exam imported.
function computeExpiryFields(medicalCheck) {
  const expiryDate = medicalCheck?.expiryDate || null;
  if (!expiryDate) return { expiryStatus: null, daysToExpiry: null };

  const bucket = getMedicalExpiryBucket(expiryDate); // "expired"|"critical"|"warning"|"valid"
  const expiryStatus = EXPIRY_LABEL_TH.medical[bucket];
  const daysToExpiry = Math.max(0, getDaysLeft(expiryDate) ?? 0);

  return { expiryStatus, daysToExpiry };
}

// ── cols AL / AM — driven by col AK (commentDate), 90-day follow-up interval ──
// Returns all-null (blank cells) if there's no commentDate.
function computeFollowUpFields(commentDate) {
  const followUp = getFollowUpStatus(
    commentDate,
    FOLLOWUP_INTERVAL_DAYS,
    FOLLOWUP_WARNING_DAYS,
  );
  if (!followUp) return { followUpStatus: null, daysToUpdate: null };

  return {
    followUpStatus: followUp.status, // "เลยกำหนด" | "ใกล้ถึง" | "ยังไม่ถึง"
    daysToUpdate: Math.max(0, followUp.daysLeft),
  };
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ sheetName?: string, activeOnly?: boolean }} [options]
 *   activeOnly: if true, only exports Employee.status === "active".
 *   Defaults to false (export everyone) so nobody silently disappears.
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function buildPeTrackingWorkbook(prisma, options = {}) {
  const sheetName = options.sheetName || "PE tracking export";
  const activeOnly = options.activeOnly || false;

  // ── every employee, left-joined to their latest exam record (if any) ──
  const employees = await prisma.employee.findMany({
    where: activeOnly ? { status: "active" } : undefined,
    include: {
      position: true,
      medicalExamRecords: {
        where: { isLatest: true },
        take: 1,
        include: { medicalCheck: true },
      },
    },
    orderBy: { fullNameTH: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // ── header row ──
  const headerValues = PE_TRACKING_COLUMNS.map(([, text]) => text);
  const headerRow = sheet.addRow(headerValues);
  headerRow.height = 60;
  headerRow.eachCell((cell) => {
    cell.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
    cell.font = { bold: true };
  });

  sheet.columns = PE_TRACKING_COLUMNS.map(([letter]) => ({
    key: letter,
    width: 18,
  }));

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: PE_TRACKING_COLUMNS.length },
  };

  // ── data rows — one per employee, exam fields blank if missing ──
  for (const e of employees) {
    const r = e.medicalExamRecords[0] || null; // latest exam record, or null
    const medicalCheck = r?.medicalCheck || null;

    const { first: engFirst, last: engLast } = splitEnglishName(e.fullNameEN);
    const { expiryStatus, daysToExpiry } = computeExpiryFields(medicalCheck);
    const { followUpStatus, daysToUpdate } = computeFollowUpFields(
      r?.commentDate || null,
    );

    const row = {
      A: e.fullNameTH || e.fullName || null,
      B: engFirst,
      C: engLast,
      D: COMPANY_NAME,
      E: e.workplace || null,
      F: e.position?.name || null,
      G: e.division || null,
      H: e.birthDate || null,
      I: calcAge(e.birthDate, r?.examDate || null),
      J: r?.chronicDisease ?? null,
      K: r?.examDate || null,
      L: r?.height ?? null,
      M: r?.weight ?? null,
      N: r?.bmi ?? null,
      O: r?.bpSystolic ?? null,
      P: r?.bpDiastolic ?? null,
      Q: r?.hematocritPct ?? null,
      R: r?.urineResult ?? null,
      S: r?.urineAbnormalNote ?? null,
      T: r?.bloodSugar ?? null,
      U: r?.ldl ?? null,
      V: r?.triglyceride ?? null,
      W: r?.sgot ?? null,
      X: r?.sgpt ?? null,
      Y: r?.uricAcid ?? null,
      Z: r?.ekgResult ?? null,
      AA: r?.ekgAbnormalNote ?? null,
      AB: r?.chestXrayResult ?? null,
      AC: r?.chestXrayAbnormalNote ?? null,
      AD: r?.dentalResult ?? null,
      AE: r?.dentalAbnormalNote ?? null,
      AF: r?.estResult ?? null,
      AG: r?.estAbnormalNote ?? null,
      AH: r?.note ?? null,
      AI: r?.healthRisk ?? null,
      AJ: r?.recommendation ?? null,
      AK: r?.commentDate || null,
      AL: followUpStatus,
      AM: daysToUpdate,
      AN: expiryStatus,
      AO: daysToExpiry,
    };

    const rowValues = PE_TRACKING_COLUMNS.map(([letter]) => row[letter]);
    const excelRow = sheet.addRow(rowValues);

    // date formatting
    const dateCols = ["H", "K", "AK"];
    for (const col of dateCols) {
      const idx =
        PE_TRACKING_COLUMNS.findIndex(([letter]) => letter === col) + 1;
      const cell = excelRow.getCell(idx);
      if (cell.value instanceof Date) cell.numFmt = DATE_FMT;
    }
  }

  return workbook;
}
