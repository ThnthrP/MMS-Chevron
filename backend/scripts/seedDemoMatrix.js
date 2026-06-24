// ============================================================
// seedDemoMatrix.js — เติม Training Matrix + 100% certs สำหรับ DEMO
//
// Phase 1: position ที่ "มีพนักงาน" + อยู่ใน MATRIX ด้านล่าง
//          → สร้าง PositionRequirement (GlobalTraining→TrainingStandard
//            →ClientTraining→PositionRequirement) ใต้ contract Chevron Matrix 2025
// Phase 2: พนักงานที่มี training cert = 0 (ยังไม่มีเลย)
//          → ใส่ EmployeeTraining ครบตาม requirement ของ position ตัวเอง
//            (completed, หมดอายุอีก 3 ปี) → % Match = 100%
//
// ทั้งสองเฟส resolve training ผ่าน GlobalTraining ตัวเดียวกัน → ตรงกันเสมอ
//
// การใช้งาน (รันใน backend container เพื่อให้ใช้ DATABASE_URL=db:5432):
//   docker compose cp seedDemoMatrix.js chevron-backend:/app/seedDemoMatrix.js
//   docker compose exec backend node /app/seedDemoMatrix.js            # DRY-RUN (ไม่เขียน)
//   docker compose exec backend node /app/seedDemoMatrix.js --apply    # เขียนจริง
//
// option เสริม:
//   --matrix-only   ทำเฉพาะ Phase 1
//   --certs-only    ทำเฉพาะ Phase 2
//   --contract "ชื่อ contract"   ระบุ contract เอง (default: หา Chevron Matrix 2025)
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const MATRIX_ONLY = process.argv.includes("--matrix-only");
const CERTS_ONLY = process.argv.includes("--certs-only");
const DRY = !APPLY;
const CONTRACT_ARG = (() => {
  const i = process.argv.indexOf("--contract");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const CERT_VALID_YEARS = 3;

// ── ชื่อ training ที่ยาว/ซ้ำบ่อย (กัน typo) ──
const SO = "Safety Orientation - Incident Reporting, BBS, HazOb, SWC";
const WAH =
  "Working At Height - Combined Course & Rescue (Use Fall Protection System)";
const PB = "Painting & Blasting (International/Dimet/Jotun) / Sand Blasting";
const BR = "Basic Rigging (include crane signal and slinging techniques)";
const BCO = "Basic Crane Operator (Comply with API RP2D or equivalent)";
const COL = "Crane Operator License (Class A, B+, B, C)";
const PLE = "PLE & CCU Inspection & Certification";
const BCP = "Bypassing Critical Protection (BCP)";
const WAHS = "Working At Height Standard";
const PTW = "Permit to Work Procedure";
const LRS = "Lifting and Rigging Standard";
const HAP = "Hazard Analysis Procedure";
const HWS = "Hot Work Standard";
const SWA = "Stop Work Authority Application";
const MSW = "MSW Process Overview";
const CSES = "Confined Space Entry Standard";
const CSE = "Confined Space Entry (by laws)";
const ERT = "Emergency Response Team (ERT)";
const AFA = "Advanced First Aid Training";
const HCM = "Helideck Crew Member (HCM)";
const BMF = "Basic Mech (Fitting)";
const MFM = "Mech for Maintenance";
const BS = "Basic Scaffolding";
const RA = "Rope Access";
const RAL = "Rope Access Lead";
const OSO_SUP = "Occupational Safety Officer at Supervisory Level";
const SI = "Scaffolding Inspector";
const BIE = "Basic IE (Pneumatic)";
const IEM = "IE for Maintenance";
const IES = "IE - Swaglog";
const ECL = "Electrical Certification by Laws";
const ES = "Electrical Standard";
const JAF = "JDE / Ariba / FECON";
const DG = "Dangerous Goods";

// ── Chevron Matrix 2025 (ตามเอกสารที่ได้รับ) ──
const MATRIX = {
  "Construction E&I Foreman": [
    PTW,
    OSO_SUP,
    BIE,
    IEM,
    IES,
    "MS Office",
    ECL,
    SI,
    WAH,
    JAF,
    DG,
    MSW,
    BCP,
    ES,
    HAP,
    HWS,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    LRS,
  ],
  "Construction E&I Technician": [
    BIE,
    RA,
    "MS Office",
    ECL,
    BS,
    RAL,
    WAH,
    MSW,
    BCP,
    ES,
    HAP,
    HWS,
    LRS,
    PTW,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    IES,
    IEM,
    PB,
  ],
  "Construction Mechanical (Piping / Structure) Foreman": [
    "HAZMAT",
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    HAP,
    CSES,
    BCP,
    MSW,
    DG,
    JAF,
    PLE,
    CSE,
    WAH,
    SI,
    BS,
    MFM,
    BMF,
    "Fitting",
    OSO_SUP,
  ],
  "Construction Supervisor (Mech)": [
    BMF,
    MFM,
    IEM,
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    HAP,
    CSES,
    BCP,
    MSW,
    DG,
    "HAZMAT",
    JAF,
    PLE,
    CSE,
    WAH,
    "MS Office",
    IES,
    "Fitting",
    OSO_SUP,
    BIE,
  ],
  "Construction Utility Foreman (Painter / Scaffolder)": [
    BIE,
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    HAP,
    CSES,
    BCP,
    MSW,
    DG,
    "HAZMAT",
    CSE,
    WAH,
    SI,
    BS,
    "MS Office",
    MFM,
    PB,
    BMF,
    OSO_SUP,
  ],
  "CPP Crane Assistant (Certify by Company)": [
    BCO,
    "HazCom",
    SO,
    MSW,
    ERT,
    BR,
    "SIMOPs",
    SWA,
    AFA,
    WAHS,
    PTW,
    LRS,
    HAP,
    PLE,
    COL,
    WAH,
    HCM,
    BMF,
    BCP,
  ],
  "CPP Crane Operator - Class A": [
    PLE,
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HAP,
    MSW,
    ERT,
    AFA,
    BCP,
    BCO,
    COL,
    BMF,
    WAH,
    BR,
    HCM,
  ],
  "CPP Crane Operator - Class B+ (Certify by Company)": [
    "SIMOPs",
    "HazCom",
    SO,
    WAHS,
    AFA,
    PTW,
    LRS,
    ERT,
    MSW,
    BCP,
    HAP,
    BMF,
    BR,
    BCO,
    HCM,
    WAH,
    COL,
    PLE,
    SWA,
  ],
  "Crane Mechanic, Technician": [
    BMF,
    "SIMOPs",
    "HazCom",
    SO,
    SWA,
    WAHS,
    PTW,
    LRS,
    HAP,
    BCP,
    MSW,
    PLE,
    WAH,
    BR,
    "MS Office",
    MFM,
  ],
  "Crane Operator - Class C (Certify by Company)": [
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HAP,
    BCP,
    MSW,
    AFA,
    PLE,
    COL,
    WAH,
    HCM,
    BCO,
    PB,
    BR,
    ERT,
    BMF,
  ],
  "Crane Operator or Crane Coordinator or Crane Team lead - Class A (Certify by Company)":
    [
      BCO,
      COL,
      PLE,
      HAP,
      HCM,
      BMF,
      BR,
      WAH,
      PB,
      SO,
      "HazCom",
      "SIMOPs",
      SWA,
      WAHS,
      PTW,
      LRS,
      BCP,
      MSW,
      ERT,
      AFA,
    ],
  "Crane Operator or Crane Coordinator or Crane Team lead - Class B and B+ (Certify by Company)":
    [
      AFA,
      SO,
      "HazCom",
      "SIMOPs",
      SWA,
      WAHS,
      PTW,
      LRS,
      HAP,
      BCP,
      MSW,
      ERT,
      PLE,
      COL,
      WAH,
      HCM,
      BCO,
      BR,
      BMF,
      PB,
    ],
  "Fire Watcher": [
    CSES,
    PB,
    BIE,
    BMF,
    "MS Office",
    BS,
    WAH,
    SO,
    CSE,
    "HAZMAT",
    MSW,
    "HazCom",
    BCP,
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    HAP,
  ],
  "Helper / General Maintenance": [
    WAHS,
    "MS Office",
    BR,
    HCM,
    WAH,
    PLE,
    AFA,
    ERT,
    "HAZMAT",
    MSW,
    BCP,
    ES,
    HAP,
    HWS,
    LRS,
    PTW,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
  ],
  "Materials Controller, Technician": [
    BCP,
    HAP,
    SO,
    PTW,
    WAHS,
    SWA,
    BMF,
    "MS Office",
    "SIMOPs",
    "HazCom",
    MSW,
    LRS,
  ],
  Painter: [
    PB,
    PTW,
    CSE,
    WAH,
    RA,
    RAL,
    BCO,
    MSW,
    LRS,
    CSES,
    BCP,
    HAP,
    HWS,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    BS,
    BMF,
    "HAZMAT",
    COL,
  ],
  "Painter / Scaffolder": [
    PTW,
    PB,
    BMF,
    BR,
    BS,
    BCO,
    HCM,
    RAL,
    RA,
    WAH,
    CSE,
    COL,
    AFA,
    ERT,
    "HAZMAT",
    MSW,
    BCP,
    CSES,
    HAP,
    HWS,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    LRS,
  ],
  "Pipe Fitter A": [
    "Fitting",
    PB,
    MFM,
    HWS,
    BS,
    RAL,
    RA,
    CSE,
    "HAZMAT",
    MSW,
    BCP,
    CSES,
    ES,
    HAP,
    LRS,
    PTW,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    WAH,
  ],
  "Pipe Fitter B": [
    BCP,
    MSW,
    "HAZMAT",
    CSE,
    WAH,
    RA,
    RAL,
    BS,
    MFM,
    PB,
    "Fitting",
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    HAP,
    ES,
    CSES,
  ],
  "QC Level I (NDE)": [
    PTW,
    LRS,
    HAP,
    CSES,
    BCP,
    MSW,
    "HAZMAT",
    CSE,
    WAH,
    "MS Office",
    IES,
    BMF,
    BIE,
    PB,
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
  ],
  "Rigger / Scaffolder": [
    RAL,
    BCO,
    BS,
    BR,
    MFM,
    BMF,
    HAP,
    PB,
    COL,
    SO,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    CSES,
    BCP,
    MSW,
    "HAZMAT",
    AFA,
    PLE,
    CSE,
    WAH,
    RA,
  ],
  "Safety Officer / HES specialist": [
    "Operator Knowledge (C1 level)",
    "Occupational Safety Officer at Professional Level",
    BMF,
    "MS Office",
    "Marine Support",
    WAH,
    CSE,
    AFA,
    "HAZMAT",
    DG,
    MSW,
    BCP,
    CSES,
    ES,
    HAP,
    HWS,
    LRS,
    PTW,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    BIE,
    ERT,
  ],
  "Scaffolding Subject Matter Expertise (SME)": [
    MSW,
    SI,
    "MS Office",
    BCP,
    CSES,
    HAP,
    PTW,
    HWS,
    "HAZMAT",
    LRS,
    BS,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
    RAL,
    RA,
    WAH,
    CSE,
  ],
  "Semi Operator": [
    BCP,
    "Operator Knowledge (C1 level)",
    BIE,
    BMF,
    "MS Office",
    WAH,
    CSE,
    "IHE Coordinator",
    MSW,
    "HAZMAT",
    CSES,
    HAP,
    HWS,
    LRS,
    PTW,
    WAHS,
    SWA,
    "SIMOPs",
    "HazCom",
    SO,
  ],
  "Welder, Alloy": [
    SWA,
    "Fitting",
    PB,
    "Welding",
    BS,
    RAL,
    RA,
    WAH,
    CSE,
    "HAZMAT",
    PTW,
    WAHS,
    MSW,
    BCP,
    CSES,
    ES,
    HAP,
    HWS,
    LRS,
    "SIMOPs",
    "HazCom",
    SO,
  ],
  "Welder, Regular": [
    CSES,
    BCP,
    MSW,
    RA,
    WAH,
    "Welding",
    "Fitting",
    PB,
    BS,
    RAL,
    "HAZMAT",
    SO,
    CSE,
    "HazCom",
    "SIMOPs",
    SWA,
    WAHS,
    PTW,
    LRS,
    HWS,
    HAP,
    ES,
  ],
};

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();

// ── ALIAS: ชื่อ position ใน DB (ย่อ/ไม่ตรง) → ใช้ matrix ของ position ในเอกสารที่คล้ายสุด ──
// แก้ตรงนี้ได้ถ้าอยากเปลี่ยนการจับคู่
const ALIAS = {
  Scaffolder: "Scaffolding Subject Matter Expertise (SME)",
  "E&I Technician": "Construction E&I Technician",
  Fitter: "Pipe Fitter B",
  "Crane Operator CPP": "CPP Crane Operator - Class A",
  Welder: "Welder, Regular",
  "Assistance Floor Operator": "Semi Operator",
  "E&I Foreman": "Construction E&I Foreman",
  Foreman: "Construction Mechanical (Piping / Structure) Foreman",
  "Crane Operator": "CPP Crane Operator - Class A",
  Supervisor: "Construction Supervisor (Mech)",
  Inspector: "QC Level I (NDE)",
  "Crane Operator - Class A (Certify by Company)":
    "Crane Operator or Crane Coordinator or Crane Team lead - Class A (Certify by Company)",
  "Safety Officer": "Safety Officer / HES specialist",
  "Safety Officer / Fire Watcher": "Fire Watcher",
  "QC Tech Level I": "QC Level I (NDE)",
  "Crane Operator - Class A": "CPP Crane Operator - Class A",
  "Rigger / Scaffolder (Skill Mechanic)": "Rigger / Scaffolder",
  "Crane Operator / Scaffoldder": "Rigger / Scaffolder",
};

// lookup: norm(MATRIX key) -> original MATRIX key
const MATRIX_KEY_BY_NORM = new Map(
  Object.keys(MATRIX).map((k) => [norm(k), k]),
);
// lookup: norm(DB name) -> norm(MATRIX key target)
const ALIAS_BY_NORM = new Map(
  Object.entries(ALIAS).map(([db, target]) => [norm(db), norm(target)]),
);

// คืน MATRIX key (ชื่อในเอกสาร) ของ position หนึ่ง — direct ก่อน, ไม่เจอลอง alias
function matrixKeyFor(posName) {
  const n = norm(posName);
  if (MATRIX_KEY_BY_NORM.has(n)) return MATRIX_KEY_BY_NORM.get(n);
  if (ALIAS_BY_NORM.has(n)) {
    const t = ALIAS_BY_NORM.get(n);
    if (MATRIX_KEY_BY_NORM.has(t)) return MATRIX_KEY_BY_NORM.get(t);
  }
  return null;
}

const counters = {
  globalTraining: 0,
  trainingStandard: 0,
  clientTraining: 0,
  positionRequirement: 0,
};

async function maybeCreate(model, data, label) {
  counters[label] = (counters[label] || 0) + 1;
  if (DRY)
    return { id: `(new-${label}-${counters[label]})`, ...data, __new: true };
  return prisma[model].create({ data });
}

const isFakeId = (id) => typeof id === "string" && id.startsWith("(new-");

async function main() {
  console.log(
    `\n=== seedDemoMatrix — ${DRY ? "DRY-RUN (ไม่เขียน)" : "APPLY (เขียนจริง)"} ===\n`,
  );

  // ── 1) หา contract Chevron Matrix 2025 ──
  let contract = null;
  if (CONTRACT_ARG) {
    contract = await prisma.contract.findFirst({
      where: { name: { contains: CONTRACT_ARG } },
      include: { client: true },
    });
  }
  if (!contract) {
    contract = await prisma.contract.findFirst({
      where: { name: { contains: "Chevron Matrix 2025" } },
      include: { client: true },
    });
  }
  if (!contract) {
    // fallback: client Chevron → contract แรก
    const chevron = await prisma.client.findFirst({
      where: { name: { contains: "Chevron" } },
    });
    if (chevron) {
      contract = await prisma.contract.findFirst({
        where: { clientId: chevron.id },
        include: { client: true },
        orderBy: { createdAt: "asc" },
      });
    }
  }
  if (!contract) {
    console.error(
      "✗ ไม่พบ contract 'Chevron Matrix 2025' — ระบุด้วย --contract \"ชื่อ\" หรือเช็คชื่อใน DB",
    );
    return;
  }
  const contractId = contract.id;
  console.log(
    `Contract: "${contract.name}" (client: ${contract.client?.name || "?"}) [${contractId}]\n`,
  );

  // ── preload ──
  const allGT = await prisma.globalTraining.findMany();
  const gtCache = new Map(); // norm(name) -> gt
  const gtById = new Map(); // id -> gt
  for (const g of allGT) {
    gtCache.set(norm(g.name), g);
    gtById.set(g.id, g);
  }

  const allCT = await prisma.clientTraining.findMany({ where: { contractId } });
  const ctByGt = new Map(allCT.map((c) => [c.globalTrainingId, c]));

  const allPR = await prisma.positionRequirement.findMany({
    where: { contractId },
  });
  const prKey = (pid, ctid) => `${pid}|${ctid}`;
  const prSet = new Set(
    allPR.map((p) => prKey(p.positionId, p.clientTrainingId)),
  );

  const tsByGt = new Map();

  const positions = await prisma.position.findMany({
    include: { _count: { select: { employees: true, requirements: true } } },
  });
  const posByNorm = new Map(positions.map((p) => [norm(p.name), p]));
  const posById = new Map(positions.map((p) => [p.id, p]));

  // ── helpers (find-or-create chain) ──
  async function getGT(name) {
    const k = norm(name);
    let g = gtCache.get(k);
    if (g) return g;
    g = await maybeCreate("globalTraining", { name }, "globalTraining");
    gtCache.set(k, g);
    if (g.id) gtById.set(g.id, g);
    return g;
  }
  async function getTS(gt) {
    if (tsByGt.has(gt.id)) return tsByGt.get(gt.id);
    let ts = null;
    if (gt.id && !isFakeId(gt.id)) {
      ts = await prisma.trainingStandard.findFirst({
        where: { globalTrainingId: gt.id },
      });
    }
    if (!ts) {
      ts = await maybeCreate(
        "trainingStandard",
        { globalTrainingId: gt.id, source: "CONTRACTOR", isNoExpiry: false },
        "trainingStandard",
      );
    }
    tsByGt.set(gt.id, ts);
    return ts;
  }
  async function getCT(gt, alias) {
    let ct = ctByGt.get(gt.id);
    if (ct) return ct;
    const ts = await getTS(gt);
    ct = await maybeCreate(
      "clientTraining",
      {
        globalTrainingId: gt.id,
        contractId,
        trainingStandardId: ts.id,
        nameAlias: alias,
      },
      "clientTraining",
    );
    ctByGt.set(gt.id, ct);
    return ct;
  }
  async function ensurePR(positionId, ct) {
    const key = prKey(positionId, ct.id);
    if (prSet.has(key)) return false;
    await maybeCreate(
      "positionRequirement",
      {
        positionId,
        clientTrainingId: ct.id,
        contractId,
        requirementType: "required",
        sourceMatrixCode: "X",
        sourceMatrixSheet: "Chevron Matrix 2025 (demo seed)",
      },
      "positionRequirement",
    );
    prSet.add(key);
    return true;
  }

  // ═══════════════ Phase 1: MATRIX ═══════════════
  const seededPositions = [];
  const empPosNoMatrix = [];
  if (!CERTS_ONLY) {
    console.log("── Phase 1: Position Requirements (matrix) ──");
    for (const pos of positions) {
      if ((pos._count?.employees ?? 0) === 0) continue; // เฉพาะที่มีพนักงาน
      const key = matrixKeyFor(pos.name);
      if (!key) {
        empPosNoMatrix.push(pos);
        continue;
      }
      const trainings = MATRIX[key];
      let added = 0;
      for (const tName of trainings) {
        const gt = await getGT(tName);
        const ct = await getCT(gt, tName);
        if (await ensurePR(pos.id, ct)) added++;
      }
      seededPositions.push({
        name: pos.name,
        via: norm(key) === norm(pos.name) ? null : key, // ถ้าใช้ alias จะโชว์
        employees: pos._count.employees,
        had: pos._count.requirements,
        addedReq: added,
        totalReq: trainings.length,
      });
    }
    for (const s of seededPositions) {
      const viaTxt = s.via ? `  ⟵ alias: "${s.via}"` : "";
      console.log(
        `  • ${s.name}  (พนักงาน ${s.employees}, เดิม req=${s.had}) → +${s.addedReq} req [matrix รวม ${s.totalReq}]${viaTxt}`,
      );
    }
  }

  // positions ที่มีพนักงานแต่ "ยังจับ matrix ไม่ได้เลย" (ไม่มีทั้ง direct + alias)
  const empPosNotInMatrix = empPosNoMatrix;
  if (empPosNotInMatrix.length) {
    console.log(
      `\n  ⚠ position ที่มีพนักงานแต่ยังจับ matrix ไม่ได้ (${empPosNotInMatrix.length}) — เพิ่มใน ALIAS เพื่อให้ครอบคลุม:`,
    );
    for (const p of empPosNotInMatrix) {
      console.log(
        `     - "${p.name}" (พนักงาน ${p._count.employees}, req เดิม ${p._count.requirements})`,
      );
    }
  }

  // ═══════════════ Phase 2: Employee certs ═══════════════
  let empSeeded = 0;
  let certsCreated = 0;
  const empNoReq = [];
  if (!MATRIX_ONLY) {
    console.log("\n── Phase 2: Employee certs (เฉพาะคนที่ cert = 0) ──");
    const now = new Date();
    const exp = new Date(now);
    exp.setFullYear(now.getFullYear() + CERT_VALID_YEARS);

    const emps = await prisma.employee.findMany({
      where: { positionId: { not: null } },
      select: {
        id: true,
        empCode: true,
        fullName: true,
        positionId: true,
        trainings: { where: { isLatest: true }, select: { id: true } },
      },
    });

    // required GT (id+name) ต่อ position — cache
    const reqCache = new Map(); // positionId -> [{id,name}]
    async function reqForPosition(pos) {
      if (reqCache.has(pos.id)) return reqCache.get(pos.id);
      let out = [];
      const matrixKey = matrixKeyFor(pos.name);
      if (matrixKey) {
        for (const tName of MATRIX[matrixKey]) {
          const gt = await getGT(tName);
          out.push({ id: gt.id, name: gt.name || tName });
        }
      } else {
        // fallback: ใช้ requirement เดิมใน DB
        const reqs = await prisma.positionRequirement.findMany({
          where: { positionId: pos.id, contractId },
          include: {
            clientTraining: {
              select: {
                globalTrainingId: true,
                globalTraining: { select: { name: true } },
              },
            },
          },
        });
        out = reqs
          .map((r) => ({
            id: r.clientTraining?.globalTrainingId,
            name: r.clientTraining?.globalTraining?.name,
          }))
          .filter((x) => x.id);
      }
      // dedupe by id
      const seen = new Set();
      out = out.filter((x) =>
        seen.has(x.id) ? false : (seen.add(x.id), true),
      );
      reqCache.set(pos.id, out);
      return out;
    }

    const zeroCertEmps = emps.filter((e) => e.trainings.length === 0);
    console.log(
      `  พนักงานทั้งหมด ${emps.length} · มี cert=0 จำนวน ${zeroCertEmps.length}`,
    );

    for (const e of zeroCertEmps) {
      const pos = posById.get(e.positionId);
      if (!pos) continue;
      const req = await reqForPosition(pos);
      if (req.length === 0) {
        empNoReq.push(`${e.fullName} (${e.empCode}) — ${pos.name}`);
        continue;
      }
      if (!DRY) {
        await prisma.employeeTraining.createMany({
          data: req.map((r) => ({
            employeeId: e.id,
            globalTrainingId: r.id,
            rawTrainingName: r.name,
            completedDate: now,
            expiryDate: exp,
            status: "completed",
            source: "demo_seed",
            isLatest: true,
            version: 1,
          })),
        });
      }
      empSeeded++;
      certsCreated += req.length;
    }
    console.log(
      `  → ใส่ cert ให้ ${empSeeded} คน รวม ${certsCreated} certs (เฉลี่ย ${empSeeded ? Math.round(certsCreated / empSeeded) : 0}/คน)`,
    );
    if (empNoReq.length) {
      console.log(
        `  ⚠ ${empNoReq.length} คนข้าม (position ไม่มี requirement — อยู่ใน position ที่ไม่มี matrix):`,
      );
      empNoReq.slice(0, 30).forEach((x) => console.log(`     - ${x}`));
      if (empNoReq.length > 30)
        console.log(`     ... และอีก ${empNoReq.length - 30} คน`);
    }
  }

  // ═══════════════ Summary ═══════════════
  console.log(`\n=== SUMMARY (${DRY ? "DRY-RUN" : "APPLIED"}) ===`);
  console.log(`Phase 1 — จะสร้าง/สร้างแล้ว:`);
  console.log(`  GlobalTraining     : ${counters.globalTraining}`);
  console.log(`  TrainingStandard   : ${counters.trainingStandard}`);
  console.log(`  ClientTraining     : ${counters.clientTraining}`);
  console.log(`  PositionRequirement: ${counters.positionRequirement}`);
  console.log(
    `Phase 2 — Employee certs: ${empSeeded} คน / ${certsCreated} certs`,
  );
  if (DRY) {
    console.log(`\n*** นี่คือ DRY-RUN — ยังไม่ได้เขียนอะไรลง DB ***`);
    console.log(`*** รันซ้ำด้วย --apply เพื่อเขียนจริง ***\n`);
  } else {
    console.log(
      `\n✓ เขียนลง DB เรียบร้อย — เปิดหน้า Allocation, Find Workers ดู % Match ได้เลย\n`,
    );
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
