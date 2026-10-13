import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

const CARD = "rounded-[10px] border border-gray-200 bg-white";
const HIDE_MOBILE = "hidden sm:table-cell";

// ใช้รูปแบบเดียวกับหน้ารายการคำขอ (th-TH) — เดิมใช้ toLocaleString() เปล่า
const fmtDateTime = (d) =>
  new Date(d).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function TrainingRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${backendUrl}/api/training-requests/${id}`, {
        withCredentials: true,
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id, backendUrl]);

  const backButton = (
    <button
      onClick={() => navigate("/requests-history?type=training")}
      className="mb-2 cursor-pointer border-none bg-transparent p-0 text-[13px] text-gray-500 hover:text-gray-700"
    >
      ← Back to Requests
    </button>
  );

  if (loading || !data) {
    return (
      <div className="mx-auto w-full max-w-[1800px]">
        {backButton}
        <div className={`${CARD} p-10 text-center text-sm text-gray-500`}>
          {loading ? "Loading..." : "Request not found"}
        </div>
      </div>
    );
  }

  const totalPeople = new Set(
    data.groups.flatMap((g) => g.employees.map((e) => e.empCode)),
  ).size;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {backButton}

      {/* ════════ Header ════════ */}
      <div className={`${CARD} mb-6 px-4 py-4 sm:px-6`}>
        <div className="text-lg font-bold">📢 คำขอ Training จาก MP</div>
        <div className="mt-1 text-[13px] text-gray-500">
          {data.requestedByName ? `ขอโดย ${data.requestedByName} · ` : ""}
          {fmtDateTime(data.createdAt)}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-blue-600">
            🎓 {data.groups.length} training
          </span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
            👤 {totalPeople} คน
          </span>
        </div>
      </div>

      {/* ════════ กลุ่มตาม Training ════════ */}
      {data.groups.map((g) => (
        <div key={g.trainingId} className={`${CARD} mb-4 overflow-hidden`}>
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold sm:px-5">
            🎓 {g.trainingName}{" "}
            <span className="font-normal text-gray-500">
              ({g.employees.length} คน)
            </span>
          </div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#fafafa]">
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 sm:px-5">
                  WORKER
                </th>
                <th
                  className={`${HIDE_MOBILE} px-5 py-2 text-left text-[11px] font-semibold text-gray-500`}
                >
                  POSITION
                </th>
                <th
                  className={`${HIDE_MOBILE} px-5 py-2 text-left text-[11px] font-semibold text-gray-500`}
                >
                  CLIENT
                </th>
              </tr>
            </thead>
            <tbody>
              {g.employees.map((e, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="font-semibold">{e.fullName}</div>
                    <div className="text-[11px] text-gray-500">{e.empCode}</div>
                    {/* มือถือ: ตำแหน่ง + client ต่อท้ายใต้ชื่อ */}
                    <div className="mt-0.5 text-xs text-gray-500 sm:hidden">
                      {e.position || "—"}
                      {e.clientName && ` · ${e.clientName}`}
                    </div>
                  </td>
                  <td className={`${HIDE_MOBILE} px-5 py-2.5`}>
                    {e.position || "—"}
                  </td>
                  <td className={`${HIDE_MOBILE} px-5 py-2.5`}>
                    {e.clientName || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
