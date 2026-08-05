// ============================================================
// sidebarMenu.js
// Experteam Manpower Management System (MMS) - Production Ready
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
          "pe",
          "pe_head",
          "hr",
          "manpower",
          "safety",
          "nurse",
          "ta",
          "bd",
          "expert",
          "supervisor", // ← เพิ่ม
          "executive", // ← เพิ่ม
          "manager", // ← เพิ่ม
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
        roles: ["admin", "hr", "manpower", "safety", "pe", "expert", "pe_head"], // ← เพิ่ม pe_head
      },
      {
        name: "Add Worker",
        path: "/workers/add",
        roles: ["admin", "hr"],
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
        roles: ["admin", "hr", "manpower", "pe", "expert"],
      },
      {
        name: "Compliance Center",
        path: "/compliance",
        roles: ["admin", "hr", "manpower", "safety", "nurse", "pe"],
        badge: true,
      },
      {
        name: "Certifications",
        path: "/certifications",
        roles: ["admin", "hr", "manpower", "safety", "nurse", "pe"],
      },
      {
        name: "Training Requests",
        path: "/training-requests-history",
        roles: ["admin", "hr"],
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
        roles: ["admin", "pe", "manpower", "hr", "pe_head"],
      },
      {
        name: "Allocation",
        path: "/allocation",
        roles: ["admin", "manpower", "hr", "pe", "expert"],
      },
      {
        name: "Mobilization",
        path: "/mobilization",
        roles: ["admin", "manpower", "hr", "pe", "safety", "nurse", "ta"],
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
          "hr",
          "pe",
          "pe_head",
          "manpower",
          "supervisor", // ← เพิ่ม
          "executive", // ← เพิ่ม
          "manager", // ← เพิ่ม
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
          "pe_head",
          "bd",
          "manager",
          "manpower",
          "hr",
          "pe",
          "executive", // ← เพิ่ม
          "supervisor", // ← เพิ่ม
        ],
      },
      {
        name: "Projects Overview",
        path: "/supervisor-overview",
        roles: ["admin", "supervisor", "executive", "manager", "pe_head"],
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
        roles: ["admin", "hr", "manpower"],
      },
      {
        name: "Manage Departments",
        path: "/divisions",
        roles: ["admin", "hr", "manpower"],
      },
      {
        name: "Manage Trainings",
        path: "/trainings",
        roles: ["admin", "hr", "manpower"],
      },
      {
        name: "Matrix Editor",
        path: "/positions/matrix",
        roles: ["admin", "hr", "manpower"],
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
    ],
  },
];
