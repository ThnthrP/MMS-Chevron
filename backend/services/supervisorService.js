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
                select: { id: true, status: true },
              },
            },
          },
        },
      },
      assignments: {
        include: {
          employee: { select: { fullName: true, empCode: true } },
          position: { select: { name: true } },
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

    const employees = p.assignments.map((a) => ({
      employeeId: a.employeeId,
      fullName: a.employee?.fullName,
      empCode: a.employee?.empCode,
      position: a.position?.name ?? null,
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
