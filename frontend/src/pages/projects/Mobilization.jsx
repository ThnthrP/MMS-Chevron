import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";
import { useNavigate, useSearchParams } from "react-router-dom";

const DEMOB_DAYS = 28;

// ── tones ──
const TONE = {
  ok: { bg: "#d1e7dd", color: "#0f5132" },
  warn: { bg: "#fff3cd", color: "#664d03" },
  danger: { bg: "#f8d7da", color: "#842029" },
  muted: { bg: "#f1f3f5", color: "#6c757d" },
  info: { bg: "#cfe2ff", color: "#084298" },
};

function Badge({ tone = "muted", children }) {
  const t = TONE[tone] ?? TONE.muted;
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ── helpers ──
function ymd(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  return Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000));
}

function medicalFit(expiry) {
  if (!expiry) return { fit: false, label: "No record", tone: "muted" };
  const d = new Date(expiry);
  if (isNaN(d.getTime()))
    return { fit: false, label: "No record", tone: "muted" };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { fit: false, label: "Overdue", tone: "danger" };
  if (days <= 30) return { fit: true, label: "Due soon", tone: "warn" };
  return { fit: true, label: "Fit", tone: "ok" };
}

const STATUS_TONE = { pending: "warn", ready: "info", deployed: "ok" };
const STATUS_LABEL = {
  pending: "Pending",
  ready: "Ready",
  deployed: "Deployed",
};

