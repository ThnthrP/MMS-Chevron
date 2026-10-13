import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AppContent } from "../../context/AppContext";
import Select from "react-select";

// ── badge: [tone, label] ต่อค่าสถานะ ──
const TONE = {
  ok: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-50 text-blue-700",
  warn: "bg-amber-100 text-amber-800",
  muted: "bg-gray-100 text-gray-500",
};
const STATUS_MAP = {
  active: ["ok", "Active"],
  inactive: ["danger", "Inactive"],
};
const AVAILABILITY_MAP = {
  available: ["ok", "Available"],
  unavailable: ["danger", "Unavailable"],
};
const MOBILIZATION_MAP = {
  ready: ["ok", "Ready"],
  on_site: ["info", "On Site"],
  pending: ["warn", "Pending"],
};

function Badge({ map, value, fixedWidth = false }) {
  const [tone, label] = map[(value || "").toLowerCase()] || [
    "muted",
    value || "-",
  ];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-center text-xs font-semibold ${TONE[tone]} ${
        fixedWidth ? "min-w-[90px]" : ""
      }`}
    >
      {label}
    </span>
  );
}

const TABLE_HEADERS = [
  ["EMP CODE", "left"],
  ["EMPLOYEE ID", "left"],
  ["NAME", "left"],
  ["POSITION", "left"],
  ["DEPARTMENT", "left"],
  ["STATUS", "center"],
  ["AVAILABILITY", "center"],
  ["MOBILIZATION", "center"],
  ["ACTIONS", "center"],
];

const ICON_BTN =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none p-0 text-xs leading-none transition-all disabled:cursor-not-allowed";
const LIFT_WHITE =
  "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:shadow-[0_3px_6px_rgba(0,0,0,0.18),0_2px_3px_rgba(0,0,0,0.1)]";
const LIFT_RED =
  "bg-[#fff5f5] text-[#842029] shadow-[0_1px_3px_rgba(220,53,69,0.15),0_1px_2px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:shadow-[0_3px_6px_rgba(220,53,69,0.25),0_2px_3px_rgba(0,0,0,0.08)]";
const BTN_DISABLED = "bg-gray-100 opacity-50 shadow-none";
const CARD = "rounded-[10px] border border-gray-200 bg-white";

const customSelectStyles = {
  control: (provided) => ({
    ...provided,
    borderColor: "#dee2e6",
    borderRadius: "8px",
    minHeight: "36px",
    fontSize: "13px",
    boxShadow: "none",
    "&:hover": { borderColor: "#86b7fe" },
  }),
  option: (provided) => ({ ...provided, fontSize: "13px" }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "13px",
    color: "#6c757d",
  }),
};

export default function Workers() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [availability, setAvailability] = useState("");
  const [mobilization, setMobilization] = useState("");

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { backendUrl } = useContext(AppContent);

  // สิทธิ์เข้าถึงหน้า /workers ถูกควบคุมที่ AppRouter.jsx (allowRoles) อยู่แล้ว
  const canManageWorkers = true;

  const departments = [
    ...new Set(workers.map((w) => w.division).filter(Boolean)),
  ];
  const positions = [
    ...new Set(workers.map((w) => w.position?.name).filter(Boolean)),
  ];

  const departmentOptions = [
    { value: "", label: "All Departments" },
    ...departments.map((dept) => ({ value: dept, label: dept })),
  ];
  const positionOptions = [
    { value: "", label: "All Positions" },
    ...positions.map((pos) => ({ value: pos, label: pos })),
  ];
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  const availabilityOptions = [
    { value: "", label: "All Availability" },
    { value: "available", label: "Available" },
    { value: "unavailable", label: "Unavailable" },
  ];
  const mobilizationOptions = [
    { value: "", label: "All Mobilization" },
    { value: "pending", label: "Pending" },
    { value: "ready", label: "Ready" },
    { value: "on_site", label: "On-Site" },
  ];

  const q = search.toLowerCase();
  const filteredWorkers = workers
    .filter((worker) => {
      const matchSearch =
        (worker.fullName || "").toLowerCase().includes(q) ||
        (worker.empCode || "").toLowerCase().includes(q) ||
        (worker.empId || "").toLowerCase().includes(q) ||
        (worker.position?.name || "").toLowerCase().includes(q); // ← ตาม placeholder ที่บอกว่าค้นตำแหน่งได้
      const matchStatus = !status || worker.status === status;
      const matchDepartment = !department || worker.division === department;
      const matchPosition = !position || worker.position?.name === position;
      const matchAvailability =
        !availability || worker.availabilityStatus === availability;
      const matchMobilization =
        !mobilization || worker.mobilizationStatus === mobilization;
      return (
        matchSearch &&
        matchStatus &&
        matchDepartment &&
        matchPosition &&
        matchAvailability &&
        matchMobilization
      );
    })
    .sort((a, b) =>
      (a.empCode || "").localeCompare(b.empCode || "", undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.status === "active").length;
  const inactiveWorkers = workers.filter((w) => w.status !== "active").length;

  const hasFilter =
    search || department || position || status || availability || mobilization;

  const clearFilters = () => {
    setSearch("");
    setDepartment("");
    setPosition("");
    setStatus("");
    setAvailability("");
    setMobilization("");
  };

  const fetchWorkers = async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true);
      const res = await axios.get(`${backendUrl}/api/workers`, {
        withCredentials: true,
      });
      setWorkers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers({ showLoading: true });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this worker?"))
      return;
    try {
      await axios.delete(`${backendUrl}/api/workers/${id}`, {
        withCredentials: true,
      });
      fetchWorkers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to deactivate worker");
    }
  };

  // ── ปุ่ม View / Edit / Delete — ใช้ทั้งตารางและการ์ด ──
  const renderActions = (worker) => {
    const inactive = isInactive(worker);
    return (
      <div className="flex justify-center gap-1.5">
        <Link
          to={`/workers/${worker.id}`}
          title="ดูรายละเอียด"
          className={`${ICON_BTN} ${LIFT_WHITE} no-underline`}
        >
          👁
        </Link>
        {canManageWorkers && (
          <>
            <Link
              to={`/workers/${worker.id}/edit`}
              title="แก้ไข"
              className={`${ICON_BTN} ${LIFT_WHITE} no-underline`}
            >
              ✏️
            </Link>
            <button
              onClick={() => handleDelete(worker.id)}
              disabled={inactive}
              title={inactive ? "Inactive อยู่แล้ว" : "Deactivate พนักงานคนนี้"}
              className={`${ICON_BTN} ${inactive ? BTN_DISABLED : LIFT_RED}`}
            >
              🗑
            </button>
          </>
        )}
      </div>
    );
  };

  const isInactive = (w) => w.status === "inactive";
  const dash = <span className="text-gray-400">—</span>;

  const emptyText = loading
    ? "Loading workers data..."
    : "No matching records found.";

  return (
    // xl+: สูงเต็มจอ ตาราง scroll ในการ์ด / ต่ำกว่านั้น: สูงตามเนื้อหา
    <div className="flex flex-col xl:h-[calc(100vh-108px)]">
      <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col">
        {/* Header Card */}
        <div className={`${CARD} mb-4 px-4 py-4 sm:px-6`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-xl">👷</span>
              <span className="text-lg font-bold">Workers</span>
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                Phase 1
              </span>
              <span className="basis-full text-xs text-gray-500 md:basis-auto">
                Recruitment & Data Entry
              </span>
            </div>
            {canManageWorkers && (
              <Link
                to="/workers/add"
                className="inline-block w-full shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-center text-[13px] font-semibold text-white no-underline hover:bg-blue-700 sm:w-auto"
              >
                + Add Worker
              </Link>
            )}
          </div>
        </div>

        {/* Search & Filter Card */}
        <div className={`${CARD} mb-4 px-4 py-3.5 sm:px-5`}>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search — มือถือเต็มแถว */}
            <div className="relative min-w-[180px] flex-[1_1_100%] sm:flex-[1_1_220px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search name, ID, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="box-border w-full rounded-lg border border-gray-200 py-[7px] pl-[34px] pr-3 text-[13px] outline-none focus:border-blue-400"
              />
            </div>

            {/* Filters — มือถือ 2 ตัวต่อแถว */}
            <div className="min-w-[130px] flex-[1_1_40%] sm:flex-[1_1_150px]">
              <Select
                options={departmentOptions}
                styles={customSelectStyles}
                value={
                  departmentOptions.find((o) => o.value === department) || null
                }
                onChange={(o) => setDepartment(o ? o.value : "")}
                placeholder="All Departments"
                isClearable
                noOptionsMessage={() => "No departments found"}
              />
            </div>
            <div className="min-w-[130px] flex-[1_1_40%] sm:flex-[1_1_150px]">
              <Select
                options={positionOptions}
                styles={customSelectStyles}
                value={
                  positionOptions.find((o) => o.value === position) || null
                }
                onChange={(o) => setPosition(o ? o.value : "")}
                placeholder="All Positions"
                isClearable
                noOptionsMessage={() => "No positions found"}
              />
            </div>
            <div className="min-w-[110px] flex-[1_1_40%] sm:flex-[1_1_120px]">
              <Select
                options={statusOptions}
                styles={customSelectStyles}
                value={statusOptions.find((o) => o.value === status) || null}
                onChange={(o) => setStatus(o ? o.value : "")}
                placeholder="All Status"
                isClearable
                isSearchable={false}
              />
            </div>
            <div className="min-w-[120px] flex-[1_1_40%] sm:flex-[1_1_130px]">
              <Select
                options={availabilityOptions}
                styles={customSelectStyles}
                value={
                  availabilityOptions.find((o) => o.value === availability) ||
                  null
                }
                onChange={(o) => setAvailability(o ? o.value : "")}
                placeholder="All Availability"
                isClearable
                isSearchable={false}
              />
            </div>
            <div className="min-w-[120px] flex-[1_1_40%] sm:flex-[1_1_130px]">
              <Select
                options={mobilizationOptions}
                styles={customSelectStyles}
                value={
                  mobilizationOptions.find((o) => o.value === mobilization) ||
                  null
                }
                onChange={(o) => setMobilization(o ? o.value : "")}
                placeholder="All Mobilization"
                isClearable
                isSearchable={false}
              />
            </div>

            {hasFilter && (
              <button
                onClick={clearFilters}
                className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-red-200 bg-white px-3.5 py-[7px] text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Workers Card */}
        <div className={`${CARD} flex min-h-0 flex-1 flex-col overflow-hidden`}>
          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 text-[13px]">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-gray-500">
                Total: <strong className="text-gray-900">{totalWorkers}</strong>
              </span>
              <span className="text-gray-500">
                Active:{" "}
                <strong className="text-[#198754]">{activeWorkers}</strong>
              </span>
              <span className="text-gray-500">
                Inactive:{" "}
                <strong className="text-gray-500">{inactiveWorkers}</strong>
              </span>
            </div>
            <span className="text-gray-500">
              {filteredWorkers.length} of {workers.length}
            </span>
          </div>

          {/* ── ต่ำกว่า xl: การ์ด (md: 2 คอลัมน์) ── */}
          <div className="xl:hidden">
            {loading || filteredWorkers.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-gray-500">
                {emptyText}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 p-3 md:grid-cols-2">
                {filteredWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/workers/${worker.id}`}
                          className="break-words text-[13px] font-semibold text-blue-600 no-underline hover:underline"
                        >
                          {worker.fullName}
                        </Link>
                        <div className="text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700">
                            {worker.empId || "—"}
                          </span>
                          <span className="text-gray-400">
                            {" "}
                            · #{worker.empCode}
                          </span>
                        </div>
                      </div>
                      {renderActions(worker)}
                    </div>

                    <div className="mt-1.5 text-xs text-gray-700">
                      {worker.position?.name || "—"}
                      {worker.division && (
                        <span className="text-gray-500">
                          {" "}
                          · {worker.division}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge map={STATUS_MAP} value={worker.status} />
                      {!isInactive(worker) && (
                        <>
                          <Badge
                            map={AVAILABILITY_MAP}
                            value={worker.availabilityStatus}
                          />
                          <Badge
                            map={MOBILIZATION_MAP}
                            value={worker.mobilizationStatus}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── xl+: ตาราง ── */}
          <div className="hidden min-h-0 flex-1 overflow-auto xl:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {TABLE_HEADERS.map(([h, align]) => (
                    <th
                      key={h}
                      className={`sticky top-0 z-[1] whitespace-nowrap bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.5px] text-gray-500 shadow-[inset_0_-1px_0_#dee2e6] ${
                        align === "center" ? "text-center" : "text-left"
                      } ${h === "ACTIONS" ? "w-[200px]" : ""}`}
                    >
                      {h === "EMP CODE" ? (
                        <span title="เลขอ้างอิงพนักงานในระบบ เรียงตามลำดับที่สร้าง ไม่มีนัยสำคัญอื่น">
                          {h}
                        </span>
                      ) : (
                        h
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading || filteredWorkers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_HEADERS.length}
                      className="p-10 text-center text-gray-500"
                    >
                      {emptyText}
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker, idx) => (
                    <tr
                      key={worker.id}
                      className={`transition-colors duration-150 hover:bg-gray-50 ${
                        idx < filteredWorkers.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-[11px] text-gray-400">
                        {worker.empCode}
                      </td>
                      <td className="whitespace-nowrap px-4 py-[11px] font-semibold text-gray-700">
                        {worker.empId || "—"}
                      </td>
                      <td className="px-4 py-[11px]">
                        <Link
                          to={`/workers/${worker.id}`}
                          className="font-semibold text-blue-600 no-underline hover:underline"
                        >
                          {worker.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-[11px]">
                        {worker.position?.name || "—"}
                      </td>
                      <td className="px-4 py-[11px] text-gray-500">
                        {worker.division || "—"}
                      </td>
                      <td className="px-4 py-[11px] text-center">
                        <Badge
                          map={STATUS_MAP}
                          value={worker.status}
                          fixedWidth
                        />
                      </td>
                      <td className="px-4 py-[11px] text-center">
                        {isInactive(worker) ? (
                          dash
                        ) : (
                          <Badge
                            map={AVAILABILITY_MAP}
                            value={worker.availabilityStatus}
                            fixedWidth
                          />
                        )}
                      </td>
                      <td className="px-4 py-[11px] text-center">
                        {isInactive(worker) ? (
                          dash
                        ) : (
                          <Badge
                            map={MOBILIZATION_MAP}
                            value={worker.mobilizationStatus}
                            fixedWidth
                          />
                        )}
                      </td>
                      <td className="px-4 py-[11px] text-center">
                        {renderActions(worker)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
