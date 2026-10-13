import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { WorkerAppContent } from "../../context/WorkerAppContext";
import JobCard, { buildJobInfo } from "../../components/worker/JobCard";

const STATUS = {
  active: { label: "กำลังทำงาน", tone: "bg-blue-100 text-blue-700" },
  completed: { label: "เสร็จสิ้น", tone: "bg-green-100 text-green-700" },
  cancelled: { label: "ยกเลิก", tone: "bg-gray-100 text-gray-500" },
};
const statusOf = (a) =>
  STATUS[a.status] || {
    label: "วางแผนไว้",
    tone: "bg-yellow-100 text-yellow-700",
  };

export default function WorkerHistory() {
  const { backendUrl } = useContext(WorkerAppContent);

  const [summary, setSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/worker/jobs/history`,
        { withCredentials: true },
      );
      if (data.success) {
        setSummary(data.summary);
        setAssignments(data.assignments);
      } else {
        toast.error(data.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ข้อมูลการ์ด — รองรับงานที่บันทึกย้อนหลัง (ไม่ผูก project / ไม่มีตำแหน่ง)
  //    เดิมหัวการ์ดขึ้นเป็น "—" อย่างเดียว ตอนนี้ใช้ projectLabel หรือข้อความแทน ──
  const toInfo = (a) => {
    const info = buildJobInfo({
      project: a.project,
      position: a.position,
      assignment: a, // วัน MOB / D-MOB / แท่น ของงานนี้จริง
    });
    return {
      ...info,
      projectName: info.projectName || a.projectLabel || "ไม่ระบุ project",
      positionName: a.position?.name || "ไม่ระบุตำแหน่ง",
    };
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-6">
      <div className="mb-4">
        <div className="text-xl font-bold text-gray-800">ประวัติ</div>
        <div className="text-xs text-gray-400">สรุปการลงงานทั้งหมด</div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalJobs}
            </div>
            <div className="mt-1 text-xs text-gray-500">จำนวนงานทั้งหมด</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {summary.totalDays}
            </div>
            <div className="mt-1 text-xs text-gray-500">รวมวันลงงาน</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">
          กำลังโหลด...
        </div>
      ) : assignments.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-3xl">📋</div>
          <div className="text-sm text-gray-500">ยังไม่มีประวัติการลงงาน</div>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const status = statusOf(a);
            return (
              <JobCard key={a.id} info={toInfo(a)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </div>
                {a.remark && (
                  <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
                    📌 {a.remark}
                  </div>
                )}
              </JobCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
