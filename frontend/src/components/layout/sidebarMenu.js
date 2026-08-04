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
        roles: ["admin", "hr", "manpower", "safety", "pe", "expert"],
      },
      {
        name: "Add Worker",
        path: "/workers/add",
        roles: ["admin", "hr"], // ← เปลี่ยนจาก ["admin", "hr", "manpower"]
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
        roles: ["admin", "hr", "manpower", "pe", "expert"], // PE และ Expert เข้ามาดูเป็น Knowledge Base ได้เลยจากตรงนี้
      },
      {
        name: "Compliance Center",
        path: "/compliance",
        roles: ["admin", "hr", "manpower", "safety", "nurse", "pe"],
        badge: true, // ตัวเลขแจ้งเตือน Expired/Missing ดึงสเตตัสรวมในหน้านี้หน้าเดียว
      },
      {
        name: "Certifications", // ← เพิ่มใหม่
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
        path: "/projects", // รองรับสเตตัส Open, In Progress, Archived และรองรับ Request ย่อยข้างใน
        roles: ["admin", "pe", "manpower", "hr", "pe_head"],
      },
      {
        name: "Allocation",
        path: "/allocation", // หน้าจับคู่ Matching (คัดคนเดิม, สแกนหาคน Match 100%)
        roles: ["admin", "manpower", "hr", "pe", "expert"],
      },
      {
        name: "Mobilization",
        path: "/mobilization", // หน้าติดตามคนเข้าไซต์งาน / แผนปฏิทินฝึกอบรม / ขั้นตอนลดกำลังพล (D-Mob)
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
        path: "/review", // บันทึกประวัติและ Log ผลงาน เพื่อให้ Manpower ค้นหา "คนเดิม" มาทำงานซ้ำได้แม่นยำ
        roles: ["admin", "hr", "pe", "pe_head", "manpower"],
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
        roles: ["admin", "pe_head", "bd", "manager", "manpower", "hr", "pe"],
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
