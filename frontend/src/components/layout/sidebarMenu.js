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
          "supervisor",
          "executive",
          "manager",
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
          "hr",
          "manpower",
          "safety",
          "nurse",
          "ta",
          "pe",
          "expert",
          "pe_head",
        ],
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
        roles: ["admin", "hr", "manpower", "pe", "pe_head", "expert", "ta"],
        // ← เพิ่ม pe_head: หัวหน้า PE ควรเห็นเท่ากับ pe ที่ดูแลอยู่แล้ว
      },
      {
        name: "Compliance Center",
        path: "/compliance",
        roles: [
          "admin",
          "hr",
          "manpower",
          "safety",
          "nurse",
          "pe",
          "pe_head", // ← เพิ่ม: ตาม pe
          "expert", // ← เพิ่ม: ใช้ประกอบการประเมินคุณสมบัติทางเทคนิค
          "ta",
        ],
        badge: true,
      },
      {
        name: "Certifications",
        path: "/certifications",
        roles: [
          "admin",
          "hr",
          "manpower",
          "safety",
          "nurse",
          "pe",
          "pe_head", // ← เพิ่ม: ตาม pe
          "expert", // ← เพิ่ม: คู่กับ Compliance Center
          "ta",
        ],
      },
      {
        name: "Training Requests",
        path: "/training-requests-history",
        roles: ["admin", "hr", "ta"], // เจ้าของงานจัด training โดยตรง — ไม่เพิ่ม
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
        roles: ["admin", "pe", "pe_head", "manpower", "hr", "expert"],
        // ← เพิ่ม expert: ให้ตรงกับสิทธิ์ที่มีอยู่แล้วใน route /projects (AppRouter.jsx)
      },
      {
        name: "Allocation",
        path: "/allocation",
        roles: ["admin", "manpower", "hr", "pe", "pe_head", "expert"],
        // ← เพิ่ม pe_head: หัวหน้า PE ควรรีวิว/กำกับขั้นตอนคัดเลือกได้เท่า pe
        // ไม่เพิ่ม safety/nurse/ta ตรงนี้ — เป็นขั้นตอนคัดเลือก/approve
        // ยังไม่ใช่งานตรวจร่างกาย/training ที่ role พวกนี้รับผิดชอบ
      },
      {
        name: "Mobilization",
        path: "/mobilization",
        roles: [
          "admin",
          "manpower",
          "hr",
          "pe",
          "pe_head", // ← เพิ่ม: ตาม pe เพื่อกำกับดูแลขั้นตอน deploy
          "safety",
          "nurse",
          "ta",
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
          "hr",
          "pe",
          "pe_head",
          "manpower",
          "supervisor",
          "executive",
          "manager",
          "bd", // ← เพิ่ม: ใช้ผลงานที่ผ่านมาประกอบการเสนอขาย/อ้างอิงกับลูกค้าใหม่
        ],
        // ไม่เพิ่ม safety/nurse/ta — เป็นการประเมินผลงานทั่วไป ไม่เกี่ยวกับ compliance
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
          "executive",
          "supervisor",
        ],
      },
      {
        name: "Projects Overview",
        path: "/supervisor-overview",
        roles: [
          "admin",
          "supervisor",
          "executive",
          "manager",
          "pe_head",
          "manpower",
          "hr",
          "pe",
          "bd", // ← เพิ่ม: ดูสถานะโปรเจกต์ปัจจุบันเพื่อคุยกับลูกค้า/คู่ค้า
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
        roles: ["admin", "hr", "manpower", "ta"],
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
