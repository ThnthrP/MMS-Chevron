// ============================================================
// merge-trainings.js — รวม / ลบ Global Training ที่ซ้ำกัน (ตามที่ HR ขอ)
//
// วิธีใช้ (ในโฟลเดอร์ backend) — ไม่ใส่ --apply = ดูผลอย่างเดียว ไม่แก้ข้อมูล
//
//   ดูชื่อจริงในระบบก่อน:
//     node scripts/merge-trainings.js list "control of work"
//
//   รวมใบ cert ของพนักงาน + Training Matrix จากหลายหลักสูตรไปที่หลักสูตรใหม่:
//     node scripts/merge-trainings.js merge --into "MSW Awareness" --preset msw \
//       --skip-position "Assistant Floor Operator"
//     ... --apply
//     (หรือระบุเอง: --from "ชื่อ 1" --from "ชื่อ 2" ...)
//
//   ลบใบ cert ของพนักงานในหลักสูตรที่ซ้ำ (เช็กก่อนว่าทุกคนมีใบที่เก็บไว้แล้ว):
//     node scripts/merge-trainings.js delete --name "Control of Work Training (CoW)" \
//       --covered-by "Control Of Work Batch1" --covered-by "Control Of Work Batch2" \
//       --skip-position "Assistant Floor Operator"
//     ... --apply
//
// หลักสูตรเดิมใน Global Training (หน้า Trainings) ไม่ถูกลบ — ยังใช้กับตำแหน่งที่ skip ได้
// --skip-position "ชื่อตำแหน่ง" (ใส่ซ้ำได้) = ไม่แตะทั้ง Training Matrix ของตำแหน่งนั้น
//   และใบ cert ของพนักงานที่อยู่ตำแหน่งนั้น
//
// ⚠ ก่อน --apply ให้ backup DB ก่อนเสมอ — ไฟล์ backup มีข้อมูลพนักงาน เก็บบน server เท่านั้น
// ทุกอย่างทำใน transaction เดียว — ถ้าพังกลางทาง ข้อมูลไม่เปลี่ยน
// ============================================================
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ชื่อหลักสูตร MSW เดิม (ตามชื่อใน Global Training ของระบบ)
const PRESETS = {
  msw: [
    "MSW Process Overview",
    "Bypassing Critical Protection (BCP)",
    "Confined Space Entry Standard",
    "Electrical Standard",
    "Hazard Analysis Procedure",
    "Hot Work Standard",
    "Isolation of Hazardous Energy (IHE)",
    "Lifting and Rigging Standard",
    "Permit to Work Procedure",
    "Working At Height Standard",
    "Stop Work Authority Application",
    "SIMOPs",
  ],
};

// ── args ──
const argv = process.argv.slice(2);
const cmd = argv[0];
const APPLY = argv.includes("--apply");
const FORCE = argv.includes("--force");
const many = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] ? [argv[i + 1]] : []));
const one = (flag) => many(flag)[0];

const log = (...a) => console.log(...a);
const fail = (msg) => {
  console.error(`\n✕ ${msg}\n`);
  process.exitCode = 1;
};

async function findByNames(names) {
  const rows = await prisma.globalTraining.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  const found = new Map(rows.map((r) => [r.name, r]));
  return { rows, missing: names.filter((n) => !found.has(n)) };
}

// จำนวนข้อมูลที่อ้างถึง training นี้
async function usage(id) {
  const [certsLatest, certsAll, people, standards, clientTrainings, requirements, gaps, requestItems] =
    await Promise.all([
      prisma.employeeTraining.count({ where: { globalTrainingId: id, isLatest: true } }),
      prisma.employeeTraining.count({ where: { globalTrainingId: id } }),
      prisma.employeeTraining.findMany({
        where: { globalTrainingId: id, isLatest: true },
        distinct: ["employeeId"],
        select: { employeeId: true },
      }),
      prisma.trainingStandard.count({ where: { globalTrainingId: id } }),
      prisma.clientTraining.count({ where: { globalTrainingId: id } }),
      prisma.positionRequirement.count({ where: { clientTraining: { globalTrainingId: id } } }),
      prisma.candidateGap.count({ where: { globalTrainingId: id } }),
      prisma.trainingRequestItem.count({ where: { globalTrainingId: id } }),
    ]);
  return {
    certsLatest,
    certsAll,
    people: people.length,
    standards,
    clientTrainings,
    requirements,
    gaps,
    requestItems,
  };
}

