// ============================================================
// sidebarMenu.js
// Experteam Manpower Management System (MMS) - Production Ready
// ============================================================
//
// ── Role scheme (9 roles ปัจจุบันในระบบ) ──
//   admin
//   project_engineer          (เดิม: pe)
//   manpower_supply           (เดิม: manpower)
//   hr_supervisor
//   personal_record_officer
//   hr_officer                (เดิม: hr — แทนที่ด้วย 3 ตำแหน่ง HR ข้างบนทั้งหมด)
//   safety_manager
//   safety_officer            (เดิม: safety)
//   training_officer          (เดิม: ta)
//
// role อื่นที่เคยมี (pe_head, nurse, bd, expert, supervisor, executive,
// manager) ถูกลบออกจากระบบแล้ว — เอา string เหล่านี้ออกจากทุก array
// ============================================================

export const APP_MENU = [
  {
    section: "MAIN",
    items: [
      {
        name: "Dashboard",
        path: "/",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "safety_manager",
          "safety_officer",
          "training_officer",
        ],
      },
    ],
  },

  // ========================================================
  // WORKFORCE: ข้อมูลกำลังพล (รายคน)
  // ========================================================
  {
    section: "WORKFORCE",
    items: [
      {
        name: "Workers",
        path: "/workers",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "safety_manager", // ← ตามเอกสารอนุมัติ: "การเข้าถึงหน้าข้อมูลพนักงานทั้งหมด"
          "training_officer",
        ],
      },
      {
        name: "Add Worker",
        path: "/workers/add",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
    ],
  },

  // ========================================================
  // COMPLIANCE: ใบรับรอง/ผลตรวจแพทย์ (งานดู/ใช้รายวัน)
  // ========================================================
  {
    section: "COMPLIANCE",
    items: [
      {
        name: "Training Matrix",
        path: "/training-matrix",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
      {
        name: "Compliance Center",
        path: "/compliance",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "safety_manager",
          "training_officer",
        ],
        badge: true,
      },
      {
        name: "Certifications",
        path: "/certifications",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "safety_manager",
          "training_officer",
        ],
      },
      {
        name: "Requests", // ชื่อเต็มที่หัวเพจ: Requests for Training & Medical (เดิม: Requests from MP)
        path: "/requests-history",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
    ],
  },

  // ========================================================
  // OPERATIONS: การดำเนินงานหน้างาน (ตั้งแต่เปิดโปรเจกต์ ยันส่งคนลงเรือ)
  // ========================================================
  {
    section: "OPERATIONS",
    items: [
      {
        name: "Projects",
        path: "/projects",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
          "project_engineer",
          "safety_manager", // ← ตามเอกสารอนุมัติ: "การเข้าถึงหน้าข้อมูล project request"
        ],
      },
      {
        name: "Allocation",
        path: "/allocation",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
          "project_engineer",
          "safety_manager", // ← ตามเอกสารอนุมัติ: "สรุปรายชื่อพนักงานเลือกลงงาน"
        ],
      },
      {
        name: "PE Approvals",
        path: "/pe-approvals",
        roles: [
          "admin",
          "project_engineer",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
      {
        name: "Mobilization",
        path: "/mobilization",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "project_engineer",
          "safety_manager",
          "safety_officer",
          "training_officer",
        ],
      },
      {
        name: "Projects Overview",
        path: "/projects-overview",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
          "project_engineer",
        ],
      },
    ],
  },

  // ========================================================
  // REVIEW: ประวัติและการประเมินผลหลังจบงาน
  // ========================================================
  {
    section: "REVIEW",
    items: [
      {
        name: "Post-Project Review",
        path: "/review",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
          "project_engineer",
        ],
      },
    ],
  },

  // ========================================================
  // REPORTS: รายงานภาพรวม
  // ========================================================
  {
    section: "REPORTS",
    items: [
      {
        name: "Analytics & Reports",
        path: "/reports",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
    ],
  },

  // ========================================================
  // SETTINGS: master data / config — เซ็ตตอนเริ่ม, นานๆ แก้ที
  // ========================================================
  {
    section: "SETTINGS",
    items: [
      {
        name: "Manage Positions",
        path: "/positions",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
      {
        name: "Manage Departments",
        path: "/divisions",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
      {
        name: "Manage Trainings",
        path: "/trainings",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
      {
        name: "Matrix Editor",
        path: "/positions/matrix",
        roles: [
          "admin",
          "manpower_supply",
          "hr_supervisor",
          "personal_record_officer",
          "hr_officer",
          "training_officer",
        ],
      },
    ],
  },

  // ========================================================
  // SYSTEM: จัดการระบบ/ผู้ใช้ (admin only)
  // ========================================================
  {
    section: "SYSTEM",
    items: [
      {
        name: "User Management",
        path: "/users",
        roles: ["admin"],
      },
      {
        name: "Bulk Set PIN",
        path: "/workers/bulk-set-pin",
        roles: ["admin"],
      },
      {
        name: "Audit Log",
        path: "/audit-logs",
        roles: ["admin"],
      },
      {
        name: "Data Import",
        path: "/data-import",
        roles: ["admin"],
      },
    ],
  },
];
