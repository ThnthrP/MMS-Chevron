import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { WorkerAppContent } from "../../context/WorkerAppContext";
import ChangePinForm from "./ChangePinForm";

const BUCKET_STYLE = {
  expired: { label: "หมดอายุ", bg: "bg-red-100", text: "text-red-700" },
  critical: { label: "ใกล้หมดอายุมาก", bg: "bg-red-100", text: "text-red-700" },
  warning: {
    label: "ใกล้หมดอายุ",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
  },
  upcoming: { label: "ใกล้ถึงกำหนด", bg: "bg-blue-100", text: "text-blue-700" },
  valid: { label: "ปกติ", bg: "bg-green-100", text: "text-green-700" },
};

function BucketBadge({ bucket }) {
  const s = BUCKET_STYLE[bucket] || {
    label: bucket,
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

export default function WorkerReadiness() {
  const { backendUrl, employee } = useContext(WorkerAppContent);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState(null);
  const [showExamHistory, setShowExamHistory] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      const { data: res } = await axios.get(
        `${backendUrl}/api/worker/readiness`,
        { withCredentials: true },
      );
      if (res.success) {
        setData(res);
        const clientNames = Object.keys(res.gap || {});
        if (clientNames.length > 0) setActiveClient(clientNames[0]);
      } else {
        toast.error(res.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
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

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-10 text-center text-gray-400 text-sm">
        กำลังโหลด...
      </div>
    );
  }

  if (!data) return null;

  const clientNames = Object.keys(data.gap || {});
  const activeGap = activeClient ? data.gap[activeClient] : null;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <div className="mb-4">
        <div className="text-xl font-bold text-gray-800">
          {employee?.fullName || "—"}
        </div>
        <div className="text-xs text-gray-400">
          {employee?.empId || "—"} — ความพร้อมการลงงาน
        </div>
      </div>

      {/* รายการที่ควรติดตาม */}
      {data.followUpItems?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
          <div className="text-sm font-semibold text-orange-800 mb-2">
            ⚠ มีรายการที่ควรติดตาม
          </div>
          {data.followUpItems.map((item, i) => (
            <div key={i} className="text-xs text-orange-700 mb-1">
              • {item.note}{" "}
              {item.examDate && (
                <span className="text-orange-500">
                  ({fmtDate(item.examDate)})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Medical checks */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          ผลสุขภาพ / EMOB
        </div>
        {data.medicalChecks?.length === 0 ? (
          <div className="text-xs text-gray-400">ไม่มีข้อมูล</div>
        ) : (
          <div className="space-y-3">
            {data.medicalChecks.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {m.checkType}
                  </div>
                  <div className="text-xs text-gray-400">
                    หมดอายุ: {fmtDate(m.expiryDate)}
                  </div>
                </div>
                <BucketBadge bucket={m.bucket} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training gap — tab ต่อ client */}
      {clientNames.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            ใบรับรอง (Training Matrix)
          </div>

          {clientNames.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {clientNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveClient(name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    activeClient === name
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {activeGap && (
            <div className="space-y-4">
              {/* Mandatory */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">
                  🔴 บังคับ ({activeGap.mandatory.completed.length}/
                  {activeGap.mandatory.required.length})
                </div>
                {activeGap.mandatory.missing.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activeGap.mandatory.missing.map((name, i) => (
                      <span
                        key={i}
                        className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-md border border-red-100"
                      >
                        ✕ {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-green-600">✅ ครบทุกตัว</div>
                )}
              </div>

              {/* Assigned */}
              {activeGap.assigned.required.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2">
                    🟠 ตามที่มอบหมาย ({activeGap.assigned.completed.length}/
                    {activeGap.assigned.required.length})
                  </div>
                  {activeGap.assigned.missing.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeGap.assigned.missing.map((name, i) => (
                        <span
                          key={i}
                          className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-md border border-red-100"
                        >
                          ✕ {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-green-600">✅ ครบทุกตัว</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ประวัติผลตรวจย้อนหลัง */}
      {data.examHistory?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <button
            onClick={() => setShowExamHistory((p) => !p)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
          >
            <span>ประวัติผลตรวจสุขภาพ ({data.examHistory.length} ครั้ง)</span>
            <span>{showExamHistory ? "▲" : "▼"}</span>
          </button>

          {showExamHistory && (
            <div className="mt-3 space-y-2">
              {data.examHistory.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between text-xs pb-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-gray-600">
                    {fmtDate(exam.examDate)}
                  </span>
                  {exam.flaggedAbnormal && (
                    <span className="text-orange-600 font-medium">
                      ⚠ พบความผิดปกติ
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* เปลี่ยน PIN */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <button
          type="button"
          onClick={() => setShowChangePin((p) => !p)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
        >
          <span>🔑 เปลี่ยน PIN</span>
          <span>{showChangePin ? "▲" : "▼"}</span>
        </button>

        {showChangePin && (
          <div className="mt-4">
            <ChangePinForm
              mode="optional"
              onDone={() => setShowChangePin(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
