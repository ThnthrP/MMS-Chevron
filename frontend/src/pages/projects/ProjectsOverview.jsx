import { useState, useEffect, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

const TABS = [
  { key: "inProgress", label: "🟢 กำลังดำเนินการ" },
  { key: "upcoming", label: "🔵 กำลังจะเริ่ม" },
  { key: "completed", label: "⚪ จบแล้ว" },
];

const TIMELINE_HEADERS = [
  "NAME",
  "POSITION REQUESTED",
  "MOB DATE",
  "D-MOB DATE",
  "PLATFORM",
];

// ── Tailwind class ที่ใช้ซ้ำ ──
const CARD = "rounded-[10px] border border-gray-200 bg-white";
const SECTION_TITLE =
  "mb-2 text-xs font-bold uppercase tracking-[0.4px] text-gray-700";
const STICKY_COL = "sticky left-0 z-[1] shadow-[1px_0_0_#f1f3f5]";

// ── filter (รูปแบบเดียวกับหน้า PE Approvals / Requests for Training & Medical) ──
const FILTER_LABEL = "mb-1 block text-[11px] font-semibold text-gray-500";
const FIELD_BASE =
  "box-border h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-900 outline-none focus:border-blue-500";
const FIELD = `${FIELD_BASE} w-full`;
const DATE_FIELD = `${FIELD_BASE} w-[150px]`;
const CHIP =
  "cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs";

const toYMD = (d) => {
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
// ช่วงเดือน: offset 0 = เดือนนี้, 1 = เดือนหน้า · span = จำนวนเดือน
const monthRange = (offset, span = 1) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + span, 0);
  return [toYMD(from), toYMD(to)];
};
// ช่วงงานของโปรเจกต์ (start → end) ซ้อนกับช่วงที่เลือกไหม
const DATE_PRESETS = [
  ["all", "ทั้งหมด", null],
  ["thisMonth", "เดือนนี้", () => monthRange(0)],
  ["nextMonth", "เดือนหน้า", () => monthRange(1)],
  ["next3", "3 เดือนข้างหน้า", () => monthRange(0, 3)],
];

// สถานะการจัดคนของโปรเจกต์ (สรุปจากทุกตำแหน่ง)
const STAFFING_OPTIONS = [
  ["", "ทั้งหมด"],
  ["no_request", "⚠ ยังไม่มี Position Request"],
  ["approve_short", "⚠ Approve ยังไม่ครบ"],
  ["wait_deploy", "⏳ รอ Deploy"],
  ["complete", "✓ Deploy ครบแล้ว"],
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── ดึงรหัสโปรเจกต์ (ON Number) — ใช้แยกโปรเจกต์ที่ชื่อซ้ำกัน ──
const projectCode = (p) => p.masterProjectRecord?.projectCode || null;

// ── สถานะต่อตำแหน่ง — ตรรกะเดียวกับ PositionCard ใน Mobilization.jsx ──
const TONE_CLASSES = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-800",
};

// จำนวนที่ deploy แล้วต่อ request
// ถ้า backend ส่ง r.deployed มา ใช้ค่านั้น ไม่งั้นนับจาก timeline พนักงาน
const deployedOf = (r, employees) =>
  r.deployed ??
  employees.filter((e) => e.requestedPosition === r.position).length;

const positionStatus = (approved, deployed, quantity) =>
  deployed >= quantity
    ? { tone: "ok", icon: "✓", label: "✓ ครบแล้ว" }
    : approved >= quantity
      ? { tone: "info", icon: "⏳", label: "⏳ รอ Deploy" }
      : { tone: "warn", icon: "⚠", label: "⚠ Approve ยังไม่ครบ" };

