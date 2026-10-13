import { useState, useEffect, useContext, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { createPortal } from "react-dom";
import { AppContent } from "../../context/AppContext";
import {
  PrintModal,
  ResumePage,
  SkillMatrixTable,
  exportSkillMatrixExcel,
  GENDER_LABEL,
  EXCEL_BTN,
} from "../../components/print/PrintDocs";

const RETIREMENT_AGE = 60;

const SSE_LABEL = { new_sse: "NEW SSE", sse1: "SSE1", sse2: "SSE2" };

// ══════════════════════════════════════════════════════════
// Tailwind class ที่ใช้ซ้ำ
// ══════════════════════════════════════════════════════════
const CARD =
  "mb-4 overflow-hidden rounded-[10px] border border-gray-200 bg-white";
const BODY = "p-4 sm:p-5";
const GRID3 = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
const LABEL =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.4px] text-gray-500";
const VALUE = "text-sm font-medium text-gray-900 [overflow-wrap:anywhere]";
const EMPTY_BOX =
  "rounded-lg border border-dashed border-gray-200 bg-gray-50 p-7 text-center text-[13px] text-gray-500";
const TH =
  "whitespace-nowrap px-5 py-2.5 text-left text-[11px] font-semibold tracking-[0.5px] text-gray-500";
const TD = "px-5 py-3";
const EXPORT_BTN =
  "cursor-pointer whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";
const NOTE_TEXT =
  "whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700";

// ── สี badge ──
const TONE = {
  green: "bg-[#d1e7dd] text-[#0f5132]",
  red: "bg-[#f8d7da] text-[#842029]",
  yellow: "bg-[#fff3cd] text-[#664d03]",
  blue: "bg-[#cfe2ff] text-[#084298]",
  lightBlue: "bg-[#e8f0ff] text-blue-600",
  gray: "bg-gray-100 text-gray-500",
};

const STATUS_MAP = {
  active: ["green", "Active"],
  inactive: ["red", "Inactive"],
};
const AVAILABILITY_MAP = {
  available: ["green", "Available"],
  unavailable: ["red", "Unavailable"],
};
const MOBILIZATION_MAP = {
  ready: ["green", "Ready"],
  on_site: ["blue", "On-Site"],
  pending: ["yellow", "Pending"],
};
const MEDICAL_STATUS_MAP = {
  passed: ["green", "Fit"],
  pending: ["yellow", "Pending"],
  failed: ["red", "Unfit"],
  not_required: ["lightBlue", "Fit w/ Restriction"],
  overdue: ["red", "Overdue"],
  due_soon: ["yellow", "Due Soon"],
};

// ══════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════
// วัน/เดือน/ปี (en-GB) — เดิมใช้รูปแบบของเครื่อง ทำให้ 2 พ.ย. แสดงเป็น 11/2
const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB");
};

const parseProjectLabel = (label, platform) => {
  if (!label) return { client: "", field: "" };
  let rest = label.replace(/^Supply Manpower for /, "");
  if (platform && rest.endsWith(` at ${platform}`)) {
    return {
      client: rest.slice(0, -` at ${platform}`.length).trim(),
      field: "",
    };
  }
  const idx = rest.indexOf(" : ");
  if (idx !== -1) {
    return {
      client: rest.slice(0, idx).trim(),
      field: rest.slice(idx + 3).trim(),
    };
  }
  return { client: rest.trim(), field: "" };
};

const formatExperience = (startWorkDate) => {
  if (!startWorkDate) return "—";
  const start = new Date(startWorkDate);
  if (isNaN(start.getTime())) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years}y ${rem}m`;
};

const getAge = (birthDate) => {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
};

// วันหมดอายุ -> สี (class) + หมายเหตุ
const expiryInfo = (date) => {
  if (!date) return { text: "No expiry", cls: "text-gray-500", note: "" };
  const d = new Date(date);
  if (isNaN(d.getTime())) return { text: "—", cls: "text-gray-500", note: "" };
  const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  const text = fmtDate(d);
  if (days < 0)
    return {
      text,
      cls: "text-[#dc3545]",
      note: `expired ${Math.abs(days)}d ago`,
    };
  if (days < 30) return { text, cls: "text-[#cc8400]", note: `${days}d left` };
  if (days <= 60) return { text, cls: "text-[#0aa2c0]", note: `${days}d left` };
  return { text, cls: "text-[#198754]", note: `${days}d left` };
};

// Health Risk เป็น free-text (CreatableSelect + sync จาก PE record)
// จึงเทียบสีจากคำที่อยู่ในค่า แทนการ lookup แบบ exact key
const healthRiskTone = (value) => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("significant") || v.includes("high") || v.includes("สูง"))
    return "red";
  if (v.includes("moderate") || v.includes("medium") || v.includes("ปานกลาง"))
    return "yellow";
  if (v.includes("low") || v.includes("ต่ำ")) return "green";
  return "gray";
};

// ══════════════════════════════════════════════════════════
// small components
// ══════════════════════════════════════════════════════════
function Badge({ tone = "gray", children }) {
  return (
    <span
      className={`inline-block rounded-md px-3 py-1 text-xs font-semibold ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

