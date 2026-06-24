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
        path: "/admin",
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
  // WORKFORCE: ข้อมูลกำลังพลทั้งหมด (พนักงานประจำ, พนักงานใหม่, ซับคอน)
  // ========================================================
  {
    section: "WORKFORCE",
    items: [
      {
        name: "Workers",
        path: "/admin/workers",
        roles: ["admin", "hr", "manpower", "safety", "pe", "expert"],
      },
      {
        name: "Add Worker",
        path: "/admin/workers/add",
        roles: ["admin", "hr"],
      },
      {
        name: "Manage Positions",
        path: "/admin/positions",
        roles: ["admin", "hr", "manpower"],
      },
      {
        name: "Manage Divisions",
        path: "/admin/divisions",
        roles: ["admin", "hr", "manpower"],
      },
    ],
  },

  // ========================================================
  // COMPLIANCE: เกณฑ์มาตรฐาน และใบรับรอง/ผลตรวจแพทย์
  // ========================================================
  {
    section: "COMPLIANCE",
    items: [
      {
        name: "Training Matrix",
        path: "/admin/training-matrix",
        roles: ["admin", "hr", "manpower", "pe", "expert"], // PE และ Expert เข้ามาดูเป็น Knowledge Base ได้เลยจากตรงนี้
      },
      {
        name: "Matrix Editor",
        path: "/admin/positions/matrix",
        roles: ["admin", "hr", "manpower"],
      },
      {
        name: "Compliance Center",
        path: "/admin/compliance",
        roles: ["admin", "hr", "manpower", "safety", "nurse", "pe"],
        badge: true, // ตัวเลขแจ้งเตือน Expired/Missing ดึงสเตตัสรวมในหน้านี้หน้าเดียว
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
        path: "/admin/projects", // รองรับสเตตัส Open, In Progress, Archived และรองรับ Request ย่อยข้างใน
        roles: ["admin", "pe", "pe_head", "manpower"],
      },
      {
        name: "Allocation",
        path: "/admin/allocation", // หน้าจับคู่ Matching (คัดคนเดิม, สแกนหาคน Match 100%)
        roles: ["admin", "manpower", "expert"],
      },
      {
        name: "Mobilization",
        path: "/admin/mobilization", // หน้าติดตามคนเข้าไซต์งาน / แผนปฏิทินฝึกอบรม / ขั้นตอนลดกำลังพล (D-Mob)
        roles: ["admin", "manpower", "safety", "nurse", "ta"],
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
        path: "/admin/review", // บันทึกประวัติและ Log ผลงาน เพื่อให้ Manpower ค้นหา "คนเดิม" มาทำงานซ้ำได้แม่นยำ
        roles: ["admin", "pe", "pe_head"],
      },
    ],
  },

  // ========================================================
  // REPORTS & SYSTEM: รายงานภาพรวมและการจัดการระบบ
  // ========================================================
  {
    section: "REPORTS",
    items: [
      {
        name: "Analytics & Reports",
        path: "/admin/reports",
        roles: ["admin", "pe_head", "bd", "manager"],
      },
    ],
  },

  {
    section: "SYSTEM",
    items: [
      {
        name: "User Management",
        path: "/admin/users",
        roles: ["admin"],
      },
    ],
  },
];
