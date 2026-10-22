// ══════════════════════════════════════════════════════════
// ใช้ร่วมกันระหว่าง trainingRequestService.js และ medicalRequestService.js
// ══════════════════════════════════════════════════════════

export const DECISIONS = ["confirmed", "rejected", "pending"];

// "2026-11-12" / Date / null → Date | null (ค่าที่อ่านไม่ได้ → null)
export const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const clean = (v) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

// ข้อมูลส่วนหัวของคำขอ (วันที่ที่ต้องการ / สถานที่ / หมายเหตุ)
export const parseMeta = (meta = {}) => ({
  requestedStart: toDate(meta.requestedStart),
  requestedEnd: toDate(meta.requestedEnd),
  provider: clean(meta.provider),
  remarks: clean(meta.remarks),
});

export const badRequest = (message) =>
  Object.assign(new Error(message), { status: 400 });

// ค่าที่จะบันทึกลง item ตามผลการตัดสินของ HR
export function decisionData(decision, body, actorName) {
  if (!DECISIONS.includes(decision)) throw badRequest("Invalid decision");
  if (decision === "pending") {
    // ย้อนกลับเป็นรอ HR — ล้างผลเดิมทั้งหมด
    return {
      status: "pending",
      confirmedStart: null,
      confirmedEnd: null,
      confirmedProvider: null,
      hrNote: null,
      decidedAt: null,
      decidedByName: null,
    };
  }
  const base = {
    status: decision,
    hrNote: clean(body.note),
    decidedAt: new Date(),
    decidedByName: actorName || null,
  };
  if (decision === "rejected")
    return { ...base, confirmedStart: null, confirmedEnd: null, confirmedProvider: null };

  const confirmedStart = toDate(body.confirmedStart);
  const confirmedEnd = toDate(body.confirmedEnd);
  if (confirmedStart && confirmedEnd && confirmedEnd < confirmedStart)
    throw badRequest("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
  return {
    ...base,
    confirmedStart,
    confirmedEnd,
    confirmedProvider: clean(body.provider),
  };
}

export const countStatuses = (items) => {
  const c = { pending: 0, confirmed: 0, rejected: 0 };
  for (const i of items) c[i.status || "pending"] = (c[i.status || "pending"] || 0) + 1;
  return c;
};

// แจ้งเตือนผู้ขอ เมื่อ HR ตัดสินคำขอแล้ว (ไม่แจ้งถ้าเป็นคนเดียวกัน)
export async function notifyRequester(prisma, batch, actorId, payload) {
  if (!batch.requestedById || batch.requestedById === actorId) return;
  try {
    await prisma.notification.create({
      data: { userId: batch.requestedById, ...payload },
    });
  } catch (err) {
    console.error("notify requester failed:", err);
  }
}

// พนักงานที่ติดงานในช่วงวันที่ (ใช้เตือนตอนขอจอง — ยังขอได้ แค่แจ้งให้รู้)
export async function findJobClashes(prisma, start, end, employeeIds) {
  const s = toDate(start);
  const e = toDate(end) || s;
  if (!s) return {};
  const rows = await prisma.assignment.findMany({
    where: {
      status: { not: "cancelled" },
      mobDate: { not: null, lte: e },
      OR: [{ demobDate: null }, { demobDate: { gte: s } }],
      ...(employeeIds?.length ? { employeeId: { in: employeeIds } } : {}),
    },
    select: {
      employeeId: true,
      mobDate: true,
      demobDate: true,
      platform: true,
      projectLabel: true,
      project: { select: { name: true } },
    },
    orderBy: { mobDate: "asc" },
  });
  const map = {};
  for (const a of rows) {
    (map[a.employeeId] ||= []).push({
      mobDate: a.mobDate,
      demobDate: a.demobDate,
      platform: a.platform,
      project: a.project?.name || a.projectLabel || null,
    });
  }
  return map;
}