export default function Mobilization() {
  const { backendUrl, userData } = useContext(AppContent);
  const navigate = useNavigate();

  const canManageMobilization = ["admin", "manpower"].includes(
    userData?.role?.name,
  );

  const canManageChecklist = [
    "admin",
    "manpower",
    "safety",
    "nurse",
    "ta",
  ].includes(userData?.role?.name);

  const [projects, setProjects] = useState([]);
  //   const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useStickyState(
    "mob_projectId",
    "",
  );
  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [searchParams] = useSearchParams();

  // ← ใหม่: sync selectedProjectId จาก URL query (?projectId=...)
  // เผื่อมีลิงก์จากหน้าอื่น เช่น Allocation ส่งมาตรงๆ หลัง approve ครบ
  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) {
      setSelectedProjectId(pid);
    }
  }, [searchParams]);

  // ← ใหม่: format วันที่แบบสั้น สำหรับ disambiguate project ที่ชื่อซ้ำกัน
  const fmtProjectDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  // ← ใหม่: options สำหรับ Select Project (react-select แทน native <select>)
  const projectOptions = projects.map((p) => {
    const codePart = p.masterProjectRecord?.projectCode
      ? `[${p.masterProjectRecord.projectCode}] `
      : "";
    const startPart = fmtProjectDate(p.startDate);
    const locationPart = p.location || null;
    const idTail = p.id.slice(-6); // ← fallback สุดท้าย กันซ้ำเป๊ะ

    // ── รวม location + startDate เข้าด้วยกัน ไม่ใช่เลือกอันใดอันหนึ่ง ──
    const parts = [];
    if (locationPart) parts.push(locationPart);
    if (startPart) parts.push(`Start ${startPart}`);

    const disambiguator = parts.length > 0 ? parts.join(" · ") : `#${idTail}`;

    return {
      value: p.id,
      label: `${codePart}${p.name} · ${disambiguator}`,
      project: p,
    };
  });

  const projectSelectStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: "#ced4da",
      borderRadius: "8px",
      minHeight: "40px",
      fontSize: "14px",
      boxShadow: "none",
      "&:hover": { borderColor: "#86b7fe" },
    }),
    option: (provided) => ({ ...provided, fontSize: "13px" }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "14px",
      color: "#6c757d",
    }),
    menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
    menu: (provided) => ({
      ...provided,
      minWidth: "560px", // ← กว้างกว่ากล่องด้านบน กันตัวหนังสือตัดคำ
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: "360px", // ← เผื่อ project มีเยอะ scroll ได้
    }),
  };

  // dropdown — reuse allocation projects endpoint
  useEffect(() => {
    axios
      .get(`${backendUrl}/api/allocation/projects`, { withCredentials: true })
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  // ← ใหม่: sync selectedProjectId จาก URL query (?projectId=...)
  // เผื่อมีลิงก์จากหน้าอื่น เช่น Allocation ส่งมาตรงๆ หลัง approve ครบ
  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) {
      setSelectedProjectId(pid);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setRows([]);
      return;
    }
    fetchList(selectedProjectId);
  }, [selectedProjectId]);

  const fetchList = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/mobilization/${projectId}`,
        { withCredentials: true },
      );
      const data = res.data;
      setProject(data.project);

      const freshRows = buildRows(data);

      // ── รักษาค่า mobDate/demobDate/platform ที่พิมพ์ไว้ในเครื่อง
      //    ของคนที่ "ยังไม่ deploy" ไม่ให้ถูกรีเซ็ตทับ ตอนที่ fetchList
      //    ถูกเรียกใหม่จากการ deploy คนอื่นในรายการเดียวกัน ──
      setRows((prevRows) =>
        freshRows.map((freshRow) => {
          if (freshRow.deployed) return freshRow; // คนที่ deploy แล้ว ใช้ค่าจาก server ตรงๆ
          const prev = prevRows.find(
            (r) => r.employeeId === freshRow.employeeId,
          );
          if (!prev || prev.deployed) return freshRow;
          return {
            ...freshRow,
            mobDate: prev.mobDate,
            demobDate: prev.demobDate,
            platform: prev.platform,
          };
        }),
      );
    } catch (err) {
      console.error(err);
      setProject(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const clearProjectDeployments = async () => {
    if (!selectedProjectId) return;
    if (
      !window.confirm(
        "⚠ DEV TOOL: ลบ deployment record ทั้งหมดของ project นี้ทิ้ง?\n" +
          "(ใช้ตอนแก้ position request แล้วมี worker ค้าง deploy อยู่)",
      )
    )
      return;
    try {
      setClearing(true);
      const res = await axios.post(
        `${backendUrl}/api/mobilization/clear-project`,
        { projectId: selectedProjectId },
        { withCredentials: true },
      );
      alert(`ลบ deployment record ${res.data.count} รายการแล้ว`);
      await fetchList(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert("Clear failed — ดู console");
    } finally {
      setClearing(false);
    }
  };

  const PPE_ITEMS = [
    "Workwear",
    "Hardhat Helmets",
    "Welding Helmets",
    "Safety glasses",
    "Goggles",
    "Face shields",
    "Welding face shield",
    "Foot Protection",
    "Hearing Protection",
    "Welding Gloves",
    "G-tech Gloves",
    "Impact Gloves",
    "Half mask",
    "Specialized Protection",
    "Other",
  ];

  const TRAINING_TOPICS = [
    "Safety Oriented",
    "Currently alert case from offshore work",
    "Human performance issue",
    "Knowledge sharing",
    "28 Days plan",
    "Other",
  ];

  const CHECKLIST_DEFS = [
    { type: "alcohol_test", label: "ตรวจแอลกอฮอล์", valueLabel: "ระดับ (mg%)" },
    {
      type: "drug_test",
      label: "ตรวจสารเสพติด",
      note: "ตรวจ 9 สาร: Amphetamines, Methamphetamine, Ecstasy, Benzodiazepines, Cannabinoids, Cocaine Metabolites, Opiates, Phencyclidine, Mitragynine",
    },
    {
      type: "ppe_inspection",
      label: "ตรวจ PPE (Pre-Mob)",
      items: PPE_ITEMS,
      notesLabel: "ระบุอุปกรณ์ Other...",
    },
    {
      type: "pre_field_training",
      label: "อบรมก่อนปฏิบัติงานนอกพื้นที่",
      // items: TRAINING_TOPICS,
      // notesLabel: "ระบุหัวข้อ Other...",
      freeTextItems: TRAINING_TOPICS, // ← ใหม่: แต่ละหัวข้อมีช่องพิมพ์ + เพิ่มของตัวเอง
    },
    {
      type: "baggage_inspection",
      label: "ตรวจกระเป๋า Mob/D-Mob",
      baggageFields: true, // ← ใหม่: trigger custom render แทน generic block
    },
    {
      type: "blood_pressure_check",
      label: "ตรวจความดันโลหิต",
      vitalsFields: true, // ← ใหม่: มี 2 ค่า (BP + Pulse)
    },
  ];

  const RESULT_TONE = { pass: "ok", fail: "danger", not_applicable: "muted" };
  const RESULT_LABEL = { pass: "Pass", fail: "Fail", not_applicable: "N/A" };

  function checklistSummary(checklist = []) {
    const passed = checklist.filter(
      (t) => t.resultStatus === "pass" || t.resultStatus === "not_applicable",
    ).length;
    return { passed, total: checklist.length || CHECKLIST_DEFS.length };
  }

  function checklistComplete(checklist = []) {
    if (!checklist.length) return false;
    return checklist.every(
      (t) => t.resultStatus === "pass" || t.resultStatus === "not_applicable",
    );
  }

  const [checklistModal, setChecklistModal] = useState(null); // row object
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [uploadingTaskId, setUploadingTaskId] = useState(null); // ← ใหม่

  const [otherDraft, setOtherDraft] = useState({}); // { [taskId]: "ข้อความที่กำลังพิมพ์" }

  const updateChecklistTask = async (taskId, patch) => {
    try {
      setSavingTaskId(taskId);
      const res = await axios.patch(
        `${backendUrl}/api/mobilization/task/${taskId}`,
        patch,
        { withCredentials: true },
      );
      // อัปเดต local state ทั้งใน rows และ modal ที่เปิดอยู่
      setRows((prev) =>
        prev.map((r) =>
          r.checklist?.some((t) => t.id === taskId)
            ? {
                ...r,
                checklist: r.checklist.map((t) =>
                  t.id === taskId ? res.data : t,
                ),
              }
            : r,
        ),
      );
      setChecklistModal((prev) =>
        prev
          ? {
              ...prev,
              checklist: prev.checklist.map((t) =>
                t.id === taskId ? res.data : t,
              ),
            }
          : prev,
      );
    } catch (err) {
      console.error(err);
      alert("บันทึกไม่สำเร็จ — ดู console");
    } finally {
      setSavingTaskId(null);
    }
  };

  const uploadTaskPhoto = async (taskId, file) => {
    try {
      setUploadingTaskId(taskId);
      const formData = new FormData();
      formData.append("photo", file);
      const res = await axios.post(
        `${backendUrl}/api/mobilization/task/${taskId}/photo`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      // อัปเดต local state เหมือน updateChecklistTask
      setRows((prev) =>
        prev.map((r) =>
          r.checklist?.some((t) => t.id === taskId)
            ? {
                ...r,
                checklist: r.checklist.map((t) =>
                  t.id === taskId ? res.data : t,
                ),
              }
            : r,
        ),
      );
      setChecklistModal((prev) =>
        prev
          ? {
              ...prev,
              checklist: prev.checklist.map((t) =>
                t.id === taskId ? res.data : t,
              ),
            }
          : prev,
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ — ดู console");
    } finally {
      setUploadingTaskId(null);
    }
  };

  const removeTaskPhoto = async (taskId, photoPath) => {
    if (!window.confirm("ลบรูปนี้?")) return;
    try {
      setUploadingTaskId(taskId);
      const res = await axios.delete(
        `${backendUrl}/api/mobilization/task/${taskId}/photo`,
        {
          withCredentials: true,
          data: { photoPath },
        },
      );
      setRows((prev) =>
        prev.map((r) =>
          r.checklist?.some((t) => t.id === taskId)
            ? {
                ...r,
                checklist: r.checklist.map((t) =>
                  t.id === taskId ? res.data : t,
                ),
              }
            : r,
        ),
      );
      setChecklistModal((prev) =>
        prev
          ? {
              ...prev,
              checklist: prev.checklist.map((t) =>
                t.id === taskId ? res.data : t,
              ),
            }
          : prev,
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "ลบรูปไม่สำเร็จ — ดู console");
    } finally {
      setUploadingTaskId(null);
    }
  };

  const buildRows = (data) => {
    const defaultMob = ymd(data.project.startDate);
    return data.workers.map((w) => {
      const asg = w.assignment;
      const deployed = !!asg;
      const mobDate = asg?.mobDate ? ymd(asg.mobDate) : defaultMob;
      const demobDate = asg?.demobDate
        ? ymd(asg.demobDate)
        : addDays(mobDate, DEMOB_DAYS);
      return {
        ...w,
        mobDate,
        demobDate,
        platform: asg?.platform ?? "",
        deployed,
        deployedAt: asg?.createdAt ?? null,
        checklist: w.checklist ?? [], // ← ใหม่
      };
    });
  };

  // ── derived per row ──
  const isReady = (r) => {
    const med = medicalFit(r.medicalExpiry);
    return (
      checklistComplete(r.checklist) &&
      med.fit &&
      !!r.mobDate &&
      !!r.platform &&
      !r.deployed
    );
  };
  const rowStatus = (r) =>
    r.deployed ? "deployed" : isReady(r) ? "ready" : "pending";

  // ── update (client-side only จนกว่าจะกด deploy) ──
  const updateRow = (employeeId, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.employeeId === employeeId ? { ...r, ...patch } : r)),
    );
  };

  // ── deploy ──
  const deploy = async (targets) => {
    if (!project || !targets.length) return;
    try {
      const res = await axios.post(
        `${backendUrl}/api/mobilization/deploy`,
        {
          projectId: project.id,
          deployments: targets.map((r) => ({
            employeeId: r.employeeId,
            mobDate: r.mobDate,
            demobDate: r.demobDate,
            platform: r.platform,
          })),
        },
        { withCredentials: true },
      );
      await fetchList(project.id);
      if (res.data?.deployed) {
        alert(`Deployed ${res.data.deployed} worker(s) to site ✓`);
      }
    } catch (err) {
      console.error(err);
      alert("Deploy failed — ดู console");
    }
  };

  const deployRow = (employeeId) => {
    const r = rows.find((x) => x.employeeId === employeeId);
    if (r && isReady(r)) deploy([r]);
  };
  const deployAllReady = () => deploy(rows.filter(isReady));

  // ── undeploy → ลบ assignment กลับเป็น pending ──
  const undeployRow = async (employeeId) => {
    if (!project) return;
    if (!window.confirm("ยกเลิกการ deploy คนนี้?")) return;
    try {
      await axios.post(
        `${backendUrl}/api/mobilization/undeploy`,
        { projectId: project.id, employeeId },
        { withCredentials: true },
      );
      await fetchList(project.id);
    } catch (err) {
      console.error(err);
      alert("Undeploy failed — ดู console");
    }
  };

  // ── remove from shortlist → เรียก unapprove เดิมของ Allocation ──
  //   คนนั้นกลับเป็น proposed → หลุดจาก Mobilization, ไป review ใหม่ที่ Allocation
  const removeFromShortlist = async (row) => {
    if (
      !window.confirm(
        `เอา ${row.fullName} ออกจาก shortlist? (กลับไปสถานะ proposed ใน Allocation)`,
      )
    )
      return;
    try {
      await axios.put(
        `${backendUrl}/api/allocation/unapprove`,
        { candidateIds: [row.candidateId], requestId: row.requestId },
        { withCredentials: true },
      );
      await fetchList(project.id);
    } catch (err) {
      console.error(err);
      alert("Remove failed — ดู console");
    }
  };

  const readyCount = useMemo(() => rows.filter(isReady).length, [rows]);
  const deployedCount = useMemo(
    () => rows.filter((r) => r.deployed).length,
    [rows],
  );

  // ── deploy ครบทุกคนในรายการแล้วหรือยัง ──
  const allDeployed = rows.length > 0 && rows.every((r) => r.deployed);

  // ── styles ──
  const card = {
    background: "#fff",
    border: "1px solid #e9ecef",
    borderRadius: "10px",
    overflow: "hidden",
    marginTop: "16px",
  };
  const cardHead = {
    padding: "14px 18px",
    borderBottom: "1px solid #e9ecef",
    fontWeight: 700,
    fontSize: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  };
  const th = {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    borderBottom: "1px solid #e9ecef",
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "10px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #f1f3f5",
    verticalAlign: "middle",
  };
  const input = {
    border: "1px solid #ced4da",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    width: "100%",
    maxWidth: "140px",
  };
  const btnBase = {
    borderRadius: "6px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    background: "#fff",
  };
  const empty = {
    padding: "28px",
    textAlign: "center",
    color: "#6c757d",
    fontSize: "13px",
  };

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* header */}
        <div style={{ ...card, marginTop: 0 }}>
          <div style={{ padding: "18px" }}>
            <div style={{ fontSize: "20px", fontWeight: 800 }}>
              🚀 Mobilization
            </div>
            <div
              style={{ marginTop: "6px", fontSize: "12px", color: "#6c757d" }}
            >
              <span
                style={{
                  background: "#e7e9ec",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontWeight: 700,
                  marginRight: "8px",
                }}
              >
                Phase 4
              </span>
              Steps 10–11: Checklist → Deploy to Site
            </div>
          </div>
        </div>

        {/* project select */}
        <div style={{ ...card, padding: "16px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 320px", maxWidth: "420px" }}>
              <Select
                options={projectOptions}
                styles={projectSelectStyles}
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : null
                }
                menuPosition="fixed"
                value={
                  projectOptions.find((o) => o.value === selectedProjectId) ||
                  null
                }
                onChange={(o) => setSelectedProjectId(o ? o.value : "")}
                placeholder="-- Select Project --"
                isClearable
                noOptionsMessage={() => "No projects found"}
              />
            </div>

            {selectedProjectId && canManageMobilization && (
              <button
                onClick={clearProjectDeployments}
                disabled={clearing}
                title="Dev tool — ลบ deployment record ทั้งหมดของ project นี้ (ใช้ตอนแก้ position request แล้วมี worker ค้าง)"
                style={{
                  background: "#fff",
                  border: "1px solid #dc3545",
                  color: "#dc3545",
                  borderRadius: "8px",
                  padding: "9px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: clearing ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {clearing ? "Clearing..." : "🧹 Clear Deployments (Dev)"}
              </button>
            )}
          </div>

          {project && (
            <div
              style={{ marginTop: "10px", fontSize: "12px", color: "#6c757d" }}
            >
              Start (default MOB):{" "}
              <strong>{ymd(project.startDate) || "—"}</strong> · D-MOB = MOB +{" "}
              {DEMOB_DAYS} วัน
            </div>
          )}
        </div>

        {/* Step 10–11 table */}
        <div style={card}>
          <div style={cardHead}>
            <span>
              Step 10–11: Checklist (PPE · Safety Induction · Medical Fit) →
              Deploy
            </span>
            {project && rows.length > 0 && (
              <span
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <Badge tone="ok">{deployedCount} deployed</Badge>
                <Badge tone="info">{readyCount} ready</Badge>
                {canManageMobilization && (
                  <button
                    onClick={deployAllReady}
                    disabled={readyCount === 0}
                    style={{
                      background: readyCount > 0 ? "#0f5132" : "#e9ecef",
                      color: readyCount > 0 ? "#fff" : "#adb5bd",
                      border: "none",
                      borderRadius: "8px",
                      padding: "7px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: readyCount > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    🚀 Deploy All Ready
                  </button>
                )}

                {allDeployed && (
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      background: "#0d6efd",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "7px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✅ Deploy ครบแล้ว — ดูสรุป Project →
                  </button>
                )}
              </span>
            )}
          </div>

          {loading ? (
            <div style={empty}>Loading…</div>
          ) : !project ? (
            <div style={empty}>Select a project above.</div>
          ) : rows.length === 0 ? (
            <div style={empty}>
              No workers shortlisted. Go to Allocation first.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {/* <th style={th}>Worker</th>
                    <th style={th}>Position</th>
                    <th style={th}>Medical Fit</th>
                    <th style={th}>PPE</th>
                    <th style={th}>Safety Induction</th>
                    <th style={th}>MOB</th>
                    <th style={th}>D-MOB</th>
                    <th style={th}>Platform</th>
                    <th style={th}>Status</th>
                    <th style={th}>Actions</th> */}
                    <th style={th}>Worker</th>
                    <th style={th}>Position Requested</th>
                    <th style={th}>Medical Fit</th>
                    <th style={th}>Pre-Mob Checklist</th>
                    <th style={th}>MOB</th>
                    <th style={th}>D-MOB</th>
                    <th style={th}>Platform</th>
                    <th style={th}>Status</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const med = medicalFit(r.medicalExpiry);
                    const st = rowStatus(r);
                    const locked = r.deployed;
                    const age = calcAge(r.birthDate);
                    return (
                      <tr key={r.employeeId}>
                        <td style={td}>
                          <div style={{ fontWeight: 700 }}>{r.fullName}</div>
                          <div style={{ fontSize: "11px", color: "#6c757d" }}>
                            {r.empCode}
                            {age ? ` · Age ${age}` : ""}
                            {r.employeePosition
                              ? ` · ${r.employeePosition}`
                              : ""}
                          </div>
                        </td>
                        <td style={td}>{r.requestedPosition ?? r.position}</td>

                        <td style={td}>
                          <Badge tone={med.tone}>{med.label}</Badge>
                        </td>

                        <td style={td}>
                          {(() => {
                            const { passed, total } = checklistSummary(
                              r.checklist,
                            );
                            const complete = checklistComplete(r.checklist);
                            return (
                              <button
                                onClick={() => setChecklistModal(r)}
                                disabled={r.deployed}
                                style={{
                                  ...btnBase,
                                  border: `1px solid ${complete ? "#0f5132" : "#dee2e6"}`,
                                  color: complete ? "#0f5132" : "#495057",
                                  background: complete ? "#d1e7dd" : "#fff",
                                  cursor: r.deployed ? "default" : "pointer",
                                }}
                              >
                                {passed}/{total} ✓
                              </button>
                            );
                          })()}
                        </td>

                        <td style={td}>
                          <input
                            type="date"
                            value={r.mobDate || ""}
                            disabled={locked || !canManageMobilization}
                            onChange={(e) =>
                              updateRow(r.employeeId, {
                                mobDate: e.target.value,
                              })
                            }
                            style={input}
                          />
                        </td>

                        <td style={td}>
                          <input
                            type="date"
                            value={r.demobDate || ""}
                            disabled={locked || !canManageMobilization}
                            onChange={(e) =>
                              updateRow(r.employeeId, {
                                demobDate: e.target.value,
                              })
                            }
                            style={input}
                          />
                        </td>

                        <td style={td}>
                          <input
                            type="text"
                            placeholder="e.g. BELQ"
                            value={r.platform}
                            disabled={locked || !canManageMobilization}
                            onChange={(e) =>
                              updateRow(r.employeeId, {
                                platform: e.target.value,
                              })
                            }
                            style={{ ...input, maxWidth: "110px" }}
                          />
                        </td>

                        <td style={td}>
                          <Badge tone={STATUS_TONE[st]}>
                            {STATUS_LABEL[st]}
                          </Badge>
                          {r.deployed && r.deployedAt && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#adb5bd",
                                marginTop: "3px",
                              }}
                            >
                              Deployed {ymd(r.deployedAt)}
                            </div>
                          )}
                        </td>

                        {/* actions */}
                        <td style={td}>
                          {!canManageMobilization ? (
                            <span
                              style={{ fontSize: "11px", color: "#adb5bd" }}
                            >
                              —
                            </span>
                          ) : r.deployed ? (
                            <button
                              onClick={() => undeployRow(r.employeeId)}
                              style={{
                                ...btnBase,
                                border: "1px solid #f5c2c7",
                                color: "#842029",
                              }}
                            >
                              Undeploy
                            </button>
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => deployRow(r.employeeId)}
                                disabled={!isReady(r)}
                                style={{
                                  ...btnBase,
                                  background: isReady(r) ? "#fff" : "#f8f9fa",
                                  border: `1px solid ${isReady(r) ? "#0f5132" : "#dee2e6"}`,
                                  color: isReady(r) ? "#0f5132" : "#adb5bd",
                                  cursor: isReady(r)
                                    ? "pointer"
                                    : "not-allowed",
                                }}
                              >
                                Deploy
                              </button>
                              <button
                                onClick={() => removeFromShortlist(r)}
                                title="เอาออกจาก shortlist (กลับเป็น proposed ใน Allocation)"
                                style={{
                                  ...btnBase,
                                  border: "1px solid #dee2e6",
                                  color: "#6c757d",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {checklistModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setChecklistModal(null)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                width: "100%",
                maxWidth: "560px",
                maxHeight: "85vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  background: "#1e3a5f",
                  color: "#fff",
                  padding: "16px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>
                    📋 Pre-Mob Checklist
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.8 }}>
                    {checklistModal.fullName} · {checklistModal.empCode}
                  </div>
                </div>
                <button
                  onClick={() => setChecklistModal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
                {CHECKLIST_DEFS.map((def) => {
                  const task = checklistModal.checklist.find(
                    (t) => t.taskType === def.type,
                  );
                  if (!task) return null;
                  const saving = savingTaskId === task.id;

                  // ── คำนวณ "resultStatus ที่ควรแสดงจริง" ──
                  //   ถ้า item นี้มี checklist ย่อย (def.items) และติ๊กยังไม่ครบ
                  //   ให้ถือว่ายังไม่มีผลตัดสิน (ไม่แสดง badge ใดๆ) แม้ resultStatus
                  //   จะค้างเป็น "pass" จากตอนติ๊กครบมาก่อนหน้านี้ก็ตาม
                  // const displayResultStatus = (() => {
                  //   if (!def.items) return task.resultStatus;
                  //   const checkedItems = task.itemsChecked ?? [];
                  //   const allChecked = def.items.every((i) =>
                  //     checkedItems.includes(i),
                  //   );
                  //   return allChecked ? task.resultStatus : null;
                  // })();

                  return (
                    <div
                      key={def.type}
                      style={{
                        border: "1px solid #e9ecef",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: "13px" }}>
                            {def.label}
                          </span>
                          {task.resultStatus && (
                            <Badge tone={RESULT_TONE[task.resultStatus]}>
                              {def.baggageFields && task.resultStatus === "fail"
                                ? "Reject"
                                : RESULT_LABEL[task.resultStatus]}
                            </Badge>
                          )}
                        </div>
                        {def.note && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6c757d",
                              marginTop: "4px",
                              lineHeight: 1.5,
                            }}
                          >
                            {def.note}
                          </div>
                        )}
                      </div>
                      {def.baggageFields ? (
                        <>
                          <div style={{ marginBottom: "10px" }}>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#495057",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              จำนวนกระเป๋า (ชิ้น)
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น 2"
                              defaultValue={task.measuredValue ?? ""}
                              disabled={saving || !canManageChecklist}
                              onBlur={(e) => {
                                if (
                                  e.target.value !== (task.measuredValue ?? "")
                                ) {
                                  updateChecklistTask(task.id, {
                                    resultStatus: task.resultStatus ?? "pass",
                                    measuredValue: e.target.value,
                                  });
                                }
                              }}
                              style={{
                                ...input,
                                maxWidth: "none",
                                width: "100%",
                              }}
                            />
                          </div>

                          <div style={{ marginBottom: "10px" }}>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#495057",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Baggage
                            </label>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {[
                                { value: "pass", label: "Pass", tone: "ok" },
                                {
                                  value: "fail",
                                  label: "Reject",
                                  tone: "danger",
                                },
                              ].map((opt) => {
                                const isActive =
                                  task.resultStatus === opt.value;
                                const t = TONE[opt.tone];
                                return (
                                  <button
                                    key={opt.value}
                                    disabled={saving || !canManageChecklist}
                                    onClick={() =>
                                      updateChecklistTask(task.id, {
                                        resultStatus: opt.value,
                                        measuredValue: task.measuredValue,
                                      })
                                    }
                                    style={{
                                      ...btnBase,
                                      flex: 1,
                                      border: `1px solid ${isActive ? t.color : "#dee2e6"}`,
                                      background: isActive ? t.bg : "#fff",
                                      color: isActive ? t.color : "#495057",
                                      cursor: canManageChecklist
                                        ? "pointer"
                                        : "not-allowed",
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#495057",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Dress Code
                            </label>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {[
                                { value: "good", label: "Good", tone: "ok" },
                                {
                                  value: "reject",
                                  label: "Reject",
                                  tone: "danger",
                                },
                              ].map((opt) => {
                                const current = task.itemsChecked?.dressCode;
                                const isActive = current === opt.value;
                                const t = TONE[opt.tone];
                                return (
                                  <button
                                    key={opt.value}
                                    disabled={saving || !canManageChecklist}
                                    onClick={() =>
                                      updateChecklistTask(task.id, {
                                        resultStatus:
                                          task.resultStatus ?? "pass",
                                        itemsChecked: {
                                          ...(task.itemsChecked ?? {}),
                                          dressCode: opt.value,
                                        },
                                      })
                                    }
                                    style={{
                                      ...btnBase,
                                      flex: 1,
                                      border: `1px solid ${isActive ? t.color : "#dee2e6"}`,
                                      background: isActive ? t.bg : "#fff",
                                      color: isActive ? t.color : "#495057",
                                      cursor: canManageChecklist
                                        ? "pointer"
                                        : "not-allowed",
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ── รูปแนบ — เพิ่มได้หลายรูป ── */}
                          {(() => {
                            const photos = Array.isArray(
                              task.itemsChecked?.photos,
                            )
                              ? task.itemsChecked.photos
                              : [];
                            const isUploading = uploadingTaskId === task.id;

                            return (
                              <div
                                style={{
                                  marginTop: "10px",
                                  paddingTop: "10px",
                                  borderTop: "1px dashed #dee2e6",
                                }}
                              >
                                <label
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#495057",
                                    display: "block",
                                    marginBottom: "6px",
                                  }}
                                >
                                  รูปแนบ
                                </label>

                                {photos.length > 0 && (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fill, 64px)",
                                      gap: "8px",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    {photos.map((photoPath, pi) => (
                                      <div
                                        key={pi}
                                        style={{
                                          position: "relative",
                                          width: "64px",
                                          height: "64px",
                                        }}
                                      >
                                        <a
                                          href={`${backendUrl}${photoPath}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          title="ดูรูปเต็ม"
                                        >
                                          <img
                                            src={`${backendUrl}${photoPath}`}
                                            alt={`baggage-${pi}`}
                                            style={{
                                              width: "64px",
                                              height: "64px",
                                              objectFit: "cover",
                                              borderRadius: "6px",
                                              border: "1px solid #dee2e6",
                                              display: "block",
                                            }}
                                          />
                                        </a>
                                        {canManageChecklist && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeTaskPhoto(
                                                task.id,
                                                photoPath,
                                              )
                                            }
                                            disabled={isUploading}
                                            title="ลบรูปนี้"
                                            style={{
                                              position: "absolute",
                                              top: "-6px",
                                              right: "-6px",
                                              width: "18px",
                                              height: "18px",
                                              borderRadius: "50%",
                                              background: "#dc3545",
                                              color: "#fff",
                                              border: "2px solid #fff",
                                              fontSize: "10px",
                                              lineHeight: 1,
                                              cursor: isUploading
                                                ? "not-allowed"
                                                : "pointer",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              padding: 0,
                                            }}
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {canManageChecklist && (
                                  <label
                                    style={{
                                      ...btnBase,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      border: "1px solid #dee2e6",
                                      color: isUploading
                                        ? "#adb5bd"
                                        : "#495057",
                                      cursor: isUploading
                                        ? "not-allowed"
                                        : "pointer",
                                    }}
                                  >
                                    {isUploading
                                      ? "กำลังอัปโหลด..."
                                      : "📷 แนบรูป"}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/webp"
                                      disabled={isUploading}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          uploadTaskPhoto(task.id, file);
                                        }
                                        e.target.value = ""; // เคลียร์ input เผื่ออัปโหลดไฟล์ชื่อซ้ำติดกัน
                                      }}
                                      style={{ display: "none" }}
                                    />
                                  </label>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      ) : def.vitalsFields ? (
                        <>
                          {/* ปุ่ม Pass/Fail/N/A ทั่วไป — ย้ายขึ้นมาบนสุด ให้ตรงกับ task อื่น */}
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              marginBottom: "10px",
                            }}
                          >
                            {["pass", "fail", "not_applicable"].map((val) => {
                              const isActive = task.resultStatus === val;
                              const activeTone = TONE[RESULT_TONE[val]];
                              return (
                                <button
                                  key={val}
                                  disabled={saving || !canManageChecklist}
                                  onClick={() =>
                                    updateChecklistTask(task.id, {
                                      resultStatus: val,
                                      measuredValue: task.measuredValue,
                                    })
                                  }
                                  style={{
                                    ...btnBase,
                                    flex: 1,
                                    border: `1px solid ${isActive ? activeTone.color : "#dee2e6"}`,
                                    background: isActive
                                      ? activeTone.bg
                                      : "#fff",
                                    color: isActive
                                      ? activeTone.color
                                      : "#495057",
                                    cursor: canManageChecklist
                                      ? "pointer"
                                      : "not-allowed",
                                  }}
                                >
                                  {RESULT_LABEL[val]}
                                </button>
                              );
                            })}
                          </div>

                          {/* ค่าความดันโลหิต */}
                          <div style={{ marginBottom: "10px" }}>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#495057",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              ค่าความดันโลหิต (mm.Hg)
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น 120/80"
                              defaultValue={task.measuredValue ?? ""}
                              disabled={saving || !canManageChecklist}
                              onBlur={(e) => {
                                if (
                                  e.target.value !== (task.measuredValue ?? "")
                                ) {
                                  updateChecklistTask(task.id, {
                                    measuredValue: e.target.value,
                                  });
                                }
                              }}
                              style={{
                                ...input,
                                maxWidth: "none",
                                width: "100%",
                              }}
                            />
                          </div>

                          {/* ชีพจร (ครั้ง/นาที) */}
                          <div style={{ marginBottom: "10px" }}>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#495057",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              ชีพจร (ครั้ง/นาที)
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น 72"
                              defaultValue={task.itemsChecked?.pulseRate ?? ""}
                              disabled={saving || !canManageChecklist}
                              onBlur={(e) => {
                                if (
                                  e.target.value !==
                                  (task.itemsChecked?.pulseRate ?? "")
                                ) {
                                  updateChecklistTask(task.id, {
                                    itemsChecked: {
                                      ...(task.itemsChecked ?? {}),
                                      pulseRate: e.target.value,
                                    },
                                  });
                                }
                              }}
                              style={{
                                ...input,
                                maxWidth: "none",
                                width: "100%",
                              }}
                            />
                          </div>
                        </>
                      ) : def.freeTextItems ? (
                        <>
                          {/* Pass/Fail/N/A — manual เท่านั้น เพราะแต่ละหัวข้อเป็น free text ไม่มี "ครบ = pass" อัตโนมัติ */}
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              marginBottom: "10px",
                            }}
                          >
                            {["pass", "fail", "not_applicable"].map((val) => {
                              const isActive = task.resultStatus === val;
                              const activeTone = TONE[RESULT_TONE[val]];
                              return (
                                <button
                                  key={val}
                                  disabled={saving || !canManageChecklist}
                                  onClick={() =>
                                    updateChecklistTask(task.id, {
                                      resultStatus: val,
                                    })
                                  }
                                  style={{
                                    ...btnBase,
                                    flex: 1,
                                    border: `1px solid ${isActive ? activeTone.color : "#dee2e6"}`,
                                    background: isActive
                                      ? activeTone.bg
                                      : "#fff",
                                    color: isActive
                                      ? activeTone.color
                                      : "#495057",
                                    cursor: canManageChecklist
                                      ? "pointer"
                                      : "not-allowed",
                                  }}
                                >
                                  {RESULT_LABEL[val]}
                                </button>
                              );
                            })}
                          </div>

                          {/* ── แต่ละหัวข้อ เรียงคอลัมน์เดียว ตามลำดับ (Other อยู่ท้ายสุด) ── */}
                          {def.freeTextItems.map((topicName) => {
                            const topicData =
                              task.itemsChecked?.[topicName] ?? {};
                            const entries = Array.isArray(topicData.entries)
                              ? topicData.entries
                              : [];
                            const draftKey = `${task.id}:${topicName}`;
                            const draftValue = otherDraft[draftKey] ?? "";

                            const commitEntries = (nextEntries) => {
                              updateChecklistTask(task.id, {
                                itemsChecked: {
                                  ...(task.itemsChecked ?? {}),
                                  [topicName]: { entries: nextEntries },
                                },
                              });
                            };

                            const addItem = () => {
                              const v = draftValue.trim();
                              if (!v) return;
                              commitEntries([...entries, v]);
                              setOtherDraft((prev) => ({
                                ...prev,
                                [draftKey]: "",
                              }));
                            };

                            const removeItem = (idx) => {
                              commitEntries(
                                entries.filter((_, i) => i !== idx),
                              );
                            };

                            return (
                              <div
                                key={topicName}
                                style={{
                                  marginBottom: "12px",
                                  paddingBottom: "12px",
                                  borderBottom: "1px dashed #dee2e6",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#495057",
                                    marginBottom: "8px",
                                  }}
                                >
                                  {topicName}
                                </div>

                                {entries.length > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    {entries.map((item, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          background: "#f8f9fa",
                                          borderRadius: "6px",
                                          padding: "5px 8px",
                                          fontSize: "12px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: "#6c757d",
                                            minWidth: "16px",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {idx + 1}.
                                        </span>
                                        <span style={{ flex: 1 }}>{item}</span>
                                        {canManageChecklist && (
                                          <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            disabled={saving}
                                            title="ลบรายการนี้"
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "#dc3545",
                                              cursor: "pointer",
                                              fontSize: "13px",
                                              padding: 0,
                                              lineHeight: 1,
                                            }}
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {canManageChecklist && (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <input
                                      type="text"
                                      placeholder={`ระบุหัวข้อย่อยของ ${topicName}...`}
                                      value={draftValue}
                                      disabled={saving}
                                      onChange={(e) =>
                                        setOtherDraft((prev) => ({
                                          ...prev,
                                          [draftKey]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          addItem();
                                        }
                                      }}
                                      style={{
                                        ...input,
                                        maxWidth: "none",
                                        flex: 1,
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={addItem}
                                      disabled={saving || !draftValue.trim()}
                                      style={{
                                        ...btnBase,
                                        border: "1px solid #0d6efd",
                                        color: "#0d6efd",
                                        cursor:
                                          saving || !draftValue.trim()
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      + เพิ่ม
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {/* ← เพิ่มกลับตรงนี้ */}
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              marginBottom: def.valueLabel ? "8px" : 0,
                            }}
                          >
                            {["pass", "fail", "not_applicable"].map((val) => {
                              const itemsIncomplete =
                                def.items &&
                                val === "pass" &&
                                !def.items
                                  .filter((i) => i !== "Other")
                                  .every((i) =>
                                    (task.itemsChecked ?? []).includes(i),
                                  );
                              const isActive = task.resultStatus === val;
                              const activeTone = TONE[RESULT_TONE[val]];
                              return (
                                <button
                                  key={val}
                                  disabled={
                                    saving ||
                                    !canManageChecklist ||
                                    itemsIncomplete
                                  }
                                  title={
                                    itemsIncomplete
                                      ? "ติ๊กให้ครบทุกชิ้นก่อนถึงจะกด Pass ได้"
                                      : undefined
                                  }
                                  onClick={() =>
                                    updateChecklistTask(task.id, {
                                      resultStatus: val,
                                      measuredValue: task.measuredValue,
                                    })
                                  }
                                  style={{
                                    ...btnBase,
                                    flex: 1,
                                    opacity: itemsIncomplete ? 0.5 : 1,
                                    border: `1px solid ${isActive ? activeTone.color : "#dee2e6"}`,
                                    background: isActive
                                      ? activeTone.bg
                                      : "#fff",
                                    color: isActive
                                      ? activeTone.color
                                      : "#495057",
                                    cursor:
                                      canManageChecklist && !itemsIncomplete
                                        ? "pointer"
                                        : "not-allowed",
                                  }}
                                >
                                  {RESULT_LABEL[val]}
                                </button>
                              );
                            })}
                          </div>
                          {def.valueLabel && (
                            <div style={{ marginTop: "8px" }}>
                              <label
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#495057",
                                  display: "block",
                                  marginBottom: "4px",
                                }}
                              >
                                {def.valueLabel}
                              </label>
                              <input
                                type="text"
                                placeholder={def.valueLabel}
                                defaultValue={task.measuredValue ?? ""}
                                disabled={saving || !canManageChecklist}
                                onBlur={(e) => {
                                  if (
                                    e.target.value !==
                                    (task.measuredValue ?? "")
                                  ) {
                                    updateChecklistTask(task.id, {
                                      measuredValue: e.target.value,
                                    });
                                  }
                                }}
                                style={{
                                  ...input,
                                  maxWidth: "none",
                                  width: "100%",
                                }}
                              />
                            </div>
                          )}
                          {def.items && (
                            <>
                              {(() => {
                                const checkedItems = task.itemsChecked ?? [];
                                const selectableItems = def.items.filter(
                                  (i) => i !== "Other",
                                );
                                const allSelected = selectableItems.every((i) =>
                                  checkedItems.includes(i),
                                );

                                return (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "flex-end",
                                      marginTop: "4px",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      disabled={saving || !canManageChecklist}
                                      onClick={() => {
                                        const next = allSelected
                                          ? checkedItems.filter(
                                              (i) =>
                                                !selectableItems.includes(i),
                                            )
                                          : Array.from(
                                              new Set([
                                                ...checkedItems,
                                                ...selectableItems,
                                              ]),
                                            );
                                        const allRequiredChecked =
                                          selectableItems.every((i) =>
                                            next.includes(i),
                                          );
                                        const patch = { itemsChecked: next };
                                        if (allRequiredChecked)
                                          patch.resultStatus = "pass";
                                        updateChecklistTask(task.id, patch);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: canManageChecklist
                                          ? "#0d6efd"
                                          : "#adb5bd",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        cursor: canManageChecklist
                                          ? "pointer"
                                          : "not-allowed",
                                        padding: 0,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {allSelected
                                        ? "ยกเลิกทั้งหมด"
                                        : "เลือกทั้งหมด"}
                                    </button>
                                  </div>
                                );
                              })()}

                              {/* ── รายการหลัก (ไม่รวม Other) — grid 2 คอลัมน์ ── */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "6px",
                                }}
                              >
                                {def.items
                                  .filter((i) => i !== "Other")
                                  .map((itemName) => {
                                    const checkedItems =
                                      task.itemsChecked ?? [];
                                    const isChecked =
                                      checkedItems.includes(itemName);
                                    return (
                                      <label
                                        key={itemName}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          fontSize: "12px",
                                          color: "#495057",
                                          cursor: canManageChecklist
                                            ? "pointer"
                                            : "default",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={
                                            saving || !canManageChecklist
                                          }
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...checkedItems, itemName]
                                              : checkedItems.filter(
                                                  (i) => i !== itemName,
                                                );

                                            const selectableItems =
                                              def.items.filter(
                                                (i) => i !== "Other",
                                              );
                                            const allRequiredChecked =
                                              selectableItems.every((i) =>
                                                next.includes(i),
                                              );

                                            const patch = {
                                              itemsChecked: next,
                                            };
                                            if (allRequiredChecked)
                                              patch.resultStatus = "pass";
                                            updateChecklistTask(task.id, patch);
                                          }}
                                        />
                                        {itemName}
                                      </label>
                                    );
                                  })}
                              </div>

                              {/* ── Other — พิมพ์เพิ่มได้หลายรายการ ── */}
                              {def.items.includes("Other") &&
                                (() => {
                                  const checkedItems = task.itemsChecked ?? [];
                                  const otherChecked =
                                    checkedItems.includes("Other");
                                  const otherItems = (task.notes || "")
                                    .split("\n")
                                    .map((s) => s.trim())
                                    .filter(Boolean);
                                  const draftValue = otherDraft[task.id] ?? "";

                                  const commitItems = (nextItems) => {
                                    updateChecklistTask(task.id, {
                                      resultStatus: task.resultStatus ?? "pass",
                                      notes: nextItems.join("\n"),
                                    });
                                  };

                                  const addItem = () => {
                                    const v = draftValue.trim();
                                    if (!v) return;
                                    commitItems([...otherItems, v]);
                                    setOtherDraft((prev) => ({
                                      ...prev,
                                      [task.id]: "",
                                    }));
                                  };

                                  const removeItem = (idx) => {
                                    commitItems(
                                      otherItems.filter((_, i) => i !== idx),
                                    );
                                  };

                                  return (
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        paddingTop: "8px",
                                        borderTop: "1px dashed #dee2e6",
                                      }}
                                    >
                                      <label
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          fontSize: "12px",
                                          color: "#495057",
                                          cursor: canManageChecklist
                                            ? "pointer"
                                            : "default",
                                          marginBottom: otherChecked
                                            ? "8px"
                                            : 0,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={otherChecked}
                                          disabled={
                                            saving || !canManageChecklist
                                          }
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...checkedItems, "Other"]
                                              : checkedItems.filter(
                                                  (i) => i !== "Other",
                                                );

                                            const selectableItems =
                                              def.items.filter(
                                                (i) => i !== "Other",
                                              );
                                            const allRequiredChecked =
                                              selectableItems.every((i) =>
                                                next.includes(i),
                                              );

                                            const patch = {
                                              itemsChecked: next,
                                            };
                                            if (allRequiredChecked)
                                              patch.resultStatus = "pass";
                                            updateChecklistTask(task.id, patch);
                                          }}
                                        />
                                        Other
                                      </label>

                                      {otherChecked && (
                                        <div>
                                          {/* ── รายการที่เพิ่มแล้ว ── */}
                                          {otherItems.length > 0 && (
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                                marginBottom: "8px",
                                              }}
                                            >
                                              {otherItems.map((item, idx) => (
                                                <div
                                                  key={idx}
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    background: "#f8f9fa",
                                                    borderRadius: "6px",
                                                    padding: "5px 8px",
                                                    fontSize: "12px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      color: "#6c757d",
                                                      minWidth: "16px",
                                                      flexShrink: 0,
                                                    }}
                                                  >
                                                    {idx + 1}.
                                                  </span>
                                                  <span style={{ flex: 1 }}>
                                                    {item}
                                                  </span>
                                                  {canManageChecklist && (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        removeItem(idx)
                                                      }
                                                      disabled={saving}
                                                      title="ลบรายการนี้"
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#dc3545",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        padding: 0,
                                                        lineHeight: 1,
                                                      }}
                                                    >
                                                      ✕
                                                    </button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* ── ช่องพิมพ์เพิ่มรายการใหม่ ── */}
                                          {canManageChecklist && (
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "6px",
                                              }}
                                            >
                                              <input
                                                type="text"
                                                placeholder={
                                                  def.notesLabel ||
                                                  "พิมพ์รายการ..."
                                                }
                                                value={draftValue}
                                                disabled={saving}
                                                onChange={(e) =>
                                                  setOtherDraft((prev) => ({
                                                    ...prev,
                                                    [task.id]: e.target.value,
                                                  }))
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addItem();
                                                  }
                                                }}
                                                style={{
                                                  ...input,
                                                  maxWidth: "none",
                                                  flex: 1,
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={addItem}
                                                disabled={
                                                  saving || !draftValue.trim()
                                                }
                                                style={{
                                                  ...btnBase,
                                                  border: "1px solid #0d6efd",
                                                  color: "#0d6efd",
                                                  cursor:
                                                    saving || !draftValue.trim()
                                                      ? "not-allowed"
                                                      : "pointer",
                                                }}
                                              >
                                                + เพิ่ม
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                            </>
                          )}
                        </>
                      )}
                      {task.checkedAt && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#adb5bd",
                            marginTop: "6px",
                          }}
                        >
                          Checked{" "}
                          {new Date(task.checkedAt).toLocaleString("th-TH")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  padding: "14px 24px",
                  borderTop: "1px solid #dee2e6",
                  textAlign: "right",
                }}
              >
                <button
                  onClick={() => setChecklistModal(null)}
                  style={{
                    padding: "8px 24px",
                    fontSize: "13px",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
