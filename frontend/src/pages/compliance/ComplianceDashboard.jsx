import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import Select from "react-select";
import { Link } from "react-router-dom";
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
const LINK =
  "cursor-pointer text-[11px] font-semibold text-blue-600 hover:underline";

const TONE = {
  red: "bg-[#f8d7da] text-[#842029]",
  yellow: "bg-[#fff3cd] text-[#664d03]",
  indigo: "bg-[#eef2ff] text-[#4f46e5]",
  green: "bg-[#d1e7dd] text-[#0f5132]",
  gray: "bg-gray-100 text-gray-500",
};

const STAT_CARDS = [
  {
    key: "expired",
    icon: "🔴",
    label: "Expired",
    bg: "bg-[#fff5f5]",
    bar: "bg-[#dc3545]",
    text: "text-[#dc3545]",
    ring: "ring-[#dc3545]",
  },
  {
    key: "critical",
    icon: "🔥",
    label: "Critical (<30d)",
    bg: "bg-[#fff8e1]",
    bar: "bg-[#ffc107]",
    text: "text-[#cc8400]",
    ring: "ring-[#ffc107]",
  },
  {
    key: "warning",
    icon: "🟡",
    label: "Warning (30-90d)",
    bg: "bg-[#e8f4fd]",
    bar: "bg-[#0dcaf0]",
    text: "text-[#0aa2c0]",
    ring: "ring-[#0dcaf0]",
  },
  {
    key: "upcoming",
    icon: "🔵",
    label: "Upcoming (90-120d)",
    bg: "bg-[#eef2ff]",
    bar: "bg-[#6366f1]",
    text: "text-[#4f46e5]",
    ring: "ring-[#6366f1]",
  },
  {
    key: "valid",
    icon: "✅",
    label: "Valid (>120d)",
    bg: "bg-[#f0fff4]",
    bar: "bg-[#198754]",
    text: "text-[#198754]",
    ring: "ring-[#198754]",
  },
];

const ALERT_GROUPS = [
  { key: "expired", label: "🔴 Expired", text: "text-[#dc3545]" },
  { key: "critical", label: "🔥 Critical (<30 days)", text: "text-[#cc8400]" },
  { key: "warning", label: "🟡 Warning (30-90 days)", text: "text-[#0aa2c0]" },
  {
    key: "upcoming",
    label: "🔵 Upcoming (90-120 days)",
    text: "text-[#4f46e5]",
  },
];

// ผลตรวจจริง (แยกจาก badge หลักที่สื่อ "ใบด่วนแค่ไหน")
const MEDICAL_STATUS_LABEL = {
  passed: "Fit",
  pending: "Pending",
  failed: "Unfit",
  not_required: "Fit w/ Restriction",
};

const TABLE_HEADERS = [
  ["WORKER", "text-left", "w-[15%]"],
  ["POSITION", "text-left", "w-[20%]"],
  ["DEPARTMENT", "text-left", "w-[12%]"],
  ["TRAINING ALERTS", "text-center", "w-[19%]"],
  ["MEDICAL", "text-center", "w-[17%]"],
  ["CHEVRON MATCH", "text-center", "w-[17%]"],
];

// key ของ HR request ที่ส่งไปแล้วในรอบนี้ (กันกดซ้ำ)
const reqKey = (employeeId, trainingId) => `${employeeId}:${trainingId}`;

// ชื่อ client ของ worker สำหรับแนบในคำขอ (dashboard เก็บ key เป็นตัวเล็ก เช่น "chevron")
const clientNameOf = (w) => {
  const key = Object.keys(w?.clients || {})[0];
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : null;
};

const BUCKET_RANK = {
  valid: 0,
  upcoming: 1,
  warning: 2,
  critical: 3,
  expired: 4,
};

const EMPTY_GROUP = { required: [], completed: [], missing: [] };

// react-select ใช้ styles API ของไลบรารี
const customSelectStyles = {
  control: (p) => ({
    ...p,
    borderColor: "#dee2e6",
    borderRadius: "8px",
    minHeight: "36px",
    fontSize: "13px",
    boxShadow: "none",
    "&:hover": { borderColor: "#86b7fe" },
  }),
  option: (p) => ({ ...p, fontSize: "13px" }),
  placeholder: (p) => ({ ...p, fontSize: "13px", color: "#6c757d" }),
};

