import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPositions() {
  console.log("🚀 Seeding Positions...");

  const POSITIONS = [
    // ======================================================
    // Chevron
    // ======================================================

    "Construction E&I Technician",
    "Construction E&I Foreman",
    "Construction Mechanical (Piping/Structure) Foreman",
    "Construction Supervisor (Mech & E&I)",

    "Crane Operator / Crane Coordinator / Crane Team Lead - Class A",
    "Crane Operator / Crane Coordinator / Crane Team Lead - Class B",
    "Crane Operator / Crane Coordinator / Crane Team Lead - Class B+",
    "Crane Operator - Class C",

    "Fire Watcher",

    "Semi Operator",

    "Painter",

    "Construction Utility Foreman (Painter / Scaffolder)",

    "Pipe Fitter A",
    "Pipe Fitter B",

    "Scaffolding Subject Matter Expertise (SME)",

    // "Welder - Alloy", -> "Welder, Alloy"
    // "Welder - Regular", -> "Welder, Regular"

    "Rigger / Scaffolder",

    "QC Level I (NDE)",

    // "Safety Officer / HES Specialist", -> "Safety Officer / HES specialist",

    "Crane Mechanic, Technician",
    "Materials Controller, Technician",

    "Helper / General Maintenance",

    // "CPP Crane Operator - Class A", -> "CPP Crane Operator, Class A",
    "CPP Crane Operator - Class B+",
    "CPP Crane Assistant",

    "Painter / Scaffolder",

    // Chevron - add from record (row 83 - 84)
    "CPP Crane Assistant / Rigger / Scaffolder",

    // Chevron - add from matrix

    "Welder, Regular",
    "Welder, Alloy",

    "Construction Supervisor (Mech)",

    "Crane Team Lead, Class A, Class B and B+ (Certify by Company)",

    "Crane Operator, Class A",
    "Crane Operator, Class A (Certify by Company)",
    "Crane Operator, Class B and B+ (Certify by Company)",
    "Crane Operator or Crane Coordinator or Crane Team lead,Class A (Certify by Company)",
    "Crane Operator or Crane Coordinator or Crane Team lead, Class B and B+ (Certify by Company)",
    "Crane Operator, Class C (Certify by Company)",

    "CPP Crane Operator, Class A",
    "CPP Crane Operator, Class A (Certify by Company)",
    "CPP Crane Operator, Class B+ (Certify by Company)",

    // "CPP Crane Assistant / Rigger / Scaffolder",
    "CPP Crane Assistant",
    "CPP Crane Assistant (Certify by Company)",
    "CPP Crane Assistant, Class A (Certify by Company)",
    "CPP Crane Assistant, Class B+ (Certify by Company)",

    "Safety Officer / HES specialist",

    "Rigger / Scaffolder + Rope Access Lead Level",

    "Rigger / Scaffolder + Rope Access Technician Level",

    // "Rigger/Scaffolder (Skill Mechanic)",
    "Rigger / Scaffolder (Skill Mechanic)",

    // ======================================================
    // Erawan
    // ======================================================

    "Piping & Structural Supervisor",
    "Piping & Structural Foreman",
    "Piping & Structural Fitter",

    "Helper",

    "Welder Foreman",
    "Multi-coded Welder",
    "Piping Welder",
    "Structural Welder",
    "Piping & Structural Welder",

    "Scaffolding Inspector",

    "Blaster / Painter",
    "Blaster / Painter with Rope Access",

    "Scaffold & Paint Foreman",

    "Lead Mechanic / Mechanic Foreman",
    "Mechanic",

    "Electrical & Instrumentation Supervisor",
    "Electrical & Instrumentation Foreman",
    "Electrical & Instrumentation Technician",

    "Material Control",

    "Technical Assistant / Project Coordinator",

    "QA/QC Inspector - Welding",
    "QA/QC Inspector - Painting",
    "QA/QC Inspector - NDE / Technician",

    "Piping Engineer",
    "Structural / Civil Engineer",
    "Welding Engineer",
    "Instrumentation Engineer",
    "Electrical Engineer",
    "Project Engineer",
    "QA/QC Engineer",
    "Commissioning Engineer",
    "Work Pack Engineer",

    "Commissioning Technician",

    "Safety Officer",

    "PT/MT Operator",

    "RT Operating Team - PCN",
    "RT Operating Team - ASNT",

    "RT Operator Team with Source & Equipment - ASNT",

    "UT PCN Operator (with flaw detectors + accessories)",
    "UT ASNT Operator (with flaw detectors + accessories)",

    "UT PCN Operator",
    "UT ASNT Operator",

    "Multi-skill: Rigger + Scaffolder + Painter + Fire Watcher Assistant",

    "Crane Operator Class A",
    "Crane Operator Class B",

    "Technician",

    // ======================================================
    // PTT
    // ======================================================

    "Engineer",

    "Supervisor",

    "Foreman",

    "Safety Officer",

    "Sr. Rigger",

    "Scaffolder Inspector",
    "Scaffolder",

    "Rigger",

    "Welder",

    "Fitter",

    "I/E Supervisor",
    "I/E Foreman",
    "I/E Engineer",
    "I/E Technician",

    "Mechanic Tech",

    "Maintenance",

    "QA/QC Inspector",

    "Hydrotest & Torque Technician",

    "Crane Operator",

    // PTT - add from record

    "Painting Foreman",

    "Painting Supervisor",

    "Construction Supervisor",

    "Engineering Supervisor",

    "QA/QC Inspector",

    // ======================================================
    // Valeura
    // ======================================================

    "Project Engineer",

    "Fitter B",
  ];

  // ======================================================
  // Remove duplicates + sort
  // ======================================================

  const UNIQUE_POSITIONS = [...new Set(POSITIONS)].sort();

  // ======================================================
  // Upsert
  // ======================================================

  for (const name of UNIQUE_POSITIONS) {
    await prisma.position.upsert({
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

  console.log("✅ Done seeding Positions");
}

seedPositions()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
