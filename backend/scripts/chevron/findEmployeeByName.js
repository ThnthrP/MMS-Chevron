// ============================================================
// scripts/chevron/findEmployeeByName.js
//
// General-purpose lookup: searches all employees for a name (Thai or
// English) that CONTAINS the search term, and separately lists the
// closest fuzzy matches by edit distance — useful for tracking down
// near-duplicate spellings, e.g. figuring out which employee record
// actually "won" a Map-key collision in importMedicalExamRecords.js's
// byEnglishName matching.
//
// Read-only — makes no changes.
//
// USAGE:
//   node scripts/chevron/findEmployeeByName.js "<search term>"
//
// EXAMPLE:
//   node scripts/chevron/findEmployeeByName.js "Kanchanakanho"
//   node scripts/chevron/findEmployeeByName.js "สมศักดิ์ จันทร์เอียด"
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const term = process.argv[2];
if (!term) {
  console.error(
    'Usage: node scripts/chevron/findEmployeeByName.js "<search term>"',
  );
  process.exit(1);
}

function normalize(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Standard Levenshtein edit distance
function levenshtein(a, b) {
  a = a || "";
  b = b || "";
  const m = a.length,
    n = b.length;
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

  const needle = normalize(term);

  console.log(`── Substring matches for "${term}" ──`);
  const substringHits = employees.filter((e) => {
    const th = normalize(e.fullNameTH);
    const en = normalize(e.fullNameEN);
    const full = normalize(e.fullName);
    return th.includes(needle) || en.includes(needle) || full.includes(needle);
  });
  if (substringHits.length === 0) console.log("  (none)");
  for (const e of substringHits) {
    const hasExam = e.medicalExamRecords.length > 0 ? "has exam" : "NO exam";
    console.log(
      `  ${e.empCode}  TH="${e.fullNameTH || "—"}"  EN="${e.fullNameEN || "—"}"  birthDate=${e.birthDate ? new Date(e.birthDate).toISOString().slice(0, 10) : "—"}  [${hasExam}]`,
    );
  }

  console.log(`\n── Closest fuzzy matches by edit distance (top 8) ──`);
  const scored = employees
    .map((e) => {
      const en = normalize(e.fullNameEN || e.fullName);
      const dist = levenshtein(needle, en);
      return { e, dist, en };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 8);
  for (const { e, dist } of scored) {
    const hasExam = e.medicalExamRecords.length > 0 ? "has exam" : "NO exam";
    console.log(
      `  dist=${dist}  ${e.empCode}  TH="${e.fullNameTH || "—"}"  EN="${e.fullNameEN || "—"}"  birthDate=${e.birthDate ? new Date(e.birthDate).toISOString().slice(0, 10) : "—"}  [${hasExam}]`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
