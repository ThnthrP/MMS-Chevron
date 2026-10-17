import { useState, useEffect, useContext, useCallback, useRef } from "react";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  buildWorkerOptions,
  filterWorkerOption,
  nameEN,
  nameTH,
} from "../../utils/workerSearch";

// ══════════════════════════════════════════════════════════
// constants
// ══════════════════════════════════════════════════════════
const CARD = "rounded-[10px] border border-gray-200 bg-white";
const FILTER_LABEL = "mb-1 block text-[11px] font-semibold text-gray-500";
const CHECKBOX = "h-[15px] w-[15px] cursor-pointer";

const BUCKET_BADGE = {
  expired: ["bg-[#f8d7da] text-[#842029]", "🔴 Expired"],
  critical: ["bg-[#f8d7da] text-[#842029]", "🔥 Critical"],
  warning: ["bg-[#fff3cd] text-[#664d03]", "🟡 Warning"],
  upcoming: ["bg-[#eef2ff] text-[#4f46e5]", "🔵 Upcoming"],
  valid: ["bg-[#d1e7dd] text-[#0f5132]", "✅ Valid"],
  missing: ["bg-gray-200 text-gray-700", "— Missing"],
};

const STAT_CARDS = [
  {
    key: "expired",
    icon: "🔴",
    label: "Expired",
    text: "text-[#dc3545]",
    ring: "ring-[#dc3545]",
  },
  {
    key: "critical",
    icon: "🔥",
    label: "Critical (<30 days)",
    text: "text-[#cc8400]",
    ring: "ring-[#cc8400]",
  },
  {
    key: "warning",
    icon: "🟡",
    label: "Warning (30-90 days)",
    text: "text-[#0aa2c0]",
    ring: "ring-[#0aa2c0]",
  },
  {
    key: "upcoming",
    icon: "🔵",
    label: "Upcoming (90-120 days)",
    text: "text-[#4f46e5]",
    ring: "ring-[#4f46e5]",
  },
  {
    key: "valid",
    icon: "✅",
    label: "Valid",
    text: "text-[#198754]",
    ring: "ring-[#198754]",
  },
  {
    key: "missing",
    icon: "⚪",
    label: "Missing (ยังไม่มี cert)",
    text: "text-gray-500",
    ring: "ring-gray-500",
  },
];

const TABLE_HEADERS = [
  "WORKER",
  "POSITION",
  "STATUS",
  "ISSUED DATE",
  "EXPIRY DATE",
];

// react-select ใช้ styles API ของไลบรารี
const customSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: "36px",
    fontSize: "13px",
    borderColor: "#dee2e6",
    boxShadow: "none",
    "&:hover": { borderColor: "#86b7fe" },
  }),
  option: (base) => ({ ...base, fontSize: "13px" }),
  singleValue: (base) => ({ ...base, fontSize: "13px" }),
  placeholder: (base) => ({ ...base, fontSize: "13px", color: "#6c757d" }),
};

