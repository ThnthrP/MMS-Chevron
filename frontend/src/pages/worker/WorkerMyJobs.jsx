import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { WorkerAppContent } from "../../context/WorkerAppContext";
import JobCard, { buildJobInfo } from "../../components/worker/JobCard";

const EVENT_LABEL = {
  received: "ได้รับงาน",
  confirmed: "ตอบรับงาน",
  rejected: "ปฏิเสธงาน",
  briefed: "บรีฟก่อนลงงาน",
  traveling: "เดินทาง",
};

const EVENT_TONE = {
  rejected: "bg-red-50 text-red-700",
  default: "bg-green-50 text-green-700",
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function WorkerMyJobs() {
  const { backendUrl } = useContext(WorkerAppContent);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null); // null = list view
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/worker/jobs/confirmed`,
        { withCredentials: true },
      );
      if (data.success) {
        setCandidates(data.candidates);
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

  const fetchDetail = async (candidateId) => {
    try {
      setDetailLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/worker/jobs/${candidateId}/timeline`,
        { withCredentials: true },
      );
      if (data.success) {
        setDetail(data);
      } else {
        toast.error(data.message || "โหลดรายละเอียดไม่สำเร็จ");
        setSelectedId(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const openDetail = (id) => {
    setDetail(null); // กันข้อมูลงานก่อนหน้าโผล่แวบหนึ่ง
    setSelectedId(id);
    window.scrollTo(0, 0);
  };

  const backToList = () => {
    setSelectedId(null);
    setDetail(null);
  };

  // ══════════════════════════════════════════════════════════
  // Detail / Timeline view
  // ══════════════════════════════════════════════════════════
  if (selectedId) {
    // deploy แล้ว → ใช้วัน MOB / D-MOB จริงที่ admin บันทึก, ยังไม่ deploy → start + 28
    const info = detail
      ? buildJobInfo({
          project: detail.job?.project,
          position: detail.job?.position,
          assignment: detail.latestAssignment,
          isOffshore: detail.job?.isOffshore,
        })
      : null;

    return (
      <div className="mx-auto max-w-md px-4 pb-4 pt-6">
        <button
          type="button"
          onClick={backToList}
          className="mb-4 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-sm text-blue-600"
        >
          ← กลับไปหน้ารายการ
        </button>

        {detailLoading || !detail ? (
          <div className="py-10 text-center text-sm text-gray-400">
            กำลังโหลด...
          </div>
        ) : (
          <>
            <div className="mb-4">
              <JobCard info={info}>
                {!info.actualDates && (
                  <div className="text-[11px] text-gray-400">
                    * วัน MOB / DEMOB เป็นกำหนดการเบื้องต้น อาจเปลี่ยนตามที่ทีม
                    Manpower ยืนยันอีกครั้ง
                  </div>
                )}
              </JobCard>
            </div>

            {detail.isRejected ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="mb-1 text-sm font-semibold text-red-700">
                  ✕ ปฏิเสธงานนี้แล้ว
                </div>
                {detail.rejectedEvent?.note && (
                  <div className="mt-2 text-xs text-red-600">
                    เหตุผล: {detail.rejectedEvent.note}
                  </div>
                )}
                {detail.rejectedEvent?.timestamp && (
                  <div className="mt-1 text-xs text-red-400">
                    {fmtDateTime(detail.rejectedEvent.timestamp)}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-gray-700">
                  เส้นทางของงาน
                </div>
                <div>
                  {(detail.timeline || []).map((step, idx) => (
                    <div key={step.step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {step.completed ? (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300 bg-white" />
                        )}
                        {idx < detail.timeline.length - 1 && (
                          <div
                            className={`mt-1 min-h-[20px] w-0.5 flex-1 ${
                              step.completed ? "bg-green-400" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-4">
                        <div
                          className={`text-sm font-medium ${
                            step.completed ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </div>
                        {step.completed && step.timestamp && (
                          <div className="mt-0.5 text-xs text-gray-400">
                            {fmtDateTime(step.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PPE / Exam — ยังไม่มี endpoint จริง (defer ตาม spec MVP step 6) */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                title="ฟีเจอร์นี้จะเปิดใช้งานเร็วๆ นี้"
                className="flex-1 cursor-not-allowed rounded-lg border-none bg-gray-100 py-2.5 text-sm font-medium text-gray-400"
              >
                📦 เบิกอุปกรณ์ PPE
              </button>
              <button
                type="button"
                disabled
                title="ฟีเจอร์นี้จะเปิดใช้งานเร็วๆ นี้"
                className="flex-1 cursor-not-allowed rounded-lg border-none bg-gray-100 py-2.5 text-sm font-medium text-gray-400"
              >
                📝 ทำแบบประเมินความปลอดภัย
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // List view
  // ══════════════════════════════════════════════════════════
  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-6">
      <div className="mb-4">
        <div className="text-xl font-bold text-gray-800">งานของฉัน</div>
        <div className="text-xs text-gray-400">งานที่ตอบรับแล้วทั้งหมด</div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">
          กำลังโหลด...
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-3xl">💼</div>
          <div className="text-sm text-gray-500">ยังไม่มีงานที่ตอบรับ</div>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => {
            const info = buildJobInfo({
              project: c.round?.request?.project,
              position: c.round?.request?.position,
              // ใช้วันจริงถ้า backend ส่ง assignment มาด้วย (ดูหมายเหตุ backend)
              assignment: c.assignment || c.latestAssignment,
            });
            const lastEvent = c.confirmationEvents?.[0];

            return (
              <JobCard
                key={c.id}
                info={info}
                onClick={() => openDetail(c.id)}
                tapHint="แตะเพื่อดูรายละเอียดและเส้นทางงาน"
              >
                {lastEvent && (
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      EVENT_TONE[lastEvent.eventType] || EVENT_TONE.default
                    }`}
                  >
                    {EVENT_LABEL[lastEvent.eventType] || lastEvent.eventType}
                  </span>
                )}
              </JobCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
