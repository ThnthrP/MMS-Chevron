// ============================================================
// import-position-matrix.js — ตั้ง Training Matrix ของตำแหน่งจาก sheet แบบ
// "Employee Necessary Competence Matrix" (เช่น sheet "Assist Floor Opt Training Requi")
//
//   คอลัมน์ A = ชื่อตำแหน่ง · แถวหัว = ชื่อ training (หาแถวที่มีคำว่า "Position" เอง)
//   ช่อง X = ต้องมี (required) · ช่องว่าง / N/A = ไม่ต้อง
//
// วิธีใช้ (ในโฟลเดอร์ backend) — ไม่ใส่ --apply = ดูผลอย่างเดียว
//   node scripts/import-position-matrix.js --file ~/afo.xlsx --sheet "Assist Floor Opt Training Requi"
//   node scripts/import-position-matrix.js --file ~/afo.xlsx --sheet "Assist Floor Opt Training Requi" --apply
//
// ตำแหน่งในไฟล์ต้องมีในระบบแล้ว (ชื่อตรงกัน ไม่สนตัวพิมพ์/ช่องว่าง)
// matrix เดิมของตำแหน่งเหล่านี้ใน contract Chevron จะถูกแทนที่ทั้งหมดด้วยค่าจากไฟล์
// ชื่อ training จับคู่กับชื่อกลาง / "ชื่อที่ HR ใช้ในไฟล์" (หลายชื่อคั่นด้วย |) + ALIASES ด้านล่าง
//
// ⚠ ไฟล์ Excel มีชื่อบริษัท/ตำแหน่งเท่านั้น (ไม่มีข้อมูลพนักงาน) — แต่ลบออกจาก server หลังใช้
// ============================================================
import "dotenv/config";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CLIENT = "Chevron";

// ชื่อในไฟล์ matrix → ชื่อ training ในระบบ (กรณีที่ "ชื่อที่ HR ใช้ในไฟล์" ใส่ไม่ได้/ไม่อยากใส่)
// T-BOSIET และ T-FOET → หลักสูตรรวมตัวเดียว (HR บันทึกใบรวมกันใน Training Record)
const COMBINED_TBOSIET = "T-BOSIET + CA-EBS + TSBB / T-FOET + CA-EBS + TSBB*Personnel Basket Transfer";
const ALIASES = {
  "Tropical Basis Offshore Safety Induction and Emegency Training": COMBINED_TBOSIET,
  "Tropical Basic Offshore Safety Induction and Emergency Training": COMBINED_TBOSIET,
  "Tropical Further Offshore Emergency Training ( T-FOET)": COMBINED_TBOSIET,
  "Tropical Further Offshore Emergency Training (T-FOET)": COMBINED_TBOSIET,
  "Basic IE": "Basic IE (Pneumatic)", // HR เรียก "IE Electrical and Instrument Basic (Basic IE)"
  "Electical Standard": "Electrical Standard", // สะกดผิดในไฟล์
};

const argv = process.argv.slice(2);
const opt = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const APPLY = argv.includes("--apply");
const file = opt("--file");
const sheetName = opt("--sheet");

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const looseKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s\-_/().,:;'"&]+/g, "");
const PERIOD_SUFFIX_RE = /\s*\(\s*(?:\d+\s*,?\s*)*(?:\d+\s*years?|no\s*expire)\s*\)\s*$/i;
const nameKey = (s) => looseKey(String(s || "").replace(PERIOD_SUFFIX_RE, ""));
const isX = (v) => /^x$/i.test(clean(v));

function readSheet() {
  if (!file) throw new Error("ต้องมี --file path/to/file.xlsx");
  const wb = xlsx.readFile(file.replace(/^~/, process.env.HOME || "~"));
  const name =
    (sheetName && wb.SheetNames.find((n) => n.trim().toLowerCase() === sheetName.trim().toLowerCase())) ||
    wb.SheetNames.find((n) => /train(ing)?\s*requi|competence/i.test(n));
  if (!name) throw new Error(`ไม่พบ sheet ${sheetName ? `"${sheetName}"` : "matrix"} — sheet ที่มี: ${wb.SheetNames.join(", ")}`);
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });

  // แถวหัว = แถวที่คอลัมน์ A เป็น "Position" (ชื่อ training อยู่แถวเดียวกัน)
  const headerIdx = rows.findIndex((r) => /^position$/i.test(clean((r || [])[0])));
  if (headerIdx < 0) throw new Error('ไม่พบแถวหัวที่คอลัมน์ A = "Position"');
  const header = rows[headerIdx];

  const trainings = [];
  for (let c = 2; c < header.length; c++) {
    const t = clean(header[c]);
    if (t) trainings.push({ col: c, name: t });
  }
  const positions = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const pos = clean((rows[r] || [])[0]);
    if (!pos) continue;
    positions.push({
      row: r + 1,
      name: pos,
      required: trainings.filter((t) => isX(rows[r][t.col])).map((t) => t.name),
    });
  }
  return { sheet: name, headerRow: headerIdx + 1, trainings, positions };
}

