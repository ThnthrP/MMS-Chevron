import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// const TRAININGS = [
//   // ===== Safety =====
//   "BOSIET",
//   "T-BOSIET",
//   "Basic Fire Fighting",
//   "First Aid Basic",
//   "Working at Height",
//   "Confined Space Entry",
//   "Permit to Work (PTW)",
//   "Job Safety Analysis (JSA)",
//   "Waste Management",
//   "Incident Investigation",
//   "Chemical Safety Management",
//   "High Pressure Gas Cylinder Handling",
//   "H2S & Chemical Awareness",
//   "Flanged Joint Management",
//   "Drops Awareness",
//   "Fire Watch",
//   "Authorized Gas Tester",
//   "Lockout/Tagout (LOTO)",
//   "Manual Handling & Lifting",
//   "Security Awareness",
//   "SSHE Leadership",
//   "Fatigue Management",
//   "Process Safety Awareness",
//   "Health & Hygiene",
//   "Pressure Testing",
//   "Basic Hazardous Area Classification",
//   "Advanced Hazardous Area Classification",
//   "Basic Electrical Safety",

//   // ===== Rigging / Scaffold =====
//   "Basic Scaffolding",
//   "Advanced Scaffolding",
//   "Scaffolding Inspection",
//   "Rigging & Slinging",
//   "Safe Lifting Operation Level 1",
//   "Crane Operator License (PTTEP)",

//   // ===== Specialized =====
//   "Rope Access Level 1",
//   "Paint Inspector",
//   "Welding Inspector",
//   "Qualified Welder",
//   "ASME IX (Piping)",
//   "AWS D1.1 (Structure)",
//   "API 1104 (Pipeline)",

//   // ===== Company specific (ยังถือเป็น global ได้) =====
//   "Site SSHE Induction",
//   "Safety Officer Supervisor Level",
//   "Professional Safety Officer",
//   "Explosive and Flammable Chemicals",
// ];

