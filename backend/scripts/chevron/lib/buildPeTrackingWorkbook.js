// ============================================================
// scripts/common/lib/buildPeTrackingWorkbook.js
//
// สร้างไฟล์ PE tracking (layout ใหม่ A..AU) จาก DB:
// พนักงานทุกคน 1 แถว + PE record ล่าสุด (ถ้ามี) — คนที่ยังไม่มีผลตรวจ
// ช่องผลตรวจจะว่าง (ไม่ตัดทิ้ง) เพื่อให้เห็นว่าใครยังขาดข้อมูล
//
// เรียงเหมือนไฟล์ HR: พนักงานประจำก่อน → แถว "New SSE" → คนที่เป็น NEW SSE
// (ไฟล์นี้นำเข้ากลับได้ — ตัวนำเข้าใช้แถว "New SSE" แบ่งส่วนเหมือนกัน)
//
// คอลัมน์/หัวคอลัมน์ดูที่ lib/peTrackingColumns.js
// ============================================================

import ExcelJS from "exceljs";
import {
  PE_TRACKING_COLUMNS,
  COMPANY_NAME,
  DATE_FMT,
  DATE_COLS,
  HEALTH_RISK_EXPORT,
} from "./peTrackingColumns.js";
import { getFollowUpStatus } from "../../../utils/expiryStatus.js";

// สูตร AL/AM ในไฟล์จริงใช้รอบติดตาม 90 วันจากวันที่ลง Comment
const FOLLOWUP_INTERVAL_DAYS = 90;
const FOLLOWUP_WARNING_DAYS = 30;
const DAY = 86400000;

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

// AL / AM — จากวันที่ลง Comment
function computeFollowUpFields(commentDate) {
  const followUp = getFollowUpStatus(commentDate, FOLLOWUP_INTERVAL_DAYS, FOLLOWUP_WARNING_DAYS);
  if (!followUp) return { followUpStatus: null, daysToUpdate: null };
  return {
    followUpStatus: followUp.status, // "เลยกำหนด" | "ใกล้ถึง" | "ยังไม่ถึง"
    daysToUpdate: Math.max(0, followUp.daysLeft),
  };
}

// AS / AT — ค่าที่สูตรของ HR จะคำนวณได้ ณ วันนี้ (ใช้เป็น cached result ของสูตร)
function expiryFromExam(examDate) {
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const k = new Date(examDate);
  k.setHours(0, 0, 0, 0);
  const left = Math.round((k.getTime() + 365 * DAY - today.getTime()) / DAY);
  const status =
    k.getTime() + 364 * DAY < today.getTime()
      ? "หมดอายุ"
      : left <= 30
        ? "ใกล้หมดอายุ 1 เดือน"
        : left <= 90
          ? "ใกล้หมด 3 เดือน"
          : "ยังไม่หมด";
  return { status, days: Math.max(0, left - 1) };
}

const colIndex = (letter) => PE_TRACKING_COLUMNS.findIndex(([l]) => l === letter) + 1;

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ sheetName?: string, activeOnly?: boolean }} [options]
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function buildPeTrackingWorkbook(prisma, options = {}) {
  const sheetName = options.sheetName || "PE tracking export";
  const activeOnly = options.activeOnly || false;

  const employees = await prisma.employee.findMany({
    where: activeOnly ? { status: "active" } : undefined,
    include: {
      position: true,
      medicalExamRecords: { where: { isLatest: true }, take: 1 },
    },
    orderBy: { fullNameTH: "asc" },
  });

  // พนักงานประจำ/อื่นๆ ก่อน แล้วค่อย NEW SSE (ตามไฟล์ HR)
  const main = employees.filter((e) => e.sseLevel !== "new_sse");
  const newSse = employees.filter((e) => e.sseLevel === "new_sse");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });

  const headerRow = sheet.addRow(PE_TRACKING_COLUMNS.map(([, text]) => text));
  headerRow.height = 60;
  headerRow.eachCell((cell) => {
    cell.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
    cell.font = { bold: true };
  });
  sheet.columns = PE_TRACKING_COLUMNS.map(([letter]) => ({ key: letter, width: 18 }));
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: PE_TRACKING_COLUMNS.length },
  };

  const kCol = "K";
  const addEmployeeRow = (e) => {
    const r = e.medicalExamRecords[0] || null;
    const { first: engFirst, last: engLast } = splitEnglishName(e.fullNameEN || e.fullName);
    const { followUpStatus, daysToUpdate } = computeFollowUpFields(r?.commentDate || null);
    const exp = expiryFromExam(r?.examDate || null);

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
      AI: r?.healthRisk ? HEALTH_RISK_EXPORT[r.healthRisk] || r.healthRisk : null,
      AJ: r?.recommendation ?? null,
      AK: r?.commentDate || null,
      AL: followUpStatus,
      AM: daysToUpdate,
      AN: r?.followUpTopic ?? null,
      AO: r?.followUpNotice ?? null,
      AP: r?.followUpRemindBefore ?? null,
      AQ: r?.followUpRemindOverdue ?? null,
      AR: r?.followUpSchedule ?? null,
      AS: null, // สูตร — ใส่ด้านล่าง
      AT: null,
      AU: r?.nextExamDate || null,
    };

    const excelRow = sheet.addRow(PE_TRACKING_COLUMNS.map(([letter]) => row[letter]));
    const n = excelRow.number;

    // AS / AT — สูตรเดียวกับไฟล์ HR (อัปเดตเองตามวันที่เปิดไฟล์)
    if (exp) {
      excelRow.getCell(colIndex("AS")).value = {
        formula: `IF(${kCol}${n}+364<TODAY(),"หมดอายุ",IF(${kCol}${n}+365-TODAY()<=30,"ใกล้หมดอายุ 1 เดือน",IF(${kCol}${n}+365-TODAY()<=90,"ใกล้หมด 3 เดือน","ยังไม่หมด")))`,
        result: exp.status,
      };
      excelRow.getCell(colIndex("AT")).value = {
        formula: `MAX(0,(${kCol}${n}+364)-TODAY())`,
        result: exp.days,
      };
    }

    for (const col of DATE_COLS) {
      const cell = excelRow.getCell(colIndex(col));
      if (cell.value instanceof Date) cell.numFmt = DATE_FMT;
    }
  };

  main.forEach(addEmployeeRow);
  if (newSse.length) {
    sheet.addRow([]);
    const marker = sheet.addRow(["New SSE"]);
    marker.getCell(1).font = { bold: true };
    marker.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00FF" } };
    newSse.forEach(addEmployeeRow);
  }

  return workbook;
}