async function main() {
  const parsed = readSheet();
  console.log(`\nsheet "${parsed.sheet}" · หัวตารางแถว ${parsed.headerRow} · training ${parsed.trainings.length} คอลัมน์ · ตำแหน่ง ${parsed.positions.length}`);

  const client = await prisma.client.findFirst({ where: { name: CLIENT } });
  const contract = client
    ? await prisma.contract.findFirst({ where: { clientId: client.id, isActive: true }, orderBy: { createdAt: "desc" } })
    : null;
  if (!contract) throw new Error(`ไม่พบ contract ที่ active ของ ${CLIENT}`);
  console.log(`contract: ${contract.name}`);

  // ── ตำแหน่ง ──
  const allPos = await prisma.position.findMany({ select: { id: true, name: true } });
  const posByKey = new Map(allPos.map((p) => [looseKey(p.name), p]));
  const missingPos = parsed.positions.filter((p) => !posByKey.has(looseKey(p.name)));
  if (missingPos.length) {
    throw new Error(`ไม่พบตำแหน่งในระบบ: ${missingPos.map((p) => `"${p.name}"`).join(", ")} — สร้าง/แก้ชื่อที่หน้า Positions ก่อน`);
  }

  // ── training ──
  const gts = await prisma.globalTraining.findMany({
    select: { id: true, name: true, fullName: true, trainingStandards: { select: { id: true }, take: 1 } },
  });
  const gtByKey = new Map();
  const add = (k, gt) => k && !gtByKey.has(k) && gtByKey.set(k, gt);
  for (const gt of gts) add(nameKey(gt.name), gt);
  for (const gt of gts) for (const n of String(gt.fullName || "").split("|")) add(nameKey(n), gt);
  const resolve = (name) => gtByKey.get(nameKey(ALIASES[name] || name)) || gtByKey.get(nameKey(name)) || null;

  const unmapped = parsed.trainings.filter((t) => !resolve(t.name));
  const noStandard = [
    ...new Set(
      parsed.trainings
        .map((t) => resolve(t.name))
        .filter((gt) => gt && !gt.trainingStandards.length)
        .map((gt) => gt.name),
    ),
  ];

  const cts = await prisma.clientTraining.findMany({ where: { contractId: contract.id } });
  const ctByGt = new Map(cts.map((ct) => [ct.globalTrainingId, ct]));

  // ── แผน ──
  const plan = parsed.positions.map((p) => {
    const pos = posByKey.get(looseKey(p.name));
    const gtIds = [...new Set(p.required.map((n) => resolve(n)?.id).filter(Boolean))];
    const skipped = p.required.filter((n) => !resolve(n));
    return { ...p, pos, gtIds, skipped };
  });
  const existing = await prisma.positionRequirement.findMany({
    where: { contractId: contract.id, positionId: { in: plan.map((p) => p.pos.id) } },
    select: { positionId: true },
  });

  console.log("");
  for (const p of plan) {
    const before = existing.filter((e) => e.positionId === p.pos.id).length;
    console.log(`• ${p.pos.name}: X ในไฟล์ ${p.required.length} → matrix ${p.gtIds.length} รายการ (เดิม ${before})`);
    if (p.required.length !== p.gtIds.length + p.skipped.length)
      console.log(`    (บางคอลัมน์ชี้ไป training เดียวกัน เช่น T-BOSIET / T-FOET → นับเป็น 1)`);
    if (p.skipped.length) console.log(`    ⚠ map ไม่ได้ (ข้าม): ${p.skipped.join(" · ")}`);
  }
  if (unmapped.length) {
    console.log(`\n⚠ ชื่อ training ในไฟล์ที่ map ไม่ได้ ${unmapped.length} ตัว — สร้างที่หน้า Trainings หรือใส่ใน "ชื่อที่ HR ใช้ในไฟล์":`);
    unmapped.forEach((t) => console.log(`    • ${t.name}`));
  }
  const usedNoStd = noStandard.filter((n) => plan.some((p) => p.gtIds.some((id) => gts.find((g) => g.id === id)?.name === n)));
  const needCt = [...new Set(plan.flatMap((p) => p.gtIds))].filter((id) => !ctByGt.has(id));
  if (usedNoStd.length) {
    console.log(`\n✕ training ที่ยังไม่มี Training Standard (ตั้ง Source/Validity ที่หน้า Trainings ก่อน): ${usedNoStd.join(" · ")}`);
  }
  console.log(`\nจะผูก training กับ contract ${CLIENT} เพิ่ม ${needCt.length} ตัว`);

  if (!APPLY) {
    console.log(`\n(ดูผลอย่างเดียว — ยังไม่ได้แก้ข้อมูล) ถ้าถูกต้อง รันซ้ำพร้อม --apply\n`);
    return;
  }
  if (usedNoStd.length) throw new Error("มี training ที่ยังไม่มี Training Standard — ไม่รันให้");

  await prisma.$transaction(
    async (tx) => {
      // ผูก training กับ contract (ถ้ายังไม่ผูก)
      for (const gtId of needCt) {
        const gt = gts.find((g) => g.id === gtId);
        const ct = await tx.clientTraining.create({
          data: { globalTrainingId: gtId, contractId: contract.id, trainingStandardId: gt.trainingStandards[0].id },
        });
        ctByGt.set(gtId, ct);
      }
      for (const p of plan) {
        await tx.positionRequirement.deleteMany({ where: { contractId: contract.id, positionId: p.pos.id } });
        for (const gtId of p.gtIds) {
          await tx.positionRequirement.create({
            data: {
              positionId: p.pos.id,
              clientTrainingId: ctByGt.get(gtId).id,
              contractId: contract.id,
              requirementType: "required",
              sourceMatrixCode: "X",
              sourceMatrixSheet: parsed.sheet,
            },
          });
        }
      }
    },
    { timeout: 60000 },
  );
  console.log(`\n✓ ตั้ง matrix แล้ว — ${plan.map((p) => `${p.pos.name} ${p.gtIds.length}`).join(" · ")}\n`);
}

try {
  await main();
} catch (err) {
  console.error(`\n✕ ${err.message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