function MapBadge({ map, value, fallback = "—" }) {
  const [tone, label] = map[(value || "").toLowerCase()] ||
    map[value] || ["gray", value || fallback];
  return <Badge tone={tone}>{label}</Badge>;
}

function SectionHeader({ number, title, subtitle, accent }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 border-b border-gray-200 px-4 py-3.5 sm:px-5 ${
        accent ? "bg-[#fff5f5]" : "bg-white"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${
          accent ? "bg-[#e53e3e]" : "bg-blue-600"
        }`}
      >
        {number}
      </div>
      <span
        className={`text-[15px] font-semibold ${
          accent ? "text-[#c53030]" : "text-gray-900"
        }`}
      >
        {title}
      </span>
      {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className={VALUE}>{children ?? value ?? "—"}</div>
    </div>
  );
}

function ExpiryField({ label, info }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className={`${VALUE} ${info.cls}`}>
        {info.text}
        {info.note && <span className="ml-1.5 text-[11px]">({info.note})</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function WorkerDetail() {
  const { id } = useParams();
  const { backendUrl } = useContext(AppContent);

  const [worker, setWorker] = useState(null);
  const [positions, setPositions] = useState([]);
  const [globalTrainings, setGlobalTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [certSearch, setCertSearch] = useState("");

  // ข้อมูลเอกสาร — มีค่า = modal เปิดอยู่
  const [cvData, setCvData] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [skillData, setSkillData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // ── PIN management (Worker App access) ──
  const [pinStatus, setPinStatus] = useState(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [settingPin, setSettingPin] = useState(false);
  const [unlockingPin, setUnlockingPin] = useState(false);
  const [generatedPin, setGeneratedPin] = useState(null); // โชว์ครั้งเดียวหลังตั้งสำเร็จ
  const [customPin, setCustomPin] = useState("");

  // แถบย่อชื่อพนักงาน — โผล่เมื่อเลื่อนจนการ์ดหัวพ้นจอ
  const headerRef = useRef(null);
  const [showMiniHeader, setShowMiniHeader] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMiniHeader(!entry.isIntersecting),
      { rootMargin: "-59px 0px 0px 0px" }, // 59px = ความสูงแถบ MMS ด้านบน
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [worker]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [workerRes, posRes, trainingRes] = await Promise.all([
          axios.get(`${backendUrl}/api/workers/${id}`, {
            withCredentials: true,
          }),
          axios
            .get(`${backendUrl}/api/positions`, { withCredentials: true })
            .catch(() => ({ data: [] })),
          axios
            .get(`${backendUrl}/api/trainings/global`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
        ]);
        setWorker(workerRes.data);
        setPositions(posRes.data || []);
        setGlobalTrainings(trainingRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load worker.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, backendUrl]);

  const fetchPinStatus = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/employees/${id}/pin-status`,
        { withCredentials: true },
      );
      if (res.data.success) setPinStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPinStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, backendUrl]);

  const openPinModal = () => {
    setGeneratedPin(null);
    setCustomPin("");
    setPinModalOpen(true);
  };

  const handleSetPin = async () => {
    try {
      setSettingPin(true);
      const res = await axios.post(
        `${backendUrl}/api/employees/${id}/set-pin`,
        customPin.trim() ? { pin: customPin.trim() } : {},
        { withCredentials: true },
      );
      if (res.data.success) {
        setGeneratedPin(res.data.pin);
        setCustomPin("");
        fetchPinStatus();
      } else {
        alert(res.data.message || "ตั้งค่า PIN ไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSettingPin(false);
    }
  };

  const handleUnlockPin = async () => {
    if (!window.confirm("ปลดล็อกบัญชีนี้?")) return;
    try {
      setUnlockingPin(true);
      const res = await axios.post(
        `${backendUrl}/api/employees/${id}/unlock-pin`,
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        alert("ปลดล็อกบัญชีสำเร็จ");
        fetchPinStatus();
      } else {
        alert(res.data.message || "ปลดล็อกไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setUnlockingPin(false);
    }
  };

  // ── loading / error / not found ──
  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] p-4">
        <div className="rounded-[10px] border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Loading worker data...
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="mx-auto max-w-[1100px] p-4">
        <Link
          to="/workers"
          className="mb-3 inline-block text-[13px] text-gray-500 no-underline hover:text-gray-700"
        >
          ← Back to Workers
        </Link>
        <div className="rounded-[10px] border border-[#f5c6cb] bg-[#f8d7da] p-5 text-sm text-[#842029]">
          {error || "Worker not found"}
        </div>
      </div>
    );
  }

  const w = worker;
  const positionName =
    w.position?.name ||
    positions.find((p) => p.id === w.positionId)?.name ||
    "—";

  const trainingName = (t) =>
    t.globalTraining?.name ||
    globalTrainings.find((g) => g.id === t.globalTrainingId)?.name ||
    t.rawTrainingName ||
    "—";

  const certs = w.trainings || w.certifications || [];
  const filteredCerts = certs.filter((t) => {
    if (!certSearch.trim()) return true;
    return trainingName(t)
      .toString()
      .toLowerCase()
      .includes(certSearch.trim().toLowerCase());
  });

  const medicalRecords = w.medicalChecks || [];
  const medCheck = medicalRecords.find(
    (m) => m.checkType === "Medical Check up",
  );
  const confinedSpace = medicalRecords.find(
    (m) => m.checkType === "Confined Space Entry",
  );
  const medExpiry = expiryInfo(
    medCheck?.expiryDate || confinedSpace?.expiryDate,
  );

  const age = getAge(w.birthDate);
  const retireFlag =
    age != null && age >= RETIREMENT_AGE ? (
      <Badge tone="red">⚠ Over retirement age</Badge>
    ) : age != null && age >= RETIREMENT_AGE - 1 ? (
      <Badge tone="yellow">⚠ Near retirement</Badge>
    ) : null;

  const ppExpiry = expiryInfo(w.passport?.expiryDate);
  const wpExpiry = expiryInfo(w.passport?.workPermitExpiryDate);

  const healthTone = healthRiskTone(w.healthRisk);
  const hasRosterData =
    w.isPermanent || w.healthRisk || w.healthNote || w.sseLevel;
  const hasCvData =
    w.address ||
    w.gender ||
    w.height ||
    w.weight ||
    w.religion ||
    w.language ||
    w.education;

  const deployments = (w.assignments || []).filter((a) => !a.projectId);
  const examRecords = w.medicalExamRecords || [];

  // ── โหลดเอกสาร (CV / Roster / Skill Matrix) ──
  const loadDoc = async (path, setData, failMsg) => {
    try {
      setExportLoading(true);
      const res = await axios.get(`${backendUrl}/api/workers/${id}/${path}`, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert(
        path === "skill-matrix" && err.response?.status === 404
          ? "ไม่พบ Skill Matrix สำหรับตำแหน่งนี้ (ยังไม่มี Position Requirement ผูกไว้)"
          : failMsg,
      );
    } finally {
      setExportLoading(false);
    }
  };

  const openCvSummary = () =>
    loadDoc("cv-summary", setCvData, "โหลด CV Summary ไม่สำเร็จ");
  const openRoster = () =>
    loadDoc("roster-history", setRosterData, "โหลด Roster ไม่สำเร็จ");
  const openSkillMatrix = () =>
    loadDoc("skill-matrix", setSkillData, "โหลด Skill Matrix ไม่สำเร็จ");

  const handleExportSkillMatrixExcel = () => {
    if (!skillData) return;
    exportSkillMatrixExcel({
      title: `${skillData.employee?.fullName ?? ""} — ${skillData.employee?.position ?? ""}`,
      trainings: skillData.trainings,
      rows: skillData.rows,
      fileName: `SkillMatrix_${skillData.employee?.fullName || "export"}.xlsx`,
    });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* Back */}
      <Link
        to="/workers"
        className="mb-2 inline-block text-[13px] text-gray-500 no-underline hover:text-gray-700"
      >
        ← Back to Workers
      </Link>

      {/* ════════ Header Card ════════ */}
      <div
        ref={headerRef}
        className="mb-4 flex flex-col gap-4 rounded-[10px] border border-gray-200 bg-white px-4 py-5 sm:px-6 md:flex-row md:items-start md:justify-between"
      >
        <div className="flex min-w-0 items-start gap-4">
          {w.photoUrl ? (
            <img
              src={`${backendUrl}${w.photoUrl}`}
              alt={w.fullName}
              className="h-[72px] w-[72px] shrink-0 rounded-[10px] border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[10px] bg-gray-100 text-2xl font-bold text-gray-400">
              {(w.fullName || "?").charAt(0)}
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <span className="break-words text-xl font-bold">
                {w.fullName}
              </span>
              {w.empId ? (
                <span
                  className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-600"
                  title="Employee ID — ใช้ login Worker App และอ้างอิงกับ Client"
                >
                  <span className="mr-1 font-sans font-normal text-blue-400">
                    Emp ID:
                  </span>
                  {w.empId}
                </span>
              ) : (
                w.empCode && (
                  <span
                    className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-500"
                    title="ยังไม่มี Employee ID — แสดงรหัสภายในระบบแทน"
                  >
                    {w.empCode}
                  </span>
                )
              )}
              {w.isOffshore && <Badge tone="blue">Offshore</Badge>}
              {w.isPermanent && <Badge tone="green">Permanent</Badge>}
              {retireFlag}
            </div>
            <div className="text-[13px] text-gray-500">
              {w.fullNameTH && <span className="mr-2">{w.fullNameTH}</span>}
              {positionName}
              {w.division ? ` · ${w.division}` : ""}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <MapBadge map={STATUS_MAP} value={w.status} />
              <MapBadge map={AVAILABILITY_MAP} value={w.availabilityStatus} />
              <MapBadge map={MOBILIZATION_MAP} value={w.mobilizationStatus} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <Link
            to={`/workers/${id}/edit`}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-center font-semibold text-white no-underline hover:bg-blue-700"
          >
            ✏️ Edit
          </Link>
          <div className="flex flex-wrap gap-1.5 md:justify-end">
            <button
              onClick={openCvSummary}
              disabled={exportLoading}
              className={EXPORT_BTN}
            >
              📄 CV Summary
            </button>
            <button
              onClick={openRoster}
              disabled={exportLoading}
              className={EXPORT_BTN}
            >
              🛫 Roster
            </button>
            <button
              onClick={openSkillMatrix}
              disabled={exportLoading}
              className={EXPORT_BTN}
            >
              📋 Skill Matrix
            </button>
          </div>
        </div>
      </div>

      {/* ════════ แถบย่อ (sticky) — h-0 จึงไม่กินพื้นที่ตอนซ่อน ════════ */}
      <div className="sticky top-[59px] z-30 h-0">
        <div
          className={`absolute inset-x-0 top-0 flex items-center gap-3 rounded-b-[10px] border border-t-0 border-gray-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur transition-all duration-150 sm:px-6 ${
            showMiniHeader
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          {w.photoUrl ? (
            <img
              src={`${backendUrl}${w.photoUrl}`}
              alt=""
              className="h-8 w-8 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-sm font-bold text-gray-400">
              {(w.fullName || "?").charAt(0)}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="truncate text-[15px] font-bold">{w.fullName}</span>
            {(w.empId || w.empCode) && (
              <span className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-600">
                {w.empId ? (
                  <>
                    <span className="mr-1 font-sans font-normal text-blue-400">
                      Emp ID
                    </span>
                    {w.empId}
                  </>
                ) : (
                  w.empCode
                )}
              </span>
            )}
            <span className="hidden truncate text-xs text-gray-500 md:inline">
              {positionName}
            </span>
          </div>
          <Link
            to={`/workers/${id}/edit`}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-blue-700"
          >
            ✏️ Edit
          </Link>
        </div>
      </div>

      {/* ════════ Section 1: Basic Information ════════ */}
      <div className={CARD}>
        <SectionHeader number="1" title="Basic Information" />
        <div className={BODY}>
          <div className={GRID3}>
            <Field label="ชื่อ-นามสกุล (ภาษาไทย)" value={w.fullNameTH || "—"} />
            <Field label="Employee ID" value={w.empId || "—"} />
            <Field label="Nationality" value={w.nationality || "—"} />
            <Field label="Position / Trade" value={positionName} />
            <Field label="Department" value={w.division || "—"} />
            <Field label="Start Work Date" value={fmtDate(w.startWorkDate)} />
            <Field
              label="Experience"
              value={formatExperience(w.startWorkDate)}
            />
            <Field
              label="Date of Birth"
              value={
                w.birthDate
                  ? `${fmtDate(w.birthDate)}${age != null ? ` (${age} yrs)` : ""}`
                  : "—"
              }
            />
            <Field label="Phone" value={w.phone || "—"} />
            <Field label="Email" value={w.email || "—"} />
          </div>
          {w.notes && (
            <div className="mt-5">
              <span className={LABEL}>Notes</span>
              <div className={NOTE_TEXT}>{w.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* ════════ Section R: Offshore Roster ════════ */}
      <div className={CARD}>
        <SectionHeader
          number="R"
          title="Offshore Roster"
          subtitle="(ข้อมูลติดตัวพนักงาน — Health / SSE / Permanent)"
        />
        <div className={BODY}>
          {!hasRosterData ? (
            <div className={EMPTY_BOX}>
              ยังไม่มีข้อมูล Offshore Roster สำหรับพนักงานคนนี้
            </div>
          ) : (
            <>
              <div className={`${GRID3} mb-4`}>
                <Field label="Permanent Worker">
                  {w.isPermanent ? (
                    <Badge tone="green">🟩 Permanent</Badge>
                  ) : (
                    <Badge tone="gray">Non-Permanent</Badge>
                  )}
                </Field>
                <Field label="Health Risk">
                  {w.healthRisk && healthTone ? (
                    <Badge tone={healthTone}>{w.healthRisk}</Badge>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </Field>
                <Field label="SSE Level">
                  {w.sseLevel && SSE_LABEL[w.sseLevel] ? (
                    <Badge tone={w.sseCompleted ? "blue" : "yellow"}>
                      {SSE_LABEL[w.sseLevel]}
                      {w.sseCompleted ? " ✓ Completed" : " · Not yet"}
                    </Badge>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </Field>
              </div>
              {w.healthNote && (
                <div>
                  <span className={LABEL}>Health Note (หมายเหตุสุขภาพ)</span>
                  <div
                    className={`${NOTE_TEXT} rounded-lg border border-[#ffe69c] bg-[#fffbea] px-3.5 py-3`}
                  >
                    {w.healthNote}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════ Section W: Worker App Access (PIN) ════════ */}
      <div className={CARD}>
        <SectionHeader
          number="🔑"
          title="Worker App Access"
          subtitle="(EMP ID + PIN สำหรับ login เข้า Worker App)"
        />
        <div className={BODY}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <Field label="EMP Id" value={w.empId || "— ยังไม่มี —"} />
              <Field label="สถานะ PIN">
                {!pinStatus ? (
                  <span className="text-gray-500">กำลังโหลด...</span>
                ) : !pinStatus.hasPin ? (
                  <Badge tone="gray">ยังไม่ได้ตั้งค่า</Badge>
                ) : pinStatus.isLocked ? (
                  <Badge tone="red">🔒 ถูกล็อกชั่วคราว</Badge>
                ) : (
                  <Badge tone="green">✓ ตั้งค่าแล้ว</Badge>
                )}
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              {pinStatus?.isLocked && (
                <button
                  onClick={handleUnlockPin}
                  disabled={unlockingPin}
                  className="cursor-pointer whitespace-nowrap rounded-md border border-[#dc3545] bg-white px-3 py-1.5 text-xs text-[#dc3545] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {unlockingPin ? "กำลังปลดล็อก..." : "🔓 ปลดล็อกบัญชี"}
                </button>
              )}
              <button
                onClick={openPinModal}
                disabled={!w.empId}
                title={!w.empId ? "ต้องมี empId ก่อนถึงจะตั้ง PIN ได้" : ""}
                className={`rounded-lg border-none px-4 py-2 text-[13px] font-semibold text-white ${
                  !w.empId
                    ? "cursor-not-allowed bg-gray-400"
                    : "cursor-pointer bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {pinStatus?.hasPin ? "🔄 รีเซ็ต PIN" : "＋ ตั้งค่า PIN"}
              </button>
            </div>
          </div>

          {!w.empId && (
            <div className="mt-3.5 rounded-lg border border-[#ffe69c] bg-[#fff8e1] px-3.5 py-2.5 text-xs text-[#664d03]">
              ⚠ พนักงานคนนี้ยังไม่มี EMP ID — ต้องกรอกในหน้า Edit ก่อน ถึงจะตั้ง
              PIN ให้ login เข้า Worker App ได้
            </div>
          )}
        </div>
      </div>

      {/* ════════ Section P: Personal Details for CV ════════ */}
      <div className={CARD}>
        <SectionHeader
          number="P"
          title="Personal Details for CV"
          subtitle="(ใช้ตอน Generate CV Summary — Allocation)"
        />
        <div className={BODY}>
          {!hasCvData ? (
            <div className={EMPTY_BOX}>
              ยังไม่มีข้อมูล CV สำหรับพนักงานคนนี้
            </div>
          ) : (
            <>
              {w.address && (
                <div className="mb-5">
                  <span className={LABEL}>Address</span>
                  <div
                    className={`${VALUE} whitespace-pre-wrap leading-relaxed`}
                  >
                    {w.address}
                  </div>
                </div>
              )}
              <div className={GRID3}>
                <Field label="Sex" value={GENDER_LABEL[w.gender] || "—"} />
                <Field
                  label="Height"
                  value={w.height ? `${w.height} cm` : "—"}
                />
                <Field
                  label="Weight"
                  value={w.weight ? `${w.weight} kg` : "—"}
                />
                <Field label="Religion" value={w.religion || "—"} />
                <Field label="Language" value={w.language || "—"} />
                <Field label="Education" value={w.education || "—"} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════ Section D: Past Deployment History ════════ */}
      <div className={CARD}>
        <SectionHeader
          number="D"
          title="Past Deployment History"
          subtitle="(Project References ในเรซูเม่)"
        />
        {deployments.length === 0 ? (
          <div className={`${EMPTY_BOX} m-5`}>No past deployment records.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    "CLIENT / PROJECT",
                    "FIELD / PLATFORM",
                    "POSITION",
                    "MOB DATE",
                    "D-MOB DATE",
                  ].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map((a) => {
                  const { client, field } = parseProjectLabel(
                    a.projectLabel,
                    a.platform,
                  );
                  const posName =
                    positions.find((p) => p.id === a.positionId)?.name || "—";
                  return (
                    <tr key={a.id} className="border-t border-gray-100">
                      <td className={`${TD} font-semibold`}>{client || "—"}</td>
                      <td className={`${TD} text-gray-500`}>
                        {field || a.platform || "—"}
                      </td>
                      <td className={TD}>{posName}</td>
                      <td className={`${TD} whitespace-nowrap`}>
                        {fmtDate(a.mobDate)}
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        {fmtDate(a.demobDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════ Section 2: Passport ════════ */}
      <div className={CARD}>
        <SectionHeader number="2" title="Passport Information" />
        <div className={BODY}>
          <div className={GRID3}>
            <Field
              label="Passport Number"
              value={w.passport?.passportNo || "—"}
            />
            <ExpiryField label="Passport Expiry" info={ppExpiry} />
            <div className="hidden lg:block" />
            <Field
              label="Work Permit No."
              value={w.passport?.workPermitNo || "—"}
            />
            <ExpiryField label="Work Permit Expiry" info={wpExpiry} />
          </div>
        </div>
      </div>

      {/* ════════ Section 3: Certifications ════════ */}
      <div className={CARD}>
        <SectionHeader number="3" title="Certifications" />
        <div className={certs.length === 0 ? "p-5" : "px-4 pt-5 sm:px-5"}>
          {certs.length === 0 ? (
            <div className={EMPTY_BOX}>No certifications on record.</div>
          ) : (
            <>
              {certs.length > 5 && (
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="🔍 ค้นหา training / certification..."
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                    className="box-border w-full max-w-[320px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400"
                  />
                  {certSearch && (
                    <span className="text-xs text-gray-500">
                      พบ {filteredCerts.length} จาก {certs.length} รายการ
                    </span>
                  )}
                </div>
              )}
              <div className="mb-5 max-h-[420px] overflow-auto rounded-lg border border-gray-100">
                <table className="w-full min-w-[480px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {["TRAINING / CERTIFICATION", "ISSUED", "EXPIRY"].map(
                        (h) => (
                          <th
                            key={h}
                            className={`${TH} sticky top-0 z-[1] bg-gray-50`}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map((t, i) => {
                      const exp = expiryInfo(t.expiryDate);
                      return (
                        <tr
                          key={t.id || i}
                          className="border-t border-gray-100"
                        >
                          <td className={`${TD} font-semibold`}>
                            {trainingName(t)}
                          </td>
                          <td
                            className={`${TD} whitespace-nowrap text-gray-500`}
                          >
                            {fmtDate(t.completedDate)}
                          </td>
                          <td className={`${TD} ${exp.cls}`}>
                            <span className="font-semibold">{exp.text}</span>
                            {exp.note && (
                              <span className="ml-2 text-[11px]">
                                ({exp.note})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════ Section 4: Medical ════════ */}
      <div className={CARD}>
        <SectionHeader number="4" title="Medical Check-up Record" accent />
        <div className={BODY}>
          {!medCheck && !confinedSpace ? (
            <div className={EMPTY_BOX}>No medical records on record.</div>
          ) : (
            <>
              <div className={`${GRID3} mb-4`}>
                <Field
                  label="Hospital / Clinic"
                  value={medCheck?.hospital || confinedSpace?.hospital || "—"}
                />
                <Field
                  label="Examination Date"
                  value={fmtDate(
                    medCheck?.issuedDate || confinedSpace?.issuedDate,
                  )}
                />
                <ExpiryField label="Expiry Date" info={medExpiry} />
              </div>

              <div className={GRID3}>
                <Field label="Medical Status">
                  {medCheck ? (
                    <MapBadge
                      map={MEDICAL_STATUS_MAP}
                      value={medCheck.status}
                      fallback="N/A"
                    />
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </Field>
                <Field label="Confined Space Medical">
                  {confinedSpace ? (
                    <MapBadge
                      map={MEDICAL_STATUS_MAP}
                      value={confinedSpace.status}
                      fallback="N/A"
                    />
                  ) : (
                    <Badge tone="gray">N/A / Not assessed</Badge>
                  )}
                </Field>
                <div className="hidden lg:block" />
              </div>

              {(medCheck?.notes || confinedSpace?.notes) && (
                <div className="mt-5">
                  <span className={LABEL}>Notes</span>
                  <div className={NOTE_TEXT}>
                    {medCheck?.notes || confinedSpace?.notes}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════ Section 5: PE / Medical Exam Records ════════ */}
      <div className={CARD}>
        <SectionHeader
          number="🏥"
          title="PE / Medical Exam Records"
          subtitle="(ผลตรวจสุขภาพประจำปี)"
        />
        {examRecords.length === 0 ? (
          <div className={`${EMPTY_BOX} m-5`}>
            No medical exam records on file.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    "EXAM DATE",
                    "HEALTH RISK",
                    "RECOMMENDATION",
                    "COMMENT DATE",
                  ].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {examRecords.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className={`${TD} whitespace-nowrap font-semibold`}>
                      {fmtDate(r.examDate)}
                      {r.isLatest && (
                        <span className="ml-2">
                          <Badge tone="green">LATEST</Badge>
                        </span>
                      )}
                    </td>
                    <td className={TD}>{r.healthRisk || "—"}</td>
                    <td className={`${TD} text-gray-500`}>
                      {r.recommendation || "—"}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {fmtDate(r.commentDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          Modals — เอกสารพิมพ์ใช้ component กลางจาก components/print/PrintDocs
          ════════════════════════════════════════════════════ */}

      {/* ── CV Summary ── */}
      {cvData && (
        <PrintModal
          kind="cv"
          printId="cv-print-worker"
          maxW="max-w-[900px]"
          title="📄 CV Summary — Resume"
          onClose={() => setCvData(null)}
        >
          <div className="overflow-x-auto bg-[#e9ecef] p-3 sm:p-5">
            <ResumePage cvData={cvData} backendUrl={backendUrl} />
          </div>
        </PrintModal>
      )}

      {/* ── Roster ── */}
      {rosterData && (
        <PrintModal
          kind="roster"
          printId="roster-print-worker"
          maxW="max-w-[1100px]"
          title="🛫 Roster (MOB/D-MOB)"
          onClose={() => setRosterData(null)}
        >
          <div className="roster-scroll overflow-x-auto p-4 sm:p-6">
            <div className="mb-1 text-lg font-bold">
              {rosterData.employee.fullName}
            </div>
            <div className="mb-4 text-[13px] text-gray-500">
              {w.empId || rosterData.employee.empCode}
              {rosterData.employee.position
                ? ` · ${rosterData.employee.position}`
                : ""}
            </div>

            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f3f5]">
                  {[
                    "Position",
                    "From",
                    "To",
                    "MOB",
                    "D-MOB",
                    "Previous Location",
                    "Remark",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border border-gray-200 px-1.5 py-2 text-left font-bold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rosterData.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-gray-200 p-4 text-center text-gray-400"
                    >
                      ยังไม่มีประวัติ mob/demob
                    </td>
                  </tr>
                ) : (
                  rosterData.rows.map((r, i) => (
                    <tr key={i}>
                      {[
                        r.position ?? "—",
                        r.from ?? "—",
                        r.to ?? "—",
                        r.mobDate ? fmtDate(r.mobDate) : "—",
                        r.demobDate ? fmtDate(r.demobDate) : "—",
                        r.previousLocation ?? "—",
                        r.remark ?? "—",
                      ].map((val, ci) => (
                        <td key={ci} className="border border-gray-200 p-1.5">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PrintModal>
      )}

      {/* ── Skill Matrix ── */}
      {skillData && (
        <PrintModal
          kind="matrix"
          printId="matrix-print-worker"
          maxW="max-w-[95vw]"
          title={`📋 Skill Matrix — ${skillData.employee.fullName}`}
          onClose={() => setSkillData(null)}
          actions={
            <button
              onClick={handleExportSkillMatrixExcel}
              className={EXCEL_BTN}
            >
              📊 Export to Excel
            </button>
          }
        >
          <div className="overflow-x-auto p-4 sm:p-6">
            <div className="mb-4 text-lg font-bold">
              {skillData.employee.fullName} —{" "}
              {skillData.employee.position ?? "—"}
            </div>
            {skillData.trainings.length === 0 ? (
              <div className="text-[13px] text-gray-500">
                ไม่พบ training requirement สำหรับตำแหน่งนี้ (เช็คว่า Training
                Matrix ของตำแหน่งนี้ตั้งไว้แล้วหรือยัง)
              </div>
            ) : (
              <SkillMatrixTable
                trainings={skillData.trainings}
                rows={skillData.rows}
              />
            )}
          </div>
        </PrintModal>
      )}

      {/* ── PIN ── */}
      {pinModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 px-3 pt-10"
            onClick={() => setPinModalOpen(false)}
          >
            <div
              className="flex max-h-[85vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[10px] bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between bg-[#0a3d91] px-5 py-3.5 font-bold text-white">
                <span>🔑 {pinStatus?.hasPin ? "รีเซ็ต" : "ตั้งค่า"} PIN</span>
                <button
                  onClick={() => setPinModalOpen(false)}
                  className="cursor-pointer border-none bg-transparent text-lg text-white"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {generatedPin ? (
                  <>
                    <div className="mb-4 rounded-lg border border-[#a3cfbb] bg-[#d1e7dd] p-5 text-center">
                      <div className="mb-2 text-xs text-[#0f5132]">
                        ตั้งค่า PIN สำเร็จ — แจ้งให้พนักงานทันที (จะไม่แสดงอีก)
                      </div>
                      <div className="font-mono text-[32px] font-extrabold tracking-[6px] text-[#0f5132]">
                        {generatedPin}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      EMP ID สำหรับ login: <strong>{w.empId}</strong>
                    </div>
                    <button
                      onClick={() => setPinModalOpen(false)}
                      className="mt-4 w-full cursor-pointer rounded-lg border-none bg-blue-600 p-2.5 font-semibold text-white hover:bg-blue-700"
                    >
                      ปิด
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <span className={LABEL}>
                        กำหนด PIN เอง (ไม่บังคับ — เว้นว่างเพื่อสุ่มอัตโนมัติ)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={customPin}
                        onChange={(e) =>
                          setCustomPin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="เว้นว่างเพื่อสุ่ม 6 หลัก"
                        className="box-border w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="mb-4 text-xs leading-normal text-gray-500">
                      PIN ต้องเป็นตัวเลข 6 หลัก — ระบบจะแสดง PIN
                      ให้เห็นครั้งเดียวหลังตั้งค่าสำเร็จ (ไม่มีการเก็บ PIN
                      แบบข้อความล้วนไว้ในระบบ)
                    </div>
                    <button
                      onClick={handleSetPin}
                      disabled={settingPin}
                      className={`w-full rounded-lg border-none p-2.5 font-semibold text-white ${
                        settingPin
                          ? "cursor-default bg-gray-400"
                          : "cursor-pointer bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {settingPin ? "กำลังตั้งค่า..." : "ยืนยันตั้งค่า PIN"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
