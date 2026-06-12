// import { PrismaClient } from "@prisma/client";
import { PrismaClient, TrainingSource } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Helper: create / update TrainingStandard
 */
async function createTrainingStandard(
  trainingName,
  source,
  trainingHours,
  validityDays,
  isNoExpiry,
) {
  const training = await prisma.globalTraining.findFirst({
    where: {
      name: trainingName,
    },
  });

  if (!training) {
    throw new Error(`❌ Training not found: ${trainingName}`);
  }

  const existing = await prisma.trainingStandard.findFirst({
    where: {
      globalTrainingId: training.id,
      source,
    },
  });

  if (existing) {
    return prisma.trainingStandard.update({
      where: {
        id: existing.id,
      },

      data: {
        trainingHours,
        validityDays,
        isNoExpiry,
      },
    });
  }

  return prisma.trainingStandard.create({
    data: {
      globalTrainingId: training.id,
      source,
      trainingHours,
      validityDays,
      isNoExpiry,
    },
  });
}

/**
 * Main Seeder
 */
async function main() {
  console.log("🚀 Seeding TrainingStandard...");

  const MONTH = 30;
  const YEAR = 365;

  const DAY_HOURS = 8;

  const DATA = [
    // ======================================================
    // Chevron
    // ======================================================

    [
      "Occupational Safety Officer at Supervisory Level",
      TrainingSource.CONTRACTOR,
      2 * DAY_HOURS,
      null,
      true,
    ],
    [
      "Occupational Safety Officer at Professional Level",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["Fitting", TrainingSource.CONTRACTOR, 2 * DAY_HOURS, null, true], // Unknown Source
    [
      "Painting & Blasting (International/Dimet/Jotun) / Sand Blasting",
      TrainingSource.CONTRACTOR,
      2 * DAY_HOURS,
      2 * YEAR,
      false,
    ],
    ["Welding", TrainingSource.CONTRACTOR, 2 * DAY_HOURS, 3 * YEAR, false],
    [
      "Operator Knowledge (C1 level)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["Basic IE (Pneumatic)", TrainingSource.CONTRACTOR, null, null, true],
    ["Basic Mech (Fitting)", TrainingSource.CONTRACTOR, null, null, true],
    ["Mech for Maintenance", TrainingSource.CONTRACTOR, null, null, true],
    ["IE for Maintenance", TrainingSource.CONTRACTOR, null, null, true],
    ["IE - Swaglog", TrainingSource.CONTRACTOR, null, null, true],
    ["MS Office", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Electrical Certification by Laws",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Basic Rigging (include crane signal and slinging techniques)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["Basic Scaffolding", TrainingSource.TPTI, 5 * DAY_HOURS, 3 * YEAR, false],
    [
      "Scaffolding Inspector",
      TrainingSource.TPTI,
      3 * DAY_HOURS,
      3 * YEAR,
      false,
    ],
    [
      "Basic Crane Operator (Comply with API RP2D or equivalent)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["T-BOSIET", TrainingSource.TPTI, null, 4 * YEAR, false],
    ["Helideck Crew Member (HCM)", TrainingSource.CONTRACTOR, null, null, true],
    ["Fire Watch", TrainingSource.TPTI, 1 * DAY_HOURS, 3 * YEAR, false],
    ["Rope Access Lead", TrainingSource.CONTRACTOR, null, null, true],
    ["Rope Access", TrainingSource.CONTRACTOR, null, null, true],
    ["Insulation", TrainingSource.CONTRACTOR, null, null, true],
    ["Marine Support", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Working At Height - Combined Course & Rescue (Use Fall Protection System)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Confined Space Entry (by laws)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["Qualified Gas Tester (QGT)", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Crane Operator License (Class A, B+, B, C)",
      TrainingSource.CONTRACTOR,
      1 * DAY_HOURS,
      4 * YEAR,
      false,
    ],
    [
      "PLE & CCU Inspection & Certification",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Advanced First Aid Training",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Emergency Response Team (ERT)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["JDE / Ariba / FECON", TrainingSource.CONTRACTOR, null, null, true],
    ["HAZMAT", TrainingSource.CONTRACTOR, null, null, true],
    ["IHE Coordinator", TrainingSource.CONTRACTOR, null, null, true],
    ["Dangerous Goods", TrainingSource.CONTRACTOR, null, null, true],
    ["MSW Process Overview", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Bypassing Critical Protection (BCP)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Confined Space Entry Standard",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["Electrical Standard", TrainingSource.CONTRACTOR, null, null, true],
    ["Hazard Analysis Procedure", TrainingSource.CONTRACTOR, null, null, true],
    ["Hot Work Standard", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Isolation of Hazardous Energy (IHE)",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Lifting and Rigging Standard",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["Permit to Work Procedure", TrainingSource.CONTRACTOR, null, null, true],
    ["Working At Height Standard", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Stop Work Authority Application",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["SIMOPs", TrainingSource.CONTRACTOR, null, null, true],
    ["HazCom", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Safety Orientation - Incident Reporting, BBS, HazOb, SWC",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],

    // ======================================================
    // Erawan
    // ======================================================

    ["Site SSHE Induction", TrainingSource.COMPANY_ELEARNING, null, null, true],
    ["Basic Fire Fighting", TrainingSource.CONTRACTOR, null, null, true],
    ["First Aid Basic", TrainingSource.CONTRACTOR, null, null, true],
    [
      "Basic Safety Observation Card (BBS)",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Fundamental Risk Assessment & Job Safety Analysis (JSA)",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Permit to Work (PTW)",
      TrainingSource.COMPANY_ELEARNING,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Waste Management / Additional Mandatory",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Incident Investigation & Root Cause Analysis",
      TrainingSource.CONTRACTOR,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Chemical Safety Management",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "High Pressure Gas Cylinder Handling",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Authorized Gas Tester",
      TrainingSource.COMPANY_ELEARNING,
      null,
      3 * YEAR,
      false,
    ],
    [
      "Arsenic, Benzene, Hydrogen Sulfide & Mercury Awareness",
      TrainingSource.COMPANY_ELEARNING,
      null,
      5 * YEAR,
      false,
    ],
    ["Flanged Joint Management", TrainingSource.TPTI, null, 3 * YEAR, false],
    ["Advanced Scaffolding", TrainingSource.TPTI, null, 4 * YEAR, false],
    [
      "Rigging, Slinging & Banksman",
      TrainingSource.TPTI,
      2 * DAY_HOURS,
      2 * YEAR,
      false,
    ],
    [
      "Basic Working at Height & Rescue",
      TrainingSource.TPTI,
      null,
      3 * YEAR,
      false,
    ],
    ["Blaster and Painter", TrainingSource.CONTRACTOR, null, 1 * YEAR, false],
    [
      "Painting Certificate Level 1",
      TrainingSource.CONTRACTOR,
      null,
      4 * YEAR,
      false,
    ],
    [
      "Painting Certificate Level 2",
      TrainingSource.CONTRACTOR,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Basic Hazardous Area Classification",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Advanced Hazardous Area Classification",
      TrainingSource.COMPANY_ELEARNING,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Basic Electrical Safety",
      TrainingSource.CONTRACTOR,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Machine and Electrical Work Safety",
      TrainingSource.CONTRACTOR,
      null,
      3 * YEAR,
      false,
    ],
    [
      "Tubing Installation Certification (SWAGELOK & Parker)",
      TrainingSource.CONTRACTOR,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Tubing Installation Certification (Parker)",
      TrainingSource.CONTRACTOR,
      null,
      5 * YEAR,
      false,
    ],
    ["Pressure Testing", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    ["ASME IX (Piping)", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    ["AWS D1.1 (Structure)", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    ["API 1104 (Pipeline)", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    ["Welding Inspector", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    ["Rigging & Slinging by TPTI", TrainingSource.TPTI, null, 5 * YEAR, false],
    [
      "Safe Lifting Operation Level 1",
      TrainingSource.COMPANY_ELEARNING,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Crane Operator License by PTTEP",
      TrainingSource.TPTI,
      null,
      2 * YEAR,
      false,
    ],
    [
      "Basic Offshore Crane Operator",
      TrainingSource.TPTI,
      null,
      3 * YEAR,
      false,
    ],
    [
      "Crane Operator (4 roles)",
      TrainingSource.CONTRACTOR,
      null,
      2 * YEAR,
      false,
    ],
    ["Drops Awareness", TrainingSource.COMPANY_ELEARNING, null, null, true],
    [
      "Hand and Power Tool Safety",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Manual Handling & Lifting",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Security Awareness",
      TrainingSource.COMPANY_ELEARNING,
      null,
      5 * YEAR,
      false,
    ],
    ["SSHE Leadership", TrainingSource.COMPANY_ELEARNING, null, null, true],
    ["Fatigue Management", TrainingSource.CONTRACTOR, null, 6 * MONTH, false],
    [
      "Process Safety Awareness",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Health & Hygiene Inspections",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Management of Change (MOC) Awareness",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    // [
    //   "Chemical Safety Management",
    //   TrainingSource.COMPANY_ELEARNING,
    //   null,
    //   null,
    //   true,
    // ],
    [
      "Oxygen-Fuel Gas Welding & Cutting",
      TrainingSource.COMPANY_ELEARNING,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Explosive & Flammable Chemicals",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    ["Rope Access Level 1", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    [
      "Lockout/Tagout (LOTO)",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Incident Management & Basic Incident Investigation",
      TrainingSource.COMPANY_ELEARNING,
      null,
      null,
      true,
    ],
    [
      "Confined Space Entry & Breathing Apparatus",
      TrainingSource.CONTRACTOR,
      null,
      5 * YEAR,
      false,
    ],
    [
      "Radiation Safety Officer Level 1 / G: 16",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Helicopter Pre-Fight Briefing / G: 23",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Intensive First Aid / G: 28",
      TrainingSource.CONTRACTOR,
      null,
      3 * YEAR,
      false,
    ],
    [
      "Load Secure and Safe Latching / G: 31",
      TrainingSource.CONTRACTOR,
      null,
      3 * YEAR,
      false,
    ],
    [
      "Advance Safety Observation Card / Additional Mandatory",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    [
      "Safe Handling of dangerous goods and / Additional Mandatory chemicals",
      TrainingSource.CONTRACTOR,
      null,
      2 * YEAR,
      false,
    ],
    [
      "Load securing and latching / Additional Mandatory",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
    ["API, ASTM, AWS, ASME", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    ["API, ASME, AWS", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    ["API /AWS / ASME", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    ["WPS", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    ["Knowledge NDT methods", TrainingSource.CONTRACTOR, null, 5 * YEAR, false],
    [
      "PLC (Programmable Controller)",
      TrainingSource.CONTRACTOR,
      null,
      3 * YEAR,
      false,
    ],
    ["Pneumatic", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    ["PCN RI - Retest", TrainingSource.CONTRACTOR, null, 4 * YEAR, false],

    // ======================================================
    // PTT
    // ======================================================

    ["HR Orientation", TrainingSource.COMPANY_ELEARNING, 6, null, true],
    ["Job Description", TrainingSource.COMPANY_ELEARNING, 0.5, null, true],
    ["Basic Safety Training", TrainingSource.COMPANY_ELEARNING, 6, null, true],
    [
      "Offshore Sea Survival Skills & Emegency / HUET",
      TrainingSource.TPTI,
      3 * DAY_HOURS,
      4 * YEAR,
      false,
    ],
    ["New offshore", TrainingSource.COMPANY_ELEARNING, 6, 6 * MONTH, false],
    ["Refresh Offshore", TrainingSource.COMPANY_ELEARNING, 4, 6 * MONTH, false],
    ["Safety Awareness at PTT", TrainingSource.COMPANY_ELEARNING, 2, 28, false],
    [
      "Lifting Supervisor",
      TrainingSource.COMPANY_ELEARNING,
      2 * DAY_HOURS,
      2 * YEAR,
      false,
    ],
    [
      "Working at Height and Rescue",
      TrainingSource.CONTRACTOR,
      3 * DAY_HOURS,
      3 * YEAR,
      false,
    ],
    [
      "Building Electrical Installation",
      TrainingSource.CONTRACTOR,
      4 * DAY_HOURS,
      5 * YEAR,
      false,
    ],
    [
      "Fitter Training",
      TrainingSource.CONTRACTOR,
      3 * DAY_HOURS,
      3 * YEAR,
      false,
    ],
    [
      "Hydraulic Tool Basics and Safety",
      TrainingSource.CONTRACTOR,
      1 * DAY_HOURS,
      null,
      true,
    ],
    [
      "N-vision Pressure Calibrator Operation Training and Hydro test system",
      TrainingSource.CONTRACTOR,
      1 * DAY_HOURS,
      null,
      true,
    ],
    [
      "Machine and Tool Safety",
      TrainingSource.CONTRACTOR,
      1 * DAY_HOURS,
      null,
      true,
    ],
    [
      "Permit to work System (PTW) for ERP-PRP",
      TrainingSource.CONTRACTOR,
      1 * DAY_HOURS,
      null,
      true,
    ],
    [
      "Harzop CARD System (HOC) ERP & PRP",
      TrainingSource.CONTRACTOR,
      1 * DAY_HOURS,
      null,
      true,
    ],

    // PTT - add from record

    [
      "Occupational Safety Officer at Management Level",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],

    [
      "Occupational Safety Officer at Technical Level",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],

    ["Coating Inspector", TrainingSource.CONTRACTOR, null, null, true],

    ["Welding Qualification Test", TrainingSource.CONTRACTOR, null, null, true],

    // ======================================================
    // Valeura
    // ======================================================

    [
      "Safety Awareness at Mubadala",
      TrainingSource.COMPANY_ELEARNING,
      2,
      null,
      true,
    ],
    // ["Fire watcher Awareness", TrainingSource.COMPANY_ELEARNING, 4, null, true],
    // [
    //   "HSSE requirement for contractor",
    //   TrainingSource.COMPANY_ELEARNING,
    //   null,
    //   null,
    //   true,
    // ],

    // add from Chevron

    [
      "Basic Rigging (by Settapat)",
      TrainingSource.CONTRACTOR,
      null,
      4 * YEAR,
      false,
    ],
    [
      "Helicopter Fire Fighting",
      TrainingSource.CONTRACTOR,
      null,
      3 * YEAR,
      false,
    ],
    ["R550 Device Operation", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    [
      "Control of Work Training (CoW)",
      TrainingSource.CONTRACTOR,
      null,
      3 * YEAR,
      false,
    ],

    // add from Valeura
    ["Fire Watch Awareness", TrainingSource.CONTRACTOR, null, 3 * YEAR, false],
    [
      "HSSE Requirements for Contractors",
      TrainingSource.CONTRACTOR,
      null,
      null,
      true,
    ],
  ];

  for (const [name, source, trainingHours, validityDays, isNoExpiry] of DATA) {
    try {
      await createTrainingStandard(
        name,
        source,
        trainingHours,
        validityDays,
        isNoExpiry,
      );

      console.log(`✔ ${name} (${source})`);
    } catch (err) {
      console.error(`❌ ${name}:`, err.message);
    }
  }

  console.log("✅ Done TrainingStandard");
}

/**
 * Run
 */
main()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
