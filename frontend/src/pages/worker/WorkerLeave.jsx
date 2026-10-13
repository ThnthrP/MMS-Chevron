import { useContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { WorkerAppContent } from "../../context/WorkerAppContext";

const LEAVE_TYPE_OPTIONS = [
  { value: "sick", label: "ลาป่วย" },
  { value: "personal", label: "ลากิจ" },
  { value: "vacation", label: "ลาพักร้อน" },
  { value: "other", label: "อื่นๆ" },
];

const LEAVE_TYPE_LABEL = Object.fromEntries(
  LEAVE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_STYLE = {
  pending: { label: "รออนุมัติ", bg: "bg-yellow-100", text: "text-yellow-700" },
  approved: {
    label: "อนุมัติแล้ว",
    bg: "bg-green-100",
    text: "text-green-700",
  },
  rejected: { label: "ไม่อนุมัติ", bg: "bg-red-100", text: "text-red-700" },
  cancelled: { label: "ยกเลิกแล้ว", bg: "bg-gray-100", text: "text-gray-500" },
};

// ← เพิ่ม: definition ของแต่ละ tab
const FILTER_TABS = [
  //   { key: "all", label: "ทั้งหมด" },
  { key: "active", label: "กำลังดำเนินการ" },
  { key: "history", label: "ประวัติ" },
];

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-600",
  };
  return (
    <span
      className={`inline-block ${s.bg} ${s.text} text-xs font-semibold px-2.5 py-1 rounded-full`}
    >
      {s.label}
    </span>
  );
}

export default function WorkerLeave() {
  const { backendUrl } = useContext(WorkerAppContent);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("active");

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveType: "sick",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [attachment, setAttachment] = useState(null);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/worker/leave-requests`,
        { withCredentials: true },
      );
      if (data.success) {
        setLeaveRequests(data.leaveRequests);
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
    fetchLeaveRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ← เพิ่ม: กรอง list ตาม tab ที่เลือก คำนวณใหม่เฉพาะตอน leaveRequests/activeFilter เปลี่ยน
  const filteredRequests = useMemo(() => {
    if (activeFilter === "active") {
      return leaveRequests.filter((lr) => lr.status === "pending");
    }
    return leaveRequests.filter((lr) => lr.status !== "pending"); // "history"
  }, [leaveRequests, activeFilter]);

  const resetForm = () => {
    setForm({ leaveType: "sick", startDate: "", endDate: "", reason: "" });
    setAttachment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.startDate || !form.endDate) {
      toast.error("กรุณาเลือกวันเริ่มและวันสิ้นสุด");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("วันสิ้นสุดต้องไม่มาก่อนวันเริ่ม");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("leaveType", form.leaveType);
      formData.append("startDate", form.startDate);
      formData.append("endDate", form.endDate);
      formData.append("reason", form.reason);
      if (attachment) formData.append("attachment", attachment);

      const { data } = await axios.post(
        `${backendUrl}/api/worker/leave-requests`,
        formData,
        { withCredentials: true },
      );

      if (data.success) {
        toast.success(data.message || "ยื่นใบลาสำเร็จ");
        setShowForm(false);
        resetForm();
        fetchLeaveRequests();
      } else {
        toast.error(data.message || "ยื่นใบลาไม่สำเร็จ");
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

  const handleCancel = async (leaveRequestId) => {
    if (!window.confirm("ยืนยันยกเลิกใบลานี้?")) return;

    try {
      setCancellingId(leaveRequestId);
      const { data } = await axios.patch(
        `${backendUrl}/api/worker/leave-requests/${leaveRequestId}/cancel`,
        {},
        { withCredentials: true },
      );

      if (data.success) {
        toast.success(data.message || "ยกเลิกใบลาเรียบร้อย");
        fetchLeaveRequests();
      } else {
        toast.error(data.message || "ยกเลิกไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xl font-bold text-gray-800">ใบลา</div>
          <div className="text-xs text-gray-400">รายการใบลาทั้งหมด</div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + ยื่นใบลา
        </button>
      </div>

      {/* ← เพิ่มบล็อกนี้: tab กรองสถานะ */}
      <div className="flex gap-2 mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              activeFilter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10 text-sm">
          กำลังโหลด...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-sm text-gray-500">
            {activeFilter === "active"
              ? "ไม่มีใบลาที่กำลังดำเนินการ"
              : "ยังไม่มีประวัติใบลา"}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((lr) => (
            <div
              key={lr.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="text-base font-bold text-gray-800">
                  {LEAVE_TYPE_LABEL[lr.leaveType] || lr.leaveType}
                </div>
                <StatusBadge status={lr.status} />
              </div>

              <div className="text-sm text-gray-500 mb-2">
                {fmtDate(lr.startDate)} – {fmtDate(lr.endDate)}
              </div>

              {lr.reason && (
                <div className="text-xs text-gray-500 mb-2">
                  เหตุผล: {lr.reason}
                </div>
              )}

              {lr.attachmentUrl && (
                <a
                  href={`${backendUrl}${lr.attachmentUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline mb-2 inline-block"
                >
                  📎 {lr.attachmentFileName || "ไฟล์แนบ"}
                </a>
              )}

              {lr.status === "pending" && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleCancel(lr.id)}
                    disabled={cancellingId === lr.id}
                    className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                  >
                    {cancellingId === lr.id
                      ? "กำลังยกเลิก..."
                      : "✕ ยกเลิกใบลานี้"}
                  </button>
                </div>
              )}

              {lr.status !== "pending" && lr.status !== "cancelled" && (
                <div className="pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-400">
                    {lr.status === "approved" ? "อนุมัติโดย" : "ไม่อนุมัติโดย"}{" "}
                    {lr.approver?.name || "—"}
                  </span>
                  {lr.approverNote && (
                    <div className="text-gray-500 mt-1">
                      หมายเหตุ: {lr.approverNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal — ยื่นใบลาใหม่ (ไม่มีการแก้ไขส่วนนี้) */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold text-gray-800 mb-4">ยื่นใบลา</div>

            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              ประเภทการลา
            </label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
            >
              {LEAVE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  วันเริ่ม
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  วันสิ้นสุด
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              เหตุผล (ถ้ามี)
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="ระบุเหตุผลในการลา"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-4"
            />

            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              แนบไฟล์ (ถ้ามี — เช่น ใบรับรองแพทย์)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs"
            />
            {attachment && (
              <div className="text-xs text-gray-500 mb-3 -mt-2">
                📎 {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "กำลังส่ง..." : "ยื่นใบลา"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
