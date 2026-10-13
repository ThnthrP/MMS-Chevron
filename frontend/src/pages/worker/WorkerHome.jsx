import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { WorkerAppContent } from "../../context/WorkerAppContext";

export default function WorkerHome() {
  const { backendUrl, employee } = useContext(WorkerAppContent);

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentJob = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/worker/jobs/current`,
        { withCredentials: true },
      );
      if (data.success) {
        setAssignment(data.assignment);
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
    fetchCurrentJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      {/* Greeting */}
      <div className="mb-5">
        <div className="text-sm text-gray-500">สวัสดี,</div>
        <div className="text-xl font-bold text-gray-800">
          {employee?.fullName || "—"}
        </div>
        <div className="text-xs text-gray-400">
          รหัสพนักงาน: {employee?.empId || "—"}
        </div>
      </div>

      {/* งานที่กำลังอยู่ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          งานที่กำลังดำเนินการอยู่
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            กำลังโหลด...
          </div>
        ) : !assignment ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-sm text-gray-500">
              ยังไม่มีงานที่กำลังดำเนินการอยู่
            </div>
          </div>
        ) : (
          <div>
            <div className="text-lg font-bold text-gray-800">
              {assignment.position?.name || "—"}
            </div>
            <div className="text-sm text-gray-500 mb-3">
              {assignment.project?.contract?.client?.name || ""}
              {assignment.project?.name ? ` — ${assignment.project.name}` : ""}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-400">MOB</div>
                <div className="font-medium text-gray-700">
                  {fmtDate(assignment.mobDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">D-MOB</div>
                <div className="font-medium text-gray-700">
                  {fmtDate(assignment.demobDate)}
                </div>
              </div>
              {assignment.platform && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">แท่น</div>
                  <div className="font-medium text-gray-700">
                    {assignment.platform}
                  </div>
                </div>
              )}
            </div>

            {assignment.remark && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                📌 {assignment.remark}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