// ══════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════
const alertCounts = (w) => ({
  expired: w.alerts?.expired ?? 0,
  critical: w.alerts?.critical ?? 0,
  warning: w.alerts?.warning ?? 0,
  upcoming: w.alerts?.upcoming ?? 0,
});

// ความรุนแรงของ training อย่างเดียว — ใช้กับคอลัมน์ Training Alerts
const trainingSeverity = (w) => {
  const a = alertCounts(w);
  if (a.expired > 0) return 4;
  if (a.critical > 0) return 3;
  if (a.warning > 0) return 2;
  if (a.upcoming > 0) return 1;
  return 0;
};

// ความรุนแรงรวม training + medical — ใช้เรียงแถวและกรอง Status
// (คนที่ medical หมดอายุยังขึ้นบนสุด และกรอง "Expired" แล้วยังเจอ)
const severity = (w) =>
  Math.max(trainingSeverity(w), BUCKET_RANK[w.medicalWorst] ?? 0);

// สถานะ "แย่สุด" ของ worker — ใช้กรองตาม status
const worstStatus = (w) =>
  ["valid", "upcoming", "warning", "critical", "expired"][severity(w)];

const getMedical = (w) =>
  (w.medicalChecks || []).find((m) => m.checkType === "Medical Check up") ||
  null;

// ผลตรวจประเภทอื่น (เช่น Confined Space Entry) — แสดงเป็นบรรทัดรองในคอลัมน์ Medical
const getOtherMedicals = (w) =>
  (w.medicalChecks || []).filter((m) => m.checkType !== "Medical Check up");

const daysUntil = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime())
    ? null
    : Math.ceil((d.getTime() - Date.now()) / 86400000);
};

// สีวันหมดอายุ: <30 วัน (รวมหมดแล้ว) แดง · 30–90 วัน ส้ม · มากกว่านั้น เทา
const expiryTextCls = (daysLeft) =>
  daysLeft === null
    ? "text-gray-500"
    : daysLeft < 30
      ? "font-semibold text-[#dc3545]"
      : daysLeft <= 90
        ? "font-semibold text-[#cc8400]"
        : "text-gray-500";

const daysNote = (daysLeft) =>
  daysLeft === null
    ? null
    : daysLeft < 0
      ? `หมดมาแล้ว ${Math.abs(daysLeft)} วัน`
      : daysLeft <= 90
        ? `เหลือ ${daysLeft} วัน`
        : null;

const fmtDate = (date) => new Date(date).toLocaleDateString("en-GB");

// badge หลักของ Medical สื่อ "ใบด่วนแค่ไหน" มิติเดียว
const medicalExpiryInfo = (daysLeft, hasValidExp) => {
  if (!hasValidExp) return ["gray", "No record"];
  if (daysLeft < 0) return ["red", "Overdue"];
  if (daysLeft < 30) return ["red", "Critical"];
  if (daysLeft <= 90) return ["yellow", "Due soon"];
  if (daysLeft <= 120) return ["indigo", "Upcoming"];
  return ["green", "Valid"];
};

// ══════════════════════════════════════════════════════════
// small components (อยู่นอก component หลัก)
// ══════════════════════════════════════════════════════════
function Badge({ tone, children }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2 py-[3px] text-[11px] font-semibold ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

function ClientCell({
  completed = null,
  required = 0,
  missing = 0,
  score = 0,
}) {
  if (completed === null) return <span className="text-gray-500">—</span>;
  const scoreColor =
    score >= 80
      ? "text-[#198754]"
      : score >= 60
        ? "text-[#cc8400]"
        : "text-[#dc3545]";
  return (
    <div>
      <div
        className={`text-[13px] font-semibold ${
          missing === 0 ? "text-[#198754]" : "text-[#dc3545]"
        }`}
      >
        {missing === 0 ? "Complete" : `${missing} Missing`}
      </div>
      <div className="text-[11px] text-gray-500">
        {completed} / {required} completed
      </div>
      <div className={`text-[11px] font-semibold ${scoreColor}`}>
        {score}% Match
      </div>
    </div>
  );
}

function GapCountCards({ required, completed, missing }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      {[
        {
          label: "Required",
          value: required,
          cls: "bg-[#e8f0ff] text-blue-600",
        },
        {
          label: "Completed",
          value: completed,
          cls: "bg-[#f0fff4] text-[#198754]",
        },
        {
          label: "Missing",
          value: missing,
          cls: "bg-[#fff5f5] text-[#dc3545]",
        },
      ].map((s) => (
        <div key={s.label} className={`rounded-lg p-3 text-center ${s.cls}`}>
          <div className="text-[22px] font-bold">{s.value}</div>
          <div className="text-xs text-gray-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function TagList({ items, cls, prefix }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span
          key={t}
          className={`rounded-md border px-2.5 py-[3px] text-xs ${cls}`}
        >
          {prefix} {t}
        </span>
      ))}
    </div>
  );
}

