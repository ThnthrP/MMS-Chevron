// ============================================================
// utils/expiryStatus.js
// Shared expiry-bucket + follow-up calculation.
// ============================================================

/**
 * Generic bucket calculator — used for training/certification expiry
 * (and anything else with a plain expiryDate + no special lead time).
 *
 * @param {Date|string|null} expiryDate
 * @param {{ criticalDays?: number, warningDays?: number, upcomingDays?: number }} [opts]
 * @returns {"expired"|"critical"|"warning"|"upcoming"|"valid"}
 */
export function getExpiryBucket(expiryDate, opts = {}) {
  const { criticalDays = 30, warningDays = 90, upcomingDays = 120 } = opts;
  if (!expiryDate) return "valid";
  const daysLeft = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / 86400000,
  );
  if (daysLeft < 0) return "expired";
  if (daysLeft < criticalDays) return "critical";
  if (daysLeft <= warningDays) return "warning";
  if (daysLeft <= upcomingDays) return "upcoming";
  return "valid";
}

/**
 * Medical Check up (annual PE exam) expiry — longer lead time than
 * training certs because booking a hospital slot / specialist
 * referral takes longer to arrange.
 * Matches PE tracking Excel col AN formula:
 *   K14+364 < TODAY()          → "หมดอายุ" (expired)
 *   K14+365-TODAY() <= 30      → "ใกล้หมดอายุ 1 เดือน" (critical)
 *   K14+365-TODAY() <= 90      → "ใกล้หมด 3 เดือน" (warning)
 *   K14+365-TODAY() <= 120     → "แจ้งเตือนล่วงหน้า" (upcoming)
 *   else                       → "ยังไม่หมด" (valid)
 *
 * @param {Date|string|null} expiryDate
 * @returns {"expired"|"critical"|"warning"|"upcoming"|"valid"}
 */
export function getMedicalExpiryBucket(expiryDate) {
  return getExpiryBucket(expiryDate, {
    criticalDays: 30,
    warningDays: 90,
    upcomingDays: 120,
  });
}

// Thai labels matching each bucket, split by context since the Excel
// uses different wording for cert/training vs. the annual medical exam.
export const EXPIRY_LABEL_TH = {
  generic: {
    expired: "หมดอายุ",
    critical: "ใกล้หมดอายุ",
    warning: "ใกล้หมดอายุ",
    upcoming: "แจ้งเตือนล่วงหน้า",
    valid: "ยังไม่หมด",
  },
  medical: {
    expired: "หมดอายุ",
    critical: "ใกล้หมดอายุ 1 เดือน",
    warning: "ใกล้หมด 3 เดือน",
    upcoming: "แจ้งเตือนล่วงหน้า (3-4 เดือน)",
    valid: "ยังไม่หมด",
  },
};

/**
 * Days remaining until expiry (negative = already expired).
 * Returns null if there's no expiry date to compare against.
 *
 * @param {Date|string|null} expiryDate
 * @returns {number|null}
 */
export function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
}

/**
 * Follow-up reminder status for MedicalExamRecord.commentDate.
 * This is a *different concept* from expiry — it's "when does the
 * doctor need to re-check on this person's condition", counted from
 * the date the comment/recommendation was logged, not from any
 * certificate expiry.
 * Matches PE tracking Excel col AL formula:
 *   (AK18+180) < TODAY()            → "เลยกำหนด"
 *   (AK18+180) - TODAY() <= 30      → "ใกล้ถึง"
 *   else                            → "ยังไม่ถึง"
 *
 * @param {Date|string|null} commentDate
 * @param {number} [intervalDays=180]
 * @param {number} [warningDays=30]
 * @returns {{ status: "เลยกำหนด"|"ใกล้ถึง"|"ยังไม่ถึง", daysLeft: number } | null}
 */
export function getFollowUpStatus(
  commentDate,
  intervalDays = 180,
  warningDays = 30,
) {
  if (!commentDate) return null;
  const dueDate = new Date(commentDate);
  dueDate.setDate(dueDate.getDate() + intervalDays);
  const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return { status: "เลยกำหนด", daysLeft };
  if (daysLeft <= warningDays) return { status: "ใกล้ถึง", daysLeft };
  return { status: "ยังไม่ถึง", daysLeft };
}