// สถานะรวมของโปรเจกต์ — ใช้กรอง (ตำแหน่งที่แย่สุดเป็นตัวตัดสิน)
const staffingOf = (p) => {
  if (!p.requests?.length) return "no_request";
  const sts = p.requests.map(
    (r) => positionStatus(r.approved, deployedOf(r, p.employees), r.quantity).tone,
  );
  if (sts.includes("warn")) return "approve_short";
  if (sts.includes("info")) return "wait_deploy";
  return "complete";
};

function Badge({ tone, children }) {
  return (
    <span
      className={`${TONE_CLASSES[tone]} whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold`}
    >
      {children}
    </span>
  );
}

function ProgressRow({ label, n, q, barClass }) {
  const pct = q > 0 ? Math.min(100, Math.round((n / q) * 100)) : 0;
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[11px] text-gray-500">
        <span>{label}</span>
        <span className="font-semibold text-gray-800">
          {n}/{q}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PositionCard({ r, deployed }) {
  const st = positionStatus(r.approved, deployed, r.quantity);
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words text-xs font-semibold text-gray-800">
          {r.position}
        </span>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <ProgressRow
        label="Shortlisted"
        n={r.shortlisted}
        q={r.quantity}
        barClass="bg-gray-400"
      />
      <ProgressRow
        label="Approved"
        n={r.approved}
        q={r.quantity}
        barClass="bg-blue-500"
      />
      <ProgressRow
        label="Deployed"
        n={deployed}
        q={r.quantity}
        barClass="bg-emerald-500"
      />
      {r.remaining > 0 && (
        <div className="mt-1.5 text-[11px] font-semibold text-red-600">
          ขาดอีก {r.remaining} คน
        </div>
      )}
    </div>
  );
}