const fmtUsage = (u) =>
  `cert ${u.certsLatest} ใบ (${u.people} คน, รวมประวัติ ${u.certsAll}) · matrix ${u.requirements} ตำแหน่ง ` +
  `(${u.clientTrainings} contract) · standard ${u.standards} · คำขออบรม ${u.requestItems} · gap ${u.gaps}`;

// ════════════════════════════════════════════════════════════
// list — ดูชื่อจริง
// ════════════════════════════════════════════════════════════
async function cmdList() {
  const q = argv[1];
  if (!q) return fail('ใส่คำค้น เช่น: list "control of work"');
  const rows = await prisma.globalTraining.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, fullName: true },
    orderBy: { name: "asc" },
  });
  if (!rows.length) return log(`ไม่พบ training ที่มีคำว่า "${q}"`);
  for (const r of rows) {
    log(`• "${r.name}"${r.fullName && r.fullName !== r.name ? `  (ชื่อใน HR: ${r.fullName})` : ""}`);
    log(`    ${fmtUsage(await usage(r.id))}`);
  }
}

// ── ตำแหน่งที่ไม่แตะ (--skip-position) → id ตำแหน่ง + id พนักงานในตำแหน่งนั้น ──
async function loadSkip() {
  const names = many("--skip-position");
  if (!names.length) return { positionIds: [], employeeIds: [], label: "" };
  const positions = await prisma.position.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  const notFound = names.filter((n) => !positions.some((p) => p.name === n));
  if (notFound.length) throw new Error(`ไม่พบตำแหน่ง: ${notFound.join(", ")}`);
  const positionIds = positions.map((p) => p.id);
  const employees = await prisma.employee.findMany({
    where: { positionId: { in: positionIds } },
    select: { id: true },
  });
  return {
    positionIds,
    employeeIds: employees.map((e) => e.id),
    label: positions.map((p) => `"${p.name}"`).join(", "),
  };
}

