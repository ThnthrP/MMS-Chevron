import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_NAME = "Chevron";

// --dry-run : ไม่เขียนอะไรลง DB จริง แค่ log ว่าจะแก้ nameAlias เป็นอะไร
const DRY_RUN = process.argv.slice(2).includes("--dry-run");
if (DRY_RUN) {
  console.log("🧪 DRY RUN MODE — จะไม่เขียนอะไรลง DB จริง แค่ log ให้ดู");
}

// ============================================================
// Mapping: Excel raw name (หลังตัด field suffix + (N Year)/(No expire)
// ด้วย pipeline เดียวกับ importEmployeeTrainings.js) -> GlobalTraining.name
//
// รายการที่ rawExcelName === globalTrainingName เป๊ะ ไม่ต้องอยู่ในลิสต์นี้
// (ไม่ต้องมี nameAlias เพราะ import script จะ match ผ่าน
// `{ globalTraining: { name: layout.trainingName } }` ได้อยู่แล้ว)
//
// "Control Of Work Batch1" / "Batch2" แยกเป็นคนละ GlobalTraining แล้ว
// (ไม่ merge รวมกันแบบที่เคยพิจารณาไว้) ชื่อ Excel ตรงกับ GlobalTraining.name
// เป๊ะอยู่แล้ว จึงไม่ต้องมี alias — แค่ต้องสร้าง GlobalTraining ทั้ง 2 ตัวไว้ก่อน
// (ดู NEW_GLOBAL_TRAININGS ด้านล่าง)
// ============================================================

const ALIAS_MAP = [
  {
    rawExcelName: "IE Electrical and Instrument Basic (Basic IE)",
    globalTrainingName: "Basic IE (Pneumatic)",
  },
  {
    rawExcelName: "Basic Mech",
    globalTrainingName: "Basic Mech (Fitting)",
  },
  {
    rawExcelName:
      "Basic Rigging (include crane signal and slinging techniques) (Banks Man) By DNV GL (Thailand) Co., Ltd. / TPTI",
    globalTrainingName:
      "Basic Rigging (include crane signal and slinging techniques)",
  },
  {
    rawExcelName: "Basic Rigging / Ringing Refresher ( By Settapat )",
    globalTrainingName: "Basic Rigging (by Settapat)",
  },
  {
    rawExcelName: "ปั้นจั่น (ตามกฎหมาย) =(4 Role Crane and Rigging)",
    globalTrainingName: "4 Role Crane and Rigging",
  },
  {
    rawExcelName:
      "Helideck Crew Member (HCM) (Settapat) / Offshore Hilideck Assistant (OHA) ( TPTI )",
    globalTrainingName: "Helideck Crew Member (HCM)",
  },
  {
    rawExcelName: "Helicopter FireFighting (เฉพาะCPP Crane Assistant)",
    globalTrainingName: "Helicopter Fire Fighting",
  },
  {
    rawExcelName: "Fire Watcher ( TPTI , Settapat )",
    globalTrainingName: "Fire Watch",
  },
  {
    rawExcelName: "Rope Access Lead (L.2)",
    globalTrainingName: "Rope Access Lead",
  },
  {
    // ⚠️ L.1 = Level 1 → map ไปที่ "Rope Access Level 1" ไม่ใช่ "Rope Access"
    // เฉยๆ (DB มีทั้งสองชื่อแยกกัน) — ถ้าตั้งใจให้เป็น "Rope Access" เฉยๆ
    // ให้แก้ globalTrainingName ตรงนี้
    rawExcelName: "Rope Access (L.1)",
    globalTrainingName: "Rope Access Level 1",
  },
  {
    rawExcelName: "Marine Support ( Settapat )",
    globalTrainingName: "Marine Support",
  },
  {
    // typo ต้นฉบับ: "Combine" (Excel) vs "Combined" (DB)
    rawExcelName:
      "Working At Height - Combine Course & Rescue (Use Fall Protection System)",
    globalTrainingName:
      "Working At Height - Combined Course & Rescue (Use Fall Protection System)",
  },
  {
    rawExcelName:
      "How to use the R550 device (By Train the Trainer, Experteam.Co.Ltd.)",
    globalTrainingName: "R550 Device Operation",
  },
  {
    rawExcelName: "Confined Space",
    globalTrainingName: "Confined Space Entry & Breathing Apparatus",
  },
  {
    rawExcelName: "Crane Operator Refresher / Basic Offshore Crane Operator",
    globalTrainingName: "Basic Offshore Crane Operator",
  },
  {
    // ช่องว่างหลัง comma ต่างกัน: "A,B+,B,C" (Excel) vs "A, B+, B, C" (DB)
    rawExcelName: "Crane Operator License (Class A,B+,B,C)",
    globalTrainingName: "Crane Operator License (Class A, B+, B, C)",
  },
  {
    rawExcelName:
      "Emergency Response Team (ERT) ( =หลักสูตร Basic Fire Fighting ) /OERTM *FOERTM (เป็น Ref.OERTM) / HEC",
    globalTrainingName: "Emergency Response Team (ERT)",
  },
  {
    rawExcelName: "JDE / Ariba / FECON 7/11",
    globalTrainingName: "JDE / Ariba / FECON",
  },
  {
    rawExcelName: "HAZMAT ( TPTI , Settapat )",
    globalTrainingName: "HAZMAT",
  },
  {
    rawExcelName: "IHE Coordinator (Settapat)",
    globalTrainingName: "IHE Coordinator",
  },
  {
    rawExcelName: "Dangerous Goods (Settapat)",
    globalTrainingName: "Dangerous Goods",
  },
  {
    // GlobalTraining.name ตัวนี้ถูกสร้างไว้ด้วยช่องว่างซ้อน 2 ช่อง (ก็อปจาก Excel
    // ตรงๆ ตอนพิมพ์ใน ManageTrainings.jsx) แต่ import script ใช้ cleanText()
    // ยุบช่องว่างซ้อนให้เหลือช่องเดียวเสมอ ก่อนเทียบชื่อ — จึงต้องมี alias
    // แบบช่องว่างเดียวมาช่วยแม้ globalTrainingName เองจะสะกดไม่ตรงกับที่ import หาก็ตาม
    rawExcelName:
      "Qulified Gas Tester (QGT) ( Settapat ) / Authorised Gas Tester (AGT) TPTI",
    globalTrainingName:
      "Qulified Gas Tester (QGT)  ( Settapat ) / Authorised Gas Tester (AGT) TPTI",
  },
  {
    rawExcelName: "Electical Standard",
    globalTrainingName: "Electrical Standard",
  },
  {
    // ขาดตัว "I" ต้นคำใน Excel: "solation" vs "Isolation"
    rawExcelName: "solation of Hazardous energy (IHE)",
    globalTrainingName: "Isolation of Hazardous Energy (IHE)",
  },
  {
    rawExcelName: "Permit to Work Precedure",
    globalTrainingName: "Permit to Work Procedure",
  },
  {
    // ตัวพิมพ์ต่างกัน: "SIMOps" (Excel) vs "SIMOPs" (DB) — Postgres string
    // compare เป็น case-sensitive จึงต้องมี alias แม้จะดูเหมือนกันตาสายตา
    rawExcelName: "SIMOps",
    globalTrainingName: "SIMOPs",
  },
];