export default function ProjectsOverview() {
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inProgress");
  const [expandedProjects, setExpandedProjects] = useState({});
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [staffingFilter, setStaffingFilter] = useState("");

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/supervisor/projects-overview`, {
        withCredentials: true,
      })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  const toggleExpand = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // ── filter ทุกอย่าง "ยกเว้น tab สถานะ" — ใช้นับตัวเลขบนปุ่มสถานะ ──
  const matchesFilters = (p) => {
    if (clientFilter && p.client !== clientFilter) return false;
    if (staffingFilter && staffingOf(p) !== staffingFilter) return false;
    if (dateFrom || dateTo) {
      const start = toYMD(p.startDate);
      if (!start) return false; // ไม่มีวันเริ่ม → กรองช่วงวันที่ไม่ได้
      const end = toYMD(p.endDate) || start;
      if (dateTo && start > dateTo) return false;
      if (dateFrom && end < dateFrom) return false;
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.client, p.location, projectCode(p)].some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(q),
    );
  };

  const clientOptions = useMemo(() => {
    if (!data) return [];
    const all = TABS.flatMap((t) => data[t.key] || []);
    return [...new Set(all.map((p) => p.client).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [data]);

  const hasFilter =
    search || dateFrom || dateTo || clientFilter || staffingFilter;

  const resetFilters = () => {
    setSearch("");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setClientFilter("");
    setStaffingFilter("");
  };

  const applyPreset = (key, fn) => {
    setDatePreset(key);
    const [from, to] = fn ? fn() : ["", ""];
    setDateFrom(from);
    setDateTo(to);
  };

  const setDate = (setter) => (e) => {
    setter(e.target.value);
    setDatePreset("");
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
  if (!data)
    return <div className="p-4 text-gray-500">ไม่สามารถโหลดข้อมูลได้</div>;

  const projects = (data[activeTab] || []).filter(matchesFilters);
  const tabCount = (key) => (data[key] || []).filter(matchesFilters).length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* Header */}
      <div className={`${CARD} mb-4 px-4 py-4 sm:px-6`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📊</span>
          <span className="text-lg font-bold">Projects Overview</span>
        </div>
        <div className="mt-1 text-[13px] text-gray-500">
          ภาพรวมโปรเจกต์ทั้งหมด — สถานะ, การจัดหาพนักงาน, และตารางเข้า-ออกงาน
        </div>
      </div>

      {/* ════════ Search & Filter ════════ */}
      <div className={`${CARD} mb-4 px-4 py-3.5`}>
        <div>
          <label className={FILTER_LABEL}>
            ช่วงวันที่ทำงาน (Start → End ของโปรเจกต์)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map(([key, label, fn]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key, fn)}
                className={`${CHIP} ${
                  datePreset === key
                    ? "border-blue-600 bg-blue-600 font-bold text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="hidden text-gray-300 sm:inline">|</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={setDate(setDateFrom)}
              className={DATE_FIELD}
              title="ตั้งแต่วันที่"
            />
            <span className="text-xs text-gray-400">ถึง</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={setDate(setDateTo)}
              className={DATE_FIELD}
              title="ถึงวันที่"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.2fr]">
          <div className="min-w-0">
            <label className={FILTER_LABEL}>ค้นหา</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ON Number / ชื่อ project / client / location..."
              className={FIELD}
            />
          </div>
          <div className="min-w-0">
            <label className={FILTER_LABEL}>Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className={FIELD}
            >
              <option value="">ทั้งหมด</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={FILTER_LABEL}>สถานะการจัดคน</label>
            <select
              value={staffingFilter}
              onChange={(e) => setStaffingFilter(e.target.value)}
              className={FIELD}
            >
              {STAFFING_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasFilter && (
          <div className="mt-2.5 text-right">
            <button
              type="button"
              onClick={resetFilters}
              className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-[#dc3545] underline hover:text-[#a71d2a]"
            >
              ✕ ล้าง filter
            </button>
          </div>
        )}
      </div>

      {/* ════════ แถบสถานะโปรเจกต์ (เหนือรายการ) ════════ */}
      <div
        className={`${CARD} mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-3`}
      >
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`cursor-pointer whitespace-nowrap rounded-md border px-3.5 py-1.5 text-xs ${
                  active
                    ? "border-blue-600 bg-blue-600 font-bold text-white"
                    : "border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label} ({tabCount(tab.key)})
              </button>
            );
          })}
        </div>
        <span className="text-xs text-gray-500">
          พบ <strong className="text-gray-900">{projects.length}</strong>{" "}
          โปรเจกต์
        </span>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className={`${CARD} p-12 text-center text-[13px] text-gray-500`}>
          {hasFilter
            ? "ไม่พบโปรเจกต์ตามเงื่อนไขที่เลือก"
            : "ไม่มีโปรเจกต์ในหมวดนี้"}
        </div>
      ) : (
        projects.map((p) => {
          const isExpanded = !!expandedProjects[p.id];
          const totalNeed = p.requests.reduce((s, r) => s + r.quantity, 0);
          const totalShortlisted = p.requests.reduce(
            (s, r) => s + r.shortlisted,
            0,
          );
          const overallPct =
            totalNeed > 0
              ? Math.round((totalShortlisted / totalNeed) * 100)
              : 0;
          const code = projectCode(p);

          return (
            <div key={p.id} className={`${CARD} mb-3.5 overflow-hidden`}>
              {/* ── Header (คลิกเพื่อขยาย) ──
                  มือถือ: เรียงแนวตั้ง ข้อมูลโปรเจกต์ → progress + ปุ่มขยาย
                  md+: ซ้าย-ขวา เหมือนเดิม */}
              <div
                onClick={() => toggleExpand(p.id)}
                className="flex cursor-pointer flex-col gap-3 bg-white px-4 py-4 transition-colors duration-150 hover:bg-gray-50 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {code && (
                      <span className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-600">
                        {code}
                      </span>
                    )}
                    {p.requests.length === 0 && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        ⚠ ยังไม่มี Position Request
                      </span>
                    )}
                    <span className="break-words text-[15px] font-bold">
                      {p.name}
                    </span>
                    {/* stopPropagation: กดลิงก์แล้วไม่ให้การ์ดขยาย/ยุบตาม */}
                    <Link
                      to={`/projects/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="whitespace-nowrap text-[11px] text-blue-600 underline"
                    >
                      ดู Project →
                    </Link>
                  </div>

                  <div className="mt-1 text-xs text-gray-500">
                    {p.client || "—"}
                    {p.location ? ` · ${p.location}` : ""}
                    {" · "}
                    Start: {fmtDate(p.startDate)}
                    {p.endDate ? ` · End: ${fmtDate(p.endDate)}` : ""}
                  </div>

                  {/* position summary chips */}
                  {p.requests.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.requests.map((r) => {
                        const deployed = deployedOf(r, p.employees);
                        const st = positionStatus(
                          r.approved,
                          deployed,
                          r.quantity,
                        );
                        return (
                          <span
                            key={r.id}
                            title={`Shortlisted ${r.shortlisted}/${r.quantity} · Approved ${r.approved}/${r.quantity} · Deployed ${deployed}/${r.quantity}`}
                            className={`${TONE_CLASSES[st.tone]} rounded-md px-2 py-0.5 text-[11px] font-semibold`}
                          >
                            {st.icon} {r.position} · Deploy {deployed}/
                            {r.quantity}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
                  <div className="min-w-0 flex-1 md:flex-none md:text-right">
                    <div className="mb-1 text-xs text-gray-500">
                      Shortlisted {totalShortlisted}/{totalNeed} ({overallPct}%)
                      {" · "}
                      {p.employees.length} คน mobilized
                    </div>
                    <div className="h-1.5 w-full rounded bg-gray-200 md:ml-auto md:w-[140px]">
                      <div
                        className={`h-1.5 rounded transition-[width] duration-300 ${
                          overallPct === 100 ? "bg-[#198754]" : "bg-blue-600"
                        }`}
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600">
                    <span>
                      {isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                    </span>
                    <span className="text-base">{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
              </div>

              {/* ── Expanded detail ── */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-[#fafbfc] px-4 py-4 sm:px-5">
                  {/* Requirements */}
                  <div className="mb-4">
                    <div className={SECTION_TITLE}>Position Requirements</div>
                    {p.requests.length === 0 ? (
                      <div className="text-xs text-gray-400">
                        — ยังไม่มี position request
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                        {p.requests.map((r) => (
                          <PositionCard
                            key={r.id}
                            r={r}
                            deployed={deployedOf(r, p.employees)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Employee timeline */}
                  <div>
                    <div className={SECTION_TITLE}>
                      Timeline พนักงาน ({p.employees.length} คน)
                    </div>
                    {p.employees.length === 0 ? (
                      <div className="text-xs text-gray-400">
                        — ยังไม่มีพนักงานถูก mobilize เข้า project นี้
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              {TIMELINE_HEADERS.map((h, hi) => (
                                <th
                                  key={h}
                                  className={`whitespace-nowrap px-2.5 py-1.5 text-left text-[10px] font-bold text-gray-500 ${
                                    hi === 0 ? `${STICKY_COL} bg-gray-100` : ""
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {p.employees.map((e, i) => (
                              <tr
                                key={`${e.employeeId}-${i}`}
                                className="border-t border-gray-100"
                              >
                                <td
                                  className={`${STICKY_COL} bg-[#fafbfc] px-2.5 py-2`}
                                >
                                  <div className="font-semibold">
                                    {e.fullName}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    {e.empId}
                                    {e.employeePosition
                                      ? ` · ${e.employeePosition}`
                                      : ""}
                                  </div>
                                </td>
                                <td className="px-2.5 py-2">
                                  {e.requestedPosition || "—"}
                                </td>
                                <td className="whitespace-nowrap px-2.5 py-2">
                                  {fmtDate(e.mobDate)}
                                </td>
                                <td className="whitespace-nowrap px-2.5 py-2">
                                  {fmtDate(e.demobDate)}
                                </td>
                                <td className="px-2.5 py-2">
                                  {e.platform || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