const TRAININGS = [
  {
    name: "Site SSHE Induction",
    fullName: "Site SSHE Induction",
    // category: "client_specific",
    source: ["COMPANY"],
  },
  {
    name: "Safety Officer Supervisor Level",
    fullName: "Safety Officer Supervisor Level",
    // category: "legal",
    source: ["CONTRACTOR"],
  },
  {
    name: "Professional Safety Officer",
    fullName: "Professional safety officer / Legal and Author",
    // category: "legal",
    source: ["CONTRACTOR"],
  },
  {
    name: "T-BOSIET",
    fullName:
      "Tropical Basic Offshore Safety Induction & Emergency Training (T-BOSIET) (Including refresher training T-FOET)",
    // category: "offshore",
    source: ["TPTI"],
  },
  {
    name: "Basic Fire Fighting",
    fullName: "Basic Fire Fighting",
    // category: "safety",
    source: ["CONTRACTOR"],
  },
  {
    name: "First Aid Basic",
    fullName: "First Aid Basic / G:20",
    // category: "medical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Basic Safety Observation Card (BBS)",
    fullName:
      "Basic Safety Observation Card (SOC)\nBehavior Based Safety (BBS) & Observation (12 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Fundamental Risk Assessment & Job Safety Analysis (JSA)",
    fullName:
      "Fundamental Risk Assessment and Job Safety Analysis (JSA) / (16 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Permit to Work (PTW)",
    fullName: "Permit to work (PTW) / G:28 (16 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Waste Management / Additional Mandatory",
    fullName: "Waste management / Additional Mandatory / (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Incident Investigation & Root Cause Analysis",
    fullName: "Incident Investigation & Root Cause Analysis",
    // category: "safety",
    source: ["CONTRACTOR"],
  },
  {
    name: "Chemical Safety Management",
    fullName: "Chemical Safety Management (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "High Pressure Gas Cylinder Handling",
    fullName: "High pressure gas cylinder handling [Selected Person] / G:15",
    // category: "safety",
    source: ["CONTRACTOR"],
  },
  {
    name: "Authorized Gas Tester",
    fullName: "Authorized Gas Tester (12 คะแนน) / G:25",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Arsenic, Benzene, Hydrogen Sulfide & Mercury Awareness",
    fullName:
      "Arsenic, Benzene, Hydrogen Sulfide, and Mercury Awareness (16 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Flanged Joint Management",
    fullName: "Flanged Joint Management / Additional Mandatory / L.10",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Basic Scaffolding",
    fullName: "Basic Scaffolding / G:7",
    // category: "technical",
    source: ["TPTI"],
  },
  {
    name: "Advanced Scaffolding",
    fullName: "Advance Scaffolding",
    // category: "technical",
    source: ["TPTI"],
  },
  {
    name: "Scaffolding Inspection",
    fullName: "Scaffolding Inspection",
    // category: "technical",
    source: ["TPTI"],
  },
  {
    name: "Rigging, Slinging & Banksman",
    fullName: "Rigging, Slinging & Banksman",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Basic Working at Height & Rescue",
    fullName: "Basic Working at Height & Rescue / G:10",
    // category: "safety",
    source: ["TPTI"],
  },
  {
    name: "Blaster and Painter",
    fullName:
      "Basic  Paint / Certificate Blaster and Painter (JOTUN, SSPC, ACQPA, FROSIO, BGAS-CSWIP, NACE or equivalent)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Painting Certificate Level 1",
    fullName:
      "Painting Certificate Level 1 / Certified to Level 1 (NACE, SSPC, ACQPA, BGAS-CSWIP or equivalent)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Painting Certificate Level 2",
    fullName:
      "Painting Certificate Level 2 / Certificate Level 2 requirement (BGAS-CSWIP Grade 2, NACE Level 2 or SSPC Level 2 or equivalent)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Basic Hazardous Area Classification",
    fullName: "Basic Hazardous Area Classification",
    // category: "technical",
    source: ["COMPANY"],
  },
  {
    name: "Advanced Hazardous Area Classification",
    fullName: "Advance Hazardous Area Classification (48 คะแนน)",
    // category: "technical",
    source: ["COMPANY"],
  },
  {
    name: "Basic Electrical Safety",
    fullName:
      "Basic Electrical Safety and Electrical Safety Rules for Operation-based personnel / คร11, คร12, คร13",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Machine and Electrical Work Safety",
    fullName: "ความปลอดภัยในการทำงานเครื่องจักรและไฟฟ้า (ตามกฎหมาย)",
    // category: "legal",
    source: ["CONTRACTOR"],
  },
  {
    name: "Tubing Installation Certification (SWAGELOK & Parker)",
    fullName:
      "Certification in Tubing Installation (SWAGELOK Training and Parker Training)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Tubing Installation Certification (Parker)",
    fullName: "Certification in Tubing Installation (Parker Training)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Pressure Testing",
    fullName: "Pressure Testing / G:29",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "ASME IX (Piping)",
    fullName: "ASME IX (Piping)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "AWS D1.1 (Structure)",
    fullName: "AWS D1.1 (Structure)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "API 1104 (Pipeline)",
    fullName: "API 1104 (Pipeline)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Welding Inspector",
    fullName: "Welding Inspector (CSWIP 3.1 / AWS CWI)",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Basic Offshore Crane Operator",
    fullName: "Basic Offshore Crane Operator / G:12",
    // category: "technical",
    source: ["TPTI"],
  },
  {
    name: "Crane Operator (4 roles)",
    fullName: "ปั่นจั่น 4 ผู้ (ฝึกตามกฎหมาย)",
    // category: "legal",
    source: ["TPTI"], // ← ตาม label นี้
  },
  {
    name: "Rigging & Slinging by TPTI",
    fullName: "Rigging & Slinging by TPTI",
    // category: "technical",
    source: ["TPTI"],
  },
  {
    name: "Safe Lifting Operation Level 1",
    fullName: "Safe Lifting Operation Level 1 (12 คะแนน)",
    // category: "technical",
    source: ["COMPANY"],
  },
  {
    name: "Crane Operator License by PTTEP",
    fullName: "License Crane Operator by PTTEP",
    // category: "legal",
    source: ["COMPANY"],
  },
  {
    name: "Drops Awareness",
    fullName: "Drops Awareness (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Fire Watch",
    fullName: "Fire Watch",
    // category: "safety",
    source: ["CONTRACTOR"],
  },
  {
    name: "Confined Space Entry & Breathing Apparatus",
    fullName: "Confined Space Entry & Breathing Apparatus G:11",
    // category: "safety",
    source: ["CONTRACTOR"],
  },
  {
    name: "Hand and Power Tool Safety",
    fullName: "Hand and Power Tool Safety (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Manual Handling & Lifting",
    fullName: "Manual Handling and Lifting Techniques (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Security Awareness",
    fullName: "Security Awareness (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "SSHE Leadership",
    fullName: "SSHE Leadership for workforce (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Fatigue Management",
    fullName: "Fatigue Management Program (แบบประเมิน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Process Safety Awareness",
    fullName: "Process Safety Awareness (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Health & Hygiene Inspections",
    fullName: "Health and Hygiene Inspections (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Management of Change (MOC) Awareness",
    fullName: "Management Of Change (MOC) Awareness (5คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Oxygen-Fuel Gas Welding & Cutting",
    fullName: "Oxygen-Fuel Gas Welding and Cutting (8 คะแนน)",
    // category: "technical",
    source: ["COMPANY"],
  },
  {
    name: "Explosive & Flammable Chemicals",
    fullName: "Explosive and Flammable Chemicals",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Rope Access Level 1",
    fullName: "Rope Access Level 1",
    // category: "technical",
    source: ["CONTRACTOR"],
  },
  {
    name: "Lockout/Tagout (LOTO)",
    fullName: "Lockout/Tagout (LOTO) (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
  {
    name: "Incident Management & Basic Incident Investigation",
    fullName:
      "Incident Management and Basic Incident Investigation Process (8 คะแนน)",
    // category: "safety",
    source: ["COMPANY"],
  },
];

async function main() {
  console.log("Seeding GlobalTraining...");

  for (const t of TRAININGS) {
    await prisma.globalTraining.upsert({
      where: { name: t.name },
      update: {},
      create: {
        name: t.name,
        fullName: t.fullName,
        // category: t.category,
        source: t.source,
      },
    });
  }

  console.log(`✅ Done: ${TRAININGS.length} trainings`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