function GapTrainingTags({ missing, completed }) {
  return (
    <>
      {missing.length > 0 ? (
        <div>
          <div className="mb-2 text-[13px] font-semibold text-[#dc3545]">
            Missing Training:
          </div>
          <TagList
            items={missing}
            prefix="✕"
            cls="border-[#f5c6cb] bg-[#fff5f5] text-[#dc3545]"
          />
        </div>
      ) : (
        <div className="text-[13px] font-semibold text-[#198754]">
          ✅ All training completed
        </div>
      )}
      {completed.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[13px] font-semibold text-[#198754]">
            Completed Training:
          </div>
          <TagList
            items={completed}
            prefix="✓"
            cls="border-[#b2dfdb] bg-[#f0fff4] text-[#198754]"
          />
        </div>
      )}
    </>
  );
}

// กรอบ modal ที่ใช้ร่วมกันทั้ง 3 ตัว
function Modal({ maxW, title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[999999] overflow-y-auto bg-black/50 p-3 sm:p-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`mx-auto overflow-hidden rounded-[10px] bg-white ${maxW}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="break-words text-base font-bold">{title}</div>
            {subtitle}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer border-none bg-transparent text-xl leading-none text-gray-500"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
        <div className="border-t border-gray-200 px-4 py-4 text-right sm:px-6">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-200 bg-gray-500 px-6 py-2 text-[13px] text-white hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function ComplianceDashboard() {
  const { backendUrl } = useContext(AppContent);

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    expired: 0,
    critical: 0,
    warning: 0,
    upcoming: 0,
    valid: 0,
  });

  const [workerFilter, setWorkerFilter] = useState(""); // worker.id
  const [positionFilter, setPositionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedGap, setSelectedGap] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null); // + workerId, clientName
  const [requestedKeys, setRequestedKeys] = useState(() => new Set()); // แจ้ง HR แล้ว (รอบนี้)
  const [sendingKey, setSendingKey] = useState(null); // key ที่กำลังส่ง / "all"
  const [noteModal, setNoteModal] = useState(null); // { name, note }

  const anyModalOpen = !!(selectedGap || selectedAlert || noteModal);

  // ล็อก scroll ของหน้าเมื่อเปิด modal ใดก็ได้ (เดิมล็อกเฉพาะ Gap modal)
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [anyModalOpen]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, statsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/compliance/dashboard`, {
          withCredentials: true,
        }),
        axios.get(`${backendUrl}/api/compliance/stats`, {
          withCredentials: true,
        }),
      ]);
      setWorkers(
        [...dashboardRes.data].sort((a, b) => severity(b) - severity(a)),
      );
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Export PE Tracking (.xlsx) — ผลตรวจสุขภาพรายคน ตาม layout Excel เดิมของ HR
  // (ย้ายมาจากหน้า Analytics & Reports — endpoint เดิม)
  const [exportingPE, setExportingPE] = useState(false);
  const exportPETracking = async () => {
    setExportingPE(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/analytics/export-pe-tracking`,
        { withCredentials: true, responseType: "blob" },
      );
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `PE-tracking-export-${new Date().toLocaleDateString("en-CA")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(
        err.response?.status === 403
          ? "ไม่มีสิทธิ์ Export ผลตรวจสุขภาพ"
          : "Export PE Tracking ไม่สำเร็จ ลองใหม่อีกครั้ง",
      );
    } finally {
      setExportingPE(false);
    }
  };

  const handleViewGap = async (workerId) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/compliance/worker/${workerId}/gaps`,
        { withCredentials: true },
      );
      setSelectedGap(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewAlerts = async (w) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/compliance/worker/${w.id}/alerts`,
        { withCredentials: true },
      );
      setSelectedAlert({
        ...res.data,
        workerId: w.id,
        clientName: clientNameOf(w),
      });
    } catch (error) {
      console.error(error);
    }
  };

  // ── แจ้ง HR ให้จัด training → ไปอยู่หน้า Requests (endpoint เดียวกับหน้า Allocation) ──
  // items: alert item ที่มี globalTrainingId (training ที่ map กับระบบแล้ว)
  const sendTrainingRequest = async (items, busyKey) => {
    if (!selectedAlert || items.length === 0 || sendingKey) return;
    // กดทีละตัว = ส่งทันที / แจ้งทั้งหมด = ยืนยันก่อน
    if (items.length > 1) {
      const names = items.map((it) => `• ${it.name}`).join("\n");
      if (
        !window.confirm(
          `แจ้ง HR ให้จัด training ${items.length} รายการให้ ${selectedAlert.fullName}?\n\n${names}\n\nคำขอจะไปอยู่ที่เมนู Requests`,
        )
      )
        return;
    }
    try {
      setSendingKey(busyKey);
      await axios.post(
        `${backendUrl}/api/training-requests`,
        {
          items: items.map((it) => ({
            employeeId: selectedAlert.workerId,
            globalTrainingId: it.globalTrainingId,
            clientName: selectedAlert.clientName,
          })),
        },
        { withCredentials: true },
      );
      setRequestedKeys((prev) => {
        const next = new Set(prev);
        items.forEach((it) =>
          next.add(reqKey(selectedAlert.workerId, it.globalTrainingId)),
        );
        return next;
      });
    } catch (err) {
      console.error(err);
      alert(
        err.response?.status === 403
          ? "ไม่มีสิทธิ์ส่งคำขอ training"
          : err.response?.data?.message || "แจ้ง HR ไม่สำเร็จ ลองใหม่อีกครั้ง",
      );
    } finally {
      setSendingKey(null);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchWorker = !workerFilter || w.id === workerFilter;
    const matchPosition =
      !positionFilter || w.position?.name === positionFilter;
    const matchDepartment =
      !departmentFilter || (w.department || "") === departmentFilter;
    const matchStatus =
      statusFilter === "all" || worstStatus(w) === statusFilter;
    return matchWorker && matchPosition && matchDepartment && matchStatus;
  });

  const hasFilter =
    workerFilter || positionFilter || departmentFilter || statusFilter !== "all";

  const workerOptions = [
    { value: "", label: "All Workers" },
    ...buildWorkerOptions(workers),
  ];

  const positionOptions = [
    { value: "", label: "All Positions" },
    ...[...new Set(workers.map((w) => w.position?.name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({ value: p, label: p })),
  ];

  const departmentOptions = [
    { value: "", label: "All Departments" },
    ...[...new Set(workers.map((w) => w.department).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((d) => ({ value: d, label: d })),
  ];

  // ── cell renderers — ใช้ทั้งตาราง (lg+) และการ์ด (มือถือ) ──
  const renderWorker = (w) => (
    <>
      {/* ชื่อ → หน้า WorkerDetail (คลิกขวาเปิดแท็บใหม่ได้) */}
      <Link
        to={`/workers/${w.id}`}
        className="font-semibold text-gray-900 no-underline hover:text-blue-600 hover:underline"
      >
        {nameEN(w)}
      </Link>
      {nameTH(w) && (
        <div className="text-xs text-gray-600">{nameTH(w)}</div>
      )}
      {w.empId ? (
        <div className="font-mono text-[11px] text-gray-500">{w.empId}</div>
      ) : (
        <div className="mt-[3px] flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-[#ffe69c] bg-[#fff3cd] px-2 py-px text-[10px] font-semibold text-[#664d03]">
            ⚠ No ID
          </span>
          <Link
            to={`/workers/${w.id}/edit`}
            className="whitespace-nowrap text-[10px] font-semibold text-blue-600 underline"
          >
            กรอก →
          </Link>
        </div>
      )}
    </>
  );

  const renderAlerts = (w) => {
    const a = alertCounts(w);
    const hasAlerts = trainingSeverity(w) > 0;
    return (
      <div className="flex flex-col items-center gap-1">
        {!hasAlerts ? (
          <Badge tone="green">✅ No Alerts</Badge>
        ) : (
          <div className="flex flex-wrap justify-center gap-1">
            {a.expired > 0 && <Badge tone="red">🔴 {a.expired} Expired</Badge>}
            {a.critical > 0 && (
              <Badge tone="red">🔥 {a.critical} Critical</Badge>
            )}
            {a.warning > 0 && (
              <Badge tone="yellow">🟡 {a.warning} Warning</Badge>
            )}
            {a.upcoming > 0 && (
              <Badge tone="indigo">🔵 {a.upcoming} Upcoming</Badge>
            )}
          </div>
        )}
        {hasAlerts && (
          <span onClick={() => handleViewAlerts(w)} className={LINK}>
            🔍 ดู Alerts →
          </span>
        )}
      </div>
    );
  };

  const renderChevron = (w) => (
    <div className="flex flex-col items-center gap-1">
      <ClientCell {...(w.clients?.chevron ?? { completed: null })} />
      {w.clients?.chevron && w.clients.chevron.completed !== null && (
        <span onClick={() => handleViewGap(w.id)} className={LINK}>
          🔍 ดู Gap →
        </span>
      )}
    </div>
  );

  const renderMedical = (w) => {
    const med = getMedical(w);
    const others = getOtherMedicals(w);
    if (!med && others.length === 0)
      return <span className="text-gray-500">—</span>;

    const daysLeft = daysUntil(med?.expiryDate);
    const hasValidExp = daysLeft !== null;

    // "failed" (Unfit) ขึ้นเสมอ — ตรวจแล้วไม่ผ่านจริง คนละเรื่องกับวันหมดอายุ
    const isUnfit = med?.status === "failed";
    const [tone, label] = isUnfit
      ? ["red", "Unfit"]
      : medicalExpiryInfo(daysLeft, hasValidExp);
    const statusText = isUnfit ? null : MEDICAL_STATUS_LABEL[med?.status];
    const note = daysNote(daysLeft);

    return (
      <div className="flex flex-col items-center gap-[3px]">
        {med ? (
          <>
            <Badge tone={tone}>{label}</Badge>
            {statusText && (
              <div className="text-[11px] font-semibold text-gray-700">
                {statusText}
              </div>
            )}
            <div className={`text-[11px] ${expiryTextCls(daysLeft)}`}>
              {hasValidExp ? `Exp: ${fmtDate(med.expiryDate)}` : "No expiry"}
              {note && <div>{note}</div>}
            </div>
            {med.notes && (
              <span
                title={med.notes}
                onClick={() =>
                  setNoteModal({ name: w.fullName, note: med.notes })
                }
                className="max-w-[120px] cursor-pointer truncate text-[10px] text-gray-500 underline decoration-dotted"
              >
                📄 {med.notes}
              </span>
            )}
          </>
        ) : (
          <Badge tone="gray">No Check-up</Badge>
        )}

        {/* ผลตรวจประเภทอื่น เช่น Confined Space */}
        {others.map((o) => {
          const d = daysUntil(o.expiryDate);
          return (
            <div
              key={o.id}
              className="mt-1 w-full border-t border-dashed border-gray-200 pt-1 text-[10px] leading-snug"
              title={o.checkType}
            >
              <div className="truncate font-semibold text-gray-600">
                {o.checkType}
              </div>
              <div className={expiryTextCls(d)}>
                {d === null ? "No expiry" : `Exp: ${fmtDate(o.expiryDate)}`}
                {daysNote(d) && ` · ${daysNote(d)}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const emptyText = loading
    ? "Loading compliance data..."
    : "No workers match the current filters.";

  // ── Alert modal: รวมทุกกลุ่ม (กัน upcoming เป็น undefined) ──
  const alertTotal = selectedAlert
    ? ALERT_GROUPS.reduce((n, g) => n + (selectedAlert[g.key]?.length || 0), 0)
    : 0;

  // แจ้งแล้ว = มีคำขอค้างอยู่ที่หน้า Requests (จาก backend) หรือเพิ่งกดส่งในรอบนี้
  const isRequested = (item) =>
    !!selectedAlert &&
    (item.requestPending ||
      requestedKeys.has(reqKey(selectedAlert.workerId, item.globalTrainingId)));

  // training ที่แจ้ง HR ได้และยังไม่ได้แจ้ง (ไม่ซ้ำ)
  const pendingRequestable = selectedAlert
    ? [
        ...new Map(
          ALERT_GROUPS.flatMap((g) => selectedAlert[g.key] || [])
            .filter(
              (it) =>
                it.type === "Training" &&
                it.globalTrainingId &&
                !isRequested(it),
            )
            .map((it) => [it.globalTrainingId, it]),
        ).values(),
      ]
    : [];

  // ปุ่ม "แจ้ง HR" หลัง training แต่ละตัว
  const renderRequestButton = (item) => {
    if (item.type !== "Training") return null;
    if (!item.globalTrainingId) {
      return (
        <span
          title="training นี้ยังไม่ได้ map กับรายการ training ในระบบ — แจ้ง HR อัตโนมัติไม่ได้"
          className="whitespace-nowrap rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-400"
        >
          แจ้งไม่ได้
        </span>
      );
    }
    if (isRequested(item)) {
      return (
        <Link
          to="/requests-history"
          className="whitespace-nowrap rounded-md bg-[#d1e7dd] px-2 py-1 text-[11px] font-semibold text-[#0f5132] no-underline hover:underline"
          title="มีคำขอรอ HR ดำเนินการอยู่แล้ว — ดูที่เมนู Requests"
        >
          ✓ แจ้งแล้ว
        </Link>
      );
    }
    const k = reqKey(selectedAlert.workerId, item.globalTrainingId);
    return (
      <button
        onClick={() => sendTrainingRequest([item], k)}
        disabled={!!sendingKey}
        title="แจ้ง HR ให้จัด training นี้ — คำขอไปที่เมนู Requests"
        className="cursor-pointer whitespace-nowrap rounded-md border border-blue-600 bg-white px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
      >
        {sendingKey === k ? "..." : "📨 แจ้ง HR"}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div
        className={`${CARD} mb-4 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
      >
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <span className="text-lg font-bold">Compliance Center</span>
            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
              Phase 2
            </span>
          </div>
          <div className="text-[13px] text-gray-500">
            Certification Monitoring, Gap Analysis & Position Matching
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            ตัวเลขการ์ดด้านล่างและคอลัมน์ Training Alerts นับเฉพาะใบรับรอง
            training · ผลตรวจสุขภาพดูที่คอลัมน์ Medical
          </div>
        </div>
        <button
          onClick={exportPETracking}
          disabled={exportingPE}
          title="ผลตรวจสุขภาพรายคน (Physical Examination) ตาม layout PE tracking ของ HR"
          className="w-full shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-[#1e3a5f] px-4 py-[9px] text-[13px] font-bold text-white hover:bg-[#162c48] disabled:cursor-default disabled:bg-gray-400 sm:w-auto"
        >
          {exportingPE ? "Exporting…" : "⬇ Export PE Tracking (.xlsx)"}
        </button>
      </div>

      {/* ════════ Stats Cards — คลิกเพื่อกรอง ════════ */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {STAT_CARDS.map((card) => {
          const active = statusFilter === card.key;
          return (
            <div
              key={card.key}
              onClick={() => setStatusFilter(active ? "all" : card.key)}
              className={`${CARD} flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md ${
                active ? `ring-2 ${card.ring}` : ""
              }`}
            >
              <div className="flex flex-1 items-center gap-3 px-3 py-3 sm:px-[18px] sm:py-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.bg}`}
                >
                  <span className="text-[17px]">{card.icon}</span>
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[22px] font-bold leading-none ${card.text}`}
                  >
                    {stats[card.key]}
                  </div>
                  <div className="text-[11px] leading-snug text-gray-500">
                    {card.label}
                  </div>
                </div>
              </div>
              <div className={`mt-auto h-1 ${card.bar}`} />
            </div>
          );
        })}
      </div>

      {/* ════════ Filters ════════ */}
      <div className={`${CARD} mb-4 px-4 py-3.5`}>
        <div className="mb-3 text-[13px] font-bold text-gray-900">
          🔍 Search &amp; Filter
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
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
          <div className="min-w-[160px] flex-[1_1_45%] sm:max-w-[480px] sm:flex-[1_1_300px]">
            <label className={FILTER_LABEL}>Position</label>
            <Select
              options={positionOptions}
              value={
                positionOptions.find((o) => o.value === positionFilter) || null
              }
              onChange={(o) => setPositionFilter(o ? o.value : "")}
              placeholder="Position..."
              isClearable
              styles={customSelectStyles}
              noOptionsMessage={() => "ไม่พบตำแหน่ง"}
            />
          </div>
          <div className="min-w-[160px] flex-[1_1_45%] sm:max-w-[320px] sm:flex-[1_1_220px]">
            <label className={FILTER_LABEL}>Department</label>
            <Select
              options={departmentOptions}
              value={
                departmentOptions.find((o) => o.value === departmentFilter) ||
                null
              }
              onChange={(o) => setDepartmentFilter(o ? o.value : "")}
              placeholder="Department..."
              isClearable
              styles={customSelectStyles}
              noOptionsMessage={() => "ไม่พบแผนก"}
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
              <option value="valid">✅ No Alerts (training + medical)</option>
            </select>
          </div>
          {hasFilter && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setWorkerFilter("");
                  setPositionFilter("");
                  setDepartmentFilter("");
                  setStatusFilter("all");
                }}
                className="h-9 cursor-pointer whitespace-nowrap rounded-lg border border-[#dc3545] bg-white px-3.5 text-[13px] text-[#dc3545] hover:bg-red-50"
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════ Worker Compliance ════════ */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3.5 sm:px-5">
          <span className="text-sm font-bold">Worker Compliance Overview</span>
          <span className="text-xs text-gray-500">
            {filteredWorkers.length} of {workers.length}
          </span>
        </div>

        {/* ── ต่ำกว่า lg: การ์ด ── */}
        <div className="lg:hidden">
          {loading || filteredWorkers.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-gray-500">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 p-3 md:grid-cols-2">
              {filteredWorkers.map((w) => (
                <div
                  key={w.id}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-[13px]"
                >
                  <div className="mb-2">
                    {renderWorker(w)}
                    <div className="mt-1 text-xs text-gray-500">
                      {w.position?.name || "—"}
                      {w.department && (
                        <span className="text-gray-400"> · {w.department}</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2.5">
                    {[
                      ["Training", renderAlerts(w)],
                      ["Medical", renderMedical(w)],
                      ["Chevron", renderChevron(w)],
                    ].map(([label, content]) => (
                      <div key={label} className="min-w-0 text-center">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-gray-400">
                          {label}
                        </div>
                        {content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── lg+: ตาราง ── */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-gray-200">
                {TABLE_HEADERS.map(([h, align, width]) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap bg-white px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.5px] text-gray-500 ${align} ${width}`}
                  >
                    {h}
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
                filteredWorkers.map((w, idx) => (
                  <tr
                    key={w.id}
                    className={`transition-colors duration-150 hover:bg-gray-50 ${
                      idx < filteredWorkers.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <td className="px-3.5 py-3">{renderWorker(w)}</td>
                    <td className="px-3.5 py-3 text-gray-500">
                      <div className="truncate" title={w.position?.name || ""}>
                        {w.position?.name || "—"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-gray-500">
                      <div className="truncate" title={w.department || ""}>
                        {w.department || "—"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {renderAlerts(w)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {renderMedical(w)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {renderChevron(w)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════ Gap Modal — Mandatory / Assigned / Others ════════ */}
      {selectedGap && (
        <Modal
          maxW="max-w-[900px]"
          title={`Gap Analysis — ${selectedGap.fullName}`}
          subtitle={
            <div className="mt-1 text-[13px] text-gray-500">
              {selectedGap.position}
            </div>
          }
          onClose={() => setSelectedGap(null)}
        >
          {Object.entries(selectedGap.clients).map(([clientName, client]) => {
            const mandatory = client.mandatory ?? EMPTY_GROUP;
            const assigned = client.assigned ?? EMPTY_GROUP;
            const others = client.others ?? { completed: [] };

            // % Match อิงจาก Mandatory เท่านั้น (ตรงกับคอลัมน์ CHEVRON MATCH)
            const score =
              mandatory.required.length > 0
                ? Math.round(
                    (mandatory.completed.length / mandatory.required.length) *
                      100,
                  )
                : 0;
            const scoreTone =
              mandatory.missing.length === 0
                ? TONE.green
                : score >= 80
                  ? TONE.yellow
                  : TONE.red;

            return (
              <div
                key={clientName}
                className="mb-4 rounded-[10px] border border-gray-200 p-4 sm:p-5"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold uppercase">
                    {clientName}
                  </span>
                  <span
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${scoreTone}`}
                  >
                    {score}% Match
                  </span>
                </div>

                {/* Mandatory */}
                <div className="mb-6">
                  <div className="mb-3 text-[13px] font-bold text-gray-900">
                    🔴 Mandatory
                  </div>
                  <GapCountCards
                    required={mandatory.required.length}
                    completed={mandatory.completed.length}
                    missing={mandatory.missing.length}
                  />
                  <GapTrainingTags
                    missing={mandatory.missing}
                    completed={mandatory.completed}
                  />
                </div>

                {/* Assigned */}
                <div className="mb-6">
                  <div className="mb-3 text-[13px] font-bold text-gray-900">
                    🟠 Assigned
                  </div>
                  {assigned.required.length === 0 ? (
                    <div className="text-[13px] text-gray-500">
                      — ไม่มี Assigned training สำหรับตำแหน่งนี้
                    </div>
                  ) : (
                    <>
                      <GapCountCards
                        required={assigned.required.length}
                        completed={assigned.completed.length}
                        missing={assigned.missing.length}
                      />
                      <GapTrainingTags
                        missing={assigned.missing}
                        completed={assigned.completed}
                      />
                    </>
                  )}
                </div>

                {/* Others */}
                <div>
                  <div className="mb-3 text-[13px] font-bold text-gray-900">
                    ⚪ Others{" "}
                    <span className="text-[11px] font-normal text-gray-500">
                      (training ที่มีนอกเหนือจาก matrix ตำแหน่งนี้)
                    </span>
                  </div>
                  {others.completed.length === 0 ? (
                    <div className="text-[13px] text-gray-500">— ไม่มี</div>
                  ) : (
                    <TagList
                      items={others.completed}
                      prefix="✓"
                      cls="border-gray-200 bg-gray-100 text-gray-700"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </Modal>
      )}

      {/* ════════ Alert Modal ════════ */}
      {selectedAlert && (
        <Modal
          maxW="max-w-[700px]"
          title={`Training Alerts — ${selectedAlert.fullName}`}
          subtitle={
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedAlert.expired?.length > 0 && (
                <Badge tone="red">
                  🔴 {selectedAlert.expired.length} Expired
                </Badge>
              )}
              {selectedAlert.critical?.length > 0 && (
                <Badge tone="red">
                  🔥 {selectedAlert.critical.length} Critical
                </Badge>
              )}
              {selectedAlert.warning?.length > 0 && (
                <Badge tone="yellow">
                  🟡 {selectedAlert.warning.length} Warning
                </Badge>
              )}
              {selectedAlert.upcoming?.length > 0 && (
                <Badge tone="indigo">
                  🔵 {selectedAlert.upcoming.length} Upcoming
                </Badge>
              )}
            </div>
          }
          onClose={() => setSelectedAlert(null)}
        >
          {/* แจ้ง HR ทั้งหมดในครั้งเดียว — เฉพาะ training ที่ยังไม่ได้แจ้ง */}
          {pendingRequestable.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
              <span className="text-xs text-gray-700">
                แจ้ง HR ให้จัด training ที่หมด/ใกล้หมดทั้งหมด → ไปที่เมนู
                Requests
              </span>
              <button
                onClick={() => sendTrainingRequest(pendingRequestable, "all")}
                disabled={!!sendingKey}
                className="cursor-pointer whitespace-nowrap rounded-md border-none bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {sendingKey === "all"
                  ? "กำลังส่ง..."
                  : `📨 แจ้ง HR ทั้งหมด (${pendingRequestable.length})`}
              </button>
            </div>
          )}
          {ALERT_GROUPS.map(({ key, label, text }) => {
            const items = selectedAlert[key] || [];
            if (items.length === 0) return null;
            return (
              <div key={key} className="mb-6">
                <div className={`mb-2 text-sm font-bold ${text}`}>{label}</div>
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-gray-100 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                        {item.type}
                      </span>
                      <span className="break-words text-[13px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`text-xs font-semibold ${text}`}>
                        {new Date(item.expiryDate).toLocaleDateString()} (
                        {Math.abs(item.daysLeft)} days{" "}
                        {item.daysLeft < 0 ? "ago" : "left"})
                      </div>
                      {renderRequestButton(item)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {alertTotal === 0 && (
            <div className="p-8 text-center font-semibold text-[#198754]">
              ✅ All training certificates valid
            </div>
          )}
        </Modal>
      )}

      {/* ════════ Medical Notes Modal ════════ */}
      {noteModal && (
        <Modal
          maxW="max-w-[480px]"
          title={`📄 Medical Notes — ${noteModal.name}`}
          onClose={() => setNoteModal(null)}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
            {noteModal.note}
          </div>
        </Modal>
      )}
    </div>
  );
}