// ════════════════════════════════════════════════════════════
// merge — ย้ายใบ cert + matrix จาก --from ไป --into (ไม่ลบหลักสูตรเดิม)
// ════════════════════════════════════════════════════════════
async function cmdMerge() {
  const intoName = one("--into");
  const fromNames = [...new Set([...(PRESETS[one("--preset")] || []), ...many("--from")])];
  if (!intoName || fromNames.length === 0)
    return fail('ต้องมี --into "ชื่อใหม่" และ --preset msw หรือ --from "ชื่อเดิม" อย่างน้อย 1 ตัว');
  if (fromNames.includes(intoName)) return fail("--into ต้องไม่อยู่ในรายการ --from");

  const target = await prisma.globalTraining.findUnique({
    where: { name: intoName },
    include: { trainingStandards: true },
  });
  if (!target)
    return fail(
      `ยังไม่มี "${intoName}" ในระบบ — สร้างที่ Training Matrix › Trainings › + Add Training ก่อน ` +
        `(ตั้ง Source / Validity ให้เรียบร้อย) แล้วค่อยรันใหม่`,
    );

  const { rows: sources, missing } = await findByNames(fromNames);
  log(`\nรวมเข้า: "${target.name}"`);
  log(`  ตอนนี้: ${fmtUsage(await usage(target.id))}`);
  log(`\nจาก ${sources.length} training (หลักสูตรเดิมไม่ถูกลบ):`);
  for (const s of sources) log(`  • ${s.name}\n      ${fmtUsage(await usage(s.id))}`);
  if (missing.length) {
    log(`\n⚠ ไม่พบชื่อเหล่านี้ (สะกดไม่ตรงหรือถูกลบไปแล้ว — ข้าม):`);
    missing.forEach((n) => log(`  • ${n}`));
  }
  if (sources.length === 0) return fail("ไม่มี training ให้รวม");
  if (missing.length && APPLY && !FORCE)
    return fail(`มีชื่อที่ไม่พบ ${missing.length} ชื่อ — เช็กการสะกดด้วย list ก่อน (ถ้าตั้งใจข้าม ใส่ --force)`);

  const sourceIds = sources.map((s) => s.id);
  const skip = await loadSkip();
  const notSkippedEmp = skip.employeeIds.length ? { employeeId: { notIn: skip.employeeIds } } : {};
  const notSkippedPos = (r) => !skip.positionIds.includes(r.positionId);

  // ── Training Matrix ที่จะย้าย / คงไว้ ──
  const sourceCts = await prisma.clientTraining.findMany({ where: { globalTrainingId: { in: sourceIds } } });
  const allReqs = await prisma.positionRequirement.findMany({
    where: { clientTrainingId: { in: sourceCts.map((c) => c.id) } },
  });
  const moveReqs = allReqs.filter(notSkippedPos);
  const keepReqs = allReqs.filter((r) => !notSkippedPos(r));
  const movePositions = new Set(moveReqs.map((r) => r.positionId));
  log(`\nTraining Matrix: ${movePositions.size} ตำแหน่งจะเปลี่ยนเป็น "${target.name}"`);
  if (skip.label) {
    log(`  ตำแหน่งที่ไม่แตะ: ${skip.label} — คงหลักสูตรเดิมไว้ ${keepReqs.length} รายการ`);
    log(`  พนักงานในตำแหน่งนี้ ${skip.employeeIds.length} คน — ใบ cert เดิมคงไว้ ไม่ย้าย`);
  }
  const needCt = moveReqs.some(
    (r) => !sourceCts.find((c) => c.id === r.clientTrainingId && c.globalTrainingId === target.id),
  );
  if (needCt && target.trainingStandards.length === 0)
    return fail(`"${target.name}" ยังไม่มี Training Standard — ตั้ง Source / Validity ที่หน้า Trainings ก่อน`);

  // ── ใบ cert ที่จะย้าย ──
  const people = await prisma.employeeTraining.findMany({
    where: { globalTrainingId: { in: sourceIds }, ...notSkippedEmp },
    distinct: ["employeeId"],
    select: { employeeId: true },
  });
  log(`\nใบ cert: พนักงาน ${people.length} คนจะได้ "${target.name}" (ใช้ใบที่วัน Issued ล่าสุด ใบอื่นเก็บเป็นประวัติ)`);
  log(`  วัน Issued / Expiry ของใบใหม่ = ของใบเดิมที่เลือกมา (ไม่คำนวณใหม่)`);

  const latestRecs = await prisma.employeeTraining.findMany({
    where: { globalTrainingId: { in: sourceIds }, isLatest: true, ...notSkippedEmp },
    select: { employeeId: true, completedDate: true, expiryDate: true, employee: { select: { empId: true, empCode: true } } },
  });
  const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");
  const byEmp = new Map();
  for (const r of latestRecs) {
    const e = byEmp.get(r.employeeId) || { code: r.employee?.empId || r.employee?.empCode, issued: new Set(), expiry: new Set() };
    e.issued.add(day(r.completedDate));
    e.expiry.add(day(r.expiryDate));
    byEmp.set(r.employeeId, e);
  }
  const diff = [...byEmp.values()].filter((e) => e.issued.size > 1 || e.expiry.size > 1);
  log(`  วันที่ของใบย่อยตรงกันทุกใบ ${byEmp.size - diff.length}/${byEmp.size} คน`);
  if (diff.length) {
    log(`  ⚠ ${diff.length} คนมีวันที่ไม่ตรงกัน — จะใช้ใบที่วัน Issued ล่าสุด:`);
    diff.slice(0, 20).forEach((e) =>
      log(`    • ${e.code}  issued: ${[...e.issued].sort().join(", ")}  ·  expiry: ${[...e.expiry].sort().join(", ")}`),
    );
    if (diff.length > 20) log(`    … อีก ${diff.length - 20} คน`);
  }

  if (!APPLY) {
    log(`\n(ดูผลอย่างเดียว — ยังไม่ได้แก้ข้อมูล) ถ้าถูกต้อง รันซ้ำพร้อม --apply\n`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      // 1) Training Matrix: ตำแหน่งที่ไม่ได้ skip → ย้ายไป ClientTraining ของหลักสูตรใหม่ (ต่อ contract)
      const RANK = { mandatory: 3, required: 3, relevant: 2, assigned: 1 };
      const destByContract = new Map(
        (await tx.clientTraining.findMany({ where: { globalTrainingId: target.id } })).map((ct) => [ct.contractId, ct]),
      );
      for (const r of moveReqs) {
        let dest = destByContract.get(r.contractId);
        if (!dest) {
          dest = await tx.clientTraining.create({
            data: { globalTrainingId: target.id, contractId: r.contractId, trainingStandardId: target.trainingStandards[0].id },
          });
          destByContract.set(r.contractId, dest);
        }
        const existing = await tx.positionRequirement.findUnique({
          where: {
            positionId_clientTrainingId_contractId: {
              positionId: r.positionId,
              clientTrainingId: dest.id,
              contractId: r.contractId,
            },
          },
        });
        if (!existing) {
          await tx.positionRequirement.update({ where: { id: r.id }, data: { clientTrainingId: dest.id } });
        } else {
          if ((RANK[r.requirementType] || 0) > (RANK[existing.requirementType] || 0))
            await tx.positionRequirement.update({
              where: { id: existing.id },
              data: { requirementType: r.requirementType, sourceMatrixCode: r.sourceMatrixCode },
            });
          await tx.positionRequirement.delete({ where: { id: r.id } });
        }
      }

      // 2) ใบ cert ของพนักงาน (ยกเว้นคนในตำแหน่งที่ skip) → หลักสูตรใหม่
      //    rawTrainingName เดิมยังอยู่ ดูย้อนหลังได้
      const moving = await tx.employeeTraining.findMany({
        where: { globalTrainingId: { in: sourceIds }, ...notSkippedEmp },
        select: { id: true, employeeId: true },
      });
      const movedEmp = [...new Set(moving.map((m) => m.employeeId))];
      await tx.employeeTraining.updateMany({
        where: { id: { in: moving.map((m) => m.id) } },
        data: { globalTrainingId: target.id, clientTrainingId: null },
      });

      // 3) แต่ละคนเหลือใบที่ใช้งาน (isLatest) ใบเดียว = วัน Issued ล่าสุด
      const recs = await tx.employeeTraining.findMany({
        where: { globalTrainingId: target.id, employeeId: { in: movedEmp } },
        select: { id: true, employeeId: true, completedDate: true, createdAt: true },
      });
      const best = new Map();
      const score = (r) => [r.completedDate ? r.completedDate.getTime() : -Infinity, r.createdAt.getTime()];
      for (const r of recs) {
        const cur = best.get(r.employeeId);
        if (!cur) best.set(r.employeeId, r);
        else {
          const [a1, a2] = score(r);
          const [b1, b2] = score(cur);
          if (a1 > b1 || (a1 === b1 && a2 > b2)) best.set(r.employeeId, r);
        }
      }
      const keepIds = [...best.values()].map((r) => r.id);
      await tx.employeeTraining.updateMany({
        where: { globalTrainingId: target.id, employeeId: { in: movedEmp }, id: { notIn: keepIds } },
        data: { isLatest: false },
      });
      await tx.employeeTraining.updateMany({ where: { id: { in: keepIds } }, data: { isLatest: true } });

      // 4) คำขออบรมที่ยังค้าง (ยกเว้นคนในตำแหน่งที่ skip)
      await tx.trainingRequestItem.updateMany({
        where: { globalTrainingId: { in: sourceIds }, ...notSkippedEmp },
        data: { globalTrainingId: target.id },
      });
    },
    { timeout: 120000 },
  );

  log(`\n✓ รวมเสร็จ — ตอนนี้ "${target.name}": ${fmtUsage(await usage(target.id))}`);
  log(`  หลักสูตรเดิมยังอยู่ในหน้า Trainings (ใช้กับตำแหน่งที่ skip)\n`);
}

