import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedGlobalTrainings() {
  console.log("🚀 Seeding Global Trainings...");

  const TRAININGS = [
    // ======================================================
    // Chevron
    // ======================================================

    "Occupational Safety Officer at Supervisory Level",

    "Occupational Safety Officer at Professional Level",

    "Fitting",

    "Painting & Blasting (International/Dimet/Jotun) / Sand Blasting",

    "Welding",

    "Operator Knowledge (C1 level)",

    "Basic IE (Pneumatic)",

    "Basic Mech (Fitting)",

    "Mech for Maintenance",

    "IE for Maintenance",

    "IE - Swaglog",

    "MS Office",

    "Electrical Certification by Laws",

    "Basic Rigging (include crane signal and slinging techniques)",

    "Basic Scaffolding",

    "Scaffolding Inspector",

    "Basic Crane Operator (Comply with API RP2D or equivalent)",

    "T-BOSIET",

    "Helideck Crew Member (HCM)",

    "Fire Watch",

    "Rope Access Lead",

    "Rope Access",

    "Insulation",

    "Marine Support",

    "Working At Height - Combined Course & Rescue (Use Fall Protection System)",

    "Confined Space Entry (by laws)",

    "Qualified Gas Tester (QGT)",

    "Crane Operator License (Class A, B+, B, C)",

    "PLE & CCU Inspection & Certification",

    "Advanced First Aid Training",

    "Emergency Response Team (ERT)",

    "JDE / Ariba / FECON",

    "HAZMAT",

    "IHE Coordinator",

    "Dangerous Goods",

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

    "HazCom",

    "Safety Orientation - Incident Reporting, BBS, HazOb, SWC",

    // Chevron - add from matrix / employee records

    "Control of Work Training (CoW)",

    "Helicopter Fire Fighting",

    "R550 Device Operation",

    "Basic Rigging (by Settapat)",

    // ======================================================
    // Erawan
    // ======================================================

    "Site SSHE Induction",

    "Basic Fire Fighting",

    "First Aid Basic",

    "Basic Safety Observation Card (BBS)",

    "Fundamental Risk Assessment & Job Safety Analysis (JSA)",

    "Permit to Work (PTW)",

    "Waste Management / Additional Mandatory",

    "Incident Investigation & Root Cause Analysis",

    "High Pressure Gas Cylinder Handling",

    "Authorized Gas Tester",

    "Arsenic, Benzene, Hydrogen Sulfide & Mercury Awareness",

    "Flanged Joint Management",

    "Advanced Scaffolding",

    "Rigging, Slinging & Banksman",

    "Basic Working at Height & Rescue",

    "Blaster and Painter",

    "Painting Certificate Level 1",

    "Painting Certificate Level 2",

    "Basic Hazardous Area Classification",

    "Advanced Hazardous Area Classification",

    "Basic Electrical Safety",

    "Machine and Electrical Work Safety",

    "Tubing Installation Certification (SWAGELOK & Parker)",

    "Tubing Installation Certification (Parker)",

    "Pressure Testing",

    "ASME IX (Piping)",

    "AWS D1.1 (Structure)",

    "API 1104 (Pipeline)",

    "Welding Inspector",

    "Rigging & Slinging by TPTI",

    "Safe Lifting Operation Level 1",

    "Crane Operator License by PTTEP",

    "Basic Offshore Crane Operator",

    "Crane Operator (4 roles)",

    "Drops Awareness",

    "Hand and Power Tool Safety",

    "Manual Handling & Lifting",

    "Security Awareness",

    "SSHE Leadership",

    "Fatigue Management",

    "Process Safety Awareness",

    "Health & Hygiene Inspections",

    "Management of Change (MOC) Awareness",

    "Chemical Safety Management",

    "Oxygen-Fuel Gas Welding & Cutting",

    "Explosive & Flammable Chemicals",

    "Rope Access Level 1",

    "Lockout/Tagout (LOTO)",

    "Incident Management & Basic Incident Investigation",

    "Confined Space Entry & Breathing Apparatus",

    "Radiation Safety Officer Level 1 / G: 16",

    "Helicopter Pre-Fight Briefing / G: 23",

    "Intensive First Aid / G: 28",

    "Load Secure and Safe Latching / G: 31",

    "Advance Safety Observation Card / Additional Mandatory",

    "Safe Handling of dangerous goods and / Additional Mandatory chemicals",

    "Load securing and latching / Additional Mandatory",

    "API, ASTM, AWS, ASME",

    "API, ASME, AWS",

    "API /AWS / ASME",

    "WPS",

    "Knowledge NDT methods",

    "PLC (Programmable Controller)",

    "Pneumatic",

    "PCN RI - Retest",

    // ======================================================
    // PTT
    // ======================================================

    "HR Orientation",

    "Job Description",

    "Basic Safety Training",

    "Offshore Sea Survival Skills & Emegency / HUET",

    "New offshore",

    "Refresh Offshore",

    "Safety Awareness at PTT",

    "Lifting Supervisor",

    "Working at Height and Rescue",

    "Building Electrical Installation",

    "Fitter Training",

    "Hydraulic Tool Basics and Safety",

    "N-vision Pressure Calibrator Operation Training and Hydro test system",

    "Machine and Tool Safety",

    "Permit to work System (PTW) for ERP-PRP",

    "Harzop CARD System (HOC) ERP & PRP",

    // PTT - add from employee records

    "Occupational Safety Officer at Management Level",

    "Occupational Safety Officer at Technical Level",

    "Coating Inspector",

    "Welding Qualification Test",

    // ======================================================
    // Valeura
    // ======================================================

    "Safety Awareness at Mubadala",

    "Fire Watch Awareness",

    "HSSE Requirements for Contractors",
  ];

  // for (const name of TRAININGS) {
  const UNIQUE_TRAININGS = [...new Set(TRAININGS)].sort();

  for (const name of UNIQUE_TRAININGS) {
    await prisma.globalTraining.upsert({
      where: {
        name,
      },

      update: {},

      create: {
        name,
      },
    });

    console.log(`✔ ${name}`);
  }

  // console.log("✅ Done seeding Global Trainings");
  console.log(`✅ Done seeding Global Trainings (${UNIQUE_TRAININGS.length})`);
}

seedGlobalTrainings()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
