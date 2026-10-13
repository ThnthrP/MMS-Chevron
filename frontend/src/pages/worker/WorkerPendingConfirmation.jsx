import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { WorkerAppContent } from "../../context/WorkerAppContext";
import JobCard, {
  buildJobInfo,
  fmtShortTH,
} from "../../components/worker/JobCard";

export default function WorkerPendingConfirmation() {
  const { backendUrl, refreshPendingCount } = useContext(WorkerAppContent);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBan, setActiveBan] = useState(null);

  // modal state: { candidate, mode: "confirm" | "reject" } | null
  const [actionModal, setActionModal] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/worker/jobs/pending-confirmation`,
        { withCredentials: true },
      );
      if (data.success) {
        setCandidates(data.candidates);
        setActiveBan(data.activeBan || null);
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
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (candidate, mode) => {
    setActionModal({ candidate, mode });
    setNote("");
  };

  const closeModal = () => {
    if (submitting) return;
    setActionModal(null);
    setNote("");
  };

  const handleSubmitAction = async () => {
    if (!actionModal || submitting) return;
    const { candidate, mode } = actionModal;

    if (mode === "reject" && !note.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(
        `${backendUrl}/api/worker/jobs/${candidate.id}/${mode}`,
        { note: note.trim() || undefined },
        { withCredentials: true },
      );

      if (data.success) {
        toast.success(data.message);
        setActionModal(null);
        setNote("");
        fetchPending();
        refreshPendingCount();
      } else {
        toast.error(data.message || "ดำเนินการไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const modalInfo = actionModal
    ? buildJobInfo({
        project: actionModal.candidate.round?.request?.project,
        position: actionModal.candidate.round?.request?.position,
      })
    : null;

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-6">
      <div className="mb-4">
        <div className="text-xl font-bold text-gray-800">รอยืนยัน</div>
        <div className="text-xs text-gray-400">
          งานที่ถูกเรียก แต่ยังไม่ได้ตอบรับ
        </div>
      </div>

      {/* แจ้งเตือนถูกระงับ — แสดงเสมอแม้ไม่มีงานรอ */}
      {activeBan && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-700">
            🚫 บัญชีถูกระงับชั่วคราว
          </div>
          <div className="mt-1 text-xs text-red-600">
            ระงับถึงวันที่{" "}
            {new Date(activeBan.bannedUntil).toLocaleDateString("th-TH")} —
            ไม่สามารถยืนยันงานได้ในช่วงนี้ กรุณาติดต่อเจ้าหน้าที่
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">
          กำลังโหลด...
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-3xl">✅</div>
          <div className="text-sm text-gray-500">
            ไม่มีงานที่รอการยืนยันในขณะนี้
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => {
            // ยังไม่ deploy → MOB = วันเริ่ม project, D-MOB = +28 วัน
            const info = buildJobInfo({
              project: c.round?.request?.project,
              position: c.round?.request?.position,
              responseDeadline: c.responseDeadline,
            });

            return (
              <JobCard key={c.id} info={info} showDeadline>
                <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  <span className="shrink-0">⚠</span>
                  <span>
                    เมื่อยืนยันแล้ว ชื่อของคุณจะถูกส่งเข้าแผนกำลังพล
                    และต้องมารายงานตัวตามวัน MOB
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openModal(c, "confirm")}
                    disabled={!!activeBan}
                    className="flex-1 cursor-pointer rounded-lg border-none bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✅ ยืนยันลงทะเล
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(c, "reject")}
                    className="flex-1 cursor-pointer rounded-lg border border-red-300 bg-white py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    ❌ ปฏิเสธ
                  </button>
                </div>
              </JobCard>
            );
          })}
        </div>
      )}

      {/* Action Modal — confirm หรือ reject */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-lg font-bold text-gray-800">
              {actionModal.mode === "confirm"
                ? "✅ ยืนยันลงทะเล"
                : "❌ ปฏิเสธงาน"}
            </div>
            <div className="mb-4 text-sm text-gray-500">
              {modalInfo.positionName}
              {modalInfo.onNumber ? ` · ${modalInfo.onNumber}` : ""}
              <div className="text-xs text-gray-400">
                MOB {fmtShortTH(modalInfo.mobDate)} – DEMOB{" "}
                {fmtShortTH(modalInfo.demobDate)}
              </div>
            </div>

            <label className="mb-1 block text-xs font-semibold text-gray-500">
              {actionModal.mode === "confirm"
                ? "หมายเหตุ (ถ้ามี — เช่น วันที่ขอเปลี่ยน)"
                : "เหตุผลในการปฏิเสธ (จำเป็น)"}
            </label>
            {/* text-base = 16px กัน iPhone ซูมตอนแตะช่องกรอก */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus={actionModal.mode === "reject"}
              placeholder={
                actionModal.mode === "confirm"
                  ? "เช่น มาได้ตามวันนี้"
                  : "กรุณาระบุเหตุผล เช่น ติดงานอื่น / เหตุผลส่วนตัว"
              }
              className="box-border w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-600 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitAction}
                disabled={
                  submitting || (actionModal.mode === "reject" && !note.trim())
                }
                className={`flex-1 cursor-pointer rounded-lg border-none py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  actionModal.mode === "confirm"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? "กำลังดำเนินการ..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
