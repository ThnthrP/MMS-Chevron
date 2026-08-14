import { PrismaClient } from "@prisma/client";
import readline from "readline";

const prisma = new PrismaClient();

function askConfirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function clearAllProjectData() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  if (projects.length === 0) {
    console.log("✅ ไม่มี Project ในระบบอยู่แล้ว ไม่ต้องทำอะไร");
    return;
  }

  console.log(`⚠ พบ ${projects.length} projects ที่จะถูกลบทั้งหมด:`);
  projects.forEach((p) => console.log(`  - ${p.name} (${p.id})`));

  const answer = await askConfirm(
    '\n⚠ การกระทำนี้ลบทิ้งถาวร ไม่สามารถกู้คืนได้\nพิมพ์ "DELETE ALL" เพื่อยืนยัน: ',
  );

  if (answer !== "DELETE ALL") {
    console.log("❌ ยกเลิก — ไม่มีอะไรถูกลบ");
    return;
  }

  const projectIds = projects.map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    // ── หา id ที่เกี่ยวข้องทั้งหมดก่อน ──
    const requests = await tx.manpowerRequest.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });
    const requestIds = requests.map((r) => r.id);

    const rounds = await tx.candidateRound.findMany({
      where: { requestId: { in: requestIds } },
      select: { id: true },
    });
    const roundIds = rounds.map((r) => r.id);

    const candidates = await tx.candidate.findMany({
      where: { roundId: { in: roundIds } },
      select: { id: true },
    });
    const candidateIds = candidates.map((c) => c.id);

    const bookings = await tx.booking.findMany({
      where: { requestId: { in: requestIds } },
      select: { id: true },
    });
    const bookingIds = bookings.map((b) => b.id);

    const subReqs = await tx.subcontractorRequest.findMany({
      where: { requestId: { in: requestIds } },
      select: { id: true },
    });
    const subReqIds = subReqs.map((s) => s.id);

    // ── ลบตามลำดับ child -> parent ──
    console.log("🗑 CandidateGap...");
    await tx.candidateGap.deleteMany({
      where: { candidateId: { in: candidateIds } },
    });

    console.log("🗑 CandidateScore...");
    await tx.candidateScore.deleteMany({
      where: { candidateId: { in: candidateIds } },
    });

    console.log("🗑 ClientApproval...");
    await tx.clientApproval.deleteMany({
      where: { requestId: { in: requestIds } },
    });

    console.log("🗑 Candidate...");
    await tx.candidate.deleteMany({
      where: { roundId: { in: roundIds } },
    });

    console.log("🗑 CandidateRound...");
    await tx.candidateRound.deleteMany({
      where: { requestId: { in: requestIds } },
    });

    console.log("🗑 MobilizationTask...");
    await tx.mobilizationTask.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });

    console.log("🗑 Assignment...");
    await tx.assignment.deleteMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { bookingId: { in: bookingIds } },
        ],
      },
    });

    console.log("🗑 Booking...");
    await tx.booking.deleteMany({
      where: { requestId: { in: requestIds } },
    });

    console.log("🗑 SSERecord...");
    await tx.sSERecord.deleteMany({
      where: { requestId: { in: requestIds } },
    });

    console.log("🗑 SubcontractorHire...");
    await tx.subcontractorHire.deleteMany({
      where: { subcontractorRequestId: { in: subReqIds } },
    });

    console.log("🗑 SubcontractorRequest...");
    await tx.subcontractorRequest.deleteMany({
      where: { requestId: { in: requestIds } },
    });

    console.log("🗑 WorkflowLog...");
    await tx.workflowLog.deleteMany({
      where: { requestId: { in: requestIds } },
    });

    console.log("🗑 ManpowerRequest...");
    await tx.manpowerRequest.deleteMany({
      where: { id: { in: requestIds } },
    });

    console.log("🗑 PerformanceReview...");
    await tx.performanceReview.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("🗑 ProjectMessage (attachments cascade อัตโนมัติ)...");
    await tx.projectMessage.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("🗑 Project...");
    await tx.project.deleteMany({
      where: { id: { in: projectIds } },
    });
  });

  console.log(
    "\n✅ ลบข้อมูล Project ทั้งหมดสำเร็จ (Employee/Position/Client/Contract ยังอยู่ครบ)",
  );
}

clearAllProjectData()
  .catch((err) => {
    console.error("💥 Clear failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