// ══════════════════════════════════════════════════════════
// small components
// ══════════════════════════════════════════════════════════
function BucketBadge({ bucket }) {
  const entry = BUCKET_BADGE[bucket];
  if (!entry) return <span>—</span>;
  const [cls, label] = entry;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2 py-[3px] text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function CertDate({ hasRecord, value, emptyLabel }) {
  if (!hasRecord) return <span className="text-gray-400">N/A</span>;
  if (value) return new Date(value).toLocaleDateString();
  return emptyLabel;
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function Certifications() {
  const { backendUrl } = useContext(AppContent);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // สิทธิ์ถูกคุมที่ AppRouter แล้ว
  const canRequestTraining = true;

  const [trainingOptions, setTrainingOptions] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState(""); // employeeId
  const [positionFilter, setPositionFilter] = useState("");

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [requesting, setRequesting] = useState(false);

  // คนที่ถูกระบุมาจากลิงก์คำขอ Training (?empIds=...)
  const [highlightedIds, setHighlightedIds] = useState([]);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/global-trainings`, {
          withCredentials: true,
        });
        setTrainingOptions(
          (res.data || []).map((t) => ({
            value: t.id,
            label: `${t.name} (${t._count?.employeeTrainings ?? 0})`,
          })),
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }, [backendUrl]);

  const loadCertification = useCallback(
    async (trainingId) => {
      if (!trainingId) return;
      try {
        setLoading(true);
        const res = await axios.get(
          `${backendUrl}/api/compliance/certification/${trainingId}`,
          { withCredentials: true },
        );
        setData(res.data);
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [backendUrl],
  );

  // เปลี่ยน training → โหลดใหม่ + reset selection/filter
  useEffect(() => {
    if (selectedTraining) loadCertification(selectedTraining.value);
    else setData(null);
    setSelectedEmployeeIds([]);
    setWorkerFilter("");
    setPositionFilter("");
  }, [selectedTraining, loadCertification]);

  // อ่าน ?trainingId=...&empIds=... จาก URL
  useEffect(() => {
    const trainingId = searchParams.get("trainingId");
    const empIds = searchParams.get("empIds");
    if (trainingId && trainingOptions.length > 0 && !selectedTraining) {
      const match = trainingOptions.find((o) => o.value === trainingId);
      if (match) setSelectedTraining(match);
    }
    if (empIds) setHighlightedIds(empIds.split(","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingOptions, searchParams]);

  const filteredWorkers = (data?.workers || []).filter((w) => {
    const matchWorker = !workerFilter || w.employeeId === workerFilter;
    const matchPosition = !positionFilter || w.position === positionFilter;
    const matchStatus = statusFilter === "all" || w.bucket === statusFilter;
    return matchWorker && matchPosition && matchStatus;
  });

  // เลื่อนไปแถวที่ highlight — ครั้งเดียวหลังโหลดข้อมูลเสร็จ
  // (เดิมเลื่อนทุกครั้งที่ render เช่นติ๊ก checkbox แล้วหน้าเด้งกลับไปแถวแรก)
  useEffect(() => {
    if (hasScrolledRef.current || highlightedIds.length === 0 || !data) return;
    // การ์ด (มือถือ) และตาราง (lg+) render คู่กัน แต่ซ่อนอันหนึ่งด้วย CSS
    // จึงเลือกเฉพาะตัวที่มองเห็นอยู่ (offsetParent !== null)
    const el = [
      ...document.querySelectorAll(`[data-worker-row="${highlightedIds[0]}"]`),
    ].find((node) => node.offsetParent !== null);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      hasScrolledRef.current = true;
    }
  }, [highlightedIds, data]);

  const toggleEmployee = (employeeId) =>
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );

  const allFilteredSelected =
    filteredWorkers.length > 0 &&
    filteredWorkers.every((w) => selectedEmployeeIds.includes(w.employeeId));

  const toggleAllFiltered = () => {
    const ids = filteredWorkers.map((w) => w.employeeId);
    if (allFilteredSelected) {
      const idSet = new Set(ids);
      setSelectedEmployeeIds((prev) => prev.filter((id) => !idSet.has(id)));
    } else {
      setSelectedEmployeeIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleRequestTraining = async () => {
    if (!selectedTraining || selectedEmployeeIds.length === 0) return;
    try {
      setRequesting(true);
      await axios.post(
        `${backendUrl}/api/training-requests`,
        {
          items: selectedEmployeeIds.map((employeeId) => ({
            employeeId,
            globalTrainingId: selectedTraining.value,
            clientName: null, // หน้านี้เลือกจาก training โดยตรง
          })),
        },
        { withCredentials: true },
      );
      alert(
        `แจ้ง HR ให้จัด training "${selectedTraining.label.replace(/\s*\(\d+\)$/, "")}" ให้ ${selectedEmployeeIds.length} คนแล้ว`,
      );
      setSelectedEmployeeIds([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "แจ้งไม่สำเร็จ — ดู console");
    } finally {
      setRequesting(false);
    }
  };

  const clearFilters = () => {
    setWorkerFilter("");
    setPositionFilter("");
    setStatusFilter("all");
  };
  const hasFilter = workerFilter || positionFilter || statusFilter !== "all";

  const workerOptions = [
    { value: "", label: "All Workers" },
    // API นี้ใช้ employeeId แทน id
    ...buildWorkerOptions(
      (data?.workers || []).map((w) => ({ ...w, id: w.employeeId })),
    ),
  ];

  const positionOptions = [
    { value: "", label: "All Positions" },
    ...[
      ...new Set((data?.workers || []).map((w) => w.position).filter(Boolean)),
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({ value: p, label: p })),
  ];

  const rowBg = (w) =>
    highlightedIds.includes(w.employeeId)
      ? "bg-[#fff3cd]"
      : selectedEmployeeIds.includes(w.employeeId)
        ? "bg-[#fffbe6]"
        : "bg-white";

  const noExpiry = (
    <span className="font-medium text-[#198754]">ไม่มีวันหมดอายุ</span>
  );
  const dash = <span className="text-gray-400">—</span>;

  const placeholderBox = (text) => (
    <div className={`${CARD} p-10 text-center text-gray-500 sm:p-[60px]`}>
      {text}
    </div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div
        className={`${CARD} mb-4 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <span className="text-lg font-bold">Certifications</span>
          </div>
          <div className="mt-1 text-[13px] text-gray-500">
            เลือก training เพื่อดูสถานะของ worker แต่ละคนสำหรับ cert นั้น
          </div>
        </div>
        <button
          onClick={() => navigate("/certifications/bulk-add")}
          className="w-full shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 sm:w-auto"
        >
          + Bulk Add Certification
        </button>
      </div>

      {/* ════════ Filters ════════ */}
      <div className={`${CARD} mb-4 px-4 py-3.5`}>
        <div className="mb-3 text-[13px] font-bold text-gray-900">
          🔍 Search &amp; Filter
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="min-w-[200px] flex-[1_1_100%] sm:max-w-[560px] sm:flex-[1_1_420px]">
            <label className={FILTER_LABEL}>Training / Certification</label>
            <Select
              options={trainingOptions}
              value={selectedTraining}
              onChange={setSelectedTraining}
              placeholder="เลือก training / certification..."
              isClearable
              styles={customSelectStyles}
            />
          </div>

          {selectedTraining && (
            <>
              <div className="min-w-[200px] flex-[1_1_100%] sm:max-w-[440px] sm:flex-[1_1_300px]">
                <label className={FILTER_LABEL}>
                  Worker (Employee ID / ชื่อไทย / ชื่ออังกฤษ)
                </label>
                <Select
                  options={workerOptions}
                  value={
                    workerOptions.find((o) => o.value === workerFilter) || null
                  }
                  onChange={(o) => setWorkerFilter(o ? o.value : "")}
                  filterOption={filterWorkerOption}
                  placeholder="🔍 ค้นหาด้วย ID หรือชื่อ (ไทย/อังกฤษ)..."
                  isClearable
                  styles={customSelectStyles}
                  noOptionsMessage={() => "ไม่พบ worker"}
                />
              </div>

              <div className="min-w-[160px] flex-[1_1_45%] sm:max-w-[280px] sm:flex-[1_1_200px]">
                <label className={FILTER_LABEL}>Position</label>
                <Select
                  options={positionOptions}
                  value={
                    positionOptions.find((o) => o.value === positionFilter) ||
                    null
                  }
                  onChange={(o) => setPositionFilter(o ? o.value : "")}
                  placeholder="Position..."
                  isClearable
                  styles={customSelectStyles}
                  noOptionsMessage={() => "ไม่พบตำแหน่ง"}
                />
              </div>

              <div className="min-w-[160px] flex-[1_1_45%] sm:flex-[0_1_210px]">
                <label className={FILTER_LABEL}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="box-border h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-blue-400"
                >
                  <option value="all">All Status</option>
                  <option value="expired">🔴 Expired</option>
                  <option value="critical">🔥 Critical (&lt;30 days)</option>
                  <option value="warning">🟡 Warning (30-90 days)</option>
                  <option value="upcoming">🔵 Upcoming (90-120 days)</option>
                  <option value="valid">✅ Valid</option>
                  <option value="missing">⚪ Missing</option>
                </select>
              </div>

              {hasFilter && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="h-9 cursor-pointer whitespace-nowrap rounded-lg border border-[#dc3545] bg-white px-3.5 text-[13px] text-[#dc3545] hover:bg-red-50"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!selectedTraining ? (
        placeholderBox("เลือก training ด้านบนเพื่อดูรายการ")
      ) : loading ? (
        placeholderBox("Loading...")
      ) : data ? (
        <>
          {/* ════════ Stats — คลิกเพื่อกรอง ════════ */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            {STAT_CARDS.map((c) => {
              const active = statusFilter === c.key;
              return (
                <div
                  key={c.key}
                  onClick={() => setStatusFilter(active ? "all" : c.key)}
                  className={`${CARD} cursor-pointer px-3.5 py-2.5 transition-shadow hover:shadow-md ${
                    active ? `ring-2 ${c.ring}` : ""
                  }`}
                >
                  <div className={`text-xl font-bold ${c.text}`}>
                    {data.stats[c.key] ?? 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.icon} {c.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ════════ Request Training bar ════════ */}
          {canRequestTraining && selectedEmployeeIds.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#ffe69c] bg-[#fff3cd] px-4 py-3">
              <span className="text-[13px] text-[#664d03]">
                เลือกไว้ <strong>{selectedEmployeeIds.length}</strong> คน สำหรับ
                training นี้
              </span>
              <button
                onClick={handleRequestTraining}
                disabled={requesting}
                className="cursor-pointer rounded-lg border-none bg-[#664d03] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#523e02] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {requesting ? "กำลังส่ง..." : "📢 แจ้ง HR ให้จัด Training"}
              </button>
            </div>
          )}

          {highlightedIds.length > 0 && (
            <div className="mb-4 rounded-[10px] border border-[#b6e0f5] bg-sky-50 px-4 py-2.5 text-[13px] text-[#0a5a8a]">
              📌 มาจากคำขอ Training ล่าสุด —
              เน้นแถวสีเหลืองด้านล่างคือคนที่ถูกระบุใน request นี้ (
              {highlightedIds.length} คน)
            </div>
          )}

          {/* ════════ Worker list ════════ */}
          <div className={`${CARD} overflow-hidden`}>
            {/* ── ต่ำกว่า lg: การ์ด ── */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 text-[13px]">
                {canRequestTraining ? (
                  <label className="flex cursor-pointer items-center gap-2 text-gray-700">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      className={CHECKBOX}
                    />
                    เลือกทั้งหมด
                  </label>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500">
                  {filteredWorkers.length} คน
                </span>
              </div>

              {filteredWorkers.length === 0 ? (
                <div className="p-10 text-center text-[13px] text-gray-500">
                  ไม่พบ worker ตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 p-3 md:grid-cols-2">
                  {filteredWorkers.map((w) => (
                    <label
                      key={w.employeeId}
                      data-worker-row={w.employeeId}
                      className={`flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-3 text-[13px] ${rowBg(w)}`}
                    >
                      {canRequestTraining && (
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(w.employeeId)}
                          onChange={() => toggleEmployee(w.employeeId)}
                          className={`${CHECKBOX} mt-0.5 shrink-0`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold">{nameEN(w)}</div>
                            {nameTH(w) && (
                              <div className="text-xs text-gray-600">
                                {nameTH(w)}
                              </div>
                            )}
                            <div className="text-[11px] text-gray-500">
                              {w.empId}
                            </div>
                          </div>
                          <BucketBadge bucket={w.bucket} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {w.position || "—"}
                          {w.department && (
                            <span className="text-gray-400">
                              {" "}
                              · {w.department}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          <span>
                            Issued:{" "}
                            <CertDate
                              hasRecord={w.hasRecord}
                              value={w.completedDate}
                              emptyLabel={dash}
                            />
                          </span>
                          <span>
                            Expiry:{" "}
                            <CertDate
                              hasRecord={w.hasRecord}
                              value={w.expiryDate}
                              emptyLabel={noExpiry}
                            />
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* ── lg+: ตาราง ── */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    {canRequestTraining && (
                      <th className="w-9 px-3.5 py-2.5">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleAllFiltered}
                          className={CHECKBOX}
                        />
                      </th>
                    )}
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3.5 py-2.5 text-left text-[11px] font-semibold text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          TABLE_HEADERS.length + (canRequestTraining ? 1 : 0)
                        }
                        className="p-10 text-center text-gray-500"
                      >
                        ไม่พบ worker ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((w) => (
                      <tr
                        key={w.employeeId}
                        data-worker-row={w.employeeId}
                        className={`border-b border-gray-100 ${rowBg(w)}`}
                      >
                        {canRequestTraining && (
                          <td className="px-3.5 py-3">
                            <input
                              type="checkbox"
                              checked={selectedEmployeeIds.includes(
                                w.employeeId,
                              )}
                              onChange={() => toggleEmployee(w.employeeId)}
                              className={CHECKBOX}
                            />
                          </td>
                        )}
                        <td className="px-3.5 py-3">
                          <div className="font-semibold">{nameEN(w)}</div>
                          {nameTH(w) && (
                            <div className="text-xs text-gray-600">
                              {nameTH(w)}
                            </div>
                          )}
                          <div className="text-[11px] text-gray-500">
                            {w.empId}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-gray-500">
                          <div>{w.position || "—"}</div>
                          {w.department && (
                            <div className="mt-0.5 text-[11px] text-gray-400">
                              {w.department}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <BucketBadge bucket={w.bucket} />
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3 text-gray-500">
                          <CertDate
                            hasRecord={w.hasRecord}
                            value={w.completedDate}
                            emptyLabel={dash}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3 text-gray-500">
                          <CertDate
                            hasRecord={w.hasRecord}
                            value={w.expiryDate}
                            emptyLabel={noExpiry}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        placeholderBox("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      )}
    </div>
  );
}
