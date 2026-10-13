// ============================================================
// scripts/chevron/mergeEmployeeRecords.js
//
// Merges duplicate Employee records found by
// findPotentialDuplicateEmployees.js: reassigns every foreign key
// that points at the "remove" employee over to the "keep" employee
// across ALL related tables, then deletes the "remove" Employee row.
//
// ⚠️ DESTRUCTIVE. Back up the database before running with --confirm.
// Defaults to --dry-run behavior (no writes) unless --confirm is passed.
//
// The pair list below was derived by manually reviewing
// findPotentialDuplicateEmployees.js output — same birthDate AND
// clearly-the-same-name-different-transliteration. Pairs where the
// birthDate matched but names looked genuinely different were
// deliberately left out (see the conversation this came from).
// Edit PAIRS below before running if you want to add/remove any.
//
// For each pair, "keep" is the record WITH a MedicalExamRecord (the
// more complete / earlier record); "remove" is the duplicate created
// later with no exam record.
//
// USAGE:
//   node scripts/chevron/mergeEmployeeRecords.js            # dry-run (default)
//   node scripts/chevron/mergeEmployeeRecords.js --confirm  # actually writes + deletes
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");

// empCode pairs: keep the first, merge+delete the second
const PAIRS = [
  { keep: "EXPT-209", remove: "EXPT-036" }, // ทศพร เพียะวงศ์
  { keep: "EXPT-208", remove: "EXPT-159" }, // คมสัน ทวีทรัพย์
  { keep: "EXPT-216", remove: "EXPT-187" }, // สมหมาย สมฤทธิ์
  { keep: "EXPT-218", remove: "EXPT-192" }, // เฉลิมชัย เพ็ญเกตุการ
  { keep: "EXPT-225", remove: "EXPT-182" }, // กันตยศ เย็นรักษา
  { keep: "EXPT-224", remove: "EXPT-189" }, // ธนภาค อันตรเสน
  { keep: "EXPT-222", remove: "EXPT-162" }, // ศรันย์พร บุญแสน
  { keep: "EXPT-060", remove: "EXPT-122" }, // สมศักดิ์ จันทร์เอียด — ชื่อ TH/EN ตรงกันเป๊ะ, EXPT-122 ไม่มี birthDate
  { keep: "EXPT-144", remove: "EXPT-191" }, // ประพันธ์ กาญจนะกันโห — ชื่อไทยเต็มตรงกันเป๊ะ, EXPT-144 ไม่มี birthDate เก็บไว้เลยจึงหลุดจาก birthDate-dedup รอบก่อน
  { keep: "EXPT-220", remove: "EXPT-196" }, // สุรเดช แสนอุบล — Suadech/Suradech สะกดต่างกันตัวเดียว
  { keep: "EXPT-190", remove: "EXPT-235" }, // วันชัย สุพิน — Wanchai/Wamchai พิมพ์ผิด m/n
];

