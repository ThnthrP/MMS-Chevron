import { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";

// อายุเกษียณ (ปรับได้ตามนโยบายบริษัท)
const RETIREMENT_AGE = 60;

// ── roster maps ──
const HEALTH_MAP = {
  low: { label: "ต่ำ", bg: "#d1e7dd", color: "#0f5132" },
  medium: { label: "ปานกลาง", bg: "#fff3cd", color: "#664d03" },
  high: { label: "สูง", bg: "#f8d7da", color: "#842029" },
};
const SSE_LABEL = { new_sse: "NEW SSE", sse1: "SSE1", sse2: "SSE2" };

export default function Allocation() {
  const { backendUrl } = useContext(AppContent);
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  // const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useStickyState(
    "alloc_projectId",
    "",
  );
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useStickyState(
    "alloc_requestId",
    "",
  ); // ← เพิ่มใหม่
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [shortlist, setShortlist] = useState([]);
  const [loadingShortlist, setLoadingShortlist] = useState(false);
  // state
  const [eligibilityModal, setEligibilityModal] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [activeClientTab, setActiveClientTab] = useState(0);
  const [completedExpanded, setCompletedExpanded] = useState({});
  const [workerSearch, setWorkerSearch] = useState(""); // ค้นหาในผลลัพธ์ (ชื่อ / empCode)
  // const [sortBy, setSortBy] = useState("dayoff"); // "match" | "dayoff"
  const [sortBy, setSortBy] = useStickyState("alloc_sortBy", "dayoff");
  // const [empType, setEmpType] = useState("permanent"); // "permanent" | "nonpermanent" | "all"
  const [empType, setEmpType] = useStickyState("alloc_empType", "permanent");
  const [healthNoteModal, setHealthNoteModal] = useState(null);
  const [cvModal, setCvModal] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  // useEffect(() => {
  //   if (selectedProjectId) {
  //     const proj = projects.find((p) => p.id === selectedProjectId);
  //     setSelectedProject(proj || null);
  //     setSelectedRequest(null);
  //     setWorkers([]);
  //     setSelectedWorkerIds([]);
  //     fetchShortlist(selectedProjectId);
  //   }
  // }, [selectedProjectId, projects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      return;
    }
    const proj = projects.find((p) => p.id === selectedProjectId);
    setSelectedProject(proj || null);
    if (proj) {
      fetchShortlist(selectedProjectId);
      // restore request ที่เคยเลือก (จาก sessionStorage)
      if (selectedRequestId && !selectedRequest) {
        const req = proj.requests?.find((r) => r.id === selectedRequestId);
        if (req) setSelectedRequest(req);
      }
    }
  }, [selectedProjectId, projects]);

  // auto-fetch workers ครั้งเดียวตอน restore (project + request ครบ)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (selectedProject && selectedRequest) {
      restoredRef.current = true;
      handleFindWorkers();
    }
  }, [selectedProject, selectedRequest]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/allocation/projects`, {
        withCredentials: true,
      });
      setProjects(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchShortlist = async (projectId) => {
    try {
      setLoadingShortlist(true);
      const res = await axios.get(
        `${backendUrl}/api/allocation/shortlist/${projectId}`,
        { withCredentials: true },
      );
      setShortlist(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingShortlist(false);
    }
  };

  const handleFindWorkers = async () => {
    if (!selectedRequest) return;
    try {
      setLoadingWorkers(true);
      setSelectedWorkerIds([]);
      const res = await axios.get(`${backendUrl}/api/allocation/workers`, {
        withCredentials: true,
        params: {
          positionId: selectedRequest.position?.id,
          requestId: selectedRequest.id,
          contractId: selectedProject?.contractId, // ← ส่ง contractId เพื่อ check Training Matrix
        },
      });
      setWorkers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const toggleWorker = (id) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const permCount = workers.filter((w) => w.isPermanent).length;

  // กรอง (type + คำค้น) แล้วเรียง: Permanent ก่อนเสมอ → ตามเกณฑ์ที่เลือก
  const displayedWorkers = [...workers]
    .filter((w) => {
      if (empType === "permanent" && !w.isPermanent) return false;
      if (empType === "nonpermanent" && w.isPermanent) return false;
      const q = workerSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (w.fullName || "").toLowerCase().includes(q) ||
        (w.empCode || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Permanent ขึ้นก่อนเสมอ (แม้ในโหมด All)
      if (!!a.isPermanent !== !!b.isPermanent) return a.isPermanent ? -1 : 1;
      if (sortBy === "dayoff") {
        // พักนานสุดขึ้นก่อน; คนไม่เคย deploy (null) ไปท้าย
        const av = a.dayOff ?? -Infinity;
        const bv = b.dayOff ?? -Infinity;
        return bv - av;
      }
      return (b.matchPct ?? -1) - (a.matchPct ?? -1);
    });

  // select-all ทำงานกับรายการที่แสดงอยู่ (หลังกรอง)
  const allDisplayedSelected =
    displayedWorkers.length > 0 &&
    displayedWorkers.every((w) => selectedWorkerIds.includes(w.id));

  const toggleAll = () => {
    if (allDisplayedSelected) {
      const ids = new Set(displayedWorkers.map((w) => w.id));
      setSelectedWorkerIds((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedWorkerIds((prev) => [
        ...new Set([...prev, ...displayedWorkers.map((w) => w.id)]),
      ]);
    }
  };

  const handleAddToShortlist = async () => {
    if (!selectedRequest?.id || selectedWorkerIds.length === 0) return;
    try {
      await axios.post(
        `${backendUrl}/api/allocation/shortlist`,
        { requestId: selectedRequest.id, employeeIds: selectedWorkerIds },
        { withCredentials: true },
      );
      setSelectedWorkerIds([]);
      fetchShortlist(selectedProjectId);
      handleFindWorkers(); // refresh workers list (exclude ที่เพิ่งเพิ่ม)
    } catch (error) {
      console.error(error);
    }
  };

  const handleApprove = async (candidateIds, requestId) => {
    if (!candidateIds?.length) return;
    try {
      await axios.put(
        `${backendUrl}/api/allocation/approve`,
        { candidateIds, requestId },
        { withCredentials: true },
      );
      fetchShortlist(selectedProjectId);
    } catch (error) {
      console.error(error);
    }
  };

  // ยกเลิก approve → กลับเป็น proposed
  const handleUnapprove = async (candidateIds, requestId) => {
    if (!candidateIds?.length) return;
    try {
      await axios.put(
        `${backendUrl}/api/allocation/unapprove`,
        { candidateIds, requestId },
        { withCredentials: true },
      );
      fetchShortlist(selectedProjectId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveFromShortlist = async (candidateId) => {
    try {
      await axios.delete(
        `${backendUrl}/api/allocation/candidate/${candidateId}`,
        { withCredentials: true },
      );
      fetchShortlist(selectedProjectId);
      if (selectedRequest) handleFindWorkers();
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateCv = async () => {
    if (!selectedProjectId || totalShortlisted === 0) return;
    try {
      setCvLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/allocation/cv-summary/${selectedProjectId}`,
        { withCredentials: true },
      );
      setCvModal(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setCvLoading(false);
    }
  };

  // handler
  const handleViewEligibility = async (worker) => {
    try {
      setEligibilityLoading(true);
      setActiveClientTab(0);
      setCompletedExpanded({});
      const res = await axios.get(
        `${backendUrl}/api/allocation/eligibility/${worker.id}`,
        { withCredentials: true },
      );
      setEligibilityModal(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const getMobilizationBadge = (s) => {
    if (s === "ready")
      return { bg: "#d1e7dd", color: "#0f5132", label: "Ready" };
    if (s === "on_site")
      return { bg: "#cfe2ff", color: "#084298", label: "On-Site" };
    if (s === "pending")
      return { bg: "#fff3cd", color: "#664d03", label: "Pending" };
    return { bg: "#e9ecef", color: "#6c757d", label: s || "—" };
  };

  // ── Experience: คำนวณอายุงานจาก startWorkDate ──
  const formatExperience = (startWorkDate) => {
    if (!startWorkDate) return null;
    const start = new Date(startWorkDate);
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    let months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    if (months < 0) return null;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years === 0) return `${remMonths} mo`;
    if (remMonths === 0) return `${years} yr`;
    return `${years}y ${remMonths}m`;
  };

  // ── Retirement: เตือนเมื่อใกล้/เกินอายุเกษียณ (จาก birthDate) ──
  // แสดง flag เฉพาะเมื่อเกษียณภายใน 12 เดือน หรือเกินอายุแล้ว
  const getRetirementInfo = (birthDate) => {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    const retireDate = new Date(dob);
    retireDate.setFullYear(dob.getFullYear() + RETIREMENT_AGE);
    let monthsLeft =
      (retireDate.getFullYear() - now.getFullYear()) * 12 +
      (retireDate.getMonth() - now.getMonth());
    if (now.getDate() > retireDate.getDate()) monthsLeft -= 1;
    if (monthsLeft <= 0) {
      return {
        label: "⚠ Over retirement age",
        bg: "#f8d7da",
        color: "#842029",
      };
    }
    if (monthsLeft <= 6) {
      return {
        label: `⚠ Retires in ${monthsLeft} mo`,
        bg: "#ffe0b2",
        color: "#8a4b00",
      };
    }
    if (monthsLeft <= 12) {
      return {
        label: `⚠ Retires in ${monthsLeft} mo`,
        bg: "#fff3cd",
        color: "#664d03",
      };
    }
    return null;
  };

  // ── Day Off (REST): จาก backend (today − demobDate ของ Assignment ล่าสุด) ──
  const renderDayOff = (dayOff) => {
    if (dayOff === null || dayOff === undefined)
      return <span style={{ color: "#adb5bd" }}>—</span>;
    if (dayOff < 0)
      return (
        <span
          style={{ color: "#dc3545", fontWeight: 600 }}
          title={`ยังไม่ถึง D-MOB อีก ${Math.abs(dayOff)} วัน (ยังอยู่บนแท่น)`}
        >
          {dayOff}d
        </span>
      );
    // พักนาน = ว่างมาก: >30 เขียว, 15-30 น้ำเงิน, 0-14 เทา
    const color =
      dayOff > 30 ? "#198754" : dayOff >= 15 ? "#0d6efd" : "#6c757d";
    return (
      <span
        style={{ color, fontWeight: 600 }}
        title={`พักมาแล้ว ${dayOff} วัน (พ้น D-MOB)`}
      >
        {dayOff}d off
      </span>
    );
  };

  // ── Medical: status + expiry (คิดจากวันหมดอายุ ให้เหมือนหน้า Compliance) ──
  const renderMedical = (expiry) => {
    if (!expiry) return <span style={{ color: "#adb5bd" }}>—</span>;
    const d = new Date(expiry);
    if (isNaN(d.getTime())) return <span style={{ color: "#adb5bd" }}>—</span>;
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    let label, bg, color;
    if (days < 0) {
      label = "Overdue";
      bg = "#f8d7da";
      color = "#842029";
    } else if (days <= 30) {
      label = "Due soon";
      bg = "#fff3cd";
      color = "#664d03";
    } else {
      label = "Fit";
      bg = "#d1e7dd";
      color = "#0f5132";
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "2px",
        }}
      >
        <span
          style={{
            background: bg,
            color,
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "10px", color: "#6c757d" }}>
          Exp{" "}
          {d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    );
  };

  const totalShortlisted = shortlist.reduce(
    (sum, r) => sum + (r.candidates?.length ?? 0),
    0,
  );

  // หาจำนวน shortlisted ของ request ที่เลือกอยู่
  const currentRequestShortlisted = selectedRequest
    ? (shortlist.find((s) => s.requestId === selectedRequest.id)?.candidates
        ?.length ?? 0)
    : 0;
  const remaining = selectedRequest
    ? Math.max(0, selectedRequest.quantity - currentRequestShortlisted)
    : 0;

  const requestOptions =
    selectedProject?.requests?.map((r) => ({
      value: r.id,
      label: `${r.position?.name} × ${r.quantity}`,
      request: r,
    })) ?? [];

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
    menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
  };

  return (
    <div className="container-fluid p-4">
      <div style={{ width: "100%" }}>
        {/* Header Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>👥</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Worker Allocation
            </span>
            <span
              style={{
                background: "#e9f5fb",
                color: "#0d6efd",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Phase 3
            </span>
            <span style={{ color: "#6c757d", fontSize: "12px" }}>
              Steps 8–9: Filter & Match → Shortlist → Generate CV
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 340px",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* LEFT: Step 8 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #dee2e6",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Step 8: Filter & Match — Search for 'Ready' Workers
              </span>
            </div>
            <div style={{ padding: "20px" }}>
              {/* Filter Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: "12px",
                  marginBottom: "16px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6c757d",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    // onChange={(e) => setSelectedProjectId(e.target.value)}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedRequestId("");
                      setSelectedRequest(null);
                      setWorkers([]);
                      setSelectedWorkerIds([]);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #dee2e6",
                      borderRadius: "8px",
                      outline: "none",
                      background: "#fff",
                    }}
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.contract?.client?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6c757d",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Position Request
                  </label>
                  <Select
                    options={requestOptions}
                    styles={customSelectStyles}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    value={
                      requestOptions.find(
                        (o) => o.value === selectedRequest?.id,
                      ) || null
                    }
                    // onChange={(o) => {
                    //   setSelectedRequest(o ? o.request : null);
                    //   setWorkers([]);
                    //   setSelectedWorkerIds([]);
                    // }}
                    onChange={(o) => {
                      setSelectedRequest(o ? o.request : null);
                      setSelectedRequestId(o ? o.value : ""); // ← เพิ่มบรรทัดนี้
                      setWorkers([]);
                      setSelectedWorkerIds([]);
                    }}
                    placeholder="Select position..."
                    isClearable
                    isDisabled={
                      !selectedProjectId || requestOptions.length === 0
                    }
                    noOptionsMessage={() => "No position requests found"}
                  />
                </div>
                <button
                  onClick={handleFindWorkers}
                  disabled={!selectedRequest}
                  style={{
                    background: selectedRequest ? "#0d6efd" : "#adb5bd",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 20px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: selectedRequest ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  🔍 Find Workers
                </button>
              </div>

              {/* Empty-state hint: project เลือกแล้วแต่ไม่มี position request */}
              {selectedProjectId && requestOptions.length === 0 && (
                <div
                  style={{
                    background: "#fff8e1",
                    border: "1px solid #ffe69c",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "#664d03",
                  }}
                >
                  ⚠ โปรเจกต์นี้ยังไม่มี position request —{" "}
                  <span
                    onClick={() =>
                      navigate(`/admin/projects/${selectedProjectId}`)
                    }
                    style={{
                      color: "#0d6efd",
                      cursor: "pointer",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    เพิ่ม Position ในหน้า Project Detail →
                  </span>
                </div>
              )}

              {/* Selected Request info — Need / Shortlisted / Remaining */}
              {selectedRequest && (
                <div
                  style={{
                    background: "#f0f7ff",
                    border: "1px solid #cfe2ff",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "13px",
                      marginBottom: "8px",
                    }}
                  >
                    Looking for{" "}
                    <strong>{selectedRequest.position?.name}</strong>
                  </div>
                  <div
                    style={{ display: "flex", gap: "20px", fontSize: "13px" }}
                  >
                    <span>
                      Need: <strong>{selectedRequest.quantity}</strong>
                    </span>
                    <span>
                      Shortlisted:{" "}
                      <strong
                        style={{
                          color:
                            currentRequestShortlisted > 0
                              ? "#198754"
                              : "#6c757d",
                        }}
                      >
                        {currentRequestShortlisted}
                      </strong>
                    </span>
                    <span>
                      Remaining:{" "}
                      <strong
                        style={{ color: remaining > 0 ? "#dc3545" : "#198754" }}
                      >
                        {remaining}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Workers Table */}
              {loadingWorkers ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6c757d",
                  }}
                >
                  Finding workers...
                </div>
              ) : workers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6c757d",
                    fontSize: "13px",
                  }}
                >
                  {selectedRequest
                    ? "No available workers found for this position"
                    : "Select a project and position, then click Find Workers"}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>
                        Matching Workers
                      </span>
                      <span
                        style={{
                          background: "#0d6efd",
                          color: "#fff",
                          borderRadius: "12px",
                          padding: "2px 10px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {workers.length} found
                      </span>
                      <span style={{ fontSize: "12px", color: "#6c757d" }}>
                        · Permanent {permCount}
                      </span>
                    </div>
                    {selectedWorkerIds.length > 0 && (
                      <button
                        onClick={handleAddToShortlist}
                        style={{
                          background: "#198754",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "7px 16px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        👥 Add Selected to Shortlist ({selectedWorkerIds.length}
                        )
                      </button>
                    )}
                  </div>

                  {/* Toggles + Search */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Type: Permanent | All */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#6c757d" }}>
                          Type:
                        </span>
                        {[
                          ["permanent", "Permanent"],
                          ["nonpermanent", "Non-Permanent"],
                          ["all", "All"],
                        ].map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setEmpType(key)}
                            style={{
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              border:
                                "1px solid " +
                                (empType === key ? "#198754" : "#dee2e6"),
                              background: empType === key ? "#198754" : "#fff",
                              color: empType === key ? "#fff" : "#495057",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Sort by: % Match | Rest Days */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#6c757d" }}>
                          Sort by:
                        </span>
                        {[
                          ["dayoff", "Rest Days"],
                          ["match", "% Match"],
                        ].map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setSortBy(key)}
                            style={{
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              border:
                                "1px solid " +
                                (sortBy === key ? "#0d6efd" : "#dee2e6"),
                              background: sortBy === key ? "#0d6efd" : "#fff",
                              color: sortBy === key ? "#fff" : "#495057",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search ในผลลัพธ์: ชื่อ หรือ empCode */}
                    <div
                      style={{
                        position: "relative",
                        flex: "1 1 200px",
                        maxWidth: "300px",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#adb5bd",
                          fontSize: "13px",
                        }}
                      >
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search name or emp code..."
                        value={workerSearch}
                        onChange={(e) => setWorkerSearch(e.target.value)}
                        style={{
                          width: "100%",
                          paddingLeft: "32px",
                          paddingRight: workerSearch ? "28px" : "12px",
                          paddingTop: "6px",
                          paddingBottom: "6px",
                          fontSize: "13px",
                          border: "1px solid #dee2e6",
                          borderRadius: "8px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {workerSearch && (
                        <span
                          onClick={() => setWorkerSearch("")}
                          title="Clear"
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#adb5bd",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        minWidth: "760px",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                          <th style={{ padding: "10px 12px", width: "36px" }}>
                            <input
                              type="checkbox"
                              checked={allDisplayedSelected}
                              onChange={toggleAll}
                              style={{
                                width: "15px",
                                height: "15px",
                                cursor: "pointer",
                              }}
                            />
                          </th>
                          {[
                            ["NAME", "left"],
                            ["RETIREMENT", "center"],
                            ["HEALTH RISK", "left"],
                            ["MEDICAL", "left"],
                            ["CERTIFICATIONS", "left"],
                            ["REST DAYS", "center"],
                            ["% MATCH", "center"],
                          ].map(([h, align]) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6c757d",
                                letterSpacing: "0.5px",
                                textAlign: align,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedWorkers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              style={{
                                textAlign: "center",
                                padding: "24px",
                                color: "#6c757d",
                                fontSize: "13px",
                              }}
                            >
                              {empType === "permanent" && permCount === 0
                                ? 'ไม่มี Permanent employee ในผลลัพธ์ — กด "Non-Permanent" หรือ "All" (หรือยังไม่ได้ import ข้อมูล isPermanent)'
                                : empType === "nonpermanent" &&
                                    permCount === workers.length
                                  ? 'มีแต่ Permanent — กด "All" เพื่อดูทั้งหมด'
                                  : workerSearch
                                    ? `ไม่พบ worker ที่ตรงกับ "${workerSearch}"`
                                    : "ไม่มีรายชื่อ"}
                            </td>
                          </tr>
                        ) : (
                          displayedWorkers.map((w, idx) => {
                            const selected = selectedWorkerIds.includes(w.id);
                            const retire = getRetirementInfo(w.birthDate);
                            const age = w.birthDate
                              ? Math.floor(
                                  (Date.now() -
                                    new Date(w.birthDate).getTime()) /
                                    (365.25 * 86400000),
                                )
                              : null;
                            const health = w.healthRisk
                              ? HEALTH_MAP[w.healthRisk]
                              : null;
                            return (
                              <tr
                                key={w.id}
                                style={{
                                  borderBottom:
                                    idx < displayedWorkers.length - 1
                                      ? "1px solid #f1f3f5"
                                      : "none",
                                  background: selected ? "#f0f7ff" : "#fff",
                                  cursor: "pointer",
                                }}
                                onClick={() => toggleWorker(w.id)}
                              >
                                <td style={{ padding: "12px 12px" }}>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleWorker(w.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: "15px",
                                      height: "15px",
                                      cursor: "pointer",
                                    }}
                                  />
                                </td>
                                {/* NAME (+ PERM / SSE / retire) */}
                                <td style={{ padding: "12px 12px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span style={{ fontWeight: 600 }}>
                                      {w.fullName}
                                    </span>
                                    {w.isPermanent && (
                                      <span
                                        title="Permanent employee"
                                        style={{
                                          background: "#d1e7dd",
                                          color: "#0f5132",
                                          borderRadius: "4px",
                                          padding: "0 5px",
                                          fontSize: "10px",
                                          fontWeight: 700,
                                        }}
                                      >
                                        PERM
                                      </span>
                                    )}
                                    {w.sseLevel && SSE_LABEL[w.sseLevel] && (
                                      <span
                                        title={
                                          w.sseCompleted
                                            ? "SSE Completed"
                                            : "SSE not completed"
                                        }
                                        style={{
                                          background: w.sseCompleted
                                            ? "#cfe2ff"
                                            : "#fff3cd",
                                          color: w.sseCompleted
                                            ? "#084298"
                                            : "#664d03",
                                          borderRadius: "4px",
                                          padding: "0 5px",
                                          fontSize: "10px",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {SSE_LABEL[w.sseLevel]}
                                        {w.sseCompleted ? " ✓" : ""}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#6c757d",
                                    }}
                                  >
                                    {w.empCode}
                                  </div>
                                </td>
                                {/* RETIREMENT (เกษียณอายุ) */}
                                <td
                                  style={{
                                    padding: "12px 12px",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {retire ? (
                                    <span
                                      title={
                                        age !== null
                                          ? `อายุ ${age} ปี`
                                          : undefined
                                      }
                                      style={{
                                        background: retire.bg,
                                        color: retire.color,
                                        borderRadius: "6px",
                                        padding: "2px 8px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {retire.label}
                                    </span>
                                  ) : age !== null ? (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        color: "#6c757d",
                                      }}
                                      title={`อายุ ${age} ปี · เกษียณตอน ${RETIREMENT_AGE} (ยังเหลือ >12 เดือน)`}
                                    >
                                      อายุ {age}
                                    </span>
                                  ) : (
                                    <span
                                      style={{ color: "#adb5bd" }}
                                      title="ไม่มีข้อมูลวันเกิด (birthDate)"
                                    >
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* HEALTH (risk badge + note preview) */}
                                <td style={{ padding: "12px 12px" }}>
                                  {health || w.healthNote ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "2px",
                                        maxWidth: "120px",
                                      }}
                                    >
                                      {health && (
                                        <span
                                          style={{
                                            alignSelf: "flex-start",
                                            background: health.bg,
                                            color: health.color,
                                            borderRadius: "6px",
                                            padding: "2px 8px",
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {health.label}
                                        </span>
                                      )}
                                      {w.healthNote && (
                                        <span
                                          title={
                                            w.healthNote
                                          } /* hover เห็นเต็ม */
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHealthNoteModal({
                                              name: w.fullName,
                                              note: w.healthNote,
                                            });
                                          }}
                                          style={{
                                            fontSize: "10px",
                                            color: "#6c757d",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            maxWidth: "120px",
                                            textDecorationLine: "underline",
                                            textDecorationStyle: "dotted",
                                          }}
                                        >
                                          📄 {w.healthNote}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: "#6c757d" }}>—</span>
                                  )}
                                </td>
                                {/* MEDICAL (status + expiry) */}
                                <td style={{ padding: "12px 12px" }}>
                                  {renderMedical(w.medicalExpiry)}
                                </td>
                                {/* CERTIFICATIONS */}
                                <td style={{ padding: "12px 12px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "4px",
                                    }}
                                    title={w.certifications?.join(", ")}
                                  >
                                    {w.certifications
                                      ?.slice(0, 2)
                                      .map((c, i) => (
                                        <span
                                          key={i}
                                          style={{
                                            background: "#e9ecef",
                                            color: "#495057",
                                            borderRadius: "4px",
                                            padding: "1px 6px",
                                            fontSize: "11px",
                                          }}
                                        >
                                          {c}
                                        </span>
                                      ))}
                                    {(w.certifications?.length ?? 0) > 2 && (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#6c757d",
                                          cursor: "help",
                                        }}
                                        title={w.certifications
                                          .slice(2)
                                          .join(", ")}
                                      >
                                        +{w.certifications.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                </td>
                                {/* REST (Day Off) */}
                                <td
                                  style={{
                                    padding: "12px 12px",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={
                                    w.platform
                                      ? `แท่นล่าสุด: ${w.platform}`
                                      : ""
                                  }
                                >
                                  {renderDayOff(w.dayOff)}
                                </td>
                                {/* % MATCH (matching training certs) */}
                                <td
                                  style={{
                                    padding: "12px 12px",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "90px",
                                  }}
                                >
                                  {w.matchPct === null ? (
                                    <span style={{ color: "#6c757d" }}>—</span>
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewEligibility(w);
                                      }}
                                      style={{
                                        color:
                                          w.matchPct === 100
                                            ? "#198754"
                                            : w.matchPct >= 70
                                              ? "#cc8400"
                                              : "#dc3545",
                                        fontWeight: 700,
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                      }}
                                      title={w.missingTrainings?.join(", ")}
                                    >
                                      {w.matchPct}% Match
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Step 9 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #dee2e6",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Step 9: Shortlist & CV
              </span>
            </div>
            <div style={{ padding: "20px" }}>
              {loadingShortlist ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#6c757d",
                    fontSize: "13px",
                  }}
                >
                  Loading...
                </div>
              ) : totalShortlisted === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#6c757d",
                    fontSize: "13px",
                  }}
                >
                  No workers shortlisted yet for this project.
                </div>
              ) : (
                <div style={{ marginBottom: "16px" }}>
                  {shortlist.map((req) =>
                    req.candidates?.length > 0 ? (
                      <div key={req.requestId} style={{ marginBottom: "16px" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#6c757d",
                            marginBottom: "8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                          }}
                        >
                          {req.position?.name} × {req.quantity}
                          <span style={{ marginLeft: "8px", color: "#0d6efd" }}>
                            ({req.candidates.length} shortlisted)
                          </span>
                        </div>
                        {req.candidates.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              background: "#f8f9fa",
                              borderRadius: "6px",
                              marginBottom: "6px",
                            }}
                          >
                            <div>
                              <div
                                style={{ fontWeight: 600, fontSize: "13px" }}
                              >
                                {c.employee?.fullName}
                              </div>
                              <div
                                style={{ fontSize: "11px", color: "#6c757d" }}
                              >
                                {c.employee?.empCode}
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    c.status === "approved"
                                      ? "#d1e7dd"
                                      : "#fff3cd",
                                  color:
                                    c.status === "approved"
                                      ? "#0f5132"
                                      : "#664d03",
                                  borderRadius: "6px",
                                  padding: "2px 8px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {c.status === "approved"
                                  ? "✓ Approved"
                                  : "Proposed"}
                              </span>
                              {c.status === "approved" ? (
                                <button
                                  onClick={() =>
                                    handleUnapprove([c.id], req.requestId)
                                  }
                                  title="ยกเลิก approve (กลับเป็น Proposed)"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#adb5bd",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    padding: "0 2px",
                                    lineHeight: 1,
                                  }}
                                >
                                  ↩
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleRemoveFromShortlist(c.id)
                                  }
                                  title="เอาออกจาก shortlist"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#adb5bd",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    padding: "0 2px",
                                    lineHeight: 1,
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {req.candidates.some(
                          (c) => c.status !== "approved",
                        ) && (
                          <button
                            onClick={() =>
                              handleApprove(
                                req.candidates
                                  .filter((c) => c.status !== "approved")
                                  .map((c) => c.id),
                                req.requestId,
                              )
                            }
                            style={{
                              width: "100%",
                              padding: "7px",
                              fontSize: "12px",
                              border: "1px solid #198754",
                              borderRadius: "6px",
                              background: "#fff",
                              color: "#198754",
                              fontWeight: 600,
                              cursor: "pointer",
                              marginTop: "4px",
                            }}
                          >
                            ✓ Mark Client Approved
                          </button>
                        )}
                      </div>
                    ) : null,
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  borderTop:
                    totalShortlisted > 0 ? "1px solid #dee2e6" : "none",
                  paddingTop: totalShortlisted > 0 ? "16px" : "0",
                }}
              >
                <button
                  onClick={handleGenerateCv}
                  disabled={totalShortlisted === 0 || cvLoading}
                  style={{
                    width: "100%",
                    padding: "9px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    background: totalShortlisted > 0 ? "#fff" : "#f8f9fa",
                    color: totalShortlisted > 0 ? "#0d6efd" : "#adb5bd",
                    cursor:
                      totalShortlisted > 0 && !cvLoading
                        ? "pointer"
                        : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {cvLoading ? "Generating..." : "📄 Generate CV Summary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {cvModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px",
            overflowY: "auto",
          }}
          onClick={() => setCvModal(null)}
        >
          <style>{`@media print {
            body * { visibility: hidden !important; }
            #cv-print, #cv-print * { visibility: visible !important; }
            #cv-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
            .cv-no-print { display: none !important; }
          }`}</style>
          <div
            id="cv-print"
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "820px",
              overflow: "hidden",
              boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toolbar — ไม่พิมพ์ */}
            <div
              className="cv-no-print"
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "14px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "16px" }}>
                📄 CV Summary
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: "#fff",
                    color: "#1e3a5f",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🖨 Print / Save PDF
                </button>
                <button
                  onClick={() => setCvModal(null)}
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
            </div>

            {/* เอกสาร */}
            <div style={{ padding: "28px 32px" }}>
              {/* หัวเอกสาร */}
              <div
                style={{
                  borderBottom: "2px solid #1e3a5f",
                  paddingBottom: "12px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: 700 }}>
                  Candidate CV Summary
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#495057",
                    marginTop: "4px",
                  }}
                >
                  <strong>Project:</strong> {cvModal.project.name}
                  {cvModal.project.client ? ` — ${cvModal.project.client}` : ""}
                  {cvModal.project.contractNo
                    ? ` · ${cvModal.project.contractNo}`
                    : ""}
                  {cvModal.project.location
                    ? ` · ${cvModal.project.location}`
                    : ""}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#868e96",
                    marginTop: "2px",
                  }}
                >
                  Generated:{" "}
                  {new Date(cvModal.generatedAt).toLocaleString("en-GB")}
                </div>
              </div>

              {cvModal.groups.length === 0 ? (
                <div style={{ color: "#6c757d", fontSize: "13px" }}>
                  ยังไม่มี candidate ใน shortlist
                </div>
              ) : (
                cvModal.groups.map((g, gi) => (
                  <div key={gi} style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#1e3a5f",
                        marginBottom: "10px",
                      }}
                    >
                      {g.position} — {g.candidates.length}/{g.quantity}{" "}
                      candidate
                    </div>
                    {g.candidates.map((c, ci) => {
                      const fmt = (d) =>
                        d
                          ? new Date(d).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—";
                      const age = c.birthDate
                        ? Math.floor(
                            (Date.now() - new Date(c.birthDate).getTime()) /
                              (365.25 * 86400000),
                          )
                        : null;
                      return (
                        <div
                          key={ci}
                          style={{
                            border: "1px solid #dee2e6",
                            borderRadius: "8px",
                            padding: "14px 16px",
                            marginBottom: "10px",
                            breakInside: "avoid",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "6px",
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: "14px" }}>
                              {c.fullName}
                            </span>
                            <span
                              style={{ fontSize: "12px", color: "#6c757d" }}
                            >
                              {c.empCode}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                background:
                                  c.status === "approved"
                                    ? "#d1e7dd"
                                    : "#fff3cd",
                                color:
                                  c.status === "approved"
                                    ? "#0f5132"
                                    : "#664d03",
                                borderRadius: "6px",
                                padding: "2px 10px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {c.status === "approved"
                                ? "Approved"
                                : "Proposed"}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#495057",
                              marginBottom: "8px",
                            }}
                          >
                            {c.position}
                            {c.nationality ? ` · ${c.nationality}` : ""}
                            {age !== null ? ` · Age ${age}` : ""}
                            {c.passport?.passportNo
                              ? ` · Passport ${c.passport.passportNo} (exp ${fmt(c.passport.expiryDate)})`
                              : ""}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              marginBottom: "6px",
                            }}
                          >
                            <strong>Medical:</strong>{" "}
                            {c.medical
                              ? `${c.medical.status || "—"} (exp ${fmt(c.medical.expiryDate)})`
                              : "—"}
                          </div>
                          <div style={{ fontSize: "12px" }}>
                            <strong>
                              Certifications ({c.certifications.length}):
                            </strong>{" "}
                            {c.certifications.length === 0 ? (
                              "—"
                            ) : (
                              <span>
                                {c.certifications
                                  .map(
                                    (t) =>
                                      `${t.name}${t.expiryDate ? ` (exp ${fmt(t.expiryDate)})` : ""}`,
                                  )
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {healthNoteModal && (
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
          onClick={() => setHealthNoteModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "420px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "15px" }}>
                📄 Health Note — {healthNoteModal.name}
              </span>
              <button
                onClick={() => setHealthNoteModal(null)}
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
            <div
              style={{
                padding: "20px",
                fontSize: "14px",
                color: "#212529",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {healthNoteModal.note}
            </div>
          </div>
        </div>
      )}
      {eligibilityModal && (
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
          onClick={() => setEligibilityModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "16px" }}>☑️</span>
                <span style={{ fontWeight: 600, fontSize: "16px" }}>
                  Client Requirement Check
                </span>
              </div>
              <button
                onClick={() => setEligibilityModal(null)}
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

            {/* Worker Info */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>
                  {eligibilityModal.fullName}
                </div>
                <div style={{ fontSize: "13px", color: "#6c757d" }}>
                  {eligibilityModal.position} · {eligibilityModal.empCode}
                </div>
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  background:
                    eligibilityModal.mobilizationStatus === "ready"
                      ? "#d1e7dd"
                      : "#fff3cd",
                  color:
                    eligibilityModal.mobilizationStatus === "ready"
                      ? "#0f5132"
                      : "#664d03",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {eligibilityModal.mobilizationStatus === "ready"
                  ? "Ready"
                  : eligibilityModal.mobilizationStatus}
              </span>
            </div>

            {/* Client Tabs */}
            <div
              style={{
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                padding: "0 24px",
              }}
            >
              {eligibilityModal.clients.map((c, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveClientTab(i);
                    setCompletedExpanded({});
                  }}
                  style={{
                    padding: "10px 16px",
                    fontSize: "13px",
                    fontWeight: activeClientTab === i ? 700 : 400,
                    border: "none",
                    borderBottom:
                      activeClientTab === i
                        ? "2px solid #0d6efd"
                        : "2px solid transparent",
                    background: "none",
                    cursor: "pointer",
                    color: activeClientTab === i ? "#0d6efd" : "#6c757d",
                  }}
                >
                  {c.clientName}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {eligibilityModal.clients.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#6c757d",
                    padding: "20px",
                  }}
                >
                  No training matrix found for this position
                </div>
              ) : (
                (() => {
                  const client = eligibilityModal.clients[activeClientTab];
                  if (!client) return null;
                  return (
                    <div>
                      {/* Client header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "14px" }}>
                            {client.clientName}
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              color: "#6c757d",
                              marginLeft: "8px",
                            }}
                          >
                            — Matched: "{client.positionMatched}"
                          </span>
                        </div>
                        <span
                          style={{
                            background: client.eligible ? "#d1e7dd" : "#dc3545",
                            color: client.eligible ? "#0f5132" : "#fff",
                            borderRadius: "6px",
                            padding: "4px 12px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {client.eligible ? "✓ ELIGIBLE" : "✗ NOT ELIGIBLE"}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div
                        style={{
                          background: "#e9ecef",
                          borderRadius: "4px",
                          height: "6px",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            background: client.eligible ? "#198754" : "#dc3545",
                            borderRadius: "4px",
                            height: "6px",
                            width: `${client.matchPct}%`,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6c757d",
                          marginBottom: "16px",
                        }}
                      >
                        {client.completed.length} of {client.required} required
                        trainings completed ({client.matchPct}%)
                      </div>

                      {/* Missing */}
                      {client.missing.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#dc3545",
                              fontSize: "13px",
                              marginBottom: "8px",
                            }}
                          >
                            ✗ Missing ({client.missing.length}):
                          </div>
                          {client.missing.map((name, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 0",
                                borderBottom: "1px solid #f1f3f5",
                                fontSize: "13px",
                              }}
                            >
                              <span
                                style={{ color: "#dc3545", fontSize: "14px" }}
                              >
                                ✗
                              </span>
                              {name}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Completed — collapsible */}
                      {client.completed.length > 0 && (
                        <div>
                          <button
                            onClick={() =>
                              setCompletedExpanded((prev) => ({
                                ...prev,
                                [activeClientTab]: !prev[activeClientTab],
                              }))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#198754",
                              fontSize: "13px",
                              fontWeight: 600,
                              padding: "6px 0",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span>
                              {completedExpanded[activeClientTab] ? "▼" : "▶"}
                            </span>
                            ✅ Completed ({client.completed.length}) — click to
                            expand
                          </button>
                          {completedExpanded[activeClientTab] && (
                            <div style={{ marginTop: "8px" }}>
                              {client.completed.map((name, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "6px 0",
                                    borderBottom: "1px solid #f1f3f5",
                                    fontSize: "13px",
                                  }}
                                >
                                  <span style={{ color: "#198754" }}>✓</span>
                                  {name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #dee2e6",
                textAlign: "right",
              }}
            >
              <button
                onClick={() => setEligibilityModal(null)}
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
  );
}
