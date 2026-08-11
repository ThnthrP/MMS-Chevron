import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getProjectsOverview() {
  const projects = await prisma.project.findMany({
    include: {
      contract: { include: { client: true } },
      requests: {
        include: {
          position: true,
          rounds: {
            orderBy: { round: "desc" },
            take: 1,
            include: {
              candidates: {
                select: { id: true, status: true, employeeId: true }, // ← เพิ่ม employeeId
              },
            },
          },
        },
      },
      assignments: {
        include: {
          employee: {
            select: {
              fullName: true,
              empCode: true,
              position: { select: { name: true } }, // ← เพิ่ม: ตำแหน่งจริงของพนักงาน
            },
          },
        },
        orderBy: { mobDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  const result = projects.map((p) => {
    const requests = p.requests.map((req) => {
      const candidates = req.rounds[0]?.candidates ?? [];
      const shortlisted = candidates.length;
      const approved = candidates.filter((c) => c.status === "approved").length;
      const remaining = Math.max(0, req.quantity - shortlisted);

      return {
        id: req.id,
        position: req.position?.name,
        quantity: req.quantity,
        shortlisted,
        approved,
        remaining,
        shortlistedPct:
          req.quantity > 0 ? Math.round((shortlisted / req.quantity) * 100) : 0,
      };
    });

    // ── หา "requested position" ต่อ employeeId จาก approved candidates ──
    //    (คนละความหมายกับตำแหน่งจริงของพนักงาน — นี่คือตำแหน่งที่ request ต้องการ)
    const requestedPositionByEmp = new Map();
    p.requests.forEach((req) => {
      (req.rounds[0]?.candidates ?? []).forEach((c) => {
        if (c.status === "approved" && c.employeeId) {
          requestedPositionByEmp.set(c.employeeId, req.position?.name ?? null);
        }
      });
    });

    const employees = p.assignments.map((a) => ({
      employeeId: a.employeeId,
      fullName: a.employee?.fullName,
      empCode: a.employee?.empCode,
      employeePosition: a.employee?.position?.name ?? null, // ← ใหม่: ตำแหน่งจริงของพนักงาน
      requestedPosition:
        requestedPositionByEmp.get(a.employeeId) ??
        a.employee?.position?.name ??
        null, // ← ใหม่: ตำแหน่งที่ถูก request (fallback เป็นตำแหน่งจริงถ้าหาไม่เจอ)
      mobDate: a.mobDate,
      demobDate: a.demobDate,
      platform: a.platform,
    }));

    let tab;
    if (p.status === "completed") {
      tab = "completed";
    } else if (p.startDate && new Date(p.startDate) > now) {
      tab = "upcoming";
    } else {
      tab = "in_progress";
    }

    return {
      id: p.id,
      name: p.name,
      client: p.contract?.client?.name ?? null,
      location: p.location,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      tab,
      requests,
      employees,
    };
  });

  return {
    upcoming: result.filter((p) => p.tab === "upcoming"),
    inProgress: result.filter((p) => p.tab === "in_progress"),
    completed: result.filter((p) => p.tab === "completed"),
  };
}