// Relations with a UNIQUE constraint that could conflict when
// reassigning employeeId (keep already has a row occupying that slot).
// For these, if keep already has a conflicting row, we DROP the
// remove-side row (assume keep's version is authoritative) instead of
// reassigning it — logged either way.
async function mergeOne(tx, keepId, removeId, log) {
  // ── 1-to-1 / unique-constrained relations ──

  // Passport: @unique employeeId
  const removePassport = await tx.passport.findUnique({
    where: { employeeId: removeId },
  });
  if (removePassport) {
    const keepPassport = await tx.passport.findUnique({
      where: { employeeId: keepId },
    });
    if (keepPassport) {
      log(`  Passport: keep already has one — dropping remove's Passport row`);
      await tx.passport.delete({ where: { employeeId: removeId } });
    } else {
      log(`  Passport: reassigning to keep`);
      await tx.passport.update({
        where: { employeeId: removeId },
        data: { employeeId: keepId },
      });
    }
  }

  // User: employeeId unique/optional — extremely unlikely for a field
  // worker, but check anyway.
  const removeUser = await tx.user.findUnique({
    where: { employeeId: removeId },
  });
  if (removeUser) {
    const keepUser = await tx.user.findUnique({
      where: { employeeId: keepId },
    });
    if (keepUser) {
      log(
        `  ⚠️  User: BOTH keep and remove have linked User accounts (${keepUser.email} / ${removeUser.email}) — leaving remove's User.employeeId untouched, needs manual review`,
      );
    } else {
      log(`  User: reassigning linked account ${removeUser.email} to keep`);
      await tx.user.update({
        where: { id: removeUser.id },
        data: { employeeId: keepId },
      });
    }
  }

  // MedicalCheck: @@unique([employeeId, checkType, medicalRequirementId])
  const removeChecks = await tx.medicalCheck.findMany({
    where: { employeeId: removeId },
  });
  for (const c of removeChecks) {
    const conflict = await tx.medicalCheck.findFirst({
      where: {
        employeeId: keepId,
        checkType: c.checkType,
        medicalRequirementId: c.medicalRequirementId,
      },
    });
    if (conflict) {
      log(
        `  MedicalCheck "${c.checkType}": keep already has one — dropping remove's row (its MedicalExamRecord, if any, is reassigned separately below)`,
      );
      // detach exam record first (MedicalExamRecord.medicalCheckId is unique+nullable FK)
      await tx.medicalExamRecord.updateMany({
        where: { medicalCheckId: c.id },
        data: { medicalCheckId: null },
      });
      await tx.medicalCheck.delete({ where: { id: c.id } });
    } else {
      log(`  MedicalCheck "${c.checkType}": reassigning to keep`);
      await tx.medicalCheck.update({
        where: { id: c.id },
        data: { employeeId: keepId },
      });
    }
  }

  // EmployeeSkill: @@unique([employeeId, skillId])
  const removeSkills = await tx.employeeSkill.findMany({
    where: { employeeId: removeId },
  });
  for (const s of removeSkills) {
    const conflict = await tx.employeeSkill.findFirst({
      where: { employeeId: keepId, skillId: s.skillId },
    });
    if (conflict) {
      log(
        `  EmployeeSkill (skillId=${s.skillId}): keep already has one — dropping remove's row`,
      );
      await tx.employeeSkill.delete({ where: { id: s.id } });
    } else {
      await tx.employeeSkill.update({
        where: { id: s.id },
        data: { employeeId: keepId },
      });
    }
  }

  // SubcontractorHire: @@unique([subcontractorRequestId, employeeId])
  const removeHires = await tx.subcontractorHire.findMany({
    where: { employeeId: removeId },
  });
  for (const h of removeHires) {
    const conflict = await tx.subcontractorHire.findFirst({
      where: {
        employeeId: keepId,
        subcontractorRequestId: h.subcontractorRequestId,
      },
    });
    if (conflict) {
      log(
        `  SubcontractorHire: keep already has one for the same request — dropping remove's row`,
      );
      await tx.subcontractorHire.delete({ where: { id: h.id } });
    } else {
      await tx.subcontractorHire.update({
        where: { id: h.id },
        data: { employeeId: keepId },
      });
    }
  }

  // PerformanceReview: @@unique([employeeId, projectId])
  const removeReviews = await tx.performanceReview.findMany({
    where: { employeeId: removeId },
  });
  for (const r of removeReviews) {
    const conflict = await tx.performanceReview.findFirst({
      where: { employeeId: keepId, projectId: r.projectId },
    });
    if (conflict) {
      log(
        `  PerformanceReview (projectId=${r.projectId}): keep already has one — dropping remove's row`,
      );
      await tx.performanceReview.delete({ where: { id: r.id } });
    } else {
      await tx.performanceReview.update({
        where: { id: r.id },
        data: { employeeId: keepId },
      });
    }
  }

  // ── plain (no unique constraint) relations — just reassign ──
  const empTrainingCount = await tx.employeeTraining.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (empTrainingCount.count)
    log(`  EmployeeTraining: reassigned ${empTrainingCount.count} row(s)`);

  const safetyCount = await tx.safetyCheck.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (safetyCount.count)
    log(`  SafetyCheck: reassigned ${safetyCount.count} row(s)`);

  const candidateCount = await tx.candidate.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (candidateCount.count)
    log(`  Candidate: reassigned ${candidateCount.count} row(s)`);

  const assignmentCount = await tx.assignment.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (assignmentCount.count)
    log(`  Assignment: reassigned ${assignmentCount.count} row(s)`);

  const bookingCount = await tx.booking.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (bookingCount.count)
    log(`  Booking: reassigned ${bookingCount.count} row(s)`);

  const trainingReqCount = await tx.trainingRequestItem.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (trainingReqCount.count)
    log(`  TrainingRequestItem: reassigned ${trainingReqCount.count} row(s)`);

  const examCount = await tx.medicalExamRecord.updateMany({
    where: { employeeId: removeId },
    data: { employeeId: keepId },
  });
  if (examCount.count)
    log(`  MedicalExamRecord: reassigned ${examCount.count} row(s)`);

  // ── finally, delete the now-empty duplicate Employee row ──
  await tx.employee.delete({ where: { id: removeId } });
  log(`  Deleted duplicate Employee row.`);
}

async function main() {
  console.log(
    confirm
      ? "── LIVE RUN — will write and delete ──\n"
      : "── DRY RUN (default) — pass --confirm to actually write ──\n",
  );

  for (const { keep, remove } of PAIRS) {
    const keepEmp = await prisma.employee.findUnique({
      where: { empCode: keep },
    });
    const removeEmp = await prisma.employee.findUnique({
      where: { empCode: remove },
    });

    if (!keepEmp || !removeEmp) {
      console.log(
        `⚠️  Skipping pair (${keep} / ${remove}) — one or both not found (already merged?)`,
      );
      continue;
    }

    console.log(
      `\n${remove} (${removeEmp.fullNameTH || removeEmp.fullName}) → merge into → ${keep} (${keepEmp.fullNameTH || keepEmp.fullName})`,
    );

    if (!confirm) {
      console.log(
        "  (dry-run — no changes made; re-run with --confirm to execute)",
      );
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await mergeOne(tx, keepEmp.id, removeEmp.id, (msg) => console.log(msg));
    });
  }

  console.log(
    confirm
      ? "\nDone. Re-run findPotentialDuplicateEmployees.js and checkExamCoverage.js to confirm the numbers now look right."
      : "\nDry run complete — nothing was written. Review the plan above, then re-run with --confirm.",
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