// ════════════════════════════════════════════════════════════
// delete — ลบ "ใบ cert ของพนักงาน" ในหลักสูตรที่ซ้ำ (ไม่ลบหลักสูตรใน Global Training / matrix)
// ════════════════════════════════════════════════════════════
async function cmdDelete() {
  const name = one("--name");
  const coveredNames = many("--covered-by");
  if (!name) return fail('ต้องมี --name "ชื่อหลักสูตร"');

  const src = await prisma.globalTraining.findUnique({ where: { name } });
  if (!src) return fail(`ไม่พบ "${name}" — ดูชื่อจริงด้วย: list "คำค้น"`);
  const skip = await loadSkip();
  const notSkippedEmp = skip.employeeIds.length ? { employeeId: { notIn: skip.employeeIds } } : {};

  log(`\nหลักสูตร: "${src.name}" (ไม่ลบออกจากหน้า Trainings)\n  ตอนนี้: ${fmtUsage(await usage(src.id))}`);
  if (skip.label) log(`  ตำแหน่งที่ไม่แตะ: ${skip.label} — พนักงาน ${skip.employeeIds.length} คน ใบ cert คงไว้`);

  const { rows: covers, missing } = await findByNames(coveredNames);
  if (missing.length) return fail(`ไม่พบ --covered-by: ${missing.join(", ")}`);

  const holders = await prisma.employeeTraining.findMany({
    where: { globalTrainingId: src.id, isLatest: true, ...notSkippedEmp },
    distinct: ["employeeId"],
    select: { employeeId: true, employee: { select: { empId: true, empCode: true, fullName: true } } },
  });
  const allRecs = await prisma.employeeTraining.count({ where: { globalTrainingId: src.id, ...notSkippedEmp } });
  log(`  จะลบใบ cert ของ ${holders.length} คน (รวมประวัติ ${allRecs} รายการ)`);
  if (covers.length === 0 && holders.length > 0 && !FORCE)
    return fail(`ใส่ --covered-by "ชื่อใบที่เก็บไว้" เพื่อเช็กว่าทุกคนมีใบนั้นแล้ว (หรือ --force ถ้าแน่ใจ)`);

  let uncovered = [];
  if (covers.length) {
    const coveredSet = new Set(
      (
        await prisma.employeeTraining.findMany({
          where: { globalTrainingId: { in: covers.map((c) => c.id) }, isLatest: true },
          distinct: ["employeeId"],
          select: { employeeId: true },
        })
      ).map((r) => r.employeeId),
    );
    uncovered = holders.filter((h) => !coveredSet.has(h.employeeId));
    log(`\nเช็กกับ: ${covers.map((c) => `"${c.name}"`).join(", ")}`);
    log(`  มีใบที่เก็บไว้แล้ว ${holders.length - uncovered.length}/${holders.length} คน`);
    if (uncovered.length) {
      log(`  ⚠ ไม่มีใบที่เก็บไว้ ${uncovered.length} คน — ลบแล้วคนเหล่านี้จะไม่มีประวัติหลักสูตรนี้:`);
      uncovered.slice(0, 30).forEach((h) => log(`    • ${h.employee?.empId || h.employee?.empCode} ${h.employee?.fullName}`));
      if (uncovered.length > 30) log(`    … อีก ${uncovered.length - 30} คน`);
    }
  }

  if (!APPLY) {
    log(`\n(ดูผลอย่างเดียว — ยังไม่ได้แก้ข้อมูล) ถ้าถูกต้อง รันซ้ำพร้อม --apply\n`);
    return;
  }
  if (uncovered.length && !FORCE)
    return fail(`ยังมี ${uncovered.length} คนที่ไม่มีใบที่เก็บไว้ — ไม่ลบ (ถ้า HR ยืนยันให้ลบได้ ใส่ --force)`);

  const { count } = await prisma.employeeTraining.deleteMany({
    where: { globalTrainingId: src.id, ...notSkippedEmp },
  });
  log(`\n✓ ลบใบ cert "${src.name}" ${count} รายการ — หลักสูตรยังอยู่ในหน้า Trainings\n`);
}

// ════════════════════════════════════════════════════════════
try {
  if (cmd === "list") await cmdList();
  else if (cmd === "merge") await cmdMerge();
  else if (cmd === "delete") await cmdDelete();
  else fail("คำสั่ง: list | merge | delete — ดูวิธีใช้ที่หัวไฟล์");
} catch (err) {
  // FK อื่นที่สคริปต์ไม่รู้จัก → transaction ยกเลิกทั้งหมด ข้อมูลไม่เปลี่ยน
  console.error("\n✕ ไม่สำเร็จ — ข้อมูลไม่ถูกแก้:", err.message, "\n");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
