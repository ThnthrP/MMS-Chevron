// ============================================================
// scripts/chevron/batchCheckNoExamForDuplicates.js
//
// For every Employee with NO latest MedicalExamRecord, compares
// their Thai name AND English name against every OTHER employee in
// the system (has-exam or not) using normalized Levenshtein distance
// (edit distance ÷ longer string's length — so short names don't get
// unfairly flagged and long names aren't unfairly spared).
//
// Prints only pairs below the suspicion threshold, sorted by how
// close the match is (closest first). Exact matches (ratio = 0,
// different empCode) are called out separately since those are near-
// certain duplicates (like the "สมศักดิ์ จันทร์เอียด" case).
//
// Read-only — makes no database changes. This REPLACES having to run
// findEmployeeByName.js once per person by hand.
//
// USAGE:
//   node scripts/chevron/batchCheckNoExamForDuplicates.js [--threshold=0.3]
//
// --threshold (default 0.3): normalized distance ratio cutoff.
//   Lower = stricter (fewer, more confident hits).
//   0 = exact match only. 0.3 is a reasonable starting point based on
//   the "Kanjanagunho" vs "Kanchanakanho" case seen in this project.
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const thresholdArg = args.find((a) => a.startsWith("--threshold="));
const THRESHOLD = thresholdArg ? parseFloat(thresholdArg.split("=")[1]) : 0.3;

function normalize(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function levenshtein(a, b) {
  a = a || "";
  b = b || "";
  const m = a.length,
    n = b.length;
  if (m === 0 || n === 0) return Math.max(m, n);
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function ratio(a, b) {
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 1; // both empty = not comparable
  return levenshtein(a, b) / longer;
}

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      birthDate: true,
      medicalExamRecords: { where: { isLatest: true }, select: { id: true } },
    },
  });

  const noExam = employees.filter((e) => e.medicalExamRecords.length === 0);

  console.log(
    `Checking ${noExam.length} no-exam employees against all ${employees.length} employees.`,
  );
  console.log(`Threshold: normalized edit distance <= ${THRESHOLD}\n`);

  const exactHits = [];
  const fuzzyHits = [];

  for (const target of noExam) {
    const targetTH = normalize(target.fullNameTH);
    const targetEN = normalize(target.fullNameEN || target.fullName);

    for (const other of employees) {
      if (other.id === target.id) continue;

      const otherTH = normalize(other.fullNameTH);
      const otherEN = normalize(other.fullNameEN || other.fullName);

      // exact Thai full-name match — near-certain duplicate
      if (targetTH && otherTH && targetTH === otherTH) {
        exactHits.push({ target, other, field: "Thai (exact)" });
        continue; // don't also report it as fuzzy
      }

      let bestRatio = 1;
      let bestField = null;
      if (targetTH && otherTH && targetTH.length >= 4 && otherTH.length >= 4) {
        const r = ratio(targetTH, otherTH);
        if (r < bestRatio) {
          bestRatio = r;
          bestField = "Thai";
        }
      }
      if (targetEN && otherEN && targetEN.length >= 4 && otherEN.length >= 4) {
        const r = ratio(targetEN, otherEN);
        if (r < bestRatio) {
          bestRatio = r;
          bestField = "English";
        }
      }

      if (bestField && bestRatio <= THRESHOLD) {
        fuzzyHits.push({ target, other, field: bestField, ratio: bestRatio });
      }
    }
  }

  console.log(
    `── Exact Thai full-name matches (${exactHits.length}) — near-certain duplicates ──`,
  );
  for (const h of exactHits) {
    const hasExam =
      h.other.medicalExamRecords.length > 0 ? "has exam" : "NO exam";
    console.log(
      `  ${h.target.empCode} (no exam) ≡ ${h.other.empCode} [${hasExam}]  TH="${h.target.fullNameTH}"`,
    );
  }

  console.log(
    `\n── Fuzzy matches within threshold ${THRESHOLD} (${fuzzyHits.length}) — review before merging ──`,
  );
  fuzzyHits.sort((a, b) => a.ratio - b.ratio);
  const seen = new Set(); // dedupe A-vs-B / B-vs-A showing twice
  for (const h of fuzzyHits) {
    const key = [h.target.empCode, h.other.empCode].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const hasExam =
      h.other.medicalExamRecords.length > 0 ? "has exam" : "NO exam";
    console.log(
      `  ratio=${h.ratio.toFixed(2)}  [${h.field}]  ${h.target.empCode} (no exam, TH="${h.target.fullNameTH || "—"}" EN="${h.target.fullNameEN || "—"}")  vs  ${h.other.empCode} [${hasExam}] (TH="${h.other.fullNameTH || "—"}" EN="${h.other.fullNameEN || "—"}")`,
    );
  }

  if (exactHits.length === 0 && fuzzyHits.length === 0) {
    console.log(
      "\nNo suspicious matches found — the remaining no-exam employees look like distinct people.",
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