// ============================================================
// Training ที่ยังไม่มีใน DB เลย — ต้องสร้าง GlobalTraining ใหม่ก่อน
// (ชื่อ Excel ตรงกับชื่อที่จะสร้าง verbatim ไม่ต้องมี alias)
// ============================================================

const NEW_GLOBAL_TRAININGS = [
  "Electrical Safe Work Qualify Person, Standby Person (ช่างไฟฟ้าภายในอาคาร คร11 คร12)",
  "Field Measurement Competency",
  "Tropical Basic Offshore Safety Training (BOSIET / T-BOSIET / T-FOET)",
  "Helicopter Refueling & Fuel Quality Control",
  "Qulified Gas Tester (QGT)  ( Settapat ) / Authorised Gas Tester (AGT) TPTI",
  "Control Of Work Batch1",
  "Control Of Work Batch2",
];

async function main() {
  console.log("🚀 Seeding ClientTraining.nameAlias for Chevron...");

  const client = await prisma.client.findFirst({
    where: { name: CLIENT_NAME },
  });
  if (!client) throw new Error(`Client not found: ${CLIENT_NAME}`);

  const contract = await prisma.contract.findFirst({
    where: { clientId: client.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!contract) throw new Error(`Contract not found: ${CLIENT_NAME}`);

  // ── 1) ยืนยันว่า GlobalTraining ใหม่ 5 ตัวถูกสร้างไว้แล้วจริง ──
  console.log("\n🔎 Checking newly-created GlobalTrainings exist...");
  for (const name of NEW_GLOBAL_TRAININGS) {
    const gt = await prisma.globalTraining.findUnique({ where: { name } });
    if (!gt) {
      console.log(`⚠ NOT FOUND — please create GlobalTraining: "${name}"`);
    } else {
      console.log(`✔ ${name}`);
    }
  }

  // ── 2) อัปเดต nameAlias ทีละรายการ ──
  console.log("\n🔧 Updating ClientTraining.nameAlias...");

  let updated = 0;
  let missingGlobalTraining = 0;
  let missingClientTraining = 0;

  for (const { rawExcelName, globalTrainingName } of ALIAS_MAP) {
    const globalTraining = await prisma.globalTraining.findUnique({
      where: { name: globalTrainingName },
    });

    if (!globalTraining) {
      console.log(
        `⚠ GlobalTraining not found: "${globalTrainingName}" (for Excel: "${rawExcelName}")`,
      );
      missingGlobalTraining++;
      continue;
    }

    const clientTraining = await prisma.clientTraining.findFirst({
      where: { contractId: contract.id, globalTrainingId: globalTraining.id },
    });

    if (!clientTraining) {
      console.log(
        `⚠ ClientTraining not found for "${globalTrainingName}" under this contract ` +
          `— ต้องสร้าง ClientTraining ก่อน (ต้องการ trainingStandardId ซึ่งสคริปต์นี้ไม่กล้าเดาให้)`,
      );
      missingClientTraining++;
      continue;
    }

    if (clientTraining.nameAlias === rawExcelName) {
      console.log(`= ${globalTrainingName} (alias already correct)`);
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `🧪 [dry-run] ${globalTrainingName} — would set alias: "${clientTraining.nameAlias || "(none)"}" → "${rawExcelName}"`,
      );
    } else {
      await prisma.clientTraining.update({
        where: { id: clientTraining.id },
        data: { nameAlias: rawExcelName },
      });
      console.log(`✔ ${globalTrainingName} ← alias: "${rawExcelName}"`);
    }
    updated++;
  }

  console.log("\n================================");
  console.log(
    DRY_RUN
      ? `✅ Dry Run Done. Would update: ${updated}`
      : `✅ Done. Updated: ${updated}`,
  );
  if (missingGlobalTraining > 0) {
    console.log(`⚠ Missing GlobalTraining: ${missingGlobalTraining}`);
  }
  if (missingClientTraining > 0) {
    console.log(
      `⚠ Missing ClientTraining (needs manual creation): ${missingClientTraining}`,
    );
  }
}

main()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
