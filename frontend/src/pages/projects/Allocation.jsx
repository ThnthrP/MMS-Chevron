import { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// อายุเกษียณ (ปรับได้ตามนโยบายบริษัท)
const RETIREMENT_AGE = 60;

// ── roster maps ──
const HEALTH_MAP = {
  low: { label: "ต่ำ", bg: "#d1e7dd", color: "#0f5132" },
  medium: { label: "ปานกลาง", bg: "#fff3cd", color: "#664d03" },
  high: { label: "สูง", bg: "#f8d7da", color: "#842029" },
};
const SSE_LABEL = { new_sse: "NEW SSE", sse1: "SSE1", sse2: "SSE2" };

const GENDER_LABEL = { male: "Male", female: "Female", other: "Other" };

export default function Allocation() {
  const { backendUrl, userData } = useContext(AppContent);
  const navigate = useNavigate();

  const canManageAllocation = ["admin", "manpower"].includes(
    userData?.role?.name,
  );

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useStickyState(
    "alloc_projectId",
    "",
  );
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useStickyState(
    "alloc_requestId",
    "",
  );
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [shortlist, setShortlist] = useState([]);
  const [loadingShortlist, setLoadingShortlist] = useState(false);
  const [eligibilityModal, setEligibilityModal] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [activeClientTab, setActiveClientTab] = useState(0);
  const [completedExpanded, setCompletedExpanded] = useState({});
  const [approvedExpanded, setApprovedExpanded] = useState({});
  const [workerSearch, setWorkerSearch] = useState("");
  const [sortBy, setSortBy] = useStickyState("alloc_sortBy", "dayoff");
  const [empType, setEmpType] = useStickyState("alloc_empType", "permanent");
  const [healthNoteModal, setHealthNoteModal] = useState(null);
  const [cvModal, setCvModal] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [rosterModal, setRosterModal] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [skillMatrixModal, setSkillMatrixModal] = useState(null);
  const [skillMatrixLoading, setSkillMatrixLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      return;
    }
    const proj = projects.find((p) => p.id === selectedProjectId);
    setSelectedProject(proj || null);
    if (proj) {
      fetchShortlist(selectedProjectId);
      if (selectedRequestId && !selectedRequest) {
        const req = proj.requests?.find((r) => r.id === selectedRequestId);
        if (req) setSelectedRequest(req);
      }
    }
  }, [selectedProjectId, projects]);

  // ── ตั้งชื่อไฟล์ PDF ตอน Print/Save ให้ตรงกับประเภทเอกสาร ──
  useEffect(() => {
    const originalTitle = document.title;

    if (cvModal) {
      document.title = `CV_Summary_${cvModal.project?.name || "Project"}`;
    } else if (rosterModal) {
      document.title = `Roster_MOB-DMOB_${rosterModal.project?.name || "Project"}`;
    } else if (skillMatrixModal) {
      document.title = `Skill_Matrix_${skillMatrixModal.project?.name || "Project"}`;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [cvModal, rosterModal, skillMatrixModal]);

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
          contractId: selectedProject?.contractId,
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
      if (!!a.isPermanent !== !!b.isPermanent) return a.isPermanent ? -1 : 1;
      if (sortBy === "dayoff") {
        const av = a.dayOff ?? -Infinity;
        const bv = b.dayOff ?? -Infinity;
        return bv - av;
      }
      return (b.matchPct ?? -1) - (a.matchPct ?? -1);
    });

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
      handleFindWorkers();
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

  const handleGenerateRoster = async () => {
    if (!selectedProjectId || totalShortlisted === 0) return;
    try {
      setRosterLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/allocation/roster/${selectedProjectId}`,
        { withCredentials: true },
      );
      const rowsWithEditable = res.data.rows.map((r) => ({
        ...r,
        from: r.from ?? "",
        remark: r.remark ?? "",
      }));
      setRosterModal({ ...res.data, rows: rowsWithEditable });
    } catch (error) {
      console.error(error);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleGenerateSkillMatrix = async () => {
    if (!selectedProjectId || totalShortlisted === 0) return;
    try {
      setSkillMatrixLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/allocation/skill-matrix/${selectedProjectId}`,
        { withCredentials: true },
      );
      setSkillMatrixModal(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setSkillMatrixLoading(false);
    }
  };

  const handleExportSkillMatrixExcel = async () => {
    if (!skillMatrixModal) return;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Skill Matrix");

    const trainings = skillMatrixModal.trainings;
    const rows = skillMatrixModal.rows;

    // ── หัวเรื่อง ──
    ws.mergeCells(1, 1, 1, 2 + trainings.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `${skillMatrixModal.project?.name ?? ""} — ${skillMatrixModal.project?.client ?? ""}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF198754" } };

    const headerRowIndex = 3;

    // ── หัวตาราง: Name, Position, แล้วตามด้วย training (หมุนเฉียง) ──
    ws.getCell(headerRowIndex, 1).value = "Name";
    ws.getCell(headerRowIndex, 2).value = "Position";
    trainings.forEach((tr, i) => {
      const cell = ws.getCell(headerRowIndex, 3 + i);
      cell.value = tr.name;
      cell.alignment = {
        textRotation: 45,
        vertical: "bottom",
        horizontal: "left",
      };
      cell.font = { bold: true, size: 9 };
    });

    ws.getRow(headerRowIndex).height = 110;
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 26;
    for (let i = 0; i < trainings.length; i++) {
      ws.getColumn(3 + i).width = 5;
    }

    // ── border + สีพื้นหลังหัวตาราง ──
    for (let c = 1; c <= 2 + trainings.length; c++) {
      const cell = ws.getCell(headerRowIndex, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F3F5" },
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    }

    // ── ข้อมูลแต่ละแถว ──
    rows.forEach((r, ri) => {
      const rowIndex = headerRowIndex + 1 + ri;
      ws.getCell(rowIndex, 1).value = r.fullName;
      ws.getCell(rowIndex, 1).font = { bold: true };
      ws.getCell(rowIndex, 2).value = r.position;

      r.cells.forEach((cell, ci) => {
        const excelCell = ws.getCell(rowIndex, 3 + ci);
        excelCell.value = skillCellLabel(cell);
        excelCell.alignment = { horizontal: "center" };
        excelCell.font = {
          size: 9,
          color:
            cell.status === "overdue"
              ? { argb: "FFDC3545" }
              : { argb: "FF212529" },
        };
      });

      for (let c = 1; c <= 2 + trainings.length; c++) {
        ws.getCell(rowIndex, c).border = {
          top: { style: "thin", color: { argb: "FFDEE2E6" } },
          bottom: { style: "thin", color: { argb: "FFDEE2E6" } },
          left: { style: "thin", color: { argb: "FFDEE2E6" } },
          right: { style: "thin", color: { argb: "FFDEE2E6" } },
        };
      }
    });

    // ── freeze แถวหัว + คอลัมน์ Name/Position ──
    ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRowIndex }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/octet-stream",
    });
    saveAs(
      blob,
      `SkillMatrix_${skillMatrixModal.project?.name || "export"}.xlsx`,
    );
  };

  const updateRosterField = (employeeId, field, value) => {
    setRosterModal((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.employeeId === employeeId ? { ...r, [field]: value } : r,
      ),
    }));
  };

  const fmtShort = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  // เหมือน fmtShort แต่ไม่มี dash ระหว่างวัน-เดือน-ปี (ให้ตรงกับสไตล์เรซูเม่จริง เช่น "3-May-1983")
  const fmtResumeDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const day = dt.getDate();
    const month = dt.toLocaleDateString("en-GB", { month: "long" });
    const year = dt.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calcAge = (birthDate) => {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    if (isNaN(b.getTime())) return null;
    return Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000));
  };

  const skillCellLabel = (cell) => {
    if (!cell.completedDate && !cell.expiryDate && !cell.status) return "N/A";
    if (cell.status === "if_required") return "if required";
    if (cell.status === "overdue") return "Over Due";
    if (cell.expiryDate) return fmtShort(cell.expiryDate);
    if (cell.completedDate) return fmtShort(cell.completedDate);
    return "Pending";
  };

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

  // ── styles สำหรับ Resume (CV modal ใหม่) ──
  const resumeSectionTitle = {
    background: "#e6fbfb",
    border: "1px solid #1e3a5f",
    borderTop: "none",
    padding: "6px 12px",
    fontWeight: 700,
    fontSize: "13px",
    color: "#1e3a5f",
  };
  const resumeTd1 = {
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#1e3a5f",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  };
  const resumeTd2 = {
    padding: "4px 8px",
    fontSize: "12px",
    color: "#212529",
    verticalAlign: "top",
  };

  const [trainingCart, setTrainingCart] = useState([]); // [{employeeId, employeeName, trainingName, trainingId, clientName}]
  const [globalTrainingMap, setGlobalTrainingMap] = useState({}); // name -> id
  const [sendingCart, setSendingCart] = useState(false);

  const [cartReviewOpen, setCartReviewOpen] = useState(false);

  const removeFromCart = (employeeId, trainingId) => {
    setTrainingCart((prev) =>
      prev.filter(
        (c) => !(c.employeeId === employeeId && c.trainingId === trainingId),
      ),
    );
  };

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/global-trainings`, { withCredentials: true })
      .then((res) => {
        const map = {};
        (res.data || []).forEach((t) => (map[t.name] = t.id));
        setGlobalTrainingMap(map);
      })
      .catch((err) => console.error(err));
  }, [backendUrl]);

  const addToCart = (employeeId, employeeName, trainingName, clientName) => {
    const trainingId = globalTrainingMap[trainingName];
    if (!trainingId) return; // เผื่อชื่อไม่ match (ไม่ควรเกิด แต่กันไว้)
    setTrainingCart((prev) => {
      const exists = prev.some(
        (c) => c.employeeId === employeeId && c.trainingId === trainingId,
      );
      if (exists) {
        return prev.filter(
          (c) => !(c.employeeId === employeeId && c.trainingId === trainingId),
        );
      }
      return [
        ...prev,
        { employeeId, employeeName, trainingName, trainingId, clientName },
      ];
    });
  };

  const isInCart = (employeeId, trainingName) => {
    const trainingId = globalTrainingMap[trainingName];
    return trainingCart.some(
      (c) => c.employeeId === employeeId && c.trainingId === trainingId,
    );
  };

  const handleSendCart = async () => {
    if (trainingCart.length === 0) return;
    try {
      setSendingCart(true);
      await axios.post(
        `${backendUrl}/api/training-requests`,
        {
          items: trainingCart.map((c) => ({
            employeeId: c.employeeId,
            globalTrainingId: c.trainingId,
            clientName: c.clientName,
          })),
        },
        { withCredentials: true },
      );
      alert(`แจ้ง HR ให้จัด training ${trainingCart.length} รายการแล้ว`);
      setTrainingCart([]);
    } catch (err) {
      console.error(err);
      alert("ส่งไม่สำเร็จ — ดู console");
    } finally {
      setSendingCart(false);
    }
  };

  const [allWorkers, setAllWorkers] = useState([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [showQuickResults, setShowQuickResults] = useState(false);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/workers`, { withCredentials: true })
      .then((res) => setAllWorkers(res.data || []))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  const quickSearchResults = quickSearch.trim()
    ? allWorkers
        .filter(
          (w) =>
            w.fullName?.toLowerCase().includes(quickSearch.toLowerCase()) ||
            w.empCode?.toLowerCase().includes(quickSearch.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}
          >
            🔍 ค้นหา Worker คนใดก็ได้ (เช่น client เจาะจงชื่อมาตรงๆ)
          </div>
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <input
              type="text"
              placeholder="พิมพ์ชื่อ หรือรหัสพนักงาน..."
              value={quickSearch}
              onChange={(e) => {
                setQuickSearch(e.target.value);
                setShowQuickResults(true);
              }}
              onFocus={() => setShowQuickResults(true)}
              onBlur={() => setTimeout(() => setShowQuickResults(false), 150)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "13px",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                outline: "none",
              }}
            />
            {showQuickResults && quickSearchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {quickSearchResults.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      handleViewEligibility(w);
                      setQuickSearch("");
                      setShowQuickResults(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f3f5",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8f9fa")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>
                      {w.fullName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      {w.empCode} · {w.position?.name || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    onChange={(o) => {
                      setSelectedRequest(o ? o.request : null);
                      setSelectedRequestId(o ? o.value : "");
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
                    onClick={() => navigate(`/projects/${selectedProjectId}`)}
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
                    {selectedWorkerIds.length > 0 && canManageAllocation && (
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
                        borderCollapse: "collapse",
                        fontSize: "13px",
                        tableLayout: "fixed",
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                          {canManageAllocation && (
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
                          )}
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
                              colSpan={canManageAllocation ? 8 : 7}
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
                                  cursor: canManageAllocation
                                    ? "pointer"
                                    : "default",
                                }}
                                onClick={
                                  canManageAllocation
                                    ? () => toggleWorker(w.id)
                                    : undefined
                                }
                              >
                                {canManageAllocation && (
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
                                )}
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
                                          title={w.healthNote}
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
                                <td style={{ padding: "12px 12px" }}>
                                  {renderMedical(w.medicalExpiry)}
                                </td>
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
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {w.matchPct === null ? (
                                    <span style={{ color: "#6c757d" }}>—</span>
                                  ) : (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "2px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          color:
                                            w.matchPct === 100
                                              ? "#198754"
                                              : w.matchPct >= 70
                                                ? "#cc8400"
                                                : "#dc3545",
                                          fontWeight: 700,
                                          fontSize: "13px",
                                        }}
                                        title={w.missingTrainings?.join(", ")}
                                      >
                                        {w.matchPct}% Match
                                      </span>
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewEligibility(w);
                                        }}
                                        style={{
                                          fontSize: "11px",
                                          color: "#0d6efd",
                                          cursor: "pointer",
                                          fontWeight: 600,
                                        }}
                                      >
                                        🔍 ดู Gap →
                                      </span>
                                    </div>
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
              {!canManageAllocation ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    color: "#6c757d",
                    fontSize: "13px",
                  }}
                >
                  🔒 การจัดการ Shortlist เป็นสิทธิ์เฉพาะ Manpower
                </div>
              ) : loadingShortlist ? (
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
                  {shortlist.map((req) => {
                    if (!req.candidates || req.candidates.length === 0)
                      return null;

                    const proposedCandidates = req.candidates.filter(
                      (c) => c.status !== "approved",
                    );
                    const approvedCandidates = req.candidates.filter(
                      (c) => c.status === "approved",
                    );
                    const isApprovedListOpen =
                      !!approvedExpanded[req.requestId];

                    return (
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

                        {/* ── Proposed candidates — approve ทีละคน ── */}
                        {proposedCandidates.length === 0 ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#198754",
                              fontWeight: 600,
                              padding: "8px 0",
                            }}
                          >
                            ✓ ทุกคนได้รับการ approve แล้ว
                          </div>
                        ) : (
                          proposedCandidates.map((c) => (
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
                                gap: "8px", // ← เพิ่มใหม่ กันชื่อกับปุ่มชิดกันเกินไป
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                {" "}
                                {/* ← เพิ่ม minWidth: 0 ให้ชื่อ wrap ได้โดยไม่ดันปุ่ม */}
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
                                  flexShrink: 0, // ← เพิ่มใหม่ กันฝั่งปุ่มถูกบีบ
                                }}
                              >
                                <span
                                  style={{
                                    background: "#fff3cd",
                                    color: "#664d03",
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap", // ← เพิ่มใหม่
                                  }}
                                >
                                  Proposed
                                </span>
                                <button
                                  onClick={() =>
                                    handleApprove([c.id], req.requestId)
                                  }
                                  title="Approve คนนี้"
                                  style={{
                                    background: "#198754",
                                    border: "1px solid #198754",
                                    color: "#fff",
                                    borderRadius: "6px",
                                    padding: "3px 10px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap", // ← เพิ่มใหม่ (ตัวสำคัญที่สุด)
                                  }}
                                >
                                  ✓ Approve
                                </button>
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
                                    flexShrink: 0, // ← เพิ่มใหม่
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))
                        )}

                        {/* ── Approved list — collapsible ── */}
                        {approvedCandidates.length > 0 && (
                          <div style={{ marginTop: "8px" }}>
                            <span
                              onClick={() =>
                                setApprovedExpanded((prev) => ({
                                  ...prev,
                                  [req.requestId]: !prev[req.requestId],
                                }))
                              }
                              style={{
                                fontSize: "11px",
                                color: "#198754",
                                cursor: "pointer",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isApprovedListOpen ? "▾" : "▸"} ✓{" "}
                              {approvedCandidates.length} approved —{" "}
                              {isApprovedListOpen ? "ซ่อนรายชื่อ" : "ดูรายชื่อ"}
                            </span>

                            {isApprovedListOpen && (
                              <div style={{ marginTop: "6px" }}>
                                {approvedCandidates.map((c) => (
                                  <div
                                    key={c.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "8px 12px",
                                      background: "#f0fff4",
                                      borderRadius: "6px",
                                      marginBottom: "6px",
                                      gap: "8px", // ← เพิ่มใหม่
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      {" "}
                                      {/* ← เพิ่มใหม่ */}
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          fontSize: "13px",
                                        }}
                                      >
                                        {c.employee?.fullName}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "#6c757d",
                                        }}
                                      >
                                        {c.employee?.empCode}
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        flexShrink: 0, // ← เพิ่มใหม่
                                      }}
                                    >
                                      <span
                                        style={{
                                          background: "#d1e7dd",
                                          color: "#0f5132",
                                          borderRadius: "6px",
                                          padding: "2px 8px",
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          whiteSpace: "nowrap", // ← เพิ่มใหม่
                                        }}
                                      >
                                        ✓ Approved
                                      </span>
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
                                          flexShrink: 0, // ← เพิ่มใหม่
                                        }}
                                      >
                                        ↩
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {canManageAllocation && (
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

                  <button
                    onClick={handleGenerateRoster}
                    disabled={totalShortlisted === 0 || rosterLoading}
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
                        totalShortlisted > 0 && !rosterLoading
                          ? "pointer"
                          : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {rosterLoading
                      ? "Generating..."
                      : "🛫 Export Roster (MOB/D-MOB)"}
                  </button>

                  <button
                    onClick={handleGenerateSkillMatrix}
                    disabled={totalShortlisted === 0 || skillMatrixLoading}
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
                        totalShortlisted > 0 && !skillMatrixLoading
                          ? "pointer"
                          : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {skillMatrixLoading
                      ? "Generating..."
                      : "📋 Export Skill Matrix"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CV Summary — เวอร์ชันใหม่: หน้าตาตรงกับเรซูเม่จริงที่ส่งลูกค้า
          1 candidate = 1 "resume block" (page-break ตอน print)
          ════════════════════════════════════════════════════════════ */}
      {cvModal &&
        createPortal(
          <div
            className="cv-print-overlay"
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
            #root { display: none !important; }
            .cv-print-overlay {
              position: static !important;
              background: none !important;
              padding: 0 !important;
            }
            #cv-print {
              position: static !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .cv-no-print { display: none !important; }
            .cv-resume-page { page-break-after: always; border: none !important; box-shadow: none !important; }
            .cv-resume-page:last-child { page-break-after: auto; }
          }`}</style>
            <div
              id="cv-print"
              style={{
                background: "#fff",
                borderRadius: "10px",
                width: "100%",
                maxWidth: "900px",
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
                  📄 CV Summary — Resume
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

              <div style={{ padding: "20px", background: "#e9ecef" }}>
                {(() => {
                  // กรองเฉพาะ candidate ที่ยังเป็น Proposed (ไม่รวมคนที่ approved แล้ว)
                  const proposedGroups = cvModal.groups
                    .map((g) => ({
                      ...g,
                      candidates: g.candidates.filter(
                        (c) => c.status !== "approved",
                      ),
                    }))
                    .filter((g) => g.candidates.length > 0);
                  return proposedGroups.length === 0 ? (
                    <div
                      style={{
                        color: "#6c757d",
                        fontSize: "13px",
                        textAlign: "center",
                        padding: "40px",
                        background: "#fff",
                      }}
                    >
                      ไม่มี candidate สถานะ Proposed ใน shortlist
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#adb5bd",
                          marginTop: "6px",
                        }}
                      >
                        (candidate ที่ Approved แล้วจะไม่แสดงในนี้)
                      </div>
                    </div>
                  ) : (
                    proposedGroups.map((g) =>
                      g.candidates.map((c, ci) => {
                        const age = calcAge(c.birthDate);
                        const p = c.personal || {};
                        const pro = c.professional || {};
                        const trainedCourses = c.trainedCourses || [];
                        const projectReferences = pro.projectReferences || [];

                        return (
                          <div
                            key={`${g.position}-${ci}`}
                            className="cv-resume-page"
                            style={{
                              background: "#fff",
                              border: "1px solid #dee2e6",
                              borderRadius: "6px",
                              marginBottom: "20px",
                              padding: "24px 28px",
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            {/* status badge — ไม่พิมพ์ ใช้ดูก่อนส่งเท่านั้น */}
                            <div
                              className="cv-no-print"
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginBottom: "8px",
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

                            {/* ── Letterhead ── */}
                            <div
                              style={{
                                display: "flex",
                                border: "1px solid #000",
                                marginBottom: "0",
                              }}
                            >
                              {/* โลโก้บริษัท — ซ้าย */}
                              <div
                                style={{
                                  width: "100px",
                                  flexShrink: 0,
                                  borderRight: "1px solid #000",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "8px",
                                }}
                              >
                                <img
                                  src={`${backendUrl}/uploads/branding/experteam-logo.png`}
                                  alt="EXPERTEAM Logo"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "70px",
                                    objectFit: "contain",
                                  }}
                                />
                              </div>

                              {/* ข้อความบริษัท — กลาง (ไทย + อังกฤษ) */}
                              <div
                                style={{
                                  flex: 1,
                                  textAlign: "center",
                                  padding: "10px 12px",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "13px",
                                    color: "#1e3a5f",
                                  }}
                                >
                                  บริษัท เอ็กซ์เพิททีม จำกัด
                                </div>
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "#1e3a5f",
                                    marginBottom: "4px",
                                  }}
                                >
                                  110, 112, 114 ถนนพระราม 2 แขวงแสมดำ
                                  เขตบางขุนเทียน กรุงเทพฯ 10150
                                </div>
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "#1e3a5f",
                                    marginBottom: "6px",
                                  }}
                                >
                                  โทร (662) 898-6001 แฟ็กซ์ (662) 898-6451
                                </div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "13px",
                                    color: "#1e3a5f",
                                  }}
                                >
                                  EXPERTEAM CO., LTD.
                                </div>
                                <div
                                  style={{ fontSize: "10px", color: "#1e3a5f" }}
                                >
                                  110, 112, 114 Rama II Road, Sa-maedum,
                                  Bangkuntean, Bangkok 10150
                                </div>
                                <div
                                  style={{ fontSize: "10px", color: "#1e3a5f" }}
                                >
                                  TEL: (662) 898-6001 FAX: (662) 898-6451
                                </div>
                              </div>

                              {/* ISO badges — ขวา */}
                              <div
                                style={{
                                  width: "160px",
                                  flexShrink: 0,
                                  borderLeft: "1px solid #000",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "8px",
                                }}
                              >
                                <img
                                  src={`${backendUrl}/uploads/branding/iso-badges.png`}
                                  alt="ISO 9001 / 14001 / 45001 Certified"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "70px",
                                    objectFit: "contain",
                                  }}
                                />
                              </div>
                            </div>
                            <div
                              style={{
                                border: "1px solid #000",
                                borderTop: "none",
                                padding: "6px",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "16px",
                                marginBottom: "16px",
                              }}
                            >
                              Resume
                            </div>

                            {/* ── Personal Details (พร้อมรูปมุมขวาบน — เหมือนเรซูเม่ต้นฉบับ) ── */}
                            <div style={resumeSectionTitle}>
                              Personal Details
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "16px",
                                border: "1px solid #1e3a5f",
                                borderTop: "none",
                                marginBottom: "16px",
                              }}
                            >
                              <table
                                style={{
                                  flex: 1,
                                  borderCollapse: "collapse",
                                }}
                              >
                                <tbody>
                                  <tr>
                                    <td style={resumeTd1}>Name</td>
                                    <td style={resumeTd2} colSpan={3}>
                                      {c.fullName}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Address</td>
                                    <td style={resumeTd2} colSpan={3}>
                                      {p.address || "—"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Telephone</td>
                                    <td style={resumeTd2}>{p.phone || "—"}</td>
                                    <td style={resumeTd1}>Email</td>
                                    <td style={resumeTd2}>{p.email || "—"}</td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Date of Birth</td>
                                    <td style={resumeTd2}>
                                      {fmtResumeDate(c.birthDate)}
                                    </td>
                                    <td style={resumeTd1}>Age</td>
                                    <td style={resumeTd2}>
                                      {age !== null ? `${age} years` : "—"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Sex</td>
                                    <td style={resumeTd2}>
                                      {GENDER_LABEL[p.gender] || "—"}
                                    </td>
                                    <td style={resumeTd1}>Nationality</td>
                                    <td style={resumeTd2}>
                                      {c.nationality || "—"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Height</td>
                                    <td style={resumeTd2}>
                                      {p.height != null
                                        ? `${p.height} cm.`
                                        : "—"}
                                    </td>
                                    <td style={resumeTd1}>Weight</td>
                                    <td style={resumeTd2}>
                                      {p.weight != null
                                        ? `${p.weight} kg.`
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Religion</td>
                                    <td style={resumeTd2}>
                                      {p.religion || "—"}
                                    </td>
                                    <td style={resumeTd1}>Language</td>
                                    <td style={resumeTd2}>
                                      {p.language || "—"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={resumeTd1}>Education</td>
                                    <td style={resumeTd2} colSpan={3}>
                                      {p.education || "—"}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>

                              {/* รูปพนักงาน — มุมขวา เหมือนเรซูเม่ต้นฉบับ */}
                              <div
                                style={{
                                  width: "110px",
                                  flexShrink: 0,
                                  padding: "10px",
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "center",
                                }}
                              >
                                {p.photoUrl ? (
                                  <img
                                    src={`${backendUrl}${p.photoUrl}`}
                                    alt={c.fullName}
                                    style={{
                                      width: "100px",
                                      height: "120px",
                                      objectFit: "cover",
                                      border: "1px solid #1e3a5f",
                                      borderRadius: "4px",
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="cv-no-print"
                                    style={{
                                      width: "100px",
                                      height: "120px",
                                      border: "1px dashed #adb5bd",
                                      borderRadius: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      color: "#adb5bd",
                                      textAlign: "center",
                                      padding: "4px",
                                    }}
                                  >
                                    No Photo
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Trained Courses ── */}
                            <div style={resumeSectionTitle}>
                              Trained Courses
                            </div>
                            <div
                              style={{
                                border: "1px solid #1e3a5f",
                                borderTop: "none",
                                padding: "10px 14px",
                                marginBottom: "16px",
                              }}
                            >
                              {trainedCourses.length === 0 ? (
                                <div
                                  style={{ fontSize: "12px", color: "#6c757d" }}
                                >
                                  — ไม่มีข้อมูล
                                </div>
                              ) : (
                                trainedCourses.map((t, ti) => (
                                  <div
                                    key={ti}
                                    style={{
                                      display: "flex",
                                      fontSize: "12px",
                                      marginBottom: "6px",
                                      gap: "8px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: "#1e3a5f",
                                        minWidth: "110px",
                                      }}
                                    >
                                      {fmtResumeDate(t.completedDate)}
                                    </span>
                                    <span>:</span>
                                    <div>
                                      <div>{t.name}</div>
                                      {t.institute && (
                                        <div
                                          style={{
                                            color: "#6c757d",
                                            fontSize: "11px",
                                          }}
                                        >
                                          By {t.institute}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* ── Professional Experience ── */}
                            <div style={resumeSectionTitle}>
                              Professional Experience
                            </div>
                            <div
                              style={{
                                border: "1px solid #1e3a5f",
                                borderTop: "none",
                                padding: "10px 14px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  textDecoration: "underline",
                                  marginBottom: "8px",
                                }}
                              >
                                Present
                              </div>
                              <table
                                style={{
                                  fontSize: "12px",
                                  marginBottom: "16px",
                                }}
                              >
                                <tbody>
                                  <tr>
                                    <td
                                      style={{
                                        fontWeight: 700,
                                        paddingRight: "8px",
                                        verticalAlign: "top",
                                      }}
                                    >
                                      Company
                                    </td>
                                    <td>:&nbsp;&nbsp;{pro.company}</td>
                                  </tr>
                                  <tr>
                                    <td
                                      style={{
                                        fontWeight: 700,
                                        paddingRight: "8px",
                                        verticalAlign: "top",
                                      }}
                                    >
                                      Position
                                    </td>
                                    <td>
                                      :&nbsp;&nbsp;{pro.currentPosition || "—"}
                                    </td>
                                  </tr>
                                  {pro.responsibilities?.length > 0 && (
                                    <tr>
                                      <td
                                        style={{
                                          fontWeight: 700,
                                          paddingRight: "8px",
                                          verticalAlign: "top",
                                        }}
                                      >
                                        Responsibility
                                      </td>
                                      <td>
                                        :&nbsp;&nbsp;
                                        {pro.responsibilities.map((r, ri) => (
                                          <div key={ri}>
                                            {ri + 1}. {r}
                                          </div>
                                        ))}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>

                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  textDecoration: "underline",
                                  marginBottom: "8px",
                                }}
                              >
                                Project References
                              </div>
                              {projectReferences.length === 0 ? (
                                <div
                                  style={{ fontSize: "12px", color: "#6c757d" }}
                                >
                                  — ไม่มีประวัติ deploy
                                </div>
                              ) : (
                                projectReferences.map((pr, pi) => (
                                  <table
                                    key={pi}
                                    style={{
                                      fontSize: "12px",
                                      marginBottom: "10px",
                                    }}
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          style={{
                                            fontWeight: 700,
                                            paddingRight: "8px",
                                            width: "70px",
                                            verticalAlign: "top",
                                          }}
                                        >
                                          Project
                                        </td>
                                        <td>:&nbsp;&nbsp;{pr.projectLabel}</td>
                                      </tr>
                                      <tr>
                                        <td
                                          style={{
                                            fontWeight: 700,
                                            paddingRight: "8px",
                                            verticalAlign: "top",
                                          }}
                                        >
                                          Position
                                        </td>
                                        <td>
                                          :&nbsp;&nbsp;{pr.position || "—"}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td
                                          style={{
                                            fontWeight: 700,
                                            paddingRight: "8px",
                                            verticalAlign: "top",
                                          }}
                                        >
                                          Period
                                        </td>
                                        <td>
                                          :&nbsp;&nbsp;
                                          {fmtResumeDate(pr.mobDate)}
                                          {pr.demobDate
                                            ? ` to ${fmtResumeDate(pr.demobDate)}`
                                            : ""}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                ))
                              )}
                            </div>

                            {/* ── ข้อมูลเสริม (Medical/Passport) — ไม่พิมพ์ ใช้ดูก่อนส่งเท่านั้น ── */}
                            <div
                              className="cv-no-print"
                              style={{
                                marginTop: "16px",
                                paddingTop: "12px",
                                borderTop: "1px dashed #dee2e6",
                                fontSize: "11px",
                                color: "#6c757d",
                              }}
                            >
                              <strong>Medical:</strong>{" "}
                              {c.medical
                                ? `${c.medical.status || "—"} (exp ${fmtShort(c.medical.expiryDate)})`
                                : "—"}
                              {"  ·  "}
                              <strong>Passport:</strong>{" "}
                              {c.passport?.passportNo
                                ? `${c.passport.passportNo} (exp ${fmtShort(c.passport.expiryDate)})`
                                : "—"}
                            </div>
                          </div>
                        );
                      }),
                    )
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body,
        )}
      {rosterModal &&
        createPortal(
          <div
            className="roster-print-overlay"
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
            onClick={() => setRosterModal(null)}
          >
            <style>{`@media print {
  #root { display: none !important; }
  .roster-print-overlay {
    position: static !important;
    background: none !important;
    padding: 0 !important;
  }
  #roster-print {
    position: static !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  .cv-no-print { display: none !important; }
  #roster-print input { border: none !important; background: transparent !important; }
}`}</style>
            <div
              id="roster-print"
              style={{
                background: "#fff",
                borderRadius: "10px",
                width: "100%",
                maxWidth: "1100px",
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
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
                  🛫 Roster (MOB/D-MOB)
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
                    onClick={() => setRosterModal(null)}
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

              <div style={{ padding: "24px" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  {rosterModal.project?.name}
                  {rosterModal.project?.workingDay
                    ? ` (${fmtShort(rosterModal.project.workingDay)})`
                    : rosterModal.project?.startDate
                      ? ` (${fmtShort(rosterModal.project.startDate)})`
                      : ""}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#6c757d",
                    marginBottom: "16px",
                  }}
                >
                  {rosterModal.project?.client}{" "}
                  {rosterModal.project?.location
                    ? `· ${rosterModal.project.location}`
                    : ""}
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f1f3f5" }}>
                      {[
                        "Item",
                        "Name (Eng)",
                        "Position",
                        "Company",
                        "From",
                        "To",
                        "MOB",
                        "D-MOB",
                        "Working Day",
                        "Day Off",
                        "Previous Location",
                        "Remark",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 6px",
                            border: "1px solid #dee2e6",
                            textAlign: "left",
                            fontWeight: 700,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterModal.rows.map((r, i) => (
                      <tr key={r.employeeId}>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {r.fullName}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {r.position}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {r.company}
                        </td>
                        <td
                          style={{
                            padding: "2px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          <input
                            value={r.from}
                            onChange={(e) =>
                              updateRosterField(
                                r.employeeId,
                                "from",
                                e.target.value,
                              )
                            }
                            style={{
                              width: "60px",
                              border: "1px solid #dee2e6",
                              padding: "4px",
                              fontSize: "12px",
                            }}
                            placeholder="—"
                          />
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {r.to ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {fmtShort(r.mobDate)}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {fmtShort(r.demobDate)}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {fmtShort(r.workingDay)}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {r.dayOff ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {r.previousLocation ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "2px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          <input
                            value={r.remark}
                            onChange={(e) =>
                              updateRosterField(
                                r.employeeId,
                                "remark",
                                e.target.value,
                              )
                            }
                            style={{
                              width: "120px",
                              border: "1px solid #dee2e6",
                              padding: "4px",
                              fontSize: "12px",
                            }}
                            placeholder="—"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {skillMatrixModal &&
        createPortal(
          <div
            className="matrix-print-overlay"
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
            onClick={() => setSkillMatrixModal(null)}
          >
            <style>{`@media print {
  @page { size: A4 landscape; margin: 6mm; }
  #root { display: none !important; }
  .matrix-print-overlay {
    position: static !important;
    background: none !important;
    padding: 0 !important;
  }
  #matrix-print {
    position: static !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  .cv-no-print { display: none !important; }
  #matrix-print table {
    transform-origin: top left;
    transform: scale(var(--matrix-scale, 1));
  }
}`}</style>
            <div
              id="matrix-print"
              style={{
                background: "#fff",
                borderRadius: "10px",
                width: "100%",
                maxWidth: "95vw",
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
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
                  📋 Skill Matrix
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleExportSkillMatrixExcel}
                    style={{
                      background: "#198754",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📊 Export to Excel
                  </button>
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
                    onClick={() => setSkillMatrixModal(null)}
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

              <div style={{ padding: "24px", overflowX: "auto" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    marginBottom: "16px",
                  }}
                >
                  {skillMatrixModal.project?.name} —{" "}
                  {skillMatrixModal.project?.client}
                </div>

                {skillMatrixModal.trainings.length === 0 ? (
                  <div style={{ color: "#6c757d", fontSize: "13px" }}>
                    ไม่พบ training requirement สำหรับตำแหน่งในกลุ่มนี้ (เช็คว่า
                    Training Matrix ของตำแหน่งเหล่านี้ตั้งไว้แล้วหรือยัง)
                  </div>
                ) : (
                  <table
                    style={{
                      borderCollapse: "collapse",
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f1f3f5" }}>
                        <th
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                            position: "sticky",
                            left: 0,
                            background: "#f1f3f5",
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            padding: "6px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          Position
                        </th>
                        {skillMatrixModal.trainings.map((tr) => (
                          <th
                            key={tr.id}
                            style={{
                              border: "1px solid #dee2e6",
                              width: "55px",
                              minWidth: "55px",
                              maxWidth: "55px",
                              height: "150px",
                              verticalAlign: "bottom",
                              padding: 0,
                              overflow: "visible",
                            }}
                          >
                            <div
                              style={{
                                transform: "rotate(-45deg)",
                                transformOrigin: "bottom left",
                                whiteSpace: "nowrap",
                                fontSize: "10px",
                                fontWeight: 700,
                                width: "0px",
                                marginLeft: "20px",
                                marginBottom: "6px",
                              }}
                            >
                              {tr.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {skillMatrixModal.rows.map((r) => (
                        <tr key={r.employeeId}>
                          <td
                            style={{
                              padding: "6px",
                              border: "1px solid #dee2e6",
                              position: "sticky",
                              left: 0,
                              background: "#fff",
                              fontWeight: 600,
                            }}
                          >
                            {r.fullName}
                          </td>
                          <td
                            style={{
                              padding: "6px",
                              border: "1px solid #dee2e6",
                            }}
                          >
                            {r.position}
                          </td>
                          {r.cells.map((cell) => (
                            <td
                              key={cell.trainingId}
                              style={{
                                padding: "4px 2px",
                                border: "1px solid #dee2e6",
                                textAlign: "center",
                                width: "55px",
                                minWidth: "55px",
                                maxWidth: "55px",
                                fontSize: "10px",
                                whiteSpace: "nowrap",
                                color:
                                  cell.status === "overdue"
                                    ? "#dc3545"
                                    : "#212529",
                              }}
                            >
                              {skillCellLabel(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>,
          document.body,
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

                  const mandatory = client.mandatory ?? {
                    required: [],
                    completed: [],
                    missing: [],
                  };
                  const assigned = client.assigned ?? {
                    required: [],
                    completed: [],
                    missing: [],
                  };
                  const others = client.others ?? { completed: [] };

                  const renderTags = (missing, completed, clientName) => (
                    <>
                      {missing.length > 0 ? (
                        <div style={{ marginBottom: "10px" }}>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#dc3545",
                              marginBottom: "6px",
                            }}
                          >
                            ✗ Missing ({missing.length}):
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {missing.map((item, i) => {
                              const inCart = trainingCart.some(
                                (c) =>
                                  c.employeeId ===
                                    eligibilityModal.employeeId &&
                                  c.trainingId === item.trainingId,
                              );
                              return (
                                <span
                                  key={i}
                                  onClick={() =>
                                    canManageAllocation &&
                                    setTrainingCart((prev) => {
                                      const exists = prev.some(
                                        (c) =>
                                          c.employeeId ===
                                            eligibilityModal.employeeId &&
                                          c.trainingId === item.trainingId,
                                      );
                                      if (exists) {
                                        return prev.filter(
                                          (c) =>
                                            !(
                                              c.employeeId ===
                                                eligibilityModal.employeeId &&
                                              c.trainingId === item.trainingId
                                            ),
                                        );
                                      }
                                      return [
                                        ...prev,
                                        {
                                          employeeId:
                                            eligibilityModal.employeeId,
                                          employeeName:
                                            eligibilityModal.fullName,
                                          trainingName: item.name,
                                          trainingId: item.trainingId,
                                          clientName,
                                        },
                                      ];
                                    })
                                  }
                                  style={{
                                    background: inCart ? "#fff3cd" : "#fff5f5",
                                    color: inCart ? "#664d03" : "#dc3545",
                                    border: `1px solid ${inCart ? "#ffe69c" : "#f5c6cb"}`,
                                    borderRadius: "6px",
                                    padding: "3px 10px",
                                    fontSize: "12px",
                                    cursor: canManageAllocation
                                      ? "pointer"
                                      : "default",
                                  }}
                                  title={
                                    canManageAllocation
                                      ? "คลิกเพื่อเลือก/ยกเลิกขอ training นี้"
                                      : ""
                                  }
                                >
                                  {inCart ? "☑" : "✕"} {item.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#198754",
                            marginBottom: "10px",
                          }}
                        >
                          ✅ ครบทุกตัว
                        </div>
                      )}
                      {completed.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#198754",
                              marginBottom: "6px",
                            }}
                          >
                            ✓ Completed ({completed.length}):
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {completed.map((item, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#f0fff4",
                                  color: "#198754",
                                  border: "1px solid #b2dfdb",
                                  borderRadius: "6px",
                                  padding: "3px 10px",
                                  fontSize: "12px",
                                }}
                              >
                                ✓ {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );

                  return (
                    <div>
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
                          marginBottom: "20px",
                        }}
                      >
                        {mandatory.completed.length} of{" "}
                        {mandatory.required.length} mandatory trainings
                        completed ({client.matchPct}%)
                      </div>

                      <div style={{ marginBottom: "20px" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#212529",
                            marginBottom: "10px",
                          }}
                        >
                          🔴 Mandatory
                        </div>
                        {renderTags(
                          mandatory.missing,
                          mandatory.completed,
                          client.clientName,
                        )}
                      </div>

                      <div style={{ marginBottom: "20px" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#212529",
                            marginBottom: "10px",
                          }}
                        >
                          🟠 Assigned
                        </div>
                        {assigned.required.length === 0 ? (
                          <div style={{ fontSize: "12px", color: "#6c757d" }}>
                            — ไม่มี Assigned training สำหรับตำแหน่งนี้
                          </div>
                        ) : (
                          renderTags(
                            assigned.missing,
                            assigned.completed,
                            client.clientName,
                          )
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#212529",
                            marginBottom: "10px",
                          }}
                        >
                          ⚪ Others{" "}
                          <span
                            style={{
                              fontWeight: 400,
                              color: "#6c757d",
                              fontSize: "11px",
                            }}
                          >
                            (training ที่มีนอกเหนือจาก matrix ตำแหน่งนี้)
                          </span>
                        </div>
                        {others.completed.length === 0 ? (
                          <div style={{ fontSize: "12px", color: "#6c757d" }}>
                            — ไม่มี
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {others.completed.map((name, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#f1f3f5",
                                  color: "#495057",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "6px",
                                  padding: "3px 10px",
                                  fontSize: "12px",
                                }}
                              >
                                ✓ {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

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
      {cartReviewOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setCartReviewOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "80vh",
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
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "16px" }}>
                📦 รายการในตะกร้า ({trainingCart.length})
              </span>
              <button
                onClick={() => setCartReviewOpen(false)}
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
              {trainingCart.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#6c757d",
                    padding: "20px",
                  }}
                >
                  ตะกร้าว่างเปล่า
                </div>
              ) : (
                (() => {
                  // จัดกลุ่มตาม employee เพื่อให้เห็นชัดว่าใครขอ training อะไรบ้าง
                  const byEmployee = {};
                  trainingCart.forEach((c) => {
                    if (!byEmployee[c.employeeId]) {
                      byEmployee[c.employeeId] = {
                        employeeName: c.employeeName,
                        items: [],
                      };
                    }
                    byEmployee[c.employeeId].items.push(c);
                  });

                  return Object.entries(byEmployee).map(([empId, group]) => (
                    <div key={empId} style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#1e3a5f",
                          marginBottom: "8px",
                          borderBottom: "1px solid #f1f3f5",
                          paddingBottom: "6px",
                        }}
                      >
                        👤 {group.employeeName}
                      </div>
                      {group.items.map((item) => (
                        <div
                          key={`${item.employeeId}-${item.trainingId}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: "#f8f9fa",
                            borderRadius: "6px",
                            marginBottom: "6px",
                            gap: "8px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 600 }}>
                              {item.trainingName}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6c757d" }}>
                              Client: {item.clientName || "—"}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              removeFromCart(item.employeeId, item.trainingId)
                            }
                            title="เอาออกจากตะกร้า"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              fontSize: "14px",
                              cursor: "pointer",
                              padding: "0 4px",
                              flexShrink: 0,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ));
                })()
              )}
            </div>

            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setTrainingCart([])}
                disabled={trainingCart.length === 0}
                style={{
                  background: "none",
                  border: "none",
                  color: trainingCart.length === 0 ? "#adb5bd" : "#dc3545",
                  fontSize: "13px",
                  cursor: trainingCart.length === 0 ? "default" : "pointer",
                }}
              >
                ล้างตะกร้าทั้งหมด
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setCartReviewOpen(false)}
                  style={{
                    padding: "8px 20px",
                    fontSize: "13px",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ปิด
                </button>
                <button
                  onClick={() => {
                    handleSendCart();
                    setCartReviewOpen(false);
                  }}
                  disabled={trainingCart.length === 0 || sendingCart}
                  style={{
                    padding: "8px 20px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "8px",
                    background: "#198754",
                    color: "#fff",
                    cursor:
                      trainingCart.length === 0 || sendingCart
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {sendingCart ? "กำลังส่ง..." : "แจ้ง HR →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {trainingCart.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e3a5f",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            zIndex: 1000000,
          }}
        >
          <span
            onClick={() => setCartReviewOpen(true)}
            style={{
              fontSize: "13px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
            title="ดูรายการทั้งหมดในตะกร้า"
          >
            📦 {trainingCart.length} รายการในตะกร้า
          </span>
          <button
            onClick={() => setCartReviewOpen(true)}
            style={{
              background: "none",
              border: "1px solid #6c8fb0",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            👁 ดูรายละเอียด
          </button>
          <button
            onClick={handleSendCart}
            disabled={sendingCart}
            style={{
              background: "#198754",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {sendingCart ? "กำลังส่ง..." : "แจ้ง HR ให้จัด Training →"}
          </button>
          <button
            onClick={() => setTrainingCart([])}
            style={{
              background: "none",
              border: "none",
              color: "#adb5bd",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ล้างตะกร้า
          </button>
        </div>
      )}
    </div>
  );
}
