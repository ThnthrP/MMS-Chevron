// ============================================================
// controllers/auditLogController.js — admin only
// GET /api/audit-logs            รายการ + filter + pagination
// GET /api/audit-logs/filters    ตัวเลือกสำหรับ dropdown (user / module / action)
// GET /api/audit-logs/export     ดาวน์โหลด CSV ตาม filter เดียวกัน
// GET /api/audit-logs/:id        รายละเอียด 1 รายการ
// ============================================================
import prisma from "../config/prisma.js";
import { USER_ROLES_LIGHT_INCLUDE, roleLabel } from "../utils/roles.js";

const MAX_PAGE_SIZE = 200;
const MAX_EXPORT = 50000;

// ── ตรวจว่าเป็น admin (pattern เดียวกับ service อื่นในระบบ) ──
export async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: { role: true },
    });
    if (user?.role?.name !== "admin") {
      return res.status(403).json({ success: false, message: "เฉพาะผู้ดูแลระบบ (admin)" });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── สร้าง where จาก query string ──
function buildWhere(q) {
  const where = {};
  const and = [];

  if (q.userId) where.userId = q.userId;
  if (q.employeeId) where.employeeId = q.employeeId;
  if (q.actorType) where.actorType = q.actorType;
  if (q.module) where.module = q.module;
  if (q.action) where.action = q.action;
  if (q.resourceId) where.resourceId = q.resourceId;
  if (q.success === "true") where.success = true;
  if (q.success === "false") where.success = false;

  // ช่วงวันที่ — from/to เป็น YYYY-MM-DD (เวลาไทย)
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt.gte = new Date(`${q.from}T00:00:00+07:00`);
    if (q.to) where.createdAt.lte = new Date(`${q.to}T23:59:59.999+07:00`);
  }

  if (q.search?.trim()) {
    const s = q.search.trim();
    and.push({
      OR: [
        { actorName: { contains: s, mode: "insensitive" } },
        { summary: { contains: s, mode: "insensitive" } },
        { path: { contains: s, mode: "insensitive" } },
        { resourceId: { contains: s } },
        { ip: { contains: s } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function listAuditLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const where = buildWhere(req.query);

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          actorType: true,
          userId: true,
          employeeId: true,
          actorName: true,
          actorRole: true,
          action: true,
          module: true,
          resourceId: true,
          summary: true,
          success: true,
          statusCode: true,
          method: true,
          path: true,
          ip: true,
        },
      }),
    ]);

    res.json({ success: true, rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error("listAuditLogs:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAuditLog(req, res) {
  try {
    const log = await prisma.auditLog.findUnique({ where: { id: req.params.id } });
    if (!log) return res.status(404).json({ success: false, message: "ไม่พบรายการ" });
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAuditFilters(req, res) {
  try {
    const [users, modules, actions] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, ...USER_ROLES_LIGHT_INCLUDE },
        orderBy: { name: "asc" },
      }),
      prisma.auditLog.findMany({ distinct: ["module"], select: { module: true }, orderBy: { module: "asc" } }),
      prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    ]);
    res.json({
      success: true,
      users: users.map((u) => ({ id: u.id, name: u.name || u.email, role: roleLabel(u) })),
      modules: modules.map((m) => m.module),
      actions: actions.map((a) => a.action),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── CSV (เปิดใน Excel ภาษาไทยได้ — มี BOM) ──
const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const fmtThai = (d) =>
  new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", hour12: false }).replace(",", "");

export async function exportAuditLogs(req, res) {
  try {
    const where = buildWhere(req.query);
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT,
    });

    const header = [
      "Time (Asia/Bangkok)",
      "User",
      "Role",
      "Actor Type",
      "Action",
      "Module",
      "Summary",
      "Result",
      "Status",
      "Method",
      "Path",
      "Resource ID",
      "IP",
      "Changes",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          fmtThai(r.createdAt),
          r.actorName,
          r.actorRole,
          r.actorType,
          r.action,
          r.module,
          r.summary,
          r.success ? "Success" : "Failed",
          r.statusCode,
          r.method,
          r.path,
          r.resourceId,
          r.ip,
          r.details?.changes || "",
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log_${stamp}.csv"`);
    res.send("﻿" + lines.join("\r\n"));
  } catch (err) {
    console.error("exportAuditLogs:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
